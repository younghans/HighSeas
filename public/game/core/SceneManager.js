import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class SceneManager {
    constructor() {
        // Core THREE.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();
        
        // Camera settings
        this.cameraOffset = new THREE.Vector3(0, 10, 20);
        
        // Animation frame ID for cleanup
        this.animationFrameId = null;
        
        // Bind methods to maintain context
        this.onWindowResize = this.onWindowResize.bind(this);
        this.animate = this.animate.bind(this);
    }
    
    // Initialize the basic scene, camera and renderer
    initialize() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
        this.camera.position.set(0, 100, 300); // Default position
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize);
        
        return this;
    }
    
    // Setup controls for cinematic/menu view
    setupMenuControls() {
        // Clean up any existing controls
        this.disposeControls();
        
        // Create new orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
        
        // Configure for menu controls
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        
        // Set auto-rotation for a cinematic effect
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.1;
        
        // Set the target to the center of the scene
        this.controls.target.set(0, 0, 0);
        
        // Update controls
        this.controls.update();
        
        return this;
    }
    
    // Setup controls for gameplay
    setupGameplayControls(targetObject = null) {
        // Clean up any existing controls
        this.disposeControls();
        
        // Create new orbit controls for gameplay
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
        
        // Configure for gameplay - allow both left and right click for camera rotation
        // InputManager will detect and handle simple left-clicks for movement
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,  // Allow left click for camera rotation
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        
        // Set target if provided
        if (targetObject) {
            // Get position of the target object
            const targetPosition = new THREE.Vector3();
            if (typeof targetObject.getPosition === 'function') {
                targetPosition.copy(targetObject.getPosition());
            } else if (targetObject.position) {
                targetPosition.copy(targetObject.position);
            }
            
            // Set controls target
            this.controls.target.copy(targetPosition);
            
            // Position camera relative to target using offset
            this.camera.position.copy(targetPosition).add(this.cameraOffset);
        }
        
        // Update controls
        this.controls.update();
        
        return this;
    }
    
    // Handle window resize
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    // Clean up controls
    disposeControls() {
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
    }
    
    // Add click event listener
    addClickEventListener(callback) {
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.addEventListener('click', callback);
        }
        return this;
    }
    
    // Remove click event listener
    removeClickEventListener(callback) {
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.removeEventListener('click', callback);
        }
        return this;
    }
    
    // Start animation loop
    startAnimationLoop(updateCallback) {
        // Store the callback
        this.updateCallback = updateCallback;
        
        // Start the animation loop
        this.animate();
        
        return this;
    }
    
    // Animation loop
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // Call update callback if exists
        if (this.updateCallback) {
            this.updateCallback(delta, elapsedTime);
        }
        
        // Update controls if they exist
        if (this.controls) {
            this.controls.update();
        }
        
        // Render the scene
        if (this.scene && this.camera && this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // Update camera to follow a target
    updateCameraToFollowTarget(target) {
        if (!this.controls || !this.camera || !target) return;
        
        // Get the target position
        const targetPosition = new THREE.Vector3();
        if (typeof target.getPosition === 'function') {
            targetPosition.copy(target.getPosition());
        } else if (target.position) {
            targetPosition.copy(target.position);
        } else {
            return;
        }
        
        // Store the current distance from camera to target
        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        
        // Store the current camera orientation relative to the target
        const direction = new THREE.Vector3()
            .subVectors(this.camera.position, this.controls.target)
            .normalize();
        
        // Update the orbit controls target to follow the target
        this.controls.target.copy(targetPosition);
        
        // Reposition the camera at the same distance and orientation
        this.camera.position.copy(targetPosition).add(
            direction.multiplyScalar(currentDistance)
        );
        
        // Update controls but don't let it change the camera position
        const tempPosition = this.camera.position.clone();
        this.controls.update();
        this.camera.position.copy(tempPosition);
    }
    
    // Clean up resources
    dispose() {
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove window resize listener
        window.removeEventListener('resize', this.onWindowResize);
        
        // Dispose controls
        this.disposeControls();
        
        // Remove renderer from DOM if it exists
        if (this.renderer && this.renderer.domElement) {
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
    
    // Getters for external access
    getScene() {
        return this.scene;
    }
    
    getCamera() {
        return this.camera;
    }
    
    getRenderer() {
        return this.renderer;
    }
    
    getControls() {
        return this.controls;
    }
    
    getClock() {
        return this.clock;
    }
}

export default SceneManager; 