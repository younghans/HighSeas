/**
 * IslandTemplate - Defines templates for different island types and biomes
 * Makes it easy to add new island varieties in the future
 */
class IslandTemplate {
    constructor() {
        this.templates = new Map();
        this.initializeDefaultTemplates();
    }
    
    /**
     * Initialize the default island templates
     */
    initializeDefaultTemplates() {
        // Forest Islands - Dense with trees
        this.addTemplate('forest', {
            name: 'Forest Island',
            description: 'Lush forest island with abundant wood resources',
            weight: 30, // Relative spawn probability
            sizeRange: { min: 200, max: 400 },
            parameters: {
                noiseScale: { min: 0.008, max: 0.012 },
                noiseHeight: { min: 60, max: 80 },
                falloffCurve: { min: 1.5, max: 3.0 },
                enableVertexCulling: true,
                waterLevel: 0
            },
            objectConfig: {
                density: { min: 0.3, max: 0.5 },
                distribution: {
                    firTreeLarge: 35,
                    firTreeMedium: 45,
                    firTreeSmall: 20
                }
            },
            biome: {
                primaryColor: 0x2d5a27, // Dark green
                secondaryColor: 0x8B4513, // Brown
                climate: 'temperate'
            }
        });
        
        // Rock Islands - Sparse, mountainous
        this.addTemplate('rocky', {
            name: 'Rocky Island',
            description: 'Mountainous island rich in stone and minerals',
            weight: 25,
            sizeRange: { min: 150, max: 350 },
            parameters: {
                noiseScale: { min: 0.006, max: 0.010 },
                noiseHeight: { min: 80, max: 120 },
                falloffCurve: { min: 2.0, max: 4.0 },
                enableVertexCulling: true,
                waterLevel: 0
            },
            objectConfig: {
                density: { min: 0.15, max: 0.25 },
                distribution: {
                    stoneLarge2: 25,
                    stoneLarge3: 25,
                    stoneLarge4: 25,
                    stoneLarge5: 25
                }
            },
            biome: {
                primaryColor: 0x696969, // Dim gray
                secondaryColor: 0x2F4F4F, // Dark slate gray
                climate: 'mountainous'
            }
        });
        
        // Tropical Islands - Palm trees and beaches
        this.addTemplate('tropical', {
            name: 'Tropical Island',
            description: 'Paradise island with palm trees and beautiful beaches',
            weight: 20,
            sizeRange: { min: 180, max: 320 },
            parameters: {
                noiseScale: { min: 0.009, max: 0.013 },
                noiseHeight: { min: 40, max: 60 },
                falloffCurve: { min: 1.0, max: 2.0 },
                enableVertexCulling: true,
                waterLevel: 0
            },
            objectConfig: {
                density: { min: 0.2, max: 0.35 },
                distribution: {
                    palmTreeBent: 40,
                    palmTreeLarge: 35,
                    stoneLarge3: 25
                }
            },
            biome: {
                primaryColor: 0x90EE90, // Light green
                secondaryColor: 0xF5DEB3, // Wheat (sandy)
                climate: 'tropical'
            }
        });
        
        // Volcanic Islands - Unique terrain and rare resources
        this.addTemplate('volcanic', {
            name: 'Volcanic Island',
            description: 'Active volcanic island with unique terrain and rare minerals',
            weight: 10, // Rare
            sizeRange: { min: 250, max: 450 },
            parameters: {
                noiseScale: { min: 0.005, max: 0.008 },
                noiseHeight: { min: 100, max: 150 },
                falloffCurve: { min: 3.0, max: 6.0 },
                enableVertexCulling: true,
                waterLevel: 0
            },
            objectConfig: {
                density: { min: 0.1, max: 0.2 },
                distribution: {
                    stoneLarge4: 60,
                    stoneLarge5: 40
                }
            },
            biome: {
                primaryColor: 0x8B0000, // Dark red
                secondaryColor: 0x2F2F2F, // Dark gray
                climate: 'volcanic'
            }
        });
        
        // Desert Islands - Sparse vegetation, unique appearance
        this.addTemplate('desert', {
            name: 'Desert Island',
            description: 'Arid island with sparse vegetation and hidden oases',
            weight: 15,
            sizeRange: { min: 160, max: 300 },
            parameters: {
                noiseScale: { min: 0.010, max: 0.015 },
                noiseHeight: { min: 30, max: 50 },
                falloffCurve: { min: 1.5, max: 2.5 },
                enableVertexCulling: true,
                waterLevel: 0
            },
            objectConfig: {
                density: { min: 0.05, max: 0.15 },
                distribution: {
                    palmTreeBent: 70,
                    stoneLarge2: 30
                }
            },
            biome: {
                primaryColor: 0xF4A460, // Sandy brown
                secondaryColor: 0xD2B48C, // Tan
                climate: 'arid'
            }
        });
    }
    
