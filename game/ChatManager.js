// ChatManager.js - Handles in-game chat functionality with Firebase
class ChatManager {
    constructor() {
        this.db = firebase.database();
        this.messagesRef = this.db.ref('chat/messages');
        this.profanityRef = this.db.ref('profanityList');
        this.messageLimit = 50; // Number of messages to keep in history
        this.profanityList = []; // Will be populated from Firebase
        this.speechBubbles = new Map(); // Track active speech bubbles
        this.camera = null; // Will be set from outside
        this.playerShips = new Map(); // Will store player ship references
        
        // Constants for speech bubble scaling
        this.MAX_DISTANCE = 1000; // Maximum distance to show bubble
        this.MIN_SCALE = 0.4;   // Minimum scale at maximum distance
        
        // Load profanity list from Firebase
        this.loadProfanityList();
        this.initializeChat();
    }

    // Set up required references
    setGameReferences(camera, playerShips) {
        this.camera = camera;
        // Convert array to Map if array is provided
        if (Array.isArray(playerShips)) {
            this.playerShips = new Map(
                playerShips.map(ship => [ship.id, ship])
            );
        } else if (playerShips instanceof Map) {
            this.playerShips = playerShips;
        }
    }

    loadProfanityList() {
        this.profanityRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                this.profanityList = snapshot.val();
            } else {
                // Fallback to a minimal default list if Firebase list is empty
                this.profanityList = ['badword'];
            }
        }).catch(error => {
            console.error('Error loading profanity list:', error);
            // Fallback to minimal default list on error
            this.profanityList = ['badword'];
        });
    }

    initializeChat() {
        // Get initial timestamp to filter old messages
        this.initTimestamp = Date.now();

        // Listen for new messages
        this.messagesRef.limitToLast(this.messageLimit).on('child_added', (snapshot) => {
            const message = snapshot.val();
            
            // Only show speech bubble for messages that came after we initialized
            const isNewMessage = message.timestamp >= this.initTimestamp;
            
            // Always display in chat window
            if (typeof this.onMessageReceived === 'function') {
                this.onMessageReceived(message);
            }
            
            // Only show speech bubble for new messages
            if (isNewMessage) {
                this.displayMessage(message);
            }
        });

        // Create style for speech bubbles
        const style = document.createElement('style');
        style.textContent = `
            .speech-bubble {
                position: absolute;
                background: rgba(255, 255, 255, 0.95);
                color: #1a1a1a;
                padding: 12px;
                border-radius: 12px;
                font-size: 14px;
                max-width: 200px;
                text-align: center;
                pointer-events: none;
                opacity: 1;
                transition: all 0.3s ease;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(5px);
                font-family: 'Arial', sans-serif;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 24px;
                animation: bubblePop 0.3s ease-out forwards;
            }
            .speech-bubble:after {
                content: '';
                position: absolute;
                left: -10px;
                top: 50%;
                border-width: 10px 10px 10px 0;
                border-style: solid;
                border-color: transparent rgba(255, 255, 255, 0.95) transparent transparent;
                transform: translateY(-50%);
            }
            @keyframes bubblePop {
                0% {
                    opacity: 0;
                    transform: translateY(-50%) scale(var(--initial-scale, 1) * 0.8);
                }
                50% {
                    transform: translateY(-50%) scale(var(--initial-scale, 1) * 1.05);
                }
                100% {
                    opacity: 1;
                    transform: translateY(-50%) scale(var(--initial-scale, 1));
                }
            }
        `;
        document.head.appendChild(style);
    }

    sendMessage(playerName, messageText, shipId) {
        if (!messageText.trim()) return;

        const filteredMessage = this.filterProfanity(messageText);
        const messageData = {
            playerName: playerName,
            message: filteredMessage,
            timestamp: Date.now(),
            shipId: shipId
        };

        this.messagesRef.push(messageData);
    }

    filterProfanity(text) {
        let filteredText = text.toLowerCase();
        // Convert object to array of values or use Object.values directly
        const words = Object.values(this.profanityList || {});
        words.forEach(word => {
            if (typeof word === 'string') {
                const regex = new RegExp('\\b' + word + '\\b', 'gi');
                filteredText = filteredText.replace(regex, '*'.repeat(word.length));
            }
        });
        return filteredText;
    }

    displayMessage(message) {
        console.log('Received message:', message);
        
        // Display speech bubble if we have the ship
        if (message.shipId) {
            console.log('Looking for ship with ID:', message.shipId);
            
            // Try to find the ship in various places
            let ship = null;
            
            // Check local player ships
            if (this.playerShips instanceof Map) {
                ship = this.playerShips.get(message.shipId);
            } else if (Array.isArray(this.playerShips)) {
                ship = this.playerShips.find(s => s.id === message.shipId);
            }
            
            // If not found and multiplayer is available, check other player ships
            if (!ship && window.multiplayerManager && window.multiplayerManager.otherPlayerShips) {
                ship = window.multiplayerManager.otherPlayerShips.get(message.shipId);
                console.log('Found ship in multiplayer:', ship ? 'yes' : 'no');
            }
            
            if (ship) {
                console.log('Found ship for message:', ship);
                this.showSpeechBubble(message, ship);
            } else {
                console.log('Ship not found for shipId:', message.shipId);
            }
        } else {
            console.log('Message missing shipId');
        }
    }

    showSpeechBubble(message, ship) {
        console.log('showSpeechBubble called with ship:', ship);
        
        if (!ship || !this.camera) {
            console.log('Missing required objects:', {
                hasShip: !!ship,
                hasCamera: !!this.camera
            });
            return;
        }

        // Get initial position and scale
        let initialPosition = null;
        let initialScale = 1;
        
        // Calculate initial position and scale
        if (ship.getPosition) {
            initialPosition = ship.getPosition();
        } else if (ship.position) {
            initialPosition = ship.position;
        }

        if (initialPosition) {
            const distance = initialPosition.distanceTo(this.camera.position);
            if (distance > this.MAX_DISTANCE) {
                console.log('Initial position too far away:', distance);
                return; // Don't create bubble if too far
            }
            initialScale = Math.max(this.MIN_SCALE, 1 - (distance / this.MAX_DISTANCE) * (1 - this.MIN_SCALE));
        }

        // Remove existing bubble for this ship if it exists
        if (this.speechBubbles.has(message.shipId)) {
            console.log('Removing existing bubble for ship:', message.shipId);
            const oldBubble = this.speechBubbles.get(message.shipId);
            oldBubble.element.remove();
            if (oldBubble.timeout) {
                clearTimeout(oldBubble.timeout);
            }
        }

        // Create new speech bubble with initial scale
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = message.message;
        bubble.style.setProperty('--initial-scale', initialScale); // Set CSS variable for animation
        document.body.appendChild(bubble);
        console.log('Created new speech bubble element with initial scale:', initialScale);

        // Position the bubble above the ship
        const updatePosition = () => {
            // For multiplayer ships, we need to check the position differently
            let position;
            if (ship.getPosition) {
                position = ship.getPosition();
            } else if (ship.position) {
                position = ship.position;
            }

            if (!position) {
                console.log('Ship missing position:', ship);
                return;
            }

            // Calculate distance to ship
            const cameraPosition = this.camera.position;
            const distance = position.distanceTo(cameraPosition);

            // Hide bubble if ship is too far away
            if (distance > this.MAX_DISTANCE) {
                bubble.style.display = 'none';
                console.log('Bubble hidden - ship too far away:', distance);
                return;
            }
            
            // Convert 3D position to screen coordinates
            const vector = position.clone();
            vector.y += 2; // Reduced vertical offset since we're positioning to the side
            vector.project(this.camera);

            // Position bubble to the right of the ship with some offset
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth + 50; // 50px to the right
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

            // Calculate scale based on distance (100% at 0 distance, MIN_SCALE at MAX_DISTANCE)
            const scale = Math.max(this.MIN_SCALE, 1 - (distance / this.MAX_DISTANCE) * (1 - this.MIN_SCALE));

            console.log('Bubble position calculated:', {
                shipPosition: position,
                screenX: x,
                screenY: y,
                vectorZ: vector.z,
                distance: distance,
                scale: scale
            });

            if (vector.z < 1) {
                bubble.style.left = `${x}px`;
                bubble.style.top = `${y}px`;
                bubble.style.transform = `translateY(-50%) scale(${scale})`;
                bubble.style.display = 'block';
                console.log('Bubble positioned and shown');
            } else {
                bubble.style.display = 'none';
                console.log('Bubble hidden - ship is behind camera');
            }
        };

        // Store the update function and element
        const bubbleData = {
            element: bubble,
            update: updatePosition,
            timeout: null
        };

        // Set timeout to remove bubble
        bubbleData.timeout = setTimeout(() => {
            console.log('Fading out bubble for ship:', message.shipId);
            bubble.style.opacity = '0';
            setTimeout(() => {
                bubble.remove();
                this.speechBubbles.delete(message.shipId);
                console.log('Bubble removed for ship:', message.shipId);
            }, 300); // Wait for fade animation
        }, 5000);

        this.speechBubbles.set(message.shipId, bubbleData);
        updatePosition();
    }

    // Call this in your game's animation loop
    update() {
        if (this.speechBubbles.size > 0) {
            console.log('Updating speech bubbles, count:', this.speechBubbles.size);
        }
        this.speechBubbles.forEach(bubble => {
            if (bubble.update) {
                bubble.update();
            }
        });
    }

    // Set callback for new messages
    setMessageCallback(callback) {
        this.onMessageReceived = callback;
    }
} 