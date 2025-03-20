const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Validate and process a combat action
 * This function validates that a combat action is legitimate and applies damage
 */
exports.processCombatAction = functions.https.onCall(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to perform combat actions'
        );
    }
    
    // Get user ID
    const uid = context.auth.uid;
    
    // Get required parameters
    const { targetId, damage, timestamp } = data;
    
    // Validate parameters
    if (!targetId || typeof damage !== 'number' || !timestamp) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required parameters: targetId, damage, timestamp'
        );
    }
    
    // Validate damage is within reasonable limits
    if (damage < 0 || damage > 50) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Damage value is outside acceptable range (0-50)'
        );
    }
    
    try {
        // Get attacker data
        const attackerRef = admin.database().ref(`players/${uid}`);
        const attackerSnapshot = await attackerRef.once('value');
        const attacker = attackerSnapshot.val();
        
        // Validate attacker exists and is not sunk
        if (!attacker || attacker.isSunk) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Attacker ship is invalid or sunk'
            );
        }
        
        // Check if target is an AI ship (for player vs AI combat)
        const isAITarget = targetId.startsWith('enemy-');
        
        // Get target data from the appropriate location
        let target;
        let targetRef;
        
        if (isAITarget) {
            // For AI targets, check in enemyShips collection
            console.log(`Looking for AI target: ${targetId}`);
            targetRef = admin.database().ref(`enemyShips/${targetId}`);
        } else {
            // For player targets, check in players collection
            console.log(`Looking for player target: ${targetId}`);
            targetRef = admin.database().ref(`players/${targetId}`);
        }
        
        const targetSnapshot = await targetRef.once('value');
        target = targetSnapshot.val();
        
        // Validate target exists
        if (!target) {
            // If target doesn't exist in the database, create a temporary AI target
            // This is a fallback for AI ships that might not be in the database yet
            if (isAITarget) {
                console.log(`AI target ${targetId} not found in database, creating temporary target`);
                target = {
                    id: targetId,
                    health: 100,
                    position: { x: 0, y: 0, z: 0 }, // Default position
                    isAI: true
                };
                
                // Save this AI ship to the database for future reference
                await targetRef.set(target);
            } else {
                throw new functions.https.HttpsError(
                    'not-found',
                    'Target ship not found'
                );
            }
        }
        
        // For player vs player combat, validate both players are online
        if (!isAITarget && (!target.isOnline || target.isSunk)) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Target player is offline or sunk'
            );
        }
        
        // Validate distance between ships
        const attackerPos = {
            x: attacker.position.x,
            y: attacker.position.y,
            z: attacker.position.z
        };
        
        const targetPos = {
            x: target.position.x || 0,
            y: target.position.y || 0,
            z: target.position.z || 0
        };
        
        const distance = calculateDistance(attackerPos, targetPos);
        const MAX_COMBAT_RANGE = 50; // Maximum combat range
        
        // Skip distance check for AI targets for now
        if (!isAITarget && distance > MAX_COMBAT_RANGE) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Target is out of range'
            );
        }
        
        // Validate cooldown period
        const now = Date.now();
        const COOLDOWN_PERIOD = 2000; // 2 seconds between shots
        
        if (attacker.lastAttackTime && (now - attacker.lastAttackTime < COOLDOWN_PERIOD)) {
            throw new functions.https.HttpsError(
                'resource-exhausted',
                'Attack cooldown in progress'
            );
        }
        
        // Calculate new health for target
        const currentHealth = target.health || 100;
        const newHealth = Math.max(0, currentHealth - damage);
        
        // Update target health and attacker's last attack time
        const updates = {};
        
        if (isAITarget) {
            // For AI targets, update in the enemyShips collection
            updates[`enemyShips/${targetId}/health`] = newHealth;
            updates[`enemyShips/${targetId}/lastDamagedBy`] = uid;
            updates[`enemyShips/${targetId}/lastDamagedAt`] = now;
            
            // If health depleted, mark as sunk
            if (newHealth === 0) {
                updates[`enemyShips/${targetId}/isSunk`] = true;
            }
        } else {
            // For player targets, update in the players collection
            updates[`players/${targetId}/health`] = newHealth;
            updates[`players/${targetId}/lastDamagedBy`] = uid;
            updates[`players/${targetId}/lastDamagedAt`] = now;
            
            // If health depleted, mark as sunk
            if (newHealth === 0) {
                updates[`players/${targetId}/isSunk`] = true;
            }
        }
        
        // Update attacker's last attack time
        updates[`players/${uid}/lastAttackTime`] = now;
        
        // Apply updates
        await admin.database().ref().update(updates);
        
        // Return success with damage info
        return {
            success: true,
            damage: damage,
            newHealth: newHealth,
            isSunk: newHealth === 0
        };
    } catch (error) {
        console.error('Error processing combat action:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error processing combat action',
            error.message
        );
    }
});

