import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import IslandGenerator from './IslandGenerator.js';
import PerlinNoise from './PerlinNoise.js';
import World from './world.js';

class IslandCreator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.world = null;
        this.clock = new THREE.Clock();
        this.islandGenerator = null;
        this.currentIsland = null;
        
        // Default island parameters - update noise scale to 0.01
        this.islandParams = {
            size: 400,
            resolution: 80, // Fixed resolution, no longer adjustable via UI
            treeCount: 30,
            seed: Math.floor(Math.random() * 65536),
            noiseScale: 0.01, // Changed from 0.015 to 0.01
            noiseHeight: 80,
            falloffFactor: 0.3
        };
    }
    
    init(existingRenderer = null) {
        // Create a new scene
        this.scene = new THREE.Scene();
        
        // Use existing renderer if provided, otherwise create a new one
        if (existingRenderer) {
            this.renderer = existingRenderer;
        } else {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 0.5;
            this.renderer.shadowMap.enabled = true;
            document.body.appendChild(this.renderer.domElement);
        }
        
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
        
        // Create UI
        this.createUI();
        
        // Generate initial island
        this.updateIslandPreview();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
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
        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'islandCreatorUI';
        uiContainer.style.position = 'absolute';
        uiContainer.style.right = '20px';
        uiContainer.style.top = '20px';
        uiContainer.style.width = '300px';
        uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        uiContainer.style.color = 'white';
        uiContainer.style.padding = '20px';
        uiContainer.style.borderRadius = '10px';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        
        // Create UI content - remove resolution slider
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
            
            <div style="display: flex; gap: 10px; justify-content: space-between;">
                <button id="saveIsland" style="padding: 10px; flex-grow: 1; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Save Island</button>
                <button id="exitCreator" style="padding: 10px; flex-grow: 1; background-color: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">Exit Creator</button>
            </div>
        `;
        
        document.body.appendChild(uiContainer);
        
        // Add event listeners
        this.setupUIEventListeners();
    }
    
    setupUIEventListeners() {
        // Replace width/height listeners with a single size listener
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
        }
        
        // Create new geometry with current parameters - use size for both width and height
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
    }
    
    saveIsland() {
        // Get the island name
        const islandName = document.getElementById('islandName').value || 'My Custom Island';
        
        // Create the island data object
        const islandData = {
            name: islandName,
            params: { ...this.islandParams },
            createdAt: new Date().toISOString()
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
    
    exit() {
        // Clean up
        this.cleanup();
        
        // Dispatch an event to notify main.js that we're exiting
        const event = new CustomEvent('exitIslandCreator');
        document.dispatchEvent(event);
    }
    
    cleanup() {
        // Remove UI
        const uiElement = document.getElementById('islandCreatorUI');
        if (uiElement) {
            uiElement.remove();
        }
        
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        
        // Dispose of controls
        if (this.controls) {
            this.controls.dispose();
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
}

export default IslandCreator; 