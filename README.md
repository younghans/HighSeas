# Yarr! - Pirate Ship Game

A 3D pirate ship game built with Three.js where you can sail the seas, discover islands, and build structures.

## Project Structure

- `index.html` - The main entry point for the game
- `game/` - Directory containing all game-related files
  - `main.js` - Main game initialization and loop
  - `IslandGenerator.js` - Handles island generation
  - `world.js` - Manages the game world (sky, water, lighting)
  - `ship.js` - Ship controls and physics
  - `wind.js` - Wind system for the game
  - `objects/` - Directory containing game objects
    - `market-stall.js` - Market stall building
    - `dock.js` - Dock building

## How to Play

1. Open `index.html` in a web browser
2. Left-click to move the ship to a location
3. Right-click and drag to move the camera
4. Approach islands to interact with them
5. Use the building mode to place structures on islands

## Controls

- **Left-click**: Move ship to location
- **Right-click drag**: Move camera
- **ESC**: Exit build mode
- **R**: Rotate building (when in build mode)

## Features

- 3D sailing with realistic water physics
- Dynamic wind system
- Island discovery and exploration
- Building system for constructing on islands
- Camera controls for viewing the world

## Dependencies

- Three.js - 3D graphics library
- Various Three.js addons (OrbitControls, Water, Sky, etc.) 