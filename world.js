import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

class World {
    constructor(scene) {
        this.scene = scene;
        this.sun = new THREE.Vector3();
        this.sky = null;
        this.water = null;
        this.sunLight = null;
        this.stars = null;
        this.clouds = null;
        
        // Day-night cycle parameters
        this.dayNightCycle = 0;
        this.DAY_DURATION = 30; // 30 seconds of day
        this.NIGHT_DURATION = 10; // 10 seconds of night
        this.TOTAL_CYCLE = this.DAY_DURATION + this.NIGHT_DURATION;
        
        // Initialize world components
        this.createSky();
        this.setupLighting();
        this.createHDWater();
        this.createStars();
        this.createClouds();
    }
    
    createSky() {
        // Add Sky
        this.sky = new Sky();
        this.sky.scale.setScalar(10000);
        this.scene.add(this.sky);

        // Configure sky
        const skyUniforms = this.sky.material.uniforms;
        skyUniforms['turbidity'].value = 7; // Reduced from 10 to decrease haziness
        skyUniforms['rayleigh'].value = .7; // Increased from 2 to enhance blue color
        skyUniforms['mieCoefficient'].value = 0.001; // Reduced from 0.005 to decrease whiteness at horizon
        skyUniforms['mieDirectionalG'].value = 0.7; // Reduced from 0.8 for less concentrated scattering

        // Initial sun position (will be updated in animate)
        const parameters = {
            elevation: 5,
            azimuth: 90  // Start at east (90 degrees)
        };

        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        this.sun.setFromSphericalCoords(1, phi, theta);

        skyUniforms['sunPosition'].value.copy(this.sun);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(this.sun.x * 100, this.sun.y * 100, this.sun.z * 100);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.scene.add(this.sunLight);
    }

    createHDWater() {
        // Create water geometry
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

        // Create HD water with reflections and refractions
        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function(texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: new THREE.Vector3(this.sun.x, this.sun.y, this.sun.z),
                sunColor: 0xffffff,
                waterColor: 0x001e0f, // Single water color for both day and night
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );

        this.water.rotation.x = -Math.PI / 2;
        this.water.receiveShadow = true;
        this.scene.add(this.water);
    }
    
