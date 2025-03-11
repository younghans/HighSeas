import * as THREE from 'three';

class Dock {
    constructor(params = {}) {
        // Default parameters
        this.width = params.width || 20;
        this.length = params.length || 40;
        this.height = params.height || 1;
        this.planksAcross = params.planksAcross || 8;
        this.plankGap = params.plankGap || 0.05;
        this.pilesPerSide = params.pilesPerSide || 6;
        this.weathering = params.weathering || 0.7; // 0-1 weathering factor
        this.position = params.position || new THREE.Vector3(0, 0, 0);
        this.rotation = params.rotation || 0;
        
        // Create the dock object
        this.object = new THREE.Group();
        this.object.position.copy(this.position);
        this.object.rotation.y = this.rotation;
        
        // Generate the dock components
        this.createMainPlatform();
        this.createSupportPiles();
        this.createRailings();
        
        // Add some details
        this.addDetails();
    }
    
    createMainPlatform() {
        const plankWidth = this.width / this.planksAcross;
        const plankLength = this.length;
        const plankHeight = this.height;
        const actualPlankWidth = plankWidth - this.plankGap;
        
        // Create wood texture
        const textureLoader = new THREE.TextureLoader();
        const woodTexture = this.generateProceduralWoodTexture();
        
        // Create planks
        for (let i = 0; i < this.planksAcross; i++) {
            // Vary plank properties slightly for realism
            const weatherFactor = 1 - (Math.random() * this.weathering * 0.3);
            const plankColor = new THREE.Color(0.6 * weatherFactor, 0.4 * weatherFactor, 0.2 * weatherFactor);
            
            // Create plank geometry with slight variations
            const plankGeometry = new THREE.BoxGeometry(
                actualPlankWidth, 
                plankHeight, 
                plankLength
            );
            
            const plankMaterial = new THREE.MeshStandardMaterial({
                color: plankColor,
                roughness: 0.8 + Math.random() * 0.2,
                metalness: 0.1,
                map: woodTexture
            });
            
            const plank = new THREE.Mesh(plankGeometry, plankMaterial);
            
            // Position plank
            plank.position.set(
                (i * plankWidth) - (this.width / 2) + (plankWidth / 2),
                0,
                0
            );
            
            // Add slight random rotation for weathered look
            if (this.weathering > 0.3) {
                plank.rotation.z = (Math.random() - 0.5) * 0.05 * this.weathering;
                plank.rotation.x = (Math.random() - 0.5) * 0.02 * this.weathering;
                
                // Some planks might be slightly sunken or raised
                plank.position.y += (Math.random() - 0.5) * 0.1 * this.weathering;
            }
            
            this.object.add(plank);
        }
    }
    
