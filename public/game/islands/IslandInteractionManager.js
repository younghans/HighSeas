import * as THREE from 'three';
import Shipwright from '../ui/Shipwright.js';
import HoverDetection from './HoverDetection.js';

/**
 * IslandInteractionManager handles island interaction functionality
 */
class IslandInteractionManager {
    /**
     * Create a new IslandInteractionManager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.scene = options.scene;
        this.camera = options.camera;
        this.ship = options.ship;
        this.islandGenerator = options.islandGenerator;
        this.world = options.world;
        this.buildingManager = options.buildingManager;
        this.gameUI = options.gameUI;
        this.multiplayerManager = options.multiplayerManager;
        
        // Initialize shipwright
        this.shipwright = new Shipwright({ gameUI: this.gameUI });
        
        // Map of object types to their interaction handlers
        this.objectInteractionHandlers = {
            'shipBuildingShop': this.handleShipwrightInteraction.bind(this)
        };
        
        // Initialize hover detection system
        this.hoverDetection = new HoverDetection({
            scene: this.scene,
            camera: this.camera,
            islandGenerator: this.islandGenerator,
            highlightableTypes: ['shipBuildingShop'], // Start with only the shipBuildingShop
            debug: options.debug || false, // Pass debug flag
            throttleTime: options.hoverThrottleTime || 150, // Throttle hover checks
            frameSkip: options.hoverFrameSkip || 3, // Only process every N frames
            islandInteractionManager: this // Pass self-reference
        });
        
        // Set up object click handler
        if (this.hoverDetection) {
            this.hoverDetection.onObjectClicked = this.handleObjectClick.bind(this);
        }
        
        // Check localStorage for highlighting setting
        const savedHighlightSetting = localStorage.getItem('objectHighlighting');
        this.highlightingEnabled = savedHighlightSetting !== null ? 
            savedHighlightSetting === 'true' : 
            options.highlightingEnabled !== false;
            
        // Allow completely disabling the hover system if performance is an issue
        if (!this.highlightingEnabled && this.hoverDetection) {
            this.hoverDetection.dispose();
            this.hoverDetection = null;
        }
        
        // Island interaction variables
        this.selectedIsland = null;
        this.islandMenuOpen = false;
        this.selectedIslandPoint = null;
        this.ISLAND_INTERACTION_DISTANCE = 50;
        this.WATER_LEVEL_THRESHOLD = 0;
        
        // Create island menu if it doesn't exist
        if (!document.getElementById('islandMenu')) {
            const menu = document.createElement('div');
            menu.id = 'islandMenu';
            menu.style.display = 'none';
            document.body.appendChild(menu);
        }
        
        // Set up building manager callbacks if provided
        if (this.buildingManager) {
            this.buildingManager.onBuildModeExit = (context) => {
                // If we were building on an island, show the island menu again
                if (context && context.type === 'island' && context.island) {
                    this.showIslandMenu(context.island, context.point);
                }
            };
        }
        
        // Store in global for settings UI access
        if (window) {
            window.islandInteractionManager = this;
        }
    }
    
    /**
     * Handle object click event from HoverDetection
     * @param {THREE.Object3D} object - The clicked object
     */
    handleObjectClick(object) {
        if (!object || !object.userData || !object.userData.type) return;
        
        const objectType = object.userData.type;
        const handler = this.objectInteractionHandlers[objectType];
        
        if (handler) {
            handler(object);
        }
    }
    
    /**
     * Add an interaction handler for a specific object type
     * @param {string} objectType - The type of object to handle interactions for
     * @param {Function} handler - The handler function
     */
    addObjectInteractionHandler(objectType, handler) {
        if (typeof handler === 'function') {
            this.objectInteractionHandlers[objectType] = handler;
            
            // Make sure this object type is also highlightable
            this.addHighlightableType(objectType);
        }
    }
    
    /**
     * Handle interaction with the shipwright shop
     * @param {THREE.Object3D} object - The shipwright shop object
     */
    handleShipwrightInteraction(object) {
        if (this.shipwright) {
            this.shipwright.show();
        } else {
            console.error('Shipwright not available to handle interaction');
        }
    }
    
