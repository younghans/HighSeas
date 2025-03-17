import * as THREE from 'three';
import WakeParticleSystem from './WakeParticleSystem.js';

/**
 * Base class for all ships in the game
 * This class provides common functionality for all ships
 */
class BaseShip {
    /**
     * Create a new ship
     * @param {THREE.Scene} scene - The scene to add the ship to
     * @param {Object} options - Ship configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.targetPosition = null;
        this.isMoving = false;
        this.shipMesh = null;
        this.targetIslandPoint = null;
        
        // Ship properties with defaults that can be overridden
        this.speed = options.speed || 5;
        this.hullColor = options.hullColor || 0x8B4513;
        this.deckColor = options.deckColor || 0xD2B48C;
        this.sailColor = options.sailColor || 0xFFFFFF;
        
        // Combat properties
        this.maxHealth = options.maxHealth || 100;
        this.currentHealth = options.currentHealth || this.maxHealth;
        this.isEnemy = options.isEnemy || false;
        this.isSunk = false;
        this.cannonRange = options.cannonRange || 50;
        this.cannonDamage = options.cannonDamage || { min: 5, max: 15 };
        this.cannonCooldown = options.cannonCooldown || 2000; // milliseconds
        this.lastFiredTime = 0;
        
        // Store wake particle options for later initialization
        this.wakeParticleOptions = options.wakeParticleOptions || {};
        this.wakeParticleSystem = null;
        
        // Store initial position if provided in options
        if (options.position) {
            this.position.copy(options.position);
        }
        
        // Store initial rotation if provided in options
        if (options.rotation) {
            this.rotation.y = options.rotation.y || 0;
        }
    }
    
    /**
     * Create the ship mesh - to be implemented by subclasses
     */
    createShip() {
        throw new Error('createShip() must be implemented by subclass');
    }
    
    /**
     * Initialize the wake particle system
     * This should be called after the ship mesh has been created
     */
    initWakeParticleSystem() {
        if (this.shipMesh) {
            this.wakeParticleSystem = new WakeParticleSystem(this.scene, this, this.wakeParticleOptions);
        } else {
            console.error('Cannot initialize wake particle system: ship mesh not created yet');
        }
    }
    
    /**
     * Move the ship to a target position
     * @param {THREE.Vector3} targetPos - The target position
     */
    moveTo(targetPos) {
        // Skip if no ship mesh
        if (!this.shipMesh) return;
        
        // Clone the target position and ensure Y is at water level
        this.targetPosition = targetPos.clone();
        this.targetPosition.y = 0; // Force Y to be at water level
        
        // Calculate direction to target
        const direction = new THREE.Vector3()
            .subVectors(this.targetPosition, this.shipMesh.position)
            .normalize();
        
        // Set ship rotation to face the target
        const newRotationY = Math.atan2(direction.x, direction.z);
        this.shipMesh.rotation.y = newRotationY;
        
        // Sync internal rotation with mesh rotation
        this.rotation.y = newRotationY;
        
        this.isMoving = true;
    }
    
    /**
     * Stop the ship's movement
     */
    stopMoving() {
        this.isMoving = false;
        this.targetPosition = null;
    }
    
    /**
     * Update the ship's position and animation
     * @param {number} delta - Time delta since last frame
     * @param {number} time - Current time
     */
    update(delta, time) {
        // Don't move if sunk
        if (this.isSunk) {
            // Add sinking animation if ship is sunk
            if (this.shipMesh) {
                // Gradually sink the ship
                if (this.shipMesh.position.y > -2.5) {
                    this.shipMesh.position.y -= 0.2 * delta;
                    this.shipMesh.rotation.z += 0.1 * delta;
                    
                    // Sync internal rotation with mesh rotation
                    this.rotation.z = this.shipMesh.rotation.z;
                }
            }
            return;
        }
        
        // Move ship towards target
        if (this.isMoving && this.targetPosition) {
            // Calculate direction and distance to target
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.shipMesh.position)
                .normalize();
            const distance = this.shipMesh.position.distanceTo(this.targetPosition);
            
            // Move ship if not very close to target
            if (distance > 0.1) {
                // Move ship at a constant speed
                const moveSpeed = this.speed * delta;
                
                // Calculate new position
                const newPosition = this.shipMesh.position.clone().add(direction.multiplyScalar(moveSpeed));
                
                // Ensure Y position stays at water level
                newPosition.y = 0;
                
                // Apply new position
                this.shipMesh.position.copy(newPosition);
                
                // Update internal position to match mesh position
                this.position.copy(this.shipMesh.position);
                
                // Add slight bobbing motion
                this.shipMesh.rotation.x = Math.sin(time * 2) * 0.05;
                this.shipMesh.rotation.z = Math.sin(time * 1.5) * 0.05;
                
                // Sync internal rotation with mesh rotation
                this.rotation.x = this.shipMesh.rotation.x;
                this.rotation.z = this.shipMesh.rotation.z;
                
                // Emit wake particles when moving
                if (this.wakeParticleSystem) {
                    this.wakeParticleSystem.emitParticles(delta);
                }
            } else {
                this.isMoving = false;
                
                // Ensure final position has correct Y value
                if (this.shipMesh.position.y !== 0) {
                    this.shipMesh.position.y = 0;
                    this.position.y = 0;
                }
            }
        }
        
