import UI_CONSTANTS from './UIConstants.js';
import UIUtils from './UIUtils.js';
import UIEventBus from './UIEventBus.js';

/**
 * Displays the ship stats in a menu
 */
class ShipStats {
    constructor(gameUI) {
        this.gameUI = gameUI;
        this.shipStatsMenu = null;
        this.playerShip = null;
        
        // Elements
        this.shipTypeElement = null;
        this.shipHealthElement = null;
        this.shipSpeedElement = null;
        this.shipRotationSpeedElement = null;
        this.shipCannonDamageElement = null;
        this.shipCannonRangeElement = null;
        
        // Update interval for real-time stats
        this.updateInterval = null;
        
        this.init();
    }
    
    /**
     * Initialize ship stats
     */
    init() {
        // Create the menu container
        this.shipStatsMenu = this.createShipStatsMenu();
        
        // Try to get player ship immediately at init time
        this.getPlayerShipFromGame();
        
        // Listen for player ship updates
        document.addEventListener('playerShipUpdated', this.updateShipStats.bind(this));
        
        // Start periodic updates when menu is visible
        this.setupPeriodicUpdates();
    }
    
    /**
     * Set up periodic updates for real-time stats
     */
    setupPeriodicUpdates() {
        // Listen for menu visibility changes
        UIEventBus.subscribe('toggleMenu', (data) => {
            if (data.type === 'shipStats') {
                // Check if the current menu container is visible to determine if opening or closing
                const menuVisible = this.shipStatsMenu && this.shipStatsMenu.style.display === 'block';
                if (menuVisible) {
                    // Menu is being closed, clear interval
                    this.clearUpdateInterval();
                } else {
                    // Menu is being opened, start interval and force refresh the ship
                    this.getPlayerShipFromGame();
                    this.startUpdateInterval();
                }
            } else if (this.updateInterval) {
                // Different menu opened, clear interval
                this.clearUpdateInterval();
            }
        });
    }
    
    /**
     * Get the player ship from the game's combat manager
     * This is a fallback method to ensure we have the player ship
     */
    getPlayerShipFromGame() {
        // Try to get the ship from our gameUI first
        if (this.gameUI && this.gameUI.playerShip) {
            console.log('Getting player ship from gameUI');
            this.playerShip = this.gameUI.playerShip;
        } 
        // Then try to get it from the global combat manager
        else if (window.combatManager && window.combatManager.playerShip) {
            console.log('Getting player ship from window.combatManager');
            this.playerShip = window.combatManager.playerShip;
        }
        
        if (this.playerShip) {
            console.log('Player ship found:', this.playerShip);
            this.refreshStats();
        } else {
            console.warn('Could not find player ship in either gameUI or window.combatManager');
        }
    }
    
    /**
     * Start the update interval for real-time stats
     */
    startUpdateInterval() {
        // Clear any existing interval first
        this.clearUpdateInterval();
        
        // Update every 500ms
        this.updateInterval = setInterval(() => {
            if (this.playerShip && this.shipStatsMenu.style.display === 'block') {
                this.refreshStats();
            }
        }, 500);
    }
    
