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
  // Check if the user is already signed in anonymously
  const isAnonymous = currentUser && currentUser.isAnonymous;
  
  if (isAnonymous) {
    // Link anonymous account with Google
    return linkWithGoogle();
  } else {
    // Regular Google sign in
    return auth.signInWithPopup(googleProvider)
      .then((result) => {
        // This gives you a Google Access Token
        const credential = result.credential;
        const token = credential.accessToken;
        
        // The signed-in user info
        const user = result.user;
        currentUser = user;
        
        console.log('User signed in:', user.displayName);
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
}

// Link anonymous account with Google credentials
function linkWithGoogle() {
  return currentUser.linkWithPopup(googleProvider)
    .then((result) => {
      // Accounts successfully linked
      const credential = result.credential;
      const user = result.user;
      currentUser = user;
      
      console.log('Anonymous account upgraded to Google:', user.displayName);
      
      // Fire auth state change event to update UI components
      const authChangeEvent = new Event('auth-state-changed');
      document.dispatchEvent(authChangeEvent);
      
      return user;
    })
    .catch((error) => {
      // If account linking fails - typically because the email already exists
      // We'll handle the merge by signing in with Google and then copying the anonymous data
      if (error.code === 'auth/credential-already-in-use') {
        console.log('Account with this email already exists, signing in with Google');
        
        // Save the anonymous user ID for data migration
        const anonymousUserId = currentUser.uid;
        
        // Sign in with the existing Google account
        return auth.signInWithCredential(error.credential)
          .then(async (result) => {
            const user = result.user;
            currentUser = user;
            
            // Here you would merge data from the anonymous account
            // This would need to be implemented in the app's main code or data layer
            
            // Dispatch a custom event to migrate user data
            const migrationEvent = new CustomEvent('userAccountUpgraded', {
              detail: {
                anonymousUserId: anonymousUserId,
                newUserId: user.uid
              }
            });
            document.dispatchEvent(migrationEvent);
            
            // Fire auth state change event to update UI components
            const authChangeEvent = new Event('auth-state-changed');
            document.dispatchEvent(authChangeEvent);
            
            console.log('Signed in with existing Google account, migrating data:', anonymousUserId, 'to', user.uid);
            return user;
          });
      } else {
        console.error('Error linking accounts:', error);
        throw error;
      }
    });
}

// Sign in as guest
function signInAsGuest(username) {
  const guestName = username || 'Guest';
  
  return auth.signInAnonymously()
    .then((result) => {
      // The signed-in guest user info
      const user = result.user;
      
      // Update the user profile with the provided username
      return user.updateProfile({
        displayName: guestName
      }).then(() => {
        currentUser = auth.currentUser;
        console.log('Guest signed in as:', guestName);
        return currentUser;
      });
    })
    .catch((error) => {
      // Handle Errors here
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error('Guest sign in error:', errorCode, errorMessage);
      throw error;
    });
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
  linkWithGoogle,
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