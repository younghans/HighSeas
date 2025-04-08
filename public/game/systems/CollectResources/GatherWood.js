/**
 * GatherWood.js - Handles audio and animation for wood gathering
 * Manages axe chop sounds during collection and tree felled sound when completed
 */
class GatherWood {
    /**
     * Create a new GatherWood handler
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = options;
        this.soundManager = options.soundManager || window.soundManager;
        this.resourceSystem = options.resourceSystem;
        
        // Sound effect paths
        this.chopSounds = [
            'axe_chop1.mp3',
            'axe_chop2.mp3',
            'axe_chop3.mp3',
            'axe_chop4.mp3'
        ];
        
        this.treeFelledSound = 'tree_felled.mp3';
        
        // State tracking
        this.isActive = false;
        this.chopInterval = null;
        this.lastChopTime = 0;
        
        // Bind event listeners
        this.boundHandleCollectionStart = this.handleCollectionStart.bind(this);
        this.boundHandleCollectionStop = this.handleCollectionStop.bind(this);
        this.boundHandleResourceCollected = this.handleResourceCollected.bind(this);
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the gathering system
     */
    init() {
        // Ensure sound effects are loaded
        this.preloadSounds();
        
        // Add event listeners
        document.addEventListener('resourceCollectionStarted', this.boundHandleCollectionStart);
        document.addEventListener('resourceCollectionStopped', this.boundHandleCollectionStop);
        document.addEventListener('resourceCollected', this.boundHandleResourceCollected);
        
        return this;
    }
    
    /**
     * Preload required sound effects
     */
    preloadSounds() {
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
     * Handle starting resource collection
     * @param {CustomEvent} event - The collection started event
     */
    handleCollectionStart(event) {
        // Only handle wood collection
        if (event.detail.resource !== 'wood') return;
        
        console.log('Wood collection started - initializing sound effects');
        this.isActive = true;
        
        // Start the chopping sound sequence
        this.startChoppingSequence();
    }
    
    /**
     * Handle stopping resource collection
     * @param {CustomEvent} event - The collection stopped event
     */
    handleCollectionStop(event) {
        // Only handle if we're currently active
        if (!this.isActive) return;
        
        console.log('Wood collection stopped - stopping sound effects');
        this.isActive = false;
        
        // Stop the chopping sound sequence
        this.stopChoppingSequence();
    }
    
    /**
     * Handle resource collected event
     * @param {CustomEvent} event - The resource collected event
     */
    handleResourceCollected(event) {
        // Only handle wood collection
        if (event.detail.resource !== 'wood' || !this.isActive) return;
        
        console.log(`Collected ${event.detail.amount} wood - playing tree felled sound`);
        
        // Play tree felled sound when wood is collected
        this.playTreeFelledSound();
    }
    
    /**
     * Start playing the sequential chopping sounds
     */
    startChoppingSequence() {
        // Clear any existing interval
        this.stopChoppingSequence();
        
        // Start a new interval that plays a random chop sound every second
        this.chopInterval = setInterval(() => {
            this.playRandomChopSound();
        }, 1000); // Play a chop sound every second
        
        // Play first chop sound immediately
        this.playRandomChopSound();
    }
    
    /**
     * Stop the chopping sound sequence
     */
    stopChoppingSequence() {
        if (this.chopInterval) {
            clearInterval(this.chopInterval);
            this.chopInterval = null;
        }
    }
    
    /**
     * Play a random axe chop sound effect
     */
    playRandomChopSound() {
        // Don't play if we're not active
        if (!this.isActive) return;
        
        // Get a random chop sound (1-4)
        const randomIndex = Math.floor(Math.random() * this.chopSounds.length);
        const soundKey = `axe_chop${randomIndex+1}`;
        
        // Play the sound effect
        if (this.soundManager) {
            console.log(`Playing ${soundKey} sound effect`);
            this.soundManager.play(soundKey, 'sfx', {
                volume: 0.8 // Slightly reduced volume
            });
        }
    }
    
    /**
     * Play the tree felled sound effect
     */
    playTreeFelledSound() {
        if (!this.isActive) return;
        
        // Play the tree felled sound
        if (this.soundManager) {
            console.log('Playing tree felled sound effect');
            this.soundManager.play('tree_felled', 'sfx', {
                volume: 1.0 // Full volume for the satisfying tree fall
            });
        }
    }
    
    /**
     * Cleanup and remove event listeners
     */
    destroy() {
        // Stop any active sounds
        this.stopChoppingSequence();
        
        // Remove event listeners
        document.removeEventListener('resourceCollectionStarted', this.boundHandleCollectionStart);
        document.removeEventListener('resourceCollectionStopped', this.boundHandleCollectionStop);
        document.removeEventListener('resourceCollected', this.boundHandleResourceCollected);
        
        // Clear state
        this.isActive = false;
    }
}

export default GatherWood; 