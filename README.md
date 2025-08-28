# High Seas - Pirate Ship Game

A 3D multiplayer pirate ship game built with Three.js and Firebase where you sail the seas, engage in ship combat, discover islands, and build structures.

## Features

- 🏴‍☠️ **Multiplayer Combat** - Real-time ship-to-ship battles with other players
- 🚢 **Multiple Ship Types** - Choose from dinghy, sloop, skiff, brig, cutter, and more
- 🏝️ **Procedural Islands** - Explore randomly generated islands with resources
- ⚔️ **Combat System** - Cannon battles with damage, health, and respawn mechanics
- 🔨 **Building System** - Construct buildings, docks, and structures on islands
- 🌊 **Realistic Water Physics** - Dynamic water with wake effects and weather
- 🎮 **Authentication** - Guest login or Google account sign-in
- 💬 **Chat System** - Communicate with other players
- 🎵 **Spatial Audio** - Immersive 3D sound effects
- 📊 **Leaderboard** - Track your progress against other players

## Ship Types

Each ship has unique combat characteristics:
- **Dinghy**: Fast, lightweight rowing boat (80 HP, 1.3s reload)
- **Sloop**: Balanced sailing ship (100 HP, medium range)
- **Skiff**: Agile with powerful cannons (90 HP, 110 range)
- **Brig**: Heavy warship (150 HP, 130 range, slow but powerful)
- **Cutter**: Well-rounded vessel (120 HP, good all-around stats)

## Quick Start

```bash
# Install dependencies
npm install

# Local development server
npm start

# Full local testing with Firebase emulators
npm run emulators

# Deploy to production
npm run deploy
```

Access the game at `http://localhost:5000` after starting the development server.

## Controls

- **Left-click**: Move ship to location
- **Right-click**: Attack enemy ships  
- **Right-click drag**: Move camera view
- **ESC**: Exit build mode
- **R**: Rotate building (when in build mode)


## Technologies

- **Three.js** - 3D graphics and rendering
- **Firebase** - Real-time database, authentication, and hosting
- **WebGL** - Hardware-accelerated graphics
- **ES6 Modules** - Modern JavaScript architecture