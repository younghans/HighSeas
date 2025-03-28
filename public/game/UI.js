import * as THREE from 'three';

// Import UI components
import UIConstants from './ui/UIConstants.js';
import UIEventBus from './ui/UIEventBus.js';
import UIButtonManager from './ui/UIButtonManager.js';
import UIMenuManager from './ui/UIMenuManager.js';
import ChatInterface from './ui/ChatInterface.js';
import TargetInfoDisplay from './ui/TargetInfoDisplay.js';
import CooldownIndicator from './ui/CooldownIndicator.js';
import DebugPanel from './ui/DebugPanel.js';
import NotificationSystem from './ui/NotificationSystem.js';

/**
 * GameUI class - handles all UI elements in the game
 */
class GameUI {
    constructor(options = {}) {
        this.app = options;
        this.auth = options.auth;
        this.onLogout = options.onLogout;
        this.isVisible = false;
        this.playerShip = options.playerShip || null;
        this.combatManager = options.combatManager || null;
        
        // Active target
        this.currentTarget = null;
        
        // Load saved settings
        this.profanityFilterEnabled = localStorage.getItem('profanityFilter') !== 'false';
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        
        // Initialize UI containers
        this.initContainers();
        
        // Initialize UI components
        this.initComponents();
        
        // Add event listeners
        this.setupEventListeners();
        
        // Hide UI initially
        this.hide();
    }
    
    /**
     * Initialize UI containers
     */
    initContainers() {
        // Create bottom-left UI container
        this.bottomLeftUIContainer = document.createElement('div');
        this.bottomLeftUIContainer.id = 'game-ui-bottom-left-container';
        this.bottomLeftUIContainer.style.position = 'absolute';
        this.bottomLeftUIContainer.style.bottom = '20px';
        this.bottomLeftUIContainer.style.left = '20px';
        this.bottomLeftUIContainer.style.display = 'flex';
        this.bottomLeftUIContainer.style.flexDirection = 'column';
        this.bottomLeftUIContainer.style.alignItems = 'flex-start';
        this.bottomLeftUIContainer.style.zIndex = UIConstants.STYLES.Z_INDEX.UI;
        this.bottomLeftUIContainer.style.transition = 'all 0.3s ease';
        this.bottomLeftUIContainer.style.boxSizing = 'border-box';
        this.bottomLeftUIContainer.style.touchAction = 'none';
        document.body.appendChild(this.bottomLeftUIContainer);
        
        // Create bottom UI container
        this.bottomUIContainer = document.createElement('div');
        this.bottomUIContainer.id = 'game-ui-bottom-container';
        this.bottomUIContainer.style.position = 'absolute';
        this.bottomUIContainer.style.bottom = '20px';
        this.bottomUIContainer.style.right = '20px';
        this.bottomUIContainer.style.display = 'flex';
        this.bottomUIContainer.style.flexDirection = 'column';
        this.bottomUIContainer.style.alignItems = 'flex-end';
        this.bottomUIContainer.style.zIndex = UIConstants.STYLES.Z_INDEX.UI;
        this.bottomUIContainer.style.transition = 'all 0.3s ease';
        this.bottomUIContainer.style.boxSizing = 'border-box';
        this.bottomUIContainer.style.touchAction = 'none';
        document.body.appendChild(this.bottomUIContainer);
        
        // Create bottom menu container (positioned above buttons)
        this.bottomMenuContainer = document.createElement('div');
        this.bottomMenuContainer.id = 'bottom-menu-container';
        this.bottomMenuContainer.style.marginBottom = '10px';
        this.bottomMenuContainer.style.display = 'none'; // Hidden by default
        this.bottomMenuContainer.style.width = UIConstants.STYLES.MENU_WIDTH;
        this.bottomMenuContainer.style.boxSizing = 'border-box';
        this.bottomMenuContainer.style.touchAction = 'none';
        this.bottomUIContainer.appendChild(this.bottomMenuContainer);
        
        // Create bottom button container
        this.bottomButtonContainer = document.createElement('div');
        this.bottomButtonContainer.id = 'bottom-button-container';
        this.bottomButtonContainer.style.display = 'flex';
        this.bottomButtonContainer.style.flexDirection = 'row';
        this.bottomButtonContainer.style.gap = '10px';
        this.bottomButtonContainer.style.zIndex = UIConstants.STYLES.Z_INDEX.UI;
        this.bottomButtonContainer.style.touchAction = 'none';
        this.bottomUIContainer.appendChild(this.bottomButtonContainer);
        
        // Create top UI container
        this.topUIContainer = document.createElement('div');
        this.topUIContainer.id = 'game-ui-top-container';
        this.topUIContainer.style.position = 'absolute';
        this.topUIContainer.style.top = '20px';
        this.topUIContainer.style.right = '20px';
        this.topUIContainer.style.display = 'flex';
        this.topUIContainer.style.flexDirection = 'column';
        this.topUIContainer.style.alignItems = 'flex-end';
        this.topUIContainer.style.zIndex = UIConstants.STYLES.Z_INDEX.UI;
        this.topUIContainer.style.transition = 'all 0.3s ease';
        this.topUIContainer.style.boxSizing = 'border-box';
        this.topUIContainer.style.touchAction = 'none';
        document.body.appendChild(this.topUIContainer);
        
        // Create top button container
        this.topButtonContainer = document.createElement('div');
        this.topButtonContainer.id = 'top-button-container';
        this.topButtonContainer.style.display = 'flex';
        this.topButtonContainer.style.flexDirection = 'row';
        this.topButtonContainer.style.gap = '10px';
        this.topButtonContainer.style.zIndex = UIConstants.STYLES.Z_INDEX.UI;
        this.topUIContainer.appendChild(this.topButtonContainer);
        
        // Create top menu container (positioned below buttons)
        this.topMenuContainer = document.createElement('div');
        this.topMenuContainer.id = 'top-menu-container';
        this.topMenuContainer.style.marginTop = '10px';
        this.topMenuContainer.style.display = 'none'; // Hidden by default
        this.topMenuContainer.style.width = UIConstants.STYLES.MENU_WIDTH;
        this.topMenuContainer.style.boxSizing = 'border-box';
        this.topUIContainer.appendChild(this.topMenuContainer);
    }
    
