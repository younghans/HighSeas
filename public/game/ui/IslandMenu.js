/**
 * IslandMenu.js - Handles the UI for island interactions
 */
class IslandMenu {
    /**
     * Create a new IslandMenu
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.gameUI = options.gameUI;
        this.shipwright = options.shipwright;
        this.buildingManager = options.buildingManager;
        this.islandMenuOpen = false;
        this.currentView = 'main'; // Possible values: 'main', 'shipwright', 'building'
        this.selectedIsland = null;
        this.selectedIslandPoint = null;
        this.onMenuClosed = options.onMenuClosed || null;
        
        // Create island menu if it doesn't exist
        if (!document.getElementById('islandMenu')) {
            const menu = document.createElement('div');
            menu.id = 'islandMenu';
            menu.style.display = 'none';
            document.body.appendChild(menu);
        }
        
        // Store menu element reference
        this.menuElement = document.getElementById('islandMenu');
    }
    
    /**
     * Show the island menu
     * @param {THREE.Object3D} island - The island to show the menu for
     * @param {THREE.Vector3} clickedPoint - The point that was clicked
     * @param {Object} options - Additional options
     */
    show(island, clickedPoint, options = {}) {
        // If a specific view is requested, use that, otherwise default to main view
        this.currentView = options.view || 'main';
        
        this.islandMenuOpen = true;
        this.selectedIslandPoint = clickedPoint;
        this.selectedIsland = island;
        
        // Close top UI menus if game UI exists
        if (this.gameUI) {
            this.gameUI.closeTopMenu();
        }
        
        // Handle special case for shipwright view
        if (this.currentView === 'shipwright') {
            // Hide the island menu element
            this.menuElement.style.display = 'none';
            
            // Get the island name
            let islandName = 'an island';
            if (island) {
                if (island.userData && island.userData.islandName) {
                    islandName = island.userData.islandName;
                } else if (island.name) {
                    islandName = island.name;
                }
            }
            
            // Show the shipwright menu if available
            if (this.shipwright) {
                // Pass the island name to the shipwright for display
                this.shipwright.show({ islandName });
            }
            return;
        }
        
        // Update menu content based on current view
        this.updateMenuContent();
        
        // Display the menu
        this.menuElement.style.display = 'block';
    }
    
    /**
     * Update the menu content based on the current view
     */
    updateMenuContent() {
        switch(this.currentView) {
            case 'building':
                this.showBuildingView();
                break;
            case 'shipwright':
                // This is now handled separately - the shipwright manages its own UI
                // We just keep this case for state tracking purposes
                break;
            case 'main':
            default:
                this.showMainView();
                break;
        }
    }
    
    /**
     * Check if the selected island has a specific resource
     * @param {string} resourceType - The resource type to check for
     * @returns {boolean} Whether the island has the resource
     */
    hasResource(resourceType) {
        if (!this.selectedIsland || !this.selectedIsland.userData) return false;
        
        // Check if the island has resources data
        if (this.selectedIsland.userData.resources) {
            // If resources is an array, check if it contains the resourceType
            if (Array.isArray(this.selectedIsland.userData.resources)) {
                return this.selectedIsland.userData.resources.includes(resourceType);
            }
            // If resources is a string, check if it equals the resourceType
            else if (typeof this.selectedIsland.userData.resources === 'string') {
                return this.selectedIsland.userData.resources === resourceType;
            }
        }
        
        return false;
    }
    
    /**
     * Check if the selected island has a specific building or object type
     * @param {string} objectType - The object type to check for
     * @returns {boolean} Whether the island has the object type
     */
    hasObjectType(objectType) {
        if (!this.selectedIsland) return false;
        
        // Method 1: Check userData.placedObjects
        if (this.selectedIsland.userData && 
            this.selectedIsland.userData.placedObjects && 
            Array.isArray(this.selectedIsland.userData.placedObjects)) {
            // Find any object of the specified type
            if (this.selectedIsland.userData.placedObjects.some(obj => obj.type === objectType)) {
                return true;
            }
        }
        
        // Method a: Check actual child objects for the type
        if (this.selectedIsland.children && this.selectedIsland.children.length > 0) {
            // Look through direct children
            for (const child of this.selectedIsland.children) {
                // Check if this child is of the requested type
                if (child.userData && child.userData.type === objectType) {
                    return true;
                }

                // If this child has a group of objects (common pattern)
                if (child.children && child.children.length > 0) {
                    // Recursively check its children
                    for (const grandchild of child.children) {
                        if (grandchild.userData && grandchild.userData.type === objectType) {
                            return true;
                        }
                    }
                }
            }
        }
        
        // No matching object found
        return false;
    }
    
