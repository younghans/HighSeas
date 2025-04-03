const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Import combat functions
const combatFunctions = require('./combat');

// Import utilities
const { rateLimiter } = require('./utils');

// Import leaderboard functions
const leaderboardFunctions = require('./leaderboard');

// Export utilities
exports.rateLimiter = rateLimiter;

// Export combat functions
exports.processCombatAction = combatFunctions.processCombatAction;
exports.lootShipwreck = combatFunctions.lootShipwreck;
exports.resetPlayerShip = combatFunctions.resetPlayerShip;
exports.cleanupOldShipwrecks = combatFunctions.cleanupOldShipwrecks;

// Export leaderboard functions
exports.updateGoldLeaderboard = leaderboardFunctions.updateGoldLeaderboard;
exports.updateGoldLeaderboardManual = leaderboardFunctions.updateGoldLeaderboardManual;

// Scheduled function to mark inactive players as offline
// Runs every 5 minutes
exports.markInactivePlayers = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const playersRef = admin.database().ref('players');
  
  // Get timestamp from 10 minutes ago (if a player hasn't updated in 10 minutes, mark them offline)
  const inactiveThreshold = Date.now() - (10 * 60 * 1000);
  
  // Query for online players whose last update was before the threshold
  const snapshot = await playersRef
    .orderByChild('isOnline')
    .equalTo(true)
    .once('value');
  
  const updates = {};
  let count = 0;
  
  // Check each online player
  snapshot.forEach((playerSnapshot) => {
    const player = playerSnapshot.val();
    const playerId = playerSnapshot.key;
    
    // If the player's last update is older than our threshold, mark them as offline
    if (player.lastUpdated && player.lastUpdated < inactiveThreshold) {
      updates[`${playerId}/isOnline`] = false;
      updates[`${playerId}/lastUpdated`] = admin.database.ServerValue.TIMESTAMP;
      count++;
    }
  });
  
  // Apply all updates in a single transaction if there are any
  if (Object.keys(updates).length > 0) {
    await playersRef.update(updates);
    console.log(`Marked ${count} inactive players as offline`);
  } else {
    console.log('No inactive players found');
  }
  
  return null;
});