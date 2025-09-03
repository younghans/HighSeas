# [PlayHighSeas.com](https://playhighseas.com) - Pirate MMO

A Pirate MMO built with ThreeJS where you pillage the seas, discover islands, harvest resources, upgrade your ship, and more.

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



## Quick Start

```bash
# Clone the repository
git clone <https://github.com/younghans/HighSeas>
cd HighSeas

# Install dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..

# Local development server
npm start

# Full local testing with Firebase emulators
npm run emulators

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