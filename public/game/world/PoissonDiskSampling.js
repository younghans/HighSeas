/**
 * PoissonDiskSampling - Creates naturally distributed points with minimum distance constraints
 * Perfect for placing islands in a procedural ocean world
 */
class PoissonDiskSampling {
    constructor(options = {}) {
        this.width = options.width || 1000;
        this.height = options.height || 1000;
        this.minDistance = options.minDistance || 50;
        this.maxAttempts = options.maxAttempts || 30;
        this.random = options.random || Math.random; // Allow seeded random
        
        // Grid for fast neighbor lookup
        this.cellSize = this.minDistance / Math.sqrt(2);
        this.gridWidth = Math.ceil(this.width / this.cellSize);
        this.gridHeight = Math.ceil(this.height / this.cellSize);
        this.grid = new Array(this.gridWidth * this.gridHeight).fill(null);
        
        this.activePoints = [];
        this.points = [];
    }
    
    /**
     * Generate points using Poisson disk sampling
     * @returns {Array} Array of [x, y] coordinates
     */
    generate() {
        this.reset();
        
        // Start with a random point
        const firstPoint = [
            this.random() * this.width,
            this.random() * this.height
        ];
        
        this.addPoint(firstPoint);
        
        // Generate points until no more can be added
        while (this.activePoints.length > 0) {
            const randomIndex = Math.floor(this.random() * this.activePoints.length);
            const point = this.activePoints[randomIndex];
            
            let found = false;
            
            // Try to generate a new point around the selected point
            for (let i = 0; i < this.maxAttempts; i++) {
                const newPoint = this.generateAroundPoint(point);
                
                if (this.isValidPoint(newPoint)) {
                    this.addPoint(newPoint);
                    found = true;
                    break;
                }
            }
            
            // If no valid point was found, remove from active list
            if (!found) {
                this.activePoints.splice(randomIndex, 1);
            }
        }
        
        return this.points.slice(); // Return copy
    }
    
    /**
     * Generate a point in the annulus around a given point
     * @param {Array} point - [x, y] coordinates of the center point
     * @returns {Array} New [x, y] coordinates
     */
    generateAroundPoint(point) {
        // Generate point in annulus between minDistance and 2 * minDistance
        const radius = this.minDistance + this.random() * this.minDistance;
        const angle = this.random() * 2 * Math.PI;
        
        const x = point[0] + radius * Math.cos(angle);
        const y = point[1] + radius * Math.sin(angle);
        
        return [x, y];
    }
    
    /**
     * Check if a point is valid (within bounds and far enough from other points)
     * @param {Array} point - [x, y] coordinates to check
     * @returns {boolean} True if valid
     */
    isValidPoint(point) {
        const [x, y] = point;
        
        // Check bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        // Check distance to nearby points
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        
        // Check surrounding grid cells
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const neighborX = gridX + dx;
                const neighborY = gridY + dy;
                
                if (neighborX >= 0 && neighborX < this.gridWidth && 
                    neighborY >= 0 && neighborY < this.gridHeight) {
                    
                    const neighborIndex = neighborY * this.gridWidth + neighborX;
                    const neighbor = this.grid[neighborIndex];
                    
                    if (neighbor && this.distance(point, neighbor) < this.minDistance) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    /**
     * Add a point to the grid and active list
     * @param {Array} point - [x, y] coordinates
     */
    addPoint(point) {
        const [x, y] = point;
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        const gridIndex = gridY * this.gridWidth + gridX;
        
        this.grid[gridIndex] = point;
        this.activePoints.push(point);
        this.points.push(point);
    }
    
    /**
     * Calculate distance between two points
     * @param {Array} a - First point [x, y]
     * @param {Array} b - Second point [x, y]
     * @returns {number} Distance
     */
    distance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Reset the sampling state
     */
    reset() {
        this.grid.fill(null);
        this.activePoints = [];
        this.points = [];
    }
}

export default PoissonDiskSampling;
