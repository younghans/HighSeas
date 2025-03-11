import * as THREE from 'three';

class WindParticleSystem {
    constructor(scene, camera, windDirection, windSpeed, visibilityRadius = 800) {
        this.scene = scene;
        this.camera = camera;
        this.windDirection = windDirection;
        this.windSpeed = windSpeed;
        this.windVisibilityRadius = visibilityRadius;
        this.windParticles = null;
        this.trailSystem = null;
        
        this.init();
    }

    init() {
        const particleCount = 30;
        const trails = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const trailPositions = new Float32Array(particleCount * 6);
        const trailOpacities = new Float32Array(particleCount * 2);
        
        if (this.camera) {
            const cameraPos = this.camera.position;
            const cameraDir = this.camera.getWorldDirection(new THREE.Vector3());
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const i6 = i * 6;
                const i2 = i * 2;
                
                const radius = Math.pow(Math.random(), 0.5) * this.windVisibilityRadius * 0.8;
                const forwardOffset = Math.random() * this.windVisibilityRadius * 0.7;
                const theta = (Math.random() - 0.5) * Math.PI * 1.2;
                
                const right = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
                const position = new THREE.Vector3()
                    .copy(cameraPos)
                    .add(cameraDir.clone().multiplyScalar(forwardOffset))
                    .add(right.clone().multiplyScalar(Math.sin(theta) * radius));
                
                position.y = Math.random() * 40 + 2;
                
                positions[i3] = position.x;
                positions[i3 + 1] = position.y;
                positions[i3 + 2] = position.z;
                
                velocities[i3] = this.windDirection.x * this.windSpeed + (Math.random() - 0.5) * 1;
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
                velocities[i3 + 2] = this.windDirection.z * this.windSpeed + (Math.random() - 0.5) * 1;
                
                const trailLength = this.windSpeed * 0.7;
                const trailEnd = new THREE.Vector3(
                    position.x - this.windDirection.x * trailLength,
                    position.y - this.windDirection.y * trailLength,
                    position.z - this.windDirection.z * trailLength
                );
                
                trailPositions[i6] = position.x;
                trailPositions[i6 + 1] = position.y;
                trailPositions[i6 + 2] = position.z;
                trailPositions[i6 + 3] = trailEnd.x;
                trailPositions[i6 + 4] = trailEnd.y;
                trailPositions[i6 + 5] = trailEnd.z;
                
                const opacity = this._calculateOpacity(position, cameraPos);
                trailOpacities[i2] = opacity * 2.5;
                trailOpacities[i2 + 1] = opacity * 0.2;
            }
        }
        
        trails.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trails.setAttribute('opacity', new THREE.BufferAttribute(trailOpacities, 1));
        
        this.windParticles = {
            positions,
            velocities,
            trailPositions,
            trailOpacities,
            count: particleCount
        };
        
        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: `
                attribute float opacity;
                varying float vOpacity;
                void main() {
                    vOpacity = opacity;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying float vOpacity;
                void main() {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity);
                }
            `,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.trailSystem = new THREE.LineSegments(trails, trailMaterial);
        this.trailSystem.layers.set(1);
        this.trailSystem.renderOrder = -1;
        
