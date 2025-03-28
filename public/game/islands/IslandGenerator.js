import * as THREE from 'three';
import PerlinNoise from './PerlinNoise.js';

// Function to create a simple tree model
function createTree() {
    const tree = new THREE.Group();
    
    // Trunk: a cylinder
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 5, 8),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 }) // Brown color
    );
    trunk.position.y = 2.5; // Position at half height
    tree.add(trunk);
    
    // Foliage: a sphere
    const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x228B22 }) // Green color
    );
    foliage.position.y = 5; // Position above trunk
    tree.add(foliage);
    
    // Scale down the tree
    tree.scale.set(0.5, 0.5, 0.5);
    
    return tree;
}

class IslandGenerator {
    constructor(scene, noise = new PerlinNoise(8888)) {
        this.scene = scene;
        this.noise = noise;
        this.islands = [];
        this.seed = noise.seed;
        this.rng = this._createSeededRandom(this.seed);
    }

    // Simple seeded random function
    _createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    generateIslands(islandPositions, numTreesPerIsland = 10, islandSize = 400) {
        islandPositions.forEach(pos => {
            // Generate island geometry with larger size
            const islandGeometry = new THREE.PlaneGeometry(islandSize, islandSize, 50, 50);
            const positions = islandGeometry.attributes.position;
            const colors = new Float32Array(positions.count * 3);

            // Adjust noise scale based on island size to maintain terrain detail
            const noiseScale = 0.015 * (200 / islandSize);
            
            // Scale the distance falloff based on island size
            const falloffFactor = 0.3 * (200 / islandSize);

            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const distance = Math.sqrt(x * x + y * y);
                
                // Scale the distance falloff with island size
                const height = this.noise.perlin((x + pos.x) * noiseScale, (y + pos.z) * noiseScale) * 80 - distance * falloffFactor;
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

            islandGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            islandGeometry.computeVertexNormals();

            // Create and position the island mesh
            const islandMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
            const island = new THREE.Mesh(islandGeometry, islandMaterial);
            island.rotation.x = -Math.PI / 2;
            island.position.set(pos.x, -5, pos.z);
            this.scene.add(island);
            this.islands.push(island);

            // Place trees on the island
            this._placeTrees(island, islandGeometry, numTreesPerIsland);
        });
    }

    /**
     * Generates a single custom-sized island
     * @param {Object} position - The x,z position of the island
     * @param {THREE.PlaneGeometry} customGeometry - The geometry to use for the island
     * @param {number} numTrees - Number of trees to place on the island
     * @param {Object} customParams - Optional custom parameters for noise generation
     * @returns {THREE.Mesh} - The created island mesh
     */
    generateCustomIsland(position, customGeometry, numTrees = 10, customParams = null) {
        const positions = customGeometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);

        // Use custom parameters if provided, otherwise use defaults
        const params = customParams || {};
        
        // Check if we need to use a specific seed
        const useCustomNoise = params.seed !== undefined && params.seed !== null;
        const islandNoise = useCustomNoise ? new PerlinNoise(params.seed) : this.noise;
        
