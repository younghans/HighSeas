// Firebase Authentication Module

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA00oUbXz1oPqvwkOEEoKN1dG7KiMiY4j0",
  authDomain: "yarr-9d4f2.firebaseapp.com",
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

// Function to update UI based on auth state
function updateUIForUser(user) {
  if (user) {
    // User is signed in
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    // Update user info display
    userAvatar.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
    userName.textContent = user.displayName || user.email || 'Sailor';
    userInfo.style.display = 'flex';
    
    // Hide login menu if it's open
    hideLoginMenu();
  } else {
    // User is signed out
    document.getElementById('userInfo').style.display = 'none';
  }
}

// Sign in with Google
function signInWithGoogle() {
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
  updateUIForUser(user);
  
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
  signOut,
  showLoginMenu,
  hideLoginMenu,
  isAuthenticated,
  getCurrentUser,
  addAuthStateListener
};

// Export the Auth object as default
export default Auth; 