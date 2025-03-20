# Anonymous Authentication Setup

To use guest login functionality, you need to enable Anonymous Authentication in Firebase:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (yarr-9d4f2)
3. In the left sidebar, click on "Authentication"
4. Go to the "Sign-in method" tab
5. Find "Anonymous" in the list of providers
6. Click the toggle to enable it
7. Click "Save"

## Testing Guest Login

After enabling Anonymous Authentication, you can test guest login:

1. Open your application
2. Click the "Play" button
3. In the login menu, enter a username in the "Play as Guest" section
4. Click "Play as Guest"
5. The game should start with the guest username

## Guest to Google Account Upgrade

Guest users can upgrade to a permanent Google account while preserving their gameplay data:

1. While playing as a guest, click on the profile icon in the top-right corner
2. In the profile menu, you'll see a "Login with Google" button (only shown for guest users)
3. Click "Login with Google"
4. Complete the Google authentication process
5. Your guest account data will be transferred to your Google account (if no existing player data is found)
6. You'll now be logged in with your Google account

## How It Works

Guest login uses Firebase's Anonymous Authentication feature. When a user logs in as a guest:

1. They are assigned a temporary anonymous user ID
2. Their username is stored in the Firebase user profile
3. Their data is stored in the players collection, just like regular users
4. All guest data persists between sessions as long as they use the same browser

When a guest user upgrades to a Google account:

1. The system attempts to link the anonymous account with the Google account
2. If the Google account already exists, the system will:
   - Sign in with the Google account
   - Check if player data already exists for that Google account
   - If player data exists: Use the existing player data (preserving progress)
   - If no player data exists: Migrate data from the anonymous account to the Google account

Note that if a guest clears their browser data or uses a different browser before upgrading, they will get a new anonymous user ID and lose access to their previous guest account. 