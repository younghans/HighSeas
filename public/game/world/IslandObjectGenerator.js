import * as THREE from 'three';
import GenericGLBModel from '../objects/GenericGLBModel.js';
import { MODELS } from '../ModelRegistry.js';

/**
 * IslandObjectGenerator - Handles procedural object placement on islands
 * Extracted from creative-standalone to be reusable across different systems
 */
class IslandObjectGenerator {
    constructor(scene) {
        this.scene = scene;
        this.availableObjects = [];
        this.isInitialized = false;
        
        // Performance optimizations - Placement Data Caching
        this.placementCache = new Map(); // Cache for object placement calculations
        this.maxCacheSize = 100; // Limit memory usage
        this.frameYieldThreshold = 3; // Yield after 3 objects to prevent freezing
    }
    
    /**
     * Initialize the object generator with available object constructors
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Create an array to hold our available objects
            this.availableObjects = [];
            
            // Add custom model types first (these need special handling)
            const customModulePromises = [
                import('../objects/market-stall.js').then(module => {
                    this.availableObjects.push({
                        name: 'Market Stall',
                        id: 'marketStall',
                        constructor: (options) => new module.default(options)
                    });
                }).catch(error => {
                    console.warn('Failed to load market-stall module:', error);
                }),
                import('../objects/dock.js').then(module => {
                    this.availableObjects.push({
                        name: 'Dock',
                        id: 'dock',
                        constructor: (options) => new module.default(options)
                    });
                }).catch(error => {
                    console.warn('Failed to load dock module:', error);
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
            }
            
            this.isInitialized = true;
            console.log(`🔧 IslandObjectGenerator initialized with ${this.availableObjects.length} object types`);
        } catch (error) {
            console.error('Error initializing IslandObjectGenerator:', error);
        }
    }
    
    /**
     * Generate objects on an island using template configuration with caching
     * @param {THREE.Mesh} island - The island mesh to place objects on
     * @param {Object} objectConfig - Object configuration from island template
     * @param {Object} islandParams - Island generation parameters (for size info)
     * @param {Object} random - Seeded random generator for consistent placement
     * @param {string} islandId - Island identifier for caching
     * @param {number} seed - Island seed for caching
     * @returns {Array} Array of placed object data
     */
    async generateObjectsOnIsland(island, objectConfig, islandParams, random = Math, islandId = null, seed = null) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (!island || !objectConfig) {
            console.warn('Invalid parameters for object generation');
            return [];
        }
        
        const density = objectConfig.density;
        console.log(`🌲 Generating objects with ${Math.round(density * 100)}% density on island at position (${island.position.x.toFixed(1)}, ${island.position.z.toFixed(1)})`);
        
        // Check cache first if we have island ID and seed
        if (islandId && seed !== null) {
            const cacheKey = this.generateCacheKey(islandId, seed, objectConfig, islandParams);
            const cachedPlacement = this.getCachedPlacement(cacheKey);
            
            if (cachedPlacement) {
                // Use cached placement data - much faster!
                const placedObjects = await this.createObjectsFromCachedData(cachedPlacement, island);
                console.log(`✅ Successfully placed ${placedObjects.length} objects from cache`);
                return placedObjects;
            }
        }
        
        // No cache available, calculate placement data
        console.log(`🔄 Calculating new object placement (will be cached for future use)`);
        
        // Step 1: Create and analyze grid
        const gridData = this.analyzeIslandGrid(island, islandParams);
        
        // Step 2: Calculate how many cells to populate based on density
        const targetCells = Math.round(gridData.viableCells.length * density);
        
        console.log(`📊 Grid analysis: ${gridData.viableCells.length} viable cells, targeting ${targetCells} cells`);
        
        if (targetCells === 0) {
            console.warn('No cells selected for object placement');
            return [];
        }
        
        // Step 3: Randomly select cells for placement
        const selectedCells = this.selectRandomCells(gridData.viableCells, targetCells, random);
        
        // Step 4: Distribute object types across selected cells
        const objectsToPlace = this.distributeObjectTypes(selectedCells, objectConfig.distribution, random);
        