        // If we have all custom parameters, use exact creative mode formula
        if (params.noiseScale && params.noiseHeight && params.falloffFactor && params.size) {
            // This is identical to the creative-standalone.js implementation
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const distance = Math.sqrt(x * x + y * y);
                
                // Scale the falloff based on the island size - EXACT same formula as creative-standalone.js
                const maxDimension = Math.max(params.size, params.size) / 2;
                const scaledDistance = distance / maxDimension * 200; // Scale relative to a 400x400 island
                
                // IMPORTANT: For exported islands, we IGNORE the current position when sampling noise
                // This ensures the island has exactly the same shape regardless of where it's placed
                const height = islandNoise.perlin(x * params.noiseScale, y * params.noiseScale) * 
                               params.noiseHeight - scaledDistance * params.falloffFactor;
                
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
        } else {
            // Get size from geometry and calculate scale factors for procedural islands
            const sizeX = customGeometry.parameters.width;
            const sizeY = customGeometry.parameters.height;
            const sizeScaleFactor = Math.max(sizeX, sizeY) / 200;
            
            const noiseScale = params.noiseScale || (0.02 / Math.sqrt(sizeScaleFactor));
            const noiseHeight = params.noiseHeight || (40 * Math.sqrt(sizeScaleFactor));
            const falloffFactor = params.falloffFactor || (0.2 * (1 / sizeScaleFactor));
            
            // Generate the terrain using procedural formula
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const distance = Math.sqrt(x * x + y * y);
                
                // Scale the distance
                const maxDimension = Math.max(sizeX, sizeY) / 2;
                const scaledDistance = distance / maxDimension * 200;
                
                // Generate height using Perlin noise
                const height = islandNoise.perlin((x + position.x) * noiseScale, (y + position.z) * noiseScale) * 
                               noiseHeight - scaledDistance * falloffFactor;
                
                positions.setZ(i, height);

                // Set color based on height
                const color = new THREE.Color();
                if (height <= 10 * sizeScaleFactor) {
                    color.set(0xC2B280); // Sandy color
                } else {
                    color.set(0x6B8E23); // Green color
                }

                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
        }

        customGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        customGeometry.computeVertexNormals();

        // Create and position the island mesh
        const islandMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
        const island = new THREE.Mesh(customGeometry, islandMaterial);
        island.rotation.x = -Math.PI / 2;
        island.position.set(position.x, -5, position.z);
        this.scene.add(island);
        this.islands.push(island);

        // Place trees on the island if treeCount is greater than 0
        if (numTrees > 0) {
            this._placeTrees(island, customGeometry, numTrees);
        }
        
        return island;
    }

    /**
     * Private method to place trees on an island
     * @param {THREE.Mesh} island - The island mesh
     * @param {THREE.PlaneGeometry} geometry - The island geometry 
     * @param {number} numTrees - Number of trees to place
     */
    _placeTrees(island, geometry, numTrees) {
        const positions = geometry.attributes.position;
        const suitableTriangles = [];
        const index = geometry.index;

        // Identify triangles where average vertex height > 8
        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i);
            const b = index.getX(i + 1);
            const c = index.getX(i + 2);
            const zA = positions.getZ(a);
            const zB = positions.getZ(b);
            const zC = positions.getZ(c);
            const avgHeight = (zA + zB + zC) / 3;
            if (avgHeight > 8) {
                suitableTriangles.push([a, b, c]);
            }
        }

        // Place the specified number of trees
        for (let i = 0; i < numTrees && suitableTriangles.length > 0; i++) {
            // Select a random triangle using seeded RNG
            const triIndex = Math.floor(this.rng() * suitableTriangles.length);
            const [a, b, c] = suitableTriangles[triIndex];

            // Get vertex positions
            const posA = new THREE.Vector3().fromBufferAttribute(positions, a);
            const posB = new THREE.Vector3().fromBufferAttribute(positions, b);
            const posC = new THREE.Vector3().fromBufferAttribute(positions, c);

            // Generate random barycentric coordinates using seeded RNG
            const r1 = this.rng();
            const r2 = this.rng();
            const sqrtR1 = Math.sqrt(r1);
            const baryA = 1 - sqrtR1;
            const baryB = sqrtR1 * (1 - r2);
            const baryC = sqrtR1 * r2;

            // Compute local position
            const localPos = new THREE.Vector3(
                baryA * posA.x + baryB * posB.x + baryC * posC.x,
                baryA * posA.y + baryB * posB.y + baryC * posC.y,
                baryA * posA.z + baryB * posB.z + baryC * posC.z
            );

            // Convert to world coordinates
            const worldPos = island.localToWorld(localPos.clone());

            // Create and position the tree
            const tree = createTree();
            tree.position.copy(worldPos);
            this.scene.add(tree);
        }
    }

    getIslands() {
        return this.islands;
    }
}

export default IslandGenerator; 