/**
 * SeededRandom - Deterministic random number generator
 * Ensures consistent world generation across sessions
 */
class SeededRandom {
    constructor(seed = 12345) {
        this.seed = seed;
        this.current = seed;
    }
    
    /**
     * Generate next random number between 0 and 1
     * Uses a simple but effective LCG (Linear Congruential Generator)
     * @returns {number} Random number between 0 and 1
     */
    next() {
        // LCG formula: (a * seed + c) % m
        // Using values from Numerical Recipes
        this.current = (this.current * 1664525 + 1013904223) % 0x100000000;
        return this.current / 0x100000000;
    }
    
    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    
    /**
     * Generate random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float
     */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }
    
    /**
     * Generate random boolean
     * @param {number} probability - Probability of true (0-1)
     * @returns {boolean} Random boolean
     */
    nextBoolean(probability = 0.5) {
        return this.next() < probability;
    }
    
    /**
     * Choose random element from array
     * @param {Array} array - Array to choose from
     * @returns {*} Random element
     */
    choice(array) {
        return array[this.nextInt(0, array.length - 1)];
    }
    
    /**
     * Shuffle array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    /**
     * Generate random point in circle
     * @param {number} radius - Circle radius
     * @returns {Object} {x, y} coordinates
     */
    randomPointInCircle(radius) {
        const angle = this.next() * 2 * Math.PI;
        const r = Math.sqrt(this.next()) * radius;
        return {
            x: r * Math.cos(angle),
            y: r * Math.sin(angle)
        };
    }
    
    /**
     * Generate random point on circle perimeter
     * @param {number} radius - Circle radius
     * @returns {Object} {x, y} coordinates
     */
    randomPointOnCircle(radius) {
        const angle = this.next() * 2 * Math.PI;
        return {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
        };
    }
    
    /**
     * Reset to original seed
     */
    reset() {
        this.current = this.seed;
    }
    
    /**
     * Set new seed
     * @param {number} newSeed - New seed value
     */
    setSeed(newSeed) {
        this.seed = newSeed;
        this.current = newSeed;
    }
}

export default SeededRandom;
