const transformRawData = require('./dataTransformer');
const convertTeamToNames = require('./teamConverter');
const fs = require('fs');

function processResults() {
    try {
        const results = transformRawData('./data/rawData.tsv');
        console.log(`Processing ${results.length} results...`);
        
        const transformedData = results
            .map(result => {
                try {
                    return {
                        team: convertTeamToNames(result.numberString)
                    };
                } catch (error) {
                    return null;
                }
            })
            .filter(Boolean); // Remove any null entries

        // Save to a new JSON file
        fs.writeFileSync(
            './data/transformedResults.json',
            JSON.stringify({ results: transformedData }, null, 2),
            'utf8'
        );

        console.log(`Successfully processed ${transformedData.length} results`);
        return transformedData;
    } catch (error) {
        console.error('Error in processResults:', error);
        throw error;
    }
}

// Run the process
try {
    processResults();
    console.log('Data has been successfully transformed and saved to transformedResults.json');
} catch (error) {
    console.error('Error processing results:', error);
} 