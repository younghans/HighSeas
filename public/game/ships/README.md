# Ship System

This directory contains the ship system for the Yarr game. The system is designed to be modular and extensible, allowing for different types of ships to be added easily.

## Structure

- `BaseShip.js`: The base class for all ships, providing common functionality.
- `WakeParticleSystem.js`: A class to handle wake particle effects for ships.
- `SailboatShip.js`: A ship class that uses GLB models for ship representation.
- `index.js`: Exports all ship types and related classes.

## Usage

To use a ship in the game, import it from the ships directory:

```javascript
import { SailboatShip } from './ships/index.js';

// Create a new ship with a specific model type
const ship = new SailboatShip(scene, {
    modelType: 'skiff',  // Choose from available model types
    speed: 100,
    waterOffset: -0.3
});
```

## Available Ship Models

SailboatShip supports various GLB model types, each with different performance and combat characteristics:

- `dinghy`: Small, lightweight rowing boat
  - Fast firing rate (1.3s cooldown)
  - Lower health (80)
  - Shorter cannon range (90)
  - Weaker cannons (6-20 damage)

- `sloop`: Small maneuverable sailing ship
  - Balanced combat attributes
  - Medium health (100)
  - Medium cannon range (100)
  - Standard cannons (8-25 damage)

- `skiff`: Light, fast rowing or sailing boat
  - Fast and agile
  - Less health (90)
  - Good cannon range (110)
  - Powerful cannons (10-28 damage)

- `brig`: Two-masted square-rigged ship
  - Slow but powerful
  - High health (150)
  - Long cannon range (130)
  - Heavy cannons (15-35 damage)

- `ship-2`: Alternative ship design
  - Good all-rounder
  - High health (130)
  - Good range (125)
  - Strong cannons (13-32 damage)

- `cutter`: Fast, medium-sized sailing vessel
  - Balanced medium ship
  - Good health (120)
  - Good range (120)
  - Strong cannons (12-30 damage)

- `cutter-2`: Advanced sailing vessel
  - Top tier combat ship
  - Very good health (140)
  - Excellent range (140)
  - Powerful cannons (16-38 damage)

Each model has predefined settings for scale, water offset, speed, and combat attributes.

## Adding New Ship Models

To add a new ship model:

1. Add your GLB model file to `/assets/models/ships/`
2. Update the `SHIP_CONFIGS` static property in `SailboatShip.js` to include your new model

Example configuration:

```javascript
'new-ship': {
    modelPath: '/assets/models/ships/new-ship.glb',
    scale: new THREE.Vector3(0.5, 0.5, 0.5),
    waterOffset: -0.3,
    speed: 9
}
```

## Wake Particle System

The wake particle system creates a realistic wake effect behind the ship when it's moving. You can customize the wake effect by passing options to the `WakeParticleSystem` constructor:

```javascript
this.wakeParticleSystem = new WakeParticleSystem(scene, this, {
    maxParticles: 150,
    particleLifetime: 3,
    emitRate: 0.4
});
``` 