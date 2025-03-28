import UI_CONSTANTS from './UIConstants.js';
import UIUtils from './UIUtils.js';
import UIEventBus from './UIEventBus.js';

/**
 * Leaderboard component - displays top players by gold amount
 */
class LeaderboardComponent {
    constructor(gameUI) {
        this.gameUI = gameUI;
        this.leaderboardData = [];
        this.maxEntries = 10;
    }
    
    /**
     * Initialize the leaderboard by loading data from Firebase
     */
    initialize() {
        // Initial load
        this.loadLeaderboardData();
        
        // Listen for menu toggle events to refresh data when opened
        UIEventBus.subscribe('toggleMenu', (data) => {
            if (data.type === 'leaderboard') {
                // Only refresh when the leaderboard is opened
                this.loadLeaderboardData();
            }
        });
    }
    
    /**
     * Load leaderboard data from Firebase
     */
    loadLeaderboardData() {
        // Reference to the leaderboard players in Firebase
        const leaderboardPlayersRef = firebase.database().ref('leaderboards/gold/players');
        
        leaderboardPlayersRef.once('value')
            .then(snapshot => {
                const players = [];
                
                // Process results
                snapshot.forEach(childSnapshot => {
                    const playerData = childSnapshot.val();
                    
                    players.push({
                        id: playerData.id || childSnapshot.key,
                        name: playerData.name || 'Unknown Player',
                        gold: playerData.gold || 0
                    });
                });
                
                // Sort in descending order by gold amount
                this.leaderboardData = players.sort((a, b) => b.gold - a.gold);
                
                // Update the leaderboard UI if it's currently visible
                this.updateLeaderboardUI();
            })
            .catch(error => {
                console.error('Error loading leaderboard data:', error);
            });
    }
    
    /**
     * Refresh the leaderboard data
     */
    refreshLeaderboard() {
        this.loadLeaderboardData();
    }
    
    /**
     * Update the leaderboard UI with current data
     */
    updateLeaderboardUI() {
        const leaderboardContent = document.getElementById('leaderboard-content');
        if (!leaderboardContent) return;
        
        // Clear existing content
        leaderboardContent.innerHTML = '';
        
        if (this.leaderboardData.length === 0) {
            // Show message if no data available
            const noDataMsg = document.createElement('div');
            noDataMsg.className = 'leaderboard-no-data';
            noDataMsg.textContent = 'No leaderboard data available';
            noDataMsg.style.textAlign = 'center';
            noDataMsg.style.padding = '8px';
            noDataMsg.style.color = 'white';
            leaderboardContent.appendChild(noDataMsg);
            return;
        }
        
        // Create leaderboard table
        const table = document.createElement('table');
        table.className = 'leaderboard-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.color = 'white';
        
        // Add header row
        const headerRow = document.createElement('tr');
        
        const rankHeader = document.createElement('th');
        rankHeader.textContent = 'Rank';
        rankHeader.style.padding = '4px 2px';
        rankHeader.style.textAlign = 'center';
        rankHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        rankHeader.style.width = '40px';
        rankHeader.style.fontSize = '13px';
        
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Player';
        nameHeader.style.padding = '4px 2px';
        nameHeader.style.textAlign = 'left';
        nameHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        nameHeader.style.fontSize = '13px';
        
        const goldHeader = document.createElement('th');
        goldHeader.textContent = 'Gold';
        goldHeader.style.padding = '4px 2px';
        goldHeader.style.textAlign = 'right';
        goldHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        goldHeader.style.width = '70px';
        goldHeader.style.fontSize = '13px';
        
        headerRow.appendChild(rankHeader);
        headerRow.appendChild(nameHeader);
        headerRow.appendChild(goldHeader);
        table.appendChild(headerRow);
        
        // Add data rows
        this.leaderboardData.forEach((player, index) => {
            const row = document.createElement('tr');
            row.style.backgroundColor = index % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
            
            // Check if this is the current user and highlight them
            const isCurrentUser = this.gameUI.auth && 
                                this.gameUI.auth.getCurrentUser() && 
                                this.gameUI.auth.getCurrentUser().uid === player.id;
            
            if (isCurrentUser) {
                row.style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
            }
            
            // Rank cell
            const rankCell = document.createElement('td');
            rankCell.textContent = (index + 1).toString();
            rankCell.style.padding = '3px 2px';
            rankCell.style.textAlign = 'center';
            rankCell.style.fontSize = '13px';
            
            // Trophy icon for top 3
            if (index < 3) {
                if (index === 0) {
                    // 1st place - Gold trophy
                    rankCell.innerHTML = `<span style="color: gold;">&#127942;</span>`;
                } else if (index === 1) {
                    // 2nd place - Silver medal
                    rankCell.innerHTML = `<span style="color: silver;">&#129352;</span>`;
                } else if (index === 2) {
                    // 3rd place - Bronze medal
                    rankCell.innerHTML = `<span style="color: #cd7f32;">&#129353;</span>`;
                }
            }
            
            // Name cell
            const nameCell = document.createElement('td');
            nameCell.textContent = player.name;
            nameCell.style.padding = '3px 2px';
            nameCell.style.textAlign = 'left';
            nameCell.style.fontSize = '13px';
            nameCell.style.maxWidth = '120px';
            nameCell.style.overflow = 'hidden';
            nameCell.style.textOverflow = 'ellipsis';
            nameCell.style.whiteSpace = 'nowrap';
            
            // Gold cell
            const goldCell = document.createElement('td');
            goldCell.textContent = player.gold.toLocaleString();
            goldCell.style.padding = '3px 2px';
            goldCell.style.textAlign = 'right';
            goldCell.style.color = UI_CONSTANTS.COLORS.GOLD;
            goldCell.style.fontWeight = 'bold';
            goldCell.style.fontSize = '13px';
            
            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(goldCell);
            table.appendChild(row);
        });
        
        leaderboardContent.appendChild(table);
    }
    
    /**
     * Create the leaderboard menu UI
     */
    createLeaderboardMenu() {
        // Create menu using UIUtils for consistency with other menus
        const leaderboardMenu = UIUtils.createMenu('leaderboard-menu', 'Leaderboard', UI_CONSTANTS.COLORS.GOLD);
        
        // Create content container for the leaderboard
        const contentContainer = document.createElement('div');
        contentContainer.id = 'leaderboard-content';
        contentContainer.style.width = '100%';
        contentContainer.style.boxSizing = 'border-box'; // Include padding in width
        
        // Create loading message (will be replaced when data loads)
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'leaderboard-loading';
        loadingMsg.textContent = 'Loading leaderboard data...';
        loadingMsg.style.textAlign = 'center';
        loadingMsg.style.padding = '8px';
        loadingMsg.style.color = 'white';
        contentContainer.appendChild(loadingMsg);
        
        // Add content to menu
        leaderboardMenu.appendChild(contentContainer);
        
        return leaderboardMenu;
    }
}

export default LeaderboardComponent; 