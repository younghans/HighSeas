const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Import combat functions
const combatFunctions = require('./combat');

// Export combat functions
exports.processCombatAction = combatFunctions.processCombatAction;
exports.lootShipwreck = combatFunctions.lootShipwreck;
exports.resetPlayerShip = combatFunctions.resetPlayerShip;
exports.cleanupOldShipwrecks = combatFunctions.cleanupOldShipwrecks;