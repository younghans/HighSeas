import * as THREE from 'three';
import MarketStall from './objects/market-stall.js';
import Dock from './objects/dock.js';
import GenericGLBModel from './objects/GenericGLBModel.js';
import { MODELS, getModelDisplayName } from './ModelRegistry.js';

/**
 * BuildingManager handles all building-related functionality
 * This is a standalone module that can be used in different game modes
 */
class BuildingManager {
    /**
     * Create a new BuildingManager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Required dependencies
        this.scene = options.scene;
        this.camera = options.camera;
        this.islandGenerator = options.islandGenerator;
        this.world = options.world;
        
        // Optional dependencies
        this.uiContainer = options.uiContainer || null; // DOM element for UI
        
        // Callbacks for external systems
        this.onBuildModeEnter = options.onBuildModeEnter || null;
        this.onBuildModeExit = options.onBuildModeExit || null;
        this.onBuildingTypeSelected = options.onBuildingTypeSelected || null;
        this.onBuildingPlaced = options.onBuildingPlaced || null;
        this.onInfoUpdate = options.onInfoUpdate || null;
        
        // Building mode state
        this.buildMode = false;
        this.buildObject = null;
        this.buildPreview = null;
        this.currentBuildingType = null;
        this.WATER_LEVEL_THRESHOLD = 0; // Y-value above which we consider the island to be "above water"
        this.buildContext = null; // Stores context information (like which island we're building on)
        
        // Raycaster for build mode
        this.buildRaycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }
    
    /**
     * Initialize event listeners
     * @returns {BuildingManager} - Returns this for method chaining
     */
    init() {
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('keydown', this.onKeyDown);
        return this;
    }
    
    /**
     * Enter build mode
     * @param {Object} options - Options for build mode
     * @returns {BuildingManager} - Returns this for method chaining
     */
    enterBuildMode(options = {}) {
        // Set build mode flag
        this.buildMode = true;
        
        // Store context information (like which island we're building on)
        this.buildContext = options.context || null;
        
        // Update info display via callback
        if (this.onInfoUpdate) {
            this.onInfoUpdate({
                title: 'Build Mode',
                message: 'Choose building type'
            });
        }
        
        // If we have a UI container, update it
        if (this.uiContainer) {
            this.showBuildingSelectionUI();
        }
        
        // Notify external systems
        if (this.onBuildModeEnter) {
            this.onBuildModeEnter();
        }
        
        return this;
    }
    
    /**
     * Show building selection UI
     */
    showBuildingSelectionUI() {
        if (!this.uiContainer) return;
        
        // Build buttons HTML from model registry
        let buttonsHTML = '';
        Object.values(MODELS).forEach(model => {
            buttonsHTML += `<button id="${model.id}Button">${model.name}</button>\n`;
        });
        
        this.uiContainer.innerHTML = `
            <h2>Building Mode</h2>
            <p>Select a building to place:</p>
            ${buttonsHTML}
            <button id="exitBuildModeButton">Exit Build Mode</button>
        `;
        
        // Add event listeners to buttons
        Object.values(MODELS).forEach(model => {
            document.getElementById(`${model.id}Button`).addEventListener('click', () => {
                this.selectBuildingType(model.id);
            });
        });
        
        document.getElementById('exitBuildModeButton').addEventListener('click', () => {
            this.exitBuildMode();
        });
        
        // Show the UI container
        this.uiContainer.style.display = 'block';
    }
    