        this.scene.add(this.trailSystem);
    }

    _calculateOpacity(position, cameraPosition) {
        const dx = position.x - cameraPosition.x;
        const dy = position.y - cameraPosition.y;
        const dz = position.z - cameraPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const normalizedDistance = distance / this.windVisibilityRadius;
        
        const distanceOpacity = Math.max(0.2, 1.0 - Math.pow(normalizedDistance, 1.5) * 0.8);
        return distanceOpacity * (this.windSpeed / 40);
    }

    update(deltaTime) {
        if (!this.windParticles || !this.camera) return;
        
        const {positions, velocities, trailPositions, trailOpacities, count} = this.windParticles;
        const cameraPosition = this.camera.position;
        const cameraDir = this.camera.getWorldDirection(new THREE.Vector3());
        const right = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const i6 = i * 6;
            const i2 = i * 2;
            
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
            
            const position = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
            
            const toParticle = position.clone().sub(cameraPosition);
            const projectedDist = toParticle.dot(cameraDir);
            const lateralOffset = toParticle.clone().sub(cameraDir.clone().multiplyScalar(projectedDist));
            const distance = lateralOffset.length();
            
            const isBehindCamera = projectedDist < -20;
            const isTooFarAhead = projectedDist > this.windVisibilityRadius;
            const isTooFarToSide = distance > this.windVisibilityRadius * 0.6;
            const isOutOfHeight = positions[i3 + 1] < 0.5 || positions[i3 + 1] > 50;
            
            if (isBehindCamera || isTooFarAhead || isTooFarToSide || isOutOfHeight) {
                this._resetParticle(i, cameraPosition, cameraDir, right);
            } else {
                this._updateParticleVelocity(i, deltaTime);
            }
            
            this._updateTrail(i, position);
        }
        
        this.trailSystem.geometry.attributes.position.needsUpdate = true;
        this.trailSystem.geometry.attributes.opacity.needsUpdate = true;
    }

    _resetParticle(i, cameraPosition, cameraDir, right) {
        const i3 = i * 3;
        const radius = Math.pow(Math.random(), 0.5) * this.windVisibilityRadius * 0.5;
        const forwardOffset = Math.random() * this.windVisibilityRadius * 0.7;
        const theta = (Math.random() - 0.5) * Math.PI * 1.2;
        
        const position = new THREE.Vector3()
            .copy(cameraPosition)
            .add(cameraDir.clone().multiplyScalar(forwardOffset))
            .add(right.clone().multiplyScalar(Math.sin(theta) * radius));
        
        position.y = Math.random() * 40 + 2;
        
        this.windParticles.positions[i3] = position.x;
        this.windParticles.positions[i3 + 1] = position.y;
        this.windParticles.positions[i3 + 2] = position.z;
        
        this.windParticles.velocities[i3] = this.windDirection.x * this.windSpeed * (0.8 + Math.random() * 0.4);
        this.windParticles.velocities[i3 + 1] = (Math.random() - 0.5) * 0.3;
        this.windParticles.velocities[i3 + 2] = this.windDirection.z * this.windSpeed * (0.8 + Math.random() * 0.4);
    }

    _updateParticleVelocity(i, deltaTime) {
        const i3 = i * 3;
        const lerpFactor = deltaTime * 0.3;
        this.windParticles.velocities[i3] += (this.windDirection.x * this.windSpeed - this.windParticles.velocities[i3]) * lerpFactor;
        this.windParticles.velocities[i3 + 2] += (this.windDirection.z * this.windSpeed - this.windParticles.velocities[i3 + 2]) * lerpFactor;
    }

    _updateTrail(i, position) {
        const i6 = i * 6;
        const i2 = i * 2;
        const trailLength = this.windSpeed * 0.7;
        const trailEnd = new THREE.Vector3(
            position.x - this.windDirection.x * trailLength,
            position.y - this.windDirection.y * trailLength,
            position.z - this.windDirection.z * trailLength
        );
        
        this.windParticles.trailPositions[i6] = position.x;
        this.windParticles.trailPositions[i6 + 1] = position.y;
        this.windParticles.trailPositions[i6 + 2] = position.z;
        this.windParticles.trailPositions[i6 + 3] = trailEnd.x;
        this.windParticles.trailPositions[i6 + 4] = trailEnd.y;
        this.windParticles.trailPositions[i6 + 5] = trailEnd.z;
        
        const opacity = this._calculateOpacity(position, this.camera.position);
        this.windParticles.trailOpacities[i2] = opacity * 2.5;
        this.windParticles.trailOpacities[i2 + 1] = opacity * 0.2;
    }

    setWind(direction, speed) {
        this.windDirection = direction.clone().normalize();
        this.windSpeed = Math.max(0, speed);
    }

    setVisibilityRadius(radius) {
        this.windVisibilityRadius = Math.max(50, radius);
    }

    getVisibilityRadius() {
        return this.windVisibilityRadius;
    }
}

