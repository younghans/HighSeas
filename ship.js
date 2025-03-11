import * as THREE from 'three';

class Ship {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, 0.5, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.targetPosition = null;
        this.isMoving = false;
        this.shipMesh = null;
        
        // Ship properties with defaults that can be overridden
        this.speed = options.speed || 5;
        this.hullColor = options.hullColor || 0x8B4513;
        this.deckColor = options.deckColor || 0xD2B48C;
        this.sailColor = options.sailColor || 0xFFFFFF;
        
        // Wake effect variables
        this.wakeParticles = [];
        this.wakeEmitters = [];
        this.MAX_WAKE_PARTICLES = 100;
        this.WAKE_PARTICLE_LIFETIME = 2; // seconds
        
        // Create the ship mesh
        this.createShip();
        
        // Create wake emitters
        this.createWakeEmitters();
    }
    
    createShip() {
        const shipGroup = new THREE.Group();
        
        // Hull material
        const hullMaterial = new THREE.MeshStandardMaterial({ 
            color: this.hullColor,
            roughness: 0.7,
            metalness: 0.2,
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1.0
        });
        
        const hullWidth = 2;
        const hullHeight = 0.8;
        const hullLength = 4;
        
        const hullGeometry = new THREE.BufferGeometry();
        
        // Define vertices for boat hull with triangular front
        const vertices = [];
        
        // Top vertices (deck level)
        vertices.push(
            // Main hull vertices
            -hullWidth/2, hullHeight, hullLength/2,    // 0: back left
            hullWidth/2, hullHeight, hullLength/2,     // 1: back right
            hullWidth/2, hullHeight, -hullLength/2,    // 2: front right
            -hullWidth/2, hullHeight, -hullLength/2,   // 3: front left
            0, hullHeight, hullLength/2 + 1            // 4: bow point (top)
        );
        
        // Bottom vertices (narrower)
        const bottomWidth = hullWidth * 0.6;
        const bottomLength = hullLength * 0.8;
        vertices.push(
            -bottomWidth/2, 0, bottomLength/2,         // 5: back left
            bottomWidth/2, 0, bottomLength/2,          // 6: back right
            bottomWidth/2, 0, -bottomLength/2,         // 7: front right
            -bottomWidth/2, 0, -bottomLength/2,        // 8: front left
            0, 0, bottomLength/2 + 1                   // 9: bow point (bottom)
        );
        
        // Define triangles with correct winding order
        const indices = [
            // Bottom face (now properly oriented)
            5, 7, 6,    // Bottom face main 1
            5, 8, 7,    // Bottom face main 2
            5, 6, 9,    // Bottom bow triangle
            
            // Top face
            2, 3, 0,    // Top face main 1
            2, 0, 1,    // Top face main 2
            1, 0, 4,    // Top bow triangle
            
            // Back face
            0, 3, 5,    // Back left
            5, 8, 3,    // Back right
            
            // Left side
            0, 5, 4,    // Left main
            5, 9, 4,    // Left bow
            
            // Right side
            1, 6, 2,    // Right main
            6, 7, 2,    // Right connection
            1, 4, 9,    // Right bow top
            1, 9, 6,    // Right bow bottom
            
            // Front faces (bow)
            3, 2, 8,    // Front face left
            8, 2, 7,    // Front face right
            
            // Bow closure faces
            4, 9, 0,    // Bow left
            4, 1, 9     // Bow right
        ];
        
        // Set geometry attributes
        hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        hullGeometry.setIndex(indices);
        hullGeometry.computeVertexNormals();
        
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        hull.castShadow = true;
        hull.receiveShadow = true;
        shipGroup.add(hull);
        
        // Create custom deck geometry to match hull shape including bow
        const deckGeometry = new THREE.BufferGeometry();
        
        // Define deck vertices (slightly smaller than hull top)
        const deckScale = 0.9; // Make deck slightly smaller than hull
        const deckVertices = [
            // Main deck rectangle
            -hullWidth/2 * deckScale, hullHeight + 0.05, hullLength/2 * deckScale,     // 0: back left
            hullWidth/2 * deckScale, hullHeight + 0.05, hullLength/2 * deckScale,      // 1: back right
            hullWidth/2 * deckScale, hullHeight + 0.05, -hullLength/2 * deckScale,     // 2: front right
            -hullWidth/2 * deckScale, hullHeight + 0.05, -hullLength/2 * deckScale,    // 3: front left
            0, hullHeight + 0.05, hullLength/2 + 0.9                                    // 4: bow point
        ];
        
        // Define deck triangles
        const deckIndices = [
            // Main deck surface
            3, 2, 1,        // Main deck triangle 1
            3, 1, 0,        // Main deck triangle 2
            0, 1, 4         // Bow triangle
        ];
        
        deckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(deckVertices, 3));
        deckGeometry.setIndex(deckIndices);
        deckGeometry.computeVertexNormals();
        
        const deckMaterial = new THREE.MeshStandardMaterial({ 
            color: this.deckColor,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        deck.castShadow = true;
        deck.receiveShadow = true;
        shipGroup.add(deck);
        
        // Mast - centered on the boat
        const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
        const mastMaterial = new THREE.MeshStandardMaterial({ 
            color: this.hullColor,
            roughness: 0.9,
            metalness: 0.1
        });
        const mast = new THREE.Mesh(mastGeometry, mastMaterial);
        mast.position.y = hullHeight + 0.1 + 2; // Height above deck
        mast.position.z = 0; // Centered on boat
        mast.castShadow = true;
        shipGroup.add(mast);
        
        // Sail - centered with mast
        const sailGeometry = new THREE.PlaneGeometry(2, 3);
        const sailMaterial = new THREE.MeshStandardMaterial({ 
            color: this.sailColor,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.0
        });
        const sail = new THREE.Mesh(sailGeometry, sailMaterial);
        sail.position.y = hullHeight + 0.1 + 2; // Same height as mast
        sail.position.z = 0; // Centered with mast
        sail.rotation.y = 0; // Perpendicular to boat length
        sail.castShadow = true;
        shipGroup.add(sail);

        // Position the ship
        shipGroup.position.copy(this.position);
        
        // Ensure ship renders properly with wind particles
        shipGroup.renderOrder = 0; // Higher than wind particles
        
        // Add all meshes in the ship to ensure they render properly
        shipGroup.traverse(function(object) {
            if (object.isMesh) {
                object.renderOrder = 0; // Higher than wind particles
            }
        });
        
        this.scene.add(shipGroup);
        this.shipMesh = shipGroup;
    }
    
    createWakeEmitters() {
        // Create two wake emitter points at the back of the ship
        const wakeOffset = 0.4; // Distance between the two wake trails
        
        // Left wake emitter
        const leftEmitter = new THREE.Object3D();
        leftEmitter.position.set(-wakeOffset, 0, -1.5); // Position at back left of ship
        this.shipMesh.add(leftEmitter);
        
        // Right wake emitter
        const rightEmitter = new THREE.Object3D();
        rightEmitter.position.set(wakeOffset, 0, -1.5); // Position at back right of ship
        this.shipMesh.add(rightEmitter);

        this.wakeEmitters = [leftEmitter, rightEmitter];
        
        // Create particle pool
        for (let i = 0; i < this.MAX_WAKE_PARTICLES; i++) {
            this.createWakeParticle();
        }
    }
    
    createWakeParticle() {
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
        this.wakeParticles.push({
            mesh: particle,
            active: false,
            lifetime: 0,
            maxLifetime: this.WAKE_PARTICLE_LIFETIME,
            speed: 0.5 + Math.random() * 0.5,
            offset: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                0, // No Y offset (stay on water)
                (Math.random() - 0.5) * 0.5
            )
        });
        
        return this.wakeParticles[this.wakeParticles.length - 1];
    }
    
    emitWakeParticles(delta) {
        if (!this.isMoving) return;
        
        // Emit rate based on ship speed
        const emitChance = 0.3; // Chance to emit per frame per emitter
        
        // Try to emit from each emitter
        this.wakeEmitters.forEach(emitter => {
            if (Math.random() < emitChance) {
                // Find an inactive particle
                let particle = this.wakeParticles.find(p => !p.active);
                
                // If no inactive particles, don't emit
                if (!particle) return;
                
                // Get world position of emitter
                const emitterWorldPos = new THREE.Vector3();
                emitter.getWorldPosition(emitterWorldPos);
                
                // Activate particle
                particle.active = true;
                particle.lifetime = 0;
                particle.maxLifetime = this.WAKE_PARTICLE_LIFETIME * (0.8 + Math.random() * 0.4); // Slight variation in lifetime
                
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
    
    updateWakeParticles(delta) {
        this.wakeParticles.forEach(particle => {
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
                
                // Emit wake particles
                this.emitWakeParticles(delta);
            } else {
                this.isMoving = false;
            }
        }
        
        // Update wake particles regardless of movement (to let active ones fade out)
        this.updateWakeParticles(delta);
        
        // Add gentle bobbing even when not moving
        if (!this.isMoving) {
            this.shipMesh.rotation.x = Math.sin(time * 1.5) * 0.03;
            this.shipMesh.rotation.z = Math.sin(time * 1.2) * 0.03;
        }
    }
    
    getPosition() {
        return this.shipMesh.position;
    }
    
    getMesh() {
        return this.shipMesh;
    }
    
    setSpeed(speed) {
        this.speed = speed;
    }
    
    getSpeed() {
        return this.speed;
    }
}

export default Ship; 