    /**
     * Initialize UI components
     */
    initComponents() {
        // Create notification system
        this.notificationSystem = new NotificationSystem();
        
        // Initialize chat manager with saved profanity filter preference
        this.chatManager = new ChatManager();
        this.chatManager.setProfanityFilter(this.profanityFilterEnabled);
        
        // Create component instances
        this.buttonManager = new UIButtonManager(this);
        this.menuManager = new UIMenuManager(this);
        this.targetInfo = new TargetInfoDisplay(this);
        this.cooldownIndicator = new CooldownIndicator(this);
        this.chatInterface = new ChatInterface(this, this.chatManager);
        
        // Only create debug panel if debug mode is enabled
        if (this.debugMode) {
            this.debugPanel = new DebugPanel(this);
            
            // Enable debug click boxes in combat manager
            if (this.combatManager) {
                this.combatManager.toggleDebugClickBoxes(true);
            }
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add event listener for gold updates
        document.addEventListener('playerGoldUpdated', () => {
            // This is handled by the UIButtonManager
        });
    }
    
    /**
     * Show the UI
     */
    show() {
        this.bottomUIContainer.style.display = 'flex';
        this.topUIContainer.style.display = 'flex';
        this.bottomLeftUIContainer.style.display = 'flex';
        this.isVisible = true;
        
        // Show chat button
        this.chatInterface.show();
        
        // Only show target info if there's a current target
        if (this.currentTarget) {
            this.targetInfo.setTarget(this.currentTarget);
        }
    }
    
    /**
     * Hide the UI
     */
    hide() {
        this.bottomUIContainer.style.display = 'none';
        this.topUIContainer.style.display = 'none';
        this.bottomLeftUIContainer.style.display = 'none';
        this.isVisible = false;
        
        // Also close any open menus
        this.menuManager.hideAllMenus();
        
        // Hide the chat interface
        this.chatInterface.hide();
        
        // Hide the target info
        this.targetInfo.setTarget(null);
        
        // Clear any current target
        this.currentTarget = null;
    }
    
    /**
     * Update the UI
     */
    update() {
        // Update cooldown indicator if a target is active
        if (this.currentTarget && this.playerShip && !this.playerShip.isSunk) {
            this.cooldownIndicator.update(this.playerShip);
        }
        
        // Update target info if there is a current target
        if (this.currentTarget) {
            this.targetInfo.updateTargetInfo();
        }
        
        // Update debug panel if debug mode is enabled
        if (this.debugMode && this.debugPanel) {
            this.debugPanel.update();
        }
    }
    
    /**
     * Set the current target
     * @param {Object} targetShip - The target ship
     */
    setTarget(targetShip) {
        this.currentTarget = targetShip;
        
        // Update target info component
        if (this.targetInfo) {
            this.targetInfo.setTarget(targetShip);
        }
    }
    
    /**
     * Set the player ship reference
     * @param {Object} playerShip - The player's ship
     */
    setPlayerShip(playerShip) {
        this.playerShip = playerShip;
    }
    
    /**
     * Set the combat manager reference
     * @param {Object} combatManager - The combat manager
     */
    setCombatManager(combatManager) {
        this.combatManager = combatManager;
        
        // If debug mode is already enabled, update combat manager settings
        if (this.debugMode && this.combatManager) {
            this.combatManager.toggleDebugClickBoxes(true);
        }
    }
    
    /**
     * Show a notification message - convenience method
     * @param {string} message - The message to show
     * @param {number|string} duration - How long to show the message in milliseconds, or notification type
     * @param {string} type - Notification type: 'success', 'warning', 'error', or null for default
     */
    showNotification(message, duration = UIConstants.NOTIFICATION_DURATION, type = null) {
        if (this.notificationSystem) {
            this.notificationSystem.show(message, duration, type);
        }
    }
    
    /**
     * Close the top menu - delegates to menuManager
     */
    closeTopMenu() {
        if (this.menuManager) {
            this.menuManager.closeTopMenu();
        }
    }
    
    /**
     * Close the bottom menu - delegates to menuManager
     */
    closeBottomMenu() {
        if (this.menuManager) {
            this.menuManager.closeBottomMenu();
        }
    }
}

export default GameUI; 