/**
 * ChopTree.js - Handles direct tree chopping interactions
 * Allows players to click on trees directly to harvest wood
 */
import * as THREE from 'three';

class ChopTree {
    /**
     * Create a new ChopTree handler
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Dependencies
        this.scene = options.scene || null;
        this.soundManager = options.soundManager || window.soundManager;
        this.multiplayerManager = options.multiplayerManager || window.multiplayerManager;
        
        // Sound effect paths
        this.chopSounds = [
            'axe_chop1.mp3',
            'axe_chop2.mp3',
            'axe_chop3.mp3',
            'axe_chop4.mp3'
        ];
        this.treeFelledSound = 'tree_felled.mp3';
        
        // Tree animation settings
        this.shakeAmount = 0.05;  // Maximum rotation in radians
        this.shakeSpeed = 15;     // Oscillations per second
        this.returnSpeed = 2;     // Speed to return to original position
        
        // Chopping settings
        this.chopCount = 0;
        this.chopsNeeded = 11;    // Changed from 10 to 11 chops to fell a tree
        this.chopInterval = null;
        this.collectionCycleDuration = 1000; // 1 second between chops
        
        // Tree state tracking
        this.isChopping = false;
        this.currentTree = null;
        this.currentTreeOriginalRotation = new THREE.Euler();
        this.felledTrees = new Map(); // Track felled trees and their respawn times
        this.treeCooldown = 60000; // 60 seconds before tree respawns
        
        // Animation tracking
        this.animationFrameId = null;
        this.lastAnimationTime = 0;
        this.isAnimating = false;
        this.shakeStartTime = 0;  // Add tracking of when shake started
        
        // Tree felling state - now an array of objects for multiple trees
        this.fellingTrees = [];
        
        // Wood chip particles
        this.woodChipParticles = [];
        
        // Add missing felling duration property
        this.fellingDuration = 1500; // 1.5 seconds to fall
        
        // UI elements
        this.createChoppingUI();
        this.createCooldownIndicator();
        
        // Pre-load sounds
        this.preloadSounds();
    }

    /**
     * Create the cooldown radial indicator
     */
    createCooldownIndicator() {
        // Create cooldown container if it doesn't exist
        if (!document.getElementById('tree-cooldown-container')) {
            const container = document.createElement('div');
            container.id = 'tree-cooldown-container';
            container.style.position = 'absolute';
            container.style.bottom = '55%';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%) translateY(-80px)';
            container.style.width = '70px';
            container.style.height = '70px';
            container.style.display = 'none';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.zIndex = '1000';
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
            svg.style.transform = 'rotate(-90deg)';
            
            // Create background circle
            const background = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            background.setAttribute('cx', '35');
            background.setAttribute('cy', '35');
            background.setAttribute('r', '28');
            background.setAttribute('fill', 'transparent');
            background.setAttribute('stroke', 'rgba(0, 0, 0, 0.3)');
            background.setAttribute('stroke-width', '8');
            
            // Create progress circle
            const fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            fill.setAttribute('cx', '35');
            fill.setAttribute('cy', '35');
            fill.setAttribute('r', '28');
            fill.setAttribute('fill', 'transparent');
            fill.setAttribute('stroke', '#4CAF50');
            fill.setAttribute('stroke-width', '8');
            fill.setAttribute('stroke-dasharray', '175.9'); // 2 * PI * 28
            fill.setAttribute('stroke-dashoffset', '175.9'); // Start empty
            
            svg.appendChild(background);
            svg.appendChild(fill);
            circle.appendChild(svg);
            
            this.cooldownContainer = container;
            this.cooldownCircle = circle;
            this.cooldownFill = fill;
            this.cooldownStartTime = 0;
            this.lastUpdateTime = 0;
        } else {
            this.cooldownContainer = document.getElementById('tree-cooldown-container');
            this.cooldownCircle = this.cooldownContainer.querySelector('div');
            this.cooldownFill = this.cooldownContainer.querySelector('circle:nth-child(2)');
        }
    }
    
    /**
     * Create the chopping UI
     */
    createChoppingUI() {
        // Create UI container if it doesn't exist
        if (!document.getElementById('treeChoppingUI')) {
            const choppingUI = document.createElement('div');
            choppingUI.id = 'treeChoppingUI';
            choppingUI.style.position = 'absolute';
            choppingUI.style.bottom = '20%';
            choppingUI.style.left = '50%';
            choppingUI.style.transform = 'translateX(-50%)';
            choppingUI.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            choppingUI.style.color = '#fff';
            choppingUI.style.padding = '12px 16px';
            choppingUI.style.borderRadius = '6px';
            choppingUI.style.fontFamily = 'Arial, sans-serif';
            choppingUI.style.zIndex = '1000';
            choppingUI.style.display = 'none';
            choppingUI.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
            choppingUI.style.minWidth = '200px';
            choppingUI.style.textAlign = 'center';
            
            // Add status text
            const statusText = document.createElement('div');
            statusText.id = 'treeChoppingStatus';
            statusText.style.marginBottom = '10px';
            statusText.style.fontSize = '18px';
            statusText.style.fontWeight = 'bold';
            statusText.style.textAlign = 'center';
            statusText.textContent = 'Chopping Tree';
            choppingUI.appendChild(statusText);
            
            // Add stop button
            const stopButton = document.createElement('button');
            stopButton.id = 'stopChoppingButton';
            stopButton.textContent = 'Stop Chopping';
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
            
            // Add click handler
            stopButton.addEventListener('click', () => {
                this.stopChopping();
            });
            
            choppingUI.appendChild(stopButton);
            document.body.appendChild(choppingUI);
            
            // Create notification element if it doesn't exist
            if (!document.getElementById('treeChopNotification')) {
                const notification = document.createElement('div');
                notification.id = 'treeChopNotification';
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
        }
        
        this.choppingUI = document.getElementById('treeChoppingUI');
        this.statusText = document.getElementById('treeChoppingStatus');
        this.notificationElement = document.getElementById('treeChopNotification');
    }
    
    /**
     * Preload required sound effects
     */
    preloadSounds() {
        if (!this.soundManager) return;
        
        // Preload all axe chop sound effects
        this.chopSounds.forEach((soundFile, index) => {
            if (!this.soundManager.sounds.sfx[`axe_chop${index+1}`]) {
                this.soundManager.loadSound(`axe_chop${index+1}`, 'sfx', soundFile);
            }
        });
        
        // Preload tree felled sound
        if (!this.soundManager.sounds.sfx.tree_felled) {
            this.soundManager.loadSound('tree_felled', 'sfx', this.treeFelledSound);
        }
    }
    
    /**
     * Start chopping a tree
     * @param {THREE.Object3D} tree - The tree object to chop
     */
    startChopping(tree) {
        // Check if this tree is already felled and in cooldown
        if (this.felledTrees.has(tree.uuid)) {
            const respawnTime = this.felledTrees.get(tree.uuid);
            const currentTime = Date.now();
            
            if (currentTime < respawnTime) {
                // Tree is still in cooldown
                const remainingSeconds = Math.ceil((respawnTime - currentTime) / 1000);
                this.showNotification(`This tree is regenerating. Available in ${remainingSeconds} seconds.`);
                return;
            } else {
                // Tree has respawned, remove from felled trees
                this.felledTrees.delete(tree.uuid);
            }
        }
        
        // Prevent starting to chop if we're in an inconsistent state
        if (this.chopInterval) {
            clearInterval(this.chopInterval);
            this.chopInterval = null;
        }
        
        // Make sure UI is reset if it was left visible
        this.hideChoppingUI();
        this.hideCooldownIndicator();
        
        // Ensure any previous chopping is properly stopped
        if (this.isChopping) {
            this.stopChopping();
        }
        
        console.log('Starting to chop tree:', tree);
        
        // Set chopping state
        this.isChopping = true;
        this.currentTree = tree;
        this.chopCount = 0;
        
        // Store original rotation
        if (tree.rotation) {
            this.currentTreeOriginalRotation.copy(tree.rotation);
        }
        
        // Show UI
        this.showChoppingUI();
        this.showCooldownIndicator();
        
        // Start the chopping sequence - every 1 second for 10 seconds
        this.chopInterval = setInterval(() => {
            this.performChop();
        }, this.collectionCycleDuration);
        
        // Perform first chop immediately
        this.performChop();
    }
    
    /**
     * Perform a single chop action
     */
    performChop() {
        if (!this.isChopping || !this.currentTree) return;
        
        // Increment chop count
        this.chopCount++;
        
        // Play a random chop sound
        this.playRandomChopSound();
        
        // Animate tree shake for this chop
        this.animateTreeShake();
        
        // Create wood chip particles
        this.createWoodChipEffect();
        
        // Check if tree should be felled
        if (this.chopCount >= this.chopsNeeded) {
            // Tree is fully chopped, add wood to inventory
            this.addWoodToInventory();
            
            // Play tree felled sound
            this.playTreeFelledSound();
            
            // Hide the UI immediately when chopping is complete
            this.hideChoppingUI();
            this.hideCooldownIndicator();
            
            // Perform tree falling animation
            this.fellTree();
            
            // Stop the chopping interval
            clearInterval(this.chopInterval);
            this.chopInterval = null;
            
            // Add this tree to felled trees with a respawn time
            const respawnTime = Date.now() + this.treeCooldown;
            this.felledTrees.set(this.currentTree.uuid, respawnTime);
        }
    }
    
    /**
     * Stop chopping the current tree
     */
    stopChopping() {
        if (!this.isChopping) return;
        
        console.log('Stopping tree chopping');
        
        // Clear chopping interval
        if (this.chopInterval) {
            clearInterval(this.chopInterval);
            this.chopInterval = null;
        }
        
        // Reset state
        this.isChopping = false;
        this.chopCount = 0;
        
        // Hide UI
        this.hideChoppingUI();
        this.hideCooldownIndicator();
        
        // If the tree is not being felled, ensure it's back to original rotation
        if (this.currentTree && !this.isTreeBeingFelled(this.currentTree)) {
            this.currentTree.rotation.copy(this.currentTreeOriginalRotation);
        }
        
        // Trigger a custom event for stopping tree chopping
        const event = new CustomEvent('treeChoppingStop', {
            detail: { tree: this.currentTree }
        });
        document.dispatchEvent(event);
        
        // Clear current tree reference
        this.currentTree = null;
    }
    
    /**
     * Check if a tree is currently being felled
     * @param {THREE.Object3D} tree - The tree to check
     * @returns {boolean} - Whether the tree is being felled
     */
    isTreeBeingFelled(tree) {
        if (!tree) return false;
        return this.fellingTrees.some(fellingTree => fellingTree.tree.uuid === tree.uuid);
    }
    
    /**
     * Update the chop count display
     */
    updateChopCountDisplay() {
        if (this.chopCountText) {
            this.chopCountText.textContent = `${this.chopCount}/${this.chopsNeeded}`;
        }
        
        // Update cooldown circle progress
        this.updateCooldownProgress();
    }
    
    /**
     * Update the cooldown progress indicator
     */
    updateCooldownProgress() {
        if (!this.cooldownFill) return;
        
        const now = Date.now();
        const cycleDuration = this.collectionCycleDuration * (this.chopsNeeded - 1); // 10 seconds total (first chop is immediate, then 10 more at 1s intervals)
        
        // Only update a few times per second to avoid excessive DOM operations
        if (now - this.lastUpdateTime < 50) return;
        this.lastUpdateTime = now;
        
        // If we haven't set a start time yet, set it to the current time
        if (this.cooldownStartTime === 0) {
            this.cooldownStartTime = now;
        }
        
        // Calculate elapsed time since collection started
        const elapsedTime = now - this.cooldownStartTime;
        
        // Calculate progress (0 to 1, where 1 means the cycle is complete)
        const progress = Math.min(1, elapsedTime / cycleDuration);
        
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
    }
    
    /**
     * Show the chopping UI
     */
    showChoppingUI() {
        if (this.choppingUI) {
            this.choppingUI.style.display = 'block';
        }
    }
    
    /**
     * Hide the chopping UI
     */
    hideChoppingUI() {
        if (this.choppingUI) {
            this.choppingUI.style.display = 'none';
        }
    }
    
    /**
     * Show the cooldown indicator
     */
    showCooldownIndicator() {
        if (!this.cooldownContainer) return;
        
        this.cooldownContainer.style.display = 'flex';
        this.cooldownStartTime = Date.now();
        
        // Reset the progress
        if (this.cooldownFill) {
            this.cooldownFill.setAttribute('stroke-dashoffset', '175.9'); // Start empty
        }
        
        // Start the update loop
        if (!this.updateInterval) {
            this.updateInterval = setInterval(() => {
                this.updateCooldownProgress();
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
     * Add wood to the player's inventory
     */
    addWoodToInventory() {
        // First check if we have direct access to the multiplayerManager
        if (!this.multiplayerManager) {
            // Try to get multiplayerManager from window object if not directly available
            if (window.multiplayerManager) {
                this.multiplayerManager = window.multiplayerManager;
                console.log('Retrieved MultiplayerManager from window object');
            } else {
                console.error('Cannot add resources: Missing multiplayer manager');
                this.showNotification('Cannot collect wood: Not connected to server', 'error');
                return;
            }
        }
        
        // Verify Firebase and authentication is available
        if (!window.firebase || !window.firebase.auth().currentUser) {
            console.error('Cannot add resources: User not authenticated');
            this.showNotification('Cannot collect wood: Not logged in', 'error');
            return;
        }
        
        // Get user ID for direct database access (fallback if multiplayerManager fails)
        const userId = window.firebase.auth().currentUser.uid;
        
        console.log(`Adding 1 wood to player inventory (${userId})`);
        
        // Create inventory update object
        const inventoryUpdate = {
            resources: {
                wood: 1
            }
        };
        
        // Use multiplayer manager to update player resources
        this.multiplayerManager.updatePlayerResources(inventoryUpdate)
            .then(success => {
                if (success) {
                    // Show notification of successful collection
                    this.showNotification('Collected 1 wood', 'success');
                    
                    // Trigger custom event for wood collection
                    const event = new CustomEvent('resourceCollected', {
                        detail: { resource: 'wood', amount: 1 }
                    });
                    document.dispatchEvent(event);
                } else {
                    console.error('Failed to add wood to inventory');
                    this.showNotification('Failed to collect wood', 'error');
                    
                    // Try direct database update as fallback
                    this.directDatabaseUpdate(userId, 'wood', 1);
                }
            })
            .catch(error => {
                console.error('Error adding wood to inventory:', error);
                this.showNotification(`Error collecting wood: ${error.message || 'Unknown error'}`, 'error');
                
                // Try direct database update as fallback
                this.directDatabaseUpdate(userId, 'wood', 1);
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
                this.showNotification(`Collected ${amount} ${resource}`, 'success');
                
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
                this.showNotification('Failed to collect resources', 'error');
            });
    }
    
    /**
     * Play a random axe chop sound effect
     */
    playRandomChopSound() {
        if (!this.soundManager) return;
        
        // Get a random chop sound (1-4)
        const randomIndex = Math.floor(Math.random() * this.chopSounds.length);
        const soundKey = `axe_chop${randomIndex+1}`;
        
        // Play the sound effect
        this.soundManager.play(soundKey, 'sfx', {
            volume: 0.8 // Slightly reduced volume
        });
    }
    
    /**
     * Play the tree felled sound effect
     */
    playTreeFelledSound() {
        if (!this.soundManager) return;
        
        // Play the tree felled sound
        this.soundManager.play('tree_felled', 'sfx', {
            volume: 1.0 // Full volume for the satisfying tree fall
        });
    }
    
    /**
     * Animate a tree shake when chopping
     */
    animateTreeShake() {
        if (!this.currentTree) return;
        
        // Set up animation state
        this.isAnimating = true;
        this.lastAnimationTime = Date.now();
        this.shakeStartTime = Date.now(); // Track when the shake started
        
        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this.startAnimationLoop();
        }
    }
    
    /**
     * Start the animation loop
     */
    startAnimationLoop() {
        const animate = () => {
            // Continue animation if we're actively shaking OR if we have particles OR we have felling trees
            const shouldContinue = this.isAnimating || 
                                   this.woodChipParticles.length > 0 || 
                                   this.fellingTrees.length > 0;
            
            if (!shouldContinue) {
                console.log('Animation complete, stopping animation loop');
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
                return;
            }
            
            // Update tree animations and particles
            const now = Date.now();
            const deltaTime = (now - this.lastAnimationTime) / 1000; // In seconds
            this.lastAnimationTime = now;
            
            // Update current tree being chopped (shake animation)
            this.updateCurrentTreeAnimation(deltaTime, now);
            
            // Update any trees being felled
            this.updateFellingTreesAnimation(deltaTime, now);
            
            // Update particles
            this.updateParticles();
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }
    
    /**
     * Update the current tree's shake animation
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} now - Current timestamp
     */
    updateCurrentTreeAnimation(deltaTime, now) {
        if (!this.currentTree) return;
        
        // Skip if this tree is being felled (it will be handled by updateFellingTreesAnimation)
        if (this.isTreeBeingFelled(this.currentTree)) return;
        
        // Regular shake animation when chopping
        if (this.isAnimating) {
            // Calculate shake progress (0 to 1) over the shake duration
            const shakeDuration = 400; // 400ms of active shaking per chop
            const timeSinceShakeStart = now - this.shakeStartTime;
            const shakeProgress = Math.min(1, timeSinceShakeStart / shakeDuration);
            
            // More intense at the beginning, less at the end for natural taper-off
            const intensityFactor = 1 - shakeProgress * 0.7;
            
            // Apply shake effect
            const shake = Math.sin(now * 0.02 * this.shakeSpeed) * this.shakeAmount * intensityFactor;
            
            // Apply shake to all axes with different intensities
            this.currentTree.rotation.x = this.currentTreeOriginalRotation.x + shake * 0.2;
            this.currentTree.rotation.y = this.currentTreeOriginalRotation.y + shake * 1.2; // Stronger on Y-axis
            this.currentTree.rotation.z = this.currentTreeOriginalRotation.z + shake * 0.5;
            
            // Automatically end active shaking after the duration
            if (shakeProgress >= 1) {
                this.isAnimating = false;
            }
        } 
        else {
            // Return to original rotation
            this.currentTree.rotation.x += (this.currentTreeOriginalRotation.x - this.currentTree.rotation.x) * this.returnSpeed * deltaTime;
            this.currentTree.rotation.y += (this.currentTreeOriginalRotation.y - this.currentTree.rotation.y) * this.returnSpeed * deltaTime;
            this.currentTree.rotation.z += (this.currentTreeOriginalRotation.z - this.currentTree.rotation.z) * this.returnSpeed * deltaTime;
            
            // Check if we're close enough to original rotation
            const isCloseToOriginal = 
                Math.abs(this.currentTree.rotation.x - this.currentTreeOriginalRotation.x) < 0.001 &&
                Math.abs(this.currentTree.rotation.y - this.currentTreeOriginalRotation.y) < 0.001 &&
                Math.abs(this.currentTree.rotation.z - this.currentTreeOriginalRotation.z) < 0.001;
            
            if (isCloseToOriginal) {
                // Snap to exact original rotation
                this.currentTree.rotation.copy(this.currentTreeOriginalRotation);
            }
        }
    }
    
    /**
     * Update the animation for all trees that are being felled
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} now - Current timestamp
     */
    updateFellingTreesAnimation(deltaTime, now) {
        if (this.fellingTrees.length === 0) return;

        // Loop through all felling trees backwards so we can safely remove completed ones
        for (let i = this.fellingTrees.length - 1; i >= 0; i--) {
            const fellingData = this.fellingTrees[i];
            const tree = fellingData.tree;
            
            const timeSinceFellingStart = now - fellingData.startTime;
            
            // Calculate felling progress (0 to 1)
            if (timeSinceFellingStart <= this.fellingDuration) {
                // Falling phase
                const fellingProgress = Math.min(1, timeSinceFellingStart / this.fellingDuration);
                
                // Use easeOutQuad for natural fall
                const easeOut = function(t) { return t * (2 - t); };
                const easedProgress = easeOut(fellingProgress);
                
                // Calculate fall direction vector
                const fallDirectionX = Math.cos(fellingData.direction);
                const fallDirectionZ = Math.sin(fellingData.direction);
                
                // Maximum tilt is 80 degrees
                const maxTiltRadians = 80 * (Math.PI / 180);
                
                // Apply rotation based on fall direction
                tree.rotation.set(
                    fellingData.originalRotation.x + fallDirectionX * easedProgress * maxTiltRadians,
                    fellingData.originalRotation.y,
                    fellingData.originalRotation.z + fallDirectionZ * easedProgress * maxTiltRadians
                );
                
                // Apply slight fade-out during falling (only to 80% opacity)
                const fallOpacity = 1.0 - (easedProgress * 0.2); // Fade slightly to 80% opacity
                this.setTreeOpacity(tree, fallOpacity);
                
                // Add some shaking during first part of the fall
                if (fellingProgress < 0.4) {
                    const shakeIntensity = 0.15 * (1 - fellingProgress / 0.4);
                    const shake = Math.sin(now * 0.02 * this.shakeSpeed) * shakeIntensity;
                    
                    tree.rotation.x += shake * 0.2;
                    tree.rotation.y += shake * 0.3;
                    tree.rotation.z += shake * 0.2;
                }
            } 
            else {
                // Tree has finished falling - now fade out completely over 3 seconds
                const fadeOutDuration = 3000; // 3 seconds for fade out
                const fadeOutProgress = Math.min(1, (timeSinceFellingStart - this.fellingDuration) / fadeOutDuration);
                
                // Start from 80% opacity (where the falling phase ended) and go to 0%
                const opacity = Math.max(0, 0.8 - fadeOutProgress * 0.8);
                
                // Apply the fading effect
                this.setTreeOpacity(tree, opacity);
                
                // If fade out is complete, hide the tree visually but don't change visibility property
                // This allows hover detection while maintaining the appearance of invisibility
                if (fadeOutProgress >= 1) {
                    console.log('Tree fade-out complete:', tree.uuid);
                    
                    // Make it fully transparent
                    this.setTreeOpacity(tree, 0);
                    
                    // Remove this tree from the felling trees array
                    this.fellingTrees.splice(i, 1);
                }
            }
        }
    }
    
    /**
     * Set tree opacity (handles different material types)
     * @param {THREE.Object3D} tree - The tree to update opacity for
     * @param {number} opacity - Opacity value (0-1)
     */
    setTreeOpacity(tree, opacity) {
        if (!tree) return;
        
        // Use a recursive approach to ensure all materials are updated
        const applyOpacityToObject = (object) => {
            // Apply to this object's material(s)
            if (object.material) {
                // Handle both single materials and material arrays
                if (Array.isArray(object.material)) {
                    // Handle material arrays (multi-material objects)
                    object.material.forEach(mat => {
                        mat.transparent = true;
                        mat.opacity = opacity;
                        mat.needsUpdate = true; // Ensure material updates are applied
                    });
                } else {
                    // Handle single material
                    object.material.transparent = true;
                    object.material.opacity = opacity;
                    object.material.needsUpdate = true; // Ensure material updates are applied
                }
            }
            
            // Recursively apply to all children
            if (object.children && object.children.length > 0) {
                object.children.forEach(child => applyOpacityToObject(child));
            }
        };
        
        // Apply opacity to the entire tree and its children
        applyOpacityToObject(tree);
    }
    
    /**
     * Begin the tree felling animation
     */
    fellTree() {
        if (!this.currentTree) return;
        
        console.log('Starting tree falling animation');
        
        // Create a felling data object for this tree
        const fellingData = {
            tree: this.currentTree,
            startTime: Date.now(),
            direction: Math.random() * Math.PI * 2, // Random direction
            originalRotation: this.currentTreeOriginalRotation.clone()
        };
        
        // Add to the felling trees array
        this.fellingTrees.push(fellingData);
        
        // Create extra wood chips for dramatic effect
        this.createWoodChipEffect(40, 1.5);
        
        // Make sure animation loop is running
        if (!this.animationFrameId) {
            this.lastAnimationTime = Date.now();
            this.startAnimationLoop();
        }
        
        // Reset state but allow felling animation to continue
        this.isChopping = false;
        this.chopCount = 0;
    }
    
    /**
     * Create wood chip particles when chopping
     * @param {number} count - Number of particles to create
     * @param {number} velocityMultiplier - Velocity multiplier for particles
     */
    createWoodChipEffect(count = 25, velocityMultiplier = 1.0) {
        if (!this.scene || !this.currentTree) return;
        
        // Extract world position of the tree
        const treePosition = new THREE.Vector3();
        this.currentTree.getWorldPosition(treePosition);
        
        // Create particle group
        const particles = new THREE.Group();
        particles.userData = {
            createdAt: Date.now()
        };
        
        // Determine the actual particle count
        const chipCount = count || (25 + Math.floor(Math.random() * 15));
        
        // Create wood chips
        for (let i = 0; i < chipCount; i++) {
            // Larger size for better visibility
            const size = 0.15 + Math.random() * 0.20;
            
            // Create different shaped wood chips for variety
            let geometry;
            const chipType = Math.floor(Math.random() * 3);
            
            switch(chipType) {
                case 0:
                    // Flat rectangle chip
                    geometry = new THREE.BoxGeometry(size, size / 4, size / 2);
                    break;
                case 1: 
                    // Cube-like chip
                    geometry = new THREE.BoxGeometry(size / 2, size / 2, size / 2);
                    break;
                case 2:
                default:
                    // Elongated chip
                    geometry = new THREE.BoxGeometry(size, size / 3, size / 3);
            }
            
            // More vibrant brown colors with variation
            const brownHue = 0.05 + Math.random() * 0.05; // 0.05-0.1 (orangish hue)
            const saturation = 0.6 + Math.random() * 0.4; // 0.6-1.0
            const lightness = 0.3 + Math.random() * 0.2;  // 0.3-0.5
            
            // Create a color object for our wood chip
            const chipColor = new THREE.Color().setHSL(brownHue, saturation, lightness);
            
            // Use a brighter, more visible material
            const material = new THREE.MeshBasicMaterial({
                color: chipColor,
                transparent: true,
                opacity: 1.0
            });
            
            const chip = new THREE.Mesh(geometry, material);
            
            // Set chip position at the tree trunk
            const angle = Math.random() * Math.PI * 2;
            const distanceFromCenter = Math.random() * 0.5;
            const chopHeight = 1.0 + Math.random() * 0.5;
            
            chip.position.set(
                treePosition.x + Math.cos(angle) * distanceFromCenter,
                treePosition.y + chopHeight,
                treePosition.z + Math.sin(angle) * distanceFromCenter
            );
            
            // Higher explosive velocity for more dramatic effect
            const horizontalSpeed = (5 + Math.random() * 7) * velocityMultiplier; 
            const verticalSpeed = (3 + Math.random() * 5) * velocityMultiplier;
            
            // Calculate directional vector from tree center outward
            const direction = new THREE.Vector3(
                Math.cos(angle),
                0.3 + Math.random() * 0.5, // More upward tendency 
                Math.sin(angle)
            ).normalize();
            
            // Create velocity vector with stronger impulse
            const velocity = direction.clone().multiplyScalar(horizontalSpeed);
            velocity.y += verticalSpeed; // Add upward component
            
            // Add more rotation for realism
            const rotationSpeed = 8 + Math.random() * 20; // Faster rotation
            
            chip.userData = {
                velocity: velocity,
                lifetime: 0,
                maxLifetime: 1.2 + Math.random() * 0.8, // Longer lifetime for visibility
                rotationSpeed: new THREE.Vector3(
                    Math.random() * rotationSpeed, 
                    Math.random() * rotationSpeed, 
                    Math.random() * rotationSpeed
                )
            };
            
            // Add to group
            particles.add(chip);
        }
        
        // Add particles to scene and tracking
        this.scene.add(particles);
        this.woodChipParticles.push(particles);
        
        // Make sure the animation loop continues while particles are active
        if (!this.animationFrameId) {
            this.startAnimationLoop();
        }
    }
    
    /**
     * Update all wood chip particles
     */
    updateParticles() {
        if (this.woodChipParticles.length === 0) return;
        
        const now = Date.now();
        
        // Process each particle group
        for (let p = this.woodChipParticles.length - 1; p >= 0; p--) {
            const particles = this.woodChipParticles[p];
            let allExpired = true;
            
            // Process each chip in group
            for (let i = particles.children.length - 1; i >= 0; i--) {
                const chip = particles.children[i];
                
                // Use a consistent delta time for stability
                const delta = 0.016; // ~60fps
                
                // Update lifetime
                chip.userData.lifetime += delta;
                
                // Check if expired
                if (chip.userData.lifetime >= chip.userData.maxLifetime) {
                    // Remove particle
                    particles.remove(chip);
                    chip.geometry.dispose();
                    chip.material.dispose();
                } else {
                    allExpired = false;
                    
                    // Update position based on velocity
                    const velocityDelta = chip.userData.velocity.clone().multiplyScalar(delta);
                    chip.position.x += velocityDelta.x;
                    chip.position.y += velocityDelta.y;
                    chip.position.z += velocityDelta.z;
                    
                    // Apply gravity
                    chip.userData.velocity.y -= 12.0 * delta;
                    
                    // Add rotation
                    chip.rotation.x += chip.userData.rotationSpeed.x * delta;
                    chip.rotation.y += chip.userData.rotationSpeed.y * delta;
                    chip.rotation.z += chip.userData.rotationSpeed.z * delta;
                    
                    // Fade out
                    const fadeProgress = chip.userData.lifetime / chip.userData.maxLifetime;
                    const fadeThreshold = 0.7; 
                    const opacity = fadeProgress < fadeThreshold ? 
                        1.0 : // Full opacity until threshold
                        1.0 - ((fadeProgress - fadeThreshold) / (1 - fadeThreshold)); // Then fade out
                        
                    chip.material.opacity = opacity;
                }
            }
            
            // Remove group if all particles expired
            if (allExpired) {
                this.scene.remove(particles);
                this.woodChipParticles.splice(p, 1);
            }
        }
    }
    
    /**
     * Check all felled trees to see if they should respawn
     */
    checkTreeRespawns() {
        if (this.felledTrees.size === 0) return;
        
        const currentTime = Date.now();
        
        // Check each felled tree
        this.felledTrees.forEach((respawnTime, treeId) => {
            if (currentTime >= respawnTime) {
                // Time to respawn this tree
                console.log(`Tree ${treeId} should respawn`);
                
                // Find the tree in the scene by UUID
                const tree = this.findTreeById(treeId);
                
                if (tree) {
                    // Reset the tree to its original state
                    tree.visible = true;
                    tree.rotation.copy(new THREE.Euler()); // Reset rotation
                    
                    // Reset all materials and make sure they're visible
                    this.resetTreeMaterials(tree);
                    
                    console.log(`Tree ${treeId} successfully respawned and made visible`);
                    
                    // Remove from felled trees map
                    this.felledTrees.delete(treeId);
                }
            }
        });
    }
    
    /**
     * Find a tree in the scene by UUID
     * @param {string} treeId - UUID of the tree to find
     * @returns {THREE.Object3D} - The tree object or null
     */
    findTreeById(treeId) {
        let foundTree = null;
        
        // Helper function to recursively search the scene
        const searchScene = (object) => {
            if (object.uuid === treeId) {
                foundTree = object;
                return true;
            }
            
            if (object.children) {
                for (const child of object.children) {
                    if (searchScene(child)) {
                        return true;
                    }
                }
            }
            
            return false;
        };
        
        // Start search from scene root
        if (this.scene) {
            searchScene(this.scene);
        }
        
        return foundTree;
    }
    
    /**
     * Reset a tree's materials to fully opaque and visible
     * @param {THREE.Object3D} tree - The tree to reset
     */
    resetTreeMaterials(tree) {
        if (!tree) return;
        
        // Function to recursively reset materials on an object and its children
        const resetMaterialsRecursive = (object) => {
            // If this object has a material
            if (object.material) {
                if (Array.isArray(object.material)) {
                    // Handle material arrays
                    object.material.forEach(mat => {
                        mat.transparent = false;
                        mat.opacity = 1.0;
                        mat.visible = true;
                        mat.needsUpdate = true;
                    });
                } else {
                    // Handle single material
                    object.material.transparent = false;
                    object.material.opacity = 1.0;
                    object.material.visible = true;
                    object.material.needsUpdate = true;
                }
            }
            
            // Object itself should be visible
            object.visible = true;
            
            // Process children recursively
            if (object.children && object.children.length > 0) {
                object.children.forEach(child => resetMaterialsRecursive(child));
            }
        };
        
        // Apply to the entire tree hierarchy
        resetMaterialsRecursive(tree);
    }
    
    /**
     * Show notification about tree chopping
     * @param {string} message - Message to display
     * @param {string} type - Notification type (error, success, info)
     */
    showNotification(message, type = 'info') {
        if (this.notificationElement) {
            this.notificationElement.textContent = message;
            this.notificationElement.style.display = 'block';
            
            // Apply styling based on notification type
            if (type === 'error') {
                this.notificationElement.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
                this.notificationElement.style.color = 'white';
            } else if (type === 'success') {
                this.notificationElement.style.backgroundColor = 'rgba(0, 120, 0, 0.8)';
                this.notificationElement.style.color = 'white';
            } else {
                // Default info styling
                this.notificationElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                this.notificationElement.style.color = '#fff';
            }
            
            // Auto-hide after a few seconds
            setTimeout(() => {
                this.notificationElement.style.display = 'none';
            }, type === 'error' ? 5000 : 3000);
        }
    }
    
    /**
     * Update method to be called on each animation frame
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        // Check for tree respawns
        this.checkTreeRespawns();
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Stop chopping if active
        if (this.isChopping) {
            this.stopChopping();
        }
        
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Clean up particle effects
        this.woodChipParticles.forEach(particles => {
            if (particles && this.scene) {
                this.scene.remove(particles);
                
                // Dispose of geometries and materials
                particles.children.forEach(chip => {
                    chip.geometry.dispose();
                    chip.material.dispose();
                });
            }
        });
        this.woodChipParticles = [];
        
        // Remove UI elements
        if (this.cooldownContainer && this.cooldownContainer.parentNode) {
            this.cooldownContainer.parentNode.removeChild(this.cooldownContainer);
        }
        
        if (this.choppingUI && this.choppingUI.parentNode) {
            this.choppingUI.parentNode.removeChild(this.choppingUI);
        }
        
        if (this.notificationElement && this.notificationElement.parentNode) {
            this.notificationElement.parentNode.removeChild(this.notificationElement);
        }
    }
}

export default ChopTree; 