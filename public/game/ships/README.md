# Ship System

This directory contains the ship system for the Yarr game. The system is designed to be modular and extensible, allowing for different types of ships to be added easily.

## Structure

- `BaseShip.js`: The base class for all ships, providing common functionality.
- `WakeParticleSystem.js`: A class to handle wake particle effects for ships.
- `Sloop.js`: A small, fast sailing vessel (the default ship type).
- `index.js`: Exports all ship types and related classes.

## Usage

To use a ship in the game, import it from the ships directory:

```javascript
import { Sloop } from './ships/index.js';

// Create a new ship
const ship = new Sloop(scene, {
    speed: 100,
    hullColor: 0x8B4513,
    deckColor: 0xD2B48C,
    sailColor: 0xFFFFFF
});
```

## Adding New Ship Types

To add a new ship type:

1. Create a new file for your ship class (e.g., `Galleon.js`).
2. Extend the `BaseShip` class.
3. Implement the `createShip()` method to define the ship's appearance.
4. Add any ship-specific properties or methods.
5. Update `index.js` to export your new ship type.

Example:

```javascript
import * as THREE from 'three';
import BaseShip from './BaseShip.js';

class Galleon extends BaseShip {
    constructor(scene, options = {}) {
        // Set default options for a Galleon
        const galleonOptions = {
            speed: options.speed || 5, // Slower but larger
            hullColor: options.hullColor || 0x8B4513,
            deckColor: options.deckColor || 0xD2B48C,
            sailColor: options.sailColor || 0xFFFFFF,
            ...options
        };
        
        // Call the parent constructor
        super(scene, galleonOptions);
        
        // Create the ship mesh
        this.createShip();
    }
    
    createShip() {
        // Implement the ship's appearance
        // ...
    }
}

export default Galleon;
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