class WindSystem {
    constructor(scene, camera, options = {}) {
        this.scene = scene;
        this.camera = camera;
        
        // Wind system variables
        this.windDirection = new THREE.Vector3(1, 0, 0); // Initial wind direction
        this.windSpeed = options.windSpeed || 20; // Wind speed
        this.windChangeTimer = 0;
        this.WIND_CHANGE_INTERVAL = options.changeInterval || 15; // Change wind direction every 15 seconds
        this.newWindDirection = new THREE.Vector3(1, 0, 0); // Target wind direction during transitions
        this.isWindChanging = false;
        this.windTransitionProgress = 0;
        this.WIND_TRANSITION_DURATION = options.transitionDuration || 3; // Transition duration in seconds
        
        // Initialize wind particle system
        this.initWindParticleSystem();
    }
    
    initWindParticleSystem() {
        // Enable camera layers for wind particles
        this.camera.layers.enable(1);
        
        // Create wind particle system
        this.particleSystem = new WindParticleSystem(
            this.scene,
            this.camera,
            this.windDirection.clone().normalize(),
            this.windSpeed,
            800 // visibility radius
        );
        
        // Ensure wind particles are rendered with proper depth testing
        if (this.particleSystem.trailSystem) {
            this.particleSystem.trailSystem.material.depthTest = true;
            this.particleSystem.trailSystem.material.depthWrite = false;
            this.particleSystem.trailSystem.renderOrder = -1; // Render before ship
        }
    }
    
    update(deltaTime) {
        // Update wind change timer
        this.windChangeTimer += deltaTime;
        
        // If we're in a transition, update the transition progress
        if (this.isWindChanging) {
            this.windTransitionProgress += deltaTime;
            
            // Calculate transition factor (0 to 1)
            const t = Math.min(this.windTransitionProgress / this.WIND_TRANSITION_DURATION, 1.0);
            
            // Smoothly interpolate between old and new wind direction
            const lerpFactor = this.smoothStep(0, 1, t);
            const currentDirection = new THREE.Vector3().lerpVectors(
                this.windDirection, 
                this.newWindDirection, 
                lerpFactor
            ).normalize();
            
            // Update wind particle system with interpolated direction
            this.particleSystem.setWind(currentDirection, this.windSpeed);
            
            // If transition is complete, finalize the change
            if (t >= 1.0) {
                this.windDirection.copy(this.newWindDirection);
                this.isWindChanging = false;
                this.windTransitionProgress = 0;
            }
        }
        // Start a new wind direction change
        else if (this.windChangeTimer >= this.WIND_CHANGE_INTERVAL) {
            // Reset timer
            this.windChangeTimer = 0;
            
            // Generate new random wind direction
            const angle = Math.random() * Math.PI * 2;
            this.newWindDirection.set(
                Math.cos(angle),
                0, // Keep y component at 0 for horizontal wind
                Math.sin(angle)
            );
            
            // Start transition
            this.isWindChanging = true;
            this.windTransitionProgress = 0;
        }
        
        // Update the particle system
        this.particleSystem.update(deltaTime);
    }
    
    // Smooth step function for nicer transitions
    smoothStep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }
    
    setWindSpeed(speed) {
        this.windSpeed = Math.max(0, speed);
        this.particleSystem.setWind(this.windDirection, this.windSpeed);
    }
    
    getWindDirection() {
        return this.windDirection.clone();
    }
    
    getWindSpeed() {
        return this.windSpeed;
    }
    
    // Force an immediate wind direction change
    setWindDirection(direction) {
        this.windDirection.copy(direction).normalize();
        this.particleSystem.setWind(this.windDirection, this.windSpeed);
    }
}

export { WindSystem, WindParticleSystem }; 