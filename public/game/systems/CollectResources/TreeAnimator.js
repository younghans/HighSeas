/**
 * TreeAnimator.js - Handles tree animations during wood gathering
 * Finds trees on islands, shakes them during chopping, and creates wood chip effects
 */
import * as THREE from 'three';

class TreeAnimator {
    /**
     * Create a new TreeAnimator
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Dependencies
        this.scene = options.scene || null;
        this.islandLoader = options.islandLoader || null;
        
        // Tree finding settings
        this.treeTypes = ['firTreeLarge', 'firTreeMedium', 'firTreeSmall', 'palmTreeLarge', 'palmTreeBent'];
        
        // Animation settings
        this.defaultShakeAmount = 0.05;  // Default max rotation in radians
        this.shakeAmount = this.defaultShakeAmount;  // Current shake amount (can be changed temporarily)
        this.shakeSpeed = 15;     // Oscillations per second
        this.returnSpeed = 2;     // Speed to return to original position
        
        // Current state
        this.currentIsland = null;
        this.islandTrees = [];
        this.currentTree = null;
        this.currentTreeOriginalRotation = new THREE.Euler();
        this.isAnimating = false;
        this.woodChipParticles = [];
        
        // Animation tracking
        this.animationFrameId = null;
        this.lastAnimationTime = 0;
        this.shakeStartTime = 0;
        
        // Tree felling state
        this.fellingTree = false;
        this.fellingStartTime = 0;
        this.fellingProgress = 0;
        this.fellingDuration = 1500; // 1.5 seconds to fall
        this.resetDuration = 1000;   // 1 second to reset
        this.fallDirection = 0;      // Direction the tree falls in radians
        
        // Debug
        this.debug = true;
    }
    
    /**
     * Find all trees on a specific island
     * @param {Object} island - The island object to find trees on
     * @returns {Array} - Array of tree objects found on the island
     */
    findTreesOnIsland(island) {
        if (!island) {
            this.debugLog('No island provided to findTreesOnIsland');
            return [];
        }
        
        this.debugLog(`Finding trees on island: ${island.metadata ? island.metadata.name : 'Unknown Island'}`);
        
        // Store reference to current island
        this.currentIsland = island;
        
        // Clean up any previous tree references
        this.islandTrees = [];
        
        // Find trees in the island mesh children (reliable method)
        if (island.mesh && island.mesh.children) {
            // Scan all children for trees
            let treesFound = this.scanForTreesInObject(island.mesh);
            
            this.islandTrees = treesFound;
            this.debugLog(`Found ${treesFound.length} trees in island mesh children`);
            
            // Log tree types for debugging
            if (treesFound.length > 0) {
                const typeCounts = {};
                treesFound.forEach(tree => {
                    if (!typeCounts[tree.type]) typeCounts[tree.type] = 0;
                    typeCounts[tree.type]++;
                });
                
                Object.entries(typeCounts).forEach(([type, count]) => {
                    this.debugLog(`- ${type}: ${count}`);
                });
            }
            
            return treesFound;
        }
        
        this.debugLog('No island mesh found, unable to locate trees');
        return [];
    }
    
    /**
     * Recursively scan an object and its children for trees
     * @param {THREE.Object3D} object - The object to scan
     * @returns {Array} - Array of tree objects found
     */
    scanForTreesInObject(object) {
        const trees = [];
        
        // Check this object itself
        if (object.userData && object.userData.type && 
            this.treeTypes.includes(object.userData.type)) {
            trees.push({
                object: object,
                type: object.userData.type
            });
        }
        
        // Check all children
        if (object.children && object.children.length > 0) {
            for (const child of object.children) {
                // Handle the object groups rotation for islands
                if (child.rotation.x === Math.PI / 2) {
                    // This is likely the objects group created in IslandLoader
                    for (const objInGroup of child.children) {
                        // Check if this is a tree
                        if (objInGroup.userData && objInGroup.userData.type && 
                            this.treeTypes.includes(objInGroup.userData.type)) {
                            trees.push({
                                object: objInGroup,
                                type: objInGroup.userData.type
                            });
                        }
                    }
                } else {
                    // Otherwise check this child and its descendants
                    const childTrees = this.scanForTreesInObject(child);
                    trees.push(...childTrees);
                }
            }
        }
        
        return trees;
    }
    
