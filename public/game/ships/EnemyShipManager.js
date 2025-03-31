import * as THREE from 'three';
import SailboatShip from './SailboatShip.js';
import ShipwreckManager from './ShipwreckManager.js';

/**
 * EnemyShipManager class for managing AI-controlled enemy ships
 */
class EnemyShipManager {
    /**
     * Create a new EnemyShipManager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.scene = options.scene || null;
        this.enemyShips = [];
        this.playerShip = options.playerShip || null;
        this.maxEnemyShips = options.maxEnemyShips || 5;
        this.spawnRadius = options.spawnRadius || 500;
        this.spawnInterval = options.spawnInterval || 30000; // 30 seconds
        this.lastSpawnTime = 0;
        this.worldSize = options.worldSize || 1000;
        this.aggroRange = options.aggroRange || 150;
        this.lootableRange = options.lootableRange || 20;
        this.combatManager = options.combatManager || null;
        this.combatService = options.combatService || null;
        this.enemyShipOptions = options.enemyShipOptions || {};
        
        // Add zones manager reference
        this.zonesManager = options.zonesManager || null;
        
        // Parameters for safe zone avoidance
        this.safeZoneBuffer = 20; // Keep this distance from safe zones
        
        // Initialize ShipwreckManager
        this.shipwreckManager = new ShipwreckManager({
            scene: this.scene,
            playerShip: this.playerShip,
            lootableRange: this.lootableRange,
            combatService: this.combatService
        });
        
        // Make shipwreckManager globally accessible for proper PvP ship sinking
        window.shipwreckManager = this.shipwreckManager;
        
        // Portal guardians
        this.portalGuardians = [];
        this.maxPortalGuardians = 2;
        this.portalPosition = null;
        this.guardianRespawnTimerId = null;
        this.sunkGuardiansCount = 0;
        this.guardianRespawning = false;
        
        // Bind methods
        this.update = this.update.bind(this);
        this.spawnEnemyShip = this.spawnEnemyShip.bind(this);
        this.removeEnemyShip = this.removeEnemyShip.bind(this);
        
        // Initialize enemy ships
        this.init();
    }
    
    /**
     * Set the zones manager reference
     * @param {Zones} zonesManager - The zones manager instance
     */
    setZonesManager(zonesManager) {
        this.zonesManager = zonesManager;
    }
    
    /**
     * Check if a position is within or too close to any safe zone
     * @param {THREE.Vector3|THREE.Vector2} position - The position to check
     * @param {number} buffer - Additional buffer distance from safe zone boundary
     * @returns {boolean} True if position is in or near a safe zone
     */
    isNearSafeZone(position, buffer = 0) {
        if (!this.zonesManager) return false;
        
        // Convert Vector3 to Vector2 if needed (ignoring y-coordinate)
        const x = position.x;
        const z = position.z !== undefined ? position.z : position.y;
        
        return this.zonesManager.isInSafeZone(x, z, buffer);
    }
    
    /**
     * Find a valid spawn position away from safe zones
     * @returns {THREE.Vector3} A valid spawn position
     */
    findValidSpawnPosition() {
        const maxAttempts = 50;
        let position;
        let isValid = false;
        let attempts = 0;
        
        while (!isValid && attempts < maxAttempts) {
            // Generate random position within world bounds
            position = new THREE.Vector3(
                (Math.random() - 0.5) * this.worldSize,
                0, // Ensure Y is exactly at water level
                (Math.random() - 0.5) * this.worldSize
            );
            
            // Check if position is far enough from player
            const playerPos = this.playerShip ? this.playerShip.getPosition() : new THREE.Vector3();
            const distanceToPlayer = position.distanceTo(playerPos);
            
            // Check if position is valid (away from player and not in/near safe zone)
            isValid = distanceToPlayer > 300 && 
                     distanceToPlayer < this.spawnRadius && 
                     !this.isNearSafeZone(position, this.safeZoneBuffer);
            
            attempts++;
        }
        
        // If couldn't find a valid position after max attempts, use the last generated one
        // but enforce minimum distance from safe zones
        if (!isValid && this.zonesManager) {
            // Find the nearest safe zone and move away from it if needed
            const nearestSafeZone = this.findNearestSafeZone(position);
            if (nearestSafeZone) {
                const directionFromSafeZone = new THREE.Vector2(
                    position.x - nearestSafeZone.position.x,
                    position.z - nearestSafeZone.position.y
                ).normalize();
                
                // Move position outside of safe zone plus buffer
                const distanceNeeded = nearestSafeZone.radius + this.safeZoneBuffer + 10;
                position.x = nearestSafeZone.position.x + directionFromSafeZone.x * distanceNeeded;
                position.z = nearestSafeZone.position.y + directionFromSafeZone.y * distanceNeeded;
            }
        }
        
        return position;
    }
    
    /**
     * Find the nearest safe zone to a position
     * @param {THREE.Vector3} position - The position to check from
     * @returns {Object|null} The nearest safe zone or null if none
     */
    findNearestSafeZone(position) {
        if (!this.zonesManager || !this.zonesManager.safeZones || this.zonesManager.safeZones.length === 0) {
            return null;
        }
        
        let nearestZone = null;
        let minDistance = Infinity;
        
        for (const zone of this.zonesManager.safeZones) {
            const pos2D = new THREE.Vector2(position.x, position.z);
            const distance = pos2D.distanceTo(zone.position);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestZone = zone;
            }
        }
        
