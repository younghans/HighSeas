import * as THREE from 'three';
import PerlinNoise from './PerlinNoise.js';

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

    generateIslands(islandPositions, islandSize = 400) {
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
        });
    }

    /**
     * Generates a single custom-sized island
     * @param {Object} position - The x,z position of the island
     * @param {THREE.PlaneGeometry} customGeometry - The geometry to use for the island
     * @param {Object} customParams - Optional custom parameters for noise generation
     * @returns {THREE.Mesh} - The created island mesh
     */
    generateCustomIsland(position, customGeometry, customParams = null) {
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
        
        return island;
    }

    getIslands() {
        return this.islands;
    }
}

export default IslandGenerator; 