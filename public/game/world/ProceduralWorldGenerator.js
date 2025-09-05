import * as THREE from 'three';
import PoissonDiskSampling from './PoissonDiskSampling.js';
import SeededRandom from './SeededRandom.js';
import IslandTemplate from './IslandTemplate.js';
import IslandObjectGenerator from './IslandObjectGenerator.js';
import IslandGenerator from '../islands/IslandGenerator.js';
import PerlinNoise from '../islands/PerlinNoise.js';

/**
 * ProceduralWorldGenerator - Main class for generating procedural ocean worlds filled with islands
 * Designed to be extensible for future island types and biomes
 */
class ProceduralWorldGenerator {
    constructor(options = {}) {
        // World generation parameters
        this.worldSeed = options.worldSeed || Date.now();
        this.worldBounds = {
            width: options.worldWidth || 20000,
            height: options.worldHeight || 20000
        };
        
        // Island distribution parameters
        this.islandDensity = options.islandDensity || 0.3; // 0.1 = sparse, 0.5 = dense
        this.minIslandDistance = options.minIslandDistance || 800;
        this.maxIslandDistance = options.maxIslandDistance || 1500;
        this.generateObjects = options.generateObjects !== false; // Default to true
        
        // Level of Detail (LOD) parameters
        this.lodEnabled = options.lodEnabled !== false; // Default to true
        this.maxIslandRenderDistance = options.maxIslandRenderDistance || 5000; // Islands beyond this are not rendered
        this.maxObjectRenderDistance = options.maxObjectRenderDistance || 2000; // Objects beyond this are not rendered
        this.playerPosition = new THREE.Vector3(0, 0, 0); // Track player position for LOD calculations
        
        // Initialize systems
        this.random = new SeededRandom(this.worldSeed);
        this.islandTemplate = new IslandTemplate();
        this.islandObjectGenerator = new IslandObjectGenerator(options.scene);
        this.scene = options.scene;
        
        // Generated world data
        this.islandPlacements = [];
        this.generatedIslands = [];
        this.worldMetadata = {
            seed: this.worldSeed,
            generatedAt: Date.now(),
            version: '1.0',
            totalIslands: 0,
            biomeDistribution: {}
        };
        
        console.log(`🌊 Initializing Procedural World Generator`);
        console.log(`📊 World: ${this.worldBounds.width}x${this.worldBounds.height}, Seed: ${this.worldSeed}`);
        console.log(`🏝️ Island density: ${this.islandDensity}, Distance: ${this.minIslandDistance}-${this.maxIslandDistance}`);
    }
    
    /**
     * Generate the complete procedural world
     * @returns {Promise} Resolves when world generation is complete
     */
    async generateWorld() {
        console.log('🚀 Starting procedural world generation...');
        
        // Step 1: Generate island placement layout
        this.generateIslandLayout();
        
        // Step 2: Assign templates and parameters to each island
        this.assignIslandTemplates();
        
        // Step 3: Generate the actual 3D islands (with LOD if enabled)
        if (this.lodEnabled) {
            await this.generateIslandMeshesWithLOD();
        } else {
            await this.generateIslandMeshes();
        }
        
        // Step 4: Generate objects on visible islands (if enabled)
        if (this.generateObjects) {
            if (this.lodEnabled) {
                await this.generateObjectsWithLOD();
            } else {
                await this.generateObjectsOnAllIslands();
            }
        }
        
        // Step 5: Update world metadata
        this.updateWorldMetadata();
        
        console.log(`✅ World generation complete! Generated ${this.generatedIslands.length} islands`);
        console.log('🎯 Biome distribution:', this.worldMetadata.biomeDistribution);
        
        return {
            islands: this.generatedIslands,
            metadata: this.worldMetadata,
            placements: this.islandPlacements
        };
    }
    
