/**
 * Shipwright menu component that displays as an open book in the center of the screen
 */
import * as THREE from 'three';
import SailboatShip from '../ships/SailboatShip.js';

class Shipwright {
    // Ship type configurations including prices
    static SHIP_PRICES = {
        'sloop': 0, // Free starter ship
        'skiff': 1000,
        'dinghy': 2000,
        'cutter': 5000,
        'brig': 10000
    };
    
    /**
     * Create a new Shipwright menu
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.gameUI = options.gameUI;
        this.initialized = false;
        
        // Keep track of active renderers and resources for cleanup
        this.activeRenderers = [];
        this.animationFrameIds = [];
        this.activeModels = [];
        this.activeScenes = [];
        
        // Player's current ship model type
        this.currentShipType = 'sloop'; // Default
        
        // Track which ships the player has unlocked
        this.unlockedShips = ['sloop']; // Player starts with sloop unlocked
        this.playerGold = 0;
        
        // Firebase references
        this.auth = options.gameUI?.auth || window.Auth;
        this.database = options.gameUI?.database || window.firebase?.database();
        
        // Create shipwright menu if it doesn't exist
        const existingMenu = document.getElementById('shipwrightMenu');
        if (!existingMenu) {
            console.log('Creating new shipwright menu...');
            this.createShipwrightMenu();
        } else {
            console.log('Shipwright menu already exists, using existing one');
        }
        
        if (!this.initialized) {
            this.initEventListeners();
            this.initialized = true;
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        console.log('Initializing shipwright event listeners');
        // Add document click listener to close menu when clicking outside
        document.addEventListener('click', (event) => {
            const menu = document.getElementById('shipwrightMenu');
            if (menu && menu.style.display === 'block') {
                // Check if the click is outside the menu
                if (!menu.contains(event.target) && !event.target.closest('#shipwrightButton')) {
                    this.hide();
                }
            }
        });
        
        // Listen for player gold updates
        document.addEventListener('playerGoldUpdated', () => {
            this.loadPlayerData();
        });
    }
    
    /**
     * Load player data including unlocked ships and current gold
     */
    loadPlayerData() {
        if (!this.auth || !this.auth.getCurrentUser()) {
            console.error('Cannot load player data: Not authenticated');
            return Promise.resolve(false);
        }
        
        const uid = this.auth.getCurrentUser().uid;
        
        // Create references to player data in Firebase
        const playerRef = this.database.ref(`players/${uid}`);
        
        return playerRef.once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const playerData = snapshot.val();
                    
                    // Get player gold
                    this.playerGold = playerData.gold || 0;
                    
                    // Get current ship model
                    this.currentShipType = playerData.modelType || 'sloop';
                    
                    // Get unlocked ships
                    if (playerData.unlockedShips) {
                        this.unlockedShips = playerData.unlockedShips;
                    } else {
                        // If unlockedShips doesn't exist yet, initialize with sloop
                        this.unlockedShips = ['sloop'];
                        // Save to Firebase
                        playerRef.update({ unlockedShips: this.unlockedShips });
                    }
                    
                    console.log(`Loaded player data: Gold=${this.playerGold}, Current Ship=${this.currentShipType}, Unlocked Ships:`, this.unlockedShips);
                    return true;
                } else {
                    console.log('No player data found');
                    return false;
                }
            })
            .catch(error => {
                console.error('Error loading player data:', error);
                return false;
            });
    }
    
    /**
     * Save the unlocked ships list to Firebase
     */
    saveUnlockedShips() {
        if (!this.auth || !this.auth.getCurrentUser()) {
            console.error('Cannot save unlocked ships: Not authenticated');
            return Promise.resolve(false);
        }
        
        const uid = this.auth.getCurrentUser().uid;
        
        // Create a reference to the player in Firebase
        const playerRef = this.database.ref(`players/${uid}`);
        
        // Update the unlocked ships list
        return playerRef.update({
            unlockedShips: this.unlockedShips,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            console.log('Successfully updated unlocked ships list');
            return true;
        })
        .catch(error => {
            console.error('Error updating unlocked ships:', error);
            return false;
        });
    }
    
    /**
     * Check if a ship is unlocked by the player
     * @param {string} shipId - The ship ID to check
     * @returns {boolean} True if the ship is unlocked
     */
    isShipUnlocked(shipId) {
        return this.unlockedShips.includes(shipId);
    }
    
    /**
     * Unlock a new ship for the player
     * @param {string} shipId - The ship ID to unlock
     * @param {number} cost - The gold cost to purchase
     * @returns {Promise} Promise that resolves when unlock is complete
     */
    unlockShip(shipId, cost) {
        if (!this.auth || !this.auth.getCurrentUser()) {
            console.error('Cannot unlock ship: Not authenticated');
            return Promise.resolve(false);
        }
        
        const uid = this.auth.getCurrentUser().uid;
        
        // Check if player has enough gold
        if (this.playerGold < cost) {
            console.error(`Not enough gold to unlock ship. Required: ${cost}, Available: ${this.playerGold}`);
            return Promise.resolve(false);
        }
        
        // Create a reference to the player in Firebase
        const playerRef = this.database.ref(`players/${uid}`);
        
        // Deduct gold and add to unlocked ships
        return playerRef.update({
            gold: this.playerGold - cost,
            unlockedShips: [...this.unlockedShips, shipId],
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            console.log(`Successfully unlocked ship: ${shipId} for ${cost} gold`);
            
            // Update local data
            this.playerGold -= cost;
            this.unlockedShips.push(shipId);
            
            // Trigger an event to update the UI
            const goldUpdatedEvent = new CustomEvent('playerGoldUpdated', {
                detail: { gold: -cost }
            });
            document.dispatchEvent(goldUpdatedEvent);
            
            return true;
        })
        .catch(error => {
            console.error(`Error unlocking ship ${shipId}:`, error);
            return false;
        });
    }
    
    /**
     * Set the player's current ship model
     * @param {string} shipId - The ship ID to set as current
     * @returns {Promise} Promise that resolves when update is complete
     */
    setPlayerShipModel(shipId) {
        if (!this.auth || !this.auth.getCurrentUser()) {
            console.error('Cannot set ship model: Not authenticated');
            return Promise.resolve(false);
        }
        
        // Check if ship is unlocked
        if (!this.isShipUnlocked(shipId)) {
            console.error(`Cannot select ship ${shipId}: Not unlocked`);
            return Promise.resolve(false);
        }
        
        const uid = this.auth.getCurrentUser().uid;
        
        try {
            // First update the ship in game
            const shipUpdated = this.updateCurrentPlayerShip(shipId);
            
            if (!shipUpdated) {
                console.error('Failed to update ship in game');
                return Promise.resolve(false);
            }
            
            // Then update in Firebase
            const playerRef = this.database.ref(`players/${uid}`);
            
            // Update the model type and reset health to max
            return playerRef.update({
                modelType: shipId,
                health: window.playerShip ? window.playerShip.maxHealth : 100, // Use the new ship's max health
                maxHealth: window.playerShip ? window.playerShip.maxHealth : 100, // Also update max health value
                isSunk: false, // Ensure the ship is not marked as sunk
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            })
            .then(() => {
                console.log(`Successfully set ship model to: ${shipId}`);
                
                // Update local property
                this.currentShipType = shipId;
                
                // Force an immediate position update to sync the new ship model to all other players
                if (window.multiplayerManager && window.playerShip) {
                    console.log('Forcing multiplayer sync to update ship model for other players');
                    // Use a slight delay to ensure the update happens after Firebase data is saved
                    setTimeout(() => {
                        window.multiplayerManager.updatePlayerPosition(window.playerShip, true);
                    }, 100);
                }
                
                return true;
            })
            .catch(error => {
                console.error(`Error setting ship model to ${shipId}:`, error);
                return false;
            });
        } catch (error) {
            console.error(`Error updating ship: ${error.message}`);
            return Promise.resolve(false);
        }
    }
    
    /**
     * Update the current player ship in the game with the new model type
     * @param {string} shipId - The ship ID to set
     */
    updateCurrentPlayerShip(shipId) {
        // Access player ship through various possible global references
        const playerShip = window.playerShip || 
                          (this.gameUI && this.gameUI.playerShip) || 
                          (window.combatManager && window.combatManager.playerShip);
        
        if (playerShip) {
            console.log(`Updating player ship model to: ${shipId}`);
            
            // Store the old position and rotation
            const oldPosition = playerShip.getPosition().clone();
            let oldRotation = null;
            
            if (playerShip.getObject() && playerShip.getObject().rotation) {
                oldRotation = playerShip.getObject().rotation.clone();
            } else {
                // Default rotation if not available
                oldRotation = new THREE.Euler(0, 0, 0);
            }
            
            // Get the scene from the existing ship
            const scene = playerShip.scene;
            
            // Store the current camera position and target (so we can restore it later)
            let cameraPosition = null;
            let cameraTarget = null;
            if (window.gameCore && window.gameCore.sceneManager) {
                const camera = window.gameCore.sceneManager.getCamera();
                if (camera) {
                    cameraPosition = camera.position.clone();
                    // Get the camera's current look target
                    cameraTarget = new THREE.Vector3(0, 0, -1);
                    cameraTarget.applyQuaternion(camera.quaternion);
                    cameraTarget.add(camera.position);
                }
            }
            
            // Remove the old ship immediately to prevent duplicates
            if (playerShip.shipMesh) {
                scene.remove(playerShip.shipMesh);
            }
            
            // Create a new ship with the selected model type
            const newShip = new SailboatShip(scene, {
                modelType: shipId,
                position: oldPosition
            });
            
            // Set ship ID to match user ID
            if (this.auth && this.auth.getCurrentUser()) {
                newShip.id = this.auth.getCurrentUser().uid;
            }
            
            // Set the rotation to match the old ship
            if (newShip.getObject() && oldRotation) {
                newShip.getObject().rotation.copy(oldRotation);
            }
            
            // Transfer movement state from old ship to new ship
            newShip.isMoving = playerShip.isMoving;
            if (playerShip.targetPosition) {
                newShip.targetPosition = playerShip.targetPosition.clone();
            }
            newShip.targetRotation = playerShip.targetRotation;
            
            // Reset health to max for the new ship
            // Each ship type has its own maxHealth value as defined in SailboatShip.SHIP_CONFIGS
            newShip.currentHealth = newShip.maxHealth;
            console.log(`Reset ship health to max: ${newShip.currentHealth}/${newShip.maxHealth}`);
            
            // Make ship available globally
            window.playerShip = newShip;
            
            // Update GameCore's ship reference if it exists
            if (window.gameCore) {
                window.gameCore.ship = newShip;
                
                // Re-setup gameplay controls with the new ship
                if (window.gameCore.inputManager) {
                    window.gameCore.setupGameplayControls();
                }
                
                // Restore camera position and target if we saved them
                if (cameraPosition && window.gameCore.sceneManager) {
                    const camera = window.gameCore.sceneManager.getCamera();
                    if (camera) {
                        camera.position.copy(cameraPosition);
                        if (cameraTarget) {
                            camera.lookAt(cameraTarget);
                        }
                    }
                }
            }
            
            // Update references in combat manager if it exists
            if (window.combatManager) {
                window.combatManager.setPlayerShip(newShip);
            }
            
            // Update references in enemy ship manager if it exists
            if (window.enemyShipManager) {
                window.enemyShipManager.setPlayerShip(newShip);
            }
            
            // Update UI references
            if (this.gameUI) {
                this.gameUI.playerShip = newShip;
            }
            
            // Update multiplayer manager if it exists
            if (window.multiplayerManager) {
                // Stop the current periodic sync that's using the old ship reference
                window.multiplayerManager.stopPeriodicSync();
                
                // Store the new ship reference in the multiplayer manager
                window.multiplayerManager.playerShip = newShip;
                
                // Restart the periodic sync with the new ship reference
                window.multiplayerManager.startPeriodicSync(newShip);
                
                // Do an immediate position update
                setTimeout(() => {
                    if (newShip.getObject() && newShip.getObject().rotation) {
                        window.multiplayerManager.updatePlayerPosition(newShip, true);
                    }
                }, 200);
            }
            
            // Dispose of any other resources from the old ship
            if (playerShip.dispose && typeof playerShip.dispose === 'function') {
                playerShip.dispose();
            }
            
            // Trigger player ship updated event
            const shipUpdatedEvent = new CustomEvent('playerShipUpdated', {
                detail: { shipType: shipId }
            });
            document.dispatchEvent(shipUpdatedEvent);
            
            console.log('Ship model updated successfully');
            return true;
        } else {
            console.error('Could not find player ship to update');
            return false;
        }
    }
    
    /**
     * Create the shipwright menu styled as an open book
     */
    createShipwrightMenu() {
        // Create main container
        const menu = document.createElement('div');
        menu.id = 'shipwrightMenu';
        menu.style.position = 'absolute';
        menu.style.top = '50%';
        menu.style.left = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
        menu.style.maxWidth = '1200px'; // Set a max width so it doesn't get too large
        menu.style.maxHeight = '800px'; // Set a max height so it doesn't get too large
        menu.style.display = 'none';
        menu.style.zIndex = '1000'; // Use a high z-index value to ensure it's on top
        
        // Create book container with two pages
        const bookContainer = document.createElement('div');
        bookContainer.className = 'book-container';
        bookContainer.style.display = 'flex';
        bookContainer.style.flexDirection = 'row'; // Default to row for desktop
        bookContainer.style.width = '100%';
        bookContainer.style.height = '100%';
        bookContainer.style.backgroundColor = '#8B4513'; // Brown color for book cover
        bookContainer.style.borderRadius = '10px';
        bookContainer.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.5)';
        bookContainer.style.overflow = 'hidden';
        
        // Handle all responsive adjustments in one function
        const handleResponsiveChanges = () => {
            // Size adjustments
            if (window.innerWidth < 768) {
                // Mobile: 90% of viewport and vertical layout
                menu.style.width = '90%';
                menu.style.height = '90%';
                bookContainer.style.flexDirection = 'column';
            } else {
                // Desktop: 80% of viewport and horizontal layout
                menu.style.width = '80%';
                menu.style.height = '80%';
                bookContainer.style.flexDirection = 'row';
            }
        };
        
        // Apply initial responsive settings
        handleResponsiveChanges();
        
        // Listen for window resize to update all responsive elements
        window.addEventListener('resize', handleResponsiveChanges);
        
        // Store cleanup function
        this.cleanupFunctions = this.cleanupFunctions || [];
        this.cleanupFunctions.push(() => {
            window.removeEventListener('resize', handleResponsiveChanges);
        });
        
        // Left page
        const leftPage = document.createElement('div');
        leftPage.className = 'book-page left-page';
        leftPage.style.flex = '1';
        leftPage.style.background = '#f5e8c0'; // Parchment-like color
        leftPage.style.padding = 'min(20px, 3vw)'; // Responsive padding
        leftPage.style.boxShadow = 'inset -5px 0 10px rgba(0, 0, 0, 0.1)';
        leftPage.style.display = 'flex';
        leftPage.style.flexDirection = 'column';
        leftPage.style.alignItems = 'center';
        leftPage.style.justifyContent = 'flex-start';
        leftPage.style.overflowY = 'auto';
        
        // Title for left page
        const leftTitle = document.createElement('h2');
        leftTitle.textContent = 'Shipwright';
        leftTitle.style.color = '#8B4513';
        leftTitle.style.fontFamily = 'serif';
        leftTitle.style.fontSize = 'min(24px, 5vw)'; // Responsive font size
        leftTitle.style.textAlign = 'center';
        leftTitle.style.marginBottom = 'min(20px, 3vh)'; // Responsive margin
        leftPage.appendChild(leftTitle);
        
        // Ship selection container
        const shipSelectionContainer = document.createElement('div');
        shipSelectionContainer.style.width = '100%';
        shipSelectionContainer.style.display = 'flex';
        shipSelectionContainer.style.flexDirection = 'column';
        shipSelectionContainer.style.gap = 'min(15px, 2vh)'; // Responsive gap
        
        // Ship types from SailboatShip.js
        const shipTypes = [
            { id: 'sloop', name: 'Sloop', description: 'A balanced ship with decent speed and maneuverability.' },
            { id: 'skiff', name: 'Skiff', description: 'Fast and nimble, but with less firepower.' },
            { id: 'dinghy', name: 'Dinghy', description: 'Small and agile, perfect for beginners.' },
            { id: 'cutter', name: 'Cutter', description: 'A medium-sized vessel with good all-round capabilities.' },
            { id: 'brig', name: 'Brig', description: 'Slow but powerful, with superior firepower.' }
        ];
        
        // Create ship selection items
        shipTypes.forEach(ship => {
            const shipItem = document.createElement('div');
            shipItem.className = 'ship-item';
            shipItem.style.display = 'flex';
            shipItem.style.alignItems = 'center';
            shipItem.style.padding = '8px';
            shipItem.style.borderRadius = '5px';
            shipItem.style.cursor = 'pointer';
            shipItem.style.transition = 'background-color 0.2s';
            shipItem.style.backgroundColor = 'rgba(139, 69, 19, 0.1)';
            shipItem.style.position = 'relative'; // For absolute positioning of lock overlay
            
            // Add a locked overlay if ship is not unlocked
            // Default to locked for all except sloop, will be updated when data loads
            const isUnlocked = ship.id === 'sloop'; // Default state until data loads
            if (!isUnlocked) {
                // Create locked overlay container
                const lockOverlay = document.createElement('div');
                lockOverlay.className = 'ship-lock-overlay';
                lockOverlay.id = `lock-overlay-${ship.id}`;
                lockOverlay.style.position = 'absolute';
                lockOverlay.style.top = '0';
                lockOverlay.style.left = '0';
                lockOverlay.style.width = '100%';
                lockOverlay.style.height = '100%';
                lockOverlay.style.display = 'flex';
                lockOverlay.style.justifyContent = 'flex-end';
                lockOverlay.style.alignItems = 'center';
                lockOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                lockOverlay.style.borderRadius = '5px';
                lockOverlay.style.zIndex = '1';
                lockOverlay.style.padding = '0 10px';
                
                // Lock icon
                const lockIcon = document.createElement('div');
                lockIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>`;
                
                // Price tag
                const priceTag = document.createElement('span');
                priceTag.textContent = `${Shipwright.SHIP_PRICES[ship.id]} gold`;
                priceTag.style.marginRight = '5px';
                priceTag.style.fontSize = '12px';
                priceTag.style.fontWeight = 'bold';
                priceTag.style.color = 'white';
                
                lockOverlay.appendChild(priceTag);
                lockOverlay.appendChild(lockIcon);
                shipItem.appendChild(lockOverlay);
            }
            
            // On hover effect
            shipItem.addEventListener('mouseover', () => {
                shipItem.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
            });
            
            shipItem.addEventListener('mouseout', () => {
                shipItem.style.backgroundColor = 'rgba(139, 69, 19, 0.1)';
            });
            
            // Image container for ship profile
            const imageContainer = document.createElement('div');
            imageContainer.style.width = '60px';
            imageContainer.style.height = '50px';
            imageContainer.style.marginRight = '10px';
            imageContainer.style.display = 'flex';
            imageContainer.style.justifyContent = 'center';
            imageContainer.style.alignItems = 'center';
            imageContainer.style.zIndex = '0';
            
            // Ship profile image - we'll use the ship model path
            const shipProfilePath = `/assets/images/ships/${ship.id}-profile.png`;
            const shipImage = document.createElement('img');
            shipImage.src = shipProfilePath;
            shipImage.alt = ship.name;
            shipImage.style.maxWidth = '100%';
            shipImage.style.maxHeight = '100%';
            shipImage.style.filter = 'sepia(60%) saturate(50%) hue-rotate(340deg) brightness(90%)'; // Apply brown color filter
            
            // Fallback if image doesn't exist
            shipImage.onerror = () => {
                console.log(`Ship profile image not found: ${shipProfilePath}`);
                // Use a text fallback
                imageContainer.textContent = ship.name.charAt(0);
                imageContainer.style.fontFamily = 'serif';
                imageContainer.style.fontSize = '24px';
                imageContainer.style.fontWeight = 'bold';
                imageContainer.style.color = '#5D4037';
            };
            
            imageContainer.appendChild(shipImage);
            shipItem.appendChild(imageContainer);
            
            // Ship info container
            const infoContainer = document.createElement('div');
            infoContainer.style.flex = '1';
            infoContainer.style.zIndex = '0';
            
            // Ship name
            const nameElement = document.createElement('div');
            nameElement.textContent = ship.name;
            nameElement.style.fontFamily = 'serif';
            nameElement.style.fontSize = 'min(16px, 3vw)'; // Responsive font size
            nameElement.style.fontWeight = 'bold';
            nameElement.style.color = '#5D4037';
            infoContainer.appendChild(nameElement);
            
            // Ship description
            const descriptionElement = document.createElement('div');
            descriptionElement.textContent = ship.description;
            descriptionElement.style.fontFamily = 'serif';
            descriptionElement.style.fontSize = 'min(12px, 2.5vw)'; // Responsive font size
            descriptionElement.style.color = '#5D4037';
            infoContainer.appendChild(descriptionElement);
            
            shipItem.appendChild(infoContainer);
            
            // Add click handler
            shipItem.addEventListener('click', () => {
                console.log(`Selected ship: ${ship.name}`);
                // Update the right page with selected ship details
                this.updateRightPage(rightPage, ship);
            });
            
            shipSelectionContainer.appendChild(shipItem);
        });
        
        leftPage.appendChild(shipSelectionContainer);
        
        // Content for left page - coming soon message at the bottom
        const comingSoon = document.createElement('p');
        comingSoon.textContent = 'More ships coming soon...';
        comingSoon.style.fontFamily = 'serif';
        comingSoon.style.fontSize = '14px';
        comingSoon.style.fontStyle = 'italic';
        comingSoon.style.color = '#5D4037';
        comingSoon.style.textAlign = 'center';
        comingSoon.style.marginTop = '20px';
        leftPage.appendChild(comingSoon);
        
        // Right page
        const rightPage = document.createElement('div');
        rightPage.className = 'book-page right-page';
        rightPage.style.flex = '1';
        rightPage.style.background = '#f5e8c0'; // Parchment-like color
        rightPage.style.padding = 'min(20px, 3vw)'; // Responsive padding
        rightPage.style.boxShadow = 'inset 5px 0 10px rgba(0, 0, 0, 0.1)';
        rightPage.style.display = 'flex';
        rightPage.style.flexDirection = 'column';
        rightPage.style.alignItems = 'center';
        rightPage.style.justifyContent = 'center';
        
        // Initial right page content
        const initialTitle = document.createElement('h2');
        initialTitle.textContent = 'Ship Selection';
        initialTitle.style.color = '#8B4513';
        initialTitle.style.fontFamily = 'serif';
        initialTitle.style.textAlign = 'center';
        initialTitle.style.marginBottom = '20px';
        rightPage.appendChild(initialTitle);
        
        // Add a decorative image or drawing to right page
        const decorativeImage = document.createElement('div');
        decorativeImage.style.width = '150px';
        decorativeImage.style.height = '150px';
        decorativeImage.style.display = 'flex';
        decorativeImage.style.justifyContent = 'center';
        decorativeImage.style.alignItems = 'center';
        
        const shipImage = document.createElement('img');
        shipImage.src = '/assets/images/ship-icon.png';
        shipImage.style.width = '120px';
        shipImage.style.height = 'auto';
        shipImage.style.filter = 'sepia(100%) saturate(50%) hue-rotate(340deg) brightness(90%)'; // Apply brown color filter
        
        decorativeImage.appendChild(shipImage);
        rightPage.appendChild(decorativeImage);
        
        // Add instruction text
        const instructionText = document.createElement('p');
        instructionText.textContent = 'Select a ship from the menu on the left to view its details and attributes.';
        instructionText.style.fontFamily = 'serif';
        instructionText.style.fontSize = '14px';
        instructionText.style.color = '#5D4037';
        instructionText.style.textAlign = 'center';
        instructionText.style.marginTop = '20px';
        instructionText.style.maxWidth = '80%';
        rightPage.appendChild(instructionText);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = '#8B4513';
        closeButton.style.color = '#f5e8c0';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.cursor = 'pointer';
        
        closeButton.addEventListener('click', () => {
            menu.style.display = 'none';
        });
        
        // Add pages to book
        bookContainer.appendChild(leftPage);
        bookContainer.appendChild(rightPage);
        
        // Add book and close button to menu
        menu.appendChild(bookContainer);
        menu.appendChild(closeButton);
        
        // Prevent clicks inside the menu from propagating
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        // Add menu to the document body
        document.body.appendChild(menu);
        
        console.log('Shipwright menu created and added to document body');
    }
    
    /**
     * Show the shipwright menu
     */
    show() {
        const menu = document.getElementById('shipwrightMenu');
        if (menu) {
            console.log('Showing shipwright menu...');
            
            // Load player data when opening the menu
            this.loadPlayerData().then(() => {
                // Update lock overlays based on unlocked ships
                this.updateLockOverlays();
                
                // Display the menu
                menu.style.display = 'block';
            });
        } else {
            console.error('Failed to find shipwrightMenu element!');
        }
    }
    
    /**
     * Update lock overlays based on unlocked ships
     */
    updateLockOverlays() {
        // For each ship type, show/hide lock overlay based on unlock status
        for (const shipId in Shipwright.SHIP_PRICES) {
            const lockOverlay = document.getElementById(`lock-overlay-${shipId}`);
            if (lockOverlay) {
                // Show/hide based on unlock status
                if (this.isShipUnlocked(shipId)) {
                    lockOverlay.style.display = 'none';
                } else {
                    lockOverlay.style.display = 'flex';
                }
            }
        }
    }
    
    /**
     * Hide the shipwright menu
     */
    hide() {
        const menu = document.getElementById('shipwrightMenu');
        if (menu) {
            console.log('Hiding shipwright menu...');
            menu.style.display = 'none';
            
            // Clean up renderers when hiding the menu
            this.cleanupRenderers();
        }
    }
    
    /**
     * Toggle the shipwright menu visibility
     * @param {boolean} show - Whether to show or hide the menu
     */
    toggle(show) {
        console.log(`Shipwright toggle called with show=${show}`);
        if (show) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    /**
     * Update the right page with selected ship details
     * @param {Element} rightPage - The right page element
     * @param {Object} ship - The selected ship
     */
    updateRightPage(rightPage, ship) {
        // Clean up existing renderers before creating new ones
        this.cleanupRenderers();
        
        // Load the latest player data first
        this.loadPlayerData().then(() => {
            // Clear existing content
            rightPage.innerHTML = '';
            
            // Ship title
            const shipTitle = document.createElement('h2');
            shipTitle.textContent = ship.name;
            shipTitle.style.color = '#8B4513';
            shipTitle.style.fontFamily = 'serif';
            shipTitle.style.fontSize = 'min(24px, 5vw)'; // Responsive font size
            shipTitle.style.textAlign = 'center';
            shipTitle.style.marginBottom = 'min(20px, 3vh)'; // Responsive margin
            rightPage.appendChild(shipTitle);
            
            // Ship model viewer container
            const shipViewerContainer = document.createElement('div');
            shipViewerContainer.style.width = '40%'; // Responsive width
            shipViewerContainer.style.height = '30%'; // Responsive height
            shipViewerContainer.style.minWidth = '180px'; // Minimum width
            shipViewerContainer.style.minHeight = '130px'; // Minimum height
            shipViewerContainer.style.marginBottom = '15px';
            shipViewerContainer.style.position = 'relative';
            
            // Get model path based on SailboatShip.js
            const modelPaths = {
                'sloop': '/assets/models/ships/sailboat-2.glb',
                'skiff': '/assets/models/ships/sailboat-3.glb',
                'dinghy': '/assets/models/ships/sailboat.glb',
                'cutter': '/assets/models/ships/ship-3.glb',
                'brig': '/assets/models/ships/ship.glb'
            };
            
            const modelPath = modelPaths[ship.id];
            
            // We'll create a mini renderer to show a side profile of the ship
            this.createShipRenderer(shipViewerContainer, modelPath, ship.id);
            
            rightPage.appendChild(shipViewerContainer);
            
            // Ship stats table
            const statsContainer = document.createElement('div');
            statsContainer.style.width = '90%';
            statsContainer.style.maxWidth = '400px';
            statsContainer.style.marginBottom = '20px';
            
            // Get ship attributes based on SailboatShip.js
            const shipAttributes = {
                'sloop': {
                    speed: SailboatShip.SHIP_CONFIGS.sloop.speed,
                    rotationSpeed: SailboatShip.SHIP_CONFIGS.sloop.rotationSpeed,
                    health: SailboatShip.SHIP_CONFIGS.sloop.maxHealth,
                    cannonDamage: `${SailboatShip.SHIP_CONFIGS.sloop.cannonDamage.min}-${SailboatShip.SHIP_CONFIGS.sloop.cannonDamage.max}`,
                    cannonRange: SailboatShip.SHIP_CONFIGS.sloop.cannonRange
                },
                'skiff': {
                    speed: SailboatShip.SHIP_CONFIGS.skiff.speed,
                    rotationSpeed: SailboatShip.SHIP_CONFIGS.skiff.rotationSpeed,
                    health: SailboatShip.SHIP_CONFIGS.skiff.maxHealth,
                    cannonDamage: `${SailboatShip.SHIP_CONFIGS.skiff.cannonDamage.min}-${SailboatShip.SHIP_CONFIGS.skiff.cannonDamage.max}`,
                    cannonRange: SailboatShip.SHIP_CONFIGS.skiff.cannonRange
                },
                'dinghy': {
                    speed: SailboatShip.SHIP_CONFIGS.dinghy.speed,
                    rotationSpeed: SailboatShip.SHIP_CONFIGS.dinghy.rotationSpeed,
                    health: SailboatShip.SHIP_CONFIGS.dinghy.maxHealth,
                    cannonDamage: `${SailboatShip.SHIP_CONFIGS.dinghy.cannonDamage.min}-${SailboatShip.SHIP_CONFIGS.dinghy.cannonDamage.max}`,
                    cannonRange: SailboatShip.SHIP_CONFIGS.dinghy.cannonRange
                },
                'cutter': {
                    speed: SailboatShip.SHIP_CONFIGS.cutter.speed,
                    rotationSpeed: SailboatShip.SHIP_CONFIGS.cutter.rotationSpeed,
                    health: SailboatShip.SHIP_CONFIGS.cutter.maxHealth,
                    cannonDamage: `${SailboatShip.SHIP_CONFIGS.cutter.cannonDamage.min}-${SailboatShip.SHIP_CONFIGS.cutter.cannonDamage.max}`,
                    cannonRange: SailboatShip.SHIP_CONFIGS.cutter.cannonRange
                },
                'brig': {
                    speed: SailboatShip.SHIP_CONFIGS.brig.speed,
                    rotationSpeed: SailboatShip.SHIP_CONFIGS.brig.rotationSpeed,
                    health: SailboatShip.SHIP_CONFIGS.brig.maxHealth,
                    cannonDamage: `${SailboatShip.SHIP_CONFIGS.brig.cannonDamage.min}-${SailboatShip.SHIP_CONFIGS.brig.cannonDamage.max}`,
                    cannonRange: SailboatShip.SHIP_CONFIGS.brig.cannonRange
                }
            };
            
            const attributes = shipAttributes[ship.id] || {
                speed: '?',
                rotationSpeed: '?',
                health: '?',
                cannonDamage: '?',
                cannonRange: '?'
            };
            
            // Create stats table
            const statsTable = document.createElement('table');
            statsTable.style.width = '100%';
            statsTable.style.borderCollapse = 'collapse';
            statsTable.style.fontFamily = 'serif';
            statsTable.style.color = '#5D4037';
            
            // Add stats rows
            const stats = [
                { name: 'Speed', value: attributes.speed },
                { name: 'Rotation Speed', value: attributes.rotationSpeed },
                { name: 'Hull Strength', value: attributes.health },
                { name: 'Cannon Damage', value: attributes.cannonDamage },
                { name: 'Cannon Range', value: attributes.cannonRange }
            ];
            
            stats.forEach(stat => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid rgba(93, 64, 55, 0.2)';
                
                const nameCell = document.createElement('td');
                nameCell.textContent = stat.name;
                nameCell.style.padding = 'min(8px, 1.5vw) min(4px, 1vw)'; // Responsive padding
                nameCell.style.fontWeight = 'bold';
                nameCell.style.fontSize = 'min(14px, 2.5vw)'; // Responsive font size
                
                const valueCell = document.createElement('td');
                valueCell.textContent = stat.value;
                valueCell.style.padding = 'min(8px, 1.5vw) min(4px, 1vw)'; // Responsive padding
                valueCell.style.fontSize = 'min(14px, 2.5vw)'; // Responsive font size
                valueCell.style.textAlign = 'right';
                
                row.appendChild(nameCell);
                row.appendChild(valueCell);
                statsTable.appendChild(row);
            });
            
            statsContainer.appendChild(statsTable);
            rightPage.appendChild(statsContainer);
            
            // Check if ship is unlocked
            const isUnlocked = this.isShipUnlocked(ship.id);
            const isCurrentShip = this.currentShipType === ship.id;
            const shipPrice = Shipwright.SHIP_PRICES[ship.id] || 0;
            
            // Display player's gold
            const goldContainer = document.createElement('div');
            goldContainer.style.display = 'flex';
            goldContainer.style.alignItems = 'center';
            goldContainer.style.justifyContent = 'center';
            goldContainer.style.marginBottom = '10px';
            
            // Gold icon
            const goldIcon = document.createElement('div');
            goldIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 24 16" fill="#DAA520" stroke="#8B4513" stroke-width="1">
                <circle cx="9" cy="8" r="7"></circle>
                <circle cx="15" cy="8" r="7"></circle>
            </svg>`;
            goldIcon.style.marginRight = '5px';
            
            // Gold amount
            const goldAmount = document.createElement('span');
            goldAmount.textContent = this.playerGold.toLocaleString();
            goldAmount.style.fontFamily = 'serif';
            goldAmount.style.fontSize = '14px';
            goldAmount.style.fontWeight = 'bold';
            goldAmount.style.color = '#DAA520';
            
            goldContainer.appendChild(goldIcon);
            goldContainer.appendChild(goldAmount);
            rightPage.appendChild(goldContainer);
            
            // Status message
            let statusMessage = '';
            if (isCurrentShip) {
                statusMessage = 'This is your current ship.';
            } else if (isUnlocked) {
                statusMessage = 'Ship unlocked and ready to sail!';
            } else {
                statusMessage = `Unlock this ship for ${shipPrice} gold.`;
            }
            
            const statusText = document.createElement('p');
            statusText.textContent = statusMessage;
            statusText.style.fontFamily = 'serif';
            statusText.style.fontSize = '14px';
            statusText.style.color = isUnlocked ? '#2E7D32' : '#5D4037';
            statusText.style.textAlign = 'center';
            statusText.style.margin = '0 0 10px 0';
            rightPage.appendChild(statusText);
            
            // "Purchase" or "Select" button
            let actionButton = document.createElement('button');
            
            // Set button text and state based on unlock status
            if (isCurrentShip) {
                actionButton.textContent = 'Current Ship';
                actionButton.disabled = true;
                actionButton.style.opacity = '0.6';
                actionButton.style.cursor = 'default';
            } else if (isUnlocked) {
                actionButton.textContent = 'Select Ship';
            } else {
                actionButton.textContent = 'Purchase Ship';
                
                // Disable button if not enough gold
                if (this.playerGold < shipPrice) {
                    actionButton.disabled = true;
                    actionButton.style.opacity = '0.6';
                    actionButton.style.cursor = 'default';
                    
                    // Update status text
                    statusText.textContent = `Not enough gold. You need ${shipPrice - this.playerGold} more.`;
                    statusText.style.color = '#B71C1C';
                }
            }
            
            actionButton.style.background = '#8B4513';
            actionButton.style.color = '#f5e8c0';
            actionButton.style.border = 'none';
            actionButton.style.borderRadius = '5px';
            actionButton.style.padding = '8px 15px';
            actionButton.style.cursor = 'pointer';
            actionButton.style.fontFamily = 'serif';
            actionButton.style.fontSize = 'min(16px, 2vw)'; // Responsive font size
            actionButton.style.marginTop = '10px';
            actionButton.style.marginBottom = '20px'; // Add bottom margin for small screens
            
            // Mouse over effect (only for enabled buttons)
            if (!actionButton.disabled) {
                actionButton.addEventListener('mouseover', () => {
                    actionButton.style.backgroundColor = '#A0522D';
                });
                
                actionButton.addEventListener('mouseout', () => {
                    actionButton.style.backgroundColor = '#8B4513';
                });
            }
            
            // Button click handler
            actionButton.addEventListener('click', () => {
                if (actionButton.disabled) return;
                
                if (isUnlocked) {
                    // Select ship logic
                    console.log(`Selecting ship: ${ship.name}`);
                    
                    this.setPlayerShipModel(ship.id)
                        .then(success => {
                            if (success) {
                                // Update button to show it's the current ship
                                actionButton.textContent = 'Current Ship';
                                actionButton.disabled = true;
                                actionButton.style.opacity = '0.6';
                                actionButton.style.cursor = 'default';
                                
                                // Update status message
                                statusText.textContent = 'This is your current ship.';
                                
                                // Show success notification
                                this.showNotification(`Now sailing: ${ship.name}!`);
                                
                                // Close the shipwright menu after successful selection
                                this.hide();
                            } else {
                                this.showNotification('Error selecting ship', 'error');
                            }
                        });
                } else {
                    // Purchase ship logic
                    console.log(`Purchasing ship: ${ship.name} for ${shipPrice} gold`);
                    
                    this.unlockShip(ship.id, shipPrice)
                        .then(success => {
                            if (success) {
                                // Update UI to show it's unlocked
                                actionButton.textContent = 'Select Ship';
                                
                                // Update status message
                                statusText.textContent = 'Ship unlocked and ready to sail!';
                                statusText.style.color = '#2E7D32';
                                
                                // Update gold display
                                goldAmount.textContent = this.playerGold.toLocaleString();
                                
                                // Show success notification
                                this.showNotification(`${ship.name} purchased!`);
                                
                                // Update local unlocked ships array to include the newly purchased ship
                                // This ensures isShipUnlocked() will return the correct value
                                if (!this.unlockedShips.includes(ship.id)) {
                                    this.unlockedShips.push(ship.id);
                                }
                                
                                // Important: Update the button's click handler to use select logic now
                                // Remove previous click handler by cloning and replacing the button
                                const newButton = actionButton.cloneNode(true);
                                actionButton.parentNode.replaceChild(newButton, actionButton);
                                actionButton = newButton;
                                console.log('Successfully replaced purchase button with select button');
                                
                                // Add the select ship click handler to the new button
                                actionButton.addEventListener('click', () => {
                                    console.log(`Selecting newly purchased ship: ${ship.name}`);
                                    
                                    this.setPlayerShipModel(ship.id)
                                        .then(success => {
                                            if (success) {
                                                // Update button to show it's the current ship
                                                actionButton.textContent = 'Current Ship';
                                                actionButton.disabled = true;
                                                actionButton.style.opacity = '0.6';
                                                actionButton.style.cursor = 'default';
                                                
                                                // Update status message
                                                statusText.textContent = 'This is your current ship.';
                                                
                                                // Show success notification
                                                this.showNotification(`Now sailing: ${ship.name}!`);
                                                
                                                // Close the shipwright menu after successful selection
                                                this.hide();
                                            } else {
                                                this.showNotification('Error selecting ship', 'error');
                                            }
                                        });
                                });
                                
                                // Add the same hover effects as before
                                actionButton.addEventListener('mouseover', () => {
                                    actionButton.style.backgroundColor = '#A0522D';
                                });
                                
                                actionButton.addEventListener('mouseout', () => {
                                    actionButton.style.backgroundColor = '#8B4513';
                                });
                            } else {
                                this.showNotification('Purchase failed', 'error');
                            }
                        });
                }
            });
            
            rightPage.appendChild(actionButton);
        });
    }
    
    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {string} type - Notification type ('success', 'error', etc.)
     */
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'absolute';
        notification.style.bottom = '100px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = type === 'error' ? '#B71C1C' : '#8B4513';
        notification.style.color = '#f5e8c0';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'serif';
        notification.style.zIndex = '1001';
        
        document.body.appendChild(notification);
        
        // Remove after 2 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    }
    
    /**
     * Clean up all active renderers to prevent WebGL context limits
     */
    cleanupRenderers() {
        console.log(`Cleaning up ${this.animationFrameIds.length} animation frames and ${this.activeRenderers.length} renderers`);
        
        // Cancel all animation frames
        this.animationFrameIds.forEach(id => {
            if (id) cancelAnimationFrame(id);
        });
        this.animationFrameIds = [];
        
        // Run cleanup functions (e.g., remove event listeners)
        if (this.cleanupFunctions) {
            this.cleanupFunctions.forEach(cleanup => {
                if (typeof cleanup === 'function') {
                    cleanup();
                }
            });
            this.cleanupFunctions = [];
        }
        
        // Clean up 3D models (meshes, materials, textures)
        this.activeModels.forEach(model => {
            if (model) {
                // Traverse and dispose all geometries and materials
                model.traverse(object => {
                    if (object.isMesh) {
                        if (object.geometry) {
                            object.geometry.dispose();
                        }
                        
                        if (object.material) {
                            // If material is an array, dispose each one
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => {
                                    this.disposeMaterial(material);
                                });
                            } else {
                                this.disposeMaterial(object.material);
                            }
                        }
                    }
                });
            }
        });
        this.activeModels = [];
        
        // Clean up scenes
        this.activeScenes.forEach(scene => {
            if (scene) {
                // Remove all objects from the scene
                while (scene.children.length > 0) {
                    scene.remove(scene.children[0]);
                }
            }
        });
        this.activeScenes = [];
        
        // Dispose of all renderers
        this.activeRenderers.forEach(renderer => {
            if (renderer && renderer.domElement) {
                // Remove from DOM if still attached
                if (renderer.domElement.parentNode) {
                    renderer.domElement.parentNode.removeChild(renderer.domElement);
                }
                
                // Force context loss and dispose of resources
                if (renderer.info && renderer.info.memory) {
                    console.log(`Before cleanup: geometries=${renderer.info.memory.geometries}, textures=${renderer.info.memory.textures}`);
                }
                
                // Dispose of renderer resources
                renderer.dispose();
                
                // Force context loss
                if (typeof renderer.forceContextLoss === 'function') {
                    renderer.forceContextLoss();
                }
                
                // Help garbage collection
                renderer.renderLists.dispose();
                renderer = null;
            }
        });
        
        // Clear the array
        this.activeRenderers = [];
        
        // Suggest garbage collection
        if (window.gc) {
            window.gc();
        }
    }
    
    /**
     * Dispose of a material and its textures
     * @param {THREE.Material} material - The material to dispose
     */
    disposeMaterial(material) {
        if (!material) return;
        
        // Dispose textures
        Object.keys(material).forEach(prop => {
            if (!material[prop]) return;
            if (material[prop].isTexture) {
                material[prop].dispose();
            }
        });
        
        // Dispose material
        material.dispose();
    }
    
    /**
     * Create a mini renderer to show a side profile of a ship
     * @param {Element} container - The container to add the renderer to
     * @param {string} modelPath - Path to the GLB model
     * @param {string} shipId - Ship identifier
     */
    createShipRenderer(container, modelPath, shipId) {
        // Import THREE only when needed
        import('three').then((THREE) => {
            import('three/addons/loaders/GLTFLoader.js').then((GLTFLoaderModule) => {
                const GLTFLoader = GLTFLoaderModule.GLTFLoader;
                
                // Create a scene
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0xf5e8c0); // Match the parchment color
                
                // Track the scene for cleanup
                this.activeScenes.push(scene);
                
                // Create a camera for side view
                const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000); // Start with aspect ratio 1, will update
                camera.position.set(15, 0, 0); // Positioned at midline height
                camera.lookAt(0, 0, 0);
                
                // Create a renderer
                const renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.shadowMap.enabled = true;
                
                // Track this renderer for cleanup
                this.activeRenderers.push(renderer);
                
                // Add the renderer to the container
                container.innerHTML = '';
                container.appendChild(renderer.domElement);
                
                // Make renderer responsive to container size
                const resizeRenderer = () => {
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    
                    // Update renderer size
                    renderer.setSize(width, height);
                    
                    // Update camera aspect ratio
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    
                    // Render immediately to avoid flicker
                    if (scene && camera) {
                        renderer.render(scene, camera);
                    }
                };
                
                // Initial resize
                resizeRenderer();
                
                // Add window resize listener
                const handleResize = () => {
                    resizeRenderer();
                };
                window.addEventListener('resize', handleResize);
                
                // Store the event listener for cleanup
                const cleanup = () => {
                    window.removeEventListener('resize', handleResize);
                };
                this.cleanupFunctions = this.cleanupFunctions || [];
                this.cleanupFunctions.push(cleanup);
                
                // Add lights to the scene
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                scene.add(ambientLight);
                
                // Main directional light from above
                const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
                mainLight.position.set(0, 10, 0);
                mainLight.castShadow = true;
                scene.add(mainLight);
                
                // Side fill light (from the viewer's side)
                const sideLight = new THREE.DirectionalLight(0xffffff, 0.4);
                sideLight.position.set(5, 2, 0);
                scene.add(sideLight);
                
                // Back rim light (from behind)
                const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
                rimLight.position.set(-5, 3, 0);
                scene.add(rimLight);
                
                // Get ship scale and position adjustments based on ship type
                const shipAdjustments = {
                    'sloop': { 
                        scale: 0.85, 
                        posY: -0.5, 
                        posX: 0, 
                        rotation: Math.PI,
                        cameraPos: [15, 0, 0],
                        cameraFov: 30
                    },
                    'skiff': { 
                        scale: 0.85, 
                        posY: -0.3, 
                        posX: 0, 
                        rotation: Math.PI,
                        cameraPos: [14, 0, 0],
                        cameraFov: 28
                    },
                    'dinghy': { 
                        scale: 0.9, 
                        posY: -0.5, 
                        posX: 0, 
                        rotation: Math.PI,
                        cameraPos: [14, 0, 0],
                        cameraFov: 30
                    },
                    'cutter': { 
                        scale: 0.6, 
                        posY: 0, 
                        posX: 0, 
                        rotation: Math.PI,
                        cameraPos: [15, 0, 0],
                        cameraFov: 34
                    },
                    'brig': { 
                        scale: 0.4, 
                        posY: 0.5, 
                        posX: 0, 
                        rotation: Math.PI,
                        cameraPos: [16, 0, 0],
                        cameraFov: 36
                    }
                };
                
                const adjustment = shipAdjustments[shipId] || { 
                    scale: 0.8, 
                    posY: 0, 
                    posX: 0, 
                    rotation: Math.PI,
                    cameraPos: [15, 0, 0],
                    cameraFov: 32
                };
                
                // Apply camera settings specific to this ship type if available
                if (adjustment.cameraPos) {
                    camera.position.set(
                        adjustment.cameraPos[0],
                        adjustment.cameraPos[1], 
                        adjustment.cameraPos[2]
                    );
                }
                
                if (adjustment.cameraFov) {
                    camera.fov = adjustment.cameraFov;
                    camera.updateProjectionMatrix();
                }
                
                // Create loading message
                const loadingElement = document.createElement('div');
                loadingElement.textContent = 'Loading ship model...';
                loadingElement.style.position = 'absolute';
                loadingElement.style.top = '50%';
                loadingElement.style.left = '50%';
                loadingElement.style.transform = 'translate(-50%, -50%)';
                loadingElement.style.color = '#5D4037';
                loadingElement.style.fontFamily = 'serif';
                loadingElement.style.fontSize = '12px';
                container.appendChild(loadingElement);
                
                // Load the ship model
                const loader = new GLTFLoader();
                loader.load(
                    modelPath,
                    (gltf) => {
                        // Remove loading message
                        if (loadingElement.parentNode) {
                            loadingElement.parentNode.removeChild(loadingElement);
                        }
                        
                        const model = gltf.scene;
                        
                        // Track the model for cleanup
                        this.activeModels.push(model);
                        
                        // Apply adjustments for this ship type
                        model.scale.set(adjustment.scale, adjustment.scale, adjustment.scale);
                        model.position.y = adjustment.posY;
                        model.position.x = adjustment.posX;
                        model.rotation.y = adjustment.rotation;
                        
                        // Add a slight tilt to better see the ship from a slight angle
                        model.rotation.z = -0.05; // Slight tilt
                        
                        // Add shadows
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });
                        
                        // Add the model to the scene
                        scene.add(model);
                        
                        // Auto-center the model in the viewport by calculating its bounding box
                        // and adjusting its position
                        const centerModel = () => {
                            // Create a bounding box for the model
                            const boundingBox = new THREE.Box3().setFromObject(model);
                            const center = boundingBox.getCenter(new THREE.Vector3());
                            const size = boundingBox.getSize(new THREE.Vector3());
                            
                            // Adjust vertical position to center the model in the viewport
                            // by offsetting its center position
                            model.position.y = adjustment.posY - center.y;
                            
                            console.log(`Model centered: size=${size.y.toFixed(2)}, center=${center.y.toFixed(2)}, final pos=${model.position.y.toFixed(2)}`);
                        };
                        
                        // Center the model after a short delay to ensure it's fully loaded
                        setTimeout(centerModel, 100);
                        
                        // Render function
                        const render = () => {
                            // Continuous rotation of the ship model
                            if (model) {
                                // Rotate continuously around Y axis
                                // Speed factor controls rotation speed (higher = faster)
                                const time = Date.now() * 0.001;
                                const rotationSpeed = 0.3; // Rotation speed factor
                                model.rotation.y = time * rotationSpeed;
                            }
                            
                            renderer.render(scene, camera);
                            // Store animation frame ID for cleanup
                            const animId = requestAnimationFrame(render);
                            this.animationFrameIds.push(animId);
                        };
                        
                        render();
                    },
                    // Progress callback
                    (xhr) => {
                        const percent = xhr.loaded / xhr.total * 100;
                        loadingElement.textContent = `Loading: ${Math.round(percent)}%`;
                    },
                    // Error callback
                    (error) => {
                        console.error('Error loading ship model:', error);
                        loadingElement.textContent = 'Failed to load ship model';
                        loadingElement.style.color = 'red';
                    }
                );
            }).catch(error => {
                console.error('Failed to load GLTFLoader:', error);
                // Fallback to text if we can't load THREE
                container.innerHTML = `
                    <div style="display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column;">
                        <div style="font-family: serif; font-size: 24px; color: #5D4037; font-weight: bold;">${shipId.toUpperCase()}</div>
                        <div style="font-family: serif; font-size: 12px; color: #5D4037; margin-top: 5px;">${modelPath}</div>
                    </div>
                `;
            });
        }).catch(error => {
            console.error('Failed to load THREE:', error);
            // Fallback to text if we can't load THREE
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column;">
                    <div style="font-family: serif; font-size: 24px; color: #5D4037; font-weight: bold;">${shipId.toUpperCase()}</div>
                    <div style="font-family: serif; font-size: 12px; color: #5D4037; margin-top: 5px;">${modelPath}</div>
                </div>
            `;
        });
    }
}

export default Shipwright;