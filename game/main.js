import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import IslandGenerator from './IslandGenerator.js';
import World from './world.js';
import { Sloop } from './ships/index.js';
import { WindSystem } from './wind.js';
import MarketStall from './objects/market-stall.js';
import Dock from './objects/dock.js';
import Auth from './auth.js';

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

// Function to completely reset camera controls
function resetCameraControls() {
    // Remove any existing event listeners
    if (controls) {
        controls.dispose();
        controls = null;
    }
    
    // Remove click event listener
    renderer.domElement.removeEventListener('click', onMouseClick);
}

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
    
    // Setup auth event listeners
    setupAuthListeners();
    
    animate();
}

// Setup auth event listeners
function setupAuthListeners() {
    // Add auth state listener
    Auth.addAuthStateListener((user) => {
        if (user && gameStarted) {
            // If user is logged in and game has started flag is true, start the game
            startGameWithShip();
        } else if (!user && gameStarted) {
            // If user logged out and game was started, reset the game
            resetGame();
        }
    });
    
    // Add event listeners for login buttons
    document.getElementById('googleLoginButton').addEventListener('click', () => {
        Auth.signInWithGoogle()
            .then(() => {
                // Login successful, hide login menu
                Auth.hideLoginMenu();
            })
            .catch(error => {
                console.error('Google login error:', error);
                // You could show an error message here
            });
    });
    
    // Add event listener for close login button
    document.getElementById('closeLoginButton').addEventListener('click', () => {
        Auth.hideLoginMenu();
        // Show main menu again
        document.getElementById('mainMenu').style.display = 'flex';
    });
    
    // Add event listener for logout button
    document.getElementById('logoutButton').addEventListener('click', () => {
        Auth.signOut()
            .catch(error => {
                console.error('Logout error:', error);
            });
        // Note: We don't need to call resetGame() here as it will be triggered by the auth state listener
    });
}

// Reset game state and return to main menu
function resetGame() {
    // Reset game started flag
    gameStarted = false;
    
    // Remove event listeners that are only needed during gameplay
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    
    // Reset camera controls completely
    resetCameraControls();
    
    // Remove ship if it exists
    if (ship) {
        try {
            // Check if ship has getObject method before calling it
            if (typeof ship.getObject === 'function') {
                const shipObject = ship.getObject();
                if (shipObject) {
                    scene.remove(shipObject);
                }
            } else {
                // If ship doesn't have getObject method, try to remove it directly
                scene.remove(ship);
            }
        } catch (error) {
            console.warn('Error removing ship:', error);
        }
        
        // Set ship to null regardless of removal success
        ship = null;
    }
    
    // Reset camera position
    camera.position.set(0, 100, 300);
    camera.lookAt(0, 0, 0);
    
    // Setup menu controls again
    setupMenuControls();
    
    // Show main menu
    document.getElementById('mainMenu').style.display = 'flex';
    
    // Hide any open menus
    if (islandMenuOpen) {
        hideIslandMenu();
    }
    
    if (buildingMenuOpen) {
        hideBuildingMenu();
    }
    
    // Exit build mode if active
    if (buildMode) {
        exitBuildMode();
    }
    
    // Update UI for main menu
    createMinimalUI();
}

// Setup controls for the main menu (orbiting camera)
function setupMenuControls() {
    // Reset camera controls completely
    resetCameraControls();
    
    // Remove any existing click event listeners
    renderer.domElement.removeEventListener('click', onMouseClick);
    
    // Orbit controls for camera movement
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 100;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
    
    // Explicitly set the mouse buttons configuration for menu
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
    };
    
    // Set auto-rotation for a cinematic effect
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.1;
    
    // Set the target to the center of the scene
    controls.target.set(0, 0, 0);
    
    // Reset the controls' internal state
    controls.update();
}

