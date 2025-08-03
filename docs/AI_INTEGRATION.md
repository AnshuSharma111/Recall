# AI Integration Guide

This document explains how to set up and use the AI-powered flashcard generation feature in Recall.

## Overview

Recall uses local AI models to automatically generate high-quality flashcards from your content. The system supports multiple AI providers and includes intelligent fallback mechanisms to ensure reliable operation.

## Supported AI Providers

### Ollama (Recommended)
- **Local deployment**: Runs entirely on your machine
- **Privacy-focused**: No data leaves your device
- **Model variety**: Supports various open-source models
- **Easy setup**: Simple installation and model management

### LM Studio
- **User-friendly interface**: GUI for model management
- **Local inference**: All processing happens locally
- **Model compatibility**: Supports many popular models
- **Performance optimization**: Optimized for local hardware

## Setup Instructions

### Option 1: Ollama Setup

1. **Install Ollama**
   ```bash
   # Visit https://ollama.ai and download for your platform
   # Or use package managers:
   
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Download a Model**
   ```bash
   # Recommended models for flashcard generation:
   ollama pull llama3.2:3b    # Fast, good quality
   ollama pull mistral:7b     # Higher quality, slower
   ollama pull phi3:mini      # Very fast, smaller
   ```

3. **Start Ollama Service**
   ```bash
   ollama serve
   ```

4. **Configure Recall**
   - Open Recall settings
   - Navigate to AI Configuration
   - Set provider to "Ollama"
   - Set base URL to `http://localhost:11434`
   - Set model name (e.g., `llama3.2:3b`)

### Option 2: LM Studio Setup

1. **Install LM Studio**
   - Download from https://lmstudio.ai
   - Install and launch the application

2. **Download a Model**
   - Browse the model library in LM Studio
   - Download a suitable model (e.g., Llama 3.2 3B)

3. **Start Local Server**
   - Go to the "Local Server" tab
   - Load your downloaded model
   - Start the server (default port: 1234)

4. **Configure Recall**
   - Open Recall settings
   - Navigate to AI Configuration
   - Set provider to "LM Studio"
   - Set base URL to `http://localhost:1234`
   - Set model name to match your loaded model

## Configuration Options

### Basic Settings
```typescript
{
  enabled: true,                    // Enable/disable AI generation
  provider: 'ollama',              // 'ollama' or 'lmstudio'
  baseUrl: 'http://localhost:11434', // AI service URL
  model: 'llama3.2:3b',           // Model name
  timeout: 30000,                  // Request timeout (ms)
  maxRetries: 3,                   // Retry attempts
  fallbackEnabled: true            // Enable rule-based fallback
}
```

### Card Generation Settings
```typescript
{
  maxCardsPerSession: 10,          // Maximum cards to generate
  preferredCardTypes: [            // Preferred card types
    'definition',
    'question_answer'
  ],
  difficultyLevel: 'mixed',        // 'easy', 'medium', 'hard', 'mixed'
  qualityThreshold: 0.6            // Minimum quality score (0-1)
}
```

## Usage

### Programmatic Usage

```typescript
import { LocalAIModelService } from '../services/AIModelService';
import { AICardGenerator } from '../processors/CardGenerator';
import { aiConfigManager } from '../services/AIConfigManager';

// Configure AI settings
aiConfigManager.updateSettings({
  enabled: true,
  provider: 'ollama',
  model: 'llama3.2:3b'
});

// Initialize services
const aiService = new LocalAIModelService(aiConfigManager.getModelConfig());
const cardGenerator = new AICardGenerator(aiService);

// Generate cards
const cards = await cardGenerator.generateCards(keywords, context);
```

### Through the UI

1. **Import Content**: Upload text, PDF, or other supported formats
2. **Process Content**: The system extracts keywords and chunks content
3. **Generate Cards**: AI automatically creates flashcards
4. **Review & Edit**: Review generated cards and make adjustments
5. **Study**: Use the generated cards in your study sessions

## Quality Assurance

The system includes multiple quality checks:

### Automatic Validation
- **Content validation**: Ensures questions and answers are meaningful
- **Keyword relevance**: Verifies cards relate to extracted keywords
- **Quality scoring**: Rates cards on clarity, relevance, and difficulty
- **Duplicate detection**: Prevents similar cards from being generated

### Fallback Mechanisms
- **Rule-based generation**: When AI is unavailable
- **Quality filtering**: Removes low-quality AI-generated cards
- **Error recovery**: Graceful handling of AI service failures

## Troubleshooting

### Common Issues

