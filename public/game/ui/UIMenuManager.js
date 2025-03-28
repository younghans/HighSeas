import UI_CONSTANTS from './UIConstants.js';
import UIUtils from './UIUtils.js';
import UIEventBus from './UIEventBus.js';
import DebugPanel from './DebugPanel.js';

/**
 * Manages all UI menus
 */
class UIMenuManager {
    constructor(gameUI) {
        this.gameUI = gameUI;
        
        // Menu state
        this.activeMenuTop = null;
        this.activeMenuBottom = null;
        
        // Menu references
        this.profileMenu = null;
        this.settingsMenu = null;
        this.leaderboardMenu = null;
        this.inventoryMenu = null;
        this.goldMenu = null;
        this.mapMenu = null;
        
        this.init();
    }
    
    /**
     * Initialize all menus
     */
    init() {
        // Create top menus
        this.createProfileMenu();
        this.createSettingsMenu();
        this.createLeaderboardMenu();
        
        // Create bottom menus
        this.createInventoryMenu();
        this.createGoldMenu();
        this.createMapMenu();
        
        // Listen for menu toggle events
        UIEventBus.subscribe('toggleMenu', this.handleToggleMenu.bind(this));
        
        // Listen for gold updates
        UIEventBus.subscribe('updateGoldDisplay', this.handleGoldUpdate.bind(this));
        
        // Listen for game interactions to close menus on click outside
        document.addEventListener('click', this.handleGameInteraction.bind(this));
    }
    
    /**
     * Handle menu toggle event
     * @param {Object} data - Event data with menu type and location
     */
    handleToggleMenu(data) {
        const { type, location } = data;
        
        if (location === 'top') {
            this.toggleTopMenu(type);
        } else if (location === 'bottom') {
            this.toggleBottomMenu(type);
        }
    }
    
    /**
     * Handle gold update event
     * @param {Object} data - Event data with gold amount
     */
    handleGoldUpdate(data) {
        const goldMenuAmount = document.getElementById('gold-menu-amount');
        if (goldMenuAmount) {
            goldMenuAmount.textContent = data.amount;
        }
    }
    
    /**
     * Handle game interactions to close menus when clicking outside
     * @param {Event} event - Click event
     */
    handleGameInteraction(event) {
        // Only check for top menu closes on game interaction
        if (this.activeMenuTop !== null) {
            // Check if the click is outside of the top UI container
            if (!this.gameUI.topUIContainer.contains(event.target)) {
                this.closeTopMenu();
            }
        }
    }
    
    /**
     * Toggle menu visibility in the top container
     * @param {string} menuType - Type of menu to toggle
     */
    toggleTopMenu(menuType) {
        // Hide all top menus first
        if (this.profileMenu) this.profileMenu.style.display = 'none';
        if (this.settingsMenu) this.settingsMenu.style.display = 'none';
        if (this.leaderboardMenu) this.leaderboardMenu.style.display = 'none';
        
        // If we're toggling the currently active menu, just close it
        if (this.activeMenuTop === menuType) {
            if (this.gameUI.topMenuContainer) {
                this.gameUI.topMenuContainer.style.display = 'none';
            }
            this.activeMenuTop = null;
            return;
        }
        
        // Otherwise, show the selected menu
        if (this.gameUI.topMenuContainer) {
            this.gameUI.topMenuContainer.style.display = 'block';
        }
        
        if (menuType === 'profile') {
            if (this.profileMenu) {
                this.profileMenu.style.display = 'block';
                // Load current username if available
                this.loadUsername();
            }
        } else if (menuType === 'settings') {
            if (this.settingsMenu) {
                this.settingsMenu.style.display = 'block';
            }
        } else if (menuType === 'leaderboard') {
            if (this.leaderboardMenu) {
                this.leaderboardMenu.style.display = 'block';
                // Refresh leaderboard data when menu is opened
                if (this.gameUI.leaderboardComponent) {
                    this.gameUI.leaderboardComponent.loadLeaderboardData();
                }
            }
        }
        
        this.activeMenuTop = menuType;
    }
    
