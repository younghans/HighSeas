import * as THREE from 'three';

class InputManager {
    constructor(params) {
        // Dependencies
        this.sceneManager = params.sceneManager;
        this.gameCore = params.gameCore; // Reference to access game state
        
        // Input state
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.inputMode = 'menu'; // 'menu' or 'gameplay'
        
        // Bind methods to maintain context
        this.onMouseClick = this.onMouseClick.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }
    
    // Initialize input handling
    initialize() {
        this.setInputMode('menu');
        return this;
    }
    
    // Set up event listeners based on current mode
    setupEventListeners() {
        // Remove existing listeners first
        this.removeEventListeners();
        
        // Add appropriate listeners
        if (this.inputMode === 'gameplay') {
            this.sceneManager.addClickEventListener(this.onMouseClick);
            window.addEventListener('mousemove', this.onMouseMove);
            window.addEventListener('keydown', this.onKeyDown);
        } else {
            // Menu mode doesn't need click handling for game interactions
            // UI clicks are handled by DOM event listeners
        }
    }
    
    // Remove all event listeners
    removeEventListeners() {
        this.sceneManager.removeClickEventListener(this.onMouseClick);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('keydown', this.onKeyDown);
    }
    
    // Set input mode and update control scheme
    setInputMode(mode) {
        this.inputMode = mode;
        
        if (mode === 'menu') {
            this.setupMenuControls();
        } else if (mode === 'gameplay') {
            this.setupGameplayControls();
        }
        
        // Update event listeners
        this.setupEventListeners();
    }
    
    // Setup controls for the main menu (cinematic camera)
    setupMenuControls() {
        // First clean up any existing controls
        this.sceneManager.disposeControls();
        
        // Setup menu controls
        this.sceneManager.setupMenuControls();
    }
    
    // Setup controls for gameplay (ship following)
    setupGameplayControls() {
        // First clean up any existing controls
        this.sceneManager.disposeControls();
        
        // Setup gameplay controls with ship as target
        const ship = this.gameCore.ship;
        if (ship) {
            this.sceneManager.setupGameplayControls(ship);
        }
        
        // Left-click to move ship or interact with islands
        this.sceneManager.addClickEventListener(this.onMouseClick);
    }
    
    // Track mouse movement for hover effects
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Could implement hover detection here
    }
    
    // Handle key presses
    onKeyDown(event) {
        // Space bar for firing cannons - REMOVED since CombatManager already handles this
        // This prevents duplicate notifications when firing in safe zones
        
        // Could implement other keyboard shortcuts
    }
    
    // Handle mouse clicks in gameplay mode
    onMouseClick(event) {
        // Only handle left clicks
        if (event.button !== 0) return;
        
        // If game hasn't started, ignore clicks
        if (!this.gameCore.gameStarted) return;
        
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Set up raycaster
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
        
        // Delegate to specialized handlers in order of priority
        if (this.handleCombatClick()) return;
        if (this.handleShipwreckClick()) return;
        if (this.handleBuildModeClick()) return;
        if (this.handleIslandClick()) return;
        
        // If nothing was clicked, handle as water click for ship movement
        this.handleWaterClick();
    }
    
    // Check if player clicked on an enemy ship
    handleCombatClick() {
        if (!this.gameCore.enemyShipManager || !this.gameCore.combatManager) return false;
        
        const enemyShips = this.gameCore.enemyShipManager.getEnemyShips();
        const shipObjects = enemyShips.map(ship => ship.getObject()).filter(obj => obj !== null);
        
        // Check for intersections with enemy ships
        const shipIntersects = this.raycaster.intersectObjects(shipObjects, true);
        
        if (shipIntersects.length > 0) {
            // An enemy ship was clicked, let combat manager handle it
            return true; // Combat manager will handle this via its own click handler
        }
        
        return false;
    }
    
    // Check if player clicked on a shipwreck
    handleShipwreckClick() {
        if (!this.gameCore.enemyShipManager || !this.gameCore.ship) return false;
        
        const playerPosition = this.gameCore.ship.getPosition();
        
        // Get all shipwrecks
        const shipwrecks = this.gameCore.enemyShipManager.getShipwrecks();
        const shipwreckObjects = shipwrecks
            .filter(wreck => !wreck.looted && wreck.ship)
            .map(wreck => wreck.ship.getObject())
            .filter(obj => obj !== null);
        
        // Check for intersections with shipwrecks
        const shipwreckIntersects = this.raycaster.intersectObjects(shipwreckObjects, true);
        
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
                
                if (distance <= this.gameCore.enemyShipManager.lootableRange) {
                    // Get immediate reference to loot for optimistic UI update
                    const immediateLocalLoot = clickedShipwreck.loot || { gold: 0, items: [] };
                    
                    // Show loot notification immediately - don't wait for promise
                    if (this.gameCore.gameUI) {
                        // Show a more prominent notification with gold amount immediately
                        this.gameCore.gameUI.showNotification(`TREASURE FOUND! +${immediateLocalLoot.gold} gold`, 5000, 'success');
                        console.log('Looting shipwreck:', immediateLocalLoot);
                    }
                    
                    // Shipwreck is in range, loot it (now async)
                    this.gameCore.enemyShipManager.lootShipwreck(clickedShipwreck)
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
                            if (this.gameCore.gameUI) {
                                this.gameCore.gameUI.showNotification(`Failed to loot: ${error.message}`, 3000, 'error');
                            }
                            console.error('Error looting shipwreck:', error);
                        });
                    
                    return true; // Click was handled
                } else {
                    // Shipwreck is out of range, show notification
                    if (this.gameCore.gameUI) {
                        // Show a more prominent notification for out of range
                        this.gameCore.gameUI.showNotification("Get closer to loot this shipwreck!", 3000, 'warning');
                        console.log('Shipwreck too far to loot. Distance:', distance, 'Range:', this.gameCore.enemyShipManager.lootableRange);
                    }
                    
                    return true; // Click was handled but no action taken
                }
            }
        }
        
        return false;
    }
    
    // Check if player is in build mode and clicked to place/select buildings
    handleBuildModeClick() {
        if (this.gameCore.buildingManager && this.gameCore.buildingManager.handleClick(this.raycaster)) {
            return true; // Click was handled by build mode
        }
        return false;
    }
    
    // Check if player clicked on an island
    handleIslandClick() {
        if (!this.gameCore.islandGenerator || !this.gameCore.islandManager) return false;
        
        const islands = this.gameCore.islandGenerator.getIslands();
        const islandIntersects = this.raycaster.intersectObjects(islands);
        
        if (islandIntersects.length > 0) {
            // An island was clicked
            const intersection = islandIntersects[0];
            const clickedIsland = intersection.object;
            
            // Get the exact point of intersection in world coordinates
            const intersectionPoint = intersection.point;
            
            // Handle island click
            this.gameCore.islandManager.handleIslandClick(clickedIsland, intersectionPoint, this.raycaster);
            return true;
        }
        
        return false;
    }
    
    // Handle clicks on water (ship movement)
    handleWaterClick() {
        if (this.gameCore.islandManager) {
            this.gameCore.islandManager.handleWaterClick(this.raycaster);
            return true;
        }
        return false;
    }
    
    // Clean up resources
    dispose() {
        this.removeEventListeners();
    }
}

export default InputManager; 