import UI_CONSTANTS from './UIConstants.js';
import UIUtils from './UIUtils.js';

/**
 * Manages the debug panel for the game
 */
class DebugPanel {
    constructor(gameUI) {
        this.gameUI = gameUI;
        this.panel = null;
        this.fpsCounter = null;
        this.positionDisplay = null;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        if (this.gameUI.debugMode) {
            this.init();
        }
    }
    
    /**
     * Initialize debug panel
     */
    init() {
        // Create debug panel container
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.style.position = 'absolute';
        this.panel.style.top = '10px';
        this.panel.style.left = '50%';
        this.panel.style.transform = 'translateX(-50%)';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.panel.style.color = '#00ff00';
        this.panel.style.padding = '10px';
        this.panel.style.borderRadius = '5px';
        this.panel.style.fontFamily = 'monospace';
        this.panel.style.fontSize = '14px';
        this.panel.style.zIndex = UI_CONSTANTS.STYLES.Z_INDEX.DEBUG;
        this.panel.style.display = this.gameUI.debugMode ? 'block' : 'none';
        
        // Create debug info title
        const debugTitle = document.createElement('div');
        debugTitle.textContent = 'Debug Mode Enabled';
        debugTitle.style.marginBottom = '10px';
        debugTitle.style.fontWeight = 'bold';
        debugTitle.style.textAlign = 'center';
        this.panel.appendChild(debugTitle);
        
        // Create FPS counter
        this.fpsCounter = document.createElement('div');
        this.fpsCounter.textContent = 'FPS: --';
        this.fpsCounter.style.marginBottom = '5px';
        this.panel.appendChild(this.fpsCounter);
        
        // Create player position display
        this.positionDisplay = document.createElement('div');
        this.positionDisplay.textContent = 'Position: (X: --, Z: --)';
        this.positionDisplay.style.marginBottom = '10px';
        this.panel.appendChild(this.positionDisplay);
        
        // Create respawn ship button
        const respawnButton = document.createElement('button');
        respawnButton.textContent = 'Respawn Ship';
        respawnButton.style.backgroundColor = '#ff3333';
        respawnButton.style.color = 'white';
        respawnButton.style.border = 'none';
        respawnButton.style.padding = '5px 10px';
        respawnButton.style.borderRadius = '4px';
        respawnButton.style.cursor = 'pointer';
        respawnButton.style.fontWeight = 'bold';
        respawnButton.style.width = '100%';
        respawnButton.style.marginTop = '5px';
        respawnButton.style.fontFamily = 'monospace';
        respawnButton.style.fontSize = '12px';
        
        respawnButton.addEventListener('click', this.respawnPlayerShip.bind(this));
        
        this.panel.appendChild(respawnButton);
        
        // Add debug panel to document
        document.body.appendChild(this.panel);
    }
    
    /**
     * Toggle debug panel visibility
     */
    toggle() {
        if (this.gameUI.debugMode) {
            // Create the debug panel if it doesn't exist
            if (!this.panel) {
                this.init();
            } else {
                this.panel.style.display = 'block';
            }
            
            // Reset frame count for FPS measurement
            this.frameCount = 0;
            this.lastFpsUpdate = performance.now();
        } else {
            // Hide the debug panel
            if (this.panel) {
                this.panel.style.display = 'none';
            }
        }
        
        // Note: Combat manager debug click boxes are now handled in UIMenuManager
    }
    
    /**
     * Update debug panel information
     */
    update() {
        if (!this.gameUI.debugMode || !this.panel) return;
        
        // Update FPS counter
        this.updateFps();
        
        // Update player position
        this.updatePosition();
    }
    
    /**
     * Update FPS counter
     */
    updateFps() {
        if (!this.fpsCounter) return;
        
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastFpsUpdate;
        
        // Update FPS every 500ms
        if (elapsed >= 500) {
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            this.fpsCounter.textContent = `FPS: ${fps}`;
            this.lastFpsUpdate = now;
            this.frameCount = 0;
        }
    }
    
    /**
     * Update player position display
     */
    updatePosition() {
        if (!this.positionDisplay || !this.gameUI.playerShip) return;
        
        const position = this.gameUI.playerShip.getPosition();
        if (position) {
            this.positionDisplay.textContent = `Position: (X: ${position.x.toFixed(1)}, Z: ${position.z.toFixed(1)})`;
        }
    }
    
    /**
     * Respawn the player ship
     */
    respawnPlayerShip() {
        if (!this.gameUI.combatManager || !this.gameUI.combatManager.playerShip) return;
        
        // Force the ship to sink
        this.gameUI.combatManager.playerShip.sink();
        
        // Use resetPlayerShip directly for immediate respawn
        if (typeof this.gameUI.combatManager.resetPlayerShip === 'function') {
            this.gameUI.combatManager.resetPlayerShip();
            
            // Show notification
            if (this.gameUI.notificationSystem) {
                this.gameUI.notificationSystem.show('Ship respawned', 2000, 'debug');
            }
        }
    }
}

export default DebugPanel; 