/**
 * ResourceSystem.js - Core system for resource collection functionality
 */
class ResourceSystem {
    /**
     * Create a new ResourceSystem
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.playerShip = options.playerShip;
        this.multiplayerManager = options.multiplayerManager;
        
        // Collection state
        this.isCollecting = false;
        this.collectingResource = null;
        this.collectingIsland = null;
        this.collectionStartTime = null;
        
        // Collection settings
        this.collectionRates = {
            wood: 1,    // 1 wood per collection cycle
            iron: 1,    // 1 iron per collection cycle
            hemp: 1     // 1 hemp per collection cycle
        };
        
        this.collectionCycleDuration = 10000; // 10 seconds per collection cycle
        this.collectionTimer = null;
        
        // Event listeners
        this.eventListeners = {
            started: [],
            stopped: [],
            resourceCollected: [],
            error: []
        };
    }
    
    /**
     * Start resource collection process
     * @param {Object} options - Collection options
     * @returns {boolean} Success status
     */
    startCollection(options = {}) {
        const resource = options.resource;
        const island = options.island;
        const rate = options.rate || this.collectionRates[resource] || 1;
        
        if (!resource || !island) {
            this.triggerEvent('error', { 
                message: 'Cannot start collection: Missing required resource or island',
                code: 'MISSING_PARAMETERS'
            });
            return false;
        }
        
        // If already collecting, stop current collection
        if (this.isCollecting) {
            this.stopCollection();
        }
        
        console.log(`Starting collection of ${resource} at rate ${rate} from island:`, island.name || 'unnamed island');
        
        // Set collection state
        this.isCollecting = true;
        this.collectingResource = resource;
        this.collectingIsland = island;
        this.collectionStartTime = Date.now();
        
        // Start collection cycle
        this.startCollectionCycle(resource, rate);
        
        // Trigger event that collection started
        this.triggerEvent('started', { resource, island, rate });
        return true;
    }
    
    /**
     * Stop resource collection
     */
    stopCollection() {
        if (!this.isCollecting) return false;
        
        console.log(`Stopping collection of ${this.collectingResource}`);
        
        // Clear any pending timers
        if (this.collectionTimer) {
            clearTimeout(this.collectionTimer);
            this.collectionTimer = null;
        }
        
        // Store resource info before clearing
        const resource = this.collectingResource;
        
        // Reset collection state
        this.isCollecting = false;
        this.collectingResource = null;
        this.collectingIsland = null;
        this.collectionStartTime = null;
        
        // Trigger event that collection stopped
        this.triggerEvent('stopped', { resource });
        return true;
    }
    
    /**
     * Start the collection cycle timer
     * @param {string} resource - Resource being collected
     * @param {number} rate - Collection rate
     */
    startCollectionCycle(resource, rate) {
        this.collectionTimer = setTimeout(() => {
            // Add resources to player inventory
            this.addResourcesToInventory(resource, rate);
            
            // Continue collection if still active
            if (this.isCollecting && this.collectingResource === resource) {
                this.startCollectionCycle(resource, rate);
            }
        }, this.collectionCycleDuration);
    }
    
    /**
     * Set the multiplayer manager reference
     * @param {MultiplayerManager} multiplayerManager - The multiplayer manager instance
     */
    setMultiplayerManager(multiplayerManager) {
        this.multiplayerManager = multiplayerManager;
        console.log('MultiplayerManager reference updated in ResourceSystem');
    }
    
    /**
     * Add resources to player inventory
     * @param {string} resource - Resource type to add
     * @param {number} amount - Amount to add
     */
    addResourcesToInventory(resource, amount) {
        // First check if we have direct access to the multiplayerManager
        if (!this.multiplayerManager) {
            // Try to get multiplayerManager from window object if not directly available
            if (window.multiplayerManager) {
                this.multiplayerManager = window.multiplayerManager;
                console.log('Retrieved MultiplayerManager from window object');
            } else {
                console.error('Cannot add resources: Missing multiplayer manager');
                this.triggerEvent('error', { 
                    message: 'Cannot collect resources: Not connected to server',
                    code: 'NO_MULTIPLAYER_MANAGER'
                });
                this.stopCollection();
                return;
            }
        }
        
        // Verify Firebase and authentication is available
        if (!window.firebase || !window.firebase.auth().currentUser) {
            console.error('Cannot add resources: User not authenticated');
            this.triggerEvent('error', { 
                message: 'Cannot collect resources: Not logged in',
                code: 'NOT_AUTHENTICATED'
            });
            this.stopCollection();
            return;
        }
        
        // Get user ID for direct database access (fallback if multiplayerManager fails)
        const userId = window.firebase.auth().currentUser.uid;
        
        console.log(`Adding ${amount} ${resource} to player inventory (${userId})`);
        
        // Create inventory update object
        const inventoryUpdate = {
            resources: {
                [resource]: amount
            }
        };
        
        // Use multiplayer manager to update player resources
        this.multiplayerManager.updatePlayerResources(inventoryUpdate)
            .then(success => {
                if (success) {
                    // Trigger resource collected event
                    this.triggerEvent('resourceCollected', { resource, amount });
                } else {
                    console.error(`Failed to add ${resource} to inventory`);
                    this.triggerEvent('error', { 
                        message: `Failed to collect ${resource}`,
                        code: 'UPDATE_FAILED'
                    });
                    
                    // Try direct database update as fallback
                    this.directDatabaseUpdate(userId, resource, amount);
                }
            })
            .catch(error => {
                console.error(`Error adding ${resource} to inventory:`, error);
                this.triggerEvent('error', { 
                    message: `Error collecting ${resource}: ${error.message || 'Unknown error'}`,
                    code: 'UPDATE_ERROR'
                });
                
                // Try direct database update as fallback
                this.directDatabaseUpdate(userId, resource, amount);
            });
    }
    