    /**
     * Clear the update interval
     */
    clearUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Create the ship stats menu
     * @returns {HTMLElement} The ship stats menu element
     */
    createShipStatsMenu() {
        const menu = UIUtils.createMenu('ship-stats-menu', 'Ship Stats', UI_CONSTANTS.COLORS.INFO);
        
        // Ship type section
        const shipTypeSection = document.createElement('div');
        shipTypeSection.className = 'ship-stats-section';
        shipTypeSection.style.marginBottom = '15px';
        
        const shipTypeLabel = document.createElement('div');
        shipTypeLabel.textContent = 'Ship Type:';
        shipTypeLabel.style.fontWeight = 'bold';
        shipTypeLabel.style.marginBottom = '5px';
        shipTypeLabel.style.touchAction = 'none';
        shipTypeSection.appendChild(shipTypeLabel);
        
        this.shipTypeElement = document.createElement('div');
        this.shipTypeElement.textContent = 'Unknown';
        this.shipTypeElement.style.touchAction = 'none';
        shipTypeSection.appendChild(this.shipTypeElement);
        
        menu.appendChild(shipTypeSection);
        
        // Ship health section
        const shipHealthSection = document.createElement('div');
        shipHealthSection.className = 'ship-stats-section';
        shipHealthSection.style.marginBottom = '15px';
        
        const shipHealthLabel = document.createElement('div');
        shipHealthLabel.textContent = 'Ship Health:';
        shipHealthLabel.style.fontWeight = 'bold';
        shipHealthLabel.style.marginBottom = '5px';
        shipHealthLabel.style.touchAction = 'none';
        shipHealthSection.appendChild(shipHealthLabel);
        
        this.shipHealthElement = document.createElement('div');
        this.shipHealthElement.textContent = '0/100';
        this.shipHealthElement.style.touchAction = 'none';
        shipHealthSection.appendChild(this.shipHealthElement);
        
        // Progress bar for health
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        healthBar.style.height = '10px';
        healthBar.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        healthBar.style.borderRadius = '5px';
        healthBar.style.marginTop = '5px';
        healthBar.style.overflow = 'hidden';
        
        const healthFill = document.createElement('div');
        healthFill.id = 'ship-health-fill';
        healthFill.style.height = '100%';
        healthFill.style.width = '100%';
        healthFill.style.backgroundColor = UI_CONSTANTS.COLORS.SUCCESS;
        healthFill.style.transition = 'width 0.3s ease-in-out';
        
        healthBar.appendChild(healthFill);
        shipHealthSection.appendChild(healthBar);
        
        menu.appendChild(shipHealthSection);
        
        // Ship speed section
        const shipSpeedSection = document.createElement('div');
        shipSpeedSection.className = 'ship-stats-section';
        shipSpeedSection.style.marginBottom = '15px';
        
        const shipSpeedLabel = document.createElement('div');
        shipSpeedLabel.textContent = 'Ship Speed:';
        shipSpeedLabel.style.fontWeight = 'bold';
        shipSpeedLabel.style.marginBottom = '5px';
        shipSpeedLabel.style.touchAction = 'none';
        shipSpeedSection.appendChild(shipSpeedLabel);
        
        this.shipSpeedElement = document.createElement('div');
        this.shipSpeedElement.textContent = '0';
        this.shipSpeedElement.style.touchAction = 'none';
        shipSpeedSection.appendChild(this.shipSpeedElement);
        
        menu.appendChild(shipSpeedSection);
        
        // Ship rotation speed section
        const shipRotationSpeedSection = document.createElement('div');
        shipRotationSpeedSection.className = 'ship-stats-section';
        shipRotationSpeedSection.style.marginBottom = '15px';
        
        const shipRotationSpeedLabel = document.createElement('div');
        shipRotationSpeedLabel.textContent = 'Rotation Speed:';
        shipRotationSpeedLabel.style.fontWeight = 'bold';
        shipRotationSpeedLabel.style.marginBottom = '5px';
        shipRotationSpeedLabel.style.touchAction = 'none';
        shipRotationSpeedSection.appendChild(shipRotationSpeedLabel);
        
        this.shipRotationSpeedElement = document.createElement('div');
        this.shipRotationSpeedElement.textContent = '0';
        this.shipRotationSpeedElement.style.touchAction = 'none';
        shipRotationSpeedSection.appendChild(this.shipRotationSpeedElement);
        
        menu.appendChild(shipRotationSpeedSection);
        
        // Ship cannon damage section
        const shipCannonDamageSection = document.createElement('div');
        shipCannonDamageSection.className = 'ship-stats-section';
        shipCannonDamageSection.style.marginBottom = '15px';
        
        const shipCannonDamageLabel = document.createElement('div');
        shipCannonDamageLabel.textContent = 'Cannon Damage:';
        shipCannonDamageLabel.style.fontWeight = 'bold';
        shipCannonDamageLabel.style.marginBottom = '5px';
        shipCannonDamageLabel.style.touchAction = 'none';
        shipCannonDamageSection.appendChild(shipCannonDamageLabel);
        
        this.shipCannonDamageElement = document.createElement('div');
        this.shipCannonDamageElement.textContent = '0-0';
        this.shipCannonDamageElement.style.touchAction = 'none';
        shipCannonDamageSection.appendChild(this.shipCannonDamageElement);
        
        menu.appendChild(shipCannonDamageSection);
        
        // Ship cannon range section
        const shipCannonRangeSection = document.createElement('div');
        shipCannonRangeSection.className = 'ship-stats-section';
        shipCannonRangeSection.style.marginBottom = '15px';
        
        const shipCannonRangeLabel = document.createElement('div');
        shipCannonRangeLabel.textContent = 'Cannon Range:';
        shipCannonRangeLabel.style.fontWeight = 'bold';
        shipCannonRangeLabel.style.marginBottom = '5px';
        shipCannonRangeLabel.style.touchAction = 'none';
        shipCannonRangeSection.appendChild(shipCannonRangeLabel);
        
        this.shipCannonRangeElement = document.createElement('div');
        this.shipCannonRangeElement.textContent = '0';
        this.shipCannonRangeElement.style.touchAction = 'none';
        shipCannonRangeSection.appendChild(this.shipCannonRangeElement);
        
        menu.appendChild(shipCannonRangeSection);
        
        // Set initial display to none
        menu.style.display = 'none';
        
        return menu;
    }
    