    /**
     * Show the main island menu view
     */
    showMainView() {
        // Get the island name from userData if available, or fallback to other properties
        let islandName = 'an island';
        
        if (this.selectedIsland) {
            if (this.selectedIsland.userData && this.selectedIsland.userData.islandName) {
                islandName = this.selectedIsland.userData.islandName;
            } else if (this.selectedIsland.name) {
                islandName = this.selectedIsland.name;
            }
        }
        
        // Debug information
        console.log('IslandMenu - Selected Island:', islandName);
        if (this.selectedIsland && this.selectedIsland.userData) {
            console.log('IslandMenu - userData:', this.selectedIsland.userData);
            console.log('IslandMenu - Has wood resource:', this.hasResource('wood'));
            console.log('IslandMenu - Has shipBuildingShop:', this.hasObjectType('shipBuildingShop'));
        }
        
        // Start building the HTML for the menu
        let menuHTML = `
            <h2>${islandName}</h2>
            <p>You've discovered ${islandName}!</p>
        `;
        
        // Add resource information instead of collection buttons
        if (this.hasResource('wood')) {
            menuHTML += `<p style="background-color: #8B4513; color: white; padding: 8px; margin: 5px 0; border-radius: 4px;">Click directly on the trees to gather wood</p>`;
        }
        
        if (this.hasResource('iron')) {
            menuHTML += `<p style="background-color: #767676; color: white; padding: 8px; margin: 5px 0; border-radius: 4px;">Click directly on the rocks to gather iron</p>`;
        }
        
        if (this.hasResource('hemp')) {
            menuHTML += `<p style="background-color: #F0E68C; color: black; padding: 8px; margin: 5px 0; border-radius: 4px;">Click directly on the hemp to gather hemp</p>`;
        }
        
        // Add shipwright button only if the island has a shipBuildingShop
        if (this.hasObjectType('shipBuildingShop')) {
            menuHTML += `<button id="shipwrightButton">Shipwright</button>`;
        }
        
        // Always add building mode button
        menuHTML += `<button id="buildButton">Building Mode</button>`;
        
        // Add close button
        menuHTML += `<button id="closeMenuButton">Close</button>`;
        
        // Update menu content
        this.menuElement.innerHTML = menuHTML;
        
        if (this.hasObjectType('shipBuildingShop')) {
            document.getElementById('shipwrightButton').addEventListener('click', () => {
                console.log('Switching to shipwright view...');
                this.currentView = 'shipwright';
                
                // Hide the island menu
                this.menuElement.style.display = 'none';
                
                // Get the island name to pass to the shipwright
                let islandName = this.selectedIsland ? 
                    (this.selectedIsland.userData && this.selectedIsland.userData.islandName) || 
                    this.selectedIsland.name || 
                    'an island' : 'an island';
                
                // Show the shipwright menu if available
                if (this.shipwright) {
                    this.shipwright.show({ islandName });
                }
            });
        }
        
        document.getElementById('buildButton').addEventListener('click', () => {
            this.currentView = 'building';
            this.updateMenuContent();
        });
        
        document.getElementById('closeMenuButton').addEventListener('click', () => this.hide());
    }
    
    /**
     * Show the building view
     */
    showBuildingView() {
        // Get the island name from userData if available, or fallback to other properties
        let islandName = 'an island';
        
        if (this.selectedIsland) {
            if (this.selectedIsland.userData && this.selectedIsland.userData.islandName) {
                islandName = this.selectedIsland.userData.islandName;
            } else if (this.selectedIsland.name) {
                islandName = this.selectedIsland.name;
            }
        }

        if (this.buildingManager) {
            // Enter build mode using the building manager
            this.buildingManager.enterBuildMode({
                context: {
                    type: 'island',
                    island: this.selectedIsland,
                    point: this.selectedIslandPoint
                }
            });
            
            // Set the building manager's UI container to the island menu
            this.buildingManager.uiContainer = this.menuElement;
            
            // Show the building selection UI
            this.buildingManager.showBuildingSelectionUI();
            
            // Add a back button to return to the main view
            const backButton = document.createElement('button');
            backButton.textContent = 'Back to Island Menu';
            backButton.style.position = 'absolute';
            backButton.style.top = '10px';
            backButton.style.left = '10px';
            backButton.style.background = '#8B4513';
            backButton.style.color = '#f5e8c0';
            backButton.style.border = 'none';
            backButton.style.borderRadius = '5px';
            backButton.style.padding = '5px 10px';
            backButton.style.cursor = 'pointer';
            
            backButton.addEventListener('click', () => {
                this.buildingManager.exitBuildMode();
                this.currentView = 'main';
                this.updateMenuContent();
            });
            
            this.menuElement.appendChild(backButton);
        } else {
            // Fallback if building manager is not available
            this.menuElement.innerHTML = `
                <h2>Building Mode - ${islandName}</h2>
                <p>Building services are not available at this time.</p>
                <button id="backButton">Back</button>
            `;
            
            document.getElementById('backButton').addEventListener('click', () => {
                this.currentView = 'main';
                this.updateMenuContent();
            });
        }
    }
    
    /**
     * Hide the island menu
     */
    hide() {
        if (this.menuElement) {
            this.menuElement.style.display = 'none';
        }
        
        // If we're in shipwright view, also hide the shipwright menu
        if (this.currentView === 'shipwright' && this.shipwright) {
            this.shipwright.hide();
        }
        
        // If player is collecting resources, don't automatically stop collection
        // This allows players to continue collecting while moving away from the menu
        
        this.islandMenuOpen = false;
        this.currentView = 'main'; // Reset to main view when hiding
        
        // Don't reset selectedIsland and selectedIslandPoint here
        // so we can return to the island menu after build mode
        
        // Call the onMenuClosed callback if set
        if (typeof this.onMenuClosed === 'function') {
            this.onMenuClosed();
        }
    }
    
    /**
     * Check if the menu is currently open
     * @returns {boolean} Whether the menu is open
     */
    isOpen() {
        return this.islandMenuOpen;
    }
    
    /**
     * Get the current view of the menu
     * @returns {string} Current view
     */
    getCurrentView() {
        return this.currentView;
    }
    
    /**
     * Get the currently selected island
     * @returns {THREE.Object3D} The selected island
     */
    getSelectedIsland() {
        return this.selectedIsland;
    }
    
    /**
     * Get the selected island point
     * @returns {THREE.Vector3} The selected point
     */
    getSelectedIslandPoint() {
        return this.selectedIslandPoint;
    }
    
    /**
     * Set callback for when menu is closed
     * @param {Function} callback - Function to call when menu is closed
     */
    setOnMenuClosed(callback) {
        this.onMenuClosed = callback;
    }
}

export default IslandMenu; 