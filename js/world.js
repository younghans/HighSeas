import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

// Variables that need to be accessible
let sky, sun;
let sunLight;
let water;
let stars;

// Initialize sun vector to avoid undefined references
sun = new THREE.Vector3();

// Calculate sun elevation based on cycle - MODIFIED FOR FIXED SUN
const elevation = 5; // Fixed sun elevation at 5 degrees
const isNight = false; // Always daytime

/**
 * Creates a modern sky with sun
 * @param {THREE.Scene} scene - The scene to add the sky to
 * @param {THREE.WebGLRenderer} renderer - The renderer for environment maps
 * @returns {Object} Sky-related objects and update function
 */
function createModernSky(scene, renderer) {
    console.log('Creating modern sky...');
    
    // Create Sky instance
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    // Sky parameters - keep these
    const effectController = {
        turbidity: 5,
        rayleigh: 1,
        mieCoefficient: 0.001,
        mieDirectionalG: 0.7,
        elevation: 5,  // Fixed at 5 degrees
        azimuth: 180,
        // Don't set exposure here - let the main renderer control it
    };

    // Apply sky parameters
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = effectController.turbidity;
    skyUniforms['rayleigh'].value = effectController.rayleigh;
    skyUniforms['mieCoefficient'].value = effectController.mieCoefficient;
    skyUniforms['mieDirectionalG'].value = effectController.mieDirectionalG;
    
    // Set sun position once
    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sun);
    
    // Generate environment map once
    updateEnvironmentMap(scene, renderer);
    
    console.log('Modern sky created successfully');
    
    // Return a simplified object without updateSun
    return { sky, sun, effectController };
}

/**
 * Generate environment map for reflections
 * @param {THREE.Scene} scene - The scene to update
 * @param {THREE.WebGLRenderer} renderer - The renderer
 */
function updateEnvironmentMap(scene, renderer) {
    // Create a temporary scene with just the sky
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    
    // Create a scene with only the sky
    const skyScene = new THREE.Scene();
    skyScene.add(sky.clone());
    
    // Generate environment map
    const envMap = pmremGenerator.fromScene(skyScene).texture;
    
    // Apply to scene environment and for reflections
    scene.environment = envMap;
    
    // Optionally set as scene background too
    scene.background = envMap;
    
    // Dispose temporary resources
    pmremGenerator.dispose();
}

/**
 * Sets up lighting for the scene
 * @param {THREE.Scene} scene - The scene to add lights to
 */
function setupLighting(scene) {
    console.log('Setting up lighting...');
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Directional light (sun)
    sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(sun.x * 100, sun.y * 100, sun.z * 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);
    
    console.log('Lighting set up successfully');
    return sunLight;
}

/**
 * Creates HD water with reflections
 * @param {THREE.Scene} scene - The scene to add water to
 * @returns {THREE.Mesh} The water mesh
 */
function createHDWater(scene) {
    console.log('Creating HD water...');
    
    // Create water geometry
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    // Create HD water with reflections and refractions
    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function(texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(sun.x, sun.y, sun.z),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined,
            reflectivity: 0.5,
            envMap: scene.environment
        }
    );

    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    scene.add(water);
    
    console.log('HD water created successfully');
    return water;
}

/**
 * Creates stars in the night sky
 * @param {THREE.Scene} scene - The scene to add stars to
 * @returns {THREE.Group} The stars group
 */
function createStars(scene) {
    console.log('Creating stars...');
    
    stars = new THREE.Group();
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
    stars.add(starField);
    stars.visible = false; // Start with stars hidden
    scene.add(stars);
    
    console.log('Stars created successfully');
    return stars;
}

// Export functions and variables
export { 
    createModernSky, 
    setupLighting, 
    createHDWater, 
    createStars,
    sun,
    sky,
    water,
    stars
}; 