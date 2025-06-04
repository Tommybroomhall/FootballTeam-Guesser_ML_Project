ConfigSetup.md


Here's a detailed explanation of each configuration parameter and its effects:

### Network Architecture Parameters
hiddenLayers: [285, 142]
- **What it is**: The structure of hidden layers in the neural network
- **Effect**: More/larger layers = more complex patterns, but slower training
- **Current setup**: Two layers for balance between complexity and speed

learningRate: 0.000025
- **What it is**: How big of a step the network takes when adjusting weights
- **Effect**: Higher = faster learning but unstable, Lower = slower but more stable
- **Why 0.000025**: Small enough for precise adjustments without overshooting

momentum: 0.06
- **What it is**: How much previous weight changes influence current updates
- **Effect**: Higher = faster convergence but can overshoot, Lower = more stable but slower
- **Why 0.06**: Balanced to prevent oscillation while maintaining learning speed

errorThresh: 0.018
- **What it is**: Target error rate where training stops
- **Effect**: Lower = more accurate but harder to achieve, Higher = less accurate but achievable
- **Why 0.018**: Realistic target based on our data complexity

### Training Parameters

maxIterations: 5000
- **What it is**: Maximum number of training cycles
- **Effect**: Higher = more chances to learn, but longer training time
- **Why 5000**: Enough iterations to find patterns without excessive training

maxUnstableCount: 20
- **What it is**: How many increasing errors before stopping training
- **Effect**: Higher = more patience with temporary setbacks, Lower = quicker to give up
- **Why 20**: Allows for some exploration while preventing endless bad training

decayRate: 0.99975
- **What it is**: How quickly the learning rate decreases over time
- **Effect**: Higher = maintains learning rate longer, Lower = reduces learning rate faster
- **Why 0.99975**: Slow decay for stable long-term learning

### Relationship Weights
weights: {
    position: 1.4,        // Position preference weight
    playerToPlayer: 0.35, // Team chemistry weight
    playerToGoalie: 0.45, // Player-goalie relationship weight
    recencyBase: 0.7,     // Minimum weight for historical data
    recencyScale: 0.3     // How much recent games matter more
}

- **Position**: Higher values make position preferences stronger
- **PlayerToPlayer**: Higher values increase importance of team chemistry
- **PlayerToGoalie**: Higher values increase importance of player-goalie combinations
- **RecencyBase**: Higher values give more weight to all historical data
- **RecencyScale**: Higher values make recent games matter more than old ones

### Adjusting for Different Goals

1. For more stable training:
   - Decrease `learningRate`
   - Decrease `momentum`
   - Increase `maxUnstableCount`
   - Increase `recencyBase`

2. For faster training:
   - Increase `learningRate`
   - Increase `momentum`
   - Decrease `maxUnstableCount`
   - Decrease `errorThresh`

3. For better pattern recognition:
   - Adjust `hiddenLayers`
   - Increase weights for important relationships
   - Adjust `recencyScale` based on how much history matters

Would you like me to explain any of these parameters in more detail?
