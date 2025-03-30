/**
 * SoundManager.js - Handles all audio for the game
 */
class SoundManager {
    constructor() {
        // Sound categories
        this.sounds = {
            ambient: {},
            sfx: {},
            music: {}
        };
        
        // Volume settings (0.0 to 1.0)
        this.masterVolume = 0.5; // Default to 50%
        this.categoryVolumes = {
            ambient: 1.0,
            sfx: 1.0,
            music: 1.0
        };
        
        // Currently playing sounds
        this.currentlyPlaying = {
            ambient: [],
            sfx: [],
            music: []
        };
        
        // Initialize paths
        this.soundPaths = {
            ambient: '/assets/sounds/ambient/',
            sfx: '/assets/sounds/sfx/',
            music: '/assets/sounds/music/'
        };
        
        // Flag to track initialization
        this.initialized = false;
        
        // Flag to track if user has interacted with page
        this.userHasInteracted = false;
        
        // Queue of sounds awaiting playback (for autoplay restrictions)
        this.pendingPlayback = [];
        
        // Flag to track whether ocean ambient listeners have been set up
        this._oceanAmbientListenersSetup = false;
        
        // Add global event listeners for detecting user interaction
        this.setupInteractionListeners();
    }
    
    /**
     * Setup event listeners to detect user interaction with the page
     */
    setupInteractionListeners() {
        const markUserInteraction = () => {
            this.userHasInteracted = true;
            
            // Try to play any pending sounds
            this.playPendingSounds();
            
            // Remove event listeners after first interaction
            document.removeEventListener('click', markUserInteraction);
            document.removeEventListener('keydown', markUserInteraction);
            document.removeEventListener('touchstart', markUserInteraction);
            
            // Also resume SpatialAudioManager if it exists
            if (window.spatialAudioManager) {
                window.spatialAudioManager.resumeAudioContext();
            }
        };
        
        document.addEventListener('click', markUserInteraction);
        document.addEventListener('keydown', markUserInteraction);
        document.addEventListener('touchstart', markUserInteraction);
    }
    
    /**
     * Setup event listeners to play ocean ambient sound when user interacts
     * @param {Object} gameUI - The game UI instance to get volume settings from
     */
    playOceanAmbientOnInteraction(gameUI) {
        // Only set up once
        if (this._oceanAmbientListenersSetup) return this;
        
        // Function to start ambient sounds
        const startAmbientSounds = () => {
            console.log('Starting ambient ocean sounds after user interaction');
            this.playOceanAmbient();
            
            // Set initial volume based on UI settings
            if (gameUI && gameUI.soundVolume !== undefined) {
                this.updateFromGameUI(gameUI.soundVolume);
                
                // Also update SpatialAudioManager volume if it exists
                if (window.spatialAudioManager) {
                    window.spatialAudioManager.updateFromGameUI(gameUI.soundVolume);
                }
            }
            
            // Clean up event listeners after first interaction
            document.removeEventListener('click', startAmbientSounds);
            document.removeEventListener('keydown', startAmbientSounds);
            document.removeEventListener('touchstart', startAmbientSounds);
        };
        
        // If user has already interacted, play sounds immediately
        if (this.userHasInteracted) {
            startAmbientSounds();
        } else {
            // Add event listeners for common user interactions
            document.addEventListener('click', startAmbientSounds);
            document.addEventListener('keydown', startAmbientSounds);
            document.addEventListener('touchstart', startAmbientSounds);
        }
        
        // Mark as set up
        this._oceanAmbientListenersSetup = true;
        
        console.log('Ocean sound event listeners set up - waiting for user interaction');
        return this;
    }
    
    /**
     * Initialize the sound manager and preload sounds
     */
    init() {
        if (this.initialized) return this;
        
        // Load ambient sounds
        this.loadSound('ocean_loop', 'ambient', 'ocean_loop.mp3');
        
        // Set up interaction listeners
        this.setupInteractionListeners();
        
        // Set initialized flag
        this.initialized = true;
        
        console.log('SoundManager initialized');
        return this;
    }
    
    /**
     * Preload all sounds to prepare them for playback
     * This does not play sounds, just loads them into memory
     */
    preloadSounds() {
        // Iterate through all sound categories and keys
        Object.keys(this.sounds).forEach(category => {
            Object.keys(this.sounds[category]).forEach(key => {
                const sound = this.sounds[category][key];
                if (sound && sound.audio) {
                    // Force the browser to load the audio file by starting to load it
                    sound.audio.load();
                }
            });
        });
        
        return this;
    }
    
