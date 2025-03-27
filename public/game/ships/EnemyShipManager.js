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
            modelType: 'sailboat-3',
            speed: 3 + Math.random() * 3, // Same speed as regular enemies (3-6)
            hullColor: 0x800080, // Purple for guardians
            sailColor: 0x000000, // Black sails
            isEnemy: true,
            maxHealth: 80 + Math.floor(Math.random() * 40), // Same health as regular enemies (80-120)
            cannonDamage: { min: 5, max: 20 }, // Same damage as regular enemies
            cannonCooldown: 3000, // Same cooldown as regular enemies (3 seconds)
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
        
        // Generate random position away from player
        let position;
        if (this.playerShip) {
            const playerPos = this.playerShip.getPosition();
            
            // Generate position at least 300 units away from player
            let tooClose = true;
            while (tooClose) {
                position = new THREE.Vector3(
                    (Math.random() - 0.5) * this.worldSize,
                    0, // Ensure Y is exactly at water level
                    (Math.random() - 0.5) * this.worldSize
                );
                
                // Check if position is far enough from player
                const distance = position.distanceTo(playerPos);
                if (distance > 300 && distance < this.spawnRadius) {
                    tooClose = false;
                }
            }
        } else {
            // No player ship, just spawn randomly
            position = new THREE.Vector3(
                (Math.random() - 0.5) * this.worldSize,
                0, // Ensure Y is exactly at water level
                (Math.random() - 0.5) * this.worldSize
            );
        }
        
        // Get a random ship type 
        const shipOptions = this.getRandomEnemyShipOptions();
        const shipType = shipOptions.type || 'sloop';
        
        // Create enemy ship
        const enemyShip = new SailboatShip(this.scene, {
            position: position,
            rotation: { y: Math.random() * Math.PI * 2 },
            modelType: 'sailboat-2',
            speed: 3 + Math.random() * 3, // Random speed between 3-6
            hullColor: 0x8B0000, // Dark red hull for enemy ships
            sailColor: 0x000000, // Black sails
            isEnemy: true,
            maxHealth: 80 + Math.floor(Math.random() * 40), // Random health between 80-120
            cannonDamage: { min: 5, max: 20 },
            cannonCooldown: 3000, // 3 seconds between shots (adjust as needed)
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
        
        // Check if we should change state
        const now = Date.now();
        if (now - enemyShip.lastStateChange > enemyShip.stateChangeCooldown) {
            // Decide next state based on distance to player
            if (distanceToPlayer < this.aggroRange && !this.playerShip.isSunk) {
                // Player is in range and not sunk, attack
                enemyShip.aiState = 'attack';
                enemyShip.targetShip = this.playerShip;
            } else {
                // Player is out of range or sunk, patrol
                enemyShip.aiState = 'patrol';
                enemyShip.targetShip = null;
                
                // Set random patrol target
                enemyShip.patrolTarget = new THREE.Vector3(
                    (Math.random() - 0.5) * this.worldSize,
                    0, // Always set Y to water level
                    (Math.random() - 0.5) * this.worldSize
                );
            }
            
            enemyShip.lastStateChange = now;
        }
        
        // Handle AI state
        switch (enemyShip.aiState) {
            case 'patrol':
                // If no patrol target, set one
                if (!enemyShip.patrolTarget) {
                    enemyShip.patrolTarget = new THREE.Vector3(
                        (Math.random() - 0.5) * this.worldSize,
                        0, // Always set Y to water level
                        (Math.random() - 0.5) * this.worldSize
                    );
                    
                    enemyShip.lastStateChange = now;
                    break;
                }
                
                // Ensure patrol target is at water level
                if (enemyShip.patrolTarget.y !== 0) {
                    enemyShip.patrolTarget.y = 0;
                }
                
                // Move towards patrol target
                if (!enemyShip.isMoving) {
                    enemyShip.moveTo(enemyShip.patrolTarget);
                }
                
                // Check if reached patrol target
                const distanceToTarget = enemyPos.distanceTo(enemyShip.patrolTarget);
                if (distanceToTarget < 10) {
                    // Set new patrol target
                    enemyShip.patrolTarget = new THREE.Vector3(
                        (Math.random() - 0.5) * this.worldSize,
                        0, // Always set Y to water level
                        (Math.random() - 0.5) * this.worldSize
                    );
                    
                    enemyShip.lastStateChange = now;
                    break;
                }
                
                // Check if player is in range
                if (distanceToPlayer < this.aggroRange && !this.playerShip.isSunk) {
                    // Player is in range and not sunk, switch to attack
                    enemyShip.aiState = 'attack';
                    enemyShip.targetShip = this.playerShip;
                    enemyShip.lastStateChange = now;
                }
                break;
                
            case 'attack':
                // If player is sunk or out of range, switch to patrol
                if (this.playerShip.isSunk || distanceToPlayer > this.aggroRange * 1.5) {
                    enemyShip.aiState = 'patrol';
                    enemyShip.targetShip = null;
                    
                    // Set random patrol target
                    enemyShip.patrolTarget = new THREE.Vector3(
                        (Math.random() - 0.5) * this.worldSize,
                        0, // Always set Y to water level
                        (Math.random() - 0.5) * this.worldSize
                    );
                    
                    enemyShip.lastStateChange = now;
                    break;
                }
                
                // Move towards player but keep some distance
                const targetPos = new THREE.Vector3();
                const direction = new THREE.Vector3()
                    .subVectors(playerPos, enemyPos)
                    .normalize();
                
                // Try to maintain a distance of 30-40 units for combat
                const idealDistance = 35;
                if (distanceToPlayer > idealDistance + 10) {
                    // Too far, move closer
                    targetPos.copy(playerPos).sub(direction.multiplyScalar(idealDistance));
                    targetPos.y = 0; // Ensure Y is at water level
                    enemyShip.moveTo(targetPos);
                } else if (distanceToPlayer < idealDistance - 10) {
                    // Too close, back up
                    targetPos.copy(playerPos).sub(direction.multiplyScalar(idealDistance));
                    targetPos.y = 0; // Ensure Y is at water level
                    enemyShip.moveTo(targetPos);
                } else if (!enemyShip.isMoving) {
                    // At good distance but not moving, circle around player
                    const circlePos = new THREE.Vector3(
                        playerPos.x + Math.cos(now * 0.0005) * idealDistance,
                        0, // Always set Y to water level
                        playerPos.z + Math.sin(now * 0.0005) * idealDistance
                    );
                    enemyShip.moveTo(circlePos);
                }
                
                // Check if player is in range and enemy can fire
                if (distanceToPlayer <= enemyShip.cannonRange && enemyShip.canFire()) {
                    // Determine if shot is a hit or miss (70% hit chance)
                    const isHit = Math.random() >= 0.3;
                    
                    // Calculate damage (0 for misses)
                    const damage = isHit ? Math.floor(
                        enemyShip.cannonDamage.min + 
                        Math.random() * (enemyShip.cannonDamage.max - enemyShip.cannonDamage.min)
                    ) : 0;
                    
                    // Remove direct damage application - damage will be applied when cannonball hits
                    // if (isHit) {
                    //    this.playerShip.takeDamage(damage);
                    // }
                    
                    // Update last fired time
                    enemyShip.lastFiredTime = Date.now();
                    
                    // Use combat manager to visualize cannonball if available
                    if (this.combatManager) {
                        this.combatManager.fireCannonball(enemyShip, this.playerShip, damage, !isHit);
                    }
                }
                break;
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