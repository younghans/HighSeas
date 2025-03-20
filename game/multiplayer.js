// Multiplayer functionality using Firebase Realtime Database
import * as THREE from 'three';
import { Sloop } from './ships/index.js';

class MultiplayerManager {
    constructor(options = {}) {
        this.auth = options.auth;
        this.database = firebase.database();
        this.playerId = null;
        this.playerRef = null;
        this.playersRef = this.database.ref('players');
        this.otherPlayers = new Map(); // Map of player ID to player data
        this.otherPlayerShips = new Map(); // Map of player ID to ship mesh
        this.scene = options.scene;
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.SYNC_INTERVAL = 3000; // Increase to 3 seconds to reduce network traffic
        this.POSITION_CORRECTION_THRESHOLD = 3.0; // Only correct position if difference is > 3 units
        this.TELEPORT_THRESHOLD = 50.0; // Teleport if difference is > 50 units
        this.ROTATION_CORRECTION_THRESHOLD = 0.3; // Only correct rotation if difference is > 0.3 radians
        this.DESTINATION_CHANGE_THRESHOLD = 5.0; // Update destination if difference is > 5 units
        this.ARRIVAL_THRESHOLD = 0.5; // Consider arrived if < 0.5 units away
        this.debugMode = true; // Enable debug mode
        this.onPlayerPositionLoaded = options.onPlayerPositionLoaded || null;
        
        // Bind methods
        this.updatePlayerPosition = this.updatePlayerPosition.bind(this);
        this.handlePlayerAdded = this.handlePlayerAdded.bind(this);
        this.handlePlayerChanged = this.handlePlayerChanged.bind(this);
        this.handlePlayerRemoved = this.handlePlayerRemoved.bind(this);
        this.createPlayerShip = this.createPlayerShip.bind(this);
        this.updatePlayerShip = this.updatePlayerShip.bind(this);
        this.removePlayerShip = this.removePlayerShip.bind(this);
        this.loadPlayerPosition = this.loadPlayerPosition.bind(this);
    }
    
    /**
     * Log debug message if debug mode is enabled
     * @param {string} message - Debug message
     * @param {Object} data - Optional data to log
     */
    debug(message, data = null) {
        if (!this.debugMode) return;
        
        const timestamp = new Date().toISOString();
        const formattedMessage = `[Multiplayer ${timestamp}] ${message}`;
        
        if (data) {
            console.log(formattedMessage, data);
        } else {
            console.log(formattedMessage);
        }
    }
    
    /**
     * Load player's position from Firebase
     * @returns {Promise} Promise that resolves with player data or null if not found
     */
    loadPlayerPosition() {
        if (!this.auth || !this.auth.getCurrentUser()) {
            console.error('User must be logged in to load position');
            return Promise.resolve(null);
        }
        
        const user = this.auth.getCurrentUser();
        const playerId = user.uid;
        
        this.debug(`Loading position for player: ${user.displayName || user.email || 'Unknown'} (${playerId})`);
        
        return this.playersRef.child(playerId).once('value')
            .then(snapshot => {
                const playerData = snapshot.val();
                
                if (playerData) {
                    this.debug('Loaded player data from server:', playerData);
                    return playerData;
                } else {
                    this.debug('No existing player data found on server');
                    return null;
                }
            })
            .catch(error => {
                console.error('Error loading player position:', error);
                return null;
            });
    }
    
