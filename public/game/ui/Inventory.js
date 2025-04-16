/**
 * Inventory.js - Handles inventory UI components and data
 */
import UIUtils from './UIUtils.js';
import UI_CONSTANTS from './UIConstants.js';

class Inventory {
    /**
     * Create a new Inventory UI manager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.gameUI = options.gameUI;
        this.inventoryMenu = null;
        
        // Resource icons mapping
        this.resourceIcons = {
            wood: '/assets/images/icons/wood.png'
        };
        
        this.createInventoryMenu();
        
        // Listen for resource collection events
        document.addEventListener('resourceCollected', this.handleResourceCollected.bind(this));
        
        // Listen for resource updates
        document.addEventListener('playerResourcesUpdated', this.handleResourceUpdate.bind(this));
    }
    
    /**
     * Create the inventory menu
     * @returns {HTMLElement} The created inventory menu
     */
    createInventoryMenu() {
        this.inventoryMenu = UIUtils.createMenu('inventory-menu', 'Inventory', UI_CONSTANTS.COLORS.INFO);
        
        // Create resources container
        const resourcesContainer = document.createElement('div');
        resourcesContainer.id = 'resources-container';
        resourcesContainer.style.marginBottom = '10px';
        this.inventoryMenu.appendChild(resourcesContainer);
        
        // Create items container
        const itemsContainer = document.createElement('div');
        itemsContainer.id = 'items-container';
        this.inventoryMenu.appendChild(itemsContainer);
        
        // Empty inventory message
        const emptyMessage = document.createElement('p');
        emptyMessage.id = 'empty-inventory-message';
        emptyMessage.textContent = 'Your inventory is empty.';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = 'rgba(255, 255, 255, 0.7)';
        emptyMessage.style.fontStyle = 'italic';
        this.inventoryMenu.appendChild(emptyMessage);
        
        return this.inventoryMenu;
    }
    
    /**
     * Handle resource collection event
     * @param {CustomEvent} event - The resource collection event
     */
    handleResourceCollected(event) {
        console.log('Resource collected event received in Inventory:', event.detail);
        if (event.detail && event.detail.resource) {
            // Update the inventory menu if it exists and is visible
            if (this.inventoryMenu && this.inventoryMenu.style.display === 'block') {
                this.updateInventoryMenu();
            }
        }
    }
    
    /**
     * Handle resource update event
     * @param {CustomEvent} event - The resource update event
     */
    handleResourceUpdate(event) {
        if (event.detail && event.detail.resources) {
            // Update the inventory menu if it exists
            this.updateInventoryMenu();
        }
    }
    
    /**
     * Update inventory menu with the latest player resources and items
     */
    updateInventoryMenu() {
        if (!this.inventoryMenu) return;
        
        // Get the resources container
        const resourcesContainer = document.getElementById('resources-container');
        const itemsContainer = document.getElementById('items-container');
        const emptyMessage = document.getElementById('empty-inventory-message');
        
        if (!resourcesContainer || !itemsContainer || !emptyMessage) return;
        
        // Clear containers
        resourcesContainer.innerHTML = '';
        itemsContainer.innerHTML = '';
        
        // Add header for resources
        const resourcesHeader = document.createElement('h3');
        resourcesHeader.textContent = 'Resources';
        resourcesHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
        resourcesHeader.style.paddingBottom = '5px';
        resourcesHeader.style.marginTop = '0';
        resourcesContainer.appendChild(resourcesHeader);
        
        // Try to get player data from Firebase
        this.loadPlayerInventory(resourcesContainer, itemsContainer, emptyMessage);
    }
    
