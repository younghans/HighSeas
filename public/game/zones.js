import * as THREE from 'three';

class Zones {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.safeZones = [];
        this.pvpZones = [];
        
        // Visualization helpers
        this.debugHelpers = [];
    }

    // Load all zones from islands manifest
    loadZones(islandsManifest) {
        // Clear existing zones
        this.safeZones = [];
        
        // Process each island's zones
        if (islandsManifest && islandsManifest.islands) {
            islandsManifest.islands.forEach(island => {
                if (island.metadata && island.metadata.safeZone) {
                    this.addSafeZone(
                        island.position.x,
                        island.position.z,
                        island.metadata.safeZone,
                        island.metadata.name || island.name
                    );
                }
            });
        }
        
        // Create debug visualization if needed (disabled by default)
        // this.createDebugVisualizations();
        
        // Apply zone visualization
        this.createSafeZoneVisualizations();
    }
    
    // Add a safe zone at the specified position with the given diameter
    addSafeZone(x, z, diameter, name = "Safe Zone") {
        this.safeZones.push({
            position: new THREE.Vector2(x, z),
            radius: diameter / 2,
            name: name
        });
        
        console.log(`Added safe zone "${name}" at (${x},${z}) with radius ${diameter/2}`);
    }
    
    // Check if a position is within any safe zone
    isInSafeZone(x, z, buffer = 0) {
        const position = new THREE.Vector2(x, z);
        
        for (const safeZone of this.safeZones) {
            const distance = position.distanceTo(safeZone.position);
            if (distance <= safeZone.radius + buffer) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get information about a safe zone at a position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {Object|null} Zone information or null if not in a zone
     */
    getSafeZoneInfo(x, z) {
        const position = new THREE.Vector2(x, z);
        
        for (let i = 0; i < this.safeZones.length; i++) {
            const safeZone = this.safeZones[i];
            const distance = position.distanceTo(safeZone.position);
            
            if (distance <= safeZone.radius) {
                // Return zone info with index
                return {
                    index: i,
                    position: safeZone.position,
                    radius: safeZone.radius,
                    name: safeZone.name || "Safe Zone",
                    distanceFromCenter: distance,
                    distanceFromEdge: safeZone.radius - distance
                };
            }
        }
        
        return null;
    }
    
    // Create visual representation of safe zones with smooth transitions
    createSafeZoneVisualizations() {
        // Clear any existing visualizations
        this.clearVisualizations();
        
        // Create gradient for each safe zone
        this.safeZones.forEach(zone => {
            this.createSmoothGradientSafeZone(zone);
        });
    }

    // Create a smooth gradient transition using a shader
    createSmoothGradientSafeZone(zone) {
        const { position, radius } = zone;
        
        // Create a custom shader material with radial gradient
        const gradientShader = {
            uniforms: {
                innerColor: { value: new THREE.Color(0x6afffd) },
                outerColor: { value: new THREE.Color(0x6afffd) },
                innerOpacity: { value: 0.1 },
                outerOpacity: { value: 0.0 },
                innerRadius: { value: radius * 0.8 },   // Where full opacity starts
                outerRadius: { value: radius }          // Where opacity fades to zero
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 innerColor;
                uniform vec3 outerColor;
                uniform float innerOpacity;
                uniform float outerOpacity;
                uniform float innerRadius;
                uniform float outerRadius;
                varying vec2 vUv;
                
                void main() {
                    // Convert UV coordinates (0-1) to position relative to center (-1 to 1)
                    vec2 position = vUv * 2.0 - 1.0;
                    
                    // Calculate distance from center (normalized 0-1 based on outerRadius)
                    float dist = length(position) * outerRadius;
                    
                    // Calculate opacity using smoothstep for a smooth transition
                    float opacity;
                    if (dist < innerRadius) {
                        // Inside the inner core - full opacity
                        opacity = innerOpacity;
                    } else {
                        // Transition zone - smooth gradient
                        opacity = mix(innerOpacity, outerOpacity, 
                                     smoothstep(innerRadius, outerRadius, dist));
                    }
                    
                    // Mix between inner color and outer color
                    vec3 color = mix(innerColor, outerColor, 
                                    smoothstep(innerRadius, outerRadius, dist));
                    
                    // Set the final color with calculated opacity
                    gl_FragColor = vec4(color, opacity);
                }
            `
        };

        // Create a circle geometry that covers the entire safe zone
        const geometry = new THREE.CircleGeometry(radius, 64);
        
        // Create the shader material
        const material = new THREE.ShaderMaterial({
            uniforms: gradientShader.uniforms,
            vertexShader: gradientShader.vertexShader,
            fragmentShader: gradientShader.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Create mesh with the gradient shader
        const gradientDisk = new THREE.Mesh(geometry, material);
        gradientDisk.position.set(position.x, 0.2, position.y);
        gradientDisk.rotation.x = -Math.PI / 2;
        
        this.scene.add(gradientDisk);
        this.debugHelpers.push(gradientDisk);
    }
    
    // Create debug visualizations for the safe zones
    createDebugVisualizations() {
        // Clear any existing helpers
        this.clearDebugHelpers();
        
        // Create a wireframe visualization for each safe zone
        this.safeZones.forEach(zone => {
            const helper = new THREE.Group();
            
            // Create a ring representing the safe zone boundary
            const geometry = new THREE.RingGeometry(zone.radius - 1, zone.radius, 64);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.2
            });
            
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = -Math.PI / 2; // Make it horizontal
            helper.add(ring);
            
            // Position the helper
            helper.position.set(zone.position.x, 1, zone.position.y); // Slightly above water
            
            // Add to scene and track for cleanup
            this.scene.add(helper);
            this.debugHelpers.push(helper);
        });
    }
    
    // Clear all visualizations
    clearVisualizations() {
        this.debugHelpers.forEach(helper => {
            if (helper.parent) helper.parent.remove(helper);
        });
        this.debugHelpers = [];
    }
    
    // Clear debug helpers (alias for clearVisualizations)
    clearDebugHelpers() {
        this.clearVisualizations();
    }
}

export default Zones; 