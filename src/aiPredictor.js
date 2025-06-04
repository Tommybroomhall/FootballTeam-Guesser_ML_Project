const brain = require('brain.js');
const fs = require('fs');
const teamMembers = require('../data/teamMembers.json');
const goalies = require('../data/goalies.json');
const config = require('./config');
const analyzeTeamPatterns = require('./teamAnalyzer');

class TeamPredictor {
    constructor(config) {
        this.network = new brain.NeuralNetwork({
            hiddenLayers: config.hiddenLayers,
            activation: config.activation,
            learningRate: config.learningRate,
            momentum: config.momentum,
            errorThresh: config.errorThresh || 0.01,
            dropout: config.dropout
        });
    }

    calculatePlayerStats(teams) {
        const stats = {
            positionPreference: {},
            chemistry: {},
            goalieChemistry: {}
        };
        
        teams.forEach(team => {
            team.players.forEach((player, pos) => {
                const playerId = this.getPlayerId(player);
                if (playerId) {
                    if (!stats.positionPreference[playerId]) {
                        stats.positionPreference[playerId] = Array(5).fill(0);
                    }
                    stats.positionPreference[playerId][pos]++;
                }
            });
        });

        Object.keys(stats.positionPreference).forEach(playerId => {
            const total = stats.positionPreference[playerId].reduce((a, b) => a + b, 0);
            stats.positionPreference[playerId] = stats.positionPreference[playerId].map(count => count / total);
        });

        teams.forEach(team => {
            team.players.forEach((player1, pos1) => {
                const id1 = this.getPlayerId(player1);
                if (id1) {
                    if (!stats.chemistry[id1]) {
                        stats.chemistry[id1] = {};
                    }
                    
                    team.players.forEach((player2, pos2) => {
                        if (pos1 !== pos2) {
                            const id2 = this.getPlayerId(player2);
                            if (id2) {
                                stats.chemistry[id1][id2] = (stats.chemistry[id1][id2] || 0) + 1;
                            }
                        }
                    });
                }
            });
        });

        return stats;
    }

    prepareEnhancedOutput(team, playerStats) {
        const output = new Array((47 + 10) * 6).fill(0);
        
        team.players.forEach((player, position) => {
            const playerId = this.getPlayerId(player);
            if (playerId) {
                const positionWeight = playerStats.positionPreference[playerId]?.[position] || 0;
                output[(position * (47 + 10)) + (playerId - 1)] = 1 + positionWeight;
            }
        });

        if (team.goalie) {
            const goalieId = goalies.goalies.find(g => g.name === team.goalie)?.id;
            if (goalieId) {
                output[(5 * (47 + 10)) + 47 + (goalieId - 1)] = 1;
            }
        }

        return output;
    }

    prepareTrainingData(teams) {
        const analysis = analyzeTeamPatterns(teams);
        console.log('\n=== Statistical Weights Analysis ===');
        
        // Sample a few players to show their weights
        const samplePlayers = teams[0].players.slice(0, 3);
        samplePlayers.forEach(player => {
            const playerId = this.getPlayerId(player);
            if (playerId) {
                console.log(`\nPlayer: ${player.name || player} (ID: ${playerId})`);
                console.log(`- Selection Weight: ${analysis.playerWeights?.selection[playerId]?.toFixed(3) || 1.000}`);
                console.log(`- Position Preference: ${analysis.playerWeights?.positionPreference[`${playerId}-0`]?.toFixed(3) || 1.000}`);
                
                // Show combination weights with other players
                const combinations = Object.entries(analysis.playerWeights?.combinations || {})
                    .filter(([key]) => key.startsWith(`${playerId}-`))
                    .slice(0, 3);
                if (combinations.length > 0) {
                    console.log('- Top 3 Player Combinations:');
                    combinations.forEach(([key, weight]) => {
                        const [_, otherId] = key.split('-');
                        const otherPlayer = teamMembers.teamMembers.find(p => p.id === parseInt(otherId));
                        console.log(`  → with ${otherPlayer?.name}: ${weight.toFixed(3)}`);
                    });
                }
            }
        });

        // Show goalie synergy weights
        if (teams[0].goalie) {
            const goalieId = this.getGoalieId(teams[0].goalie);
            console.log(`\nGoalie: ${teams[0].goalie} (ID: ${goalieId})`);
            console.log('- Top 3 Player Synergies:');
            const synergies = Object.entries(analysis.goalieWeights?.playerSynergy || {})
                .filter(([key]) => key.endsWith(`-${goalieId}`))
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3);
            synergies.forEach(([key, weight]) => {
                const [playerId] = key.split('-');
                const player = teamMembers.teamMembers.find(p => p.id === parseInt(playerId));
                console.log(`  → with ${player?.name}: ${weight.toFixed(3)}`);
            });
        }

        console.log('\nPreparing training data...');
        const trainingData = [];
        
