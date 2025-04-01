import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import IslandGenerator from '../islands/IslandGenerator.js';
import IslandLoader from '../islands/IslandLoader.js';
import World from '../world.js';
import { SailboatShip } from '../ships/index.js';
import { WindSystem } from '../wind.js';
import MarketStall from '../objects/market-stall.js';
import Dock from '../objects/dock.js';
import Auth from '../auth.js';
import GameUI from '../UI.js';
import MultiplayerManager from '../multiplayer.js';
import BuildingManager from '../BuildingManager.js';
import IslandInteractionManager from '../islands/IslandInteractionManager.js';
import EnemyShipManager from '../ships/EnemyShipManager.js';
import CombatManager from '../combat/CombatManager.js';
import CombatService from '../combat/CombatService.js';
import PortalManager from './PortalManager.js';
import SceneManager from './SceneManager.js';
import InputManager from './InputManager.js';
import SoundManager from '../SoundManager.js';
import SpatialAudioManager from '../SpatialAudioManager.js';

class GameCore {
    constructor() {
        // Scene Manager - handles scene, camera, renderer, controls
        this.sceneManager = new SceneManager();
        
        // Main game variables
        this.clock = new THREE.Clock();
        this.cameraOffset = new THREE.Vector3(0, 10, 20); // Camera offset from ship
        this.world = null; // World instance that contains sky, water, lighting, etc.
        this.ship = null; // Ship instance
        this.windSystem = null; // Wind system instance
        this.gameStarted = false; // Flag to track if the game has started
        this.multiplayerManager = null;

        // Island systems
        this.islandGenerator = null;
        this.islandLoader = null;

        // Add gameUI variable
        this.gameUI = null;

        // Add manager variables
        this.buildingManager = null;
        this.islandManager = null;
        this.portalManager = null;
        
        // Input manager
        this.inputManager = null;

        // Add combat system variables
        this.enemyShipManager = null;
        this.combatManager = null;
        this.combatService = null;
        
        // Sound manager
        this.soundManager = null;
        
        // Spatial audio manager
        this.spatialAudioManager = null;
        
        // Track player zone status
        this.playerInSafeZone = false;
        
        // Bind methods to maintain 'this' context
        this.animate = this.animate.bind(this);
    }

    // Function to completely reset camera controls
    resetCameraControls() {
        if (this.inputManager) {
            this.inputManager.setInputMode('menu');
        } else if (this.sceneManager) {
            this.sceneManager.disposeControls();
        }
    }

    // Initialize only the world (for main menu)
    initWorldOnly() {
        // Initialize the scene manager
        this.sceneManager.initialize();
        
        // Create portal manager and check for portal URL parameter
        this.portalManager = new PortalManager(this.sceneManager.getScene());
        this.portalManager.checkPortalParameters();

        // Initialize world (sky, water, lighting, etc.)
        this.world = new World(this.sceneManager.getScene());
        
        // Create Vibeverse Portal
        this.portalManager.createVibeVersePortal();
        
        // Initialize input manager
        this.inputManager = new InputManager({
            sceneManager: this.sceneManager,
            gameCore: this
        }).initialize();
        
        // Setup menu controls
        this.setupMenuControls();
        
        // Initialize wind system
        this.windSystem = new WindSystem(this.sceneManager.getScene(), this.sceneManager.getCamera(), {
            windSpeed: 20,
            changeInterval: 15,
            transitionDuration: 3
        });
        
        // Initialize sound manager
        this.soundManager = new SoundManager().init();
        
        // Make sound manager globally accessible
        window.soundManager = this.soundManager;
        
        // Initialize spatial audio manager
        this.spatialAudioManager = new SpatialAudioManager();
        this.spatialAudioManager.initialize(); // This loads the sounds asynchronously
        
        // Make spatial audio manager globally accessible
        window.spatialAudioManager = this.spatialAudioManager;
        
        // Generate islands
        this.generateIslands();
        
        // Create minimal UI for main menu
        this.createMinimalUI();
        
        // Setup auth event listeners
        this.setupAuthListeners();
        
        // Start animation loop if not already running
        if (!window.animationFrameId) {
            this.sceneManager.startAnimationLoop(this.animate);
        }
        
        // Add event listener to ensure audio context gets resumed after user interaction
        document.addEventListener('click', () => {
            if (this.spatialAudioManager) {
                this.spatialAudioManager.resumeAudioContext();
            }
        }, { once: true });
    }
    
