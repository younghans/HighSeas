/**
 * PerformanceMonitor - Core performance tracking system
 * Tracks timing, memory usage, and object counts for debugging performance issues
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.enabled = false;
        this.updateInterval = 500; // ms
        this.lastUpdate = 0;
        this.frameCount = 0;
        this.fpsHistory = [];
        this.maxHistorySize = 100;
        
        // Performance thresholds (in milliseconds)
        this.thresholds = {
            fast: 16,    // < 16ms (60+ FPS equivalent)
            medium: 33,  // < 33ms (30+ FPS equivalent)
            slow: 100    // < 100ms (10+ FPS equivalent)
        };
        
        console.log('🔧 PerformanceMonitor initialized');
    }
    
    /**
     * Enable or disable performance monitoring
     * @param {boolean} enabled - Whether monitoring should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            console.log('📊 Performance monitoring enabled');
        } else {
            console.log('📊 Performance monitoring disabled');
        }
    }
    
    /**
     * Start timing an operation
     * @param {string} category - Category of the operation (e.g., 'islands', 'objects')
     * @param {string} operation - Specific operation name (e.g., 'meshGeneration', 'placement')
     * @returns {Object|null} Timer object or null if monitoring is disabled
     */
    startTimer(category, operation) {
        if (!this.enabled) return null;
        
        return {
            category,
            operation,
            startTime: performance.now(),
            startMemory: this.getMemoryUsage()
        };
    }
    
    /**
     * End timing an operation and record the results
     * @param {Object} timer - Timer object from startTimer()
     */
    endTimer(timer) {
        if (!timer || !this.enabled) return;
        
        const endTime = performance.now();
        const duration = endTime - timer.startTime;
        const endMemory = this.getMemoryUsage();
        const memoryDelta = {
            used: endMemory.used - timer.startMemory.used,
            total: endMemory.total - timer.startMemory.total
        };
        
        this.recordMetric(timer.category, timer.operation, {
            type: 'timing',
            duration,
            memoryDelta,
            timestamp: endTime
        });
    }
    
    /**
     * Track object counts for a category
     * @param {string} category - Category name
     * @param {number} count - Current object count
     * @param {string} subType - Optional sub-type for more granular tracking
     */
    trackObjectCount(category, count, subType = 'total') {
        if (!this.enabled) return;
        
        this.recordMetric(category, `objectCount_${subType}`, {
            type: 'count',
            count,
            timestamp: performance.now()
        });
    }
    
    /**
     * Track frame rate
     * @param {number} fps - Current FPS
     */
    trackFPS(fps) {
        if (!this.enabled) return;
        
        this.fpsHistory.push({
            fps,
            timestamp: performance.now()
        });
        
        // Keep only recent history
        if (this.fpsHistory.length > this.maxHistorySize) {
            this.fpsHistory.shift();
        }
        
        this.recordMetric('performance', 'fps', {
            type: 'fps',
            fps,
            timestamp: performance.now()
        });
    }
    
    /**
     * Get current memory usage information
     * @returns {Object} Memory usage data
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }
    
    /**
     * Record a metric in the internal storage
     * @param {string} category - Category name
     * @param {string} operation - Operation name
     * @param {Object} data - Metric data
     */
    recordMetric(category, operation, data) {
        const key = `${category}.${operation}`;
        
        if (!this.metrics.has(key)) {
            this.metrics.set(key, {
                samples: [],
                average: 0,
                min: Infinity,
                max: 0,
                total: 0,
                count: 0,
                category,
                operation,
                type: data.type || 'timing'
            });
        }
        
        const metric = this.metrics.get(key);
        metric.samples.push(data);
        
        // Keep only recent samples to prevent memory bloat
        if (metric.samples.length > this.maxHistorySize) {
            metric.samples.shift();
        }
        
        this.updateStatistics(metric);
    }
    
    /**
     * Update statistical information for a metric
     * @param {Object} metric - Metric object to update
     */
    updateStatistics(metric) {
        if (metric.samples.length === 0) return;
        
        const values = metric.samples.map(sample => {
            if (metric.type === 'timing') return sample.duration;
            if (metric.type === 'count') return sample.count;
            if (metric.type === 'fps') return sample.fps;
            return 0;
        });
        
        metric.count = values.length;
        metric.total = values.reduce((sum, val) => sum + val, 0);
        metric.average = metric.total / metric.count;
        metric.min = Math.min(...values);
        metric.max = Math.max(...values);
        
        // Calculate standard deviation for timing metrics
        if (metric.type === 'timing') {
            const squaredDiffs = values.map(val => Math.pow(val - metric.average, 2));
            metric.standardDeviation = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / metric.count);
        }
    }
    
    /**
     * Get performance category for a timing value
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Performance category ('fast', 'medium', 'slow', 'critical')
     */
    getPerformanceCategory(duration) {
        if (duration < this.thresholds.fast) return 'fast';
        if (duration < this.thresholds.medium) return 'medium';
        if (duration < this.thresholds.slow) return 'slow';
        return 'critical';
    }
    
    /**
     * Get color for performance category
     * @param {string} category - Performance category
     * @returns {string} CSS color
     */
    getPerformanceColor(category) {
        switch (category) {
            case 'fast': return '#00ff00';     // Green
            case 'medium': return '#ffff00';   // Yellow
            case 'slow': return '#ff6600';     // Orange
            case 'critical': return '#ff0000'; // Red
            default: return '#ffffff';        // White
        }
    }
    
    /**
     * Get all metrics data
     * @returns {Map} All metrics
     */
    getAllMetrics() {
        return this.metrics;
    }
    
    /**
     * Get metrics for a specific category
     * @param {string} category - Category name
     * @returns {Array} Array of metrics for the category
     */
    getMetricsByCategory(category) {
        const categoryMetrics = [];
        
        for (const [key, metric] of this.metrics) {
            if (metric.category === category) {
                categoryMetrics.push(metric);
            }
        }
        
        return categoryMetrics;
    }
    
    /**
     * Get summary statistics
     * @returns {Object} Summary data
     */
    getSummary() {
        const categories = {};
        let totalOperations = 0;
        let totalTime = 0;
        
        for (const [key, metric] of this.metrics) {
            if (!categories[metric.category]) {
                categories[metric.category] = {
                    operations: 0,
                    totalTime: 0,
                    averageTime: 0,
                    objectCount: 0
                };
            }
            
            if (metric.type === 'timing') {
                categories[metric.category].operations += metric.count;
                categories[metric.category].totalTime += metric.total;
                totalOperations += metric.count;
                totalTime += metric.total;
            } else if (metric.type === 'count' && metric.samples.length > 0) {
                const latestSample = metric.samples[metric.samples.length - 1];
                categories[metric.category].objectCount = latestSample.count;
            }
        }
        
        // Calculate averages
        for (const category in categories) {
            if (categories[category].operations > 0) {
                categories[category].averageTime = categories[category].totalTime / categories[category].operations;
            }
        }
        
        return {
            categories,
            totalOperations,
            totalTime,
            averageTime: totalOperations > 0 ? totalTime / totalOperations : 0,
            memoryUsage: this.getMemoryUsage(),
            fpsHistory: this.fpsHistory,
            currentFPS: this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1].fps : 0
        };
    }
    
    /**
     * Clear all metrics data
     */
    clearMetrics() {
        this.metrics.clear();
        this.fpsHistory = [];
        console.log('🗑️ Performance metrics cleared');
    }
    
    /**
     * Export metrics data for external analysis
     * @returns {Object} Exportable metrics data
     */
    exportMetrics() {
        const exportData = {
            timestamp: Date.now(),
            summary: this.getSummary(),
            metrics: {}
        };
        
        for (const [key, metric] of this.metrics) {
            exportData.metrics[key] = {
                category: metric.category,
                operation: metric.operation,
                type: metric.type,
                count: metric.count,
                average: metric.average,
                min: metric.min,
                max: metric.max,
                total: metric.total,
                standardDeviation: metric.standardDeviation || 0,
                recentSamples: metric.samples.slice(-10) // Last 10 samples
            };
        }
        
        return exportData;
    }
}

export default PerformanceMonitor;
