import * as THREE from 'three';
import Auth from '../auth.js';

class PortalManager {
    constructor(scene) {
        this.scene = scene;
        this.portalGroup = null;
    }

    /**
     * Create Vibeverse Portal
     */
    createVibeVersePortal() {
        // Create portal group to contain all portal elements
        this.portalGroup = new THREE.Group();
        this.portalGroup.position.set(-200, 0, -300); // Position the portal somewhere in the world
        this.portalGroup.rotation.x = 0; // Make portal upright (was 0.35)
        this.portalGroup.rotation.y = 0;
        this.portalGroup.name = "vibeVersePortal";
    
        // Create portal effect (torus)
        const portalGeometry = new THREE.TorusGeometry(15, 2, 16, 100);
        const portalMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        this.portalGroup.add(portal);
    
        // Create portal inner surface (circle)
        const portalInnerGeometry = new THREE.CircleGeometry(13, 32);
        const portalInnerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
        this.portalGroup.add(portalInner);
        
        // Add portal label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512; 
        canvas.height = 64;
        context.fillStyle = '#00ff00';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(30, 5);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 20;
        this.portalGroup.add(label);
    
        // Create particle system for portal effect
        const portalParticleCount = 1000;
        const portalParticles = new THREE.BufferGeometry();
        const portalPositions = new Float32Array(portalParticleCount * 3);
        const portalColors = new Float32Array(portalParticleCount * 3);
    
        for (let i = 0; i < portalParticleCount * 3; i += 3) {
            // Create particles in a ring around the portal
            const angle = Math.random() * Math.PI * 2;
            const radius = 15 + (Math.random() - 0.5) * 4;
            portalPositions[i] = Math.cos(angle) * radius;
            portalPositions[i + 1] = Math.sin(angle) * radius;
            portalPositions[i + 2] = (Math.random() - 0.5) * 4;
    
            // Green color with slight variation
            portalColors[i] = 0;
            portalColors[i + 1] = 0.8 + Math.random() * 0.2;
            portalColors[i + 2] = 0;
        }
    
        portalParticles.setAttribute('position', new THREE.BufferAttribute(portalPositions, 3));
        portalParticles.setAttribute('color', new THREE.BufferAttribute(portalColors, 3));
    
        const portalParticleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });
    
        const portalParticleSystem = new THREE.Points(portalParticles, portalParticleMaterial);
        this.portalGroup.add(portalParticleSystem);
    
        // Add full portal group to scene
        this.scene.add(this.portalGroup);
    
        // Create a tighter custom collision box instead of using the full group bounds
        // Use the inner circle size (radius 13) as reference, not the entire portal object
        const collisionSize = 8; // Smaller than the inner circle radius for tighter collision
        const portalBox = new THREE.Box3(
            new THREE.Vector3(-collisionSize, -collisionSize, -collisionSize),
            new THREE.Vector3(collisionSize, collisionSize, collisionSize)
        );
        
        // Store the collision box in the portal's userData for later updates
        this.portalGroup.userData.collisionBox = portalBox;
        this.portalGroup.userData.collisionSize = collisionSize;
        this.portalGroup.userData.particles = portalParticles;
    
        // Start animating the portal particles
        this.animatePortalParticles(portalParticles);
        
        return this.portalGroup;
    }
    
    /**
     * Animate portal particles
     */
    animatePortalParticles(particles) {
        function update() {
            const positions = particles.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
            }
            particles.attributes.position.needsUpdate = true;
            
            requestAnimationFrame(update);
        }
        update();
    }
    
    /**
     * Check URL parameters for portal data
     */
    checkPortalParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const comingFromPortal = urlParams.get('portal') === 'true';
        
        if (comingFromPortal) {
            console.log('Player arrived through a portal');
            
            // Get username from URL parameter
            const username = urlParams.get('username');
            if (username) {
                console.log('Setting username from portal:', username);
                
                // Set the username in the main menu input field
                const usernameField = document.getElementById('mainMenuUsername');
                if (usernameField) {
                    usernameField.value = username;
                }
                
                // Also set the username in the guest login field
                const guestUsernameField = document.getElementById('guestUsername');
                if (guestUsernameField) {
                    guestUsernameField.value = username;
                }
                
                // Auto-start game if coming from portal
                // We'll start the game after a short delay to ensure DOM is fully loaded
                setTimeout(() => {
                    // Click the guest play button to start the game immediately
                    document.getElementById('guestPlayButton').click();
                }, 500);
            }
        }
    }
    
    /**
     * Update the portal collision box and check for player interaction
     * @param {Object} ship The player's ship
     * @param {Object} multiplayerManager Reference to the multiplayer manager
     * @returns {Boolean} True if the player entered the portal (triggers redirect)
     */
    checkPortalInteraction(ship, multiplayerManager) {
        if (!this.portalGroup || !ship || ship.isLoading) return false;
        
        // Get reference to the portal
        const vibeVersePortal = this.portalGroup;
        
        // Create box for the player ship
        const playerBox = new THREE.Box3().setFromObject(ship.getObject());
        const portalBox = vibeVersePortal.userData.collisionBox;
        
        // Update the collision box to be centered on the portal
        const portalPosition = new THREE.Vector3();
        vibeVersePortal.getWorldPosition(portalPosition);
        const collisionSize = vibeVersePortal.userData.collisionSize || 8;
        
        portalBox.set(
            new THREE.Vector3(
                portalPosition.x - collisionSize,
                portalPosition.y - collisionSize,
                portalPosition.z - collisionSize
            ),
            new THREE.Vector3(
                portalPosition.x + collisionSize,
                portalPosition.y + collisionSize,
                portalPosition.z + collisionSize
            )
        );
        
        // Check if player is within 50 units of the portal for UI/feedback purposes
        const portalDistance = playerBox.getCenter(new THREE.Vector3()).distanceTo(
            portalBox.getCenter(new THREE.Vector3())
        );
        
        if (portalDistance < 50) {
            // Only redirect if the player's ship actually intersects with the portal
            if (playerBox.intersectsBox(portalBox)) {
                this.handlePortalEntry(ship, multiplayerManager);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handle player entering the portal
     */
    handlePortalEntry(ship, multiplayerManager) {
        // Get username from auth
        const username = Auth.getCurrentUser()?.displayName || 'Unknown';
        
        // Before redirecting, update the player's position in Firebase to (0,0,0)
        // This ensures they spawn at the origin when they return to the game
        if (multiplayerManager && multiplayerManager.playerRef) {
            // Save original position for possible issues
            const originalPosition = ship.getPosition().clone();
            console.log('Saving spawn position before portal redirect. Original position:', originalPosition);
            
            // Create a promise to update the player's position in the database
            const updatePromise = multiplayerManager.playerRef.update({
                position: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Wait for the position update to complete before redirecting
            updatePromise.then(() => {
                this.redirectToVibeverse(username, ship.speed || 5);
            }).catch(error => {
                console.error('Error updating player position before portal redirect:', error);
                
                // Redirect anyway if there was an error updating the position
                this.redirectToVibeverse(username, ship.speed || 5);
            });
        } else {
            // If there's no multiplayer manager or player reference, just redirect
            console.warn('No multiplayer manager available to update position before portal redirect');
            this.redirectToVibeverse(username, ship.speed || 5);
        }
    }
    
    /**
     * Redirect to Vibeverse Portal
     */
    redirectToVibeverse(username, speed) {
        console.log('Player position reset to spawn point (0,0,0) before portal redirect');
        
        // Create URL with parameters
        const params = new URLSearchParams();
        params.append('portal', 'true');
        params.append('username', username);
        params.append('color', 'white'); // Default color
        params.append('speed', speed); // Get ship speed if available
        params.append('ref', window.location.hostname); // Current domain as reference
        
        // Redirect to Vibeverse Portal
        window.location.href = `http://portal.pieter.com?${params.toString()}`;
    }
    
    /**
     * Get the portal group
     */
    getPortalGroup() {
        return this.portalGroup;
    }
}

export default PortalManager; 