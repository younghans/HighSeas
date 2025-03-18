import * as THREE from 'three';

/**
 * Wind Wisp System inspired by The Legend of Zelda: The Wind Waker
 * Creates flowing wind wisps that appear in the air around the player ship
 */
class WindWispSystem {
    constructor(scene, camera, options = {}) {
        this.scene = scene;
        this.camera = camera;
        
        // Wind direction (normalized vector)
        this.windDirection = new THREE.Vector3(1, 0, 0).normalize();
        
        // Wisp system settings
        this.wispCount = options.wispCount || 30;
        this.wispSpawnRadius = options.spawnRadius || 400;
        this.wispLifespan = options.lifespan || 2.5; // seconds
        this.wispSpawnInterval = options.spawnInterval || 0.2; // seconds
        this.spawnTimer = 0;
        
        // Array to store active wisps
        this.wisps = [];
        
        // Initialize wisp materials and geometries
        this.initWispSystem();
    }
    
    /**
     * Initialize the wisp system with shared resources
     */
    initWispSystem() {
        // Pre-generate curve patterns for wisps to follow
        this.wispPatterns = this.generateWispPatterns(8);
        
        // Create shared wisp material
        this.wispMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float phase;
                varying float vPhase;
                varying float vDistance;
                
                void main() {
                    vPhase = phase;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vDistance = 1.0 - clamp(length(mvPosition.xyz) / 1000.0, 0.0, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vPhase;
                varying float vDistance;
                
                void main() {
                    // Apply a power curve to phase to make the opacity falloff more pronounced
                    float adjustedPhase = pow(vPhase, 1.7);
                    float opacity = adjustedPhase * vDistance * 0.8;
                    gl_FragColor = vec4(1.0, 1.0, 1.0, opacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        // Make sure camera can see the wind layer
        this.camera.layers.enable(1);
    }
    
    /**
     * Generate a set of random curve patterns for wisps to follow
     */
    generateWispPatterns(count) {
        const patterns = [];
        
        for (let i = 0; i < count; i++) {
            // Generate a random curve with 4-6 control points
            const pointCount = Math.floor(Math.random() * 3) + 4;
            const points = [];
            
            // Start at origin
            points.push(new THREE.Vector3(0, 0, 0));
            
            // Add random control points along a general path
            for (let j = 1; j < pointCount; j++) {
                const progress = j / (pointCount - 1);
                const deviation = 15 * (1 - progress); // Larger deviations at the start
                
                points.push(new THREE.Vector3(
                    progress * 80 + (Math.random() - 0.5) * deviation,
                    (Math.random() - 0.5) * deviation,
                    (Math.random() - 0.5) * deviation
                ));
            }
            
            // Create a smooth curve from the points
            const curve = new THREE.CatmullRomCurve3(points);
            curve.curveType = 'catmullrom';
            curve.tension = 0.3;
            
            patterns.push(curve);
        }
        
        return patterns;
    }
    
    /**
     * Create a new wind wisp at a random position around the camera
     */
    createWindWisp() {
        // Choose a random pattern
        const patternIndex = Math.floor(Math.random() * this.wispPatterns.length);
        const pattern = this.wispPatterns[patternIndex];
        
        // Get camera-relative spawn position
        const cameraPos = this.camera.position.clone();
        const cameraForward = this.camera.getWorldDirection(new THREE.Vector3());
        const spawnRadius = this.wispSpawnRadius * (0.3 + Math.random() * 0.7);
        
        // Random angle within 120 degrees of forward
        const angle = (Math.random() - 0.5) * Math.PI * 0.8;
        const right = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Calculate spawn position
        const spawnPos = new THREE.Vector3()
            .copy(cameraPos)
            .add(cameraForward.clone().multiplyScalar(spawnRadius * 0.5))
            .add(right.clone().multiplyScalar(Math.sin(angle) * spawnRadius));
        
        // Adjust height randomly
        spawnPos.y = 5 + Math.random() * 30;
        
        // Create line segments along the curve
        const segmentCount = 25 + Math.floor(Math.random() * 15);
        const linePositions = new Float32Array(segmentCount * 3);
        const lineIndices = [];
        const phases = new Float32Array(segmentCount);
        
        // Calculate direction matrix to orient the pattern in the wind direction
        const dirMatrix = new THREE.Matrix4();
        const up = new THREE.Vector3(0, 1, 0);
        const windNormalized = this.windDirection.clone().normalize();
        
        if (Math.abs(windNormalized.y) < 0.99) {
            dirMatrix.lookAt(
                new THREE.Vector3(0, 0, 0),
                windNormalized,
                up
            );
        }
        
        // Create points along curve
        for (let i = 0; i < segmentCount; i++) {
            // Get point from curve
            const t = i / (segmentCount - 1);
            const point = pattern.getPoint(t);
            
            // Orient in wind direction and offset to spawn position
            point.applyMatrix4(dirMatrix);
            point.add(spawnPos);
            
            // Set position in array
            const idx = i * 3;
            linePositions[idx] = point.x;
            linePositions[idx + 1] = point.y;
            linePositions[idx + 2] = point.z;
            
            // Initial phase (0 to 1) - all points start invisible except the front
            phases[i] = i === 0 ? 1 : 0;
            
            // Create indices for line segments
            if (i > 0) {
                lineIndices.push(i - 1, i);
            }
        }
        
        // Create geometry and attributes
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        geometry.setIndex(lineIndices);
        
        // Create the line mesh
        const lineMaterial = this.wispMaterial.clone();
        const lines = new THREE.LineSegments(geometry, lineMaterial);
        lines.frustumCulled = false;
        lines.layers.set(1);
        
        // Add to scene
        this.scene.add(lines);
        
        // Store wisp data
        this.wisps.push({
            mesh: lines,
            positions: linePositions,
            phases: phases,
            age: 0,
            speed: 1 + Math.random() * 0.5, // Random variation in speed
            segmentCount: segmentCount,
            lifespan: this.wispLifespan * (0.8 + Math.random() * 0.4) // Random variation in lifespan
        });
    }
    
    /**
     * Update the wind system
     */
    update(deltaTime) {
        // Update spawn timer and create new wisps
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.wispSpawnInterval) {
            this.spawnTimer = 0;
            
            // Only spawn if we haven't reached the maximum number of wisps
            if (this.wisps.length < this.wispCount) {
                this.createWindWisp();
            }
        }
        
        // Update existing wisps
        for (let i = this.wisps.length - 1; i >= 0; i--) {
            const wisp = this.wisps[i];
            wisp.age += deltaTime * wisp.speed;
            
            // Calculate progress (0 to 1)
            const progress = Math.min(wisp.age / wisp.lifespan, 1);
            
            // Keep track of whether any part of the wisp is still visible
            let anyPointVisible = false;
            
            // Calculate the extended length to ensure the tail completes its journey
            const extraDistance = wisp.segmentCount * 0.7 + 2; // Tail length + fade distance
            
            // Update phases of each point based on the animation progress
            const leadingEdge = progress * (wisp.segmentCount + extraDistance);
            const tailLength = wisp.segmentCount * 0.7; // 70% of the wisp length is visible at once
            
            for (let j = 0; j < wisp.segmentCount; j++) {
                const distanceFromLeadingEdge = leadingEdge - j;
                let newPhase = 0;
                
                // Points ahead of the leading edge stay invisible
                if (distanceFromLeadingEdge < 0) {
                    newPhase = 0;
                } 
                // Points at the leading edge fade in
                else if (distanceFromLeadingEdge <= 1) {
                    newPhase = distanceFromLeadingEdge;
                    if (newPhase > 0.05) anyPointVisible = true; // Only count as visible if opacity is significant
                }
                // Points within the tail length have a gradual fade from head to tail
                else if (distanceFromLeadingEdge <= tailLength) {
                    // Apply a gradual falloff from head (1.0) to tail (0.4)
                    const tailProgress = distanceFromLeadingEdge / tailLength;
                    const falloff = 0.4 + (0.6 * (1.0 - tailProgress));
                    newPhase = falloff;
                    anyPointVisible = true;
                }
                // Points beyond the tail length fade out
                else if (distanceFromLeadingEdge <= tailLength + 2) {
                    // Start from the reduced opacity at the tail end (0.4)
                    const fadeStartOpacity = 0.4;
                    const fadeProgress = (distanceFromLeadingEdge - tailLength) / 2;
                    newPhase = fadeStartOpacity * (1 - fadeProgress);
                    if (newPhase > 0.05) anyPointVisible = true; // Only count as visible if opacity is significant
                }
                // Points far behind the leading edge stay invisible
                else {
                    newPhase = 0;
                }
                
                wisp.phases[j] = newPhase;
            }
            
            // Update the phase attribute
            wisp.mesh.geometry.attributes.phase.needsUpdate = true;
            
            // If wisp has completed its lifecycle AND no points are visibly noticeable, remove it
            if (progress >= 1) {
                if (!anyPointVisible) {
                    this.scene.remove(wisp.mesh);
                    wisp.mesh.geometry.dispose();
                    this.wisps.splice(i, 1);
                } else if (progress >= 1.5) {
                    // Force remove if it's been hanging too long (fallback safety)
                    this.scene.remove(wisp.mesh);
                    wisp.mesh.geometry.dispose();
                    this.wisps.splice(i, 1);
                }
            }
        }
    }
    
    /**
     * Set the wind direction
     */
    setWindDirection(direction) {
        this.windDirection.copy(direction).normalize();
    }
    
    /**
     * Get the current wind direction
     */
    getWindDirection() {
        return this.windDirection.clone();
    }
}

/**
 * Main wind system that manages wind direction changes and the wisp system
 */
class WindSystem {
    constructor(scene, camera, options = {}) {
        this.scene = scene;
        this.camera = camera;
        
        // Wind direction and transition variables
        this.windDirection = new THREE.Vector3(1, 0, 0).normalize();
        this.windChangeTimer = 0;
        this.WIND_CHANGE_INTERVAL = options.changeInterval || 15; // Change wind direction every 15 seconds
        this.newWindDirection = new THREE.Vector3(1, 0, 0).normalize();
        this.isWindChanging = false;
        this.windTransitionProgress = 0;
        this.WIND_TRANSITION_DURATION = options.transitionDuration || 3; // Transition duration in seconds
        
        // Initialize wind wisp system
        this.wispSystem = new WindWispSystem(scene, camera, {
            spawnRadius: options.wispSpawnRadius || 400,
            wispCount: options.wispCount || 30,
            spawnInterval: options.wispSpawnInterval || 0.2,
            lifespan: options.wispLifespan || 2.5
        });
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
            
            // Update wind wisp system with interpolated direction
            this.wispSystem.setWindDirection(currentDirection);
            
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
        
        // Update the wisp system
        this.wispSystem.update(deltaTime);
    }
    
    // Smooth step function for nicer transitions
    smoothStep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }
    
    getWindDirection() {
        return this.windDirection.clone();
    }
    
    // Force an immediate wind direction change
    setWindDirection(direction) {
        this.windDirection.copy(direction).normalize();
        this.wispSystem.setWindDirection(this.windDirection);
    }
}

export { WindSystem }; 