    /**
     * Toggle menu visibility in the bottom container
     * @param {string} menuType - Type of menu to toggle
     */
    toggleBottomMenu(menuType) {
        // Hide all bottom menus first
        if (this.inventoryMenu) this.inventoryMenu.style.display = 'none';
        if (this.goldMenu) this.goldMenu.style.display = 'none';
        if (this.mapMenu) this.mapMenu.style.display = 'none';
        
        // If we're toggling the currently active menu, just close it
        if (this.activeMenuBottom === menuType) {
            if (this.gameUI.bottomMenuContainer) {
                this.gameUI.bottomMenuContainer.style.display = 'none';
            }
            this.activeMenuBottom = null;
            return;
        }
        
        // Otherwise, show the selected menu
        if (this.gameUI.bottomMenuContainer) {
            this.gameUI.bottomMenuContainer.style.display = 'block';
        }
        
        if (menuType === 'inventory') {
            if (this.inventoryMenu) {
                this.inventoryMenu.style.display = 'block';
            }
        } else if (menuType === 'gold') {
            if (this.goldMenu) {
                this.goldMenu.style.display = 'block';
            }
        } else if (menuType === 'map') {
            if (this.mapMenu) {
                this.mapMenu.style.display = 'block';
            }
        }
        
        this.activeMenuBottom = menuType;
    }
    
    /**
     * Close the top menu
     */
    closeTopMenu() {
        if (this.gameUI.topMenuContainer) {
            this.gameUI.topMenuContainer.style.display = 'none';
        }
        this.activeMenuTop = null;
    }
    
    /**
     * Close the bottom menu
     */
    closeBottomMenu() {
        if (this.gameUI.bottomMenuContainer) {
            this.gameUI.bottomMenuContainer.style.display = 'none';
        }
        this.activeMenuBottom = null;
    }
    
