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
        
        // Update menu content with the island name
        this.menuElement.innerHTML = `
            <h2>${islandName}</h2>
            <p>You've discovered ${islandName}!</p>
            <button id="shipwrightButton">Shipwright</button>
            <button id="buildButton">Building Mode</button>
            <button id="closeMenuButton">Close</button>
        `;
        
        // Add event listeners to buttons
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