# 🦙 Ollama Setup Guide for Recall

This guide will help you set up Ollama to enable AI-powered flashcard generation in Recall.

## Quick Start

### 1. Install Ollama

**Windows:**
- Download from [ollama.ai](https://ollama.ai)
- Run the installer
- Ollama will start automatically

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Start Ollama Service

```bash
ollama serve
```

The service will run on `http://localhost:11434`

### 3. Install a Model

**Recommended for Recall:**

```bash
# Fast and efficient (3B parameters)
ollama pull llama3.2:3b

# Very fast, smaller model (3.8B parameters)
ollama pull phi3:mini

# Higher quality, slower (7B parameters)
ollama pull mistral:7b
```

### 4. Test Integration

```bash
npm run test:ollama
```

## Model Recommendations

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `phi3:mini` | 2.3GB | ⚡⚡⚡ | ⭐⭐⭐ | Quick testing, fast generation |
| `llama3.2:3b` | 2.0GB | ⚡⚡ | ⭐⭐⭐⭐ | **Recommended** - Best balance |
| `llama3.2:1b` | 1.3GB | ⚡⚡⚡ | ⭐⭐ | Very fast, basic quality |
| `mistral:7b` | 4.1GB | ⚡ | ⭐⭐⭐⭐⭐ | High quality, slower |

## Configuration

Recall will automatically detect and use Ollama. You can customize settings:

```typescript
import { aiConfigManager } from './src/services/AIConfigManager';

aiConfigManager.updateSettings({
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2:3b',
  timeout: 30000,
  maxRetries: 3
});
```

## Troubleshooting

### Ollama Not Found

**Error:** `Connection refused` or `Service unavailable`

**Solutions:**
1. Check if Ollama is running: `ollama list`
2. Start the service: `ollama serve`
3. Check the port: `curl http://localhost:11434/api/tags`

### Model Not Available

**Error:** `Model 'llama3.2:3b' not found`

**Solutions:**
1. List available models: `ollama list`
2. Pull the model: `ollama pull llama3.2:3b`
3. Update configuration with available model

### Slow Generation

**Solutions:**
1. Use a smaller model: `ollama pull phi3:mini`
2. Reduce batch size in settings
3. Increase timeout values
4. Check system resources (RAM/CPU)

### Memory Issues

**Error:** `Out of memory` or system slowdown

**Solutions:**
1. Use smaller models (1B or 3B parameters)
2. Close other applications
3. Increase system RAM if possible
4. Use batch processing with smaller batches

## Advanced Configuration

### Custom Model Settings

```bash
# Pull specific model versions
ollama pull llama3.2:3b-instruct-q4_0
ollama pull mistral:7b-instruct-v0.2

# List all available models
ollama list

# Remove unused models
ollama rm model-name
```

### Performance Tuning

```typescript
// High performance setup
aiConfigManager.updateSettings({
  model: 'phi3:mini',
  timeout: 15000,
  maxRetries: 2,
  cardGenerationSettings: {
    maxCardsPerSession: 5,
    qualityThreshold: 0.5
  }
});

// High quality setup
aiConfigManager.updateSettings({
  model: 'mistral:7b',
  timeout: 60000,
  maxRetries: 3,
  cardGenerationSettings: {
    maxCardsPerSession: 8,
    qualityThreshold: 0.8
  }
});
```

### Remote Ollama

To use Ollama on another machine:

```typescript
aiConfigManager.updateSettings({
  baseUrl: 'http://192.168.1.100:11434', // Remote IP
  // ... other settings
});
```

## Testing Your Setup

### Basic Test

```bash
# Test Ollama directly
curl http://localhost:11434/api/tags

# Test with Recall
npm run test:ollama
```

### Manual Test

```typescript
import { testOllamaIntegration } from './src/examples/ollamaIntegrationTest';

// Run comprehensive test
await testOllamaIntegration();
```

## Performance Benchmarks

Typical performance on modern hardware:

| Model | Cards/Second | Memory Usage | CPU Usage |
|-------|--------------|--------------|-----------|
| `phi3:mini` | 2-3 | 2-3GB | Medium |
| `llama3.2:3b` | 1-2 | 3-4GB | Medium-High |
| `mistral:7b` | 0.5-1 | 5-6GB | High |

## Integration Examples

### Basic Usage

```typescript
import { FlashcardGenerationEngine } from './src/engines/FlashcardGenerationEngine';

const engine = new FlashcardGenerationEngine();
const result = await engine.generateFlashcards(content);
console.log(`Generated ${result.cards.length} cards`);
```

### With Custom Settings

```typescript
const result = await engine.generateFlashcards(content, {
  maxCards: 10,
  qualityThreshold: 0.7,
  difficultyLevel: 'medium'
});
```

### Error Handling

```typescript
try {
  const result = await engine.generateFlashcards(content);
  // Use AI-generated cards
} catch (error) {
  console.log('AI generation failed, using fallback');
  // System will automatically use rule-based generation
}
```

## FAQ

**Q: Do I need internet for Ollama?**
A: Only for initial model download. After that, everything runs locally.

**Q: Can I use multiple models?**
A: Yes, you can switch models anytime by updating the configuration.

**Q: How much disk space do models need?**
A: 1-7GB per model, depending on size. You can remove unused models.

**Q: Is my data sent anywhere?**
A: No, everything runs locally. Your content never leaves your machine.

**Q: Can I run this on a server?**
A: Yes, Ollama can run on remote servers. Update the baseUrl accordingly.

## Support

If you encounter issues:

1. Check the [Ollama documentation](https://github.com/ollama/ollama)
2. Run `npm run test:ollama` for diagnostics
3. Check system requirements and available memory
4. Try a smaller model if having performance issues

## Next Steps

Once Ollama is set up:

1. Test the integration: `npm run test:ollama`
2. Try the flashcard generation examples
3. Customize settings for your use case
4. Start generating flashcards from your content!

---

**Need help?** Check the troubleshooting section or create an issue in the project repository.