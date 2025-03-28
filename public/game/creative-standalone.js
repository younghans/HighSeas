import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import IslandGenerator from './islands/IslandGenerator.js';
import PerlinNoise from './islands/PerlinNoise.js';
import World from './world.js';
import BuildingManager from './BuildingManager.js';
import GenericGLBModel from './objects/GenericGLBModel.js';
import { MODELS } from './ModelRegistry.js';

class CreativeStandalone {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.world = null;
        this.clock = new THREE.Clock();
        this.islandGenerator = null;
        this.currentIsland = null;
        this.animationFrameId = null;
        this.buildingManager = null;
        this.availableObjects = [];
        this.placedObjects = []; // Array to store information about placed objects
        
        // Default island parameters
        this.islandParams = {
            size: 400,
            resolution: 80, // Fixed resolution
            treeCount: 30,
            seed: Math.floor(Math.random() * 65536),
            noiseScale: 0.01,
            noiseHeight: 80,
            falloffFactor: 0.3
        };
    }
    
    async init() {
        // Create a new scene
        this.scene = new THREE.Scene();
        
        // Create a new renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
        this.camera.position.set(0, 200, 400);
        this.camera.lookAt(0, 0, 0);
        
        // Initialize world (sky, water, lighting, etc.)
        this.world = new World(this.scene);
        
        // Setup orbit controls for better viewing
        this.setupControls();
        
        // Initialize island generator
        this.islandGenerator = new IslandGenerator(this.scene);
        
        // Initialize building manager
        const buildingUIContainer = document.createElement('div');
        buildingUIContainer.id = 'buildingManagerUI';
        buildingUIContainer.style.position = 'absolute';
        buildingUIContainer.style.left = '20px';
        buildingUIContainer.style.bottom = '20px';
        buildingUIContainer.style.width = '300px';
        buildingUIContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        buildingUIContainer.style.color = 'white';
        buildingUIContainer.style.padding = '20px';
        buildingUIContainer.style.borderRadius = '10px';
        buildingUIContainer.style.display = 'none';
        buildingUIContainer.style.zIndex = '1000';
        document.body.appendChild(buildingUIContainer);
        
        this.buildingManager = new BuildingManager({
            scene: this.scene,
            camera: this.camera,
            islandGenerator: this.islandGenerator,
            world: this.world,
            uiContainer: buildingUIContainer,
            onInfoUpdate: (info) => {
                // Update the info panel with the provided information
                const infoElement = document.getElementById('info');
                if (infoElement) {
                    infoElement.innerHTML = `
                        <h2>${info.title}</h2>
                        <p>${info.message.replace(/\n/g, '</p><p>')}</p>
                    `;
                }
            },
            onBuildingPlaced: (buildingType, position, rotation) => {
                // Find the object that was just placed
                let placedObject = null;
                this.scene.traverse(object => {
                    // Check if this is a newly placed object at the specified position
                    if (object.type === 'Group' && 
                        Math.abs(object.position.x - position.x) < 0.1 &&
                        Math.abs(object.position.y - position.y) < 0.1 &&
                        Math.abs(object.position.z - position.z) < 0.1) {
                        placedObject = object;
                    }
                });
                
                // Tag the object with its type
                if (placedObject) {
                    placedObject.userData.type = buildingType;
                }
                
                // Track the placed object
                this.placedObjects.push({
                    type: buildingType,
                    position: {
                        x: position.x,
                        y: position.y,
                        z: position.z
                    },
                    rotation: rotation
                });
                
                console.log(`Placed ${buildingType} at position (${position.x}, ${position.y}, ${position.z}) with rotation ${rotation}`);
                console.log(`Total objects placed: ${this.placedObjects.length}`);
            }
        }).init();
        
        // Create UI
        this.createUI();
        
        // Generate initial island
        this.updateIslandPreview();
        
        // Create building UI
        await this.loadAvailableObjects();
        this.createBuildingUI();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Add click event listener for building placement
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
        
        // Start animation loop
        this.animate();
    }
    
    setupControls() {
        // Create orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = true;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 1000;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
        
        // Configure mouse buttons:
        // - LEFT: null (reserved for UI interactions)
        // - MIDDLE: DOLLY (zoom with mouse wheel click/drag)
        // - RIGHT: ROTATE (rotate camera with right-click drag)
        this.controls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        
        // Set the target to the center of the scene
        this.controls.target.set(0, 0, 0);
        
        // Update the controls
        this.controls.update();
    }
    
    createUI() {
        // Create info panel if it doesn't exist
        if (!document.getElementById('info')) {
            const infoElement = document.createElement('div');
            infoElement.id = 'info';
            infoElement.style.position = 'absolute';
            infoElement.style.top = '10px';
            infoElement.style.left = '10px';
            infoElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            infoElement.style.color = 'white';
            infoElement.style.padding = '5px';
            infoElement.style.borderRadius = '3px';
            infoElement.style.fontFamily = 'Arial, sans-serif';
            infoElement.style.fontSize = '10px';
            infoElement.style.zIndex = '1000';
            infoElement.innerHTML = `
                <h2>Island Creator</h2>
                <p>Create your island!</p>
            `;
            document.body.appendChild(infoElement);
        }
        
        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'creativeUI';
        uiContainer.style.position = 'absolute';
        uiContainer.style.right = '20px';
        uiContainer.style.top = '20px';
        uiContainer.style.width = '300px';
        uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        uiContainer.style.color = 'white';
        uiContainer.style.padding = '20px';
        uiContainer.style.borderRadius = '10px';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        uiContainer.style.zIndex = '1000';
        
        // Create UI content
        uiContainer.innerHTML = `
            <h2 style="text-align: center; margin-top: 0;">Island Creator</h2>
            
            <div style="margin-bottom: 15px;">
                <label for="islandName">Island Name:</label>
                <input type="text" id="islandName" value="My Custom Island" style="width: 100%; padding: 5px; margin-top: 5px; box-sizing: border-box;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="islandSize">Size: <span id="sizeValue">${this.islandParams.size}</span></label>
                <input type="range" id="islandSize" min="100" max="1000" value="${this.islandParams.size}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="islandTrees">Tree Count: <span id="treeValue">${this.islandParams.treeCount}</span></label>
                <input type="range" id="islandTrees" min="0" max="100" value="${this.islandParams.treeCount}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="islandSeed">Seed: <span id="seedValue">${this.islandParams.seed}</span></label>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="islandSeed" value="${this.islandParams.seed}" style="flex-grow: 1; padding: 5px;">
                    <button id="randomSeed" style="padding: 5px 10px;">Random</button>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="noiseScale">Noise Scale: <span id="noiseScaleValue">${this.islandParams.noiseScale.toFixed(4)}</span></label>
                <input type="range" id="noiseScale" min="0.001" max="0.02" step="0.001" value="${this.islandParams.noiseScale}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="noiseHeight">Height Scale: <span id="noiseHeightValue">${this.islandParams.noiseHeight}</span></label>
                <input type="range" id="noiseHeight" min="10" max="200" value="${this.islandParams.noiseHeight}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="falloffFactor">Edge Falloff: <span id="falloffValue">${this.islandParams.falloffFactor.toFixed(2)}</span></label>
                <input type="range" id="falloffFactor" min="0.1" max="1.0" step="0.05" value="${this.islandParams.falloffFactor}" style="width: 100%;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: space-between; margin-bottom: 10px;">
                <button id="saveIsland" style="padding: 10px; flex-grow: 1; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Save Island</button>
                <button id="loadIsland" style="padding: 10px; flex-grow: 1; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Load Island</button>
            </div>
            
            <div style="display: flex; justify-content: center;">
                <button id="exitCreator" style="padding: 10px; width: 100%; background-color: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">Exit Creator</button>
            </div>
        `;
        
        document.body.appendChild(uiContainer);
        
        // Add event listeners
        this.setupUIEventListeners();
    }
    
    setupUIEventListeners() {
        document.getElementById('islandSize').addEventListener('input', (e) => {
            this.islandParams.size = parseInt(e.target.value);
            document.getElementById('sizeValue').textContent = this.islandParams.size;
            this.updateIslandPreview();
        });
        
        document.getElementById('islandTrees').addEventListener('input', (e) => {
            this.islandParams.treeCount = parseInt(e.target.value);
            document.getElementById('treeValue').textContent = this.islandParams.treeCount;
            this.updateIslandPreview();
        });
        
        document.getElementById('islandSeed').addEventListener('change', (e) => {
            this.islandParams.seed = parseInt(e.target.value);
            document.getElementById('seedValue').textContent = this.islandParams.seed;
            this.updateIslandPreview();
        });
        
        document.getElementById('randomSeed').addEventListener('click', () => {
            this.islandParams.seed = Math.floor(Math.random() * 65536);
            document.getElementById('islandSeed').value = this.islandParams.seed;
            document.getElementById('seedValue').textContent = this.islandParams.seed;
            this.updateIslandPreview();
        });
        
        document.getElementById('noiseScale').addEventListener('input', (e) => {
            this.islandParams.noiseScale = parseFloat(e.target.value);
            document.getElementById('noiseScaleValue').textContent = this.islandParams.noiseScale.toFixed(4);
            this.updateIslandPreview();
        });
        
        document.getElementById('noiseHeight').addEventListener('input', (e) => {
            this.islandParams.noiseHeight = parseInt(e.target.value);
            document.getElementById('noiseHeightValue').textContent = this.islandParams.noiseHeight;
            this.updateIslandPreview();
        });
        
        document.getElementById('falloffFactor').addEventListener('input', (e) => {
            this.islandParams.falloffFactor = parseFloat(e.target.value);
            document.getElementById('falloffValue').textContent = this.islandParams.falloffFactor.toFixed(2);
            this.updateIslandPreview();
        });
        
        document.getElementById('saveIsland').addEventListener('click', () => {
            this.saveIsland();
        });
        
        document.getElementById('loadIsland').addEventListener('click', () => {
            this.promptLoadIsland();
        });
        
        document.getElementById('exitCreator').addEventListener('click', () => {
            this.exit();
        });
    }
    
    updateIslandPreview() {
        // Remove previous island and trees
        if (this.currentIsland) {
            // Find and remove all trees (which are children of the scene, not the island)
            const treesToRemove = [];
            this.scene.traverse(object => {
                // Identify trees by checking if they're groups with specific children
                if (object.type === 'Group' && 
                    object.children.length === 2 && 
                    object.children[0].geometry instanceof THREE.CylinderGeometry &&
                    object.children[1].geometry instanceof THREE.SphereGeometry) {
                    treesToRemove.push(object);
                }
            });
            
            // Remove trees
            treesToRemove.forEach(tree => {
                this.scene.remove(tree);
            });
            
            // Remove the island
            this.scene.remove(this.currentIsland);
            this.currentIsland = null;
            
            // Clear placed objects array and remove them from the scene
            this.removeAllPlacedObjects();
        }
        
        // Create new geometry with current parameters
        const geometry = new THREE.PlaneGeometry(
            this.islandParams.size,
            this.islandParams.size,
            this.islandParams.resolution,
            this.islandParams.resolution
        );
        
        // Create a new PerlinNoise instance with the current seed
        const noise = new PerlinNoise(this.islandParams.seed);
        
        // Create a new island generator with the custom noise
        const tempGenerator = new IslandGenerator(this.scene, noise);
        
        // Override the default noise parameters
        const originalGenerateCustomIsland = tempGenerator.generateCustomIsland;
        tempGenerator.generateCustomIsland = (position, customGeometry, numTrees) => {
            const positions = customGeometry.attributes.position;
            const colors = new Float32Array(positions.count * 3);
            
            // Use custom noise scale and height
            const noiseScale = this.islandParams.noiseScale;
            const falloffFactor = this.islandParams.falloffFactor;
            
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const distance = Math.sqrt(x * x + y * y);
                
                // Scale the falloff based on the island size
                const maxDimension = Math.max(this.islandParams.size, this.islandParams.size) / 2;
                const scaledDistance = distance / maxDimension * 200; // Scale relative to a 400x400 island
                const height = noise.perlin((x + position.x) * noiseScale, (y + position.z) * noiseScale) * 
                               this.islandParams.noiseHeight - scaledDistance * falloffFactor;
                
                positions.setZ(i, height);
                
                const color = new THREE.Color();
                if (height <= 10) {
                    color.set(0xC2B280); // Sandy color
                } else {
                    color.set(0x6B8E23); // Green color
                }
                
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            
            customGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            customGeometry.computeVertexNormals();
            
            // Create and position the island mesh
            const islandMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
            const island = new THREE.Mesh(customGeometry, islandMaterial);
            island.rotation.x = -Math.PI / 2;
            island.position.set(position.x, -5, position.z);
            this.scene.add(island);
            
            // Place trees on the island
            tempGenerator._placeTrees(island, customGeometry, numTrees);
            
            return island;
        };
        
        // Generate the new island
        this.currentIsland = tempGenerator.generateCustomIsland(
            new THREE.Vector3(0, 0, 0),
            geometry,
            this.islandParams.treeCount
        );
        
        // Add this island to the main islandGenerator's collection
        // This ensures the BuildingManager can find it
        this.islandGenerator.islands = [this.currentIsland];
        
        // Update the building manager to work with this island
        if (this.buildingManager) {
            // Update the islandGenerator reference
            this.buildingManager.islandGenerator = this.islandGenerator;
        }
    }
    
    removeAllPlacedObjects() {
        // Find all placed objects in the scene
        const objectsToRemove = [];
        this.scene.traverse(object => {
            // Check for any placed object with a type in userData
            if (object.type === 'Group' && object.userData && object.userData.type) {
                objectsToRemove.push(object);
            }
        });
        
        // Remove all found objects
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
        });
        
        // Clear the placed objects array
        this.placedObjects = [];
    }
    
    async loadAvailableObjects() {
        try {
            // Create an array to hold our available objects
            this.availableObjects = [];
            
            // Add custom model types first (these need special handling)
            const customModulePromises = [
                import('./objects/market-stall.js').then(module => {
                    this.availableObjects.push({
                        name: 'Market Stall',
                        id: 'marketStall',
                        constructor: module.default
                    });
                }),
                import('./objects/dock.js').then(module => {
                    this.availableObjects.push({
                        name: 'Dock',
                        id: 'dock',
                        constructor: module.default
                    });
                })
            ];
            
            // Wait for custom modules to load
            await Promise.all(customModulePromises);
            
            // Add GLB models from the registry
            for (const [id, model] of Object.entries(MODELS)) {
                // Skip custom models that were already added
                if (model.isCustom) continue;
                
                // Create a constructor function for this GLB model
                const constructor = (options) => {
                    return new GenericGLBModel({
                        ...options,
                        modelPath: model.path,
                        scale: model.scale || 1,
                        type: id,
                        userData: { type: id }
                    });
                };
                
                // Add to available objects
                this.availableObjects.push({
                    name: model.name,
                    id,
                    constructor
                });
                
                console.log(`Registered model: ${model.name}`);
            }
            
            console.log(`Loaded ${this.availableObjects.length} objects`);
        } catch (error) {
            console.error('Error loading available objects:', error);
        }
    }
    
    createBuildingUI() {
        // Create building UI container
        const buildingUIContainer = document.createElement('div');
        buildingUIContainer.id = 'buildingUI';
        buildingUIContainer.style.position = 'absolute';
        buildingUIContainer.style.bottom = '20px';
        buildingUIContainer.style.left = '50%';
        buildingUIContainer.style.transform = 'translateX(-50%)';
        buildingUIContainer.style.display = 'flex';
        buildingUIContainer.style.gap = '10px';
        buildingUIContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        buildingUIContainer.style.padding = '10px';
        buildingUIContainer.style.borderRadius = '10px';
        buildingUIContainer.style.zIndex = '1000';
        
        // Create a button for each available model from MODELS registry
        Object.values(MODELS).forEach(model => {
            const button = document.createElement('button');
            button.textContent = model.name;
            button.style.padding = '10px 15px';
            button.style.backgroundColor = '#4a6d8c';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.style.cursor = 'pointer';
            button.style.transition = 'background-color 0.3s';
            
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#5a8dac';
            });
            
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#4a6d8c';
            });
            
            button.addEventListener('click', () => {
                this.enterBuildMode(model.id);
            });
            
            buildingUIContainer.appendChild(button);
        });
        
        // Add a separator
        const separator = document.createElement('div');
        separator.style.width = '1px';
        separator.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        separator.style.margin = '0 5px';
        buildingUIContainer.appendChild(separator);
        
        // Add Clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.style.padding = '10px 15px';
        clearButton.style.backgroundColor = '#d9534f';
        clearButton.style.color = 'white';
        clearButton.style.border = 'none';
        clearButton.style.borderRadius = '5px';
        clearButton.style.cursor = 'pointer';
        clearButton.style.transition = 'background-color 0.3s';
        
        clearButton.addEventListener('mouseover', () => {
            clearButton.style.backgroundColor = '#c9302c';
        });
        
        clearButton.addEventListener('mouseout', () => {
            clearButton.style.backgroundColor = '#d9534f';
        });
        
        clearButton.addEventListener('click', () => {
            this.removeAllPlacedObjects();
        });
        
        buildingUIContainer.appendChild(clearButton);
        
        document.body.appendChild(buildingUIContainer);
    }
    
    enterBuildMode(objectId) {
        // Enter build mode
        this.buildingManager.enterBuildMode({
            context: {
                type: 'creative',
                island: this.currentIsland
            }
        });
        
        // Make sure the building manager can find our island
        this.buildingManager.islandGenerator.islands = [this.currentIsland];
        
        // Select the building type
        this.buildingManager.selectBuildingType(objectId);
        
        // No need to force update of the preview position -
        // the BuildingManager's mouse movement handler will do this automatically
    }
    
    onMouseClick(event) {
        // Only handle left clicks
        if (event.button !== 0) return;
        
        // Update mouse position
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Create a raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        // Check if the click should be handled by build mode
        if (this.buildingManager && this.buildingManager.handleClick(raycaster)) {
            return; // Click was handled by build mode
        }
    }
    
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        
        // Update world (sky, water, lighting, etc.)
        if (this.world) {
            this.world.update(delta);
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    saveIsland() {
        // Get the island name
        const islandName = document.getElementById('islandName').value || 'My Custom Island';
        
        // Create the island data object
        const islandData = {
            name: islandName,
            params: { ...this.islandParams },
            createdAt: new Date().toISOString(),
            placedObjects: this.placedObjects
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(islandData, null, 2);
        
        // Create a blob and download link
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `${islandName.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    async promptLoadIsland() {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Add event listener for when a file is selected
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const islandData = JSON.parse(e.target.result);
                    await this.loadIsland(islandData);
                } catch (error) {
                    console.error('Error loading island:', error);
                    alert('Error loading island: ' + error.message);
                }
            };
            reader.readAsText(file);
            
            // Clean up
            document.body.removeChild(fileInput);
        });
        
        // Trigger the file dialog
        fileInput.click();
    }
    
    async loadIsland(islandData) {
        try {
            // Set island parameters from the loaded data
            this.islandParams = { ...islandData.params };
            
            // Update UI elements with the loaded parameters
            document.getElementById('islandName').value = islandData.name;
            document.getElementById('islandSize').value = this.islandParams.size;
            document.getElementById('sizeValue').textContent = this.islandParams.size;
            document.getElementById('islandTrees').value = this.islandParams.treeCount;
            document.getElementById('treeValue').textContent = this.islandParams.treeCount;
            document.getElementById('islandSeed').value = this.islandParams.seed;
            document.getElementById('seedValue').textContent = this.islandParams.seed;
            document.getElementById('noiseScale').value = this.islandParams.noiseScale;
            document.getElementById('noiseScaleValue').textContent = this.islandParams.noiseScale.toFixed(4);
            document.getElementById('noiseHeight').value = this.islandParams.noiseHeight;
            document.getElementById('noiseHeightValue').textContent = this.islandParams.noiseHeight;
            document.getElementById('falloffFactor').value = this.islandParams.falloffFactor;
            document.getElementById('falloffValue').textContent = this.islandParams.falloffFactor.toFixed(2);
            
            // Generate the island with the loaded parameters
            this.updateIslandPreview();
            
            // If there are placed objects in the data, ensure all required object types are loaded
            if (islandData.placedObjects && Array.isArray(islandData.placedObjects)) {
                // Get a list of all unique object types in the saved data
                const requiredObjectTypes = [...new Set(islandData.placedObjects.map(obj => obj.type))];
                
                // Check if all required object types are loaded
                const missingTypes = requiredObjectTypes.filter(type => 
                    !this.availableObjects.some(obj => obj.id === type)
                );
                
                if (missingTypes.length > 0) {
                    console.warn(`Missing object types: ${missingTypes.join(', ')}. Some objects may not be recreated.`);
                }
                
                // Recreate each placed object
                for (const objData of islandData.placedObjects) {
                    await this.recreatePlacedObject(objData);
                }
            }
        } catch (error) {
            console.error('Error loading island:', error);
            throw error;
        }
    }
    
    async recreatePlacedObject(objData) {
        // Find the constructor for this object type
        const objectInfo = this.availableObjects.find(obj => obj.id === objData.type);
        
        if (!objectInfo) {
            console.error(`Unknown object type: ${objData.type}`);
            return;
        }
        
        // Create position vector
        const position = new THREE.Vector3(
            objData.position.x,
            objData.position.y,
            objData.position.z
        );
        
        // Create the object using the dynamically loaded constructor
        const params = {
            position: position,
            rotation: objData.rotation
        };
        
        // Add additional parameters based on object type
        if (objData.type === 'marketStall') {
            params.detailLevel = 0.8;
        } else if (objData.type === 'tradingHouse') {
            // Any special parameters for Trading House can be added here
        }
        
        try {
            // Create the object using the constructor from availableObjects
            const newObject = new objectInfo.constructor(params);
            
            if (newObject) {
                // Get the Three.js object
                const threeObject = newObject.getObject();
                
                // Tag it with the type for later identification
                threeObject.userData.type = objData.type;
                
                // Add it to the scene
                this.scene.add(threeObject);
                
                // Add to the placed objects array
                this.placedObjects.push(objData);
            }
        } catch (error) {
            console.error(`Error recreating object of type ${objData.type}:`, error);
        }
    }
    
    exit() {
        // Clean up
        this.cleanup();
        
        // Redirect to main page or reload
        window.location.href = '../';
    }
    
    cleanup() {
        // Remove UI
        const uiElement = document.getElementById('creativeUI');
        if (uiElement) {
            uiElement.remove();
        }
        
        // Remove building UI
        const buildingUIElement = document.getElementById('buildingUI');
        if (buildingUIElement) {
            buildingUIElement.remove();
        }
        
        // Remove building manager UI
        const buildingManagerUIElement = document.getElementById('buildingManagerUI');
        if (buildingManagerUIElement) {
            buildingManagerUIElement.remove();
        }
        
        // Remove info panel
        const infoElement = document.getElementById('info');
        if (infoElement) {
            infoElement.remove();
        }
        
        // Clean up building manager
        if (this.buildingManager) {
            this.buildingManager.cleanup();
        }
        
        // Remove click event listener
        this.renderer.domElement.removeEventListener('click', this.onMouseClick.bind(this));
        
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        
        // Dispose of controls
        if (this.controls) {
            this.controls.dispose();
        }
        
        // Remove renderer from DOM
        if (this.renderer && this.renderer.domElement) {
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
        }
        
        // Dispose of geometries and materials
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}

export default CreativeStandalone; 