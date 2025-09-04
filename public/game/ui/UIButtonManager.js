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
        this.discordButton = null;
        
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
        
        // Note: Discord button creation moved to after ChatInterface is created
        
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
     * Create Discord button
     */
    createDiscordButton() {
        // Discord logo icon
        const discordIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/>
        </svg>`;
        
        // Create Discord button with custom styling
        this.discordButton = document.createElement('div');
        this.discordButton.id = 'discord-button';
        this.discordButton.style.width = UI_CONSTANTS.STYLES.BUTTON_SIZE;
        this.discordButton.style.height = UI_CONSTANTS.STYLES.BUTTON_SIZE;
        this.discordButton.style.backgroundColor = UI_CONSTANTS.COLORS.DISCORD;
        this.discordButton.style.color = 'white';
        this.discordButton.style.display = 'flex';
        this.discordButton.style.alignItems = 'center';
        this.discordButton.style.justifyContent = 'center';
        this.discordButton.style.cursor = 'pointer';
        this.discordButton.style.borderRadius = UI_CONSTANTS.STYLES.BORDER_RADIUS;
        this.discordButton.style.boxShadow = UI_CONSTANTS.STYLES.BOX_SHADOW;
        this.discordButton.style.transition = UI_CONSTANTS.STYLES.TRANSITION;
        this.discordButton.style.userSelect = 'none';
        this.discordButton.style.webkitUserSelect = 'none';
        this.discordButton.style.touchAction = 'none';
        this.discordButton.innerHTML = discordIcon;
        this.discordButton.title = 'Join our Discord';
        
        // Add hover effect
        this.discordButton.addEventListener('mouseover', () => {
            this.discordButton.style.backgroundColor = UI_CONSTANTS.COLORS.DISCORD_HOVER;
            this.discordButton.style.transform = 'scale(1.05)';
        });
        
        this.discordButton.addEventListener('mouseout', () => {
            this.discordButton.style.backgroundColor = UI_CONSTANTS.COLORS.DISCORD;
            this.discordButton.style.transform = 'scale(1)';
        });
        
        // Add click handler to open Discord link
        this.discordButton.addEventListener('click', (event) => {
            event.stopPropagation();
            // Replace with your actual Discord invite link
            window.open('https://discord.gg/D3vqqN27wu', '_blank');
        });
        
        // Add to bottom-left container next to chat button (will be positioned to the right of chat)
        if (this.gameUI.bottomLeftUIContainer) {
            this.gameUI.bottomLeftUIContainer.appendChild(this.discordButton);
        }
    }
    
    /**
     * Initialize Discord button (called after ChatInterface is created)
     */
    initDiscordButton() {
        if (!this.discordButton) {
            this.createDiscordButton();
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
        
        // Show Discord button
        if (this.discordButton) this.discordButton.style.display = 'flex';
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
        
        // Hide Discord button
        if (this.discordButton) this.discordButton.style.display = 'none';
    }
}

export default UIButtonManager; 