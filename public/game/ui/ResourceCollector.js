/**
 * ResourceCollector.js - UI wrapper for resource collection system
 */
import ResourceSystem from '../systems/ResourceSystem.js';
import GatherWood from '../systems/CollectResources/GatherWood.js';

class ResourceCollector {
    /**
     * Create a new ResourceCollector
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.gameUI = options.gameUI;
        
        // Create the core resource system
        this.resourceSystem = new ResourceSystem({
            playerShip: options.playerShip,
            multiplayerManager: options.multiplayerManager
        });
        
        // Store scene and islandLoader references
        this.scene = options.scene || null;
        this.islandLoader = options.islandLoader || null;
        
        // Initialize resource gathering systems
        this.gatheringSystems = {
            wood: new GatherWood({
                soundManager: options.soundManager || window.soundManager,
                resourceSystem: this.resourceSystem,
                scene: this.scene,
                islandLoader: this.islandLoader
            })
        };
        
        // Animation state
        this.animationState = null;
        
        // Radial cooldown indicator elements
        this.cooldownContainer = null;
        this.cooldownCircle = null;
        this.cooldownFill = null;
        this.cooldownStartTime = 0;
        this.lastUpdateTime = 0;
        
        // Create UI notification element if it doesn't exist
        if (!document.getElementById('resourceCollectionNotification')) {
            const notification = document.createElement('div');
            notification.id = 'resourceCollectionNotification';
            notification.style.position = 'absolute';
            notification.style.top = '100px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            notification.style.color = '#fff';
            notification.style.padding = '8px 16px';
            notification.style.borderRadius = '4px';
            notification.style.fontFamily = 'Arial, sans-serif';
            notification.style.zIndex = '1000';
            notification.style.display = 'none';
            document.body.appendChild(notification);
        }
        
        this.notificationElement = document.getElementById('resourceCollectionNotification');
        
        // Create persistent resource collection UI
        this.createCollectionUI();
        
        // Create the resource cooldown indicator
        this.createCooldownIndicator();
        
        // Set up event listeners for the resource system
        this.setupResourceSystemListeners();
        
        // Listen for map clicks to stop collection when player moves
        this.setupMapClickListener();
    }
    
    /**
     * Create the resource cooldown radial indicator
     */
    createCooldownIndicator() {
        // Create cooldown container if it doesn't exist
        if (!document.getElementById('resource-cooldown-container')) {
            const container = document.createElement('div');
            container.id = 'resource-cooldown-container';
            container.style.position = 'absolute';
            container.style.bottom = '55%'; // Position higher up on the screen
            container.style.left = '50%'; // Center horizontally
            container.style.transform = 'translateX(-50%) translateY(-80px)'; // Center and offset higher above ship
            container.style.width = '70px'; // Wider container
            container.style.height = '70px'; // Taller container
            container.style.display = 'none'; // Hidden by default
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.zIndex = '1000'; // High z-index to appear above other elements
            document.body.appendChild(container);
            
            // Create circular cooldown indicator
            const circle = document.createElement('div');
            circle.style.width = '70px';
            circle.style.height = '70px';
            circle.style.borderRadius = '50%';
            circle.style.position = 'relative';
            circle.style.overflow = 'visible';
            container.appendChild(circle);
            
            // Create circular cooldown fill using SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.transform = 'rotate(-90deg)'; // Start from the top
            
            // Create circle path for cooldown
            const fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            fill.setAttribute('cx', '35');
            fill.setAttribute('cy', '35');
            fill.setAttribute('r', '28');
            fill.setAttribute('fill', 'transparent');
            fill.setAttribute('stroke', '#4CAF50'); // Green when ready
            fill.setAttribute('stroke-width', '8'); // Much thicker stroke
            fill.setAttribute('stroke-dasharray', '175.9'); // 2 * PI * 28
            fill.setAttribute('stroke-dashoffset', '0');
            
            // Add a background circle for better visibility
            const background = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            background.setAttribute('cx', '35');
            background.setAttribute('cy', '35');
            background.setAttribute('r', '28');
            background.setAttribute('fill', 'transparent');
            background.setAttribute('stroke', 'rgba(0, 0, 0, 0.3)'); // Semi-transparent black
            background.setAttribute('stroke-width', '8');
            
            svg.appendChild(background);
            svg.appendChild(fill);
            circle.appendChild(svg);
            
            this.cooldownContainer = container;
            this.cooldownCircle = circle;
            this.cooldownFill = fill;
        } else {
            this.cooldownContainer = document.getElementById('resource-cooldown-container');
            this.cooldownCircle = this.cooldownContainer.querySelector('div');
            this.cooldownFill = this.cooldownContainer.querySelector('circle:nth-child(2)');
        }
    }
    