/**
 * Loot a shipwreck
 * This function validates that a player can loot a shipwreck and transfers the loot
 */
exports.lootShipwreck = functions.https.onCall(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        console.error('Authentication error: User not authenticated');
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to loot shipwrecks'
        );
    }
    
    // Get user ID
    const uid = context.auth.uid;
    console.log(`Processing loot request for user: ${uid}`);
    
    // Get required parameters
    const { shipwreckId } = data;
    
    // Validate parameters
    if (!shipwreckId) {
        console.error('Invalid argument: Missing shipwreckId');
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required parameter: shipwreckId'
        );
    }
    
    console.log(`Attempting to loot shipwreck: ${shipwreckId}`);
    
    try {
        // Get player data
        const playerRef = admin.database().ref(`players/${uid}`);
        const playerSnapshot = await playerRef.once('value');
        const player = playerSnapshot.val();
        
        console.log(`Player data:`, player ? 'Found' : 'Not found');
        
        // Validate player exists and is not sunk
        if (!player) {
            console.error(`Player not found: ${uid}`);
            
            // If player doesn't exist, create a minimal player record
            const defaultPlayerData = {
                health: 100,
                isSunk: false,
                gold: 0,
                inventory: {
                    items: {}
                },
                isOnline: true,
                position: { x: 0, y: 0, z: 0 }
            };
            
            console.log(`Creating new player record for: ${uid}`);
            await playerRef.set(defaultPlayerData);
            
            // Use this default data for the rest of the function
            player = defaultPlayerData;
            console.log(`Created player record`);
        }
        
        if (player.isSunk) {
            console.error(`Player is sunk, cannot loot: ${uid}`);
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Player ship is sunk and cannot loot'
            );
        }
        
        // Get shipwreck data
        const shipwreckRef = admin.database().ref(`shipwrecks/${shipwreckId}`);
        const shipwreckSnapshot = await shipwreckRef.once('value');
        const shipwreck = shipwreckSnapshot.val();
        
        console.log(`Shipwreck data:`, shipwreck ? 'Found' : 'Not found');
        
        // Validate shipwreck exists and is not already looted
        if (!shipwreck) {
            console.error(`Shipwreck not found: ${shipwreckId}`);
            throw new functions.https.HttpsError(
                'not-found',
                'Shipwreck not found'
            );
        }
        
        if (shipwreck.looted) {
            console.error(`Shipwreck already looted: ${shipwreckId}`);
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Shipwreck already looted'
            );
        }
        
        // Validate distance to shipwreck
        const playerPos = {
            x: player.position?.x || 0,
            y: player.position?.y || 0,
            z: player.position?.z || 0
        };
        
        const shipwreckPos = {
            x: shipwreck.position?.x || 0,
            y: shipwreck.position?.y || 0,
            z: shipwreck.position?.z || 0
        };
        
        console.log('Player position:', playerPos);
        console.log('Shipwreck position:', shipwreckPos);
        
        const distance = calculateDistance(playerPos, shipwreckPos);
        const LOOT_RANGE = 100; // Increased loot range for multiplayer
        
        console.log(`Distance to shipwreck: ${distance}, Max range: ${LOOT_RANGE}`);
        
        if (distance > LOOT_RANGE) {
            console.error(`Shipwreck out of range: ${distance} > ${LOOT_RANGE}`);
            throw new functions.https.HttpsError(
                'failed-precondition',
                `Shipwreck is out of range: ${Math.round(distance)} > ${LOOT_RANGE}`
            );
        }
        
        // Get loot from shipwreck
        const loot = shipwreck.loot || { gold: 0, items: [] };
        console.log(`Shipwreck loot:`, loot);
        
        // Update player gold
        const playerGold = player.gold || 0;
        
        // Add gold to player
        const newGold = playerGold + loot.gold;
        
        // Prepare updates
        const updates = {};
        updates[`players/${uid}/gold`] = newGold;
        
        // Add each item to player inventory with unique IDs if inventory exists
        if (loot.items && loot.items.length > 0 && player.inventory) {
            loot.items.forEach((item, index) => {
                const itemId = `item-${Date.now()}-${index}`;
                updates[`players/${uid}/inventory/items/${itemId}`] = item;
            });
        }
        
        // Mark shipwreck as looted
        updates[`shipwrecks/${shipwreckId}/looted`] = true;
        updates[`shipwrecks/${shipwreckId}/lootedBy`] = uid;
        updates[`shipwrecks/${shipwreckId}/lootedAt`] = Date.now();
        
        console.log(`Updating database with loot results`);
        
        // Apply updates
        await admin.database().ref().update(updates);
        
        console.log(`Successfully looted shipwreck ${shipwreckId}`);
        
        // Return success with loot info
        return {
            success: true,
            loot: loot
        };
    } catch (error) {
        console.error('Error looting shipwreck:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error looting shipwreck: ' + (error.message || 'Unknown error'),
            error
        );
    }
});

