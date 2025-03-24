const admin = require('firebase-admin');

/**
 * Rate limiter for Firebase Functions
 * Limits the number of calls a user can make to a specific function in a given time period
 * 
 * @param {string} uid - User ID
 * @param {string} limitName - Name of the rate limit (e.g., 'combat', 'login')
 * @param {number} maxCalls - Maximum number of calls allowed in the period
 * @param {number} periodSeconds - Time period in seconds
 * @returns {Object} Object with rate limit information
 */
exports.rateLimiter = async (uid, limitName, maxCalls, periodSeconds) => {
  // Reference to user's rate limiting data
  const rateRef = admin.database().ref(`rateLimits/${uid}/${limitName}`);
  
  // Current timestamp
  const now = Date.now();
  
  // Time window in milliseconds
  const windowMs = periodSeconds * 1000;
  
  // Get current rate limiting data
  const snapshot = await rateRef.once('value');
  const rateData = snapshot.val() || { count: 0, resetTime: now + windowMs };
  
  // If the reset time has passed, reset the counter
  if (now > rateData.resetTime) {
    await rateRef.set({ count: 1, resetTime: now + windowMs });
    return { limited: false, remaining: maxCalls - 1 };
  }
  
  // Check if the user has exceeded the limit
  if (rateData.count >= maxCalls) {
    return { 
      limited: true, 
      remaining: 0,
      resetTime: rateData.resetTime,
      waitMs: rateData.resetTime - now
    };
  }
  
  // Increment the counter
  await rateRef.set({ 
    count: rateData.count + 1, 
    resetTime: rateData.resetTime 
  });
  
  return { 
    limited: false, 
    remaining: maxCalls - rateData.count - 1,
    resetTime: rateData.resetTime
  };
};

/**
 * IP-based rate limiter for Firebase Functions (for unauthenticated requests)
 * This should be used with care as IP addresses can be spoofed
 * 
 * @param {string} ip - IP address
 * @param {string} limitName - Name of the rate limit
 * @param {number} maxCalls - Maximum number of calls allowed in the period
 * @param {number} periodSeconds - Time period in seconds
 * @returns {Object} Object with rate limit information
 */
exports.ipRateLimiter = async (ip, limitName, maxCalls, periodSeconds) => {
  // Hash the IP to avoid storing raw IPs in the database
  const ipHash = require('crypto').createHash('sha256').update(ip).digest('hex');
  
  // Reference to IP rate limiting data
  const rateRef = admin.database().ref(`ipRateLimits/${ipHash}/${limitName}`);
  
  // Use the same logic as user-based rate limiter
  return exports.rateLimiter(ipHash, limitName, maxCalls, periodSeconds);
};

/**
 * Global rate limiter for Firebase Functions (for entire function)
 * Limits the total number of calls to a function regardless of user
 * 
 * @param {string} functionName - Name of the function to limit
 * @param {number} maxCalls - Maximum number of calls allowed in the period
 * @param {number} periodSeconds - Time period in seconds
 * @returns {Object} Object with rate limit information
 */
exports.globalRateLimiter = async (functionName, maxCalls, periodSeconds) => {
  // Reference to global rate limiting data
  const rateRef = admin.database().ref(`globalRateLimits/${functionName}`);
  
  // Current timestamp
  const now = Date.now();
  
  // Time window in milliseconds
  const windowMs = periodSeconds * 1000;
  
  // Use a transaction to safely update counter
  const result = await rateRef.transaction((currentData) => {
    // If no data exists, initialize it
    if (!currentData) {
      return { count: 1, resetTime: now + windowMs };
    }
    
    // If the reset time has passed, reset the counter
    if (now > currentData.resetTime) {
      return { count: 1, resetTime: now + windowMs };
    }
    
    // Increment the counter
    return { 
      count: currentData.count + 1,
      resetTime: currentData.resetTime
    };
  });
  
  const rateData = result.snapshot.val();
  
  // Check if the global limit has been exceeded
  if (rateData.count > maxCalls) {
    return { 
      limited: true, 
      remaining: 0,
      resetTime: rateData.resetTime,
      waitMs: rateData.resetTime - now
    };
  }
  
  return { 
    limited: false, 
    remaining: maxCalls - rateData.count,
    resetTime: rateData.resetTime
  };
}; 