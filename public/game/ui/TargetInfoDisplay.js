import UI_CONSTANTS from './UIConstants.js';
import UIUtils from './UIUtils.js';

/**
 * Manages the target information display
 */
class TargetInfoDisplay {
    constructor(gameUI) {
        this.gameUI = gameUI;
        this.currentTarget = null;
        this.container = null;
        this.targetDistanceText = null;
        this.targetRangeIndicator = null;
        
        this.init();
    }
    
    /**
     * Initialize target info display
     */
    init() {
        // Create target info container
        this.container = document.createElement('div');
        this.container.id = 'target-info-container';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '20px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.width = '250px';
        this.container.style.backgroundColor = UI_CONSTANTS.COLORS.BUTTON_BG;
        this.container.style.borderRadius = '5px';
        this.container.style.padding = '10px';
        this.container.style.boxSizing = 'border-box';
        this.container.style.zIndex = UI_CONSTANTS.STYLES.Z_INDEX.UI;
        this.container.style.display = 'none'; // Hidden by default
        this.container.style.touchAction = 'none';
        document.body.appendChild(this.container);
        
        this.createTargetLabel();
        this.createDistanceText();
        this.createRangeIndicator();
        this.createButtons();
    }
    
    /**
     * Create target label
     */
    createTargetLabel() {
        const targetLabel = document.createElement('div');
        targetLabel.textContent = 'TARGET: ENEMY SHIP';
        targetLabel.style.color = 'white';
        targetLabel.style.fontSize = '12px';
        targetLabel.style.fontWeight = 'bold';
        targetLabel.style.marginBottom = '5px';
        targetLabel.style.textAlign = 'center';
        targetLabel.style.touchAction = 'none';
        this.container.appendChild(targetLabel);
    }
    
    /**
     * Create distance text
     */
    createDistanceText() {
        this.targetDistanceText = document.createElement('div');
        this.targetDistanceText.textContent = 'Distance: 0m';
        this.targetDistanceText.style.color = 'white';
        this.targetDistanceText.style.fontSize = '10px';
        this.targetDistanceText.style.textAlign = 'center';
        this.targetDistanceText.style.marginTop = '5px';
        this.targetDistanceText.style.touchAction = 'none';
        this.container.appendChild(this.targetDistanceText);
    }
    
    /**
     * Create range indicator
     */
    createRangeIndicator() {
        this.targetRangeIndicator = document.createElement('div');
        this.targetRangeIndicator.textContent = 'OUT OF RANGE';
        this.targetRangeIndicator.style.color = UI_CONSTANTS.COLORS.ERROR;
        this.targetRangeIndicator.style.fontSize = '12px';
        this.targetRangeIndicator.style.fontWeight = 'bold';
        this.targetRangeIndicator.style.textAlign = 'center';
        this.targetRangeIndicator.style.marginTop = '5px';
        this.targetRangeIndicator.style.touchAction = 'none';
        this.container.appendChild(this.targetRangeIndicator);
    }
    
    /**
     * Create action buttons
     */
    createButtons() {
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.marginTop = '10px';
        buttonsContainer.style.width = '100%';
        this.container.appendChild(buttonsContainer);
        
        // Create fire button
        const fireButton = document.createElement('button');
        fireButton.textContent = 'FIRE';
        fireButton.style.flex = '1';
        fireButton.style.padding = '8px 0';
        fireButton.style.backgroundColor = UI_CONSTANTS.COLORS.ERROR;
        fireButton.style.color = 'white';
        fireButton.style.border = 'none';
        fireButton.style.borderRadius = '4px';
        fireButton.style.fontWeight = 'bold';
        fireButton.style.cursor = 'pointer';
        fireButton.style.marginRight = '5px';
        fireButton.style.transition = 'background-color 0.2s';
        fireButton.style.touchAction = 'none';
        
        // Add hover effect
        fireButton.addEventListener('mouseover', () => {
            fireButton.style.backgroundColor = '#D32F2F';
        });
        fireButton.addEventListener('mouseout', () => {
            fireButton.style.backgroundColor = UI_CONSTANTS.COLORS.ERROR;
        });
        
        // Add click event
        fireButton.addEventListener('click', this.handleFireClick.bind(this));
        buttonsContainer.appendChild(fireButton);
        
        // Create disengage button
        const disengageButton = document.createElement('button');
        disengageButton.textContent = 'DISENGAGE';
        disengageButton.style.flex = '1';
        disengageButton.style.padding = '8px 0';
        disengageButton.style.backgroundColor = UI_CONSTANTS.COLORS.INFO;
        disengageButton.style.color = 'white';
        disengageButton.style.border = 'none';
        disengageButton.style.borderRadius = '4px';
        disengageButton.style.fontWeight = 'bold';
        disengageButton.style.cursor = 'pointer';
        disengageButton.style.marginLeft = '5px';
        disengageButton.style.transition = 'background-color 0.2s';
        disengageButton.style.touchAction = 'none';
        
        // Add hover effect
        disengageButton.addEventListener('mouseover', () => {
            disengageButton.style.backgroundColor = '#1976D2';
        });
        disengageButton.addEventListener('mouseout', () => {
            disengageButton.style.backgroundColor = UI_CONSTANTS.COLORS.INFO;
        });
        
        // Add click event
        disengageButton.addEventListener('click', this.handleDisengageClick.bind(this));
        buttonsContainer.appendChild(disengageButton);
    }
    
