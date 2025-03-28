import * as THREE from 'three';
import IslandGenerator from './IslandGenerator.js';
import GenericGLBModel from '../objects/GenericGLBModel.js';
import { MODELS } from '../ModelRegistry.js';

/**
 * IslandLoader - A class for loading custom islands with buildings and metadata
 * from saved JSON files into the game world
 */
class IslandLoader {
    /**
     * Create a new IslandLoader
     * @param {Object} options - Configuration options
     * @param {THREE.Scene} options.scene - The scene to add islands to
     * @param {Object} options.modelConstructors - Optional map of custom model constructors
     */
    constructor(options) {
        this.scene = options.scene;
        this.islandGenerator = new IslandGenerator(this.scene);
        this.loadedIslands = [];
        this.modelConstructors = options.modelConstructors || {};
        
        // Default island metadata
        this.defaultMetadata = {
            name: "Unknown Island",
            safeZone: 0,          // Safe zone radius (0 = no safe zone)
            tradingIsland: false,  // Is this a trading island?
            spawnPoint: false,     // Can players spawn here?
            difficulty: 0          // Island difficulty (0 = safe, 10 = very dangerous)
        };

        // Initialize model constructors with GLB models from registry
        this._initializeModelConstructors();
    }

    /**
     * Initialize model constructors for all available model types
     * @private
     */
    async _initializeModelConstructors() {
        // Add GLB models from the registry
        for (const [id, model] of Object.entries(MODELS)) {
            // Skip if this constructor is already defined
            if (this.modelConstructors[id]) continue;
            
            // Create a constructor function for this GLB model
            this.modelConstructors[id] = (options) => {
                return new GenericGLBModel({
                    ...options,
                    modelPath: model.path,
                    scale: model.scale || 1,
                    type: id,
                    userData: { type: id }
                });
            };
            
            console.log(`Registered model constructor: ${id}`);
        }
        
        // Import any special models that need custom handling
        try {
            const MarketStall = (await import('../objects/market-stall.js')).default;
            const Dock = (await import('../objects/dock.js')).default;
            
            this.modelConstructors['marketStall'] = (options) => new MarketStall(options);
            this.modelConstructors['dock'] = (options) => new Dock(options);
            
            console.log('Registered special model constructors');
        } catch (error) {
            console.error('Error loading special model constructors:', error);
        }
    }

    /**
     * Load a single island from a JSON file
     * @param {string} islandJsonPath - Path to the island JSON file
     * @param {Object} options - Optional overrides for island position, etc.
     * @returns {Promise<Object>} - The loaded island data
     */
    async loadIsland(islandJsonPath, options = {}) {
        try {
            // Fetch the island JSON file
            const response = await fetch(islandJsonPath);
            if (!response.ok) throw new Error(`Failed to load island: ${response.status} ${response.statusText}`);
            
            const islandData = await response.json();
            return this.createIslandFromData(islandData, options);
        } catch (error) {
            console.error(`Error loading island from ${islandJsonPath}:`, error);
            throw error;
        }
    }
    
    /**
     * Create an island from loaded JSON data
     * @param {Object} islandData - The island data 
     * @param {Object} options - Optional overrides for island position, etc.
     * @returns {Object} - The island data with added references
     */
    async createIslandFromData(islandData, options = {}) {
        try {
            // Apply any position/rotation overrides
            const position = options.position || new THREE.Vector3(0, 0, 0);
            
            // Merge metadata (from JSON) with default metadata and any overrides
            const metadata = {
                ...this.defaultMetadata,
                ...islandData.metadata,
                ...options.metadata
            };
            
            // Create the island geometry
            const geometry = new THREE.PlaneGeometry(
                islandData.params.size,
                islandData.params.size,
                islandData.params.resolution,
                islandData.params.resolution
            );
            
            // Generate the island using the saved parameters
            // Pass the complete set of parameters to ensure identical terrain generation
            const island = this.islandGenerator.generateCustomIsland(
                position,
                geometry,
                islandData.params.treeCount,
                islandData.params  // Pass the complete params object directly
            );
            
            // Add custom metadata to the island
            island.userData = {
                ...island.userData,
                islandName: metadata.name,
                islandId: islandData.name || `island-${Date.now()}`,
                safeZone: metadata.safeZone,
                tradingIsland: metadata.tradingIsland,
                spawnPoint: metadata.spawnPoint,
                difficulty: metadata.difficulty,
                customIsland: true
            };
            
            // Add to loaded islands array
            const loadedIsland = {
                mesh: island,
                data: islandData,
                metadata: metadata,
                objects: [],
                position: position
            };
            
            this.loadedIslands.push(loadedIsland);
            
            // Place objects on the island if they exist in the data
            if (islandData.placedObjects && Array.isArray(islandData.placedObjects)) {
                await this._placeBuildingsOnIsland(loadedIsland);
            }
            
            console.log(`Loaded island: ${metadata.name}`);
            return loadedIsland;
        } catch (error) {
            console.error('Error creating island from data:', error);
            throw error;
        }
    }
    
