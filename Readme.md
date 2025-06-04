# Team Composition Predictor

This project analyzes historical team compositions and predicts future team arrangements using both statistical analysis and AI-based approaches.

## Overview

The system processes team composition data and provides two types of predictions:
1. Statistical analysis based on frequency patterns
2. AI-powered predictions using embeddings and pattern recognition

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Data Structure
The project expects three main data files in the `data` directory:

### `teamMembers.json`
Contains all possible team members (47 players):
```json
{
  "teamMembers": [
    { "id": 1, "name": "Tom" },
    ...
  ]
}
```

### `goalies.json`
Contains all possible goalies (10 goalies):
```json
{
  "goalies": [
    { "id": 1, "name": "Jack" },
    ...
  ]
}
```

### `rawData.tsv`
Contains historical team compositions in tab-separated format:
```
2	8	10	19	24	9
1	3	17	30	39	5
...
```
Each line represents one team: first 5 numbers are player IDs, last number is goalie ID.

## Usage

### Convert Raw Data
Converts the raw TSV data into a structured JSON format:
```bash
npm run convert
```
This creates `transformedResults.json` with named team compositions.

### Statistical Prediction
Run basic statistical analysis and prediction:
```bash
npm run predict
```
This creates `analysisResults.json` containing:
- Player frequency statistics
- Goalie frequency statistics
- Common player combinations
- Statistically predicted next team

### AI Prediction
Run AI-based prediction using embeddings and pattern recognition:
```bash
npm run predict-ai
```
This creates `aiPrediction.json` containing:
- AI-predicted team composition
- Prediction timestamp
- Method description

## How It Works

### Statistical Prediction (`src/teamAnalyzer.js`)
- Counts player and goalie frequencies
- Analyzes common player combinations
- Predicts based on most frequent occurrences

### AI Prediction (`src/aiPredictor.js`)
Uses several advanced techniques:
1. **Player Embeddings**
   - Creates 32-dimensional vector representations of players
   - Captures player relationships and chemistry
   - Based on co-occurrence patterns

2. **Pattern Recognition**
   - Analyzes sequences of 5 consecutive teams
   - Identifies temporal patterns in team composition

3. **Similarity Metrics**
   - Uses cosine similarity in embedding space
   - Finds similar historical team compositions

4. **Weighted Predictions**
   - Combines multiple signals:
     - Historical frequency
     - Recent patterns
     - Team similarity
     - Player chemistry

## Output Files

### `transformedResults.json`
Contains processed historical data with player names instead of numbers.

### `analysisResults.json`
Contains statistical analysis results:
```json
{
  "statistics": {
    "playerFrequency": {},
    "goalieFrequency": {},
    "topCombinations": {}
  },
  "prediction": {
    "asTeam": {},
    "asNumbers": "string"
  }
}
```

### `aiPrediction.json`
Contains AI-based prediction results:
```json
{
  "prediction": {
    "asTeam": {
      "players": [],
      "goalie": {}
    },
    "asNumbers": "string"
  },
  "timestamp": "",
  "method": ""
}
```

## Dependencies
- @tensorflow/tfjs-node: For AI predictions and embeddings
- Node.js: Runtime environment

## Future Improvements
- Add win/loss data for better predictions
- Implement seasonal pattern analysis
- Add position-based player selection
- Create visualization of player relationships
- Add confidence scores to predictions

## Contributing
Feel free to submit issues and enhancement requests!

## License
[MIT License](LICENSE)
```

This README provides:
1. Clear installation instructions
2. Detailed explanation of data structures
3. Usage instructions
4. Technical details of how it works
5. Output format descriptions
6. Future improvement suggestions

Would you like me to expand any section or add additional information?