    /**
     * Add a new island template
     * @param {string} id - Unique identifier for the template
     * @param {Object} template - Template configuration
     */
    addTemplate(id, template) {
        // Validate template structure
        if (!template.name || !template.weight || !template.parameters || !template.objectConfig) {
            throw new Error(`Invalid template structure for ${id}`);
        }
        
        this.templates.set(id, {
            id,
            ...template,
            createdAt: Date.now()
        });
        
        console.log(`Added island template: ${template.name}`);
    }
    
    /**
     * Get template by ID
     * @param {string} id - Template ID
     * @returns {Object|null} Template or null if not found
     */
    getTemplate(id) {
        return this.templates.get(id) || null;
    }
    
    /**
     * Get all templates
     * @returns {Array} Array of all templates
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }
    
    /**
     * Get template IDs
     * @returns {Array} Array of template IDs
     */
    getTemplateIds() {
        return Array.from(this.templates.keys());
    }
    
    /**
     * Select random template based on weights
     * @param {Object} random - Seeded random generator
     * @param {Array} excludeTypes - Template IDs to exclude
     * @returns {Object} Selected template
     */
    selectRandomTemplate(random, excludeTypes = []) {
        const availableTemplates = this.getAllTemplates()
            .filter(template => !excludeTypes.includes(template.id));
        
        if (availableTemplates.length === 0) {
            throw new Error('No available templates to select from');
        }
        
        // Calculate total weight
        const totalWeight = availableTemplates.reduce((sum, template) => sum + template.weight, 0);
        
        // Select random value
        const randomValue = random.next() * totalWeight;
        
        // Find selected template
        let currentWeight = 0;
        for (const template of availableTemplates) {
            currentWeight += template.weight;
            if (randomValue <= currentWeight) {
                return template;
            }
        }
        
        // Fallback to last template
        return availableTemplates[availableTemplates.length - 1];
    }
    
    /**
     * Generate random parameters for a template
     * @param {Object} template - Island template
     * @param {Object} random - Seeded random generator
     * @returns {Object} Generated parameters
     */
    generateParameters(template, random) {
        const params = { ...template.parameters };
        const objectConfig = JSON.parse(JSON.stringify(template.objectConfig));
        
        // Randomize size within template range
        const size = random.nextInt(template.sizeRange.min, template.sizeRange.max);
        
        // Randomize parameters within template ranges
        const parameters = {
            size,
            resolution: 80, // Fixed for performance
            seed: random.nextInt(0, 65535),
            noiseScale: random.nextFloat(params.noiseScale.min, params.noiseScale.max),
            noiseHeight: random.nextInt(params.noiseHeight.min, params.noiseHeight.max),
            falloffCurve: random.nextFloat(params.falloffCurve.min, params.falloffCurve.max),
            enableVertexCulling: params.enableVertexCulling,
            waterLevel: params.waterLevel
        };
        
        // Randomize object density within template range
        objectConfig.density = random.nextFloat(objectConfig.density.min, objectConfig.density.max);
        
        // Add some variation to distribution percentages
        const distributionKeys = Object.keys(objectConfig.distribution);
        const totalOriginal = Object.values(objectConfig.distribution).reduce((sum, val) => sum + val, 0);
        
        // Add ±10% variation to each distribution value
        distributionKeys.forEach(key => {
            const original = objectConfig.distribution[key];
            const variation = random.nextFloat(-0.1, 0.1);
            objectConfig.distribution[key] = Math.max(5, Math.round(original * (1 + variation)));
        });
        
        // Normalize to ensure total is 100%
        const totalNew = Object.values(objectConfig.distribution).reduce((sum, val) => sum + val, 0);
        const scale = 100 / totalNew;
        distributionKeys.forEach(key => {
            objectConfig.distribution[key] = Math.round(objectConfig.distribution[key] * scale);
        });
        
        return {
            templateId: template.id,
            templateName: template.name,
            biome: template.biome,
            parameters,
            objectConfig,
            islandType: template.id
        };
    }
    
    /**
     * Get template distribution summary
     * @returns {Object} Summary of template weights and probabilities
     */
    getDistributionSummary() {
        const templates = this.getAllTemplates();
        const totalWeight = templates.reduce((sum, template) => sum + template.weight, 0);
        
        return templates.map(template => ({
            id: template.id,
            name: template.name,
            weight: template.weight,
            probability: (template.weight / totalWeight * 100).toFixed(1) + '%'
        }));
    }
}

export default IslandTemplate;
