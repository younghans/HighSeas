import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Trading House object that can be placed on the island
 */
class TradingHouse {
    /**
     * Create a new Trading House
     * @param {Object} options - Configuration options
     * @param {THREE.Vector3} options.position - Position of the trading house
     * @param {number} options.rotation - Y-axis rotation in radians
     */
    constructor(options = {}) {
        // Store options
        this.position = options.position || new THREE.Vector3(0, 0, 0);
        this.rotation = options.rotation || 0;
        
        // Create group to hold all the trading house parts
        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
        
        // Load the trading house model
        this.loadModel();
    }
    
    /**
     * Load the GLTF model for the trading house
     */
    loadModel() {
        const loader = new GLTFLoader();
        
        loader.load(
            // Resource URL
            './assets/models/trading-house.glb',
            // Called when resource is loaded
            (gltf) => {
                // Scale the model appropriately
                gltf.scene.scale.set(1, 1, 1); // Adjust scale as needed
                
                // Add the model to our group
                this.group.add(gltf.scene);
                
                // Add shadows
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            },
            // Called when loading is in progress
            (xhr) => {
                console.log(`Trading house ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            // Called when loading has errors
            (error) => {
                console.error('Error loading trading house model:', error);
            }
        );
    }
    
    /**
     * Get the Three.js object for this trading house
     * @returns {THREE.Group} - The Three.js group containing the trading house
     */
    getObject() {
        return this.group;
    }
}

export default TradingHouse; 