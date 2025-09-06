import UI_CONSTANTS from './UIConstants.js';

/**
 * PerformanceDebugPanel - UI component for displaying performance metrics
 * Integrates with PerformanceMonitor to show real-time performance data
 */
class PerformanceDebugPanel {
    constructor(gameUI, performanceMonitor) {
        this.gameUI = gameUI;
        this.performanceMonitor = performanceMonitor;
        this.panel = null;
        this.toggleButton = null;
        this.sections = new Map();
        this.isVisible = false;
        this.updateInterval = 1000; // Update every second
        this.updateTimer = null;
        
        this.init();
    }
    
    /**
     * Initialize the debug panel
     */
    init() {
        this.createToggleButton();
        this.createPanel();
        this.createSections();
        this.startUpdateLoop();
        
        console.log('🔧 PerformanceDebugPanel initialized');
    }
    
    /**
     * Create the toggle button
     */
    createToggleButton() {
        this.toggleButton = document.createElement('button');
        this.toggleButton.id = 'performance-debug-toggle';
        this.toggleButton.textContent = '📊 Performance';
        this.toggleButton.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            border: 1px solid #333;
            border-radius: 4px;
            cursor: pointer;
            font-family: monospace;
            font-size: 12px;
            z-index: ${UI_CONSTANTS.STYLES.Z_INDEX.DEBUG};
            transition: background-color 0.3s;
        `;
        
        this.toggleButton.addEventListener('click', () => this.toggle());
        this.toggleButton.addEventListener('mouseenter', () => {
            this.toggleButton.style.background = 'rgba(0, 255, 0, 0.2)';
        });
        this.toggleButton.addEventListener('mouseleave', () => {
            this.toggleButton.style.background = 'rgba(0, 0, 0, 0.8)';
        });
        
        document.body.appendChild(this.toggleButton);
    }
    
    /**
     * Create the main panel
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'performance-debug-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 85vh;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 11px;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #333;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            z-index: ${UI_CONSTANTS.STYLES.Z_INDEX.DEBUG + 1};
            display: none;
            backdrop-filter: blur(2px);
        `;
        
        // Add header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #333;
        `;
        
        const title = document.createElement('h3');
        title.textContent = '📊 Performance Monitor';
        title.style.cssText = `
            margin: 0;
            color: #00ff00;
            font-size: 14px;
        `;
        
        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 5px;';
        
        // Enable/Disable monitoring button
        const enableBtn = document.createElement('button');
        enableBtn.id = 'enable-monitoring-btn';
        enableBtn.textContent = this.performanceMonitor.enabled ? 'Disable' : 'Enable';
        enableBtn.style.cssText = `
            padding: 4px 8px;
            background: ${this.performanceMonitor.enabled ? '#ff6600' : '#333'};
            color: white;
            border: 1px solid #555;
            border-radius: 3px;
            cursor: pointer;
            font-family: monospace;
            font-size: 10px;
        `;
        enableBtn.addEventListener('click', () => this.toggleMonitoring());
        
        // Clear metrics button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.style.cssText = `
            padding: 4px 8px;
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 3px;
            cursor: pointer;
            font-family: monospace;
            font-size: 10px;
        `;
        clearBtn.addEventListener('click', () => this.clearMetrics());
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            padding: 4px 8px;
            background: #ff3333;
            color: white;
            border: 1px solid #555;
            border-radius: 3px;
            cursor: pointer;
            font-family: monospace;
            font-size: 10px;
        `;
        closeBtn.addEventListener('click', () => this.hide());
        
        controls.appendChild(enableBtn);
        controls.appendChild(clearBtn);
        controls.appendChild(closeBtn);
        
        header.appendChild(title);
        header.appendChild(controls);
        this.panel.appendChild(header);
        
        document.body.appendChild(this.panel);
    }
    
    /**
     * Create all sections of the panel
     */
    createSections() {
        const sections = [
            { id: 'overview', title: '📈 Overview', color: '#00ff00' },
            { id: 'islands', title: '🏝️ Islands', color: '#ffff00' },
            { id: 'objects', title: '🌲 Objects', color: '#ff9900' },
            { id: 'lod', title: '👁️ LOD System', color: '#00ffff' },
            { id: 'memory', title: '🧠 Memory', color: '#ff6600' }
        ];
        
        sections.forEach(section => {
            const sectionDiv = this.createSection(section.id, section.title, section.color);
            this.panel.appendChild(sectionDiv);
            this.sections.set(section.id, sectionDiv);
        });
    }
    
