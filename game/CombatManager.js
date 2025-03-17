import * as THREE from 'three';

/**
 * CombatManager class for handling ship combat mechanics
 */
class CombatManager {
    /**
     * Create a new CombatManager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.playerShip = options.playerShip || null;
        this.enemyShipManager = options.enemyShipManager || null;
        this.ui = options.ui || null;
        this.scene = options.scene || null;
        this.camera = options.camera || null;
        this.combatService = options.combatService || null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentTarget = null;
        this.cannonballSpeed = 50; // Units per second
        this.cannonballs = [];
        this.cannonballMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.cannonballGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        this.cannonballLifetime = 3000; // 3 seconds
        this.isSpacePressed = false;
        this.autoFireInterval = null;
        this.isResetting = false;
        
        // Bind methods
        this.handleMouseClick = this.handleMouseClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.update = this.update.bind(this);
        this.fireCannonball = this.fireCannonball.bind(this);
        this.resetPlayerShip = this.resetPlayerShip.bind(this);
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Add mouse click listener for target selection
        document.addEventListener('click', this.handleMouseClick);
        
        // Add keyboard listeners for firing cannons
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }
    
    /**
     * Handle mouse click for target selection
     * @param {MouseEvent} event - Mouse click event
     */
    handleMouseClick(event) {
        // Skip if no player ship, enemy manager, or UI
        if (!this.playerShip || !this.enemyShipManager || !this.ui || !this.camera || !this.scene) return;
        
        // Skip if player ship is sunk
        if (this.playerShip.isSunk) return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all enemy ships
        const enemyShips = this.enemyShipManager.getEnemyShips();
        const shipObjects = enemyShips.map(ship => ship.getObject()).filter(obj => obj !== null);
        
        // Check for intersections with enemy ships
        const intersects = this.raycaster.intersectObjects(shipObjects, true);
        
        if (intersects.length > 0) {
            // Find the enemy ship that was clicked
            const clickedMesh = intersects[0].object;
            let clickedShip = null;
            
            // Find the ship that owns this mesh
            for (const ship of enemyShips) {
                if (!ship.shipMesh) continue;
                
                // Check if the clicked mesh is part of this ship
                if (ship.shipMesh === clickedMesh || ship.shipMesh.children.includes(clickedMesh)) {
                    clickedShip = ship;
                    break;
                }
            }
            
            // If we found a ship and it's not sunk, set it as the target
            if (clickedShip && !clickedShip.isSunk) {
                this.setTarget(clickedShip);
                return true; // Indicate that we handled the click
            }
        }
        
        return false; // Indicate that we didn't handle the click
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event - Key down event
     */
    handleKeyDown(event) {
        // Skip if no player ship or player ship is sunk
        if (!this.playerShip || this.playerShip.isSunk) return;
        
        // Check for space bar to fire cannons
        if (event.code === 'Space' && !this.isSpacePressed) {
            this.isSpacePressed = true;
            
            // Fire immediately
            this.fireAtCurrentTarget();
            
            // Set up auto-fire interval
            this.autoFireInterval = setInterval(() => {
                this.fireAtCurrentTarget();
            }, this.playerShip.cannonCooldown);
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} event - Key up event
     */
    handleKeyUp(event) {
        // Check for space bar release
        if (event.code === 'Space') {
            this.isSpacePressed = false;
            
            // Clear auto-fire interval
            if (this.autoFireInterval) {
                clearInterval(this.autoFireInterval);
                this.autoFireInterval = null;
            }
        }
    }
    
    /**
     * Set the current target
     * @param {BaseShip} ship - The ship to target
     */
    setTarget(ship) {
        this.currentTarget = ship;
        
        // Update UI if available
        if (this.ui) {
            this.ui.setTarget(ship);
        }
    }
    
    /**
     * Fire at the current target
     */
    async fireAtCurrentTarget() {
        // Skip if no player ship or no target
        if (!this.playerShip || !this.currentTarget) return;
        
        // Skip if player ship is sunk
        if (this.playerShip.isSunk) return;
        
        // Calculate distance to target
        const distance = this.playerShip.getPosition().distanceTo(this.currentTarget.getPosition());
        
        // Check if target is in range
        if (distance > this.playerShip.cannonRange) {
            console.log('Target out of range');
            return;
        }
        
        // Check if player can fire (cooldown)
        if (!this.playerShip.canFire()) {
            console.log('Cannon on cooldown');
            return;
        }
        
        // Calculate damage
        const damage = Math.floor(
            this.playerShip.cannonDamage.min + 
            Math.random() * (this.playerShip.cannonDamage.max - this.playerShip.cannonDamage.min)
        );
        
        // If we have a combat service, use it for server validation
        if (this.combatService) {
            try {
                // Process combat action on server
                const result = await this.combatService.processCombatAction(
                    this.currentTarget.id,
                    damage
                );
                
                if (result.success) {
                    // Server validated the hit, update target health
                    this.currentTarget.currentHealth = result.newHealth;
                    
                    // If target was sunk, update its state
                    if (result.isSunk) {
                        this.currentTarget.sink();
                    }
                    
                    // Fire visual cannonball
                    this.fireCannonball(this.playerShip, this.currentTarget, damage);
                    
                    // Update last fired time
                    this.playerShip.lastFiredTime = Date.now();
                } else {
                    // Handle specific error cases
                    if (result.error && result.error.includes('cooldown')) {
                        console.log('Server cooldown in progress, waiting...');
                        // Don't show error to user for cooldown issues
                    } else {
                        console.error('Combat action failed:', result.error);
                    }
                }
            } catch (error) {
                console.error('Error processing combat action:', error);
                
                // Try to use local combat logic as fallback
                console.log('Falling back to local combat logic');
                const damageDealt = this.playerShip.fireCannons(this.currentTarget);
                
                // If damage was dealt, fire a cannonball
                if (damageDealt > 0) {
                    this.fireCannonball(this.playerShip, this.currentTarget, damageDealt);
                }
            }
        } else {
            // No server validation, use local combat logic
            // Try to fire cannons
            const damageDealt = this.playerShip.fireCannons(this.currentTarget);
            
            // If damage was dealt, fire a cannonball
            if (damageDealt > 0) {
                this.fireCannonball(this.playerShip, this.currentTarget, damageDealt);
            }
        }
    }
    
    /**
     * Fire a cannonball from source to target
     * @param {BaseShip} source - Source ship
     * @param {BaseShip} target - Target ship
     * @param {number} damage - Damage amount
     */
    fireCannonball(source, target, damage) {
        // Skip if no scene
        if (!this.scene) return;
        
        // Create cannonball mesh
        const cannonball = new THREE.Mesh(this.cannonballGeometry, this.cannonballMaterial);
        
        // Set initial position (slightly above source ship)
        const sourcePos = source.getPosition().clone();
        sourcePos.y += 2; // Raise above the deck
        cannonball.position.copy(sourcePos);
        
        // Calculate direction to target
        const targetPos = target.getPosition().clone();
        targetPos.y += 2; // Aim above the deck
        const direction = new THREE.Vector3()
            .subVectors(targetPos, sourcePos)
            .normalize();
        
        // Add cannonball data
        cannonball.userData = {
            direction: direction,
            speed: this.cannonballSpeed,
            damage: damage,
            source: source,
            target: target,
            createdAt: Date.now()
        };
        
        // Add to scene and cannonballs array
        this.scene.add(cannonball);
        this.cannonballs.push(cannonball);
        
        // Play cannon fire sound (if available)
        // TODO: Add sound effects
    }
    
    /**
     * Update cannonballs and combat
     * @param {number} delta - Time delta since last frame
     */
    update(delta) {
        // Skip if no scene
        if (!this.scene) return;
        
        // Update cannonballs
        const now = Date.now();
        const cannonballsToRemove = [];
        
        for (const cannonball of this.cannonballs) {
            // Move cannonball
            const moveAmount = cannonball.userData.speed * delta;
            cannonball.position.add(
                cannonball.userData.direction.clone().multiplyScalar(moveAmount)
            );
            
            // Add slight arc to cannonball trajectory
            const age = now - cannonball.userData.createdAt;
            const lifePercent = age / this.cannonballLifetime;
            
            // Parabolic arc (up then down)
            const heightOffset = Math.sin(lifePercent * Math.PI) * 5;
            cannonball.position.y = cannonball.userData.source.getPosition().y + 2 + heightOffset;
            
            // Check if cannonball has reached target
            const distanceToTarget = cannonball.position.distanceTo(cannonball.userData.target.getPosition());
            if (distanceToTarget < 3) {
                // Hit target - damage already applied when firing
                cannonballsToRemove.push(cannonball);
                
                // TODO: Add hit effect/sound
            }
            
            // Check if cannonball has expired
            if (age > this.cannonballLifetime) {
                cannonballsToRemove.push(cannonball);
            }
        }
        
        // Remove expired cannonballs
        for (const cannonball of cannonballsToRemove) {
            this.scene.remove(cannonball);
            const index = this.cannonballs.indexOf(cannonball);
            if (index !== -1) {
                this.cannonballs.splice(index, 1);
            }
        }
        
        // Check if player ship is sunk
        if (this.playerShip && this.playerShip.isSunk) {
            // Reset player ship after a delay if not already resetting
            if (!this.isResetting) {
                this.isResetting = true;
                setTimeout(() => {
                    this.resetPlayerShip();
                }, 3000); // 3 second delay
            }
        }
        
        // Update current target if it exists
        if (this.currentTarget) {
            // If target is sunk, clear target
            if (this.currentTarget.isSunk) {
                this.setTarget(null);
            }
        }
        
        // Check for enemy ships firing at player
        if (this.enemyShipManager && this.playerShip && !this.playerShip.isSunk) {
            const enemyShips = this.enemyShipManager.getEnemyShips();
            
            for (const enemyShip of enemyShips) {
                // Skip if enemy ship is sunk
                if (enemyShip.isSunk) continue;
                
                // Check if enemy ship can fire
                if (enemyShip.canFire()) {
                    // Check if player is in range
                    const distance = enemyShip.getPosition().distanceTo(this.playerShip.getPosition());
                    if (distance <= enemyShip.cannonRange) {
                        // Calculate damage
                        const damage = Math.floor(
                            enemyShip.cannonDamage.min + 
                            Math.random() * (enemyShip.cannonDamage.max - enemyShip.cannonDamage.min)
                        );
                        
                        // Apply damage to player
                        this.playerShip.takeDamage(damage);
                        
                        // Fire visual cannonball
                        this.fireCannonball(enemyShip, this.playerShip, damage);
                        
                        // Update last fired time
                        enemyShip.lastFiredTime = Date.now();
                    }
                }
            }
        }
    }
    
    /**
     * Reset the player ship after sinking
     */
    async resetPlayerShip() {
        // Skip if no player ship
        if (!this.playerShip) return;
        
        // If we have a combat service, use it to reset the player ship
        if (this.combatService) {
            try {
                const result = await this.combatService.resetPlayerShip();
                
                if (result.success) {
                    console.log('Player ship reset successfully');
                } else {
                    console.error('Failed to reset player ship:', result.error);
                }
            } catch (error) {
                console.error('Error resetting player ship:', error);
            }
        }
        
        // Reset health locally regardless of server response
        this.playerShip.resetHealth();
        
        // Reset position to origin
        this.playerShip.setPosition(new THREE.Vector3(0, 0.5, 0));
        
        // Reset flag
        this.isResetting = false;
        
        // Clear target
        this.setTarget(null);
    }
    
    /**
     * Set the player ship reference
     * @param {BaseShip} playerShip - The player's ship
     */
    setPlayerShip(playerShip) {
        this.playerShip = playerShip;
    }
    
    /**
     * Set the enemy ship manager reference
     * @param {EnemyShipManager} enemyShipManager - The enemy ship manager
     */
    setEnemyShipManager(enemyShipManager) {
        this.enemyShipManager = enemyShipManager;
    }
    
    /**
     * Set the UI reference
     * @param {GameUI} ui - The game UI
     */
    setUI(ui) {
        this.ui = ui;
    }
    
    /**
     * Set the scene reference
     * @param {THREE.Scene} scene - The scene
     */
    setScene(scene) {
        this.scene = scene;
    }
    
    /**
     * Set the camera reference
     * @param {THREE.Camera} camera - The camera
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Set the combat service reference
     * @param {CombatService} combatService - The combat service
     */
    setCombatService(combatService) {
        this.combatService = combatService;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Remove event listeners
        document.removeEventListener('click', this.handleMouseClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        // Clear auto-fire interval
        if (this.autoFireInterval) {
            clearInterval(this.autoFireInterval);
            this.autoFireInterval = null;
        }
        
        // Remove all cannonballs
        if (this.scene) {
            for (const cannonball of this.cannonballs) {
                this.scene.remove(cannonball);
            }
        }
        
        this.cannonballs = [];
    }
}

export default CombatManager; 