    /**
     * Place all buildings and objects on an island
     * @param {Object} islandInfo - The island data
     * @private
     */
    async _placeBuildingsOnIsland(islandInfo) {
        const { data, position: islandPosition } = islandInfo;
        
        // Process each placed object
        for (const objData of data.placedObjects) {
            try {
                // Skip if we don't have a constructor for this type
                if (!this.modelConstructors[objData.type]) {
                    console.warn(`No constructor found for object type: ${objData.type}`);
                    continue;
                }
                
                // Calculate world position (island position + object's relative position)
                const worldPosition = new THREE.Vector3(
                    islandPosition.x + objData.position.x,
                    islandPosition.y + objData.position.y,
                    islandPosition.z + objData.position.z
                );
                
                // Create the object
                const object = this.modelConstructors[objData.type]({
                    position: worldPosition,
                    rotation: objData.rotation
                });
                
                if (!object) {
                    console.warn(`Failed to create object of type: ${objData.type}`);
                    continue;
                }
                
                // Get the Three.js object and add it to the scene
                const threeObject = object.getObject ? object.getObject() : object;
                
                // Tag it with the type and island info
                threeObject.userData = {
                    ...threeObject.userData,
                    type: objData.type,
                    islandId: islandInfo.metadata.islandId || islandInfo.data.name,
                    islandObject: true
                };
                
                // Add it to the scene
                this.scene.add(threeObject);
                
                // Store reference to the placed object
                islandInfo.objects.push({
                    object: threeObject,
                    type: objData.type,
                    position: worldPosition,
                    rotation: objData.rotation
                });
                
            } catch (error) {
                console.error(`Error placing object of type ${objData.type}:`, error);
            }
        }
        
        console.log(`Placed ${islandInfo.objects.length} objects on island ${islandInfo.metadata.name}`);
    }
    
    /**
     * Load multiple islands from a manifest file
     * @param {string} manifestPath - Path to the manifest JSON file
     * @returns {Promise<Array>} - Array of loaded island data
     */
    async loadIslandsFromManifest(manifestPath) {
        try {
            // Fetch the manifest file
            const response = await fetch(manifestPath);
            if (!response.ok) throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
            
            const manifest = await response.json();
            
            // Check if it's a valid manifest
            if (!manifest.islands || !Array.isArray(manifest.islands)) {
                throw new Error('Invalid manifest format: missing islands array');
            }
            
            // Load each island from the manifest
            const loadPromises = manifest.islands.map(entry => {
                return this.loadIsland(entry.path, {
                    position: entry.position ? new THREE.Vector3(
                        entry.position.x || 0,
                        entry.position.y || 0,
                        entry.position.z || 0
                    ) : undefined,
                    metadata: entry.metadata
                });
            });
            
            // Wait for all islands to load
            const loadedIslands = await Promise.all(loadPromises);
            console.log(`Loaded ${loadedIslands.length} islands from manifest`);
            
            return loadedIslands;
        } catch (error) {
            console.error(`Error loading islands from manifest ${manifestPath}:`, error);
            throw error;
        }
    }
    
    /**
     * Get all loaded islands
     * @returns {Array} - Array of loaded island data
     */
    getIslands() {
        return this.loadedIslands;
    }
    
    /**
     * Get a loaded island by ID or name
     * @param {string} islandId - The island ID or name to find
     * @returns {Object|null} - The island data or null if not found
     */
    getIslandById(islandId) {
        return this.loadedIslands.find(island => 
            island.data.name === islandId || 
            island.metadata.name === islandId ||
            island.mesh.userData.islandId === islandId
        ) || null;
    }
    
    /**
     * Find the closest island to a position
     * @param {THREE.Vector3} position - The position to check
     * @returns {Object|null} - The closest island or null if none are loaded
     */
    findClosestIsland(position) {
        if (this.loadedIslands.length === 0) return null;
        
        let closestIsland = null;
        let closestDistance = Infinity;
        
        this.loadedIslands.forEach(island => {
            const distance = position.distanceTo(island.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIsland = island;
            }
        });
        
        return closestIsland;
    }
}

export default IslandLoader; 