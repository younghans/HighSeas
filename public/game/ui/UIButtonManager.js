import UI_CONSTANTS from './UIConstants.js';
import UIUtils from './UIUtils.js';
import UIEventBus from './UIEventBus.js';

/**
 * Manages all UI buttons
 */
class UIButtonManager {
    constructor(gameUI) {
        this.gameUI = gameUI;
        
        // Button references
        this.profileButton = null;
        this.settingsButton = null;
        this.leaderboardButton = null;
        this.goldButton = null;
        this.shipStatsButton = null;
        this.inventoryButton = null;
        this.mapButton = null;
        
        this.init();
    }
    
    /**
     * Initialize all buttons
     */
    init() {
        // Create top buttons
        this.createSettingsButton();
        this.createLeaderboardButton();
        this.createProfileButton();
        
        // Create bottom buttons
        this.createGoldButton();
        this.createShipStatsButton();
        this.createInventoryButton();
        this.createMapButton();
        
        // Load initial gold amount
        this.loadGoldAmount();
        
        // Subscribe to gold updates
        document.addEventListener('playerGoldUpdated', () => {
            this.loadGoldAmount();
        });
    }
    
    /**
     * Create settings button
     */
    createSettingsButton() {
        // Settings icon (cog wheel)
        const settingsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>`;
        
        this.settingsButton = UIUtils.createIconButton(
            'settings-button', 
            settingsIcon, 
            'Settings',
            () => {
                UIEventBus.publish('toggleMenu', { type: 'settings', location: 'top' });
            }
        );
        
        if (this.gameUI.topButtonContainer) {
            this.gameUI.topButtonContainer.appendChild(this.settingsButton);
        }
    }
    
    /**
     * Create profile button
     */
    createProfileButton() {
        // Profile icon (user)
        const profileIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>`;
        
        this.profileButton = UIUtils.createIconButton(
            'profile-button', 
            profileIcon, 
            'Profile',
            () => {
                UIEventBus.publish('toggleMenu', { type: 'profile', location: 'top' });
            }
        );
        
        if (this.gameUI.topButtonContainer) {
            this.gameUI.topButtonContainer.appendChild(this.profileButton);
        }
    }
    
