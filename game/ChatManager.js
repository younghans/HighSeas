// ChatManager.js - Handles in-game chat functionality with Firebase
class ChatManager {
    constructor() {
        this.db = firebase.database();
        this.messagesRef = this.db.ref('chat/messages');
        this.profanityRef = this.db.ref('profanityList');
        this.messageLimit = 50; // Number of messages to keep in history
        this.profanityList = []; // Will be populated from Firebase
        
        // Load profanity list from Firebase
        this.loadProfanityList();
        this.initializeChat();
    }

    loadProfanityList() {
        this.profanityRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                this.profanityList = snapshot.val();
            } else {
                // Fallback to a minimal default list if Firebase list is empty
                this.profanityList = ['badword'];
            }
        }).catch(error => {
            console.error('Error loading profanity list:', error);
            // Fallback to minimal default list on error
            this.profanityList = ['badword'];
        });
    }

    initializeChat() {
        // Listen for new messages
        this.messagesRef.limitToLast(this.messageLimit).on('child_added', (snapshot) => {
            const message = snapshot.val();
            this.displayMessage(message);
        });
    }

    sendMessage(playerName, messageText) {
        if (!messageText.trim()) return;

        const filteredMessage = this.filterProfanity(messageText);
        const messageData = {
            playerName: playerName,
            message: filteredMessage,
            timestamp: Date.now()
        };

        this.messagesRef.push(messageData);
    }

    filterProfanity(text) {
        let filteredText = text.toLowerCase();
        this.profanityList.forEach(word => {
            const regex = new RegExp('\\b' + word + '\\b', 'gi');
            filteredText = filteredText.replace(regex, '*'.repeat(word.length));
        });
        return filteredText;
    }

    displayMessage(message) {
        // This method will be implemented by the UI layer
        if (typeof this.onMessageReceived === 'function') {
            this.onMessageReceived(message);
        }
    }

    // Set callback for new messages
    setMessageCallback(callback) {
        this.onMessageReceived = callback;
    }
} 