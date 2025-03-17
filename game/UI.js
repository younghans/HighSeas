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
        this.playerShip = options.playerShip || null;
        
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
        
        // Combat UI elements
        this.healthBarContainer = null;
        this.healthBarFill = null;
        this.healthText = null;
        this.targetInfoContainer = null;
        this.targetHealthBar = null;
        this.targetHealthText = null;
        this.currentTarget = null;
        
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
        
        // Create health bar container (positioned at the bottom left)
        this.createHealthBar();
        
        // Create target info container (positioned at the top center)
        this.createTargetInfo();
        
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
     * Create health bar for player ship
     */
    createHealthBar() {
        // Create health bar container
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.id = 'health-bar-container';
        this.healthBarContainer.style.position = 'absolute';
        this.healthBarContainer.style.bottom = '20px';
        this.healthBarContainer.style.left = '20px';
        this.healthBarContainer.style.width = '200px';
        this.healthBarContainer.style.height = '30px';
        this.healthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.healthBarContainer.style.borderRadius = '5px';
        this.healthBarContainer.style.padding = '5px';
        this.healthBarContainer.style.boxSizing = 'border-box';
        this.healthBarContainer.style.zIndex = '1000';
        document.body.appendChild(this.healthBarContainer);
        
        // Create health bar label
        const healthLabel = document.createElement('div');
        healthLabel.textContent = 'SHIP HEALTH';
        healthLabel.style.color = 'white';
        healthLabel.style.fontSize = '10px';
        healthLabel.style.fontWeight = 'bold';
        healthLabel.style.marginBottom = '2px';
        healthLabel.style.textAlign = 'center';
        this.healthBarContainer.appendChild(healthLabel);
        
        // Create health bar background
        const healthBarBg = document.createElement('div');
        healthBarBg.style.width = '100%';
        healthBarBg.style.height = '12px';
        healthBarBg.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        healthBarBg.style.borderRadius = '3px';
        healthBarBg.style.overflow = 'hidden';
        this.healthBarContainer.appendChild(healthBarBg);
        
        // Create health bar fill
        this.healthBarFill = document.createElement('div');
        this.healthBarFill.style.width = '100%';
        this.healthBarFill.style.height = '100%';
        this.healthBarFill.style.backgroundColor = '#4CAF50'; // Green
        this.healthBarFill.style.transition = 'width 0.3s ease';
        healthBarBg.appendChild(this.healthBarFill);
        
        // Create health text
        this.healthText = document.createElement('div');
        this.healthText.textContent = '100/100';
        this.healthText.style.color = 'white';
        this.healthText.style.fontSize = '10px';
        this.healthText.style.textAlign = 'center';
        this.healthText.style.marginTop = '2px';
        this.healthBarContainer.appendChild(this.healthText);
    }
    
    /**
     * Create target info display
     */
    createTargetInfo() {
        // Create target info container
        this.targetInfoContainer = document.createElement('div');
        this.targetInfoContainer.id = 'target-info-container';
        this.targetInfoContainer.style.position = 'absolute';
        this.targetInfoContainer.style.top = '20px';
        this.targetInfoContainer.style.left = '50%';
        this.targetInfoContainer.style.transform = 'translateX(-50%)';
        this.targetInfoContainer.style.width = '250px';
        this.targetInfoContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.targetInfoContainer.style.borderRadius = '5px';
        this.targetInfoContainer.style.padding = '10px';
        this.targetInfoContainer.style.boxSizing = 'border-box';
        this.targetInfoContainer.style.zIndex = '1000';
        this.targetInfoContainer.style.display = 'none'; // Hidden by default
        document.body.appendChild(this.targetInfoContainer);
        
        // Create target label
        const targetLabel = document.createElement('div');
        targetLabel.textContent = 'TARGET: ENEMY SHIP';
        targetLabel.style.color = 'white';
        targetLabel.style.fontSize = '12px';
        targetLabel.style.fontWeight = 'bold';
        targetLabel.style.marginBottom = '5px';
        targetLabel.style.textAlign = 'center';
        this.targetInfoContainer.appendChild(targetLabel);
        
        // Create target health bar background
        const targetHealthBarBg = document.createElement('div');
        targetHealthBarBg.style.width = '100%';
        targetHealthBarBg.style.height = '15px';
        targetHealthBarBg.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        targetHealthBarBg.style.borderRadius = '3px';
        targetHealthBarBg.style.overflow = 'hidden';
        this.targetInfoContainer.appendChild(targetHealthBarBg);
        
        // Create target health bar fill
        this.targetHealthBar = document.createElement('div');
        this.targetHealthBar.style.width = '100%';
        this.targetHealthBar.style.height = '100%';
        this.targetHealthBar.style.backgroundColor = '#F44336'; // Red
        this.targetHealthBar.style.transition = 'width 0.3s ease';
        targetHealthBarBg.appendChild(this.targetHealthBar);
        
        // Create target health text
        this.targetHealthText = document.createElement('div');
        this.targetHealthText.textContent = '100/100';
        this.targetHealthText.style.color = 'white';
        this.targetHealthText.style.fontSize = '10px';
        this.targetHealthText.style.textAlign = 'center';
        this.targetHealthText.style.marginTop = '5px';
        this.targetInfoContainer.appendChild(this.targetHealthText);
        
        // Create distance text
        this.targetDistanceText = document.createElement('div');
        this.targetDistanceText.textContent = 'Distance: 0m';
        this.targetDistanceText.style.color = 'white';
        this.targetDistanceText.style.fontSize = '10px';
        this.targetDistanceText.style.textAlign = 'center';
        this.targetDistanceText.style.marginTop = '5px';
        this.targetInfoContainer.appendChild(this.targetDistanceText);
        
        // Create in range indicator
        this.targetRangeIndicator = document.createElement('div');
        this.targetRangeIndicator.textContent = 'OUT OF RANGE';
        this.targetRangeIndicator.style.color = '#F44336'; // Red
        this.targetRangeIndicator.style.fontSize = '12px';
        this.targetRangeIndicator.style.fontWeight = 'bold';
        this.targetRangeIndicator.style.textAlign = 'center';
        this.targetRangeIndicator.style.marginTop = '5px';
        this.targetInfoContainer.appendChild(this.targetRangeIndicator);
    }
    
    /**
     * Set the current target ship
     * @param {BaseShip} targetShip - The target ship
     */
    setTarget(targetShip) {
        this.currentTarget = targetShip;
        
        if (targetShip) {
            // Show target info
            this.targetInfoContainer.style.display = 'block';
            
            // Update target health
            this.updateTargetHealth();
        } else {
            // Hide target info
            this.targetInfoContainer.style.display = 'none';
        }
    }
    
    /**
     * Update target health display
     */
    updateTargetHealth() {
        if (!this.currentTarget) return;
        
        // Update health bar
        const healthPercent = this.currentTarget.getHealthPercentage();
        this.targetHealthBar.style.width = `${healthPercent}%`;
        
        // Update health text
        this.targetHealthText.textContent = `${Math.ceil(this.currentTarget.currentHealth)}/${this.currentTarget.maxHealth}`;
        
        // Update color based on health
        if (healthPercent > 60) {
            this.targetHealthBar.style.backgroundColor = '#F44336'; // Red
        } else if (healthPercent > 30) {
            this.targetHealthBar.style.backgroundColor = '#FF9800'; // Orange
        } else {
            this.targetHealthBar.style.backgroundColor = '#FFEB3B'; // Yellow
        }
        
        // Update distance if player ship is available
        if (this.playerShip) {
            const distance = Math.round(this.playerShip.getPosition().distanceTo(this.currentTarget.getPosition()));
            this.targetDistanceText.textContent = `Distance: ${distance}m`;
            
            // Update range indicator
            if (distance <= this.playerShip.cannonRange) {
                this.targetRangeIndicator.textContent = 'IN RANGE';
                this.targetRangeIndicator.style.color = '#4CAF50'; // Green
            } else {
                this.targetRangeIndicator.textContent = 'OUT OF RANGE';
                this.targetRangeIndicator.style.color = '#F44336'; // Red
            }
        }
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
     * @param {string} message - The message to show
     * @param {number|string} duration - How long to show the message in milliseconds, or notification type
     * @param {string} type - Notification type: 'success', 'warning', 'error', or null for default
     */
    showNotification(message, duration = 3000, type = null) {
        // Handle case where duration is actually the type (for backward compatibility)
        if (typeof duration === 'string') {
            type = duration;
            duration = 3000;
        }
        
        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notificationContainer');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.position = 'absolute';
            notificationContainer.style.top = '100px';
            notificationContainer.style.left = '50%';
            notificationContainer.style.transform = 'translateX(-50%)';
            notificationContainer.style.zIndex = '1000';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        // Set background color based on type
        let bgColor = 'rgba(0, 0, 0, 0.7)'; // Default
        if (type === 'success') {
            bgColor = 'rgba(76, 175, 80, 0.9)'; // Green
        } else if (type === 'warning') {
            bgColor = 'rgba(255, 152, 0, 0.9)'; // Orange
        } else if (type === 'error') {
            bgColor = 'rgba(244, 67, 54, 0.9)'; // Red
        }
        
        notification.style.backgroundColor = bgColor;
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.marginBottom = '10px';
        notification.style.textAlign = 'center';
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        notification.style.fontWeight = 'bold';
        notification.style.fontSize = '16px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        notification.textContent = message;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notificationContainer.removeChild(notification);
            }, 500);
        }, duration);
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
        // Update health bar if player ship is available
        if (this.playerShip) {
            const healthPercent = this.playerShip.getHealthPercentage();
            this.healthBarFill.style.width = `${healthPercent}%`;
            this.healthText.textContent = `${Math.ceil(this.playerShip.currentHealth)}/${this.playerShip.maxHealth}`;
            
            // Update color based on health
            if (healthPercent > 60) {
                this.healthBarFill.style.backgroundColor = '#4CAF50'; // Green
            } else if (healthPercent > 30) {
                this.healthBarFill.style.backgroundColor = '#FF9800'; // Orange
            } else {
                this.healthBarFill.style.backgroundColor = '#F44336'; // Red
            }
        }
        
        // Update target info if there is a current target
        if (this.currentTarget) {
            this.updateTargetHealth();
            
            // If target is sunk, clear target
            if (this.currentTarget.isSunk) {
                this.setTarget(null);
            }
        }
    }
    
    /**
     * Set the player ship reference
     * @param {BaseShip} playerShip - The player's ship
     */
    setPlayerShip(playerShip) {
        this.playerShip = playerShip;
    }
}

export default GameUI; 