    /**
     * Generate natural island placement using Poisson disk sampling
     */
    generateIslandLayout() {
        console.log('📐 Generating island layout...');
        
        // Calculate number of islands based on density
        const worldArea = this.worldBounds.width * this.worldBounds.height;
        const averageIslandSpacing = (this.minIslandDistance + this.maxIslandDistance) / 2;
        const maxPossibleIslands = worldArea / (averageIslandSpacing * averageIslandSpacing);
        const targetIslandCount = Math.floor(maxPossibleIslands * this.islandDensity);
        
        console.log(`🎯 Target: ~${targetIslandCount} islands across ${worldArea.toLocaleString()} sq units`);
        
        // Use Poisson disk sampling for natural distribution
        const sampler = new PoissonDiskSampling({
            width: this.worldBounds.width,
            height: this.worldBounds.height,
            minDistance: this.minIslandDistance,
            maxAttempts: 30,
            random: () => this.random.next()
        });
        
        const points = sampler.generate();
        
        // Convert to island placements with world coordinates
        this.islandPlacements = points.map((point, index) => {
            const worldX = point[0] - this.worldBounds.width / 2;
            const worldZ = point[1] - this.worldBounds.height / 2;
            
            return {
                id: `island_${this.worldSeed}_${index}`,
                position: new THREE.Vector3(worldX, 0, worldZ),
                localSeed: this.random.nextInt(0, 65535),
                distanceFromCenter: Math.sqrt(worldX * worldX + worldZ * worldZ),
                index
            };
        });
        
        console.log(`✅ Generated ${this.islandPlacements.length} island positions`);
    }
    
    /**
     * Assign templates and generate parameters for each island
     */
    assignIslandTemplates() {
        console.log('🎨 Assigning island templates and parameters...');
        
        const biomeCount = {};
        
        this.islandPlacements.forEach(placement => {
            // Create seeded random for this specific island
            const islandRandom = new SeededRandom(placement.localSeed);
            
            // Select template based on distance from center and randomness
            const template = this.selectTemplateForPosition(placement, islandRandom);
            
            // Generate parameters using the template
            const generatedData = this.islandTemplate.generateParameters(template, islandRandom);
            
            // Store generated data
            placement.template = template;
            placement.generatedData = generatedData;
            
            // Track biome distribution
            const biomeId = template.id;
            biomeCount[biomeId] = (biomeCount[biomeId] || 0) + 1;
        });
        
        this.worldMetadata.biomeDistribution = biomeCount;
        console.log('✅ Templates assigned. Distribution:', biomeCount);
    }
    
    /**
     * Select appropriate template for an island position
     * @param {Object} placement - Island placement data
     * @param {SeededRandom} islandRandom - Random generator for this island
     * @returns {Object} Selected template
     */
    selectTemplateForPosition(placement, islandRandom) {
        const centerDistance = placement.distanceFromCenter;
        const maxDistance = Math.sqrt(2) * Math.max(this.worldBounds.width, this.worldBounds.height) / 2;
        const normalizedDistance = centerDistance / maxDistance; // 0 = center, 1 = edge
        
        // Influence template selection based on distance from center
        let excludeTypes = [];
        let biasTowards = [];
        
        if (normalizedDistance < 0.3) {
            // Center area - favor tropical and forest islands
            biasTowards = ['tropical', 'forest'];
        } else if (normalizedDistance > 0.7) {
            // Edge area - favor rocky and desert islands
            biasTowards = ['rocky', 'desert'];
            // Exclude volcanic from outer edges
            excludeTypes = ['volcanic'];
        }
        
        // If we have bias preferences, weight them higher
        if (biasTowards.length > 0 && islandRandom.nextFloat(0, 1) < 0.6) {
            const biasedTemplate = islandRandom.choice(biasTowards);
            const template = this.islandTemplate.getTemplate(biasedTemplate);
            if (template) {
                return template;
            }
        }
        
        // Otherwise, use normal weighted selection
        return this.islandTemplate.selectRandomTemplate(islandRandom, excludeTypes);
    }
    
