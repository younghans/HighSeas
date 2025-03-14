# Multiplayer Setup Guide

This guide will help you set up the Firebase Realtime Database for multiplayer functionality in your game.

## Prerequisites

1. A Firebase project (you already have one set up based on your firebase.json file)
2. Firebase Authentication enabled (already set up for Google sign-in)

## Setting Up Firebase Realtime Database

1. **Enable Realtime Database**:
   - Go to the [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - In the left sidebar, click on "Realtime Database"
   - Click "Create Database"
   - Choose a location closest to your primary user base
   - Start in test mode, we'll secure it later

2. **Deploy Database Rules**:
   - The `database.rules.json` file has been created in your project
   - Deploy these rules using Firebase CLI:
   ```
   firebase deploy --only database
   ```

## How Multiplayer Works

The multiplayer system works as follows:

1. When a player logs in and starts the game, their ship position is synced to Firebase
2. The player's position and destination are synced:
   - Every time the player clicks to move their ship
   - Every 5 seconds automatically
3. Other players' ships are displayed with nametags
4. Ship movement for other players is predicted based on:
   - Their last known position
   - Their destination position
   - A simple interpolation algorithm

## Data Structure

The Firebase Realtime Database structure is:

```
/players
  /user_id_1
    id: "user_id_1"
    displayName: "Player Name"
    position: {x: 0, y: 0, z: 0}
    rotation: {y: 0}
    destination: {x: 10, y: 0, z: 10} or null
    lastUpdated: timestamp
    isOnline: true
  /user_id_2
    ...
```

## Security Rules

The database rules ensure:
- Only authenticated users can read player data
- Players can only write to their own data
- No one can delete or modify other players' data

## Troubleshooting

If you encounter issues with multiplayer:

1. **Ships not appearing**: Make sure Firebase Realtime Database is enabled and rules are deployed
2. **Position not syncing**: Check browser console for errors related to Firebase permissions
3. **Lag or stuttering**: This is normal with the 5-second sync interval, adjust if needed

## Advanced Configuration

You can modify the following in `game/multiplayer.js`:

- `SYNC_INTERVAL`: Change the frequency of position updates (default: 5000ms)
- Ship representation for other players (currently a simple box)
- Movement prediction algorithm

## Next Steps

Consider implementing these features to enhance multiplayer:

1. Chat system between players
2. Player-to-player interactions
3. Shared world state (e.g., resources, buildings)
4. Server-side validation to prevent cheating 