    /**
     * Initialize multiplayer functionality
     * @param {Object} playerShip - The player's ship object
     * @returns {Promise} Promise that resolves when initialization is complete
     */
    init(playerShip) {
        if (!this.auth || !this.auth.getCurrentUser()) {
            console.error('User must be logged in to use multiplayer');
            return Promise.resolve(false);
        }
        
        // Get the current user
        const user = this.auth.getCurrentUser();
        this.playerId = user.uid;
        
        this.debug(`Initializing multiplayer for player: ${user.displayName || user.email || 'Unknown'} (${this.playerId})`);
        
        // Create a reference to this player's data
        this.playerRef = this.playersRef.child(this.playerId);
        
        // First, try to load existing player data
        return this.loadPlayerPosition()
            .then(existingPlayerData => {
                let initialPosition, initialRotation;
                
                if (existingPlayerData && existingPlayerData.position) {
                    // Use position from database
                    initialPosition = existingPlayerData.position;
                    // Force y position to 0
                    initialPosition.y = 0;
                    initialRotation = existingPlayerData.rotation || { y: 0 };
                    
                    this.debug('Using saved position from database:', initialPosition);
                    
                    // Update the player's ship position and rotation
                    if (playerShip && this.onPlayerPositionLoaded) {
                        this.onPlayerPositionLoaded(initialPosition, initialRotation);
                    }
                } else {
                    // Use current position if no saved data
                    initialPosition = {
                        x: playerShip.position.x,
                        y: 0, // Force y position to always be 0
                        z: playerShip.position.z
                    };
                    initialRotation = {
                        y: playerShip.rotation.y
                    };
                    
                    this.debug('No saved position found, using current position:', initialPosition);
                }
                
                // Check if the player was previously marked as sunk and log it
                if (existingPlayerData && existingPlayerData.isSunk) {
                    this.debug('Player was previously marked as sunk. Resetting health and sunk status.');
                }
                
                // Set initial player data
                const initialData = {
                    id: this.playerId,
                    displayName: user.displayName || user.email || 'Sailor',
                    position: initialPosition,
                    rotation: initialRotation,
                    destination: null,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
                    isOnline: true,
                    health: 100, // Always reset health to full when joining
                    isSunk: false, // Always ensure player is not sunk when joining
                    gold: existingPlayerData && existingPlayerData.gold ? existingPlayerData.gold : 0 // Initialize gold or preserve existing gold
                };
                
                // Update the database with the player's data
                return this.playerRef.update(initialData)
                    .then(() => {
                        this.debug('Player data synced to server:', initialData);
                        
                        // Set up presence system
                        this.setupPresence();
                        
                        // Listen for other players
                        this.playersRef.on('child_added', this.handlePlayerAdded);
                        this.playersRef.on('child_changed', this.handlePlayerChanged);
                        this.playersRef.on('child_removed', this.handlePlayerRemoved);
                        
                        // Start periodic sync
                        this.startPeriodicSync(playerShip);
                        
                        return true;
                    });
            });
    }
    
    /**
     * Set up presence system to handle disconnects
     */
    setupPresence() {
        this.debug('Setting up presence system');
        // Create a reference to the user's online status
        const connectedRef = firebase.database().ref('.info/connected');
        
        connectedRef.on('value', (snap) => {
            if (snap.val() === true && this.playerRef) {
                // User is connected
                this.debug('Connected to Firebase Realtime Database');
                
                // When the user disconnects, update the isOnline status
                this.playerRef.onDisconnect().update({
                    isOnline: false,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                });
                this.debug('Set up disconnect handler');
            }
        });
    }
    
    /**
     * Start periodic sync of player position
     * @param {Object} playerShip - The player's ship object
     */
    startPeriodicSync(playerShip) {
        this.debug('Starting periodic position sync every ' + (this.SYNC_INTERVAL / 1000) + ' seconds');
        this.syncInterval = setInterval(() => {
            this.updatePlayerPosition(playerShip);
        }, this.SYNC_INTERVAL);
    }
    
    /**
     * Stop periodic sync
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            this.debug('Stopping periodic position sync');
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    /**
     * Update player position in Firebase
     * @param {Object} playerShip - The player's ship object
     * @param {boolean} forceUpdate - Whether to force update regardless of time since last sync
     */
    updatePlayerPosition(playerShip, forceUpdate = false) {
        if (!this.playerRef) return;
        
        const now = Date.now();
        
        // Only update if it's been at least 1 second since the last update
        // or if forceUpdate is true
        if (!forceUpdate && now - this.lastSyncTime < 1000) return;
        
        this.lastSyncTime = now;
        
        // Get the current position using the getPosition method
        const currentPosition = playerShip.getPosition();
        
        // Update player data
        const updateData = {
            position: {
                x: currentPosition.x,
                y: 0, // Force y position to always be 0
                z: currentPosition.z
            },
            rotation: {
                y: playerShip.getObject().rotation.y
            },
            destination: playerShip.targetPosition ? {
                x: playerShip.targetPosition.x,
                y: 0, // Force destination y to always be 0
                z: playerShip.targetPosition.z
            } : null,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        };
        
        this.playerRef.update(updateData);
        
        // Debug message
        const syncType = playerShip.targetPosition ? 'position and destination' : 'position';
        this.debug(`Synced player ${syncType} to server:`, {
            position: updateData.position,
            destination: updateData.destination
        });
    }
    
