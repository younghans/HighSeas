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

## How It Works

This game supports two authentication methods:

1. **Google Authentication**: Users can sign in with their Google accounts
2. **Anonymous Authentication**: Users can play as guests without creating an account

Both authentication methods are treated the same way within the game:
- Each user gets their own player record in the database
- Player data (position, inventory, etc.) is stored and retrieved the same way
- Both types of users can access the same game features
- Both can save their username and log out

The only difference is how users initially authenticate:
- Google users log in with their Google account
- Guest users provide a username and play anonymously

Note that if a guest clears their browser data or uses a different browser, they will get a new anonymous user ID and won't be able to access their previous guest account. 