    /**
     * Update the cooldown indicator
     */
    updateCooldownIndicator() {
        if (!this.cooldownContainer || !this.cooldownFill || !this.isActive()) return;
        
        const now = Date.now();
        const cycleDuration = this.resourceSystem.collectionCycleDuration;
        
        // Only update a few times per second to avoid excessive DOM operations
        if (now - this.lastUpdateTime < 50) return;
        this.lastUpdateTime = now;
        
        // If we haven't set a start time yet, set it to the current time
        if (this.cooldownStartTime === 0) {
            this.cooldownStartTime = now;
        }
        
        // Calculate elapsed time since the last collection cycle started
        const elapsedSinceStart = (now - this.cooldownStartTime) % cycleDuration;
        
        // Calculate progress (0 to 1, where 1 means the cycle is complete)
        const progress = Math.min(1, elapsedSinceStart / cycleDuration);
        
        // Update the SVG circle dashoffset to show cooldown progress
        const circumference = 175.9; // 2 * PI * 28
        const dashOffset = circumference * (1 - progress);
        this.cooldownFill.setAttribute('stroke-dashoffset', dashOffset);
        
        // Color gradient from blue to green based on progress
        const r = Math.floor(30 + (76 - 30) * progress); // 30 -> 76
        const g = Math.floor(144 + (175 - 144) * progress); // 144 -> 175
        const b = Math.floor(255 + (80 - 255) * progress); // 255 -> 80
        
        const color = `rgb(${r}, ${g}, ${b})`;
        this.cooldownFill.setAttribute('stroke', color);
        
        // If we just completed a cycle, reset the start time
        if (progress >= 0.99) {
            this.cooldownStartTime = now;
        }
    }
    
    /**
     * Show the cooldown indicator
     */
    showCooldownIndicator() {
        if (!this.cooldownContainer) return;
        
        this.cooldownContainer.style.display = 'flex';
        this.cooldownStartTime = Date.now();
        
        // Start the update loop
        if (!this.updateInterval) {
            this.updateInterval = setInterval(() => {
                this.updateCooldownIndicator();
            }, 16); // Update at roughly 60fps
        }
    }
    
    /**
     * Hide the cooldown indicator
     */
    hideCooldownIndicator() {
        if (this.cooldownContainer) {
            this.cooldownContainer.style.display = 'none';
            
            // Stop the update loop
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            // Reset the cooldown state
            this.cooldownStartTime = 0;
        }
    }
    
    /**
     * Create the persistent resource collection UI
     */
    createCollectionUI() {
        // Create collection UI container if it doesn't exist
        if (!document.getElementById('resourceCollectionUI')) {
            const collectionUI = document.createElement('div');
            collectionUI.id = 'resourceCollectionUI';
            collectionUI.style.position = 'absolute';
            collectionUI.style.bottom = '20%';
            collectionUI.style.left = '50%';
            collectionUI.style.transform = 'translateX(-50%)';
            collectionUI.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            collectionUI.style.color = '#fff';
            collectionUI.style.padding = '12px 16px';
            collectionUI.style.borderRadius = '6px';
            collectionUI.style.fontFamily = 'Arial, sans-serif';
            collectionUI.style.zIndex = '1000';
            collectionUI.style.display = 'none';
            collectionUI.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
            collectionUI.style.minWidth = '200px';
            collectionUI.style.textAlign = 'center';
            
            // Add status text
            const statusText = document.createElement('div');
            statusText.id = 'resourceCollectionStatus';
            statusText.style.marginBottom = '10px';
            statusText.style.fontSize = '18px';
            statusText.style.fontWeight = 'bold';
            statusText.style.textAlign = 'center';
            collectionUI.appendChild(statusText);
            
            // Add stop button
            const stopButton = document.createElement('button');
            stopButton.id = 'stopCollectionButton';
            stopButton.textContent = 'Stop Collection';
            stopButton.style.width = '100%';
            stopButton.style.padding = '8px 12px';
            stopButton.style.backgroundColor = '#e74c3c';
            stopButton.style.color = 'white';
            stopButton.style.border = 'none';
            stopButton.style.borderRadius = '4px';
            stopButton.style.cursor = 'pointer';
            stopButton.style.fontWeight = 'bold';
            
            // Add hover effect
            stopButton.addEventListener('mouseover', () => {
                stopButton.style.backgroundColor = '#c0392b';
            });
            
            stopButton.addEventListener('mouseout', () => {
                stopButton.style.backgroundColor = '#e74c3c';
            });
            
            // Add click handler to stop collection
            stopButton.addEventListener('click', () => {
                this.stopCollection();
                
                // If island menu exists, reopen it
                if (window.islandInteractionManager) {
                    window.islandInteractionManager.showIslandMenu();
                }
            });
            
            collectionUI.appendChild(stopButton);
            document.body.appendChild(collectionUI);
        }
        
        this.collectionUI = document.getElementById('resourceCollectionUI');
        this.statusText = document.getElementById('resourceCollectionStatus');
    }
    
