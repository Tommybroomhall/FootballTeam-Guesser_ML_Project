const analyzeTeamPatterns = require('./teamAnalyzer');
const fs = require('fs');

function runPrediction() {
    try {
        const analysis = analyzeTeamPatterns();
        
        // Save analysis results to file
        fs.writeFileSync(
            './data/analysisResults.json',
            JSON.stringify(analysis, null, 2),
            'utf8'
        );
        console.log('\nAnalysis results saved to data/analysisResults.json');
        
        console.log('\n=== Team Analysis ===\n');
        
        console.log('Top 10 Most Selected Players:');
        Object.entries(analysis.statistics.topPlayers).forEach(([player, count]) => {
            console.log(`${player}: ${count} times`);
        });

        console.log('\nGoalie Selection Frequency:');
        Object.entries(analysis.statistics.goalieFrequency).forEach(([goalie, count]) => {
            console.log(`${goalie}: ${count} times`);
        });

        console.log('\nTop 10 Player Combinations:');
        Object.entries(analysis.statistics.topCombinations).forEach(([pair, count]) => {
            console.log(`${pair}: ${count} times`);
        });

        // Show all player weights
        console.log('\n=== Player Weights ===');
        Object.entries(analysis.statistics.weights.players)
            .sort(([,a], [,b]) => b - a)
            .forEach(([player, weight]) => {
                console.log(`${player}: ${weight}`);
            });

        // Show all goalie weights
        console.log('\n=== Goalie Weights ===');
        Object.entries(analysis.statistics.weights.goalies)
            .sort(([,a], [,b]) => b - a)
            .forEach(([goalie, weight]) => {
                console.log(`${goalie}: ${weight}`);
            });

        console.log('\n=== Predicted Next Team ===\n');
        console.log('Players:');
        analysis.prediction.asTeam.players.forEach(player => {
            const weight = analysis.statistics.weights.players[player.name] || 'N/A';
            console.log(`${player.name} (${player.id}) - Weight: ${weight}`);
        });
        
        const goalieWeight = analysis.statistics.weights.goalies[analysis.prediction.asTeam.goalie.name] || 'N/A';
        console.log('\nGoalie:', 
            `${analysis.prediction.asTeam.goalie.name} (${analysis.prediction.asTeam.goalie.id}) - Weight: ${goalieWeight}`);
        console.log('\nAs Number String:', analysis.prediction.asNumbers);

        console.log('\nTotal Games Analyzed:', analysis.totalGamesAnalyzed);
        console.log('Analysis Timestamp:', analysis.timestamp);

    } catch (error) {
        console.error('Error running prediction:', error);
    }
}

runPrediction(); 