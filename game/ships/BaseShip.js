import * as THREE from 'three';
import WakeParticleSystem from './WakeParticleSystem.js';

/**
 * Base class for all ships in the game
 * This class provides common functionality for all ships
 */
class BaseShip {
    /**
     * Create a new ship
     * @param {THREE.Scene} scene - The scene to add the ship to
     * @param {Object} options - Ship configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, 0.5, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.targetPosition = null;
        this.isMoving = false;
        this.shipMesh = null;
        this.targetIslandPoint = null;
        
        // Ship properties with defaults that can be overridden
        this.speed = options.speed || 5;
        this.hullColor = options.hullColor || 0x8B4513;
        this.deckColor = options.deckColor || 0xD2B48C;
        this.sailColor = options.sailColor || 0xFFFFFF;
        
        // Store wake particle options for later initialization
        this.wakeParticleOptions = options.wakeParticleOptions || {};
        this.wakeParticleSystem = null;
    }
    
    /**
     * Create the ship mesh - to be implemented by subclasses
     */
    createShip() {
        throw new Error('createShip() must be implemented by subclass');
    }
    
    /**
     * Initialize the wake particle system
     * This should be called after the ship mesh has been created
     */
    initWakeParticleSystem() {
        if (this.shipMesh) {
            this.wakeParticleSystem = new WakeParticleSystem(this.scene, this, this.wakeParticleOptions);
        } else {
            console.error('Cannot initialize wake particle system: ship mesh not created yet');
        }
    }
    
    /**
     * Move the ship to a target position
     * @param {THREE.Vector3} targetPos - The target position
     */
    moveTo(targetPos) {
        this.targetPosition = targetPos.clone();
        
        // Calculate direction to target
        const direction = new THREE.Vector3()
            .subVectors(this.targetPosition, this.shipMesh.position)
            .normalize();
        
        // Set ship rotation to face the target
        this.shipMesh.rotation.y = Math.atan2(direction.x, direction.z);
        
        this.isMoving = true;
    }
    
    /**
     * Stop the ship's movement
     */
    stopMoving() {
        this.isMoving = false;
        this.targetPosition = null;
    }
    
    /**
     * Update the ship's position and animation
     * @param {number} delta - Time delta since last frame
     * @param {number} time - Current time
     */
    update(delta, time) {
        // Move ship towards target
        if (this.isMoving && this.targetPosition) {
            // Calculate direction and distance to target
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.shipMesh.position)
                .normalize();
            const distance = this.shipMesh.position.distanceTo(this.targetPosition);
            
            // Move ship if not very close to target
            if (distance > 0.1) {
                // Move ship at a constant speed
                const moveSpeed = this.speed * delta;
                this.shipMesh.position.add(direction.multiplyScalar(moveSpeed));
                
                // Add slight bobbing motion
                this.shipMesh.rotation.x = Math.sin(time * 2) * 0.05;
                this.shipMesh.rotation.z = Math.sin(time * 1.5) * 0.05;
                
                // Emit wake particles when moving
                if (this.wakeParticleSystem) {
                    this.wakeParticleSystem.emitParticles(delta);
                }
            } else {
                this.isMoving = false;
            }
        }
        
        // Update wake particles regardless of movement (to let active ones fade out)
        if (this.wakeParticleSystem) {
            this.wakeParticleSystem.updateParticles(delta);
        }
        
        // Add gentle bobbing even when not moving
        if (!this.isMoving) {
            this.shipMesh.rotation.x = Math.sin(time * 1.5) * 0.03;
            this.shipMesh.rotation.z = Math.sin(time * 1.2) * 0.03;
        }
    }
    
    /**
     * Get the ship's current position
     * @returns {THREE.Vector3} The ship's position
     */
    getPosition() {
        return this.shipMesh.position;
    }
    
    /**
     * Get the ship's mesh object
     * @returns {THREE.Object3D} The ship's mesh
     */
    getObject() {
        return this.shipMesh;
    }
    
    /**
     * Get the ship's current speed
     * @returns {number} The ship's speed
     */
    getSpeed() {
        return this.speed;
    }
    
    /**
     * Set the ship's speed
     * @param {number} speed - The new speed
     */
    setSpeed(speed) {
        this.speed = speed;
    }
}

export default BaseShip; 