import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import IslandGenerator from './IslandGenerator.js';
import World from './world.js';
import { Sloop, SailboatShip } from './ships/index.js';
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

    // Check for portal URL parameter
    checkPortalParameters();

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
    
    // Create Vibeverse Portal
    createVibeVersePortal();
    
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
        if (user) {
            // If user is logged in, always hide the login menu first
            Auth.hideLoginMenu();
            
            // Auto-start the game if user is authenticated, regardless of the gameStarted flag
            startGameWithShip();
            // Mark the game as started
            gameStarted = true;
            // Hide the main menu
            document.getElementById('mainMenu').style.display = 'none';
        } else if (!user && gameStarted) {
            // If user logged out and game was started, reset the game
            resetGame();
        }
    });
    
    // Add event listeners for 'Play as Guest' button from main menu
    document.getElementById('guestPlayButton').addEventListener('click', () => {
        const username = document.getElementById('mainMenuUsername').value.trim() || 'Guest';
        
        // Sign in as guest with the provided username
        Auth.signInAsGuest(username)
            .then(() => {
                // Guest login successful, hide main menu
                document.getElementById('mainMenu').style.display = 'none';
            })
            .catch(error => {
                console.error('Guest login error:', error);
                // You could show an error message here
            });
    });
    
    // Add event listeners for 'Play with Google' button from main menu
    document.getElementById('googlePlayButton').addEventListener('click', () => {
        const username = document.getElementById('mainMenuUsername').value.trim();
        
        // If we're already authenticated with Google, just start the game
        if (Auth.isAuthenticated() && Auth.getCurrentUser() && !Auth.getCurrentUser().isAnonymous) {
            // Already signed in with Google, just start the game
            startGameWithShip();
            // Mark the game as started
            gameStarted = true;
            // Hide the main menu
            document.getElementById('mainMenu').style.display = 'none';
        } else {
            // Not signed in with Google yet, attempt sign in
            Auth.signInWithGoogle()
                .then(user => {
                    // If user provided a username and this is a new Google account, update profile
                    if (username && user && !user.displayName) {
                        return user.updateProfile({
                            displayName: username
                        }).then(() => {
                            return user.reload();
                        });
                    }
                    return user;
                })
                .catch(error => {
                    console.error('Google login error:', error);
                    // You could show an error message here
                });
        }
    });
    
    // Keep the original login menu button listeners for backward compatibility
    // Add event listeners for login buttons in the separate login menu
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
    
    // Add event listener for guest login button in the separate login menu
    document.getElementById('guestLoginButton').addEventListener('click', () => {
        const usernameInput = document.getElementById('guestUsername');
        let username = usernameInput.value.trim() || 'Guest';
        
        // Username will be sanitized in Auth.signInAsGuest, but we sanitize here too for defense in depth
        Auth.signInAsGuest(username)
            .then(() => {
                // Guest login successful, hide login menu
                Auth.hideLoginMenu();
            })
            .catch(error => {
                console.error('Guest login error:', error);
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
    
    // Clean up the treasure animation loop if it exists
    if (scene && scene.userData && scene.userData.treasureAnimationId) {
        console.log('Cancelling treasure animation loop:', scene.userData.treasureAnimationId);
        cancelAnimationFrame(scene.userData.treasureAnimationId);
        scene.userData.treasureAnimationId = null;
        
        // Also clear the treasure indicators array
        if (scene.userData.treasureIndicators) {
            // Remove any remaining treasure indicators from the scene
            scene.userData.treasureIndicators.forEach(indicator => {
                if (indicator) {
                    scene.remove(indicator);
                }
            });
            scene.userData.treasureIndicators = [];
        }
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

// Create minimal UI for main menu (no longer needed as we've updated the main menu HTML)
function createMinimalUI() {
    // Remove any existing info panel first
    const existingInfoElement = document.getElementById('info');
    if (existingInfoElement) {
        existingInfoElement.remove();
        
        // Create a basic info panel since we removed it
        const infoElement = document.createElement('div');
        infoElement.id = 'info';
        infoElement.innerHTML = `
            <h2>High Seas</h2>
            <p>Enter a username and click a button to play</p>
        `;
        document.body.appendChild(infoElement);
    }
    
    // Remove the old user info panel if it exists
    const oldUserInfo = document.getElementById('userInfo');
    if (oldUserInfo) {
        oldUserInfo.remove();
    }
}

// We're no longer using this function as the main menu directly handles login
// Keeping the function for backward compatibility but not using it
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
        // Note: When authentication completes, the auth listener will auto-start the game
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
    ship = new SailboatShip(scene, { 
        modelType: 'sailboat-3', // Use sailboat-3 model
        // speed: 50,
        // Set a default position that will be overridden by multiplayer
        position: new THREE.Vector3(0, 0, 0),
        // Add combat properties
        maxHealth: 100,
        cannonRange: 100,
        cannonDamage: { min: 8, max: 25 },
        cannonCooldown: 1500 // 1.5 seconds between shots
    });
    
    // Set the ship's ID to match the user's Firebase auth ID
    if (Auth && Auth.getCurrentUser()) {
        ship.id = Auth.getCurrentUser().uid;
        console.log('Set ship ID to match user ID:', ship.id);
    }
    
    // Make ship available globally for multiplayer combat interactions
    window.playerShip = ship;
    
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
        gameUI.setCombatManager(combatManager);
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
    } else {
        // Create info panel if it doesn't exist
        const newInfoElement = document.createElement('div');
        newInfoElement.id = 'info';
        newInfoElement.innerHTML = `
            <h2>Yarr!</h2>
            <p>Left-click: Move ship</p>
            <p>Right-click: Camera</p>
            <p>Click enemy: Target</p>
            <p>Space: Fire cannons</p>
        `;
        document.body.appendChild(newInfoElement);
    }
    
    // Add window unload event listener to set player offline when browser/tab is closed
    window.addEventListener('beforeunload', () => {
        if (multiplayerManager) {
            // Set player offline when the window is closed
            multiplayerManager.setPlayerOffline();
        }
    });

    // After creating UI and setting up the game
    gameUI.chatManager.setGameReferences(camera, [ship]);
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
    // Check if info panel exists, create it if not
    let infoElement = document.getElementById('info');
    if (!infoElement) {
        infoElement = document.createElement('div');
        infoElement.id = 'info';
        document.body.appendChild(infoElement);
    }
    
    // Update info panel for gameplay
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
                        // Get immediate reference to loot for optimistic UI update
                        const immediateLocalLoot = clickedShipwreck.loot || { gold: 0, items: [] };
                        
                        // Show loot notification immediately - don't wait for promise
                        if (gameUI) {
                            // Show a more prominent notification with gold amount immediately
                            gameUI.showNotification(`TREASURE FOUND! +${immediateLocalLoot.gold} gold`, 5000, 'success');
                            console.log('Looting shipwreck:', immediateLocalLoot);
                        }
                        
                        // Shipwreck is in range, loot it (now async)
                        enemyShipManager.lootShipwreck(clickedShipwreck)
                            .then(loot => {
                                // The server already updated the gold in the database, just trigger a UI update
                                // Trigger a gold update event to refresh the UI display
                                const goldUpdatedEvent = new CustomEvent('playerGoldUpdated', {
                                    detail: { gold: loot.gold }
                                });
                                document.dispatchEvent(goldUpdatedEvent);
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
        
        // Check if player ship has entered the Vibeverse portal
        const vibeVersePortal = scene.getObjectByName("vibeVersePortal");
        if (vibeVersePortal && ship && !ship.isLoading) {
            const playerBox = new THREE.Box3().setFromObject(ship.getObject());
            const portalBox = vibeVersePortal.userData.collisionBox;
            
            // Update the collision box to be centered on the portal
            const portalPosition = new THREE.Vector3();
            vibeVersePortal.getWorldPosition(portalPosition);
            const collisionSize = vibeVersePortal.userData.collisionSize || 8;
            
            portalBox.set(
                new THREE.Vector3(
                    portalPosition.x - collisionSize,
                    portalPosition.y - collisionSize,
                    portalPosition.z - collisionSize
                ),
                new THREE.Vector3(
                    portalPosition.x + collisionSize,
                    portalPosition.y + collisionSize,
                    portalPosition.z + collisionSize
                )
            );
            
            // Check if player is within 50 units of the portal for UI/feedback purposes
            const portalDistance = playerBox.getCenter(new THREE.Vector3()).distanceTo(
                portalBox.getCenter(new THREE.Vector3())
            );
            
            if (portalDistance < 50) {
                // Only redirect if the player's ship actually intersects with the portal
                if (playerBox.intersectsBox(portalBox)) {
                    // Get username from auth
                    const username = Auth.getCurrentUser()?.displayName || 'Unknown';
                    
                    // Before redirecting, update the player's position in Firebase to (0,0,0)
                    // This ensures they spawn at the origin when they return to the game
                    if (multiplayerManager && multiplayerManager.playerRef) {
                        // Save original position for possible issues
                        const originalPosition = ship.getPosition().clone();
                        console.log('Saving spawn position before portal redirect. Original position:', originalPosition);
                        
                        // Create a promise to update the player's position in the database
                        const updatePromise = multiplayerManager.playerRef.update({
                            position: {
                                x: 0,
                                y: 0,
                                z: 0
                            },
                            lastUpdated: firebase.database.ServerValue.TIMESTAMP
                        });
                        
                        // Wait for the position update to complete before redirecting
                        updatePromise.then(() => {
                            console.log('Player position reset to spawn point (0,0,0) before portal redirect');
                            
                            // Create URL with parameters
                            const params = new URLSearchParams();
                            params.append('portal', 'true');
                            params.append('username', username);
                            params.append('color', 'white'); // Default color
                            params.append('speed', ship.speed || 5); // Get ship speed if available
                            params.append('ref', window.location.hostname); // Current domain as reference
                            
                            // Redirect to Vibeverse Portal
                            window.location.href = `http://portal.pieter.com?${params.toString()}`;
                        }).catch(error => {
                            console.error('Error updating player position before portal redirect:', error);
                            
                            // Redirect anyway if there was an error updating the position
                            // Create URL with parameters
                            const params = new URLSearchParams();
                            params.append('portal', 'true');
                            params.append('username', username);
                            params.append('color', 'white'); // Default color
                            params.append('speed', ship.speed || 5); // Get ship speed if available
                            params.append('ref', window.location.hostname); // Current domain as reference
                            
                            // Redirect to Vibeverse Portal
                            window.location.href = `http://portal.pieter.com?${params.toString()}`;
                        });
                    } else {
                        // If there's no multiplayer manager or player reference, just redirect
                        console.warn('No multiplayer manager available to update position before portal redirect');
                        
                        // Create URL with parameters
                        const params = new URLSearchParams();
                        params.append('portal', 'true');
                        params.append('username', username);
                        params.append('color', 'white'); // Default color
                        params.append('speed', ship.speed || 5); // Get ship speed if available
                        params.append('ref', window.location.hostname); // Current domain as reference
                        
                        // Redirect to Vibeverse Portal
                        window.location.href = `http://portal.pieter.com?${params.toString()}`;
                    }
                }
            }
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

    // Update chat bubbles
    if (gameUI && gameUI.chatManager) {
        gameUI.chatManager.update();
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
    
    // Explicitly attach the multiplayer manager to the window object for global access
    window.multiplayerManager = multiplayerManager;
    
    // Initialize multiplayer with player's ship
    multiplayerManager.init(ship)
        .then(success => {
            if (success) {
                console.log('Multiplayer initialized successfully');
                
                // IMPORTANT: Set the player ship ID to match the authenticated user ID
                if (ship && Auth.isAuthenticated()) {
                    ship.id = multiplayerManager.playerId;
                    ship.type = 'player';
                    console.log('Set player ship ID:', ship.id);
                }
                
                // Connect the multiplayer manager to the combat manager if available
                if (combatManager) {
                    console.log('Connecting MultiplayerManager to CombatManager');
                    multiplayerManager.setCombatManager(combatManager);
                }
                
                // Connect the combat manager to the multiplayer manager if available
                if (combatManager && typeof combatManager.setMultiplayerManager === 'function') {
                    combatManager.setMultiplayerManager(multiplayerManager);
                }
                
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

// Function to create Vibeverse Portal
function createVibeVersePortal() {
    // Create portal group to contain all portal elements
    const portalGroup = new THREE.Group();
    portalGroup.position.set(-200, 0, -300); // Position the portal somewhere in the world
    portalGroup.rotation.x = 0; // Make portal upright (was 0.35)
    portalGroup.rotation.y = 0;
    portalGroup.name = "vibeVersePortal";

    // Create portal effect (torus)
    const portalGeometry = new THREE.TorusGeometry(15, 2, 16, 100);
    const portalMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        transparent: true,
        opacity: 0.8
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portalGroup.add(portal);

    // Create portal inner surface (circle)
    const portalInnerGeometry = new THREE.CircleGeometry(13, 32);
    const portalInnerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
    portalGroup.add(portalInner);
    
    // Add portal label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512; 
    canvas.height = 64;
    context.fillStyle = '#00ff00';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(30, 5);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 20;
    portalGroup.add(label);

    // Create particle system for portal effect
    const portalParticleCount = 1000;
    const portalParticles = new THREE.BufferGeometry();
    const portalPositions = new Float32Array(portalParticleCount * 3);
    const portalColors = new Float32Array(portalParticleCount * 3);

    for (let i = 0; i < portalParticleCount * 3; i += 3) {
        // Create particles in a ring around the portal
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + (Math.random() - 0.5) * 4;
        portalPositions[i] = Math.cos(angle) * radius;
        portalPositions[i + 1] = Math.sin(angle) * radius;
        portalPositions[i + 2] = (Math.random() - 0.5) * 4;

        // Green color with slight variation
        portalColors[i] = 0;
        portalColors[i + 1] = 0.8 + Math.random() * 0.2;
        portalColors[i + 2] = 0;
    }

    portalParticles.setAttribute('position', new THREE.BufferAttribute(portalPositions, 3));
    portalParticles.setAttribute('color', new THREE.BufferAttribute(portalColors, 3));

    const portalParticleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    const portalParticleSystem = new THREE.Points(portalParticles, portalParticleMaterial);
    portalGroup.add(portalParticleSystem);

    // Add full portal group to scene
    scene.add(portalGroup);

    // Create a tighter custom collision box instead of using the full group bounds
    // Use the inner circle size (radius 13) as reference, not the entire portal object
    const collisionSize = 8; // Smaller than the inner circle radius for tighter collision
    const portalBox = new THREE.Box3(
        new THREE.Vector3(-collisionSize, -collisionSize, -collisionSize),
        new THREE.Vector3(collisionSize, collisionSize, collisionSize)
    );
    
    // Store the collision box in the portal's userData for later updates
    portalGroup.userData.collisionBox = portalBox;
    portalGroup.userData.collisionSize = collisionSize;
    portalGroup.userData.particles = portalParticles;

    // Start animating the portal particles
    animatePortalParticles(portalParticles);
}

// Function to animate portal particles
function animatePortalParticles(particles) {
    function update() {
        const positions = particles.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
        }
        particles.attributes.position.needsUpdate = true;
        
        requestAnimationFrame(update);
    }
    update();
}

// Function to check URL parameters for portal data
function checkPortalParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const comingFromPortal = urlParams.get('portal') === 'true';
    
    if (comingFromPortal) {
        console.log('Player arrived through a portal');
        
        // Get username from URL parameter
        const username = urlParams.get('username');
        if (username) {
            console.log('Setting username from portal:', username);
            
            // Set the username in the main menu input field
            const usernameField = document.getElementById('mainMenuUsername');
            if (usernameField) {
                usernameField.value = username;
            }
            
            // Also set the username in the guest login field
            const guestUsernameField = document.getElementById('guestUsername');
            if (guestUsernameField) {
                guestUsernameField.value = username;
            }
            
            // Auto-start game if coming from portal
            // We'll start the game after a short delay to ensure DOM is fully loaded
            setTimeout(() => {
                // Click the guest play button to start the game immediately
                document.getElementById('guestPlayButton').click();
            }, 500);
        }
    }
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