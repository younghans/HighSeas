/**
 * Shipwright menu component that displays as an open book in the center of the screen
 */
class Shipwright {
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
        
        // Firebase database references
        this.database = null;
        this.auth = null;
        this.playerRef = null;
        
        // Initialize Firebase references if available
        if (window.firebase && window.auth) {
            this.database = firebase.database();
            this.auth = window.auth;
            
            // Set up player reference if user is authenticated
            if (this.auth.currentUser) {
                this.playerRef = this.database.ref(`players/${this.auth.currentUser.uid}`);
            }
            
            // Listen for auth state changes
            this.auth.onAuthStateChanged(user => {
                if (user) {
                    this.playerRef = this.database.ref(`players/${user.uid}`);
                } else {
                    this.playerRef = null;
                }
            });
        }
        
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
            { 
                id: 'sloop', 
                name: 'Sloop', 
                description: 'A balanced ship with decent speed and maneuverability.',
                price: 0, // Free/default ship
                unlocked: true 
            },
            { 
                id: 'skiff', 
                name: 'Skiff', 
                description: 'Fast and nimble, but with less firepower.',
                price: 1000 
            },
            { 
                id: 'dinghy', 
                name: 'Dinghy', 
                description: 'Small and agile, perfect for beginners.',
                price: 800 
            },
            { 
                id: 'cutter', 
                name: 'Cutter', 
                description: 'A medium-sized vessel with good all-round capabilities.',
                price: 1500 
            },
            { 
                id: 'brig', 
                name: 'Brig', 
                description: 'Slow but powerful, with superior firepower.',
                price: 2000 
            }
        ];
        
        // Track player's unlocked ships
        this.playerUnlockedShips = ['sloop']; // Default: sloop is always unlocked
        this.currentShipType = 'sloop'; // Default ship
        this.playerGold = 0;

        // Load player's unlocked ships from Firebase
        this.loadPlayerShipData();
        
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
            
            // On hover effect
            shipItem.addEventListener('mouseover', () => {
                if (this.playerUnlockedShips.includes(ship.id)) {
                    shipItem.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
                } else {
                    shipItem.style.backgroundColor = 'rgba(139, 69, 19, 0.1)';
                }
            });
            
            shipItem.addEventListener('mouseout', () => {
                if (this.playerUnlockedShips.includes(ship.id)) {
                    shipItem.style.backgroundColor = 'rgba(139, 69, 19, 0.1)';
                } else {
                    shipItem.style.backgroundColor = 'rgba(100, 100, 100, 0.1)';
                }
            });
            
            // Image container for ship profile
            const imageContainer = document.createElement('div');
            imageContainer.style.width = '60px';
            imageContainer.style.height = '50px';
            imageContainer.style.marginRight = '10px';
            imageContainer.style.display = 'flex';
            imageContainer.style.justifyContent = 'center';
            imageContainer.style.alignItems = 'center';
            
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
            
            // Set initial style based on unlock status and add lock icon if ship is locked
            if (!this.playerUnlockedShips.includes(ship.id)) {
                shipItem.style.backgroundColor = 'rgba(100, 100, 100, 0.1)';
                shipItem.style.opacity = '0.8';
                
                // Add lock icon
                const lockIcon = document.createElement('div');
                lockIcon.innerHTML = '🔒';
                lockIcon.style.marginLeft = '10px';
                lockIcon.style.fontSize = '14px';
                infoContainer.appendChild(lockIcon);
                
                // Add price tag
                const priceTag = document.createElement('div');
                priceTag.textContent = `${ship.price} gold`;
                priceTag.style.fontSize = '12px';
                priceTag.style.color = '#FFD700';
                priceTag.style.marginTop = '2px';
                infoContainer.appendChild(priceTag);
            }
            
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
            menu.style.display = 'block';
        } else {
            console.error('Failed to find shipwrightMenu element!');
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
                speed: 8,
                maneuverability: 'Medium',
                health: 100,
                cannons: 'Standard',
                special: 'Balanced vessel'
            },
            'skiff': {
                speed: 9,
                maneuverability: 'High',
                health: 90,
                cannons: 'Light',
                special: 'Fast and agile'
            },
            'dinghy': {
                speed: 9,
                maneuverability: 'Very High',
                health: 100,
                cannons: 'Light',
                special: 'Extremely agile'
            },
            'cutter': {
                speed: 11,
                maneuverability: 'Medium',
                health: 100,
                cannons: 'Medium',
                special: 'Fast attacker'
            },
            'brig': {
                speed: 7,
                maneuverability: 'Low',
                health: 150,
                cannons: 'Heavy',
                special: 'High firepower'
            }
        };
        
        const attributes = shipAttributes[ship.id] || {
            speed: '?',
            maneuverability: '?',
            health: '?',
            cannons: '?',
            special: '?'
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
            { name: 'Maneuverability', value: attributes.maneuverability },
            { name: 'Hull Strength', value: attributes.health },
            { name: 'Cannons', value: attributes.cannons },
            { name: 'Special', value: attributes.special }
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
        
        // "Purchase" or "Select" button
        const actionButton = document.createElement('button');
        
        // Set button text based on whether the ship is unlocked or not
        const isUnlocked = this.playerUnlockedShips.includes(ship.id);
        const isCurrentShip = this.currentShipType === ship.id;
        
        if (isCurrentShip) {
            actionButton.textContent = 'Current Ship';
            actionButton.disabled = true;
            actionButton.style.backgroundColor = '#6B4513';
            actionButton.style.cursor = 'default';
        } else if (isUnlocked) {
            actionButton.textContent = 'Select Ship';
        } else {
            actionButton.textContent = `Purchase - ${ship.price} Gold`;
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
        
        // Only add hover effects if the button isn't disabled
        if (!isCurrentShip) {
            actionButton.addEventListener('mouseover', () => {
                actionButton.style.backgroundColor = '#A0522D';
            });
            
            actionButton.addEventListener('mouseout', () => {
                actionButton.style.backgroundColor = '#8B4513';
            });
        }
        
        actionButton.addEventListener('click', () => {
            // If Firebase isn't available or user isn't logged in, show error message
            if (!this.auth || !this.auth.currentUser || !this.playerRef) {
                this.showNotification('You must be logged in to purchase or select ships', 'error');
                return;
            }
            
            if (isCurrentShip) {
                // Already using this ship
                return;
            } else if (isUnlocked) {
                // Ship is already unlocked, select it
                this.selectShip(ship.id);
            } else {
                // Ship needs to be purchased
                this.purchaseShip(ship);
            }
        });
        
        rightPage.appendChild(actionButton);
        
        // Add a small note about current gold if this ship needs purchasing
        if (!isUnlocked) {
            const goldNote = document.createElement('div');
            goldNote.style.fontSize = '14px';
            goldNote.style.fontStyle = 'italic';
            goldNote.style.color = '#5D4037';
            goldNote.style.textAlign = 'center';
            goldNote.style.marginBottom = '10px';
            
            // Check if player has enough gold
            const hasEnoughGold = this.playerGold >= ship.price;
            
            if (hasEnoughGold) {
                goldNote.textContent = `You have ${this.playerGold} gold available`;
                goldNote.style.color = '#008000'; // Green color
            } else {
                goldNote.textContent = `You need ${ship.price - this.playerGold} more gold`;
                goldNote.style.color = '#FF0000'; // Red color
            }
            
            rightPage.appendChild(goldNote);
        }
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
    
    /**
     * Load player's ship data from Firebase
     */
    loadPlayerShipData() {
        if (!this.auth || !this.auth.currentUser || !this.playerRef) {
            console.log('Cannot load player ship data - not logged in');
            return;
        }
        
        this.playerRef.once('value').then(snapshot => {
            const playerData = snapshot.val();
            
            if (playerData) {
                // Set player gold
                this.playerGold = playerData.gold || 0;
                
                // Set current ship type
                if (playerData.modelType) {
                    this.currentShipType = playerData.modelType;
                }
                
                // Load unlocked ships
                if (playerData.unlockedShips && Array.isArray(playerData.unlockedShips)) {
                    this.playerUnlockedShips = playerData.unlockedShips;
                    
                    // Make sure sloop is always in the unlocked ships
                    if (!this.playerUnlockedShips.includes('sloop')) {
                        this.playerUnlockedShips.push('sloop');
                    }
                }
                
                console.log('Loaded player ship data:', {
                    gold: this.playerGold,
                    currentShip: this.currentShipType,
                    unlockedShips: this.playerUnlockedShips
                });
            }
        }).catch(error => {
            console.error('Error loading player ship data:', error);
        });
    }
    
    /**
     * Purchase a ship
     * @param {Object} ship - The ship to purchase
     */
    purchaseShip(ship) {
        // Check if player has enough gold
        if (this.playerGold < ship.price) {
            this.showNotification(`Not enough gold! You need ${ship.price - this.playerGold} more gold.`, 'error');
            return;
        }
        
        // Check if Firebase is available
        if (!window.firebase) {
            this.showNotification('Cannot connect to server. Try again later.', 'error');
            return;
        }
        
        // Show confirmation dialog
        if (confirm(`Are you sure you want to purchase the ${ship.name} for ${ship.price} gold?`)) {
            // Show loading notification
            this.showNotification(`Processing your purchase...`, 'info', 2000);
            
            // Use Firebase Cloud Function to securely handle the purchase
            const unlockShipFunction = firebase.functions().httpsCallable('unlockShip');
            
            unlockShipFunction({ shipId: ship.id })
                .then(result => {
                    // Get data from the function result
                    const data = result.data;
                    
                    if (data.success) {
                        // Update local data
                        this.playerGold = data.newGold;
                        this.playerUnlockedShips = data.unlockedShips;
                        
                        // Show success notification
                        this.showNotification(`Successfully purchased the ${ship.name}!`, 'success');
                        
                        // Trigger gold update event to refresh UI
                        const goldUpdatedEvent = new CustomEvent('playerGoldUpdated', {
                            detail: { gold: data.price }
                        });
                        document.dispatchEvent(goldUpdatedEvent);
                        
                        // Ask if player wants to select this ship
                        if (confirm(`Would you like to select the ${ship.name} as your current ship?`)) {
                            // If they want to select it, the menu will close in the selectShip method
                            this.selectShip(ship.id);
                        } else {
                            // Refresh the page to show updated unlock status
                            this.updateRightPage(document.querySelector('.right-page'), ship);
                        }
                    } else {
                        // Handle failure cases
                        if (data.alreadyOwned) {
                            this.showNotification(`You already own the ${ship.name}.`, 'info');
                            // Update local unlocked ships to include this ship
                            if (!this.playerUnlockedShips.includes(ship.id)) {
                                this.playerUnlockedShips.push(ship.id);
                                // Refresh the display
                                this.updateRightPage(document.querySelector('.right-page'), ship);
                            }
                        } else if (data.insufficientFunds) {
                            this.showNotification(`Not enough gold to purchase the ${ship.name}.`, 'error');
                        } else {
                            this.showNotification(data.message || 'Failed to purchase ship', 'error');
                        }
                    }
                })
                .catch(error => {
                    console.error('Error purchasing ship:', error);
                    this.showNotification(`Error: ${error.message || 'Failed to purchase ship'}`, 'error');
                });
        }
    }
    
    /**
     * Select a ship as the player's current ship
     * @param {string} shipId - The ID of the ship to select
     */
    selectShip(shipId) {
        // Check Firebase connection
        if (!this.auth || !this.auth.currentUser || !this.playerRef) {
            this.showNotification('Cannot connect to server. Try again later.', 'error');
            return;
        }
        
        // Check if ship is unlocked
        if (!this.playerUnlockedShips.includes(shipId)) {
            this.showNotification('You must purchase this ship first!', 'error');
            return;
        }
        
        // Show loading notification
        this.showNotification(`Preparing your ${shipId}...`, 'info', 2000);
        
        // Close the Shipwright menu
        this.hide();
        
        // Update Firebase first
        this.playerRef.update({
            modelType: shipId
        }).then(() => {
            // Update local data
            this.currentShipType = shipId;
            
            // Get current player's ship
            const playerShip = window.playerShip;
            
            if (!playerShip) {
                console.error('Player ship not found');
                this.showNotification('Unable to find your ship. Please rejoin the game.', 'error');
                return;
            }
            
            // Store current ship position and rotation
            const currentPosition = playerShip.getPosition().clone();
            const currentRotation = { y: playerShip.getObject().rotation.y };
            
            // Update the ship model type
            playerShip.modelType = shipId;
            
            // Get reference to scene
            const scene = playerShip.scene;
            
            try {
                // First, clean up the existing ship's resources
                console.log('Cleaning up existing ship mesh and resources');
                
                // Clean up the old ship's wake particle system if it exists
                if (playerShip.wakeParticleSystem) {
                    console.log('Cleaning up wake particle system');
                    if (typeof playerShip.wakeParticleSystem.cleanup === 'function') {
                        playerShip.wakeParticleSystem.cleanup();
                    } else if (typeof playerShip.wakeParticleSystem.dispose === 'function') {
                        playerShip.wakeParticleSystem.dispose();
                    }
                    playerShip.wakeParticleSystem = null;
                }
                
                // Clear health bar reference
                playerShip.healthBarContainer = null;
                playerShip.healthBarBackground = null;
                playerShip.healthBarForeground = null;
                
                // We don't need to explicitly remove the clickable sphere since it's a child of the ship mesh
                playerShip.clickBoxSphere = null;
                
                // Remove old ship mesh from scene
                if (playerShip.shipMesh) {
                    console.log('Removing old ship mesh from scene');
                    scene.remove(playerShip.shipMesh);
                    playerShip.shipMesh = null;
                }
                
                // Set loading state
                playerShip.isLoading = true;
                
                // Create the new ship with the selected model type
                console.log(`Creating new ship with model type: ${shipId}`);
                playerShip.createShip();
                
                // Set up a check to wait for ship loading to complete
                const checkShipLoaded = () => {
                    if (playerShip.isLoading) {
                        // Ship is still loading, check again after a delay
                        setTimeout(checkShipLoaded, 100);
                    } else {
                        // Ship has finished loading, restore position and rotation
                        console.log('Ship loaded, restoring position and rotation');
                        
                        // Restore position
                        playerShip.setPosition(currentPosition);
                        
                        // Restore rotation
                        if (playerShip.shipMesh) {
                            playerShip.shipMesh.rotation.y = currentRotation.y;
                            playerShip.rotation.y = currentRotation.y;
                        }
                        
                        // Create the clickable sphere for the new ship
                        if (typeof playerShip.createClickBoxSphere === 'function') {
                            playerShip.createClickBoxSphere();
                        }
                        
                        // Initialize wake particle system
                        playerShip.initWakeParticleSystem();
                        
                        // Create health bar
                        playerShip.createHealthBar();
                        
                        // If player health is not full, make health bar visible
                        if (playerShip.currentHealth < playerShip.maxHealth) {
                            playerShip.setHealthBarVisible(true);
                        }
                        
                        // Update game UI references if they exist
                        if (window.gameUI) {
                            window.gameUI.setPlayerShip(playerShip);
                            
                            // Update any ship stats displays
                            const event = new CustomEvent('playerShipUpdated', {
                                detail: { ship: playerShip }
                            });
                            document.dispatchEvent(event);
                        }
                        
                        // Update multiplayer data
                        if (window.multiplayerManager) {
                            window.multiplayerManager.updatePlayerPosition(playerShip, true);
                        }
                        
                        // Show success notification
                        this.showNotification(`You are now sailing a ${shipId}!`, 'success');
                        
                        // Refresh the ship display
                        document.querySelectorAll('.ship-item').forEach(item => {
                            if (item.textContent.toLowerCase().includes(shipId.toLowerCase())) {
                                item.click();
                            }
                        });
                    }
                };
                
                // Start checking if ship has loaded
                checkShipLoaded();
                
            } catch (error) {
                console.error('Error recreating ship:', error);
                this.showNotification('Failed to change ship. Please try again or rejoin the game.', 'error');
            }
        }).catch(error => {
            console.error('Error updating ship type in database:', error);
            this.showNotification('Failed to select ship. Please try again.', 'error');
        });
    }
    
    /**
     * Show a notification to the user
     * @param {string} message - The message to show
     * @param {string} type - The type of notification ('success', 'error', 'info')
     * @param {number} duration - How long to show the notification in ms (default: 3000)
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'serif';
        notification.style.fontSize = '16px';
        notification.style.zIndex = '2000';
        
        // Set colors based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                notification.style.color = 'white';
                break;
            case 'info':
            default:
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
                break;
        }
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
}

export default Shipwright;