/**
 * TreeChoppingTest.js - Test for the direct tree chopping functionality
 * This file helps verify that tree chopping works correctly
 */
import * as THREE from 'three';
import ChopTree from '../systems/CollectResources/ChopTree.js';

class TreeChoppingTest {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.testTree = null;
        this.chopTree = null;
        
        // Initialize the test
        this.init();
    }
    
    init() {
        console.log('Initializing Tree Chopping Test');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Create a ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x7CFC00 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        
        // Create a test tree
        this.createTestTree();
        
        // Initialize ChopTree system
        this.chopTree = new ChopTree({
            scene: this.scene,
            soundManager: window.soundManager
        });
        
        // Add click handler for the test tree
        window.addEventListener('click', this.handleClick.bind(this));
        
        // Add UI instructions
        this.addInstructions();
        
        // Start animation loop
        this.animate();
        
        console.log('Tree Chopping Test initialized');
    }
    
    createTestTree() {
        // Create a simple tree for testing
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1;
        
        const leavesGeometry = new THREE.ConeGeometry(1.5, 4, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 3;
        
        // Create a group for the tree
        this.testTree = new THREE.Group();
        this.testTree.add(trunk);
        this.testTree.add(leaves);
        
        // Add userData to identify the tree type
        this.testTree.userData = {
            type: 'firTreeLarge',
            isTestTree: true
        };
        
        // Generate a unique identifier for the tree
        this.testTree.uuid = THREE.MathUtils.generateUUID();
        
        // Add to scene
        this.scene.add(this.testTree);
        
        console.log('Test tree created with UUID:', this.testTree.uuid);
    }
    
    handleClick(event) {
        // Calculate mouse position in normalized device coordinates
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Create raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        // Check for intersections with the test tree
        const intersects = raycaster.intersectObject(this.testTree, true);
        
        if (intersects.length > 0) {
            console.log('Test tree clicked!');
            
            // Start chopping the tree
            if (this.chopTree) {
                this.chopTree.startChopping(this.testTree);
            }
        }
    }
    
    addInstructions() {
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.top = '10px';
        instructions.style.left = '10px';
        instructions.style.color = 'white';
        instructions.style.fontFamily = 'Arial, sans-serif';
        instructions.style.padding = '10px';
        instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
        instructions.style.borderRadius = '5px';
        instructions.innerHTML = `
            <h3>Tree Chopping Test</h3>
            <p>Click on the tree to start chopping.</p>
            <p>After 10 chops, the tree will be felled and +1 wood added to your inventory.</p>
            <p>The tree will respawn after 60 seconds.</p>
        `;
        document.body.appendChild(instructions);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update the chopping system
        if (this.chopTree) {
            this.chopTree.update(0.016); // Approximately 60fps delta time
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    // Clean up resources
    destroy() {
        if (this.renderer) {
            document.body.removeChild(this.renderer.domElement);
        }
        
        if (this.chopTree) {
            this.chopTree.destroy();
        }
        
        window.removeEventListener('click', this.handleClick.bind(this));
    }
}

// Create and expose the test instance
const treeChoppingTest = new TreeChoppingTest();
window.treeChoppingTest = treeChoppingTest; 