import * as THREE from 'three';

/**
 * Class to handle wake particle effects for ships
 */
class WakeParticleSystem {
    /**
     * Create a new wake particle system
     * @param {THREE.Scene} scene - The scene to add particles to
     * @param {BaseShip} ship - The ship this wake system belongs to
     * @param {Object} options - Configuration options
     */
    constructor(scene, ship, options = {}) {
        this.scene = scene;
        this.ship = ship;
        
        // Wake effect variables
        this.particles = [];
        this.emitters = [];
        this.MAX_PARTICLES = options.maxParticles || 100;
        this.PARTICLE_LIFETIME = options.particleLifetime || 2; // seconds
        this.emitRate = options.emitRate || 0.3; // Chance to emit per frame per emitter
        
        // Create wake emitters
        this.createEmitters();
    }
    
    /**
     * Create wake emitter points at the back of the ship
     */
    createEmitters() {
        // Check if ship object exists
        const shipObject = this.ship.getObject();
        if (!shipObject) {
            console.error('Cannot create wake emitters: ship object not available');
            return;
        }
        
        // Create two wake emitter points at the back of the ship
        const wakeOffset = 0.4; // Distance between the two wake trails
        
        // Left wake emitter
        const leftEmitter = new THREE.Object3D();
        leftEmitter.position.set(-wakeOffset, 0, -1.5); // Position at back left of ship
        shipObject.add(leftEmitter);
        
        // Right wake emitter
        const rightEmitter = new THREE.Object3D();
        rightEmitter.position.set(wakeOffset, 0, -1.5); // Position at back right of ship
        shipObject.add(rightEmitter);

        this.emitters = [leftEmitter, rightEmitter];
        
        // Create particle pool
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            this.createParticle();
        }
    }
    
    /**
     * Create a single wake particle
     * @returns {Object} The created particle
     */
    createParticle() {
        // Create particle geometry
        const size = 0.1 + Math.random() * 0.2;
        const geometry = new THREE.PlaneGeometry(size, size);
        
        // Create particle material
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        // Create particle mesh
        const particle = new THREE.Mesh(geometry, material);
        particle.rotation.x = Math.PI / 2; // Align with water surface
        particle.visible = false; // Start invisible
        this.scene.add(particle);
        
        // Add to particle pool with metadata
        this.particles.push({
            mesh: particle,
            active: false,
            lifetime: 0,
            maxLifetime: this.PARTICLE_LIFETIME,
            speed: 0.5 + Math.random() * 0.5,
            offset: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                0, // No Y offset (stay on water)
                (Math.random() - 0.5) * 0.5
            )
        });
        
        return this.particles[this.particles.length - 1];
    }
    
    /**
     * Emit wake particles
     * @param {number} delta - Time delta since last frame
     */
    emitParticles(delta) {
        // Check if ship is moving and emitters are set up
        if (!this.ship.isMoving || this.emitters.length === 0) return;
        
        // Try to emit from each emitter
        this.emitters.forEach(emitter => {
            if (Math.random() < this.emitRate) {
                // Find an inactive particle
                let particle = this.particles.find(p => !p.active);
                
                // If no inactive particles, don't emit
                if (!particle) return;
                
                // Get world position of emitter
                const emitterWorldPos = new THREE.Vector3();
                emitter.getWorldPosition(emitterWorldPos);
                
                // Activate particle
                particle.active = true;
                particle.lifetime = 0;
                particle.maxLifetime = this.PARTICLE_LIFETIME * (0.8 + Math.random() * 0.4); // Slight variation in lifetime
                
                // Position particle at emitter with small random offset
                particle.mesh.position.copy(emitterWorldPos);
                particle.mesh.position.y = 0.1; // Slightly above water
                
                // Add random offset
                particle.mesh.position.add(particle.offset);
                
                // Make visible
                particle.mesh.visible = true;
                
                // Set initial scale and opacity
                particle.mesh.scale.set(0.5, 0.5, 0.5);
                particle.mesh.material.opacity = 0.8;
            }
        });
    }
    
    /**
     * Update all active wake particles
     * @param {number} delta - Time delta since last frame
     */
    updateParticles(delta) {
        this.particles.forEach(particle => {
            if (!particle.active) return;
            
            // Update lifetime
            particle.lifetime += delta;
            
            // Check if particle should die
            if (particle.lifetime >= particle.maxLifetime) {
                particle.active = false;
                particle.mesh.visible = false;
                return;
            }
            
            // Calculate life progress (0 to 1)
            const lifeProgress = particle.lifetime / particle.maxLifetime;
            
            // Update position - particles slow down and spread out over time
            const speed = particle.speed * (1 - lifeProgress * 0.8);
            particle.mesh.position.z -= speed * delta; // Move backward
            
            // Add some sideways drift - increased for more spread
            particle.mesh.position.x += (Math.random() - 0.5) * 0.03;
            
            // Grow in size - increased growth factor
            const scale = 0.8 + lifeProgress * 1.8;
            particle.mesh.scale.set(scale, scale, scale);
            
            // Fade out
            particle.mesh.material.opacity = 0.8 * (1 - lifeProgress);
        });
    }
    
    /**
     * Clean up resources used by the particle system
     */
    dispose() {
        // Remove all particles from the scene and dispose of geometries and materials
        this.particles.forEach(particle => {
            if (particle.mesh) {
                if (particle.mesh.geometry) particle.mesh.geometry.dispose();
                if (particle.mesh.material) particle.mesh.material.dispose();
                this.scene.remove(particle.mesh);
            }
        });
        
        // Clear arrays
        this.particles = [];
        this.emitters = [];
    }
}

export default WakeParticleSystem; 