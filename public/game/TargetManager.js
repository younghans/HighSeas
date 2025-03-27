import * as THREE from 'three';

/**
 * TargetManager class for handling ship targeting and selection
 */
class TargetManager {
    /**
     * Create a new TargetManager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.playerShip = options.playerShip || null;
        this.enemyShipManager = options.enemyShipManager || null;
        this.ui = options.ui || null;
        this.scene = options.scene || null;
        this.camera = options.camera || null;
        this.multiplayerManager = options.multiplayerManager || null;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentTarget = null;
        this.debugArrows = [];
        this.showDebugClickBoxes = options.showDebugClickBoxes || false;
        
        // Bind methods
        this.handleMouseClick = this.handleMouseClick.bind(this);
        this.setTarget = this.setTarget.bind(this);
        this.clearTarget = this.clearTarget.bind(this);
        this.setAutoTarget = this.setAutoTarget.bind(this);
        this.updateDebugArrows = this.updateDebugArrows.bind(this);
        this.cleanupDebugArrows = this.cleanupDebugArrows.bind(this);
        this.toggleDebugClickBoxes = this.toggleDebugClickBoxes.bind(this);
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Initialize debug click boxes if configured
        if (this.enemyShipManager) {
            this.toggleDebugClickBoxes(this.showDebugClickBoxes);
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Add mouse click listener for target selection
        document.addEventListener('click', this.handleMouseClick);
    }
    
    /**
     * Handle mouse click for target selection
     * @param {MouseEvent} event - Mouse click event
     */
    handleMouseClick(event) {
        // Skip if no player ship, or UI
        if (!this.playerShip || !this.ui || !this.camera || !this.scene) return;
        
        // Skip if player ship is sunk
        if (this.playerShip.isSunk) return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all targetable ships
        const targetableShips = [];
        
        // Add AI ships if enemy manager exists
        if (this.enemyShipManager) {
            targetableShips.push(...this.enemyShipManager.getEnemyShips());
        }
        
        // Add other player ships from multiplayer system if it exists
        if (window.multiplayerManager && window.multiplayerManager.otherPlayerShips) {
            // Convert the Map to an array of ships
            const otherPlayerShips = Array.from(window.multiplayerManager.otherPlayerShips.values());
            
            // Add ships that aren't sunk and aren't the current player
            otherPlayerShips.forEach(ship => {
                if (!ship.isSunk && ship.userData && ship.userData.playerId !== this.playerShip.id) {
                    // Set ID for targeting if not already set
                    if (!ship.id && ship.userData.playerId) {
                        ship.id = ship.userData.playerId;
                    }
                    targetableShips.push(ship);
                }
            });
        }
        
        // First try to detect clicks on the clickable spheres
        // Create an array of clickable spheres for raycasting
        const clickableSpheres = [];
        const shipByClickSphere = new Map(); // Map to track which ship owns which clickable sphere
        
        for (const ship of targetableShips) {
            if (ship.isSunk) continue; // Skip sunk ships
            
            const clickSphere = ship.clickBoxSphere;
            if (clickSphere) {
                clickableSpheres.push(clickSphere);
                shipByClickSphere.set(clickSphere, ship);
            }
        }
        
        // Check for intersections with clickable spheres first
        if (clickableSpheres.length > 0) {
            const sphereIntersects = this.raycaster.intersectObjects(clickableSpheres, true);
            
            if (sphereIntersects.length > 0) {
                // Find the ship that owns this clickable sphere
                const clickedSphere = sphereIntersects[0].object;
                const clickedShip = shipByClickSphere.get(clickedSphere) || 
                                   shipByClickSphere.get(clickedSphere.parent);
                
                if (clickedShip && !clickedShip.isSunk) {
                    this.setTarget(clickedShip);
                    return true; // Indicate that we handled the click
                }
            }
        }
        
        // If no clickable sphere was hit, fall back to the mesh-based detection
        const shipObjects = targetableShips.map(ship => ship.getObject()).filter(obj => obj !== null);
        
        // Check for intersections with any targetable ships
        const intersects = this.raycaster.intersectObjects(shipObjects, true);
        
        if (intersects.length > 0) {
            // Find the ship that was clicked
            const clickedMesh = intersects[0].object;
            let clickedShip = null;
            
            // Find the ship that owns this mesh
            for (const ship of targetableShips) {
                if (!ship.shipMesh) continue;
                
                // Check if the clicked mesh is part of this ship
                if (ship.shipMesh === clickedMesh || 
                    (ship.shipMesh.children && ship.shipMesh.children.includes(clickedMesh)) ||
                    clickedMesh.parent === ship.shipMesh) {
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
     * Set the current target
     * @param {BaseShip} ship - The ship to target
     */
    setTarget(ship) {
        // If we had a previous target, hide its health bar
        if (this.currentTarget && this.currentTarget.setHealthBarVisible) {
            this.currentTarget.setHealthBarVisible(false);
        }
        
        const previousTargetId = this.currentTarget ? this.currentTarget.id : null;
        const newTargetId = ship ? ship.id : null;
        
        console.log(`[TARGET] ${previousTargetId ? 'Changing' : 'Setting'} target:`, {
            from: previousTargetId || 'none',
            to: newTargetId || 'none',
            shipType: ship ? ship.type || 'unknown' : 'none',
            shipHealth: ship ? `${ship.currentHealth}/${ship.maxHealth}` : 'N/A',
            timestamp: new Date().toISOString()
        });
        
        this.currentTarget = ship;
        
        // Clean up debug arrows if target is cleared
        if (!ship && this.debugArrows && this.debugArrows.length > 0) {
            this.cleanupDebugArrows();
        }
        
        // If we have a new target, show its health bar
        if (ship && ship.setHealthBarVisible) {
            ship.setHealthBarVisible(true);
            
            // Always show the player ship's health bar when targeting
            if (this.playerShip && this.playerShip.setHealthBarVisible) {
                this.playerShip.setHealthBarVisible(true);
            }
        } else if (this.playerShip && this.playerShip.setHealthBarVisible) {
            // If not targeting, only show player's health bar if health is not full
            if (this.playerShip.currentHealth < this.playerShip.maxHealth) {
                this.playerShip.setHealthBarVisible(true);
            } else {
                this.playerShip.setHealthBarVisible(false);
            }
        }
        
        // Update UI if available
        if (this.ui) {
            this.ui.setTarget(ship);
        }
    }
    
    /**
     * Clear the current target
     */
    clearTarget() {
        this.setTarget(null);
    }
    
    /**
     * Set target automatically based on which ship attacked the player
     * @param {BaseShip} attackerShip - The ship that attacked the player
     */
    setAutoTarget(attackerShip) {
        // Only auto-target if we don't have a current target and the attacker is valid
        if (!this.currentTarget && attackerShip && !attackerShip.isSunk) {
            console.log(`[TARGET] Auto-targeting ship that attacked player:`, {
                attackerId: attackerShip.id,
                shipType: attackerShip.type || 'unknown',
                timestamp: new Date().toISOString()
            });
            
            this.setTarget(attackerShip);
        }
    }
    
    /**
     * Check if a ship is the current target
     * @param {BaseShip} ship - The ship to check
     * @returns {boolean} True if the ship is the current target
     */
    isCurrentTarget(ship) {
        return this.currentTarget && ship && this.currentTarget.id === ship.id;
    }
    
    /**
     * Get the current target
     * @returns {BaseShip|null} The current target or null if none
     */
    getCurrentTarget() {
        return this.currentTarget;
    }
    
    /**
     * Clean up debug arrows
     */
    cleanupDebugArrows() {
        if (this.scene && this.debugArrows) {
            this.debugArrows.forEach(arrow => {
                if (arrow) {
                    this.scene.remove(arrow);
                    if (arrow.geometry) arrow.geometry.dispose();
                    if (arrow.material) arrow.material.dispose();
                }
            });
            this.debugArrows = [];
        }
    }
    
    /**
     * Update debug arrows
     */
    updateDebugArrows() {
        // Skip if no player ship, target, or scene
        if (!this.playerShip || !this.currentTarget || !this.scene) {
            this.cleanupDebugArrows();
            return;
        }
        
        // Skip if player ship or target is sunk
        if (this.playerShip.isSunk || this.currentTarget.isSunk) {
            // Clean up any existing arrows
            this.cleanupDebugArrows();
            return;
        }
        
        try {
            // Get positions - clone to ensure we get fresh copies
            const sourcePos = this.playerShip.getPosition().clone();
            const targetPos = this.currentTarget.getPosition().clone();
            
            // Always remove old debug arrows first
            this.cleanupDebugArrows();
            
            // Force a fresh calculation of the forward vector
            // This is critical to ensure we get the current orientation
            const sourceForward = this.playerShip.getForwardVector().clone().normalize();
            
            // Calculate vector from source to target
            const toTargetVector = new THREE.Vector3()
                .subVectors(targetPos, sourcePos)
                .normalize();
            
            // Create new debug arrows
            
            // Create arrow for ship forward direction (blue)
            const forwardArrow = new THREE.ArrowHelper(
                sourceForward,
                sourcePos,
                10, // length
                0x0000FF, // blue
                2, // head length
                1  // head width
            );
            this.scene.add(forwardArrow);
            this.debugArrows.push(forwardArrow);
            
            // Create arrow for direction to target (red)
            const targetArrow = new THREE.ArrowHelper(
                toTargetVector,
                sourcePos,
                10, // length
                0xFF0000, // red
                2, // head length
                1  // head width
            );
            this.scene.add(targetArrow);
            this.debugArrows.push(targetArrow);
        } catch (error) {
            console.error('Error updating debug arrows:', error);
            // Clean up any existing arrows on error
            this.cleanupDebugArrows();
            
            // If we hit an error, it might be because the ship is in an invalid state
            // so clear the target as a safety measure
            this.clearTarget();
        }
    }
    
    /**
     * Update health bars for targeted ships
     */
    updateHealthBars() {
        // Skip if no camera
        if (!this.camera) return;
        
        // Update target and player health bars
        if (this.currentTarget && this.playerShip && 
            !this.playerShip.isSunk && !this.currentTarget.isSunk) {
            
            // Update health bars for player and target when targeting
            if (this.playerShip.updateHealthBar) {
                this.playerShip.updateHealthBar(this.camera);
            }
            
            if (this.currentTarget && this.currentTarget.updateHealthBar) {
                this.currentTarget.updateHealthBar(this.camera);
            }
        }
        // Always update player health bar if it exists, even without a target
        else if (this.playerShip && !this.playerShip.isSunk && this.playerShip.updateHealthBar) {
            // For non-targeting state, check if we need to show/hide the health bar based on health
            if (this.playerShip.healthBarContainer) {
                // Show health bar if not at full health
                if (this.playerShip.currentHealth < this.playerShip.maxHealth) {
                    this.playerShip.setHealthBarVisible(true);
                    this.playerShip.updateHealthBar(this.camera);
                } else if (!this.currentTarget && this.playerShip.healthBarContainer.visible) {
                    // Hide health bar if at full health and not targeting
                    this.playerShip.setHealthBarVisible(false);
                }
            }
        }
    }
    
    /**
     * Toggle visibility of debug click boxes on all ships
     * @param {boolean} visible - Whether debug click boxes should be visible
     */
    toggleDebugClickBoxes(visible) {
        this.showDebugClickBoxes = visible;
        
        // Update player ship if it exists
        if (this.playerShip && typeof this.playerShip.setDebugClickBoxVisible === 'function') {
            this.playerShip.setDebugClickBoxVisible(visible);
        }
        
        // Update all enemy ships if they exist
        if (this.enemyShipManager) {
            const enemyShips = this.enemyShipManager.getEnemyShips();
            for (const ship of enemyShips) {
                if (typeof ship.setDebugClickBoxVisible === 'function') {
                    ship.setDebugClickBoxVisible(visible);
                }
            }
        }
        
        // Update all other player ships from multiplayer manager
        if (this.multiplayerManager && this.multiplayerManager.otherPlayerShips) {
            this.multiplayerManager.otherPlayerShips.forEach(ship => {
                if (typeof ship.setDebugClickBoxVisible === 'function') {
                    ship.setDebugClickBoxVisible(visible);
                }
            });
        }
        // Also check window.multiplayerManager for global access
        else if (window.multiplayerManager && window.multiplayerManager.otherPlayerShips) {
            window.multiplayerManager.otherPlayerShips.forEach(ship => {
                if (typeof ship.setDebugClickBoxVisible === 'function') {
                    ship.setDebugClickBoxVisible(visible);
                }
            });
        }
        
        console.log(`Debug click boxes are now ${visible ? 'visible' : 'hidden'}`);
    }
    
    /**
     * Update the target manager
     * @param {number} delta - Time delta since last frame
     */
    update(delta) {
        try {
            // If current target has sunk, clear target
            if (this.currentTarget && this.currentTarget.isSunk) {
                this.clearTarget();
                return;
            }
            
            // Update debug arrows if we have a player ship and target that are both valid
            if (this.playerShip && this.currentTarget && 
                !this.playerShip.isSunk && !this.currentTarget.isSunk &&
                this.playerShip.shipMesh && this.currentTarget.shipMesh) {
                this.updateDebugArrows();
            } else {
                // Clean up arrows if we don't have valid ships
                this.cleanupDebugArrows();
            }
            
            this.updateHealthBars();
        } catch (error) {
            console.error('Error in TargetManager update:', error);
            // If we encounter an error, clean up and clear target as a safety measure
            this.cleanupDebugArrows();
            this.clearTarget();
        }
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
     * Set the multiplayer manager instance
     * @param {MultiplayerManager} multiplayerManager
     */
    setMultiplayerManager(multiplayerManager) {
        this.multiplayerManager = multiplayerManager;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Remove event listeners
        document.removeEventListener('click', this.handleMouseClick);
        
        // Clean up debug arrows
        this.cleanupDebugArrows();
    }
}

export default TargetManager; 