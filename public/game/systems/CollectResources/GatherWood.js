/**
 * GatherWood.js - Handles audio and animation for wood gathering
 * Manages axe chop sounds during collection and tree felled sound when completed
 */
import TreeAnimator from './TreeAnimator.js';

class GatherWood {
    /**
     * Create a new GatherWood handler
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = options;
        this.soundManager = options.soundManager || window.soundManager;
        this.resourceSystem = options.resourceSystem;
        this.scene = options.scene || null;
        this.islandLoader = options.islandLoader || null;
        
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
        this.currentIsland = null;
        
        // Initialize tree animator if scene is provided
        this.treeAnimator = null;
        if (this.scene) {
            this.treeAnimator = new TreeAnimator({
                scene: this.scene,
                islandLoader: this.islandLoader
            });
            console.log('TreeAnimator initialized for wood gathering');
        } else {
            console.warn('No scene provided to GatherWood, tree animations will be disabled');
        }
        
        // Bind event listeners
        this.boundHandleCollectionStart = this.handleCollectionStart.bind(this);
        this.boundHandleCollectionStop = this.handleCollectionStop.bind(this);
        this.boundHandleResourceCollected = this.handleResourceCollected.bind(this);
        
        // Initialize
        this.init();
    }
    
    /**
     * Set a new scene reference and reinitialize TreeAnimator if needed
     * @param {THREE.Scene} scene - The scene to use for animations
     */
    setScene(scene) {
        // Store the new scene reference
        this.scene = scene;
        
        // If we already have a tree animator, update its scene
        if (this.treeAnimator) {
            this.treeAnimator.destroy();
            this.treeAnimator = null;
        }
        
        // Create a new tree animator with the new scene
        if (this.scene) {
            this.treeAnimator = new TreeAnimator({
                scene: this.scene,
                islandLoader: this.islandLoader
            });
            console.log('TreeAnimator reinitialized with new scene reference');
            
            // If we're currently collecting, find trees on the current island
            if (this.isActive && this.currentIsland) {
                // Pass the island mesh directly to the TreeAnimator
                this.treeAnimator.findTreesOnIsland({ mesh: this.currentIsland });
            }
        } else {
            console.warn('Scene reference removed from GatherWood, tree animations will be disabled');
        }
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
        
        // Store reference to the island being harvested
        if (event.detail.island) {
            this.currentIsland = event.detail.island;
            console.log(`Wood collection started on island: ${this.currentIsland.userData ? this.currentIsland.userData.islandName || 'Unknown Island' : 'Unknown Island'}`);
            
            // Initialize tree animations if the animator exists
            if (this.treeAnimator) {
                // Pass the island mesh directly to the TreeAnimator
                // The mesh is the most reliable way to find trees
                this.treeAnimator.findTreesOnIsland({ mesh: this.currentIsland });
            }
        }
        
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
        
        // Clear island reference
        this.currentIsland = null;
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
        
        // Trigger tree animation for collection event
        if (this.treeAnimator && this.currentIsland) {
            console.log('Triggering tree animation for wood collection');
            // Pass the island mesh directly to the TreeAnimator
            this.treeAnimator.processWoodCollection({ mesh: this.currentIsland });
        }
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
            
            // Trigger tree animation for chop sound
            if (this.treeAnimator && this.currentIsland) {
                console.log('Triggering tree animation for chop sound');
                // Pass the island mesh directly to the TreeAnimator
                this.treeAnimator.processChopSound({ mesh: this.currentIsland });
            }
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
        
        // Clean up tree animator
        if (this.treeAnimator) {
            this.treeAnimator.destroy();
            this.treeAnimator = null;
        }
        
        // Clear state
        this.isActive = false;
        this.currentIsland = null;
    }
}

export default GatherWood; 