    createStars() {
        this.stars = new THREE.Group();
        const starsGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        const starColors = [];
        
        // Create 1000 stars
        for(let i = 0; i < 1000; i++) {
            // Position stars in a dome above the scene
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 1000 + Math.random() * 2000; // Random distance between 1000 and 3000
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = Math.abs(radius * Math.sin(phi) * Math.sin(theta)); // Keep stars above horizon
            const z = radius * Math.cos(phi);
            
            starPositions.push(x, y, z);
            
            // Random star colors (mostly white with some blue and yellow tints)
            const r = 0.9 + Math.random() * 0.1;
            const g = 0.9 + Math.random() * 0.1;
            const b = 0.9 + Math.random() * 0.1;
            starColors.push(r, g, b);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
        
        const starsMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true
        });
        
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.stars.add(starField);
        this.stars.visible = false; // Start with stars hidden
        this.scene.add(this.stars);
    }
    
    createClouds() {
        this.clouds = new THREE.Group();
        this.scene.add(this.clouds);
        
        // Create 80 clouds for high density
        for (let i = 0; i < 80; i++) {
            // Create a cloud group for each cloud formation
            const cloudGroup = new THREE.Group();
            
            // Random position in the sky - more distributed to fill the sky
            const angle = Math.random() * Math.PI * 2;
            // Wider distribution range to prevent overcrowding
            const distance = 300 + Math.random() * 1800; 
            // More varied heights for layered appearance
            const height = 150 + Math.random() * 350; 
            
            cloudGroup.position.set(
                Math.cos(angle) * distance,
                height,
                Math.sin(angle) * distance
            );
            
            // Random rotation for variety
            cloudGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Create cloud material
            const cloudMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.92, // Slightly more opaque
                roughness: 1,
                metalness: 0
            });
            
            // Create a complex cumulus cloud shape using multiple overlapping spheres
            const numPuffs = 8 + Math.floor(Math.random() * 12); // 8-19 puffs per cloud
            
            // Base large puffs
            for (let j = 0; j < numPuffs; j++) {
                // Create a puff with random size
                const puffSize = 25 + Math.random() * 12;
                const puffGeometry = new THREE.SphereGeometry(puffSize, 8, 8);
                const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
                
                // Position puffs to form a cumulus shape
                // Horizontal positioning - cluster around center
                const puffDistance = Math.random() * 60;
                const puffAngle = Math.random() * Math.PI * 2;
                puff.position.x = Math.cos(puffAngle) * puffDistance;
                puff.position.z = Math.sin(puffAngle) * puffDistance;
                
                // Vertical positioning - higher in the middle for puffier appearance
                const heightFactor = 1 - (puffDistance / 70);
                puff.position.y = Math.random() * 30 * heightFactor;
                
                // Add some random scaling for organic look
                const scaleVar = 0.8 + Math.random() * 0.4;
                const verticalScale = 0.7 + Math.random() * 0.6;
                puff.scale.set(scaleVar, verticalScale, scaleVar);
                
                cloudGroup.add(puff);
            }
            
            // Add smaller detail puffs
            for (let j = 0; j < numPuffs * 0.7; j++) {
                const detailSize = 12 + Math.random() * 18;
                const detailGeometry = new THREE.SphereGeometry(detailSize, 6, 6);
                const detailPuff = new THREE.Mesh(detailGeometry, cloudMaterial);
                
                // Position on top of the main cloud mass
                const puffDistance = Math.random() * 70;
                const puffAngle = Math.random() * Math.PI * 2;
                detailPuff.position.x = Math.cos(puffAngle) * puffDistance;
                detailPuff.position.z = Math.sin(puffAngle) * puffDistance;
                detailPuff.position.y = 25 + Math.random() * 20;
                
                cloudGroup.add(detailPuff);
            }
            
            // Random cloud scale for variety
            const cloudScale = 0.6 + Math.random() * 0.6;
            cloudGroup.scale.set(cloudScale, cloudScale * 0.9, cloudScale);
            
            // Add the cloud to the clouds group
            this.clouds.add(cloudGroup);
        }
    }
    
    // Smooth step function for nicer transitions
    smoothStep(min, max, value) {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }
    
    update(delta) {
        // Update day-night cycle
        this.dayNightCycle = (this.dayNightCycle + delta) % this.TOTAL_CYCLE;
        
        // Calculate sun elevation and azimuth based on cycle
        let elevation, azimuth;
        let dayNightTransition;
        
        if (this.dayNightCycle < this.DAY_DURATION) {
            // Day time
            const dayProgress = this.dayNightCycle / this.DAY_DURATION;
            elevation = 5 + Math.sin(dayProgress * Math.PI) * 85; // Sun moves from 5° to 90° and back
            // Azimuth changes from 90° (east) to 270° (west) during the day
            azimuth = 90 + dayProgress * 180;
            
            // Calculate transition factor for day/night (0 = full day, 1 = full night)
            // Smooth transition near sunrise and sunset
            if (dayProgress < 0.1) {
                // Sunrise transition (night to day)
                dayNightTransition = 1 - this.smoothStep(0, 1, dayProgress / 0.1);
            } else if (dayProgress > 0.9) {
                // Sunset transition (day to night)
                dayNightTransition = this.smoothStep(0, 1, (dayProgress - 0.9) / 0.1);
            } else {
                // Full day
                dayNightTransition = 0;
            }
        } else {
            // Night time
            const nightProgress = (this.dayNightCycle - this.DAY_DURATION) / this.NIGHT_DURATION;
            elevation = 5 - Math.sin(nightProgress * Math.PI) * 45; // Sun moves below horizon
            // Continue azimuth movement during night (from west back to east)
            azimuth = 270 + nightProgress * 180;
            if (azimuth > 360) azimuth -= 360;
            
            // During night, transition factor is always 1
            dayNightTransition = 1;
        }

        // Update sun position
        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(azimuth);
        this.sun.setFromSphericalCoords(1, phi, theta);
        
        // Update sky
        const skyUniforms = this.sky.material.uniforms;
        skyUniforms['sunPosition'].value.copy(this.sun);
        
        // Update stars visibility and intensity with smooth transition
        if (this.stars) {
            // Always visible but opacity controlled by transition
            this.stars.visible = true;
            const baseStarOpacity = Math.min(-elevation / 15, 1); // Original calculation
            this.stars.children[0].material.opacity = baseStarOpacity * dayNightTransition;
        }
        
        // Update clouds with smooth transition between day/night appearance
        if (this.clouds) {
            // Make clouds transition smoothly between day and night appearance
            this.clouds.children.forEach(cloud => {
                cloud.children.forEach(puff => {
                    // Interpolate between day and night colors/opacity
                    const r = 1 - dayNightTransition * 0.7; // 1.0 to 0.3
                    const g = 1 - dayNightTransition * 0.7; // 1.0 to 0.3
                    const b = 1 - dayNightTransition * 0.6; // 1.0 to 0.4
                    puff.material.color.setRGB(r, g, b);
                    
                    // Transition opacity from 0.9 (day) to 0.7 (night)
                    puff.material.opacity = 0.9 - dayNightTransition * 0.2;
                });
            });
            
            // Gently move clouds
            this.clouds.children.forEach((cloud, index) => {
                // Each cloud moves at a slightly different speed
                const cloudSpeed = 0.2 + (index % 5) * 0.05;
                cloud.position.x += cloudSpeed * delta;
                
                // Reset cloud position when it moves too far
                if (cloud.position.x > 2000) {
                    cloud.position.x = -2000;
                }
            });
        }
        
        // Update lighting with smooth transition
        // Calculate light intensity with smoother transition
        let lightIntensity;
        if (elevation > 0) {
            // Day intensity with smooth transition near sunset
            const baseIntensity = Math.max(0.5, elevation / 90);
            lightIntensity = baseIntensity * (1 - dayNightTransition) + 0.1 * dayNightTransition;
        } else {
            // Night intensity with smooth transition near sunrise
            lightIntensity = 0.1 + (1 - dayNightTransition) * 0.4;
        }
        
        this.sunLight.position.set(this.sun.x * 100, this.sun.y * 100, this.sun.z * 100);
        this.sunLight.intensity = lightIntensity;
        
        // Animate water - reduced speed by 5x
        this.water.material.uniforms['time'].value += 1.0 / 300.0;
    }
    
    getWater() {
        return this.water;
    }
}

export default World; 