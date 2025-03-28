import GameCore from './core/GameCore.js';

// Create instance of GameCore
let gameCore;

// Initialize the game when the window loads
window.addEventListener('DOMContentLoaded', () => {
    // Create the game core instance
    gameCore = new GameCore();
    
    // Initialize the world (for main menu)
    gameCore.initWorldOnly();
    
    // Make gameCore accessible globally for debugging
    window.gameCore = gameCore;
});

// Export functions that need to be accessible from outside
export default {
    init: () => gameCore?.init(),
    initWorldOnly: () => gameCore?.initWorldOnly(),
    startGame: () => gameCore?.startGame(),
    get scene() { return gameCore?.getScene() },
    get camera() { return gameCore?.getCamera() },
    get renderer() { return gameCore?.getRenderer() }
};