    /**
     * Load player inventory data from Firebase
     * @param {HTMLElement} resourcesContainer - Container for resources
     * @param {HTMLElement} itemsContainer - Container for items
     * @param {HTMLElement} emptyMessage - Empty inventory message element
     */
    loadPlayerInventory(resourcesContainer, itemsContainer, emptyMessage) {
        // Check if Firebase is available and Auth is accessible
        if (!window.firebase) {
            console.log('Firebase not available');
            emptyMessage.textContent = 'Log in to view your inventory.';
            emptyMessage.style.display = 'block';
            return;
        }
        
        // First check if the user is authenticated - checking directly with firebase auth
        const user = window.firebase.auth().currentUser;
        
        if (!user) {
            console.log('No authenticated user found');
            emptyMessage.textContent = 'Log in to view your inventory.';
            emptyMessage.style.display = 'block';
            return;
        }
        
        console.log(`Loading inventory for authenticated user: ${user.uid}`);
        const playerId = user.uid;
        
        // Create a reference to the player in Firebase
        const playerRef = window.firebase.database().ref(`players/${playerId}/inventory`);
        
        playerRef.once('value')
            .then(snapshot => {
                let hasInventoryItems = false;
                
                console.log('Inventory snapshot:', snapshot.val());
                
                // Check if resources exist
                if (snapshot.exists() && snapshot.val() && snapshot.val().resources) {
                    hasInventoryItems = this.renderResourcesList(resourcesContainer, snapshot.val().resources);
                }
                
                // Check if items exist
                if (snapshot.exists() && snapshot.val() && snapshot.val().items) {
                    const hasItems = this.renderItemsList(itemsContainer, snapshot.val().items);
                    hasInventoryItems = hasInventoryItems || hasItems;
                }
                
                // If no items exist yet, set up empty inventory message
                if (!hasInventoryItems) {
                    emptyMessage.textContent = 'Your inventory is empty.';
                    emptyMessage.style.display = 'block';
                } else {
                    emptyMessage.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error loading player inventory:', error);
                emptyMessage.textContent = 'Failed to load inventory.';
                emptyMessage.style.display = 'block';
            });
    }
    
    /**
     * Render the resources list in the inventory
     * @param {HTMLElement} container - Container to render into
     * @param {Object} resources - Resources data object
     * @returns {boolean} Whether any resources were rendered
     */
    renderResourcesList(container, resources) {
        let hasResources = false;
        
        // Create a formatted list of resources
        const resourceList = document.createElement('ul');
        resourceList.style.listStyleType = 'none';
        resourceList.style.padding = '0';
        resourceList.style.margin = '0';
        
        // Add each resource to the list
        Object.entries(resources).forEach(([resourceType, amount]) => {
            if (amount > 0) {
                hasResources = true;
                
                // Create resource item
                const resourceItem = document.createElement('li');
                resourceItem.style.display = 'flex';
                resourceItem.style.justifyContent = 'space-between';
                resourceItem.style.padding = '5px 0';
                resourceItem.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                
                // Format resource name with first letter uppercase
                const formattedName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
                
                // Create left side container for icon + name
                const leftContainer = document.createElement('div');
                leftContainer.style.display = 'flex';
                leftContainer.style.alignItems = 'center';
                
                // Check if we have an icon for this resource
                if (this.resourceIcons[resourceType]) {
                    // Create icon element
                    const icon = document.createElement('img');
                    icon.src = this.resourceIcons[resourceType];
                    icon.alt = `${formattedName} icon`;
                    icon.style.width = '20px';
                    icon.style.height = '20px';
                    icon.style.marginRight = '8px';
                    leftContainer.appendChild(icon);
                }
                
                // Resource name
                const resourceName = document.createElement('span');
                resourceName.textContent = formattedName;
                leftContainer.appendChild(resourceName);
                
                // Resource amount
                const resourceAmount = document.createElement('span');
                resourceAmount.textContent = amount;
                resourceAmount.style.fontWeight = 'bold';
                
                // Add to resource item
                resourceItem.appendChild(leftContainer);
                resourceItem.appendChild(resourceAmount);
                
                // Add to list
                resourceList.appendChild(resourceItem);
            }
        });
        
        // Add resource list to container if any resources
        if (resourceList.children.length > 0) {
            container.appendChild(resourceList);
        }
        
        return hasResources;
    }
    
    /**
     * Render the items list in the inventory
     * @param {HTMLElement} container - Container to render into
     * @param {Object} items - Items data object
     * @returns {boolean} Whether any items were rendered
     */
    renderItemsList(container, items) {
        let hasItems = false;
        
        // Add header for items
        const itemsHeader = document.createElement('h3');
        itemsHeader.textContent = 'Items';
        itemsHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
        itemsHeader.style.paddingBottom = '5px';
        itemsHeader.style.marginTop = '10px';
        container.appendChild(itemsHeader);
        
        // Create a formatted list of items
        const itemList = document.createElement('ul');
        itemList.style.listStyleType = 'none';
        itemList.style.padding = '0';
        itemList.style.margin = '0';
        
        // Add each item to the list
        Object.entries(items).forEach(([itemId, itemData]) => {
            hasItems = true;
            
            // Create item element
            const itemElement = document.createElement('li');
            itemElement.style.padding = '5px 0';
            itemElement.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            
            // Item name
            const itemName = document.createElement('div');
            itemName.textContent = itemData.name || 'Unknown Item';
            itemName.style.fontWeight = 'bold';
            itemElement.appendChild(itemName);
            
            // Item description if available
            if (itemData.description) {
                const itemDesc = document.createElement('div');
                itemDesc.textContent = itemData.description;
                itemDesc.style.fontSize = '0.8em';
                itemDesc.style.opacity = '0.7';
                itemElement.appendChild(itemDesc);
            }
            
            // Add to list
            itemList.appendChild(itemElement);
        });
        
        // Add item list to container
        if (itemList.children.length > 0) {
            container.appendChild(itemList);
            return true;
        }
        
        // No items found
        return false;
    }
    
    /**
     * Show the inventory menu
     */
    show() {
        if (this.inventoryMenu) {
            this.inventoryMenu.style.display = 'block';
            this.updateInventoryMenu();
        }
    }
    
    /**
     * Hide the inventory menu
     */
    hide() {
        if (this.inventoryMenu) {
            this.inventoryMenu.style.display = 'none';
        }
    }
    
    /**
     * Toggle the visibility of the inventory menu
     * @returns {boolean} Whether the menu is now visible
     */
    toggle() {
        if (this.inventoryMenu) {
            const isVisible = this.inventoryMenu.style.display === 'block';
            this.inventoryMenu.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                this.updateInventoryMenu();
            }
            
            return !isVisible;
        }
        return false;
    }
}

export default Inventory; 