/**
 * UsernameValidator - Utility class for validating username inputs
 * Handles validation for both main menu and profile username inputs
 */
import NotificationSystem from './NotificationSystem.js';

class UsernameValidator {
    constructor() {
        this.MAX_LENGTH = 16;
        this.VALID_PATTERN = /^[a-zA-Z0-9 ]+$/;
        this.profanityList = [];
        this.isLoadingProfanity = false;
        this.profanityLoaded = false;
        
        // Create notification system
        this.notificationSystem = new NotificationSystem();
        
        // Load profanity list from Firebase
        this.loadProfanityList();
        
        // Initialize validators on both username fields
        this.init();
    }
    
    /**
     * Initialize username validators on all username input fields
     */
    init() {
        // Initialize for main menu username field
        this.initMainMenuValidator();
        
        // Profile username field will be initialized when created
        document.addEventListener('DOMContentLoaded', () => {
            // Wait for profile menu to be possibly created
            setTimeout(() => {
                this.initProfileValidator();
            }, 1000);
        });
    }
    
    /**
     * Load profanity list from Firebase
     */
    loadProfanityList() {
        this.isLoadingProfanity = true;
        
        // Check if Firebase is available - using compat version
        if (window.firebase) {
            try {
                const db = firebase.database();
                // The profanity list is directly in a collection 'profanityList' with numbered entries
                db.ref('profanityList').once('value')
                    .then(snapshot => {
                        const profanityData = snapshot.val();
                        if (profanityData) {
                            // Based on the screenshot, the data is numbered entries with string values
                            for (const key in profanityData) {
                                if (typeof profanityData[key] === 'string') {
                                    this.profanityList.push(profanityData[key].toLowerCase());
                                }
                            }
                            console.log('Profanity list loaded:', this.profanityList.length, 'words');
                        } else {
                            console.warn('No profanity data found in database');
                        }
                        this.profanityLoaded = true;
                        this.isLoadingProfanity = false;
                    })
                    .catch(error => {
                        console.error('Error loading profanity list:', error);
                        this.profanityLoaded = true;
                        this.isLoadingProfanity = false;
                    });
            } catch (error) {
                console.error('Error initializing Firebase database:', error);
                this.profanityLoaded = true;
                this.isLoadingProfanity = false;
            }
        } else {
            console.warn('Firebase not available, profanity check disabled');
            this.profanityLoaded = true;
            this.isLoadingProfanity = false;
        }
    }
    
    /**
     * Initialize validator for main menu username field
     */
    initMainMenuValidator() {
        const mainMenuUsername = document.getElementById('mainMenuUsername');
        if (mainMenuUsername) {
            this.applyValidation(mainMenuUsername);
            
            // Apply validation to guest play button
            const guestPlayButton = document.getElementById('guestPlayButton');
            if (guestPlayButton) {
                guestPlayButton.addEventListener('click', (event) => {
                    if (!this.validateUsername(mainMenuUsername.value, true)) {
                        // Set default name to 'Sailor' in main menu
                        mainMenuUsername.value = 'Sailor';
                        // Allow the form to continue
                        return true;
                    }
                });
            }
            
            // For Google play, we'll validate before setting the display name
            const googlePlayButton = document.getElementById('googlePlayButton');
            if (googlePlayButton) {
                googlePlayButton.addEventListener('click', (event) => {
                    if (!this.validateUsername(mainMenuUsername.value, true)) {
                        // Set default name to 'Sailor' in main menu
                        mainMenuUsername.value = 'Sailor';
                        // Allow the form to continue
                        return true;
                    }
                });
            }
        }
        
        // Also handle the guest login in the login menu
        const guestUsername = document.getElementById('guestUsername');
        if (guestUsername) {
            this.applyValidation(guestUsername);
            
            const guestLoginButton = document.getElementById('guestLoginButton');
            if (guestLoginButton) {
                guestLoginButton.addEventListener('click', (event) => {
                    if (!this.validateUsername(guestUsername.value, true)) {
                        // Set default name to 'Sailor' in login menu
                        guestUsername.value = 'Sailor';
                        // Allow the form to continue
                        return true;
                    }
                });
            }
        }
    }
    