#### AI Service Not Available
```
Error: AI service unavailable
```
**Solutions:**
- Ensure Ollama/LM Studio is running
- Check the base URL configuration
- Verify the model is downloaded and available
- Test connection: `curl http://localhost:11434/api/tags`

#### Model Not Found
```
Error: Model 'llama3.2:3b' not found
```
**Solutions:**
- Download the model: `ollama pull llama3.2:3b`
- Check available models: `ollama list`
- Update configuration with correct model name

#### Generation Timeout
```
Error: Request timeout after 30000ms
```
**Solutions:**
- Increase timeout in settings
- Use a smaller/faster model
- Reduce content size
- Check system resources

#### Poor Quality Cards
**Solutions:**
- Increase quality threshold
- Try a different model
- Improve input content quality
- Adjust card generation settings

### Performance Optimization

#### Model Selection
- **Fast generation**: phi3:mini, llama3.2:1b
- **Balanced**: llama3.2:3b, mistral:7b
- **High quality**: llama3.1:8b, mixtral:8x7b

#### Hardware Considerations
- **RAM**: 8GB+ recommended for 3B models
- **CPU**: Modern multi-core processor
- **GPU**: Optional but improves performance significantly

#### Content Optimization
- **Chunk size**: 200-500 words per chunk
- **Keyword density**: 5-15 keywords per session
- **Content quality**: Well-structured, clear text

## Advanced Configuration

### Custom Prompts
You can customize the AI prompts by extending the `LocalAIModelService`:

```typescript
class CustomAIService extends LocalAIModelService {
  protected buildCardGenerationPrompt(prompt: CardGenerationPrompt): string {
    // Your custom prompt logic here
    return customPrompt;
  }
}
```

### Multiple Models
Configure different models for different content types:

```typescript
const scienceService = new LocalAIModelService({
  model: 'llama3.2:3b',
  // Science-specific configuration
});

const languageService = new LocalAIModelService({
  model: 'mistral:7b',
  // Language learning configuration
});
```

### Batch Processing
For large content processing:

```typescript
const batchGenerator = new BatchCardGenerator({
  batchSize: 5,
  concurrency: 2,
  qualityThreshold: 0.8
});
```

## API Reference

### AIModelService Interface
```typescript
interface AIModelService {
  isAvailable(): Promise<boolean>;
  generateCards(keywords: Keyword[], context: ContentChunk[]): Promise<FlashCard[]>;
  validateResponse(response: string): boolean;
  getConfig(): AIModelConfig;
  setConfig(config: Partial<AIModelConfig>): void;
}
```

### CardGenerator Interface
```typescript
interface CardGenerator {
  generateCards(keywords: Keyword[], context: ContentChunk[]): Promise<FlashCard[]>;
  validateCardQuality(card: FlashCard): QualityScore;
}
```

## Best Practices

### Content Preparation
1. **Clean text**: Remove formatting artifacts
2. **Logical structure**: Organize content in clear sections
3. **Keyword density**: Ensure important terms are well-represented
4. **Context clarity**: Provide sufficient context for concepts

### Model Management
1. **Regular updates**: Keep models updated for better performance
2. **Model testing**: Test different models for your content type
3. **Resource monitoring**: Monitor CPU/RAM usage during generation
4. **Backup models**: Have fallback models available

### Quality Control
1. **Review generated cards**: Always review AI-generated content
2. **Adjust thresholds**: Fine-tune quality thresholds for your needs
3. **Feedback loop**: Use card performance to improve generation
4. **Manual curation**: Supplement AI generation with manual cards

## Security and Privacy

### Data Privacy
- **Local processing**: All AI processing happens on your device
- **No cloud communication**: No data sent to external services
- **Offline capability**: Full functionality without internet
- **Data control**: Complete control over your study materials

### Security Considerations
- **Model verification**: Only use trusted model sources
- **Network isolation**: AI services run locally
- **Access control**: No external API keys required
- **Data encryption**: Local storage can be encrypted

## Support and Resources

### Documentation
- [Ollama Documentation](https://github.com/ollama/ollama)
- [LM Studio Documentation](https://lmstudio.ai/docs)
- [Model Performance Comparisons](docs/MODEL_BENCHMARKS.md)

### Community
- [Recall GitHub Issues](https://github.com/recall/recall/issues)
- [AI Integration Discussions](https://github.com/recall/recall/discussions)
- [Model Recommendations](https://github.com/recall/recall/wiki/models)

### Getting Help
1. Check this documentation
2. Review troubleshooting section
3. Search existing GitHub issues
4. Create a new issue with:
   - System information
   - Configuration details
   - Error messages
   - Steps to reproduce