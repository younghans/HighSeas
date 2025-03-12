import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import IslandGenerator from './IslandGenerator.js';
import World from './world.js';
import Ship from './ship.js';
import { WindSystem } from './wind.js';
import MarketStall from './objects/market-stall.js';
import Dock from './objects/dock.js';

// Main game variables
let scene, camera, renderer;
let controls;
let clock = new THREE.Clock();
let cameraOffset = new THREE.Vector3(0, 10, 20); // Camera offset from ship
let world; // World instance that contains sky, water, lighting, etc.
let ship; // Ship instance
let windSystem; // Wind system instance
let gameStarted = false; // Flag to track if the game has started

// Island generator
let islandGenerator;

// Add this variable to track the currently selected island
let selectedIsland = null;
let islandMenuOpen = false;
const ISLAND_INTERACTION_DISTANCE = 50; // Distance at which ship can interact with island

// Add a variable to track the clicked point on the island
let selectedIslandPoint = null;

// Build mode variables
let buildMode = false;
let buildObject = null;
let buildPreview = null;
const WATER_LEVEL_THRESHOLD = 0; // Y-value above which we consider the island to be "above water"

// Raycaster for build mode
const buildRaycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Add these variables with the other game variables
let buildingMenuOpen = false;
let currentBuildingType = null;

// Initialize only the world (for main menu)
function initWorldOnly() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(0, 100, 300); // Higher and further back for a better view of the world
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Initialize world (sky, water, lighting, etc.)
    world = new World(scene);
    
    // Setup orbit controls for the main menu view
    setupMenuControls();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Initialize wind system
    windSystem = new WindSystem(scene, camera, {
        windSpeed: 20,
        changeInterval: 15,
        transitionDuration: 3
    });
    
    // Generate islands
    generateIslands();
    
    // Create minimal UI for main menu
    createMinimalUI();
    
    // Start animation loop
    animate();
}

// Setup controls for the main menu (orbiting camera)
function setupMenuControls() {
    // Orbit controls for camera movement
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 100;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
    
    // Set auto-rotation for a cinematic effect
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.1;
    
    // Set the target to the center of the scene
    controls.target.set(0, 0, 0);
}

// Create minimal UI for main menu
function createMinimalUI() {
    // Create info panel with minimal information
    const infoElement = document.createElement('div');
    infoElement.id = 'info';
    infoElement.innerHTML = `
        <h2>Yarr!</h2>
        <p>Click Play to start your adventure!</p>
    `;
    document.body.appendChild(infoElement);
}

// Start the full game with ship and controls
function startGame() {
    // Set game started flag
    gameStarted = true;
    
    // Reset camera position for gameplay
    camera.position.set(0, 10, 20);
    
    // Remove auto-rotation
    controls.autoRotate = false;
    
    // Create ship with custom speed
    ship = new Ship(scene, { speed: 5 });
    
    // Setup gameplay controls
    setupGameplayControls();
    
    // Update UI for gameplay
    updateUIForGameplay();
    
    // Add event listener for mouse movement (for build mode)
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // Add event listener for keyboard (for exiting build mode)
    document.addEventListener('keydown', onKeyDown);
}

// Setup controls for gameplay
function setupGameplayControls() {
    // Remove existing controls
    controls.dispose();
    
    // Create new orbit controls for gameplay
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
    controls.mouseButtons = {
        LEFT: null,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
    };
    
    // Set the target of the controls to the ship
    controls.target.copy(ship.getPosition());
    
    // Left-click to move ship or interact with islands
    renderer.domElement.addEventListener('click', onMouseClick);
}

// Update UI for gameplay
function updateUIForGameplay() {
    // Update info panel for gameplay
    const infoElement = document.getElementById('info');
    infoElement.innerHTML = `
        <h2>Yarr!</h2>
        <p>Left-click: Move ship to location</p>
        <p>Right-click drag: Move camera</p>
    `;
}

// Initialize the scene (original init function, kept for backward compatibility)
function init() {
    initWorldOnly();
    startGame();
}

// Generate islands in the ocean
function generateIslands() {
    // Initialize island generator
    islandGenerator = new IslandGenerator(scene);
    
    // Define island positions
    const islandPositions = [
        new THREE.Vector3(500, 0, 300),
        new THREE.Vector3(-700, 0, -400),
        new THREE.Vector3(300, 0, -800),
        new THREE.Vector3(-500, 0, 600),
        new THREE.Vector3(1000, 0, -200)
    ];
    
    // Generate islands with 15 trees per island
    islandGenerator.generateIslands(islandPositions, 15);
    
    // Generate a larger custom island
    const customGeometry = new THREE.PlaneGeometry(400, 400, 80, 80);
    islandGenerator.generateCustomIsland(new THREE.Vector3(-200, 0, 1000), customGeometry, 30);
}

