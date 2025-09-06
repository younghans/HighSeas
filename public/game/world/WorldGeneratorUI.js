import PerformanceMonitor from '../performance/PerformanceMonitor.js';
import PerformanceDebugPanel from '../ui/PerformanceDebugPanel.js';

/**
 * WorldGeneratorUI - User interface for configuring and testing procedural world generation
 */
class WorldGeneratorUI {
    constructor(worldGenerator) {
        this.worldGenerator = worldGenerator;
        this.isGenerating = false;
        
        // Initialize performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceDebugPanel = null;
        
        // Inject performance monitor into world generator
        this.worldGenerator.performanceMonitor = this.performanceMonitor;
        
        // Pass performance monitor to object generator too
        if (this.worldGenerator.islandObjectGenerator) {
            this.worldGenerator.islandObjectGenerator.performanceMonitor = this.performanceMonitor;
        }
    }
    
    /**
     * Create the world generator UI panel
     * @returns {HTMLElement} UI container element
     */
    createUI() {
        const container = document.createElement('div');
        container.id = 'worldGeneratorUI';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: min(380px, 35vw);
            min-width: 280px;
            max-width: 420px;
            max-height: calc(100vh - 20px);
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 13px;
            z-index: 1001;
            overflow-y: auto;
            box-sizing: border-box;
            border: 1px solid #555;
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
        `;
        
        const config = this.worldGenerator.getWorldConfig();
        
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <h2 style="margin: 0; font-size: 16px; color: #4CAF50;">
                    🌊 World Generator
                </h2>
                <button id="togglePanel" style="
                    background: none; 
                    border: 1px solid #555; 
                    color: white; 
                    border-radius: 4px; 
                    padding: 4px 8px; 
                    cursor: pointer; 
                    font-size: 12px;
                    transition: all 0.2s ease;
                " title="Toggle Panel">━</button>
            </div>
            
            <!-- World Seed -->
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">World Seed:</label>
                <div style="display: flex; gap: 8px;">
                    <input type="number" id="worldSeed" value="${config.worldSeed}" 
                           style="flex: 1; padding: 5px; font-size: 12px; border: none; border-radius: 3px;">
                    <button id="randomWorldSeed" style="padding: 5px 8px; background: #FF9800; color: white; border: none; border-radius: 3px; cursor: pointer;">🎲</button>
                </div>
            </div>
            
            <!-- World Size -->
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                    World Size: <span id="worldSizeDisplay">${(config.worldBounds.width/1000).toFixed(1)}km x ${(config.worldBounds.height/1000).toFixed(1)}km</span>
                </label>
                <select id="worldSize" style="width: 100%; padding: 5px; font-size: 12px; border: none; border-radius: 3px;">
                    <option value="10000" ${config.worldBounds.width === 10000 ? 'selected' : ''}>Small (10km x 10km)</option>
                    <option value="20000" ${config.worldBounds.width === 20000 ? 'selected' : ''}>Medium (20km x 20km)</option>
                    <option value="40000" ${config.worldBounds.width === 40000 ? 'selected' : ''}>Large (40km x 40km)</option>
                    <option value="80000" ${config.worldBounds.width === 80000 ? 'selected' : ''}>Huge (80km x 80km)</option>
                </select>
            </div>
            
            <!-- Island Density -->
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                    Island Density: <span id="densityDisplay">${Math.round(config.islandDensity * 100)}%</span>
                </label>
                <input type="range" id="islandDensity" min="0.1" max="0.8" step="0.05" value="${config.islandDensity}"
                       style="width: 100%; height: 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #ccc; margin-top: 2px;">
                    <span>Sparse</span><span>Dense</span>
                </div>
            </div>
            
            <!-- Island Distance -->
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Island Spacing:</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <div style="flex: 1;">
                        <label style="font-size: 11px; color: #ccc;">Min: <span id="minDistanceDisplay">${config.minIslandDistance}m</span></label>
                        <input type="range" id="minIslandDistance" min="500" max="2000" step="50" value="${config.minIslandDistance}"
                               style="width: 100%; height: 18px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 11px; color: #ccc;">Max: <span id="maxDistanceDisplay">${config.maxIslandDistance}m</span></label>
                        <input type="range" id="maxIslandDistance" min="800" max="3000" step="50" value="${config.maxIslandDistance}"
                               style="width: 100%; height: 18px;">
                    </div>
                </div>
            </div>
            
            <!-- Object Generation Toggle -->
            <div style="margin-bottom: 12px;">
                <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold;">
                    <input type="checkbox" id="generateObjects" checked style="margin-right: 8px;">
                    Generate Objects on Islands
                </label>
                <div style="font-size: 11px; color: #ccc; margin-top: 3px;">
                    Trees, rocks, and other objects based on island biomes
                </div>
            </div>
            
            <!-- LOD System Controls -->
            <div style="margin-bottom: 15px; border: 1px solid #555; padding: 10px; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px;">Level of Detail (LOD):</h3>
                
                <div style="margin-bottom: 8px;">
                    <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold;">
                        <input type="checkbox" id="lodEnabled" checked style="margin-right: 8px;">
                        Enable LOD System
                    </label>
                    <div style="font-size: 10px; color: #ccc; margin-top: 2px;">
                        Improves performance by loading/unloading content based on distance
                    </div>
                </div>
                
                <div style="margin-bottom: 8px;">
                    <label style="font-size: 11px; color: #ccc;">Island Render Distance: <span id="islandRenderDistanceDisplay">5000m</span></label>
                    <input type="range" id="islandRenderDistance" min="2000" max="10000" step="500" value="5000"
                           style="width: 100%; height: 16px;">
                </div>
                
                <div style="margin-bottom: 8px;">
                    <label style="font-size: 11px; color: #ccc;">Object Render Distance: <span id="objectRenderDistanceDisplay">2000m</span></label>
                    <input type="range" id="objectRenderDistance" min="500" max="5000" step="250" value="2000"
                           style="width: 100%; height: 16px;">
                </div>
            </div>
            
            <!-- Island Types Distribution -->
            <div style="margin-bottom: 15px; border: 1px solid #555; padding: 10px; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px;">Island Types:</h3>
                <div id="templateDistribution">
                    ${this.createTemplateDistributionHTML(config.availableTemplates)}
                </div>
            </div>
            
            <!-- Generation Controls -->
            <div style="margin-bottom: 15px;">
                <button id="generateWorld" style="width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
                    🌍 Generate World
                </button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="clearWorld" style="width: 100%; padding: 8px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                    🗑️ Clear World
                </button>
            </div>
            
            <!-- Generation Progress -->
            <div id="generationProgress" style="display: none; margin-bottom: 15px;">
                <div style="background: #333; border-radius: 10px; overflow: hidden; height: 20px;">
                    <div id="progressBar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
                <div id="progressText" style="text-align: center; margin-top: 5px; font-size: 11px; color: #ccc;"></div>
            </div>
            
            <!-- World Statistics -->
            <div id="worldStats" style="border: 1px solid #555; padding: 10px; border-radius: 5px; background: rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 8px 0; font-size: 14px;">World Statistics:</h3>
                <div id="statsContent" style="font-size: 11px; color: #ccc;">
                    <div>No world generated yet</div>
                </div>
            </div>
            
            <!-- Performance Monitoring -->
            <div id="performanceSection" style="border: 1px solid #555; padding: 10px; border-radius: 5px; background: rgba(0,0,0,0.3); margin-top: 12px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #ff9900;">🔧 Performance Monitor</h3>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <button id="togglePerformanceMonitoring" style="
                        flex: 1;
                        padding: 6px 10px;
                        background: #333;
                        color: white;
                        border: 1px solid #555;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                        transition: background-color 0.3s;
                    ">Enable Monitoring</button>
                    <button id="showPerformancePanel" style="
                        flex: 1;
                        padding: 6px 10px;
                        background: #4CAF50;
                        color: white;
                        border: 1px solid #555;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                        transition: background-color 0.3s;
                    ">Show Panel</button>
                </div>
                <div id="performanceStatus" style="font-size: 11px; color: #ccc;">
                    <div>Monitoring: <span id="monitoringStatus" style="color: #ff0000;">Disabled</span></div>
                    <div>Panel: <span id="panelStatus" style="color: #666;">Hidden</span></div>
                </div>
            </div>
        `;
        
        this.setupEventListeners(container);
        this.setupResponsiveFeatures(container);
        return container;
    }
    
