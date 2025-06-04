const fs = require('fs');
const teamMembers = require('../data/teamMembers.json');
const goalies = require('../data/goalies.json');
const config = require('./config');

function calculatePositionBonus(playerName, teams) {
    // Default to 0 if no position preference is found
    return 0;
}

function calculateCombinationBonus(playerName) {
    // Default to 0 if no successful combinations found
    return 0;
}

function calculateRecentBonus(playerName) {
    // Default to 0 if no recent games found
    return 0;
}

function calculateGoalieSynergy(goalieName) {
    // Default to 0 if no synergy data found
    return 0;
}

function calculateGoalieRecentBonus(goalieName) {
    // Default to 0 if no recent games found
    return 0;
}

function calculateCombinationSuccess(pair) {
    // Default to 0 if no success data found
    return 0;
}

function calculateCombinationRecency(pair) {
    // Default to 0 if no recent data found
    return 0;
}

function analyzeTeamPatterns(inputTeams = null) {
    // Use provided teams if available, otherwise load from file
    let teams;
    if (inputTeams) {
        teams = inputTeams;  // Use teams directly when passed from aiPredictor
    } else {
        const data = JSON.parse(fs.readFileSync('./data/transformedResults.json', 'utf8'));
        teams = data.results.map(result => result.team);  // Extract just the team data
    }

    // Initialize tracking objects
    const playerCounts = {};
    const goalieCounts = {};
    const commonCombinations = {};
    const goaliePlayerSynergy = {};
    
    // Initialize weights structure to match aiPredictor expectations
    const weights = {
        players: {},
        goalies: {},
        combinations: {}
    };

    const playerWeights = {
        selection: {},
        positionPreference: {},
        combinations: {}
    };

    const goalieWeights = {
        playerSynergy: {}
    };

    // Process each team
    teams.forEach(team => {
        if (!team || !Array.isArray(team.players)) {
            console.warn('Skipping invalid team data');
            return;
        }

        // Count individual players
        team.players.forEach(player => {
            const playerName = typeof player === 'object' ? player.name : player;
            playerCounts[playerName] = (playerCounts[playerName] || 0) + 1;
        });

        // Count goalies
        if (team.goalie) {
            const goalieName = typeof team.goalie === 'object' ? team.goalie.name : team.goalie;
            goalieCounts[goalieName] = (goalieCounts[goalieName] || 0) + 1;
        }

        // Track player combinations
        for (let i = 0; i < team.players.length; i++) {
            for (let j = i + 1; j < team.players.length; j++) {
                const player1 = team.players[i];
                const player2 = team.players[j];
                
                const id1 = typeof player1 === 'object' ? player1.id : 
                    teamMembers.teamMembers.find(m => m.name === player1)?.id;
                const id2 = typeof player2 === 'object' ? player2.id :
                    teamMembers.teamMembers.find(m => m.name === player2)?.id;
                
                if (id1 && id2) {
                    const combinationKey = [id1, id2].sort().join('-');
                    commonCombinations[combinationKey] = (commonCombinations[combinationKey] || 0) + 1;
                }
            }
        }

        // Track goalie-player synergy
        if (team.goalie) {
            const goalieName = typeof team.goalie === 'object' ? team.goalie.name : team.goalie;
            if (!goaliePlayerSynergy[goalieName]) {
                goaliePlayerSynergy[goalieName] = {};
            }
            
            team.players.forEach(player => {
                const playerName = typeof player === 'object' ? player.name : player;
                goaliePlayerSynergy[goalieName][playerName] = 
                    (goaliePlayerSynergy[goalieName][playerName] || 0) + 1;
            });
        }
    });

    // Calculate weights
    const maxPlayerCount = Math.max(...Object.values(playerCounts));
    const maxGoalieCount = Math.max(...Object.values(goalieCounts));
    const maxCombinationCount = Math.max(...Object.values(commonCombinations));

    // Calculate player weights
    Object.entries(playerCounts).forEach(([playerName, count]) => {
        const player = teamMembers.teamMembers.find(m => m.name === playerName);
        if (player) {
            const baseWeight = 1 + (count / maxPlayerCount) * config.weightFactors.player.selectionFrequency;
            weights.players[playerName] = parseFloat(baseWeight.toFixed(3));
            playerWeights.selection[player.id] = baseWeight;
        }
    });

    // Calculate goalie weights
    Object.entries(goalieCounts).forEach(([goalieName, count]) => {
        const baseWeight = 1 + (count / maxGoalieCount) * config.weightFactors.goalie.selectionFrequency;
        const synergyBonus = calculateGoalieSynergy(goalieName) * config.weightFactors.goalie.playerSynergy;
        const recentBonus = calculateGoalieRecentBonus(goalieName) * config.weightFactors.goalie.recentGames;
        
        weights.goalies[goalieName] = parseFloat(
            (baseWeight + synergyBonus + recentBonus).toFixed(3)
        );
    });

    // Calculate combination weights
    Object.entries(commonCombinations).forEach(([pair, count]) => {
        const weight = 1 + (count / Math.max(...Object.values(commonCombinations))) * 
            config.weightFactors.combinations.frequency;
        
        weights.combinations[pair] = parseFloat(weight.toFixed(3));
        playerWeights.combinations[pair] = weight;
    });

    return {
        statistics: {
            playerFrequency: Object.fromEntries(Object.entries(playerCounts).sort(([,a], [,b]) => b - a)),
            goalieFrequency: Object.fromEntries(Object.entries(goalieCounts).sort(([,a], [,b]) => b - a)),
            topCombinations: Object.fromEntries(
                Object.entries(commonCombinations)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
            ),
            topPlayers: Object.fromEntries(
                Object.entries(playerCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
            ),
            weights
        },
        playerWeights,
        goalieWeights,
        prediction: {
            asTeam: {
                players: Object.entries(playerCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([player]) => ({
                        name: player,
                        id: teamMembers.teamMembers.find(m => m.name === player)?.id
                    })),
                goalie: {
                    name: Object.entries(goalieCounts)
                        .sort(([,a], [,b]) => b - a)[0][0],
                    id: goalies.goalies.find(g => g.name === Object.entries(goalieCounts)
                        .sort(([,a], [,b]) => b - a)[0][0])?.id
                }
            },
            asNumbers: null // Will be set after team is created
        },
        timestamp: new Date().toISOString(),
        totalGamesAnalyzed: teams.length
    };
}

module.exports = analyzeTeamPatterns; 