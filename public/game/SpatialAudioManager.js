/**
 * SpatialAudioManager.js - Handles spatial audio for the game using Web Audio API
 */
import * as THREE from 'three';

class SpatialAudioManager {
    constructor() {
        // Initialize Web Audio API context
        this.audioContext = null;
        this.listener = null;
        
        // Try to create audio context (may be blocked by browser until user interaction)
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.listener = this.audioContext.listener;
            console.log('Audio context created successfully');
        } catch (error) {
            console.warn('Failed to create audio context:', error);
        }
        
        // Audio buffer cache
        this.soundBuffers = {};
        
        // Active sounds
        this.activeSounds = new Map();
        
        // Fixed Y offset (since ships are at water level)
        this.yOffset = 5; // Slightly above water level
        
        // Master volume
        this.masterVolume = 0.5; // Default to 50%
        
        // Category volumes
        this.categoryVolumes = {
            sfx: 1.0,
            ambient: 0.8,
            music: 0.7
        };
        
        // Flag to track initialization
        this.initialized = false;
        
        // Bind methods
        this.updateListener = this.updateListener.bind(this);
    }
    
    /**
     * Initialize by loading sound files
     */
    async initialize() {
        if (this.initialized || !this.audioContext) return this;
        
        // Load cannon sound effects
        try {
            await Promise.all([
                this.loadSound('cannon_shot1', '/assets/sounds/sfx/cannon_shot1.mp3'),
                this.loadSound('cannon_shot2', '/assets/sounds/sfx/cannon_shot2.mp3'),
                this.loadSound('cannon_shot3', '/assets/sounds/sfx/cannon_shot3.mp3'),
                this.loadSound('cannon_shot4', '/assets/sounds/sfx/cannon_shot4.mp3'),
                // Load cannon impact sounds
                this.loadSound('cannon_impact1', '/assets/sounds/sfx/cannon_impact1.mp3'),
                this.loadSound('cannon_impact2', '/assets/sounds/sfx/cannon_impact2.mp3'),
                this.loadSound('cannon_impact3', '/assets/sounds/sfx/cannon_impact3.mp3'),
                this.loadSound('cannon_impact4', '/assets/sounds/sfx/cannon_impact4.mp3'),
                // Load cannonball splash sounds
                this.loadSound('cannonball_ploop1', '/assets/sounds/sfx/cannonball_ploop1.mp3'),
                this.loadSound('cannonball_ploop2', '/assets/sounds/sfx/cannonball_ploop2.mp3'),
                this.loadSound('cannonball_ploop3', '/assets/sounds/sfx/cannonball_ploop3.mp3')
            ]);
            
            console.log('Spatial audio sounds loaded successfully');
            this.initialized = true;
            
            // Verify sounds were loaded correctly after a short delay
            setTimeout(() => this.verifyCannonSoundsLoaded(), 500);
        } catch (error) {
            console.error('Failed to load spatial audio sounds:', error);
        }
        
        return this;
    }
    
    /**
     * Resume audio context (must be called after user interaction)
     */
    resumeAudioContext() {
        if (!this.audioContext) {
            console.warn('Cannot resume audio context: not initialized');
            return false;
        }
        
        if (this.audioContext.state === 'suspended') {
            console.log('Attempting to resume audio context...');
            
            this.audioContext.resume()
                .then(() => {
                    console.log('Audio context resumed successfully');
                    
                    // Verify sounds are loaded after context is resumed
                    setTimeout(() => this.verifyCannonSoundsLoaded(), 500);
                })
                .catch(error => {
                    console.error('Failed to resume audio context:', error);
                });
        } else {
            console.log('Audio context already running:', this.audioContext.state);
        }
        
        return true;
    }
    
    /**
     * Load a sound file and store in buffer
     * @param {string} id - Sound identifier
     * @param {string} url - Sound file URL
     */
    async loadSound(id, url) {
        if (!this.audioContext) {
            console.warn('Cannot load sound: audio context not available');
            return false;
        }
        
        console.log(`Attempting to load sound "${id}" from ${url}`);
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log(`Sound "${id}" fetched successfully, decoding audio data...`);
            
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.soundBuffers[id] = audioBuffer;
            console.log(`Sound "${id}" loaded and ready to play`);
            return true;
        } catch (error) {
            console.error(`Error loading sound ${id} from ${url}:`, error);
            return false;
        }
    }
    
    /**
     * Update the audio listener position and orientation based on camera
     * @param {THREE.Camera} camera - The game camera
     * @param {THREE.Vector3} playerPosition - The player ship position (for fallback)
     */
    updateListener(camera, playerPosition = null) {
        if (!this.audioContext || !this.listener) return;
        
        // If audio context is suspended, don't bother updating
        if (this.audioContext.state === 'suspended') return;
        
        // Use camera if available, otherwise use player position with default orientation
        if (camera) {
            // Get camera position
            const position = camera.position;
            
            // Get camera forward direction (what the camera is looking at)
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            
            // Get camera up direction
            const up = camera.up;
            
            // Update audio listener position and orientation - with error handling for browser differences
            try {
                // Try modern API first (Firefox)
                if (this.listener.positionX !== undefined) {
                    this.listener.positionX.value = position.x;
                    this.listener.positionY.value = position.y;
                    this.listener.positionZ.value = position.z;
                    this.listener.forwardX.value = forward.x;
                    this.listener.forwardY.value = forward.y;
                    this.listener.forwardZ.value = forward.z;
                    this.listener.upX.value = up.x;
                    this.listener.upY.value = up.y;
                    this.listener.upZ.value = up.z;
                } 
                // Try legacy API (Chrome, Safari)
                else if (typeof this.listener.setPosition === 'function') {
                    this.listener.setPosition(position.x, position.y, position.z);
                    this.listener.setOrientation(
                        forward.x, forward.y, forward.z,
                        up.x, up.y, up.z
                    );
                }
                // If neither is available, try generic way
                else {
                    console.warn('Audio listener API not fully supported in this browser');
                }
            } catch (e) {
                console.warn('Error updating audio listener:', e);
            }
        } else if (playerPosition) {
            // Fallback to using player position with default orientation
            try {
                if (this.listener.positionX !== undefined) {
                    this.listener.positionX.value = playerPosition.x;
                    this.listener.positionY.value = playerPosition.y + this.yOffset;
                    this.listener.positionZ.value = playerPosition.z;
                    // Use default orientation (forward = -Z, up = +Y)
                    this.listener.forwardX.value = 0;
                    this.listener.forwardY.value = 0;
                    this.listener.forwardZ.value = -1;
                    this.listener.upX.value = 0;
                    this.listener.upY.value = 1;
                    this.listener.upZ.value = 0;
                } else if (typeof this.listener.setPosition === 'function') {
                    this.listener.setPosition(
                        playerPosition.x, 
                        playerPosition.y + this.yOffset, 
                        playerPosition.z
                    );
                    this.listener.setOrientation(0, 0, -1, 0, 1, 0);
                } else {
                    console.warn('Audio listener API not fully supported in this browser');
                }
            } catch (e) {
                console.warn('Error setting fallback listener position:', e);
            }
        }
    }
    
    /**
     * Set master volume for all sounds
     * @param {number} volume - Volume from 0 to 1.0
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        // Update all active sounds
        this.activeSounds.forEach(sound => {
            if (sound.gainNode) {
                const categoryVolume = this.categoryVolumes[sound.category] || 1.0;
                sound.gainNode.gain.value = this.masterVolume * categoryVolume * sound.baseVolume;
            }
        });
        
        return this;
    }
    
    /**
     * Set volume for a sound category
     * @param {string} category - The category (sfx, ambient, music)
     * @param {number} volume - Volume from 0 to 1
     */
    setCategoryVolume(category, volume) {
        this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
        
        // Update all active sounds in this category
        this.activeSounds.forEach(sound => {
            if (sound.gainNode && sound.category === category) {
                sound.gainNode.gain.value = this.masterVolume * this.categoryVolumes[category] * sound.baseVolume;
            }
        });
        
        return this;
    }
    
    /**
     * Play a spatial sound at the given position
     * @param {string} soundId - ID of the sound to play
     * @param {THREE.Vector3} position - 3D position of the sound
     * @param {string} category - Sound category (sfx, ambient, music)
     * @param {Object} options - Additional options
     * @returns {Object} Sound controller with stop method
     */
    playSpatialSound(soundId, position, category = 'sfx', options = {}) {
        if (!this.audioContext || !this.soundBuffers[soundId]) {
            console.warn(`Cannot play sound ${soundId}: context not available or sound not loaded`);
            return null;
        }
        
        // Resume audio context if suspended (needed for browsers with autoplay policies)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume()
                .then(() => console.log('Audio context resumed during playback'))
                .catch(err => console.warn('Failed to resume audio context:', err));
            return null; // Can't play sound until context is resumed
        }
        
        // Get sound buffer
        const buffer = this.soundBuffers[soundId];
        
        // Create audio source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        const baseVolume = options.volume !== undefined ? options.volume : 1.0;
        const categoryVolume = this.categoryVolumes[category] || 1.0;
        gainNode.gain.value = this.masterVolume * categoryVolume * baseVolume;
        
        // Create panner node for spatial audio
        const panner = this.audioContext.createPanner();
        panner.panningModel = options.panningModel || 'HRTF'; // 'HRTF' is more realistic
        panner.distanceModel = options.distanceModel || 'exponential';
        panner.refDistance = options.refDistance || 50; // Distance at which the volume starts decreasing
        panner.maxDistance = options.maxDistance || 3000; // Distance beyond which the volume doesn't decrease
        panner.rolloffFactor = options.rolloffFactor || 1.0; // How quickly the volume drops with distance
        
        // Set position of sound in 3D space (with proper handling for different browser APIs)
        try {
            // Modern API (property accessors)
            if (panner.positionX !== undefined) {
                panner.positionX.value = position.x;
                panner.positionY.value = position.y + this.yOffset;
                panner.positionZ.value = position.z;
            } else {
                // Legacy API (method call)
                panner.setPosition(position.x, position.y + this.yOffset, position.z);
            }
        } catch (e) {
            console.warn('Error setting panner position:', e);
            // Fallback to legacy method
            try {
                panner.setPosition(position.x, position.y + this.yOffset, position.z);
            } catch (e2) {
                console.error('Failed to set panner position with either API:', e2);
            }
        }
        
        // Connect nodes: source -> gain -> panner -> destination
        source.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(this.audioContext.destination);
        
        // Set options
        if (options.loop) {
            source.loop = true;
        }
        
        // Play the sound
        source.start(0);
        
        // Create unique ID for this sound instance
        const soundInstanceId = `${soundId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create sound controller
        const soundController = {
            id: soundInstanceId,
            source,
            gainNode,
            panner,
            position: position.clone(),
            category,
            baseVolume,
            stop: () => {
                try {
                    source.stop();
                    this.activeSounds.delete(soundInstanceId);
                } catch (e) {
                    console.warn('Error stopping sound:', e);
                }
            },
            updatePosition: (newPosition) => {
                try {
                    if (panner.positionX !== undefined) {
                        panner.positionX.value = newPosition.x;
                        panner.positionY.value = newPosition.y + this.yOffset;
                        panner.positionZ.value = newPosition.z;
                    } else {
                        panner.setPosition(newPosition.x, newPosition.y + this.yOffset, newPosition.z);
                    }
                    position.copy(newPosition);
                } catch (e) {
                    console.warn('Error updating panner position:', e);
                }
            },
            setVolume: (newVolume) => {
                baseVolume = newVolume;
                gainNode.gain.value = this.masterVolume * categoryVolume * newVolume;
            }
        };
        
        // Store active sound
        this.activeSounds.set(soundInstanceId, soundController);
        
        // Auto-cleanup when sound ends
        source.onended = () => {
            this.activeSounds.delete(soundInstanceId);
        };
        
        return soundController;
    }
    
    /**
     * Update volume levels from game UI settings (0-100 scale)
     * @param {number} uiVolumeLevel - Volume level from UI (0-100)
     */
    updateFromGameUI(uiVolumeLevel) {
        // Convert 0-100 scale to 0-1 scale
        const normalizedVolume = uiVolumeLevel / 100;
        console.log(`SpatialAudioManager: Setting volume to ${normalizedVolume} (from UI value ${uiVolumeLevel})`);
        this.setMasterVolume(normalizedVolume);
        return this;
    }
    
    /**
     * Play a cannon shot sound with spatial audio
     * @param {boolean} isPlayerShip - Whether it's the player's ship
     * @param {THREE.Vector3} position - Position of the ship firing
     * @returns {Object} Sound controller
     */
    playCannonSound(isPlayerShip, position) {
        // Get user volume setting (default to current master volume if not available)
        const userVolume = this.masterVolume;
        
        // Select a random cannon sound (1-4)
        const randomIndex = Math.floor(Math.random() * 4) + 1;
        const soundId = `cannon_shot${randomIndex}`;
        
        // Check if the sound is loaded
        if (!this.soundBuffers[soundId]) {
            console.warn(`Cannot play cannon sound "${soundId}" - sound not loaded`);
            return null;
        }
        
        console.log(`Playing cannon sound: ${soundId}, player ship: ${isPlayerShip}, volume: ${userVolume}`);
        
        // Player's cannons are louder and more prominent
        if (isPlayerShip) {
            return this.playSpatialSound(soundId, position, 'sfx', {
                volume: 1.0 * userVolume,  // Apply user volume setting
                refDistance: 1, // Player sounds are not attenuated with distance as much
                maxDistance: 10000,
                rolloffFactor: 0.1 // Minimal rolloff for player sounds
            });
        } else {
            // Enemy cannons use full spatial audio
            return this.playSpatialSound(soundId, position, 'sfx', {
                volume: 0.9 * userVolume,  // Apply user volume setting
                refDistance: 50,
                maxDistance: 500,
                rolloffFactor: 2
            });
        }
    }
    
    /**
     * Play a cannon impact sound with spatial audio
     * @param {boolean} isPlayerShip - Whether it's the player's ship being hit
     * @param {THREE.Vector3} position - Position of the impact
     * @returns {Object} Sound controller
     */
    playCannonImpactSound(isPlayerShip, position) {
        // Get user volume setting
        const userVolume = this.masterVolume;
        
        // Select a random impact sound (1-4)
        const randomIndex = Math.floor(Math.random() * 4) + 1;
        const soundId = `cannon_impact${randomIndex}`;
        
        // Check if the sound is loaded
        if (!this.soundBuffers[soundId]) {
            console.warn(`Cannot play impact sound "${soundId}" - sound not loaded`);
            return null;
        }
        
        console.log(`Playing impact sound: ${soundId}, player ship: ${isPlayerShip}, volume: ${userVolume}`);
        
        // Impacts on player ship are louder and more prominent
        if (isPlayerShip) {
            return this.playSpatialSound(soundId, position, 'sfx', {
                volume: 1.0 * userVolume,
                refDistance: 1,
                maxDistance: 10000,
                rolloffFactor: 0.1 // Minimal rolloff for player impacts
            });
        } else {
            // Impacts on other ships use full spatial audio
            return this.playSpatialSound(soundId, position, 'sfx', {
                volume: 0.9 * userVolume,
                refDistance: 50, // Slightly closer audible range than firing sounds
                maxDistance: 500,
                rolloffFactor: 1.5
            });
        }
    }
    
    /**
     * Play a cannonball splash sound when it hits water
     * @param {THREE.Vector3} position - Position of the splash
     * @returns {Object} Sound controller
     */
    playCannonballSplashSound(position) {
        // Get user volume setting
        const userVolume = this.masterVolume;
        
        // Select a random splash sound (1-3)
        const randomIndex = Math.floor(Math.random() * 3) + 1;
        const soundId = `cannonball_ploop${randomIndex}`;
        
        // Check if the sound is loaded
        if (!this.soundBuffers[soundId]) {
            console.warn(`Cannot play splash sound "${soundId}" - sound not loaded`);
            return null;
        }
        
        console.log(`Playing splash sound: ${soundId}, position: ${position.x.toFixed(1)},${position.y.toFixed(1)},${position.z.toFixed(1)}, volume: ${userVolume}`);
        
        // Use spatial audio parameters for water splash
        return this.playSpatialSound(soundId, position, 'sfx', {
            volume: 0.95 * userVolume, // Slightly quieter than cannon shots
            refDistance: 50,
            maxDistance: 500, // Can't hear splashes from too far away
            rolloffFactor: 1.05
        });
    }
    
    /**
     * Initialize the spatial audio system - alias for initialize() for backward compatibility
     * @returns {SpatialAudioManager} This instance, for chaining
     */
    init() {
        console.log('SpatialAudioManager.init() called (using initialize() internally)');
        this.initialize();
        return this;
    }
    
    /**
     * Verify that all cannon sounds were loaded correctly
     */
    verifyCannonSoundsLoaded() {
        console.log('Verifying cannon sounds loaded:');
        let allSoundsLoaded = true;
        
        // Check cannon shot sounds
        console.log('Cannon shot sounds:');
        for (let i = 1; i <= 4; i++) {
            const soundId = `cannon_shot${i}`;
            if (this.soundBuffers[soundId]) {
                console.log(`✅ ${soundId} loaded successfully`);
            } else {
                console.warn(`❌ ${soundId} failed to load`);
                allSoundsLoaded = false;
            }
        }
        
        // Check cannon impact sounds
        console.log('Cannon impact sounds:');
        for (let i = 1; i <= 4; i++) {
            const soundId = `cannon_impact${i}`;
            if (this.soundBuffers[soundId]) {
                console.log(`✅ ${soundId} loaded successfully`);
            } else {
                console.warn(`❌ ${soundId} failed to load`);
                allSoundsLoaded = false;
            }
        }
        
        // Check cannonball splash sounds
        console.log('Cannonball splash sounds:');
        for (let i = 1; i <= 3; i++) {
            const soundId = `cannonball_ploop${i}`;
            if (this.soundBuffers[soundId]) {
                console.log(`✅ ${soundId} loaded successfully`);
            } else {
                console.warn(`❌ ${soundId} failed to load`);
                allSoundsLoaded = false;
            }
        }
        
        if (allSoundsLoaded) {
            console.log('All cannon sounds loaded successfully');
        } else {
            console.warn('Some cannon sounds failed to load, there may be audio issues');
        }
        
        return allSoundsLoaded;
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Stop all active sounds
        this.activeSounds.forEach(sound => {
            sound.stop();
        });
        
        // Clear collections
        this.activeSounds.clear();
        this.soundBuffers = {};
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

export default SpatialAudioManager; 