import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import BaseShip from './BaseShip.js';

/**
 * SailboatShip class - uses GLB models for ships
 * @extends BaseShip
 */
class SailboatShip extends BaseShip {
    // Ship model configurations
    static SHIP_CONFIGS = {
        'sloop': {
            modelPath: '/assets/models/ships/sailboat-2.glb',
            scale: new THREE.Vector3(1.0, 1.0, 1.0),
            waterOffset: -0.2,
            speed: 10,
            rotationSpeed: 2.5,
            // Combat attributes
            maxHealth: 100,
            cannonRange: 100,
            cannonDamage: { min: 8, max: 25 },
            cannonCooldown: 1500 // 1.5 seconds between shots
        },
        'skiff': {
            modelPath: '/assets/models/ships/sailboat-3.glb',
            scale: new THREE.Vector3(1.0, 1.0, 1.0),
            waterOffset: -0.3,
            speed: 12,
            rotationSpeed: 2.7,
            // Combat attributes - slightly better than sloop
            maxHealth: 90,
            cannonRange: 110,
            cannonDamage: { min: 10, max: 28 },
            cannonCooldown: 1500 // 1.4 seconds between shots
        },
        'dinghy': {
            modelPath: '/assets/models/ships/sailboat.glb',
            scale: new THREE.Vector3(1.0, 1.0, 1.0),
            waterOffset: -0.1,
            speed: 8,
            rotationSpeed: 2.2,
            // Combat attributes - weaker but agile
            maxHealth: 80,
            cannonRange: 90,
            cannonDamage: { min: 6, max: 20 },
            cannonCooldown: 1500 // 1.3 seconds between shots (faster firing)
        },
        'cutter': {
            modelPath: '/assets/models/ships/ship-3.glb',
            scale: new THREE.Vector3(0.75, 0.75, 0.75),
            waterOffset: -0.3,
            speed: 11,
            rotationSpeed: 1.8,
            // Combat attributes - balanced medium ship
            maxHealth: 120,
            cannonRange: 120,
            cannonDamage: { min: 12, max: 30 },
            cannonCooldown: 1500 // 1.6 seconds between shots
        },
        'brig': {
            modelPath: '/assets/models/ships/ship.glb',
            scale: new THREE.Vector3(0.5, 0.5, 0.5),
            waterOffset: -0.7,
            speed: 7,
            rotationSpeed: 1.2,
            // Combat attributes - slow but powerful
            maxHealth: 150,
            cannonRange: 130,
            cannonDamage: { min: 15, max: 35 },
            cannonCooldown: 1500 // 1.8 seconds between shots
        },
        'ship-2': {
            modelPath: '/assets/models/ships/ship-2.glb',
            scale: new THREE.Vector3(0.5, 0.5, 0.5),
            waterOffset: -0.15,
            speed: 9,
            rotationSpeed: 1.5,
            // Combat attributes - good all-rounder
            maxHealth: 130,
            cannonRange: 125,
            cannonDamage: { min: 13, max: 32 },
            cannonCooldown: 1500 // 1.7 seconds between shots
        },
        'cutter-2': {
            modelPath: '/assets/models/ships/ship-4.glb',
            scale: new THREE.Vector3(0.7, 0.7, 0.7),
            waterOffset: -0.4,
            speed: 13,
            rotationSpeed: 2.0,
            // Combat attributes - top tier vessel
            maxHealth: 140,
            cannonRange: 140,
            cannonDamage: { min: 16, max: 38 },
            cannonCooldown: 1500 // 1.65 seconds between shots
        }
    };

