import UI_CONSTANTS from './UIConstants.js';
import UIUtils from './UIUtils.js';

/**
 * Manages the in-game chat interface
 */
class ChatInterface {
    constructor(gameUI, chatManager) {
        this.gameUI = gameUI;
        this.chatManager = chatManager;
        this.container = null;
        this.messagesContainer = null;
        this.chatInput = null;
        this.chatButton = null;
        
        this.init();
    }
    
    /**
     * Initialize chat interface
     */
    init() {
        this.createChatButton();
        this.createChatInterface();
        
        // Add keyboard event listener for chat toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.repeat && this.gameUI.isVisible) {
                // Only toggle if not currently typing in chat input
                if (!document.activeElement || document.activeElement.id !== 'chat-input') {
                    this.toggleChat();
                }
            }
        });
    }
    
    /**
     * Create chat button
     */
    createChatButton() {
        // Create chat button with chat bubble icon
        const chatButtonSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>`;
        
        this.chatButton = UIUtils.createIconButton(
            'chat-button',
            chatButtonSvg,
            'Chat (Enter)',
            this.toggleChat.bind(this)
        );
        
        // Add to bottom-left container (should exist before this is called)
        if (this.gameUI.bottomLeftUIContainer) {
            this.gameUI.bottomLeftUIContainer.appendChild(this.chatButton);
        }
    }
    
    /**
     * Create chat interface
     */
    createChatInterface() {
        // Create style element for chat scrollbar
        const style = document.createElement('style');
        style.textContent = `
            #chat-messages::-webkit-scrollbar {
                width: 8px;
            }
            
            #chat-messages::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            
            #chat-messages::-webkit-scrollbar-thumb {
                background-color: rgba(255, 255, 255, 0.3);
                border-radius: 4px;
            }
            
            #chat-messages::-webkit-scrollbar-thumb:hover {
                background-color: rgba(255, 255, 255, 0.4);
            }
        `;
        document.head.appendChild(style);
        
        // Create chat container
        this.container = document.createElement('div');
        this.container.id = 'game-chat-container';
        this.container.style.position = 'absolute';
        this.container.style.left = '20px';
        this.container.style.bottom = '70px';
        this.container.style.width = '300px';
        this.container.style.height = '175px';
        this.container.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG;
        this.container.style.borderRadius = '5px';
        this.container.style.display = 'none'; // Hidden by default
        this.container.style.flexDirection = 'column';
        this.container.style.zIndex = UI_CONSTANTS.STYLES.Z_INDEX.UI;
        document.body.appendChild(this.container);
        
        // Create messages container
        this.messagesContainer = document.createElement('div');
        this.messagesContainer.id = 'chat-messages';
        this.messagesContainer.style.flex = '1';
        this.messagesContainer.style.overflow = 'auto';
        this.messagesContainer.style.padding = '10px 10px 5px 10px';
        this.messagesContainer.style.color = 'white';
        this.messagesContainer.style.fontSize = '14px';
        this.messagesContainer.style.scrollbarWidth = 'thin';
        this.messagesContainer.style.scrollbarColor = 'rgba(255, 255, 255, 0.3) rgba(0, 0, 0, 0.3)';
        this.container.appendChild(this.messagesContainer);
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.padding = '5px 10px';
        inputContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        this.container.appendChild(inputContainer);
        
        // Create chat input
        this.chatInput = document.createElement('input');
        this.chatInput.id = 'chat-input';
        this.chatInput.type = 'text';
        this.chatInput.placeholder = 'Type your message...';
        this.chatInput.style.flex = '1';
        this.chatInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        this.chatInput.style.border = 'none';
        this.chatInput.style.borderRadius = '3px';
        this.chatInput.style.padding = '5px 10px';
        this.chatInput.style.color = 'white';
        this.chatInput.style.marginRight = '5px';
        inputContainer.appendChild(this.chatInput);
        
        // Create send button
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.style.backgroundColor = UI_CONSTANTS.COLORS.SUCCESS;
        sendButton.style.color = 'white';
        sendButton.style.border = 'none';
        sendButton.style.borderRadius = '3px';
        sendButton.style.padding = '5px 15px';
        sendButton.style.cursor = 'pointer';
        inputContainer.appendChild(sendButton);
        
        // Event listeners
        sendButton.addEventListener('click', this.sendMessage.bind(this));
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Set up message display callback
        this.setupMessageCallback();
    }
    
    /**
     * Toggle chat visibility
     */
    toggleChat() {
        if (!this.container) return;
        
        const isVisible = this.container.style.display !== 'none';
        this.container.style.display = isVisible ? 'none' : 'flex';
        
        // When opening chat
        if (!isVisible) {
            // Focus the input
            if (this.chatInput) {
                this.chatInput.focus();
            }
            
            // Scroll messages to bottom
            if (this.messagesContainer) {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }
        }
    }
    
    /**
     * Send a chat message
     */
    sendMessage() {
        if (!this.chatInput || !this.chatManager) return;
        
        const message = this.chatInput.value.trim();
        if (message) {
            // Get the current user's display name or fallback to 'Sailor'
            const user = this.gameUI.auth ? this.gameUI.auth.getCurrentUser() : null;
            const playerName = user?.displayName || 'Sailor';
            
            // Get the player's ship ID
            const shipId = this.gameUI.playerShip ? this.gameUI.playerShip.id : null;
            
            // Send the message
            this.chatManager.sendMessage(playerName, message, shipId);
            
            // Clear input
            this.chatInput.value = '';
        }
    }
    
    /**
     * Set up message display callback
     */
    setupMessageCallback() {
        if (!this.chatManager || !this.messagesContainer) return;
        
        this.chatManager.setMessageCallback((message) => {
            const messageElement = document.createElement('div');
            messageElement.style.marginBottom = '5px';
            
            // Create name element
            const nameElement = document.createElement('strong');
            // playerName should already be sanitized in ChatManager, but we use textContent for safe rendering
            nameElement.textContent = message.playerName + ': ';
            messageElement.appendChild(nameElement);
            
            // Filter message on display if enabled
            // Message should already be sanitized in ChatManager.sendMessage
            const displayMessage = this.gameUI.profanityFilterEnabled ? 
                this.chatManager.filterProfanity(message.message) : 
                message.message;
            
            // Add message text using textContent for safe rendering
            const textNode = document.createTextNode(displayMessage);
            messageElement.appendChild(textNode);
            
            // Add to messages container and scroll to bottom
            this.messagesContainer.appendChild(messageElement);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }
    
    /**
     * Show the chat interface
     */
    show() {
        if (this.chatButton) {
            this.chatButton.style.display = 'flex';
        }
    }
    
    /**
     * Hide the chat interface
     */
    hide() {
        if (this.chatButton) {
            this.chatButton.style.display = 'none';
        }
        
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
}

export default ChatInterface; 