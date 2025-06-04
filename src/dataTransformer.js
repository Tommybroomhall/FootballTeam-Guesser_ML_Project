const fs = require('fs');

function transformRawData(filePath) {
    // Read the TSV file
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    
    // Initialize results array
    const results = [];

    // Process each line in reverse order
    for (const line of lines.reverse()) {
        // Skip empty lines
        if (!line.trim()) continue;

        try {
            // Split the line by tabs and parse numbers
            const numbers = line.split('\t')
                .map(n => n.trim())
                .map(n => parseInt(n))
                .filter(n => !isNaN(n));

            // Validate we have exactly 6 numbers
            if (numbers.length !== 6) {
                console.warn(`Skipping line: incorrect number count (${numbers.length})`);
                continue;
            }

            // Validate ranges (1-47 for players, 1-10 for goalie)
            const validPlayers = numbers.slice(0, 5).every(n => n >= 1 && n <= 47);
            const validGoalie = numbers[5] >= 1 && numbers[5] <= 10;

            if (!validPlayers || !validGoalie) {
                console.warn(`Skipping line: numbers out of valid range`);
                continue;
            }

            // Pad single digit numbers with leading zero
            const numberString = numbers
                .map(n => n.toString().padStart(2, '0'))
                .join('');

            results.push({
                numberString: numberString
            });

        } catch (error) {
            console.warn('Error processing line:', line, error);
        }
    }

    return results;
}

module.exports = transformRawData; 