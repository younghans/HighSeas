// Firebase Authentication Module

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA00oUbXz1oPqvwkOEEoKN1dG7KiMiY4j0",
  authDomain: "yarr-9d4f2.firebaseapp.com",
  databaseURL: "https://yarr-9d4f2-default-rtdb.firebaseio.com",
  projectId: "yarr-9d4f2",
  storageBucket: "yarr-9d4f2.firebasestorage.app",
  messagingSenderId: "841714550502",
  appId: "1:841714550502:web:59177abf9e8ed16fa85d27",
  measurementId: "G-QPSG88GH34"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth state variables
let currentUser = null;
let authStateListeners = [];

// Initialize auth
const auth = firebase.auth();

// Expose auth to window for global access
window.auth = auth;

// Google auth provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Function to show login menu
function showLoginMenu() {
  document.getElementById('loginMenu').style.display = 'block';
}

// Function to hide login menu
function hideLoginMenu() {
  document.getElementById('loginMenu').style.display = 'none';
}

// Sign in with Google
function signInWithGoogle() {
  // Regular Google sign in (no account linking)
  return auth.signInWithPopup(googleProvider)
    .then((result) => {
      // This gives you a Google Access Token
      const credential = result.credential;
      const token = credential.accessToken;
      
      // The signed-in user info
      const user = result.user;
      currentUser = user;
      
      console.log('User signed in:', user.displayName);
      
      // Ensure displayName is synchronized to players database
      syncDisplayNameToDatabase(user);
      
      return user;
    })
    .catch((error) => {
      // Handle Errors here
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error('Sign in error:', errorCode, errorMessage);
      throw error;
    });
}

// Sign in as guest
function signInAsGuest(username) {
  // Sanitize the username input using DOMPurify
  const guestName = username ? DOMPurify.sanitize(username) : 'Guest';
  let userRef;
  
  return auth.signInAnonymously()
    .then((result) => {
      // The signed-in guest user info
      userRef = result.user;
      
      // Update the user profile with the sanitized username
      return userRef.updateProfile({
        displayName: guestName
      });
    })
    .then(() => {
      // Force a reload of the user to ensure we have the latest profile data
      return userRef.reload();
    })
    .then(() => {
      currentUser = auth.currentUser;
      console.log('Guest signed in as:', currentUser.displayName);
      
      // Ensure displayName is synchronized to players database
      syncDisplayNameToDatabase(currentUser);
      
      return currentUser;
    })
    .catch((error) => {
      // Handle Errors here
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error('Guest sign in error:', errorCode, errorMessage);
      throw error;
    });
}

// Helper function to ensure displayName is synchronized to the database
function syncDisplayNameToDatabase(user) {
  if (!user || !user.uid || !user.displayName) return;
  
  try {
    // Get a reference to the player's data in the database
    const playerRef = firebase.database().ref(`players/${user.uid}`);
    
    // Check if player data exists first
    playerRef.once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          // Update existing player data with current displayName
          playerRef.update({
            displayName: user.displayName,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
          }).then(() => {
            console.log('Display name synchronized to database:', user.displayName);
          }).catch(error => {
            console.error('Error synchronizing display name to database:', error);
          });
        } else {
          // Player record doesn't exist yet, will be created when multiplayer initializes
          console.log('No player record found for displayName sync, will be created during multiplayer init');
        }
      }).catch(error => {
        console.error('Error checking player data existence:', error);
      });
  } catch (error) {
    console.error('Error synchronizing display name to database:', error);
  }
}

// Sign out
function signOut() {
  return auth.signOut()
    .then(() => {
      console.log('User signed out');
      currentUser = null;
    })
    .catch((error) => {
      console.error('Sign out error:', error);
      throw error;
    });
}

// Add auth state change listener
function addAuthStateListener(callback) {
  authStateListeners.push(callback);
}

// Initialize auth state listener
auth.onAuthStateChanged((user) => {
  currentUser = user;
  
  // Notify all listeners
  authStateListeners.forEach(callback => callback(user));
});

// Check if user is authenticated
function isAuthenticated() {
  return !!currentUser;
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Create the Auth object with all exported functions
const Auth = {
  signInWithGoogle,
  signInAsGuest,
  signOut,
  showLoginMenu,
  hideLoginMenu,
  isAuthenticated,
  getCurrentUser,
  addAuthStateListener
};

// Export the Auth object as default
export default Auth; 