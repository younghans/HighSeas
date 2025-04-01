import * as THREE from 'three';

/**
 * Creates a floating text effect for damage numbers.
 */
class HitSplash {
    /**
     * Creates an instance of HitSplash.
     * @param {number} damage - The damage amount to display.
     * @param {THREE.Vector3} position - The initial world position for the splash.
     * @param {THREE.Scene} scene - The scene to add the splash to.
     * @param {THREE.Camera} camera - The camera for billboarding.
     * @param {Object} [options={}] - Optional parameters.
     * @param {number} [options.duration=1.2] - Duration in seconds.
     * @param {number} [options.riseSpeed=5] - Units per second the text rises.
     * @param {string} [options.fontSize='48px'] - Font size.
     * @param {string} [options.fontFamily='Arial'] - Font family.
     * @param {string} [options.color='red'] - Text color.
     * @param {string} [options.strokeColor='black'] - Text outline color.
     * @param {number} [options.strokeWidth=2] - Text outline width.
     */
    constructor(damage, position, scene, camera, options = {}) {
        this.damage = Math.round(damage); // Display whole numbers
        this.position = position.clone();
        this.scene = scene;
        this.camera = camera;

        // Options with defaults
        this.duration = options.duration || 1.2; // seconds
        this.riseSpeed = options.riseSpeed || 5; // units per second
        this.fontSize = options.fontSize || '32px'; // Reduced font size from 48px
        this.fontFamily = options.fontFamily || 'Arial';
        this.color = options.color || '#FF4444'; // Bright Red
        this.strokeColor = options.strokeColor || 'black';
        this.strokeWidth = options.strokeWidth || 2;

        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.isExpired = false;

        this.mesh = this.createMesh();
        // Initial offset slightly above the impact
        this.mesh.position.copy(this.position).add(new THREE.Vector3(0, 1, 0)); 
        this.scene.add(this.mesh);

        console.log(`[HITSPLASH] Created: Damage=${this.damage} at ${position.x.toFixed(1)},${position.y.toFixed(1)},${position.z.toFixed(1)}`);
    }

    /**
     * Creates the text sprite mesh.
     * @returns {THREE.Sprite} The sprite mesh.
     */
    createMesh() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Measure text to size canvas appropriately
        context.font = `bold ${this.fontSize} ${this.fontFamily}`;
        const metrics = context.measureText(this.damage.toString());
        const textWidth = metrics.width;
        const textHeight = parseInt(this.fontSize, 10); // Approximate height

        // Add padding for stroke and breathing room
        const padding = this.strokeWidth * 2 + 5; 
        canvas.width = textWidth + padding * 2;
        canvas.height = textHeight + padding * 2;
        
        // Recalculate font settings for drawing
        context.font = `bold ${this.fontSize} ${this.fontFamily}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Draw stroke
        context.strokeStyle = this.strokeColor;
        context.lineWidth = this.strokeWidth * 2; // Canvas stroke width is centered
        context.strokeText(this.damage.toString(), canvas.width / 2, canvas.height / 2);

        // Draw fill
        context.fillStyle = this.color;
        context.fillText(this.damage.toString(), canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false, // Render on top
            depthWrite: false,
            sizeAttenuation: true // Scale with distance
        });

        const sprite = new THREE.Sprite(material);
        // Scale the sprite - adjust as needed for visual size
        const scaleFactor = 0.1; // Controls how large the text appears in world space
        sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);

        return sprite;
    }

    /**
     * Updates the splash animation.
     * @param {number} delta - Time delta since last frame.
     */
    update(delta) {
        if (this.isExpired) return;

        this.elapsedTime += delta;

        // Calculate progress (0 to 1)
        const progress = Math.min(1, this.elapsedTime / this.duration);

        // Move upwards
        this.mesh.position.y += this.riseSpeed * delta;

        // Fade out (start fading after 50% duration)
        if (progress > 0.5) {
            const fadeProgress = (progress - 0.5) * 2; // 0 to 1 over the last half
             // Use Math.pow for a non-linear fade (faster at the end)
            this.mesh.material.opacity = 1.0 - Math.pow(fadeProgress, 2);
        } else {
            this.mesh.material.opacity = 1.0;
        }
        
        // Billboard towards camera (optional, SpriteMaterial often does this)
        // If not using SpriteMaterial or it doesn't billboard correctly:
        // this.mesh.quaternion.copy(this.camera.quaternion);

        // Check for expiration
        if (progress >= 1) {
            this.isExpired = true;
            console.log(`[HITSPLASH] Expired: Damage=${this.damage}`);
        }
    }

    /**
     * Gets the mesh associated with this splash.
     * @returns {THREE.Sprite} The mesh.
     */
    getMesh() {
        return this.mesh;
    }

    /**
     * Cleans up resources.
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.material.map) {
                this.mesh.material.map.dispose();
            }
            this.mesh.material.dispose();
            // No geometry to dispose for Sprites
        }
        this.mesh = null;
        this.scene = null;
        this.camera = null;
        console.log(`[HITSPLASH] Disposed: Damage=${this.damage}`);
    }
}

export default HitSplash;
