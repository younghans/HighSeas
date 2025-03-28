import * as THREE from 'three';
import TargetManager from './TargetManager.js';

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
        this.cannonballSpeed = 60; // Units per second
        this.cannonballs = [];
        this.cannonballMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.cannonballGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        this.cannonballLifetime = 3000; // 3 seconds
        this.isSpacePressed = false;
        this.isResetting = false;
        this.showDebugClickBoxes = false; // Show debug click boxes by default
        
        // Create target manager
        this.targetManager = new TargetManager({
            playerShip: this.playerShip,
            enemyShipManager: this.enemyShipManager,
            ui: this.ui,
            scene: this.scene,
            camera: this.camera,
            showDebugClickBoxes: this.showDebugClickBoxes
        });
        
        // Simplified action tracking system
        this.actionTracker = new Map(); // Single map to track all actions with status
        this.actionSequence = 0; // For action ordering
        
        // Lightweight index for quick target-based lookups
        this.actionIndices = {
            byTarget: new Map() // Maps targetId -> Set of actionIds
        };
        
        this.lastReconciliationTime = Date.now();
        this.reconciliationInterval = 10000; // 10 seconds between reconciliations
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.update = this.update.bind(this);
        this.fireCannonball = this.fireCannonball.bind(this);
        this.resetPlayerShip = this.resetPlayerShip.bind(this);
        this.toggleDebugClickBoxes = this.toggleDebugClickBoxes.bind(this);
        this.reconcileGameState = this.reconcileGameState.bind(this);
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Show debug click boxes by default in development
        if (this.enemyShipManager) {
            this.toggleDebugClickBoxes(this.showDebugClickBoxes);
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Add keyboard listeners for firing cannons
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
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
            
            // Fire a single shot
            this.fireAtCurrentTarget();
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
        }
    }
    
    /**
     * Fire at the current target
     */
    async fireAtCurrentTarget() {
        // Get the current target from the target manager
        const currentTarget = this.targetManager.getCurrentTarget();
        
        // Skip if no player ship or no target
        if (!this.playerShip || !currentTarget) return;
        
        // Skip if player ship is sunk
        if (this.playerShip.isSunk) return;
        
        // Check if player is in a safe zone
        if (this.isInSafeZone(this.playerShip.getPosition())) {
            this.showNotification("These waters are peaceful", 3000, "success");
            console.log('[COMBAT] Cannot fire from safe zone');
            return;
        }
        
        // Check if target is in a safe zone
        if (this.isInSafeZone(currentTarget.getPosition())) {
            this.showNotification("Cannot attack ships in peaceful waters", 3000, "success");
            console.log('[COMBAT] Cannot attack target in safe zone');
            return;
        }
        
        // Calculate distance to target
        const distance = this.playerShip.getPosition().distanceTo(currentTarget.getPosition());
        
        // Check if target is in range
        if (distance > this.playerShip.cannonRange) {
            console.log('[COMBAT] Target out of range:', currentTarget.id, `Distance: ${distance.toFixed(1)}/${this.playerShip.cannonRange}`);
            return;
        }
        
        const now = Date.now();
        const clientCooldownElapsed = now - this.playerShip.lastFiredTime;
        const clientCannonCooldown = this.playerShip.cannonCooldown;
        const serverLastAttackTime = this._lastServerAttackTime || 0;
        const serverCooldownElapsed = now - serverLastAttackTime;
        
        console.log('[DEBUG:COOLDOWN] Firing attempt:', {
            clientLastFired: this.playerShip.lastFiredTime,
            clientCooldownValue: clientCannonCooldown,
            clientCooldownElapsed: clientCooldownElapsed,
            clientReadyToFire: clientCooldownElapsed >= clientCannonCooldown,
            serverLastAttack: serverLastAttackTime,
            serverCooldownElapsed: serverCooldownElapsed,
            currentTimestamp: now,
            timeSinceLastServerAttack: this._lastServerAttackTime ? `${now - this._lastServerAttackTime}ms` : 'never'
        });
        
        // Check if player can fire (cooldown) with server timing info
        if (!this.playerShip.canFire({
            serverLastAttackTime: this._lastServerAttackTime,
            additionalBuffer: 400 // Increased to 400ms buffer to avoid server rejection
        })) {
            console.log('[COMBAT] Cannon on cooldown', `Last fired: ${Date.now() - this.playerShip.lastFiredTime}ms ago`);
            return;
        }
        
        // Calculate miss chance based on orientation and distance
        const missChance = this.calculateMissChance(this.playerShip, currentTarget);
        
        // Generate a deterministic seed for damage calculation
        // This seed will be shared with the server to ensure both calculate the same damage
        const damageSeed = Math.floor(Math.random() * 1000000);
        
        // Create a seeded random function for deterministic damage calculation
        const seededRandom = this.createSeededRandom(damageSeed);
        
        // Determine if shot is a hit or miss using the seeded random
        const isHit = seededRandom() >= missChance;
        
        // Calculate damage (0 for misses) using the seeded random
        const damage = isHit ? Math.floor(
            this.playerShip.cannonDamage.min + 
            seededRandom() * (this.playerShip.cannonDamage.max - this.playerShip.cannonDamage.min)
        ) : 0;
        
        console.log(`[COMBAT] Firing at target ${currentTarget.id}:`, {
            targetType: currentTarget.type,
            playerShipId: this.playerShip.id,
            targetHealth: currentTarget.currentHealth,
            damageSeed: damageSeed,
            missChance: missChance.toFixed(2),
            isHit: isHit,
            damage: damage,
            distance: distance.toFixed(1),
            timestamp: new Date().toISOString()
        });
        
        // OPTIMISTIC UI: Always fire the cannonball immediately for visual feedback
        // We'll apply damage on impact, but potentially adjust it later based on server response
        const cannonballData = this.fireCannonball(this.playerShip, currentTarget, damage, !isHit);
        
        // Update last fired time
        this.playerShip.lastFiredTime = Date.now();
        
        // Reset the cooldown indicator in UI
        if (this.ui && this.ui.startCooldown) {
            this.ui.startCooldown();
        }
        
        // If targeting another player, broadcast this cannonball through MultiplayerManager
        if (currentTarget.type === 'player' && currentTarget.id) {
            console.log('[COMBAT] Broadcasting cannonball to player:', currentTarget.id);
            
            // Log important details before broadcasting
            console.log('[COMBAT] Broadcasting details:', {
                sourceId: this.playerShip.id,
                sourceType: this.playerShip.type,
                targetId: currentTarget.id,
                targetType: currentTarget.type,
                damage: damage,
                isMiss: !isHit
            });
            
            try {
                // Use local reference first, fallback to global window reference
                const multiplayer = this.multiplayerManager || window.multiplayerManager;
                
                if (!multiplayer) {
                    console.error('[COMBAT] No MultiplayerManager available for broadcast');
                    return;
                }
                
                // Make sure our playerShip has a valid ID
                if (!this.playerShip.id && multiplayer.playerId) {
                    console.log('[COMBAT] Setting missing player ship ID:', multiplayer.playerId);
                    this.playerShip.id = multiplayer.playerId;
                    this.playerShip.type = 'player';
                }
                
                // Now broadcast the cannonball event
                multiplayer.broadcastCannonballFired(
                    this.playerShip,
                    currentTarget,
                    damage,
                    !isHit
                ).catch(err => console.error('[COMBAT] Error broadcasting cannonball:', err));
            } catch (err) {
                console.error('[COMBAT] Error in cannonball broadcast:', err);
            }
        }
        
        // If we have a combat service, use it for server validation asynchronously
        if (this.combatService && isHit) {
            try {
                // Generate unique action ID for tracking this combat action
                const actionId = this.actionSequence++;
                
                // Create action object to track this combat event
                const action = {
                    id: actionId,
                    timestamp: Date.now(),
                    source: this.playerShip.id,
                    target: currentTarget.id,
                    clientDamage: damage,
                    cannonballRef: cannonballData,
                    status: 'pending' // Status can be: 'pending', 'confirmed', 'rejected', 'expired'
                };
                
                console.log(`[ACTION:${actionId}] Created combat action:`, {
                    id: actionId,
                    source: this.playerShip.id,
                    target: currentTarget.id,
                    clientDamage: damage,
                    status: 'pending',
                    timestamp: new Date(action.timestamp).toISOString()
                });
                
                // Add to action tracker
                this.actionTracker.set(actionId, action);
                
                // Add to target index for quicker lookups
                if (!this.actionIndices.byTarget.has(currentTarget.id)) {
                    this.actionIndices.byTarget.set(currentTarget.id, new Set());
                }
                this.actionIndices.byTarget.get(currentTarget.id).add(actionId);
                
                // Server validation happens in parallel with cannonball animation
                // Send the damage seed to the server so it can calculate the same damage
                this.combatService.processCombatAction(
                    currentTarget.id,
                    damage,
                    { 
                        actionId: actionId,
                        damageSeed: damageSeed,
                        missChance: missChance 
                    }
                ).then(result => {
                    // Add debug logging and validation for the server response
                    if (!result) {
                        console.error('[ACTION:ERROR] Server returned null or undefined result');
                        return;
                    }
                    
                    if (result.actionId === undefined) {
                        console.error('[ACTION:ERROR] Server response missing actionId:', result);
                        
                        // Try to find the matching action based on target
                        const targetActions = this.findActionsByTarget(currentTarget.id);
                        let matchingAction = null;
                        
                        if (targetActions.length > 0) {
                            // If error response with cooldown, it's likely the most recent action
                            if (result.error === 'Attack cooldown in progress') {
                                // Get the most recent action (already sorted by timestamp)
                                matchingAction = targetActions[0];
                                console.log('[ACTION:RECOVER] Matched cooldown error to most recent action for target');
                            } 
                            // If success response, try to match by damage if available
                            else if (result.success && result.damage !== undefined) {
                                matchingAction = targetActions.find(a => 
                                    a.clientDamage === result.damage ||
                                    a.clientDamage === result.expectedDamage
                                );
                                
                                if (matchingAction) {
                                    console.log('[ACTION:RECOVER] Matched by damage amount');
                                }
                            }
                            
                            // If still no match, use the most recent action
                            if (!matchingAction) {
                                matchingAction = targetActions[0];
                                console.log('[ACTION:RECOVER] Using most recent action as fallback');
                            }
                        }
                        
                        if (matchingAction) {
                            console.log('[ACTION:RECOVER] Found likely matching action:', {
                                actionId: matchingAction.id,
                                target: matchingAction.target,
                                clientDamage: matchingAction.clientDamage
                            });
                            // Use the action we found
                            result.actionId = matchingAction.id;
                        } else {
                            console.error('[ACTION:ERROR] Could not recover action ID, no pending actions available');
                            return;
                        }
                    }
                    
                    const action = this.actionTracker.get(result.actionId);
                    if (!action) {
                        console.warn(`[ACTION:${result.actionId}] Cannot find action for server response`, {
                            responseActionId: result.actionId,
                            trackerSize: this.actionTracker.size,
                            success: result.success,
                            timestamp: new Date().toISOString()
                        });
                        return;
                    }
                    
                    if (result.success) {
                        // Update action status to confirmed
                        action.status = 'confirmed';
                        action.serverDamage = result.damage || damage;
                        action.serverResult = result;
                        
                        // Gather timing info for logging
                        const now = Date.now();
                        const responseTime = now - action.timestamp;
                        
                        console.log(`[ACTION:${action.id}] Server confirmed action:`, {
                            id: action.id,
                            clientDamage: action.clientDamage,
                            serverDamage: result.damage || damage,
                            newHealth: result.newHealth,
                            isSunk: result.isSunk,
                            responseTime: responseTime,
                            alreadyHit: action.cannonballRef.hasHit,
                            clientFireTime: action.timestamp,
                            clientCooldownSetting: this.playerShip.cannonCooldown
                        });
                        
                        // Important: Use the action timestamp instead of current time
                        // This ensures we're tracking when the server actually registered the shot
                        // rather than when we received the response
                        this._lastServerAttackTime = action.timestamp;
                        this._lastServerResponseTime = now;
                        
                        console.log('[DEBUG:COOLDOWN] Server accepted shot:', {
                            clientFiredAt: action.timestamp,
                            serverAcceptedAt: this._lastServerAttackTime,
                            responseReceivedAt: now,
                            responseDelay: responseTime,
                            nextClientFireTime: action.timestamp + this.playerShip.cannonCooldown,
                            nextServerReadyTime: this._lastServerAttackTime + this.playerShip.cannonCooldown
                        });
                        
                        // If cannonball already hit (optimistic UI), reconcile the damage
                        if (action.cannonballRef.hasHit) {
                            this.reconcileDamage(currentTarget, action.clientDamage, result.damage);
                        }
                    } else {
                        // Handle rejected action
                        action.status = 'rejected';
                        action.error = result.error;
                        
                        const responseTime = Date.now() - action.timestamp;
                        
                        // Add detailed timing info for debugging cooldown issues
                        if (result.error === 'Attack cooldown in progress') {
                            const now = Date.now();
                            
                            // If we have cooldown remaining info from server, use it to calibrate our timing
                            if (result.cooldownRemaining) {
                                // Calculate when the server thinks the last attack happened
                                // Server cooldown (2000ms) - remaining time = elapsed time since last attack
                                const serverElapsedTime = this.playerShip.cannonCooldown - result.cooldownRemaining;
                                const calculatedServerAttackTime = now - serverElapsedTime;
                                
                                // Update our tracking of server's last attack time
                                // This helps synchronize for future shots
                                if (!this._lastServerAttackTime || calculatedServerAttackTime > this._lastServerAttackTime) {
                                    console.log('[DEBUG:SERVER_SYNC] Updating server attack time from rejection:', {
                                        oldServerAttackTime: this._lastServerAttackTime ? new Date(this._lastServerAttackTime).toISOString() : 'none',
                                        newServerAttackTime: new Date(calculatedServerAttackTime).toISOString(),
                                        serverCooldownRemaining: result.cooldownRemaining,
                                        serverElapsedSinceAttack: serverElapsedTime
                                    });
                                    
                                    this._lastServerAttackTime = calculatedServerAttackTime;
                                }
                            }
                            
                            console.warn(`[ACTION:${action.id}] Server rejected cooldown:`, {
                                id: action.id,
                                reason: result.error,
                                responseTime: responseTime,
                                alreadyHit: action.cannonballRef.hasHit,
                                serverRemaining: result.cooldownRemaining || 'unknown',
                                timeSinceLastServerAttack: this._lastServerAttackTime ? (now - this._lastServerAttackTime) : 'unknown',
                                clientElapsed: now - this.playerShip.lastFiredTime,
                                clientCooldown: this.playerShip.cannonCooldown
                            });
                        } else {
                            console.warn(`[ACTION:${action.id}] Server rejected action:`, {
                                id: action.id,
                                reason: result.error,
                                responseTime: responseTime,
                                alreadyHit: action.cannonballRef.hasHit
                            });
                        }
                        
                        // If cannonball already hit, rollback the damage
                        if (action.cannonballRef.hasHit) {
                            this.rollbackAction(action);
                        }
                        
                        // Remove from target index
                        if (this.actionIndices.byTarget.has(action.target)) {
                            this.actionIndices.byTarget.get(action.target).delete(action.id);
                            // Clean up empty sets
                            if (this.actionIndices.byTarget.get(action.target).size === 0) {
                                this.actionIndices.byTarget.delete(action.target);
                            }
                        }
                    }
                }).catch(error => {
                    console.error('[COMBAT] Error processing combat action:', error);
                    console.log('[COMBAT] Falling back to local combat logic for this shot');
                });
            } catch (error) {
                console.error('[COMBAT] Error initiating combat action:', error);
            }
        }
    }
    
    /**
     * Reconcile damage applied client-side with server-confirmed damage
     * @param {BaseShip} target - Target ship
     * @param {number} clientDamage - Client calculated damage
     * @param {number} serverDamage - Server validated damage
     */
    reconcileDamage(target, clientDamage, serverDamage) {
        // Skip if the target no longer exists
        if (!target) {
            console.warn('[RECONCILE] Cannot reconcile damage: Target ship no longer exists');
            return;
        }
        
        // Ensure target has an ID
        const targetId = target.id || 'unknown-target';
        
        // If server and client damage are the same, nothing to reconcile
        if (clientDamage === serverDamage) {
            console.log(`[RECONCILE] No reconciliation needed for ${targetId}: Client damage (${clientDamage}) matches server (${serverDamage})`);
            return;
        }
        
        const originalHealth = target.currentHealth;
        
        // Calculate the health difference
        const healthDiff = clientDamage - serverDamage;
        
        console.log(`[RECONCILE] Reconciling damage for ${targetId}:`, {
            targetId: targetId,
            clientDamage: clientDamage,
            serverDamage: serverDamage,
            healthDiff: healthDiff,
            originalHealth: originalHealth,
            expectedNewHealth: originalHealth + healthDiff,
            timestamp: new Date().toISOString()
        });
        
        // Adjust the target's health by the difference
        // If client did more damage, we need to give health back
        // If server did more damage, we need to take more health away
        target.currentHealth += healthDiff;
        
        // Clamp health to valid range
        const clampedHealth = Math.max(0, Math.min(target.maxHealth, target.currentHealth));
        
        if (clampedHealth !== target.currentHealth) {
            console.log(`[RECONCILE] Health value clamped for ${targetId}: ${target.currentHealth} → ${clampedHealth}`);
            target.currentHealth = clampedHealth;
        }
        
        // Check if target should be sunk based on health
        if (target.currentHealth <= 0 && !target.isSunk) {
            console.log(`[RECONCILE] Ship ${targetId} sunk during reconciliation`);
            target.sink();
        }
        
        // Update health bar if visible
        if (target.updateHealthBar && this.camera) {
            target.updateHealthBar(this.camera);
        }
        
        console.log(`[RECONCILE] Final health after reconciliation for ${targetId}: ${originalHealth} → ${target.currentHealth}`);
    }
    
    /**
     * Rollback a rejected combat action
     * @param {Object} action - The action to rollback
     */
    rollbackAction(action) {
        const target = this.findShipById(action.target);
        if (!target) {
            console.warn(`[ROLLBACK] Cannot rollback action ${action.id}: Target ship ${action.target} no longer exists`);
            return;
        }
        
        const originalHealth = target.currentHealth;
        
        console.log(`[ROLLBACK] Rolling back rejected action ${action.id}:`, {
            targetId: action.target,
            clientDamage: action.clientDamage,
            originalHealth: originalHealth,
            expectedNewHealth: Math.min(target.maxHealth, originalHealth + action.clientDamage),
            reason: action.error || 'Unknown reason',
            timestamp: new Date().toISOString()
        });
        
        // Undo the optimistic damage
        target.currentHealth += action.clientDamage;
        
        // Clamp health to valid range
        const clampedHealth = Math.min(target.maxHealth, target.currentHealth);
        
        if (clampedHealth !== target.currentHealth) {
            console.log(`[ROLLBACK] Health value clamped for ${target.id}: ${target.currentHealth} → ${clampedHealth}`);
            target.currentHealth = clampedHealth;
        }
        
        // Update health bar if visible
        if (target.updateHealthBar && this.camera) {
            target.updateHealthBar(this.camera);
        }
        
        console.log(`[ROLLBACK] Final health after rollback for ${target.id}: ${originalHealth} → ${target.currentHealth}`);
    }
    
    /**
     * Find a ship by its ID
     * @param {string} id - Ship ID to find
     * @returns {BaseShip|null} The ship or null if not found
     */
    findShipById(id) {
        // Check if the player ship matches
        if (this.playerShip && this.playerShip.id === id) {
            return this.playerShip;
        }
        
        // Check enemy ships
        if (this.enemyShipManager) {
            const enemyShips = this.enemyShipManager.getEnemyShips();
            for (const ship of enemyShips) {
                if (ship.id === id) {
                    return ship;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Get IDs of all ships currently in the game
     * @returns {Array} Array of ship IDs
     */
    getAllShipIds() {
        const ids = [];
        
        // Add player ship if exists
        if (this.playerShip && this.playerShip.id) {
            ids.push(this.playerShip.id);
        }
        
        // Add enemy ships if they exist
        if (this.enemyShipManager) {
            const enemyShips = this.enemyShipManager.getEnemyShips();
            for (const ship of enemyShips) {
                if (ship.id) {
                    ids.push(ship.id);
                }
            }
        }
        
        return ids;
    }
    
    /**
     * Reconcile game state with authoritative server state
     * @returns {Promise} Promise that resolves when reconciliation is complete
     */
    reconcileGameState() {
        if (!this.combatService) {
            // Only log this warning once per minute to reduce console spam
            const now = Date.now();
            if (!this._lastReconcileWarningTime || now - this._lastReconcileWarningTime > 60000) {
                console.log('[RECONCILE:STATE] Skipping state reconciliation - combatService not available');
                this._lastReconcileWarningTime = now;
            }
            return Promise.resolve();
        }
        
        if (!this.combatService.getAuthoritativeState) {
            // Only log this warning once per minute to reduce console spam
            const now = Date.now();
            if (!this._lastReconcileMethodWarningTime || now - this._lastReconcileMethodWarningTime > 60000) {
                console.log('[RECONCILE:STATE] Skipping state reconciliation - getAuthoritativeState method not available');
                this._lastReconcileMethodWarningTime = now;
            }
            return Promise.resolve();
        }
        
        const reconcileStartTime = Date.now();
        const pendingActionsCount = this.actionTracker.size;
        
        console.log('[RECONCILE:STATE] Starting game state reconciliation with server', {
            pendingActions: pendingActionsCount,
            timeSinceLastReconciliation: reconcileStartTime - this.lastReconciliationTime,
            timestamp: new Date(reconcileStartTime).toISOString()
        });
        
        return this.combatService.getAuthoritativeState()
            .then(serverState => {
                const responseTime = Date.now() - reconcileStartTime;
                
                if (!serverState || !serverState.ships) {
                    console.warn('[RECONCILE:STATE] Received invalid server state during reconciliation', {
                        responseTime: responseTime,
                        serverState: serverState ? 'Empty state object' : 'Null state'
                    });
                    return;
                }
                
                console.log(`[RECONCILE:STATE] Received state from server in ${responseTime}ms:`, {
                    serverShipsCount: serverState.ships.length,
                    clientShipsCount: this.getAllShipIds().length
                });
                
                // Update all ship states from server
                const reconcileStats = {
                    healthReconciled: 0,
                    positionReconciled: 0,
                    shipsAdded: 0,
                    shipsRemoved: 0,
                    shipsSunk: 0
                };
                
                serverState.ships.forEach(serverShip => {
                    const clientShip = this.findShipById(serverShip.id);
                    if (clientShip) {
                        // Health reconciliation
                        if (Math.abs(clientShip.currentHealth - serverShip.health) > 0) {
                            console.log(`[RECONCILE:STATE] Health mismatch for ship ${serverShip.id}:`, {
                                clientHealth: clientShip.currentHealth,
                                serverHealth: serverShip.health,
                                difference: clientShip.currentHealth - serverShip.health
                            });
                            
                            clientShip.currentHealth = serverShip.health;
                            reconcileStats.healthReconciled++;
                            
                            if (serverShip.isSunk && !clientShip.isSunk) {
                                console.log(`[RECONCILE:STATE] Server indicates ship ${serverShip.id} is sunk but client shows it's alive`);
                                clientShip.sink();
                                reconcileStats.shipsSunk++;
                            }
                        }
                        
                        // Position reconciliation if needed
                        // Only for significant differences
                        const shipPosition = clientShip.getPosition();
                        const serverPosition = new THREE.Vector3(serverShip.x, serverShip.y, serverShip.z);
                        const positionDifference = shipPosition.distanceTo(serverPosition);
                        
                        if (positionDifference > 5) {
                            console.log(`[RECONCILE:STATE] Position mismatch for ship ${serverShip.id}:`, {
                                clientPosition: `${shipPosition.x.toFixed(1)}, ${shipPosition.y.toFixed(1)}, ${shipPosition.z.toFixed(1)}`,
                                serverPosition: `${serverPosition.x.toFixed(1)}, ${serverPosition.y.toFixed(1)}, ${serverPosition.z.toFixed(1)}`,
                                difference: positionDifference.toFixed(1)
                            });
                            
                            clientShip.setPosition(serverShip.x, serverShip.y, serverShip.z);
                            reconcileStats.positionReconciled++;
                        }
                    }
                });
                
                // Handle ships that exist on server but not client (dynamic spawning)
                const clientShipIds = this.getAllShipIds();
                serverState.ships.forEach(serverShip => {
                    if (!clientShipIds.includes(serverShip.id)) {
                        console.log(`[RECONCILE:STATE] Spawning new ship from server: ${serverShip.id}`, {
                            type: serverShip.type,
                            position: `${serverShip.x.toFixed(1)}, ${serverShip.y.toFixed(1)}, ${serverShip.z.toFixed(1)}`,
                            health: serverShip.health,
                            maxHealth: serverShip.maxHealth
                        });
                        
                        this.spawnShipFromServer(serverShip);
                        reconcileStats.shipsAdded++;
                    }
                });
                
                // Handle ships that exist on client but not server (should be removed)
                const serverShipIds = serverState.ships.map(s => s.id);
                clientShipIds.forEach(id => {
                    if (!serverShipIds.includes(id) && id !== this.playerShip.id) {
                        console.log(`[RECONCILE:STATE] Removing ship not present on server: ${id}`);
                        this.removeShip(id);
                        reconcileStats.shipsRemoved++;
                    }
                });
                
                // Update last reconciliation time
                this.lastReconciliationTime = Date.now();
                const totalTime = this.lastReconciliationTime - reconcileStartTime;
                
                // Log reconciliation summary
                console.log('[RECONCILE:STATE] Reconciliation complete:', {
                    ...reconcileStats,
                    totalTimeMs: totalTime,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                console.error('[RECONCILE:STATE] Error during game state reconciliation:', error);
                
                // Log details about the error
                console.error('[RECONCILE:STATE] Reconciliation error details:', {
                    pendingActions: pendingActionsCount,
                    errorMessage: error.message,
                    errorStack: error.stack,
                    responseTime: Date.now() - reconcileStartTime
                });
            });
    }
    
    /**
     * Spawn a ship based on server data
     * @param {Object} serverShip - Server ship data
     */
    spawnShipFromServer(serverShip) {
        // Implementation depends on your ship spawning system
        // This is a placeholder - you'll need to adapt it to your specific implementation
        if (this.enemyShipManager && typeof this.enemyShipManager.spawnEnemyShip === 'function') {
            const ship = this.enemyShipManager.spawnEnemyShip({
                id: serverShip.id,
                type: serverShip.type,
                position: new THREE.Vector3(serverShip.x, serverShip.y, serverShip.z),
                health: serverShip.health,
                maxHealth: serverShip.maxHealth
            });
            
            if (ship) {
                this.initializeEnemyShip(ship);
            }
        }
    }
    
    /**
     * Remove a ship from the game
     * @param {string} id - ID of ship to remove
     */
    removeShip(id) {
        // Implementation depends on your ship management system
        // This is a placeholder - you'll need to adapt it to your specific implementation
        if (this.enemyShipManager && typeof this.enemyShipManager.removeEnemyShip === 'function') {
            this.enemyShipManager.removeEnemyShip(id);
        }
    }
    
    /**
     * Create a seeded random function for deterministic calculations
     * @param {number} seed - Random seed
     * @returns {function} Seeded random function that returns values between 0 and 1
     */
    createSeededRandom(seed) {
        return function() {
            // Simple multiply-with-carry algorithm
            // Based on a simple implementation of Marsaglia's MWC algorithm
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    /**
     * Fire a cannonball from source to target
     * @param {BaseShip} source - Source ship
     * @param {BaseShip} target - Target ship
     * @param {number} damage - Damage amount (0 for miss)
     * @param {boolean} isMiss - Whether this shot is a miss
     * @param {Object} serverResult - Optional server validation result
     * @returns {Object} Cannonball user data for later reference
     */
    fireCannonball(source, target, damage, isMiss = false, serverResult = null) {
        // Skip if no scene
        if (!this.scene) return null;
        
        // Validate source and target
        if (!source) {
            console.error('[CANNONBALL:ERROR] Attempted to fire cannonball with null source');
            return null;
        }
        
        if (!target) {
            console.error('[CANNONBALL:ERROR] Attempted to fire cannonball with null target');
            return null;
        }
        
        // Get source and target IDs, ensuring they're always defined
        const sourceId = source.id || 'unknown-source';
        const targetId = target.id || 'unknown-target';
        
        // Create cannonball mesh
        const cannonball = new THREE.Mesh(this.cannonballGeometry, this.cannonballMaterial);
        
        // Set initial position at the source ship's water level (bottom)
        const sourcePos = source.getPosition().clone();
        // No longer adding height - we'll start at water level
        cannonball.position.copy(sourcePos);
        
        // Calculate direction to target's water level
        const targetPos = target.getPosition().clone();
        // No longer adding height - aiming at water level
        
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
        
        // Calculate direct line direction (without arc)
        const direction = new THREE.Vector3()
            .subVectors(adjustedTargetPos, sourcePos)
            .normalize();
        
        // Calculate total distance for arc height calculation
        const totalDistance = sourcePos.distanceTo(adjustedTargetPos);
        // Maximum arc height will be proportional to distance
        const maxArcHeight = Math.min(20, totalDistance * 0.12);
        
        // Log cannonball creation for debugging
        console.log('[CANNONBALL:CREATE]', {
            sourceId: sourceId,
            targetId: targetId,
            damage: damage,
            isMiss: isMiss,
            distance: totalDistance.toFixed(1),
            timestamp: new Date().toISOString()
        });
        
        // Add cannonball data
        const userData = {
            direction: direction,
            speed: this.cannonballSpeed,
            damage: damage,
            source: source,
            target: target,
            sourceId: sourceId,
            targetId: targetId,
            createdAt: Date.now(),
            isMiss: isMiss,
            targetPosition: isMiss ? adjustedTargetPos : predictedTargetPos.clone(),
            hasHit: false,
            initialTargetPos: targetPos.clone(), // Store initial target position
            predictedPos: predictedTargetPos.clone(), // Store predicted position for debugging
            serverResult: serverResult, // Store server validation result if available
            sourcePos: sourcePos.clone(), // Store starting position for arc calculation
            maxArcHeight: maxArcHeight, // Store maximum arc height
            totalDistance: totalDistance // Store total distance for arc calculation
        };
        
        cannonball.userData = userData;
        
        // Add to scene and cannonballs array
        this.scene.add(cannonball);
        this.cannonballs.push(cannonball);
        
        // Play cannon fire sound (if available)
        // TODO: Add sound effects
        
        // Return the userData for later reference
        return userData;
    }
    
    /**
     * Update cannonballs and combat
     * @param {number} delta - Time delta since last frame
     */
    update(delta) {
        // Skip if no scene
        if (!this.scene) return;
        
        // Check if it's time for state reconciliation
        const currentTime = Date.now();
        if (currentTime - this.lastReconciliationTime > this.reconciliationInterval && this.combatService) {
            this.reconcileGameState();
        }
        
        // Check for stale pending actions that have timed out
        this.cleanupStaleActions(currentTime);
        
        // Update the target manager
        this.targetManager.update(delta);
        
        // Update all visible enemy health bars
        if (this.enemyShipManager && this.camera) {
            const enemyShips = this.enemyShipManager.getEnemyShips();
            for (const ship of enemyShips) {
                if (ship && ship.healthBarContainer && ship.healthBarContainer.visible && !ship.isSunk) {
                    if (ship.updateHealthBar && ship.shipMesh) {
                        ship.updateHealthBar(this.camera);
                    }
                }
            }
        }
        
        // Update cannonballs
        const timestamp = Date.now();
        const cannonballsToRemove = [];
        
        for (const cannonball of this.cannonballs) {
            // Skip if already marked for removal
            if (cannonballsToRemove.includes(cannonball)) continue;
            
            // Get cannonball data
            const userData = cannonball.userData;
            
            // For hit shots, update trajectory to track moving targets
            if (!userData.isMiss && !userData.hasHit && userData.target && userData.target.isMoving) {
                const currentTargetPos = userData.target.getPosition().clone();
                // No longer adding height - we aim at water level
                
                // Calculate how far along the cannonball's lifetime we are (0-1)
                const age = timestamp - userData.createdAt;
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
            
            // Move cannonball forward along XZ plane
            const moveAmount = userData.speed * delta;
            
            // Calculate what percentage of the journey we've completed (in terms of XZ plane distance)
            const startPos = userData.sourcePos;
            const targetPos = userData.targetPosition;
            
            // Calculate XZ plane positions (ignoring Y/height)
            const currentXZ = new THREE.Vector2(cannonball.position.x, cannonball.position.z);
            const startXZ = new THREE.Vector2(startPos.x, startPos.z);
            const targetXZ = new THREE.Vector2(targetPos.x, targetPos.z);
            
            // Calculate total XZ distance and current progress
            const totalDistanceXZ = startXZ.distanceTo(targetXZ);
            const currentDistanceXZ = startXZ.distanceTo(currentXZ);
            const progressXZ = Math.min(1.0, currentDistanceXZ / totalDistanceXZ);
            
            // Move along XZ plane
            cannonball.position.add(
                new THREE.Vector3(
                    userData.direction.x * moveAmount,
                    0, // Don't apply Y movement here
                    userData.direction.z * moveAmount
                )
            );
            
            // Update progress after movement
            const newCurrentXZ = new THREE.Vector2(cannonball.position.x, cannonball.position.z);
            const newCurrentDistanceXZ = startXZ.distanceTo(newCurrentXZ);
            const newProgressXZ = Math.min(1.0, newCurrentDistanceXZ / totalDistanceXZ);
            
            // Apply arc trajectory based on journey progress
            // Sine wave creates a nice arc that peaks in the middle of the journey
            const arcHeight = Math.sin(newProgressXZ * Math.PI) * userData.maxArcHeight;
            
            // For the second half of the journey, gradually sink below water level if it's a miss
            let finalHeight = startPos.y + arcHeight;
            if (userData.isMiss && newProgressXZ > 0.5) {
                // Calculate how far we are into the second half (0 to 1)
                const sinkProgress = (newProgressXZ - 0.5) * 2; // 0 at midpoint, 1 at end
                // Apply a quadratic curve to sink faster toward the end
                const sinkAmount = sinkProgress * sinkProgress * 3; // Sink up to 3 units below water
                finalHeight -= sinkAmount;
            }
            
            cannonball.position.y = finalHeight;
            
            // For misses, check if we've passed the target position
            if (userData.isMiss && !userData.hasHit) {
                const distanceToTargetPos = cannonball.position.distanceTo(userData.targetPosition);
                if (distanceToTargetPos < 5) {
                    // Mark as "hit" the miss target position
                    userData.hasHit = true;
                    console.log('[CANNONBALL:MISS] Cannonball missed target and hit water', {
                        targetId: userData.target ? userData.target.id : 'unknown',
                        distanceToTarget: distanceToTargetPos.toFixed(1),
                        flightTime: timestamp - userData.createdAt
                    });
                }
            }
            // For hits, check if we've reached the target ship - remove isSunk check
            else if (!userData.isMiss && !userData.hasHit && userData.target) {
                const distanceToTarget = cannonball.position.distanceTo(userData.target.getPosition());
                if (distanceToTarget < 2) {
                    // Mark as hit first
                    userData.hasHit = true;
                    const targetPreHitHealth = userData.target.currentHealth;
                    
                    // Create hit effect
                    this.createHitEffect(cannonball.position.clone());
                    
                    // Only apply damage if the target is not already sunk
                    if (!userData.target.isSunk) {
                        // Check if we have a confirmed server result from an action
                        const matchingActions = this.findActionsByTarget(userData.targetId);
                        const matchingAction = matchingActions.length > 0 ? matchingActions[0] : null;
                        
                        console.log('[CANNONBALL:HIT] Cannonball hit target', {
                            targetId: userData.targetId || 'unknown',
                            clientDamage: userData.damage,
                            targetPreHitHealth: targetPreHitHealth,
                            hasServerResult: !!matchingAction,
                            flightTime: timestamp - userData.createdAt,
                            actionId: matchingAction ? matchingAction.id : 'none',
                            pendingActions: this.actionTracker.size
                        });
                        
                        // If we have a matching action, use it
                        if (matchingAction && matchingAction.serverResult) {
                            // Use server's validated result
                            console.log('[CANNONBALL:HIT] Using server validated result', {
                                actionId: matchingAction.id, 
                                serverDamage: matchingAction.serverDamage,
                                clientDamage: matchingAction.clientDamage,
                                newHealth: matchingAction.serverResult.newHealth,
                                isSunk: matchingAction.serverResult.isSunk
                            });
                            
                            userData.target.currentHealth = matchingAction.serverResult.newHealth;
                            
                            if (matchingAction.serverResult.isSunk) {
                                userData.target.sink();
                            }
                            
                            // Remove from action tracker
                            this.actionTracker.delete(matchingAction.id);
                        } 
                        // Rest of the existing damage application code...
                        else if (userData.source === this.playerShip) {
                            // Existing optimistic update code...
                            // Try to find a matching action that matches this cannonball
                            const actions = this.findActionsByTarget(userData.targetId);
                            const pendingAction = actions.length > 0 ? actions[0] : null;
                            
                            if (pendingAction) {
                                console.log('[CANNONBALL:HIT] Server response not yet received, marking pending action', {
                                    actionId: pendingAction.id,
                                    targetId: userData.targetId
                                });
                                // Mark that the cannonball has hit so we can reconcile later when server responds
                                pendingAction.cannonballHasHit = true;
                            }
                            
                            // No server result yet - apply optimistic update
                            console.log('[CANNONBALL:HIT] No server result yet, applying optimistic damage', {
                                targetId: userData.targetId,
                                damage: userData.damage,
                                preHitHealth: targetPreHitHealth,
                                estimatedPostHitHealth: Math.max(0, targetPreHitHealth - userData.damage),
                                pendingServerValidation: true,
                                pendingActionFound: !!pendingAction
                            });
                            
                            userData.pendingReconciliation = true;
                            userData.target.takeDamage(userData.damage);
                                
                            // Log if this hit caused a sink
                            if (userData.target.currentHealth <= 0 && !userData.target.isSunk) {
                                console.log('[CANNONBALL:HIT] Optimistic update resulted in ship sinking', {
                                    targetId: userData.targetId,
                                    pendingServerValidation: true
                                });
                            }
                        }
                        // For NPC shots or other cases with no server validation
                        else {
                            console.log('[CANNONBALL:HIT] NPC attack or unvalidated shot, applying direct damage', {
                                sourceType: userData.source === this.playerShip ? 'player' : 'npc',
                                targetId: userData.targetId,
                                damage: userData.damage
                            });
                            
                            userData.target.takeDamage(userData.damage);
                            
                            // If this is a shot hitting the player, auto-target the attacker if we don't have a target
                            if (userData.target === this.playerShip && userData.source !== this.playerShip) {
                                // Auto-target the ship that hit us
                                this.targetManager.setAutoTarget(userData.source);
                            }
                        }
                    } else {
                        // Target is already sunk, log this event
                        console.log('[CANNONBALL:HIT] Cannonball hit already sunk target', {
                            targetId: userData.targetId || 'unknown',
                            flightTime: timestamp - userData.createdAt
                        });
                    }
                    
                    // Remove cannonball
                    cannonballsToRemove.push(cannonball);
                }
            }
            
            // Check if cannonball has expired
            const age = timestamp - userData.createdAt;
            if (age > this.cannonballLifetime || 
                (userData.isMiss && userData.hasHit && age > this.cannonballLifetime * 0.6)) {
                
                // Log expiration if cannonball never hit anything
                if (!userData.hasHit) {
                    console.warn('[CANNONBALL:EXPIRE] Cannonball expired without hitting anything', {
                        sourceId: userData.sourceId || 'unknown',
                        targetId: userData.targetId || 'unknown',
                        isMiss: userData.isMiss,
                        age: age,
                        maxLifetime: this.cannonballLifetime,
                        totalDistance: userData.totalDistance ? userData.totalDistance.toFixed(1) : 'unknown'
                    });
                }
                
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
                        
                        // Fire visual cannonball - damage will be applied on impact
                        this.fireCannonball(enemyShip, this.playerShip, damage, !isHit);
                        
                        // Update last fired time
                        enemyShip.lastFiredTime = Date.now();
                    }
                }
            }
        }
    }
    
    /**
     * Clean up pending actions that have timed out
     * @param {number} currentTime - Current timestamp
     */
    cleanupStaleActions(currentTime) {
        const ACTION_TIMEOUT = 10000; // 10 seconds timeout
        const staleActionIds = [];
        
        // Find stale actions
        for (const [actionId, action] of this.actionTracker.entries()) {
            // Only check pending actions
            if (action.status !== 'pending') continue;
            
            const age = currentTime - action.timestamp;
            if (age > ACTION_TIMEOUT) {
                console.warn(`[ACTION:TIMEOUT] Action ${actionId} timed out after ${age}ms`, {
                    actionId: actionId,
                    targetId: action.target,
                    clientDamage: action.clientDamage,
                    timestamp: new Date(action.timestamp).toISOString()
                });
                
                // Mark action as expired instead of removing
                action.status = 'expired';
                staleActionIds.push(actionId);
                
                // If cannonball already hit, we need to keep the optimistic update
                // since the server didn't respond in time
                if (action.cannonballRef && action.cannonballRef.hasHit) {
                    console.log(`[ACTION:TIMEOUT] Preserving optimistic update for action ${actionId} since cannonball already hit`);
                }
            }
        }
        
        // Remove stale actions from indices
        for (const actionId of staleActionIds) {
            const action = this.actionTracker.get(actionId);
            if (!action) continue;
            
            // Remove from target index
            if (this.actionIndices.byTarget.has(action.target)) {
                this.actionIndices.byTarget.get(action.target).delete(actionId);
                // Clean up empty sets
                if (this.actionIndices.byTarget.get(action.target).size === 0) {
                    this.actionIndices.byTarget.delete(action.target);
                }
            }
        }
        
        if (staleActionIds.length > 0) {
            console.log(`[ACTION:CLEANUP] Marked ${staleActionIds.length} stale actions as expired`);
        }
        
        // Periodically prune old non-pending actions to prevent unlimited growth
        this.pruneOldActions(currentTime - 60000); // Remove completed actions older than 1 minute
    }
    
    /**
     * Prune old completed actions to prevent memory leaks
     * @param {number} cutoffTime - Timestamp threshold for removal
     */
    pruneOldActions(cutoffTime) {
        const removedCount = {
            confirmed: 0,
            rejected: 0,
            expired: 0
        };
        
        for (const [actionId, action] of this.actionTracker.entries()) {
            // Only remove non-pending actions
            if (action.status === 'pending') continue;
            
            // Remove if older than cutoff
            if (action.timestamp < cutoffTime) {
                removedCount[action.status]++;
                this.actionTracker.delete(actionId);
                
                // Also clean from indices if somehow still there
                if (this.actionIndices.byTarget.has(action.target)) {
                    this.actionIndices.byTarget.get(action.target).delete(actionId);
                    // Clean up empty sets
                    if (this.actionIndices.byTarget.get(action.target).size === 0) {
                        this.actionIndices.byTarget.delete(action.target);
                    }
                }
            }
        }
        
        const total = removedCount.confirmed + removedCount.rejected + removedCount.expired;
        if (total > 0) {
            console.log(`[ACTION:PRUNE] Removed ${total} old actions:`, removedCount);
        }
    }
    
    /**
     * Find actions by target ID
     * @param {string} targetId - Target ship ID
     * @returns {Array} Array of actions sorted by timestamp (newest first)
     */
    findActionsByTarget(targetId) {
        if (!this.actionIndices.byTarget.has(targetId)) return [];
        
        const actionIds = this.actionIndices.byTarget.get(targetId);
        const actions = [];
        
        for (const actionId of actionIds) {
            const action = this.actionTracker.get(actionId);
            if (action && action.status === 'pending') {
                actions.push(action);
            }
        }
        
        // Sort by timestamp (newest first)
        return actions.sort((a, b) => b.timestamp - a.timestamp);
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
     * Reset the player ship after sinking
     */
    async resetPlayerShip() {
        console.log('[PLAYER] Starting ship respawn process');
        
        // Reset the player ship
        await this.playerShip.respawn(new THREE.Vector3(0, 0, 0));
        
        // Only sync position after the ship is fully loaded
        if (this.multiplayerManager) {
            console.log('[PLAYER] Immediately syncing respawn position to multiplayer system');
            
            // First update position - this will move the ship to respawn location
            this.multiplayerManager.updatePlayerPosition(this.playerShip, true);
            
            // Then update the player's isSunk status in Firebase
            await this.multiplayerManager.playerRef.update({
                isSunk: false,
                health: this.playerShip.maxHealth // Ensure health is reset to max
            });
        }
        
        // Reset combat state and clear target
        this.targetManager.clearTarget();
        this.lastAttackTime = 0;
        
        // Update UI
        if (this.ui) {
            this.ui.update();
        }
        
        // Reset the isResetting flag after respawn is complete
        this.isResetting = false;
        
        console.log('[PLAYER] Ship respawn complete');
    }
    
    /**
     * Set the player ship reference
     * @param {BaseShip} playerShip - The player's ship
     */
    setPlayerShip(playerShip) {
        const previousId = this.playerShip ? this.playerShip.id : null;
        const newId = playerShip ? playerShip.id : null;
        
        console.log(`[PLAYER] ${previousId ? 'Updating' : 'Setting'} player ship:`, {
            previousId: previousId || 'none',
            newId: newId || 'none',
            health: playerShip ? `${playerShip.currentHealth}/${playerShip.maxHealth}` : 'N/A',
            timestamp: new Date().toISOString()
        });
        
        this.playerShip = playerShip;
        
        // Create health bar for the player ship
        if (playerShip && !playerShip.healthBarContainer) {
            console.log(`[PLAYER] Creating health bar for player ship ${playerShip.id}`);
            playerShip.createHealthBar();
            
            // Set initial visibility based on health
            if (playerShip.currentHealth < playerShip.maxHealth) {
                playerShip.setHealthBarVisible(true);
            } else {
                playerShip.setHealthBarVisible(false);
            }
        }
        
        // Update the target manager with the player ship
        this.targetManager.setPlayerShip(playerShip);
        
        // Clear target when player loads in
        this.targetManager.clearTarget();
    }
    
    /**
     * Set the enemy ship manager reference
     * @param {EnemyShipManager} enemyShipManager - The enemy ship manager
     */
    setEnemyShipManager(enemyShipManager) {
        console.log('[ENEMIES] Setting enemy ship manager');
        this.enemyShipManager = enemyShipManager;
        
        // Create health bars for all existing enemy ships
        if (enemyShipManager) {
            const enemyShips = enemyShipManager.getEnemyShips();
            console.log(`[ENEMIES] Initializing ${enemyShips.length} existing enemy ships`);
            
            for (const ship of enemyShips) {
                this.initializeEnemyShip(ship);
            }
        }
        
        // Update the target manager with the enemy ship manager
        this.targetManager.setEnemyShipManager(enemyShipManager);
    }
    
    /**
     * Set the UI reference
     * @param {GameUI} ui - The game UI
     */
    setUI(ui) {
        this.ui = ui;
        this.targetManager.setUI(ui);
    }
    
    /**
     * Set the scene reference
     * @param {THREE.Scene} scene - The scene
     */
    setScene(scene) {
        this.scene = scene;
        this.targetManager.setScene(scene);
    }
    
    /**
     * Set the camera reference
     * @param {THREE.Camera} camera - The camera
     */
    setCamera(camera) {
        this.camera = camera;
        this.targetManager.setCamera(camera);
    }
    
    /**
     * Set the combat service reference
     * @param {CombatService} combatService - The combat service
     */
    setCombatService(combatService) {
        this.combatService = combatService;
    }
    
    /**
     * Set the multiplayer manager instance
     * @param {MultiplayerManager} multiplayerManager
     */
    setMultiplayerManager(multiplayerManager) {
        this.multiplayerManager = multiplayerManager;
        this.targetManager.setMultiplayerManager(multiplayerManager);
        console.log('[COMBAT] MultiplayerManager reference set');
    }
    
    /**
     * Toggle visibility of debug click boxes on all ships
     * @param {boolean} visible - Whether debug click boxes should be visible
     */
    toggleDebugClickBoxes(visible) {
        this.showDebugClickBoxes = visible;
        this.targetManager.toggleDebugClickBoxes(visible);
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        // Clean up the target manager
        this.targetManager.cleanup();
        
        // Remove all cannonballs
        if (this.scene) {
            for (const cannonball of this.cannonballs) {
                this.scene.remove(cannonball);
            }
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
    
    /**
     * Initialize a new enemy ship by creating its health bar
     * @param {BaseShip} enemyShip - The enemy ship to initialize
     */
    initializeEnemyShip(enemyShip) {
        if (!enemyShip) {
            console.warn('[ENEMIES] Attempted to initialize null enemy ship');
            return;
        }
        
        console.log(`[ENEMIES] Initializing enemy ship:`, {
            id: enemyShip.id || 'unknown',
            type: enemyShip.type || 'unknown',
            health: enemyShip.currentHealth !== undefined ? `${enemyShip.currentHealth}/${enemyShip.maxHealth}` : 'unknown',
            position: enemyShip.getPosition ? 
                `${enemyShip.getPosition().x.toFixed(1)},${enemyShip.getPosition().y.toFixed(1)},${enemyShip.getPosition().z.toFixed(1)}` : 
                'unknown'
        });
        
        if (enemyShip && !enemyShip.healthBarContainer) {
            enemyShip.createHealthBar();
        }
        
        // Create click box sphere if it doesn't exist
        if (enemyShip && !enemyShip.clickBoxSphere && typeof enemyShip.createClickBoxSphere === 'function') {
            enemyShip.createClickBoxSphere();
            
            // Apply current debug click box setting
            if (typeof enemyShip.setDebugClickBoxVisible === 'function') {
                enemyShip.setDebugClickBoxVisible(this.showDebugClickBoxes);
            }
        }
    }
    
    /**
     * Schedule player respawn after sinking
     * Called by the BaseShip when capsizing animation completes
     */
    schedulePlayerRespawn() {
        // Skip if already resetting
        if (this.isResetting) return;
        
        console.log('[PLAYER] Player capsizing animation complete, scheduling respawn', {
            playerId: this.playerShip ? this.playerShip.id : 'unknown',
            timestamp: new Date().toISOString()
        });
        
        this.isResetting = true;
        
        // Immediately reset the player ship without delay
        this.resetPlayerShip();
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
     * Set the zones manager reference
     * @param {Zones} zonesManager - The zones manager instance
     */
    setZonesManager(zonesManager) {
        this.zonesManager = zonesManager;
    }

    /**
     * Check if a position is within a safe zone
     * @param {THREE.Vector3} position - The position to check
     * @returns {boolean} True if the position is in a safe zone
     */
    isInSafeZone(position) {
        if (!this.zonesManager) return false;
        
        return this.zonesManager.isInSafeZone(position.x, position.z);
    }

    /**
     * Show a notification message
     * @param {string} message - The message to display
     * @param {number|string} duration - How long to show the message in milliseconds or type
     * @param {string} type - Notification type ('success', 'warning', 'error', 'debug')
     */
    showNotification(message, duration = 3000, type = null) {
        // Use the UI's notification system if available
        if (this.ui && this.ui.showNotification) {
            this.ui.showNotification(message, duration, type);
        } else if (window.gameUI && window.gameUI.showNotification) {
            // Try global gameUI as fallback
            window.gameUI.showNotification(message, duration, type);
        } else {
            // Log to console as a fallback
            console.log('NOTIFICATION:', message);
        }
    }
}

export default CombatManager; 