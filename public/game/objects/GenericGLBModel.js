import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Generic GLB Model loader for placing any GLB model on the island
 */
class GenericGLBModel {
    /**
     * Create a new Generic GLB Model
     * @param {Object} options - Configuration options
     * @param {THREE.Vector3} options.position - Position of the model
     * @param {number} options.rotation - Y-axis rotation in radians
     * @param {string} options.modelPath - Path to the GLB model file
     * @param {THREE.Vector3|Array|number} options.scale - Scale of the model (Vector3, array of [x,y,z], or single number)
     * @param {string} options.type - Model type identifier
     * @param {Function} options.onLoad - Optional callback when model loads
     */
    constructor(options = {}) {
        // Store options
        this.position = options.position || new THREE.Vector3(0, 0, 0);
        this.rotation = options.rotation || 0;
        this.modelPath = options.modelPath || null;
        this.type = options.type || 'generic';
        this.onLoad = options.onLoad || null;
        
        // Handle different scale formats
        if (options.scale) {
            if (options.scale instanceof THREE.Vector3) {
                this.scale = options.scale;
            } else if (Array.isArray(options.scale)) {
                this.scale = new THREE.Vector3(options.scale[0], options.scale[1], options.scale[2]);
            } else if (typeof options.scale === 'number') {
                this.scale = new THREE.Vector3(options.scale, options.scale, options.scale);
            }
        } else {
            this.scale = new THREE.Vector3(1, 1, 1);
        }
        
        // Create group to hold all the model parts
        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
        
        // Store custom user data if any
        if (options.userData) {
            this.group.userData = { ...options.userData };
        }
        
        // Load the model if path is provided
        if (this.modelPath) {
            this.loadModel();
        }
    }
    
    /**
     * Load the GLTF model
     */
    loadModel() {
        const loader = new GLTFLoader();
        
        loader.load(
            // Resource URL
            this.modelPath,
            // Called when resource is loaded
            (gltf) => {
                // Apply scaling
                gltf.scene.scale.copy(this.scale);
                
                // Add the model to our group
                this.group.add(gltf.scene);
                
                // Add shadows
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Call the callback if provided
                if (this.onLoad) {
                    this.onLoad(this.group, gltf);
                }
            },
            // Called when loading is in progress
            (xhr) => {
                // Remove the loading percentage log
            },
            // Called when loading has errors
            (error) => {
                console.error(`Error loading ${this.type} model:`, error);
            }
        );
    }
    
    /**
     * Get the Three.js object for this model
     * @returns {THREE.Group} - The Three.js group containing the model
     */
    getObject() {
        return this.group;
    }
}

export default GenericGLBModel; 