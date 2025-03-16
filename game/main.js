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
import GameUI from './UI.js';
import MultiplayerManager from './multiplayer.js';
import BuildingManager from './BuildingManager.js';
import IslandInteractionManager from './IslandInteractionManager.js';
import CreativeMode from './creative.js';

// Main game variables
let scene, camera, renderer;
let controls;
let clock = new THREE.Clock();
let cameraOffset = new THREE.Vector3(0, 10, 20); // Camera offset from ship
let world; // World instance that contains sky, water, lighting, etc.
let ship; // Ship instance
let windSystem; // Wind system instance
let gameStarted = false; // Flag to track if the game has started
let multiplayerManager;

// Island generator
let islandGenerator;

// Add gameUI variable
let gameUI;

// Add manager variables
let buildingManager;
let islandManager;

// Creative mode
let creativeMode;

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

    // Create renderer if it doesn't exist
    if (!renderer) {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5;
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);
    }

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
    
    // Start animation loop if not already running
    if (!window.animationFrameId) {
        animate();
    }
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
}

// Reset game state and return to main menu
function resetGame() {
    // Reset game started flag
    gameStarted = false;
    
    // Clean up managers if they exist
    if (buildingManager) {
        buildingManager.cleanup();
        buildingManager = null;
    }
    
    if (islandManager) {
        // No cleanup method needed for IslandInteractionManager currently
        islandManager = null;
    }
    
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
    
    // Reset camera position if camera exists
    if (camera) {
        camera.position.set(0, 100, 300);
        camera.lookAt(0, 0, 0);
    }
    
    // Setup menu controls again if controls and camera exist
    if (controls && camera) {
        setupMenuControls();
    }
    
    // Show main menu
    document.getElementById('mainMenu').style.display = 'flex';
    
    // Only update UI if we're not going to recreate it later
    // This check prevents duplicate UI elements
    if (scene && !scene._markedForDisposal) {
        createMinimalUI();
    }
    
    // Hide game UI if it exists
    if (gameUI) {
        gameUI.hide();
    }
    
    // Clean up multiplayer
    if (multiplayerManager) {
        try {
            // Try to set player offline directly if we still have a valid reference
            if (multiplayerManager.playerRef && Auth.isAuthenticated()) {
                console.log('Setting player offline during game reset');
                multiplayerManager.playerRef.update({
                    isOnline: false,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    console.log('Successfully set player as offline during game reset');
                }).catch(error => {
                    console.error('Error setting player offline during game reset:', error);
                });
            }
        } catch (error) {
            console.error('Error in resetGame process:', error);
        }
        
        // Clean up multiplayer resources
        multiplayerManager.cleanup();
        multiplayerManager = null;
    }
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
    
    // Remove the old user info panel if it exists
    const oldUserInfo = document.getElementById('userInfo');
    if (oldUserInfo) {
        oldUserInfo.remove();
    }
    
    // Create info panel with minimal information
    const infoElement = document.createElement('div');
    infoElement.id = 'info';
    infoElement.innerHTML = `
        <h2>Yarr!</h2>
        <p>Click Play to start your adventure!</p>
    `;
    document.body.appendChild(infoElement);
    
    // Add event listeners for main menu buttons
    document.getElementById('playButton').addEventListener('click', startGame);
    document.getElementById('creativeButton').addEventListener('click', enterCreativeMode);
}

