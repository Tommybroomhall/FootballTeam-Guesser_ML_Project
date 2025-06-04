// Import the JSON data
const teamMembers = require('../data/teamMembers.json');
const goalies = require('../data/goalies.json');

function convertTeamToNames(numberString) {
    // Ensure we have a string
    if (typeof numberString !== 'string') {
        throw new Error('Input must be a string');
    }

    // Split the string by each double-digit number
    const numbers = numberString.match(/\d{1,2}/g).map(num => parseInt(num));
    
    // Validate input
    if (numbers.length !== 6) {
        throw new Error(`Input must be exactly 6 numbers, got: ${numbers.length}`);
    }

    // Get the first 5 players (team members)
    const players = numbers.slice(0, 5).map(num => {
        const player = teamMembers.teamMembers.find(member => member.id === num);
        if (!player) {
            throw new Error(`Invalid player number: ${num}`);
        }
        return player.name;
    });

    // Get the goalie (last number)
    const goalieNum = numbers[5];
    const goalie = goalies.goalies.find(g => g.id === goalieNum);
    if (!goalie) {
        throw new Error(`Invalid goalie number: ${goalieNum}`);
    }

    return {
        players: players,
        goalie: goalie.name
    };
}

module.exports = convertTeamToNames; 