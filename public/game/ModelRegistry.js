/**
 * Registry of all available models
 * This makes it easy to add new models without modifying other code
 */
export const MODELS = {
    // Original models
    marketStall: {
        id: 'marketStall',
        name: 'Market Stall',
        // This is a custom model, not a GLB
        isCustom: true
    },
    dock: {
        id: 'dock',
        name: 'Dock',
        // This is a custom model, not a GLB
        isCustom: true
    },
    tradingHouse: {
        id: 'tradingHouse',
        name: 'Trading House',
        path: './assets/models/trading-house.glb',
        scale: [1, 1, 1]
    },
    
    // Buildings
    pirateHouse: {
        id: 'pirateHouse',
        name: 'Pirate House',
        path: './assets/models/pirate-house.glb',
        scale: [1, 1, 1]
    },
    lighthouse: {
        id: 'lighthouse',
        name: 'Lighthouse',
        path: './assets/models/lighthouse.glb',
        scale: [1, 1, 1]
    },
    shipBuildingShop: {
        id: 'shipBuildingShop',
        name: 'Ship Building Shop',
        path: './assets/models/ship-building-shop.glb',
        scale: [1, 1, 1]
    },
    
    // Market Stalls
    marketStall2: {
        id: 'marketStall2',
        name: 'Market Stall 2',
        path: './assets/models/market-stall-2.glb',
        scale: [1, 1, 1]
    },
    
    // Trees
    firTreeLarge: {
        id: 'firTreeLarge',
        name: 'Fir Tree (Large)',
        path: './assets/models/fir-tree-large.glb',
        scale: [1, 1, 1]
    },
    firTreeMedium: {
        id: 'firTreeMedium',
        name: 'Fir Tree (Medium)',
        path: './assets/models/fir-tree-medium.glb',
        scale: [1, 1, 1]
    },
    firTreeSmall: {
        id: 'firTreeSmall',
        name: 'Fir Tree (Small)',
        path: './assets/models/fir-tree-small.glb',
        scale: [1, 1, 1]
    },
    palmTreeBent: {
        id: 'palmTreeBent',
        name: 'Palm Tree (Bent)',
        path: './assets/models/palm-tree-bent.glb',
        scale: [1, 1, 1]
    },
    palmTreeLarge: {
        id: 'palmTreeLarge',
        name: 'Palm Tree (Large)',
        path: './assets/models/palm-tree-large.glb',
        scale: [1, 1, 1]
    },

    // Rocks and Stones
    stoneLarge2: {
        id: 'stoneLarge2',
        name: 'Large Stone 2',
        path: './assets/models/stone-large-2.glb',
        scale: [1, 1, 1]
    },
    stoneLarge3: {
        id: 'stoneLarge3',
        name: 'Large Stone 3',
        path: './assets/models/stone-large-3.glb',
        scale: [1, 1, 1]
    },
    stoneLarge4: {
        id: 'stoneLarge4',
        name: 'Large Stone 4',
        path: './assets/models/stone-large-4.glb',
        scale: [1, 1, 1]
    },
    stoneLarge5: {
        id: 'stoneLarge5',
        name: 'Large Stone 5',
        path: './assets/models/stone-large-5.glb',
        scale: [1, 1, 1]
    },

    // Props
    box2: {
        id: 'box2',
        name: 'Box 2',
        path: './assets/models/box-2.glb',
        scale: [1, 1, 1]
    },
    storagehut: {
        id: 'storagehut',
        name: 'Storage Hut',
        path: './assets/models/storage-hut.glb',
        scale: [5, 5, 5]
    },
    storageshed: {
        id: 'storageshed',
        name: 'Storage Shed',
        path: './assets/models/storage-shed.glb',
        scale: [1, 1, 1]
    },
    storagehouse: {
        id: 'storagehouse',
        name: 'Storage House',
        path: './assets/models/storage-house.glb',
        scale: [6, 6, 6]
    },
    blacksmith: {
        id: 'blacksmith',
        name: 'Blacksmith',
        path: './assets/models/blacksmith.glb',
        scale: [1, 1, 1]
    },
};

/**
 * Get the display name for a model by its ID
 * @param {string} modelId - The model ID
 * @returns {string} - The display name, or the ID if not found
 */
export function getModelDisplayName(modelId) {
    if (MODELS[modelId]) {
        return MODELS[modelId].name;
    }
    return modelId; // Fallback to just returning the ID
} 