// Alien Jump Game - Fixed Version with Endless Runner
// This file contains the corrected endless runner implementation

// Add this to the existing LevelManager class to fix the endless runner system

// Method to add to LevelManager class:
function addEndlessRunnerToLevelManager() {
    // This function contains the code to patch the existing LevelManager
    
    // Replace the constructor
    const newConstructor = `
    constructor() {
        // Level configuration
        this.currentLevel = 1;
        this.levelHeight = GAME_CONFIG.CANVAS_HEIGHT;
        this.groundLevel = GAME_CONFIG.GROUND_LEVEL;
        
        // Endless runner settings
        this.isEndlessMode = true;
        this.nextSpikeX = 300; // X position for next spike
        this.spikeGenerationDistance = 800; // Generate spikes this far ahead
        this.lastGeneratedX = 0; // Track how far we've generated
        
        // Obstacle generation settings
        this.minSpikeDistance = 80; // Minimum distance between spikes
        this.maxSpikeDistance = 150; // Maximum distance between spikes
        this.spikeHeightVariation = 10; // Height variation for spikes
        
        // Level progression settings
        this.difficultyMultiplier = 1.0;
        this.difficultyIncreaseRate = 0.1; // How much difficulty increases over time
        this.distanceTraveled = 0;
        
        // Jump validation settings
        this.alienMaxJumpHeight = 50; // Simplified for now
        this.alienMaxJumpDistance = 120; // Simplified for now
        this.safetyMargin = 5; // Extra pixels for safety
        
        console.log('LevelManager initialized in endless mode');
    }`;
    
    // New methods to add:
    const newMethods = `
    // Generate initial spikes for the start of the level
    generateInitialSpikes() {
        const spikes = [];
        const startX = 300; // Start generating spikes after alien start position
        const endX = startX + this.spikeGenerationDistance;
        
        let currentX = startX;
        while (currentX < endX) {
            const spike = this.generateSingleSpike(currentX);
            spikes.push(spike);
            
            // Calculate next spike position
            const spacing = this.minSpikeDistance + Math.random() * (this.maxSpikeDistance - this.minSpikeDistance);
            currentX += spacing;
        }
        
        this.nextSpikeX = currentX;
        this.lastGeneratedX = endX;
        
        console.log('Generated initial spikes:', spikes.length);
        return spikes;
    }
    
    // Generate a single spike at given X position
    generateSingleSpike(x) {
        // Calculate spike height with difficulty scaling
        const baseHeight = 25;
        const difficultyHeight = Math.floor(this.difficultyMultiplier * 5);
        const randomHeight = Math.random() * this.spikeHeightVariation;
        const height = Math.min(this.alienMaxJumpHeight - this.safetyMargin, 
                               baseHeight + difficultyHeight + randomHeight);
        
        return {
            x: Math.round(x),
            y: this.groundLevel - height,
            width: 20,
            height: Math.round(height)
        };
    }
    
    // Update endless level generation based on alien position
    updateEndlessLevel(alienX, spikeObstacles) {
        // Update distance traveled and difficulty
        this.distanceTraveled = Math.max(this.distanceTraveled, alienX);
        this.difficultyMultiplier = 1.0 + (this.distanceTraveled / 1000) * this.difficultyIncreaseRate;
        
        // Check if we need to generate more spikes ahead
        const generationThreshold = alienX + this.spikeGenerationDistance;
        
        if (this.lastGeneratedX < generationThreshold) {
            const newSpikes = this.generateMoreSpikes(this.lastGeneratedX, generationThreshold);
            
            // Add new spikes to the game
            newSpikes.forEach(spikeData => {
                const spike = new SpikeObstacle(spikeData.x, spikeData.y, spikeData.width, spikeData.height);
                spikeObstacles.push(spike);
            });
            
            this.lastGeneratedX = generationThreshold;
            console.log('Generated new spikes:', newSpikes.length);
        }
        
        // Remove spikes that are far behind the alien (cleanup)
        const cleanupThreshold = alienX - 500;
        const initialCount = spikeObstacles.length;
        
        for (let i = spikeObstacles.length - 1; i >= 0; i--) {
            if (spikeObstacles[i].position.x < cleanupThreshold) {
                spikeObstacles.splice(i, 1);
            }
        }
        
        if (spikeObstacles.length < initialCount) {
            console.log('Cleaned up old spikes:', initialCount - spikeObstacles.length);
        }
    }
    
    // Generate more spikes in a given range
    generateMoreSpikes(startX, endX) {
        const spikes = [];
        let currentX = Math.max(startX, this.nextSpikeX);
        
        while (currentX < endX) {
            const spike = this.generateSingleSpike(currentX);
            spikes.push(spike);
            
            // Calculate next spike position with some randomness
            const baseSpacing = this.minSpikeDistance + Math.random() * (this.maxSpikeDistance - this.minSpikeDistance);
            const difficultySpacing = Math.max(0, baseSpacing - this.difficultyMultiplier * 10); // Closer spikes as difficulty increases
            currentX += Math.max(this.minSpikeDistance, difficultySpacing);
        }
        
        this.nextSpikeX = currentX;
        return spikes;
    }`;
    
    return { newConstructor, newMethods };
}

console.log('Endless runner patch loaded');