    /**
     * Handle island click
     * @param {THREE.Object3D} clickedIsland - The island that was clicked
     * @param {THREE.Vector3} intersectionPoint - The point of intersection
     * @param {THREE.Raycaster} raycaster - The raycaster used for the click
     */
    handleIslandClick(clickedIsland, intersectionPoint, raycaster) {
        // Check if the clicked point is above water
        if (intersectionPoint.y > this.WATER_LEVEL_THRESHOLD) {
            // Clicked on a part of the island that's above water
            this.selectedIsland = clickedIsland;
            
            // Get ship position
            const shipPos = this.ship.getPosition().clone();
            
            // Calculate the closest shoreline point for the ship to navigate to
            const shorelinePoint = this.findClosestShorelinePoint(clickedIsland, intersectionPoint, shipPos);
            
            // Calculate distance between ship and shoreline point (ignoring Y axis)
            const shipPosFlat = new THREE.Vector3(shipPos.x, 0, shipPos.z);
            const shorelinePointFlat = new THREE.Vector3(shorelinePoint.x, 0, shorelinePoint.z);
            const distance = shipPosFlat.distanceTo(shorelinePointFlat);
            
            if (distance <= this.ISLAND_INTERACTION_DISTANCE) {
                // Ship is close enough to the shoreline point, stop the ship and show menu
                this.ship.stopMoving();
                this.showIslandMenu(clickedIsland, shorelinePoint);
            } else {
                // Ship is too far, move it closer to the shoreline point
                // Calculate a position near the shoreline point for the ship to move to
                const direction = new THREE.Vector3().subVectors(shorelinePointFlat, shipPosFlat).normalize();
                
                // Calculate a position that's just within interaction distance of the shoreline point
                const targetPosition = new THREE.Vector3().addVectors(
                    shorelinePointFlat,
                    direction.multiplyScalar(-this.ISLAND_INTERACTION_DISTANCE * 0.8)
                );
                
                // Ensure Y position is the same as the ship's current Y position
                targetPosition.y = this.ship.getPosition().y;
                
                // Store the shoreline point for later use when the ship arrives
                this.ship.targetIslandPoint = shorelinePoint;
                
                // Move ship to the target position
                this.ship.moveTo(targetPosition);
                
                // Sync with Firebase if multiplayer is enabled
                if (this.multiplayerManager) {
                    this.multiplayerManager.updatePlayerPosition(this.ship);
                }
            }
        } else {
            // Clicked on a part of the island that's underwater - treat as water click
            this.handleWaterClick(raycaster);
        }
    }
    