    /**
     * Set up event listeners for the resource system
     */
    setupResourceSystemListeners() {
        // Listen for collection started events
        this.resourceSystem.addEventListener('started', (data) => {
            // Close any open island menu
            if (window.islandInteractionManager) {
                window.islandInteractionManager.hideIslandMenu();
            }
            
            // Show notification
            this.showNotification(`Collecting ${data.resource}...`);
            
            // Update and show persistent UI
            this.showCollectionUI(data.resource);
            
            // Show cooldown indicator
            this.showCooldownIndicator();
            
            // Start animation
            this.startResourceAnimation(`${data.resource}Collection`);
            
            // Dispatch DOM event for other components
            const event = new CustomEvent('resourceCollectionStarted', {
                detail: data
            });
            document.dispatchEvent(event);
        });
        
        // Listen for collection stopped events
        this.resourceSystem.addEventListener('stopped', (data) => {
            this.hideNotification();
            this.hideCollectionUI();
            this.hideCooldownIndicator();
            this.stopResourceAnimation();
            
            // Dispatch DOM event for other components
            const event = new CustomEvent('resourceCollectionStopped', {
                detail: data
            });
            document.dispatchEvent(event);
        });
        
        // Listen for resource collected events
        this.resourceSystem.addEventListener('resourceCollected', (data) => {
            this.showNotification(`Collected ${data.amount} ${data.resource}`, 'success');
            
            // Reset cooldown timer for next cycle
            this.cooldownStartTime = Date.now();
            
            // Dispatch DOM event for other components
            const event = new CustomEvent('resourceCollected', {
                detail: data
            });
            document.dispatchEvent(event);
        });
        
        // Listen for error events
        this.resourceSystem.addEventListener('error', (data) => {
            this.showNotification(data.message, 'error');
        });
    }
    
    /**
     * Set up listener for map clicks to stop collection when player moves
     */
    setupMapClickListener() {
        // Listen for map navigation events
        document.addEventListener('mapNavigationStarted', () => {
            // Stop collection if active when player starts moving the ship
            if (this.isActive()) {
                console.log('Ship movement detected - stopping resource collection');
                this.stopCollection();
            }
        });
    }
    
    /**
     * Show the collection UI with the current resource
     * @param {string} resource - The resource being collected
     */
    showCollectionUI(resource) {
        if (!this.collectionUI || !this.statusText) return;
        
        // Format resource name
        const formattedResource = resource.charAt(0).toUpperCase() + resource.slice(1);
        
        // Set activity text based on resource type
        let activityText = '';
        switch (resource) {
            case 'wood':
                activityText = 'Chopping Wood';
                break;
            case 'iron':
                activityText = 'Mining Iron';
                break;
            case 'hemp':
                activityText = 'Gathering Hemp';
                break;
            default:
                activityText = `Collecting ${formattedResource}`;
        }
        
        // Update status text
        this.statusText.textContent = activityText;
        
        // Show the UI
        this.collectionUI.style.display = 'block';
    }
    
    /**
     * Hide the collection UI
     */
    hideCollectionUI() {
        if (this.collectionUI) {
            this.collectionUI.style.display = 'none';
        }
    }
    
    /**
     * Start resource collection process
     * @param {Object} options - Collection options
     */
    startCollection(options = {}) {
        this.resourceSystem.startCollection(options);
    }
    
    /**
     * Stop resource collection
     */
    stopCollection() {
        this.resourceSystem.stopCollection();
    }
    
    /**
     * Set the multiplayer manager reference
     * @param {MultiplayerManager} multiplayerManager - The multiplayer manager instance
     */
    setMultiplayerManager(multiplayerManager) {
        this.resourceSystem.setMultiplayerManager(multiplayerManager);
    }
    
