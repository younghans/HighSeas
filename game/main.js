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
import EnemyShipManager from './ships/EnemyShipManager.js';
import CombatManager from './CombatManager.js';
import CombatService from './CombatService.js';

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

// Add combat system variables
let enemyShipManager;
let combatManager;
let combatService;

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
    
    // Clean up combat managers if they exist
    if (combatManager) {
        console.log('Cleaning up combat manager');
        combatManager.cleanup();
        combatManager = null;
    }
    
    // Clean up enemy ships manager first to ensure all ships are removed
    if (enemyShipManager) {
        console.log('Resetting enemy ship manager');
        // Make sure to reset the enemy ship manager before nullifying it
        enemyShipManager.reset();
        
        // Add a small delay to ensure all ships are properly removed
        setTimeout(() => {
            // Double-check for any remaining enemy ships in the scene
            if (scene) {
                scene.traverse(object => {
                    // Look for any objects that might be enemy ships
                    if (object.userData && object.userData.isEnemyShip) {
                        console.log('Found remaining enemy ship, removing:', object.name);
                        scene.remove(object);
                    }
                    
                    // Also look for any shipwrecks
                    if (object.userData && object.userData.isShipwreck) {
                        console.log('Found remaining shipwreck, removing:', object.name);
                        scene.remove(object);
                    }
                });
            }
            
            // Now set to null after cleanup
            enemyShipManager = null;
            console.log('Enemy ship manager nullified');
        }, 100);
    }
    
    // Clean up other managers if they exist
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
        
        // Explicitly hide the target info and health bar containers
        if (gameUI.targetInfoContainer) {
            gameUI.targetInfoContainer.style.display = 'none';
        }
        if (gameUI.healthBarContainer) {
            gameUI.healthBarContainer.style.display = 'none';
        }
        
        // Clear any target in the UI
        gameUI.setTarget(null);
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
        <p>Click Play to begin</p>
    `;
    document.body.appendChild(infoElement);
    
    // Add event listeners for main menu buttons
    document.getElementById('playButton').addEventListener('click', startGame);
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
        speed: 50,
        // Set a default position that will be overridden by multiplayer
        position: new THREE.Vector3(0, 0, 0),
        // Add combat properties
        maxHealth: 100,
        cannonRange: 100,
        cannonDamage: { min: 8, max: 25 },
        cannonCooldown: 1500 // 1.5 seconds between shots
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
            playerShip: ship, // Pass player ship to UI for health display
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
        
        // Make gameUI accessible globally for ship sink events
        window.gameUI = gameUI;
    } else {
        // Update player ship reference in UI
        gameUI.setPlayerShip(ship);
        
        // Clear any previous target
        gameUI.setTarget(null);
    }
    
    // Make sure player ship has a health bar
    if (ship && !ship.healthBarContainer) {
        ship.createHealthBar();
        
        // Set initial visibility based on health
        if (ship.currentHealth < ship.maxHealth) {
            ship.setHealthBarVisible(true);
        } else {
            ship.setHealthBarVisible(false);
        }
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
    
    // Initialize CombatService first if Firebase is available
    if (typeof firebase !== 'undefined') {
        try {
            console.log('Initializing CombatService with Firebase');
            console.log('Firebase availability check:', {
                firebase: !!firebase,
                database: !!(firebase && firebase.database),
                auth: !!(firebase && firebase.auth),
                functions: !!(firebase && firebase.functions)
            });
            
            // Expose a debug function globally to check Firebase status
            window.debugFirebase = () => {
                console.log('Firebase Debug Status:');
                console.log('- firebase exists:', !!window.firebase);
                console.log('- auth exists:', !!(window.auth));
                console.log('- currentUser exists:', !!(window.auth && window.auth.currentUser));
                console.log('- database exists:', !!(window.firebase && window.firebase.database));
                console.log('- functions exists:', !!(window.firebase && window.firebase.functions));
                
                if (window.auth && window.auth.currentUser) {
                    console.log('- user ID:', window.auth.currentUser.uid);
                }
                
                return 'Firebase debug complete - see console for details';
            };
            
            combatService = new CombatService({
                firebase: firebase,
                auth: Auth
            });
            console.log('CombatService initialized successfully');
        } catch (error) {
            console.error('Error initializing CombatService:', error);
            combatService = null;
        }
    } else {
        console.warn('Firebase is not available, combat server validation will be disabled');
        console.log('Window object contains firebase?', 'firebase' in window);
        combatService = null;
    }
    
    // Now initialize managers in the correct order
    
    // Initialize CombatManager first (without enemy ships yet)
    combatManager = new CombatManager({
        playerShip: ship,
        ui: gameUI,
        scene: scene,
        camera: camera
    });
    
    // Make combatManager globally accessible for BaseShip class
    window.combatManager = combatManager;
    
    // Connect combat service to combat manager if available
    if (combatService && combatManager) {
        console.log('Connecting CombatService to CombatManager');
        combatManager.setCombatService(combatService);
    }
    
    // Initialize EnemyShipManager with the now-initialized combatService
    enemyShipManager = new EnemyShipManager({
        scene: scene,
        playerShip: ship,
        maxEnemyShips: 5,
        spawnRadius: 800,
        worldSize: 2000,
        aggroRange: 150,
        combatManager: combatManager,
        combatService: combatService // Now combatService is properly initialized
    });
    
    // Update CombatManager with enemy ship manager reference
    if (combatManager && enemyShipManager) {
        combatManager.setEnemyShipManager(enemyShipManager);
    }
    
    // Make sure no target is selected at game start
    if (combatManager && gameUI) {
        combatManager.setTarget(null);
        gameUI.setTarget(null);
        
        // Update the GameUI with a reference to the combatManager
        gameUI.combatManager = combatManager;
    }
    
    // Connect EnemyShipManager to CombatManager
    if (enemyShipManager && combatManager) {
        enemyShipManager.setCombatManager(combatManager);
    }
    
    // Update info panel with combat instructions
    const infoElement = document.getElementById('info');
    if (infoElement) {
        infoElement.innerHTML = `
            <h2>Yarr!</h2>
            <p>Left-click: Move ship</p>
            <p>Right-click: Camera</p>
            <p>Click enemy: Target</p>
            <p>Space: Fire cannons</p>
        `;
    }
    
    // Add event listener for the resetToMainMenu custom event
    document.addEventListener('resetToMainMenu', handleResetToMainMenu);
    
    // Add window unload event listener to set player offline when browser/tab is closed
    window.addEventListener('beforeunload', () => {
        if (multiplayerManager) {
            // Set player offline when the window is closed
            multiplayerManager.setPlayerOffline();
        }
    });
}

/**
 * Handle reset to main menu event
 * This function resets the game state but keeps the user authenticated
 */
function handleResetToMainMenu(event) {
    console.log('Resetting to main menu, keeping authentication:', event.detail.keepAuthenticated);
    
    // Set player offline in multiplayer
    if (multiplayerManager && multiplayerManager.playerRef) {
        multiplayerManager.setPlayerOffline();
    }
    
    // Reset game started flag
    gameStarted = false;
    
    // Clean up combat managers if they exist
    if (combatManager) {
        console.log('Cleaning up combat manager');
        combatManager.cleanup();
        combatManager = null;
    }
    
    // Clean up enemy ships manager first to ensure all ships are removed
    if (enemyShipManager) {
        console.log('Resetting enemy ship manager');
        // Make sure to reset the enemy ship manager before nullifying it
        enemyShipManager.reset();
        
        // Add a small delay to ensure all ships are properly removed
        setTimeout(() => {
            // Double-check for any remaining enemy ships in the scene
            if (scene) {
                scene.traverse(object => {
                    // Look for any objects that might be enemy ships
                    if (object.userData && object.userData.isEnemyShip) {
                        console.log('Found remaining enemy ship, removing:', object.name);
                        scene.remove(object);
                    }
                    
                    // Also look for any shipwrecks
                    if (object.userData && object.userData.isShipwreck) {
                        console.log('Found remaining shipwreck, removing:', object.name);
                        scene.remove(object);
                    }
                });
            }
            
            // Now set to null after cleanup
            enemyShipManager = null;
            console.log('Enemy ship manager nullified');
        }, 100);
    }
    
    // Clean up other managers if they exist
    if (buildingManager) {
        buildingManager.cleanup();
        buildingManager = null;
    }
    
    if (islandManager) {
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
    
    // Reset camera position
    camera.position.set(0, 100, 300);
    camera.lookAt(0, 0, 0);
    
    // Setup menu controls again
    setupMenuControls();
    
    // Show main menu
    document.getElementById('mainMenu').style.display = 'flex';
    
    // Create minimal UI for main menu
    createMinimalUI();
    
    // Hide game UI and explicitly hide health/target containers
    if (gameUI) {
        gameUI.hide();
        
        // Explicitly hide the target info and health bar containers
        if (gameUI.targetInfoContainer) {
            gameUI.targetInfoContainer.style.display = 'none';
        }
        if (gameUI.healthBarContainer) {
            gameUI.healthBarContainer.style.display = 'none';
        }
        
        // Clear any target in the UI
        gameUI.setTarget(null);
    }
    
    // Clean up multiplayer but don't sign out
    if (multiplayerManager) {
        multiplayerManager.cleanup();
        multiplayerManager = null;
    }
}

// Setup controls for gameplay
function setupGameplayControls() {
    // Reset camera controls completely
    resetCameraControls();
    
    // Create new orbit controls for gameplay
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 50;
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
        <p>Left-click: Move ship</p>
        <p>Right-click: Rotate camera</p>
        <p>Click enemy: Target</p>
        <p>Space: Fire cannons</p>
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
    
    // First check if the click should be handled by combat manager
    // Note: We don't call handleMouseClick directly as it's already bound to the click event
    // Instead, we'll check for enemy ship intersections ourselves
    
    // Get all enemy ships if enemy manager exists
    if (enemyShipManager && combatManager) {
        const enemyShips = enemyShipManager.getEnemyShips();
        const shipObjects = enemyShips.map(ship => ship.getObject()).filter(obj => obj !== null);
        
        // Check for intersections with enemy ships
        const shipIntersects = raycaster.intersectObjects(shipObjects, true);
        
        if (shipIntersects.length > 0) {
            // An enemy ship was clicked, let combat manager handle it
            return; // Combat manager will handle this via its own click handler
        }
        
        // Check for shipwreck interactions
        if (ship) {
            const playerPosition = ship.getPosition();
            
            // Get all shipwrecks
            const shipwrecks = enemyShipManager.getShipwrecks();
            const shipwreckObjects = shipwrecks
                .filter(wreck => !wreck.looted && wreck.ship)
                .map(wreck => wreck.ship.getObject())
                .filter(obj => obj !== null);
            
            // Check for intersections with shipwrecks
            const shipwreckIntersects = raycaster.intersectObjects(shipwreckObjects, true);
            
            if (shipwreckIntersects.length > 0) {
                // A shipwreck was clicked, find which one
                const clickedMesh = shipwreckIntersects[0].object;
                let clickedShipwreck = null;
                
                // Find the shipwreck that was clicked
                for (const wreck of shipwrecks) {
                    if (!wreck.ship || wreck.looted) continue;
                    
                    const shipObj = wreck.ship.getObject();
                    if (!shipObj) continue;
                    
                    // Check if the clicked mesh is part of this shipwreck
                    if (shipObj === clickedMesh || 
                        (shipObj.children && shipObj.children.includes(clickedMesh))) {
                        clickedShipwreck = wreck;
                        break;
                    }
                }
                
                // If we found a shipwreck, check if it's in range
                if (clickedShipwreck) {
                    // Check distance to shipwreck
                    const distance = playerPosition.distanceTo(clickedShipwreck.position);
                    
                    if (distance <= enemyShipManager.lootableRange) {
                        // Shipwreck is in range, loot it (now async)
                        enemyShipManager.lootShipwreck(clickedShipwreck)
                            .then(loot => {
                                // Show loot notification
                                if (gameUI) {
                                    // Show a more prominent notification with gold amount
                                    gameUI.showNotification(`TREASURE FOUND! +${loot.gold} gold`, 5000, 'success');
                                    console.log('Looted shipwreck:', loot);
                                }
                                
                                // Update player inventory if multiplayer is enabled
                                if (multiplayerManager) {
                                    multiplayerManager.updatePlayerInventory(loot);
                                }
                            })
                            .catch(error => {
                                // Handle looting errors
                                if (gameUI) {
                                    gameUI.showNotification(`Failed to loot: ${error.message}`, 3000, 'error');
                                }
                                console.error('Error looting shipwreck:', error);
                            });
                        
                        return; // Click was handled
                    } else {
                        // Shipwreck is out of range, show notification
                        if (gameUI) {
                            // Show a more prominent notification for out of range
                            gameUI.showNotification("Get closer to loot this shipwreck!", 3000, 'warning');
                            console.log('Shipwreck too far to loot. Distance:', distance, 'Range:', enemyShipManager.lootableRange);
                        }
                        
                        return; // Click was handled but no action taken
                    }
                }
            }
        }
    }
    
    // Then check if the click should be handled by build mode
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
        
        // Update enemy ship manager if it exists
        if (enemyShipManager) {
            enemyShipManager.update(delta, elapsedTime);
        }
        
        // Update combat manager if it exists
        if (combatManager) {
            combatManager.update(delta);
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
                
                // Update player ship reference in enemy ship manager
                if (enemyShipManager) {
                    enemyShipManager.setPlayerShip(ship);
                }
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
                
                // Initialize the EnemyShipManager with Firebase for multiplayer synchronization
                if (enemyShipManager && typeof enemyShipManager.initializeWithFirebase === 'function') {
                    console.log('Initializing EnemyShipManager multiplayer features');
                    enemyShipManager.initializeWithFirebase();
                }
                
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
                
                // Override ship's takeDamage method to sync with Firebase
                const originalTakeDamage = ship.takeDamage;
                ship.takeDamage = function(amount) {
                    // Call original method and get result
                    const wasSunk = originalTakeDamage.call(this, amount);
                    
                    // Sync with Firebase
                    if (multiplayerManager) {
                        multiplayerManager.updatePlayerHealth(ship);
                    }
                    
                    return wasSunk;
                };
            } else {
                console.error('Failed to initialize multiplayer');
            }
        })
        .catch(error => {
            console.error('Error initializing multiplayer:', error);
        });
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