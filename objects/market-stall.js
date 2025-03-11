import * as THREE from 'three';

class MarketStall {
    constructor(params = {}) {
        // Default parameters
        this.width = params.width || 4;
        this.depth = params.depth || 3;
        this.height = params.height || 3;
        this.roofHeight = params.roofHeight || 1.5;
        this.counterHeight = params.counterHeight || 1;
        this.hasAwning = params.hasAwning !== undefined ? params.hasAwning : true;
        this.awningColor = params.awningColor || new THREE.Color(0.9, 0.3, 0.3);
        this.woodColor = params.woodColor || new THREE.Color(0.6, 0.4, 0.2);
        this.position = params.position || new THREE.Vector3(0, 0, 0);
        this.rotation = params.rotation || 0;
        this.detailLevel = params.detailLevel || 1; // 0-1 scale for detail amount
        
        // Create the market stall object
        this.object = new THREE.Group();
        this.object.position.copy(this.position);
        this.object.rotation.y = this.rotation;
        
        // Generate the stall components
        this.createStructure();
        this.createCounter();
        this.createRoof();
        if (this.hasAwning) {
            this.createAwning();
        }
        
        // Add details based on detail level
        if (this.detailLevel > 0.3) {
            this.addStructuralDetails();
        }
        if (this.detailLevel > 0.6) {
            this.addDecorations();
        }
    }
    
    createStructure() {
        // Create the main frame of the stall
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create the four corner posts
        const postRadius = 0.08;
        const postHeight = this.height;
        const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8);
        
        // Position offsets for the four corners
        const halfWidth = this.width / 2;
        const halfDepth = this.depth / 2;
        const corners = [
            [-halfWidth, 0, -halfDepth],
            [halfWidth, 0, -halfDepth],
            [halfWidth, 0, halfDepth],
            [-halfWidth, 0, halfDepth]
        ];
        
        // Create and position the posts
        corners.forEach(corner => {
            const post = new THREE.Mesh(postGeometry, frameMaterial);
            post.position.set(corner[0], postHeight / 2, corner[2]);
            this.object.add(post);
        });
        
        // Add horizontal beams connecting the posts at the top
        this.addBeam(-halfWidth, halfWidth, this.height - 0.1, -halfDepth, -halfDepth);
        this.addBeam(-halfWidth, halfWidth, this.height - 0.1, halfDepth, halfDepth);
        this.addBeam(-halfWidth, -halfWidth, this.height - 0.1, -halfDepth, halfDepth);
        this.addBeam(halfWidth, halfWidth, this.height - 0.1, -halfDepth, halfDepth);
        