    /**
     * Generate actual 3D island meshes
     */
    async generateIslandMeshes() {
        console.log('🏗️ Generating 3D island meshes...');
        
        if (!this.scene) {
            console.warn('No scene provided, skipping mesh generation');
            return;
        }
        
        let generatedCount = 0;
        const totalCount = this.islandPlacements.length;
        
        for (const placement of this.islandPlacements) {
            try {
                const island = await this.generateSingleIsland(placement);
                if (island) {
                    this.generatedIslands.push({
                        id: placement.id,
                        mesh: island,
                        placement: placement,
                        template: placement.template,
                        generatedData: placement.generatedData
                    });
                    generatedCount++;
                }
                
                // Progress logging
                if (generatedCount % 10 === 0 || generatedCount === totalCount) {
                    console.log(`🏝️ Generated ${generatedCount}/${totalCount} islands (${Math.round(generatedCount/totalCount*100)}%)`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to generate island ${placement.id}:`, error);
            }
        }
        
        console.log(`✅ Successfully generated ${generatedCount} island meshes`);
    }
    
    /**
     * Generate island meshes with LOD (only islands within render distance)
     */
    async generateIslandMeshesWithLOD() {
        console.log('🏗️ Generating 3D island meshes with LOD...');
        
        if (!this.scene) {
            console.warn('No scene provided, skipping mesh generation');
            return;
        }
        
        let generatedCount = 0;
        let skippedCount = 0;
        const totalCount = this.islandPlacements.length;
        
        for (const placement of this.islandPlacements) {
            try {
                // Calculate distance from player position
                const distanceToPlayer = this.playerPosition.distanceTo(placement.position);
                
                if (distanceToPlayer <= this.maxIslandRenderDistance) {
                    // Generate island within render distance
                    const island = await this.generateSingleIsland(placement);
                    if (island) {
                        this.generatedIslands.push({
                            id: placement.id,
                            mesh: island,
                            placement: placement,
                            template: placement.template,
                            generatedData: placement.generatedData,
                            isLoaded: true,
                            distanceToPlayer: distanceToPlayer
                        });
                        generatedCount++;
                    }
                } else {
                    // Store placement data without generating mesh (for later LOD loading)
                    this.generatedIslands.push({
                        id: placement.id,
                        mesh: null,
                        placement: placement,
                        template: placement.template,
                        generatedData: placement.generatedData,
                        isLoaded: false,
                        distanceToPlayer: distanceToPlayer
                    });
                    skippedCount++;
                }
                
                // Progress logging
                const processedCount = generatedCount + skippedCount;
                if (processedCount % 10 === 0 || processedCount === totalCount) {
                    console.log(`🏝️ Processed ${processedCount}/${totalCount} islands (Generated: ${generatedCount}, Deferred: ${skippedCount})`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to process island ${placement.id}:`, error);
                skippedCount++;
            }
        }
        
        console.log(`✅ LOD island generation complete: ${generatedCount} loaded, ${skippedCount} deferred`);
    }
    
    /**
     * Generate objects on all islands
     */
    async generateObjectsOnAllIslands() {
        console.log('🌲 Generating objects on all islands...');
        
        if (!this.islandObjectGenerator) {
            console.warn('Island object generator not available');
            return;
        }
        
        // Initialize the object generator
        await this.islandObjectGenerator.init();
        
        let processedCount = 0;
        const totalCount = this.generatedIslands.length;
        
        for (const islandData of this.generatedIslands) {
            try {
                const { mesh, placement, generatedData } = islandData;
                
                // Create seeded random for this specific island (same seed as island generation)
                const islandRandom = new SeededRandom(placement.localSeed);
                
                // Generate objects using the island's template configuration with caching
                const placedObjects = await this.islandObjectGenerator.generateObjectsOnIsland(
                    mesh,
                    generatedData.objectConfig,
                    generatedData.parameters,
                    islandRandom,
                    placement.id, // Island ID for caching
                    placement.localSeed // Seed for caching
                );
                
                // Store placed objects data with the island
                islandData.placedObjects = placedObjects;
                
                processedCount++;
                
                // Progress logging for object generation
                if (processedCount % 5 === 0 || processedCount === totalCount) {
                    console.log(`🌳 Generated objects on ${processedCount}/${totalCount} islands (${Math.round(processedCount/totalCount*100)}%)`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to generate objects on island ${islandData.id}:`, error);
                processedCount++;
            }
        }
        
        console.log(`✅ Successfully generated objects on ${processedCount} islands`);
    }
    
    /**
     * Generate objects only on islands within object render distance
     */
    async generateObjectsWithLOD() {
        console.log('🌲 Generating objects with LOD...');
        
        if (!this.islandObjectGenerator) {
            console.warn('Island object generator not available');
            return;
        }
        
        // Initialize the object generator
        await this.islandObjectGenerator.init();
        
        let processedCount = 0;
        let skippedCount = 0;
        const eligibleIslands = this.generatedIslands.filter(island => island.isLoaded && island.mesh);
        
        for (const islandData of eligibleIslands) {
            try {
                const { mesh, placement, generatedData } = islandData;
                
                // Calculate distance from player position
                const distanceToPlayer = this.playerPosition.distanceTo(placement.position);
                
                if (distanceToPlayer <= this.maxObjectRenderDistance) {
                    // Generate objects on islands within object render distance
                    const islandRandom = new SeededRandom(placement.localSeed);
                    
                    const placedObjects = await this.islandObjectGenerator.generateObjectsOnIsland(
                        mesh,
                        generatedData.objectConfig,
                        generatedData.parameters,
                        islandRandom,
                        placement.id, // Island ID for caching
                        placement.localSeed // Seed for caching
                    );
                    
                    // Store placed objects data with the island
                    islandData.placedObjects = placedObjects;
                    islandData.hasObjects = true;
                    processedCount++;
                } else {
                    // Mark island as not having objects loaded
                    islandData.hasObjects = false;
                    skippedCount++;
                }
                
                // Progress logging for object generation
                const totalProcessed = processedCount + skippedCount;
                if (totalProcessed % 5 === 0 || totalProcessed === eligibleIslands.length) {
                    console.log(`🌳 Object generation: ${processedCount} islands with objects, ${skippedCount} deferred`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to generate objects on island ${islandData.id}:`, error);
                skippedCount++;
            }
        }
        
        console.log(`✅ LOD object generation complete: ${processedCount} islands with objects, ${skippedCount} deferred`);
    }
    
    /**
     * Generate a single island mesh
     * @param {Object} placement - Island placement data
     * @returns {THREE.Mesh} Generated island mesh
     */
    async generateSingleIsland(placement) {
        const { generatedData, position } = placement;
        const { parameters } = generatedData;
        
        // Create geometry
        const geometry = new THREE.PlaneGeometry(
            parameters.size,
            parameters.size,
            parameters.resolution,
            parameters.resolution
        );
        
        // Create noise generator with island-specific seed
        const noise = new PerlinNoise(parameters.seed);
        
        // Create temporary island generator
        const tempGenerator = new IslandGenerator(this.scene, noise);
        
        // Override the generateCustomIsland method to use our parameters
        const originalMethod = tempGenerator.generateCustomIsland;
        tempGenerator.generateCustomIsland = (pos, geom) => {
            return this.generateCustomIslandTerrain(pos, geom, parameters, noise, generatedData);
        };
        
        // Generate the island
        const island = tempGenerator.generateCustomIsland(position, geometry);
        
        // Add metadata to the island
        if (island) {
            island.userData = {
                ...island.userData,
                islandId: placement.id,
                templateId: generatedData.templateId,
                templateName: generatedData.templateName,
                biome: generatedData.biome,
                isProceduralIsland: true,
                generatedAt: Date.now(),
                worldSeed: this.worldSeed
            };
            
            island.name = `${generatedData.templateName}_${placement.index}`;
        }
        
        return island;
    }
    
    /**
     * Generate custom island terrain using enhanced parameters
     * @param {THREE.Vector3} position - Island position
     * @param {THREE.PlaneGeometry} geometry - Island geometry
     * @param {Object} parameters - Generation parameters
     * @param {PerlinNoise} noise - Noise generator
     * @param {Object} generatedData - Complete generated data
     * @returns {THREE.Mesh} Generated island mesh
     */
    generateCustomIslandTerrain(position, geometry, parameters, noise, generatedData) {
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        
        // Use template-specific noise parameters
        const noiseScale = parameters.noiseScale;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const distance = Math.sqrt(x * x + y * y);
            
            // Calculate island dimensions
            const maxDimension = parameters.size / 2;
            const effectiveRadius = maxDimension;
            
            // Get base height from Perlin noise
            const baseHeight = noise.perlin((x + position.x) * noiseScale, (y + position.z) * noiseScale) * 
                              parameters.noiseHeight;
            
            // Calculate smooth gradient falloff
            const normalizedDistance = distance / effectiveRadius;
            
            let height;
            
            if (normalizedDistance > 1.3) {
                // Force underwater well beyond island boundary
                height = -10;
            } else {
                // Apply smooth exponential falloff using template's curve
                const falloffStrength = Math.pow(Math.max(0, normalizedDistance), parameters.falloffCurve);
                const heightMultiplier = Math.max(0, 1 - falloffStrength);
                
                // Smooth transition from full height to underwater
                height = baseHeight * heightMultiplier;
                
                // Gradually transition to underwater at the edges
                if (normalizedDistance > 1.0) {
                    const underwaterFactor = (normalizedDistance - 1.0) / 0.3;
                    const targetDepth = -10 * underwaterFactor;
                    height = Math.min(height, targetDepth);
                }
            }
            
            positions.setZ(i, height);
            
            // Use biome-specific coloring
            const color = this.getBiomeColor(height, generatedData.biome);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        // Create and position the island mesh
        const islandMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
        const island = new THREE.Mesh(geometry, islandMaterial);
        island.rotation.x = -Math.PI / 2;
        island.position.set(position.x, -5, position.z);
        
        this.scene.add(island);
        return island;
    }
    
    /**
     * Get biome-specific color for terrain height
     * @param {number} height - Terrain height
     * @param {Object} biome - Biome configuration
     * @returns {THREE.Color} Terrain color
     */
    getBiomeColor(height, biome) {
        const color = new THREE.Color();
        
        if (height <= 10) {
            // Beach/shore area - use secondary biome color (often sandy)
            color.set(biome.secondaryColor);
        } else {
            // Land area - use primary biome color
            color.set(biome.primaryColor);
            
            // Add some height-based variation
            if (height > 50) {
                // Higher elevations are slightly darker
                color.multiplyScalar(0.8);
            }
        }
        
        return color;
    }
    
    /**
     * Update world metadata after generation
     */
    updateWorldMetadata() {
        this.worldMetadata.totalIslands = this.generatedIslands.length;
        this.worldMetadata.actualDensity = this.generatedIslands.length / 
            (this.worldBounds.width * this.worldBounds.height / 1000000); // per sq km
        this.worldMetadata.generationCompleted = Date.now();
        
        // Template statistics
        this.worldMetadata.templateStats = this.islandTemplate.getDistributionSummary();
        
        // Object statistics
        if (this.generateObjects) {
            let totalObjects = 0;
            const objectTypeCount = {};
            
            this.generatedIslands.forEach(island => {
                if (island.placedObjects) {
                    totalObjects += island.placedObjects.length;
                    
                    island.placedObjects.forEach(obj => {
                        objectTypeCount[obj.type] = (objectTypeCount[obj.type] || 0) + 1;
                    });
                }
            });
            
            this.worldMetadata.objectStats = {
                totalObjects,
                objectTypeCount,
                averagePerIsland: totalObjects / this.generatedIslands.length
            };
        }
        
        // LOD statistics
        if (this.lodEnabled) {
            const loadedIslands = this.generatedIslands.filter(island => island.isLoaded).length;
            const islandsWithObjects = this.generatedIslands.filter(island => island.hasObjects).length;
            
            this.worldMetadata.lodStats = {
                enabled: true,
                maxIslandRenderDistance: this.maxIslandRenderDistance,
                maxObjectRenderDistance: this.maxObjectRenderDistance,
                loadedIslands,
                islandsWithObjects,
                totalIslands: this.generatedIslands.length
            };
        }
    }
    
    /**
     * Get world configuration for UI
     * @returns {Object} Current world configuration
     */
    getWorldConfig() {
        return {
            worldSeed: this.worldSeed,
            worldBounds: this.worldBounds,
            islandDensity: this.islandDensity,
            minIslandDistance: this.minIslandDistance,
            maxIslandDistance: this.maxIslandDistance,
            availableTemplates: this.islandTemplate.getAllTemplates(),
            metadata: this.worldMetadata
        };
    }
    
    /**
     * Update world parameters and regenerate if needed
     * @param {Object} newConfig - New configuration
     */
    updateWorldConfig(newConfig) {
        let needsRegeneration = false;
        
        if (newConfig.worldSeed !== undefined && newConfig.worldSeed !== this.worldSeed) {
            this.worldSeed = newConfig.worldSeed;
            this.random.setSeed(this.worldSeed);
            needsRegeneration = true;
        }
        
        if (newConfig.worldBounds !== undefined) {
            this.worldBounds = { ...this.worldBounds, ...newConfig.worldBounds };
            needsRegeneration = true;
        }
        
        if (newConfig.islandDensity !== undefined) {
            this.islandDensity = newConfig.islandDensity;
            needsRegeneration = true;
        }
        
        if (newConfig.minIslandDistance !== undefined) {
            this.minIslandDistance = newConfig.minIslandDistance;
            needsRegeneration = true;
        }
        
        if (newConfig.maxIslandDistance !== undefined) {
            this.maxIslandDistance = newConfig.maxIslandDistance;
            needsRegeneration = true;
        }
        
        if (newConfig.generateObjects !== undefined) {
            this.generateObjects = newConfig.generateObjects;
            // Object generation doesn't require full regeneration
        }
        
        if (newConfig.lodEnabled !== undefined) {
            this.lodEnabled = newConfig.lodEnabled;
            console.log(`🔄 LOD system ${this.lodEnabled ? 'enabled' : 'disabled'}`);
        }
        
        if (newConfig.maxIslandRenderDistance !== undefined) {
            this.maxIslandRenderDistance = newConfig.maxIslandRenderDistance;
            console.log(`🏝️ Island render distance updated to ${this.maxIslandRenderDistance}m`);
        }
        
        if (newConfig.maxObjectRenderDistance !== undefined) {
            this.maxObjectRenderDistance = newConfig.maxObjectRenderDistance;
            console.log(`🌳 Object render distance updated to ${this.maxObjectRenderDistance}m`);
        }
        
        if (needsRegeneration) {
            console.log('🔄 World parameters changed, regeneration needed');
            this.clearGeneratedWorld();
        }
        
        return needsRegeneration;
    }
    
    /**
     * Update player position and refresh LOD based on new position
     * @param {THREE.Vector3} newPosition - New player position
     */
    updatePlayerPosition(newPosition) {
        this.playerPosition.copy(newPosition);
        
        if (this.lodEnabled) {
            // Update LOD in the next frame to avoid blocking
            setTimeout(() => this.updateLOD(), 0);
        }
    }
    
    /**
     * Update Level of Detail based on current player position
     * Load/unload islands and objects based on distance
     */
    async updateLOD() {
        if (!this.lodEnabled || this.generatedIslands.length === 0) return;
        
        let islandsLoaded = 0;
        let islandsUnloaded = 0;
        let objectsLoaded = 0;
        let objectsUnloaded = 0;
        
        for (const islandData of this.generatedIslands) {
            const distanceToPlayer = this.playerPosition.distanceTo(islandData.placement.position);
            islandData.distanceToPlayer = distanceToPlayer;
            
            // Handle island mesh loading/unloading
            if (distanceToPlayer <= this.maxIslandRenderDistance) {
                // Island should be loaded
                if (!islandData.isLoaded && !islandData.mesh) {
                    await this.loadIsland(islandData);
                    islandsLoaded++;
                }
            } else {
                // Island should be unloaded
                if (islandData.isLoaded && islandData.mesh) {
                    this.unloadIsland(islandData);
                    islandsUnloaded++;
                }
            }
            
            // Handle object loading/unloading (only for loaded islands)
            if (islandData.isLoaded && islandData.mesh && this.generateObjects) {
                if (distanceToPlayer <= this.maxObjectRenderDistance) {
                    // Objects should be loaded
                    if (!islandData.hasObjects) {
                        await this.loadIslandObjects(islandData);
                        objectsLoaded++;
                    }
                } else {
                    // Objects should be unloaded
                    if (islandData.hasObjects) {
                        this.unloadIslandObjects(islandData);
                        objectsUnloaded++;
                    }
                }
            }
        }
        
        // Log LOD changes if anything happened
        if (islandsLoaded > 0 || islandsUnloaded > 0 || objectsLoaded > 0 || objectsUnloaded > 0) {
            console.log(`🔄 LOD Update: Islands (${islandsLoaded} loaded, ${islandsUnloaded} unloaded), Objects (${objectsLoaded} loaded, ${objectsUnloaded} unloaded)`);
        }
    }
    
    /**
     * Load a single island mesh
     * @param {Object} islandData - Island data to load
     */
    async loadIsland(islandData) {
        try {
            const island = await this.generateSingleIsland(islandData.placement);
            if (island) {
                islandData.mesh = island;
                islandData.isLoaded = true;
                console.log(`🏝️ Loaded island ${islandData.id} at distance ${islandData.distanceToPlayer.toFixed(0)}m`);
            }
        } catch (error) {
            console.error(`❌ Failed to load island ${islandData.id}:`, error);
        }
    }
    
    /**
     * Unload a single island mesh
     * @param {Object} islandData - Island data to unload
     */
    unloadIsland(islandData) {
        // First unload objects if they exist
        if (islandData.hasObjects) {
            this.unloadIslandObjects(islandData);
        }
        
        // Remove island mesh from scene
        if (islandData.mesh && this.scene) {
            this.scene.remove(islandData.mesh);
            
            // Dispose geometry and materials
            if (islandData.mesh.geometry) islandData.mesh.geometry.dispose();
            if (islandData.mesh.material) islandData.mesh.material.dispose();
        }
        
        islandData.mesh = null;
        islandData.isLoaded = false;
        console.log(`🗑️ Unloaded island ${islandData.id} at distance ${islandData.distanceToPlayer.toFixed(0)}m`);
    }
    
    /**
     * Load objects on a single island
     * @param {Object} islandData - Island data to load objects on
     */
    async loadIslandObjects(islandData) {
        if (!this.islandObjectGenerator || !islandData.mesh) return;
        
        try {
            const { placement, generatedData } = islandData;
            const islandRandom = new SeededRandom(placement.localSeed);
            
            const placedObjects = await this.islandObjectGenerator.generateObjectsOnIsland(
                islandData.mesh,
                generatedData.objectConfig,
                generatedData.parameters,
                islandRandom,
                placement.id, // Island ID for caching
                placement.localSeed // Seed for caching
            );
            
            islandData.placedObjects = placedObjects;
            islandData.hasObjects = true;
            console.log(`🌳 Loaded ${placedObjects.length} objects on island ${islandData.id}`);
        } catch (error) {
            console.error(`❌ Failed to load objects on island ${islandData.id}:`, error);
        }
    }
    
    /**
     * Unload objects from a single island
     * @param {Object} islandData - Island data to unload objects from
     */
    unloadIslandObjects(islandData) {
        if (islandData.placedObjects && this.islandObjectGenerator) {
            this.islandObjectGenerator.removeGeneratedObjects(islandData.placedObjects);
            delete islandData.placedObjects;
        }
        
        islandData.hasObjects = false;
        console.log(`🗑️ Unloaded objects from island ${islandData.id}`);
    }
    
    /**
     * Clear generated world data
     */
    clearGeneratedWorld() {
        // Remove islands and their objects from scene
        this.generatedIslands.forEach(island => {
            // Remove placed objects if they exist
            if (island.placedObjects && this.islandObjectGenerator) {
                this.islandObjectGenerator.removeGeneratedObjects(island.placedObjects);
            }
            
            // Remove island mesh
            if (island.mesh && this.scene) {
                this.scene.remove(island.mesh);
                // Dispose geometry and materials
                if (island.mesh.geometry) island.mesh.geometry.dispose();
                if (island.mesh.material) island.mesh.material.dispose();
            }
        });
        
        // Also remove any remaining generated objects and clear cache
        if (this.islandObjectGenerator) {
            this.islandObjectGenerator.removeAllGeneratedObjects();
            this.islandObjectGenerator.clearCache(); // Clear the placement cache
        }
        
        // Clear arrays
        this.islandPlacements = [];
        this.generatedIslands = [];
        this.worldMetadata.biomeDistribution = {};
    }
}

export default ProceduralWorldGenerator;
