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
        this.waterVisible = true; // Add water visibility state
        
        // Default island parameters
        this.islandParams = {
            size: 400,
            resolution: 80, // Fixed resolution
            seed: Math.floor(Math.random() * 65536),
            noiseScale: 0.01,
            noiseHeight: 80,
            falloffFactor: 0.3
        };
        
        // Island type and object configuration
        this.islandType = 'forest'; // 'forest', 'rock', or 'plain'
        this.objectConfig = {
            forest: {
                count: 10,
                distribution: {
                    firTreeLarge: 35,
                    firTreeMedium: 45,
                    firTreeSmall: 20
                }
            },
            rock: {
                count: 8,
                distribution: {
                    stoneLarge2: 25,
                    stoneLarge3: 25,
                    stoneLarge4: 25,
                    stoneLarge5: 25
                }
            },
            plain: {
                count: 3,
                distribution: {
                    firTreeLarge: 50,
                    stoneLarge2: 50
                }
            }
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
                <label for="islandType">Island Type:</label>
                <select id="islandType" style="width: 100%; padding: 5px; margin-top: 5px;">
                    <option value="forest" ${this.islandType === 'forest' ? 'selected' : ''}>Forest</option>
                    <option value="rock" ${this.islandType === 'rock' ? 'selected' : ''}>Rock</option>
                    <option value="plain" ${this.islandType === 'plain' ? 'selected' : ''}>Plain</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="islandSize">Size: <span id="sizeValue">${this.islandParams.size}</span></label>
                <input type="range" id="islandSize" min="50" max="400" value="${this.islandParams.size}" style="width: 100%;">
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
                <input type="range" id="noiseScale" min="0.001" max="0.01" step="0.001" value="${this.islandParams.noiseScale}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="noiseHeight">Height Scale: <span id="noiseHeightValue">${this.islandParams.noiseHeight}</span></label>
                <input type="range" id="noiseHeight" min="0" max="100" value="${this.islandParams.noiseHeight}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="falloffFactor">Edge Falloff: <span id="falloffValue">${this.islandParams.falloffFactor.toFixed(2)}</span></label>
                <input type="range" id="falloffFactor" min="0" max="0.2" step="0.01" value="${this.islandParams.falloffFactor}" style="width: 100%;">
            </div>
            
            <div id="objectConfig" style="margin-bottom: 20px; border: 1px solid #555; padding: 10px; border-radius: 5px;">
                <h3 style="margin-top: 0; margin-bottom: 10px;">Object Configuration</h3>
                
                <div style="margin-bottom: 15px;">
                    <label for="objectCount">Object Count: <span id="objectCountValue">${this.objectConfig[this.islandType].count}</span></label>
                    <input type="range" id="objectCount" min="0" max="60" value="${this.objectConfig[this.islandType].count}" style="width: 100%;">
                </div>
                
                <div id="distributionControls">
                    <!-- Distribution controls will be populated by JavaScript -->
                </div>
                
                <button id="generateObjects" style="padding: 8px; width: 100%; background-color: #6a9bd1; color: white; border: none; border-radius: 3px; cursor: pointer; margin-top: 10px;">Generate Objects</button>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <button id="toggleWater" style="padding: 10px; width: 100%; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Water: On</button>
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
        
        // Initialize distribution controls
        this.updateDistributionControls();
    }
    
    setupUIEventListeners() {
        document.getElementById('islandSize').addEventListener('input', (e) => {
            this.islandParams.size = parseInt(e.target.value);
            document.getElementById('sizeValue').textContent = this.islandParams.size;
            this.updateIslandPreview();
        });
        
        document.getElementById('islandType').addEventListener('change', (e) => {
            this.islandType = e.target.value;
            this.updateDistributionControls();
            this.updateObjectCountDisplay();
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
        
        document.getElementById('objectCount').addEventListener('input', (e) => {
            this.objectConfig[this.islandType].count = parseInt(e.target.value);
            document.getElementById('objectCountValue').textContent = this.objectConfig[this.islandType].count;
        });
        
        document.getElementById('generateObjects').addEventListener('click', () => {
            this.generateIslandObjects();
        });
        
        document.getElementById('toggleWater').addEventListener('click', () => {
            this.toggleWater();
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
            

            
            return island;
        };
        
        // Generate the new island
        this.currentIsland = tempGenerator.generateCustomIsland(
            new THREE.Vector3(0, 0, 0),
            geometry
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
    
    updateDistributionControls() {
        const distributionContainer = document.getElementById('distributionControls');
        if (!distributionContainer) return;
        
        const config = this.objectConfig[this.islandType];
        const objectTypes = Object.keys(config.distribution);
        
        distributionContainer.innerHTML = '';
        
        objectTypes.forEach(objectType => {
            const controlDiv = document.createElement('div');
            controlDiv.style.marginBottom = '10px';
            
            const modelName = this.getModelDisplayName(objectType);
            
            controlDiv.innerHTML = `
                <label for="${objectType}Slider" style="display: block; margin-bottom: 5px; font-size: 12px;">${modelName}: <span id="${objectType}Value">${config.distribution[objectType]}</span>%</label>
                <input type="range" id="${objectType}Slider" min="0" max="100" value="${config.distribution[objectType]}" style="width: 100%;">
            `;
            
            distributionContainer.appendChild(controlDiv);
            
            // Add event listener for this slider
            const slider = document.getElementById(`${objectType}Slider`);
            slider.addEventListener('input', (e) => {
                const newValue = parseInt(e.target.value);
                this.objectConfig[this.islandType].distribution[objectType] = newValue;
                document.getElementById(`${objectType}Value`).textContent = newValue;
                this.normalizeDistribution(objectType);
            });
        });
    }
    
    getModelDisplayName(objectType) {
        const displayNames = {
            'firTreeLarge': 'Large Fir Tree',
            'firTreeMedium': 'Medium Fir Tree',
            'firTreeSmall': 'Small Fir Tree',
            'stoneLarge2': 'Large Stone 2',
            'stoneLarge3': 'Large Stone 3',
            'stoneLarge4': 'Large Stone 4',
            'stoneLarge5': 'Large Stone 5'
        };
        return displayNames[objectType] || objectType;
    }
    
    normalizeDistribution(changedObjectType) {
        const config = this.objectConfig[this.islandType];
        const objectTypes = Object.keys(config.distribution);
        
        // Calculate total of all other types
        let totalOthers = 0;
        objectTypes.forEach(type => {
            if (type !== changedObjectType) {
                totalOthers += config.distribution[type];
            }
        });
        
        const changedValue = config.distribution[changedObjectType];
        const remainingPercentage = 100 - changedValue;
        
        if (totalOthers > 0 && remainingPercentage >= 0) {
            // Proportionally adjust other values
            const scaleFactor = remainingPercentage / totalOthers;
            
            objectTypes.forEach(type => {
                if (type !== changedObjectType) {
                    const newValue = Math.round(config.distribution[type] * scaleFactor);
                    config.distribution[type] = newValue;
                    
                    // Update UI
                    const slider = document.getElementById(`${type}Slider`);
                    const valueSpan = document.getElementById(`${type}Value`);
                    if (slider && valueSpan) {
                        slider.value = newValue;
                        valueSpan.textContent = newValue;
                    }
                }
            });
        }
    }
    
    updateObjectCountDisplay() {
        const objectCountSlider = document.getElementById('objectCount');
        const objectCountValue = document.getElementById('objectCountValue');
        
        if (objectCountSlider && objectCountValue) {
            objectCountSlider.value = this.objectConfig[this.islandType].count;
            objectCountValue.textContent = this.objectConfig[this.islandType].count;
        }
    }
    
    async generateIslandObjects() {
        if (!this.currentIsland) {
            console.warn('No island available for object placement');
            return;
        }
        
        // Clear existing generated objects (keep manually placed ones)
        this.removeGeneratedObjects();
        
        const config = this.objectConfig[this.islandType];
        const objectTypes = Object.keys(config.distribution);
        
        // Calculate how many of each type to place
        const objectsToPlace = [];
        objectTypes.forEach(objectType => {
            const percentage = config.distribution[objectType] / 100;
            const count = Math.round(config.count * percentage);
            
            for (let i = 0; i < count; i++) {
                objectsToPlace.push(objectType);
            }
        });
        
        // Shuffle the array for random placement
        for (let i = objectsToPlace.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [objectsToPlace[i], objectsToPlace[j]] = [objectsToPlace[j], objectsToPlace[i]];
        }
        
        // Place objects on the island
        for (const objectType of objectsToPlace) {
            await this.placeObjectOnTerrain(objectType);
        }
    }
    
    removeGeneratedObjects() {
        const objectsToRemove = [];
        this.scene.traverse(object => {
            if (object.userData && object.userData.isGenerated) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
        });
        
        // Remove generated objects from placedObjects array
        this.placedObjects = this.placedObjects.filter(obj => !obj.isGenerated);
    }
    
    async placeObjectOnTerrain(objectType) {
        if (!this.currentIsland) return;
        
        const islandSize = this.islandParams.size;
        const maxAttempts = 50;
        let position = null;
        
        // Create a raycaster for finding surface positions (same as BuildingManager)
        const raycaster = new THREE.Raycaster();
        
        // Try to find a good position on the terrain using raycasting
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate random position within island bounds
            const x = (Math.random() - 0.5) * islandSize * 0.8; // Stay within 80% of island
            const z = (Math.random() - 0.5) * islandSize * 0.8;
            
            // Cast a ray downward from above the island to find the surface
            const rayOrigin = new THREE.Vector3(x, 200, z); // Start from high above
            const rayDirection = new THREE.Vector3(0, -1, 0); // Point downward
            
            raycaster.set(rayOrigin, rayDirection);
            
            // Check for intersections with the island
            const intersects = raycaster.intersectObject(this.currentIsland);
            
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const surfacePoint = intersection.point;
                
                // Check if the point is on land (above water level) and not too steep
                if (surfacePoint.y > 2 && surfacePoint.y < 100) {
                    position = surfacePoint.clone();
                    console.log(`✅ Found position for ${objectType} after ${attempt + 1} attempts at (${x.toFixed(1)}, ${surfacePoint.y.toFixed(1)}, ${z.toFixed(1)})`);
                    break;
                }
            }
        }
        
        if (!position) {
            console.warn(`❌ Could not find suitable position for ${objectType} after ${maxAttempts} attempts`);
            return;
        }
        
        // Create the object
        const objectInfo = this.availableObjects.find(obj => obj.id === objectType);
        if (!objectInfo) {
            console.warn(`Object type ${objectType} not found in available objects`);
            return;
        }
        
        try {
            const rotation = Math.random() * Math.PI * 2; // Random rotation
            
            // Create the object with an onLoad callback for GLB models
            // Note: objectInfo.constructor is an arrow function that returns the GenericGLBModel instance
            const newObject = objectInfo.constructor({
                position: position,
                rotation: rotation,
                onLoad: (group, gltf) => {
                    // Model has finished loading
                    console.log(`${objectType} loaded successfully at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
                }
            });
            
            if (newObject) {
                const threeObject = newObject.getObject ? newObject.getObject() : newObject;
                threeObject.userData.type = objectType;
                threeObject.userData.isGenerated = true; // Mark as generated
                
                this.scene.add(threeObject);
                
                // Add to placed objects array
                this.placedObjects.push({
                    type: objectType,
                    position: {
                        x: position.x,
                        y: position.y,
                        z: position.z
                    },
                    rotation: rotation,
                    isGenerated: true
                });
            }
        } catch (error) {
            console.error(`Error creating object ${objectType}:`, error);
        }
    }
    
    sampleTerrainHeight(x, z, debug = false) {
        if (!this.currentIsland || !this.currentIsland.geometry) {
            if (debug) console.log('No island or geometry available');
            return 0;
        }
        
        const geometry = this.currentIsland.geometry;
        const positions = geometry.attributes.position;
        const size = this.islandParams.size;
        const resolution = this.islandParams.resolution;
        
        // Convert world position to geometry coordinates
        const localX = x + size / 2;
        const localZ = z + size / 2;
        
        // Convert to grid coordinates
        const gridX = (localX / size) * resolution;
        const gridZ = (localZ / size) * resolution;
        
        // Find the nearest vertex
        const nearestX = Math.round(gridX);
        const nearestZ = Math.round(gridZ);
        
        // Make sure we're within bounds
        if (nearestX < 0 || nearestX >= resolution + 1 || nearestZ < 0 || nearestZ >= resolution + 1) {
            if (debug) {
                console.log('Position out of bounds:', {
                    inputPosition: { x, z },
                    localPosition: { localX, localZ },
                    gridPosition: { gridX, gridZ },
                    nearestVertex: { nearestX, nearestZ },
                    bounds: { resolution, maxVertex: resolution + 1 }
                });
            }
            return 0;
        }
        
        // Calculate vertex index
        const index = nearestZ * (resolution + 1) + nearestX;
        
        if (index < positions.count) {
            const height = positions.getZ(index);
            if (debug) {
                console.log('Terrain sampling:', {
                    inputPosition: { x, z },
                    localPosition: { localX, localZ },
                    gridPosition: { gridX, gridZ },
                    nearestVertex: { nearestX, nearestZ },
                    vertexIndex: index,
                    sampledHeight: height,
                    totalVertices: positions.count
                });
            }
            return height;
        }
        
        if (debug) console.log('Index out of range:', { index, maxCount: positions.count });
        return 0;
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
                        constructor: (options) => new module.default(options)
                    });
                }),
                import('./objects/dock.js').then(module => {
                    this.availableObjects.push({
                        name: 'Dock',
                        id: 'dock',
                        constructor: (options) => new module.default(options)
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
            islandType: this.islandType,
            objectConfig: JSON.parse(JSON.stringify(this.objectConfig)), // Deep copy
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
            
            // Load island type and object configuration if available
            if (islandData.islandType) {
                this.islandType = islandData.islandType;
            }
            if (islandData.objectConfig) {
                this.objectConfig = JSON.parse(JSON.stringify(islandData.objectConfig)); // Deep copy
            }
            
            // Update UI elements with the loaded parameters
            document.getElementById('islandName').value = islandData.name;
            document.getElementById('islandType').value = this.islandType;
            document.getElementById('islandSize').value = this.islandParams.size;
            document.getElementById('sizeValue').textContent = this.islandParams.size;
            document.getElementById('islandSeed').value = this.islandParams.seed;
            document.getElementById('seedValue').textContent = this.islandParams.seed;
            document.getElementById('noiseScale').value = this.islandParams.noiseScale;
            document.getElementById('noiseScaleValue').textContent = this.islandParams.noiseScale.toFixed(4);
            document.getElementById('noiseHeight').value = this.islandParams.noiseHeight;
            document.getElementById('noiseHeightValue').textContent = this.islandParams.noiseHeight;
            document.getElementById('falloffFactor').value = this.islandParams.falloffFactor;
            document.getElementById('falloffValue').textContent = this.islandParams.falloffFactor.toFixed(2);
            
            // Update object configuration UI
            this.updateDistributionControls();
            this.updateObjectCountDisplay();
            
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
    
    // Add a new method to toggle water visibility
    toggleWater() {
        if (this.world && this.world.getWater()) {
            this.waterVisible = !this.waterVisible;
            const water = this.world.getWater();
            water.visible = this.waterVisible;
            
            // Update the button text
            const toggleButton = document.getElementById('toggleWater');
            if (toggleButton) {
                toggleButton.textContent = this.waterVisible ? 'Water: On' : 'Water: Off';
                toggleButton.style.backgroundColor = this.waterVisible ? '#2196F3' : '#555555';
            }
        }
    }
}

export default CreativeStandalone; 