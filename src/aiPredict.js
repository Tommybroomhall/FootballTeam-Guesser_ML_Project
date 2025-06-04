const brain = require('brain.js');
const fs = require('fs');
const teamMembers = require('../data/teamMembers.json');
const goalies = require('../data/goalies.json');
const config = require('./config');
const TeamPredictor = require('./aiPredictor');

// Define the analysis function first
async function analyzePredictionAccuracy(prediction, historicalTeams) {
    console.log(`\nAnalyzing ${historicalTeams.length} historical teams for patterns...`);
    
    let matchStats = {
        exactMatches: 0,
        fiveMatches: 0,
        fourMatches: 0,
        threeMatches: 0,
        twoMatches: 0,
        oneMatch: 0,
        positionMatches: Array(6).fill(0),
        goalieMatches: 0,
        positionPatterns: Array(5).fill().map(() => ({})),
        numberFrequency: {},
        sequencePatterns: []
    };

    historicalTeams.forEach((historical, index) => {
        // Convert to ID arrays for comparison
        const predictionIds = prediction.asTeam.players.map(p => p.id);
        const historicalIds = historical.players.map(p => typeof p === 'object' ? p.id : p);
        
        // Count matching numbers regardless of position
        const matches = predictionIds.filter(id => historicalIds.includes(id)).length;
        
        // Update stats
        switch(matches) {
            case 5: matchStats.fiveMatches++; break;
            case 4: matchStats.fourMatches++; break;
            case 3: matchStats.threeMatches++; break;
            case 2: matchStats.twoMatches++; break;
            case 1: matchStats.oneMatch++; break;
        }
        
        // Check position-specific matches
        predictionIds.forEach((id, pos) => {
            if (historicalIds[pos] === id) {
                matchStats.positionMatches[pos]++;
            }
        });
        
        // Fix goalie comparison - compare IDs instead of objects
        const predictedGoalieId = prediction.asTeam.goalie.id;
        const historicalGoalieId = typeof historical.goalie === 'object' 
            ? historical.goalie.id 
            : historical.goalie;
            
        if (predictedGoalieId === historicalGoalieId) {
            matchStats.goalieMatches++;
        }

        // Track number frequencies by position
        historical.players.forEach((player, pos) => {
            const id = typeof player === 'object' ? player.id : player;
            if (!matchStats.positionPatterns[pos][id]) {
                matchStats.positionPatterns[pos][id] = 0;
            }
            matchStats.positionPatterns[pos][id]++;
        });

        // Track overall number frequency
        historical.players.forEach(player => {
            const id = typeof player === 'object' ? player.id : player;
            if (!matchStats.numberFrequency[id]) {
                matchStats.numberFrequency[id] = 0;
            }
            matchStats.numberFrequency[id]++;
        });
    });

    // Add mechanical pattern analysis
    console.log('\n=== Mechanical Pattern Analysis ===');
    console.log('Most common numbers by position:');
    matchStats.positionPatterns.forEach((patterns, pos) => {
        const sorted = Object.entries(patterns)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        console.log(`Position ${pos + 1}: ${sorted.map(([id, count]) => 
            `ID:${id} (${(count/historicalTeams.length*100).toFixed(1)}%)`).join(', ')}`);
    });

    return matchStats;
}