function onMouseClick(event) {
    // Only handle left clicks
    if (event.button !== 0) return;
    
    // If game hasn't started, ignore clicks
    if (!gameStarted) return;
    
    // Update mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // If in build mode, handle building placement
    if (buildMode && buildPreview) {
        // Create a raycaster
        buildRaycaster.setFromCamera(mouse, camera);
        
        // Check for intersections with islands
        const islandIntersects = buildRaycaster.intersectObjects(islandGenerator.getIslands());
        
        if (islandIntersects.length > 0) {
            const intersection = islandIntersects[0];
            const clickedPoint = intersection.point;
            
            // Check if the clicked point is above water
            if (clickedPoint.y > WATER_LEVEL_THRESHOLD) {
                // Place the building at the clicked point
                placeBuilding(clickedPoint);
                
                // Exit build mode
                exitBuildMode();
                return;
            }
        }
        
        // If we get here, the click wasn't on a valid build location
        return;
    }
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Get all islands from the island generator
    const islands = islandGenerator.getIslands();
    
    // Check for intersections with islands first
    const islandIntersects = raycaster.intersectObjects(islands);
    
    if (islandIntersects.length > 0) {
        // An island was clicked
        const intersection = islandIntersects[0];
        const clickedIsland = intersection.object;
        
        // Get the exact point of intersection in world coordinates
        const intersectionPoint = intersection.point;
        
        // Check if the clicked point is above water
        if (intersectionPoint.y > WATER_LEVEL_THRESHOLD) {
            // Clicked on a part of the island that's above water
            selectedIsland = clickedIsland;
            
            // Store the exact clicked point (only X and Z coordinates, ignoring Y/height)
            // We'll use the ship's current Y value for the target position
            const clickedPoint = new THREE.Vector3(
                intersectionPoint.x,
                ship.getPosition().y, // Use ship's Y position, not the terrain height
                intersectionPoint.z
            );
            
            // Get ship position
            const shipPos = ship.getPosition().clone();
            
            // Calculate distance between ship and clicked point (ignoring Y axis)
            const shipPosFlat = new THREE.Vector3(shipPos.x, 0, shipPos.z);
            const clickedPointFlat = new THREE.Vector3(clickedPoint.x, 0, clickedPoint.z);
            const distance = shipPosFlat.distanceTo(clickedPointFlat);
            
            if (distance <= ISLAND_INTERACTION_DISTANCE) {
                // Ship is close enough to the clicked point, stop the ship and show menu
                ship.stopMoving();
                showIslandMenu(clickedIsland, clickedPoint);
            } else {
                // Ship is too far, move it closer to the clicked point
                // Calculate a position near the clicked point for the ship to move to
                const direction = new THREE.Vector3().subVectors(clickedPointFlat, shipPosFlat).normalize();
                
                // Calculate a position that's just within interaction distance of the clicked point
                const targetPosition = new THREE.Vector3().addVectors(
                    clickedPointFlat,
                    direction.multiplyScalar(-ISLAND_INTERACTION_DISTANCE * 0.8) // Move slightly closer than the minimum distance
                );
                
                // Ensure Y position is the same as the ship's current Y position
                targetPosition.y = ship.getPosition().y;
                
                // Store the clicked point for later use when the ship arrives
                // We store only the X and Z coordinates, using the ship's Y position
                ship.targetIslandPoint = clickedPoint;
                
                // Move ship to the target position
                ship.moveTo(targetPosition);
            }
        } else {
            // Clicked on a part of the island that's underwater - treat as water click
            handleWaterClick(raycaster);
        }
    } else {
        // No island was clicked, check for water intersection
        handleWaterClick(raycaster);
    }
}

// Helper function to handle water clicks
function handleWaterClick(raycaster) {
    // If in build mode, ignore water clicks
    if (buildMode) return;
    
    const waterIntersects = raycaster.intersectObject(world.getWater());
    
    if (waterIntersects.length > 0) {
        // Close island menu if open
        if (islandMenuOpen) {
            hideIslandMenu();
        }
        
        // Get target position
        const targetPosition = waterIntersects[0].point;
        
        // Ensure Y position doesn't change - use the ship's current Y position
        targetPosition.y = ship.getPosition().y;
        
        // Tell the ship to move to the target position
        ship.moveTo(targetPosition);
    }
}

