/**
 * CombatService class for handling server-side combat validation
 */
class CombatService {
    /**
     * Create a new CombatService
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.firebase = options.firebase || null;
        this.auth = options.auth || null;
        
        // Initialize functions reference
        if (this.firebase) {
            console.log('Firebase provided to CombatService:', this.firebase);
            
            // Try to get functions in different ways
            try {
                if (typeof this.firebase.functions === 'function') {
                    this.functions = this.firebase.functions();
                    console.log('Using firebase.functions()');
                } else if (typeof this.firebase.app === 'function' && typeof this.firebase.app().functions === 'function') {
                    this.functions = this.firebase.app().functions();
                    console.log('Using firebase.app().functions()');
                } else {
                    console.warn('Firebase Functions not available, combat validation will be disabled');
                    this.functions = null;
                }
            } catch (error) {
                console.error('Error initializing Firebase Functions:', error);
                this.functions = null;
            }
        }
        
        // Track last attack time locally to prevent rapid firing
        this.lastAttackTime = 0;
        this.COOLDOWN_PERIOD = 1500; // Changed to 1500ms to match server cooldown
    }
    
    /**
     * Process a combat action on the server
     * @param {string} targetId - ID of the target ship
     * @param {number} damage - Amount of damage dealt
     * @param {Object} options - Additional options including damage seed
     * @returns {Promise<Object>} Result of the combat action
     */
    async processCombatAction(targetId, damage, options = {}) {
        if (!this.firebase) {
            console.error('Firebase not initialized');
            return { success: false, error: 'Firebase not initialized', actionId: options.actionId };
        }
        
        if (!this.functions) {
            console.warn('Firebase Functions not available, using local combat logic');
            // Return a mock success response
            return { 
                success: true, 
                damage: damage,
                expectedDamage: damage, // Match the server format
                newHealth: 0, // We don't know the actual health, so we'll let the client handle it
                isSunk: false,
                actionId: options.actionId // Include the actionId in the response
            };
        }
        
        // Check local cooldown to prevent unnecessary server calls
        const now = Date.now();
        const timeSinceLastAttack = now - this.lastAttackTime;
        
        // Only check the exact cooldown time without any buffer
        // This is much less aggressive and will only block attempts that would definitely be rejected
        if (timeSinceLastAttack < this.COOLDOWN_PERIOD) {
            console.debug('[COMBAT SERVICE] Local cooldown check failed:', {
                lastAttackTime: this.lastAttackTime,
                now: now,
                timeSinceLastAttack: timeSinceLastAttack,
                requiredCooldown: this.COOLDOWN_PERIOD,
                remainingCooldown: this.COOLDOWN_PERIOD - timeSinceLastAttack,
                actionId: options.actionId,
                timestamp: now
            });
            
            // Return a cooldown response instead of throwing an error
            return { 
                success: false, 
                error: 'Attack cooldown in progress',
                cooldownRemaining: this.COOLDOWN_PERIOD - timeSinceLastAttack,
                actionId: options.actionId, // Include the actionId in the cooldown response
                source: 'client-cooldown', // Identify this as a client rejection
                timestamp: now
            };
        }
        
        try {
            // Call the server function using the stored functions reference
            const processCombatAction = this.functions.httpsCallable('processCombatAction');
            
            // Log the combat request for debugging
            console.log('Sending combat action to server:', {
                targetId,
                damage,
                damageSeed: options.damageSeed,
                missChance: options.missChance,
                actionId: options.actionId
            });
            
            const result = await processCombatAction({
                targetId: targetId,
                damage: damage,
                timestamp: Date.now(),
                damageSeed: options.damageSeed,
                missChance: options.missChance,
                actionId: options.actionId // Send the actionId to the server
            });
            
            // Log the result for debugging
            console.log('Server combat result:', result.data);
            
            // Ensure the response includes the actionId
            const response = {...result.data};
            if (!response.actionId) {
                response.actionId = options.actionId;
            }
            
            // If successful, update last attack time
            if (response.success) {
                // Update local cooldown time
                this.lastAttackTime = now;
                console.log('[COMBAT SERVICE] Updated lastAttackTime after successful attack:', this.lastAttackTime);
            } 
            // If failed due to cooldown
            else if (response.error === 'Attack cooldown in progress') {
                // Calculate when we can fire again based on server's cooldownRemaining
                if (response.cooldownRemaining) {
                    // Compute the server's lastAttackTime by working backwards from cooldownRemaining
                    const serverImpliedLastAttackTime = now - (this.COOLDOWN_PERIOD - response.cooldownRemaining);
                    
                    // Add a larger buffer (300ms) to be absolutely sure we avoid future server rejections
                    const adjustedLastAttackTime = serverImpliedLastAttackTime + 300;
                    
                    // Always update local time to server time to prevent desync
                    // This ensures we stay synchronized with the server's cooldown timer
                    this.lastAttackTime = adjustedLastAttackTime;
                    console.log('[COMBAT SERVICE] Forcefully synced lastAttackTime with server implied time:', {
                        originalLastAttackTime: this.lastAttackTime,
                        serverImplied: serverImpliedLastAttackTime,
                        withBuffer: adjustedLastAttackTime,
                        cooldownRemaining: response.cooldownRemaining
                    });
                    
                    // Analyze if our delta is significantly off from server
                    const cooldownTimeDifference = adjustedLastAttackTime - this.lastAttackTime;
                    if (Math.abs(cooldownTimeDifference) > 200) {
                        console.warn('[COMBAT SERVICE] Large cooldown time difference detected:', {
                            difference: cooldownTimeDifference,
                            serverImplied: serverImpliedLastAttackTime,
                            clientTime: this.lastAttackTime
                        });
                    }
                }
            }
            
            return response;
        } catch (error) {
            // Get detailed error information
            const errorCode = error.code || 'unknown';
            const errorMessage = error.message || 'Unknown error';
            const errorDetails = error.details || {};
            
            console.error(`Combat action error (${errorCode}):`, errorMessage);
            if (Object.keys(errorDetails).length > 0) {
                console.error('Error details:', errorDetails);
            }
            
            // Check if this is a cooldown error and handle it gracefully
            if (errorMessage.includes('cooldown')) {
                return { 
                    success: false, 
                    error: 'Attack cooldown in progress',
                    cooldownRemaining: this.COOLDOWN_PERIOD,
                    actionId: options.actionId // Include actionId in error responses
                };
            }
            
            // Format error for client feedback
            return { 
                success: false, 
                error: errorMessage,
                code: errorCode,
                details: errorDetails,
                actionId: options.actionId // Include actionId in error responses
            };
        }
    }
    
