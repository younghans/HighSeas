# Firebase Functions Rate Limiting

This project implements rate limiting for Firebase Cloud Functions to prevent abuse and ensure fair usage of resources.

## Rate Limiting Implementation

The rate limiting system is implemented in `utils.js` and provides three types of rate limiters:

1. **User-based Rate Limiter**: Limits the number of calls a specific user can make to a function within a given time period.
2. **IP-based Rate Limiter**: Limits the number of calls from a specific IP address (useful for unauthenticated functions).
3. **Global Rate Limiter**: Limits the total number of calls to a function regardless of the user.

## Rate Limits

The following rate limits are currently implemented:

| Function | Type | Limit | Time Period |
|----------|------|-------|------------|
| `processCombatAction` | User | 5 calls | 60 seconds |
| `lootShipwreck` | User | 3 calls | 60 seconds |
| `resetPlayerShip` | User | 1 call | 60 seconds |

## How Rate Limiting Works

1. When a function is called, it first checks if the user has exceeded their rate limit for that function.
2. If the limit is exceeded, the function returns an error with HTTP status code 429 (Too Many Requests).
3. The error response includes information about when the rate limit will reset.
4. Rate limit data is stored in the Firebase Realtime Database under the `rateLimits` path.

## Rate Limit Response Format

When a rate limit is exceeded, the function returns a structured error response with the following format:

```json
{
  "success": false,
  "error": "Rate limit exceeded for [function name]",
  "code": "resource-exhausted",
  "waitMs": 12345, // milliseconds until reset
  "resetTime": 1621234567890 // timestamp when the rate limit will reset
}
```

## Adding Rate Limiting to a New Function

To add rate limiting to a new function:

```javascript
const { rateLimiter } = require('./utils');

exports.myFunction = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in'
    );
  }
  
  const uid = context.auth.uid;
  
  // Apply rate limiting (5 calls per minute)
  const rateLimit = await rateLimiter(uid, 'myFunction', 5, 60);
  if (rateLimit.limited) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Rate limit exceeded',
      {
        waitMs: rateLimit.waitMs,
        resetTime: rateLimit.resetTime
      }
    );
  }
  
  // Function logic here
});
```

# Scheduled Functions

The project includes scheduled functions that run at regular intervals to maintain the game state.

## Marking Inactive Players as Offline

The `markInactivePlayers` function automatically marks players as offline if they haven't updated their status recently:

- **Schedule**: Runs every 5 minutes
- **Functionality**: Checks for players marked as online whose `lastUpdated` timestamp is older than 10 minutes
- **Implementation**: Sets `isOnline: false` for any players who meet this criteria
- **Purpose**: Prevents player profiles from remaining marked as online when they've lost connection or closed the game

This function helps ensure that player ships don't remain visible in the game world when the player is no longer actively connected. 