// Create minimal UI for main menu
function createMinimalUI() {
    // Remove any existing info panel first
    const existingInfoElement = document.getElementById('info');
    if (existingInfoElement) {
        existingInfoElement.remove();
    }
    
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
    
    // Check if user is authenticated
    if (Auth.isAuthenticated()) {
        // User is already logged in, start the game with ship
        startGameWithShip();
    } else {
        // User is not logged in, show login menu
        Auth.showLoginMenu();
    }
}

// Start the game with ship after authentication
function startGameWithShip() {
    // Hide the main menu
    document.getElementById('mainMenu').style.display = 'none';
    
    // Reset camera position for gameplay
    camera.position.set(0, 10, 20);
    
    // Remove auto-rotation
    if (controls) {
        controls.autoRotate = false;
    }
    
    // Create ship with custom speed
    ship = new Sloop(scene, { speed: 100 });
    
    // Setup gameplay controls
    setupGameplayControls();
    
    // Update UI for gameplay
    updateUIForGameplay();
    
    // Remove any existing event listeners to prevent duplicates
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    
    // Add event listener for mouse movement (for build mode)
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // Add event listener for keyboard (for exiting build mode)
    document.addEventListener('keydown', onKeyDown);
    
    // Create an empty island menu container if it doesn't exist
    if (!document.getElementById('islandMenu')) {
        const menu = document.createElement('div');
        menu.id = 'islandMenu';
        menu.style.display = 'none';
        document.body.appendChild(menu);
    }
}

