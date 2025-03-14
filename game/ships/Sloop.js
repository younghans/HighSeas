import * as THREE from 'three';
import BaseShip from './BaseShip.js';

/**
 * Sloop ship class - a small, fast sailing vessel
 * @extends BaseShip
 */
class Sloop extends BaseShip {
    /**
     * Create a new Sloop ship
     * @param {THREE.Scene} scene - The scene to add the ship to
     * @param {Object} options - Ship configuration options
     */
    constructor(scene, options = {}) {
        // Set default options for a Sloop before calling super
        const sloopOptions = {
            // Sloops are fast but small
            speed: options.speed || 10,
            hullColor: options.hullColor || 0x8B4513,
            deckColor: options.deckColor || 0xD2B48C,
            sailColor: options.sailColor || 0xFFFFFF,
            // Add any other sloop-specific options here
            ...options
        };
        
        // Call the parent constructor with our options
        super(scene, sloopOptions);
        
        // Create the ship mesh
        this.createShip();
        
        // Initialize wake particle system after ship mesh is created
        this.initWakeParticleSystem();
    }
    
    /**
     * Create the sloop ship mesh
     */
    createShip() {
        const shipGroup = new THREE.Group();
        
        // Hull material
        const hullMaterial = new THREE.MeshStandardMaterial({ 
            color: this.hullColor,
            roughness: 0.7,
            metalness: 0.2,
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1.0
        });
        
        const hullWidth = 2;
        const hullHeight = 0.8;
        const hullLength = 4;
        
        const hullGeometry = new THREE.BufferGeometry();
        
        // Define vertices for boat hull with triangular front
        const vertices = [];
        
        // Top vertices (deck level)
        vertices.push(
            // Main hull vertices
            -hullWidth/2, hullHeight, hullLength/2,    // 0: back left
            hullWidth/2, hullHeight, hullLength/2,     // 1: back right
            hullWidth/2, hullHeight, -hullLength/2,    // 2: front right
            -hullWidth/2, hullHeight, -hullLength/2,   // 3: front left
            0, hullHeight, hullLength/2 + 1            // 4: bow point (top)
        );
        
        // Bottom vertices (narrower)
        const bottomWidth = hullWidth * 0.6;
        const bottomLength = hullLength * 0.8;
        vertices.push(
            -bottomWidth/2, 0, bottomLength/2,         // 5: back left
            bottomWidth/2, 0, bottomLength/2,          // 6: back right
            bottomWidth/2, 0, -bottomLength/2,         // 7: front right
            -bottomWidth/2, 0, -bottomLength/2,        // 8: front left
            0, 0, bottomLength/2 + 1                   // 9: bow point (bottom)
        );
        
        // Define triangles with correct winding order
        const indices = [
            // Bottom face (now properly oriented)
            5, 7, 6,    // Bottom face main 1
            5, 8, 7,    // Bottom face main 2
            5, 6, 9,    // Bottom bow triangle
            
            // Top face
            2, 3, 0,    // Top face main 1
            2, 0, 1,    // Top face main 2
            1, 0, 4,    // Top bow triangle
            
            // Back face
            0, 3, 5,    // Back left
            5, 8, 3,    // Back right
            
            // Left side
            0, 5, 4,    // Left main
            5, 9, 4,    // Left bow
            
            // Right side
            1, 6, 2,    // Right main
            6, 7, 2,    // Right connection
            1, 4, 9,    // Right bow top
            1, 9, 6,    // Right bow bottom
            
            // Front faces (bow)
            3, 2, 8,    // Front face left
            8, 2, 7,    // Front face right
            
            // Bow closure faces
            4, 9, 0,    // Bow left
            4, 1, 9     // Bow right
        ];
        
        // Set geometry attributes
        hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        hullGeometry.setIndex(indices);
        hullGeometry.computeVertexNormals();
        
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        hull.castShadow = true;
        hull.receiveShadow = true;
        shipGroup.add(hull);
        
        // Create custom deck geometry to match hull shape including bow
        const deckGeometry = new THREE.BufferGeometry();
        
        // Define deck vertices (slightly smaller than hull top)
        const deckScale = 0.9;
        const deckVertices = [
            // Main deck rectangle
            -hullWidth/2 * deckScale, hullHeight + 0.05, hullLength/2 * deckScale,     // 0: back left
            hullWidth/2 * deckScale, hullHeight + 0.05, hullLength/2 * deckScale,      // 1: back right
            hullWidth/2 * deckScale, hullHeight + 0.05, -hullLength/2 * deckScale,     // 2: front right
            -hullWidth/2 * deckScale, hullHeight + 0.05, -hullLength/2 * deckScale,    // 3: front left
            0, hullHeight + 0.05, hullLength/2 + 0.9                                    // 4: bow point
        ];
        
        // Define deck triangles
        const deckIndices = [
            // Main deck surface
            3, 2, 1,        // Main deck triangle 1
            3, 1, 0,        // Main deck triangle 2
            0, 1, 4         // Bow triangle
        ];
        
        deckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(deckVertices, 3));
        deckGeometry.setIndex(deckIndices);
        deckGeometry.computeVertexNormals();
        
        const deckMaterial = new THREE.MeshStandardMaterial({ 
            color: this.deckColor,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        deck.castShadow = true;
        deck.receiveShadow = true;
        shipGroup.add(deck);
        
        // Mast - centered on the boat
        const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
        const mastMaterial = new THREE.MeshStandardMaterial({ 
            color: this.hullColor,
            roughness: 0.9,
            metalness: 0.1
        });
        const mast = new THREE.Mesh(mastGeometry, mastMaterial);
        mast.position.y = hullHeight + 0.1 + 2; // Height above deck
        mast.position.z = 0; // Centered on boat
        mast.castShadow = true;
        shipGroup.add(mast);
        
        // Sail - centered with mast
        const sailGeometry = new THREE.PlaneGeometry(2, 3);
        const sailMaterial = new THREE.MeshStandardMaterial({ 
            color: this.sailColor,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.0
        });
        const sail = new THREE.Mesh(sailGeometry, sailMaterial);
        sail.position.y = hullHeight + 0.1 + 2; // Same height as mast
        sail.position.z = 0; // Centered with mast
        sail.rotation.y = 0; // Perpendicular to boat length
        sail.castShadow = true;
        shipGroup.add(sail);

        // Position the ship
        shipGroup.position.copy(this.position);
        
        // Ensure ship renders properly with wind particles
        shipGroup.renderOrder = 0; // Higher than wind particles
        
        // Add all meshes in the ship to ensure they render properly
        shipGroup.traverse(function(object) {
            if (object.isMesh) {
                object.renderOrder = 0; // Higher than wind particles
            }
        });
        
        this.scene.add(shipGroup);
        this.shipMesh = shipGroup;
        
        // Ensure the internal position matches the mesh position
        this.position.copy(this.shipMesh.position);
    }
}

export default Sloop; 