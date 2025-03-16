import * as THREE from 'three';

/**
 * GameUI class for handling in-game user interface elements
 */
class GameUI {
    constructor(options = {}) {
        this.app = options;
        this.auth = options.auth;
        this.onLogout = options.onLogout;
        this.isVisible = false;
        this.activeMenuBottom = null;
        this.activeMenuTop = null;
        
        // UI elements
        this.bottomUIContainer = null;
        this.topUIContainer = null;
        this.bottomButtonContainer = null;
        this.topButtonContainer = null;
        this.bottomMenuContainer = null;
        this.topMenuContainer = null;
        
        // Button references
        this.profileButton = null;
        this.inventoryButton = null;
        this.mapButton = null;
        
        // Menu references
        this.profileMenu = null;
        this.inventoryMenu = null;
        this.mapMenu = null;
        
        // Initialize UI
        this.init();
    }
    
    /**
     * Initialize UI elements
     */
    init() {
        // Create bottom UI container
        this.bottomUIContainer = document.createElement('div');
        this.bottomUIContainer.id = 'game-ui-bottom-container';
        this.bottomUIContainer.style.position = 'absolute';
        this.bottomUIContainer.style.bottom = '20px';
        this.bottomUIContainer.style.right = '20px';
        this.bottomUIContainer.style.display = 'flex';
        this.bottomUIContainer.style.flexDirection = 'column';
        this.bottomUIContainer.style.alignItems = 'flex-end';
        this.bottomUIContainer.style.zIndex = '1000';
        this.bottomUIContainer.style.transition = 'all 0.3s ease';
        this.bottomUIContainer.style.boxSizing = 'border-box';
        document.body.appendChild(this.bottomUIContainer);
        
        // Create bottom menu container (positioned above buttons)
        this.bottomMenuContainer = document.createElement('div');
        this.bottomMenuContainer.id = 'bottom-menu-container';
        this.bottomMenuContainer.style.marginBottom = '10px';
        this.bottomMenuContainer.style.display = 'none'; // Hidden by default
        this.bottomMenuContainer.style.width = '250px'; // Set explicit width
        this.bottomMenuContainer.style.boxSizing = 'border-box';
        this.bottomUIContainer.appendChild(this.bottomMenuContainer);
        
        // Create bottom button container
        this.bottomButtonContainer = document.createElement('div');
        this.bottomButtonContainer.id = 'bottom-button-container';
        this.bottomButtonContainer.style.display = 'flex';
        this.bottomButtonContainer.style.flexDirection = 'row';
        this.bottomButtonContainer.style.gap = '10px';
        this.bottomButtonContainer.style.zIndex = '1000';
        this.bottomUIContainer.appendChild(this.bottomButtonContainer);
        
        // Create top UI container
        this.topUIContainer = document.createElement('div');
        this.topUIContainer.id = 'game-ui-top-container';
        this.topUIContainer.style.position = 'absolute';
        this.topUIContainer.style.top = '20px';
        this.topUIContainer.style.right = '20px';
        this.topUIContainer.style.display = 'flex';
        this.topUIContainer.style.flexDirection = 'column';
        this.topUIContainer.style.alignItems = 'flex-end';
        this.topUIContainer.style.zIndex = '1000';
        this.topUIContainer.style.transition = 'all 0.3s ease';
        this.topUIContainer.style.boxSizing = 'border-box';
        document.body.appendChild(this.topUIContainer);
        
        // Create top button container
        this.topButtonContainer = document.createElement('div');
        this.topButtonContainer.id = 'top-button-container';
        this.topButtonContainer.style.display = 'flex';
        this.topButtonContainer.style.flexDirection = 'row';
        this.topButtonContainer.style.gap = '10px';
        this.topButtonContainer.style.zIndex = '1000';
        this.topUIContainer.appendChild(this.topButtonContainer);
        
        // Create top menu container (positioned below buttons)
        this.topMenuContainer = document.createElement('div');
        this.topMenuContainer.id = 'top-menu-container';
        this.topMenuContainer.style.marginTop = '10px';
        this.topMenuContainer.style.display = 'none'; // Hidden by default
        this.topMenuContainer.style.width = '250px'; // Set explicit width
        this.topMenuContainer.style.boxSizing = 'border-box';
        this.topUIContainer.appendChild(this.topMenuContainer);
        
        // Create profile button in top container
        this.createProfileButton();
        
        // Create inventory button in bottom container
        this.createInventoryButton();
        
        // Create map button in bottom container
        this.createMapButton();
        
        // Create menus
        this.createProfileMenu();
        this.createInventoryMenu();
        this.createMapMenu();
        
        // Add event listener for game interactions to close top menus
        document.addEventListener('click', this.handleGameInteraction.bind(this));
        
        // Hide UI initially
        this.hide();
    }
    
