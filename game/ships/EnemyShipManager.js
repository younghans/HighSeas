import * as THREE from 'three';
import Sloop from './Sloop.js';

/**
 * EnemyShipManager class for managing AI-controlled enemy ships
 */
class EnemyShipManager {
    /**
     * Create a new EnemyShipManager
     * @param {THREE.Scene} scene - The scene to add enemy ships to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
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
        
        // Create enemy ship
        const enemyShip = new Sloop(this.scene, {
            position: position,
            rotation: { y: Math.random() * Math.PI * 2 },
            speed: 3 + Math.random() * 3, // Random speed between 3-6
            hullColor: 0x8B0000, // Dark red hull for enemy ships
            isEnemy: true,
            maxHealth: 80 + Math.floor(Math.random() * 40), // Random health between 80-120
            cannonDamage: { min: 5, max: 20 },
            cannonCooldown: 3000 // 3 seconds between shots (adjust as needed)
        });
        
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
        // Convert to shipwreck
        this.convertToShipwreck(enemyShip);
        
        // Remove from enemy ships array but keep the shipwreck visible
        // We'll only remove it from the enemyShips array, not from the scene
        const index = this.enemyShips.findIndex(ship => ship === enemyShip);
        if (index !== -1) {
            this.enemyShips.splice(index, 1);
        }
    }
    
    /**
     * Convert enemy ship to shipwreck
     * @param {BaseShip} enemyShip - The enemy ship to convert
     */
    convertToShipwreck(enemyShip) {
        // Create loot for the shipwreck
        const loot = {
            gold: Math.floor(50 + Math.random() * 100),
            items: []
        };
        
        // Get the ship object
        const shipObject = enemyShip.getObject();
        
        // Update userData to mark as shipwreck
        if (shipObject) {
            shipObject.name = `shipwreck-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            shipObject.userData.isShipwreck = true;
            shipObject.userData.isEnemyShip = false; // No longer an enemy ship
            shipObject.userData.shipwreckId = Date.now();
            
            // Store reference in scene userData for additional cleanup
            if (!this.scene.userData.shipwreckObjects) {
                this.scene.userData.shipwreckObjects = [];
            }
            this.scene.userData.shipwreckObjects.push(shipObject);
        }
        
        // Add shipwreck to array
        this.shipwrecks.push({
            ship: enemyShip,
            loot: loot,
            position: enemyShip.getPosition().clone(),
            id: 'wreck-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            createdAt: Date.now(),
            looted: false
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
        // Find index of shipwreck
        const index = this.shipwrecks.findIndex(wreck => wreck.id === shipwreck.id);
        
        // Remove if found
        if (index !== -1) {
            // Remove treasure indicator if it exists
            if (shipwreck.ship && shipwreck.ship.treasureIndicator) {
                this.scene.remove(shipwreck.ship.treasureIndicator);
                
                // Remove from animation list if it exists
                if (this.scene.userData.treasureIndicators) {
                    const index = this.scene.userData.treasureIndicators.indexOf(shipwreck.ship.treasureIndicator);
                    if (index !== -1) {
                        this.scene.userData.treasureIndicators.splice(index, 1);
                    }
                }
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
                this.scene.remove(shipwreck.ship.shipMesh);
            }
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
                    
                    // Apply damage to player only if it's a hit
                    if (isHit) {
                        this.playerShip.takeDamage(damage);
                    }
                    
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
     * @returns {Object} The loot from the shipwreck
     */
    lootShipwreck(shipwreck) {
        // Mark as looted
        shipwreck.looted = true;
        
        // Get loot
        const loot = { ...shipwreck.loot };
        
        // Create a gold particle effect at the shipwreck position
        this.createLootEffect(shipwreck.position);
        
        // Remove treasure indicator if it exists
        if (shipwreck.ship && shipwreck.ship.treasureIndicator) {
            this.scene.remove(shipwreck.ship.treasureIndicator);
            
            // Remove from animation list if it exists
            if (this.scene.userData.treasureIndicators) {
                const index = this.scene.userData.treasureIndicators.indexOf(shipwreck.ship.treasureIndicator);
                if (index !== -1) {
                    this.scene.userData.treasureIndicators.splice(index, 1);
                }
            }
            
            // Clear reference
            shipwreck.ship.treasureIndicator = null;
        }
        
        // Start sinking animation instead of immediately scheduling removal
        this.startShipwreckSinkingAnimation(shipwreck);
        
        return loot;
    }
    
    /**
     * Start the sinking animation for a looted shipwreck
     * @param {Object} shipwreck - The shipwreck to sink
     */
    startShipwreckSinkingAnimation(shipwreck) {
        if (!shipwreck.ship || !shipwreck.ship.shipMesh) return;
        
        // Mark shipwreck as sinking
        shipwreck.sinking = true;
        shipwreck.sinkStartTime = Date.now();
        shipwreck.originalY = shipwreck.ship.shipMesh.position.y;
        shipwreck.sinkDuration = 10000; // 30 seconds to sink
        shipwreck.targetY = -2; // Sink 10 units below water
        
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
                        
                        // Update bubble effect
                        if (wreck.bubbles) {
                            this.updateBubbleEffect(wreck.bubbles, wreck.ship.shipMesh.position, progress);
                        }
                        
                        // Check if sinking is complete
                        if (progress >= 1) {
                            // Remove bubbles
                            if (wreck.bubbles) {
                                this.removeBubbleEffect(wreck.bubbles);
                                wreck.bubbles = null;
                            }
                            
                            // Remove from sinking list
                            this.sinkingShipwrecks.splice(i, 1);
                            
                            // Schedule actual removal
                            setTimeout(() => {
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
                    cancelAnimationFrame(this.scene.userData.shipwreckSinkingAnimationId);
                    this.scene.userData.shipwreckSinkingAnimationId = null;
                }
            };
            
            // Start animation loop
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
     * @param {CombatManager} combatManager - The combat manager
     */
    setCombatManager(combatManager) {
        this.combatManager = combatManager;
    }
}

export default EnemyShipManager; 