    /**
     * Setup responsive features for different screen sizes
     * @param {HTMLElement} container - UI container element
     */
    setupResponsiveFeatures(container) {
        // Add responsive behavior for small screens
        const updateResponsiveLayout = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            if (screenWidth <= 768) {
                // Mobile/tablet layout
                container.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                    max-width: none;
                    min-width: auto;
                    max-height: calc(100vh - 20px);
                    background-color: rgba(0, 0, 0, 0.95);
                    color: white;
                    padding: 12px;
                    border-radius: 8px;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 12px;
                    z-index: 1001;
                    overflow-y: auto;
                    box-sizing: border-box;
                    border: 1px solid #555;
                    backdrop-filter: blur(5px);
                    transition: all 0.3s ease;
                `;
            } else if (screenWidth <= 1024) {
                // Tablet landscape layout
                container.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: min(340px, 30vw);
                    min-width: 280px;
                    max-width: 380px;
                    max-height: calc(100vh - 20px);
                    background-color: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 13px;
                    z-index: 1001;
                    overflow-y: auto;
                    box-sizing: border-box;
                    border: 1px solid #555;
                    backdrop-filter: blur(5px);
                    transition: all 0.3s ease;
                `;
            } else {
                // Desktop layout (default)
                container.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: min(380px, 35vw);
                    min-width: 280px;
                    max-width: 420px;
                    max-height: calc(100vh - 20px);
                    background-color: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 13px;
                    z-index: 1001;
                    overflow-y: auto;
                    box-sizing: border-box;
                    border: 1px solid #555;
                    backdrop-filter: blur(5px);
                    transition: all 0.3s ease;
                `;
            }
        };
        
        // Apply initial layout
        updateResponsiveLayout();
        
        // Update layout on window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateResponsiveLayout, 150);
        });
        
        // Add collapse/expand functionality for mobile
        if (window.innerWidth <= 768) {
            this.addMobileCollapseFunctionality(container);
        }
    }
    
    /**
     * Add collapse/expand functionality for mobile devices
     * @param {HTMLElement} container - UI container element
     */
    addMobileCollapseFunctionality(container) {
        const header = container.querySelector('h2');
        if (!header) return;
        
        // Add collapse indicator
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        header.innerHTML = header.innerHTML + ' <span style="float: right; font-size: 14px;">▼</span>';
        
        let isCollapsed = false;
        const content = Array.from(container.children).slice(1); // All children except header
        
        header.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            const indicator = header.querySelector('span');
            
            if (isCollapsed) {
                content.forEach(el => el.style.display = 'none');
                indicator.textContent = '▶';
                container.style.maxHeight = '60px';
            } else {
                content.forEach(el => el.style.display = '');
                indicator.textContent = '▼';
                container.style.maxHeight = 'calc(100vh - 20px)';
            }
        });
    }
    
    /**
     * Create HTML for template distribution display
     * @param {Array} templates - Available island templates
     * @returns {string} HTML string
     */
    createTemplateDistributionHTML(templates) {
        return templates.map(template => {
            const probability = (template.weight / templates.reduce((sum, t) => sum + t.weight, 0) * 100).toFixed(1);
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                    <span style="font-size: 11px;">${template.name}</span>
                    <span style="font-size: 11px; color: #4CAF50;">${probability}%</span>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Setup event listeners for UI controls
     * @param {HTMLElement} container - UI container
     */
    setupEventListeners(container) {
        // Panel Toggle
        const toggleButton = container.querySelector('#togglePanel');
        const content = Array.from(container.children).slice(1); // All children except header div
        let isPanelCollapsed = false;
        
        toggleButton.addEventListener('click', () => {
            isPanelCollapsed = !isPanelCollapsed;
            
            if (isPanelCollapsed) {
                content.forEach(el => el.style.display = 'none');
                toggleButton.textContent = '+';
                toggleButton.title = 'Expand Panel';
                container.style.width = 'auto';
                container.style.minWidth = 'auto';
            } else {
                content.forEach(el => el.style.display = '');
                toggleButton.textContent = '━';
                toggleButton.title = 'Collapse Panel';
                // Restore responsive width
                const screenWidth = window.innerWidth;
                if (screenWidth <= 768) {
                    container.style.width = 'auto';
                } else if (screenWidth <= 1024) {
                    container.style.width = 'min(340px, 30vw)';
                } else {
                    container.style.width = 'min(380px, 35vw)';
                }
                container.style.minWidth = '280px';
            }
        });
        
        // World Seed
        container.querySelector('#worldSeed').addEventListener('change', (e) => {
            const seed = parseInt(e.target.value) || Date.now();
            this.updateWorldConfig({ worldSeed: seed });
        });
        
        container.querySelector('#randomWorldSeed').addEventListener('click', () => {
            const newSeed = Date.now();
            container.querySelector('#worldSeed').value = newSeed;
            this.updateWorldConfig({ worldSeed: newSeed });
        });
        
        // World Size
        container.querySelector('#worldSize').addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            container.querySelector('#worldSizeDisplay').textContent = `${(size/1000).toFixed(1)}km x ${(size/1000).toFixed(1)}km`;
            this.updateWorldConfig({ 
                worldBounds: { width: size, height: size }
            });
        });
        
        // Island Density
        container.querySelector('#islandDensity').addEventListener('input', (e) => {
            const density = parseFloat(e.target.value);
            container.querySelector('#densityDisplay').textContent = `${Math.round(density * 100)}%`;
            this.updateWorldConfig({ islandDensity: density });
        });
        
        // Island Distance
        container.querySelector('#minIslandDistance').addEventListener('input', (e) => {
            const distance = parseInt(e.target.value);
            container.querySelector('#minDistanceDisplay').textContent = `${distance}m`;
            this.updateWorldConfig({ minIslandDistance: distance });
        });
        
        container.querySelector('#maxIslandDistance').addEventListener('input', (e) => {
            const distance = parseInt(e.target.value);
            container.querySelector('#maxDistanceDisplay').textContent = `${distance}m`;
            this.updateWorldConfig({ maxIslandDistance: distance });
        });
        
        // LOD Controls
        container.querySelector('#lodEnabled').addEventListener('change', (e) => {
            this.updateWorldConfig({ lodEnabled: e.target.checked });
        });
        
        container.querySelector('#islandRenderDistance').addEventListener('input', (e) => {
            const distance = parseInt(e.target.value);
            container.querySelector('#islandRenderDistanceDisplay').textContent = `${distance}m`;
            this.updateWorldConfig({ maxIslandRenderDistance: distance });
        });
        
        container.querySelector('#objectRenderDistance').addEventListener('input', (e) => {
            const distance = parseInt(e.target.value);
            container.querySelector('#objectRenderDistanceDisplay').textContent = `${distance}m`;
            this.updateWorldConfig({ maxObjectRenderDistance: distance });
        });
        
        // Generation Controls
        container.querySelector('#generateWorld').addEventListener('click', () => {
            this.generateWorld();
        });
        
        container.querySelector('#clearWorld').addEventListener('click', () => {
            this.clearWorld();
        });
        
        // Performance Monitoring Controls
        container.querySelector('#togglePerformanceMonitoring').addEventListener('click', () => {
            this.togglePerformanceMonitoring(container);
        });
        
        container.querySelector('#showPerformancePanel').addEventListener('click', () => {
            this.showPerformancePanel(container);
        });
    }
    
    /**
     * Update world configuration
     * @param {Object} config - Configuration changes
     */
    updateWorldConfig(config) {
        const needsRegeneration = this.worldGenerator.updateWorldConfig(config);
        
        if (needsRegeneration) {
            this.updateWorldStats();
        }
    }
    
    /**
     * Generate the procedural world
     */
    async generateWorld() {
        if (this.isGenerating) {
            console.log('World generation already in progress...');
            return;
        }
        
        this.isGenerating = true;
        
        const generateButton = document.querySelector('#generateWorld');
        const progressDiv = document.querySelector('#generationProgress');
        const progressBar = document.querySelector('#progressBar');
        const progressText = document.querySelector('#progressText');
        
        // Update UI state
        generateButton.disabled = true;
        generateButton.textContent = '⏳ Generating...';
        progressDiv.style.display = 'block';
        
        try {
            // Setup progress tracking
            let currentStep = 0;
            const totalSteps = 4;
            
            const updateProgress = (step, message) => {
                const percentage = (step / totalSteps) * 100;
                progressBar.style.width = `${percentage}%`;
                progressText.textContent = message;
            };
            
            updateProgress(0, 'Initializing world generation...');
            await this.delay(100);
            
            updateProgress(1, 'Generating island layout...');
            await this.delay(200);
            
            updateProgress(2, 'Assigning island templates...');
            await this.delay(200);
            
            updateProgress(3, 'Creating 3D terrain...');
            
            // Generate the world
            const result = await this.worldGenerator.generateWorld();
            
            updateProgress(4, `Complete! Generated ${result.islands.length} islands`);
            
            // Update statistics
            this.updateWorldStats(result.metadata);
            
            // Hide progress after a moment
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error('World generation failed:', error);
            progressText.textContent = 'Generation failed! Check console for details.';
            progressBar.style.backgroundColor = '#f44336';
        } finally {
            this.isGenerating = false;
            generateButton.disabled = false;
            generateButton.textContent = '🌍 Generate World';
        }
    }
    
    /**
     * Clear the generated world
     */
    clearWorld() {
        this.worldGenerator.clearGeneratedWorld();
        this.updateWorldStats();
        console.log('🗑️ World cleared');
    }
    
    /**
     * Update world statistics display
     * @param {Object} metadata - World metadata
     */
    updateWorldStats(metadata = null) {
        const statsContent = document.querySelector('#statsContent');
        
        if (!metadata) {
            statsContent.innerHTML = '<div>No world generated yet</div>';
            return;
        }
        
        const biomeStats = Object.entries(metadata.biomeDistribution)
            .map(([biome, count]) => `<div>${biome}: ${count} islands</div>`)
            .join('');
        
        // Calculate object statistics if available
        let objectStats = '';
        if (metadata.objectStats) {
            const totalObjects = metadata.objectStats.totalObjects || 0;
            objectStats = `
                <div style="margin-top: 8px;"><strong>Objects Generated:</strong></div>
                <div style="margin-left: 10px; font-size: 10px;">
                    <div>Total: ${totalObjects} objects</div>
                    <div>Average per island: ${totalObjects > 0 ? Math.round(totalObjects / metadata.totalIslands) : 0}</div>
                </div>
            `;
        }
        
        // Calculate LOD statistics if available
        let lodStats = '';
        if (metadata.lodStats) {
            lodStats = `
                <div style="margin-top: 8px;"><strong>LOD Performance:</strong></div>
                <div style="margin-left: 10px; font-size: 10px;">
                    <div>Loaded islands: ${metadata.lodStats.loadedIslands}/${metadata.lodStats.totalIslands}</div>
                    <div>Islands with objects: ${metadata.lodStats.islandsWithObjects}</div>
                    <div>Island range: ${metadata.lodStats.maxIslandRenderDistance}m</div>
                    <div>Object range: ${metadata.lodStats.maxObjectRenderDistance}m</div>
                </div>
            `;
        }
        
        statsContent.innerHTML = `
            <div><strong>Total Islands:</strong> ${metadata.totalIslands}</div>
            <div><strong>World Seed:</strong> ${metadata.seed}</div>
            <div><strong>Generated:</strong> ${new Date(metadata.generatedAt).toLocaleTimeString()}</div>
            <div style="margin-top: 8px;"><strong>Biome Distribution:</strong></div>
            <div style="margin-left: 10px; font-size: 10px;">${biomeStats}</div>
            ${objectStats}
            ${lodStats}
        `;
    }
    
    /**
     * Simple delay utility
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Toggle performance monitoring on/off
     * @param {HTMLElement} container - UI container element
     */
    togglePerformanceMonitoring(container) {
        const isEnabled = this.performanceMonitor.enabled;
        this.performanceMonitor.setEnabled(!isEnabled);
        
        // Update UI elements
        const toggleBtn = container.querySelector('#togglePerformanceMonitoring');
        const monitoringStatus = container.querySelector('#monitoringStatus');
        
        if (this.performanceMonitor.enabled) {
            toggleBtn.textContent = 'Disable Monitoring';
            toggleBtn.style.background = '#ff6600';
            monitoringStatus.textContent = 'Enabled';
            monitoringStatus.style.color = '#00ff00';
        } else {
            toggleBtn.textContent = 'Enable Monitoring';
            toggleBtn.style.background = '#333';
            monitoringStatus.textContent = 'Disabled';
            monitoringStatus.style.color = '#ff0000';
        }
    }
    
    /**
     * Show/hide the performance debug panel
     * @param {HTMLElement} container - UI container element
     */
    showPerformancePanel(container) {
        if (!this.performanceDebugPanel) {
            // Create the performance debug panel
            this.performanceDebugPanel = new PerformanceDebugPanel(null, this.performanceMonitor);
        }
        
        const panelStatus = container.querySelector('#panelStatus');
        const showBtn = container.querySelector('#showPerformancePanel');
        
        if (this.performanceDebugPanel.isVisible) {
            this.performanceDebugPanel.hide();
            showBtn.textContent = 'Show Panel';
            panelStatus.textContent = 'Hidden';
            panelStatus.style.color = '#666';
        } else {
            this.performanceDebugPanel.show();
            showBtn.textContent = 'Hide Panel';
            panelStatus.textContent = 'Visible';
            panelStatus.style.color = '#00ff00';
        }
    }
}

export default WorldGeneratorUI;
