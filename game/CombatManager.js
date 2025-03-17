import * as THREE from 'three';

/**
 * CombatManager class for handling ship combat mechanics
 */
class CombatManager {
    /**
     * Create a new CombatManager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.playerShip = options.playerShip || null;
        this.enemyShipManager = options.enemyShipManager || null;
        this.ui = options.ui || null;
        this.scene = options.scene || null;
        this.camera = options.camera || null;
        this.combatService = options.combatService || null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentTarget = null;
        this.cannonballSpeed = 50; // Units per second
        this.cannonballs = [];
        this.cannonballMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.cannonballGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        this.cannonballLifetime = 3000; // 3 seconds
        this.isSpacePressed = false;
        this.autoFireInterval = null;
        this.isResetting = false;
        this.debugArrows = [];
        
        // Bind methods
        this.handleMouseClick = this.handleMouseClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.update = this.update.bind(this);
        this.fireCannonball = this.fireCannonball.bind(this);
        this.resetPlayerShip = this.resetPlayerShip.bind(this);
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Add mouse click listener for target selection
        document.addEventListener('click', this.handleMouseClick);
        
        // Add keyboard listeners for firing cannons
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }
    
    /**
     * Handle mouse click for target selection
     * @param {MouseEvent} event - Mouse click event
     */
    handleMouseClick(event) {
        // Skip if no player ship, enemy manager, or UI
        if (!this.playerShip || !this.enemyShipManager || !this.ui || !this.camera || !this.scene) return;
        
        // Skip if player ship is sunk
        if (this.playerShip.isSunk) return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all enemy ships
        const enemyShips = this.enemyShipManager.getEnemyShips();
        const shipObjects = enemyShips.map(ship => ship.getObject()).filter(obj => obj !== null);
        
        // Check for intersections with enemy ships
        const intersects = this.raycaster.intersectObjects(shipObjects, true);
        
        if (intersects.length > 0) {
            // Find the enemy ship that was clicked
            const clickedMesh = intersects[0].object;
            let clickedShip = null;
            
            // Find the ship that owns this mesh
            for (const ship of enemyShips) {
                if (!ship.shipMesh) continue;
                
                // Check if the clicked mesh is part of this ship
                if (ship.shipMesh === clickedMesh || ship.shipMesh.children.includes(clickedMesh)) {
                    clickedShip = ship;
                    break;
                }
            }
            
            // If we found a ship and it's not sunk, set it as the target
            if (clickedShip && !clickedShip.isSunk) {
                this.setTarget(clickedShip);
                return true; // Indicate that we handled the click
            }
        }
        
        return false; // Indicate that we didn't handle the click
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event - Key down event
     */
    handleKeyDown(event) {
        // Skip if no player ship or player ship is sunk
        if (!this.playerShip || this.playerShip.isSunk) return;
        
        // Check for space bar to fire cannons
        if (event.code === 'Space' && !this.isSpacePressed) {
            this.isSpacePressed = true;
            
            // Fire immediately
            this.fireAtCurrentTarget();
            
            // Set up auto-fire interval
            this.autoFireInterval = setInterval(() => {
                this.fireAtCurrentTarget();
            }, this.playerShip.cannonCooldown);
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} event - Key up event
     */
    handleKeyUp(event) {
        // Check for space bar release
        if (event.code === 'Space') {
            this.isSpacePressed = false;
            
            // Clear auto-fire interval
            if (this.autoFireInterval) {
                clearInterval(this.autoFireInterval);
                this.autoFireInterval = null;
            }
        }
    }
    
    /**
     * Set the current target
     * @param {BaseShip} ship - The ship to target
     */
    setTarget(ship) {
        this.currentTarget = ship;
        
        // Clean up debug arrows if target is cleared
        if (!ship && this.debugArrows && this.debugArrows.length > 0) {
            this.cleanupDebugArrows();
        }
        
        // Update UI if available
        if (this.ui) {
            this.ui.setTarget(ship);
        }
    }
    
    /**
     * Clean up debug arrows
     */
    cleanupDebugArrows() {
        if (this.scene && this.debugArrows) {
            this.debugArrows.forEach(arrow => {
                if (arrow) {
                    this.scene.remove(arrow);
                    if (arrow.geometry) arrow.geometry.dispose();
                    if (arrow.material) arrow.material.dispose();
                }
            });
            this.debugArrows = [];
        }
    }
    
    /**
     * Fire a cannonball from source to target
     * @param {BaseShip} source - Source ship
     * @param {BaseShip} target - Target ship
     * @param {number} damage - Damage amount (0 for miss)
     * @param {boolean} isMiss - Whether this shot is a miss
     */
    fireCannonball(source, target, damage, isMiss = false) {
        // Skip if no scene
        if (!this.scene) return;
        
        // Create cannonball mesh
        const cannonball = new THREE.Mesh(this.cannonballGeometry, this.cannonballMaterial);
        
        // Set initial position (slightly above source ship)
        const sourcePos = source.getPosition().clone();
        sourcePos.y += 2; // Raise above the deck
        cannonball.position.copy(sourcePos);
        
        // Calculate direction to target
        const targetPos = target.getPosition().clone();
        targetPos.y += 2; // Aim above the deck
        
        // For hits, predict where the target will be when the cannonball arrives
        let predictedTargetPos = targetPos.clone();
        if (!isMiss && target.isMoving) {
            // Calculate distance and time to reach target
            const distanceToTarget = sourcePos.distanceTo(targetPos);
            const timeToReach = distanceToTarget / this.cannonballSpeed;
            
            // If target has a targetPosition, use it to predict movement
            if (target.targetPosition) {
                // Calculate target's velocity vector
                const targetVelocity = new THREE.Vector3();
                targetVelocity.subVectors(target.targetPosition, targetPos)
                    .normalize()
                    .multiplyScalar(target.speed);
                
                // Predict future position
                predictedTargetPos.add(
                    targetVelocity.clone().multiplyScalar(timeToReach * 0.8) // 80% prediction to avoid overshooting
                );
                predictedTargetPos.y = targetPos.y; // Keep the same height
            }
        }
        
        // For misses, add a random offset to make it fly past the target
        let missOffset = new THREE.Vector3(0, 0, 0);
        let adjustedTargetPos;
        
        if (isMiss) {
            // Random offset perpendicular to the direction
            const randomAngle = Math.random() * Math.PI * 2;
            const offsetAmount = 5 + Math.random() * 5; // 5-10 units offset
            missOffset.set(
                Math.cos(randomAngle) * offsetAmount,
                (Math.random() - 0.5) * 3, // Slight vertical miss
                Math.sin(randomAngle) * offsetAmount
            );
            
            // Apply miss offset to target position
            adjustedTargetPos = targetPos.clone().add(missOffset);
        } else {
            // For hits, use the predicted position
            adjustedTargetPos = predictedTargetPos;
        }
        
        // Calculate direction
        const direction = new THREE.Vector3()
            .subVectors(adjustedTargetPos, sourcePos)
            .normalize();
        
        // Add cannonball data
        cannonball.userData = {
            direction: direction,
            speed: this.cannonballSpeed,
            damage: damage,
            source: source,
            target: target,
            createdAt: Date.now(),
            isMiss: isMiss,
            targetPosition: isMiss ? adjustedTargetPos : predictedTargetPos.clone(),
            hasHit: false,
            initialTargetPos: targetPos.clone(), // Store initial target position
            predictedPos: predictedTargetPos.clone() // Store predicted position for debugging
        };
        
        // Add to scene and cannonballs array
        this.scene.add(cannonball);
        this.cannonballs.push(cannonball);
        
        // Play cannon fire sound (if available)
        // TODO: Add sound effects
    }
    
    /**
     * Create hit effect at the impact point
     * @param {THREE.Vector3} position - Position of the impact
     */
    createHitEffect(position) {
        // Create explosion geometry
        const particleCount = 30; // Increased from 20 to 30
        const particles = new THREE.Group();
        
        // Create individual particles
        for (let i = 0; i < particleCount; i++) {
            // Create particle geometry - mix of shapes for more variety
            const size = 0.2 + Math.random() * 0.4; // Slightly larger particles
            
            // Use different geometries for variety
            let geometry;
            const shapeType = Math.floor(Math.random() * 3);
            if (shapeType === 0) {
                geometry = new THREE.BoxGeometry(size, size, size);
            } else if (shapeType === 1) {
                geometry = new THREE.SphereGeometry(size * 0.6, 6, 6);
            } else {
                geometry = new THREE.TetrahedronGeometry(size * 0.7);
            }
            
            // Create particle material with more varied colors
            const colorChoice = Math.random();
            let color;
            if (colorChoice < 0.4) {
                color = 0xFF5500; // Orange
            } else if (colorChoice < 0.7) {
                color = 0xFF0000; // Red
            } else if (colorChoice < 0.9) {
                color = 0xFFCC00; // Yellow
            } else {
                color = 0x333333; // Dark smoke
            }
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });
            
            // Create particle mesh
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at impact point with slight random offset
            particle.position.copy(position).add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5
                )
            );
            