        return nearestZone;
    }
    
    /**
     * Initialize enemy ships
     */
    init() {
        // Find the portal in the scene
        this.findPortalPosition();
        
        // Spawn portal guardians if portal was found
        if (this.portalPosition) {
            for (let i = 0; i < this.maxPortalGuardians; i++) {
                this.spawnPortalGuardian();
            }
        }
        
        // Spawn initial enemy ships
        for (let i = 0; i < this.maxEnemyShips; i++) {
            this.spawnEnemyShip();
        }
    }
    
    /**
     * Find the portal position in the scene
     * @returns {THREE.Vector3|null} The portal position or null if not found
     */
    findPortalPosition() {
        if (!this.scene) return null;
        
        // Look for the portal in the scene
        const portalObject = this.scene.getObjectByName("vibeVersePortal");
        if (portalObject) {
            // Get world position of the portal
            this.portalPosition = new THREE.Vector3();
            portalObject.getWorldPosition(this.portalPosition);
            console.log('Found Vibeverse portal at position:', this.portalPosition);
            return this.portalPosition;
        }
        
        console.log('Vibeverse portal not found in scene');
        return null;
    }
    
    /**
     * Spawn a new portal guardian ship
     * @returns {BaseShip} The spawned guardian ship
     */
    spawnPortalGuardian() {
        // Don't spawn if we've reached the maximum
        if (this.portalGuardians.length >= this.maxPortalGuardians) {
            return null;
        }
        
        // Only spawn if we have the portal position
        if (!this.portalPosition) {
            this.findPortalPosition();
            if (!this.portalPosition) {
                console.log('Cannot spawn portal guardian: portal not found');
                return null;
            }
        }
        
        // Generate position near the portal
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 20; // 30-50 units from portal
        const position = new THREE.Vector3(
            this.portalPosition.x + Math.cos(angle) * distance,
            0, // Always at water level
            this.portalPosition.z + Math.sin(angle) * distance
        );
        
        console.log('Spawning portal guardian at:', position);
        
        // Create guardian ship with purple color
        const guardianShip = new SailboatShip(this.scene, {
            position: position,
            rotation: { y: Math.random() * Math.PI * 2 },
            modelType: 'skiff',
            speed: 3 + Math.random() * 3, // Same speed as regular enemies (3-6)
            hullColor: 0x800080, // Purple for guardians
            sailColor: 0x000000, // Black sails
            isEnemy: true,
            maxHealth: 40 + Math.floor(Math.random() * 20), // Same health as regular enemies (80-120)
            cannonDamage: { min: 5, max: 20 }, // Same damage as regular enemies
            cannonCooldown: 3000, // Same cooldown as regular enemies (3 seconds)
            cannonRange: 50, // Set cannon range to 50
            type: 'guardian'
        });
        
        // Tag the ship object with userData for easier identification and cleanup
        const shipObject = guardianShip.getObject();
        if (shipObject) {
            shipObject.name = `guardian-ship-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            shipObject.userData.isEnemyShip = true;
            shipObject.userData.isPortalGuardian = true; // Mark as guardian
            shipObject.userData.shipId = guardianShip.id || Date.now();
            
            // Store reference in scene userData for additional cleanup
            if (!this.scene.userData.enemyShipObjects) {
                this.scene.userData.enemyShipObjects = [];
            }
            this.scene.userData.enemyShipObjects.push(shipObject);
        }
        
        // Add custom properties for guardian behavior
        guardianShip.aiState = 'guard_portal';
        guardianShip.patrolTarget = this.getGuardianPatrolTarget();
        guardianShip.targetShip = null;
        guardianShip.lastStateChange = Date.now();
        guardianShip.stateChangeCooldown = 5000 + Math.random() * 5000; // 5-10 seconds
        guardianShip.id = 'guardian-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        guardianShip.isPortalGuardian = true;
        
        // Override onSink method to handle guardian ship sinking
        guardianShip.onSink = () => {
            this.handleEnemyShipSink(guardianShip);
            
            // Remove from portal guardians array
            const index = this.portalGuardians.indexOf(guardianShip);
            if (index !== -1) {
                this.portalGuardians.splice(index, 1);
            }
            
            // Increment sunk guardians counter
            this.sunkGuardiansCount++;
            console.log(`Portal guardian sunk. ${this.sunkGuardiansCount} guardians have been sunk.`);
            
            // Check if both guardians have been sunk
            if (this.sunkGuardiansCount >= this.maxPortalGuardians && !this.guardianRespawning) {
                console.log('All portal guardians have been sunk. Scheduling respawn in 30 seconds.');
                this.guardianRespawning = true;
                
                // Clear any existing timer
                if (this.guardianRespawnTimerId) {
                    clearTimeout(this.guardianRespawnTimerId);
                }
                
                // Schedule respawn of all guardians after 30 seconds
                this.guardianRespawnTimerId = setTimeout(() => {
                    console.log('Respawning all portal guardians');
                    this.sunkGuardiansCount = 0;
                    this.guardianRespawning = false;
                    
                    // Spawn all portal guardians
                    for (let i = 0; i < this.maxPortalGuardians; i++) {
                        this.spawnPortalGuardian();
                    }
                }, 30000); // 30 second respawn delay
            }
        };
        
        // Create health bar for new guardian ship
        guardianShip.createHealthBar();
        
        // Initially hide the health bar until needed
        guardianShip.setHealthBarVisible(false);
        
        // If combat manager exists, initialize ship with it
        if (this.combatManager && this.combatManager.initializeEnemyShip) {
            this.combatManager.initializeEnemyShip(guardianShip);
        }
        
        // Add to portal guardians array AND enemy ships array
        this.portalGuardians.push(guardianShip);
        this.enemyShips.push(guardianShip);
        
        return guardianShip;
    }
    
    /**
     * Get a patrol target position for guardians around the portal
     * @returns {THREE.Vector3} A position to patrol
     */
    getGuardianPatrolTarget() {
        if (!this.portalPosition) return new THREE.Vector3(0, 0, 0);
        
        // Generate a random position in a circle around the portal
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50; // 30-80 units from portal
        return new THREE.Vector3(
            this.portalPosition.x + Math.cos(angle) * distance,
            0, // Always at water level
            this.portalPosition.z + Math.sin(angle) * distance
        );
    }
    
    /**
     * Spawn a new enemy ship
     * @returns {BaseShip} The spawned enemy ship
     */
    spawnEnemyShip() {
        // Don't spawn if we've reached the maximum
        if (this.enemyShips.length >= this.maxEnemyShips) {
            return null;
        }
        
        // Find a valid spawn position (away from player and safe zones)
        const position = this.findValidSpawnPosition();
        
        // Get a random ship type 
        const shipOptions = this.getRandomEnemyShipOptions();
        const shipType = shipOptions.type || 'sloop';
        
        // Create enemy ship
        const enemyShip = new SailboatShip(this.scene, {
            position: position,
            rotation: { y: Math.random() * Math.PI * 2 },
            modelType: 'sloop',
            speed: 3 + Math.random() * 3, // Random speed between 3-6
            hullColor: 0x8B0000, // Dark red hull for enemy ships
            sailColor: 0x000000, // Black sails
            isEnemy: true,
            maxHealth: 40 + Math.floor(Math.random() * 20), // Random health between 80-120
            cannonDamage: { min: 5, max: 20 },
            cannonCooldown: 3000, // 3 seconds between shots (adjust as needed)
            cannonRange: 50, // Set cannon range to 50
            type: shipType // Set the ship type for shipwreck creation later
        });
        
        // Explicitly set the type property on the ship object
        enemyShip.type = shipType;
        
        // Tag the ship object with userData for easier identification and cleanup
        const shipObject = enemyShip.getObject();
        if (shipObject) {
            shipObject.name = `enemy-ship-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            shipObject.userData.isEnemyShip = true;
            shipObject.userData.shipId = enemyShip.id || Date.now();
            
            // Store reference in scene userData for additional cleanup
            if (!this.scene.userData.enemyShipObjects) {
                this.scene.userData.enemyShipObjects = [];
            }
            this.scene.userData.enemyShipObjects.push(shipObject);
        }
        
        // Verify position is at water level
        const shipPos = enemyShip.getPosition();
        if (shipPos.y !== 0) {
            shipPos.y = 0;
            enemyShip.setPosition(shipPos);
        }
        
        // Add custom properties for AI behavior
        enemyShip.aiState = 'patrol';
        enemyShip.patrolTarget = null;
        enemyShip.targetShip = null;
        enemyShip.lastStateChange = Date.now();
        enemyShip.stateChangeCooldown = 5000 + Math.random() * 5000; // 5-10 seconds
        enemyShip.id = 'enemy-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        // Override onSink method to handle enemy ship sinking
        enemyShip.onSink = () => {
            this.handleEnemyShipSink(enemyShip);
        };
        
        // Create health bar for new enemy ship
        enemyShip.createHealthBar();
        
        // Initially hide the health bar until needed
        enemyShip.setHealthBarVisible(false);
        
        // If combat manager exists, initialize ship with it
        if (this.combatManager && this.combatManager.initializeEnemyShip) {
            this.combatManager.initializeEnemyShip(enemyShip);
        }
        
        // Add to enemy ships array
        this.enemyShips.push(enemyShip);
        
        // Update last spawn time
        this.lastSpawnTime = Date.now();
        
        return enemyShip;
    }
    
    /**
     * Handle enemy ship sinking
     * @param {BaseShip} enemyShip - The enemy ship that sank
     */
    handleEnemyShipSink(enemyShip) {
        // Register the shipwreck in the ShipwreckManager
        this.shipwreckManager.registerShipwreck(enemyShip);
        
        // Remove from enemy ships array but keep the shipwreck visible
        const index = this.enemyShips.findIndex(ship => ship === enemyShip);
        if (index !== -1) {
            this.enemyShips.splice(index, 1);
        }
    }
    
    /**
     * Remove an enemy ship
     * @param {BaseShip} enemyShip - The enemy ship to remove
     */
    removeEnemyShip(enemyShip) {
        // Find index of enemy ship
        const index = this.enemyShips.findIndex(ship => ship === enemyShip);
        
        // Remove if found
        if (index !== -1) {
            // Clean up wake particles if they exist
            if (enemyShip.wakeParticleSystem) {
                if (typeof enemyShip.wakeParticleSystem.cleanup === 'function') {
                    enemyShip.wakeParticleSystem.cleanup();
                } else if (typeof enemyShip.wakeParticleSystem.dispose === 'function') {
                    enemyShip.wakeParticleSystem.dispose();
                }
            }
            
            // Remove from array
            this.enemyShips.splice(index, 1);
            
            // Remove mesh from scene
            if (enemyShip.shipMesh) {
                this.scene.remove(enemyShip.shipMesh);
            }
        }
    }
    
    /**
     * Check if player is in range to loot a shipwreck
     * @param {THREE.Vector3} playerPosition - The player's position
     * @returns {Object|null} The shipwreck that can be looted, or null if none
     */
    getLootableShipwreck(playerPosition) {
        return this.shipwreckManager.getLootableShipwreck(playerPosition);
    }
    
    /**
     * Loot a shipwreck
     * @param {Object} shipwreck - The shipwreck to loot
     * @returns {Promise<Object>} The loot from the shipwreck
     */
    async lootShipwreck(shipwreck) {
        return this.shipwreckManager.lootShipwreck(shipwreck);
    }
    
    /**
     * Update enemy ships
     * @param {number} delta - Time delta since last frame
     * @param {number} time - Current time
     */
    update(delta, time) {
        // Check if portal position needs to be found
        if (!this.portalPosition) {
            this.findPortalPosition();
        }
        
        // Check if we need to spawn new portal guardians
        // Only spawn new guardians if we're not in respawn mode and the count is less than max
        if (this.portalPosition && 
            this.portalGuardians.length < this.maxPortalGuardians && 
            this.sunkGuardiansCount === 0 && 
            !this.guardianRespawning) {
            this.spawnPortalGuardian();
        }
        
        // Check if we need to spawn new enemy ships
        const now = Date.now();
        if (now - this.lastSpawnTime > this.spawnInterval && this.enemyShips.length < this.maxEnemyShips + this.maxPortalGuardians) {
            this.spawnEnemyShip();
        }
        
        // Update each enemy ship
        this.enemyShips.forEach(enemyShip => {
            // Skip if sunk
            if (enemyShip.isSunk) return;
            
            // Update AI behavior
            if (enemyShip.isPortalGuardian) {
                this.updateGuardianAI(enemyShip, delta);
            } else {
                this.updateEnemyAI(enemyShip, delta);
            }
            
            // Update ship physics and animation
            enemyShip.update(delta, time);
        });
        
        // Update shipwreck manager
        this.shipwreckManager.update(delta, time);
    }
    
    /**
     * Update portal guardian AI behavior
     * @param {BaseShip} guardianShip - The guardian ship to update
     * @param {number} delta - Time delta since last frame
     */
    updateGuardianAI(guardianShip, delta) {
        // Skip if no player ship or no portal position
        if (!this.playerShip || !this.portalPosition) return;
        
        // Get player position
        const playerPos = this.playerShip.getPosition();
        const guardianPos = guardianShip.getPosition();
        
        // Ensure guardian ship stays at water level
        if (guardianPos.y !== 0 && !guardianShip.isSunk) {
            guardianPos.y = 0;
            guardianShip.setPosition(guardianPos);
        }
        
        // Update health bar visibility based on:
        // 1. If the ship is not at full health
        // 2. If the ship is targeting another ship (in attack mode)
        if (guardianShip.healthBarContainer) {
            const isFullHealth = guardianShip.currentHealth >= guardianShip.maxHealth;
            const isTargeting = guardianShip.aiState === 'attack' && guardianShip.targetShip;
            
            if (!isFullHealth || isTargeting) {
                guardianShip.setHealthBarVisible(true);
                // If camera is available through combat manager, update the health bar
                if (this.combatManager && this.combatManager.camera) {
                    guardianShip.updateHealthBar(this.combatManager.camera);
                }
            } else if (!this.combatManager || !this.combatManager.currentTarget || 
                       this.combatManager.currentTarget !== guardianShip) {
                // Hide health bar if not targeted by player and not in conditions above
                guardianShip.setHealthBarVisible(false);
            }
        }
        
        // Calculate distances
        const distanceToPlayer = guardianPos.distanceTo(playerPos);
        const distanceToPortal = guardianPos.distanceTo(this.portalPosition);
        const playerDistanceToPortal = playerPos.distanceTo(this.portalPosition);
        
        // Check if we should change state
        const now = Date.now();
        if (now - guardianShip.lastStateChange > guardianShip.stateChangeCooldown) {
            // Player is close to portal and guardian is not in attack mode
            if (playerDistanceToPortal < 100 && !this.playerShip.isSunk && 
                guardianShip.aiState !== 'attack') {
                // Player is near portal, attack to protect it
                guardianShip.aiState = 'attack';
                guardianShip.targetShip = this.playerShip;
                guardianShip.lastStateChange = now;
            } 
            // Player is too far from portal but guardian is in attack mode
            else if ((playerDistanceToPortal >= 150 || this.playerShip.isSunk) && 
                     guardianShip.aiState === 'attack') {
                // Player left portal area, resume guarding
                guardianShip.aiState = 'guard_portal';
                guardianShip.targetShip = null;
                guardianShip.patrolTarget = this.getGuardianPatrolTarget();
                guardianShip.lastStateChange = now;
            }
            // Guardian is too far from portal
            else if (distanceToPortal > 150 && guardianShip.aiState !== 'return_to_portal') {
                // Guardian wandered too far, return to portal
                guardianShip.aiState = 'return_to_portal';
                guardianShip.targetShip = null;
                guardianShip.lastStateChange = now;
            }
            // Guardian has returned close enough to portal
            else if (guardianShip.aiState === 'return_to_portal' && distanceToPortal < 50) {
                // Resume normal guard patrol
                guardianShip.aiState = 'guard_portal';
                guardianShip.patrolTarget = this.getGuardianPatrolTarget();
                guardianShip.lastStateChange = now;
            }
            // Occasionally change patrol position while guarding
            else if (guardianShip.aiState === 'guard_portal' && Math.random() < 0.3) {
                guardianShip.patrolTarget = this.getGuardianPatrolTarget();
                guardianShip.lastStateChange = now;
            }
        }
        
        // Handle AI states
        switch (guardianShip.aiState) {
            case 'guard_portal':
                // If no patrol target, set one
                if (!guardianShip.patrolTarget) {
                    guardianShip.patrolTarget = this.getGuardianPatrolTarget();
                    break;
                }
                
                // Move towards patrol target
                if (!guardianShip.isMoving) {
                    guardianShip.moveTo(guardianShip.patrolTarget);
                }
                
                // Check if reached patrol target
                const distanceToTarget = guardianPos.distanceTo(guardianShip.patrolTarget);
                if (distanceToTarget < 10) {
                    // Set new patrol target
                    guardianShip.patrolTarget = this.getGuardianPatrolTarget();
                    break;
                }
                
                // Check if player is near portal
                if (playerDistanceToPortal < 100 && !this.playerShip.isSunk) {
                    // Player is near portal, attack to protect it
                    guardianShip.aiState = 'attack';
                    guardianShip.targetShip = this.playerShip;
                    guardianShip.lastStateChange = now;
                }
                break;
                
            case 'return_to_portal':
                // Move back towards the portal
                const portalTarget = new THREE.Vector3(
                    this.portalPosition.x + (Math.random() - 0.5) * 20,
                    0,
                    this.portalPosition.z + (Math.random() - 0.5) * 20
                );
                
                if (!guardianShip.isMoving) {
                    guardianShip.moveTo(portalTarget);
                }
                
                // Check if back at portal
                if (distanceToPortal < 50) {
                    guardianShip.aiState = 'guard_portal';
                    guardianShip.patrolTarget = this.getGuardianPatrolTarget();
                    guardianShip.lastStateChange = now;
                }
                break;
                
            case 'attack':
                // If player is sunk or far from portal, return to guarding
                if (this.playerShip.isSunk || playerDistanceToPortal > 150) {
                    guardianShip.aiState = 'guard_portal';
                    guardianShip.targetShip = null;
                    guardianShip.patrolTarget = this.getGuardianPatrolTarget();
                    guardianShip.lastStateChange = now;
                    break;
                }
                
                // Move towards player but keep some distance
                const targetPos = new THREE.Vector3();
                const direction = new THREE.Vector3()
                    .subVectors(playerPos, guardianPos)
                    .normalize();
                
                // Try to maintain a distance of 25-35 units for combat
                const idealDistance = 30;
                if (distanceToPlayer > idealDistance + 10) {
                    // Too far, move closer
                    targetPos.copy(playerPos).sub(direction.multiplyScalar(idealDistance));
                    targetPos.y = 0; // Ensure Y is at water level
                    guardianShip.moveTo(targetPos);
                } else if (distanceToPlayer < idealDistance - 10) {
                    // Too close, back up
                    targetPos.copy(playerPos).sub(direction.multiplyScalar(idealDistance));
                    targetPos.y = 0; // Ensure Y is at water level
                    guardianShip.moveTo(targetPos);
                } else if (!guardianShip.isMoving) {
                    // At good distance but not moving, circle around player
                    const now = Date.now();
                    const circlePos = new THREE.Vector3(
                        playerPos.x + Math.cos(now * 0.0007) * idealDistance,
                        0, // Always set Y to water level
                        playerPos.z + Math.sin(now * 0.0007) * idealDistance
                    );
                    guardianShip.moveTo(circlePos);
                }
                
                // Check if player is in range and guardian can fire
                const guardianCannonRange = guardianShip.cannonRange || 100;
                if (distanceToPlayer <= guardianCannonRange && guardianShip.canFire()) {
                    // Same hit chance as regular enemies (70% hit chance)
                    const isHit = Math.random() >= 0.3;
                    
                    // Calculate damage (0 for misses)
                    const damage = isHit ? Math.floor(
                        guardianShip.cannonDamage.min + 
                        Math.random() * (guardianShip.cannonDamage.max - guardianShip.cannonDamage.min)
                    ) : 0;
                    
                    // Update last fired time
                    guardianShip.lastFiredTime = Date.now();
                    
                    // Use combat manager to visualize cannonball if available
                    if (this.combatManager) {
                        this.combatManager.fireCannonball(guardianShip, this.playerShip, damage, !isHit);
                    }
                }
                break;
        }
    }
    
    /**
     * Find a valid patrol target that's not in/near a safe zone
     * @param {THREE.Vector3} currentPosition - The ship's current position
     * @returns {THREE.Vector3} A valid patrol target
     */
    getValidPatrolTarget(currentPosition) {
        const maxAttempts = 20;
        let targetPos;
        let isValid = false;
        let attempts = 0;
        
        while (!isValid && attempts < maxAttempts) {
            // Generate a random position within reasonable distance
            const maxDistance = 800;
            const minDistance = 200;
            
            // Random angle
            const angle = Math.random() * Math.PI * 2;
            
            // Random distance between min and max
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            // Calculate target position
            targetPos = new THREE.Vector3(
                currentPosition.x + Math.cos(angle) * distance,
                0,
                currentPosition.z + Math.sin(angle) * distance
            );
            
            // Check if position is valid (not in/near safe zone)
            isValid = !this.isNearSafeZone(targetPos, this.safeZoneBuffer);
            
            attempts++;
        }
        
        // If couldn't find a valid position, use a position away from the nearest safe zone
        if (!isValid && this.zonesManager) {
            const nearestSafeZone = this.findNearestSafeZone(currentPosition);
            if (nearestSafeZone) {
                // Move directly away from the safe zone
                const directionFromSafeZone = new THREE.Vector2(
                    currentPosition.x - nearestSafeZone.position.x,
                    currentPosition.z - nearestSafeZone.position.y
                ).normalize();
                
                // Set target position away from safe zone at a reasonable distance
                const distance = 300 + Math.random() * 200; // 300-500 units away
                targetPos = new THREE.Vector3(
                    currentPosition.x + directionFromSafeZone.x * distance,
                    0,
                    currentPosition.z + directionFromSafeZone.y * distance
                );
            } else {
                // Fallback to a random position if no safe zones
                targetPos = new THREE.Vector3(
                    (Math.random() - 0.5) * this.worldSize,
                    0,
                    (Math.random() - 0.5) * this.worldSize
                );
            }
        }
        
        return targetPos;
    }
    
    /**
     * Update enemy AI behavior
     * @param {BaseShip} enemyShip - The enemy ship to update
     * @param {number} delta - Time delta since last frame
     */
    updateEnemyAI(enemyShip, delta) {
        // Skip if no player ship
        if (!this.playerShip) return;
        
        // Get player position
        const playerPos = this.playerShip.getPosition();
        const enemyPos = enemyShip.getPosition();
        
        // Ensure enemy ship stays at water level
        if (enemyPos.y !== 0 && !enemyShip.isSunk) {
            enemyPos.y = 0;
            enemyShip.setPosition(enemyPos);
        }
        
        // Update health bar visibility based on:
        // 1. If the ship is not at full health
        // 2. If the ship is targeting another ship (in attack mode)
        if (enemyShip.healthBarContainer) {
            const isFullHealth = enemyShip.currentHealth >= enemyShip.maxHealth;
            const isTargeting = enemyShip.aiState === 'attack' && enemyShip.targetShip;
            
            if (!isFullHealth || isTargeting) {
                enemyShip.setHealthBarVisible(true);
                // If camera is available through combat manager, update the health bar
                if (this.combatManager && this.combatManager.camera) {
                    enemyShip.updateHealthBar(this.combatManager.camera);
                }
            } else if (!this.combatManager || !this.combatManager.currentTarget || 
                       this.combatManager.currentTarget !== enemyShip) {
                // Hide health bar if not targeted by player and not in conditions above
                enemyShip.setHealthBarVisible(false);
            }
        }
        
        // Calculate distance to player
        const distanceToPlayer = enemyPos.distanceTo(playerPos);
        
        // Check if player is in a safe zone
        const playerInSafeZone = this.isNearSafeZone(playerPos);
        
        // Check if we're in or too close to a safe zone
        const shipInSafeZone = this.isNearSafeZone(enemyPos);
        
        // Force evacuation if too close to a safe zone
        if (shipInSafeZone) {
            // Override current state to immediately leave the safe zone
            enemyShip.aiState = 'evade_safe_zone';
            
            // Find nearest safe zone to determine direction to move away
            const nearestSafeZone = this.findNearestSafeZone(enemyPos);
            if (nearestSafeZone) {
                // Calculate direction away from safe zone
                const directionFromSafeZone = new THREE.Vector2(
                    enemyPos.x - nearestSafeZone.position.x,
                    enemyPos.z - nearestSafeZone.position.y
                ).normalize();
                
                // Set target to move away from safe zone
                const escapeDistance = 100 + Math.random() * 100; // 100-200 units away
                enemyShip.patrolTarget = new THREE.Vector3(
                    nearestSafeZone.position.x + directionFromSafeZone.x * escapeDistance,
                    0,
                    nearestSafeZone.position.y + directionFromSafeZone.y * escapeDistance
                );
                
                // Immediately start moving to the target
                enemyShip.moveTo(enemyShip.patrolTarget);
            }
        } else {
            // Check if we're currently attacking but player has entered a safe zone
            if (enemyShip.aiState === 'attack' && playerInSafeZone) {
                // Player entered a safe zone, switch to patrol mode immediately
                console.log('Player entered safe zone, enemy ship switching to patrol');
                enemyShip.aiState = 'patrol';
                enemyShip.targetShip = null;
                
                // Force a new patrol target and immediate movement
                enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                enemyShip.lastStateChange = Date.now();
                
                // Important: Immediately start moving to the new patrol target
                enemyShip.moveTo(enemyShip.patrolTarget);
            }
            // Not in a safe zone, consider state changes based on cooldown
            else if (Date.now() - enemyShip.lastStateChange > enemyShip.stateChangeCooldown) {
                // Decide next state based on distance to player and safe zones
                if (distanceToPlayer < this.aggroRange && !this.playerShip.isSunk && !playerInSafeZone) {
                    // Player is in range, not in a safe zone, and not sunk - attack
                    enemyShip.aiState = 'attack';
                    enemyShip.targetShip = this.playerShip;
                } else {
                    // Otherwise patrol
                    enemyShip.aiState = 'patrol';
                    enemyShip.targetShip = null;
                    
                    // Set valid patrol target away from safe zones
                    enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                    
                    // Ensure we start moving if we're not already
                    if (!enemyShip.isMoving) {
                        enemyShip.moveTo(enemyShip.patrolTarget);
                    }
                }
                
                enemyShip.lastStateChange = Date.now();
            }
        }
        
        // Handle AI state
        switch (enemyShip.aiState) {
            case 'evade_safe_zone':
                // Move away from safe zone
                if (!enemyShip.isMoving) {
                    enemyShip.moveTo(enemyShip.patrolTarget);
                }
                
                // Check if we've successfully left the safe zone area
                if (!this.isNearSafeZone(enemyPos, this.safeZoneBuffer * 0.5)) {
                    // Successfully left the safe zone with some margin, resume patrol
                    enemyShip.aiState = 'patrol';
                    enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                    enemyShip.lastStateChange = Date.now();
                    
                    // Ensure movement continues to the new target
                    enemyShip.moveTo(enemyShip.patrolTarget);
                }
                break;
                
            case 'patrol':
                // If no patrol target, set one
                if (!enemyShip.patrolTarget) {
                    enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                    enemyShip.lastStateChange = Date.now();
                    
                    // Ensure movement starts
                    enemyShip.moveTo(enemyShip.patrolTarget);
                    break;
                }
                
                // Ensure patrol target is at water level
                if (enemyShip.patrolTarget.y !== 0) {
                    enemyShip.patrolTarget.y = 0;
                }
                
                // Move towards patrol target if not already moving
                if (!enemyShip.isMoving) {
                    enemyShip.moveTo(enemyShip.patrolTarget);
                }
                
                // Check if reached patrol target
                const distanceToTarget = enemyPos.distanceTo(enemyShip.patrolTarget);
                if (distanceToTarget < 10) {
                    // Set new patrol target
                    enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                    enemyShip.lastStateChange = Date.now();
                    
                    // Immediately start moving to the new target
                    enemyShip.moveTo(enemyShip.patrolTarget);
                    break;
                }
                
                // Check if player is in range and not in a safe zone
                if (distanceToPlayer < this.aggroRange && !this.playerShip.isSunk && !playerInSafeZone) {
                    // Switch to attack
                    enemyShip.aiState = 'attack';
                    enemyShip.targetShip = this.playerShip;
                    enemyShip.lastStateChange = Date.now();
                }
                break;
                
            case 'attack':
                // If player is sunk, in a safe zone, or out of range, switch to patrol
                if (this.playerShip.isSunk || playerInSafeZone || distanceToPlayer > this.aggroRange * 1.5) {
                    enemyShip.aiState = 'patrol';
                    enemyShip.targetShip = null;
                    
                    // Set valid patrol target away from safe zones
                    enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                    enemyShip.lastStateChange = Date.now();
                    
                    // For debugging - log that ship is switching to patrol mode
                    if (playerInSafeZone) {
                        console.log('Enemy ship switching to patrol mode: player entered safe zone');
                    }
                    
                    // IMPORTANT: Immediately start moving to new patrol target
                    enemyShip.moveTo(enemyShip.patrolTarget);
                    break;
                }
                
                // Move towards player but maintain combat distance
                const targetPos = new THREE.Vector3();
                const direction = new THREE.Vector3()
                    .subVectors(playerPos, enemyPos)
                    .normalize();
                
                // Try to maintain a distance of 30-40 units for combat
                const idealDistance = 35;
                
                // Create a potential next position to check against safe zones
                let nextPosition;
                
                if (distanceToPlayer > idealDistance + 10) {
                    // Too far, move closer
                    nextPosition = new THREE.Vector3();
                    nextPosition.copy(playerPos).sub(direction.clone().multiplyScalar(idealDistance));
                    nextPosition.y = 0;
                    
                    // Only move if the next position isn't in a safe zone
                    if (!this.isNearSafeZone(nextPosition, this.safeZoneBuffer)) {
                        enemyShip.moveTo(nextPosition);
                    } else {
                        // Position is in safe zone, retreat to patrol
                        enemyShip.aiState = 'patrol';
                        enemyShip.targetShip = null;
                        enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                        enemyShip.lastStateChange = Date.now();
                        
                        // Start moving immediately
                        enemyShip.moveTo(enemyShip.patrolTarget);
                    }
                } else if (distanceToPlayer < idealDistance - 10) {
                    // Too close, back up
                    nextPosition = new THREE.Vector3();
                    nextPosition.copy(playerPos).sub(direction.clone().multiplyScalar(idealDistance));
                    nextPosition.y = 0;
                    
                    // Only move if the next position isn't in a safe zone
                    if (!this.isNearSafeZone(nextPosition, this.safeZoneBuffer)) {
                        enemyShip.moveTo(nextPosition);
                    } else {
                        // Can't back up properly, switch to circling
                        const now = Date.now();
                        const circlePos = new THREE.Vector3(
                            playerPos.x + Math.cos(now * 0.0005) * idealDistance,
                            0,
                            playerPos.z + Math.sin(now * 0.0005) * idealDistance
                        );
                        
                        if (!this.isNearSafeZone(circlePos, this.safeZoneBuffer)) {
                            enemyShip.moveTo(circlePos);
                        } else {
                            // Can't circle either due to safe zone, switch to patrol
                            enemyShip.aiState = 'patrol';
                            enemyShip.targetShip = null;
                            enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                            enemyShip.lastStateChange = Date.now();
                            
                            // Start moving immediately
                            enemyShip.moveTo(enemyShip.patrolTarget);
                        }
                    }
                } else if (!enemyShip.isMoving) {
                    // At good distance but not moving, circle around player
                    const now = Date.now();
                    const circlePos = new THREE.Vector3(
                        playerPos.x + Math.cos(now * 0.0005) * idealDistance,
                        0,
                        playerPos.z + Math.sin(now * 0.0005) * idealDistance
                    );
                    
                    // Only move if the circle position isn't in a safe zone
                    if (!this.isNearSafeZone(circlePos, this.safeZoneBuffer)) {
                        enemyShip.moveTo(circlePos);
                    } else {
                        // Circle position is in safe zone, find a new valid patrol target
                        enemyShip.aiState = 'patrol';
                        enemyShip.targetShip = null;
                        enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
                        enemyShip.lastStateChange = Date.now();
                        
                        // Start moving immediately
                        enemyShip.moveTo(enemyShip.patrolTarget);
                    }
                }
                
                // Check if player is in range and enemy can fire (and player is not in safe zone)
                if (!playerInSafeZone && distanceToPlayer <= enemyShip.cannonRange && enemyShip.canFire()) {
                    // Determine if shot is a hit or miss (70% hit chance)
                    const isHit = Math.random() >= 0.3;
                    
                    // Calculate damage (0 for misses)
                    const damage = isHit ? Math.floor(
                        enemyShip.cannonDamage.min + 
                        Math.random() * (enemyShip.cannonDamage.max - enemyShip.cannonDamage.min)
                    ) : 0;
                    
                    // Update last fired time
                    enemyShip.lastFiredTime = Date.now();
                    
                    // Use combat manager to visualize cannonball if available
                    if (this.combatManager) {
                        this.combatManager.fireCannonball(enemyShip, this.playerShip, damage, !isHit);
                    }
                }
                break;
        }
        
        // Final failsafe: If the ship is not moving and should be, force movement
        if (!enemyShip.isMoving && enemyShip.aiState !== 'attack') {
            if (!enemyShip.patrolTarget) {
                enemyShip.patrolTarget = this.getValidPatrolTarget(enemyPos);
            }
            console.log('Failsafe: Enemy ship was not moving, forcing movement to patrol target');
            enemyShip.moveTo(enemyShip.patrolTarget);
        }
    }
    
    /**
     * Get all enemy ships
     * @returns {Array} Array of enemy ships
     */
    getEnemyShips() {
        return this.enemyShips;
    }
    
    /**
     * Get all shipwrecks
     * @returns {Array} Array of shipwrecks
     */
    getShipwrecks() {
        return this.shipwreckManager.getShipwrecks();
    }
    
    /**
     * Set the player ship reference
     * @param {BaseShip} playerShip - The player's ship
     */
    setPlayerShip(playerShip) {
        this.playerShip = playerShip;
        // Update player ship reference in shipwreck manager too
        this.shipwreckManager.setPlayerShip(playerShip);
    }
    
    /**
     * Reset all enemy ships (remove and respawn)
     */
    reset() {
        console.log('EnemyShipManager: Performing complete reset');
        
        // Clear any pending guardian respawn timer
        if (this.guardianRespawnTimerId) {
            clearTimeout(this.guardianRespawnTimerId);
            this.guardianRespawnTimerId = null;
        }
        
        // Reset guardian spawn state
        this.sunkGuardiansCount = 0;
        this.guardianRespawning = false;
        
        // Clear the portal guardians array
        this.portalGuardians = [];
        
        // Reset the portal position
        this.portalPosition = null;
        
        // Remove all enemy ships
        this.enemyShips.forEach(ship => {
            // Clean up wake particles if they exist
            if (ship.wakeParticleSystem) {
                if (typeof ship.wakeParticleSystem.cleanup === 'function') {
                    ship.wakeParticleSystem.cleanup();
                } else if (typeof ship.wakeParticleSystem.dispose === 'function') {
                    ship.wakeParticleSystem.dispose();
                }
            }
            
            // Remove any event listeners or animations attached to the ship
            if (ship.shipMesh) {
                // Remove from scene
                this.scene.remove(ship.shipMesh);
                
                // Dispose of geometries and materials to free memory
                if (ship.shipMesh.geometry) ship.shipMesh.geometry.dispose();
                if (ship.shipMesh.material) {
                    if (Array.isArray(ship.shipMesh.material)) {
                        ship.shipMesh.material.forEach(material => material.dispose());
                    } else {
                        ship.shipMesh.material.dispose();
                    }
                }
            }
            
            // Clean up any other resources
            if (ship.cleanup && typeof ship.cleanup === 'function') {
                ship.cleanup();
            }
        });
        
        // Reset shipwreck manager
        this.shipwreckManager.reset();
        
        // Find the portal again
        this.findPortalPosition();
        
        // Respawn enemy ships and portal guardians
        this.init();
        
        console.log('EnemyShipManager: Reset complete, spawned new ships');
    }
    
    /**
     * Set the combat manager reference
     * @param {CombatManager} combatManager - The combat manager instance
     */
    setCombatManager(combatManager) {
        this.combatManager = combatManager;
        
        // Initialize existing enemy ships with health bars
        if (combatManager && combatManager.initializeEnemyShip) {
            for (const ship of this.enemyShips) {
                combatManager.initializeEnemyShip(ship);
            }
        }
    }
    
    /**
     * Set the combat service reference
     * @param {CombatService} combatService - The combat service instance
     */
    setCombatService(combatService) {
        this.combatService = combatService;
        
        // Update the shipwreck manager with the combat service
        if (this.shipwreckManager) {
            this.shipwreckManager.setCombatService(combatService);
        }
    }
    
    /**
     * Initialize the manager with Firebase listeners for multiplayer
     * Call this after Firebase and authentication are initialized
     */
    initializeWithFirebase() {
        console.log('Initializing EnemyShipManager with Firebase');
        
        // Initialize shipwreck manager with Firebase
        this.shipwreckManager.initializeWithFirebase();
    }
    
    /**
     * Get random enemy ship options
     * @returns {Object} Random enemy ship options
     */
    getRandomEnemyShipOptions() {
        // Define some basic ship types if enemyShipOptions isn't set up
        const defaultOptions = [
            {
                type: 'sloop',
                createShipMesh: () => {
                    const geometry = new THREE.BoxGeometry(5, 2, 12);
                    const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
                    return new THREE.Mesh(geometry, material);
                }
            },
            {
                type: 'schooner',
                createShipMesh: () => {
                    const geometry = new THREE.BoxGeometry(6, 2, 14);
                    const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
                    return new THREE.Mesh(geometry, material);
                }
            }
        ];
        
        // Use provided enemy ship options or default ones
        const options = this.enemyShipOptions.shipTypes || defaultOptions;
        
        // Pick a random ship type
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
    }
}

export default EnemyShipManager; 