    /**
     * Handle when a new player is added
     * @param {Object} snapshot - Firebase data snapshot
     */
    handlePlayerAdded(snapshot) {
        const playerData = snapshot.val();
        
        // Don't add ourselves
        if (playerData.id === this.playerId) return;
        
        this.debug(`New player detected: ${playerData.displayName} (${playerData.id})`, playerData);
        
        // Store player data
        this.otherPlayers.set(playerData.id, playerData);
        
        // Create ship for this player
        this.createPlayerShip(playerData);
    }
    
    /**
     * Handle when a player's data changes
     * @param {Object} snapshot - Firebase data snapshot
     */
    handlePlayerChanged(snapshot) {
        const playerData = snapshot.val();
        
        // Don't update ourselves
        if (playerData.id === this.playerId) return;
        
        this.debug(`Player data updated: ${playerData.displayName} (${playerData.id})`, {
            position: playerData.position,
            destination: playerData.destination
        });
        
        // Update player data
        this.otherPlayers.set(playerData.id, playerData);
        
        // Update ship for this player
        this.updatePlayerShip(playerData);
    }
    
    /**
     * Handle when a player is removed
     * @param {Object} snapshot - Firebase data snapshot
     */
    handlePlayerRemoved(snapshot) {
        const playerData = snapshot.val();
        
        this.debug(`Player removed: ${playerData.displayName} (${playerData.id})`);
        
        // Remove player data
        this.otherPlayers.delete(playerData.id);
        
        // Remove ship for this player
        this.removePlayerShip(playerData.id);
    }
    
    /**
     * Create a ship for another player
     * @param {Object} playerData - Player data from Firebase
     */
    createPlayerShip(playerData) {
        if (!playerData.isOnline) return;
        
        this.debug(`Creating ship for player: ${playerData.displayName} (${playerData.id})`, {
            position: playerData.position,
            rotation: playerData.rotation
        });
        
        // Create a Sloop ship for the other player
        const otherPlayerShip = new Sloop(this.scene, {
            // Use the default Sloop speed (10)
            speed: 10, // Explicitly set speed to match local player
            hullColor: 0x8B4513, // Default brown hull
            deckColor: 0xD2B48C, // Default tan deck
            sailColor: 0xFFFFFF, // Default white sail
            // Add custom options for multiplayer ships
            isMultiplayerShip: true
        });
        
        // Get the ship object
        const shipObject = otherPlayerShip.getObject();
        
        // Set initial position and rotation
        shipObject.position.set(
            playerData.position.x,
            0, // Force y position to always be 0
            playerData.position.z
        );
        
        // Set rotation and store it
        const rotationY = playerData.rotation ? playerData.rotation.y || 0 : 0;
        shipObject.rotation.y = rotationY;
        
        // Create nametag
        const nametagDiv = document.createElement('div');
        nametagDiv.className = 'player-nametag';
        nametagDiv.textContent = playerData.displayName;
        nametagDiv.style.position = 'absolute';
        nametagDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        nametagDiv.style.color = 'white';
        nametagDiv.style.padding = '2px 5px';
        nametagDiv.style.borderRadius = '3px';
        nametagDiv.style.fontSize = '12px';
        nametagDiv.style.fontFamily = 'Arial, sans-serif';
        nametagDiv.style.pointerEvents = 'none';
        nametagDiv.style.userSelect = 'none';
        nametagDiv.style.textAlign = 'center';
        nametagDiv.style.minWidth = '80px';
        nametagDiv.style.transform = 'translateX(-50%)';
        document.body.appendChild(nametagDiv);
        
        // Store the nametag with the ship
        otherPlayerShip.userData = otherPlayerShip.userData || {};
        otherPlayerShip.userData.nametag = nametagDiv;
        otherPlayerShip.userData.playerId = playerData.id;
        otherPlayerShip.userData.lastPosition = new THREE.Vector3(
            playerData.position.x,
            0, // Force y position to always be 0
            playerData.position.z
        );
        otherPlayerShip.userData.lastRotation = rotationY;
        
        // Store destination if available
        if (playerData.destination) {
            otherPlayerShip.userData.destination = new THREE.Vector3(
                playerData.destination.x,
                playerData.destination.y,
                playerData.destination.z
            );
            
            // Set the ship's target position to enable wake particles
            otherPlayerShip.targetPosition = otherPlayerShip.userData.destination;
            otherPlayerShip.isMoving = true;
        }
        
        // Store ship
        this.otherPlayerShips.set(playerData.id, otherPlayerShip);
    }
    
