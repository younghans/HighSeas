import UI_CONSTANTS from './UIConstants.js';

/**
 * Manages the cannon cooldown indicator
 */
class CooldownIndicator {
    constructor(gameUI) {
        this.gameUI = gameUI;
        this.container = null;
        this.circle = null;
        this.fill = null;
        this.isCoolingDown = false;
        this.cooldownStartTime = 0;
        
        this.init();
    }
    
    /**
     * Initialize cooldown indicator
     */
    init() {
        // Create cooldown container
        this.container = document.createElement('div');
        this.container.id = 'cannon-cooldown-container';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '48%'; // Position in the middle of the screen vertically
        this.container.style.left = '50%'; // Center horizontally
        this.container.style.transform = 'translateX(-50%) translateY(40px)'; // Center and offset below ship
        this.container.style.width = '20px'; // Container width
        this.container.style.height = '20px'; // Container height
        this.container.style.display = 'none'; // Hidden by default until a target is selected
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';
        this.container.style.zIndex = UI_CONSTANTS.STYLES.Z_INDEX.UI;
        document.body.appendChild(this.container);
        
        // Create circular cooldown indicator
        this.circle = document.createElement('div');
        this.circle.style.width = '20px';
        this.circle.style.height = '20px';
        this.circle.style.borderRadius = '50%';
        this.circle.style.position = 'relative';
        this.circle.style.overflow = 'visible';
        this.container.appendChild(this.circle);
        
        // Create circular cooldown fill using SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.transform = 'rotate(-90deg)'; // Start from the top
        
        // Create circle path for cooldown
        this.fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.fill.setAttribute('cx', '10');
        this.fill.setAttribute('cy', '10');
        this.fill.setAttribute('r', '8');
        this.fill.setAttribute('fill', 'transparent');
        this.fill.setAttribute('stroke', UI_CONSTANTS.COLORS.SUCCESS); // Start with green when ready
        this.fill.setAttribute('stroke-width', '2');
        this.fill.setAttribute('stroke-dasharray', '50.3'); // 2 * PI * 8
        this.fill.setAttribute('stroke-dashoffset', '0');
        
        svg.appendChild(this.fill);
        this.circle.appendChild(svg);
    }
    
    /**
     * Show cooldown indicator and check initial state
     * @param {Object} playerShip - Player ship reference
     */
    show(playerShip) {
        if (!this.container) return;
        
        this.container.style.display = 'flex';
        
        // Check initial cooldown state
        if (playerShip && this.fill) {
            if (playerShip.canFire()) {
                // If we can fire, show green
                this.resetCooldownIndicator();
            } else {
                // If we can't fire, start the cooldown animation
                this.startCooldown();
            }
        }
    }
    
    /**
     * Hide cooldown indicator
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    
    /**
     * Update cooldown indicator
     */
    update(playerShip) {
        if (!playerShip || !this.fill) return;
        
        const now = Date.now();
        const canFire = playerShip.canFire();
        
        // If we're in cooldown mode but now can fire, update the UI
        if (this.isCoolingDown && canFire) {
            this.resetCooldownIndicator();
            return;
        }
        
        // If we can't fire, update the cooldown indicator
        if (!canFire) {
            // Make sure we have a start time
            if (!this.isCoolingDown) {
                this.startCooldown();
            }
            
            // Calculate progress (0 to 1)
            const elapsed = now - this.cooldownStartTime;
            const progress = Math.min(1, elapsed / playerShip.cannonCooldown);
            
            // Update the SVG circle dashoffset to show cooldown progress
            const circumference = 50.3;
            const dashOffset = circumference * (1 - progress);
            this.fill.setAttribute('stroke-dashoffset', dashOffset);
            
            // Gradually change color from red to green based on progress
            const red = Math.floor(244 - (244 - 76) * progress); // 244 -> 76
            const green = Math.floor(67 + (175 - 67) * progress); // 67 -> 175
            const blue = Math.floor(54 + (80 - 54) * progress); // 54 -> 80
            
            const color = `rgb(${red}, ${green}, ${blue})`;
            this.fill.setAttribute('stroke', color);
        }
    }
    
    /**
     * Start the cooldown timer
     */
    startCooldown() {
        if (!this.fill) return;
        
        this.isCoolingDown = true;
        this.cooldownStartTime = Date.now();
        
        // Reset the circle to show empty
        this.fill.setAttribute('stroke-dashoffset', '50.3');
        this.fill.setAttribute('stroke', UI_CONSTANTS.COLORS.ERROR); // Red
    }
    
    /**
     * Reset the cooldown indicator to ready state
     */
    resetCooldownIndicator() {
        if (!this.fill) return;
        
        this.isCoolingDown = false;
        
        // Reset the circle to show full
        this.fill.setAttribute('stroke-dashoffset', '0');
        this.fill.setAttribute('stroke', UI_CONSTANTS.COLORS.SUCCESS); // Green
    }
}

export default CooldownIndicator; 