        // Add back wall (simple wooden planks)
        if (this.detailLevel > 0.2) {
            this.createBackWall(-halfWidth, halfWidth, -halfDepth);
        }
    }
    
    addBeam(x1, x2, y, z1, z2) {
        const beamMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
        const beamGeometry = new THREE.BoxGeometry(length, 0.1, 0.1);
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        
        // Position at midpoint
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        beam.position.set(midX, y, midZ);
        
        // Rotate to point in the right direction
        if (z1 === z2) {
            // Beam runs along x-axis
            // No rotation needed
        } else if (x1 === x2) {
            // Beam runs along z-axis
            beam.rotation.y = Math.PI / 2;
        } else {
            // Diagonal beam (not used in current design but included for flexibility)
            const angle = Math.atan2(z2 - z1, x2 - x1);
            beam.rotation.y = angle;
        }
        
        this.object.add(beam);
    }
    
    createBackWall(leftX, rightX, backZ) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.9), // Slightly darker
            roughness: 0.9,
            metalness: 0.05
        });
        
        const plankWidth = 0.5;
        const plankHeight = this.height - this.counterHeight;
        const plankThickness = 0.05;
        const plankGap = 0.02;
        
        const numPlanks = Math.ceil(this.width / (plankWidth + plankGap));
        const actualPlankWidth = (this.width - (plankGap * (numPlanks - 1))) / numPlanks;
        
        for (let i = 0; i < numPlanks; i++) {
            const plankGeometry = new THREE.BoxGeometry(actualPlankWidth, plankHeight, plankThickness);
            const plank = new THREE.Mesh(plankGeometry, wallMaterial);
            
            const xPos = leftX + (i * (actualPlankWidth + plankGap)) + (actualPlankWidth / 2);
            plank.position.set(xPos, this.counterHeight + (plankHeight / 2), backZ);
            
            // Add some variation for realism
            if (this.detailLevel > 0.5) {
                plank.rotation.z = (Math.random() - 0.5) * 0.03;
                plank.rotation.x = (Math.random() - 0.5) * 0.01;
            }
            
            this.object.add(plank);
        }
    }
    
    createCounter() {
        const counterMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(1.1), // Slightly lighter
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Counter top
        const counterGeometry = new THREE.BoxGeometry(this.width, 0.1, this.depth);
        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.set(0, this.counterHeight, 0);
        this.object.add(counter);
        
        // Counter front
        const frontGeometry = new THREE.BoxGeometry(this.width, this.counterHeight, 0.1);
        const front = new THREE.Mesh(frontGeometry, counterMaterial);
        front.position.set(0, this.counterHeight / 2, this.depth / 2);
        this.object.add(front);
        
        // Counter sides
        const sideGeometry = new THREE.BoxGeometry(0.1, this.counterHeight, this.depth);
        
        const leftSide = new THREE.Mesh(sideGeometry, counterMaterial);
        leftSide.position.set(-this.width / 2, this.counterHeight / 2, 0);
        this.object.add(leftSide);
        
        const rightSide = new THREE.Mesh(sideGeometry, counterMaterial);
        rightSide.position.set(this.width / 2, this.counterHeight / 2, 0);
        this.object.add(rightSide);
        
        // Add some items on the counter if detail level is high
        if (this.detailLevel > 0.7) {
            this.addCounterItems();
        }
    }
    
    createRoof() {
        // Create a simple peaked roof
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.8), // Darker wood for roof
            roughness: 0.9,
            metalness: 0.05
        });
        
        // Create roof shape
        const roofWidth = this.width * 1.2; // Slightly wider than the stall
        const roofDepth = this.depth * 1.2;
        
        // Create the two sloped sides of the roof
        const roofGeometry = new THREE.BufferGeometry();
        
        // Define the vertices for a simple peaked roof
        const halfWidth = roofWidth / 2;
        const halfDepth = roofDepth / 2;
        const peakHeight = this.height + this.roofHeight;
        const eaveHeight = this.height;
        
        const vertices = new Float32Array([
            // Front face (triangular)
            -halfWidth, eaveHeight, halfDepth,
            halfWidth, eaveHeight, halfDepth,
            0, peakHeight, 0,
            
            // Back face (triangular)
            halfWidth, eaveHeight, -halfDepth,
            -halfWidth, eaveHeight, -halfDepth,
            0, peakHeight, 0,
            
            // Left slope
            -halfWidth, eaveHeight, -halfDepth,
            -halfWidth, eaveHeight, halfDepth,
            0, peakHeight, 0,
            
            // Right slope
            halfWidth, eaveHeight, halfDepth,
            halfWidth, eaveHeight, -halfDepth,
            0, peakHeight, 0
        ]);
        
        // Define normals (simplified)
        const normals = new Float32Array([
            // Front face
            0, 0, 1,
            0, 0, 1,
            0, 1, 0,
            
            // Back face
            0, 0, -1,
            0, 0, -1,
            0, 1, 0,
            
            // Left slope
            -1, 0.5, 0,
            -1, 0.5, 0,
            -1, 0.5, 0,
            
            // Right slope
            1, 0.5, 0,
            1, 0.5, 0,
            1, 0.5, 0
        ]);
        
        // Define UVs (simplified)
        const uvs = new Float32Array([
            // Front face
            0, 0,
            1, 0,
            0.5, 1,
            
            // Back face
            0, 0,
            1, 0,
            0.5, 1,
            
            // Left slope
            0, 0,
            1, 0,
            0.5, 1,
            
            // Right slope
            0, 0,
            1, 0,
            0.5, 1
        ]);
        
        roofGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        roofGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        roofGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        this.object.add(roof);
    }
    
    createAwning() {
        const awningMaterial = new THREE.MeshStandardMaterial({
            color: this.awningColor,
            roughness: 0.7,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        // Create a simple awning (rectangular plane)
        const awningWidth = this.width * 1.1;
        const awningDepth = this.depth * 0.4;
        const awningGeometry = new THREE.PlaneGeometry(awningWidth, awningDepth);
        const awning = new THREE.Mesh(awningGeometry, awningMaterial);
        
        // Position the awning at the front of the stall
        awning.position.set(0, this.height - 0.2, this.depth / 2 + awningDepth / 2);
        awning.rotation.x = Math.PI / 4; // Angle the awning downward
        
        this.object.add(awning);
        
        // Add stripes to the awning if detail level is high enough
        if (this.detailLevel > 0.4) {
            this.addAwningStripes(awning);
        }
    }
    
    addAwningStripes(awning) {
        const stripeCount = 5;
        const stripeWidth = 0.1;
        const stripeColor = new THREE.Color(1, 1, 1); // White stripes
        
        const stripeMaterial = new THREE.MeshBasicMaterial({
            color: stripeColor,
            side: THREE.DoubleSide
        });
        
        const awningWidth = this.width * 1.1;
        const awningDepth = this.depth * 0.4;
        
        for (let i = 0; i < stripeCount; i++) {
            const stripeGeometry = new THREE.PlaneGeometry(awningWidth, stripeWidth);
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            
            // Position stripes evenly along the awning
            const yOffset = (i / (stripeCount - 1) - 0.5) * awningDepth;
            stripe.position.set(0, yOffset, 0.01); // Slight z-offset to prevent z-fighting
            
            awning.add(stripe);
        }
    }
    
    addStructuralDetails() {
        // Add diagonal braces for stability
        const halfWidth = this.width / 2;
        const halfDepth = this.depth / 2;
        
        // Add diagonal braces at the back corners
        this.addDiagonalBrace(-halfWidth, 0, -halfDepth, -halfWidth, this.height - 0.2, -halfDepth);
        this.addDiagonalBrace(halfWidth, 0, -halfDepth, halfWidth, this.height - 0.2, -halfDepth);
        
        // Add diagonal braces at the front corners if no awning
        if (!this.hasAwning) {
            this.addDiagonalBrace(-halfWidth, 0, halfDepth, -halfWidth, this.height - 0.2, halfDepth);
            this.addDiagonalBrace(halfWidth, 0, halfDepth, halfWidth, this.height - 0.2, halfDepth);
        }
    }
    
    addDiagonalBrace(x1, y1, z1, x2, y2, z2) {
        const braceMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.85), // Slightly darker
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Calculate length of the brace
        const length = Math.sqrt(
            Math.pow(x2 - x1, 2) + 
            Math.pow(y2 - y1, 2) + 
            Math.pow(z2 - z1, 2)
        );
        
        const braceGeometry = new THREE.CylinderGeometry(0.03, 0.03, length, 6);
        const brace = new THREE.Mesh(braceGeometry, braceMaterial);
        
        // Position at midpoint
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const midZ = (z1 + z2) / 2;
        brace.position.set(midX, midY, midZ);
        
        // Rotate to point in the right direction
        brace.lookAt(new THREE.Vector3(x2, y2, z2));
        brace.rotateX(Math.PI / 2);
        
        this.object.add(brace);
    }
    
    addDecorations() {
        // Add a sign to the stall
        this.addSign();
        
        // Add counter items
        this.addCounterItems();
    }
    
    addSign() {
        const signMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.8, 0.7, 0.5), // Light wood color
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Create sign board
        const signWidth = this.width * 0.7;
        const signHeight = 0.6;
        const signGeometry = new THREE.BoxGeometry(signWidth, signHeight, 0.05);
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        
        // Position sign at the front top of the stall
        sign.position.set(0, this.height + 0.4, this.depth / 2 - 0.1);
        
        // Add sign text if detail level is very high
        if (this.detailLevel > 0.8) {
            // Create a canvas for the sign text
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 128;
            
            // Fill with wood color
            context.fillStyle = '#c0a080';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add text
            context.font = 'bold 40px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = '#402010';
            context.fillText('MARKET', canvas.width / 2, canvas.height / 2);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            sign.material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.1
            });
        }
        
        this.object.add(sign);
        
        // Add sign supports
        const supportMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const supportGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
        
        // Left support
        const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
        leftSupport.position.set(-signWidth / 3, this.height + 0.05, this.depth / 2 - 0.1);
        leftSupport.rotation.x = Math.PI / 2;
        this.object.add(leftSupport);
        
        // Right support
        const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
        rightSupport.position.set(signWidth / 3, this.height + 0.05, this.depth / 2 - 0.1);
        rightSupport.rotation.x = Math.PI / 2;
        this.object.add(rightSupport);
    }
    
    addCounterItems() {
        // Add a few items on the counter
        this.addCrate(0.5, 0.4, 0.5, -this.width / 3, this.counterHeight + 0.2, 0, new THREE.Color(0.5, 0.35, 0.2));
        this.addBasket(0.3, 0.2, this.width / 4, this.counterHeight + 0.1, 0);
    }
    
    addCrate(width, height, depth, x, y, z, color) {
        const crateMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const crateGeometry = new THREE.BoxGeometry(width, height, depth);
        const crate = new THREE.Mesh(crateGeometry, crateMaterial);
        crate.position.set(x, y, z);
        
        // Add slight rotation for realism
        crate.rotation.y = Math.random() * 0.2;
        
        this.object.add(crate);
    }
    
    addBasket(radius, height, x, y, z) {
        const basketMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.8, 0.6, 0.2), // Basket color
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Create a simple basket (cylinder with no top)
        const basketGeometry = new THREE.CylinderGeometry(radius, radius * 0.8, height, 12, 1, true);
        const basket = new THREE.Mesh(basketGeometry, basketMaterial);
        basket.position.set(x, y, z);
        
        this.object.add(basket);
        
        // Add contents to the basket
        this.addBasketContents(x, y, z, radius);
    }
    
    addBasketContents(x, y, z, radius) {
        // Create a hemisphere for the basket contents
        const contentsGeometry = new THREE.SphereGeometry(radius * 0.9, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        
        // Random content color (fruits or vegetables)
        const contentColors = [
            new THREE.Color(1, 0.2, 0.2),    // Red (apples)
            new THREE.Color(1, 0.8, 0.2),    // Yellow (lemons)
            new THREE.Color(0.2, 0.8, 0.2),  // Green (apples)
            new THREE.Color(0.8, 0.4, 0.1)   // Orange (oranges)
        ];
        
        const contentsMaterial = new THREE.MeshStandardMaterial({
            color: contentColors[Math.floor(Math.random() * contentColors.length)],
            roughness: 0.8,
            metalness: 0.1
        });
        
        const contents = new THREE.Mesh(contentsGeometry, contentsMaterial);
        contents.position.set(x, y, z);
        
        this.object.add(contents);
    }
    
    getObject() {
        return this.object;
    }
}

export default MarketStall;