/**
 * Reset player ship after sinking
 * This function resets a player's ship after it has been sunk
 */
exports.resetPlayerShip = functions.https.onCall(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to reset your ship'
        );
    }
    
    // Get user ID
    const uid = context.auth.uid;
    
    try {
        // Get player data
        const playerRef = admin.database().ref(`players/${uid}`);
        const playerSnapshot = await playerRef.once('value');
        const player = playerSnapshot.val();
        
        // Validate player exists
        if (!player) {
            throw new functions.https.HttpsError(
                'not-found',
                'Player not found'
            );
        }
        
        // Validate player is sunk
        if (!player.isSunk) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Player ship is not sunk'
            );
        }
        
        // Reset player ship
        const updates = {
            [`players/${uid}/health`]: 100,
            [`players/${uid}/isSunk`]: false,
            [`players/${uid}/position`]: { x: 0, y: 0.5, z: 0 }
        };
        
        // Apply updates
        await admin.database().ref().update(updates);
        
        // Return success
        return {
            success: true
        };
    } catch (error) {
        console.error('Error resetting player ship:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error resetting player ship',
            error.message
        );
    }
});

/**
 * Calculate the distance between two 3D positions
 * @param {Object} pos1 - First position with x, y, z coordinates
 * @param {Object} pos2 - Second position with x, y, z coordinates
 * @returns {number} - Distance between the two positions
 */
function calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Scheduled function to clean up old shipwrecks
 * Runs hourly to remove shipwrecks that are:
 * - Looted and older than 1 hour
 * - Unlooted but older than 24 hours (abandoned)
 */
exports.cleanupOldShipwrecks = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
    console.log('Running scheduled shipwreck cleanup');
    
    try {
        // Get all shipwrecks
        const shipwrecksRef = admin.database().ref('shipwrecks');
        const shipwrecksSnapshot = await shipwrecksRef.once('value');
        const shipwrecks = shipwrecksSnapshot.val() || {};
        
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        const ONE_DAY = 24 * ONE_HOUR;
        
        const deletions = [];
        
        // Check each shipwreck
        for (const [id, shipwreck] of Object.entries(shipwrecks)) {
            // If shipwreck was looted more than 1 hour ago, delete it
            if (shipwreck.looted && shipwreck.lootedAt && (now - shipwreck.lootedAt > ONE_HOUR)) {
                console.log(`Deleting looted shipwreck ${id} (looted ${Math.round((now - shipwreck.lootedAt) / (60 * 1000))} minutes ago)`);
                deletions.push(shipwrecksRef.child(id).remove());
            }
            // If shipwreck is over 24 hours old and unlooted (abandoned), delete it
            else if (shipwreck.createdAt && (now - shipwreck.createdAt > ONE_DAY) && !shipwreck.looted) {
                console.log(`Deleting old unlooted shipwreck ${id} (created ${Math.round((now - shipwreck.createdAt) / ONE_HOUR)} hours ago)`);
                deletions.push(shipwrecksRef.child(id).remove());
            }
        }
        
        // Wait for all deletions to complete
        if (deletions.length > 0) {
            await Promise.all(deletions);
            console.log(`Cleanup complete. Removed ${deletions.length} old shipwrecks`);
        } else {
            console.log('No shipwrecks needed cleanup');
        }
        
        return null;
    } catch (error) {
        console.error('Error cleaning up shipwrecks:', error);
        return null;
    }
});