    /**
     * Select a random tree to animate
     * @returns {Object|null} - The selected tree or null if none available
     */
    selectRandomTree() {
        if (!this.islandTrees || this.islandTrees.length === 0) {
            this.debugLog('No trees available to select');
            return null;
        }
        
        // Choose a random tree
        const randomIndex = Math.floor(Math.random() * this.islandTrees.length);
        const selectedTree = this.islandTrees[randomIndex];
        
        this.debugLog(`Selected random tree of type: ${selectedTree.type}`);
        
        // Store reference to current tree
        this.currentTree = selectedTree;
        
        // Get and store the original rotation
        if (selectedTree.object) {
            this.currentTreeOriginalRotation.copy(selectedTree.object.rotation);
        }
        
        return selectedTree;
    }
    
    /**
     * Animate a tree shake when chopping sounds play
     */
    animateTreeShake() {
        if (!this.currentTree || !this.currentTree.object) {
            this.debugLog('No current tree to animate');
            return;
        }
        
        // Get tree object
        const treeObj = this.currentTree.object;
        
        // Create a shake animation
        this.isAnimating = true;
        this.lastAnimationTime = Date.now();
        this.shakeStartTime = Date.now();
        
        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this.startAnimationLoop();
        }
        
        // Create wood chip particles
        this.createWoodChipEffect(treeObj);
        
