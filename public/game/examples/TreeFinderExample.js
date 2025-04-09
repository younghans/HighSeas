import * as THREE from 'three';
import TreeFinder from './TreeFinder.js';

/**
 * Example script showing how to use TreeFinder to locate tree objects on an island
 */

// Create a scene and renderer for demo purposes
function setupScene() {
    const scene = new THREE.Scene();
    
    // Add some basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    return scene;
}

// Main function to find trees on Tree Haven island
async function findTreesOnIsland() {
    console.log('Starting Tree Haven analysis...');
    
    // Setup a scene
    const scene = setupScene();
    
    // Initialize the tree finder with our scene
    const treeFinder = new TreeFinder({ scene });
    
    try {
        // Load the island data
        await treeFinder.initialize('/game/islands/customIslands/tree-island.json');
        
        // Find all objects with "tree" in their type
        const treeObjects = treeFinder.findTreesOnIsland('Tree Haven');
        
        console.log(`Found ${treeObjects.length} tree objects on Tree Haven island`);
        
        // Display tree types and counts
        const stats = treeFinder.getTreeStatistics('Tree Haven');
        console.log('Tree statistics:');
        console.log(`Total trees: ${stats.totalTrees}`);
        console.log('Tree types:');
        
        // Format and display each tree type count
        Object.entries(stats.treeTypes).forEach(([type, count]) => {
            console.log(`- ${type}: ${count}`);
        });
        
        // Filter for specific tree types
        const largeTreesOnly = treeObjects.filter(obj => obj.type.includes('Large'));
        console.log(`Found ${largeTreesOnly.length} large trees`);
        
        const smallTreesOnly = treeObjects.filter(obj => obj.type.includes('Small'));
        console.log(`Found ${smallTreesOnly.length} small trees`);
        
        // Example of using the highlight function (in a real app)
        // treeFinder.highlightTrees('Tree Haven', 'firTreeLarge');
        
        return {
            treeObjects,
            treeStats: stats,
            largeTreesOnly,
            smallTreesOnly
        };
        
    } catch (error) {
        console.error('Error analyzing Tree Haven island:', error);
        return null;
    }
}

// Run the example
if (typeof window !== 'undefined') {
    // Set a flag to prevent the main TreeFinder example from running
    window.isTestingTreeFinder = true;
    
    // Run our example
    findTreesOnIsland().then(result => {
        if (result) {
            console.log('Analysis complete!');
            // Make results available in global scope for console inspection
            window.treeResults = result;
            console.log('Results stored in window.treeResults for inspection');
        }
    });
}

export { findTreesOnIsland }; 