            // Add random velocity - more explosive
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 8,
                (Math.random() - 0.5) * 15
            );
            
            // Add particle data
            particle.userData = {
                velocity: velocity,
                lifetime: 0,
                maxLifetime: 0.5 + Math.random() * 0.7, // Longer lifetime for some particles
                rotationSpeed: new THREE.Vector3(
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                )
            };
            
            // Add to group
            particles.add(particle);
        }
        
        // Add smoke particles
        for (let i = 0; i < 10; i++) {
            const size = 0.5 + Math.random() * 0.8;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.4 + Math.random() * 0.2
            });
            
            const smoke = new THREE.Mesh(geometry, material);
            smoke.position.copy(position).add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 1,
                    (Math.random() - 0.5) * 2
                )
            );
            
            // Slower velocity for smoke
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                2 + Math.random() * 3,
                (Math.random() - 0.5) * 5
            );
            
            smoke.userData = {
                velocity: velocity,
                lifetime: 0,
                maxLifetime: 1 + Math.random() * 1, // Longer lifetime for smoke
                isSmoke: true,
                initialSize: size,
                growFactor: 1.2 + Math.random() * 0.5 // Smoke expands
            };
            
            particles.add(smoke);
        }
        
        // Add to scene
        this.scene.add(particles);
        
        // Set up animation
        const animateExplosion = (delta) => {
            let allExpired = true;
            
            // Update all particles
            for (let i = particles.children.length - 1; i >= 0; i--) {
                const particle = particles.children[i];
                
                // Update lifetime
                particle.userData.lifetime += delta;
                
                // Check if expired
                if (particle.userData.lifetime >= particle.userData.maxLifetime) {
                    // Remove particle
                    particles.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                } else {
                    // Update position
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta));
                    
                    // Apply gravity (less for smoke)
                    if (particle.userData.isSmoke) {
                        particle.userData.velocity.y -= 2 * delta;
                        
                        // Smoke grows as it rises
                        const growScale = 1 + (particle.userData.lifetime / particle.userData.maxLifetime) * particle.userData.growFactor;
                        particle.scale.set(growScale, growScale, growScale);
                    } else {
                        // Regular particles
                        particle.userData.velocity.y -= 9.8 * delta;
                        
                        // Add rotation to particles
                        particle.rotation.x += particle.userData.rotationSpeed.x * delta;
                        particle.rotation.y += particle.userData.rotationSpeed.y * delta;
                        particle.rotation.z += particle.userData.rotationSpeed.z * delta;
                    }
                    
                    // Fade out
                    const fadeProgress = particle.userData.lifetime / particle.userData.maxLifetime;
                    particle.material.opacity = particle.userData.isSmoke ? 
                        0.6 * (1 - Math.pow(fadeProgress, 2)) : // Quadratic fade for smoke
                        0.9 * (1 - fadeProgress); // Linear fade for debris
                    
                    allExpired = false;
                }
            }
            
            // Remove group if all particles expired
            if (allExpired) {
                this.scene.remove(particles);
                return;
            }
            
            // Continue animation
            requestAnimationFrame(() => animateExplosion(Math.min(1/60, delta)));
        };
        
        // Start animation
        animateExplosion(1/60);
    }
    
    /**
     * Update cannonballs and combat
     * @param {number} delta - Time delta since last frame
     */
    update(delta) {
        // Skip if no scene
        if (!this.scene) return;
        
        // Update debug arrows if we have a player ship and target
        if (this.playerShip && this.currentTarget && !this.playerShip.isSunk && !this.currentTarget.isSunk) {
            this.updateDebugArrows();
        }
        
        // Update cannonballs
        const now = Date.now();
        const cannonballsToRemove = [];
        
        for (const cannonball of this.cannonballs) {
            // Skip if already marked for removal
            if (cannonballsToRemove.includes(cannonball)) continue;
            
            // Get cannonball data
            const userData = cannonball.userData;
            
            // For hit shots, update trajectory to track moving targets
            if (!userData.isMiss && !userData.hasHit && userData.target && userData.target.isMoving) {
                const currentTargetPos = userData.target.getPosition().clone();
                currentTargetPos.y += 2; // Aim at deck level
                
                // Calculate how far along the cannonball's lifetime we are (0-1)
                const age = now - userData.createdAt;
                const lifePercent = age / this.cannonballLifetime;
                
                // Only adjust trajectory in the first 70% of flight to ensure it hits
                if (lifePercent < 0.7) {
                    // Calculate distance to target
                    const distanceToTarget = cannonball.position.distanceTo(currentTargetPos);
                    
                    // If we're getting close to the target, adjust trajectory more aggressively
                    if (distanceToTarget < 20) {
                        // Create a blended direction vector that gradually focuses more on the current target position
                        const blendFactor = Math.max(0, 1 - distanceToTarget / 20); // 0 when far, 1 when close
                        
                        // Calculate new direction to current target position
                        const newDirection = new THREE.Vector3()
                            .subVectors(currentTargetPos, cannonball.position)
                            .normalize();
                        
                        // Blend between original and new direction
                        userData.direction.lerp(newDirection, blendFactor * 0.2); // Subtle adjustment
                        userData.direction.normalize(); // Ensure it's still normalized
                    }
                }
            }
            
            // Move cannonball
            const moveAmount = userData.speed * delta;
            cannonball.position.add(
                userData.direction.clone().multiplyScalar(moveAmount)
            );
            
            // Add slight arc to cannonball trajectory
            const age = now - userData.createdAt;
            const lifePercent = age / this.cannonballLifetime;
            
            // Parabolic arc (up then down)
            const heightOffset = Math.sin(lifePercent * Math.PI) * 5;
            cannonball.position.y = userData.source.getPosition().y + 2 + heightOffset;
            
            // For misses, check if we've passed the target position
            if (userData.isMiss && !userData.hasHit) {
                const distanceToTargetPos = cannonball.position.distanceTo(userData.targetPosition);
                if (distanceToTargetPos < 5) {
                    // Mark as "hit" the miss target position
                    userData.hasHit = true;
                }
            }
            // For hits, check if we've reached the target ship
            else if (!userData.isMiss && !userData.hasHit) {
                const distanceToTarget = cannonball.position.distanceTo(userData.target.getPosition());
                if (distanceToTarget < 8) {
                    // Create hit effect
                    this.createHitEffect(cannonball.position.clone());
                    
                    // Mark as hit
                    userData.hasHit = true;
                    
                    // Remove cannonball
                    cannonballsToRemove.push(cannonball);
                }
            }
            
            // Check if cannonball has expired
            if (age > this.cannonballLifetime || 
                (userData.isMiss && userData.hasHit && age > this.cannonballLifetime * 0.6)) {
                cannonballsToRemove.push(cannonball);
            }
        }
        
        // Remove expired cannonballs
        for (const cannonball of cannonballsToRemove) {
            this.scene.remove(cannonball);
            const index = this.cannonballs.indexOf(cannonball);
            if (index !== -1) {
                this.cannonballs.splice(index, 1);
            }
        }
        
        // Check if player ship is sunk
        if (this.playerShip && this.playerShip.isSunk) {
            // Reset player ship after a delay if not already resetting
            if (!this.isResetting) {
                this.isResetting = true;
                setTimeout(() => {
                    this.resetPlayerShip();
                }, 3000); // 3 second delay
            }
        }
        
        // Update current target if it exists
        if (this.currentTarget) {
            // If target is sunk, clear target
            if (this.currentTarget.isSunk) {
                // Clean up debug arrows before clearing target
                this.cleanupDebugArrows();
                this.setTarget(null);
            }
        }
        
        // Check for enemy ships firing at player
        if (this.enemyShipManager && this.playerShip && !this.playerShip.isSunk) {
            const enemyShips = this.enemyShipManager.getEnemyShips();
            
            for (const enemyShip of enemyShips) {
                // Skip if enemy ship is sunk
                if (enemyShip.isSunk) continue;
                
                // Check if enemy ship can fire
                if (enemyShip.canFire()) {
                    // Check if player is in range
                    const distance = enemyShip.getPosition().distanceTo(this.playerShip.getPosition());
                    if (distance <= enemyShip.cannonRange) {
                        // Calculate miss chance based on orientation and distance
                        const missChance = this.calculateMissChance(enemyShip, this.playerShip);
                        
                        // Determine if shot is a hit or miss
                        const isHit = Math.random() >= missChance;
                        
                        // Calculate damage (0 for misses)
                        const damage = isHit ? Math.floor(
                            enemyShip.cannonDamage.min + 
                            Math.random() * (enemyShip.cannonDamage.max - enemyShip.cannonDamage.min)
                        ) : 0;
                        
                        // Apply damage to player only if it's a hit
                        if (isHit) {
                            this.playerShip.takeDamage(damage);
                        }
                        
                        // Fire visual cannonball
                        this.fireCannonball(enemyShip, this.playerShip, damage, !isHit);
                        
                        // Update last fired time
                        enemyShip.lastFiredTime = Date.now();
                    }
                }
            }
        }
    }
    
    /**
     * Calculate miss chance based on ship orientation and distance
     * @param {BaseShip} source - Source ship
     * @param {BaseShip} target - Target ship
     * @returns {number} Miss chance between 0.0 and 0.8
     */
    calculateMissChance(source, target) {
        // Get positions and calculate distance
        const sourcePos = source.getPosition();
        const targetPos = target.getPosition();
        const distance = sourcePos.distanceTo(targetPos);
        
        // Calculate distance factor (0 when close, 1 when at max range)
        const distanceFactor = Math.min(1, distance / source.cannonRange);
        
        // Calculate orientation factor
        let orientationFactor = 0.0; // Default to worst case (0 = worst, 1 = best)
        
        // Only calculate if both ships have forward vectors
        if (source.getForwardVector && target.getForwardVector) {
            // Get forward vector of source ship - ensure we get the latest
            const sourceForward = source.getForwardVector().clone().normalize();
            
            // Calculate vector from source to target
            const toTargetVector = new THREE.Vector3()
                .subVectors(targetPos, sourcePos)
                .normalize();
            
            // Calculate dot product to determine the angle
            const dot = Math.abs(sourceForward.dot(toTargetVector));
            
            // When dot is 0, ships are perfectly perpendicular (90 degrees)
            // When dot is 1, ships are parallel (0 or 180 degrees)
            orientationFactor = 1 - dot; // 1 when perpendicular, 0 when parallel
        }
        
        // Combine factors - make orientation have twice the impact of distance
        // Distance factor contributes up to 0.27 miss chance (1/3 of 0.8)
        // Orientation factor contributes up to 0.53 miss chance (2/3 of 0.8)
        const missChance = (distanceFactor * 0.27) + ((1 - orientationFactor) * 0.53);
        
        // Clamp between 0 and 0.8
        const finalMissChance = Math.max(0, Math.min(0.8, missChance));
        
        // Debug information - only log when player is firing
        if (source === this.playerShip) {
            console.log(`Miss chance calculation:
                Distance: ${distance.toFixed(1)} / ${source.cannonRange} = ${distanceFactor.toFixed(2)} factor (${(distanceFactor * 0.27 * 100).toFixed(0)}% miss chance)
                Orientation: ${orientationFactor.toFixed(2)} factor (${((1 - orientationFactor) * 0.53 * 100).toFixed(0)}% miss chance)
                Combined miss chance: ${finalMissChance.toFixed(2)} (${(finalMissChance * 100).toFixed(0)}%)
            `);
        }
        
        return finalMissChance;
    }
    
    /**
     * Fire at the current target
     */
    async fireAtCurrentTarget() {
        // Skip if no player ship or no target
        if (!this.playerShip || !this.currentTarget) return;
        
        // Skip if player ship is sunk
        if (this.playerShip.isSunk) return;
        
        // Calculate distance to target
        const distance = this.playerShip.getPosition().distanceTo(this.currentTarget.getPosition());
        
        // Check if target is in range
        if (distance > this.playerShip.cannonRange) {
            console.log('Target out of range');
            return;
        }
        
        // Check if player can fire (cooldown)
        if (!this.playerShip.canFire()) {
            console.log('Cannon on cooldown');
            return;
        }
        
        // Calculate miss chance based on orientation and distance
        const missChance = this.calculateMissChance(this.playerShip, this.currentTarget);
        
        // Determine if shot is a hit or miss
        const isHit = Math.random() >= missChance;
        
        // Calculate damage (0 for misses)
        const damage = isHit ? Math.floor(
            this.playerShip.cannonDamage.min + 
            Math.random() * (this.playerShip.cannonDamage.max - this.playerShip.cannonDamage.min)
        ) : 0;
        
        // If we have a combat service, use it for server validation
        if (this.combatService) {
            try {
                // Only process combat action if it's a hit
                if (isHit) {
                    // Process combat action on server
                    const result = await this.combatService.processCombatAction(
                        this.currentTarget.id,
                        damage
                    );
                    
                    if (result.success) {
                        // Server validated the hit, update target health
                        this.currentTarget.currentHealth = result.newHealth;
                        
                        // If target was sunk, update its state
                        if (result.isSunk) {
                            this.currentTarget.sink();
                        }
                    } else {
                        // Handle specific error cases
                        if (result.error && result.error.includes('cooldown')) {
                            console.log('Server cooldown in progress, waiting...');
                            // Don't show error to user for cooldown issues
                            return;
                        } else {
                            console.error('Combat action failed:', result.error);
                            return;
                        }
                    }
                }
                
                // Fire visual cannonball (for both hits and misses)
                this.fireCannonball(this.playerShip, this.currentTarget, damage, !isHit);
                
                // Update last fired time
                this.playerShip.lastFiredTime = Date.now();
                
            } catch (error) {
                console.error('Error processing combat action:', error);
                
                // Try to use local combat logic as fallback
                console.log('Falling back to local combat logic');
                
                // Apply damage if it's a hit
                if (isHit) {
                    this.currentTarget.takeDamage(damage);
                }
                
                // Fire visual cannonball
                this.fireCannonball(this.playerShip, this.currentTarget, damage, !isHit);
                
                // Update last fired time
                this.playerShip.lastFiredTime = Date.now();
            }
        } else {
            // No server validation, use local combat logic
            
            // Apply damage if it's a hit
            if (isHit) {
                this.currentTarget.takeDamage(damage);
            }
            
            // Fire visual cannonball
            this.fireCannonball(this.playerShip, this.currentTarget, damage, !isHit);
            
            // Update last fired time
            this.playerShip.lastFiredTime = Date.now();
        }
    }
    
    /**
     * Reset the player ship after sinking
     */
    async resetPlayerShip() {
        // Skip if no player ship
        if (!this.playerShip) return;
        
        // If we have a combat service, use it to reset the player ship
        if (this.combatService) {
            try {
                const result = await this.combatService.resetPlayerShip();
                
                if (result.success) {
                    console.log('Player ship reset successfully');
                } else {
                    console.error('Failed to reset player ship:', result.error);
                }
            } catch (error) {
                console.error('Error resetting player ship:', error);
            }
        }
        
        // Reset health locally regardless of server response
        this.playerShip.resetHealth();
        
        // Reset position to origin
        this.playerShip.setPosition(new THREE.Vector3(0, 0.5, 0));
        
        // Reset flag
        this.isResetting = false;
        
        // Clear target
        this.setTarget(null);
    }
    
    /**
     * Set the player ship reference
     * @param {BaseShip} playerShip - The player's ship
     */
    setPlayerShip(playerShip) {
        this.playerShip = playerShip;
    }
    
    /**
     * Set the enemy ship manager reference
     * @param {EnemyShipManager} enemyShipManager - The enemy ship manager
     */
    setEnemyShipManager(enemyShipManager) {
        this.enemyShipManager = enemyShipManager;
    }
    
    /**
     * Set the UI reference
     * @param {GameUI} ui - The game UI
     */
    setUI(ui) {
        this.ui = ui;
    }
    
    /**
     * Set the scene reference
     * @param {THREE.Scene} scene - The scene
     */
    setScene(scene) {
        this.scene = scene;
    }
    
    /**
     * Set the camera reference
     * @param {THREE.Camera} camera - The camera
     */
    setCamera(camera) {
        this.camera = camera;
    }
    
    /**
     * Set the combat service reference
     * @param {CombatService} combatService - The combat service
     */
    setCombatService(combatService) {
        this.combatService = combatService;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Remove event listeners
        document.removeEventListener('click', this.handleMouseClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        // Clear auto-fire interval
        if (this.autoFireInterval) {
            clearInterval(this.autoFireInterval);
            this.autoFireInterval = null;
        }
        
        // Remove all cannonballs
        if (this.scene) {
            for (const cannonball of this.cannonballs) {
                this.scene.remove(cannonball);
            }
            
            // Clean up debug arrows
            this.cleanupDebugArrows();
        }
        
        this.cannonballs = [];
    }
    
    /**
     * Update debug arrows to show current ship orientation
     */
    updateDebugArrows() {
        // Skip if no player ship, target, or scene
        if (!this.playerShip || !this.currentTarget || !this.scene) return;
        
        // Skip if player ship or target is sunk
        if (this.playerShip.isSunk || this.currentTarget.isSunk) {
            // Clean up any existing arrows
            this.cleanupDebugArrows();
            return;
        }
        
        // Get positions - clone to ensure we get fresh copies
        const sourcePos = this.playerShip.getPosition().clone();
        const targetPos = this.currentTarget.getPosition().clone();
        
        // Always remove old debug arrows first
        this.cleanupDebugArrows();
        
        // Force a fresh calculation of the forward vector
        // This is critical to ensure we get the current orientation
        const sourceForward = this.playerShip.getForwardVector().clone().normalize();
        
        // Calculate vector from source to target
        const toTargetVector = new THREE.Vector3()
            .subVectors(targetPos, sourcePos)
            .normalize();
        
        // Create new debug arrows
        
        // Create arrow for ship forward direction (blue)
        const forwardArrow = new THREE.ArrowHelper(
            sourceForward,
            sourcePos,
            10, // length
            0x0000FF, // blue
            2, // head length
            1  // head width
        );
        this.scene.add(forwardArrow);
        this.debugArrows.push(forwardArrow);
        
        // Create arrow for direction to target (red)
        const targetArrow = new THREE.ArrowHelper(
            toTargetVector,
            sourcePos,
            10, // length
            0xFF0000, // red
            2, // head length
            1  // head width
        );
        this.scene.add(targetArrow);
        this.debugArrows.push(targetArrow);
    }
}

export default CombatManager; 