    // Setup controls for the main menu (orbiting camera)
    setupMenuControls() {
        if (this.inputManager) {
            this.inputManager.setInputMode('menu');
        }
    }
    
    // Setup controls for gameplay
    setupGameplayControls() {
        if (this.inputManager) {
            this.inputManager.setInputMode('gameplay');
        }
    }
    
    // Create minimal UI for main menu (no longer needed as we've updated the main menu HTML)
    createMinimalUI() {
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
    
    // Update UI for gameplay
    updateUIForGameplay() {
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
    
    // Setup auth event listeners
    setupAuthListeners() {
        // Add auth state listener
        Auth.addAuthStateListener((user) => {
            if (user) {
                // If user is logged in, always hide the login menu first
                Auth.hideLoginMenu();
                
                // Auto-start the game if user is authenticated, regardless of the gameStarted flag
                this.startGameWithShip();
                // Mark the game as started
                this.gameStarted = true;
                // Hide the main menu
                document.getElementById('mainMenu').style.display = 'none';
            } else if (!user && this.gameStarted) {
                // If user logged out and game was started, reset the game
                this.resetGame();
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
                this.startGameWithShip();
                // Mark the game as started
                this.gameStarted = true;
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
    resetGame() {
        // Reset game started flag
        this.gameStarted = false;
        
        // Clean up input manager if it exists
        if (this.inputManager) {
            this.inputManager.setInputMode('menu');
        }
        
        // Clean up combat managers if they exist
        if (this.combatManager) {
            console.log('Cleaning up combat manager');
            this.combatManager.cleanup();
            this.combatManager = null;
        }
        
        // Clean up enemy ships manager first to ensure all ships are removed
        if (this.enemyShipManager) {
            console.log('Resetting enemy ship manager');
            // Make sure to reset the enemy ship manager before nullifying it
            this.enemyShipManager.reset();
            
            // Add a small delay to ensure all ships are properly removed
            setTimeout(() => {
                // Double-check for any remaining enemy ships in the scene
                if (this.sceneManager && this.sceneManager.getScene()) {
                    this.sceneManager.getScene().traverse(object => {
                        // Look for any objects that might be enemy ships
                        if (object.userData && object.userData.isEnemyShip) {
                            console.log('Found remaining enemy ship, removing:', object.name);
                            this.sceneManager.getScene().remove(object);
                        }
                        
                        // Also look for any shipwrecks
                        if (object.userData && object.userData.isShipwreck) {
                            console.log('Found remaining shipwreck, removing:', object.name);
                            this.sceneManager.getScene().remove(object);
                        }
                    });
                }
                
                // Now set to null after cleanup
                this.enemyShipManager = null;
                console.log('Enemy ship manager nullified');
            }, 100);
        }
        
        // Clean up other managers if they exist
        if (this.buildingManager) {
            this.buildingManager.cleanup();
            this.buildingManager = null;
        }
        
        if (this.islandManager) {
            // No cleanup method needed for IslandInteractionManager currently
            this.islandManager = null;
        }
        
        // Clean up the treasure animation loop if it exists
        if (this.sceneManager && this.sceneManager.getScene() && this.sceneManager.getScene().userData && this.sceneManager.getScene().userData.treasureAnimationId) {
            console.log('Cancelling treasure animation loop:', this.sceneManager.getScene().userData.treasureAnimationId);
            cancelAnimationFrame(this.sceneManager.getScene().userData.treasureAnimationId);
            this.sceneManager.getScene().userData.treasureAnimationId = null;
            
            // Also clear the treasure indicators array
            if (this.sceneManager.getScene().userData.treasureIndicators) {
                // Remove any remaining treasure indicators from the scene
                this.sceneManager.getScene().userData.treasureIndicators.forEach(indicator => {
                    if (indicator) {
                        this.sceneManager.getScene().remove(indicator);
                    }
                });
                this.sceneManager.getScene().userData.treasureIndicators = [];
            }
        }
        
        // Reset camera controls completely
        this.resetCameraControls();
        
        // Remove ship if it exists
        if (this.ship) {
            try {
                // Check if ship has getObject method before calling it
                if (typeof this.ship.getObject === 'function') {
                    const shipObject = this.ship.getObject();
                    if (shipObject) {
                        this.sceneManager.getScene().remove(shipObject);
                    }
                } else {
                    // If ship doesn't have getObject method, try to remove it directly
                    this.sceneManager.getScene().remove(this.ship);
                }
            } catch (error) {
                console.warn('Error removing ship:', error);
            }
            
            // Set ship to null regardless of removal success
            this.ship = null;
        }
        
        // Reset camera position if camera exists
        if (this.sceneManager.getCamera()) {
            this.sceneManager.getCamera().position.set(0, 100, 300);
            this.sceneManager.getCamera().lookAt(0, 0, 0);
        }
        
        // Setup menu controls again 
        this.setupMenuControls();
        
        // Show main menu
        document.getElementById('mainMenu').style.display = 'flex';
        
        // Only update UI if we're not going to recreate it later
        // This check prevents duplicate UI elements
        if (this.sceneManager.getScene() && !this.sceneManager.getScene()._markedForDisposal) {
            this.createMinimalUI();
        }
        
        // Hide game UI if it exists
        if (this.gameUI) {
            this.gameUI.hide();
            
            // Explicitly hide the target info and health bar containers
            if (this.gameUI.targetInfoContainer) {
                this.gameUI.targetInfoContainer.style.display = 'none';
            }
            if (this.gameUI.healthBarContainer) {
                this.gameUI.healthBarContainer.style.display = 'none';
            }
            
            // Clear any target in the UI
            this.gameUI.setTarget(null);
        }
        
        // Clean up multiplayer
        if (this.multiplayerManager) {
            try {
                // Try to set player offline directly if we still have a valid reference
                if (this.multiplayerManager.playerRef && Auth.isAuthenticated()) {
                    console.log('Setting player offline during game reset');
                    this.multiplayerManager.playerRef.update({
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
            this.multiplayerManager.cleanup();
            this.multiplayerManager = null;
        }
    }

    // Initialize the scene (original init function, kept for backward compatibility)
    init() {
        this.initWorldOnly();
        this.startGame();
    }
    
    // We're no longer using this function as the main menu directly handles login
    // Keeping the function for backward compatibility but not using it
    startGame() {
        // Set game started flag
        this.gameStarted = true;
        
        // Hide the main menu
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.style.display = 'none';
        }
        
        // Check if user is authenticated
        if (Auth.isAuthenticated()) {
            // User is already logged in, start the game with ship
            this.startGameWithShip();
        } else {
            // User is not logged in, show login menu
            Auth.showLoginMenu();
            // Note: When authentication completes, the auth listener will auto-start the game
        }
    }

    // Start the game with ship after authentication
    startGameWithShip() {
        // Hide the main menu
        document.getElementById('mainMenu').style.display = 'none';
        
        // Reset camera position for gameplay
        this.sceneManager.getCamera().position.set(0, 10, 20);
        
        // Load player position from Firebase first
        this.loadPlayerPosition()
            .then(playerData => {
                // Now load the player's saved ship model
                return this.loadPlayerShipModel()
                    .then(modelType => {
                        // Get position from playerData or use default
                        const position = playerData && playerData.position
                            ? new THREE.Vector3(
                                playerData.position.x, 
                                0, 
                                playerData.position.z
                              )
                            : new THREE.Vector3(0, 0, 0);
                        
                        // Create ship with the saved model type and position
                        this.ship = new SailboatShip(this.sceneManager.getScene(), { 
                            modelType: modelType, // Use the loaded model type
                            position: position // Use loaded position
                        });
                        
                        // Set rotation if available
                        if (playerData && playerData.rotation && this.ship.getObject()) {
                            this.ship.getObject().rotation.y = playerData.rotation.y || 0;
                            
                            // Also update the ship's internal rotation tracking
                            this.ship.targetRotation = playerData.rotation.y || 0;
                        }
                        
                        // Set the ship's ID to match the user's Firebase auth ID
                        if (Auth && Auth.getCurrentUser()) {
                            this.ship.id = Auth.getCurrentUser().uid;
                        }
                        
                        // Make ship available globally for multiplayer combat interactions
                        window.playerShip = this.ship;
                        
                        // Log all ship initialization details in a single message
                        console.log(`Player ship initialized: type=${modelType}, position=${position.x.toFixed(2)},${position.z.toFixed(2)}, id=${this.ship.id}`);
                        
                        // Setup gameplay controls with the new ship
                        this.setupGameplayControls();
                        
                        // Update UI for gameplay
                        this.updateUIForGameplay();
                        
                        // Initialize game UI
                        if (!this.gameUI) {
                            this.gameUI = new GameUI({
                                auth: Auth,
                                playerShip: this.ship, // Pass player ship to UI for health display
                                onLogout: () => {
                                    console.log('Logout callback triggered - setting player offline');
                                    
                                    // Set player offline before handling logout
                                    if (this.multiplayerManager && this.multiplayerManager.playerRef) {
                                        try {
                                            // Use Firebase directly to update the player status
                                            // This ensures we're using the authenticated reference that still exists
                                            const playerRef = this.multiplayerManager.playerRef;
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
                                    if (this.gameUI) {
                                        this.gameUI.hide();
                                    }
                                }
                            });
                            
                            // Make gameUI accessible globally for ship sink events
                            window.gameUI = this.gameUI;
                        } else {
                            // Update player ship reference in UI
                            this.gameUI.setPlayerShip(this.ship);
                            
                            // Clear any previous target
                            this.gameUI.setTarget(null);
                        }
                        
                        // Make sure player ship has a health bar
                        if (this.ship && !this.ship.healthBarContainer) {
                            this.ship.createHealthBar();
                            
                            // Set initial visibility based on health
                            if (this.ship.currentHealth < this.ship.maxHealth) {
                                this.ship.setHealthBarVisible(true);
                            } else {
                                this.ship.setHealthBarVisible(false);
                            }
                        }
                        
                        // Show the game UI
                        this.gameUI.show();
                        
                        // Set up ambient ocean sound (with regular sound manager)
                        if (this.soundManager) {
                            this.soundManager.playOceanAmbientOnInteraction(this.gameUI);
                        }
                        
                        // Ensure spatial audio context is resumed after user interaction
                        if (this.spatialAudioManager) {
                            this.spatialAudioManager.resumeAudioContext();
                        }
                        
                        // Create an empty island menu container if it doesn't exist
                        if (!document.getElementById('islandMenu')) {
                            const menu = document.createElement('div');
                            menu.id = 'islandMenu';
                            menu.style.display = 'none';
                            document.body.appendChild(menu);
                        }
                        
                        // When using the player's saved position, initialize multiplayer first
                        // to make sure all position synchronization is correctly set up
                        if (Auth.isAuthenticated()) {
                            // Initialize multiplayer first with the already positioned ship
                            // This avoids having the multiplayer position override our loaded position
                            this.initMultiplayer();
                            
                            // After multiplayer is initialized, continue with the rest of the setup
                            // Note: The below initialization doesn't depend on player position
                            this.finishGameInitialization();
                        } else {
                            // If not authenticated, just finish initialization
                            this.finishGameInitialization();
                        }
                        
                        // Point camera at the ship's position
                        if (this.ship && this.sceneManager) {
                            this.sceneManager.updateCameraToFollowTarget(this.ship);
                        }
                        
                        // Explicitly update player position in Firebase to ensure it's current
                        if (this.multiplayerManager && this.ship) {
                            setTimeout(() => {
                                this.multiplayerManager.updatePlayerPosition(this.ship, true);
                            }, 1000); // slight delay to ensure everything's initialized
                        }
                    });
            });
    }
    
    /**
     * Complete game initialization after ship and multiplayer are set up
     * This separates position-dependent and position-independent initialization steps
     */
    finishGameInitialization() {
        // Initialize BuildingManager
        this.buildingManager = new BuildingManager({
            scene: this.sceneManager.getScene(),
            camera: this.sceneManager.getCamera(),
            islandGenerator: this.islandGenerator,
            world: this.world,
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
        
        // Initialize IslandInteractionManager
        this.islandManager = new IslandInteractionManager({
            scene: this.sceneManager.getScene(),
            camera: this.sceneManager.getCamera(),
            ship: this.ship,
            islandGenerator: this.islandGenerator,
            world: this.world,
            buildingManager: this.buildingManager,
            gameUI: this.gameUI,
            multiplayerManager: this.multiplayerManager
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
                
                this.combatService = new CombatService({
                    firebase: firebase,
                    auth: Auth
                });
                console.log('CombatService initialized successfully');
            } catch (error) {
                console.error('Error initializing CombatService:', error);
                this.combatService = null;
            }
        } else {
            console.warn('Firebase is not available, combat server validation will be disabled');
            console.log('Window object contains firebase?', 'firebase' in window);
            this.combatService = null;
        }
        
        // Now initialize managers in the correct order
        
        // Initialize CombatManager first (without enemy ships yet)
        this.combatManager = new CombatManager({
            playerShip: this.ship,
            ui: this.gameUI,
            scene: this.sceneManager.getScene(),
            camera: this.sceneManager.getCamera()
        });
        
        // Make combatManager globally accessible for BaseShip class
        window.combatManager = this.combatManager;
        
        // Connect combat service to combat manager if available
        if (this.combatService && this.combatManager) {
            console.log('Connecting CombatService to CombatManager');
            this.combatManager.setCombatService(this.combatService);
        }
        
        // Connect zones manager to combat manager if available
        if (this.world && this.world.zones && this.combatManager) {
            console.log('Connecting Zones to CombatManager');
            this.combatManager.setZonesManager(this.world.zones);
        }
        
        // Initialize EnemyShipManager with the now-initialized combatService
        this.enemyShipManager = new EnemyShipManager({
            scene: this.sceneManager.getScene(),
            playerShip: this.ship,
            maxEnemyShips: 5,
            spawnRadius: 500,
            worldSize: 1000,
            aggroRange: 150,
            lootableRange: 20,
            combatService: this.combatService, // Now combatService is properly initialized
            zonesManager: this.world.zones // Pass the zones manager during initialization
        });
        
        // Set combat service explicitly to ensure it gets passed to ShipwreckManager
        if (this.enemyShipManager && this.combatService) {
            this.enemyShipManager.setCombatService(this.combatService);
        }
        
        // Update CombatManager with enemy ship manager reference
        if (this.combatManager && this.enemyShipManager) {
            this.combatManager.setEnemyShipManager(this.enemyShipManager);
        }
        
        // Make sure no target is selected at game start
        if (this.combatManager && this.gameUI) {
            // No need to explicitly clear target, TargetManager already clears it by default
            this.gameUI.setTarget(null);
            
            // Update the GameUI with a reference to the combatManager
            this.gameUI.setCombatManager(this.combatManager);
        }
        
        // Connect EnemyShipManager to CombatManager
        if (this.enemyShipManager && this.combatManager) {
            this.enemyShipManager.setCombatManager(this.combatManager);
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
            if (this.multiplayerManager) {
                // Set player offline when the window is closed
                this.multiplayerManager.setPlayerOffline();
            }
        });

        // After creating UI and setting up the game
        if (this.gameUI && this.gameUI.chatManager) {
            this.gameUI.chatManager.setGameReferences(this.sceneManager.getCamera(), [this.ship]);
        }
    }
    
    /**
     * Load the player's position from Firebase
     * @returns {Promise<Object>} Promise that resolves with player data or null if not found
     */
    loadPlayerPosition() {
        if (!Auth || !Auth.isAuthenticated()) {
            return Promise.resolve(null); // Default if not authenticated
        }
        
        const user = Auth.getCurrentUser();
        const playerId = user.uid;
        
        // Create a reference to the player in Firebase
        const playerRef = firebase.database().ref(`players/${playerId}`);
        
        return playerRef.once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const playerData = snapshot.val();
                    console.log('Loaded player position data:', playerData.position);
                    return playerData;
                } else {
                    console.log('No player position data found, using default position');
                    return null;
                }
            })
            .catch(error => {
                console.error('Error loading player position:', error);
                return null; // Default on error
            });
    }
    
    /**
     * Load the player's saved ship model from Firebase
     * @returns {Promise<string>} Promise that resolves with the ship model type
     */
    loadPlayerShipModel() {
        if (!Auth || !Auth.isAuthenticated()) {
            return Promise.resolve('sloop'); // Default if not authenticated
        }
        
        const user = Auth.getCurrentUser();
        const playerId = user.uid;
        
        // Create a reference to the player in Firebase
        const playerRef = firebase.database().ref(`players/${playerId}`);
        
        return playerRef.once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const playerData = snapshot.val();
                    // Return the saved model type or default to 'sloop'
                    return playerData.modelType || 'sloop';
                } else {
                    console.log('No player data found, creating default profile with sloop model');
                    // For new users, create default profile data
                    const initialData = {
                        id: playerId,
                        displayName: user.displayName || user.email || 'Sailor',
                        position: {x: 0, y: 0, z: 0},
                        rotation: {y: 0},
                        modelType: 'sloop',
                        health: 100,
                        maxHealth: 100,
                        isSunk: false,
                        gold: 0,
                        unlockedShips: ['sloop'],
                        isOnline: true,
                        lastUpdated: firebase.database.ServerValue.TIMESTAMP
                    };
                    
                    // Set default profile data
                    return playerRef.set(initialData)
                        .then(() => {
                            console.log('Created default player profile');
                            return 'sloop';
                        })
                        .catch(error => {
                            console.error('Error creating default profile:', error);
                            return 'sloop';
                        });
                }
            })
            .catch(error => {
                console.error('Error loading player ship model:', error);
                return 'sloop'; // Default on error
            });
    }
    
    // Generate islands in the ocean - updated to use the island loader
    generateIslands() {
        // Initialize island generator for basic islands
        this.islandGenerator = new IslandGenerator(this.sceneManager.getScene());
        
        // Initialize island loader
        this.islandLoader = new IslandLoader({
            scene: this.sceneManager.getScene()
        });
        
        // Load islands from manifest file
        this.loadIslandsFromManifest().then(() => {
            console.log('Custom islands loaded successfully');
            
            // Generate additional procedural islands at specific positions
            const procedualIslandPositions = [
                new THREE.Vector3(500, 0, 300),
                new THREE.Vector3(-700, 0, -400),
                new THREE.Vector3(300, 0, -800)
            ];
            
            // Generate these islands with 15 trees per island
            this.islandGenerator.generateIslands(procedualIslandPositions, 15);
            
            // Update island references for other systems
            this.updateIslandReferences();
        }).catch(error => {
            console.error('Failed to load custom islands:', error);
            
            // Fallback to generating only procedural islands
            console.log('Falling back to procedural islands only');
            
            const islandPositions = [
                new THREE.Vector3(500, 0, 300),
                new THREE.Vector3(-700, 0, -400),
                new THREE.Vector3(300, 0, -800),
                new THREE.Vector3(-500, 0, 600),
                new THREE.Vector3(1000, 0, -200)
            ];
            
            // Generate islands with 15 trees per island
            this.islandGenerator.generateIslands(islandPositions, 15);
            
            // Generate a larger custom island
            const customGeometry = new THREE.PlaneGeometry(400, 400, 80, 80);
            this.islandGenerator.generateCustomIsland(new THREE.Vector3(-200, 0, 1000), customGeometry, 30);
        });
    }
    
    /**
     * Load islands from the manifest file
     * @returns {Promise} - Resolves when islands are loaded
     */
    async loadIslandsFromManifest() {
        try {
            // Use the IslandLoader to load islands from the manifest
            const result = await this.islandLoader.loadIslandsFromManifest('/game/islands/islands-manifest.json');
            
            // Initialize zones with the loaded manifest
            if (this.world && result.manifest) {
                this.world.loadIslandsManifest(result.manifest);
                
                // Connect zones manager with enemy ship manager and combat manager if they exist
                if (this.world.zones) {
                    if (this.enemyShipManager) {
                        this.enemyShipManager.setZonesManager(this.world.zones);
                    }
                    
                    if (this.combatManager) {
                        this.combatManager.setZonesManager(this.world.zones);
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error loading islands from manifest:', error);
            throw error;
        }
    }
    
    /**
     * Update island references for the building manager and island manager
     */
    updateIslandReferences() {
        // Get all islands from both sources
        const generatorIslands = this.islandGenerator.getIslands();
        const loaderIslands = this.islandLoader ? this.islandLoader.getIslands().map(i => i.mesh) : [];
        
        // Combine islands from both sources
        const allIslands = [...generatorIslands, ...loaderIslands];
        
        // Update the island generator's islands array
        this.islandGenerator.islands = allIslands;
        
        // Update building manager if it exists
        if (this.buildingManager) {
            this.buildingManager.islandGenerator = this.islandGenerator;
        }
        
        // Update island manager if it exists
        if (this.islandManager) {
            this.islandManager.islandGenerator = this.islandGenerator;
        }
    }

    animate(delta, elapsedTime) {
        // Use the delta and elapsedTime passed from SceneManager's animation loop
        // or calculate them if running directly
        if (!delta || !elapsedTime) {
            delta = this.sceneManager.getClock().getDelta();
            elapsedTime = this.sceneManager.getClock().getElapsedTime();
        }
        
        // Update world (sky, water, lighting, etc.)
        if (this.world) {
            this.world.update(delta);
        }
        
        // Update ship and wake particles only if game has started
        if (this.gameStarted && this.ship) {
            // Store previous movement state to detect when ship stops
            const wasMoving = this.ship.isMoving;
            
            // Update ship
            this.ship.update(delta, elapsedTime);
            
            // Check for zone transitions if we have a zones system
            if (this.world && this.world.zones && this.gameUI) {
                const shipPosition = this.ship.getPosition();
                const inSafeZone = this.world.zones.isInSafeZone(shipPosition.x, shipPosition.z);
                
                // Check if player has entered or left a safe zone
                if (inSafeZone !== this.playerInSafeZone) {
                    if (inSafeZone) {
                        // Player entered a safe zone - get zone info if available
                        const zoneInfo = this.world.zones.getSafeZoneInfo(shipPosition.x, shipPosition.z);
                        // Use more fun messaging for zone transitions
                        this.gameUI.notificationSystem.showZoneNotification("entering safe waters...");
                    } else {
                        // Player left a safe zone
                        this.gameUI.notificationSystem.showZoneNotification("entering open waters...");
                    }
                    
                    // Update tracked state
                    this.playerInSafeZone = inSafeZone;
                }
            }
            
            // If ship was moving but has now stopped, sync final position with Firebase
            if (wasMoving && !this.ship.isMoving && this.multiplayerManager) {
                this.multiplayerManager.updatePlayerPosition(this.ship);
            }
            
            // Check if player ship has entered the Vibeverse portal
            if (this.portalManager) {
                this.portalManager.checkPortalInteraction(this.ship, this.multiplayerManager);
            }
            
            // Update game UI if it exists
            if (this.gameUI && this.gameUI.isVisible) {
                this.gameUI.update();
            }
            
            // Update island manager if it exists
            if (this.islandManager) {
                this.islandManager.update(delta);
            }
            
            // Update enemy ship manager if it exists
            if (this.enemyShipManager) {
                this.enemyShipManager.update(delta, elapsedTime);
            }
            
            // Update combat manager if it exists
            if (this.combatManager) {
                this.combatManager.update(delta);
            }
            
            // Update camera to follow ship using SceneManager helper
            if (this.ship) {
                this.sceneManager.updateCameraToFollowTarget(this.ship);
            }
            
            // Update spatial audio listener position based on camera
            if (this.spatialAudioManager && this.sceneManager) {
                try {
                    this.spatialAudioManager.updateListener(
                        this.sceneManager.getCamera(),
                        this.ship.getPosition()
                    );
                } catch (e) {
                    console.warn('Error updating spatial audio listener:', e);
                    // If there's a critical error with the spatial audio system, disable it to prevent game freeze
                    if (e instanceof ReferenceError || e instanceof TypeError) {
                        console.error('Disabling spatial audio due to critical error');
                        this.spatialAudioManager = null;
                        window.spatialAudioManager = null;
                    }
                }
            }
        }
        
        // Update wind system
        this.windSystem.update(delta);
        
        // Update multiplayer if initialized
        if (this.multiplayerManager) {
            this.multiplayerManager.update(delta);
        }
    
        // Update chat bubbles
        if (this.gameUI && this.gameUI.chatManager) {
            this.gameUI.chatManager.update();
        }
    }
    
    /**
     * Initialize multiplayer functionality
     */
    initMultiplayer() {
        // Store camera reference in scene for nametag positioning
        this.sceneManager.getScene().userData.camera = this.sceneManager.getCamera();
        
        // Create multiplayer manager with callback for when player position is loaded
        this.multiplayerManager = new MultiplayerManager({
            auth: Auth,
            scene: this.sceneManager.getScene(),
            onPlayerPositionLoaded: (position, rotation) => {
                // Update the ship's position and rotation when loaded from Firebase
                if (this.ship && this.ship.getObject()) {
                    // Force y position to always be 0
                    position.y = 0;
                    
                    // Update ship position
                    this.ship.getObject().position.set(position.x, position.y, position.z);
                    
                    // Update ship rotation
                    this.ship.getObject().rotation.y = rotation.y || 0;
                    
                    // Update the ship's internal position property as well
                    this.ship.position.copy(this.ship.getObject().position);
                    
                    // Update camera to look at the ship's new position using SceneManager
                    this.sceneManager.updateCameraToFollowTarget(this.ship);
                    
                    // Update player ship reference in enemy ship manager
                    if (this.enemyShipManager) {
                        this.enemyShipManager.setPlayerShip(this.ship);
                    }
                } else {
                    console.error('Ship object not available for position update');
                }
            }
        });
        
        // Explicitly attach the multiplayer manager to the window object for global access
        window.multiplayerManager = this.multiplayerManager;
        
        // Initialize multiplayer with player's ship
        this.multiplayerManager.init(this.ship)
            .then(success => {
                if (success) {
                    console.log('Multiplayer initialized successfully');
                    
                    // IMPORTANT: Set the player ship ID to match the authenticated user ID
                    if (this.ship && Auth.isAuthenticated()) {
                        this.ship.id = this.multiplayerManager.playerId;
                        this.ship.type = 'player';
                        console.log('Set player ship ID:', this.ship.id);
                    }
                    
                    // Connect the multiplayer manager to the combat manager if available
                    if (this.combatManager) {
                        console.log('Connecting MultiplayerManager to CombatManager');
                        this.multiplayerManager.setCombatManager(this.combatManager);
                    }
                    
                    // Connect the combat manager to the multiplayer manager if available
                    if (this.combatManager && typeof this.combatManager.setMultiplayerManager === 'function') {
                        this.combatManager.setMultiplayerManager(this.multiplayerManager);
                    }
                    
                    // Initialize the EnemyShipManager with Firebase for multiplayer synchronization
                    if (this.enemyShipManager && typeof this.enemyShipManager.initializeWithFirebase === 'function') {
                        console.log('Initializing EnemyShipManager multiplayer features');
                        this.enemyShipManager.initializeWithFirebase();
                    }
                    
                    // Override ship's moveTo method to sync with Firebase
                    const originalMoveTo = this.ship.moveTo;
                    this.ship.moveTo = (targetPos) => {
                        // Call original method
                        originalMoveTo.call(this.ship, targetPos);
                        
                        // Sync with Firebase immediately with force update
                        if (this.multiplayerManager) {
                            // Force update to ensure position is saved even if last sync was recent
                            this.multiplayerManager.updatePlayerPosition(this.ship, true);
                        }
                    };
                    
                    // Override ship's takeDamage method to sync with Firebase
                    const originalTakeDamage = this.ship.takeDamage;
                    this.ship.takeDamage = function(amount) {
                        // Call original method and get result
                        const wasSunk = originalTakeDamage.call(this, amount);
                        
                        // Sync with Firebase
                        if (this.multiplayerManager) {
                            this.multiplayerManager.updatePlayerHealth(this.ship);
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
    
    // Export properties for external access
    getScene() {
        return this.sceneManager.getScene();
    }
    
    getCamera() {
        return this.sceneManager.getCamera();
    }
    
    getRenderer() {
        return this.sceneManager.getRenderer();
    }
}

export default GameCore; 