        // Update wake particles regardless of movement (to let active ones fade out)
        if (this.wakeParticleSystem) {
            this.wakeParticleSystem.updateParticles(delta);
        }
        
        // Add gentle bobbing even when not moving
        if (!this.isMoving) {
            this.shipMesh.rotation.x = Math.sin(time * 1.5) * 0.03;
            this.shipMesh.rotation.z = Math.sin(time * 1.2) * 0.03;
            
            // Ensure Y position stays at water level
            if (this.shipMesh.position.y !== 0) {
                this.shipMesh.position.y = 0;
            }
        }
    }
    
    /**
     * Get the ship's current position
     * @returns {THREE.Vector3} The ship's position
     */
    getPosition() {
        // Make sure internal position matches mesh position
        if (this.shipMesh) {
            this.position.copy(this.shipMesh.position);
        }
        return this.position;
    }
    
    /**
     * Set the ship's position
     * @param {THREE.Vector3} position - The new position
     */
    setPosition(position) {
        this.position.copy(position);
        if (this.shipMesh) {
            this.shipMesh.position.copy(position);
        }
    }
    
    /**
     * Get the ship's mesh object
     * @returns {THREE.Object3D} The ship's mesh
     */
    getObject() {
        return this.shipMesh;
    }
    
    /**
     * Get the ship's current speed
     * @returns {number} The ship's speed
     */
    getSpeed() {
        return this.speed;
    }
    
    /**
     * Set the ship's speed
     * @param {number} speed - The new speed
     */
    setSpeed(speed) {
        this.speed = speed;
    }
    
    /**
     * Apply damage to the ship
     * @param {number} amount - Amount of damage to apply
     * @returns {boolean} True if the ship was sunk as a result of this damage
     */
    takeDamage(amount) {
        if (this.isSunk) return false;
        
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        
        // Check if ship is sunk
        if (this.currentHealth <= 0) {
            this.sink();
            return true;
        }
        
        return false;
    }
    
    /**
     * Sink the ship
     */
    sink() {
        if (this.isSunk) return;
        
        this.isSunk = true;
        this.stopMoving();
        
        // Stop wake particles if they exist
        if (this.wakeParticleSystem) {
            // Call cleanup method to immediately remove all particles
            if (typeof this.wakeParticleSystem.cleanup === 'function') {
                this.wakeParticleSystem.cleanup();
            } else if (typeof this.wakeParticleSystem.stop === 'function') {
                // Fallback to stop if cleanup doesn't exist
                this.wakeParticleSystem.stop();
            }
        }
        
        // Convert to shipwreck
        this.convertToShipwreck();
        
        // Trigger any sink-specific behavior
        this.onSink();
    }
    
    /**
     * Handle ship sinking - to be overridden by subclasses if needed
     */
    onSink() {
        // Base implementation does nothing
        console.log('Ship sunk!');
    }
    
    /**
     * Check if the ship can fire cannons (cooldown check)
     * @returns {boolean} True if the ship can fire
     */
    canFire() {
        const now = Date.now();
        return now - this.lastFiredTime >= this.cannonCooldown;
    }
    
    /**
     * Fire cannons at a target
     * @param {BaseShip} target - The target ship
     * @param {Object} combatManager - Optional combat manager for miss chance calculation
     * @returns {number} Amount of damage dealt, or 0 if couldn't fire or missed
     */
    fireCannons(target, combatManager = null) {
        if (this.isSunk || !this.canFire()) return 0;
        
        // Check if target is in range
        const distance = this.getPosition().distanceTo(target.getPosition());
        if (distance > this.cannonRange) return 0;
        
        // Set last fired time
        this.lastFiredTime = Date.now();
        
        // Determine if shot is a hit or miss
        let isHit = false;
        
        // Use combat manager's miss chance calculation if available
        if (combatManager && combatManager.calculateMissChance) {
            const missChance = combatManager.calculateMissChance(this, target);
            isHit = Math.random() >= missChance;
        } else {
            // Fallback to simple 70% hit chance
            isHit = Math.random() >= 0.3;
        }
        
        // If it's a miss, return 0 damage
        if (!isHit) return 0;
        
        // Calculate random damage for hits
        const damage = Math.floor(
            this.cannonDamage.min + 
            Math.random() * (this.cannonDamage.max - this.cannonDamage.min)
        );
        
        // Apply damage to target
        target.takeDamage(damage);
        
        return damage;
    }
    
    /**
     * Get the current health percentage
     * @returns {number} Health percentage (0-100)
     */
    getHealthPercentage() {
        return (this.currentHealth / this.maxHealth) * 100;
    }
    
    /**
     * Reset the ship's health to maximum
     */
    resetHealth() {
        this.currentHealth = this.maxHealth;
        this.isSunk = false;
    }
    
    /**
     * Convert a sunken ship to a shipwreck
     * This method changes the appearance of the ship to look like a shipwreck
     */
    convertToShipwreck() {
        // If the ship mesh exists, modify it to look like a shipwreck
        if (this.shipMesh) {
            // Rotate the ship to make it look capsized
            this.shipMesh.rotation.z = Math.PI * 0.4; // More pronounced tilt
            
            // Sync internal rotation with mesh rotation
            this.rotation.z = this.shipMesh.rotation.z;
            
            // Adjust position to keep more of the ship visible above water
            this.shipMesh.position.y -= 0.2; // Less submerged than before
            
            // Sync internal position with mesh position
            this.position.y = this.shipMesh.position.y;
            
            // If the ship has materials, modify them to look damaged but still visible
            if (this.shipMesh.material) {
                // For a single material
                this.shipMesh.material.color.multiplyScalar(0.7); // Less darkening
                // Add some red tint to indicate damage
                this.shipMesh.material.color.r = Math.min(1, this.shipMesh.material.color.r * 1.5);
            } else if (this.shipMesh.children) {
                // For multiple materials/meshes
                this.shipMesh.children.forEach(child => {
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            // Handle array of materials
                            child.material.forEach(mat => {
                                if (mat.color) {
                                    mat.color.multiplyScalar(0.7); // Less darkening
                                    // Add some red tint to indicate damage
                                    mat.color.r = Math.min(1, mat.color.r * 1.5);
                                }
                            });
                        } else {
                            // Handle single material
                            if (child.material.color) {
                                child.material.color.multiplyScalar(0.7); // Less darkening
                                // Add some red tint to indicate damage
                                child.material.color.r = Math.min(1, child.material.color.r * 1.5);
                            }
                        }
                    }
                });
            }
            
            // Add a treasure indicator above the shipwreck
            this.addTreasureIndicator();
            
            console.log('Ship converted to shipwreck');
        }
    }
    
    /**
     * Add a visual treasure indicator above the shipwreck
     */
    addTreasureIndicator() {
        if (!this.scene || !this.shipMesh) return;
        
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
        treasureChest.position.copy(this.shipMesh.position);
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
        context.textBaseline = 'middle';
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 4;
        context.strokeText('LOOT', canvas.width/2, canvas.height/2);
        context.fillText('LOOT', canvas.width/2, canvas.height/2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const label = new THREE.Sprite(labelMaterial);
        label.scale.set(5, 2.5, 1);
        label.position.y = 2; // Position above the treasure chest
        
        // Add label to treasure chest
        treasureChest.add(label);
        
        // Add to scene
        this.scene.add(treasureChest);
        
        // Store reference
        this.treasureIndicator = treasureChest;
        
        // Set up animation
        if (!this.scene.userData.treasureIndicators) {
            this.scene.userData.treasureIndicators = [];
            
            // Set up animation loop if not already running
            if (!this.scene.userData.treasureAnimationId) {
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
                    
                    // Continue animation loop
                    this.scene.userData.treasureAnimationId = requestAnimationFrame(animateTreasures);
                };
                
                // Start animation loop
                this.scene.userData.treasureAnimationId = requestAnimationFrame(animateTreasures);
            }
        }
        
        // Add to animation list
        this.scene.userData.treasureIndicators.push(treasureChest);
    }
    
    /**
     * Get the forward vector of the ship based on its rotation
     * @returns {THREE.Vector3} The normalized forward vector
     */
    getForwardVector() {
        // If we have a ship mesh, use its rotation (visual rotation)
        if (this.shipMesh) {
            // Create a forward vector (0, 0, 1) and apply the ship's visual rotation
            const forward = new THREE.Vector3(0, 0, 1);
            
            // Create a rotation matrix from the ship mesh's rotation
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationY(this.shipMesh.rotation.y);
            
            // Apply rotation to the forward vector
            forward.applyMatrix4(rotationMatrix);
            
            return forward.normalize();
        } else {
            // Fallback to internal rotation if no mesh exists
            const forward = new THREE.Vector3(0, 0, 1);
            
            // Create a rotation matrix from the ship's rotation
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationY(this.rotation.y);
            
            // Apply rotation to the forward vector
            forward.applyMatrix4(rotationMatrix);
            
            return forward.normalize();
        }
    }
}

export default BaseShip; 