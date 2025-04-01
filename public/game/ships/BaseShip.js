import * as THREE from 'three';
import WakeParticleSystem from './WakeParticleSystem.js';

/**
 * Base class for all ships in the game
 * This class provides common functionality for all ships
 */
class BaseShip {
    // Class constant for ship height estimate (used for clickable sphere positioning)
    static SHIP_HEIGHT_ESTIMATE = 3; // Average height from water level to top of ship (excluding mast)
    static SHIP_HEIGHT = 2; // Estimated height for clickable sphere
    
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
        this.hasMovedBefore = false; // Track if ship has ever started moving before
        this.shipMesh = null;
        this.targetIslandPoint = null;
        
        // Add rotation properties for smooth turning
        this.targetRotation = null;
        this.rotationSpeed = options.rotationSpeed || 2.0; // Rotation speed in radians per second
        this.minRotationToMove = options.minRotationToMove || (Math.PI / 8); // Min rotation before starting to move
        
        // Add transition properties for smooth bobbing
        this.bobTransition = 0; // 0 = stationary, 1 = moving
        this.bobTransitionSpeed = 1; // Speed of transition (higher = faster)
        
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
        
        // Click box properties
        this.clickBoxSphere = null;
        this.shipDimensions = { length: 10, width: 5 }; // Default dimensions, will be updated by subclasses
        this.showDebugClickBox = options.showDebugClickBox || false; // Show debug sphere by default for development
        
        // Store initial position if provided in options
        if (options.position) {
            this.position.copy(options.position);
        }
        
        // Store initial rotation if provided in options
        if (options.rotation) {
            this.rotation.y = options.rotation.y || 0;
        }
        
        // Store water offset
        this.waterOffset = options.waterOffset || -0.5; // Default water offset
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
        this.targetPosition.y = this.waterOffset; // Use water offset instead of 0
        
        // Calculate distance to new target
        const distanceToTarget = this.shipMesh.position.distanceTo(this.targetPosition);
        
        // Calculate direction to target
        const direction = new THREE.Vector3()
            .subVectors(this.targetPosition, this.shipMesh.position)
            .normalize();
        
        // Calculate target rotation to face the target
        const newRotationY = Math.atan2(direction.x, direction.z);
        
        // Set target rotation, but don't immediately rotate the ship
        this.targetRotation = newRotationY;
        
        // For very close targets (<5 units away), force the ship to be stationary during rotation
        if (distanceToTarget < 4) {
            // Mark as not previously moved to force rotation before movement
            this.hasMovedBefore = false;
        }
        