        for (let i = 1; i < teams.length; i++) {
            const previousTeams = teams.slice(0, i);
            const nextTeam = teams[i];
            
            const input = new Array((47 + 10) * 6).fill(0);
            
            previousTeams.forEach((team, idx) => {
                const recencyWeight = config.weights.recencyBase + 
                    (config.weights.recencyScale * (idx / previousTeams.length));
                
                team.players.forEach((player, position) => {
                    const playerId = this.getPlayerId(player);
                    
                    if (playerId) {
                        const baseIndex = (position * (47 + 10));
                        
                        // Apply statistical weights
                        const selectionWeight = analysis.playerWeights.selection[playerId] || 1;
                        const positionWeight = analysis.playerWeights.positionPreference[`${playerId}-${position}`] || 1;
                        
                        // Combine weights
                        const combinedWeight = recencyWeight * 
                            config.weights.position * 
                            selectionWeight * 
                            positionWeight;
                        
                        input[baseIndex + (playerId - 1)] += combinedWeight;

                        // Apply combination weights for player pairs
                        team.players.forEach((otherPlayer, otherPos) => {
                            if (position !== otherPos) {
                                const otherId = this.getPlayerId(otherPlayer);
                                if (otherId) {
                                    const comboWeight = analysis.playerWeights.combinations[`${playerId}-${otherId}`] || 1;
                                    input[baseIndex + (otherId - 1)] += recencyWeight * 
                                        config.weights.playerToPlayer * 
                                        comboWeight;
                                }
                            }
                        });

                        // Apply goalie synergy weights
                        if (team.goalie) {
                            const goalieId = this.getGoalieId(team.goalie);
                            if (goalieId) {
                                const goalieBaseIndex = (5 * (47 + 10));
                                const synergyWeight = analysis.goalieWeights.playerSynergy[`${playerId}-${goalieId}`] || 1;
                                input[goalieBaseIndex + 47 + (goalieId - 1)] += recencyWeight * 
                                    config.weights.playerToGoalie * 
                                    synergyWeight;
                            }
                        }
                    }
                });
            });

            const output = this.prepareEnhancedOutput(nextTeam, this.calculatePlayerStats(teams));
            trainingData.push({ input, output });
        }

