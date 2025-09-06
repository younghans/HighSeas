import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import IslandGenerator from './islands/IslandGenerator.js';
import PerlinNoise from './islands/PerlinNoise.js';
import World from './world.js';
import BuildingManager from './BuildingManager.js';
import GenericGLBModel from './objects/GenericGLBModel.js';
import { MODELS } from './ModelRegistry.js';
import ProceduralWorldGenerator from './world/ProceduralWorldGenerator.js';
import WorldGeneratorUI from './world/WorldGeneratorUI.js';

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
        
        // Procedural world generation
        this.proceduralWorldGenerator = null;
        this.worldGeneratorUI = null;
        this.proceduralMode = false; // Toggle between single island and procedural world modes
        
        // Default island parameters
        this.islandParams = {
            size: 400,
            resolution: 80, // Fixed resolution
            seed: Math.floor(Math.random() * 65536),
            noiseScale: 0.01,
            noiseHeight: 80,
            falloffCurve: 2,        // 1 = linear, 2 = quadratic, etc.
            enableVertexCulling: true, // Remove underwater vertices for performance
            waterLevel: 0           // Height below which vertices are considered underwater
        };
        
        // Camera movement controls
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
            space: false
        };
        this.moveSpeed = 60; // Base movement speed
        this.fastMoveSpeed = 120; // Fast movement speed when holding shift
        
        // FPS counter variables
        this.frameCount = 0;
        this.lastTime = 0;
        this.fps = 0;
        this.fpsUpdateInterval = 0.5; // Update FPS display every 0.5 seconds
        this.fpsAccumulator = 0;
        
        // Centralized parameter ranges for UI and randomization
        this.parameterRanges = {
            size: { min: 100, max: 400, step: 1 },
            seed: { min: 0, max: 65535, step: 1 },
            noiseScale: { min: 0.005, max: 0.015, step: 0.001 },
            noiseHeight: { min: 40, max: 80, step: 1 },
            falloffCurve: { min: 1, max: 10, step: 0.5 },
            density: { min: 0.05, max: 0.8, step: 0.05 }
        };
        
                 // Island type and object configuration
         this.islandType = 'forest'; // 'forest', 'rock', or 'plain'
         this.objectConfig = {
             forest: {
                 density: 0.25, // 25% of available space
                 distribution: {
                     firTreeLarge: 35,
                     firTreeMedium: 45,
                     firTreeSmall: 20
                 }
             },
             rock: {
                 density: 0.20, // 20% of available space
                 distribution: {
                     stoneLarge2: 25,
                     stoneLarge3: 25,
                     stoneLarge4: 25,
                     stoneLarge5: 25
                 }
             },
             plain: {
                 density: 0.15, // 15% of available space
                 distribution: {
                     palmTreeBent: 25,
                     palmTreeLarge: 25,
                     stoneLarge3: 50
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
        
        // Initialize procedural world generator
        this.proceduralWorldGenerator = new ProceduralWorldGenerator({
            scene: this.scene,
            worldSeed: Date.now(),
            worldWidth: 20000,
            worldHeight: 20000,
            islandDensity: 0.3,
            minIslandDistance: 800,
            maxIslandDistance: 1500,
            generateObjects: true,
            lodEnabled: true,
            maxIslandRenderDistance: 5000,
            maxObjectRenderDistance: 2000
        });
        
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
        
        // Initialize world generator UI
        this.worldGeneratorUI = new WorldGeneratorUI(this.proceduralWorldGenerator);
        
        // Generate initial island (single island mode by default)
        this.updateIslandPreview();
        
        // Create building UI
        await this.loadAvailableObjects();
        this.createBuildingUI();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Add click event listener for building placement
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
        
        // Add keyboard event listeners for camera movement
        this.setupKeyboardControls();
        
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
    
    setupKeyboardControls() {
        // Add keyboard event listeners for WASD movement
        window.addEventListener('keydown', (event) => {
            this.onKeyDown(event);
        });
        
        window.addEventListener('keyup', (event) => {
            this.onKeyUp(event);
        });
    }
    
    onKeyDown(event) {
        // Prevent default behavior for handled keys to avoid page scrolling
        const key = event.key.toLowerCase();
        
        switch (key) {
            case 'w':
                this.keys.w = true;
                event.preventDefault();
                break;
            case 'a':
                this.keys.a = true;
                event.preventDefault();
                break;
            case 's':
                this.keys.s = true;
                event.preventDefault();
                break;
            case 'd':
                this.keys.d = true;
                event.preventDefault();
                break;
            case 'shift':
                this.keys.shift = true;
                event.preventDefault();
                break;
            case ' ':
                this.keys.space = true;
                event.preventDefault();
                break;
        }
    }
    
    onKeyUp(event) {
        const key = event.key.toLowerCase();
        
        switch (key) {
            case 'w':
                this.keys.w = false;
                break;
            case 'a':
                this.keys.a = false;
                break;
            case 's':
                this.keys.s = false;
                break;
            case 'd':
                this.keys.d = false;
                break;
            case 'shift':
                this.keys.shift = false;
                break;
            case ' ':
                this.keys.space = false;
                break;
        }
    }
    
    updateCameraMovement(delta) {
        // Only allow camera movement in creative mode
        if (!this.camera || !this.controls) return;
        
        const currentSpeed = this.keys.shift ? this.fastMoveSpeed : this.moveSpeed;
        const moveDistance = currentSpeed * delta;
        
        // Get camera's forward, right, and up vectors
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, up).normalize();
        
        // Create a movement vector
        const movement = new THREE.Vector3();
        
        // Forward/backward movement (W/S)
        if (this.keys.w) {
            movement.add(forward.clone().multiplyScalar(moveDistance));
        }
        if (this.keys.s) {
            movement.add(forward.clone().multiplyScalar(-moveDistance));
        }
        
        // Left/right movement (A/D)
        if (this.keys.a) {
            movement.add(right.clone().multiplyScalar(-moveDistance));
        }
        if (this.keys.d) {
            movement.add(right.clone().multiplyScalar(moveDistance));
        }
        
        // Up/down movement (Space/Shift+Space)
        if (this.keys.space) {
            movement.y += moveDistance;
        }
        
        // Apply movement to both camera and controls target
        if (movement.length() > 0) {
            this.camera.position.add(movement);
            this.controls.target.add(movement);
            this.controls.update();
            
            // Update player position for LOD in procedural mode
            if (this.proceduralMode && this.proceduralWorldGenerator && this.proceduralWorldGenerator.lodEnabled) {
                this.proceduralWorldGenerator.updatePlayerPosition(this.camera.position);
            }
        }
    }
    
    updateFPS(delta) {
        this.frameCount++;
        this.fpsAccumulator += delta;
        
        // Update FPS display every fpsUpdateInterval seconds
        if (this.fpsAccumulator >= this.fpsUpdateInterval) {
            this.fps = Math.round(this.frameCount / this.fpsAccumulator);
            
            // Update the FPS counter display
            const fpsElement = document.getElementById('fpsCounter');
            if (fpsElement) {
                // Color-code the FPS for performance indication
                let color = '#00ff00'; // Green for good FPS (60+)
                if (this.fps < 60) color = '#ffff00'; // Yellow for moderate FPS (30-59)
                if (this.fps < 30) color = '#ff6600'; // Orange for low FPS (15-29)
                if (this.fps < 15) color = '#ff0000'; // Red for very low FPS (<15)
                
                fpsElement.style.color = color;
                fpsElement.textContent = `FPS: ${this.fps}`;
            }
            
            // Track FPS in performance monitor if available
            if (this.worldGeneratorUI?.performanceMonitor) {
                this.worldGeneratorUI.performanceMonitor.trackFPS(this.fps);
            }
            
            // Reset counters
            this.frameCount = 0;
            this.fpsAccumulator = 0;
        }
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
                <div style="font-size: 9px; margin-top: 8px; opacity: 0.8;">
                    <strong>Controls:</strong><br>
                    WASD: Move camera<br>
                    Space: Move up<br>
                    Shift: Move faster<br>
                    Right-click + drag: Rotate view
                </div>
                <div id="fpsCounter" style="font-size: 10px; margin-top: 8px; color: #00ff00; font-weight: bold;">
                    FPS: --
                </div>
            `;
            document.body.appendChild(infoElement);
        }
        
        // Create UI container with responsive design
        const uiContainer = document.createElement('div');
        uiContainer.id = 'creativeUI';
        uiContainer.style.position = 'absolute';
        uiContainer.style.right = '10px';
        uiContainer.style.top = '10px';
        uiContainer.style.width = 'min(350px, calc(100vw - 20px))';
        uiContainer.style.maxHeight = 'calc(100vh - 20px)';
        uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        uiContainer.style.color = 'white';
        uiContainer.style.padding = 'min(20px, 2vw)';
        uiContainer.style.borderRadius = '8px';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        uiContainer.style.fontSize = 'min(14px, 3vw)';
        uiContainer.style.zIndex = '1000';
        uiContainer.style.overflowY = 'auto';
        uiContainer.style.boxSizing = 'border-box';
        
        // Create UI content with responsive styling
        uiContainer.innerHTML = `
            <h2 style="text-align: center; margin-top: 0; font-size: min(18px, 4vw); margin-bottom: min(15px, 3vw);">Island Creator</h2>
            
            <div style="margin-bottom: min(12px, 2.5vw);">
                <label for="islandName" style="font-size: min(13px, 2.8vw); display: block; margin-bottom: min(5px, 1vw);">Island Name:</label>
                <input type="text" id="islandName" value="My Custom Island" style="width: 100%; padding: min(5px, 1vw); font-size: min(12px, 2.5vw); box-sizing: border-box; border-radius: 3px; border: none;">
            </div>
            
            <div style="margin-bottom: min(12px, 2.5vw);">
                <label for="islandType" style="font-size: min(13px, 2.8vw); display: block; margin-bottom: min(5px, 1vw);">Island Type:</label>
                <select id="islandType" style="width: 100%; padding: min(5px, 1vw); font-size: min(12px, 2.5vw); border-radius: 3px; border: none;">
                    <option value="forest" ${this.islandType === 'forest' ? 'selected' : ''}>Forest</option>
                    <option value="rock" ${this.islandType === 'rock' ? 'selected' : ''}>Rock</option>
                    <option value="plain" ${this.islandType === 'plain' ? 'selected' : ''}>Plain</option>
                </select>
            </div>
            
            <div style="margin-bottom: min(12px, 2.5vw);">
                <label for="islandSize" style="font-size: min(13px, 2.8vw); display: block; margin-bottom: min(5px, 1vw);">Size: <span id="sizeValue">${this.islandParams.size}</span></label>
                <input type="range" id="islandSize" min="${this.parameterRanges.size.min}" max="${this.parameterRanges.size.max}" step="${this.parameterRanges.size.step}" value="${this.islandParams.size}" style="width: 100%; height: min(20px, 4vw);">
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
                <input type="range" id="noiseScale" min="${this.parameterRanges.noiseScale.min}" max="${this.parameterRanges.noiseScale.max}" step="${this.parameterRanges.noiseScale.step}" value="${this.islandParams.noiseScale}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label for="noiseHeight">Height Scale: <span id="noiseHeightValue">${this.islandParams.noiseHeight}</span></label>
                <input type="range" id="noiseHeight" min="${this.parameterRanges.noiseHeight.min}" max="${this.parameterRanges.noiseHeight.max}" step="${this.parameterRanges.noiseHeight.step}" value="${this.islandParams.noiseHeight}" style="width: 100%;">
            </div>
            
            
            
            <div style="margin-bottom: 15px;">
                <label for="falloffCurve">Falloff Curve: <span id="falloffCurveValue">${this.islandParams.falloffCurve.toFixed(1)}</span></label>
                <input type="range" id="falloffCurve" min="${this.parameterRanges.falloffCurve.min}" max="${this.parameterRanges.falloffCurve.max}" step="${this.parameterRanges.falloffCurve.step}" value="${this.islandParams.falloffCurve}" style="width: 100%;">
            </div>
            
            
            <div style="margin-bottom: 15px;">
                <label for="enableVertexCulling" style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="enableVertexCulling" ${this.islandParams.enableVertexCulling ? 'checked' : ''} style="margin-right: 10px;">
                    Enable Vertex Culling (Performance)
                </label>
            </div>
            
            <div id="objectConfig" style="margin-bottom: min(15px, 3vw); border: 1px solid #555; padding: min(10px, 2vw); border-radius: 5px;">
                <h3 style="margin-top: 0; margin-bottom: min(10px, 2vw); font-size: min(16px, 3.5vw);">Object Configuration</h3>
                
                <div style="margin-bottom: min(12px, 2.5vw);">
                     <label for="density" style="font-size: min(13px, 2.8vw); display: block; margin-bottom: min(5px, 1vw);">Object Density: <span id="densityValue">${Math.round(this.objectConfig[this.islandType].density * 100)}%</span></label>
                     <input type="range" id="density" min="${this.parameterRanges.density.min}" max="${this.parameterRanges.density.max}" step="${this.parameterRanges.density.step}" value="${this.objectConfig[this.islandType].density}" style="width: 100%; height: min(20px, 4vw);">
                 </div>
                
                <div id="distributionControls">
                    <!-- Distribution controls will be populated by JavaScript -->
                </div>
                
                <button id="generateObjects" style="padding: min(8px, 1.5vw); width: 100%; background-color: #6a9bd1; color: white; border: none; border-radius: 3px; cursor: pointer; margin-top: min(10px, 2vw); font-size: min(12px, 2.5vw);">Generate Objects</button>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <button id="toggleWater" style="padding: 10px; width: 100%; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Water: On</button>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: space-between; margin-bottom: 10px;">
                <button id="saveIsland" style="padding: 10px; flex-grow: 1; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Save Island</button>
                <button id="loadIsland" style="padding: 10px; flex-grow: 1; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Load Island</button>
            </div>
            
            <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                <button id="randomizeAll" style="padding: 10px; width: 100%; background-color: #FF9800; color: white; border: none; border-radius: 5px; cursor: pointer;">🎲 Randomize All Parameters</button>
            </div>
            
            <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                <button id="toggleMode" style="padding: 10px; width: 100%; background-color: #9C27B0; color: white; border: none; border-radius: 5px; cursor: pointer;">🌊 Switch to Procedural World Mode</button>
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
             this.updateDensityDisplay();
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
        
        
        document.getElementById('falloffCurve').addEventListener('input', (e) => {
            this.islandParams.falloffCurve = parseFloat(e.target.value);
            document.getElementById('falloffCurveValue').textContent = this.islandParams.falloffCurve.toFixed(1);
            this.updateIslandPreview();
        });
        
        
        document.getElementById('enableVertexCulling').addEventListener('change', (e) => {
            this.islandParams.enableVertexCulling = e.target.checked;
            this.updateIslandPreview();
        });
        
                 document.getElementById('density').addEventListener('input', (e) => {
             this.objectConfig[this.islandType].density = parseFloat(e.target.value);
             document.getElementById('densityValue').textContent = Math.round(this.objectConfig[this.islandType].density * 100) + '%';
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
        
        document.getElementById('randomizeAll').addEventListener('click', () => {
            this.randomizeAllParameters();
        });
        
        document.getElementById('toggleMode').addEventListener('click', () => {
            this.toggleMode();
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
            
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const distance = Math.sqrt(x * x + y * y);
                
                // Calculate island dimensions
                const maxDimension = Math.max(this.islandParams.size, this.islandParams.size) / 2;
                
                // Use fixed circular boundary (no variation)
                const effectiveRadius = maxDimension;
                
                // Get base height from Perlin noise
                const baseHeight = noise.perlin((x + position.x) * noiseScale, (y + position.z) * noiseScale) * 
                                  this.islandParams.noiseHeight;
                
                // Calculate smooth gradient falloff
                const normalizedDistance = distance / effectiveRadius;
                
                let height;
                
                                 if (normalizedDistance > 1.3) {
                     // Force underwater well beyond island boundary (softer than before)
                     height = -10;
                } else {
                    // Apply smooth exponential falloff
                    const falloffStrength = Math.pow(Math.max(0, normalizedDistance), this.islandParams.falloffCurve);
                    const heightMultiplier = Math.max(0, 1 - falloffStrength);
                    
                    // Smooth transition from full height to underwater
                    height = baseHeight * heightMultiplier;
                    
                                         // Gradually transition to underwater at the edges
                     if (normalizedDistance > 1.0) {
                         const underwaterFactor = (normalizedDistance - 1.0) / 0.3; // 0.3 = transition zone (1.0 to 1.3)
                         const targetDepth = -10 * underwaterFactor;
                         height = Math.min(height, targetDepth);
                     }
                }
                
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
            
            // Apply vertex culling if enabled
            let finalGeometry = customGeometry;
            if (this.islandParams.enableVertexCulling) {
                finalGeometry = this.cullUnderwaterVertices(customGeometry);
            }
            
            finalGeometry.computeVertexNormals();
            
            // Create and position the island mesh
            const islandMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
            const island = new THREE.Mesh(finalGeometry, islandMaterial);
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
            controlDiv.style.marginBottom = 'min(8px, 1.5vw)';
            
            const modelName = this.getModelDisplayName(objectType);
            
            controlDiv.innerHTML = `
                <label for="${objectType}Slider" style="display: block; margin-bottom: min(3px, 0.5vw); font-size: min(11px, 2.3vw);">${modelName}: <span id="${objectType}Value">${config.distribution[objectType]}</span>%</label>
                <input type="range" id="${objectType}Slider" min="0" max="100" value="${config.distribution[objectType]}" style="width: 100%; height: min(18px, 3.5vw);">
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
             'palmTreeBent': 'Palm Tree (Bent)',
             'palmTreeLarge': 'Palm Tree (Large)',
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
    
         updateDensityDisplay() {
         const densitySlider = document.getElementById('density');
         const densityValue = document.getElementById('densityValue');
         
         if (densitySlider && densityValue) {
             densitySlider.value = this.objectConfig[this.islandType].density;
             densityValue.textContent = Math.round(this.objectConfig[this.islandType].density * 100) + '%';
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
         const density = config.density;
         
         console.log(`🌲 Generating objects with ${Math.round(density * 100)}% density for ${this.islandType} island`);
         
         // Step 1: Create and analyze grid
         const gridData = this.analyzeIslandGrid();
         
         // Step 2: Calculate how many cells to populate based on density
         const targetCells = Math.round(gridData.viableCells.length * density);
         
         console.log(`📊 Grid analysis: ${gridData.viableCells.length} viable cells, targeting ${targetCells} cells (${Math.round(density * 100)}% density)`);
         
         if (targetCells === 0) {
             console.warn('No cells selected for object placement');
             return;
         }
         
         // Step 3: Randomly select cells for placement
         const selectedCells = this.selectRandomCells(gridData.viableCells, targetCells);
         
         // Step 4: Distribute object types across selected cells
         const objectsToPlace = this.distributeObjectTypes(selectedCells, config.distribution);
         
         // Step 5: Place objects in selected cells
         for (const { cell, objectType } of objectsToPlace) {
             await this.placeObjectInCell(cell, objectType);
         }
         
         console.log(`✅ Successfully placed ${objectsToPlace.length} objects across ${selectedCells.length} cells`);
     }
    
         analyzeIslandGrid() {
         const gridSize = 16; // 16x16 grid for good detail/performance balance
         const islandSize = this.islandParams.size;
         const cellSize = islandSize / gridSize;
         const viableCells = [];
         
         console.log(`🔍 Analyzing ${gridSize}x${gridSize} grid (${cellSize.toFixed(1)} unit cells) over ${islandSize} unit island`);
         
         // Create raycaster for height sampling
         const raycaster = new THREE.Raycaster();
         
         for (let row = 0; row < gridSize; row++) {
             for (let col = 0; col < gridSize; col++) {
                 // Calculate center position of this grid cell
                 const x = (col - gridSize / 2 + 0.5) * cellSize;
                 const z = (row - gridSize / 2 + 0.5) * cellSize;
                 
                 // Test if this cell is viable for object placement
                 const rayOrigin = new THREE.Vector3(x, 200, z);
                 const rayDirection = new THREE.Vector3(0, -1, 0);
                 raycaster.set(rayOrigin, rayDirection);
                 
                 const intersects = raycaster.intersectObject(this.currentIsland);
                 
                 if (intersects.length > 0) {
                     const intersection = intersects[0];
                     const height = intersection.point.y;
                     
                     // Check if cell meets placement criteria
                     if (height > 2 && height < 100) { // Above water, not too high
                         viableCells.push({
                             row,
                             col,
                             x,
                             z,
                             height,
                             cellSize
                         });
                     }
                 }
             }
         }
         
         console.log(`✅ Found ${viableCells.length} viable cells out of ${gridSize * gridSize} total cells`);
         
         return {
             gridSize,
             cellSize,
             viableCells
         };
     }
     
     selectRandomCells(viableCells, targetCount) {
         // Shuffle viable cells and select the target number
         const shuffled = [...viableCells];
         for (let i = shuffled.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
         }
         
         return shuffled.slice(0, targetCount);
     }
     
     distributeObjectTypes(selectedCells, distribution) {
         const objectTypes = Object.keys(distribution);
         const objectsToPlace = [];
         
         // Calculate how many of each type to place
         selectedCells.forEach((cell, index) => {
             // Use round-robin distribution based on percentages
             let cumulativePercentage = 0;
             const randomValue = Math.random() * 100;
             
             for (const objectType of objectTypes) {
                 cumulativePercentage += distribution[objectType];
                 if (randomValue <= cumulativePercentage) {
                     objectsToPlace.push({ cell, objectType });
                     break;
                 }
             }
         });
         
         return objectsToPlace;
     }
     
     async placeObjectInCell(cell, objectType) {
         // Add some randomization within the cell for natural placement
         const randomOffsetX = (Math.random() - 0.5) * cell.cellSize * 0.6; // Stay within 60% of cell
         const randomOffsetZ = (Math.random() - 0.5) * cell.cellSize * 0.6;
         
         const finalX = cell.x + randomOffsetX;
         const finalZ = cell.z + randomOffsetZ;
         
         // Use raycasting to get exact height at final position
         const raycaster = new THREE.Raycaster();
         const rayOrigin = new THREE.Vector3(finalX, 200, finalZ);
         const rayDirection = new THREE.Vector3(0, -1, 0);
         raycaster.set(rayOrigin, rayDirection);
         
         const intersects = raycaster.intersectObject(this.currentIsland);
         
         if (intersects.length === 0) {
             console.warn(`Failed to find surface for ${objectType} at (${finalX.toFixed(1)}, ${finalZ.toFixed(1)})`);
             return;
         }
         
         const position = intersects[0].point.clone();
         
         // Create the object
         const objectInfo = this.availableObjects.find(obj => obj.id === objectType);
         if (!objectInfo) {
             console.warn(`Object type ${objectType} not found in available objects`);
             return;
         }
         
         try {
             const rotation = Math.random() * Math.PI * 2; // Random rotation
             
             const newObject = objectInfo.constructor({
                 position: position,
                 rotation: rotation,
                 onLoad: (group, gltf) => {
                     console.log(`${objectType} loaded at grid cell (${cell.row}, ${cell.col})`);
                 }
             });
             
             if (newObject) {
                 const threeObject = newObject.getObject ? newObject.getObject() : newObject;
                 threeObject.userData.type = objectType;
                 threeObject.userData.isGenerated = true;
                 threeObject.userData.gridCell = { row: cell.row, col: cell.col };
                 
                 this.scene.add(threeObject);
                 
                 this.placedObjects.push({
                     type: objectType,
                     position: {
                         x: position.x,
                         y: position.y,
                         z: position.z
                     },
                     rotation: rotation,
                     isGenerated: true,
                     gridCell: { row: cell.row, col: cell.col }
                 });
             }
         } catch (error) {
             console.error(`Error creating object ${objectType}:`, error);
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
    
    cullUnderwaterVertices(geometry) {
        const positions = geometry.attributes.position;
        const colors = geometry.attributes.color;
        const waterLevel = this.islandParams.waterLevel;
        
        // First pass: identify vertices above water and create mapping
        const aboveWaterVertices = [];
        const aboveWaterColors = [];
        const vertexMap = new Map(); // Maps old vertex index to new vertex index
        let newVertexIndex = 0;
        
        // Collect vertices above water level
        for (let i = 0; i < positions.count; i++) {
            const height = positions.getZ(i);
            
            if (height > waterLevel - 6) {
                // Keep this vertex
                aboveWaterVertices.push(
                    positions.getX(i),
                    positions.getY(i),
                    positions.getZ(i)
                );
                
                if (colors) {
                    aboveWaterColors.push(
                        colors.getX(i),
                        colors.getY(i),
                        colors.getZ(i)
                    );
                }
                
                vertexMap.set(i, newVertexIndex);
                newVertexIndex++;
            }
        }
        
        // If no vertices above water, return a minimal geometry
        if (aboveWaterVertices.length === 0) {
            const emptyGeometry = new THREE.BufferGeometry();
            emptyGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
            emptyGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array([0.5, 0.5, 0.5]), 3));
            return emptyGeometry;
        }
        
        // Second pass: rebuild triangles using only above-water vertices
        const newIndices = [];
        const originalIndices = geometry.index;
        
        if (originalIndices) {
            // Process existing triangles
            for (let i = 0; i < originalIndices.count; i += 3) {
                const v1 = originalIndices.getX(i);
                const v2 = originalIndices.getX(i + 1);
                const v3 = originalIndices.getX(i + 2);
                
                // Only keep triangle if all vertices are above water
                if (vertexMap.has(v1) && vertexMap.has(v2) && vertexMap.has(v3)) {
                    newIndices.push(
                        vertexMap.get(v1),
                        vertexMap.get(v2),
                        vertexMap.get(v3)
                    );
                }
            }
        } else {
            // Generate indices for non-indexed geometry (PlaneGeometry case)
            const resolution = this.islandParams.resolution;
            
            for (let row = 0; row < resolution; row++) {
                for (let col = 0; col < resolution; col++) {
                    // Calculate vertex indices for this quad
                    const topLeft = row * (resolution + 1) + col;
                    const topRight = topLeft + 1;
                    const bottomLeft = (row + 1) * (resolution + 1) + col;
                    const bottomRight = bottomLeft + 1;
                    
                    // Check if all vertices of both triangles exist in our culled set
                    const triangle1Valid = vertexMap.has(topLeft) && vertexMap.has(bottomLeft) && vertexMap.has(topRight);
                    const triangle2Valid = vertexMap.has(topRight) && vertexMap.has(bottomLeft) && vertexMap.has(bottomRight);
                    
                    if (triangle1Valid) {
                        newIndices.push(
                            vertexMap.get(topLeft),
                            vertexMap.get(bottomLeft),
                            vertexMap.get(topRight)
                        );
                    }
                    
                    if (triangle2Valid) {
                        newIndices.push(
                            vertexMap.get(topRight),
                            vertexMap.get(bottomLeft),
                            vertexMap.get(bottomRight)
                        );
                    }
                }
            }
        }
        
        // Create optimized geometry
        const culledGeometry = new THREE.BufferGeometry();
        culledGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(aboveWaterVertices), 3));
        
        if (aboveWaterColors.length > 0) {
            culledGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(aboveWaterColors), 3));
        }
        
        if (newIndices.length > 0) {
            culledGeometry.setIndex(newIndices);
        }
        
        // Log performance stats
        const originalVertexCount = positions.count;
        const culledVertexCount = aboveWaterVertices.length / 3;
        const vertexReduction = ((originalVertexCount - culledVertexCount) / originalVertexCount * 100).toFixed(1);
        
        console.log(`🔧 Vertex culling: ${originalVertexCount} → ${culledVertexCount} vertices (${vertexReduction}% reduction)`);
        
        return culledGeometry;
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
        // Create main container for the collapsible building UI
        const buildingUIContainer = document.createElement('div');
        buildingUIContainer.id = 'buildingUI';
        buildingUIContainer.style.position = 'fixed';
        buildingUIContainer.style.bottom = '10px';
        buildingUIContainer.style.left = '50%';
        buildingUIContainer.style.transform = 'translateX(-50%)';
        buildingUIContainer.style.zIndex = '1000';
        buildingUIContainer.style.maxWidth = 'calc(100vw - 20px)';
        buildingUIContainer.style.textAlign = 'center';
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'buildingToggle';
        toggleButton.textContent = '🏗️ Building';
        toggleButton.style.padding = 'min(10px, 2vw)';
        toggleButton.style.width = 'auto';
        toggleButton.style.backgroundColor = '#6a9bd1';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '5px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontSize = 'min(12px, 2.5vw)';
        toggleButton.style.marginBottom = '0';
        toggleButton.style.transition = 'background-color 0.3s';
        
        // Create collapsible content panel
        const contentPanel = document.createElement('div');
        contentPanel.id = 'buildingContent';
        contentPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        contentPanel.style.borderRadius = '8px 8px 8px 8px';
        contentPanel.style.padding = 'min(10px, 2vw)';
        contentPanel.style.display = 'none'; // Start collapsed
        contentPanel.style.maxHeight = '40vh';
        contentPanel.style.overflowY = 'auto';
        contentPanel.style.overflowX = 'hidden';
        
        // Create building buttons container with responsive grid
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'grid';
        buttonsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(120px, 25vw), 1fr))';
        buttonsContainer.style.gap = 'min(8px, 1.5vw)';
        buttonsContainer.style.marginBottom = 'min(10px, 2vw)';
        
        // Create buttons for each available model
        Object.values(MODELS).forEach(model => {
            const button = document.createElement('button');
            button.textContent = model.name;
            button.style.padding = 'min(8px 10px, 1.5vw 2vw)';
            button.style.backgroundColor = '#6a9bd1';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '3px';
            button.style.cursor = 'pointer';
            button.style.fontSize = 'min(11px, 2.2vw)';
            button.style.transition = 'background-color 0.3s';
            button.style.whiteSpace = 'nowrap';
            button.style.overflow = 'hidden';
            button.style.textOverflow = 'ellipsis';
            
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#5a8dac';
            });
            
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#6a9bd1';
            });
            
            button.addEventListener('click', () => {
                this.enterBuildMode(model.id);
            });
            
            buttonsContainer.appendChild(button);
        });
        
        // Create utility buttons container
        const utilityContainer = document.createElement('div');
        utilityContainer.style.display = 'flex';
        utilityContainer.style.gap = 'min(8px, 1.5vw)';
        utilityContainer.style.justifyContent = 'center';
        utilityContainer.style.flexWrap = 'wrap';
        
        // Add Clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear All';
        clearButton.style.padding = 'min(8px 12px, 1.5vw 2.5vw)';
        clearButton.style.backgroundColor = '#f44336';
        clearButton.style.color = 'white';
        clearButton.style.border = 'none';
        clearButton.style.borderRadius = '5px';
        clearButton.style.cursor = 'pointer';
        clearButton.style.fontSize = 'min(12px, 2.5vw)';
        clearButton.style.transition = 'background-color 0.3s';
        
        clearButton.addEventListener('mouseover', () => {
            clearButton.style.backgroundColor = '#d32f2f';
        });
        
        clearButton.addEventListener('mouseout', () => {
            clearButton.style.backgroundColor = '#f44336';
        });
        
        clearButton.addEventListener('click', () => {
            this.removeAllPlacedObjects();
        });
        
        utilityContainer.appendChild(clearButton);
        
        // Assemble the UI
        contentPanel.appendChild(buttonsContainer);
        contentPanel.appendChild(utilityContainer);
        buildingUIContainer.appendChild(toggleButton);
        buildingUIContainer.appendChild(contentPanel);
        
        // Add toggle functionality
        let isExpanded = false;
        toggleButton.addEventListener('click', () => {
            isExpanded = !isExpanded;
            contentPanel.style.display = isExpanded ? 'block' : 'none';
            toggleButton.style.backgroundColor = isExpanded ? '#5a8dac' : '#6a9bd1';
            toggleButton.textContent = isExpanded ? '🏗️ Building ▼' : '🏗️ Building ▶';
        });
        
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
        
        // Update FPS counter
        this.updateFPS(delta);
        
        // Update camera movement based on keyboard input
        this.updateCameraMovement(delta);
        
        // Update world (sky, water, lighting, etc.)
        if (this.world) {
            this.world.update(delta);
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Update LOD based on camera position (throttled to avoid excessive calls)
        if (this.proceduralMode && this.proceduralWorldGenerator && this.proceduralWorldGenerator.lodEnabled) {
            // Only update LOD every 60 frames (roughly once per second at 60 FPS)
            if (!this.lodUpdateCounter) this.lodUpdateCounter = 0;
            this.lodUpdateCounter++;
            
            if (this.lodUpdateCounter >= 60) {
                this.proceduralWorldGenerator.updatePlayerPosition(this.camera.position);
                this.lodUpdateCounter = 0;
            }
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
            document.getElementById('falloffCurve').value = this.islandParams.falloffCurve;
            document.getElementById('falloffCurveValue').textContent = this.islandParams.falloffCurve.toFixed(1);
            document.getElementById('enableVertexCulling').checked = this.islandParams.enableVertexCulling;
            
            // Update object configuration UI
            this.updateDistributionControls();
            this.updateDensityDisplay();
            
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
    
    randomizeAllParameters() {
        // Randomize island type
        const islandTypes = ['forest', 'rock', 'plain'];
        this.islandType = islandTypes[Math.floor(Math.random() * islandTypes.length)];
        
        // Randomize island parameters using centralized ranges
        const ranges = this.parameterRanges;
        this.islandParams.size = Math.floor(Math.random() * (ranges.size.max - ranges.size.min + 1)) + ranges.size.min;
        this.islandParams.seed = Math.floor(Math.random() * (ranges.seed.max - ranges.seed.min + 1)) + ranges.seed.min;
        this.islandParams.noiseScale = Math.random() * (ranges.noiseScale.max - ranges.noiseScale.min) + ranges.noiseScale.min;
        this.islandParams.noiseHeight = Math.floor(Math.random() * (ranges.noiseHeight.max - ranges.noiseHeight.min + 1)) + ranges.noiseHeight.min;
        this.islandParams.falloffCurve = Math.random() * (ranges.falloffCurve.max - ranges.falloffCurve.min) + ranges.falloffCurve.min;
        // Note: enableVertexCulling is NOT randomized - preserves user's preference
        
        // Randomize object density for current island type
        this.objectConfig[this.islandType].density = Math.random() * (ranges.density.max - ranges.density.min) + ranges.density.min;
        
        // Randomize distribution percentages for current island type
        const objectTypes = Object.keys(this.objectConfig[this.islandType].distribution);
        const randomDistribution = {};
        let remainingPercentage = 100;
        
        for (let i = 0; i < objectTypes.length; i++) {
            const objectType = objectTypes[i];
            if (i === objectTypes.length - 1) {
                // Last object gets remaining percentage
                randomDistribution[objectType] = remainingPercentage;
            } else {
                // Random percentage of remaining
                const maxAllowed = Math.min(100, remainingPercentage);
                const randomPercent = Math.floor(Math.random() * (maxAllowed + 1));
                randomDistribution[objectType] = randomPercent;
                remainingPercentage -= randomPercent;
            }
        }
        
        this.objectConfig[this.islandType].distribution = randomDistribution;
        
        // Update all UI elements with new values
        this.updateUIWithCurrentValues();
        
        // Generate new island with randomized parameters
        this.updateIslandPreview();
        
        // Wait for island to be ready before generating objects
        setTimeout(() => {
            this.generateIslandObjects();
            console.log('🎲 Randomized all island parameters and generated objects!');
        }, 100); // Small delay to ensure island mesh is ready for raycasting
    }
    
    updateUIWithCurrentValues() {
        // Update island name with a fun random name
        const randomNames = [
            'Mystic Isle', 'Treasure Cove', 'Skull Bay', 'Paradise Point', 'Storm Island',
            'Coral Reef', 'Pirate Haven', 'Golden Shore', 'Emerald Atoll', 'Neptune\'s Rest',
            'Siren\'s Call', 'Blackwater Isle', 'Phoenix Rock', 'Dragon\'s Lair', 'Sunset Bay'
        ];
        document.getElementById('islandName').value = randomNames[Math.floor(Math.random() * randomNames.length)];
        
        // Update island type dropdown
        document.getElementById('islandType').value = this.islandType;
        
        // Update all parameter sliders and values
        document.getElementById('islandSize').value = this.islandParams.size;
        document.getElementById('sizeValue').textContent = this.islandParams.size;
        
        document.getElementById('islandSeed').value = this.islandParams.seed;
        document.getElementById('seedValue').textContent = this.islandParams.seed;
        
        document.getElementById('noiseScale').value = this.islandParams.noiseScale;
        document.getElementById('noiseScaleValue').textContent = this.islandParams.noiseScale.toFixed(4);
        
        document.getElementById('noiseHeight').value = this.islandParams.noiseHeight;
        document.getElementById('noiseHeightValue').textContent = this.islandParams.noiseHeight;
        
        document.getElementById('falloffCurve').value = this.islandParams.falloffCurve;
        document.getElementById('falloffCurveValue').textContent = this.islandParams.falloffCurve.toFixed(1);
        
        // Note: enableVertexCulling checkbox is NOT updated - preserves user's preference
        
        // Update object configuration UI
        this.updateDistributionControls();
        this.updateDensityDisplay();
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
        
        // Remove info panel (which includes FPS counter)
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
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
        window.removeEventListener('keyup', this.onKeyUp.bind(this));
        
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
    
    // Toggle between single island and procedural world modes
    toggleMode() {
        this.proceduralMode = !this.proceduralMode;
        
        const toggleButton = document.getElementById('toggleMode');
        const creativeUI = document.getElementById('creativeUI');
        let worldGeneratorUIElement = document.getElementById('worldGeneratorUI');
        
        if (this.proceduralMode) {
            // Switch to procedural world mode
            console.log('🌊 Switching to Procedural World Mode');
            
            // Hide single island UI
            if (creativeUI) {
                creativeUI.style.display = 'none';
            }
            
            // Show procedural world UI
            if (!worldGeneratorUIElement) {
                worldGeneratorUIElement = this.worldGeneratorUI.createUI();
                document.body.appendChild(worldGeneratorUIElement);
            } else {
                worldGeneratorUIElement.style.display = 'block';
            }
            
            // Clear current single island
            this.removeAllPlacedObjects();
            if (this.currentIsland) {
                this.scene.remove(this.currentIsland);
                this.currentIsland = null;
            }
            
            // Update button text
            toggleButton.textContent = '🏝️ Switch to Single Island Mode';
            toggleButton.style.backgroundColor = '#4CAF50';
            
        } else {
            // Switch to single island mode
            console.log('🏝️ Switching to Single Island Mode');
            
            // Hide procedural world UI
            if (worldGeneratorUIElement) {
                worldGeneratorUIElement.style.display = 'none';
            }
            
            // Show single island UI
            if (creativeUI) {
                creativeUI.style.display = 'block';
            }
            
            // Clear procedural world
            this.proceduralWorldGenerator.clearGeneratedWorld();
            
            // Generate single island
            this.updateIslandPreview();
            
            // Update button text
            toggleButton.textContent = '🌊 Switch to Procedural World Mode';
            toggleButton.style.backgroundColor = '#9C27B0';
        }
    }
}

export default CreativeStandalone; 