    /**
     * Update a ship for another player
     * @param {Object} playerData - Player data from Firebase
     */
    updatePlayerShip(playerData) {
        // Get the ship
        const otherPlayerShip = this.otherPlayerShips.get(playerData.id);
        
        // If player is offline, remove their ship
        if (!playerData.isOnline) {
            this.debug(`Player went offline: ${playerData.displayName} (${playerData.id})`);
            this.removePlayerShip(playerData.id);
            return;
        }
        
        // If ship doesn't exist yet, create it
        if (!otherPlayerShip) {
            this.createPlayerShip(playerData);
            return;
        }
        
        this.debug(`Updating ship for player: ${playerData.displayName} (${playerData.id})`, {
            position: playerData.position,
            destination: playerData.destination
        });
        
        // Get the ship object
        const shipObject = otherPlayerShip.getObject();
        
        // Create Vector3 for new position from playerData
        const newPos = new THREE.Vector3(
            playerData.position.x,
            0, // Force y position to always be 0
            playerData.position.z
        );
        
        // Calculate distance between current position and new position
        const distanceChange = shipObject.position.distanceTo(newPos);
        
        // Handle special cases: large position change or respawn
        const isNearOrigin = newPos.distanceTo(new THREE.Vector3(0, 0, 0)) < 2;
        
        if (distanceChange > this.TELEPORT_THRESHOLD || isNearOrigin || playerData.isSunk) {
            // For large position changes or respawns, teleport immediately
            this.debug(`Teleporting ship for player ${playerData.displayName} to new position:`, newPos);
            shipObject.position.copy(newPos);
            
            // If player was sunk and respawned, clear any movement data
            if (isNearOrigin || playerData.isSunk) {
                otherPlayerShip.targetPosition = null;
                otherPlayerShip.isMoving = false;
            }
        } else {
            // For normal position updates:
            // 1. If distance is small (ship is close to its reported position), don't do anything
            // 2. If distance is moderate, set the target position to the reported position
            
            // Only adjust course if the difference is more than a small threshold
            if (distanceChange > this.POSITION_CORRECTION_THRESHOLD) {
                // Set a target position that's partway between current position and the reported position
                // This creates smoother convergence instead of constantly chasing an exact point
                
                // Calculate the target position based on reported position and current position
                const targetPos = newPos.clone();
                
                this.debug(`Setting course correction for ${playerData.displayName}, distance: ${distanceChange.toFixed(2)}`);
                
                // Set the ship to move to this position
                otherPlayerShip.targetPosition = targetPos;
                otherPlayerShip.isMoving = true;
            }
        }
        
        // Update last known position
        otherPlayerShip.userData.lastPosition = newPos;
        
        // Update rotation if provided
        if (playerData.rotation) {
            const rotationY = playerData.rotation.y || 0;
            // Only update rotation directly if there's a significant difference
            if (Math.abs(shipObject.rotation.y - rotationY) > this.ROTATION_CORRECTION_THRESHOLD) {
                shipObject.rotation.y = rotationY;
            }
            otherPlayerShip.userData.lastRotation = rotationY;
        }
        
        // Update destination if available from playerData
        if (playerData.destination) {
            const destinationPos = new THREE.Vector3(
                playerData.destination.x,
                0, // Force destination y to always be 0
                playerData.destination.z
            );
            
            otherPlayerShip.userData.destination = destinationPos;
            
            // Only update the ship's actual target if it's significantly different
            // or if the ship isn't already moving
            if (!otherPlayerShip.isMoving || 
                (otherPlayerShip.targetPosition && 
                 otherPlayerShip.targetPosition.distanceTo(destinationPos) > this.DESTINATION_CHANGE_THRESHOLD)) {
                
                // Set the ship's target position to enable wake particles
                otherPlayerShip.targetPosition = destinationPos;
                otherPlayerShip.isMoving = true;
                
                // Update rotation to face direction of travel
                const direction = new THREE.Vector3().subVectors(
                    destinationPos,
                    shipObject.position
                ).normalize();
                
                shipObject.rotation.y = Math.atan2(direction.x, direction.z);
                otherPlayerShip.userData.lastRotation = shipObject.rotation.y;
            }
        } else {
            // No destination in playerData but we might have an internal one for smoothing
            // Let the ship continue to its correction target if we set one earlier
            if (!otherPlayerShip.targetPosition) {
                otherPlayerShip.userData.destination = null;
                otherPlayerShip.isMoving = false;
                
                // If no destination, maintain the last rotation
                if (otherPlayerShip.userData.lastRotation !== undefined) {
                    shipObject.rotation.y = otherPlayerShip.userData.lastRotation;
                }
            }
        }
    }
    