function showIslandMenu(island, clickedPoint) {
    // Stop the ship's movement when opening the island menu
    ship.stopMoving();
    
    // Create or show the island menu
    islandMenuOpen = true;
    
    // Store the clicked point
    selectedIslandPoint = clickedPoint;
    
    // If menu doesn't exist, create it
    if (!document.getElementById('islandMenu')) {
        const menu = document.createElement('div');
        menu.id = 'islandMenu';
        
        // Add menu content
        menu.innerHTML = `
            <h2>Island Menu</h2>
            <p>You've discovered an island!</p>
            <button id="buildingModeButton">Building Mode</button>
            <button id="closeMenuButton">Close</button>
        `;
        
        document.body.appendChild(menu);
        
        // Add event listeners to buttons
        document.getElementById('buildingModeButton').addEventListener('click', () => {
            enterBuildMode();
        });
        
        document.getElementById('closeMenuButton').addEventListener('click', hideIslandMenu);
    } else {
        document.getElementById('islandMenu').style.display = 'block';
    }
}

function hideIslandMenu() {
    const menu = document.getElementById('islandMenu');
    if (menu) {
        menu.style.display = 'none';
    }
    islandMenuOpen = false;
    selectedIsland = null;
    selectedIslandPoint = null;
}

function enterBuildMode() {
    // Set build mode flag
    buildMode = true;
    
    // Hide the island menu
    hideIslandMenu();
    
    // Create the building menu first if it doesn't exist
    if (!document.getElementById('buildingMenu')) {
        const menu = document.createElement('div');
        menu.id = 'buildingMenu';
        
        // Add menu content
        menu.innerHTML = `
            <h3>Available Buildings</h3>
            <button id="marketStallButton">Market Stall</button>
            <button id="dockButton">Dock</button>
        `;
        
        document.body.appendChild(menu);
        
        // Add event listeners to buttons
        document.getElementById('marketStallButton').addEventListener('click', () => {
            selectBuildingType('marketStall');
        });
        
        document.getElementById('dockButton').addEventListener('click', () => {
            selectBuildingType('dock');
        });
    }
    
    // Now show the building menu
    document.getElementById('buildingMenu').style.display = 'block';
    buildingMenuOpen = true;
    
    // Update the info display
    const infoElement = document.getElementById('info');
    infoElement.innerHTML = `
        <h2>Build Mode</h2>
        <p>Select a building type from the menu</p>
        <p>ESC: Exit build mode</p>
    `;
    
    // Create a cancel button
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancelBuildButton';
    cancelButton.textContent = 'Exit Build Mode';
    cancelButton.style.position = 'absolute';
    cancelButton.style.top = '10px';
    cancelButton.style.right = '10px';
    cancelButton.style.padding = '10px';
    cancelButton.style.backgroundColor = '#c44';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '5px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.addEventListener('click', exitBuildMode);
    document.body.appendChild(cancelButton);
}

function hideBuildingMenu() {
    const menu = document.getElementById('buildingMenu');
    if (menu) {
        menu.style.display = 'none';
    }
    buildingMenuOpen = false;
}

function selectBuildingType(buildingType) {
    // Store the selected building type
    currentBuildingType = buildingType;
    
    // Remove any existing preview
    if (buildPreview) {
        scene.remove(buildPreview);
        buildPreview = null;
    }
    
    // Create the build preview based on the building type
    if (buildingType === 'marketStall') {
        // Create a market stall with 50% opacity
        buildObject = new MarketStall({
            position: new THREE.Vector3(0, 0, 0),
            detailLevel: 0.8
        });
        
        buildPreview = buildObject.getObject();
    } else if (buildingType === 'dock') {
        // Create a dock with 50% opacity
        buildObject = new Dock({
            position: new THREE.Vector3(0, 0, 0)
        });
        
        buildPreview = buildObject.getObject();
    }
    
    // Make the preview semi-transparent
    if (buildPreview) {
        buildPreview.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.transparent = true;
                        mat.opacity = 0.5;
                    });
                } else {
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            }
        });
        
        // Add the preview to the scene
        scene.add(buildPreview);
        
        // Update the info display
        const infoElement = document.getElementById('info');
        infoElement.innerHTML = `
            <h2>Build Mode: ${buildingType === 'marketStall' ? 'Market Stall' : 'Dock'}</h2>
            <p>Left-click: Place building</p>
            <p>R: Rotate building</p>
            <p>ESC: Cancel building</p>
        `;
        
        // Hide the building menu
        hideBuildingMenu();
    }
}

function exitBuildMode() {
    // Reset build mode flag
    buildMode = false;
    
    // Remove the build preview from the scene
    if (buildPreview) {
        scene.remove(buildPreview);
        buildPreview = null;
    }
    
    // Hide the building menu
    hideBuildingMenu();
    
    // Reset the current building type
    currentBuildingType = null;
    
    // Reset the info display
    const infoElement = document.getElementById('info');
    infoElement.innerHTML = `
        <h2>Yarr!</h2>
        <p>Left-click: Move ship to location</p>
        <p>Right-click drag: Move camera</p>
    `;
    
    // Remove the cancel button
    const cancelButton = document.getElementById('cancelBuildButton');
    if (cancelButton) {
        cancelButton.remove();
    }
}

