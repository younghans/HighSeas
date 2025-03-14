// Multiplayer functionality using Firebase Realtime Database
import * as THREE from 'three';

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
        this.SYNC_INTERVAL = 5000; // 5 seconds in milliseconds
        this.debugMode = true; // Enable debug mode
        
        // Bind methods
        this.updatePlayerPosition = this.updatePlayerPosition.bind(this);
        this.handlePlayerAdded = this.handlePlayerAdded.bind(this);
        this.handlePlayerChanged = this.handlePlayerChanged.bind(this);
        this.handlePlayerRemoved = this.handlePlayerRemoved.bind(this);
        this.createPlayerShip = this.createPlayerShip.bind(this);
        this.updatePlayerShip = this.updatePlayerShip.bind(this);
        this.removePlayerShip = this.removePlayerShip.bind(this);
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
     * Initialize multiplayer functionality
     * @param {Object} playerShip - The player's ship object
     */
    init(playerShip) {
        if (!this.auth || !this.auth.getCurrentUser()) {
            console.error('User must be logged in to use multiplayer');
            return false;
        }
        
        // Get the current user
        const user = this.auth.getCurrentUser();
        this.playerId = user.uid;
        
        this.debug(`Initializing multiplayer for player: ${user.displayName || user.email || 'Unknown'} (${this.playerId})`);
        
        // Create a reference to this player's data
        this.playerRef = this.playersRef.child(this.playerId);
        
        // Set initial player data
        const initialData = {
            id: this.playerId,
            displayName: user.displayName || user.email || 'Sailor',
            position: {
                x: playerShip.position.x,
                y: playerShip.position.y,
                z: playerShip.position.z
            },
            rotation: {
                y: playerShip.rotation.y
            },
            destination: null,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            isOnline: true
        };
        
        this.playerRef.set(initialData);
        this.debug('Initial player data synced to server:', initialData);
        
        // Set up presence system
        this.setupPresence();
        
        // Listen for other players
        this.playersRef.on('child_added', this.handlePlayerAdded);
        this.playersRef.on('child_changed', this.handlePlayerChanged);
        this.playersRef.on('child_removed', this.handlePlayerRemoved);
        
        // Start periodic sync
        this.startPeriodicSync(playerShip);
        
        return true;
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
     */
    updatePlayerPosition(playerShip) {
        if (!this.playerRef) return;
        
        const now = Date.now();
        
        // Only update if it's been at least 1 second since the last update
        // This prevents excessive database writes
        if (now - this.lastSyncTime < 1000) return;
        
        this.lastSyncTime = now;
        
        // Update player data
        const updateData = {
            position: {
                x: playerShip.position.x,
                y: playerShip.position.y,
                z: playerShip.position.z
            },
            rotation: {
                y: playerShip.rotation.y
            },
            destination: playerShip.targetPosition ? {
                x: playerShip.targetPosition.x,
                y: playerShip.targetPosition.y,
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
        
        // Create a simple ship representation for other players
        const shipGeometry = new THREE.BoxGeometry(2, 1, 4);
        const shipMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
        
        // Set initial position and rotation
        shipMesh.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        shipMesh.rotation.y = playerData.rotation.y || 0;
        
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
        shipMesh.userData.nametag = nametagDiv;
        shipMesh.userData.playerId = playerData.id;
        shipMesh.userData.lastPosition = new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        // Store destination if available
        if (playerData.destination) {
            shipMesh.userData.destination = new THREE.Vector3(
                playerData.destination.x,
                playerData.destination.y,
                playerData.destination.z
            );
        }
        
        // Add to scene
        this.scene.add(shipMesh);
        
        // Store ship mesh
        this.otherPlayerShips.set(playerData.id, shipMesh);
    }
    
    /**
     * Update a ship for another player
     * @param {Object} playerData - Player data from Firebase
     */
    updatePlayerShip(playerData) {
        // Get the ship mesh
        const shipMesh = this.otherPlayerShips.get(playerData.id);
        
        // If player is offline, remove their ship
        if (!playerData.isOnline) {
            this.debug(`Player went offline: ${playerData.displayName} (${playerData.id})`);
            this.removePlayerShip(playerData.id);
            return;
        }
        
        // If ship doesn't exist yet, create it
        if (!shipMesh) {
            this.createPlayerShip(playerData);
            return;
        }
        
        this.debug(`Updating ship for player: ${playerData.displayName} (${playerData.id})`, {
            position: playerData.position,
            destination: playerData.destination
        });
        
        // Update last known position
        shipMesh.userData.lastPosition = new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        // Update destination if available
        if (playerData.destination) {
            shipMesh.userData.destination = new THREE.Vector3(
                playerData.destination.x,
                playerData.destination.y,
                playerData.destination.z
            );
        } else {
            shipMesh.userData.destination = null;
        }
        
        // Update rotation
        shipMesh.rotation.y = playerData.rotation.y || 0;
    }
    
    /**
     * Remove a ship for another player
     * @param {string} playerId - Player ID
     */
    removePlayerShip(playerId) {
        // Get the ship mesh
        const shipMesh = this.otherPlayerShips.get(playerId);
        
        if (shipMesh) {
            const playerName = shipMesh.userData.nametag ? shipMesh.userData.nametag.textContent : 'Unknown';
            this.debug(`Removing ship for player: ${playerName} (${playerId})`);
            
            // Remove nametag
            if (shipMesh.userData.nametag) {
                document.body.removeChild(shipMesh.userData.nametag);
            }
            
            // Remove from scene
            this.scene.remove(shipMesh);
            
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
        this.otherPlayerShips.forEach((shipMesh, playerId) => {
            const playerData = this.otherPlayers.get(playerId);
            
            if (!playerData || !playerData.isOnline) return;
            
            // If the ship has a destination, move towards it
            if (shipMesh.userData.destination) {
                const destination = shipMesh.userData.destination;
                const direction = new THREE.Vector3().subVectors(destination, shipMesh.position);
                
                // If we're close enough to the destination, stop moving
                if (direction.length() < 0.5) {
                    this.debug(`Player reached destination: ${playerData.displayName} (${playerId})`);
                    shipMesh.userData.destination = null;
                    return;
                }
                
                // Normalize direction and move ship
                direction.normalize();
                
                // Assume a speed of 10 units per second for other players
                const speed = 10;
                
                // Move ship
                const movement = direction.clone().multiplyScalar(speed * delta);
                shipMesh.position.add(movement);
                
                // Log movement prediction occasionally (not every frame to avoid console spam)
                if (Math.random() < 0.05) { // Log roughly 5% of updates
                    this.debug(`Predicting movement for ${playerData.displayName}:`, {
                        currentPosition: shipMesh.position.clone(),
                        destination: destination,
                        distanceRemaining: direction.length(),
                        speed: speed,
                        delta: delta
                    });
                }
                
                // Update rotation to face direction of travel
                shipMesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
            
            // Update nametag position
            this.updateNametag(shipMesh);
        });
    }
    
    /**
     * Update nametag position for a ship
     * @param {Object} shipMesh - Ship mesh
     */
    updateNametag(shipMesh) {
        if (!shipMesh.userData.nametag) return;
        
        // Get the position of the ship in screen space
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(shipMesh.matrixWorld);
        
        // Add some height to position the nametag above the ship
        position.y += 2;
        
        // Project the position to screen space
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        // Clone the position to avoid modifying the original
        const screenPosition = position.clone();
        screenPosition.project(this.scene.userData.camera);
        
        screenPosition.x = (screenPosition.x * widthHalf) + widthHalf;
        screenPosition.y = -(screenPosition.y * heightHalf) + heightHalf;
        
        // Update nametag position
        shipMesh.userData.nametag.style.left = `${screenPosition.x}px`;
        shipMesh.userData.nametag.style.top = `${screenPosition.y}px`;
        
        // Hide nametag if ship is behind the camera
        if (screenPosition.z > 1) {
            shipMesh.userData.nametag.style.display = 'none';
        } else {
            shipMesh.userData.nametag.style.display = 'block';
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
        this.otherPlayerShips.forEach((shipMesh, playerId) => {
            this.removePlayerShip(playerId);
        });
        
        // Clear player reference
        if (this.playerRef) {
            this.debug('Setting player as offline');
            this.playerRef.update({ isOnline: false });
            this.playerRef = null;
        }
        
        // Clear other data
        this.otherPlayers.clear();
        this.otherPlayerShips.clear();
        this.debug('Multiplayer cleanup complete');
    }
}

export default MultiplayerManager; 