        // Ship is now moving, regardless of whether it was before
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
            return;
        }
        
        // Handle rotation smoothly
        if (this.targetRotation !== null && this.shipMesh) {
            // Calculate the shortest angle difference (handles wrap-around)
            let angleDiff = this.targetRotation - this.shipMesh.rotation.y;
            
            // Normalize to range [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Calculate rotation step based on rotation speed and delta time
            const rotationStep = this.rotationSpeed * delta;
            
            // Apply rotation step (clamped to the angle difference)
            if (Math.abs(angleDiff) > 0.01) { // Small threshold to avoid jitter
                // Use min to avoid overshooting
                const step = Math.min(rotationStep, Math.abs(angleDiff)) * Math.sign(angleDiff);
                this.shipMesh.rotation.y += step;
                
                // Sync internal rotation with mesh rotation
                this.rotation.y = this.shipMesh.rotation.y;
            } else {
                // Reached target rotation
                this.shipMesh.rotation.y = this.targetRotation;
                this.rotation.y = this.targetRotation;
            }
        }
        
        // Update movement if we have a target
        if (this.isMoving && this.targetPosition) {
            // Calculate direction to target
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.shipMesh.position)
                .normalize();
            
            // Check if we're close enough to target
            const distanceToTarget = this.shipMesh.position.distanceTo(this.targetPosition);
            
            // Calculate the angle difference between current rotation and target rotation
            const currentForward = new THREE.Vector3(0, 0, 1).applyEuler(this.shipMesh.rotation);
            const angleDiff = Math.acos(Math.min(1, Math.max(-1, currentForward.dot(direction))));
            
            if (distanceToTarget > 0.1) {
                // For the first movement or for very close targets, wait until properly aligned
                const isVeryCloseTarget = distanceToTarget < 5;
                const needToRotateFirst = !this.hasMovedBefore || isVeryCloseTarget;
                
                if (needToRotateFirst && angleDiff > this.minRotationToMove) {
                    // Don't move yet, just continue rotating
                    
                    // If we're very close to the target, we need better alignment
                    if (isVeryCloseTarget && angleDiff < this.minRotationToMove * 2) {
                        // Set a stricter rotation threshold for close targets
                        this.minRotationToMove = 0.05; // Much tighter angle requirement
                    }
                } else {
                    // Always move the ship forward along its current heading while rotating
                    // Move ship at a constant speed
                    const moveSpeed = this.speed * delta;
                    
                    // Calculate new position - use current rotation for movement, not the target direction
                    // This makes the ship follow its nose rather than strafe
                    const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.shipMesh.rotation);
                    const newPosition = this.shipMesh.position.clone().add(forward.multiplyScalar(moveSpeed));
                    
                    // Ensure Y position stays at water level
                    newPosition.y = this.waterOffset;
                    
                    // Apply new position
                    this.shipMesh.position.copy(newPosition);
                    
                    // Update internal position to match mesh position
                    this.position.copy(this.shipMesh.position);
                    
                    // Now the ship has moved before
                    this.hasMovedBefore = true;
                    
                    // Smoothly transition to moving bobbing state
                    this.bobTransition = Math.min(1, this.bobTransition + delta * this.bobTransitionSpeed);
                    
                    // Add bobbing motion with smooth transition
                    const movingBobX = Math.sin(time * 2) * 0.05;
                    const movingBobZ = Math.sin(time * 1.5) * 0.05;
                    const stationaryBobX = Math.sin(time * 1.5) * 0.03;
                    const stationaryBobZ = Math.sin(time * 1.2) * 0.03;
                    
                    this.shipMesh.rotation.x = stationaryBobX + (movingBobX - stationaryBobX) * this.bobTransition;
                    this.shipMesh.rotation.z = stationaryBobZ + (movingBobZ - stationaryBobZ) * this.bobTransition;
                    
                    // Sync internal rotation with mesh rotation
                    this.rotation.x = this.shipMesh.rotation.x;
                    this.rotation.z = this.shipMesh.rotation.z;
                    
                    // Emit wake particles when moving
                    if (this.wakeParticleSystem) {
                        this.wakeParticleSystem.emitParticles(delta);
                    }
                    
                    // Continuously update target rotation to face the target while moving
                    this.targetRotation = Math.atan2(direction.x, direction.z);
                    
                    // If we're too far off course, do a course correction check
                    // Adjust speed based on how far off we are from our target direction
                    if (angleDiff > Math.PI / 4) {
                        // We're very off course, reduce speed to help with turning
                        this.shipMesh.position.lerp(this.position.clone().add(direction.multiplyScalar(moveSpeed * 0.3)), 0.05);
                    }
                }
            } else {
                this.isMoving = false;
                this.targetRotation = null;
                // Reset minRotationToMove to default value for future movements
                this.minRotationToMove = Math.PI / 8;
                
                // Ensure final position has correct Y value
                if (this.shipMesh.position.y !== this.waterOffset) {
                    this.shipMesh.position.y = this.waterOffset;
                    this.position.y = this.waterOffset;
                }
            }
        } else {
            // Smoothly transition to stationary bobbing state
            this.bobTransition = Math.max(0, this.bobTransition - delta * this.bobTransitionSpeed);
            
            // Add bobbing motion with smooth transition
            const movingBobX = Math.sin(time * 2) * 0.05;
            const movingBobZ = Math.sin(time * 1.5) * 0.05;
            const stationaryBobX = Math.sin(time * 1.5) * 0.03;
            const stationaryBobZ = Math.sin(time * 1.2) * 0.03;
            
            this.shipMesh.rotation.x = stationaryBobX + (movingBobX - stationaryBobX) * this.bobTransition;
            this.shipMesh.rotation.z = stationaryBobZ + (movingBobZ - stationaryBobZ) * this.bobTransition;
            
            // Ensure Y position stays at water level
            if (this.shipMesh.position.y !== this.waterOffset) {
                this.shipMesh.position.y = this.waterOffset;
            }
        }
        
        // Update wake particles regardless of movement (to let active ones fade out)
        if (this.wakeParticleSystem) {
            this.wakeParticleSystem.updateParticles(delta);
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
        if (this.isSunk) {
            console.log('[DEBUG:SINK] Ship already sunk, skipping sink process');
            return;
        }
        
        console.log('[DEBUG:SINK] Starting sink process for ship:', {
            isEnemy: this.isEnemy,
            isMultiplayerShip: this.isMultiplayerShip || false,
            shipType: this.type,
            id: this.id,
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            isSunk: this.isSunk,
            hasShipMesh: !!this.shipMesh,
            shipMeshType: this.shipMesh ? this.shipMesh.type : 'none',
            hasHealthBar: !!this.healthBarContainer,
            hasWakeSystem: !!this.wakeParticleSystem,
            isPVP: window.combatManager ? (window.combatManager.isPVPCombat || false) : false
        });
        
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
        
        // Hide the clickable sphere when ship is sunk
        if (this.clickBoxSphere) {
            this.clickBoxSphere.visible = false;
        }
        
        // If this ship is being targeted by the player via combat manager, clear the target
        if (window.combatManager && window.combatManager.currentTarget === this) {
            console.log('[DEBUG:SINK] Clearing combat target for sunk ship');
            // Clean up debug arrows before clearing target
            if (window.combatManager.cleanupDebugArrows) {
                window.combatManager.cleanupDebugArrows();
            }
            window.combatManager.setTarget(null);
        }
        
        // Trigger UI update immediately if this is the player ship
        if (!this.isEnemy && window.gameUI) {
            try {
                console.log('[DEBUG:SINK] Updating UI for player ship');
                window.gameUI.update();
                console.log('[DEBUG:SINK] UI update completed');
            } catch (error) {
                console.error('[DEBUG:SINK] Error updating UI:', error);
                // Continue with sink process despite UI error
            }
        }
        
        // Stop wake particles if they exist
        if (this.wakeParticleSystem) {
            console.log('[DEBUG:SINK] Cleaning up wake particle system');
            // Call cleanup method to immediately remove all particles
            if (typeof this.wakeParticleSystem.cleanup === 'function') {
                this.wakeParticleSystem.cleanup();
            } else if (typeof this.wakeParticleSystem.stop === 'function') {
                // Fallback to stop if cleanup doesn't exist
                this.wakeParticleSystem.stop();
            }
        }
        
        // Convert to shipwreck
        console.log('[DEBUG:SINK] About to call convertToShipwreck()');
        
        try {
            this.convertToShipwreck();
            console.log('[DEBUG:SINK] Successfully called convertToShipwreck()');
        } catch (error) {
            console.error('[DEBUG:SINK] Error during convertToShipwreck():', error);
        }
        
        // Trigger any sink-specific behavior
        this.onSink();
        
        console.log('[DEBUG:SINK] Sink process complete');
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
     * @param {Object} options - Optional parameters for cooldown check
     * @param {number} options.serverLastAttackTime - Last server confirmed attack time
     * @param {number} options.additionalBuffer - Additional buffer time in ms
     * @returns {boolean} True if the ship can fire
     */
    canFire(options = {}) {
        const now = Date.now();
        const clientReady = now - this.lastFiredTime >= this.cannonCooldown;
        
        // If server timing info is provided, check that as well
        if (options.serverLastAttackTime) {
            const buffer = options.additionalBuffer || 400; // Increased default buffer to 400ms
            const serverReady = now - options.serverLastAttackTime >= this.cannonCooldown + buffer;
            
            // Only report ready if both client and server cooldowns are complete
            if (!serverReady) {
                if (clientReady) {
                    // Only log when client is ready but server isn't
                    console.log('[DEBUG:CANFIRE] Server cooldown preventing fire:', {
                        clientCooldownElapsed: now - this.lastFiredTime,
                        clientCooldownPeriod: this.cannonCooldown,
                        serverCooldownElapsed: now - options.serverLastAttackTime,
                        serverTimeRemaining: this.cannonCooldown + buffer - (now - options.serverLastAttackTime)
                    });
                }
                return false;
            }
        }
        
        return clientReady;
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
     * @returns {number} Health percentage between 0-100
     */
    getHealthPercentage() {
        if (!this.maxHealth) return 0;
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
    async respawn(spawnPosition = new THREE.Vector3(0, 0.5, 0)) {
        console.log('[DEBUG:RESPAWN] Starting respawn process:', {
            spawnPosition: spawnPosition,
            isSunk: this.isSunk,
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            hasShipMesh: !!this.shipMesh,
            hasHealthBar: !!this.healthBarContainer,
            hasWakeSystem: !!this.wakeParticleSystem,
            isEnemy: this.isEnemy
        });
        
        // Track the current health status before respawning
        const wasHealthFull = this.currentHealth >= this.maxHealth;
        
        // First reset health values and sunk state
        console.log('[DEBUG:RESPAWN] Resetting health and sunk state');
        this.resetHealth();
        this.isSunk = false; // Explicitly reset sunk state
        
        // Reset movement state
        this.isMoving = false;
        this.targetPosition = null;
        this.targetRotation = null;
        this.hasMovedBefore = false; // Reset movement history

        // Clear health bar reference since we'll be removing the ship mesh
        console.log('[DEBUG:RESPAWN] Clearing health bar references');
        this.healthBarContainer = null;
        this.healthBarBackground = null;
        this.healthBarForeground = null;
        
        // We don't need to explicitly remove the clickable sphere since it's a child of the ship mesh
        // and will be removed with it automatically
        this.clickBoxSphere = null;
        
        // Remove old ship mesh and any associated effects
        if (this.shipMesh) {
            console.log('[DEBUG:RESPAWN] Removing old ship mesh and cleaning up resources');
            
            // Check if shipMesh is a Group with children 
            if (this.shipMesh.type === 'Group') {
                console.log('[DEBUG:RESPAWN] Ship mesh is a Group, cleaning up children');
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
                console.log('[DEBUG:RESPAWN] Ship mesh is a single mesh, cleaning up directly');
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
                console.log('[DEBUG:RESPAWN] Cleaning up wake particle system');
                this.wakeParticleSystem.dispose();
                this.wakeParticleSystem = null;
            }
            
            // Remove ship mesh from scene
            console.log('[DEBUG:RESPAWN] Removing ship mesh from scene');
            this.scene.remove(this.shipMesh);
            this.shipMesh = null;
        }
        
        // Reset position and rotation
        console.log('[DEBUG:RESPAWN] Resetting position and rotation');
        this.position.copy(spawnPosition);
        this.rotation.set(0, 0, 0);
        this.isMoving = false;
        this.targetPosition = null;
        
        // Create new ship mesh if the class implements createShip
        if (typeof this.createShip === 'function') {
            console.log('[DEBUG:RESPAWN] Creating new ship mesh with colors:', 
                `Hull: 0x${this.hullColor.toString(16)}, ` +
                `Deck: 0x${this.deckColor.toString(16)}, ` + 
                `Sail: 0x${this.sailColor.toString(16)}`);
                
            // Set loading state
            this.isLoading = true;
            
            // Create the ship and wait for it to load
            console.log('[DEBUG:RESPAWN] Calling createShip()');
            this.createShip();
            
            // Wait for the ship to finish loading
            console.log('[DEBUG:RESPAWN] Waiting for ship to load...');
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log('[DEBUG:RESPAWN] Ship finished loading');
            
            // Ensure the ship mesh rotation is reset
            if (this.shipMesh) {
                console.log('[DEBUG:RESPAWN] Resetting ship mesh rotation');
                this.shipMesh.rotation.set(0, this.rotation.y, 0);
            }
            
            // Now that the ship is loaded, initialize all systems
            console.log('[DEBUG:RESPAWN] Initializing ship systems');
            this.createClickBoxSphere();
            this.initWakeParticleSystem();
            this.createHealthBar();
            
            // If health is not full after respawn, make health bar visible
            if (!wasHealthFull) {
                console.log('[DEBUG:RESPAWN] Health not full, making health bar visible');
                this.setHealthBarVisible(true);
            }
        } else {
            console.error('[DEBUG:RESPAWN] Cannot recreate ship: createShip method not found');
        }
        
        console.log('[DEBUG:RESPAWN] Respawn process complete');
        return this;
    }
    
    /**
     * Convert a sunken ship to a shipwreck
     * This method changes the appearance of the ship to look like a shipwreck
     */
    convertToShipwreck() {
        console.log('[DEBUG:SHIPWRECK] Starting convertToShipwreck for ship:', {
            isEnemy: this.isEnemy,
            isMultiplayerShip: this.isMultiplayerShip || false,
            shipType: this.type,
            id: this.id,
            hasShipMesh: !!this.shipMesh,
            shipMeshType: this.shipMesh ? this.shipMesh.type : 'none',
            shipMeshChildren: this.shipMesh ? (this.shipMesh.children ? this.shipMesh.children.length : 0) : 0,
            shipMeshRotation: this.shipMesh ? JSON.stringify({
                x: this.shipMesh.rotation.x,
                y: this.shipMesh.rotation.y,
                z: this.shipMesh.rotation.z
            }) : 'no mesh',
            shipMeshPosition: this.shipMesh ? JSON.stringify({
                x: this.shipMesh.position.x,
                y: this.shipMesh.position.y,
                z: this.shipMesh.position.z
            }) : 'no mesh',
            playerShipMatch: window.combatManager ? (this === window.combatManager.playerShip) : false,
            isPVP: window.combatManager ? (window.combatManager.isPVPCombat || false) : false
        });

        // If the ship mesh exists, modify it to look like a shipwreck
        if (this.shipMesh) {
            console.log('[DEBUG:SHIPWRECK] Ship mesh exists, starting capsizing animation');
            
            try {
                // Store original rotation
                const originalRotationZ = this.shipMesh.rotation.z;
                const targetRotationZ = Math.PI * 0.4; // Target capsized rotation
                
                // Store original position
                const originalPositionY = this.shipMesh.position.y;
                const targetPositionY = originalPositionY - 0.2; // Target position adjustment
                
                console.log('[DEBUG:SHIPWRECK] Animation parameters:', {
                    originalRotationZ,
                    targetRotationZ,
                    originalPositionY,
                    targetPositionY
                });
                
                // Store original material colors before modifying them
                const originalMaterials = this.captureOriginalMaterials();
                console.log('[DEBUG:SHIPWRECK] Captured original materials');
                
                // Animation parameters
                const animationDuration = 5000; // 5 seconds
                const startTime = Date.now();
                
                // Start animation
                const animateCapsizing = () => {
                    const elapsedTime = Date.now() - startTime;
                    const progress = Math.min(1, elapsedTime / animationDuration);
                    
                    // Cubic ease-out for more natural motion
                    const easedProgress = 1 - Math.pow(1 - progress, 3);
                    
                    if (progress === 0) {
                        console.log('[DEBUG:SHIPWRECK] Starting animation frame');
                    }
                    
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
                    
                    // Log progress at key points
                    if (progress === 0 || progress === 0.25 || progress === 0.5 || progress === 0.75 || progress === 1) {
                        console.log(`[DEBUG:SHIPWRECK] Animation progress: ${Math.round(progress * 100)}%, rotation.z: ${this.shipMesh.rotation.z.toFixed(2)}, position.y: ${this.shipMesh.position.y.toFixed(2)}`);
                    }
                    
                    // Continue animation if not complete
                    if (progress < 1) {
                        requestAnimationFrame(animateCapsizing);
                    } else {
                        console.log('[DEBUG:SHIPWRECK] Animation complete with final values:', {
                            rotationZ: this.shipMesh.rotation.z,
                            positionY: this.shipMesh.position.y
                        });
                        
                        // If this is the player ship, notify CombatManager to schedule respawn
                        // Check if this ship is the player ship by comparing with playerShip reference in combatManager
                        if (window.combatManager && this === window.combatManager.playerShip) {
                            console.log('[DEBUG:SHIPWRECK] This is the player ship, scheduling respawn');
                            // Signal combat manager to start respawn timer
                            window.combatManager.schedulePlayerRespawn();
                        } else {
                            console.log('[DEBUG:SHIPWRECK] This is NOT the player ship:', {
                                isPlayerShip: window.combatManager ? this === window.combatManager.playerShip : false,
                                hasCombatManager: !!window.combatManager,
                                shipId: this.id,
                                playerShipId: window.combatManager ? window.combatManager.playerShip?.id : 'unknown'
                            });
                        }
                        
                        console.log('[DEBUG:SHIPWRECK] Ship converted to shipwreck');
                    }
                };
                
                console.log('[DEBUG:SHIPWRECK] About to start animation');
                // Start the animation
                animateCapsizing();
                console.log('[DEBUG:SHIPWRECK] Animation started');
                
            } catch (error) {
                console.error('[DEBUG:SHIPWRECK] Error during shipwreck animation setup:', error);
            }
        } else {
            console.error('[DEBUG:SHIPWRECK] Ship mesh does not exist, cannot create shipwreck animation');
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
        // For GLB models, we need to position it higher to account for the model's scale
        this.healthBarContainer.position.y = 12;  // Increased height above ship
        
        // Add to ship mesh, but hide initially
        if (this.shipMesh) {
            // For GLB models, we need to ensure the health bar is added to the correct part of the model
            if (this.shipMesh.children && this.shipMesh.children.length > 0) {
                // Add to the first child of the ship mesh (usually the main model group)
                this.shipMesh.children[0].add(this.healthBarContainer);
            } else {
                this.shipMesh.add(this.healthBarContainer);
            }
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
        if (!this.healthBarContainer || !this.healthBarForeground || !camera || !this.shipMesh) return;
        
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
    
    /**
     * Create the clickable sphere around the ship
     * This should be called after the ship mesh has been created and sized
     */
    createClickBoxSphere() {
        if (!this.shipMesh || !this.scene) return;
        
        // First, estimate ship dimensions if not explicitly set
        if (!this.shipDimensions.length || !this.shipDimensions.width) {
            this.estimateShipDimensions();
        }
        
        // Calculate radius based on the larger of length or width, with a 100% increase (200% size)
        const maxDimension = Math.max(this.shipDimensions.length, this.shipDimensions.width);
        const radius = maxDimension * 0.5; // 1.0 = 2.0/2 (200% size, divide by 2 for radius)
        
        // Create sphere geometry and material
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: this.showDebugClickBox ? 0.3 : 0, // Visible for debug, invisible for production
            depthWrite: false
        });
        
        // Create mesh
        this.clickBoxSphere = new THREE.Mesh(geometry, material);
        
        // Position the sphere at the center of the ship vertically
        this.clickBoxSphere.position.y = BaseShip.SHIP_HEIGHT_ESTIMATE / 2;
        
        // Add the sphere as a child of the ship mesh rather than directly to the scene
        // This way it moves with the ship and gets removed when the ship is removed
        this.shipMesh.add(this.clickBoxSphere);
    }
    
    /**
     * Estimate the ship's dimensions based on its mesh
     * This method analyzes the ship mesh to determine length and width
     */
    estimateShipDimensions() {
        if (!this.shipMesh) return;
        
        // Create a new bounding box
        const boundingBox = new THREE.Box3().setFromObject(this.shipMesh);
        
        // Calculate dimensions (assuming ship forward is along Z axis)
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        
        // Update ship dimensions
        this.shipDimensions = {
            length: size.z, // Length along Z axis
            width: size.x   // Width along X axis
        };
        
        console.log(`Estimated ship dimensions: length=${this.shipDimensions.length}, width=${this.shipDimensions.width}`);
    }
    
    /**
     * Toggle the visibility of the debug click box sphere
     * @param {boolean} visible - Whether to show the debug sphere
     */
    setDebugClickBoxVisible(visible) {
        this.showDebugClickBox = visible;
        
        if (this.clickBoxSphere && this.clickBoxSphere.material) {
            this.clickBoxSphere.material.opacity = visible ? 0.3 : 0;
            this.clickBoxSphere.material.needsUpdate = true;
        }
    }
    
    /**
     * Get the clickable sphere for raycasting
     * @returns {THREE.Mesh} The clickable sphere mesh
     */
    getClickBoxSphere() {
        return this.clickBoxSphere;
    }
    
    /**
     * Clean up all resources used by this ship
     * Called when the ship is being completely removed
     */
    cleanup() {
        console.log('Cleaning up ship resources');
        
        // Clean up wake particle system
        if (this.wakeParticleSystem) {
            if (typeof this.wakeParticleSystem.cleanup === 'function') {
                this.wakeParticleSystem.cleanup();
            } else if (typeof this.wakeParticleSystem.dispose === 'function') {
                this.wakeParticleSystem.dispose();
            }
            this.wakeParticleSystem = null;
        }
        
        // Clean up ship mesh (which includes the clickable sphere as a child)
        if (this.shipMesh) {
            if (this.scene && this.scene.remove) {
                this.scene.remove(this.shipMesh);
            }
            
            // Process all children recursively to properly dispose of geometries and materials
            if (this.shipMesh.type === 'Group' || this.shipMesh.children) {
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
            
            this.shipMesh = null;
            this.clickBoxSphere = null; // Clear reference since it's removed with shipMesh
        }
        
        console.log('Ship cleanup complete');
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
        }
        
        // Add to animation list
        this.scene.userData.treasureIndicators.push(treasureChest);
        
        // Make sure the animation loop is running
        if (!this.scene.userData.treasureAnimationId) {
            const animateTreasures = () => {
                const time = Date.now() * 0.001; // Convert to seconds
                
                if (this.scene.userData.treasureIndicators && this.scene.userData.treasureIndicators.length > 0) {
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
                    
                    // Continue the animation loop
                    this.scene.userData.treasureAnimationId = requestAnimationFrame(animateTreasures);
                } else {
                    // No indicators left, clear the animation ID
                    this.scene.userData.treasureAnimationId = null;
                }
            };
            
            // Start animation loop
            this.scene.userData.treasureAnimationId = requestAnimationFrame(animateTreasures);
            console.log('Started treasure animation loop');
        }
    }
    
    /**
     * Get the forward vector of the ship
     * @returns {THREE.Vector3} The normalized forward vector
     */
    getForwardVector() {
        // Forward is positive Z in our ship's coordinate system (opposite of three.js standard)
        const forward = new THREE.Vector3(0, 0, 1);
        
        // Apply the ship's rotation if shipMesh exists
        if (this.shipMesh && this.shipMesh.rotation) {
            forward.applyEuler(this.shipMesh.rotation);
        } else if (this.rotation) {
            // Fallback to using the ship's internal rotation if shipMesh is not available
            forward.applyEuler(this.rotation);
        }
        
        return forward;
    }
}

export default BaseShip; 