    /**
     * Create a new SailboatShip
     * @param {THREE.Scene} scene - The scene to add the ship to
     * @param {Object} options - Ship configuration options
     * @param {string} options.modelType - Type of ship to create ('sloop', 'skiff', 'dinghy', 'cutter', etc.)
     */
    constructor(scene, options = {}) {
        // Get the ship configuration
        const modelType = options.modelType || 'cutter';
        const shipConfig = SailboatShip.SHIP_CONFIGS[modelType];
        
        if (!shipConfig) {
            console.error(`Invalid ship model type: ${modelType}. Using default sloop.`);
        }

        // Set default options for a SailboatShip before calling super
        const sailboatOptions = {
            speed: options.speed || (shipConfig?.speed || 10),
            hullColor: options.hullColor || 0x8B4513,
            deckColor: options.deckColor || 0xD2B48C,
            sailColor: options.sailColor || 0xFFFFFF,
            waterOffset: options.waterOffset || (shipConfig?.waterOffset || -0.5),
            rotationSpeed: options.rotationSpeed || (shipConfig?.rotationSpeed || 2.0),
            // Apply combat attributes from ship config
            maxHealth: options.maxHealth || (shipConfig?.maxHealth || 100),
            cannonRange: options.cannonRange || (shipConfig?.cannonRange || 100),
            cannonDamage: options.cannonDamage || (shipConfig?.cannonDamage || { min: 8, max: 25 }),
            cannonCooldown: options.cannonCooldown || (shipConfig?.cannonCooldown || 1500),
            ...options
        };
        
        // Call the parent constructor with our options
        super(scene, sailboatOptions);
        
        // Store the model type
        this.modelType = modelType;
        
        // Add loading state
        this.isLoading = true;
        
        // Create the ship mesh
        this.createShip();
    }
    
    /**
     * Create the sailboat ship mesh using the GLB model
     */
    createShip() {
        const shipGroup = new THREE.Group();
        
        // Get the ship configuration
        const shipConfig = SailboatShip.SHIP_CONFIGS[this.modelType];
        if (!shipConfig) {
            console.error(`Invalid ship model type: ${this.modelType}. Using default sloop.`);
        }
        
        // Create GLTFLoader
        const loader = new GLTFLoader();
        
        // Load the GLB model
        loader.load(
            shipConfig.modelPath,
            (gltf) => {
                // Clone the model to avoid sharing references
                const model = gltf.scene.clone();
                
                // Scale the model appropriately
                model.scale.copy(shipConfig.scale);
                
                // Add shadows to all meshes
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Add the model to the ship group
                shipGroup.add(model);
                
                // Position the ship at the origin point
                shipGroup.position.set(
                    this.position.x,
                    this.waterOffset,
                    this.position.z
                );
                
                // Rotate the ship to face forward
                shipGroup.rotation.y = Math.PI;
                
                // Ensure ship renders properly with wind particles
                shipGroup.renderOrder = 0;
                
                this.scene.add(shipGroup);
                this.shipMesh = shipGroup;
                
                // Ensure the internal position matches the mesh position
                this.position.copy(this.shipMesh.position);
                
                // Calculate bounding box for ship dimensions
                const box = new THREE.Box3().setFromObject(shipGroup);
                
                // Set the ship dimensions based on the actual model size
                this.shipDimensions = {
                    length: Math.abs(box.max.x - box.min.x),
                    width: Math.abs(box.max.z - box.min.z)
                };
                
                // Create the clickable sphere around the ship
                this.createClickBoxSphere();
                
                // Initialize wake particle system after ship mesh is created
                this.initWakeParticleSystem();
                
                // Create the health bar after the ship mesh is loaded
                this.createHealthBar();
                
                // Make health bar visible if health is not full
                if (this.currentHealth < this.maxHealth) {
                    this.setHealthBarVisible(true);
                }
                
                // Mark loading as complete
                this.isLoading = false;
                
                console.log(`SailboatShip model ${this.modelType} loaded and initialized`);
            },
            // Progress callback
            (progress) => {
                const percent = progress.loaded / progress.total * 100;
                console.log(`Loading progress for ${this.modelType}: ${percent.toFixed(2)}%`);
            },
            // Error callback
            (error) => {
                console.error(`Error loading ${this.modelType} model:`, error);
                // Mark loading as complete even on error to prevent infinite loading state
                this.isLoading = false;
            }
        );
    }

    // Override the update method to handle loading state
    update(delta, time) {
        // Don't update if still loading
        if (this.isLoading) return;
        
        // Call parent update method
        super.update(delta, time);
    }
}

export default SailboatShip; 