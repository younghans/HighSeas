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
        const particleCount = 500;
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
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.trailSystem = new THREE.LineSegments(trails, trailMaterial);
        this.trailSystem.layers.set(1);
        
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

export default WindParticleSystem; 