// Then the main function
async function runAIPrediction() {
    try {
        const args = process.argv.slice(2);
        const shouldRetrain = args.includes('--retrain');
        const trainOnly = args.includes('--train');
        const predictOnly = args.includes('--predict-only');

        const data = JSON.parse(fs.readFileSync('./data/transformedResults.json', 'utf8'));
        
        // Convert string names to player objects
        const teams = data.results.map((result, index) => {
            if (!result.team || !Array.isArray(result.team.players)) {
                throw new Error(`Invalid team data at index ${index}`);
            }

            return {
                players: result.team.players.map(playerName => {
                    const player = teamMembers.teamMembers.find(p => p.name === playerName);
                    if (!player) {
                        console.warn(`Player not found: ${playerName}`);
                        return null;
                    }
                    return {
                        name: player.name,
                        id: player.id
                    };
                }).filter(Boolean),
                goalie: result.team.goalie
            };
        });

        console.log(`Processed ${teams.length} teams`);
        
        const predictor = new TeamPredictor(config);
        
        // Handle different modes
        let trainingResult;
        if (trainOnly || shouldRetrain) {
            console.log('\nStarting training process...');
            if (fs.existsSync(predictor.modelPath)) {
                console.log('Removing existing model...');
                fs.unlinkSync(predictor.modelPath);
            }
            trainingResult = predictor.trainModel(teams);
            
            if (trainOnly) {
                console.log('\nTraining completed and model saved.');
                return;
            }
        } else if (predictOnly) {
            if (!predictor.loadModel()) {
                throw new Error('No trained model found. Please train first using npm run train-ai');
            }
            console.log('Using existing trained model');
            trainingResult = { error: 'Using pre-trained model' };
        } else {
            // Try to load existing model first
            if (!predictor.loadModel()) {
                console.log('\nNo existing model found. Training new model...');
                trainingResult = predictor.trainModel(teams);
            } else {
                console.log('Using existing trained model');
                trainingResult = { error: 'Using pre-trained model' };
            }
        }

        // Stop here if train-only mode
        if (trainOnly) {
            console.log('\nTraining completed and model saved.');
            return;
        }

        // Continue with prediction
        console.log('\nStarting prediction process...');
        const prediction = predictor.predictMultipleTimes(teams, config.predictionRuns);
        if (!prediction || !prediction.asTeam) {
            throw new Error('Invalid prediction result');
        }

        // Run analysis
        const accuracyAnalysis = await analyzePredictionAccuracy(prediction, teams);
        // Create results
        const results = {
            prediction: {
                asTeam: prediction.asTeam,
                asNumbers: prediction.asTeam.players.map(p => p.id).join('') + prediction.asTeam.goalie.id
            },
            timestamp: new Date().toISOString(),
            method: 'Neural Network (Brain.js) - Sequence Based',
            trainingError: trainingResult.error,
            confidence: prediction.confidence,
            accuracyAnalysis: accuracyAnalysis
        };
        
        // Save results
        fs.writeFileSync(
            './data/aiPrediction.json',
            JSON.stringify(results, null, 2)
        );

        // Display results
        console.log('\n=== AI Prediction Results ===');
        console.log('\nPredicted Team (in order):');
        prediction.asTeam.players.forEach((player, idx) => {
            console.log(`Position ${idx + 1}: ${player.name} (ID: ${player.id})`);
        });
        console.log('\nPredicted Goalie:', 
            `${prediction.asTeam.goalie.name} (${prediction.asTeam.goalie.id})`);
        console.log('\nAs Number String:', results.prediction.asNumbers);
        console.log('\nConfidence:', prediction.confidence.toFixed(4));

        // Add summary of best matches
        console.log('\n=== Best Historical Matches ===');
        console.log(`Best match rate: ${Math.max(
            accuracyAnalysis.fiveMatches,
            accuracyAnalysis.fourMatches,
            accuracyAnalysis.threeMatches
        )} games`);

        // Add position strength analysis
        console.log('\n=== Position Strength Analysis ===');
        accuracyAnalysis.positionMatches.forEach((matches, pos) => {
            const percentage = (matches/teams.length*100).toFixed(2);
            console.log(`Position ${pos + 1}: ${percentage}% accuracy`);
        });

        console.log('\n=== Detailed Analysis ===');
        console.log('Team Analysis:');
        console.log(`- Found ${accuracyAnalysis.threeMatches} teams with 3 matching numbers`);
        console.log(`- Found ${accuracyAnalysis.twoMatches} teams with 2 matching numbers`);
        console.log(`- Found ${accuracyAnalysis.oneMatch} teams with 1 matching number`);

        console.log('\nGoalie Analysis:');
        console.log(`- Matched in ${accuracyAnalysis.goalieMatches} games (${(accuracyAnalysis.goalieMatches/teams.length*100).toFixed(2)}%)`);

    } catch (error) {
        console.error('Error in AI prediction:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error);
    }
}

runAIPrediction(); 