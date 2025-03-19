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
            // We no longer need this animation here since we have the convertToShipwreck animation
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
        
        // Show health bar when taking damage for any ship (player or enemy)
        if (this.healthBarContainer) {
            this.setHealthBarVisible(true);
        }
        
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
        
        // Hide the health bar when ship is sunk
        if (this.healthBarContainer) {
            this.setHealthBarVisible(false);
            
            // Force the health bar to be hidden for player ships
            if (!this.isEnemy) {
                this.healthBarContainer.visible = false;
                
                // If using HTML/CSS health bars, also update DOM style
                if (this.healthBarContainer.style) {
                    this.healthBarContainer.style.display = 'none';
                }
            }
        }
        
        // If this ship is being targeted by the player via combat manager, clear the target
        if (window.combatManager && window.combatManager.currentTarget === this) {
            // Clean up debug arrows before clearing target
            if (window.combatManager.cleanupDebugArrows) {
                window.combatManager.cleanupDebugArrows();
            }
            window.combatManager.setTarget(null);
        }
        
        // Trigger UI update immediately if this is the player ship
        // This ensures cooldown UI and other elements update without waiting for the next frame
        if (!this.isEnemy && window.gameUI) {
            window.gameUI.update();
        }
        
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
        
        // For player ships, hide health bar when health is reset to full
        if (this.healthBarContainer && !this.isEnemy) {
            this.setHealthBarVisible(false);
        }
        // For enemy ships, we don't immediately hide the health bar on reset
        // That will be handled by the AI update based on targeting state
    }
    
    /**
     * Respawn the ship with a fresh appearance after being sunk
     * @param {THREE.Vector3} spawnPosition - Position to respawn at (defaults to origin)
     */
    respawn(spawnPosition = new THREE.Vector3(0, 0.5, 0)) {
        console.log('Respawning ship at position:', spawnPosition);
        
        // Track the current health status before respawning
        const wasHealthFull = this.currentHealth >= this.maxHealth;
        
        // First reset health values
        this.resetHealth();
        
        // Clear health bar reference since we'll be removing the ship mesh
        this.healthBarContainer = null;
        this.healthBarBackground = null;
        this.healthBarForeground = null;
        
        // Remove old ship mesh and any associated effects
        if (this.shipMesh) {
            console.log('Removing old ship mesh from scene');
            
            // Check if shipMesh is a Group with children 
            if (this.shipMesh.type === 'Group') {
                // Process all children recursively
                this.shipMesh.traverse(child => {
                    if (child.isMesh) {
                        // Dispose of geometry
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                        
                        // Dispose of materials (could be an array or single material)
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat) mat.dispose();
                                });
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            } else {
                // Handle the case where shipMesh is a single mesh
                if (this.shipMesh.geometry) {
                    this.shipMesh.geometry.dispose();
                }
                
                if (this.shipMesh.material) {
                    if (Array.isArray(this.shipMesh.material)) {
                        this.shipMesh.material.forEach(mat => {
                            if (mat) mat.dispose(); 
                        });
                    } else {
                        this.shipMesh.material.dispose();
                    }
                }
            }
            
            // Remove wake particle system if it exists
            if (this.wakeParticleSystem) {
                this.wakeParticleSystem.dispose();
                this.wakeParticleSystem = null;
            }
            
            // Remove ship mesh from scene
            this.scene.remove(this.shipMesh);
            this.shipMesh = null;
        }
        
        // Reset position and rotation
        this.position.copy(spawnPosition);
        this.rotation.set(0, 0, 0);
        this.isMoving = false;
        this.targetPosition = null;
        
        // Create new ship mesh if the class implements createShip
        if (typeof this.createShip === 'function') {
            console.log('Creating new ship mesh with original colors:', 
                `Hull: 0x${this.hullColor.toString(16)}, ` +
                `Deck: 0x${this.deckColor.toString(16)}, ` + 
                `Sail: 0x${this.sailColor.toString(16)}`);
                
            this.createShip();
            
            // Initialize new wake particle system after ship mesh is created
            this.initWakeParticleSystem();
            
            // Recreate the health bar after the ship mesh is created
            this.createHealthBar();
            
            // If health is not full after respawn, make health bar visible
            if (!wasHealthFull) {
                this.setHealthBarVisible(true);
            }
        } else {
            console.error('Cannot recreate ship: createShip method not found');
        }
        
        console.log('Ship respawn complete');
        return this;
    }
    
    /**
     * Convert a sunken ship to a shipwreck
     * This method changes the appearance of the ship to look like a shipwreck
     */
    convertToShipwreck() {
        // If the ship mesh exists, modify it to look like a shipwreck
        if (this.shipMesh) {
            // Store original rotation
            const originalRotationZ = this.shipMesh.rotation.z;
            const targetRotationZ = Math.PI * 0.4; // Target capsized rotation
            
            // Store original position
            const originalPositionY = this.shipMesh.position.y;
            const targetPositionY = originalPositionY - 0.2; // Target position adjustment
            
            // Store original material colors before modifying them
            const originalMaterials = this.captureOriginalMaterials();
            
            // Animation parameters
            const animationDuration = 5000; // 5 seconds
            const startTime = Date.now();
            
            // Start animation
            const animateCapsizing = () => {
                const elapsedTime = Date.now() - startTime;
                const progress = Math.min(1, elapsedTime / animationDuration);
                
                // Cubic ease-out for more natural motion
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Update rotation
                this.shipMesh.rotation.z = originalRotationZ + (targetRotationZ - originalRotationZ) * easedProgress;
                
                // Sync internal rotation with mesh rotation
                this.rotation.z = this.shipMesh.rotation.z;
                
                // Update position
                this.shipMesh.position.y = originalPositionY + (targetPositionY - originalPositionY) * easedProgress;
                
                // Sync internal position with mesh position
                this.position.y = this.shipMesh.position.y;
                
                // Gradually update material colors based on the same progress
                this.updateMaterialColors(originalMaterials, easedProgress);
                
                // Continue animation if not complete
                if (progress < 1) {
                    requestAnimationFrame(animateCapsizing);
                } else {
                    // If this is the player ship, notify CombatManager to schedule respawn
                    if (!this.isEnemy && window.combatManager) {
                        // Signal combat manager to start respawn timer
                        window.combatManager.schedulePlayerRespawn();
                    } 
                    // Only add treasure indicator for enemy ships, not for player ships
                    else if (this.isEnemy) {
                        // Add treasure indicator once fully capsized
                        this.addTreasureIndicator();
                    }
                    
                    console.log('Ship converted to shipwreck');
                }
            };
            
            // Start the animation
            animateCapsizing();
        }
    }
    
    /**
     * Capture original material colors before modifying them
     * @returns {Array} Array of original material data
     */
    captureOriginalMaterials() {
        const originalMaterials = [];
        
        // Handle single material
        if (this.shipMesh.material) {
            originalMaterials.push({
                material: this.shipMesh.material,
                originalColor: this.shipMesh.material.color.clone()
            });
        } 
        // Handle multiple materials across child meshes
        else if (this.shipMesh.children) {
            this.shipMesh.children.forEach(child => {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        // Handle array of materials
                        child.material.forEach(mat => {
                            if (mat && mat.color) {
                                originalMaterials.push({
                                    material: mat,
                                    originalColor: mat.color.clone()
                                });
                            }
                        });
                    } else {
                        // Handle single material
                        if (child.material.color) {
                            originalMaterials.push({
                                material: child.material,
                                originalColor: child.material.color.clone()
                            });
                        }
                    }
                }
            });
        }
        
        return originalMaterials;
    }
    
    /**
     * Update material colors based on animation progress
     * @param {Array} originalMaterials - Array of original material data
     * @param {number} progress - Animation progress (0-1)
     */
    updateMaterialColors(originalMaterials, progress) {
        originalMaterials.forEach(item => {
            const { material, originalColor } = item;
            
            // Calculate target damaged color (same formula as previously used)
            const targetColor = originalColor.clone();
            targetColor.multiplyScalar(0.7); // Darkening factor
            targetColor.r = Math.min(1, targetColor.r * 1.5); // Red tint
            
            // Interpolate between original and target color
            material.color.r = originalColor.r + (targetColor.r - originalColor.r) * progress;
            material.color.g = originalColor.g + (targetColor.g - originalColor.g) * progress;
            material.color.b = originalColor.b + (targetColor.b - originalColor.b) * progress;
        });
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
     * Get the forward vector of the ship
     * @returns {THREE.Vector3} The normalized forward vector
     */
    getForwardVector() {
        // Forward is positive Z in our ship's coordinate system (opposite of three.js standard)
        const forward = new THREE.Vector3(0, 0, 1);
        // Apply the ship's rotation
        forward.applyEuler(this.shipMesh.rotation);
        return forward;
    }
    
    /**
     * Create a health bar that appears above the ship
     * The health bar should only be visible when the ship is targeted
     */
    createHealthBar() {
        // Create container for the health bar that will be positioned above the ship
        this.healthBarContainer = new THREE.Object3D();
        
        // Define dimensions based on ship size
        const barWidth = 5;
        const barHeight = 0.5;
        const barDepth = 0.1;
        
        // Create background bar (black/dark gray)
        const backgroundGeometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
        const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.healthBarContainer.add(this.healthBarBackground);
        
        // Create foreground bar (green for health)
        const foregroundGeometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth * 1.5);
        const foregroundMaterial = new THREE.MeshBasicMaterial({ color: 0x44cc44 });  // Green
        this.healthBarForeground = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
        this.healthBarForeground.position.z = barDepth * 0.5;  // Position slightly in front
        this.healthBarContainer.add(this.healthBarForeground);
        
        // Position the health bar above the ship
        this.healthBarContainer.position.y = 8;  // Height above ship
        
        // Add to ship mesh, but hide initially
        if (this.shipMesh) {
            this.shipMesh.add(this.healthBarContainer);
            this.healthBarContainer.visible = false;
        }
    }
    
    /**
     * Show or hide the health bar
     * @param {boolean} visible - Whether to show the health bar
     */
    setHealthBarVisible(visible) {
        if (this.healthBarContainer) {
            this.healthBarContainer.visible = visible;
        }
    }
    
    /**
     * Update the health bar to reflect current health
     * @param {THREE.Camera} camera - The game camera for dynamic scaling
     */
    updateHealthBar(camera) {
        if (!this.healthBarContainer || !this.healthBarForeground || !camera) return;
        
        // Update health bar fill based on current health percentage
        const healthPercent = this.getHealthPercentage() / 100;
        this.healthBarForeground.scale.x = healthPercent;
        
        // Offset to keep the scaling anchored to the left
        this.healthBarForeground.position.x = -((1 - healthPercent) * 2.5);
        
        // Update color based on health
        if (healthPercent > 0.6) {
            this.healthBarForeground.material.color.setHex(0x44cc44);  // Green
        } else if (healthPercent > 0.3) {
            this.healthBarForeground.material.color.setHex(0xcccc44);  // Yellow
        } else {
            this.healthBarForeground.material.color.setHex(0xcc4444);  // Red
        }
        
        // Calculate distance from camera to ship
        const distance = camera.position.distanceTo(this.shipMesh.position);
        
        // Scale the health bar based on distance (smaller when farther away)
        const baseScale = 0.6;
        const scale = Math.max(baseScale, Math.min(1, 20 / distance));
        this.healthBarContainer.scale.set(scale, scale, scale);
        
        // Make health bar always face the camera
        this.healthBarContainer.lookAt(camera.position);
    }
}

export default BaseShip; 