import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Controls variables
let controls;
let targetPosition = new THREE.Vector3();
let isMoving = false;

/**
 * Sets up orbit controls and click handlers
 * @param {THREE.Camera} camera - The camera to control
 * @param {THREE.WebGLRenderer} renderer - The renderer for DOM events
 * @param {THREE.Object3D} ship - The ship to control
 * @param {THREE.Object3D} water - The water plane for raycasting
 * @returns {OrbitControls} The orbit controls
 */
function setupControls(camera, renderer, ship, water) {
    console.log('Setting up controls...');
    
    if (!camera || !renderer || !ship || !water) {
        console.error('Missing required parameters for setupControls:');
        console.error('Camera:', camera);
        console.error('Renderer:', renderer);
        console.error('Ship:', ship);
        console.error('Water:', water);
        return null;
    }
    
    // Orbit controls for camera movement with right-click
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    
    // Increase minimum distance to prevent zooming in too close to the boat
    controls.minDistance = 15; // Increased from 5 to 15
    controls.maxDistance = 100;
    
    // Reduce zoom speed by adjusting the zoom speed factor
    controls.zoomSpeed = 0.5; // Reduced from default 1.0 to 0.5
    
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
    
    // In Three.js v174, the mouse button configuration has changed
    // RIGHT is now the primary button (0), MIDDLE is the auxiliary button (1)
    controls.mouseButtons = {
        LEFT: -1,  // Disable left button (we use it for ship movement)
        MIDDLE: 1, // Middle button for dolly/zoom
        RIGHT: 0   // Right button for rotation
    };
    
    // Set the target of the controls to the ship
    controls.target.copy(ship.position);
    
    // Left-click to move ship
    renderer.domElement.addEventListener('click', (event) => onMouseClick(event, camera, ship, water));
    
    console.log('Controls set up successfully');
    return controls;
}

/**
 * Handle mouse click to move the ship
 * @param {MouseEvent} event - The mouse event
 * @param {THREE.Camera} camera - The camera for raycasting
 * @param {THREE.Object3D} ship - The ship to move
 * @param {THREE.Object3D} water - The water plane for raycasting
 */
function onMouseClick(event, camera, ship, water) {
    // Only handle left clicks
    if (event.button !== 0) return;
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections with the water
    const intersects = raycaster.intersectObject(water);
    
    if (intersects.length > 0) {
        // Set target position to the intersection point
        targetPosition.copy(intersects[0].point);
        
        // Calculate direction to target
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, ship.position)
            .normalize();
        
        // Set ship rotation to face the target
        ship.rotation.y = Math.atan2(direction.x, direction.z);
        
        isMoving = true;
    }
}

/**
 * Update ship movement towards target
 * @param {THREE.Object3D} ship - The ship to move
 * @param {number} delta - Time delta
 * @param {number} time - Current time
 * @returns {boolean} Whether the ship is still moving
 */
function updateShipMovement(ship, delta, time) {
    if (!ship) {
        console.error('Ship not provided to updateShipMovement');
        return false;
    }
    
    if (isMoving) {
        // Calculate direction and distance to target
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, ship.position)
            .normalize();
        const distance = ship.position.distanceTo(targetPosition);
        
        // Move ship if not very close to target
        if (distance > 0.1) {
            // Move ship at a constant speed
            const moveSpeed = 5 * delta;
            ship.position.add(direction.multiplyScalar(moveSpeed));
            
            // Add slight bobbing motion
            ship.rotation.x = Math.sin(time * 2) * 0.05;
            ship.rotation.z = Math.sin(time * 1.5) * 0.05;
            
            // Update camera target to follow ship
            if (controls) {
                controls.target.copy(ship.position);
            }
            
            return true; // Still moving
        } else {
            isMoving = false;
        }
    }
    
    // Add gentle bobbing even when not moving
    if (!isMoving) {
        ship.rotation.x = Math.sin(time * 1.5) * 0.03;
        ship.rotation.z = Math.sin(time * 1.2) * 0.03;
    }
    
    return isMoving;
}

// Export functions and variables
export {
    setupControls,
    updateShipMovement,
    controls,
    targetPosition,
    isMoving
}; 