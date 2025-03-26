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
    modelType: 'sailboat-3',  // Choose from available model types
    speed: 100,
    waterOffset: -0.3
});
```

## Available Ship Models

SailboatShip supports various GLB model types:

- `sailboat`: Basic sailboat model
- `sailboat-2`: Alternative sailboat design
- `sailboat-3`: Advanced sailboat design
- `ship`: Standard ship model
- `ship-2`: Alternative ship design
- `ship-3`: Larger ship model
- `ship-4`: Advanced ship model

Each model has predefined settings for scale, water offset, and default speed.

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