    /**
     * Start animation for resource collection
     * @param {string} animationType - Type of animation to play
     */
    startResourceAnimation(animationType) {
        // TODO: Implement animation when the animation system is ready
        console.log(`Starting ${animationType} animation`);
        
        // For now, just set the animation state
        this.animationState = animationType;
    }
    
    /**
     * Stop resource collection animation
     */
    stopResourceAnimation() {
        // TODO: Implement animation when the animation system is ready
        console.log('Stopping resource collection animation');
        
        // Reset animation state
        this.animationState = null;
    }
    
    /**
     * Show notification about resource collection
     * @param {string} message - Message to display
     * @param {string} type - Notification type (optional: 'error', 'success', 'info')
     */
    showNotification(message, type = 'info') {
        if (this.notificationElement) {
            this.notificationElement.textContent = message;
            this.notificationElement.style.display = 'block';
            
            // Apply styling based on notification type
            if (type === 'error') {
                this.notificationElement.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
                this.notificationElement.style.border = '1px solid #ff0000';
                this.notificationElement.style.color = 'white';
            } else if (type === 'success') {
                this.notificationElement.style.backgroundColor = 'rgba(0, 120, 0, 0.8)';
                this.notificationElement.style.border = '1px solid #00ff00';
                this.notificationElement.style.color = 'white';
            } else {
                // Default info styling
                this.notificationElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                this.notificationElement.style.border = 'none';
                this.notificationElement.style.color = '#fff';
            }
            
            // Auto-hide after 3 seconds for info/success, 5 seconds for errors
            const displayTime = (type === 'error') ? 5000 : 3000;
            
            setTimeout(() => {
                // Only hide if we're still collecting (for info/success) 
                // Always hide errors after their display time
                if (type === 'error' || this.resourceSystem.isActive()) {
                    this.notificationElement.style.display = 'none';
                }
            }, displayTime);
        }
    }
    
    /**
     * Hide the notification element
     */
    hideNotification() {
        if (this.notificationElement) {
            this.notificationElement.style.display = 'none';
        }
    }
    
    // Delegate methods to resourceSystem
    
    /**
     * Check if player is currently collecting resources
     * @returns {boolean} Whether collection is active
     */
    isActive() {
        return this.resourceSystem.isActive();
    }
    
    /**
     * Get the current resource being collected
     * @returns {string|null} Resource type or null if not collecting
     */
    getCurrentResource() {
        return this.resourceSystem.getCurrentResource();
    }
    
    /**
     * Get the resource collection rate for a specific resource
     * @param {string} resource - Resource type
     * @returns {number} Collection rate
     */
    getCollectionRate(resource) {
        return this.resourceSystem.getCollectionRate(resource);
    }
    
    /**
     * Set the collection rate for a specific resource
     * @param {string} resource - Resource type
     * @param {number} rate - Collection rate
     */
    setCollectionRate(resource, rate) {
        this.resourceSystem.setCollectionRate(resource, rate);
    }
    
    /**
     * Set the collection cycle duration
     * @param {number} duration - Duration in milliseconds
     */
    setCollectionCycleDuration(duration) {
        this.resourceSystem.setCollectionCycleDuration(duration);
    }
    
    /**
     * Set the sound manager reference
     * @param {SoundManager} soundManager - The sound manager instance
     */
    setSoundManager(soundManager) {
        // Update sound manager reference in gathering systems
        Object.values(this.gatheringSystems).forEach(system => {
            if (system && typeof system.soundManager !== 'undefined') {
                system.soundManager = soundManager;
            }
        });
    }
    
    /**
     * Clean up all resources
     */
    destroy() {
        // Stop collection if active
        if (this.isActive()) {
            this.stopCollection();
        }
        
        // Clean up gathering systems
        Object.values(this.gatheringSystems).forEach(system => {
            if (system && typeof system.destroy === 'function') {
                system.destroy();
            }
        });
        
        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Set a new scene reference
     * @param {THREE.Scene} scene - The scene to use for animations
     */
    setScene(scene) {
        this.scene = scene;
        
        // Update scene in gathering systems
        if (this.gatheringSystems.wood && typeof this.gatheringSystems.wood.setScene === 'function') {
            this.gatheringSystems.wood.setScene(scene);
        }
    }
    
    /**
     * Set a new island loader reference
     * @param {IslandLoader} islandLoader - The island loader to use
     */
    setIslandLoader(islandLoader) {
        this.islandLoader = islandLoader;
        
        // Update island loader in gathering systems
        if (this.gatheringSystems.wood) {
            this.gatheringSystems.wood.islandLoader = islandLoader;
        }
    }
}

export default ResourceCollector; 