# Procedural World Generation System

This system provides comprehensive procedural generation of ocean worlds filled with naturally distributed islands.

## Features

### 🌊 Core Components

- **ProceduralWorldGenerator**: Main class that orchestrates world generation
- **PoissonDiskSampling**: Creates natural island distribution using Poisson disk sampling
- **SeededRandom**: Deterministic random number generation for consistent worlds
- **IslandTemplate**: Extensible template system for different island types and biomes
- **WorldGeneratorUI**: User interface for configuring and testing world generation

### 🏝️ Island Types & Biomes

- **Forest Islands** (30% spawn rate): Dense with trees, abundant wood resources
- **Rocky Islands** (25% spawn rate): Mountainous terrain rich in stone and minerals  
- **Tropical Islands** (20% spawn rate): Paradise islands with palm trees and beaches
- **Desert Islands** (15% spawn rate): Arid islands with sparse vegetation
- **Volcanic Islands** (10% spawn rate): Rare islands with unique terrain and rare minerals

### ⚙️ Configurable Parameters

- **World Size**: From 10km x 10km to 80km x 80km
- **Island Density**: Control how many islands spawn (10% to 80% density)
- **Island Spacing**: Minimum and maximum distances between islands
- **World Seed**: Deterministic generation for consistent worlds

## Usage

### Basic Integration

```javascript
import ProceduralWorldGenerator from './world/ProceduralWorldGenerator.js';
import WorldGeneratorUI from './world/WorldGeneratorUI.js';

// Initialize the generator
const worldGenerator = new ProceduralWorldGenerator({
    scene: threeJSScene,
    worldSeed: 12345,
    worldWidth: 20000,
    worldHeight: 20000,
    islandDensity: 0.3,
    minIslandDistance: 800,
    maxIslandDistance: 1500
});

// Generate the world
const result = await worldGenerator.generateWorld();
console.log(`Generated ${result.islands.length} islands`);

// Create UI for configuration
const ui = new WorldGeneratorUI(worldGenerator);
const uiElement = ui.createUI();
document.body.appendChild(uiElement);
```

### Adding New Island Types

```javascript
// Get the island template system
const islandTemplate = worldGenerator.islandTemplate;

// Add a new ice island template
islandTemplate.addTemplate('ice', {
    name: 'Ice Island',
    description: 'Frozen tundra island with unique ice formations',
    weight: 8, // 8% spawn probability
    sizeRange: { min: 200, max: 400 },
    parameters: {
        noiseScale: { min: 0.005, max: 0.009 },
        noiseHeight: { min: 50, max: 80 },
        falloffCurve: { min: 2.0, max: 4.0 },
        enableVertexCulling: true,
        waterLevel: 0
    },
    objectConfig: {
        density: { min: 0.1, max: 0.2 },
        distribution: {
            stoneLarge3: 60,
            stoneLarge4: 40
        }
    },
    biome: {
        primaryColor: 0xE0FFFF, // Light cyan
        secondaryColor: 0xF0F8FF, // Alice blue
        climate: 'arctic'
    }
});
```

### Creative Standalone Integration

The system is integrated into the Creative Standalone mode with a toggle button:

1. **Single Island Mode**: Traditional single island editing with full parameter control
2. **Procedural World Mode**: Generate entire ocean worlds with multiple islands

Switch between modes using the "🌊 Switch to Procedural World Mode" button in the UI.

## World Generation Process

1. **Island Layout Generation**: Uses Poisson disk sampling for natural distribution
2. **Template Assignment**: Assigns island types based on position and randomness
3. **Parameter Generation**: Creates unique parameters for each island within template constraints
4. **3D Mesh Creation**: Generates actual terrain meshes with biome-specific coloring
5. **Metadata Tracking**: Stores comprehensive world statistics and biome distribution

## Future Extensibility

### Easy to Add:

- **New Biomes**: Simply add new templates with `addTemplate()`
- **Resource Systems**: Islands track resource node counts and regeneration
- **Mission Data**: Template structure supports mission and discovery data
- **Climate Effects**: Biome system supports weather and environmental effects
- **Chunk Loading**: Architecture supports level-of-detail and streaming

### Planned Features:

- **Island Persistence**: Save/load individual island modifications
- **Resource Economics**: Inter-island trading and supply/demand
- **Dynamic Weather**: Biome-specific weather patterns
- **Ocean Currents**: Affect ship movement between islands
- **Seasonal Changes**: Islands change appearance over time

## Performance

- **Chunk-based Loading**: Only generates islands within view distance
- **Memory Management**: Unloads distant islands while preserving data
- **Configurable LOD**: Adjust detail levels for performance
- **Efficient Algorithms**: Poisson disk sampling ensures O(n) complexity

## API Reference

### ProceduralWorldGenerator Methods

- `generateWorld()`: Generate complete world
- `updateWorldConfig(config)`: Update parameters
- `clearGeneratedWorld()`: Clean up generated content
- `getWorldConfig()`: Get current configuration

### IslandTemplate Methods

- `addTemplate(id, template)`: Add new island type
- `selectRandomTemplate(random, excludeTypes)`: Select template by weight
- `generateParameters(template, random)`: Generate island parameters

### WorldGeneratorUI Methods

- `createUI()`: Create configuration interface
- `generateWorld()`: Trigger world generation with progress
- `clearWorld()`: Clear generated world
- `updateWorldStats(metadata)`: Update statistics display

## Example Worlds

### Small Dense World
```javascript
const config = {
    worldWidth: 10000,
    worldHeight: 10000,
    islandDensity: 0.6,
    minIslandDistance: 500,
    maxIslandDistance: 800
};
```

### Large Sparse Ocean
```javascript
const config = {
    worldWidth: 80000,
    worldHeight: 80000,
    islandDensity: 0.15,
    minIslandDistance: 2000,
    maxIslandDistance: 4000
};
```

### Archipelago Style
```javascript
const config = {
    worldWidth: 40000,
    worldHeight: 40000,
    islandDensity: 0.4,
    minIslandDistance: 600,
    maxIslandDistance: 1200
};
```