// Setup controls for gameplay
function setupGameplayControls() {
    // Reset camera controls completely
    resetCameraControls();
    
    // Create new orbit controls for gameplay
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizon
    
    // Explicitly set the mouse buttons configuration for gameplay
    controls.mouseButtons = {
        LEFT: null,  // Left click is used for ship movement
        MIDDLE: THREE.MOUSE.DOLLY,  // Middle mouse (wheel click) for dolly/zoom
        RIGHT: THREE.MOUSE.ROTATE   // Right click for rotation
    };
    
    // Reset the controls' internal state
    controls.update();
    
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
            
            // Get ship position
            const shipPos = ship.getPosition().clone();
            
            // Calculate the closest shoreline point for the ship to navigate to
            const shorelinePoint = findClosestShorelinePoint(clickedIsland, intersectionPoint, shipPos);
            
            // Calculate distance between ship and shoreline point (ignoring Y axis)
            const shipPosFlat = new THREE.Vector3(shipPos.x, 0, shipPos.z);
            const shorelinePointFlat = new THREE.Vector3(shorelinePoint.x, 0, shorelinePoint.z);
            const distance = shipPosFlat.distanceTo(shorelinePointFlat);
            
            if (distance <= ISLAND_INTERACTION_DISTANCE) {
                // Ship is close enough to the shoreline point, stop the ship and show menu
                ship.stopMoving();
                showIslandMenu(clickedIsland, shorelinePoint);
            } else {
                // Ship is too far, move it closer to the shoreline point
                // Calculate a position near the shoreline point for the ship to move to
                const direction = new THREE.Vector3().subVectors(shorelinePointFlat, shipPosFlat).normalize();
                
                // Calculate a position that's just within interaction distance of the shoreline point
                const targetPosition = new THREE.Vector3().addVectors(
                    shorelinePointFlat,
                    direction.multiplyScalar(-ISLAND_INTERACTION_DISTANCE * 0.8) // Move slightly closer than the minimum distance
                );
                
                // Ensure Y position is the same as the ship's current Y position
                targetPosition.y = ship.getPosition().y;
                
                // Store the shoreline point for later use when the ship arrives
                ship.targetIslandPoint = shorelinePoint;
                
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

// Function to find the closest point on the shoreline of an island
function findClosestShorelinePoint(island, clickedPoint, shipPosition) {
    // We'll use a simplified approach to find a point on the shoreline
    // by casting a ray from the ship position towards the clicked point
    
    // Direction from ship to clicked point
    const direction = new THREE.Vector3()
        .subVectors(clickedPoint, shipPosition)
        .normalize();
    
    // Create a raycaster from the ship position towards the clicked point
    const raycaster = new THREE.Raycaster(shipPosition, direction);
    
    // Intersect with the island
    const intersects = raycaster.intersectObject(island);
    
    if (intersects.length > 0) {
        // We found an intersection point on the island
        const intersectionPoint = intersects[0].point;
        
        // If this point is at or near the water level, it's a good shoreline point
        if (Math.abs(intersectionPoint.y - WATER_LEVEL_THRESHOLD) < 1.0) {
            return intersectionPoint;
        }
    }
    
    // If the direct ray approach didn't work, we'll use a different method
    // We'll sample points around the perimeter of the island to find a good shoreline point
    
    // Get the island's geometry
    const geometry = island.geometry;
    const positions = geometry.attributes.position;
    
    // Variables to track the closest shoreline point
    let closestPoint = null;
    let closestDistance = Infinity;
    
    // Sample points from the geometry
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Convert to world coordinates
        const worldPoint = new THREE.Vector3(x, y, z).applyMatrix4(island.matrixWorld);
        
        // Check if this point is near the water level (potential shoreline)
        if (Math.abs(worldPoint.y - WATER_LEVEL_THRESHOLD) < 1.0) {
            // Calculate distance from ship to this point (ignoring Y)
            const shipPosFlat = new THREE.Vector3(shipPosition.x, 0, shipPosition.z);
            const worldPointFlat = new THREE.Vector3(worldPoint.x, 0, worldPoint.z);
            const distance = shipPosFlat.distanceTo(worldPointFlat);
            
            // If this is closer than our current closest point, update
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = worldPoint.clone();
            }
        }
    }
    
    // If we found a shoreline point, return it
    if (closestPoint) {
        // Ensure Y position is at water level
        closestPoint.y = WATER_LEVEL_THRESHOLD;
        return closestPoint;
    }
    
    // Fallback: If we couldn't find a good shoreline point,
    // use the clicked point but adjust its Y to the ship's Y
    return new THREE.Vector3(
        clickedPoint.x,
        ship.getPosition().y,
        clickedPoint.z
    );
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

function toggleMenu(menuId, show, setupFn = null) {
    const menu = document.getElementById(menuId);
    
    if (!menu) {
        console.error(`Menu with ID ${menuId} not found!`);
        return;
    }
    
    // Show or hide the menu
    menu.style.display = show ? 'block' : 'none';
    
    // Run any additional setup if provided
    if (show && setupFn) {
        setupFn(menu);
    }
}

function showIslandMenu(island, clickedPoint) {
    ship.stopMoving();
    islandMenuOpen = true;
    selectedIslandPoint = clickedPoint;
    
    toggleMenu('islandMenu', true, (menu) => {
        // Update menu content with a Build button
        menu.innerHTML = `
            <h2>Island Menu</h2>
            <p>You've discovered ${island.name || 'an island'}!</p>
            <button id="exploreButton">Explore Island</button>
            <button id="buildButton">Build</button>
            <button id="closeMenuButton">Close</button>
        `;
        
        // Add event listeners to buttons
        document.getElementById('exploreButton').addEventListener('click', () => {
            console.log('Exploring island...');
            // Add exploration functionality here
        });
        
        document.getElementById('buildButton').addEventListener('click', () => {
            // Hide the island menu
            hideIslandMenu();
            
            // Enter build mode
            enterBuildMode();
        });
        
        document.getElementById('closeMenuButton').addEventListener('click', hideIslandMenu);
    });
}

function hideIslandMenu() {
    toggleMenu('islandMenu', false);
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
        
        // Update camera target to follow ship only if game has started
        if (controls) {
            controls.target.copy(ship.getPosition());
        }
    }
    
    // Update wind system
    windSystem.update(delta);
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
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