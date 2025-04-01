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
        this.islandMenuOpen = true;
        this.selectedIslandPoint = clickedPoint;
        this.selectedIsland = island;
        
        // Close top UI menus if game UI exists
        if (this.gameUI) {
            this.gameUI.closeTopMenu();
        }
        
        // Update menu content
        this.menuElement.innerHTML = `
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
            this.hide();
            
            // Open the shipwright menu
            if (this.shipwright) {
                this.shipwright.show();
            }
        });
        
        document.getElementById('buildButton').addEventListener('click', () => {
            // Hide the island menu
            this.hide();
            
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
                this.buildingManager.uiContainer = this.menuElement;
                
                // Show the building selection UI
                this.buildingManager.showBuildingSelectionUI();
            }
        });
        
        document.getElementById('closeMenuButton').addEventListener('click', () => this.hide());
        
        // Display the menu
        this.menuElement.style.display = 'block';
    }
    
    /**
     * Hide the island menu
     */
    hide() {
        if (this.menuElement) {
            this.menuElement.style.display = 'none';
        }
        this.islandMenuOpen = false;
        
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