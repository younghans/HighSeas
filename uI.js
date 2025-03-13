import * as THREE from 'three';
import { Race, BuoyIndicator } from './race/index.js';
import keyboardManager from './KeyboardManager.js';

/**
 * UI class for handling all user interface elements
 */
class UI {
    constructor(app) {
        this.app = app;
        this.boat = app.boat;
        this.world = app.world;
        this.race = new Race(this.world, this.boat);
        this.buoyIndicator = null;

        // UI elements
        this.infoPanel = null;
        this.windIndicator = null;
        this.windArrow = null;
        this.controlsInfo = null;
        this.compass = null;
        this.speedometer = null;

        // Element references
        this.elements = {};

        // Add responsive styles
        this.addResponsiveStyles();

        // Initialize UI
        this.init();
    }

    /**
     * Add responsive styles for mobile devices
     */
    addResponsiveStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                #top-right-container {
                    width: 120px !important;
                    transform: scale(0.9);
                    transform-origin: top right;
                }
                #speedometer {
                    transform: none;
                    transform-origin: top right;
                }
                #controls-panel {
                    transform: scale(0.8);
                    transform-origin: top left;
                }
            }
            @media (max-width: 480px) {
                #top-right-container {
                    width: 110px !important;
                    transform: scale(0.85);
                    transform-origin: top right;
                }
                #speedometer {
                    transform: none;
                    transform-origin: top right;
                }
                #controls-panel {
                    transform: scale(0.75);
                    transform-origin: top left;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize UI elements
     */
    init() {
        // Create top right container for UI elements
        const topRightContainer = document.createElement('div');
        topRightContainer.id = 'top-right-container';
        topRightContainer.style.position = 'absolute';
        topRightContainer.style.top = '10px';
        topRightContainer.style.right = '10px';
        topRightContainer.style.display = 'flex';
        topRightContainer.style.flexDirection = 'column';
        topRightContainer.style.alignItems = 'flex-end';
        topRightContainer.style.gap = '10px';
        topRightContainer.style.zIndex = '1000';
        topRightContainer.style.width = '130px';
        topRightContainer.style.transition = 'all 0.3s ease';
        document.body.appendChild(topRightContainer);

        // Core UI elements (always visible)
        this.createSpeedometer();
        this.createControls();
        
        // Create a container for buttons
        this.createButtonContainer();
        
        // Add buttons to the container
        // Camera button removed per request
        // Add music button first
        this.createMusicButton();
        // Then add sound button
        this.createSoundButton();
        // Add vector visualization button
        this.createVectorButton();
        // Add help button
        this.createHelpButton();
        
        // Initialize the race UI
        // No need to initialize here as it's already done in Race.js constructor

        // Add author overlay at the top
        // Use author name from app if available, otherwise use default
        let authorName = '@nicolamanzini';
        if (this.app && this.app.config && this.app.config.authorName) {
            authorName = this.app.config.authorName;
        }
        this.createAuthorOverlay(authorName);

        // Create multiplayer button after author overlay
        this.createMultiplayerButton();

        // Create tutorial overlay
        this.createTutorialOverlay();

        // Create buoy direction indicator
        this.buoyIndicator = new BuoyIndicator(this.race, this.boat);

        // Store references to all elements we'll need to update
        this.cacheElementReferences();

        // Set up keyboard controls
        this.setupKeyboardControls();

        // Initialize vector mode state
        if (window.sail && window.sail.boat) {
            const mode = window.sail.boat.setVectorMode(0);
            this.updateVectorButtonAppearance(mode);
        }

        // Log that UI has been initialized for debugging
        console.log('UI initialized successfully.');
    }
    
    /**
     * Create a container for UI buttons under the speedometer
     */
    createButtonContainer() {
        // Create a container for all buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'button-container';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.zIndex = '1000';
        
        document.getElementById('top-right-container').appendChild(buttonContainer);
    }
    
    /**
     * Create a camera toggle button
     */
    createCameraButton() {
        const buttonContainer = document.getElementById('button-container');
        
        const cameraButton = document.createElement('div');
        cameraButton.id = 'camera-button';
        cameraButton.style.width = '40px';
        cameraButton.style.height = '40px';
        cameraButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        cameraButton.style.color = 'white';
        cameraButton.style.display = 'flex';
        cameraButton.style.alignItems = 'center';
        cameraButton.style.justifyContent = 'center';
        cameraButton.style.cursor = 'pointer';
        cameraButton.style.borderRadius = '8px';
        cameraButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        cameraButton.style.transition = 'all 0.2s ease';
        cameraButton.style.userSelect = 'none';
        cameraButton.style.webkitUserSelect = 'none';
        cameraButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
        cameraButton.title = 'Toggle Camera View (C)';
        
        // Add hover effect
        cameraButton.addEventListener('mouseover', () => {
            cameraButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            cameraButton.style.transform = 'scale(1.05)';
        });
        
        cameraButton.addEventListener('mouseout', () => {
            cameraButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            cameraButton.style.transform = 'scale(1)';
        });
        
        cameraButton.addEventListener('click', () => {
            this.toggleCameraMode();
        });
        
        buttonContainer.appendChild(cameraButton);
        this.elements.cameraButton = cameraButton;
    }

    /**
     * Cache references to UI elements for faster access during updates
     */
    cacheElementReferences() {
        this.elements = {
            windSpeed: document.getElementById('wind-speed'),
            windDirection: document.getElementById('wind-direction'),
            compassDisplay: document.getElementById('compass-display'),
            compassNeedle: document.getElementById('compass-needle'),
            boatSpeed: document.getElementById('boat-speed'),
            boatHeading: document.getElementById('boat-heading'),
            sailAngleDisplay: document.getElementById('sail-angle-display'),
            rudderAngleDisplay: document.getElementById('rudder-angle-display'),
            sailDisplay: document.getElementById('sail-display'),
            sailAngleSlider: document.getElementById('sail-angle-slider'),
            sailAngleValue: document.getElementById('sail-angle-value'),
            rudderAngleSlider: document.getElementById('rudder-angle-slider'),
            rudderAngleValue: document.getElementById('rudder-angle-value'),
            soundButton: document.getElementById('sound-toggle-btn'),
            cameraButton: document.getElementById('camera-button'),
            vectorButton: null,
            vectorModeIndicator: null,
            multiplayerButton: null,
            musicButton: null,
            helpButton: null
        };
    }

    /**
     * Create a vector button that toggles the force vectors visualization
     */
    createVectorButton() {
        const buttonContainer = document.getElementById('button-container');
        
        // Create vector button with arrow logo
        const vectorButton = document.createElement('div');
        vectorButton.id = 'vector-button';
        vectorButton.style.width = '40px';
        vectorButton.style.height = '40px';
        vectorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        vectorButton.style.color = 'white';
        vectorButton.style.display = 'flex';
        vectorButton.style.alignItems = 'center';
        vectorButton.style.justifyContent = 'center';
        vectorButton.style.cursor = 'pointer';
        vectorButton.style.borderRadius = '8px';
        vectorButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        vectorButton.style.transition = 'all 0.2s ease';
        vectorButton.style.userSelect = 'none';
        vectorButton.style.webkitUserSelect = 'none';
        vectorButton.style.position = 'relative';
        
        // Use SVG for the arrow icon
        vectorButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L19 9H15V20H9V9H5L12 2Z"/>
        </svg>`;
        
        // Add small mode indicator
        const modeIndicator = document.createElement('div');
        modeIndicator.id = 'debug-mode-indicator';
        modeIndicator.style.position = 'absolute';
        modeIndicator.style.bottom = '0';
        modeIndicator.style.right = '0';
        modeIndicator.style.width = '12px';
        modeIndicator.style.height = '12px';
        modeIndicator.style.borderRadius = '50%';
        modeIndicator.style.backgroundColor = 'white';
        modeIndicator.style.opacity = '0.4';
        modeIndicator.style.transition = 'all 0.2s ease';
        vectorButton.appendChild(modeIndicator);
        
        vectorButton.title = 'Toggle Vector Visualization Mode';
        
        // Add hover effect
        vectorButton.addEventListener('mouseover', () => {
            vectorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            vectorButton.style.transform = 'scale(1.05)';
        });
        
        vectorButton.addEventListener('mouseout', () => {
            vectorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            vectorButton.style.transform = 'scale(1)';
        });
        
        // Add click event listener to toggle debug mode
        vectorButton.addEventListener('click', () => {
            this.toggleVectorMode();
        });
        
        // Add to button container
        if (buttonContainer) {
            buttonContainer.appendChild(vectorButton);
        } else {
            // Fallback to body if button container doesn't exist
            vectorButton.style.position = 'absolute';
            vectorButton.style.bottom = '80px';
            vectorButton.style.right = '10px';
            document.body.appendChild(vectorButton);
        }
        
        // Save reference
        this.elements.vectorButton = vectorButton;
        this.elements.vectorModeIndicator = modeIndicator;
        
        // Initialize to mode 0 (disabled)
        this.updateVectorButtonAppearance(0);
    }

    /**
     * Toggle vector mode to cycle through vector visualization modes
     */
    toggleVectorMode() {
        // Access the Sail instance and toggle vector mode
        if (window.sail && window.sail.boat) {
            // Cycle through the modes and get the new mode
            const newMode = window.sail.boat.setVectorMode();
            
            // Update button appearance based on new mode
            this.updateVectorButtonAppearance(newMode);
        }
    }
    
    /**
     * Update vector button appearance based on current mode
     * @param {number} mode - Current vector mode (0=none, 1=acceleration, 2=acceleration+sails, 3=all)
     */
    updateVectorButtonAppearance(mode) {
        if (!this.elements.vectorButton || !this.elements.vectorModeIndicator) return;
        
        const svg = this.elements.vectorButton.querySelector('svg');
        const indicator = this.elements.vectorModeIndicator;
        
        // Update appearance based on mode
        switch(mode) {
            case 0: // None
                svg.style.fill = '#ffffff'; // White
                indicator.style.opacity = '0.4';
                indicator.style.backgroundColor = '#ffffff';
                this.elements.vectorButton.title = 'Vector Visualization: Off';
                break;
            case 1: // Acceleration only
                svg.style.fill = '#ff8c00'; // Orange - matches acceleration vector color
                indicator.style.opacity = '0.8';
                indicator.style.backgroundColor = '#ff8c00';
                this.elements.vectorButton.title = 'Vector Visualization: Acceleration Only';
                break;
            case 2: // Acceleration + Sail forces
                svg.style.fill = '#00cc00'; // Green - matches sail force color
                indicator.style.opacity = '0.9';
                indicator.style.backgroundColor = '#00cc00';
                this.elements.vectorButton.title = 'Vector Visualization: Acceleration + Sail Forces';
                break;
            case 3: // All vectors
                svg.style.fill = '#3399ff'; // Blue
                indicator.style.opacity = '1';
                indicator.style.backgroundColor = '#3399ff';
                this.elements.vectorButton.title = 'Vector Visualization: All Vectors';
                break;
        }
    }

    /**
     * Create the vector panel containing all the force vector visualizations
     */
    createVectorPanel() {
        // This method is now empty as the vector panel is removed
    }

    /**
     * Create the main information panel
     */
    createInfoPanel(parentElement) {
        // This method is now empty as all info is in the debug panel
    }

    /**
     * Create the wind direction indicator
     */
    createWindIndicator(parentElement) {
        // This method is now empty as wind info is in the debug panel
    }

    /**
     * Create the controls information panel
     */
    createControlsInfo(parentElement) {
        // This method is now empty as controls info is in the debug panel
    }

    /**
     * Create a speedometer display
     */
    createSpeedometer() {
        this.speedometer = document.createElement('div');
        this.speedometer.id = 'speedometer';
        this.speedometer.style.color = 'white';
        this.speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.speedometer.style.padding = '10px';
        this.speedometer.style.borderRadius = '8px';
        this.speedometer.style.fontSize = '14px';
        this.speedometer.style.width = '100%';
        this.speedometer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        this.speedometer.style.transition = 'all 0.3s ease';
        
        // Update the content of the speedometer
        this.speedometer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <div id="speed-value" style="font-size: 24px; font-weight: bold; text-align: center; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">0.0 knots</div>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <div id="compass-display" style="width: 100px; height: 100px; border-radius: 50%; border: 2px solid white; position: relative; margin: 0 auto;">
                    <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">N</div>
                    <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">S</div>
                    <div style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">W</div>
                    <div style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">E</div>
                    <div id="compass-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 40px; background-color: red; transform-origin: top center;"></div>
                    <div id="wind-direction-needle" style="position: absolute; top: 50%; left: 50%; width: 2px; height: 30px; background-color: #3399ff; transform-origin: top center; opacity: 0.8;"></div>
                </div>
            </div>
            <div style="font-size: 10px; display: flex; justify-content: center; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
                <span style="color: red; margin-right: 10px;">■ Boat</span>
                <span style="color: #3399ff;">■ Wind</span>
            </div>
        `;

        document.getElementById('top-right-container').appendChild(this.speedometer);
    }

    /**
     * Create the multiplayer connection button
     */
    createMultiplayerButton() {
        const buttonContainer = document.getElementById('button-container');
        
        const multiplayerButton = document.createElement('div');
        multiplayerButton.id = 'multiplayer-button';
        multiplayerButton.style.width = '40px';
        multiplayerButton.style.height = '40px';
        multiplayerButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        multiplayerButton.style.color = 'white';
        multiplayerButton.style.display = 'flex';
        multiplayerButton.style.alignItems = 'center';
        multiplayerButton.style.justifyContent = 'center';
        multiplayerButton.style.cursor = 'pointer';
        multiplayerButton.style.borderRadius = '8px';
        multiplayerButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        multiplayerButton.style.transition = 'all 0.2s ease';
        multiplayerButton.style.userSelect = 'none';
        multiplayerButton.style.webkitUserSelect = 'none';
        
        // Use SVG icon for multiplayer
        multiplayerButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>`;
        
        // Set initial state
        multiplayerButton.title = 'Multiplayer: Connecting...';
        multiplayerButton.style.backgroundColor = '#FFA500'; // Orange while connecting
        
        // Add hover effect
        multiplayerButton.addEventListener('mouseover', () => {
            multiplayerButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            multiplayerButton.style.transform = 'scale(1.05)';
        });
        
        multiplayerButton.addEventListener('mouseout', () => {
            const isConnected = this.app.multiplayer && this.app.multiplayer.isConnected();
            if (isConnected) {
                multiplayerButton.style.backgroundColor = '#4CAF50'; // Green when connected
            } else {
                multiplayerButton.style.backgroundColor = '#f44336'; // Red when disconnected
            }
            multiplayerButton.style.transform = 'scale(1)';
        });
        
        // Add click handler
        multiplayerButton.addEventListener('click', () => {
            if (this.app.multiplayer) {
                if (this.app.multiplayer.isConnected()) {
                    // Disconnect
                    this.app.multiplayer.disconnect();
                    multiplayerButton.title = 'Connect to Multiplayer';
                    multiplayerButton.style.backgroundColor = '#4CAF50'; // Green for "can connect"
                } else {
                    // Connect
                    this.app.multiplayer.connect(this.app.serverUrl);
                    multiplayerButton.title = 'Multiplayer: Connecting...';
                    multiplayerButton.style.backgroundColor = '#FFA500'; // Orange while connecting
                }
            }
        });
        
        // Add to button container
        buttonContainer.appendChild(multiplayerButton);
        
        // Store reference
        this.elements.multiplayerButton = multiplayerButton;
        
        // Setup interval to update connection status
        setInterval(() => {
            if (this.app.multiplayer) {
                const connected = this.app.multiplayer.isConnected();
                if (connected) {
                    multiplayerButton.title = 'Multiplayer: Connected';
                    multiplayerButton.style.backgroundColor = '#4CAF50'; // Green when connected
                } else {
                    multiplayerButton.title = 'Multiplayer: Disconnected';
                    multiplayerButton.style.backgroundColor = '#f44336'; // Red when disconnected
                }
            }
        }, 1000); // Check every second
    }

    /**
     * Create combined controls panel (sail and rudder)
     */
    createControls() {
        // Since we're removing the controls panel, this method can be empty
        // All controls are now handled via keyboard
    }

    /**
     * Add event listeners for sail and rudder controls
     */
    addControlEventListeners() {
        // Since we removed the UI controls, we only need keyboard controls
        // This method can be empty as keyboard controls are handled in setupKeyboardControls
    }

    /**
     * Reset sail angle to 0
     */
    resetSail() {
        this.boat.setSailAngle(0);
    }

    /**
     * Reset rudder angle to 0
     */
    resetRudder() {
        this.boat.setRudderAngle(0, false);
    }

    /**
     * Set up keyboard controls
     */
    setupKeyboardControls() {
        let animationFrameId = null;
        let lastTime = 0;
        
        // Handle keyboard input using KeyboardManager
        keyboardManager.addListener((keys) => {
            // Handle vector mode toggle
            if (keys.v) {
                // Toggle the vector mode, but only call once per press
                if (!this.lastVKeyState) {
                    this.toggleVectorMode();
                }
                this.lastVKeyState = true;
            } else {
                this.lastVKeyState = false;
            }
            
            // Handle camera mode toggle (now handled in CameraController)
            
            // If animation not running, start it for movement keys
            if (!animationFrameId && (keys.w || keys.a || keys.s || keys.d || 
                                     keys.arrowup || keys.arrowdown || 
                                     keys.arrowleft || keys.arrowright)) {
                lastTime = performance.now();
                animationFrameId = requestAnimationFrame(updateControls);
            }
        });
        
        // Store last key states to handle toggles
        this.lastVKeyState = false;
        
        const updateControls = (currentTime) => {
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            
            // Get keys from KeyboardManager
            const keys = keyboardManager.getKeys();
            
            // Process keyboard input for boat control
            this.boat.processKeyboardInput(keys, deltaTime);
            
            // Continue animation if any relevant keys are pressed
            const hasActiveKeys = Object.values(keys).some(value => value);
            if (hasActiveKeys) {
                animationFrameId = requestAnimationFrame(updateControls);
            } else {
                animationFrameId = null;
            }
        };
    }

    /**
     * Create floating controls info panel
     */
    createFloatingControlsInfo() {
        // Empty method - controls info is now in debug panel
    }

    /**
     * Create a more prominent button for wind controls
     */
    createWindControlsButton() {
        // This method is now empty as the wind controls button is removed
    }

    /**
     * Create a standalone wind controls panel that appears outside the debug panel
     */
    createStandaloneWindControls() {
        // This method is now empty as the standalone wind controls panel is removed
    }

    /**
     * Create a controls panel (if needed)
     */
    createControlsPanel() {
        // This method has been moved to RaceUIManager
        // Controls panel is now created there
    }

    /**
     * Initialize the race
     */
    initializeRace() {
        if (!this.race) return;
        
        // Set the UI manager reference
        this.race.uiManager.setRace(this.race);
        
        // Initialize the UI manager
        this.race.uiManager.initialize();
    }

    /**
     * Update the UI elements
     */
    update() {
        // Update wind direction display
        const windDirection = this.world.getWindDirection();
        const windAngle = Math.atan2(windDirection.x, windDirection.z) * 180 / Math.PI;

        // Update wind direction needle in compass - get element directly
        const windDirectionNeedle = document.getElementById('wind-direction-needle');
        if (windDirectionNeedle) {
            // Reverse the angle to make compass turn in the opposite direction
            windDirectionNeedle.style.transform = `rotate(${-windAngle}deg)`;
        }

        // Update compass
        const heading = this.boat.getHeadingInDegrees();

        // Get compass needle directly
        const compassNeedle = document.getElementById('compass-needle');
        if (compassNeedle) {
            compassNeedle.style.transform = `rotate(${-heading}deg)`;
        }

        // Update speedometer - directly update the speed value element
        const speedValue = document.getElementById('speed-value');
        if (speedValue) {
            speedValue.textContent = `${this.boat.getSpeedInKnots().toFixed(1)} knots`;
        }

        // Update race if active
        if (this.race && this.race.isActive) {
            this.race.update(1/60); // Assuming 60fps
            
            // Update buoy direction indicator
            if (this.buoyIndicator) {
                this.buoyIndicator.update();
            }
        } else {
            // Hide the buoy indicator when not in a race
            if (this.buoyIndicator) {
                this.buoyIndicator.hide();
            }
        }
    }

    /**
     * Create a feedback button for feature requests and bug reports
     */
    createFeedbackButton() {
        // Feedback button will be added in future updates
    }
    
    /**
     * Show feedback modal for user to input their feature request or bug report
     * This method is now deprecated as we're directly opening Twitter
     */
    showFeedbackModal() {
        // Method no longer needed - removed
    }

    /**
     * Create sound toggle button
     */
    createSoundButton() {
        const buttonContainer = document.getElementById('button-container');
        
        const soundButton = document.createElement('div');
        soundButton.id = 'sound-toggle-btn';
        soundButton.style.width = '40px';
        soundButton.style.height = '40px';
        soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        soundButton.style.color = 'white';
        soundButton.style.display = 'flex';
        soundButton.style.alignItems = 'center';
        soundButton.style.justifyContent = 'center';
        soundButton.style.cursor = 'pointer';
        soundButton.style.borderRadius = '8px';
        soundButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        soundButton.style.transition = 'all 0.2s ease';
        soundButton.style.userSelect = 'none';
        soundButton.style.webkitUserSelect = 'none';
        soundButton.style.opacity = '0.5'; // Start with low opacity until audio is initialized
        
        // Use SVG icon instead of emoji
        soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>`;
        
        soundButton.title = 'Toggle Sound (Click anywhere first to activate audio)';
        
        // Add hover effect
        soundButton.addEventListener('mouseover', () => {
            soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            soundButton.style.transform = 'scale(1.05)';
        });
        
        soundButton.addEventListener('mouseout', () => {
            soundButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            soundButton.style.transform = 'scale(1)';
        });
        
        // Track sound state
        let soundEnabled = true;
        
        // Add event listener
        soundButton.addEventListener('click', () => {
            if (this.app.audio && this.app.audio.initialized) {
                soundEnabled = !soundEnabled;
                
                // Toggle both sounds together
                this.app.audio.toggleWindSound(soundEnabled);
                this.app.audio.toggleSeaSound(soundEnabled);
                
                // Update button icon based on sound state
                if (soundEnabled) {
                    soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>`;
                } else {
                    soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>`;
                }
            } else {
                // If audio not initialized, try to initialize it
                const initEvent = new Event('click');
                document.dispatchEvent(initEvent);
            }
        });
        
        buttonContainer.appendChild(soundButton);
        this.elements.soundButton = soundButton;
    }
    
    /**
     * Update sound button state based on audio initialization status
     * @param {boolean} initialized - Whether audio was successfully initialized
     */
    updateSoundButtonState(initialized) {
        if (this.elements.soundButton) {
            if (initialized) {
                this.elements.soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>`;
                this.elements.soundButton.style.opacity = '1';
                
                // Keep music button at opacity 1
                if (this.elements.musicButton) {
                    this.elements.musicButton.style.opacity = '1';
                }
            } else {
                this.elements.soundButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>`;
                // Keep the sound button at opacity 1 even if audio isn't initialized
                this.elements.soundButton.style.opacity = '1';
                
                // Keep music button at opacity 1 even when audio isn't initialized
                if (this.elements.musicButton) {
                    this.elements.musicButton.style.opacity = '1';
                }
            }
        }
    }

    /**
     * Toggle camera mode between 'orbit' and 'firstPerson'
     */
    toggleCameraMode() {
        if (window.sail && typeof window.sail.toggleCameraMode === 'function') {
            window.sail.toggleCameraMode();
            // Update the button appearance to indicate current mode
            if (window.sail.getCameraMode() === 'firstPerson') {
                this.elements.cameraButton.querySelector('svg').style.fill = '#3399ff';
            } else {
                this.elements.cameraButton.querySelector('svg').style.fill = 'white';
            }
        } else {
            console.error('Simulator or toggleCameraMode function not available');
        }
    }

    /**
     * Creates an overlay with the author's name and X.com link
     * @param {string} authorName - The author's name/handle to display (default: @nicolamanzini)
     */
    createAuthorOverlay(authorName = '@nicolamanzini') {
        const buttonContainer = document.getElementById('button-container');
        
        const authorOverlay = document.createElement('div');
        authorOverlay.id = 'author-overlay';
        authorOverlay.style.width = '40px';
        authorOverlay.style.height = '40px';
        authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        authorOverlay.style.color = 'white';
        authorOverlay.style.display = 'flex';
        authorOverlay.style.alignItems = 'center';
        authorOverlay.style.justifyContent = 'center';
        authorOverlay.style.cursor = 'pointer';
        authorOverlay.style.borderRadius = '8px';
        authorOverlay.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        authorOverlay.style.transition = 'all 0.2s ease';
        authorOverlay.style.userSelect = 'none';
        authorOverlay.style.webkitUserSelect = 'none';
        
        // Generate Twitter/X URL from the author name
        const authorHandle = authorName.startsWith('@') ? authorName.substring(1) : authorName;
        const authorUrl = `https://x.com/${authorHandle}`;
        
        // Create X.com logo SVG
        authorOverlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>`;
        
        // Add hover effect
        authorOverlay.addEventListener('mouseover', () => {
            authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            authorOverlay.style.transform = 'scale(1.05)';
        });
        
        authorOverlay.addEventListener('mouseout', () => {
            authorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            authorOverlay.style.transform = 'scale(1)';
        });
        
        // Add click handler
        authorOverlay.addEventListener('click', () => {
            window.open(authorUrl, '_blank', 'noopener,noreferrer');
        });
        
        // Add to button container
        buttonContainer.appendChild(authorOverlay);
    }

    /**
     * Create a tutorial overlay that explains sailing controls
     */
    createTutorialOverlay() {
        const tutorial = document.createElement('div');
        tutorial.id = 'tutorial-overlay';
        tutorial.style.position = 'fixed';
        tutorial.style.top = '0';
        tutorial.style.left = '0';
        tutorial.style.width = '100%';
        tutorial.style.height = '100%';
        tutorial.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        tutorial.style.display = 'flex';
        tutorial.style.flexDirection = 'column';
        tutorial.style.alignItems = 'center';
        tutorial.style.justifyContent = 'center';
        tutorial.style.zIndex = '2000';
        tutorial.style.cursor = 'pointer';
        tutorial.style.color = 'white';
        tutorial.style.fontFamily = 'Arial, sans-serif';
        tutorial.style.padding = '0';
        tutorial.style.textAlign = 'center';
        tutorial.style.overflow = 'hidden';

        // Create content container with responsive width and height
        const content = document.createElement('div');
        content.style.maxWidth = '600px';
        content.style.width = '90%';
        content.style.height = '90vh';
        content.style.margin = '0';
        content.style.padding = '2vh 20px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.alignItems = 'center';
        content.style.justifyContent = 'center';
        content.style.gap = 'clamp(8px, 2vh, 20px)';

        // Add title with responsive font size
        const title = document.createElement('h1');
        title.textContent = 'Welcome to Vibe Sail!';
        title.style.marginBottom = 'clamp(10px, 2vh, 30px)';
        title.style.color = '#3399ff';
        title.style.fontSize = 'clamp(18px, 4vh, 32px)';
        content.appendChild(title);

        // Detect if user is on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Add sections based on platform
        const sections = [
            {
                title: isMobile ? 'Touch Controls' : 'Keyboard Controls',
                content: isMobile ? `
                    <p style="margin: 0.5vh 0;">• Left joystick: Turn rudder left/right</p>
                    <p style="margin: 0.5vh 0;">• Right joystick: Pull in/push out sail</p>
                ` : `
                    <p style="margin: 0.5vh 0;">• A/D or ←/→ : Turn rudder left/right</p>
                    <p style="margin: 0.5vh 0;">• W/S or ↑/↓ : Adjust sail angle</p>
                `
            },
            {
                title: 'Camera Control',
                content: isMobile ? `
                    <p style="margin: 0.5vh 0;">• Drag to rotate camera view</p>
                    <p style="margin: 0.5vh 0;">• Pinch in/out to zoom</p>
                ` : `
                    <p style="margin: 0.5vh 0;">• Click and drag to rotate camera view</p>
                    <p style="margin: 0.5vh 0;">• Scroll to zoom in/out</p>
                `
            },
            {
                title: 'Time Challenge',
                content: `
                    <p style="margin: 0.5vh 0;">• Click the "Start Challenge" button in the top left</p>
                    <p style="margin: 0.5vh 0;">• Sail through the checkpoints as fast as possible</p>
                    <p style="margin: 0.5vh 0;">• Press ESC or click "Stop Challenge" to cancel</p>
                `
            },
            {
                title: 'Sailing Tips',
                content: `
                    <p style="margin: 0.5vh 0;">• Keep the sail at an angle to the wind</p>
                    <p style="margin: 0.5vh 0;">• Use the rudder to maintain course</p>
                    <p style="margin: 0.5vh 0;">• Watch the wind direction indicator (blue arrow)</p>
                    <p style="margin: 0.5vh 0;">• Try different sail angles to find the best speed</p>
                `
            }
        ];

        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.style.marginBottom = 'clamp(8px, 2vh, 25px)';
            sectionDiv.style.width = '100%';
            sectionDiv.style.maxWidth = '400px';
            
            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = section.title;
            sectionTitle.style.marginBottom = 'clamp(4px, 1vh, 10px)';
            sectionTitle.style.color = '#a5d8ff';
            sectionTitle.style.fontSize = 'clamp(14px, 3vh, 24px)';
            
            const sectionContent = document.createElement('div');
            sectionContent.innerHTML = section.content;
            sectionContent.style.lineHeight = '1.3';
            sectionContent.style.fontSize = 'clamp(12px, 2vh, 16px)';
            
            sectionDiv.appendChild(sectionTitle);
            sectionDiv.appendChild(sectionContent);
            content.appendChild(sectionDiv);
        });

        // Add advertise link
        const advertiseLink = document.createElement('a');
        advertiseLink.href = 'https://vibesail.com/advertise.html';
        advertiseLink.textContent = 'Advertise with us';
        advertiseLink.target = '_blank';
        advertiseLink.rel = 'noopener noreferrer';
        advertiseLink.style.color = '#3399ff';
        advertiseLink.style.textDecoration = 'underline';
        advertiseLink.style.marginTop = 'clamp(6px, 1.5vh, 15px)';
        advertiseLink.style.fontSize = 'clamp(12px, 1.8vh, 16px)';
        advertiseLink.style.cursor = 'pointer';
        
        // Stop propagation to prevent closing the tutorial when clicking the link
        advertiseLink.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        content.appendChild(advertiseLink);

        // Add tap to dismiss message with responsive styling
        const dismissMessage = document.createElement('div');
        dismissMessage.textContent = 'Tap anywhere to start sailing';
        dismissMessage.style.marginTop = 'clamp(8px, 2vh, 20px)';
        dismissMessage.style.color = '#a5d8ff';
        dismissMessage.style.fontStyle = 'italic';
        dismissMessage.style.fontSize = 'clamp(12px, 2vh, 16px)';
        content.appendChild(dismissMessage);

        tutorial.appendChild(content);

        // Add responsive styles
        const style = document.createElement('style');
        style.textContent = `
            @media (max-aspect-ratio: 1/1) {
                #tutorial-overlay > div {
                    width: 95%;
                    padding: 2vh 10px;
                }
                #tutorial-overlay h1 {
                    font-size: clamp(16px, 3vh, 28px);
                    margin-bottom: clamp(8px, 1.5vh, 20px);
                }
                #tutorial-overlay h2 {
                    font-size: clamp(14px, 2.5vh, 22px);
                }
                #tutorial-overlay p {
                    font-size: clamp(11px, 1.8vh, 15px);
                    margin: 0.3vh 0;
                }
            }
            @media (max-height: 600px) {
                #tutorial-overlay > div {
                    gap: clamp(4px, 1vh, 10px);
                }
                #tutorial-overlay > div > div {
                    margin-bottom: clamp(4px, 1vh, 12px);
                }
                #tutorial-overlay h1 {
                    margin-bottom: clamp(6px, 1vh, 15px);
                }
                #tutorial-overlay h2 {
                    margin-bottom: clamp(2px, 0.5vh, 6px);
                }
            }
            @media (max-height: 400px) {
                #tutorial-overlay > div {
                    padding: 1vh 10px;
                }
                #tutorial-overlay h1 {
                    font-size: clamp(14px, 2.5vh, 24px);
                }
                #tutorial-overlay h2 {
                    font-size: clamp(12px, 2vh, 18px);
                }
                #tutorial-overlay p {
                    font-size: clamp(10px, 1.5vh, 14px);
                    margin: 0.2vh 0;
                }
            }
        `;
        document.head.appendChild(style);

        // Add click handler to dismiss
        tutorial.addEventListener('click', () => {
            tutorial.style.opacity = '0';
            tutorial.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => {
                tutorial.remove();
            }, 300);
        });

        document.body.appendChild(tutorial);
    }

    /**
     * Create music toggle button
     */
    createMusicButton() {
        const buttonContainer = document.getElementById('button-container');
        
        const musicButton = document.createElement('div');
        musicButton.id = 'music-toggle-btn';
        musicButton.style.width = '40px';
        musicButton.style.height = '40px';
        musicButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        musicButton.style.color = 'white';
        musicButton.style.display = 'flex';
        musicButton.style.alignItems = 'center';
        musicButton.style.justifyContent = 'center';
        musicButton.style.cursor = 'pointer';
        musicButton.style.borderRadius = '8px';
        musicButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        musicButton.style.transition = 'all 0.2s ease';
        musicButton.style.userSelect = 'none';
        musicButton.style.webkitUserSelect = 'none';
        
        // Set the initial opacity to 1 regardless of audio initialization
        musicButton.style.opacity = '1';
        
        // Use SVG icon for music note
        musicButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>`;
        
        musicButton.title = 'Toggle Background Music';
        
        // Add hover effect
        musicButton.addEventListener('mouseover', () => {
            musicButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            musicButton.style.transform = 'scale(1.05)';
        });
        
        musicButton.addEventListener('mouseout', () => {
            musicButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            musicButton.style.transform = 'scale(1)';
        });
        
        // Track music state
        let musicEnabled = true;
        
        // Add event listener
        musicButton.addEventListener('click', () => {
            if (this.app.audio && this.app.audio.initialized) {
                musicEnabled = !musicEnabled;
                
                // Toggle background music and get the actual playing state
                const isPlaying = this.app.audio.toggleBackgroundMusic(musicEnabled);
                
                // Update button appearance based on actual playing state
                if (isPlaying) {
                    musicButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>`;
                    musicButton.style.opacity = '1';
                } else {
                    // Update our tracking variable to match actual state
                    musicEnabled = false;
                    // Use the music note with a diagonal line through it
                    musicButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        <path d="M4.27 3L3 4.27 19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>`;
                    musicButton.style.opacity = '1';
                }
            } else {
                // If audio not initialized, try to initialize it
                const initEvent = new Event('click');
                document.dispatchEvent(initEvent);
            }
        });
        
        buttonContainer.appendChild(musicButton);
        this.elements.musicButton = musicButton;
    }

    /**
     * Create help button that shows the tutorial overlay
     */
    createHelpButton() {
        const buttonContainer = document.getElementById('button-container');
        
        const helpButton = document.createElement('div');
        helpButton.id = 'help-button';
        helpButton.style.width = '40px';
        helpButton.style.height = '40px';
        helpButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        helpButton.style.color = 'white';
        helpButton.style.display = 'flex';
        helpButton.style.alignItems = 'center';
        helpButton.style.justifyContent = 'center';
        helpButton.style.cursor = 'pointer';
        helpButton.style.borderRadius = '8px';
        helpButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        helpButton.style.transition = 'all 0.2s ease';
        helpButton.style.userSelect = 'none';
        helpButton.style.webkitUserSelect = 'none';
        
        // Use SVG icon for help
        helpButton.innerHTML = `<span style="font-size: 20px; font-weight: bold;">?</span>`;
        
        helpButton.title = 'Show Tutorial';
        
        // Add hover effect
        helpButton.addEventListener('mouseover', () => {
            helpButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            helpButton.style.transform = 'scale(1.05)';
        });
        
        helpButton.addEventListener('mouseout', () => {
            helpButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            helpButton.style.transform = 'scale(1)';
        });
        
        // Add click handler to show tutorial
        helpButton.addEventListener('click', () => {
            this.createTutorialOverlay();
        });
        
        buttonContainer.appendChild(helpButton);
        this.elements.helpButton = helpButton;
    }

    /**
     * Stop the race
     */
    stopRace() {
        if (this.race) {
            this.race.stop();
        }
    }

    /**
     * Show the challenge information modal
     */
    showChallengeInfo() {
        if (!this.race || !this.race.uiManager) return;
        
        this.race.uiManager.showChallengeInfo();
    }
}

export default UI;