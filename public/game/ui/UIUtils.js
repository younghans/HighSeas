import UI_CONSTANTS from './UIConstants.js';

/**
 * Utility functions for UI operations
 */
class UIUtils {
    /**
     * Creates a styled button with icon
     */
    static createIconButton(id, iconSvg, title, onClick, options = {}) {
        const button = document.createElement('div');
        button.id = id;
        button.style.width = options.width || UI_CONSTANTS.STYLES.BUTTON_SIZE;
        button.style.height = options.height || UI_CONSTANTS.STYLES.BUTTON_SIZE;
        button.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG;
        button.style.color = 'white';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.cursor = 'pointer';
        button.style.borderRadius = UI_CONSTANTS.STYLES.BORDER_RADIUS;
        button.style.boxShadow = UI_CONSTANTS.STYLES.BOX_SHADOW;
        button.style.transition = UI_CONSTANTS.STYLES.TRANSITION;
        button.style.userSelect = 'none';
        button.style.webkitUserSelect = 'none';
        button.style.touchAction = 'none';
        
        button.innerHTML = iconSvg;
        button.title = title;
        
        // Add hover effect
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG_HOVER;
            button.style.transform = 'scale(1.05)';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG;
            button.style.transform = 'scale(1)';
        });
        
        // Add click handler
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof onClick === 'function') {
                onClick(event);
            }
        });
        
        return button;
    }
    
    /**
     * Creates a menu container
     */
    static createMenu(id, title, titleColor = UI_CONSTANTS.COLORS.INFO) {
        const menu = document.createElement('div');
        menu.id = id;
        menu.className = 'game-menu';
        menu.style.width = UI_CONSTANTS.STYLES.MENU_WIDTH;
        menu.style.backgroundColor = UI_CONSTANTS.COLORS.MENU_BG;
        menu.style.color = 'white';
        menu.style.padding = '15px';
        menu.style.borderRadius = UI_CONSTANTS.STYLES.BORDER_RADIUS;
        menu.style.boxShadow = UI_CONSTANTS.STYLES.BOX_SHADOW;
        menu.style.display = 'none'; // Hidden by default
        menu.style.boxSizing = 'border-box';
        menu.style.touchAction = 'none';
        
        // Add title if provided
        if (title) {
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            titleElement.style.margin = '0 0 15px 0';
            titleElement.style.textAlign = 'center';
            titleElement.style.color = titleColor;
            menu.appendChild(titleElement);
        }
        
        // Prevent event propagation
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        return menu;
    }
}

export default UIUtils; 