    /**
     * Loot a shipwreck on the server
     * @param {string} shipwreckId - ID of the shipwreck
     * @returns {Promise<Object>} Result of the looting action
     */
    async lootShipwreck(shipwreckId) {
        if (!this.firebase) {
            console.error('Firebase not initialized');
            return { success: false, error: 'Firebase not initialized' };
        }
        
        if (!this.functions) {
            console.error('Firebase Functions not available');
            return { success: false, error: 'Firebase Functions not available' };
        }
        
        try {
            // Call the server function using the stored functions reference
            const lootShipwreck = this.functions.httpsCallable('lootShipwreck');
            const result = await lootShipwreck({
                shipwreckId: shipwreckId
            });
            
            return result.data;
        } catch (error) {
            console.error('Error looting shipwreck:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Reset player ship after sinking
     * @returns {Promise<Object>} Result of the reset action
     */
    async resetPlayerShip() {
        if (!this.firebase) {
            console.error('Firebase not initialized');
            return { success: false, error: 'Firebase not initialized' };
        }
        
        if (!this.functions) {
            console.warn('Firebase Functions not available, using local reset logic');
            // Return a mock success response
            return { success: true };
        }
        
        try {
            // Call the server function using the stored functions reference
            const resetPlayerShip = this.functions.httpsCallable('resetPlayerShip');
            const result = await resetPlayerShip();
            
            return result.data;
        } catch (error) {
            console.error('Error resetting player ship:', error);
            
            // If the error is that the ship is not sunk, just return success
            if (error.message && error.message.includes('not sunk')) {
                console.log('Ship is not sunk, no need to reset');
                return { success: true };
            }
            
            return { success: false, error: error.message };
        }
    }
}

export default CombatService; 