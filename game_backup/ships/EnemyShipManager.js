import * as THREE from 'three';
import Sloop from './Sloop.js';

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
        this.shipwrecks = [];
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
        
        // For synchronization between clients, add shipwrecks debouncing
        this.shipwreckSyncDebounceTimer = null;
        
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
        // Spawn initial enemy ships
        for (let i = 0; i < this.maxEnemyShips; i++) {
            this.spawnEnemyShip();
        }
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
        const enemyShip = new Sloop(this.scene, {
            position: position,
            rotation: { y: Math.random() * Math.PI * 2 },
            speed: 3 + Math.random() * 3, // Random speed between 3-6
            hullColor: 0x8B0000, // Dark red hull for enemy ships
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
        // Register the shipwreck in the manager
        this.registerShipwreck(enemyShip);
        
        // Remove from enemy ships array but keep the shipwreck visible
        // We'll only remove it from the enemyShips array, not from the scene
        const index = this.enemyShips.findIndex(ship => ship === enemyShip);
        if (index !== -1) {
            this.enemyShips.splice(index, 1);
        }
    }
    
    /**
     * Register enemy ship as a shipwreck and setup loot
     * @param {BaseShip} enemyShip - The enemy ship to register as a shipwreck
     */
    registerShipwreck(enemyShip) {
        // Create a unique ID for the shipwreck
        const shipwreckId = 'wreck-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        // Create loot for the shipwreck
        const loot = {
            gold: Math.floor(50 + Math.random() * 100),
            items: []
        };
        
        // Get position data
        const position = enemyShip.getPosition().clone();
        
        // Get ship type information for accurate reconstruction on other clients
        const shipType = enemyShip.type || 'sloop'; // Default to sloop if type not specified
        
        // Create shipwreck data for Firebase
        const shipwreckData = {
            loot: loot,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            shipType: shipType, // Save ship type so other clients know what model to use
            createdAt: Date.now(),
            looted: false,
            createdByClient: true  // Flag to indicate this was created locally first
        };
        
        // Add detailed debug logs to diagnose the issue
        console.log('Debug - registerShipwreck:');
        console.log('- this.combatService exists:', !!this.combatService);
        console.log('- window.firebase exists:', !!window.firebase);
        console.log('- window.auth exists:', !!window.auth);
        console.log('- window.auth.currentUser exists:', !!(window.auth && window.auth.currentUser));
        console.log('- storing shipType:', shipType);
        
        if (window.firebase) {
            console.log('- firebase.database exists:', !!window.firebase.database);
            if (window.firebase.database) {
                try {
                    const dbRef = window.firebase.database().ref();
                    console.log('- firebase.database().ref works:', !!dbRef);
                } catch (err) {
                    console.log('- Error accessing database ref:', err.message);
                }
            }
        }
        
        // Flag to track if this shipwreck has been created in Firebase
        // This will help us avoid duplicates when the data is loaded back from Firebase
        if (!this.locallyCreatedShipwreckIds) {
            this.locallyCreatedShipwreckIds = new Set();
        }
        this.locallyCreatedShipwreckIds.add(shipwreckId);
        
        // Save to Firebase if available
        if (this.combatService && window.firebase && window.auth) {
            try {
                console.log('Saving shipwreck to Firebase:', shipwreckId);
                console.log('Auth state:', window.auth.currentUser ? 'Logged in' : 'Not logged in');
                
                const shipwreckRef = window.firebase.database().ref(`shipwrecks/${shipwreckId}`);
                shipwreckRef.set(shipwreckData)
                    .then(() => console.log('Shipwreck saved to Firebase'))
                    .catch(error => console.error('Error saving shipwreck to Firebase:', error));
            } catch (error) {
                console.error('Error accessing Firebase:', error);
            }
        } else {
            console.warn('Firebase not available, shipwreck will only exist locally');
            if (!this.combatService) console.warn('- Missing combatService');
            if (!window.firebase) console.warn('- Missing window.firebase');
            if (!window.auth) console.warn('- Missing window.auth');
        }
        
        // Get the ship object
        const shipObject = enemyShip.getObject();
        
        // Update userData to mark as shipwreck
        if (shipObject) {
            shipObject.name = `shipwreck-${shipwreckId}`;
            shipObject.userData.isShipwreck = true;
            shipObject.userData.isEnemyShip = false; // No longer an enemy ship
            shipObject.userData.shipwreckId = shipwreckId; // Use the same ID as in Firebase
            shipObject.userData.shipType = shipType; // Store ship type for reference
            
            // Store reference in scene userData for additional cleanup
            if (!this.scene.userData.shipwreckObjects) {
                this.scene.userData.shipwreckObjects = [];
            }
            this.scene.userData.shipwreckObjects.push(shipObject);
        }
        
        // Add shipwreck to local array
        this.shipwrecks.push({
            ship: enemyShip,
            loot: loot,
            position: position,
            id: shipwreckId, // Use the same ID as in Firebase
            shipType: shipType, // Store ship type for reference
            createdAt: Date.now(),
            looted: false,
            isLocallyCreated: true // Flag to indicate this was created locally
        });
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
     * Remove a shipwreck
     * @param {Object} shipwreck - The shipwreck to remove
     */
    removeShipwreck(shipwreck) {
        console.log(`Removing shipwreck: ${shipwreck.id}, looted: ${shipwreck.looted}`);
        
        // Find index of shipwreck
        const index = this.shipwrecks.findIndex(wreck => wreck.id === shipwreck.id);
        
        // Remove if found
        if (index !== -1) {
            // Remove treasure indicator if it exists
            if (shipwreck.ship && shipwreck.ship.treasureIndicator) {
                console.log(`Removing treasure indicator for shipwreck: ${shipwreck.id}`);
                this.scene.remove(shipwreck.ship.treasureIndicator);
                
                // Remove from animation list if it exists
                if (this.scene.userData.treasureIndicators) {
                    const index = this.scene.userData.treasureIndicators.indexOf(shipwreck.ship.treasureIndicator);
                    if (index !== -1) {
                        this.scene.userData.treasureIndicators.splice(index, 1);
                    }
                }
                
                // Dispose of resources
                if (shipwreck.ship.treasureIndicator.children) {
                    shipwreck.ship.treasureIndicator.children.forEach(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
                
                shipwreck.ship.treasureIndicator = null;
            }
            
            // Clean up bubble effects if they exist
            if (shipwreck.bubbles) {
                console.log(`Removing bubble effect for shipwreck: ${shipwreck.id}`);
                this.removeBubbleEffect(shipwreck.bubbles);
                shipwreck.bubbles = null;
            }
            
            // Clean up wake particles if they exist
            if (shipwreck.ship && shipwreck.ship.wakeParticleSystem) {
                if (typeof shipwreck.ship.wakeParticleSystem.cleanup === 'function') {
                    shipwreck.ship.wakeParticleSystem.cleanup();
                } else if (typeof shipwreck.ship.wakeParticleSystem.dispose === 'function') {
                    shipwreck.ship.wakeParticleSystem.dispose();
                }
            }
            
            // Remove from array
            this.shipwrecks.splice(index, 1);
            
            // Remove mesh from scene
            if (shipwreck.ship && shipwreck.ship.shipMesh) {
                console.log(`Removing shipwreck mesh from scene: ${shipwreck.id}`);
                this.scene.remove(shipwreck.ship.shipMesh);
                
                // Dispose of geometries and materials
                if (shipwreck.ship.shipMesh.traverse) {
                    shipwreck.ship.shipMesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
            }
            
            // Remove references in scene userData
            if (this.scene.userData.shipwreckObjects) {
                const objectIndex = this.scene.userData.shipwreckObjects.findIndex(
                    obj => obj.userData && obj.userData.shipwreckId === shipwreck.id
                );
                if (objectIndex !== -1) {
                    this.scene.userData.shipwreckObjects.splice(objectIndex, 1);
                }
            }
            
            console.log(`Successfully removed shipwreck: ${shipwreck.id}`);
        } else {
            console.warn(`Could not find shipwreck with ID: ${shipwreck.id} to remove`);
        }
    }
    
    /**
     * Update enemy ships
     * @param {number} delta - Time delta since last frame
     * @param {number} time - Current time
     */
    update(delta, time) {
        // Check if we need to spawn new enemy ships
        const now = Date.now();
        if (now - this.lastSpawnTime > this.spawnInterval && this.enemyShips.length < this.maxEnemyShips) {
            this.spawnEnemyShip();
        }
        
        // Update each enemy ship
        this.enemyShips.forEach(enemyShip => {
            // Skip if sunk
            if (enemyShip.isSunk) return;
            
            // Update AI behavior
            this.updateEnemyAI(enemyShip, delta);
            
            // Update ship physics and animation
            enemyShip.update(delta, time);
        });
        
        // Clean up old shipwrecks (after 5 minutes)
        const SHIPWRECK_LIFETIME = 5 * 60 * 1000; // 5 minutes
        this.shipwrecks = this.shipwrecks.filter(wreck => {
            if (now - wreck.createdAt > SHIPWRECK_LIFETIME) {
                // Remove from scene
                if (wreck.ship && wreck.ship.shipMesh) {
                    this.scene.remove(wreck.ship.shipMesh);
                }
                return false;
            }
            return true;
        });
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
     * Check if player is in range to loot a shipwreck
     * @param {THREE.Vector3} playerPosition - The player's position
     * @returns {Object|null} The shipwreck that can be looted, or null if none
     */
    getLootableShipwreck(playerPosition) {
        for (const shipwreck of this.shipwrecks) {
            // Skip if already looted
            if (shipwreck.looted === true) continue;
            
            // Check distance
            const distance = playerPosition.distanceTo(shipwreck.position);
            if (distance <= this.lootableRange) {
                return shipwreck;
            }
        }
        
        return null;
    }
    
    /**
     * Loot a shipwreck
     * @param {Object} shipwreck - The shipwreck to loot
     * @returns {Promise<Object>} The loot from the shipwreck
     */
    async lootShipwreck(shipwreck) {
        // Skip if already looted
        if (shipwreck.looted) {
            console.warn('Shipwreck already looted:', shipwreck.id);
            return { gold: 0, items: [] };
        }
        
        // Immediately mark as looted locally for a responsive experience
        shipwreck.looted = true;
        shipwreck.lootedBy = window.auth?.currentUser?.uid || 'unknown';
        shipwreck.lootedAt = Date.now();
        
        // Get local copy of loot to return immediately
        const loot = { ...shipwreck.loot };
        
        // Remove the treasure indicator immediately
        if (shipwreck.ship && shipwreck.ship.treasureIndicator) {
            this.scene.remove(shipwreck.ship.treasureIndicator);
            
            // Also remove from the scene's treasure indicators array if it exists
            if (this.scene.userData.treasureIndicators) {
                const index = this.scene.userData.treasureIndicators.indexOf(shipwreck.ship.treasureIndicator);
                if (index !== -1) {
                    this.scene.userData.treasureIndicators.splice(index, 1);
                }
            }
            
            shipwreck.ship.treasureIndicator = null;
        }
        
        // Create a gold particle effect at the shipwreck position immediately
        this.createLootEffect(shipwreck.position);
        
        // Start sinking animation immediately
        this.startShipwreckSinkingAnimation(shipwreck);
        
        // Then, handle the server-side validation in the background
        if (this.combatService && window.firebase && window.auth) {
            try {
                console.log('Validating loot with server after local effects:', shipwreck.id);
                
                // Debug log the player's position
                const playerPosition = this.playerShip ? this.playerShip.getPosition() : null;
                console.log('Player position when looting:', playerPosition);
                
                // Update player position in Firebase before server validation
                if (window.auth.currentUser && this.playerShip) {
                    try {
                        const playerPos = this.playerShip.getPosition();
                        const uid = window.auth.currentUser.uid;
                        
                        // Update player position in Firebase
                        await window.firebase.database().ref(`players/${uid}/position`).set({
                            x: playerPos.x,
                            y: playerPos.y,
                            z: playerPos.z
                        });
                    } catch (error) {
                        console.error('Error updating player position in Firebase:', error);
                    }
                }
                
                // Call the server-side function to validate the loot
                const result = await this.combatService.lootShipwreck(shipwreck.id);
                
                if (result.success) {
                    console.log('Server confirmed successful loot:', result);
                    // The visual effects are already handled, no need to do anything else
                } else {
                    console.error('Server rejected loot attempt:', result.error);
                    // This is rare, but in case server rejected the loot attempt,
                    // we could show an error message to the player
                    if (window.gameUI && window.gameUI.showMessage) {
                        window.gameUI.showMessage('Server error: Failed to loot shipwreck', 'error');
                    }
                }
            } catch (error) {
                console.error('Error validating loot with server:', error);
                // We don't need to block the player experience due to server errors
            }
        } else {
            console.warn('CombatService unavailable, shipwreck looted locally only');
        }
        
        // Return the loot immediately for a responsive experience
        return loot;
    }
    
    /**
     * Start the sinking animation for a looted shipwreck
     * @param {Object} shipwreck - The shipwreck to sink
     */
    startShipwreckSinkingAnimation(shipwreck) {
        if (!shipwreck.ship || !shipwreck.ship.shipMesh) {
            console.warn('Cannot start sinking animation: shipwreck has no valid ship mesh');
            return;
        }
        
        // Skip if already sinking
        if (shipwreck.sinking) {
            console.log(`Shipwreck ${shipwreck.id} is already sinking, not starting another animation`);
            return;
        }
        
        console.log(`Starting sinking animation for shipwreck: ${shipwreck.id}`);
        
        // Mark shipwreck as sinking
        shipwreck.sinking = true;
        shipwreck.sinkStartTime = Date.now();
        shipwreck.originalY = shipwreck.ship.shipMesh.position.y;
        shipwreck.sinkDuration = 10000; // 10 seconds to sink
        shipwreck.targetY = -20; // Sink 20 units below water
        
        // Create bubble effect
        shipwreck.bubbles = this.createBubbleEffect(shipwreck.ship.shipMesh.position);
        
        // Initialize sinking shipwrecks array if it doesn't exist
        if (!this.sinkingShipwrecks) {
            this.sinkingShipwrecks = [];
        }
        
        // Add to sinking shipwrecks list
        this.sinkingShipwrecks.push(shipwreck);
        
        // Set up animation loop if not already running
        if (!this.scene.userData.shipwreckSinkingAnimationId) {
            const animateSinkingShipwrecks = () => {
                const now = Date.now();
                let activeSinking = false;
                
                // Update all sinking shipwrecks
                if (this.sinkingShipwrecks && this.sinkingShipwrecks.length > 0) {
                    // Use a reverse loop to safely remove items while iterating
                    for (let i = this.sinkingShipwrecks.length - 1; i >= 0; i--) {
                        const wreck = this.sinkingShipwrecks[i];
                        
                        // Skip invalid wrecks
                        if (!wreck || !wreck.sinking || !wreck.ship || !wreck.ship.shipMesh) {
                            console.log('Removing invalid shipwreck from sinking list');
                            this.sinkingShipwrecks.splice(i, 1);
                            continue;
                        }
                        
                        const elapsed = now - wreck.sinkStartTime;
                        const progress = Math.min(1, elapsed / wreck.sinkDuration);
                        
                        // Calculate new Y position with easing
                        const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
                        const newY = wreck.originalY + (wreck.targetY - wreck.originalY) * easedProgress;
                        
                        // Update position
                        wreck.ship.shipMesh.position.y = newY;
                        
                        // Add some rotation as it sinks
                        wreck.ship.shipMesh.rotation.z += 0.002;
                        wreck.ship.shipMesh.rotation.x += 0.001 * Math.sin(elapsed * 0.001); // Add slight rocking
                        
                        // Update bubble effect
                        if (wreck.bubbles) {
                            this.updateBubbleEffect(wreck.bubbles, wreck.ship.shipMesh.position, progress);
                        }
                        
                        // Check if sinking is complete
                        if (progress >= 1) {
                            console.log(`Shipwreck ${wreck.id} sinking animation complete`);
                            
                            // Remove bubbles
                            if (wreck.bubbles) {
                                this.removeBubbleEffect(wreck.bubbles);
                                wreck.bubbles = null;
                            }
                            
                            // Remove from sinking list
                            this.sinkingShipwrecks.splice(i, 1);
                            
                            // Schedule actual removal with a small delay
                            setTimeout(() => {
                                console.log(`Removing shipwreck ${wreck.id} from scene`);
                                this.removeShipwreck(wreck);
                            }, 1000);
                        } else {
                            activeSinking = true;
                        }
                    }
                }
                
                // Continue animation loop if there are active sinking shipwrecks
                if (activeSinking) {
                    this.scene.userData.shipwreckSinkingAnimationId = requestAnimationFrame(animateSinkingShipwrecks);
                } else {
                    console.log('All shipwreck sinking animations complete, stopping animation loop');
                    cancelAnimationFrame(this.scene.userData.shipwreckSinkingAnimationId);
                    this.scene.userData.shipwreckSinkingAnimationId = null;
                }
            };
            
            // Start animation loop
            console.log('Starting shipwreck sinking animation loop');
            this.scene.userData.shipwreckSinkingAnimationId = requestAnimationFrame(animateSinkingShipwrecks);
        }
    }
    
    /**
     * Create a bubble effect for sinking shipwrecks
     * @param {THREE.Vector3} position - Position to create the effect
     * @returns {Object} Bubble effect object
     */
    createBubbleEffect(position) {
        // Number of bubbles
        const bubbleCount = 30;
        
        // Create bubble geometry
        const bubbles = new THREE.Group();
        
        // Create individual bubbles
        for (let i = 0; i < bubbleCount; i++) {
            // Create bubble geometry (small sphere)
            const size = 0.1 + Math.random() * 0.3;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            
            // Create bubble material (semi-transparent blue/white)
            const material = new THREE.MeshBasicMaterial({
                color: 0xADDEFF,
                transparent: true,
                opacity: 0.6 + Math.random() * 0.2
            });
            
            // Create bubble mesh
            const bubble = new THREE.Mesh(geometry, material);
            
            // Random position around the shipwreck
            bubble.position.set(
                position.x + (Math.random() - 0.5) * 3,
                position.y + Math.random() * 1,
                position.z + (Math.random() - 0.5) * 3
            );
            
            // Add bubble data
            bubble.userData = {
                speed: 0.5 + Math.random() * 1.5,
                wobbleSpeed: 1 + Math.random() * 2,
                wobbleAmount: 0.05 + Math.random() * 0.1,
                startTime: Date.now() + i * 100, // Stagger bubble start times
                lifetime: 1000 + Math.random() * 2000 // Random lifetime between 1-3 seconds
            };
            
            // Add to group
            bubbles.add(bubble);
        }
        
        // Add to scene
        this.scene.add(bubbles);
        
        return {
            group: bubbles,
            lastEmitTime: Date.now(),
            emitInterval: 200 // Emit new bubbles every 200ms
        };
    }
    
    /**
     * Update bubble effect
     * @param {Object} bubbleEffect - Bubble effect object
     * @param {THREE.Vector3} position - Current position of the shipwreck
     * @param {number} sinkProgress - Progress of sinking animation (0-1)
     */
    updateBubbleEffect(bubbleEffect, position, sinkProgress) {
        const now = Date.now();
        const bubbles = bubbleEffect.group.children;
        
        // Update existing bubbles
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const bubble = bubbles[i];
            const elapsed = now - bubble.userData.startTime;
            
            // Check if bubble has expired
            if (elapsed > bubble.userData.lifetime) {
                // Remove bubble
                bubbleEffect.group.remove(bubble);
                bubble.geometry.dispose();
                bubble.material.dispose();
                continue;
            }
            
            // Move bubble upward
            bubble.position.y += bubble.userData.speed * 0.05;
            
            // Add wobble
            const wobble = Math.sin(elapsed * 0.01 * bubble.userData.wobbleSpeed) * bubble.userData.wobbleAmount;
            bubble.position.x += wobble;
            
            // Fade out as it rises
            const fadeProgress = elapsed / bubble.userData.lifetime;
            bubble.material.opacity = 0.8 * (1 - fadeProgress);
            
            // Grow slightly as it rises
            const scale = 1 + fadeProgress * 0.5;
            bubble.scale.set(scale, scale, scale);
        }
        
        // Add new bubbles if it's time and not near the end of sinking
        if (now - bubbleEffect.lastEmitTime > bubbleEffect.emitInterval && sinkProgress < 0.9) {
            // Emit more bubbles as sinking progresses (more intense)
            const newBubbleCount = Math.floor(2 + sinkProgress * 3);
            
            for (let i = 0; i < newBubbleCount; i++) {
                // Create bubble geometry (small sphere)
                const size = 0.1 + Math.random() * 0.3;
                const geometry = new THREE.SphereGeometry(size, 8, 8);
                
                // Create bubble material (semi-transparent blue/white)
                const material = new THREE.MeshBasicMaterial({
                    color: 0xADDEFF,
                    transparent: true,
                    opacity: 0.6 + Math.random() * 0.2
                });
                
                // Create bubble mesh
                const bubble = new THREE.Mesh(geometry, material);
                
                // Position at the shipwreck with random offset
                bubble.position.set(
                    position.x + (Math.random() - 0.5) * 3,
                    position.y + (Math.random() - 0.5) * 1,
                    position.z + (Math.random() - 0.5) * 3
                );
                
                // Add bubble data
                bubble.userData = {
                    speed: 0.5 + Math.random() * 1.5,
                    wobbleSpeed: 1 + Math.random() * 2,
                    wobbleAmount: 0.05 + Math.random() * 0.1,
                    startTime: now,
                    lifetime: 1000 + Math.random() * 2000 // Random lifetime between 1-3 seconds
                };
                
                // Add to group
                bubbleEffect.group.add(bubble);
            }
            
            // Update last emit time
            bubbleEffect.lastEmitTime = now;
        }
    }
    
    /**
     * Remove bubble effect
     * @param {Object} bubbleEffect - Bubble effect object
     */
    removeBubbleEffect(bubbleEffect) {
        if (!bubbleEffect || !bubbleEffect.group) return;
        
        // Remove all bubbles
        const bubbles = bubbleEffect.group.children.slice();
        for (const bubble of bubbles) {
            bubbleEffect.group.remove(bubble);
            bubble.geometry.dispose();
            bubble.material.dispose();
        }
        
        // Remove group from scene
        this.scene.remove(bubbleEffect.group);
    }
    
    /**
     * Create a gold particle effect when looting a shipwreck
     * @param {THREE.Vector3} position - Position to create the effect
     */
    createLootEffect(position) {
        // Number of particles
        const particleCount = 50;
        
        // Create particle geometry
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Gold color variations
        const goldColors = [
            new THREE.Color(0xFFD700), // Gold
            new THREE.Color(0xFFC125), // Goldenrod
            new THREE.Color(0xE6BE8A), // Pale gold
            new THREE.Color(0xFFEFD5)  // Papaya whip (light gold)
        ];
        
        // Set initial positions, colors, and sizes
        for (let i = 0; i < particleCount; i++) {
            // Random position around the center
            positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = position.y + 3 + Math.random() * 2; // Start above the shipwreck
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;
            
            // Random gold color
            const color = goldColors[Math.floor(Math.random() * goldColors.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Random size
            sizes[i] = 0.5 + Math.random() * 1.5;
        }
        
        // Set attributes
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // Create particle system
        const particleSystem = new THREE.Points(particles, particleMaterial);
        particleSystem.userData = {
            velocities: Array(particleCount).fill().map(() => ({
                x: (Math.random() - 0.5) * 2,
                y: 1 + Math.random() * 3, // Upward velocity
                z: (Math.random() - 0.5) * 2
            })),
            createdAt: Date.now()
        };
        
        // Add to scene
        this.scene.add(particleSystem);
        
        // Set up animation
        const animateParticles = () => {
            const positions = particleSystem.geometry.attributes.position.array;
            const sizes = particleSystem.geometry.attributes.size.array;
            const velocities = particleSystem.userData.velocities;
            const now = Date.now();
            const age = (now - particleSystem.userData.createdAt) / 1000; // Age in seconds
            
            // Update particle positions and sizes
            for (let i = 0; i < particleCount; i++) {
                // Apply gravity and update position
                velocities[i].y -= 0.1; // Gravity
                positions[i * 3] += velocities[i].x * 0.1;
                positions[i * 3 + 1] += velocities[i].y * 0.1;
                positions[i * 3 + 2] += velocities[i].z * 0.1;
                
                // Shrink particles over time
                sizes[i] *= 0.99;
            }
            
            // Update attributes
            particleSystem.geometry.attributes.position.needsUpdate = true;
            particleSystem.geometry.attributes.size.needsUpdate = true;
            
            // Fade out material
            particleSystem.material.opacity = Math.max(0, 1 - age / 2);
            
            // Continue animation or remove if too old
            if (age < 3) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particleSystem);
                particleSystem.geometry.dispose();
                particleSystem.material.dispose();
            }
        };
        
        // Start animation
        animateParticles();
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
        return this.shipwrecks;
    }
    
    /**
     * Set the player ship reference
     * @param {BaseShip} playerShip - The player's ship
     */
    setPlayerShip(playerShip) {
        this.playerShip = playerShip;
    }
    
    /**
     * Reset all enemy ships (remove and respawn)
     */
    reset() {
        console.log('EnemyShipManager: Performing complete reset');
        
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
        
        // Remove all shipwrecks
        this.shipwrecks.forEach(wreck => {
            // Remove treasure indicator if it exists
            if (wreck.ship && wreck.ship.treasureIndicator) {
                this.scene.remove(wreck.ship.treasureIndicator);
                
                // Remove from animation list if it exists
                if (this.scene.userData.treasureIndicators) {
                    const index = this.scene.userData.treasureIndicators.indexOf(wreck.ship.treasureIndicator);
                    if (index !== -1) {
                        this.scene.userData.treasureIndicators.splice(index, 1);
                    }
                }
            }
            
            // Clean up wake particles if they exist
            if (wreck.ship && wreck.ship.wakeParticleSystem) {
                if (typeof wreck.ship.wakeParticleSystem.cleanup === 'function') {
                    wreck.ship.wakeParticleSystem.cleanup();
                } else if (typeof wreck.ship.wakeParticleSystem.dispose === 'function') {
                    wreck.ship.wakeParticleSystem.dispose();
                }
            }
            
            // Clean up bubble effects if they exist
            if (wreck.bubbles) {
                this.removeBubbleEffect(wreck.bubbles);
                wreck.bubbles = null;
            }
            
            // Remove ship mesh and dispose resources
            if (wreck.ship && wreck.ship.shipMesh) {
                this.scene.remove(wreck.ship.shipMesh);
                
                // Dispose of geometries and materials
                if (wreck.ship.shipMesh.geometry) wreck.ship.shipMesh.geometry.dispose();
                if (wreck.ship.shipMesh.material) {
                    if (Array.isArray(wreck.ship.shipMesh.material)) {
                        wreck.ship.shipMesh.material.forEach(material => material.dispose());
                    } else {
                        wreck.ship.shipMesh.material.dispose();
                    }
                }
            }
        });
        
        // Clean up sinking shipwrecks animation
        if (this.scene.userData.shipwreckSinkingAnimationId) {
            cancelAnimationFrame(this.scene.userData.shipwreckSinkingAnimationId);
            this.scene.userData.shipwreckSinkingAnimationId = null;
        }
        
        // Clean up any remaining sinking shipwrecks
        if (this.sinkingShipwrecks) {
            this.sinkingShipwrecks.forEach(wreck => {
                // Clean up bubble effects if they exist
                if (wreck.bubbles) {
                    this.removeBubbleEffect(wreck.bubbles);
                    wreck.bubbles = null;
                }
                
                // Remove ship mesh and dispose resources
                if (wreck.ship && wreck.ship.shipMesh) {
                    this.scene.remove(wreck.ship.shipMesh);
                    
                    // Dispose of geometries and materials
                    if (wreck.ship.shipMesh.geometry) wreck.ship.shipMesh.geometry.dispose();
                    if (wreck.ship.shipMesh.material) {
                        if (Array.isArray(wreck.ship.shipMesh.material)) {
                            wreck.ship.shipMesh.material.forEach(material => material.dispose());
                        } else {
                            wreck.ship.shipMesh.material.dispose();
                        }
                    }
                }
            });
            
            this.sinkingShipwrecks = [];
        }
        
        // Clean up any other scene objects related to enemy ships
        if (this.scene.userData.enemyShipObjects) {
            this.scene.userData.enemyShipObjects.forEach(obj => {
                this.scene.remove(obj);
            });
            this.scene.userData.enemyShipObjects = [];
        }
        
        // Clean up any shipwreck objects
        if (this.scene.userData.shipwreckObjects) {
            this.scene.userData.shipwreckObjects.forEach(obj => {
                this.scene.remove(obj);
            });
            this.scene.userData.shipwreckObjects = [];
        }
        
        // Clear arrays
        this.enemyShips = [];
        this.shipwrecks = [];
        
        // Reset last spawn time
        this.lastSpawnTime = 0;
        
        // Respawn enemy ships
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
     * Load shipwrecks from Firebase to ensure all clients see the same shipwrecks
     * Called at game initialization and when shipwrecks are updated
     */
    loadShipwrecksFromFirebase() {
        // Skip if Firebase is not available
        if (!window.firebase || !window.auth || !window.auth.currentUser) {
            console.warn('Firebase not available, cannot load shipwrecks from server');
            return;
        }
        
        console.log('Loading shipwrecks from Firebase');
        
        // Get reference to shipwrecks in Firebase
        const shipwrecksRef = window.firebase.database().ref('shipwrecks');
        
        // Listen for shipwrecks
        shipwrecksRef.on('value', (snapshot) => {
            const fbShipwrecks = snapshot.val() || {};
            console.log('Received shipwrecks from Firebase:', Object.keys(fbShipwrecks).length);
            
            // Store shipwreck IDs that exist in Firebase
            const firebaseShipwreckIds = new Set(Object.keys(fbShipwrecks));
            const localShipwreckIds = new Set(this.shipwrecks.map(sw => sw.id));
            
            // Process each shipwreck from Firebase
            for (const [id, fbShipwreck] of Object.entries(fbShipwrecks)) {
                // Check if we already have this shipwreck locally
                const existingIndex = this.shipwrecks.findIndex(sw => sw.id === id);
                
                if (existingIndex === -1) {
                    // Check if this was locally created (avoid duplicate)
                    const wasLocallyCreated = this.locallyCreatedShipwreckIds && 
                                              this.locallyCreatedShipwreckIds.has(id);
                    
                    if (wasLocallyCreated) {
                        console.log(`Shipwreck ${id} was created locally, skipping Firebase creation`);
                        continue;
                    }
                    
                    // Skip already looted shipwrecks unless they were recently looted (last 30 seconds)
                    const wasRecentlyLooted = fbShipwreck.looted && 
                                             fbShipwreck.lootedAt && 
                                             (Date.now() - fbShipwreck.lootedAt < 30000);
                    
                    // If it's an old looted shipwreck, skip creating it
                    if (fbShipwreck.looted && !wasRecentlyLooted) {
                        console.log(`Skipping already looted shipwreck: ${id}`);
                        continue;
                    }
                    
                    console.log(`Adding new shipwreck from Firebase: ${id}`);
                    
                    // Create a new shipwreck in the local scene
                    this.createShipwreckFromFirebase(id, fbShipwreck);
                    
                    // If it was recently looted, start the sinking animation
                    if (wasRecentlyLooted) {
                        console.log(`Shipwreck ${id} was recently looted, starting sinking animation`);
                        const shipwreck = this.shipwrecks.find(sw => sw.id === id);
                        if (shipwreck) {
                            this.startShipwreckSinkingAnimation(shipwreck);
                        }
                    }
                } else {
                    // Update existing shipwreck if needed
                    const localShipwreck = this.shipwrecks[existingIndex];
                    
                    // If the shipwreck is now looted in Firebase but not locally, update local state
                    if (fbShipwreck.looted && !localShipwreck.looted) {
                        console.log(`Shipwreck ${id} was looted by another player`);
                        localShipwreck.looted = true;
                        localShipwreck.lootedAt = fbShipwreck.lootedAt;
                        localShipwreck.lootedBy = fbShipwreck.lootedBy;
                        
                        // Start the sinking animation if ship reference exists
                        if (localShipwreck.ship) {
                            // Remove treasure indicator if it exists
                            if (localShipwreck.ship.treasureIndicator) {
                                this.scene.remove(localShipwreck.ship.treasureIndicator);
                                
                                // Also remove from animation list if it exists
                                if (this.scene.userData.treasureIndicators) {
                                    const index = this.scene.userData.treasureIndicators.indexOf(localShipwreck.ship.treasureIndicator);
                                    if (index !== -1) {
                                        this.scene.userData.treasureIndicators.splice(index, 1);
                                    }
                                }
                                
                                localShipwreck.ship.treasureIndicator = null;
                            }
                            
                            // Start sinking animation
                            this.startShipwreckSinkingAnimation(localShipwreck);
                        }
                    }
                }
            }
            
            // Find shipwrecks in our local array that don't exist in Firebase
            // (shouldn't happen but just in case)
            const localOnly = [...localShipwreckIds].filter(id => !firebaseShipwreckIds.has(id));
            for (const id of localOnly) {
                // Skip very recently created local shipwrecks that might not have
                // been synchronized to Firebase yet
                const shipwreck = this.shipwrecks.find(sw => sw.id === id);
                if (shipwreck && shipwreck.isLocallyCreated && 
                    Date.now() - shipwreck.createdAt < 5000) {
                    console.log(`Keeping recently created local shipwreck ${id} (waiting for Firebase sync)`);
                    continue;
                }
                
                console.log(`Local shipwreck ${id} does not exist in Firebase, removing`);
                const indexToRemove = this.shipwrecks.findIndex(sw => sw.id === id);
                if (indexToRemove !== -1) {
                    const shipwreckToRemove = this.shipwrecks[indexToRemove];
                    this.removeShipwreck(shipwreckToRemove);
                }
            }
        });
        
        // Listen for specific shipwreck changes (for real-time updates)
        shipwrecksRef.on('child_changed', (snapshot) => {
            const fbShipwreck = snapshot.val();
            const id = snapshot.key;
            
            if (!fbShipwreck) return;
            
            console.log(`Shipwreck ${id} updated in Firebase:`, fbShipwreck);
            
            // Find the shipwreck locally
            const localShipwreckIndex = this.shipwrecks.findIndex(sw => sw.id === id);
            
            // If we have this shipwreck locally
            if (localShipwreckIndex !== -1) {
                const localShipwreck = this.shipwrecks[localShipwreckIndex];
                
                // If the shipwreck was newly looted, update local state and start sinking
                if (fbShipwreck.looted && !localShipwreck.looted) {
                    console.log(`Shipwreck ${id} was just looted by another player, starting sinking animation`);
                    localShipwreck.looted = true;
                    localShipwreck.lootedAt = fbShipwreck.lootedAt;
                    localShipwreck.lootedBy = fbShipwreck.lootedBy;
                    
                    // Remove treasure indicator if it exists
                    if (localShipwreck.ship && localShipwreck.ship.treasureIndicator) {
                        this.scene.remove(localShipwreck.ship.treasureIndicator);
                        
                        // Also remove from animation list if it exists
                        if (this.scene.userData.treasureIndicators) {
                            const index = this.scene.userData.treasureIndicators.indexOf(localShipwreck.ship.treasureIndicator);
                            if (index !== -1) {
                                this.scene.userData.treasureIndicators.splice(index, 1);
                            }
                        }
                        
                        localShipwreck.ship.treasureIndicator = null;
                    }
                    
                    // Start sinking animation
                    this.startShipwreckSinkingAnimation(localShipwreck);
                }
            }
        });
        
        // Make sure treasure animations are running if there are any treasure indicators
        this.ensureTreasureAnimationLoop();
    }
    
    /**
     * Create a shipwreck in the scene from Firebase data
     * @param {string} id - The shipwreck ID
     * @param {Object} fbShipwreck - The shipwreck data from Firebase
     */
    createShipwreckFromFirebase(id, fbShipwreck) {
        // Get ship type from Firebase
        const shipType = fbShipwreck.shipType || 'sloop';
        console.log(`Creating shipwreck from Firebase with ship type: ${shipType}, looted: ${fbShipwreck.looted}`);
        
        // Create an actual Sloop instance but don't add it to enemy ships
        const tempShip = new Sloop(this.scene, {
            position: new THREE.Vector3(
                fbShipwreck.position.x,
                fbShipwreck.position.y,
                fbShipwreck.position.z
            ),
            // Use damaged/wrecked appearance
            hullColor: 0x8B4513, // Brown
            type: shipType
        });
        
        // Explicitly hide the clickable sphere since this is a shipwreck
        if (tempShip.clickBoxSphere) {
            tempShip.clickBoxSphere.visible = false;
        }
        
        // Get the ship mesh
        const shipMesh = tempShip.getObject();
        
        // Store the position for easier access
        const position = new THREE.Vector3(
            fbShipwreck.position.x,
            fbShipwreck.position.y,
            fbShipwreck.position.z
        );
        
        // Create a dummy ship object that will be used for the shipwreck
        const dummyShip = {
            getPosition: () => position.clone(),
            getObject: () => shipMesh,
            shipMesh: shipMesh,
            type: shipType,
            isSunk: true // Explicitly mark as sunk to ensure it's skipped in click handling
        };
        
        // Position the ship
        shipMesh.position.copy(position);
        
        // Apply shipwreck appearance
        shipMesh.rotation.z = Math.PI * 0.4; // Capsized rotation
        
        // If the ship has materials, modify them to look damaged
        if (shipMesh.material) {
            shipMesh.material.color.multiplyScalar(0.7);
            shipMesh.material.color.r = Math.min(1, shipMesh.material.color.r * 1.5);
        } else if (shipMesh.children) {
            shipMesh.children.forEach(child => {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat.color) {
                                mat.color.multiplyScalar(0.7);
                                mat.color.r = Math.min(1, mat.color.r * 1.5);
                            }
                        });
                    } else if (child.material.color) {
                        child.material.color.multiplyScalar(0.7);
                        child.material.color.r = Math.min(1, child.material.color.r * 1.5);
                    }
                }
            });
        }
        
        // Update userData to mark as shipwreck
        if (shipMesh) {
            shipMesh.name = `shipwreck-${id}`;
            shipMesh.userData.isShipwreck = true;
            shipMesh.userData.isEnemyShip = false;
            shipMesh.userData.shipwreckId = id;
            shipMesh.userData.shipType = shipType;
            shipMesh.userData.looted = fbShipwreck.looted || false;
            
            // Store reference in scene userData for additional cleanup
            if (!this.scene.userData.shipwreckObjects) {
                this.scene.userData.shipwreckObjects = [];
            }
            this.scene.userData.shipwreckObjects.push(shipMesh);
        }
        
        // Create the shipwreck object to add to our shipwrecks array
        const shipwreckObj = {
            ship: dummyShip,
            loot: fbShipwreck.loot || { gold: 50 + Math.random() * 100, items: [] },
            position: position,
            id: id,
            shipType: shipType, // Store ship type for reference
            createdAt: fbShipwreck.createdAt || Date.now(),
            looted: fbShipwreck.looted || false, // Set looted status from Firebase
            lootedAt: fbShipwreck.lootedAt || null,
            lootedBy: fbShipwreck.lootedBy || null
        };
        
        // Add treasure indicator only if not looted
        if (!shipwreckObj.looted) {
            this.addTreasureIndicatorToShip(dummyShip);
        }
        
        // Add to shipwrecks array
        this.shipwrecks.push(shipwreckObj);
        
        // Make sure treasure animations are running if needed
        this.ensureTreasureAnimationLoop();
        
        return shipwreckObj;
    }
    
    /**
     * Get ship options by type
     * @param {string} shipType - The type of ship to find options for
     * @returns {Object} Ship options for the requested type
     */
    getShipOptionsByType(shipType) {
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
        
        // Find the matching ship type
        const matchingOption = options.find(option => option.type === shipType);
        
        // Return the matching option or a default if not found
        return matchingOption || options[0];
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
    
    /**
     * Add a treasure indicator to a ship
     * @param {Object} ship - The ship to add the treasure indicator to
     */
    addTreasureIndicatorToShip(ship) {
        if (!this.scene || !ship.shipMesh) return;
        
        // Create a treasure chest with a more distinctive appearance
        const chestGeometry = new THREE.BoxGeometry(1.5, 1, 1);
        const chestMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold color
        const treasureChest = new THREE.Mesh(chestGeometry, chestMaterial);
        
        // Add a glow effect by creating a slightly larger, semi-transparent box
        const glowGeometry = new THREE.BoxGeometry(1.8, 1.3, 1.3);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00, 
            transparent: true, 
            opacity: 0.3 
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        treasureChest.add(glowMesh);
        
        // Position above the shipwreck
        treasureChest.position.copy(ship.shipMesh.position);
        treasureChest.position.y = 4; // Float above the ship for better visibility
        
        // Add animation data
        treasureChest.userData = {
            baseY: treasureChest.position.y,
            phase: Math.random() * Math.PI * 2, // Random starting phase
            bobSpeed: 1 + Math.random() * 0.5,  // Random bob speed
            bobHeight: 0.5 + Math.random() * 0.3 // Increased bob height for visibility
        };
        
        // Create a "LOOT" text label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'gold';
        context.strokeStyle = 'black';
        context.lineWidth = 4;
        context.strokeText('LOOT', canvas.width / 2, canvas.height / 2);
        context.fillText('LOOT', canvas.width / 2, canvas.height / 2);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });
        const textSprite = new THREE.Sprite(material);
        textSprite.scale.set(4, 2, 1);
        textSprite.position.y = 1.5;
        treasureChest.add(textSprite);
        
        // Add to scene
        this.scene.add(treasureChest);
        
        // Add to treasure indicators array for animation
        if (!this.scene.userData.treasureIndicators) {
            this.scene.userData.treasureIndicators = [];
        }
        this.scene.userData.treasureIndicators.push(treasureChest);
        
        // Store reference in ship
        ship.treasureIndicator = treasureChest;
    }
    
    /**
     * Initialize the manager with Firebase listeners for multiplayer
     * Call this after Firebase and authentication are initialized
     */
    initializeWithFirebase() {
        console.log('Initializing EnemyShipManager with Firebase');
        
        // Load shipwrecks from Firebase for multiplayer synchronization
        this.loadShipwrecksFromFirebase();
    }
    
    /**
     * Ensure the treasure animation loop is running if there are treasure indicators
     * This should be called after loading shipwrecks from Firebase
     */
    ensureTreasureAnimationLoop() {
        // Only proceed if we have treasure indicators
        if (this.scene && 
            this.scene.userData && 
            this.scene.userData.treasureIndicators && 
            this.scene.userData.treasureIndicators.length > 0) {
            
            // Start the animation loop if it's not already running
            if (!this.scene.userData.treasureAnimationId) {
                console.log('Restarting treasure animation loop for', 
                    this.scene.userData.treasureIndicators.length, 'indicators');
                
                const animateTreasures = () => {
                    const time = Date.now() * 0.001; // Convert to seconds
                    
                    // Animate all treasure indicators
                    this.scene.userData.treasureIndicators.forEach(indicator => {
                        if (indicator && indicator.userData) {
                            // Bob up and down
                            indicator.position.y = indicator.userData.baseY + 
                                Math.sin(time * indicator.userData.bobSpeed + indicator.userData.phase) * 
                                indicator.userData.bobHeight;
                            
                            // Slowly rotate
                            indicator.rotation.y += 0.02;
                            
                            // Make the glow pulse
                            if (indicator.children && indicator.children[0]) {
                                const glow = indicator.children[0];
                                if (glow.material) {
                                    glow.material.opacity = 0.3 + Math.sin(time * 2) * 0.2;
                                }
                            }
                        }
                    });
                    
                    // Continue animation loop only if we have indicators
                    if (this.scene.userData.treasureIndicators && 
                        this.scene.userData.treasureIndicators.length > 0) {
                        this.scene.userData.treasureAnimationId = requestAnimationFrame(animateTreasures);
                    } else {
                        // No indicators left, clear the animation ID
                        this.scene.userData.treasureAnimationId = null;
                    }
                };
                
                // Start animation loop
                this.scene.userData.treasureAnimationId = requestAnimationFrame(animateTreasures);
            }
        }
    }
}

export default EnemyShipManager; 