    /**
     * Remove a ship for another player
     * @param {string} playerId - Player ID
     */
    removePlayerShip(playerId) {
        // Get the ship
        const otherPlayerShip = this.otherPlayerShips.get(playerId);
        
        if (otherPlayerShip) {
            const playerName = otherPlayerShip.userData.nametag ? otherPlayerShip.userData.nametag.textContent : 'Unknown';
            this.debug(`Removing ship for player: ${playerName} (${playerId})`);
            
            // Remove nametag
            if (otherPlayerShip.userData.nametag) {
                document.body.removeChild(otherPlayerShip.userData.nametag);
            }
            
            // Clean up wake particle system if it exists
            if (otherPlayerShip.wakeParticleSystem) {
                otherPlayerShip.wakeParticleSystem.dispose();
            }
            
            // Remove ship from scene
            const shipObject = otherPlayerShip.getObject();
            if (shipObject) {
                this.scene.remove(shipObject);
            }
            
            // Remove from map
            this.otherPlayerShips.delete(playerId);
        }
    }
    
    /**
     * Update all other player ships based on their last known position and destination
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        // Update each other player's ship
        this.otherPlayerShips.forEach((otherPlayerShip, playerId) => {
            const playerData = this.otherPlayers.get(playerId);
            
            if (!playerData || !playerData.isOnline) return;
            
            // Get the ship object
            const shipObject = otherPlayerShip.getObject();
            if (!shipObject) return;
            
            // If the ship has a target position, ensure it's moving
            if (otherPlayerShip.targetPosition) {
                // Make sure isMoving is true so the ship will sail toward the target
                otherPlayerShip.isMoving = true;
                
                // If we're very close to the target position, stop moving
                // This prevents endless small adjustments
                const distanceToTarget = shipObject.position.distanceTo(otherPlayerShip.targetPosition);
                if (distanceToTarget < this.ARRIVAL_THRESHOLD) {
                    otherPlayerShip.isMoving = false;
                    otherPlayerShip.targetPosition = null;
                    
                    this.debug(`Ship for player ${playerData.displayName} reached target position`);
                }
            }
            
            // Update the ship (this will update wake particles and handle movement)
            otherPlayerShip.update(delta, performance.now() * 0.001);
            
            // Update nametag position
            this.updateNametag(otherPlayerShip);
        });
    }
    
    /**
     * Update nametag position for a ship
     * @param {Object} otherPlayerShip - Ship object
     */
    updateNametag(otherPlayerShip) {
        if (!otherPlayerShip.userData || !otherPlayerShip.userData.nametag) return;
        
        // Get the ship object
        const shipObject = otherPlayerShip.getObject();
        if (!shipObject) return;
        
        // Get the position of the ship in screen space
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(shipObject.matrixWorld);
        
        // Add more height to position the nametag higher above the ship
        position.y += 7; // Increased from 2 to 5 for higher positioning
        
        // Project the position to screen space
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        // Clone the position to avoid modifying the original
        const screenPosition = position.clone();
        screenPosition.project(this.scene.userData.camera);
        
        screenPosition.x = (screenPosition.x * widthHalf) + widthHalf;
        screenPosition.y = -(screenPosition.y * heightHalf) + heightHalf;
        
        // Update nametag position
        otherPlayerShip.userData.nametag.style.left = `${screenPosition.x}px`;
        otherPlayerShip.userData.nametag.style.top = `${screenPosition.y}px`;
        
        // Calculate distance from camera to ship for scaling
        const camera = this.scene.userData.camera;
        const cameraPosition = camera.position.clone();
        const distanceToCamera = cameraPosition.distanceTo(shipObject.position);
        
        // Scale the nametag based on distance (the further away, the smaller)
        // Base size is 12px at distance 10, scaling down as distance increases
        const baseFontSize = 12;
        const baseDistance = 10;
        const scaleFactor = Math.max(0.5, Math.min(1.5, baseDistance / Math.max(1, distanceToCamera * 0.1)));
        const fontSize = baseFontSize * scaleFactor;
        
        // Apply the scaled font size
        otherPlayerShip.userData.nametag.style.fontSize = `${fontSize}px`;
        
        // Also scale the minimum width proportionally
        const baseMinWidth = 80;
        const minWidth = baseMinWidth * scaleFactor;
        otherPlayerShip.userData.nametag.style.minWidth = `${minWidth}px`;
        
        // Hide nametag if ship is behind the camera or too far away
        if (screenPosition.z > 1 || distanceToCamera > 1500) {
            otherPlayerShip.userData.nametag.style.display = 'none';
        } else {
            otherPlayerShip.userData.nametag.style.display = 'block';
            
            // Adjust opacity based on distance for a fade-out effect
            // Using a power of 0.7 creates a more gradual fade-out curve
            // Since we hide at 1000, we should scale our fade accordingly
            const opacity = Math.max(0.3, Math.min(1, 1 - Math.pow(distanceToCamera / 1500, 0.7)));
            otherPlayerShip.userData.nametag.style.opacity = opacity;
        }
    }
    