    /**
     * Handle game interactions to close top menus
     */
    handleGameInteraction(event) {
        // Check if the click is on the water or island (not on UI elements)
        if (this.activeMenuTop !== null) {
            // Check if the click is outside of the top UI container
            if (!this.topUIContainer.contains(event.target)) {
                // Close the top menu
                this.closeTopMenu();
            }
        }
    }
    
    /**
     * Close the top menu
     */
    closeTopMenu() {
        this.topMenuContainer.style.display = 'none';
        this.activeMenuTop = null;
    }
    
    /**
     * Create profile button with user icon
     */
    createProfileButton() {
        const profileButton = document.createElement('div');
        profileButton.id = 'profile-button';
        profileButton.style.width = '40px';
        profileButton.style.height = '40px';
        profileButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        profileButton.style.color = 'white';
        profileButton.style.display = 'flex';
        profileButton.style.alignItems = 'center';
        profileButton.style.justifyContent = 'center';
        profileButton.style.cursor = 'pointer';
        profileButton.style.borderRadius = '8px';
        profileButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        profileButton.style.transition = 'all 0.2s ease';
        profileButton.style.userSelect = 'none';
        profileButton.style.webkitUserSelect = 'none';
        
        // Use SVG icon for profile
        profileButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>`;
        
        profileButton.title = 'Profile';
        
        // Add hover effect
        profileButton.addEventListener('mouseover', () => {
            profileButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            profileButton.style.transform = 'scale(1.05)';
        });
        
        profileButton.addEventListener('mouseout', () => {
            profileButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            profileButton.style.transform = 'scale(1)';
        });
        
        // Add click handler to toggle profile menu
        profileButton.addEventListener('click', (event) => {
            // Prevent the click from propagating to document
            event.stopPropagation();
            this.toggleTopMenu('profile');
        });
        
        this.topButtonContainer.appendChild(profileButton);
        this.profileButton = profileButton;
    }
    
    /**
     * Create inventory button with backpack icon
     */
    createInventoryButton() {
        const inventoryButton = document.createElement('div');
        inventoryButton.id = 'inventory-button';
        inventoryButton.style.width = '40px';
        inventoryButton.style.height = '40px';
        inventoryButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        inventoryButton.style.color = 'white';
        inventoryButton.style.display = 'flex';
        inventoryButton.style.alignItems = 'center';
        inventoryButton.style.justifyContent = 'center';
        inventoryButton.style.cursor = 'pointer';
        inventoryButton.style.borderRadius = '8px';
        inventoryButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        inventoryButton.style.transition = 'all 0.2s ease';
        inventoryButton.style.userSelect = 'none';
        inventoryButton.style.webkitUserSelect = 'none';
        
        // Use SVG icon for inventory (treasure chest)
        inventoryButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8h18v12H3z"></path>
            <path d="M21 8c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2"></path>
            <path d="M9 8v2"></path>
            <path d="M15 8v2"></path>
            <path d="M3 14h18"></path>
        </svg>`;
        
        inventoryButton.title = 'Inventory';
        
        // Add hover effect
        inventoryButton.addEventListener('mouseover', () => {
            inventoryButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            inventoryButton.style.transform = 'scale(1.05)';
        });
        
        inventoryButton.addEventListener('mouseout', () => {
            inventoryButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            inventoryButton.style.transform = 'scale(1)';
        });
        
        // Add click handler to toggle inventory menu
        inventoryButton.addEventListener('click', (event) => {
            // Prevent the click from propagating to document
            event.stopPropagation();
            this.toggleBottomMenu('inventory');
        });
        
        this.bottomButtonContainer.appendChild(inventoryButton);
        this.inventoryButton = inventoryButton;
    }
    
