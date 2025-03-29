import UI_CONSTANTS from './UIConstants.js';

/**
 * Handles game notifications
 */
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }
    
    /**
     * Initialize notification container
     */
    init() {
        // Create container if it doesn't exist already
        if (!document.getElementById('notificationContainer')) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.style.position = 'absolute';
            this.container.style.top = '100px';
            this.container.style.left = '50%';
            this.container.style.transform = 'translateX(-50%)';
            this.container.style.zIndex = UI_CONSTANTS.STYLES.Z_INDEX.NOTIFICATION;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notificationContainer');
        }
    }
    
    /**
     * Show a notification message
     * @param {string} message - The message to show
     * @param {number|string} duration - How long to show the message in milliseconds, or notification type
     * @param {string} type - Notification type: 'success', 'warning', 'error', 'debug', 'zone' or null for default
     */
    show(message, duration = UI_CONSTANTS.NOTIFICATION_DURATION, type = null) {
        // Handle case where duration is actually the type (for backward compatibility)
        if (typeof duration === 'string') {
            type = duration;
            duration = UI_CONSTANTS.NOTIFICATION_DURATION;
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        // Special styling for zone notifications
        if (type === 'zone') {
            notification.style.backgroundColor = 'transparent';
            notification.style.color = 'white';
            notification.style.fontSize = '22px';
            notification.style.fontWeight = 'bold';
            notification.style.textAlign = 'center';
            notification.style.transition = 'opacity 0.7s';
            notification.style.opacity = '0';
            notification.style.textShadow = '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)';
            notification.style.letterSpacing = '1px';
            notification.style.fontVariant = 'small-caps';
            notification.style.padding = '15px';
            notification.textContent = message;
        } else {
            // Set background color based on type
            let bgColor = 'rgba(0, 0, 0, 0.7)'; // Default
            if (type === 'success') {
                bgColor = 'rgba(76, 175, 80, 0.9)'; // Green
            } else if (type === 'warning') {
                bgColor = 'rgba(255, 152, 0, 0.9)'; // Orange
            } else if (type === 'error') {
                bgColor = 'rgba(244, 67, 54, 0.9)'; // Red
            } else if (type === 'debug') {
                bgColor = 'rgba(156, 39, 176, 0.9)'; // Magenta/Purple for debug
            }
            
            notification.style.backgroundColor = bgColor;
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.marginBottom = '10px';
            notification.style.textAlign = 'center';
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            notification.style.fontWeight = 'bold';
            notification.style.fontSize = '16px';
            notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            notification.textContent = message;
        }
        
        // Add to container
        this.container.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (this.container.contains(notification)) {
                    this.container.removeChild(notification);
                }
            }, 500);
        }, duration);
    }
    
    /**
     * Show a zone transition notification
     * @param {string} message - The zone message to show
     * @param {number} duration - How long to show the message in milliseconds
     */
    showZoneNotification(message, duration = 3500) {
        this.show(message, duration, 'zone');
    }
}

export default NotificationSystem; 