    /**
     * Set player's online status to false
     * This should be called when the user logs out
     */
    setPlayerOffline() {
        if (this.playerRef) {
            this.debug('Setting player as offline due to logout');
            // Update the player's online status to false
            this.playerRef.update({
                isOnline: false,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                this.debug('Successfully set player as offline');
            }).catch(error => {
                console.error('Error setting player offline:', error);
            });
        }
    }
    
    /**
     * Clean up multiplayer resources
     */
    cleanup() {
        this.debug('Cleaning up multiplayer resources');
        
        // Stop listening for player events
        if (this.playersRef) {
            this.playersRef.off('child_added', this.handlePlayerAdded);
            this.playersRef.off('child_changed', this.handlePlayerChanged);
            this.playersRef.off('child_removed', this.handlePlayerRemoved);
            this.debug('Removed Firebase event listeners');
        }
        
        // Stop periodic sync
        this.stopPeriodicSync();
        
        // Remove all other player ships
        this.debug(`Removing ${this.otherPlayerShips.size} other player ships`);
        this.otherPlayerShips.forEach((otherPlayerShip, playerId) => {
            this.removePlayerShip(playerId);
        });
        
        // Note: We don't try to set player offline here anymore
        // This is now handled before logout in the UI and resetGame functions
        
        // Clear player reference
        this.playerRef = null;
        
        // Clear other data
        this.otherPlayers.clear();
        this.otherPlayerShips.clear();
        this.debug('Multiplayer cleanup complete');
    }
    
    /**
     * Update player health in Firebase
     * @param {BaseShip} ship - The player's ship
     */
    updatePlayerHealth(ship) {
        if (!this.playerRef || !ship) return Promise.reject('Not connected or no ship');
        
        // Get current health and sunk status
        const health = ship.currentHealth;
        const isSunk = ship.isSunk;
        
        // Update health in Firebase
        return this.playerRef.update({
            health: health,
            isSunk: isSunk,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            console.log('Player health updated in Firebase:', health);
            return true;
        }).catch(error => {
            console.error('Error updating player health:', error);
            return false;
        });
    }
    
    /**
     * Update player inventory in Firebase
     * @param {Object} loot - The loot object with gold and items
     * @returns {Promise} Promise that resolves when update is complete
     */
    updatePlayerInventory(loot) {
        if (!this.playerRef) return Promise.reject('Not connected');
        if (!this.auth || !this.auth.getCurrentUser()) return Promise.reject('Not authenticated');
        
        this.debug(`Updating player inventory with loot:`, loot);
        
        // Get the current user ID
        const uid = this.playerId;
        
        // Create a reference to the player's gold in Firebase
        const goldRef = this.database.ref(`players/${uid}/gold`);
        
        // Update the gold value in Firebase
        return goldRef.once('value')
            .then(snapshot => {
                // Get current gold amount (default to 0 if it doesn't exist)
                const currentGold = snapshot.exists() ? snapshot.val() : 0;
                const newGold = currentGold + loot.gold;
                
                this.debug(`Updating gold: ${currentGold} + ${loot.gold} = ${newGold}`);
                
                // Update the gold amount
                return this.playerRef.update({
                    gold: newGold,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .then(() => {
                this.debug(`Successfully updated player gold`);
                
                // Trigger an event to update the UI
                const goldUpdatedEvent = new CustomEvent('playerGoldUpdated', {
                    detail: { gold: loot.gold }
                });
                document.dispatchEvent(goldUpdatedEvent);
                
                return true;
            })
            .catch(error => {
                console.error('Error updating player gold:', error);
                return false;
            });
    }
}

export default MultiplayerManager; 