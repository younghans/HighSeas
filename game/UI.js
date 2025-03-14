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
        this.activeMenu = null;
        
        // UI elements
        this.uiContainer = null;
        this.buttonContainer = null;
        this.menuContainer = null;
        
        // Button references
        this.profileButton = null;
        this.inventoryButton = null;
        
        // Menu references
        this.profileMenu = null;
        this.inventoryMenu = null;
        
        // Initialize UI
        this.init();
    }
    
    /**
     * Initialize UI elements
     */
    init() {
        // Create main UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'game-ui-container';
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.bottom = '20px';
        this.uiContainer.style.right = '20px';
        this.uiContainer.style.display = 'flex';
        this.uiContainer.style.flexDirection = 'column';
        this.uiContainer.style.alignItems = 'flex-end';
        this.uiContainer.style.zIndex = '1000';
        this.uiContainer.style.transition = 'all 0.3s ease';
        this.uiContainer.style.boxSizing = 'border-box'; // Add box-sizing
        document.body.appendChild(this.uiContainer);
        
        // Create menu container (positioned above buttons)
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'menu-container';
        this.menuContainer.style.marginBottom = '10px';
        this.menuContainer.style.display = 'none'; // Hidden by default
        this.menuContainer.style.width = '250px'; // Set explicit width
        this.menuContainer.style.boxSizing = 'border-box'; // Add box-sizing
        this.uiContainer.appendChild(this.menuContainer);
        
        // Create button container
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.id = 'button-container';
        this.buttonContainer.style.display = 'flex';
        this.buttonContainer.style.flexDirection = 'row';
        this.buttonContainer.style.gap = '10px';
        this.buttonContainer.style.zIndex = '1000';
        this.uiContainer.appendChild(this.buttonContainer);
        
        // Create profile button
        this.createProfileButton();
        
        // Create inventory button
        this.createInventoryButton();
        
        // Create menus
        this.createProfileMenu();
        this.createInventoryMenu();
        
        // Hide UI initially
        this.hide();
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
        profileButton.addEventListener('click', () => {
            this.toggleMenu('profile');
        });
        
        this.buttonContainer.appendChild(profileButton);
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
        inventoryButton.addEventListener('click', () => {
            this.toggleMenu('inventory');
        });
        
        this.buttonContainer.appendChild(inventoryButton);
        this.inventoryButton = inventoryButton;
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
        saveButton.addEventListener('click', () => {
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
        logoutButton.addEventListener('click', () => {
            this.logout();
        });
        
        profileMenu.appendChild(logoutButton);
        
        this.menuContainer.appendChild(profileMenu);
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
        
        this.menuContainer.appendChild(inventoryMenu);
        this.inventoryMenu = inventoryMenu;
    }
    
    /**
     * Toggle menu visibility
     * @param {string} menuType - Type of menu to toggle ('profile' or 'inventory')
     */
    toggleMenu(menuType) {
        // Hide all menus first
        this.profileMenu.style.display = 'none';
        this.inventoryMenu.style.display = 'none';
        
        // If we're toggling the currently active menu, just close it
        if (this.activeMenu === menuType) {
            this.menuContainer.style.display = 'none';
            this.activeMenu = null;
            return;
        }
        
        // Otherwise, show the selected menu
        this.menuContainer.style.display = 'block';
        
        if (menuType === 'profile') {
            this.profileMenu.style.display = 'block';
            // Load current username if available
            this.loadUsername();
        } else if (menuType === 'inventory') {
            this.inventoryMenu.style.display = 'block';
        }
        
        this.activeMenu = menuType;
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
            this.auth.signOut().then(() => {
                console.log('User signed out successfully');
                // Call the onLogout callback if provided
                if (this.onLogout && typeof this.onLogout === 'function') {
                    this.onLogout();
                }
            }).catch(error => {
                console.error('Error signing out:', error);
                this.showNotification('Failed to log out. Please try again.', 'error');
            });
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
        this.uiContainer.style.display = 'flex';
        this.isVisible = true;
    }
    
    /**
     * Hide the UI
     */
    hide() {
        this.uiContainer.style.display = 'none';
        this.isVisible = false;
        // Also close any open menus
        this.menuContainer.style.display = 'none';
        this.activeMenu = null;
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