// Start the full game with ship and controls
function startGame() {
    // Set game started flag
    gameStarted = true;
    
    // Hide the main menu
    const mainMenu = document.getElementById('mainMenu');
    if (mainMenu) {
        mainMenu.style.display = 'none';
    }
    
    // Clean up creative mode if it exists
    if (creativeMode) {
        creativeMode.cleanup();
        creativeMode = null;
    }
    
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
    
    // Create ship with custom speed but don't position it yet
    // The position will be set by the multiplayer system
    ship = new Sloop(scene, { 
        // Set a default position that will be overridden by multiplayer
        position: new THREE.Vector3(0, 0.5, 0)
    });
    
    console.log('Ship created with initial position:', ship.getPosition());
    
    // Setup gameplay controls
    setupGameplayControls();
    
    // Update UI for gameplay
    updateUIForGameplay();
    
    // Initialize game UI
    if (!gameUI) {
        gameUI = new GameUI({
            auth: Auth,
            onLogout: () => {
                console.log('Logout callback triggered - setting player offline');
                
                // Set player offline before handling logout
                if (multiplayerManager && multiplayerManager.playerRef) {
                    try {
                        // Use Firebase directly to update the player status
                        // This ensures we're using the authenticated reference that still exists
                        const playerRef = multiplayerManager.playerRef;
                        playerRef.update({
                            isOnline: false,
                            lastUpdated: firebase.database.ServerValue.TIMESTAMP
                        }).then(() => {
                            console.log('Successfully set player as offline during logout');
                        }).catch(error => {
                            console.error('Error setting player offline during logout:', error);
                        });
                    } catch (error) {
                        console.error('Error in logout process:', error);
                    }
                }
                
                // Handle logout by hiding the game UI
                if (gameUI) {
                    gameUI.hide();
                }
            }
        });
    }
    
    // Show the game UI
    gameUI.show();
    
    // Create an empty island menu container if it doesn't exist
    if (!document.getElementById('islandMenu')) {
        const menu = document.createElement('div');
        menu.id = 'islandMenu';
        menu.style.display = 'none';
        document.body.appendChild(menu);
    }
    
    // Initialize multiplayer if user is authenticated
    if (Auth.isAuthenticated()) {
        initMultiplayer();
    }
    
    // Initialize BuildingManager
    buildingManager = new BuildingManager({
        scene: scene,
        camera: camera,
        islandGenerator: islandGenerator,
        world: world,
        onInfoUpdate: (info) => {
            // Update the info panel with the provided information
            const infoElement = document.getElementById('info');
            if (infoElement) {
                infoElement.innerHTML = `
                    <h2>${info.title}</h2>
                    <p>${info.message.replace(/\n/g, '</p><p>')}</p>
                `;
            }
        }
    }).init();
    
    // Initialize IslandInteractionManager after multiplayer is initialized
    islandManager = new IslandInteractionManager({
        scene: scene,
        camera: camera,
        ship: ship,
        islandGenerator: islandGenerator,
        world: world,
        buildingManager: buildingManager,
        gameUI: gameUI,
        multiplayerManager: multiplayerManager
    });
    
    // Add window unload event listener to set player offline when browser/tab is closed
    window.addEventListener('beforeunload', () => {
        if (multiplayerManager) {
            // Set player offline when the window is closed
            multiplayerManager.setPlayerOffline();
        }
    });
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
    
    // Set the target of the controls to the ship
    if (ship) {
        const shipPos = ship.getPosition();
        controls.target.copy(shipPos);
        
        // Position camera behind and above the ship using the cameraOffset
        camera.position.copy(shipPos).add(cameraOffset);
    }
    
    // Reset the controls' internal state
    controls.update();
    
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
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // First check if the click should be handled by build mode
    if (buildingManager && buildingManager.handleClick(raycaster)) {
        return; // Click was handled by build mode
    }
    
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
        
        // Handle island click
        islandManager.handleIslandClick(clickedIsland, intersectionPoint, raycaster);
    } else {
        // No island was clicked, check for water intersection
        islandManager.handleWaterClick(raycaster);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    window.animationFrameId = requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update world (sky, water, lighting, etc.)
    if (world) {
        world.update(delta);
    }
    
    // Update ship and wake particles only if game has started
    if (gameStarted && ship) {
        // Store previous movement state to detect when ship stops
        const wasMoving = ship.isMoving;
        
        // Update ship
        ship.update(delta, elapsedTime);
        
        // If ship was moving but has now stopped, sync final position with Firebase
        if (wasMoving && !ship.isMoving && multiplayerManager) {
            multiplayerManager.updatePlayerPosition(ship);
        }
        
        // Update game UI if it exists
        if (gameUI && gameUI.isVisible) {
            gameUI.update();
        }
        
        // Update island manager if it exists
        if (islandManager) {
            islandManager.update(delta);
        }
        
        // Update camera to follow ship
        if (controls) {
            // Get the ship position
            const shipPos = ship.getPosition();
            
            // Store the current distance from camera to target (zoom level)
            const currentDistance = camera.position.distanceTo(controls.target);
            
            // Store the current camera orientation relative to the target
            const direction = new THREE.Vector3()
                .subVectors(camera.position, controls.target)
                .normalize();
            
            // Update the orbit controls target to the ship's position
            controls.target.copy(shipPos);
            
            // Reposition the camera at the same distance and orientation
            camera.position.copy(shipPos).add(
                direction.multiplyScalar(currentDistance)
            );
            
            // Update controls but don't let it change the camera position
            const tempPosition = camera.position.clone();
            controls.update();
            camera.position.copy(tempPosition);
        }
    }
    
    // Update wind system
    windSystem.update(delta);
    
    // Update multiplayer if initialized
    if (multiplayerManager) {
        multiplayerManager.update(delta);
    }
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

/**
 * Initialize multiplayer functionality
 */
function initMultiplayer() {
    // Store camera reference in scene for nametag positioning
    scene.userData.camera = camera;
    
    console.log('Initializing multiplayer with ship at position:', ship.getPosition());
    
    // Create multiplayer manager with callback for when player position is loaded
    multiplayerManager = new MultiplayerManager({
        auth: Auth,
        scene: scene,
        onPlayerPositionLoaded: (position, rotation) => {
            // Update the ship's position and rotation when loaded from Firebase
            if (ship && ship.getObject()) {
                console.log('Player position loaded from Firebase:', position);
                console.log('Current ship position before update:', ship.getPosition());
                
                // Force y position to always be 0
                position.y = 0;
                
                // Update ship position
                ship.getObject().position.set(position.x, position.y, position.z);
                
                // Update ship rotation
                ship.getObject().rotation.y = rotation.y || 0;
                
                // Update the ship's internal position property as well
                ship.position.copy(ship.getObject().position);
                
                // Update camera to look at the ship's new position
                if (controls) {
                    // If controls already have a target, maintain the camera orientation
                    if (controls.target) {
                        // Store the current distance from camera to target (zoom level)
                        const currentDistance = camera.position.distanceTo(controls.target);
                        
                        // Store the current camera orientation relative to the target
                        const direction = new THREE.Vector3()
                            .subVectors(camera.position, controls.target)
                            .normalize();
                        
                        // Update the orbit controls target to the ship's position
                        controls.target.copy(ship.getPosition());
                        
                        // Reposition the camera at the same distance and orientation
                        camera.position.copy(ship.getPosition()).add(
                            direction.multiplyScalar(currentDistance)
                        );
                    } else {
                        // If no target exists yet, use the default camera offset
                        controls.target.copy(ship.getPosition());
                        camera.position.copy(ship.getPosition()).add(cameraOffset);
                    }
                    
                    // Update controls
                    controls.update();
                }
                
                console.log('Updated player ship position from server:', position);
                console.log('New ship position after update:', ship.getPosition());
            } else {
                console.error('Ship object not available for position update');
            }
        }
    });
    
    // Initialize multiplayer with player's ship
    multiplayerManager.init(ship)
        .then(success => {
            if (success) {
                console.log('Multiplayer initialized successfully');
                
                // Override ship's moveTo method to sync with Firebase
                const originalMoveTo = ship.moveTo;
                ship.moveTo = function(targetPos) {
                    // Call original method
                    originalMoveTo.call(this, targetPos);
                    
                    // Sync with Firebase
                    if (multiplayerManager) {
                        multiplayerManager.updatePlayerPosition(ship);
                    }
                };
            } else {
                console.error('Failed to initialize multiplayer');
            }
        })
        .catch(error => {
            console.error('Error initializing multiplayer:', error);
        });
}

// Update the enterCreativeMode function
function enterCreativeMode() {
    // Hide the main menu
    const mainMenu = document.getElementById('mainMenu');
    if (mainMenu) {
        mainMenu.style.display = 'none';
    }
    
    // Hide normal game UI
    if (gameUI) {
        gameUI.hide();
    }
    
    // Check if user is authenticated
    if (Auth.isAuthenticated()) {
        // Initialize creative mode if it doesn't exist
        if (!creativeMode) {
            creativeMode = new CreativeMode();
            creativeMode.init(renderer);
            
            // Add event listener for exiting creative mode
            document.addEventListener('exitCreativeMode', exitCreativeMode);
        }
    } else {
        // User is not logged in, show login menu
        Auth.showLoginMenu();
    }
}

// Add function to exit creative mode
function exitCreativeMode() {
    // Clean up creative mode
    if (creativeMode) {
        creativeMode.cleanup();
        creativeMode = null;
    }
    
    // Remove event listener
    document.removeEventListener('exitCreativeMode', exitCreativeMode);
    
    // Cancel animation frame if it exists
    if (window.animationFrameId) {
        cancelAnimationFrame(window.animationFrameId);
        window.animationFrameId = null;
    }
    
    // Clean up the entire scene
    if (scene) {
        // Mark scene for disposal to prevent UI recreation in resetGame
        scene._markedForDisposal = true;
        
        // Remove all objects from the scene
        while(scene.children.length > 0) { 
            const object = scene.children[0];
            scene.remove(object);
            
            // Dispose of geometries and materials to free memory
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
    }
    
    // Reset game state
    resetGame();
    
    // Remove the renderer's DOM element if it exists
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    
    // Dispose of the renderer
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    
    // Reset all game variables
    scene = null;
    camera = null;
    controls = null;
    world = null;
    islandGenerator = null;
    windSystem = null;
    
    // Initialize the world from scratch
    initWorldOnly();
    
    // Show the main menu
    const mainMenu = document.getElementById('mainMenu');
    if (mainMenu) {
        mainMenu.style.display = 'flex';
    }
}

// Export functions that need to be accessible from outside
export default {
    init,
    initWorldOnly,
    startGame,
    enterCreativeMode,
    scene,
    camera,
    renderer
};