/**
 * Perlin Noise implementation for Three.js
 * Based on the classic Perlin noise algorithm
 */
class PerlinNoise {
    constructor(seed = Math.floor(Math.random() * 65536)) {
        this.seed = seed;
        this.p = new Array(512);
        this.permutation = this._buildPermutationTable(seed);
        
        // Extend the permutation table
        for(let i = 0; i < 256; i++) {
            this.p[i] = this.permutation[i];
            this.p[256 + i] = this.permutation[i];
        }
    }
    
    /**
     * Build a permutation table based on the seed
     */
    _buildPermutationTable(seed) {
        let permutation = new Array(256);
        
        // Initialize array with indices
        for(let i = 0; i < 256; i++) {
            permutation[i] = i;
        }
        
        // Shuffle array using the seed
        let random = this._seededRandom(seed);
        for(let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
        }
        
        return permutation;
    }
    
    /**
     * Create a seeded random number generator
     */
    _seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    /**
     * Fade function for smoother interpolation
     */
    _fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    /**
     * Linear interpolation
     */
    _lerp(t, a, b) {
        return a + t * (b - a);
    }
    
    /**
     * Gradient function
     */
    _grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    /**
     * 3D Perlin noise function
     */
    noise(x, y, z = 0) {
        // Find unit cube that contains the point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        // Find relative x, y, z of point in cube
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        // Compute fade curves for each of x, y, z
        const u = this._fade(x);
        const v = this._fade(y);
        const w = this._fade(z);
        
        // Hash coordinates of the 8 cube corners
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;
        
        // Add blended results from 8 corners of cube
        return this._lerp(w, 
            this._lerp(v, 
                this._lerp(u, 
                    this._grad(this.p[AA], x, y, z),
                    this._grad(this.p[BA], x - 1, y, z)
                ),
                this._lerp(u, 
                    this._grad(this.p[AB], x, y - 1, z),
                    this._grad(this.p[BB], x - 1, y - 1, z)
                )
            ),
            this._lerp(v, 
                this._lerp(u, 
                    this._grad(this.p[AA + 1], x, y, z - 1),
                    this._grad(this.p[BA + 1], x - 1, y, z - 1)
                ),
                this._lerp(u, 
                    this._grad(this.p[AB + 1], x, y - 1, z - 1),
                    this._grad(this.p[BB + 1], x - 1, y - 1, z - 1)
                )
            )
        );
    }
    
    /**
     * 2D Perlin noise function (wrapper for the 3D function)
     */
    perlin(x, y) {
        return this.noise(x, y, 0);
    }
    
    /**
     * Generate fractal noise (multiple octaves of Perlin noise)
     */
    fractal(x, y, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for(let i = 0; i < octaves; i++) {
            total += this.perlin(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return total / maxValue;
    }
}

export default PerlinNoise; 