    createSupportPiles() {
        const pileRadius = 0.4;
        const pileHeight = 8; // Height below the dock
        
        // Create a weathered wood material for piles
        const pileMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.35, 0.2, 0.1),
            roughness: 1.0,
            metalness: 0.0
        });
        
        // Add piles along both sides
        for (let i = 0; i <= this.pilesPerSide; i++) {
            const zPos = (i / this.pilesPerSide) * this.length - (this.length / 2);
            
            // Left pile
            const leftPileGeometry = new THREE.CylinderGeometry(
                pileRadius * (0.9 + Math.random() * 0.2), // Slight variation in radius
                pileRadius * (0.7 + Math.random() * 0.2), // Narrower at bottom
                pileHeight,
                8 // Lower polygon count for performance
            );
            
            const leftPile = new THREE.Mesh(leftPileGeometry, pileMaterial);
            leftPile.position.set(-this.width/2, -pileHeight/2, zPos);
            this.object.add(leftPile);
            
            // Right pile
            const rightPileGeometry = new THREE.CylinderGeometry(
                pileRadius * (0.9 + Math.random() * 0.2),
                pileRadius * (0.7 + Math.random() * 0.2),
                pileHeight,
                8
            );
            
            const rightPile = new THREE.Mesh(rightPileGeometry, pileMaterial);
            rightPile.position.set(this.width/2, -pileHeight/2, zPos);
            this.object.add(rightPile);
            
            // Add some cross beams between piles for structural support
            if (i < this.pilesPerSide) {
                this.addCrossBeam(-this.width/2, -1, zPos, zPos + this.length/this.pilesPerSide);
                this.addCrossBeam(this.width/2, -1, zPos, zPos + this.length/this.pilesPerSide);
            }
        }
    }
    
    addCrossBeam(xPos, yPos, zStart, zEnd) {
        const beamWidth = 0.3;
        const beamHeight = 0.3;
        const beamLength = Math.abs(zEnd - zStart);
        
        const beamGeometry = new THREE.BoxGeometry(beamWidth, beamHeight, beamLength);
        const beamMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.4, 0.25, 0.1),
            roughness: 0.9,
            metalness: 0.1
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(xPos, yPos, (zStart + zEnd) / 2);
        this.object.add(beam);
    }
    
    createRailings() {
        // Only add railings on one side for a more interesting look
        const railingHeight = 1.2;
        const postSpacing = this.length / 10;
        const railingThickness = 0.12;
        
        const railingMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.5, 0.35, 0.2),
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Add posts
        for (let i = 0; i <= 10; i++) {
            const zPos = i * postSpacing - this.length/2;
            
            // Create post
            const postGeometry = new THREE.BoxGeometry(railingThickness, railingHeight, railingThickness);
            const post = new THREE.Mesh(postGeometry, railingMaterial);
            post.position.set(-this.width/2, railingHeight/2, zPos);
            this.object.add(post);
            
            // Add slight random rotation for weathered look
            if (this.weathering > 0.3) {
                post.rotation.x = (Math.random() - 0.5) * 0.1 * this.weathering;
                post.rotation.z = (Math.random() - 0.5) * 0.1 * this.weathering;
            }
        }
        
        // Add horizontal railings
        const topRailingGeometry = new THREE.BoxGeometry(railingThickness, railingThickness, this.length);
        const topRailing = new THREE.Mesh(topRailingGeometry, railingMaterial);
        topRailing.position.set(-this.width/2, railingHeight, 0);
        this.object.add(topRailing);
        
        const middleRailingGeometry = new THREE.BoxGeometry(railingThickness, railingThickness, this.length);
        const middleRailing = new THREE.Mesh(middleRailingGeometry, railingMaterial);
        middleRailing.position.set(-this.width/2, railingHeight * 0.6, 0);
        this.object.add(middleRailing);
    }
    
    addDetails() {
        // Add some random details like cleats, rope coils, etc.
        this.addCleats();
        this.addRopeCoils();
    }
    
    addCleats() {
        // Add a few cleats for tying boats
        const cleatMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.8
        });
        
        // Add cleats at regular intervals
        for (let i = 1; i < 4; i++) {
            const zPos = (i * (this.length / 4)) - this.length/2;
            
            // Create a simple cleat shape
            const cleatGroup = new THREE.Group();
            
            // Base
            const baseGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.8);
            const base = new THREE.Mesh(baseGeometry, cleatMaterial);
            cleatGroup.add(base);
            
            // Horns
            const hornGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8);
            
            const horn1 = new THREE.Mesh(hornGeometry, cleatMaterial);
            horn1.rotation.x = Math.PI / 2;
            horn1.position.set(0, 0.1, 0.25);
            cleatGroup.add(horn1);
            
            const horn2 = new THREE.Mesh(hornGeometry, cleatMaterial);
            horn2.rotation.x = Math.PI / 2;
            horn2.position.set(0, 0.1, -0.25);
            cleatGroup.add(horn2);
            
            // Position the cleat
            cleatGroup.position.set(this.width/2 - 0.5, 0.1, zPos);
            this.object.add(cleatGroup);
        }
    }
    
    addRopeCoils() {
        // Add a couple of rope coils
        const ropeColor = new THREE.Color(0.8, 0.7, 0.4);
        const ropeMaterial = new THREE.MeshStandardMaterial({
            color: ropeColor,
            roughness: 1.0,
            metalness: 0.0
        });
        
        // Create a coiled rope at the end of the dock
        const ropeRadius = 1;
        const tubeRadius = 0.1;
        const radialSegments = 8;
        const tubularSegments = 64;
        
        const ropeGeometry = new THREE.TorusGeometry(
            ropeRadius, tubeRadius, radialSegments, tubularSegments
        );
        
        const ropeCoil = new THREE.Mesh(ropeGeometry, ropeMaterial);
        ropeCoil.rotation.x = Math.PI / 2;
        ropeCoil.position.set(-this.width/2 + 2, 0.15, -this.length/2 + 2);
        this.object.add(ropeCoil);
    }
    
    generateProceduralWoodTexture() {
        // Create a simple procedural wood texture
        // In a real application, you'd use actual texture files
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill with base wood color
        context.fillStyle = '#8B5A2B';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add wood grain
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            context.strokeStyle = `rgba(60, 30, 15, ${Math.random() * 0.15})`;
            context.lineWidth = 1 + Math.random() * 10;
            context.beginPath();
            context.moveTo(x, 0);
            
            // Create wavy line for wood grain
            for (let y = 0; y < canvas.height; y += 10) {
                context.lineTo(x + Math.sin(y * 0.01) * 20, y);
            }
            
            context.stroke();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 4); // Repeat along the length
        
        return texture;
    }
    
    // Method to get the Three.js object
    getObject() {
        return this.object;
    }
}

export { Dock };