    /**
     * Handle fire button click
     */
    handleFireClick(event) {
        event.stopPropagation();
        
        // Simulate spacebar press (keydown)
        const spaceDownEvent = new KeyboardEvent('keydown', {
            code: 'Space',
            key: ' ',
            keyCode: 32,
            which: 32,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(spaceDownEvent);
        
        // Simulate spacebar release (keyup) after a short delay
        setTimeout(() => {
            const spaceUpEvent = new KeyboardEvent('keyup', {
                code: 'Space',
                key: ' ',
                keyCode: 32,
                which: 32,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(spaceUpEvent);
        }, 50);
    }
    
    /**
     * Handle disengage button click
     */
    handleDisengageClick(event) {
        event.stopPropagation();
        
        // Clear target using the target manager in CombatManager
        if (this.gameUI.combatManager && this.gameUI.combatManager.targetManager) {
            this.gameUI.combatManager.targetManager.clearTarget();
        } else {
            // Fallback if CombatManager reference is not available
            this.setTarget(null);
        }
    }
    
    /**
     * Set the current target ship
     * @param {Object} targetShip - The target ship
     */
    setTarget(targetShip) {
        this.currentTarget = targetShip;
        
        if (targetShip) {
            // Show target info
            this.container.style.display = 'block';
            
            // Update target distance and range status
            this.updateTargetInfo();
            
            // Notify cooldown indicator to show when target is set
            if (this.gameUI.cooldownIndicator) {
                this.gameUI.cooldownIndicator.show(this.gameUI.playerShip);
            }
        } else {
            // Hide target info
            this.container.style.display = 'none';
            
            // Notify cooldown indicator to hide when no target
            if (this.gameUI.cooldownIndicator) {
                this.gameUI.cooldownIndicator.hide();
            }
        }
    }
    
    /**
     * Update target information display
     */
    updateTargetInfo() {
        // Ensure currentTarget exists
        if (!this.currentTarget || !this.targetDistanceText || !this.targetRangeIndicator) {
            return;
        }
        
        try {
            // Update distance if player ship is available
            if (this.gameUI.playerShip && typeof this.gameUI.playerShip.getPosition === 'function' && 
                typeof this.currentTarget.getPosition === 'function') {
                
                const playerPos = this.gameUI.playerShip.getPosition();
                const targetPos = this.currentTarget.getPosition();
                
                if (playerPos && targetPos) {
                    const distance = Math.round(playerPos.distanceTo(targetPos));
                    this.targetDistanceText.textContent = `Distance: ${distance}m`;
                    
                    // Update range indicator
                    if (distance <= this.gameUI.playerShip.cannonRange) {
                        this.targetRangeIndicator.textContent = 'IN RANGE';
                        this.targetRangeIndicator.style.color = UI_CONSTANTS.COLORS.SUCCESS;
                    } else {
                        this.targetRangeIndicator.textContent = 'OUT OF RANGE';
                        this.targetRangeIndicator.style.color = UI_CONSTANTS.COLORS.ERROR;
                    }
                }
            }
            
            // Check if target is sunk, with null check
            if (this.currentTarget && this.currentTarget.isSunk === true) {
                this.setTarget(null);
            }
        } catch (error) {
            console.error('Error in updateTargetInfo:', error);
            // If there was an error, safely clear the target
            this.setTarget(null);
        }
    }
}

export default TargetInfoDisplay; 