    /**
     * Select a building type
     * @param {string} buildingType - Type of building to select
     */
    selectBuildingType(buildingType) {
        // Store the selected building type
        this.currentBuildingType = buildingType;
        
        // Remove any existing preview
        if (this.buildPreview) {
            this.scene.remove(this.buildPreview);
            this.buildPreview = null;
        }
        
        // Get model info from registry
        const modelInfo = MODELS[buildingType];
        
        // Create the build preview based on the building type
        if (buildingType === 'marketStall') {
            // Create a market stall with 50% opacity (custom model)
            this.buildObject = new MarketStall({
                position: new THREE.Vector3(0, 0, 0),
                detailLevel: 0.8
            });
            
            this.buildPreview = this.buildObject.getObject();
        } else if (buildingType === 'dock') {
            // Create a dock with 50% opacity (custom model)
            this.buildObject = new Dock({
                position: new THREE.Vector3(0, 0, 0)
            });
            
            this.buildPreview = this.buildObject.getObject();
        } else if (modelInfo && !modelInfo.isCustom) {
            // Create a generic GLB model
            this.buildObject = new GenericGLBModel({
                position: new THREE.Vector3(0, 0, 0),
                modelPath: modelInfo.path,
                scale: modelInfo.scale || 1,
                type: buildingType
            });
            
            this.buildPreview = this.buildObject.getObject();
        }
        
        // Make the preview semi-transparent
        if (this.buildPreview) {
            this.buildPreview.traverse(child => {
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
            this.scene.add(this.buildPreview);
            
            // Update info display via callback
            if (this.onInfoUpdate) {
                this.onInfoUpdate({
                    title: `Build: ${getModelDisplayName(buildingType)}`,
                    message: 'Left-click: Place\nR: Rotate\nClick away: Cancel'
                });
            }
            
            // Update UI if we have a container
            if (this.uiContainer) {
                this.showBuildingPlacementUI(buildingType);
            }
            
            // Notify external systems
            if (this.onBuildingTypeSelected) {
                this.onBuildingTypeSelected(buildingType);
            }
        }
    }
    
    /**
     * Show building placement UI
     * @param {string} buildingType - Type of building being placed
     */
    showBuildingPlacementUI(buildingType) {
        if (!this.uiContainer) return;
        
        const buildingName = getModelDisplayName(buildingType);
        
        this.uiContainer.innerHTML = `
            <h2>Place ${buildingName}</h2>
            <p>Position the building and click to place it</p>
            <button id="rotateButton">Rotate (R)</button>
            <button id="cancelPlacementButton">Cancel Placement</button>
            <button id="exitBuildModeButton">Exit Build Mode</button>
        `;
        
        // Add event listeners
        document.getElementById('rotateButton').addEventListener('click', () => {
            this.rotateBuildPreview();
        });
        
        document.getElementById('cancelPlacementButton').addEventListener('click', () => {
            // Remove the preview and go back to building selection
            if (this.buildPreview) {
                this.scene.remove(this.buildPreview);
                this.buildPreview = null;
            }
            this.showBuildingSelectionUI();
        });
        
        document.getElementById('exitBuildModeButton').addEventListener('click', () => {
            this.exitBuildMode();
        });
    }
    
    /**
     * Exit build mode
     */
    exitBuildMode() {
        // Reset build mode flag
        this.buildMode = false;
        
        // Remove the build preview from the scene
        if (this.buildPreview) {
            this.scene.remove(this.buildPreview);
            this.buildPreview = null;
        }
        
        // Reset the current building type
        this.currentBuildingType = null;
        
        // Update info display via callback
        if (this.onInfoUpdate) {
            this.onInfoUpdate({
                title: 'High Seas!',
                message: 'Left-click: Move ship\nRight-click: Camera'
            });
        }
        
        // Hide UI if we have a container
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
        }
        
        // Notify external systems
        if (this.onBuildModeExit) {
            this.onBuildModeExit(this.buildContext);
        }
        
        // Clear build context
        this.buildContext = null;
    }
    
    /**
     * Place a building at the specified position
     * @param {THREE.Vector3} position - Position to place the building
     */
    placeBuilding(position) {
        // Create a new building at the specified position
        if (this.buildObject && this.currentBuildingType) {
            let newBuilding;
            const modelInfo = MODELS[this.currentBuildingType];
            
            if (this.currentBuildingType === 'marketStall') {
                newBuilding = new MarketStall({
                    position: position.clone(),
                    detailLevel: 0.8,
                    rotation: this.buildPreview.rotation.y
                });
            } else if (this.currentBuildingType === 'dock') {
                newBuilding = new Dock({
                    position: position.clone(),
                    rotation: this.buildPreview.rotation.y
                });
            } else if (modelInfo && !modelInfo.isCustom) {
                // Create a generic GLB model
                newBuilding = new GenericGLBModel({
                    position: position.clone(),
                    rotation: this.buildPreview.rotation.y,
                    modelPath: modelInfo.path,
                    scale: modelInfo.scale || 1,
                    type: this.currentBuildingType,
                    userData: { type: this.currentBuildingType }
                });
            }
            
            if (newBuilding) {
                // Add the building to the scene
                this.scene.add(newBuilding.getObject());
                
                // Notify external systems
                if (this.onBuildingPlaced) {
                    this.onBuildingPlaced(this.currentBuildingType, position, this.buildPreview.rotation.y);
                }
            }
            
            // After placing, go back to building selection
            if (this.uiContainer) {
                this.showBuildingSelectionUI();
            }
            
            // Remove the preview temporarily until a new building type is selected
            if (this.buildPreview) {
                this.scene.remove(this.buildPreview);
                this.buildPreview = null;
            }
        }
    }
    
    /**
     * Rotate the build preview
     */
    rotateBuildPreview() {
        if (this.buildMode && this.buildPreview) {
            // Rotate the preview object by 45 degrees (π/4 radians)
            this.buildPreview.rotation.y += Math.PI / 4;
        }
    }
    
    /**
     * Handle mouse movement
     * @param {MouseEvent} event - Mouse event
     */
    onMouseMove(event) {
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // If in build mode, update the preview position
        if (this.buildMode && this.buildPreview) {
            // Create a raycaster
            this.buildRaycaster.setFromCamera(this.mouse, this.camera);
            
            // Check for intersections with islands
            const islandIntersects = this.buildRaycaster.intersectObjects(this.islandGenerator.getIslands());
            
            if (islandIntersects.length > 0) {
                const intersection = islandIntersects[0];
                const point = intersection.point;
                
                // Check if the point is above water
                if (point.y > this.WATER_LEVEL_THRESHOLD) {
                    // Update the preview position
                    this.buildPreview.position.copy(point);
                    
                    // Make the preview visible
                    this.buildPreview.visible = true;
                } else {
                    // Hide the preview if below water level
                    this.buildPreview.visible = false;
                }
            } else {
                // Hide the preview if not over an island
                this.buildPreview.visible = false;
            }
        }
    }
    
    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    onKeyDown(event) {
        // Add rotation functionality when 'R' key is pressed in build mode
        if (event.key === 'r' || event.key === 'R') {
            this.rotateBuildPreview();
        }
    }
    
    /**
     * Handle click in build mode
     * @param {THREE.Raycaster} raycaster - Raycaster for the click
     * @returns {boolean} - Whether the click was handled
     */
    handleClick(raycaster) {
        if (!this.buildMode || !this.buildPreview) {
            return false; // Not in build mode or no preview
        }
        
        // Check for intersections with islands
        const islandIntersects = raycaster.intersectObjects(this.islandGenerator.getIslands());
        
        if (islandIntersects.length > 0) {
            const intersection = islandIntersects[0];
            const clickedPoint = intersection.point;
            
            // Check if the clicked point is above water
            if (clickedPoint.y > this.WATER_LEVEL_THRESHOLD) {
                // Place the building at the clicked point
                this.placeBuilding(clickedPoint);
                return true; // Click was handled
            }
        }
        
        // If we get here, the click wasn't on a valid build location
        // Check if it was on water
        const waterIntersects = raycaster.intersectObject(this.world.getWater());
        
        if (waterIntersects.length > 0) {
            // Exit build mode
            this.exitBuildMode();
            return true; // Click was handled
        }
        
        return false; // Click was not handled
    }
    
    /**
     * Check if currently in build mode
     * @returns {boolean} - Whether currently in build mode
     */
    isInBuildMode() {
        return this.buildMode;
    }
    
    /**
     * Clean up event listeners
     */
    cleanup() {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('keydown', this.onKeyDown);
    }
}

export default BuildingManager; 