    /**
     * Create leaderboard button
     */
    createLeaderboardButton() {
        // Trophy icon that matches the provided image
        const leaderboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M18.5,4h-1.7H7.2H5.5C4.7,4,4,4.7,4,5.5v1.8c0,2.4,1.6,4.4,3.8,5c0.3,1.4,1.1,2.6,2.2,3.2v2.6h-2
                c-0.6,0-1,0.4-1,1V20c0,0.6,0.4,1,1,1h8c0.6,0,1-0.4,1-1v-0.9c0-0.6-0.4-1-1-1h-2v-2.6c1.1-0.7,1.9-1.8,2.2-3.2
                c2.2-0.6,3.8-2.6,3.8-5V5.5C20,4.7,19.3,4,18.5,4z M6,7.3V6h1v3.2C6.4,8.7,6,8,6,7.3z M18,7.3c0,0.7-0.4,1.4-1,1.9V6h1V7.3z"/>
        </svg>`;
        
        this.leaderboardButton = UIUtils.createIconButton(
            'leaderboard-button', 
            leaderboardIcon, 
            'Leaderboard',
            () => {
                UIEventBus.publish('toggleMenu', { type: 'leaderboard', location: 'top' });
            }
        );
        
        if (this.gameUI.topButtonContainer) {
            this.gameUI.topButtonContainer.appendChild(this.leaderboardButton);
        }
    }
    
    /**
     * Create gold button
     */
    createGoldButton() {
        // Gold button requires special styling with text
        const goldButton = document.createElement('div');
        goldButton.id = 'gold-button';
        goldButton.style.width = 'auto';
        goldButton.style.height = UI_CONSTANTS.STYLES.BUTTON_SIZE;
        goldButton.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG;
        goldButton.style.color = 'white';
        goldButton.style.display = 'flex';
        goldButton.style.alignItems = 'center';
        goldButton.style.justifyContent = 'center';
        goldButton.style.cursor = 'pointer';
        goldButton.style.borderRadius = UI_CONSTANTS.STYLES.BORDER_RADIUS;
        goldButton.style.boxShadow = UI_CONSTANTS.STYLES.BOX_SHADOW;
        goldButton.style.transition = UI_CONSTANTS.STYLES.TRANSITION;
        goldButton.style.userSelect = 'none';
        goldButton.style.webkitUserSelect = 'none';
        goldButton.style.padding = '0 10px';
        goldButton.style.touchAction = 'none';
        
        // Create coin icon using SVG
        const iconContainer = document.createElement('div');
        iconContainer.style.display = 'flex';
        iconContainer.style.alignItems = 'center';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.marginRight = '8px';
        
        // Use SVG icon for gold coins
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="20" viewBox="0 0 24 16" fill="${UI_CONSTANTS.COLORS.GOLD}" stroke="${UI_CONSTANTS.COLORS.GOLD_STROKE}" stroke-width="1">
            <circle cx="9" cy="8" r="7"></circle>
            <circle cx="15" cy="8" r="7"></circle>
        </svg>`;
        
        // Create gold amount text
        const goldText = document.createElement('span');
        goldText.id = 'gold-amount';
        goldText.textContent = '0';
        goldText.style.fontSize = '14px';
        goldText.style.fontWeight = 'bold';
        goldText.style.color = UI_CONSTANTS.COLORS.GOLD;
        goldText.style.touchAction = 'none';
        
        // Add icon and text to button
        goldButton.appendChild(iconContainer);
        goldButton.appendChild(goldText);
        
        goldButton.title = 'Gold';
        
        // Add hover effect
        goldButton.addEventListener('mouseover', () => {
            goldButton.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG_HOVER;
            goldButton.style.transform = 'scale(1.05)';
        });
        
        goldButton.addEventListener('mouseout', () => {
            goldButton.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG;
            goldButton.style.transform = 'scale(1)';
        });
        
        // Add click handler
        goldButton.addEventListener('click', (event) => {
            event.stopPropagation();
            UIEventBus.publish('toggleMenu', { type: 'gold', location: 'bottom' });
        });
        
        if (this.gameUI.bottomButtonContainer) {
            this.gameUI.bottomButtonContainer.appendChild(goldButton);
        }
        
        this.goldButton = goldButton;
    }
    
    /**
     * Create ship stats button
     */
    createShipStatsButton() {
        // Ship helm/steering wheel icon with extended spokes
        const shipStatsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="2" x2="12" y2="9"></line>
            <line x1="12" y1="15" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="9" y2="12"></line>
            <line x1="15" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="4.93" x2="8.46" y2="8.46"></line>
            <line x1="15.54" y1="15.54" x2="19.07" y2="19.07"></line>
            <line x1="4.93" y1="19.07" x2="8.46" y2="15.54"></line>
            <line x1="15.54" y1="8.46" x2="19.07" y2="4.93"></line>
        </svg>`;
        
        this.shipStatsButton = UIUtils.createIconButton(
            'ship-stats-button', 
            shipStatsIcon, 
            'Ship Stats',
            () => {
                UIEventBus.publish('toggleMenu', { type: 'shipStats', location: 'bottom' });
            }
        );
        
        if (this.gameUI.bottomButtonContainer) {
            this.gameUI.bottomButtonContainer.appendChild(this.shipStatsButton);
        }
    }
    
    /**
     * Create inventory button
     */
    createInventoryButton() {
        // Inventory icon (treasure chest)
        const inventoryIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8h18v12H3z"></path>
            <path d="M21 8c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2"></path>
            <path d="M9 8v2"></path>
            <path d="M15 8v2"></path>
            <path d="M3 14h18"></path>
        </svg>`;
        
        this.inventoryButton = UIUtils.createIconButton(
            'inventory-button', 
            inventoryIcon, 
            'Inventory',
            () => {
                UIEventBus.publish('toggleMenu', { type: 'inventory', location: 'bottom' });
            }
        );
        
        if (this.gameUI.bottomButtonContainer) {
            this.gameUI.bottomButtonContainer.appendChild(this.inventoryButton);
        }
    }
    
