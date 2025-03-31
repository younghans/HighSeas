/**
 * Shipwright menu component that displays as an open book in the center of the screen
 */
class Shipwright {
    /**
     * Create a new Shipwright menu
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.gameUI = options.gameUI;
        this.initialized = false;
        
        // Create shipwright menu if it doesn't exist
        const existingMenu = document.getElementById('shipwrightMenu');
        if (!existingMenu) {
            console.log('Creating new shipwright menu...');
            this.createShipwrightMenu();
        } else {
            console.log('Shipwright menu already exists, using existing one');
        }
        
        if (!this.initialized) {
            this.initEventListeners();
            this.initialized = true;
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        console.log('Initializing shipwright event listeners');
        // Add document click listener to close menu when clicking outside
        document.addEventListener('click', (event) => {
            const menu = document.getElementById('shipwrightMenu');
            if (menu && menu.style.display === 'block') {
                // Check if the click is outside the menu
                if (!menu.contains(event.target) && !event.target.closest('#shipwrightButton')) {
                    this.hide();
                }
            }
        });
    }
    
    /**
     * Create the shipwright menu styled as an open book
     */
    createShipwrightMenu() {
        // Create main container
        const menu = document.createElement('div');
        menu.id = 'shipwrightMenu';
        menu.style.position = 'absolute';
        menu.style.top = '50%';
        menu.style.left = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
        menu.style.width = '600px'; // Wider than standard menus to look like an open book
        menu.style.height = '400px';
        menu.style.display = 'none';
        menu.style.zIndex = '1000'; // Use a high z-index value to ensure it's on top
        
        // Create book container with two pages
        const bookContainer = document.createElement('div');
        bookContainer.className = 'book-container';
        bookContainer.style.display = 'flex';
        bookContainer.style.width = '100%';
        bookContainer.style.height = '100%';
        bookContainer.style.backgroundColor = '#8B4513'; // Brown color for book cover
        bookContainer.style.borderRadius = '10px';
        bookContainer.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.5)';
        bookContainer.style.overflow = 'hidden';
        
        // Left page
        const leftPage = document.createElement('div');
        leftPage.className = 'book-page left-page';
        leftPage.style.flex = '1';
        leftPage.style.background = '#f5e8c0'; // Parchment-like color
        leftPage.style.padding = '20px';
        leftPage.style.boxShadow = 'inset -5px 0 10px rgba(0, 0, 0, 0.1)';
        leftPage.style.display = 'flex';
        leftPage.style.flexDirection = 'column';
        leftPage.style.alignItems = 'center';
        leftPage.style.justifyContent = 'center';
        
        // Title for left page
        const leftTitle = document.createElement('h2');
        leftTitle.textContent = 'Shipwright';
        leftTitle.style.color = '#8B4513';
        leftTitle.style.fontFamily = 'serif';
        leftTitle.style.textAlign = 'center';
        leftTitle.style.marginBottom = '20px';
        leftPage.appendChild(leftTitle);
        
        // Right page
        const rightPage = document.createElement('div');
        rightPage.className = 'book-page right-page';
        rightPage.style.flex = '1';
        rightPage.style.background = '#f5e8c0'; // Parchment-like color
        rightPage.style.padding = '20px';
        rightPage.style.boxShadow = 'inset 5px 0 10px rgba(0, 0, 0, 0.1)';
        rightPage.style.display = 'flex';
        rightPage.style.flexDirection = 'column';
        rightPage.style.alignItems = 'center';
        rightPage.style.justifyContent = 'center';
        
        // Content for left page - coming soon message
        const comingSoon = document.createElement('p');
        comingSoon.textContent = 'Coming soon...';
        comingSoon.style.fontFamily = 'serif';
        comingSoon.style.fontSize = '18px';
        comingSoon.style.fontStyle = 'italic';
        comingSoon.style.color = '#5D4037';
        comingSoon.style.textAlign = 'center';
        comingSoon.style.marginTop = '30px';
        leftPage.appendChild(comingSoon);
        
        // Add a decorative image or drawing to right page
        const decorativeImage = document.createElement('div');
        decorativeImage.style.width = '150px';
        decorativeImage.style.height = '150px';
        decorativeImage.style.display = 'flex';
        decorativeImage.style.justifyContent = 'center';
        decorativeImage.style.alignItems = 'center';
        
        const shipImage = document.createElement('img');
        shipImage.src = '/assets/images/ship-icon.png';
        shipImage.style.width = '120px';
        shipImage.style.height = 'auto';
        shipImage.style.filter = 'sepia(100%) saturate(50%) hue-rotate(340deg) brightness(90%)'; // Apply brown color filter
        
        decorativeImage.appendChild(shipImage);
        rightPage.appendChild(decorativeImage);
        
        // Add a description on the right page
        const description = document.createElement('p');
        description.textContent = 'Here you will be able to upgrade your ship and build new ships.';
        description.style.fontFamily = 'serif';
        description.style.fontSize = '14px';
        description.style.color = '#5D4037';
        description.style.textAlign = 'center';
        description.style.marginTop = '20px';
        rightPage.appendChild(description);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = '#8B4513';
        closeButton.style.color = '#f5e8c0';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.cursor = 'pointer';
        
        closeButton.addEventListener('click', () => {
            menu.style.display = 'none';
        });
        
        // Add pages to book
        bookContainer.appendChild(leftPage);
        bookContainer.appendChild(rightPage);
        
        // Add book and close button to menu
        menu.appendChild(bookContainer);
        menu.appendChild(closeButton);
        
        // Prevent clicks inside the menu from propagating
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        // Add menu to the document body
        document.body.appendChild(menu);
        
        console.log('Shipwright menu created and added to document body');
    }
    
    /**
     * Show the shipwright menu
     */
    show() {
        const menu = document.getElementById('shipwrightMenu');
        if (menu) {
            console.log('Showing shipwright menu...');
            menu.style.display = 'block';
        } else {
            console.error('Failed to find shipwrightMenu element!');
        }
    }
    
    /**
     * Hide the shipwright menu
     */
    hide() {
        const menu = document.getElementById('shipwrightMenu');
        if (menu) {
            console.log('Hiding shipwright menu...');
            menu.style.display = 'none';
        }
    }
    
    /**
     * Toggle the shipwright menu visibility
     * @param {boolean} show - Whether to show or hide the menu
     */
    toggle(show) {
        console.log(`Shipwright toggle called with show=${show}`);
        if (show) {
            this.show();
        } else {
            this.hide();
        }
    }
}

export default Shipwright; 