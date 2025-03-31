const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');

// Ship configurations with prices
const SHIP_CONFIGS = {
    'sloop': {
        price: 0, // Free/default ship
        alwaysUnlocked: true
    },
    'skiff': {
        price: 1000
    },
    'dinghy': {
        price: 800
    },
    'cutter': {
        price: 1500
    },
    'brig': {
        price: 2000
    }
};

/**
 * Cloud function to handle ship purchases securely on the server side
 * This prevents client-side manipulation of gold values and ensures
 * purchases are only processed when users have sufficient gold.
 */
exports.unlockShip = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to purchase ships'
        );
    }

    const uid = context.auth.uid;
    const shipId = data.shipId;

    // Validate shipId
    if (!shipId || !SHIP_CONFIGS[shipId]) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid ship ID provided'
        );
    }

    // Get ship configuration
    const shipConfig = SHIP_CONFIGS[shipId];

    // Check if this is a free ship (like the sloop)
    if (shipConfig.alwaysUnlocked) {
        logger.info(`User ${uid} is trying to unlock an always-unlocked ship: ${shipId}`);
        return {
            success: true,
            message: 'This ship is already available to all players',
            alreadyOwned: true,
            shipId: shipId
        };
    }

    // Initialize database references
    const db = admin.database();
    const userRef = db.ref(`players/${uid}`);

    try {
        // Get the user's data (gold and unlocked ships)
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val() || {};
        
        // Initialize user data if not present
        const gold = userData.gold || 0;
        const unlockedShips = Array.isArray(userData.unlockedShips) ? userData.unlockedShips : ['sloop'];
        
        // Check if ship is already unlocked
        if (unlockedShips.includes(shipId)) {
            logger.info(`User ${uid} already owns ship: ${shipId}`);
            return {
                success: false,
                message: 'You already own this ship',
                alreadyOwned: true,
                shipId: shipId
            };
        }
        
        // Check if user has enough gold
        if (gold < shipConfig.price) {
            logger.warn(`User ${uid} has insufficient gold for ${shipId}. Has: ${gold}, Needs: ${shipConfig.price}`);
            return {
                success: false,
                message: 'Insufficient gold for purchase',
                insufficientFunds: true,
                currentGold: gold,
                requiredGold: shipConfig.price,
                shipId: shipId
            };
        }
        
        // Calculate new gold balance
        const newGold = gold - shipConfig.price;
        
        // Update user data (atomic operation)
        const updates = {
            gold: newGold,
            unlockedShips: [...unlockedShips, shipId]
        };
        
        // Apply updates
        await userRef.update(updates);
        
        // Log successful purchase
        logger.info(`User ${uid} purchased ship ${shipId} for ${shipConfig.price} gold. New balance: ${newGold}`);
        
        // Return success response
        return {
            success: true,
            message: `Successfully purchased ${shipId}`,
            newGold: newGold,
            unlockedShips: updates.unlockedShips,
            shipId: shipId,
            price: shipConfig.price
        };
        
    } catch (error) {
        // Log error
        logger.error(`Error processing ship purchase for user ${uid}, ship ${shipId}:`, error);
        
        // Return error response
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while processing your purchase',
            error.message
        );
    }
}); 