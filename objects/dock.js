import * as THREE from 'three';

class Dock {
    constructor(params = {}) {
        // Default parameters
        this.width = params.width || 3;
        this.length = params.length || 10;
        this.height = params.height || 1;
        this.position = params.position || new THREE.Vector3(0, 0, 0);
        this.rotation = params.rotation || 0;
        this.woodColor = params.woodColor || new THREE.Color(0.6, 0.4, 0.2);
        this.stoneColor = params.stoneColor || new THREE.Color(0.6, 0.6, 0.6); // Stone color
        this.lanternColor = params.lanternColor || new THREE.Color(0.9, 0.7, 0.3); // Warm lantern glow
        this.isHistorical = params.isHistorical !== undefined ? params.isHistorical : true; // 1700s style by default
        
        // Placement origin information
        this.placementOrigin = {
            // Set to true to use custom placement origin instead of center
            useCustomOrigin: true,
            // Offset from center (in local object space)
            offset: new THREE.Vector3(0, 0, this.length / 2)
        };
        
        // Create the dock object
        this.object = new THREE.Group();
        
        // Generate the dock components first
        this.createDock();
        
        // If using custom origin, adjust the object's position before applying rotation and position
        if (this.placementOrigin.useCustomOrigin) {
            // Shift the object so that the placement origin is at the position
            this.shiftObjectForCustomOrigin();
        }
        
        // Apply position and rotation after shifting for custom origin
        this.object.position.copy(this.position);
        this.object.rotation.y = this.rotation;
    }
    
    shiftObjectForCustomOrigin() {
        // Get the offset in local space
        const offset = this.placementOrigin.offset.clone();
        
        // For each child, shift its position by the offset
        this.object.children.forEach(child => {
            child.position.sub(offset);
        });
    }
    
    createDock() {
        if (this.isHistorical) {
            this.createHistoricalDock();
        } else {
            this.createModernDock();
        }
    }
    