    /**
     * Create map button with map icon
     */
    createMapButton() {
        const mapButton = document.createElement('div');
        mapButton.id = 'map-button';
        mapButton.style.width = '40px';
        mapButton.style.height = '40px';
        mapButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        mapButton.style.color = 'white';
        mapButton.style.display = 'flex';
        mapButton.style.alignItems = 'center';
        mapButton.style.justifyContent = 'center';
        mapButton.style.cursor = 'pointer';
        mapButton.style.borderRadius = '8px';
        mapButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        mapButton.style.transition = 'all 0.2s ease';
        mapButton.style.userSelect = 'none';
        mapButton.style.webkitUserSelect = 'none';
        
        // Use SVG icon for map - old-style square map with tattered edges
        mapButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3,3 L5,2 L8,4 L10,3 L14,5 L16,4 L19,6 L21,5 L21,19 L19,20 L16,18 L14,19 L10,17 L8,18 L5,16 L3,17 Z"></path>
        </svg>`;
        
        mapButton.title = 'Map';
        
        // Add hover effect
        mapButton.addEventListener('mouseover', () => {
            mapButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            mapButton.style.transform = 'scale(1.05)';
        });
        
        mapButton.addEventListener('mouseout', () => {
            mapButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            mapButton.style.transform = 'scale(1)';
        });
        
        // Add click handler to toggle map menu
        mapButton.addEventListener('click', (event) => {
            // Prevent the click from propagating to document
            event.stopPropagation();
            this.toggleBottomMenu('map');
        });
        
        this.bottomButtonContainer.appendChild(mapButton);
        this.mapButton = mapButton;
    }
    
    /**
     * Create profile menu with username edit and logout
     */
    createProfileMenu() {
        const profileMenu = document.createElement('div');
        profileMenu.id = 'profile-menu';
        profileMenu.className = 'game-menu';
        profileMenu.style.width = '250px';
        profileMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        profileMenu.style.color = 'white';
        profileMenu.style.padding = '15px';
        profileMenu.style.borderRadius = '8px';
        profileMenu.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
        profileMenu.style.display = 'none'; // Hidden by default
        profileMenu.style.boxSizing = 'border-box'; // Add box-sizing to include padding in width calculation
        
        // Menu title
        const title = document.createElement('h3');
        title.textContent = 'Profile';
        title.style.margin = '0 0 15px 0';
        title.style.textAlign = 'center';
        title.style.color = '#3399ff';
        profileMenu.appendChild(title);
        
        // Username section
        const usernameSection = document.createElement('div');
        usernameSection.style.marginBottom = '15px';
        usernameSection.style.width = '100%'; // Ensure section takes full width of parent
        
        const usernameLabel = document.createElement('label');
        usernameLabel.textContent = 'Username:';
        usernameLabel.style.display = 'block';
        usernameLabel.style.marginBottom = '5px';
        usernameSection.appendChild(usernameLabel);
        
        const usernameInput = document.createElement('input');
        usernameInput.id = 'username-input';
        usernameInput.type = 'text';
        usernameInput.style.width = '100%';
        usernameInput.style.padding = '8px';
        usernameInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        usernameInput.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        usernameInput.style.borderRadius = '4px';
        usernameInput.style.color = 'white';
        usernameInput.style.marginBottom = '10px';
        usernameInput.style.boxSizing = 'border-box'; // Add box-sizing to include padding in width calculation
        usernameSection.appendChild(usernameInput);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Username';
        saveButton.style.padding = '8px 12px';
        saveButton.style.backgroundColor = '#3399ff';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.width = '100%';
        saveButton.style.boxSizing = 'border-box'; // Add box-sizing to include padding in width calculation
        
        // Add hover effect
        saveButton.addEventListener('mouseover', () => {
            saveButton.style.backgroundColor = '#2288ee';
        });
        
        saveButton.addEventListener('mouseout', () => {
            saveButton.style.backgroundColor = '#3399ff';
        });
        
        // Add click handler to save username
        saveButton.addEventListener('click', (event) => {
            // Prevent the click from propagating to document
            event.stopPropagation();
            const newUsername = usernameInput.value.trim();
            if (newUsername) {
                this.saveUsername(newUsername);
            }
        });
        
        usernameSection.appendChild(saveButton);
        profileMenu.appendChild(usernameSection);
        
        // Divider
        const divider = document.createElement('div');
        divider.style.height = '1px';
        divider.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        divider.style.margin = '15px 0';
        profileMenu.appendChild(divider);
        
        // Main Menu button
        const mainMenuButton = document.createElement('button');
        mainMenuButton.textContent = 'Main Menu';
        mainMenuButton.style.padding = '8px 12px';
        mainMenuButton.style.backgroundColor = '#3399ff';
        mainMenuButton.style.color = 'white';
        mainMenuButton.style.border = 'none';
        mainMenuButton.style.borderRadius = '4px';
        mainMenuButton.style.cursor = 'pointer';
        mainMenuButton.style.width = '100%';
        mainMenuButton.style.marginBottom = '10px';
        mainMenuButton.style.boxSizing = 'border-box';
        
        // Add hover effect
        mainMenuButton.addEventListener('mouseover', () => {
            mainMenuButton.style.backgroundColor = '#2288ee';
        });
        
        mainMenuButton.addEventListener('mouseout', () => {
            mainMenuButton.style.backgroundColor = '#3399ff';
        });
        
        // Add click handler to return to main menu
        mainMenuButton.addEventListener('click', (event) => {
            // Prevent the click from propagating to document
            event.stopPropagation();
            
            // Close the profile menu
            this.closeTopMenu();
            
            // Hide the game UI
            this.hide();
            
            // Show the main menu
            document.getElementById('mainMenu').style.display = 'flex';
            
            // Reset the game state but keep the user authenticated
            // We'll use a custom event to trigger the reset in main.js
            const resetEvent = new CustomEvent('resetToMainMenu', {
                detail: { keepAuthenticated: true }
            });
            document.dispatchEvent(resetEvent);
        });
        
        profileMenu.appendChild(mainMenuButton);
        
        // Logout button
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.style.padding = '8px 12px';
        logoutButton.style.backgroundColor = '#f44336';
        logoutButton.style.color = 'white';
        logoutButton.style.border = 'none';
        logoutButton.style.borderRadius = '4px';
        logoutButton.style.cursor = 'pointer';
        logoutButton.style.width = '100%';
        logoutButton.style.boxSizing = 'border-box'; // Add box-sizing to include padding in width calculation
        
        // Add hover effect
        logoutButton.addEventListener('mouseover', () => {
            logoutButton.style.backgroundColor = '#d32f2f';
        });
        
        logoutButton.addEventListener('mouseout', () => {
            logoutButton.style.backgroundColor = '#f44336';
        });
        
        // Add click handler to logout
        logoutButton.addEventListener('click', (event) => {
            // Prevent the click from propagating to document
            event.stopPropagation();
            this.logout();
        });
        
        profileMenu.appendChild(logoutButton);
        
        // Add click handler to prevent clicks from closing the menu
        profileMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        this.topMenuContainer.appendChild(profileMenu);
        this.profileMenu = profileMenu;
    }
    
    /**
     * Create inventory menu (currently empty)
     */
    createInventoryMenu() {
        const inventoryMenu = document.createElement('div');
        inventoryMenu.id = 'inventory-menu';
        inventoryMenu.className = 'game-menu';
        inventoryMenu.style.width = '250px';
        inventoryMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        inventoryMenu.style.color = 'white';
        inventoryMenu.style.padding = '15px';
        inventoryMenu.style.borderRadius = '8px';
        inventoryMenu.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
        inventoryMenu.style.display = 'none'; // Hidden by default
        inventoryMenu.style.boxSizing = 'border-box'; // Add box-sizing to include padding in width calculation
        
        // Menu title
        const title = document.createElement('h3');
        title.textContent = 'Inventory';
        title.style.margin = '0 0 15px 0';
        title.style.textAlign = 'center';
        title.style.color = '#3399ff';
        inventoryMenu.appendChild(title);
        
        // Empty inventory message
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Your inventory is empty.';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = 'rgba(255, 255, 255, 0.7)';
        emptyMessage.style.fontStyle = 'italic';
        inventoryMenu.appendChild(emptyMessage);
        
        // Add click handler to prevent clicks from closing the menu
        inventoryMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        this.bottomMenuContainer.appendChild(inventoryMenu);
        this.inventoryMenu = inventoryMenu;
    }
    
    /**
     * Create map menu (currently empty)
     */
    createMapMenu() {
        const mapMenu = document.createElement('div');
        mapMenu.id = 'map-menu';
        mapMenu.className = 'game-menu';
        mapMenu.style.width = '250px';
        mapMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        mapMenu.style.color = 'white';
        mapMenu.style.padding = '15px';
        mapMenu.style.borderRadius = '8px';
        mapMenu.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
        mapMenu.style.display = 'none'; // Hidden by default
        mapMenu.style.boxSizing = 'border-box'; // Add box-sizing to include padding in width calculation
        
        // Menu title
        const title = document.createElement('h3');
        title.textContent = 'Map';
        title.style.margin = '0 0 15px 0';
        title.style.textAlign = 'center';
        title.style.color = '#3399ff';
        mapMenu.appendChild(title);
        
        // Empty map message
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = "You don't have any map.";
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = 'rgba(255, 255, 255, 0.7)';
        emptyMessage.style.fontStyle = 'italic';
        mapMenu.appendChild(emptyMessage);
        
        // Add click handler to prevent clicks from closing the menu
        mapMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        this.bottomMenuContainer.appendChild(mapMenu);
        this.mapMenu = mapMenu;
    }
    
    /**
     * Toggle menu visibility in the top container
     * @param {string} menuType - Type of menu to toggle ('profile')
     */
    toggleTopMenu(menuType) {
        // Hide all top menus first
        this.profileMenu.style.display = 'none';
        
        // If we're toggling the currently active menu, just close it
        if (this.activeMenuTop === menuType) {
            this.topMenuContainer.style.display = 'none';
            this.activeMenuTop = null;
            return;
        }
        
        // Otherwise, show the selected menu
        this.topMenuContainer.style.display = 'block';
        
        if (menuType === 'profile') {
            this.profileMenu.style.display = 'block';
            // Load current username if available
            this.loadUsername();
        }
        
        this.activeMenuTop = menuType;
    }
    
    /**
     * Toggle menu visibility in the bottom container
     * @param {string} menuType - Type of menu to toggle ('inventory' or 'map')
     */
    toggleBottomMenu(menuType) {
        // Hide all bottom menus first
        this.inventoryMenu.style.display = 'none';
        this.mapMenu.style.display = 'none';
        
        // If we're toggling the currently active menu, just close it
        if (this.activeMenuBottom === menuType) {
            this.bottomMenuContainer.style.display = 'none';
            this.activeMenuBottom = null;
            return;
        }
        
        // Otherwise, show the selected menu
        this.bottomMenuContainer.style.display = 'block';
        
        if (menuType === 'inventory') {
            this.inventoryMenu.style.display = 'block';
        } else if (menuType === 'map') {
            this.mapMenu.style.display = 'block';
        }
        
        this.activeMenuBottom = menuType;
    }
    
    /**
     * Load username from Firebase and update input field
     */
    loadUsername() {
        const usernameInput = document.getElementById('username-input');
        if (!usernameInput) return;
        
        // If we have access to Firebase auth and the user is logged in
        if (this.auth && this.auth.getCurrentUser()) {
            // Get the display name or email as fallback
            const user = this.auth.getCurrentUser();
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
        // If we have access to Firebase auth and the user is logged in
        if (this.auth && this.auth.getCurrentUser()) {
            const user = this.auth.getCurrentUser();
            
            // Update profile in Firebase
            user.updateProfile({
                displayName: username
            }).then(() => {
                console.log('Username updated successfully');
                // Show success message
                this.showNotification('Username updated successfully!', 'success');
            }).catch(error => {
                console.error('Error updating username:', error);
                // Show error message
                this.showNotification('Failed to update username. Please try again.', 'error');
            });
        } else {
            console.warn('User not logged in, cannot save username');
            this.showNotification('You must be logged in to save your username.', 'error');
        }
    }
    
    /**
     * Logout user from Firebase
     */
    logout() {
        // If we have access to Firebase auth
        if (this.auth) {
            // Call the onLogout callback if provided (to set player offline)
            if (this.onLogout && typeof this.onLogout === 'function') {
                this.onLogout();
            }
            
            // Wait a moment for the offline status to be set before signing out
            setTimeout(() => {
                this.auth.signOut().then(() => {
                    console.log('User signed out successfully');
                }).catch(error => {
                    console.error('Error signing out:', error);
                    this.showNotification('Failed to log out. Please try again.', 'error');
                });
            }, 500); // 500ms delay to ensure the offline status is set
        }
    }
    
    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {string} type - Type of notification ('success', 'error', 'info')
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '80px';
        notification.style.right = '20px';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.zIndex = '2000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        
        // Set background color based on type
        if (type === 'success') {
            notification.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
        } else if (type === 'error') {
            notification.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
        } else {
            notification.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
        }
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    /**
     * Show the UI
     */
    show() {
        this.bottomUIContainer.style.display = 'flex';
        this.topUIContainer.style.display = 'flex';
        this.isVisible = true;
    }
    
    /**
     * Hide the UI
     */
    hide() {
        this.bottomUIContainer.style.display = 'none';
        this.topUIContainer.style.display = 'none';
        this.isVisible = false;
        // Also close any open menus
        this.bottomMenuContainer.style.display = 'none';
        this.topMenuContainer.style.display = 'none';
        this.activeMenuBottom = null;
        this.activeMenuTop = null;
    }
    
    /**
     * Update the UI
     */
    update() {
        // Update any dynamic UI elements here
        // For now, we don't have any elements that need constant updating
    }
}

export default GameUI; 