        // Set a timer to stop the active shaking after a short duration
        // This ensures the shake doesn't continue indefinitely
        setTimeout(() => {
            // Set isAnimating to false to begin the return to original position
            this.isAnimating = false;
            this.debugLog('Ending active shake phase, beginning return to original position');
        }, 400); // 400ms of active shaking per chop
    }
    
    /**
     * Start the animation loop
     */
    startAnimationLoop() {
        const animate = () => {
            // Continue animation if we're actively shaking OR if we have particles OR we're felling a tree
            const shouldContinue = this.isAnimating || this.woodChipParticles.length > 0 || this.fellingTree;
            
            if (!shouldContinue) {
                this.debugLog('Animation complete, stopping animation loop');
                this.animationFrameId = null;
                return;
            }
            
            // Update tree animation and particles
            this.updateTreeAnimation();
            this.updateParticles();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }
    
    /**
     * Update tree shaking animation
     */
    updateTreeAnimation() {
        if (!this.currentTree || !this.currentTree.object) return;
        
        const treeObj = this.currentTree.object;
        const now = Date.now();
        const deltaTime = (now - this.lastAnimationTime) / 1000; // In seconds
        this.lastAnimationTime = now;
        
        // Handle tree felling animation
        if (this.fellingTree) {
            const timeSinceFellingStart = now - this.fellingStartTime;
            
            // Calculate felling progress (0 to 1)
            if (timeSinceFellingStart <= this.fellingDuration) {
                // Falling phase (0 to 1)
                const previousProgress = this.fellingProgress;
                this.fellingProgress = Math.min(1, timeSinceFellingStart / this.fellingDuration);
                
                // Create extra wood chips when the tree hits the ground (around 50% through animation)
                if (previousProgress < 0.5 && this.fellingProgress >= 0.5) {
                    this.debugLog('Tree hitting ground, creating impact wood chips');
                    // Create a larger burst of chips for dramatic effect
                    this.createWoodChipEffect(treeObj, { count: 40, velocityMultiplier: 1.5 });
                }
                
                // Use easeOutQuad for a natural fall (accelerate then slow at end)
                const easeOut = function(t) { return t * (2 - t); };
                const easedProgress = easeOut(this.fellingProgress);
                
                // Calculate fall rotation - topple the tree sideways
                // Pick a random fall direction when we start felling
                if (this.fellingProgress === 0) {
                    this.fallDirection = Math.random() * Math.PI * 2; // Random direction
                    this.debugLog(`Tree falling in direction: ${(this.fallDirection * 180 / Math.PI).toFixed(0)} degrees`);
                }
                
                // Determine fall direction vector
                const fallDirectionX = Math.cos(this.fallDirection);
                const fallDirectionZ = Math.sin(this.fallDirection);
                
                // Maximum tilt is 80 degrees (not fully flat to look more natural)
                const maxTiltRadians = 80 * (Math.PI / 180);
                
                // Apply rotation based on fall direction
                treeObj.rotation.set(
                    this.currentTreeOriginalRotation.x + fallDirectionX * easedProgress * maxTiltRadians,
                    this.currentTreeOriginalRotation.y, // Keep Y rotation (around up axis) the same
                    this.currentTreeOriginalRotation.z + fallDirectionZ * easedProgress * maxTiltRadians
                );
                
                // Add some shaking during the first part of the fall
                if (this.fellingProgress < 0.4) {
                    const shakeIntensity = 0.15 * (1 - this.fellingProgress / 0.4); // Fade out shake
                    const shake = Math.sin(now * 0.02 * this.shakeSpeed) * shakeIntensity;
                    
                    treeObj.rotation.x += shake * 0.2;
                    treeObj.rotation.y += shake * 0.3; // Little twist
                    treeObj.rotation.z += shake * 0.2;
                }
            } 
            else if (timeSinceFellingStart <= this.fellingDuration + this.resetDuration) {
                // Reset phase - tree magically stands back up
                const resetProgress = (timeSinceFellingStart - this.fellingDuration) / this.resetDuration;
                
                // Use easeInOutCubic for a smooth reset
                const easeInOut = function(t) { 
                    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; 
                };
                const easedResetProgress = easeInOut(resetProgress);
                
                // Determine fall direction vector (same as during fall)
                const fallDirectionX = Math.cos(this.fallDirection);
                const fallDirectionZ = Math.sin(this.fallDirection);
                
                // Maximum tilt is 80 degrees (not fully flat to look more natural)
                const maxTiltRadians = 80 * (Math.PI / 180);
                
                // Gradually return to original rotation (1 - resetProgress means go from fallen to upright)
                treeObj.rotation.set(
                    this.currentTreeOriginalRotation.x + fallDirectionX * maxTiltRadians * (1 - easedResetProgress),
                    this.currentTreeOriginalRotation.y, // Keep Y rotation (around up axis) the same
                    this.currentTreeOriginalRotation.z + fallDirectionZ * maxTiltRadians * (1 - easedResetProgress)
                );
            } 
            else {
                // Animation complete
                this.fellingTree = false;
                treeObj.rotation.copy(this.currentTreeOriginalRotation);
                this.debugLog('Tree felling animation complete');
            }
        }
        // Regular shake animation (when not felling)
        else if (this.isAnimating) {
            // Calculate shake progress (0 to 1) over the shake duration
            const shakeDuration = 400; // 400ms of shaking per chop
            const shakeProgress = Math.min(1, (now - this.shakeStartTime) / shakeDuration);
            
            // More intense at the beginning, less at the end for natural taper-off
            const intensityFactor = 1 - shakeProgress * 0.7;
            
            // Apply shake effect - more rapid oscillation
            const shake = Math.sin(now * 0.02 * this.shakeSpeed) * this.shakeAmount * intensityFactor;
            
            // Apply shake to all axes with different intensities
            treeObj.rotation.x = this.currentTreeOriginalRotation.x + shake * 0.2;
            treeObj.rotation.y = this.currentTreeOriginalRotation.y + shake * 1.2; // Stronger on Y-axis
            treeObj.rotation.z = this.currentTreeOriginalRotation.z + shake * 0.5;
        } else {
            // Gradually return to original rotation
            treeObj.rotation.x += (this.currentTreeOriginalRotation.x - treeObj.rotation.x) * this.returnSpeed * deltaTime;
            treeObj.rotation.y += (this.currentTreeOriginalRotation.y - treeObj.rotation.y) * this.returnSpeed * deltaTime;
            treeObj.rotation.z += (this.currentTreeOriginalRotation.z - treeObj.rotation.z) * this.returnSpeed * deltaTime;
            
            // Check if we're close enough to the original rotation
            const isCloseToOriginal = 
                Math.abs(treeObj.rotation.x - this.currentTreeOriginalRotation.x) < 0.001 &&
                Math.abs(treeObj.rotation.y - this.currentTreeOriginalRotation.y) < 0.001 &&
                Math.abs(treeObj.rotation.z - this.currentTreeOriginalRotation.z) < 0.001;
            
            if (isCloseToOriginal) {
                // Stop animation completely once we've returned to original position
                treeObj.rotation.copy(this.currentTreeOriginalRotation);
                
                // Stop the animation loop if we don't need it anymore
                if (this.woodChipParticles.length === 0 && !this.fellingTree) {
                    this.debugLog('Tree returned to original position, stopping animation loop');
                    if (this.animationFrameId) {
                        cancelAnimationFrame(this.animationFrameId);
                        this.animationFrameId = null;
                    }
                }
            }
        }
    }
    
    /**
     * Create wood chip particles when chopping
     * @param {THREE.Object3D} treeObj - The tree object being chopped
     * @param {Object} options - Optional settings for the particle effect
     */
    createWoodChipEffect(treeObj, options = {}) {
        if (!this.scene || !treeObj) return;
        
        // Extract world position of the tree
        const treePosition = new THREE.Vector3();
        treeObj.getWorldPosition(treePosition);
        
        // Debug the tree world position to verify coordinates
        this.debugLog(`Tree world position: ${treePosition.x.toFixed(2)}, ${treePosition.y.toFixed(2)}, ${treePosition.z.toFixed(2)}`);
        
        // Create particle group
        const particles = new THREE.Group();
        particles.userData = {
            createdAt: Date.now()
        };
        
        // Get options with defaults
        const chipCount = options.count || (25 + Math.floor(Math.random() * 15));
        const velocityMultiplier = options.velocityMultiplier || 1.0;
        
        this.debugLog(`Creating ${chipCount} wood chip particles at tree position`);
        
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
            const brownHue = 0.05 + Math.random() * 0.05; // 0.05-0.1 (red-orangeish hue)
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
            
            // Position closer to the tree trunk for better visibility
            // Determine tree size to better position the particles
            let trunkHeight = 2; // Default trunk height estimate
            let trunkRadius = 0.5; // Default trunk radius estimate
            
            // Adjust based on tree type if available
            if (this.currentTree && this.currentTree.type) {
                if (this.currentTree.type.includes('Large')) {
                    trunkHeight = 3;
                    trunkRadius = 0.7;
                } else if (this.currentTree.type.includes('Small')) {
                    trunkHeight = 1;
                    trunkRadius = 0.3;
                }
            }
            
            // Generate explosion angle - full 360 degrees around the tree
            const angle = Math.random() * Math.PI * 2;
            
            // For ground impact, spread particles out a bit more
            const distanceFromCenter = options.count ? 
                Math.random() * trunkRadius * 2 : // Ground impact - wider spread
                Math.random() * (trunkRadius * 0.5); // Regular chop - closer to trunk
            
            // Height at chopping point - at the base of the trunk
            // For ground impact, position lower to look like it's coming from ground contact point
            const chopHeight = options.count ? 
                0.5 + Math.random() * 0.3 : // Ground impact - lower position
                1.0 + Math.random() * 0.5;  // Regular chop - higher on trunk
            
            // Set chip position at the tree trunk
            chip.position.set(
                treePosition.x + Math.cos(angle) * distanceFromCenter,
                treePosition.y + chopHeight,
                treePosition.z + Math.sin(angle) * distanceFromCenter
            );
            
            // Debug one particle position to verify
            if (i === 0) {
                this.debugLog(`First particle initial position: ${chip.position.x.toFixed(2)}, ${chip.position.y.toFixed(2)}, ${chip.position.z.toFixed(2)}`);
            }
            
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
                initialPosition: chip.position.clone(), // Store initial position for debugging
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
        
        this.debugLog(`Created ${chipCount} wood chip particles`);
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
            let activeParticles = 0;
            
            // Track the first particle for debugging
            let firstParticleTracked = false;
            
            // Process each chip in group
            for (let i = particles.children.length - 1; i >= 0; i--) {
                const chip = particles.children[i];
                
                // Use a consistent delta time for stability
                const delta = 0.016; // ~60fps, about 16ms
                
                // Update lifetime
                chip.userData.lifetime += delta;
                
                // Check if expired
                if (chip.userData.lifetime >= chip.userData.maxLifetime) {
                    // Remove particle
                    particles.remove(chip);
                    chip.geometry.dispose();
                    chip.material.dispose();
                } else {
                    activeParticles++;
                    
                    // Debug first particle position/movement
                    if (!firstParticleTracked && i === 0 && Math.random() < 0.05) { // 5% chance to log
                        const initialPos = chip.userData.initialPosition;
                        const currentPos = chip.position;
                        const distance = initialPos.distanceTo(currentPos);
                        
                        this.debugLog(`Particle movement - Initial: (${initialPos.x.toFixed(1)}, ${initialPos.y.toFixed(1)}, ${initialPos.z.toFixed(1)}), ` +
                            `Current: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)}), ` +
                            `Distance traveled: ${distance.toFixed(1)}, ` +
                            `Velocity: (${chip.userData.velocity.x.toFixed(1)}, ${chip.userData.velocity.y.toFixed(1)}, ${chip.userData.velocity.z.toFixed(1)})`);
                        
                        firstParticleTracked = true;
                    }
                    
                    // Apply explicitly-calculated position change rather than using add()
                    // This ensures the position actually changes
                    const velocityDelta = chip.userData.velocity.clone().multiplyScalar(delta);
                    chip.position.x += velocityDelta.x;
                    chip.position.y += velocityDelta.y;
                    chip.position.z += velocityDelta.z;
                    
                    // Apply gravity - slightly reduced for better visual effect
                    chip.userData.velocity.y -= 12.0 * delta;
                    
                    // Add rotation - scaled by delta for consistency
                    chip.rotation.x += chip.userData.rotationSpeed.x * delta;
                    chip.rotation.y += chip.userData.rotationSpeed.y * delta;
                    chip.rotation.z += chip.userData.rotationSpeed.z * delta;
                    
                    // Fade out
                    const fadeProgress = chip.userData.lifetime / chip.userData.maxLifetime;
                    
                    // Keep opacity higher for longer, then fade quickly at the end
                    const fadeThreshold = 0.7; 
                    const opacity = fadeProgress < fadeThreshold ? 
                        1.0 : // Full opacity until threshold
                        1.0 - ((fadeProgress - fadeThreshold) / (1 - fadeThreshold)); // Then fade out
                        
                    chip.material.opacity = opacity;
                    
                    allExpired = false;
                }
            }
            
            // Remove group if all particles expired
            if (allExpired) {
                this.scene.remove(particles);
                this.woodChipParticles.splice(p, 1);
                this.debugLog(`Removed expired particle group, ${this.woodChipParticles.length} groups remaining`);
            } else if (activeParticles > 0 && Math.random() < 0.02) { // 2% chance to log
                this.debugLog(`Particle group ${p+1}/${this.woodChipParticles.length} has ${activeParticles} active particles`);
            }
        }
    }
    
    /**
     * Process the wood collection event
     * @param {Object} island - The island where wood is being collected
     */
    processWoodCollection(island) {
        // Find trees on the island if needed
        if (!this.currentIsland || this.currentIsland !== island) {
            const trees = this.findTreesOnIsland(island);
            
            if (trees.length === 0) {
                this.debugLog('No trees found on the island for collection');
                return;
            }
        }
        
        // Select a new random tree for the collection cycle
        this.selectRandomTree();
        
        // Instead of just shaking, topple the tree over when wood is collected
        this.fellingTree = true;
        this.fellingStartTime = Date.now();
        this.fellingProgress = 0;
        this.fellingDuration = 1500; // 1.5 seconds to fall
        this.resetDuration = 1000;   // 1 second to reset
        
        // Create a stronger shake effect initially
        this.shakeAmount = 0.15;
        
        this.debugLog('Performing tree felling animation for wood collection');
        this.animateTreeShake();
        
        // Reset shake amount back to normal after shake is complete
        setTimeout(() => {
            this.shakeAmount = this.defaultShakeAmount;
            this.debugLog('Reset shake amount to default');
        }, 300);
    }
    
    /**
     * Process the axe chop sound
     * @param {Object} island - The island where wood is being collected
     */
    processChopSound(island) {
        // Make sure we have trees from the island
        if (!this.currentIsland || this.currentIsland !== island) {
            const trees = this.findTreesOnIsland(island);
            
            if (trees.length === 0) {
                this.debugLog('No trees found on the island for chopping');
                return;
            }
        }
        
        // If no tree is selected, choose one
        if (!this.currentTree) {
            this.selectRandomTree();
        }
        
        // Animate the tree shake
        this.animateTreeShake();
    }
    
    /**
     * Debug log helper
     * @param {string} message - Message to log
     */
    debugLog(message) {
        if (this.debug) {
            console.log(`[TreeAnimator] ${message}`);
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Stop animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Clean up any remaining particles
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
        this.islandTrees = [];
        this.currentTree = null;
        this.currentIsland = null;
        this.isAnimating = false;
    }
}

export default TreeAnimator; 