    /**
     * Create profile menu
     */
    createProfileMenu() {
        this.profileMenu = UIUtils.createMenu('profile-menu', 'Profile', UI_CONSTANTS.COLORS.INFO);
        
        // Username section
        const usernameSection = document.createElement('div');
        usernameSection.style.marginBottom = '15px';
        usernameSection.style.width = '100%';
        usernameSection.style.touchAction = 'none';
        
        const usernameLabel = document.createElement('label');
        usernameLabel.textContent = 'Username:';
        usernameLabel.style.display = 'block';
        usernameLabel.style.marginBottom = '5px';
        usernameLabel.style.touchAction = 'none';
        usernameSection.appendChild(usernameLabel);
        
        const usernameInput = document.createElement('input');
        usernameInput.id = 'username-input';
        usernameInput.type = 'text';
        usernameInput.style.width = '100%';
        usernameInput.style.padding = '8px';
        usernameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        usernameInput.style.color = 'white';
        usernameInput.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        usernameInput.style.borderRadius = '4px';
        usernameInput.style.marginBottom = '10px';
        usernameInput.style.boxSizing = 'border-box';
        usernameInput.style.touchAction = 'none';
        
        usernameSection.appendChild(usernameInput);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Username';
        saveButton.style.padding = '8px 12px';
        saveButton.style.backgroundColor = UI_CONSTANTS.COLORS.INFO;
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.width = '100%';
        saveButton.style.boxSizing = 'border-box';
        saveButton.style.touchAction = 'none';
        
        // Add hover effect
        saveButton.addEventListener('mouseover', () => {
            saveButton.style.backgroundColor = '#2288ee';
        });
        
        saveButton.addEventListener('mouseout', () => {
            saveButton.style.backgroundColor = UI_CONSTANTS.COLORS.INFO;
        });
        
        // Add click handler to save username
        saveButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const newUsername = usernameInput.value.trim();
            if (newUsername) {
                this.saveUsername(newUsername);
            }
        });
        
        usernameSection.appendChild(saveButton);
        this.profileMenu.appendChild(usernameSection);
        
        // Divider
        const divider = document.createElement('div');
        divider.style.height = '1px';
        divider.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        divider.style.margin = '15px 0';
        this.profileMenu.appendChild(divider);
        
        // Logout button
        const logoutButton = document.createElement('button');
        logoutButton.id = 'profile-logout-button';
        logoutButton.textContent = 'Logout';
        logoutButton.style.padding = '8px 12px';
        logoutButton.style.backgroundColor = UI_CONSTANTS.COLORS.ERROR;
        logoutButton.style.color = 'white';
        logoutButton.style.border = 'none';
        logoutButton.style.borderRadius = '4px';
        logoutButton.style.cursor = 'pointer';
        logoutButton.style.width = '100%';
        logoutButton.style.boxSizing = 'border-box';
        logoutButton.style.touchAction = 'none';
        
        // Add hover effect
        logoutButton.addEventListener('mouseover', () => {
            logoutButton.style.backgroundColor = '#d32f2f';
        });
        
        logoutButton.addEventListener('mouseout', () => {
            logoutButton.style.backgroundColor = UI_CONSTANTS.COLORS.ERROR;
        });
        
        // Add click handler to logout
        logoutButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.logout();
        });
        
        this.profileMenu.appendChild(logoutButton);
        
        if (this.gameUI.topMenuContainer) {
            this.gameUI.topMenuContainer.appendChild(this.profileMenu);
        }
    }
    
    /**
     * Create settings menu
     */
    createSettingsMenu() {
        this.settingsMenu = UIUtils.createMenu('settings-menu', 'Settings', UI_CONSTANTS.COLORS.INFO);
        
        // Create profanity filter toggle
        const filterContainer = document.createElement('div');
        filterContainer.style.display = 'flex';
        filterContainer.style.alignItems = 'center';
        filterContainer.style.marginBottom = '10px';
        filterContainer.style.cursor = 'pointer';
        
        const filterCheckbox = document.createElement('input');
        filterCheckbox.type = 'checkbox';
        filterCheckbox.id = 'profanity-filter';
        // Use the gameUI property for profanity filter state
        filterCheckbox.checked = this.gameUI.profanityFilterEnabled;
        filterCheckbox.style.marginRight = '10px';
        filterCheckbox.style.cursor = 'pointer';
        
        const filterLabel = document.createElement('label');
        filterLabel.htmlFor = 'profanity-filter';
        filterLabel.textContent = 'Chat Profanity Filter';
        filterLabel.style.cursor = 'pointer';
        
        filterContainer.appendChild(filterCheckbox);
        filterContainer.appendChild(filterLabel);
        this.settingsMenu.appendChild(filterContainer);
        
        // Create debug mode button
        const debugButtonContainer = document.createElement('div');
        debugButtonContainer.style.marginTop = '20px';
        debugButtonContainer.style.width = '100%';
        debugButtonContainer.style.display = 'flex';
        debugButtonContainer.style.justifyContent = 'center';
        
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Debug Panel';
        debugButton.style.backgroundColor = UI_CONSTANTS.COLORS.INFO;
        debugButton.style.color = 'white';
        debugButton.style.border = 'none';
        debugButton.style.padding = '8px 15px';
        debugButton.style.borderRadius = '4px';
        debugButton.style.cursor = 'pointer';
        debugButton.style.fontWeight = 'bold';
        debugButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        
        debugButton.addEventListener('click', () => {
            // Toggle debug mode first
            this.gameUI.debugMode = !this.gameUI.debugMode;
            localStorage.setItem('debugMode', this.gameUI.debugMode);
            
            // If debug panel doesn't exist but should be visible now, create it
            if (this.gameUI.debugMode && !this.gameUI.debugPanel) {
                this.gameUI.debugPanel = new DebugPanel(this.gameUI);
            } 
            // If it exists, toggle it
            else if (this.gameUI.debugPanel) {
                this.gameUI.debugPanel.toggle();
            }
            
            // Explicitly toggle debug click boxes in combat manager
            if (this.gameUI.combatManager) {
                this.gameUI.combatManager.toggleDebugClickBoxes(this.gameUI.debugMode);
            }
            
            // Close the settings menu
            this.closeTopMenu();
        });
        
        debugButtonContainer.appendChild(debugButton);
        this.settingsMenu.appendChild(debugButtonContainer);
        
        // Add change handler for the profanity filter checkbox
        filterCheckbox.addEventListener('change', (event) => {
            const isEnabled = event.target.checked;
            // Update gameUI property
            this.gameUI.profanityFilterEnabled = isEnabled;
            // Save to localStorage
            localStorage.setItem('profanityFilter', isEnabled);
            // Update ChatManager
            if (this.gameUI.chatManager) {
                this.gameUI.chatManager.setProfanityFilter(isEnabled);
            }
        });
        
        if (this.gameUI.topMenuContainer) {
            this.gameUI.topMenuContainer.appendChild(this.settingsMenu);
        }
    }
    
    /**
     * Create leaderboard menu
     */
    createLeaderboardMenu() {
        // Initialize leaderboard component if it doesn't exist
        if (!this.gameUI.leaderboardComponent) {
            return;
        }
        
        // Get the menu from the leaderboard component
        this.leaderboardMenu = this.gameUI.leaderboardComponent.createLeaderboardMenu();
        
        if (this.gameUI.topMenuContainer) {
            this.gameUI.topMenuContainer.appendChild(this.leaderboardMenu);
        }
    }
    
    /**
     * Create inventory menu
     */
    createInventoryMenu() {
        this.inventoryMenu = UIUtils.createMenu('inventory-menu', 'Inventory', UI_CONSTANTS.COLORS.INFO);
        
        // Empty inventory message
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Your inventory is empty.';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = 'rgba(255, 255, 255, 0.7)';
        emptyMessage.style.fontStyle = 'italic';
        this.inventoryMenu.appendChild(emptyMessage);
        
        if (this.gameUI.bottomMenuContainer) {
            this.gameUI.bottomMenuContainer.appendChild(this.inventoryMenu);
        }
    }
    
    /**
     * Create gold menu
     */
    createGoldMenu() {
        this.goldMenu = UIUtils.createMenu('gold-menu', 'Gold', UI_CONSTANTS.COLORS.GOLD);
        
        // Gold amount display
        const goldAmountContainer = document.createElement('div');
        goldAmountContainer.style.display = 'flex';
        goldAmountContainer.style.alignItems = 'center';
        goldAmountContainer.style.justifyContent = 'center';
        goldAmountContainer.style.marginBottom = '15px';
        
        // Gold icon
        const goldIcon = document.createElement('div');
        goldIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="32" viewBox="0 0 24 16" fill="${UI_CONSTANTS.COLORS.GOLD}" stroke="${UI_CONSTANTS.COLORS.GOLD_STROKE}" stroke-width="1">
            <circle cx="9" cy="8" r="7"></circle>
            <circle cx="15" cy="8" r="7"></circle>
        </svg>`;
        goldIcon.style.marginRight = '10px';
        goldAmountContainer.appendChild(goldIcon);
        
        // Gold amount
        const goldAmount = document.createElement('span');
        goldAmount.id = 'gold-menu-amount';
        goldAmount.textContent = '0';
        goldAmount.style.fontSize = '24px';
        goldAmount.style.fontWeight = 'bold';
        goldAmount.style.color = UI_CONSTANTS.COLORS.GOLD;
        goldAmount.style.touchAction = 'none';
        goldAmountContainer.appendChild(goldAmount);
        
        this.goldMenu.appendChild(goldAmountContainer);
        
        // Description
        const description = document.createElement('p');
        description.textContent = 'Collect gold by looting shipwrecks and completing quests. Gold can be used to upgrade your ship and purchase items. (coming soon)';
        description.style.textAlign = 'center';
        description.style.color = 'rgba(255, 255, 255, 0.7)';
        description.style.fontSize = '14px';
        description.style.lineHeight = '1.4';
        this.goldMenu.appendChild(description);
        
        if (this.gameUI.bottomMenuContainer) {
            this.gameUI.bottomMenuContainer.appendChild(this.goldMenu);
        }
    }
    
    /**
     * Create map menu
     */
    createMapMenu() {
        this.mapMenu = UIUtils.createMenu('map-menu', 'Map', UI_CONSTANTS.COLORS.INFO);
        
        // Empty map message
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = "You don't have any map.";
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = 'rgba(255, 255, 255, 0.7)';
        emptyMessage.style.fontStyle = 'italic';
        this.mapMenu.appendChild(emptyMessage);
        
        if (this.gameUI.bottomMenuContainer) {
            this.gameUI.bottomMenuContainer.appendChild(this.mapMenu);
        }
    }
    
    /**
     * Load username from Firebase and update input field
     */
    loadUsername() {
        const usernameInput = document.getElementById('username-input');
        if (!usernameInput) return;
        
        // If we have access to Firebase auth and the user is logged in
        if (this.gameUI.auth && this.gameUI.auth.getCurrentUser()) {
            // Get the display name or email as fallback
            const user = this.gameUI.auth.getCurrentUser();
            const displayName = user.displayName || user.email || 'Sailor';
            usernameInput.value = displayName;
        } else {
            usernameInput.value = 'Sailor';
        }
    }
    
    /**
     * Save username to Firebase
     * @param {string} username - New username to save
     */
    saveUsername(username) {
        // Sanitize the username input (assuming DOMPurify is available globally)
        const sanitizedUsername = window.DOMPurify ? DOMPurify.sanitize(username) : username;
        
        // If we have access to Firebase auth and the user is logged in
        if (this.gameUI.auth && this.gameUI.auth.getCurrentUser()) {
            const user = this.gameUI.auth.getCurrentUser();
            
            // Update profile in Firebase with sanitized username
            user.updateProfile({
                displayName: sanitizedUsername
            }).then(() => {
                console.log('Username updated successfully');
                // Show success message using notification system
                if (this.gameUI.notificationSystem) {
                    this.gameUI.notificationSystem.show('Username updated successfully!', 'success');
                }
            }).catch(error => {
                console.error('Error updating username:', error);
                // Show error message
                if (this.gameUI.notificationSystem) {
                    this.gameUI.notificationSystem.show('Failed to update username. Please try again.', 'error');
                }
            });
        } else {
            console.warn('User not logged in, cannot save username');
            if (this.gameUI.notificationSystem) {
                this.gameUI.notificationSystem.show('You must be logged in to save your username.', 'error');
            }
        }
    }
    
    /**
     * Logout user from Firebase
     */
    logout() {
        // If we have access to Firebase auth
        if (this.gameUI.auth) {
            // Call the onLogout callback if provided (to set player offline)
            if (this.gameUI.onLogout && typeof this.gameUI.onLogout === 'function') {
                this.gameUI.onLogout();
            }
            
            // Wait a moment for the offline status to be set before signing out
            setTimeout(() => {
                this.gameUI.auth.signOut().then(() => {
                    console.log('User signed out successfully');
                }).catch(error => {
                    console.error('Error signing out:', error);
                    if (this.gameUI.notificationSystem) {
                        this.gameUI.notificationSystem.show('Failed to log out. Please try again.', 'error');
                    }
                });
            }, 500); // 500ms delay to ensure the offline status is set
        }
    }
    
    /**
     * Hide all menus
     */
    hideAllMenus() {
        this.closeTopMenu();
        this.closeBottomMenu();
        
        if (this.profileMenu) this.profileMenu.style.display = 'none';
        if (this.settingsMenu) this.settingsMenu.style.display = 'none';
        if (this.leaderboardMenu) this.leaderboardMenu.style.display = 'none';
        if (this.inventoryMenu) this.inventoryMenu.style.display = 'none';
        if (this.goldMenu) this.goldMenu.style.display = 'none';
        if (this.mapMenu) this.mapMenu.style.display = 'none';
    }
}

export default UIMenuManager; 