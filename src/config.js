const modelConfig = {
    // Network Architecture - optimized for position-based patterns
    hiddenLayers: [128, 96, 64, 48, 32, 24],   // Keep this - working well for pattern recognition
    learningRate: 0.135,           // Keep this - good for finding subtle patterns
    momentum: 0.135,               // Matches learning rate
    errorThresh: 0.004,            // Keep stringent error threshold
    activation: 'sigmoid',
    dropout: 0.23,                 // Helps prevent overfitting to specific combinations
    
    // Training Parameters
    maxIterations: 1200,           // This worked well for pattern discovery
    logInterval: 10,
    maxUnstableCount: 45,          // Good stability check
    decayRate: 0.999995,          // Slow decay for thorough learning
    
    weights: {
        position: 1.48,            // High weight for position/timing patterns
        playerToPlayer: 0.58,      // Physical interaction patterns
        playerToGoalie: 0.18,      // Last position relationship
        recencyBase: 0,            // Remove game-to-game influence
        recencyScale: 0            // Remove game-to-game influence
    },
    
    analysis: {
        recentGamesWeight: 0.0,    
        minGamesThreshold: 3,        // Keep minimum data requirement
        combinationThreshold: 2,      // Keep successful combo requirement
        positionMemory: 8              // Increase position pattern memory
    },
    
    // Weight Calculation Parameters
    weightFactors: {
        // Player weight factors
        player: {
            selectionFrequency: 1.45,
            positionPreference: 1.23,
            combinationSuccess: 1.78,
            recentGames: 0.0
        },
        // Goalie weight factors
        goalie: {
            selectionFrequency: 1.78,
            playerSynergy: 0.0,
            recentGames: 0.0
        },
        // Combination weight factors
        combinations: {
            frequency: 0.1,
            success: 0.1,
            recency: 0.0
        }
    },
    
    // Statistical Weight Modifiers
    statisticalWeights: {
        playerSelection: {
            base: -1.0,            // Start negative (physical impossibility)
            scale: 0.1,            // Small increments
            maxBonus: 1.0          // Cap on position preference
        },
        performance: {
            base: 0.1,             // Small base weight
            scale: 0.1,            // Gradual scaling
            recentGames: 5         // Look at patterns over time
        },
        compatibility: {
            minimum: 0.4,          // Physical possibility threshold
            optimal: 0.8,          // Strong pattern indicator
            maxPenalty: 0.1        // Small penalty for unlikely combinations
        }
    },
    
    modelPath: './data/trainedModel.json',
    predictionRuns: 1              // Single run per prediction
};

module.exports = modelConfig; 