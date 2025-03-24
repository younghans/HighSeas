// Main Menu Authentication Handler
import Auth from './auth.js';
import Game from './main.js';

// Function to update menu visibility based on auth state
function updateMenuVisibility(user) {
    const authenticatedMenu = document.getElementById('authenticatedMenu');
    const guestMenu = document.getElementById('guestMenu');
    
    if (user) {
        // User is authenticated
        authenticatedMenu.style.display = 'block';
        guestMenu.style.display = 'none';
    } else {
        // User is not authenticated
        authenticatedMenu.style.display = 'none';
        guestMenu.style.display = 'block';
    }
}

// Function to handle guest login
function handleGuestLogin() {
    const usernameInput = document.getElementById('guestUsername');
    const username = usernameInput.value.trim() || 'Guest';
    
    // Username will be sanitized in Auth.signInAsGuest, but we sanitize here too for defense in depth
    Auth.signInAsGuest(username)
        .then(() => {
            // Guest login successful
            console.log('Guest login successful');
            // Hide the main menu
            document.getElementById('mainMenu').style.display = 'none';
            // Start the game
            Game.startGame();
        })
        .catch(error => {
            console.error('Guest login error:', error);
        });
}

// Function to handle Google login
function handleGoogleLogin() {
    const usernameInput = document.getElementById('guestUsername');
    const username = usernameInput.value.trim() || 'Guest';
    
    // Store the username before Google login
    window.pendingUsername = username;
    
    Auth.signInWithGoogle()
        .then(() => {
            // Google login successful
            console.log('Google login successful');
            // Hide the main menu
            document.getElementById('mainMenu').style.display = 'none';
            // Start the game
            Game.startGame();
        })
        .catch(error => {
            console.error('Google login error:', error);
        });
}

// Initialize menu handlers
function initMenuHandlers() {
    // Add auth state listener
    Auth.addAuthStateListener(updateMenuVisibility);
    
    // Add event listeners for login buttons
    document.getElementById('guestLoginButton').addEventListener('click', handleGuestLogin);
    document.getElementById('googleLoginButton').addEventListener('click', handleGoogleLogin);
    
    // Add event listener for play button (only for already authenticated users)
    document.getElementById('playButton').addEventListener('click', () => {
        // Hide the main menu
        document.getElementById('mainMenu').style.display = 'none';
        // Start the game
        Game.startGame();
    });
}

// Make initMenuHandlers available globally
window.initMenuHandlers = initMenuHandlers;

// Export for module usage
export { initMenuHandlers }; 