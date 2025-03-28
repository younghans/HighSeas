const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud function that generates a leaderboard of the top 10 players with the most gold
 * This function runs every 15 minutes and stores the result in the database
 */
exports.updateGoldLeaderboard = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    return updateGoldLeaderboardImpl();
  });

/**
 * Manual trigger to update the gold leaderboard
 * This can be used for testing or manually updating the leaderboard
 */
exports.updateGoldLeaderboardManual = functions.https.onCall(async (data, context) => {
  // Skip auth check if running in emulator/test environment
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  
  // Check if user is authenticated (skip in emulator)
  if (!isEmulator && !context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update leaderboards'
    );
  }

  try {
    await updateGoldLeaderboardImpl();
    return { success: true, message: 'Gold leaderboard updated successfully' };
  } catch (error) {
    console.error('Error updating gold leaderboard manually:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update leaderboard');
  }
});

/**
 * Helper function containing the core leaderboard update logic
 * This is used by both the scheduled and manual trigger functions
 */
async function updateGoldLeaderboardImpl() {
  console.log('Running gold leaderboard update');
  
  try {
    // Get all players
    const playersSnapshot = await admin.database().ref('players').once('value');
    const players = playersSnapshot.val();
    
    if (!players) {
      console.log('No players found');
      return null;
    }
    
    // Transform players object into array for sorting
    const playersList = Object.entries(players).map(([playerId, playerData]) => {
      return {
        id: playerId,
        name: playerData.displayName || 'Unknown Player',
        gold: playerData.gold || 0
      };
    });
    
    // Sort players by gold in descending order
    playersList.sort((a, b) => b.gold - a.gold);
    
    // Take top 10 players
    const topPlayers = playersList.slice(0, 10);
    
    // Create leaderboard object
    const leaderboard = {
      updatedAt: Date.now(), // Use regular timestamp instead of ServerValue
      players: topPlayers
    };
    
    // Store leaderboard in database
    await admin.database().ref('leaderboards/gold').set(leaderboard);
    
    console.log('Gold leaderboard updated successfully');
    return null;
  } catch (error) {
    console.error('Error updating gold leaderboard:', error);
    throw error;
  }
} 