        // Step 5: Place objects in selected cells with frame yielding
        const placedObjects = [];
        for (let i = 0; i < objectsToPlace.length; i++) {
            const { cell, objectType } = objectsToPlace[i];
            const placedObject = await this.placeObjectInCell(island, cell, objectType, random);
            if (placedObject) {
                placedObjects.push(placedObject);
            }
            
            // Yield to main thread every few objects to prevent freezing
            if (i % this.frameYieldThreshold === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // Cache the placement data for future use
        if (islandId && seed !== null && placedObjects.length > 0) {
            const cacheKey = this.generateCacheKey(islandId, seed, objectConfig, islandParams);
            this.cachePlacement(cacheKey, placedObjects);
        }
        
        console.log(`✅ Successfully placed ${placedObjects.length} objects across ${selectedCells.length} cells`);
        return placedObjects;
    }
    
    /**
     * Generate cache key for object placement data
     * @param {string} islandId - Island identifier
     * @param {number} seed - Island generation seed
     * @param {Object} objectConfig - Object configuration
     * @param {Object} islandParams - Island parameters
     * @returns {string} Cache key
     */
    generateCacheKey(islandId, seed, objectConfig, islandParams) {
        // Create a hash of the relevant configuration
        const configData = {
            density: objectConfig.density,
            distribution: objectConfig.distribution,
            size: islandParams.size
        };
        
        const configStr = JSON.stringify(configData);
        let hash = 0;
        for (let i = 0; i < configStr.length; i++) {
            const char = configStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return `${islandId}_${seed}_${Math.abs(hash)}`;
    }
    
    /**
     * Get cached placement data if available
     * @param {string} cacheKey - Cache key
     * @returns {Array|null} Cached placement data or null
     */
    getCachedPlacement(cacheKey) {
        const cached = this.placementCache.get(cacheKey);
        if (cached) {
            console.log(`📋 Using cached object placement (${cached.length} objects)`);
            return cached;
        }
        return null;
    }
    
    /**
     * Cache object placement data
     * @param {string} cacheKey - Cache key
     * @param {Array} placementData - Placement data to cache
     */
    cachePlacement(cacheKey, placementData) {
        // Manage cache size
        if (this.placementCache.size >= this.maxCacheSize) {
            // Remove oldest entry (simple FIFO)
            const firstKey = this.placementCache.keys().next().value;
            this.placementCache.delete(firstKey);
        }
        
        // Store only essential placement data (not Three.js objects)
        const cacheData = placementData.map(obj => ({
            type: obj.type,
            position: { ...obj.position }, // Deep copy position
            rotation: obj.rotation,
            gridCell: obj.gridCell ? { ...obj.gridCell } : undefined
        }));
        
        this.placementCache.set(cacheKey, cacheData);
        console.log(`💾 Cached object placement data (${cacheData.length} objects)`);
    }
    
    /**
     * Create objects from cached placement data with frame yielding
     * @param {Array} cachedPlacementData - Cached placement data
     * @param {THREE.Mesh} island - Island mesh for positioning
     * @returns {Array} Array of created object data
     */
    async createObjectsFromCachedData(cachedPlacementData, island) {
        const placedObjects = [];
        
        for (let i = 0; i < cachedPlacementData.length; i++) {
            const cachedObj = cachedPlacementData[i];
            
            try {
                // Create the object using cached data
                const objectInfo = this.availableObjects.find(obj => obj.id === cachedObj.type);
                if (!objectInfo) {
                    console.warn(`Object type ${cachedObj.type} not found in available objects`);
                    continue;
                }
                
                const position = new THREE.Vector3(
                    cachedObj.position.x,
                    cachedObj.position.y,
                    cachedObj.position.z
                );
                
                const newObject = objectInfo.constructor({
                    position: position,
                    rotation: cachedObj.rotation,
                    onLoad: (group, gltf) => {
                        // Object loaded successfully from cache
                    }
                });
                
                if (newObject) {
                    const threeObject = newObject.getObject ? newObject.getObject() : newObject;
                    threeObject.userData.type = cachedObj.type;
                    threeObject.userData.isGenerated = true;
                    if (cachedObj.gridCell) {
                        threeObject.userData.gridCell = cachedObj.gridCell;
                    }
                    
                    this.scene.add(threeObject);
                    
                    const placedObjectData = {
                        type: cachedObj.type,
                        position: cachedObj.position,
                        rotation: cachedObj.rotation,
                        isGenerated: true,
                        gridCell: cachedObj.gridCell,
                        threeObject: threeObject
                    };
                    
                    placedObjects.push(placedObjectData);
                }
                
                // Yield to main thread every few objects to prevent freezing
                if (i % this.frameYieldThreshold === 0 && i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
                
            } catch (error) {
                console.error(`Error creating cached object ${cachedObj.type}:`, error);
            }
        }
        
        return placedObjects;
    }
    
    /**
     * Analyze island grid to find viable placement locations
     * @param {THREE.Mesh} island - Island mesh
     * @param {Object} islandParams - Island parameters
     * @returns {Object} Grid analysis data
     */
    analyzeIslandGrid(island, islandParams) {
        const gridSize = 16; // 16x16 grid for good detail/performance balance
        const islandSize = islandParams.size;
        const cellSize = islandSize / gridSize;
        const viableCells = [];
        
        // Get the island's world position
        const islandWorldPosition = island.position;
        
        // Create raycaster for height sampling
        const raycaster = new THREE.Raycaster();
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                // Calculate center position of this grid cell in local coordinates
                const localX = (col - gridSize / 2 + 0.5) * cellSize;
                const localZ = (row - gridSize / 2 + 0.5) * cellSize;
                
                // Convert to world coordinates by adding island's world position
                const worldX = localX + islandWorldPosition.x;
                const worldZ = localZ + islandWorldPosition.z;
                
                // Test if this cell is viable for object placement
                const rayOrigin = new THREE.Vector3(worldX, 200, worldZ);
                const rayDirection = new THREE.Vector3(0, -1, 0);
                raycaster.set(rayOrigin, rayDirection);
                
                const intersects = raycaster.intersectObject(island);
                
                if (intersects.length > 0) {
                    const intersection = intersects[0];
                    const height = intersection.point.y;
                    
                    // Check if cell meets placement criteria
                    if (height > 2 && height < 100) { // Above water, not too high
                        viableCells.push({
                            row,
                            col,
                            x: localX, // Store local coordinates for object placement
                            z: localZ,
                            worldX: worldX, // Also store world coordinates for reference
                            worldZ: worldZ,
                            height,
                            cellSize
                        });
                    }
                }
            }
        }
        
        console.log(`📊 Island at (${island.position.x.toFixed(1)}, ${island.position.z.toFixed(1)}): Found ${viableCells.length} viable cells out of ${gridSize * gridSize} total cells`);
        
        return {
            gridSize,
            cellSize,
            viableCells
        };
    }
    
    /**
     * Select random cells for object placement
     * @param {Array} viableCells - Array of viable cells
     * @param {number} targetCount - Number of cells to select
     * @param {Object} random - Random generator
     * @returns {Array} Selected cells
     */
    selectRandomCells(viableCells, targetCount, random = Math) {
        // Shuffle viable cells and select the target number
        const shuffled = [...viableCells];
        
        // Use seeded shuffle if we have a seeded random generator
        if (random.nextInt) {
            // Seeded shuffle using Fisher-Yates
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = random.nextInt(0, i);
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
        } else {
            // Standard shuffle
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(random.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
        }
        
        return shuffled.slice(0, targetCount);
    }
    
    /**
     * Distribute object types across selected cells
     * @param {Array} selectedCells - Selected placement cells
     * @param {Object} distribution - Object type distribution percentages
     * @param {Object} random - Random generator
     * @returns {Array} Objects to place with their cells and types
     */
    distributeObjectTypes(selectedCells, distribution, random = Math) {
        const objectTypes = Object.keys(distribution);
        const objectsToPlace = [];
        
        selectedCells.forEach((cell) => {
            // Use round-robin distribution based on percentages
            let cumulativePercentage = 0;
            const randomValue = (random.next ? random.next() : random.random()) * 100;
            
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
    
    /**
     * Place a single object in a cell
     * @param {THREE.Mesh} island - Island mesh for raycasting
     * @param {Object} cell - Cell data
     * @param {string} objectType - Type of object to place
     * @param {Object} random - Random generator
     * @returns {Object|null} Placed object data or null if failed
     */
    async placeObjectInCell(island, cell, objectType, random = Math) {
        // Add some randomization within the cell for natural placement
        const randomOffsetX = ((random.next ? random.next() : random.random()) - 0.5) * cell.cellSize * 0.6;
        const randomOffsetZ = ((random.next ? random.next() : random.random()) - 0.5) * cell.cellSize * 0.6;
        
        // Calculate final position in local coordinates
        const finalLocalX = cell.x + randomOffsetX;
        const finalLocalZ = cell.z + randomOffsetZ;
        
        // Convert to world coordinates using island's position
        const islandWorldPosition = island.position;
        const finalWorldX = finalLocalX + islandWorldPosition.x;
        const finalWorldZ = finalLocalZ + islandWorldPosition.z;
        
        // Use raycasting to get exact height at final position
        const raycaster = new THREE.Raycaster();
        const rayOrigin = new THREE.Vector3(finalWorldX, 200, finalWorldZ);
        const rayDirection = new THREE.Vector3(0, -1, 0);
        raycaster.set(rayOrigin, rayDirection);
        
        const intersects = raycaster.intersectObject(island);
        
        if (intersects.length === 0) {
            console.warn(`Failed to find surface for ${objectType} at world (${finalWorldX.toFixed(1)}, ${finalWorldZ.toFixed(1)})`);
            return null;
        }
        
        const position = intersects[0].point.clone();
        
        // Create the object
        const objectInfo = this.availableObjects.find(obj => obj.id === objectType);
        if (!objectInfo) {
            console.warn(`Object type ${objectType} not found in available objects`);
            return null;
        }
        
        try {
            const rotation = (random.next ? random.next() : random.random()) * Math.PI * 2;
            
            const newObject = objectInfo.constructor({
                position: position,
                rotation: rotation,
                onLoad: (group, gltf) => {
                    // Object loaded successfully
                }
            });
            
            if (newObject) {
                const threeObject = newObject.getObject ? newObject.getObject() : newObject;
                threeObject.userData.type = objectType;
                threeObject.userData.isGenerated = true;
                threeObject.userData.gridCell = { row: cell.row, col: cell.col };
                
                this.scene.add(threeObject);
                
                const placedObjectData = {
                    type: objectType,
                    position: {
                        x: position.x,
                        y: position.y,
                        z: position.z
                    },
                    rotation: rotation,
                    isGenerated: true,
                    gridCell: { row: cell.row, col: cell.col },
                    threeObject: threeObject
                };
                
                return placedObjectData;
            }
        } catch (error) {
            console.error(`Error creating object ${objectType}:`, error);
        }
        
        return null;
    }
    
    /**
     * Remove all generated objects from scene
     * @param {Array} placedObjects - Array of placed object data
     */
    removeGeneratedObjects(placedObjects) {
        placedObjects.forEach(objData => {
            if (objData.threeObject && objData.isGenerated) {
                this.scene.remove(objData.threeObject);
                // Dispose geometry and materials
                if (objData.threeObject.geometry) objData.threeObject.geometry.dispose();
                if (objData.threeObject.material) {
                    if (Array.isArray(objData.threeObject.material)) {
                        objData.threeObject.material.forEach(mat => mat.dispose());
                    } else {
                        objData.threeObject.material.dispose();
                    }
                }
            }
        });
    }
    
    /**
     * Remove all generated objects from scene by traversing
     */
    removeAllGeneratedObjects() {
        const objectsToRemove = [];
        this.scene.traverse(object => {
            if (object.userData && object.userData.isGenerated) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
            // Dispose geometry and materials
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
    
    /**
     * Get cache statistics for monitoring
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.placementCache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
            memoryUsage: `${(JSON.stringify(Array.from(this.placementCache.values())).length / 1024).toFixed(1)}KB`
        };
    }
    
    /**
     * Clear cache for specific island or all cache
     * @param {string} islandId - Optional island ID to clear specific cache
     */
    clearCache(islandId = null) {
        if (islandId) {
            // Clear cache for specific island
            const keysToDelete = [];
            for (const key of this.placementCache.keys()) {
                if (key.startsWith(islandId + '_')) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.placementCache.delete(key));
            console.log(`🗑️ Cleared cache for island ${islandId} (${keysToDelete.length} entries)`);
        } else {
            // Clear all cache
            this.placementCache.clear();
            console.log('🗑️ Cleared all object placement cache');
        }
    }
}

export default IslandObjectGenerator;