        console.log(`Generated ${trainingData.length} training samples`);
        return trainingData;
    }
    getPlayerId(player) {
        if (typeof player === 'string') {
            const playerData = teamMembers.teamMembers.find(p => p.name === player);
            return playerData?.id;
        }
        return player?.id;
    }
    getGoalieId(goalie) {
        if (typeof goalie === 'string') {
            const goalieData = goalies.goalies.find(g => g.name === goalie);
            return goalieData?.id;
        }
        return goalie?.id;
    }
    trainModel(teams) {
        if (!teams || teams.length === 0) {
            throw new Error('No teams provided for training');
        }

        const trainingData = this.prepareTrainingData(teams);
        if (trainingData.length === 0) {
            throw new Error('No valid training data generated');
        }

        try {
            console.log('\nStarting neural network training...');
            console.log('Configuration:');
            console.log('- Hidden Layers:', config.hiddenLayers.join(', '));
            console.log('- Learning Rate:', config.learningRate);
            console.log('- Momentum:', config.momentum);
            console.log('- Error Threshold:', config.errorThresh);
            console.log('- Activation:', config.activation);
            console.log('- Decay Rate:', config.decayRate);
            console.log('- Max Iterations:', config.maxIterations);
            console.log('\nTraining Progress:\n');

            let lastLog = Date.now();
            let lastError = Infinity;
            let unstableCount = 0;

            const result = this.network.train(trainingData, {
                iterations: config.maxIterations,
                errorThresh: config.errorThresh,
                callback: (stats) => {
                    const now = Date.now();
                    if (now - lastLog > config.logInterval) {
                        // Check for training stability
                        if (stats.error > lastError) {
                            unstableCount++;
                        } else {
                            unstableCount = 0;
                        }

                        // If training becomes too unstable, throw error
                        if (unstableCount > config.maxUnstableCount) {
                            throw new Error('Training becoming unstable - error increasing');
                        }

                        const progress = Math.floor((stats.iterations / config.maxIterations) * 100);
                        console.log(
                            `Iteration: ${stats.iterations}/${config.maxIterations} (${progress}%) - ` +
                            `Error: ${stats.error.toFixed(8)} - ` +
                            `Delta: ${(lastError - stats.error).toFixed(8)}`
                        );
                        
                        lastError = stats.error;
                        lastLog = now;
                    }
                },
                callbackPeriod: 1
            });

            console.log('\nTraining completed!');
            console.log('Final error:', result.error.toFixed(8));
            console.log('Iterations:', result.iterations);

            // Save the trained model
            fs.writeFileSync(config.modelPath, JSON.stringify(this.network.toJSON()));
            console.log('Model saved to:', config.modelPath);

            return result;
        } catch (error) {
            console.error('Training error details:', error);
            throw new Error(`Training failed: ${error.message}`);
        }
    }
    predictNextTeam(previousTeams) {
        const allTeams = previousTeams;
        
        console.log(`\nAnalyzing ${allTeams.length} teams for patterns...`);
        const input = new Array((47 + 10) * 6 * allTeams.length).fill(0);
        
        allTeams.forEach((team, sequenceIndex) => {
            team.players.forEach((player, position) => {
                const playerId = typeof player === 'object' ? player.id : 
                    teamMembers.teamMembers.find(p => p.name === player)?.id;
                
                if (playerId) {
                    const baseIndex = (sequenceIndex * (47 + 10) * 6) + (position * (47 + 10));
                    const recencyWeight = config.weights.recencyBase + 
                        (config.weights.recencyScale * (sequenceIndex / allTeams.length));
                    input[baseIndex + (playerId - 1)] = recencyWeight;
                }
            });

            const goalieId = goalies.goalies.find(g => g.name === team.goalie)?.id;
            if (goalieId) {
                const baseIndex = (sequenceIndex * (47 + 10) * 6) + (5 * (47 + 10));
                const recencyWeight = config.weights.recencyBase + 
                    (config.weights.recencyScale * (sequenceIndex / allTeams.length));
                input[baseIndex + 47 + (goalieId - 1)] = recencyWeight * config.weights.playerToGoalie;
            }
        });
        
        console.log('\nGenerating prediction...');
        const prediction = this.network.run(input);
        console.log('\nPrediction analysis:');
        console.log('----------------------------------------');
        
        const predictions = {
            players: Array(5).fill(null).map((_, position) => {
                const positionStart = position * (47 + 10);
                const playerProbs = prediction.slice(positionStart, positionStart + 47);
                
                // Get top 3 predictions for each position
                const topPredictions = Array.from(playerProbs)
                    .map((prob, idx) => ({
                        probability: prob,
                        id: idx + 1,
                        position: position
                    }))
                    .sort((a, b) => b.probability - a.probability)
                    .slice(0, 3);

                // Check historical position preference
                const historicalPositions = previousTeams.slice(-5).map(team => 
                    team.players[position].id
                );

                // Boost probability if player has played in this position recently
                topPredictions.forEach(pred => {
                    if (historicalPositions.includes(pred.id)) {
                        pred.probability *= config.weights.position;
                    }
                });

                return topPredictions[0];
            }),
            goalie: (() => {
                const goalieStart = 5 * (47 + 10) + 47;
                const goalieProbs = prediction.slice(goalieStart, goalieStart + 10);
                
                return Array.from(goalieProbs)
                    .map((prob, idx) => ({
                        probability: prob,
                        id: idx + 1
                    }))
                    .sort((a, b) => b.probability - a.probability)[0];
            })()
        };

        const confidence = predictions.players.reduce((sum, pred) => sum + pred.probability, 0) / 6;

        const result = {
            asTeam: {
                players: predictions.players.map(pred => ({
                    name: teamMembers.teamMembers.find(p => p.id === pred.id)?.name,
                    id: pred.id
                })),
                goalie: {
                    name: goalies.goalies.find(g => g.id === predictions.goalie.id)?.name,
                    id: predictions.goalie.id
                }
            },
            confidence
        };

        console.log('\nPrediction complete:');
        console.log('Players:', result.asTeam.players.map(p => `${p.name} (${p.id})`).join(', '));
        console.log('Goalie:', `${result.asTeam.goalie.name} (${result.asTeam.goalie.id})`);
        console.log('Raw Confidence:', confidence.toFixed(4));

        return result;
    }
    predictMultipleTimes(teams) {
        console.log(`\nRunning ${config.predictionRuns} prediction iterations...`);
        let bestPrediction = null;
        let bestConfidence = -1;

        for (let i = 1; i <= config.predictionRuns; i++) {
            console.log(`\nRun ${i} of ${config.predictionRuns}`);
            try {
                const prediction = this.predictNextTeam(teams);
                if (prediction.confidence > bestConfidence) {
                    bestPrediction = prediction;
                    bestConfidence = prediction.confidence;
                }
            } catch (error) {
                console.error(`Error in prediction run ${i}:`, error);
            }
        }

        return bestPrediction;
    }
    loadModel() {
        try {
            if (fs.existsSync(config.modelPath)) {
                console.log('Loading existing trained model...');
                const modelData = JSON.parse(fs.readFileSync(config.modelPath, 'utf8'));
                this.network.fromJSON(modelData);
                console.log('Model loaded successfully!');
                return true;
            }
        } catch (error) {
            console.error('Error loading model:', error);
        }
        return false;
    }

}

module.exports = TeamPredictor; 