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
        menu.style.width = '600px'; // Wider than standard menus to look like an open book
        menu.style.height = '400px';
        menu.style.display = 'none';
        menu.style.zIndex = '1000'; // Use a high z-index value to ensure it's on top
        
        // Create book container with two pages
        const bookContainer = document.createElement('div');
        bookContainer.className = 'book-container';
        bookContainer.style.display = 'flex';
        bookContainer.style.width = '100%';
        bookContainer.style.height = '100%';
        bookContainer.style.backgroundColor = '#8B4513'; // Brown color for book cover
        bookContainer.style.borderRadius = '10px';
        bookContainer.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.5)';
        bookContainer.style.overflow = 'hidden';
        
        // Left page
        const leftPage = document.createElement('div');
        leftPage.className = 'book-page left-page';
        leftPage.style.flex = '1';
        leftPage.style.background = '#f5e8c0'; // Parchment-like color
        leftPage.style.padding = '20px';
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
        leftTitle.style.textAlign = 'center';
        leftTitle.style.marginBottom = '20px';
        leftPage.appendChild(leftTitle);
        
        // Ship selection container
        const shipSelectionContainer = document.createElement('div');
        shipSelectionContainer.style.width = '100%';
        shipSelectionContainer.style.display = 'flex';
        shipSelectionContainer.style.flexDirection = 'column';
        shipSelectionContainer.style.gap = '15px';
        
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
            nameElement.style.fontSize = '16px';
            nameElement.style.fontWeight = 'bold';
            nameElement.style.color = '#5D4037';
            infoContainer.appendChild(nameElement);
            
            // Ship description
            const descriptionElement = document.createElement('div');
            descriptionElement.textContent = ship.description;
            descriptionElement.style.fontFamily = 'serif';
            descriptionElement.style.fontSize = '12px';
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
        rightPage.style.padding = '20px';
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
        shipTitle.style.textAlign = 'center';
        shipTitle.style.marginBottom = '20px';
        rightPage.appendChild(shipTitle);
        
        // Ship model viewer container
        const shipViewerContainer = document.createElement('div');
        shipViewerContainer.style.width = '180px';
        shipViewerContainer.style.height = '130px'; // Restored to previous height
        shipViewerContainer.style.marginBottom = '15px'; // Restored margin
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
            nameCell.style.padding = '8px 4px';
            nameCell.style.fontWeight = 'bold';
            nameCell.style.fontSize = '14px';
            
            const valueCell = document.createElement('td');
            valueCell.textContent = stat.value;
            valueCell.style.padding = '8px 4px';
            valueCell.style.fontSize = '14px';
            valueCell.style.textAlign = 'right';
            
            row.appendChild(nameCell);
            row.appendChild(valueCell);
            statsTable.appendChild(row);
        });
        
        statsContainer.appendChild(statsTable);
        rightPage.appendChild(statsContainer);
        
        // "Purchase" or "Select" button
        const actionButton = document.createElement('button');
        actionButton.textContent = 'Select Ship';
        actionButton.style.background = '#8B4513';
        actionButton.style.color = '#f5e8c0';
        actionButton.style.border = 'none';
        actionButton.style.borderRadius = '5px';
        actionButton.style.padding = '8px 15px';
        actionButton.style.cursor = 'pointer';
        actionButton.style.fontFamily = 'serif';
        actionButton.style.fontSize = '16px';
        actionButton.style.marginTop = '10px';
        
        actionButton.addEventListener('mouseover', () => {
            actionButton.style.backgroundColor = '#A0522D';
        });
        
        actionButton.addEventListener('mouseout', () => {
            actionButton.style.backgroundColor = '#8B4513';
        });
        
        actionButton.addEventListener('click', () => {
            console.log(`Selected ship for purchase/use: ${ship.name}`);
            // Here you would implement the actual ship selection/purchase logic
            
            // Show a "coming soon" message for now
            const notification = document.createElement('div');
            notification.textContent = 'Coming soon!';
            notification.style.position = 'absolute';
            notification.style.bottom = '100px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.padding = '10px 20px';
            notification.style.backgroundColor = '#8B4513';
            notification.style.color = '#f5e8c0';
            notification.style.borderRadius = '5px';
            notification.style.fontFamily = 'serif';
            
            document.body.appendChild(notification);
            
            // Remove after 2 seconds
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 2000);
        });
        
        rightPage.appendChild(actionButton);
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
                const camera = new THREE.PerspectiveCamera(32, 180/130, 0.1, 1000);
                camera.position.set(15, 0, 0); // Positioned at midline height
                camera.lookAt(0, 0, 0);
                
                // Create a renderer
                const renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(180, 130);
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.shadowMap.enabled = true;
                
                // Track this renderer for cleanup
                this.activeRenderers.push(renderer);
                // Add the renderer to the container
                container.innerHTML = '';
                container.appendChild(renderer.domElement);
                
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