import * as THREE from 'three';

/**
 * Create and manage portals in the game
 */
export default class PortalManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.startPortal = null;
        this.exitPortal = null;
        this.startPortalBox = null;
        this.exitPortalBox = null;
        this.selfUsername = '';
        this.currentSpeed = 20; // Default speed
        this.init();
    }

    init() {
        // Check if we should create a start portal (coming from another game)
        this.createPortals();
        this.animateStartPortal();
        this.animateExitPortal();
    }

    setPlayerInfo(username, speed) {
        this.selfUsername = username;
        this.currentSpeed = speed;
    }

    createPortals() {
        // Create exit portal
        this.createExitPortal();

        // Create start portal if we came from another portal
        if (new URLSearchParams(window.location.search).get('portal')) {
            this.createStartPortal();
        }
    }

    createStartPortal() {
        // Constants - position portal at a visible place above water
        const SPAWN_POINT_X = 50;
        const SPAWN_POINT_Y = -0.5;  // Place slightly below water level
        const SPAWN_POINT_Z = 50;

        // Create portal group to contain all portal elements
        const startPortalGroup = new THREE.Group();
        startPortalGroup.position.set(SPAWN_POINT_X, SPAWN_POINT_Y, SPAWN_POINT_Z);
        startPortalGroup.rotation.x = 0;  // Don't tilt, make vertical
        startPortalGroup.rotation.y = Math.PI;  // Flip 180 degrees so text reads correctly
        
        // Add identifier userData for other systems
        startPortalGroup.name = 'start-portal';
        startPortalGroup.userData.isPortal = true;
        startPortalGroup.userData.portalType = 'start';

        // Create portal effect
        const startPortalGeometry = new THREE.TorusGeometry(15, 2, 16, 100);  // Back to original size
        const startPortalMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        const startPortal = new THREE.Mesh(startPortalGeometry, startPortalMaterial);
        startPortalGroup.add(startPortal);
                        
        // Create portal inner surface
        const startPortalInnerGeometry = new THREE.CircleGeometry(13, 32);  // Back to original size
        const startPortalInnerMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const startPortalInner = new THREE.Mesh(startPortalInnerGeometry, startPortalInnerMaterial);
        startPortalGroup.add(startPortalInner);

        // Create simplified particles (empty array to remove layers)
        const startPortalParticleCount = 0;
        const startPortalParticles = new THREE.BufferGeometry();
        const startPortalPositions = new Float32Array(startPortalParticleCount * 3);
        const startPortalColors = new Float32Array(startPortalParticleCount * 3);

        startPortalParticles.setAttribute('position', new THREE.BufferAttribute(startPortalPositions, 3));
        startPortalParticles.setAttribute('color', new THREE.BufferAttribute(startPortalColors, 3));

        const startPortalParticleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });

        const startPortalParticleSystem = new THREE.Points(startPortalParticles, startPortalParticleMaterial);
        startPortalGroup.add(startPortalParticleSystem);

        // Add portal group to scene
        this.scene.add(startPortalGroup);

        // Store references
        this.startPortal = startPortalGroup;
        this.startPortalParticles = startPortalParticles;
        this.startPortalInnerMaterial = startPortalInnerMaterial;

        // Create portal collision box
        this.startPortalBox = new THREE.Box3().setFromObject(startPortalGroup);

        // Add label for the return portal
        const loader = new THREE.TextureLoader();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 64;
        context.fillStyle = '#ffffff';  // White text for better visibility
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        
        // Get the ref parameter for the label
        const urlParams = new URLSearchParams(window.location.search);
        const refUrl = urlParams.get('ref') || 'Previous Game';
        context.fillText(`Return to ${refUrl}`, canvas.width/2, canvas.height/2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(30, 5);  // Back to original size
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 20;  // Keep higher position for visibility
        startPortalGroup.add(label);
    }

    createExitPortal() {
        // Create portal group to contain all portal elements
        const exitPortalGroup = new THREE.Group();
        
        // Position exit portal at a consistent location that's visible and accessible
        exitPortalGroup.position.set(300, -0.5, 300);  // Place slightly below water level
        exitPortalGroup.rotation.x = 0;  // Don't tilt, make vertical
        exitPortalGroup.rotation.y = Math.PI;  // Flip 180 degrees so text reads correctly
        
        // Add identifier userData for other systems
        exitPortalGroup.name = 'exit-portal';
        exitPortalGroup.userData.isPortal = true;
        exitPortalGroup.userData.portalType = 'exit';

        // Create portal effect
        const exitPortalGeometry = new THREE.TorusGeometry(15, 2, 16, 100);  // Back to original size
        const exitPortalMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        const exitPortal = new THREE.Mesh(exitPortalGeometry, exitPortalMaterial);
        exitPortalGroup.add(exitPortal);

        // Create portal inner surface
        const exitPortalInnerGeometry = new THREE.CircleGeometry(13, 32);  // Back to original size
        const exitPortalInnerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const exitPortalInner = new THREE.Mesh(exitPortalInnerGeometry, exitPortalInnerMaterial);
        exitPortalGroup.add(exitPortalInner);
        
        // Add portal label
        const loader = new THREE.TextureLoader();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 64;
        context.fillStyle = '#ffffff';  // White text for better visibility
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(30, 5);  // Back to original size
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 20;  // Keep higher position for visibility
        exitPortalGroup.add(label);

        // Create simplified particles (empty array to remove layers)
        const exitPortalParticleCount = 0;
        const exitPortalParticles = new THREE.BufferGeometry();
        const exitPortalPositions = new Float32Array(exitPortalParticleCount * 3);
        const exitPortalColors = new Float32Array(exitPortalParticleCount * 3);

        exitPortalParticles.setAttribute('position', new THREE.BufferAttribute(exitPortalPositions, 3));
        exitPortalParticles.setAttribute('color', new THREE.BufferAttribute(exitPortalColors, 3));

        const exitPortalParticleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });

        const exitPortalParticleSystem = new THREE.Points(exitPortalParticles, exitPortalParticleMaterial);
        exitPortalGroup.add(exitPortalParticleSystem);

        // Add full portal group to scene
        this.scene.add(exitPortalGroup);

        // Store references
        this.exitPortal = exitPortalGroup;
        this.exitPortalParticles = exitPortalParticles;
        this.exitPortalInnerMaterial = exitPortalInnerMaterial;

        // Create portal collision box
        this.exitPortalBox = new THREE.Box3().setFromObject(exitPortalGroup);
    }

    animateStartPortal() {
        if (!this.startPortal) return;
        
        // Skip particle animation since we've removed them
        if (this.startPortalParticles && this.startPortalParticles.attributes.position.count > 0) {
            const positions = this.startPortalParticles.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
            }
            this.startPortalParticles.attributes.position.needsUpdate = true;
        }
        
        // Update portal shader time
        if (this.startPortalInnerMaterial.uniforms && this.startPortalInnerMaterial.uniforms.time) {
            this.startPortalInnerMaterial.uniforms.time.value = Date.now() * 0.001;
        }

        requestAnimationFrame(() => this.animateStartPortal());
    }

    animateExitPortal() {
        if (!this.exitPortal) return;
        
        // Skip particle animation since we've removed them
        if (this.exitPortalParticles && this.exitPortalParticles.attributes.position.count > 0) {
            const positions = this.exitPortalParticles.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
            }
            this.exitPortalParticles.attributes.position.needsUpdate = true;
        }
        
        // Update portal shader time
        if (this.exitPortalInnerMaterial.uniforms && this.exitPortalInnerMaterial.uniforms.time) {
            this.exitPortalInnerMaterial.uniforms.time.value = Date.now() * 0.001;
        }

        requestAnimationFrame(() => this.animateExitPortal());
    }

    checkPortalCollisions() {
        if (!this.player) return;
        
        // Create a box for the player - need to get the actual THREE.js object
        // Ship likely has a getObject method to get the actual THREE.js object
        const playerObject = typeof this.player.getObject === 'function' 
            ? this.player.getObject() 
            : this.player;
            
        // Skip if we couldn't get a valid Object3D
        if (!playerObject || !playerObject.isObject3D) return;
        
        // Get player position (either from object or custom method)
        const playerPosition = typeof this.player.getPosition === 'function'
            ? this.player.getPosition()
            : playerObject.position;
        
        if (!playerPosition) return;
        
        // Check start portal if it exists
        if (this.startPortal && this.startPortalBox) {
            // Get center of portal
            const portalCenter = new THREE.Vector3();
            this.startPortalBox.getCenter(portalCenter);
            
            // Check distance using player position
            const portalDistance = playerPosition.distanceTo(portalCenter);
            
            // Only check collision if very close to portal (20 units)
            if (portalDistance < 30) {
                // Create a tighter bounding box for the player
                const playerBox = new THREE.Box3().setFromObject(playerObject);
                
                // Make tighter bounding box for portal
                const tightPortalBox = new THREE.Box3().copy(this.startPortalBox);
                
                // Make the portal box smaller (about half the size)
                const portalCenter = new THREE.Vector3();
                tightPortalBox.getCenter(portalCenter);
                const portalSize = new THREE.Vector3();
                tightPortalBox.getSize(portalSize);
                
                // Set the box to 50% of its original size
                tightPortalBox.set(
                    new THREE.Vector3(
                        portalCenter.x - portalSize.x * 0.25,
                        portalCenter.y - portalSize.y * 0.25,
                        portalCenter.z - portalSize.z * 0.25
                    ),
                    new THREE.Vector3(
                        portalCenter.x + portalSize.x * 0.25,
                        portalCenter.y + portalSize.y * 0.25,
                        portalCenter.z + portalSize.z * 0.25
                    )
                );
                
                // Use the tighter bounding box for collision detection
                if (playerBox.intersectsBox(tightPortalBox)) {
                    this.handleStartPortalEntry();
                }
            }
        }
        
        // Check exit portal
        if (this.exitPortal && this.exitPortalBox) {
            // Get center of portal
            const portalCenter = new THREE.Vector3();
            this.exitPortalBox.getCenter(portalCenter);
            
            // Check distance using player position
            const portalDistance = playerPosition.distanceTo(portalCenter);
            
            // Only check collision if very close to portal (20 units)
            if (portalDistance < 30) {
                // Preload the next page when close
                this.preloadVibeversePage();
                
                // Create a tighter bounding box for the player
                const playerBox = new THREE.Box3().setFromObject(playerObject);
                
                // Make tighter bounding box for portal
                const tightPortalBox = new THREE.Box3().copy(this.exitPortalBox);
                
                // Make the portal box smaller (about half the size)
                const portalCenter = new THREE.Vector3();
                tightPortalBox.getCenter(portalCenter);
                const portalSize = new THREE.Vector3();
                tightPortalBox.getSize(portalSize);
                
                // Set the box to 50% of its original size
                tightPortalBox.set(
                    new THREE.Vector3(
                        portalCenter.x - portalSize.x * 0.25,
                        portalCenter.y - portalSize.y * 0.25,
                        portalCenter.z - portalSize.z * 0.25
                    ),
                    new THREE.Vector3(
                        portalCenter.x + portalSize.x * 0.25,
                        portalCenter.y + portalSize.y * 0.25,
                        portalCenter.z + portalSize.z * 0.25
                    )
                );
                
                // Use the tighter bounding box for collision detection
                if (playerBox.intersectsBox(tightPortalBox)) {
                    this.handleExitPortalEntry();
                }
            }
        }
    }

    handleStartPortalEntry() {
        // Reset player position in database before redirecting
        this.resetPlayerPosition();
        
        // Get ref from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const refUrl = urlParams.get('ref');
        
        if (refUrl) {
            // Add https if not present and include query params
            let url = refUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            // Forward all other params except ref (since we're going back to that URL)
            const currentParams = new URLSearchParams(window.location.search);
            const newParams = new URLSearchParams();
            
            for (const [key, value] of currentParams) {
                if (key !== 'ref') {
                    newParams.append(key, value);
                }
            }
            
            const paramString = newParams.toString();
            window.location.href = url + (paramString ? '?' + paramString : '');
        }
    }

    preloadVibeversePage() {
        // Only create the iframe once
        if (!document.getElementById('preloadFrame')) {
            const nextPageUrl = this.getVibeverseUrl();
            
            const iframe = document.createElement('iframe');
            iframe.id = 'preloadFrame';
            iframe.style.display = 'none';
            iframe.src = nextPageUrl;
            document.body.appendChild(iframe);
        }
    }
    
    handleExitPortalEntry() {
        // Reset player position in database before redirecting
        this.resetPlayerPosition();
        
        window.location.href = this.getVibeverseUrl();
    }
    
    resetPlayerPosition() {
        // Attempt to reset the player's position in the database
        try {
            // Access the multiplayer manager from the window object
            const multiplayerManager = window.multiplayerManager;
            
            if (multiplayerManager) {
                console.log('Resetting player position in database before portal transition');
                
                // First reset the player's position locally (if possible)
                if (this.player) {
                    // Set position to origin (0,0,0)
                    if (typeof this.player.setPosition === 'function') {
                        this.player.setPosition(0, 0, 0);
                    } else if (this.player.position) {
                        this.player.position.set(0, 0, 0);
                    }
                    
                    // Make sure the player's object is also positioned at origin
                    if (typeof this.player.getObject === 'function') {
                        const playerObject = this.player.getObject();
                        if (playerObject && playerObject.position) {
                            playerObject.position.set(0, 0, 0);
                        }
                    }
                    
                    // If there's any rotation or velocity data, reset that too
                    if (this.player.rotation) {
                        this.player.rotation.set(0, 0, 0);
                    }
                    
                    if (this.player.velocity) {
                        this.player.velocity.set(0, 0, 0);
                    }
                }
                
                // Then update the database with the new position
                if (typeof multiplayerManager.updatePlayerPosition === 'function') {
                    multiplayerManager.updatePlayerPosition(this.player);
                    console.log('Player position reset in database before portal transition');
                } else if (typeof multiplayerManager.updatePosition === 'function') {
                    // Alternative method name
                    multiplayerManager.updatePosition({
                        x: 0, 
                        y: 0, 
                        z: 0,
                        rotation: { x: 0, y: 0, z: 0 }
                    });
                    console.log('Player position reset in database before portal transition');
                } else {
                    // Try a direct Firebase update if we can get the Firebase reference
                    if (multiplayerManager.database && multiplayerManager.playerId) {
                        const playerRef = multiplayerManager.database.ref(`players/${multiplayerManager.playerId}`);
                        playerRef.update({
                            position: { x: 0, y: 0, z: 0 },
                            rotation: { x: 0, y: 0, z: 0 }
                        });
                        console.log('Player position reset using direct Firebase update');
                    }
                }
            } else {
                console.warn('Could not reset player position - multiplayer manager not found');
            }
        } catch (error) {
            console.error('Error resetting player position:', error);
        }
    }

    getVibeverseUrl() {
        // Create parameter string with player info
        const currentParams = new URLSearchParams(window.location.search);
        const newParams = new URLSearchParams();
        
        // Get default ship parameters from Sloop class
        const defaultShipSpeed = 10; // Default speed from Sloop.js
        const defaultHullColor = 0x8B4513; // Default hull color from Sloop.js (brown)
        
        // Add required portal parameters
        newParams.append('portal', 'true');
        newParams.append('username', this.selfUsername || 'Anonymous');
        
        // Use defaults instead of hardcoded values
        // Convert hull color from hex number to string
        newParams.append('color', '#' + defaultHullColor.toString(16).padStart(6, '0'));
        newParams.append('speed', defaultShipSpeed);
        
        // Add ref parameter with current URL
        newParams.append('ref', window.location.origin + window.location.pathname);
        
        // Forward any other existing parameters
        for (const [key, value] of currentParams) {
            if (!['portal', 'username', 'color', 'speed', 'ref'].includes(key)) {
                newParams.append(key, value);
            }
        }
        
        const paramString = newParams.toString();
        return 'https://portal.pieter.com' + (paramString ? '?' + paramString : '');
    }

    update() {
        // Check for portal collisions in the animation loop
        this.checkPortalCollisions();
    }
} 