    /**
     * Fallback method to update resources directly in the database
     * @param {string} userId - User ID
     * @param {string} resource - Resource type
     * @param {number} amount - Amount to add
     */
    directDatabaseUpdate(userId, resource, amount) {
        if (!window.firebase) return;
        
        console.log(`Attempting direct database update for ${resource}`);
        
        // Get reference to user's inventory
        const inventoryRef = window.firebase.database().ref(`players/${userId}/inventory`);
        
        // First check if the inventory node exists
        inventoryRef.once('value')
            .then(snapshot => {
                let updates = {};
                
                if (snapshot.exists()) {
                    // Get current resources value
                    const resources = snapshot.val().resources || {};
                    const currentAmount = resources[resource] || 0;
                    const newAmount = currentAmount + amount;
                    
                    // Update resources
                    updates[`resources/${resource}`] = newAmount;
                } else {
                    // Create new resources structure
                    updates.resources = {
                        [resource]: amount
                    };
                }
                
                // Update the database
                return inventoryRef.update(updates);
            })
            .then(() => {
                console.log(`Successfully added ${amount} ${resource} via direct update`);
                this.triggerEvent('resourceCollected', { resource, amount });
                
                // Trigger UI update through DOM event
                const resourcesUpdatedEvent = new CustomEvent('playerResourcesUpdated', {
                    detail: { 
                        resources: {
                            [resource]: amount
                        }
                    }
                });
                document.dispatchEvent(resourcesUpdatedEvent);
            })
            .catch(error => {
                console.error(`Error in direct database update:`, error);
                this.triggerEvent('error', { 
                    message: 'Failed to collect resources',
                    code: 'DIRECT_UPDATE_FAILED'
                });
            });
    }
    
    /**
     * Add an event listener
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event occurs
     */
    addEventListener(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].push(callback);
        } else {
            console.warn(`Unknown event type: ${eventName}`);
        }
    }
    
    /**
     * Remove an event listener
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to remove
     */
    removeEventListener(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName]
                .filter(cb => cb !== callback);
        }
    }
    
    /**
     * Trigger an event
     * @param {string} eventName - Name of the event
     * @param {Object} data - Data to pass to event handlers
     */
    triggerEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventName} event handler:`, error);
                }
            });
        }
        
        // Also dispatch a DOM event for broader system awareness
        const domEvent = new CustomEvent(`resourceSystem:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(domEvent);
    }
    
    /**
     * Check if player is currently collecting resources
     * @returns {boolean} Whether collection is active
     */
    isActive() {
        return this.isCollecting;
    }
    
    /**
     * Get the current resource being collected
     * @returns {string|null} Resource type or null if not collecting
     */
    getCurrentResource() {
        return this.collectingResource;
    }
    
    /**
     * Get the resource collection rate for a specific resource
     * @param {string} resource - Resource type
     * @returns {number} Collection rate
     */
    getCollectionRate(resource) {
        return this.collectionRates[resource] || 1;
    }
    
    /**
     * Set the collection rate for a specific resource
     * @param {string} resource - Resource type
     * @param {number} rate - Collection rate
     */
    setCollectionRate(resource, rate) {
        if (typeof rate === 'number' && rate > 0) {
            this.collectionRates[resource] = rate;
        }
    }
    
    /**
     * Set the collection cycle duration
     * @param {number} duration - Duration in milliseconds
     */
    setCollectionCycleDuration(duration) {
        if (typeof duration === 'number' && duration > 0) {
            this.collectionCycleDuration = duration;
        }
    }
}

export default ResourceSystem; 