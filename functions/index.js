const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Import combat functions
const combatFunctions = require('./combat');

// Import utilities
const { rateLimiter } = require('./utils');

// Import leaderboard functions
const leaderboardFunctions = require('./leaderboard');

// Import economy functions
const economyFunctions = require('./economy');

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

// Export economy functions
exports.unlockShip = economyFunctions.unlockShip;