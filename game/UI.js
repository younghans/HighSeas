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
        this.combatManager = options.combatManager || null;
        
        // Initialize ChatManager
        this.chatManager = new ChatManager();
        
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
        this.goldButton = null;
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
        
        // Cannon cooldown UI elements
        this.cannonCooldownContainer = null;
        this.cannonCooldownCircle = null;
        this.cannonCooldownFill = null;
        this.cannonCooldownStatus = null;
        this.cooldownStartTime = 0;
        this.isCoolingDown = false;
        
        // Initialize UI
        this.init();
    }
    
    /**
     * Initialize UI elements
     */
    init() {
        // Create bottom-left UI container
        this.bottomLeftUIContainer = document.createElement('div');
        this.bottomLeftUIContainer.id = 'game-ui-bottom-left-container';
        this.bottomLeftUIContainer.style.position = 'absolute';
        this.bottomLeftUIContainer.style.bottom = '20px';
        this.bottomLeftUIContainer.style.left = '20px';
        this.bottomLeftUIContainer.style.display = 'flex';
        this.bottomLeftUIContainer.style.flexDirection = 'column';
        this.bottomLeftUIContainer.style.alignItems = 'flex-start';
        this.bottomLeftUIContainer.style.zIndex = '1000';
        this.bottomLeftUIContainer.style.transition = 'all 0.3s ease';
        this.bottomLeftUIContainer.style.boxSizing = 'border-box';
        this.bottomLeftUIContainer.style.touchAction = 'none';
        document.body.appendChild(this.bottomLeftUIContainer);

        // Create chat button
        this.createChatButton();

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
        this.bottomUIContainer.style.touchAction = 'none';
        document.body.appendChild(this.bottomUIContainer);
        
        // Create bottom menu container (positioned above buttons)
        this.bottomMenuContainer = document.createElement('div');
        this.bottomMenuContainer.id = 'bottom-menu-container';
        this.bottomMenuContainer.style.marginBottom = '10px';
        this.bottomMenuContainer.style.display = 'none'; // Hidden by default
        this.bottomMenuContainer.style.width = '250px'; // Set explicit width
        this.bottomMenuContainer.style.boxSizing = 'border-box';
        this.bottomMenuContainer.style.touchAction = 'none';
        this.bottomUIContainer.appendChild(this.bottomMenuContainer);
        
        // Create bottom button container
        this.bottomButtonContainer = document.createElement('div');
        this.bottomButtonContainer.id = 'bottom-button-container';
        this.bottomButtonContainer.style.display = 'flex';
        this.bottomButtonContainer.style.flexDirection = 'row';
        this.bottomButtonContainer.style.gap = '10px';
        this.bottomButtonContainer.style.zIndex = '1000';
        this.bottomButtonContainer.style.touchAction = 'none';
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
        this.topUIContainer.style.touchAction = 'none';
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
        
        // Create cannon cooldown indicator
        this.createCannonCooldownIndicator();
        
        // Create target info container (positioned at the top center)
        this.createTargetInfo();
        
        // Create profile button in top container
        this.createProfileButton();
        
        // Create gold button in bottom container (moved before inventory)
        this.createGoldButton();
        
        // Create inventory button in bottom container
        this.createInventoryButton();
        
        // Create map button in bottom container
        this.createMapButton();
        
        // Create menus
        this.createProfileMenu();
        this.createInventoryMenu();
        this.createGoldMenu();
        this.createMapMenu();
        
        // Add event listener for game interactions to close top menus
        document.addEventListener('click', this.handleGameInteraction.bind(this));
        
        // Add event listener for gold updates
        document.addEventListener('playerGoldUpdated', (event) => {
            // Load the updated gold amount
            this.loadGoldAmount();
        });
        
        // Create chat interface
        this.createChatInterface();
        
        // Add keyboard event listener for chat toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.repeat && this.isVisible) {
                // Only toggle if not currently typing in chat input
                if (!document.activeElement || document.activeElement.id !== 'chat-input') {
                    this.toggleChat();
                }
            }
        });
        
        // Hide UI initially
        this.hide();
    }
    
    /**
     * Create target info display
     */
    createTargetInfo() {
        // Create target info container
        this.targetInfoContainer = document.createElement('div');
        this.targetInfoContainer.id = 'target-info-container';
        this.targetInfoContainer.style.position = 'absolute';
        this.targetInfoContainer.style.bottom = '20px';
        this.targetInfoContainer.style.left = '50%';
        this.targetInfoContainer.style.transform = 'translateX(-50%)';
        this.targetInfoContainer.style.width = '250px';
        this.targetInfoContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.targetInfoContainer.style.borderRadius = '5px';
        this.targetInfoContainer.style.padding = '10px';
        this.targetInfoContainer.style.boxSizing = 'border-box';
        this.targetInfoContainer.style.zIndex = '1000';
        this.targetInfoContainer.style.display = 'none'; // Hidden by default
        this.targetInfoContainer.style.touchAction = 'none';
        document.body.appendChild(this.targetInfoContainer);
        
        // Create target label
        const targetLabel = document.createElement('div');
        targetLabel.textContent = 'TARGET: ENEMY SHIP';
        targetLabel.style.color = 'white';
        targetLabel.style.fontSize = '12px';
        targetLabel.style.fontWeight = 'bold';
        targetLabel.style.marginBottom = '5px';
        targetLabel.style.textAlign = 'center';
        targetLabel.style.touchAction = 'none';
        this.targetInfoContainer.appendChild(targetLabel);
        
        // Create distance text
        this.targetDistanceText = document.createElement('div');
        this.targetDistanceText.textContent = 'Distance: 0m';
        this.targetDistanceText.style.color = 'white';
        this.targetDistanceText.style.fontSize = '10px';
        this.targetDistanceText.style.textAlign = 'center';
        this.targetDistanceText.style.marginTop = '5px';
        this.targetDistanceText.style.touchAction = 'none';
        this.targetInfoContainer.appendChild(this.targetDistanceText);
        
        // Create in range indicator
        this.targetRangeIndicator = document.createElement('div');
        this.targetRangeIndicator.textContent = 'OUT OF RANGE';
        this.targetRangeIndicator.style.color = '#F44336'; // Red
        this.targetRangeIndicator.style.fontSize = '12px';
        this.targetRangeIndicator.style.fontWeight = 'bold';
        this.targetRangeIndicator.style.textAlign = 'center';
        this.targetRangeIndicator.style.marginTop = '5px';
        this.targetRangeIndicator.style.touchAction = 'none';
        this.targetInfoContainer.appendChild(this.targetRangeIndicator);
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.marginTop = '10px';
        buttonsContainer.style.width = '100%';
        this.targetInfoContainer.appendChild(buttonsContainer);
        
        // Create fire button
        const fireButton = document.createElement('button');
        fireButton.textContent = 'FIRE';
        fireButton.style.flex = '1';
        fireButton.style.padding = '8px 0';
        fireButton.style.backgroundColor = '#F44336'; // Red
        fireButton.style.color = 'white';
        fireButton.style.border = 'none';
        fireButton.style.borderRadius = '4px';
        fireButton.style.fontWeight = 'bold';
        fireButton.style.cursor = 'pointer';
        fireButton.style.marginRight = '5px';
        fireButton.style.transition = 'background-color 0.2s';
        fireButton.style.touchAction = 'none';
        
        // Add hover effect
        fireButton.addEventListener('mouseover', () => {
            fireButton.style.backgroundColor = '#D32F2F';
        });
        fireButton.addEventListener('mouseout', () => {
            fireButton.style.backgroundColor = '#F44336';
        });
        
        // Add click event
        fireButton.addEventListener('click', (event) => {
            event.stopPropagation();
            
            // Simulate spacebar press (keydown)
            const spaceDownEvent = new KeyboardEvent('keydown', {
                code: 'Space',
                key: ' ',
                keyCode: 32,
                which: 32,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(spaceDownEvent);
            
            // Simulate spacebar release (keyup) after a short delay
            setTimeout(() => {
                const spaceUpEvent = new KeyboardEvent('keyup', {
                    code: 'Space',
                    key: ' ',
                    keyCode: 32,
                    which: 32,
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(spaceUpEvent);
            }, 50); // 50ms delay, enough to trigger the firing but stop auto-fire
        });
        buttonsContainer.appendChild(fireButton);
        
        // Create disengage button
        const disengageButton = document.createElement('button');
        disengageButton.textContent = 'DISENGAGE';
        disengageButton.style.flex = '1';
        disengageButton.style.padding = '8px 0';
        disengageButton.style.backgroundColor = '#2196F3'; // Blue
        disengageButton.style.color = 'white';
        disengageButton.style.border = 'none';
        disengageButton.style.borderRadius = '4px';
        disengageButton.style.fontWeight = 'bold';
        disengageButton.style.cursor = 'pointer';
        disengageButton.style.marginLeft = '5px';
        disengageButton.style.transition = 'background-color 0.2s';
        disengageButton.style.touchAction = 'none';
        
        // Add hover effect
        disengageButton.addEventListener('mouseover', () => {
            disengageButton.style.backgroundColor = '#1976D2';
        });
        disengageButton.addEventListener('mouseout', () => {
            disengageButton.style.backgroundColor = '#2196F3';
        });
        
        // Add click event
        disengageButton.addEventListener('click', (event) => {
            event.stopPropagation();
            
            // Clear target in the CombatManager if available (cleans up debug arrows)
            if (this.combatManager) {
                this.combatManager.setTarget(null);
            } else {
                // Fallback if CombatManager reference is not available
                this.setTarget(null);
            }
        });
        buttonsContainer.appendChild(disengageButton);
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
            
            // Show cannon cooldown indicator when target is set
            if (this.cannonCooldownContainer) {
                this.cannonCooldownContainer.style.display = 'flex';
                
                // When setting a new target, update the cooldown indicator to show the current state
                if (this.playerShip && this.cannonCooldownFill) {
                    if (this.playerShip.canFire()) {
                        // If we can fire, show green
                        this.cannonCooldownFill.setAttribute('stroke-dashoffset', '0');
                        this.cannonCooldownFill.setAttribute('stroke', '#4CAF50'); // Green
                        this.isCoolingDown = false;
                    } else {
                        // If we can't fire, start the cooldown animation
                        this.startCooldown();
                    }
                }
            }
            
            // Update target distance and range status
            this.updateTargetInfo();
        } else {
            // Hide target info
            this.targetInfoContainer.style.display = 'none';
            
            // Hide cannon cooldown indicator when no target
            if (this.cannonCooldownContainer) {
                this.cannonCooldownContainer.style.display = 'none';
            }
        }
    }
    
    /**
     * Update target information display
     */
    updateTargetInfo() {
        if (!this.currentTarget) return;
        
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
        
        // Check if target is sunk
        if (this.currentTarget.isSunk) {
            this.setTarget(null);
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
        profileButton.style.touchAction = 'none';
        
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
     * Create gold button with coin icon and gold amount
     */
    createGoldButton() {
        const goldButton = document.createElement('div');
        goldButton.id = 'gold-button';
        goldButton.style.width = 'auto';
        goldButton.style.height = '40px';
        goldButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        goldButton.style.color = 'white';
        goldButton.style.display = 'flex';
        goldButton.style.alignItems = 'center';
        goldButton.style.justifyContent = 'center';
        goldButton.style.cursor = 'pointer';
        goldButton.style.borderRadius = '8px';
        goldButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        goldButton.style.transition = 'all 0.2s ease';
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
        
        // Use SVG icon for gold coins (stack of coins)
        iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="20" viewBox="0 0 24 16" fill="#FFD700" stroke="#E6B800" stroke-width="1">
            <circle cx="9" cy="8" r="7"></circle>
            <circle cx="15" cy="8" r="7"></circle>
        </svg>`;
        
        // Create gold amount text
        const goldText = document.createElement('span');
        goldText.id = 'gold-amount';
        goldText.textContent = '0';
        goldText.style.fontSize = '14px';
        goldText.style.fontWeight = 'bold';
        goldText.style.color = '#FFD700';
        goldText.style.touchAction = 'none';
        
        // Add icon and text to button
        goldButton.appendChild(iconContainer);
        goldButton.appendChild(goldText);
        
        goldButton.title = 'Gold';
        
        // Add hover effect
        goldButton.addEventListener('mouseover', () => {
            goldButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            goldButton.style.transform = 'scale(1.05)';
        });
        
        goldButton.addEventListener('mouseout', () => {
            goldButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            goldButton.style.transform = 'scale(1)';
        });
        
        // Add click handler to toggle gold menu
        goldButton.addEventListener('click', (event) => {
            // Prevent the click from propagating to document
            event.stopPropagation();
            this.toggleBottomMenu('gold');
        });
        
        this.bottomButtonContainer.appendChild(goldButton);
        this.goldButton = goldButton;
        
        // Load initial gold amount
        this.loadGoldAmount();
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
        inventoryButton.style.touchAction = 'none';
        
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
        mapButton.style.touchAction = 'none';
        
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
        profileMenu.style.boxSizing = 'border-box';
        profileMenu.style.touchAction = 'none';
        
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
        usernameInput.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        usernameInput.style.borderRadius = '4px';
        usernameInput.style.color = 'white';
        usernameInput.style.marginBottom = '10px';
        usernameInput.style.boxSizing = 'border-box';
        usernameInput.style.touchAction = 'none';
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
        saveButton.style.boxSizing = 'border-box';
        saveButton.style.touchAction = 'none';
        
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
        mainMenuButton.style.touchAction = 'none';
        
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
        
        // Logout button - shown for all users (both anonymous and Google)
        const logoutButton = document.createElement('button');
        logoutButton.id = 'profile-logout-button';
        logoutButton.textContent = 'Logout';
        logoutButton.style.padding = '8px 12px';
        logoutButton.style.backgroundColor = '#f44336';
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
        inventoryMenu.style.boxSizing = 'border-box';
        inventoryMenu.style.touchAction = 'none';
        
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
     * Create gold menu
     */
    createGoldMenu() {
        const goldMenu = document.createElement('div');
        goldMenu.id = 'gold-menu';
        goldMenu.className = 'game-menu';
        goldMenu.style.width = '250px';
        goldMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        goldMenu.style.color = 'white';
        goldMenu.style.padding = '15px';
        goldMenu.style.borderRadius = '8px';
        goldMenu.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
        goldMenu.style.display = 'none'; // Hidden by default
        goldMenu.style.boxSizing = 'border-box';
        goldMenu.style.touchAction = 'none';
        
        // Menu title
        const title = document.createElement('h3');
        title.textContent = 'Gold';
        title.style.margin = '0 0 15px 0';
        title.style.textAlign = 'center';
        title.style.color = '#FFD700';
        goldMenu.appendChild(title);
        
        // Gold amount display
        const goldAmountContainer = document.createElement('div');
        goldAmountContainer.style.display = 'flex';
        goldAmountContainer.style.alignItems = 'center';
        goldAmountContainer.style.justifyContent = 'center';
        goldAmountContainer.style.marginBottom = '15px';
        
        // Gold icon
        const goldIcon = document.createElement('div');
        goldIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="32" viewBox="0 0 24 16" fill="#FFD700" stroke="#E6B800" stroke-width="1">
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
        goldAmount.style.color = '#FFD700';
        goldAmount.style.touchAction = 'none';
        goldAmountContainer.appendChild(goldAmount);
        
        goldMenu.appendChild(goldAmountContainer);
        
        // Description
        const description = document.createElement('p');
        description.textContent = 'Collect gold by looting shipwrecks and completing quests. Gold can be used to upgrade your ship and purchase items.';
        description.style.textAlign = 'center';
        description.style.color = 'rgba(255, 255, 255, 0.7)';
        description.style.fontSize = '14px';
        description.style.lineHeight = '1.4';
        goldMenu.appendChild(description);
        
        // Add click handler to prevent clicks from closing the menu
        goldMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        this.bottomMenuContainer.appendChild(goldMenu);
        this.goldMenu = goldMenu;
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
        mapMenu.style.boxSizing = 'border-box';
        mapMenu.style.touchAction = 'none';
        
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
     * @param {string} menuType - Type of menu to toggle ('inventory', 'gold', or 'map')
     */
    toggleBottomMenu(menuType) {
        // Hide all bottom menus first
        this.inventoryMenu.style.display = 'none';
        this.goldMenu.style.display = 'none';
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
        } else if (menuType === 'gold') {
            this.goldMenu.style.display = 'block';
            // Update gold amount when showing the menu
            this.loadGoldAmount();
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
        this.bottomLeftUIContainer.style.display = 'flex'; // Show bottom-left container
        this.isVisible = true;
        
        // Only show cannon cooldown indicator if there's a current target
        if (this.cannonCooldownContainer && this.currentTarget) {
            this.cannonCooldownContainer.style.display = 'flex';
        } else if (this.cannonCooldownContainer) {
            this.cannonCooldownContainer.style.display = 'none';
        }
        
        // Only show target info if there's a current target
        if (this.targetInfoContainer && this.currentTarget) {
            this.targetInfoContainer.style.display = 'block';
        } else if (this.targetInfoContainer) {
            this.targetInfoContainer.style.display = 'none';
        }
        
        // Keep chat window hidden by default
        if (this.chatContainer) {
            this.chatContainer.style.display = 'none';
        }
    }
    
    /**
     * Hide the UI
     */
    hide() {
        this.bottomUIContainer.style.display = 'none';
        this.topUIContainer.style.display = 'none';
        this.bottomLeftUIContainer.style.display = 'none'; // Hide bottom-left container
        this.isVisible = false;
        // Also close any open menus
        this.bottomMenuContainer.style.display = 'none';
        this.topMenuContainer.style.display = 'none';
        this.activeMenuBottom = null;
        this.activeMenuTop = null;
        
        if (this.cannonCooldownContainer) {
            this.cannonCooldownContainer.style.display = 'none';
        }
        if (this.targetInfoContainer) {
            this.targetInfoContainer.style.display = 'none';
        }
        
        if (this.chatContainer) {
            this.chatContainer.style.display = 'none';
        }
        
        // Clear any current target
        this.currentTarget = null;
    }
    
    /**
     * Update the UI
     */
    update() {
        // Hide cannon cooldown indicator if player ship is sunk
        if (this.playerShip && this.playerShip.isSunk && this.cannonCooldownContainer) {
            this.cannonCooldownContainer.style.display = 'none';
        } 
        // Otherwise update the cooldown indicator if it should be visible
        else if (this.playerShip && !this.playerShip.isSunk) {
            this.updateCannonCooldown();
        }
        
        // Update target info if there is a current target
        if (this.currentTarget) {
            this.updateTargetInfo();
            
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
    
    /**
     * Create cannon cooldown indicator
     */
    createCannonCooldownIndicator() {
        // Create cooldown container
        this.cannonCooldownContainer = document.createElement('div');
        this.cannonCooldownContainer.id = 'cannon-cooldown-container';
        this.cannonCooldownContainer.style.position = 'absolute';
        this.cannonCooldownContainer.style.bottom = '48%'; // Position in the middle of the screen vertically
        this.cannonCooldownContainer.style.left = '50%'; // Center horizontally
        this.cannonCooldownContainer.style.transform = 'translateX(-50%) translateY(40px)'; // Center and offset below ship
        this.cannonCooldownContainer.style.width = '20px'; // Container width (even smaller)
        this.cannonCooldownContainer.style.height = '20px'; // Container height (even smaller)
        this.cannonCooldownContainer.style.display = 'none'; // Hidden by default until a target is selected
        this.cannonCooldownContainer.style.flexDirection = 'column';
        this.cannonCooldownContainer.style.alignItems = 'center';
        this.cannonCooldownContainer.style.justifyContent = 'center';
        this.cannonCooldownContainer.style.zIndex = '1000';
        document.body.appendChild(this.cannonCooldownContainer);
        
        // Create circular cooldown indicator - removed background
        this.cannonCooldownCircle = document.createElement('div');
        this.cannonCooldownCircle.style.width = '20px';
        this.cannonCooldownCircle.style.height = '20px';
        this.cannonCooldownCircle.style.borderRadius = '50%';
        this.cannonCooldownCircle.style.position = 'relative';
        this.cannonCooldownCircle.style.overflow = 'visible'; // Changed to visible since we don't need to hide overflow
        this.cannonCooldownContainer.appendChild(this.cannonCooldownCircle);
        
        // Create circular cooldown fill using SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.transform = 'rotate(-90deg)'; // Start from the top
        
        // Create circle path for cooldown
        this.cannonCooldownFill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.cannonCooldownFill.setAttribute('cx', '10');
        this.cannonCooldownFill.setAttribute('cy', '10');
        this.cannonCooldownFill.setAttribute('r', '8');
        this.cannonCooldownFill.setAttribute('fill', 'transparent');
        this.cannonCooldownFill.setAttribute('stroke', '#4CAF50'); // Start with green when ready
        this.cannonCooldownFill.setAttribute('stroke-width', '2');
        this.cannonCooldownFill.setAttribute('stroke-dasharray', '50.3'); // 2 * PI * 8
        this.cannonCooldownFill.setAttribute('stroke-dashoffset', '0');
        
        svg.appendChild(this.cannonCooldownFill);
        this.cannonCooldownCircle.appendChild(svg);
    }
    
    /**
     * Update cannon cooldown indicator
     */
    updateCannonCooldown() {
        if (!this.playerShip || !this.cannonCooldownFill) return;
        
        const now = Date.now();
        const canFire = this.playerShip.canFire();
        
        // If we're in cooldown mode but now can fire, update the UI
        if (this.isCoolingDown && canFire) {
            this.resetCooldownIndicator();
            return;
        }
        
        // If we can't fire, update the cooldown indicator
        if (!canFire) {
            // Make sure we have a start time
            if (!this.isCoolingDown) {
                this.startCooldown();
            }
            
            // Calculate progress (0 to 1)
            const elapsed = now - this.cooldownStartTime;
            const progress = Math.min(1, elapsed / this.playerShip.cannonCooldown);
            
            // Update the SVG circle dashoffset to show cooldown progress
            const circumference = 50.3;
            const dashOffset = circumference * (1 - progress);
            this.cannonCooldownFill.setAttribute('stroke-dashoffset', dashOffset);
            
            // Gradually change color from red to green based on progress
            const red = Math.floor(244 - (244 - 76) * progress); // 244 -> 76
            const green = Math.floor(67 + (175 - 67) * progress); // 67 -> 175
            const blue = Math.floor(54 + (80 - 54) * progress); // 54 -> 80
            
            const color = `rgb(${red}, ${green}, ${blue})`;
            this.cannonCooldownFill.setAttribute('stroke', color);
        }
    }
    
    /**
     * Start the cooldown timer
     */
    startCooldown() {
        if (!this.cannonCooldownFill) return;
        
        this.isCoolingDown = true;
        this.cooldownStartTime = Date.now();
        
        // Reset the circle to show empty
        this.cannonCooldownFill.setAttribute('stroke-dashoffset', '50.3');
        this.cannonCooldownFill.setAttribute('stroke', '#F44336'); // Red
    }
    
    /**
     * Reset the cooldown indicator to ready state
     */
    resetCooldownIndicator() {
        if (!this.cannonCooldownFill) return;
        
        this.isCoolingDown = false;
        
        // Reset the circle to show full
        this.cannonCooldownFill.setAttribute('stroke-dashoffset', '0');
        this.cannonCooldownFill.setAttribute('stroke', '#4CAF50'); // Green
    }
    
    /**
     * Load gold amount from Firebase and update display
     */
    loadGoldAmount() {
        // If we have access to Firebase auth and the user is logged in
        if (this.auth && this.auth.getCurrentUser()) {
            const uid = this.auth.getCurrentUser().uid;
            
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
        
        // Update gold menu
        const goldMenuAmount = document.getElementById('gold-menu-amount');
        if (goldMenuAmount) {
            goldMenuAmount.textContent = formattedAmount;
        }
    }
    
    /**
     * Create chat button with chat bubble icon
     */
    createChatButton() {
        const chatButton = document.createElement('div');
        chatButton.id = 'chat-button';
        chatButton.style.width = '40px';
        chatButton.style.height = '40px';
        chatButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        chatButton.style.color = 'white';
        chatButton.style.display = 'flex';
        chatButton.style.alignItems = 'center';
        chatButton.style.justifyContent = 'center';
        chatButton.style.cursor = 'pointer';
        chatButton.style.borderRadius = '8px';
        chatButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        chatButton.style.transition = 'all 0.2s ease';
        chatButton.style.userSelect = 'none';
        chatButton.style.webkitUserSelect = 'none';
        chatButton.style.touchAction = 'none';
        
        // Chat bubble SVG icon
        chatButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>`;
        
        chatButton.title = 'Chat (Enter)';
        
        // Add hover effect
        chatButton.addEventListener('mouseover', () => {
            chatButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            chatButton.style.transform = 'scale(1.05)';
        });
        
        chatButton.addEventListener('mouseout', () => {
            chatButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            chatButton.style.transform = 'scale(1)';
        });
        
        // Add click handler to toggle chat
        chatButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleChat();
        });
        
        this.bottomLeftUIContainer.appendChild(chatButton);
        this.chatButton = chatButton;
    }
    
    /**
     * Toggle chat visibility
     */
    toggleChat() {
        if (this.chatContainer) {
            const isVisible = this.chatContainer.style.display !== 'none';
            this.chatContainer.style.display = isVisible ? 'none' : 'flex';
            
            // When opening chat
            if (!isVisible) {
                // Focus the input
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.focus();
                }
                
                // Scroll messages to bottom
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }
        }
    }
    
    /**
     * Create chat interface
     */
    createChatInterface() {
        // Create style element for chat scrollbar
        const style = document.createElement('style');
        style.textContent = `
            #chat-messages::-webkit-scrollbar {
                width: 8px;
            }
            
            #chat-messages::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            
            #chat-messages::-webkit-scrollbar-thumb {
                background-color: rgba(255, 255, 255, 0.3);
                border-radius: 4px;
            }
            
            #chat-messages::-webkit-scrollbar-thumb:hover {
                background-color: rgba(255, 255, 255, 0.4);
            }
        `;
        document.head.appendChild(style);

        // Create chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'game-chat-container';
        chatContainer.style.position = 'absolute';
        chatContainer.style.left = '20px';
        chatContainer.style.bottom = '70px';
        chatContainer.style.width = '300px';
        chatContainer.style.height = '175px';
        chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        chatContainer.style.borderRadius = '5px';
        chatContainer.style.display = 'none'; // Hidden by default
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.zIndex = '1000';
        document.body.appendChild(chatContainer);

        // Create messages container
        const messagesContainer = document.createElement('div');
        messagesContainer.id = 'chat-messages';
        messagesContainer.style.flex = '1';
        messagesContainer.style.overflow = 'auto';
        messagesContainer.style.padding = '10px 10px 5px 10px';
        messagesContainer.style.color = 'white';
        messagesContainer.style.fontSize = '14px';
        messagesContainer.style.scrollbarWidth = 'thin';
        messagesContainer.style.scrollbarColor = 'rgba(255, 255, 255, 0.3) rgba(0, 0, 0, 0.3)';
        chatContainer.appendChild(messagesContainer);

        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.padding = '5px 10px';
        inputContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        chatContainer.appendChild(inputContainer);

        // Create chat input
        const chatInput = document.createElement('input');
        chatInput.id = 'chat-input'; // Added ID for keyboard event handling
        chatInput.type = 'text';
        chatInput.placeholder = 'Type your message...';
        chatInput.style.flex = '1';
        chatInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        chatInput.style.border = 'none';
        chatInput.style.borderRadius = '3px';
        chatInput.style.padding = '5px 10px';
        chatInput.style.color = 'white';
        chatInput.style.marginRight = '5px';
        inputContainer.appendChild(chatInput);

        // Create send button
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.style.backgroundColor = '#4CAF50';
        sendButton.style.color = 'white';
        sendButton.style.border = 'none';
        sendButton.style.borderRadius = '3px';
        sendButton.style.padding = '5px 15px';
        sendButton.style.cursor = 'pointer';
        inputContainer.appendChild(sendButton);

        // Handle sending messages
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                // Get the current user's display name or fallback to 'Sailor'
                const user = this.auth.getCurrentUser();
                const playerName = user?.displayName || 'Sailor';
                this.chatManager.sendMessage(playerName, message);
                chatInput.value = '';
            }
        };

        // Event listeners
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Set up message display callback
        this.chatManager.setMessageCallback((message) => {
            const messageElement = document.createElement('div');
            messageElement.style.marginBottom = '5px';
            messageElement.innerHTML = `<strong>${message.playerName}:</strong> ${message.message}`;
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });

        // Store chat elements
        this.chatContainer = chatContainer;
        this.chatInput = chatInput;
    }
}

export default GameUI; 