    /**
     * Initialize validator for profile username field
     */
    initProfileValidator() {
        const profileUsername = document.getElementById('username-input');
        if (profileUsername) {
            this.applyValidation(profileUsername);
            
            // Find the save button within the profile menu
            const saveButton = profileUsername.parentElement.querySelector('button');
            if (saveButton) {
                saveButton.addEventListener('click', (event) => {
                    if (!this.validateUsername(profileUsername.value, false)) {
                        event.preventDefault();
                        return false;
                    }
                });
            }
        }
    }
    
    /**
     * Apply validation to an input element
     * @param {HTMLInputElement} inputElement - The input element to validate
     */
    applyValidation(inputElement) {
        // Restrict input to allowed characters
        inputElement.addEventListener('input', (event) => {
            const input = event.target;
            const oldValue = input.value;
            
            // Truncate to max length
            if (oldValue.length > this.MAX_LENGTH) {
                input.value = oldValue.substring(0, this.MAX_LENGTH);
            }
            
            // Remove invalid characters
            if (!this.VALID_PATTERN.test(input.value)) {
                input.value = oldValue.replace(/[^a-zA-Z0-9 ]/g, '');
            }
        });
        
        // Add maxlength attribute to input element
        inputElement.setAttribute('maxlength', this.MAX_LENGTH);
        
        // Don't modify the placeholder for main menu username input
        if (inputElement.id === 'mainMenuUsername') {
            // Keep the original placeholder for main menu
            return;
        }
        
        // For other inputs, add max length info to placeholder
        const currentPlaceholder = inputElement.getAttribute('placeholder') || 'Enter username';
        if (!currentPlaceholder.includes('max')) {
            inputElement.setAttribute('placeholder', `${currentPlaceholder} (max ${this.MAX_LENGTH})`);
        }
    }
    
    /**
     * Check if the username contains any profanity words
     * @param {string} username - Username to check
     * @returns {boolean} True if username contains profanity, false otherwise
     */
    containsProfanity(username) {
        if (!this.profanityLoaded || this.profanityList.length === 0) {
            // If profanity list is not loaded yet, be lenient
            return false;
        }
        
        const lowercaseUsername = username.toLowerCase();
        // Split username into words for better boundary checking
        const userWords = lowercaseUsername.split(/\s+/);
        
        // First check for exact matches in words
        for (const word of userWords) {
            if (this.profanityList.includes(word)) {
                return true;
            }
        }
        
        // Then check for profanity contained within words
        // This catches attempts to hide profanity within longer words
        for (const profanityWord of this.profanityList) {
            // Skip very short profanity words (3 chars or less) when checking within words
            // to prevent false positives
            if (profanityWord.length <= 3) {
                continue;
            }
            
            if (lowercaseUsername.includes(profanityWord)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Validate a username string
     * @param {string} username - The username to validate
     * @param {boolean} isMainMenu - True if validation is for main menu, false for profile menu
     * @returns {boolean} True if username is valid, false otherwise
     */
    validateUsername(username, isMainMenu = false) {
        // Trim the username and check if it's empty
        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            // Show error notification if available
            this.showValidationError('Username cannot be empty');
            return false;
        }
        
        // Check username length
        if (trimmedUsername.length > this.MAX_LENGTH) {
            this.showValidationError(`Username cannot exceed ${this.MAX_LENGTH} characters`);
            return false;
        }
        
        // Check for invalid characters
        if (!this.VALID_PATTERN.test(trimmedUsername)) {
            this.showValidationError('Username can only contain letters, numbers, and spaces');
            return false;
        }
        
        // Check for profanity
        if (this.containsProfanity(trimmedUsername)) {
            if (isMainMenu) {
                // In main menu, we'll silently replace with 'Sailor'
                return false;
            } else {
                // In profile menu, show an error
                this.showValidationError('Username contains inappropriate language');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Show validation error message
     * @param {string} message - Error message to display
     */
    showValidationError(message) {
        // Use our NotificationSystem directly
        this.notificationSystem.show(message, 'error');
    }
}

// Create and export singleton instance
const usernameValidator = new UsernameValidator();
export default usernameValidator; 