    /**
     * Attempt to play any sounds that were requested before user interaction
     */
    playPendingSounds() {
        if (this.pendingPlayback.length === 0) return;
        
        console.log(`Playing ${this.pendingPlayback.length} pending sounds`);
        
        // Try to play each sound in the queue
        [...this.pendingPlayback].forEach(item => {
            this.play(item.key, item.category, item.options);
        });
        
        // Clear the queue
        this.pendingPlayback = [];
    }
    
    /**
     * Load a sound file
     * @param {string} key - The unique key for the sound
     * @param {string} category - The category (ambient, sfx, music)
     * @param {string} filename - The filename in the respective category folder
     */
    loadSound(key, category, filename) {
        // Create a new Audio element
        const audio = new Audio(this.soundPaths[category] + filename);
        
        // Set default properties
        audio.preload = 'auto';
        
        // Store in the sounds object
        this.sounds[category][key] = {
            audio: audio,
            loaded: false,
            playing: false,
            volume: 1.0
        };
        
        // Add event listener to track when the sound is loaded
        audio.addEventListener('canplaythrough', () => {
            this.sounds[category][key].loaded = true;
        });
        
        // Start loading the audio file
        audio.load();
        
        return this;
    }
    
    /**
     * Play a sound
     * @param {string} key - The unique key for the sound
     * @param {string} category - The category (ambient, sfx, music)
     * @param {object} options - Options for playback
     */
    play(key, category, options = {}) {
        const sound = this.sounds[category][key];
        
        // Check if sound exists and is loaded
        if (!sound) {
            console.warn(`Sound ${key} in category ${category} not found`);
            return this;
        }
        
        // If the user hasn't interacted with the page yet, queue the sound for later
        if (!this.userHasInteracted) {
            console.log(`User hasn't interacted yet. Queuing sound ${key} for later playback`);
            this.pendingPlayback.push({ key, category, options });
            return this;
        }
        
        // Set up options
        const loop = options.loop || false;
        const volume = (options.volume !== undefined) ? options.volume : 1.0;
        
        // Configure audio
        sound.audio.loop = loop;
        
        // Calculate final volume
        const finalVolume = this.masterVolume * this.categoryVolumes[category] * volume;
        sound.audio.volume = Math.max(0, Math.min(1, finalVolume));
        
        // Play the sound with error handling
        try {
            sound.audio.currentTime = 0;
            const playPromise = sound.audio.play();
            
            // Modern browsers return a promise from play()
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Sound started playing successfully
                        sound.playing = true;
                        console.log(`Successfully playing sound: ${key}`);
                    })
                    .catch(error => {
                        console.warn(`Error playing sound ${key}:`, error);
                        
                        // If it's an autoplay restriction, queue it for later
                        if (error.name === 'NotAllowedError') {
                            this.pendingPlayback.push({ key, category, options });
                        }
                    });
            } else {
                // Older browsers don't return a promise
                sound.playing = true;
            }
        } catch (e) {
            console.warn(`Error playing sound ${key}:`, e);
            
            // If it's an autoplay error, queue for later
            if (e.name === 'NotAllowedError') {
                this.pendingPlayback.push({ key, category, options });
            }
        }
        
        // Add to currently playing list
        if (!this.currentlyPlaying[category].includes(key)) {
            this.currentlyPlaying[category].push(key);
        }
        
        return this;
    }
    
    /**
     * Stop a sound
     * @param {string} key - The unique key for the sound
     * @param {string} category - The category (ambient, sfx, music)
     */
    stop(key, category) {
        const sound = this.sounds[category][key];
        
        // Check if sound exists
        if (!sound) {
            console.warn(`Sound ${key} in category ${category} not found`);
            return this;
        }
        
        // Stop the sound with error handling
        try {
            sound.audio.pause();
            sound.audio.currentTime = 0;
            sound.playing = false;
        } catch (e) {
            console.warn(`Error stopping sound ${key}:`, e);
        }
        
        // Remove from currently playing list
        const index = this.currentlyPlaying[category].indexOf(key);
        if (index !== -1) {
            this.currentlyPlaying[category].splice(index, 1);
        }
        
        // Remove from pending playback if it's queued
        this.pendingPlayback = this.pendingPlayback.filter(
            item => !(item.key === key && item.category === category)
        );
        
        return this;
    }
    
    /**
     * Pause a sound
     * @param {string} key - The unique key for the sound
     * @param {string} category - The category (ambient, sfx, music)
     */
    pause(key, category) {
        const sound = this.sounds[category][key];
        
        // Check if sound exists
        if (!sound) {
            console.warn(`Sound ${key} in category ${category} not found`);
            return this;
        }
        
        // Pause the sound with error handling
        try {
            sound.audio.pause();
        } catch (e) {
            console.warn(`Error pausing sound ${key}:`, e);
        }
        
        return this;
    }
    
    /**
     * Resume a paused sound
     * @param {string} key - The unique key for the sound
     * @param {string} category - The category (ambient, sfx, music)
     */
    resume(key, category) {
        const sound = this.sounds[category][key];
        
        // Check if sound exists
        if (!sound) {
            console.warn(`Sound ${key} in category ${category} not found`);
            return this;
        }
        
        // If the user hasn't interacted with the page yet, queue the resume for later
        if (!this.userHasInteracted) {
            console.log(`User hasn't interacted yet. Queuing sound ${key} resume for later`);
            this.pendingPlayback.push({ key, category, options: { loop: sound.audio.loop } });
            return this;
        }
        
        // Resume the sound with error handling
        try {
            const playPromise = sound.audio.play();
            
            // Modern browsers return a promise from play()
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn(`Error resuming sound ${key}:`, e);
                    
                    // If it's an autoplay restriction, queue it for later
                    if (e.name === 'NotAllowedError') {
                        this.pendingPlayback.push({ 
                            key, 
                            category, 
                            options: { loop: sound.audio.loop } 
                        });
                    }
                });
            }
        } catch (e) {
            console.warn(`Error resuming sound ${key}:`, e);
        }
        
        return this;
    }
    
    /**
     * Set master volume for all sounds
     * @param {number} volume - Volume from 0 to 1.0
     */
    setMasterVolume(volume) {
        // Store normalized volume (0-1)
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        // Update all currently playing sounds
        Object.keys(this.currentlyPlaying).forEach(category => {
            this.currentlyPlaying[category].forEach(key => {
                const sound = this.sounds[category][key];
                if (sound && sound.playing) {
                    sound.audio.volume = this.masterVolume * this.categoryVolumes[category] * sound.volume;
                }
            });
        });
        
        return this;
    }
    
    /**
     * Set volume for a sound category
     * @param {string} category - The category (ambient, sfx, music)
     * @param {number} volume - Volume from 0 to 1
     */
    setCategoryVolume(category, volume) {
        // Store normalized volume (0-1)
        this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
        
        // Update all currently playing sounds in this category
        this.currentlyPlaying[category].forEach(key => {
            const sound = this.sounds[category][key];
            if (sound && sound.playing) {
                sound.audio.volume = this.masterVolume * this.categoryVolumes[category] * sound.volume;
            }
        });
        
        return this;
    }
    
    /**
     * Set volume for a specific sound
     * @param {string} key - The unique key for the sound
     * @param {string} category - The category (ambient, sfx, music)
     * @param {number} volume - Volume from 0 to 1
     */
    setSoundVolume(key, category, volume) {
        const sound = this.sounds[category][key];
        
        // Check if sound exists
        if (!sound) {
            console.warn(`Sound ${key} in category ${category} not found`);
            return this;
        }
        
        // Store normalized volume (0-1)
        sound.volume = Math.max(0, Math.min(1, volume));
        
        // Update if playing
        if (sound.playing) {
            sound.audio.volume = this.masterVolume * this.categoryVolumes[category] * sound.volume;
        }
        
        return this;
    }
    
    /**
     * Play the ocean ambient sound on a loop
     */
    playOceanAmbient() {
        this.play('ocean_loop', 'ambient', { loop: true });
        return this;
    }
    
    /**
     * Stop the ocean ambient sound
     */
    stopOceanAmbient() {
        this.stop('ocean_loop', 'ambient');
        return this;
    }
    
    /**
     * Update volume levels from game UI settings (0-100 scale)
     * @param {number} uiVolumeLevel - Volume level from UI (0-100)
     */
    updateFromGameUI(uiVolumeLevel) {
        // Convert 0-100 scale to 0-1 scale
        const normalizedVolume = uiVolumeLevel / 100;
        this.setMasterVolume(normalizedVolume);
        return this;
    }
}

// Export as default
export default SoundManager; 