    /**
     * Update ship stats when player ship is updated
     * @param {Event} event - The playerShipUpdated event
     */
    updateShipStats(event) {
        console.log('playerShipUpdated event received:', event.detail);
        if (!event.detail || !event.detail.ship) {
            console.warn('No ship data in the event detail');
            return;
        }
        
        this.playerShip = event.detail.ship;
        console.log('Player ship updated:', this.playerShip);
        
        // Log ship constructor info to debug
        if (this.playerShip) {
            console.log('Ship constructor:', this.playerShip.constructor);
            console.log('Ship prototype:', Object.getPrototypeOf(this.playerShip));
        }
        
        this.refreshStats();
    }
    
    /**
     * Refresh the stats display with current player ship data
     */
    refreshStats() {
        if (!this.playerShip) return;
        
        // Get the ship constructor name to determine type
        let shipType = 'Unknown';
        
        // Try several approaches to get the ship type
        
        // Method 1: From modelType property (specific to SailboatShip)
        if (this.playerShip.modelType) {
            // This is the most accurate for player ships
            shipType = this.capitalizeFirstLetter(this.playerShip.modelType);
        }
        // Method 2: From constructor name
        else if (this.playerShip.constructor && this.playerShip.constructor.name) {
            shipType = this.playerShip.constructor.name.replace('Ship', '');
        }
        // Method 3: From prototype chain
        else if (Object.getPrototypeOf(this.playerShip) && 
                 Object.getPrototypeOf(this.playerShip).constructor && 
                 Object.getPrototypeOf(this.playerShip).constructor.name) {
            shipType = Object.getPrototypeOf(this.playerShip).constructor.name.replace('Ship', '');
        }
        // Method 4: From direct ship type property
        else if (this.playerShip.type) {
            shipType = this.playerShip.type;
        } 
        else if (this.playerShip.shipType) {
            shipType = this.playerShip.shipType;
        }
        // Method 5: Look at mesh and model names if available
        else if (this.playerShip.shipMesh) {
            if (this.playerShip.shipMesh.name && this.playerShip.shipMesh.name.includes('Ship')) {
                shipType = this.playerShip.shipMesh.name.replace('Ship', '');
            } else if (this.playerShip.shipMesh.userData && this.playerShip.shipMesh.userData.type) {
                shipType = this.playerShip.shipMesh.userData.type;
            }
        }
        
        // Default to "Sailboat" as last resort if we still don't have a type and it's not an enemy
        if ((shipType === 'Unknown' || !shipType) && !this.playerShip.isEnemy) {
            shipType = 'Sailboat';
        }
        
        this.shipTypeElement.textContent = shipType;
        
        // Update health
        this.shipHealthElement.textContent = `${Math.floor(this.playerShip.currentHealth)}/${this.playerShip.maxHealth}`;
        
        // Update health bar fill
        const healthPercentage = this.playerShip.getHealthPercentage ? 
            this.playerShip.getHealthPercentage() : 
            (this.playerShip.currentHealth / this.playerShip.maxHealth * 100);
            
        const healthFill = document.getElementById('ship-health-fill');
        if (healthFill) {
            healthFill.style.width = `${healthPercentage}%`;
            
            // Change color based on health percentage
            if (healthPercentage <= 20) {
                healthFill.style.backgroundColor = UI_CONSTANTS.COLORS.DANGER;
            } else if (healthPercentage <= 50) {
                healthFill.style.backgroundColor = UI_CONSTANTS.COLORS.WARNING;
            } else {
                healthFill.style.backgroundColor = UI_CONSTANTS.COLORS.SUCCESS;
            }
        }
        
        // Update speed
        this.shipSpeedElement.textContent = this.playerShip.speed.toFixed(1);
        
        // Update rotation speed
        this.shipRotationSpeedElement.textContent = this.playerShip.rotationSpeed.toFixed(1);
        
        // Update cannon damage
        const minDamage = this.playerShip.cannonDamage?.min || 0;
        const maxDamage = this.playerShip.cannonDamage?.max || 0;
        this.shipCannonDamageElement.textContent = `${minDamage}-${maxDamage}`;
        
        // Update cannon range
        this.shipCannonRangeElement.textContent = this.playerShip.cannonRange.toFixed(0);
    }
    
    /**
     * Helper method to capitalize the first letter of a string
     * @param {string} str - The string to capitalize
     * @returns {string} The capitalized string
     */
    capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Set menu visibility
     * @param {boolean} visible - Whether the menu should be visible
     */
    setVisible(visible) {
        if (this.shipStatsMenu) {
            this.shipStatsMenu.style.display = visible ? 'block' : 'none';
            
            // Refresh stats when menu becomes visible
            if (visible) {
                this.refreshStats();
                this.startUpdateInterval();
            } else {
                this.clearUpdateInterval();
            }
        }
    }
}

export default ShipStats; 