function placeBuilding(position) {
    // Create a new building at the specified position
    if (buildObject && currentBuildingType) {
        let newBuilding;
        
        if (currentBuildingType === 'marketStall') {
            newBuilding = new MarketStall({
                position: position.clone(),
                detailLevel: 0.8,
                rotation: buildPreview.rotation.y
            });
        } else if (currentBuildingType === 'dock') {
            newBuilding = new Dock({
                position: position.clone(),
                rotation: buildPreview.rotation.y
            });
        }
        
        if (newBuilding) {
            // Add the building to the scene
            scene.add(newBuilding.getObject());
        }
        
        // After placing, show the building menu again to allow placing more buildings
        // Create the building menu first if it doesn't exist
        if (!document.getElementById('buildingMenu')) {
            const menu = document.createElement('div');
            menu.id = 'buildingMenu';
            
            // Add menu content
            menu.innerHTML = `
                <h3>Available Buildings</h3>
                <button id="marketStallButton">Market Stall</button>
                <button id="dockButton">Dock</button>
            `;
            
            document.body.appendChild(menu);
            
            // Add event listeners to buttons
            document.getElementById('marketStallButton').addEventListener('click', () => {
                selectBuildingType('marketStall');
            });
            
            document.getElementById('dockButton').addEventListener('click', () => {
                selectBuildingType('dock');
            });
        }
        
        // Now show the building menu
        document.getElementById('buildingMenu').style.display = 'block';
        buildingMenuOpen = true;
        
        // Remove the preview temporarily until a new building type is selected
        if (buildPreview) {
            scene.remove(buildPreview);
            buildPreview = null;
        }
    }
}

function onMouseMove(event) {
    // Update mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // If in build mode, update the preview position
    if (buildMode && buildPreview) {
        // Create a raycaster
        buildRaycaster.setFromCamera(mouse, camera);
        
        // Check for intersections with islands
        const islandIntersects = buildRaycaster.intersectObjects(islandGenerator.getIslands());
        
        if (islandIntersects.length > 0) {
            const intersection = islandIntersects[0];
            const point = intersection.point;
            
            // Check if the point is above water
            if (point.y > WATER_LEVEL_THRESHOLD) {
                // Update the preview position
                buildPreview.position.copy(point);
                
                // Make the preview visible
                buildPreview.visible = true;
            } else {
                // Hide the preview if below water level
                buildPreview.visible = false;
            }
        } else {
            // Hide the preview if not over an island
            buildPreview.visible = false;
        }
    }
}

function onKeyDown(event) {
    // Check for ESC key to exit build mode
    if (event.key === 'Escape' && buildMode) {
        exitBuildMode();
    }
    
    // Add rotation functionality when 'R' key is pressed in build mode
    if (event.key === 'r' || event.key === 'R') {
        if (buildMode && buildPreview) {
            // Rotate the preview object by 90 degrees (π/2 radians)
            buildPreview.rotation.y += Math.PI / 2;
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = performance.now() * 0.001;
    
    // Update world (sky, water, lighting, etc.)
    world.update(delta);
    
    // Update ship and wake particles only if game has started
    if (gameStarted && ship) {
        ship.update(delta, time);
        
        // Check if ship has reached the selected island point
        if (selectedIsland && !islandMenuOpen && ship.targetIslandPoint) {
            const shipPos = ship.getPosition().clone();
            
            // Calculate distance between ship and clicked point (ignoring Y axis)
            const shipPosFlat = new THREE.Vector3(shipPos.x, 0, shipPos.z);
            const targetPointFlat = new THREE.Vector3(
                ship.targetIslandPoint.x, 
                0, 
                ship.targetIslandPoint.z
            );
            
            const distance = shipPosFlat.distanceTo(targetPointFlat);
            
            // If ship has reached the clicked point and is not moving, show menu
            if (distance <= ISLAND_INTERACTION_DISTANCE && !ship.isMoving) {
                // Stop the ship explicitly (although it should already be stopped)
                ship.stopMoving();
                showIslandMenu(selectedIsland, ship.targetIslandPoint);
                ship.targetIslandPoint = null; // Clear the target point
            }
        }
        
        // Update camera target to follow ship
        controls.target.copy(ship.getPosition());
    }
    
    // Update wind system
    windSystem.update(delta);
    
    // Update controls
    controls.update();
    
    // Render scene
    renderer.render(scene, camera);
}

// Export functions that need to be accessible from outside
export default {
    init,
    initWorldOnly,
    startGame,
    scene,
    camera,
    renderer
};