    createModernDock() {
        // Create the main platform of the dock
        const deckMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create the deck (main platform)
        const deckGeometry = new THREE.BoxGeometry(this.width, this.height * 0.2, this.length);
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        deck.position.set(0, this.height * 0.1, 0);
        this.object.add(deck);
        
        // Create the support posts
        const postRadius = 0.15;
        const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, this.height, 8);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.8), // Darker wood for posts
            roughness: 0.9,
            metalness: 0.05
        });
        
        // Place posts along the dock
        const halfWidth = this.width / 2 - postRadius;
        const halfLength = this.length / 2;
        const postSpacing = 2; // Space between posts
        
        // Place posts along the sides
        for (let z = -halfLength + postRadius; z <= halfLength - postRadius; z += postSpacing) {
            // Left side post
            const leftPost = new THREE.Mesh(postGeometry, postMaterial);
            leftPost.position.set(-halfWidth, -this.height / 2, z);
            this.object.add(leftPost);
            
            // Right side post
            const rightPost = new THREE.Mesh(postGeometry, postMaterial);
            rightPost.position.set(halfWidth, -this.height / 2, z);
            this.object.add(rightPost);
        }
        
        // Add cross beams for support
        this.addCrossBeams();
        
        // Add railings if it's a wider dock
        if (this.width > 2.5) {
            this.addRailings();
        }
        
        // Add a small ladder at the end
        this.addLadder();
    }
    
    createHistoricalDock() {
        // 1700s style dock with stone and wood
        
        // Create stone base/foundation
        this.createStoneFoundation();
        
        // Create wooden deck with weathered planks
        this.createWoodenDeck();
        
        // Add thick wooden posts
        this.createHistoricalPosts();
        
        // Add decorative railings
        this.addHistoricalRailings();
        
        // Add lanterns along the sides
        this.addLanterns();
        
        // Add mooring posts for ships
        this.addMooringPosts();
        
        // Add a ladder at the end
        this.addHistoricalLadder();
    }
    
    createStoneFoundation() {
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: this.stoneColor,
            roughness: 1.0,
            metalness: 0.0,
            bumpScale: 0.05
        });
        
        // Main stone foundation
        const foundationGeometry = new THREE.BoxGeometry(this.width + 1, this.height * 0.8, this.length + 1);
        const foundation = new THREE.Mesh(foundationGeometry, stoneMaterial);
        foundation.position.set(0, -this.height * 0.6, 0);
        this.object.add(foundation);
        
        // Add some stone texture/variation
        const stoneDetailSize = 0.8;
        const stoneDetailHeight = 0.15;
        const stoneRows = Math.floor(this.length / stoneDetailSize);
        const stoneCols = Math.floor(this.width / stoneDetailSize);
        
        // Create stone details on the sides
        for (let row = 0; row < stoneRows; row++) {
            for (let col = 0; col < stoneCols; col++) {
                if (Math.random() > 0.7) { // Random stone protrusions
                    const stoneDetail = new THREE.Mesh(
                        new THREE.BoxGeometry(stoneDetailSize, stoneDetailHeight, stoneDetailSize),
                        stoneMaterial
                    );
                    
                    // Position on sides of foundation
                    const side = Math.floor(Math.random() * 4);
                    const z = -this.length/2 + row * stoneDetailSize + stoneDetailSize/2;
                    const x = -this.width/2 + col * stoneDetailSize + stoneDetailSize/2;
                    const y = -this.height * 0.6;
                    
                    if (side === 0) {
                        stoneDetail.position.set(x, y, -this.length/2 - stoneDetailSize/2);
                    } else if (side === 1) {
                        stoneDetail.position.set(x, y, this.length/2 + stoneDetailSize/2);
                    } else if (side === 2) {
                        stoneDetail.position.set(-this.width/2 - stoneDetailSize/2, y, z);
                    } else {
                        stoneDetail.position.set(this.width/2 + stoneDetailSize/2, y, z);
                    }
                    
                    this.object.add(stoneDetail);
                }
            }
        }
    }
    
    createWoodenDeck() {
        const plankWidth = 0.3;
        const plankHeight = 0.08;
        const plankGap = 0.02;
        const numPlanks = Math.floor(this.width / (plankWidth + plankGap));
        
        // Create planks along the length
        for (let i = 0; i < numPlanks; i++) {
            const plankColor = this.woodColor.clone().multiplyScalar(0.9 + Math.random() * 0.2);
            const plankMaterial = new THREE.MeshStandardMaterial({
                color: plankColor,
                roughness: 0.9,
                metalness: 0.0,
                bumpScale: 0.02
            });
            
            const plankGeometry = new THREE.BoxGeometry(plankWidth, plankHeight, this.length);
            const plank = new THREE.Mesh(plankGeometry, plankMaterial);
            
            const xPos = -this.width/2 + plankWidth/2 + i * (plankWidth + plankGap);
            plank.position.set(xPos, this.height * 0.1, 0);
            
            // Add some weathering/warping to planks
            if (Math.random() > 0.7) {
                const warpAmount = Math.random() * 0.05;
                plank.rotation.x = (Math.random() - 0.5) * warpAmount;
                plank.rotation.z = (Math.random() - 0.5) * warpAmount;
            }
            
            this.object.add(plank);
        }
    }
    
    createHistoricalPosts() {
        const postMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.7), // Darker wood for posts
            roughness: 0.9,
            metalness: 0.0
        });
        
        const postRadius = 0.25; // Thicker posts
        const postHeight = this.height * 1.5;
        const postSpacing = 3; // Wider spacing
        
        const halfWidth = this.width / 2 - postRadius;
        const halfLength = this.length / 2;
        
        // Place posts along the sides
        for (let z = -halfLength + postRadius; z <= halfLength - postRadius; z += postSpacing) {
            // Create post with decorative top
            const createDecorativePost = (x, z) => {
                const postGroup = new THREE.Group();
                
                // Main post
                const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius * 1.2, postHeight, 8);
                const post = new THREE.Mesh(postGeometry, postMaterial);
                post.position.y = postHeight/2 - this.height * 0.4;
                postGroup.add(post);
                
                // Decorative top
                const topGeometry = new THREE.SphereGeometry(postRadius * 1.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const top = new THREE.Mesh(topGeometry, postMaterial);
                top.position.y = postHeight - this.height * 0.4 + postRadius * 0.2;
                postGroup.add(top);
                
                postGroup.position.set(x, 0, z);
                return postGroup;
            };
            
            // Left side post
            const leftPost = createDecorativePost(-halfWidth, z);
            this.object.add(leftPost);
            
            // Right side post
            const rightPost = createDecorativePost(halfWidth, z);
            this.object.add(rightPost);
        }
    }
    
    addHistoricalRailings() {
        const railingMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.9),
            roughness: 0.8,
            metalness: 0.0
        });
        
        const halfWidth = this.width / 2;
        const halfLength = this.length / 2;
        const railHeight = 0.9;
        const postSpacing = 1.5;
        
        // Create horizontal rails - thicker for historical look
        const railGeometry = new THREE.BoxGeometry(this.length, 0.12, 0.12);
        railGeometry.rotateY(Math.PI / 2);
        
        // Left side top rail
        const leftTopRail = new THREE.Mesh(railGeometry, railingMaterial);
        leftTopRail.position.set(-halfWidth, this.height * 0.1 + railHeight, 0);
        this.object.add(leftTopRail);
        
        // Left side middle rail
        const leftMidRail = new THREE.Mesh(railGeometry, railingMaterial);
        leftMidRail.position.set(-halfWidth, this.height * 0.1 + railHeight * 0.6, 0);
        this.object.add(leftMidRail);
        
        // Right side top rail
        const rightTopRail = new THREE.Mesh(railGeometry, railingMaterial);
        rightTopRail.position.set(halfWidth, this.height * 0.1 + railHeight, 0);
        this.object.add(rightTopRail);
        
        // Right side middle rail
        const rightMidRail = new THREE.Mesh(railGeometry, railingMaterial);
        rightMidRail.position.set(halfWidth, this.height * 0.1 + railHeight * 0.6, 0);
        this.object.add(rightMidRail);
        
        // Add decorative vertical posts
        const postGeometry = new THREE.BoxGeometry(0.1, railHeight, 0.1);
        
        for (let z = -halfLength; z <= halfLength; z += postSpacing) {
            // Left side posts
            const leftPost = new THREE.Mesh(postGeometry, railingMaterial);
            leftPost.position.set(-halfWidth, this.height * 0.1 + railHeight / 2, z);
            this.object.add(leftPost);
            
            // Right side posts
            const rightPost = new THREE.Mesh(postGeometry, railingMaterial);
            rightPost.position.set(halfWidth, this.height * 0.1 + railHeight / 2, z);
            this.object.add(rightPost);
        }
    }
    
    addLanterns() {
        const lanternSpacing = 6; // Space between lanterns
        const lanternHeight = 1.8;
        const halfWidth = this.width / 2;
        const halfLength = this.length / 2;
        
        // Create lantern material with emissive properties
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.2, 0.2, 0.2),
            roughness: 0.5,
            metalness: 0.8
        });
        
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: this.lanternColor,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8,
            emissive: this.lanternColor,
            emissiveIntensity: 0.5
        });
        
        // Create lanterns along both sides
        for (let z = -halfLength + 3; z < halfLength; z += lanternSpacing) {
            // Create a lantern function
            const createLantern = (x, z) => {
                const lanternGroup = new THREE.Group();
                
                // Lantern post
                const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, lanternHeight, 6);
                const post = new THREE.Mesh(postGeometry, metalMaterial);
                post.position.y = lanternHeight/2;
                lanternGroup.add(post);
                
                // Lantern housing
                const housingGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.3);
                const housing = new THREE.Mesh(housingGeometry, metalMaterial);
                housing.position.y = lanternHeight - 0.2;
                lanternGroup.add(housing);
                
                // Lantern glass
                const glassGeometry = new THREE.BoxGeometry(0.25, 0.35, 0.25);
                const glass = new THREE.Mesh(glassGeometry, glassMaterial);
                glass.position.y = lanternHeight - 0.2;
                lanternGroup.add(glass);
                
                // Lantern top
                const topGeometry = new THREE.ConeGeometry(0.2, 0.15, 4);
                const top = new THREE.Mesh(topGeometry, metalMaterial);
                top.position.y = lanternHeight + 0.05;
                lanternGroup.add(top);
                
                // Add light source
                const light = new THREE.PointLight(this.lanternColor, 0.8, 3);
                light.position.y = lanternHeight - 0.2;
                lanternGroup.add(light);
                
                lanternGroup.position.set(x, this.height * 0.1, z);
                return lanternGroup;
            };
            
            // Left side lantern
            const leftLantern = createLantern(-halfWidth, z);
            this.object.add(leftLantern);
            
            // Right side lantern
            const rightLantern = createLantern(halfWidth, z);
            this.object.add(rightLantern);
        }
    }
    
    addMooringPosts() {
        const mooringMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.6), // Dark aged wood
            roughness: 1.0,
            metalness: 0.0
        });
        
        // Add large mooring posts at corners and midpoints
        const mooringPositions = [
            [-this.width/2, 0, -this.length/2 + 1],
            [this.width/2, 0, -this.length/2 + 1],
            [-this.width/2, 0, this.length/2 - 1],
            [this.width/2, 0, this.length/2 - 1],
            [-this.width/2, 0, 0],
            [this.width/2, 0, 0]
        ];
        
        mooringPositions.forEach(pos => {
            // Create thick mooring post
            const postGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8);
            const post = new THREE.Mesh(postGeometry, mooringMaterial);
            post.position.set(pos[0], this.height * 0.1 + 0.6, pos[2]);
            this.object.add(post);
            
            // Add rope detail
            const ropeGeometry = new THREE.TorusGeometry(0.45, 0.05, 8, 16);
            const ropeMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.8, 0.7, 0.5),
                roughness: 1.0,
                metalness: 0.0
            });
            
            const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
            rope.rotation.x = Math.PI / 2;
            rope.position.set(pos[0], this.height * 0.1 + 0.9, pos[2]);
            this.object.add(rope);
        });
    }
    
    addHistoricalLadder() {
        const ladderMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.7),
            roughness: 0.9,
            metalness: 0.0
        });
        
        const ladderWidth = 1.2;
        const ladderHeight = this.height * 2;
        const rungSpacing = 0.35;
        const rungRadius = 0.05;
        const sideWidth = 0.08;
        
        // Create ladder group
        const ladder = new THREE.Group();
        
        // Create ladder sides - using rectangular beams instead of cylinders
        const sideGeometry = new THREE.BoxGeometry(sideWidth, ladderHeight, sideWidth);
        
        const leftSide = new THREE.Mesh(sideGeometry, ladderMaterial);
        leftSide.position.set(-ladderWidth / 2, -ladderHeight / 2, 0);
        ladder.add(leftSide);
        
        const rightSide = new THREE.Mesh(sideGeometry, ladderMaterial);
        rightSide.position.set(ladderWidth / 2, -ladderHeight / 2, 0);
        ladder.add(rightSide);
        
        // Create ladder rungs - thicker for historical look
        const rungGeometry = new THREE.CylinderGeometry(rungRadius, rungRadius, ladderWidth + 0.1, 6);
        rungGeometry.rotateZ(Math.PI / 2);
        
        for (let y = -ladderHeight / 2 + rungSpacing; y < 0; y += rungSpacing) {
            const rung = new THREE.Mesh(rungGeometry, ladderMaterial);
            rung.position.set(0, y, 0);
            ladder.add(rung);
        }
        
        // Position the ladder at the end of the dock
        ladder.position.set(0, this.height * 0.1, this.length / 2 + 0.1);
        this.object.add(ladder);
    }
    
    addCrossBeams() {
        const beamMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.9), // Slightly darker
            roughness: 0.8,
            metalness: 0.1
        });
        
        const halfWidth = this.width / 2;
        const halfLength = this.length / 2;
        const beamSpacing = 2; // Space between beams
        const beamHeight = 0.1;
        const beamWidth = 0.1;
        
        // Add cross beams along the length
        for (let z = -halfLength + 0.5; z <= halfLength - 0.5; z += beamSpacing) {
            const beamGeometry = new THREE.BoxGeometry(this.width, beamHeight, beamWidth);
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.set(0, -this.height * 0.3, z);
        this.object.add(beam);
        }
    }
    
    addRailings() {
        const railingMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(1.1), // Slightly lighter
            roughness: 0.7,
            metalness: 0.1
        });
        
        const halfWidth = this.width / 2;
        const halfLength = this.length / 2;
        const postSpacing = 1.5; // Space between railing posts
        const railingHeight = 0.8;
        const postRadius = 0.05;
        
        // Create horizontal rails
        const railGeometry = new THREE.CylinderGeometry(0.03, 0.03, this.length, 8);
        railGeometry.rotateX(Math.PI / 2);
        
        // Left side rail
        const leftRail = new THREE.Mesh(railGeometry, railingMaterial);
        leftRail.position.set(-halfWidth, this.height * 0.1 + railingHeight, 0);
        this.object.add(leftRail);
        
        // Right side rail
        const rightRail = new THREE.Mesh(railGeometry, railingMaterial);
        rightRail.position.set(halfWidth, this.height * 0.1 + railingHeight, 0);
        this.object.add(rightRail);
        
        // Add vertical posts
        const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, railingHeight, 6);
        
        for (let z = -halfLength; z <= halfLength; z += postSpacing) {
            // Left side posts
            const leftPost = new THREE.Mesh(postGeometry, railingMaterial);
            leftPost.position.set(-halfWidth, this.height * 0.1 + railingHeight / 2, z);
            this.object.add(leftPost);
            
            // Right side posts
            const rightPost = new THREE.Mesh(postGeometry, railingMaterial);
            rightPost.position.set(halfWidth, this.height * 0.1 + railingHeight / 2, z);
            this.object.add(rightPost);
        }
    }
    
    addLadder() {
        const ladderMaterial = new THREE.MeshStandardMaterial({
            color: this.woodColor.clone().multiplyScalar(0.85), // Darker wood
            roughness: 0.9,
            metalness: 0.05
        });
        
        const ladderWidth = 0.8;
        const ladderHeight = this.height * 1.2;
        const rungSpacing = 0.3;
        const rungRadius = 0.03;
        const sideRadius = 0.04;
        
        // Create ladder group
        const ladder = new THREE.Group();
        
        // Create ladder sides
        const sideGeometry = new THREE.CylinderGeometry(sideRadius, sideRadius, ladderHeight, 6);
        
        const leftSide = new THREE.Mesh(sideGeometry, ladderMaterial);
        leftSide.position.set(-ladderWidth / 2, -ladderHeight / 2, 0);
        ladder.add(leftSide);
        
        const rightSide = new THREE.Mesh(sideGeometry, ladderMaterial);
        rightSide.position.set(ladderWidth / 2, -ladderHeight / 2, 0);
        ladder.add(rightSide);
        
        // Create ladder rungs
        const rungGeometry = new THREE.CylinderGeometry(rungRadius, rungRadius, ladderWidth, 6);
        rungGeometry.rotateZ(Math.PI / 2);
        
        for (let y = -ladderHeight / 2 + rungSpacing; y < 0; y += rungSpacing) {
            const rung = new THREE.Mesh(rungGeometry, ladderMaterial);
            rung.position.set(0, y, 0);
            ladder.add(rung);
        }
        
        // Position the ladder at the end of the dock
        ladder.position.set(0, this.height * 0.1, this.length / 2 + 0.1);
        this.object.add(ladder);
    }
    
    getObject() {
        return this.object;
    }
    
    // Method to get placement origin information
    getPlacementOrigin() {
        return this.placementOrigin;
    }
}

export default Dock;