    /**
     * Create map button
     */
    createMapButton() {
        // Map icon (old-style square map)
        const mapIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3,3 L5,2 L8,4 L10,3 L14,5 L16,4 L19,6 L21,5 L21,19 L19,20 L16,18 L14,19 L10,17 L8,18 L5,16 L3,17 Z"></path>
        </svg>`;
        
        this.mapButton = UIUtils.createIconButton(
            'map-button', 
            mapIcon, 
            'Map',
            () => {
                UIEventBus.publish('toggleMenu', { type: 'map', location: 'bottom' });
            }
        );
        
        if (this.gameUI.bottomButtonContainer) {
            this.gameUI.bottomButtonContainer.appendChild(this.mapButton);
        }
    }
    
    /**
     * Load gold amount from Firebase and update display
     */
    loadGoldAmount() {
        // If we have access to Firebase auth and the user is logged in
        if (this.gameUI.auth && this.gameUI.auth.getCurrentUser()) {
            const uid = this.gameUI.auth.getCurrentUser().uid;
            
            // Reference to the player's gold in Firebase
            const goldRef = firebase.database().ref(`players/${uid}/gold`);
            
            // Get the gold amount
            goldRef.once('value')
                .then(snapshot => {
                    // Get gold amount (default to 0 if it doesn't exist)
                    const goldAmount = snapshot.exists() ? snapshot.val() : 0;
                    
                    // Update the gold displays
                    this.updateGoldDisplay(goldAmount);
                })
                .catch(error => {
                    console.error('Error loading gold amount:', error);
                });
        }
    }
    
    /**
     * Update gold display with the given amount
     * @param {number} amount - The gold amount to display
     */
    updateGoldDisplay(amount) {
        // Format gold amount with commas for thousands
        const formattedAmount = amount.toLocaleString();
        
        // Update gold button
        const goldButtonAmount = document.getElementById('gold-amount');
        if (goldButtonAmount) {
            goldButtonAmount.textContent = formattedAmount;
        }
        
        // Update gold menu through the event bus
        UIEventBus.publish('updateGoldDisplay', { amount: formattedAmount });
    }
    
    /**
     * Show all buttons
     */
    show() {
        // Show top buttons
        if (this.settingsButton) this.settingsButton.style.display = 'flex';
        if (this.profileButton) this.profileButton.style.display = 'flex';
        if (this.leaderboardButton) this.leaderboardButton.style.display = 'flex';
        
        // Show bottom buttons
        if (this.goldButton) this.goldButton.style.display = 'flex';
        if (this.shipStatsButton) this.shipStatsButton.style.display = 'flex';
        if (this.inventoryButton) this.inventoryButton.style.display = 'flex';
        if (this.mapButton) this.mapButton.style.display = 'flex';
    }
    
    /**
     * Hide all buttons
     */
    hide() {
        // Hide top buttons
        if (this.settingsButton) this.settingsButton.style.display = 'none';
        if (this.profileButton) this.profileButton.style.display = 'none';
        if (this.leaderboardButton) this.leaderboardButton.style.display = 'none';
        
        // Hide bottom buttons
        if (this.goldButton) this.goldButton.style.display = 'none';
        if (this.shipStatsButton) this.shipStatsButton.style.display = 'none';
        if (this.inventoryButton) this.inventoryButton.style.display = 'none';
        if (this.mapButton) this.mapButton.style.display = 'none';
    }
}

export default UIButtonManager; 