    /**
     * Find the closest point on the shoreline of an island
     * @param {THREE.Object3D} island - The island to find a shoreline point on
     * @param {THREE.Vector3} clickedPoint - The point that was clicked
     * @param {THREE.Vector3} shipPosition - The current position of the ship
     * @returns {THREE.Vector3} - The closest shoreline point
     */
    findClosestShorelinePoint(island, clickedPoint, shipPosition) {
        // Direction from ship to clicked point
        const direction = new THREE.Vector3()
            .subVectors(clickedPoint, shipPosition)
            .normalize();
        
        // Create a raycaster from the ship position towards the clicked point
        const raycaster = new THREE.Raycaster(shipPosition, direction);
        
        // Intersect with the island
        const intersects = raycaster.intersectObject(island);
        
        if (intersects.length > 0) {
            // We found an intersection point on the island
            const intersectionPoint = intersects[0].point;
            
            // If this point is at or near the water level, it's a good shoreline point
            if (Math.abs(intersectionPoint.y - this.WATER_LEVEL_THRESHOLD) < 1.0) {
                return intersectionPoint;
            }
        }
        
        // If the direct ray approach didn't work, we'll use a different method
        // We'll sample points around the perimeter of the island to find a good shoreline point
        
        // Get the island's geometry
        const geometry = island.geometry;
        const positions = geometry.attributes.position;
        
        // Variables to track the closest shoreline point
        let closestPoint = null;
        let closestDistance = Infinity;
        
        // Sample points from the geometry
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Convert to world coordinates
            const worldPoint = new THREE.Vector3(x, y, z).applyMatrix4(island.matrixWorld);
            
            // Check if this point is near the water level (potential shoreline)
            if (Math.abs(worldPoint.y - this.WATER_LEVEL_THRESHOLD) < 1.0) {
                // Calculate distance from ship to this point (ignoring Y)
                const shipPosFlat = new THREE.Vector3(shipPosition.x, 0, shipPosition.z);
                const worldPointFlat = new THREE.Vector3(worldPoint.x, 0, worldPoint.z);
                const distance = shipPosFlat.distanceTo(worldPointFlat);
                
                // If this is closer than our current closest point, update
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPoint = worldPoint.clone();
                }
            }
        }
        
        // If we found a shoreline point, return it
        if (closestPoint) {
            // Ensure Y position is at water level
            closestPoint.y = this.WATER_LEVEL_THRESHOLD;
            return closestPoint;
        }
        
        // Fallback: If we couldn't find a good shoreline point,
        // use the clicked point but adjust its Y to the ship's Y
        return new THREE.Vector3(
            clickedPoint.x,
            this.ship.getPosition().y,
            clickedPoint.z
        );
    }
    
    /**
     * Handle water click
     * @param {THREE.Raycaster} raycaster - The raycaster used for the click
     * @returns {boolean} - Whether the click was handled
     */
    handleWaterClick(raycaster) {
        const waterIntersects = raycaster.intersectObject(this.world.getWater());
        
        if (waterIntersects.length > 0) {
            // Close island menu if open
            if (this.islandMenuOpen) {
                this.hideIslandMenu();
            }
            
            // Close shipwright menu if it exists AND is open
            if (this.shipwright) {
                const shipwrightMenu = document.getElementById('shipwrightMenu');
                if (shipwrightMenu && shipwrightMenu.style.display === 'block') {
                    this.shipwright.hide();
                }
            }
            
            // Exit build mode if active via the building manager
            if (this.buildingManager && this.buildingManager.isInBuildMode()) {
                this.buildingManager.exitBuildMode();
            }
            
            // Close top UI menus if game UI exists
            if (this.gameUI) {
                this.gameUI.closeTopMenu();
            }
            
            // Get the intersection point
            const intersectionPoint = waterIntersects[0].point;
            
            // Move ship to clicked point
            this.ship.moveTo(intersectionPoint);
            
            // Sync with Firebase if multiplayer is enabled
            if (this.multiplayerManager) {
                this.multiplayerManager.updatePlayerPosition(this.ship);
            }
            
            return true; // Click was handled
        }
        
        return false; // Click was not handled
    }
    
    /**
     * Show the island menu
     * @param {THREE.Object3D} island - The island to show the menu for
     * @param {THREE.Vector3} clickedPoint - The point that was clicked
     */
    showIslandMenu(island, clickedPoint) {
        this.ship.stopMoving();
        this.islandMenuOpen = true;
        this.selectedIslandPoint = clickedPoint;
        this.selectedIsland = island;
        
        // Close top UI menus if game UI exists
        if (this.gameUI) {
            this.gameUI.closeTopMenu();
        }
        
        const menu = document.getElementById('islandMenu');
        
        // Update menu content with a Build button
        menu.innerHTML = `
            <h2>Island Menu</h2>
            <p>You've discovered ${island.name || 'an island'}!</p>
            <button id="shipwrightButton">Shipwright</button>
            <button id="buildButton">Building Mode</button>
            <button id="closeMenuButton">Close</button>
        `;
        
        // Add event listeners to buttons
        document.getElementById('shipwrightButton').addEventListener('click', () => {
            console.log('Opening shipwright menu...');
            // Hide the island menu
            this.hideIslandMenu();
            
            // Open the shipwright menu
            this.toggleMenu('shipwrightMenu', true);
        });
        
        document.getElementById('buildButton').addEventListener('click', () => {
            // Hide the island menu
            this.hideIslandMenu();
            
            // Enter build mode using the building manager
            if (this.buildingManager) {
                // Pass context information about which island we're building on
                this.buildingManager.enterBuildMode({
                    context: {
                        type: 'island',
                        island: this.selectedIsland,
                        point: this.selectedIslandPoint
                    }
                });
                
                // Set the building manager's UI container to the island menu
                this.buildingManager.uiContainer = document.getElementById('islandMenu');
                
                // Show the building selection UI
                this.buildingManager.showBuildingSelectionUI();
            }
        });
        
        document.getElementById('closeMenuButton').addEventListener('click', () => this.hideIslandMenu());
        
        menu.style.display = 'block';
    }
    
    /**
     * Hide the island menu
     */
    hideIslandMenu() {
        const menu = document.getElementById('islandMenu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.islandMenuOpen = false;
        // Don't reset selectedIsland and selectedIslandPoint here
        // so we can return to the island menu after build mode
    }
    
    /**
     * Toggle a menu's visibility
     * @param {string} menuId - ID of the menu to toggle
     * @param {boolean} show - Whether to show or hide the menu
     * @param {Function} setupFn - Optional function to run when showing the menu
     */
    toggleMenu(menuId, show, setupFn = null) {
        // Handle shipwright menu separately
        if (menuId === 'shipwrightMenu') {
            if (this.shipwright) {
                console.log(`Toggling shipwright menu, show: ${show}`);
                this.shipwright.toggle(show);
                return;
            } else {
                console.error('Shipwright instance not found!');
            }
        }
        
        const menu = document.getElementById(menuId);
        
        if (!menu) {
            console.error(`Menu with ID ${menuId} not found!`);
            return;
        }
        
        // Show or hide the menu
        menu.style.display = show ? 'block' : 'none';
        
        // Run any additional setup if provided
        if (show && setupFn) {
            setupFn(menu);
        }
    }
    
    /**
     * Check if ship has reached target island point
     */
    checkShipReachedIsland() {
        if (this.selectedIsland && !this.islandMenuOpen && this.ship.targetIslandPoint) {
            const shipPos = this.ship.getPosition().clone();
            
            // Calculate distance between ship and clicked point (ignoring Y axis)
            const shipPosFlat = new THREE.Vector3(shipPos.x, 0, shipPos.z);
            const targetPointFlat = new THREE.Vector3(
                this.ship.targetIslandPoint.x, 
                0, 
                this.ship.targetIslandPoint.z
            );
            
            const distance = shipPosFlat.distanceTo(targetPointFlat);
            
            // If ship has reached the clicked point and is not moving, show menu
            if (distance <= this.ISLAND_INTERACTION_DISTANCE && !this.ship.isMoving) {
                // Stop the ship explicitly (although it should already be stopped)
                this.ship.stopMoving();
                this.showIslandMenu(this.selectedIsland, this.ship.targetIslandPoint);
                this.ship.targetIslandPoint = null; // Clear the target point
            }
        }
    }
    
    /**
     * Set the types of objects that can be highlighted
     * @param {Array} types - Array of object types that can be highlighted
     */
    setHighlightableTypes(types) {
        if (this.hoverDetection) {
            this.hoverDetection.setHighlightableTypes(types);
        }
    }
    
    /**
     * Add a type of object that can be highlighted
     * @param {string} type - Object type to add
     */
    addHighlightableType(type) {
        if (this.hoverDetection) {
            this.hoverDetection.addHighlightableType(type);
        }
    }
    
    /**
     * Remove a type of object from the highlightable list
     * @param {string} type - Object type to remove
     */
    removeHighlightableType(type) {
        if (this.hoverDetection) {
            this.hoverDetection.removeHighlightableType(type);
        }
    }
    
    /**
     * Enable or disable hover highlighting
     * @param {boolean} enabled - Whether highlighting should be enabled
     */
    setHighlightingEnabled(enabled) {
        this.highlightingEnabled = enabled;
        
        if (!enabled && this.hoverDetection) {
            this.hoverDetection.dispose();
            this.hoverDetection = null;
        } else if (enabled && !this.hoverDetection) {
            // Re-initialize hover detection if it was previously disabled
            this.hoverDetection = new HoverDetection({
                scene: this.scene,
                camera: this.camera,
                islandGenerator: this.islandGenerator,
                highlightableTypes: ['shipBuildingShop'],
                debug: this.debug || false,
                throttleTime: 150,
                frameSkip: 3,
                islandInteractionManager: this // Pass self-reference
            });
            
            // Set up object click handler
            if (this.hoverDetection) {
                this.hoverDetection.onObjectClicked = this.handleObjectClick.bind(this);
            }
        }
    }
    
    /**
     * Update method called each frame
     * @param {number} delta - Time since last update
     */
    update(delta) {
        // Check if ship has reached target island
        this.checkShipReachedIsland();
        
        // Update hover detection
        if (this.highlightingEnabled && this.hoverDetection) {
            this.hoverDetection.update(delta);
        }
    }
}

export default IslandInteractionManager; 