import * as THREE from 'three';

/**
 * HoverDetection class handles highlighting objects when hovering over them
 */
class HoverDetection {
    /**
     * Create a new HoverDetection instance
     * @param {Object} options - Configuration options
     * @param {THREE.Scene} options.scene - The scene
     * @param {THREE.Camera} options.camera - The camera
     * @param {Array} options.highlightableTypes - Array of model types that can be highlighted
     */
    constructor(options = {}) {
        this.scene = options.scene;
        this.camera = options.camera;
        this.islandGenerator = options.islandGenerator;
        
        // Raycaster for hover detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Track currently highlighted object
        this.highlightedObject = null;
        this.originalMaterials = new Map();
        
        // Default highlight material
        this.highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0x333300,
            transparent: true,
            opacity: 0.8
        });
        
        // Types of objects that can be highlighted
        this.highlightableTypes = options.highlightableTypes || ['shipBuildingShop'];
        
        // Store references to components that might handle interactions
        this.islandInteractionManager = options.islandInteractionManager || window.islandInteractionManager;
        
        // Flag to determine if all island objects should be highlightable
        this.allIslandObjectsHighlightable = options.allIslandObjectsHighlightable !== false;
        
        // Callback for when an object is clicked
        this.onObjectClicked = null;
        
        // Performance optimizations
        this.throttleTime = options.throttleTime || 100; // ms between checks (throttling)
        this.lastCheckTime = 0;
        this.needsCheck = false;
        this.cachedInteractableObjects = [];
        this.cacheInvalidated = true;
        this.frameSkip = options.frameSkip || 2; // Only process every N frames
        this.frameCount = 0;
        
        // Debug flag
        this.debug = options.debug || false;
        
        // Custom cursor settings
        this.customCursors = {
            'fir_tree_large': 'url(/assets/images/cursors/hatchet_cursor.png) 5 5, auto',
            'firTreeLarge': 'url(/assets/images/cursors/hatchet_cursor.png) 5 5, auto',
            'fir_tree_medium': 'url(/assets/images/cursors/hatchet_cursor.png) 5 5, auto',
            'firTreeMedium': 'url(/assets/images/cursors/hatchet_cursor.png) 5 5, auto'
        };
        this.defaultCursor = 'default';
        this.currentCursorType = null;
        
        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseClick = this.onMouseClick.bind(this);
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize hover detection
     */
    init() {
        // Add event listener for mouse movement
        window.addEventListener('mousemove', this.onMouseMove);
        
        // Add event listener for mouse clicks
        window.addEventListener('click', this.onMouseClick);
        
        if (this.debug) {
            console.log('HoverDetection initialized with highlightable types:', this.highlightableTypes);
            console.log('Custom cursor settings initialized:', this.customCursors);
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Remove event listeners
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('click', this.onMouseClick);
        
        // Reset any highlighted object
        this.resetHighlight();
        
        // Reset cursor to default
        this.setCursor(null);
        
        // Clear cache
        this.cachedInteractableObjects = [];
    }
    
    /**
     * Handle mouse movement - throttled to reduce performance impact
     * @param {MouseEvent} event - Mouse movement event
     */
    onMouseMove(event) {
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Set flag that we need to check for highlights on next update
        this.needsCheck = true;
    }
    
    /**
     * Handle mouse click - check if clicked on a highlightable object
     * @param {MouseEvent} event - Mouse click event
     */
    onMouseClick(event) {
        // Skip if we don't have the necessary components
        if (!this.scene || !this.camera) return;
        
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // If cache is invalid, update it
        if (this.cacheInvalidated) {
            this.updateObjectCache();
        }
        
        // Check for intersections with interactable objects
        const intersects = this.raycaster.intersectObjects(this.cachedInteractableObjects, true);
        
        if (intersects.length > 0) {
            // Find the first intersected object that is interactive
            for (const intersect of intersects) {
                const object = this.findParentWithUserData(intersect.object);
                
                if (object && this.isHighlightableObject(object)) {
                    // Notify about object click via callback
                    if (this.onObjectClicked) {
                        this.onObjectClicked(object);
                        
                        if (this.debug) {
                            console.log(`Click detected on object of type: ${object.userData.type}`);
                        }
                        
                        // Prevent further processing
                        event.stopPropagation();
                        return;
                    }
                }
            }
        }
    }
    
    /**
     * Set cursor based on object type
     * @param {string|null} type - Object type or null to reset to default
     */
    setCursor(type) {
        if (type === this.currentCursorType) return; // No change needed
        
        this.currentCursorType = type;
        
        if (type && this.customCursors[type]) {
            if (this.debug) {
                console.log(`Setting cursor for type: ${type} to ${this.customCursors[type]}`);
            }
            document.body.style.cursor = this.customCursors[type];
        } else {
            if (this.debug && type) {
                console.log(`No custom cursor for type: ${type}, using default`);
            }
            document.body.style.cursor = this.defaultCursor;
        }
    }
    
    /**
     * Check for objects to highlight using raycaster
     */
    checkForHighlights() {
        // Only run this check if enough time has passed since last check
        const now = performance.now();
        if (now - this.lastCheckTime < this.throttleTime) {
            return;
        }
        
        this.lastCheckTime = now;
        this.needsCheck = false;
        
        // Reset previous highlight
        this.resetHighlight();
        
        // Only proceed if we have the necessary components
        if (!this.scene || !this.camera) return;
        
        // Update the raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Flag to track if we found an object to highlight
        let foundObject = false;
        let objectType = null;
        
        // First, quick check if we're pointing at an island
        const islands = this.islandGenerator ? this.islandGenerator.getIslands() : [];
        const islandIntersects = this.raycaster.intersectObjects(islands, false);
        
        if (islandIntersects.length > 0) {
            // We hit an island, check its objects
            foundObject = this.checkIslandObjectIntersections(islandIntersects[0].object);
            if (foundObject && this.highlightedObject && this.highlightedObject.userData) {
                objectType = this.highlightedObject.userData.type;
            }
        }
        
        // If no building was highlighted through islands, try direct object detection
        if (!foundObject) {
            // Update cache if invalidated
            if (this.cacheInvalidated) {
                this.updateObjectCache();
            }
            
            // Use cached objects for intersection test
            const directIntersects = this.raycaster.intersectObjects(this.cachedInteractableObjects, true);
            
            if (directIntersects.length > 0) {
                // Find the first intersected object that is highlightable
                for (const intersect of directIntersects) {
                    const object = this.findParentWithUserData(intersect.object);
                    
                    if (object && this.isHighlightableObject(object)) {
                        this.highlightObject(object);
                        foundObject = true;
                        if (object.userData) {
                            objectType = object.userData.type;
                        }
                        break;
                    }
                }
            }
        }
        
        // Set cursor based on the object type we found (or reset to default)
        this.setCursor(objectType);
    }
    
    /**
     * Update the cache of interactable objects
     */
    updateObjectCache() {
        this.cachedInteractableObjects = this.getAllInteractableObjects();
        this.cacheInvalidated = false;
        
        if (this.debug) {
            console.log(`Updated object cache: ${this.cachedInteractableObjects.length} objects`);
        }
    }
    
    /**
     * Check for intersections with objects on an island
     * @param {THREE.Object3D} island - The island to check
     * @returns {boolean} - Whether an object was highlighted
     */
    checkIslandObjectIntersections(island) {
        // Since objects are now children of the island, we can directly use recursive raycasting
        const intersects = this.raycaster.intersectObject(island, true); // true = recursive
        
        if (intersects.length > 0) {
            for (const intersect of intersects) {
                const object = this.findParentWithUserData(intersect.object);
                
                if (object && this.isHighlightableObject(object)) {
                    this.highlightObject(object);
                    
                    if (this.debug) {
                        console.log('Highlighted island object:', object.userData.type);
                    }
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get all interactable objects in the scene
     * @returns {Array} - Array of interactable objects
     */
    getAllInteractableObjects() {
        const objects = [];
        const typeSet = new Set(this.highlightableTypes);
        
        // Traverse the scene to find objects with userData.type matching highlightableTypes
        // or objects that are on islands (if allIslandObjectsHighlightable is true)
        this.scene.traverse(object => {
            if (object.userData) {
                // Include objects with specific types
                if (object.userData.type && (
                    typeSet.has(object.userData.type) || 
                    // Include all island objects if flag is set
                    (this.allIslandObjectsHighlightable && object.userData.islandObject)
                )) {
                    objects.push(object);
                }
                // Also include objects that have GLB model types (e.g., fir_tree_large)
                else if (object.userData.type && object.userData.type.endsWith('.glb')) {
                    objects.push(object);
                }
            }
        });
        
        return objects;
    }
    
    /**
     * Find parent object with userData
     * @param {THREE.Object3D} object - The object to check
     * @returns {THREE.Object3D|null} - The parent object with userData or null
     */
    findParentWithUserData(object) {
        let current = object;
        
        // Traverse up the parent hierarchy
        while (current) {
            if (current.userData && current.userData.type) {
                return current;
            }
            
            current = current.parent;
        }
        
        return null;
    }
    
    /**
     * Check if an object is highlightable
     * @param {THREE.Object3D} object - The object to check
     * @returns {boolean} - Whether the object is highlightable
     */
    isHighlightableObject(object) {
        // If it's a standard highlightable type
        if (object.userData && 
            object.userData.type && 
            this.highlightableTypes.includes(object.userData.type)) {
            return true;
        }
        
        // If it's an island object and allIslandObjectsHighlightable is true
        if (this.allIslandObjectsHighlightable && 
            object.userData && 
            (object.userData.islandObject || 
             object.userData.type && object.userData.type.endsWith('.glb'))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Highlight an object
     * @param {THREE.Object3D} object - The object to highlight
     */
    highlightObject(object) {
        // Store the object as currently highlighted
        this.highlightedObject = object;
        
        // Apply highlight to all child meshes
        object.traverse(child => {
            if (child.isMesh && child.material) {
                // Store original materials for later restoration
                if (Array.isArray(child.material)) {
                    const originalMaterials = [];
                    child.material.forEach(mat => {
                        originalMaterials.push(mat.clone());
                    });
                    this.originalMaterials.set(child, originalMaterials);
                    
                    // Apply highlight to each material
                    child.material = child.material.map(mat => this.createHighlightMaterial(mat));
                } else {
                    // Store original material
                    this.originalMaterials.set(child, child.material.clone());
                    
                    // Apply highlight material
                    child.material = this.createHighlightMaterial(child.material);
                }
            }
        });
        
        if (this.debug) {
            console.log('Highlighting object:', object.userData.type);
        }
    }
    
    /**
     * Create a highlight material based on an original material
     * @param {THREE.Material} originalMaterial - The original material
     * @returns {THREE.Material} - The highlight material
     */
    createHighlightMaterial(originalMaterial) {
        // Clone the highlight material
        const material = this.highlightMaterial.clone();
        
        // If the original material has a map, use it
        if (originalMaterial.map) {
            material.map = originalMaterial.map;
        }
        
        // Preserve other important texture maps
        if (originalMaterial.normalMap) {
            material.normalMap = originalMaterial.normalMap;
        }
        
        if (originalMaterial.aoMap) {
            material.aoMap = originalMaterial.aoMap;
        }
        
        // Customize based on original material if needed
        if (originalMaterial.color) {
            material.color.set(originalMaterial.color).multiplyScalar(1.5);
        }
        
        return material;
    }
    
    /**
     * Reset highlight on the currently highlighted object
     */
    resetHighlight() {
        // If no object is highlighted, do nothing
        if (!this.highlightedObject) return;
        
        // Restore original materials
        this.highlightedObject.traverse(child => {
            if (child.isMesh && this.originalMaterials.has(child)) {
                const originalMaterial = this.originalMaterials.get(child);
                
                // Handle array of materials or single material
                if (Array.isArray(originalMaterial)) {
                    child.material = originalMaterial;
                } else {
                    child.material = originalMaterial;
                }
            }
        });
        
        // Clear the stored materials
        this.originalMaterials.clear();
        
        // Clear the highlighted object
        this.highlightedObject = null;
    }
    
    /**
     * Set highlightable types
     * @param {Array} types - Array of object types that can be highlighted
     */
    setHighlightableTypes(types) {
        this.highlightableTypes = types;
        this.cacheInvalidated = true; // Invalidate cache when types change
        
        if (this.debug) {
            console.log('Updated highlightable types:', this.highlightableTypes);
        }
    }
    
    /**
     * Add a highlightable type
     * @param {string} type - Object type to add to highlightable types
     */
    addHighlightableType(type) {
        if (!this.highlightableTypes.includes(type)) {
            this.highlightableTypes.push(type);
            this.cacheInvalidated = true; // Invalidate cache when types change
            
            if (this.debug) {
                console.log('Added highlightable type:', type);
            }
        }
    }
    
    /**
     * Remove a highlightable type
     * @param {string} type - Object type to remove from highlightable types
     */
    removeHighlightableType(type) {
        const index = this.highlightableTypes.indexOf(type);
        if (index !== -1) {
            this.highlightableTypes.splice(index, 1);
            this.cacheInvalidated = true; // Invalidate cache when types change
            
            if (this.debug) {
                console.log('Removed highlightable type:', type);
            }
        }
    }
    
    /**
     * Set whether all island objects should be highlightable
     * @param {boolean} enabled - Whether all island objects should be highlightable
     */
    setAllIslandObjectsHighlightable(enabled) {
        this.allIslandObjectsHighlightable = enabled;
        this.cacheInvalidated = true; // Invalidate cache when this setting changes
        
        if (this.debug) {
            console.log('All island objects highlightable:', enabled);
        }
    }
    
    /**
     * Set a custom cursor for a specific object type
     * @param {string} objectType - The object type
     * @param {string} cursorStyle - CSS cursor style
     */
    setCustomCursor(objectType, cursorStyle) {
        this.customCursors[objectType] = cursorStyle;
        
        if (this.debug) {
            console.log(`Set custom cursor for ${objectType}:`, cursorStyle);
        }
    }
    
    /**
     * Update method called each frame
     * @param {number} delta - Time since last update
     */
    update(delta) {
        // Implement frame skipping - only process every N frames
        this.frameCount = (this.frameCount + 1) % this.frameSkip;
        if (this.frameCount !== 0) return;
        
        // Check for highlights only when mouse has moved
        if (this.needsCheck) {
            this.checkForHighlights();
        }
    }
}

export default HoverDetection; 