    /**
     * Create a section in the panel
     * @param {string} id - Section ID
     * @param {string} title - Section title
     * @param {string} color - Section color
     * @returns {HTMLElement} Section element
     */
    createSection(id, title, color) {
        const section = document.createElement('div');
        section.id = `perf-section-${id}`;
        section.style.cssText = `
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #333;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.3);
        `;
        
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `
            color: ${color};
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 12px;
            border-bottom: 1px solid #333;
            padding-bottom: 4px;
        `;
        titleDiv.textContent = title;
        
        const content = document.createElement('div');
        content.id = `perf-content-${id}`;
        content.style.cssText = `
            color: #cccccc;
            line-height: 1.4;
        `;
        
        section.appendChild(titleDiv);
        section.appendChild(content);
        
        return section;
    }
    
    /**
     * Toggle the panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Show the panel
     */
    show() {
        this.panel.style.display = 'block';
        this.isVisible = true;
        this.toggleButton.style.background = 'rgba(0, 255, 0, 0.3)';
        this.update(); // Immediate update when shown
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.panel.style.display = 'none';
        this.isVisible = false;
        this.toggleButton.style.background = 'rgba(0, 0, 0, 0.8)';
    }
    
    /**
     * Toggle monitoring on/off
     */
    toggleMonitoring() {
        this.performanceMonitor.setEnabled(!this.performanceMonitor.enabled);
        
        const enableBtn = document.getElementById('enable-monitoring-btn');
        enableBtn.textContent = this.performanceMonitor.enabled ? 'Disable' : 'Enable';
        enableBtn.style.background = this.performanceMonitor.enabled ? '#ff6600' : '#333';
        
        // Update button color to indicate monitoring status
        this.toggleButton.style.color = this.performanceMonitor.enabled ? '#00ff00' : '#666666';
    }
    
    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.performanceMonitor.clearMetrics();
        this.update();
    }
    
    /**
     * Start the update loop
     */
    startUpdateLoop() {
        this.updateTimer = setInterval(() => {
            if (this.isVisible && this.performanceMonitor.enabled) {
                this.update();
            }
        }, this.updateInterval);
    }
    
    /**
     * Stop the update loop
     */
    stopUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * Update all sections with current data
     */
    update() {
        if (!this.isVisible) return;
        
        const summary = this.performanceMonitor.getSummary();
        
        this.updateOverviewSection(summary);
        this.updateIslandsSection(summary);
        this.updateObjectsSection(summary);
        this.updateLODSection(summary);
        this.updateMemorySection(summary);
    }
    
    /**
     * Update the overview section
     * @param {Object} summary - Performance summary data
     */
    updateOverviewSection(summary) {
        const content = document.getElementById('perf-content-overview');
        if (!content) return;
        
        const fps = summary.currentFPS || 0;
        const fpsColor = this.getFPSColor(fps);
        const avgTime = summary.averageTime.toFixed(2);
        const timeColor = this.performanceMonitor.getPerformanceColor(
            this.performanceMonitor.getPerformanceCategory(summary.averageTime)
        );
        
        content.innerHTML = `
            <div>FPS: <span style="color: ${fpsColor}; font-weight: bold;">${fps}</span></div>
            <div>Total Operations: <span style="color: #ffff00;">${summary.totalOperations}</span></div>
            <div>Total Time: <span style="color: ${timeColor};">${summary.totalTime.toFixed(2)}ms</span></div>
            <div>Avg Time/Op: <span style="color: ${timeColor};">${avgTime}ms</span></div>
            <div>Monitoring: <span style="color: ${this.performanceMonitor.enabled ? '#00ff00' : '#ff0000'};">
                ${this.performanceMonitor.enabled ? 'Enabled' : 'Disabled'}
            </span></div>
        `;
    }
    
    /**
     * Update the islands section
     * @param {Object} summary - Performance summary data
     */
    updateIslandsSection(summary) {
        const content = document.getElementById('perf-content-islands');
        if (!content) return;
        
        const islandMetrics = this.performanceMonitor.getMetricsByCategory('islands');
        let html = '';
        
        if (islandMetrics.length === 0) {
            html = '<div style="color: #666;">No island metrics yet</div>';
        } else {
            islandMetrics.forEach(metric => {
                const color = this.performanceMonitor.getPerformanceColor(
                    this.performanceMonitor.getPerformanceCategory(metric.average)
                );
                const operationName = metric.operation.replace(/([A-Z])/g, ' $1').toLowerCase();
                
                html += `
                    <div>${operationName}:</div>
                    <div style="margin-left: 10px; color: ${color};">
                        Avg: ${metric.average.toFixed(2)}ms (${metric.count} ops)
                    </div>
                    <div style="margin-left: 10px; font-size: 10px; color: #888;">
                        Min: ${metric.min.toFixed(2)}ms | Max: ${metric.max.toFixed(2)}ms
                    </div>
                `;
            });
        }
        
        // Add current object counts if available
        const islandCategory = summary.categories.islands;
        if (islandCategory && islandCategory.objectCount > 0) {
            html += `<div style="margin-top: 8px; color: #ffff00;">Islands: ${islandCategory.objectCount}</div>`;
        }
        
        content.innerHTML = html;
    }
    
    /**
     * Update the objects section
     * @param {Object} summary - Performance summary data
     */
    updateObjectsSection(summary) {
        const content = document.getElementById('perf-content-objects');
        if (!content) return;
        
        const objectMetrics = this.performanceMonitor.getMetricsByCategory('objects');
        let html = '';
        
        if (objectMetrics.length === 0) {
            html = '<div style="color: #666;">No object metrics yet</div>';
        } else {
            objectMetrics.forEach(metric => {
                if (metric.operation.startsWith('objectCount_')) {
                    const type = metric.operation.replace('objectCount_', '');
                    const latestCount = metric.samples.length > 0 ? 
                        metric.samples[metric.samples.length - 1].count : 0;
                    html += `<div style="color: #ffff00;">${type}: ${latestCount}</div>`;
                } else {
                    const color = this.performanceMonitor.getPerformanceColor(
                        this.performanceMonitor.getPerformanceCategory(metric.average)
                    );
                    const operationName = metric.operation.replace(/([A-Z])/g, ' $1').toLowerCase();
                    
                    html += `
                        <div>${operationName}:</div>
                        <div style="margin-left: 10px; color: ${color};">
                            Avg: ${metric.average.toFixed(2)}ms (${metric.count} ops)
                        </div>
                        <div style="margin-left: 10px; font-size: 10px; color: #888;">
                            Min: ${metric.min.toFixed(2)}ms | Max: ${metric.max.toFixed(2)}ms
                        </div>
                    `;
                }
            });
        }
        
        content.innerHTML = html;
    }
    
    /**
     * Update the LOD section
     * @param {Object} summary - Performance summary data
     */
    updateLODSection(summary) {
        const content = document.getElementById('perf-content-lod');
        if (!content) return;
        
        const lodMetrics = this.performanceMonitor.getMetricsByCategory('lod');
        let html = '';
        
        if (lodMetrics.length === 0) {
            html = '<div style="color: #666;">No LOD metrics yet</div>';
        } else {
            lodMetrics.forEach(metric => {
                const color = this.performanceMonitor.getPerformanceColor(
                    this.performanceMonitor.getPerformanceCategory(metric.average)
                );
                const operationName = metric.operation.replace(/([A-Z])/g, ' $1').toLowerCase();
                
                html += `
                    <div>${operationName}:</div>
                    <div style="margin-left: 10px; color: ${color};">
                        Avg: ${metric.average.toFixed(2)}ms (${metric.count} ops)
                    </div>
                `;
            });
        }
        
        content.innerHTML = html;
    }
    
    /**
     * Update the memory section
     * @param {Object} summary - Performance summary data
     */
    updateMemorySection(summary) {
        const content = document.getElementById('perf-content-memory');
        if (!content) return;
        
        const memory = summary.memoryUsage;
        const usedMB = (memory.used / 1024 / 1024).toFixed(1);
        const totalMB = (memory.total / 1024 / 1024).toFixed(1);
        const limitMB = (memory.limit / 1024 / 1024).toFixed(1);
        const usagePercent = memory.limit > 0 ? ((memory.used / memory.limit) * 100).toFixed(1) : 0;
        
        const memoryColor = usagePercent > 80 ? '#ff0000' : 
                           usagePercent > 60 ? '#ff6600' : 
                           usagePercent > 40 ? '#ffff00' : '#00ff00';
        
        content.innerHTML = `
            <div>Used: <span style="color: ${memoryColor};">${usedMB} MB</span></div>
            <div>Total: <span style="color: #ffff00;">${totalMB} MB</span></div>
            <div>Limit: <span style="color: #cccccc;">${limitMB} MB</span></div>
            <div>Usage: <span style="color: ${memoryColor};">${usagePercent}%</span></div>
        `;
    }
    
    /**
     * Get color for FPS value
     * @param {number} fps - FPS value
     * @returns {string} CSS color
     */
    getFPSColor(fps) {
        if (fps >= 60) return '#00ff00';      // Green
        if (fps >= 30) return '#ffff00';      // Yellow
        if (fps >= 15) return '#ff6600';      // Orange
        return '#ff0000';                     // Red
    }
    
    /**
     * Cleanup when destroying the panel
     */
    destroy() {
        this.stopUpdateLoop();
        
        if (this.panel) {
            this.panel.remove();
        }
        
        if (this.toggleButton) {
            this.toggleButton.remove();
        }
        
        console.log('🗑️ PerformanceDebugPanel destroyed');
    }
}

export default PerformanceDebugPanel;
