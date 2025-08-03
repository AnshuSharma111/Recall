# 🦙 Ollama Integration for Recall

Recall now supports **AI-powered flashcard generation** using Ollama! This enables completely local, privacy-first AI processing for creating high-quality flashcards from your content.

## 🚀 Quick Start

### 1. Install Ollama

**Windows/macOS/Linux:**
Visit [ollama.ai](https://ollama.ai) and download the installer for your platform.

### 2. Start Ollama & Install a Model

```bash
# Start Ollama service
ollama serve

# In another terminal, install a recommended model
ollama pull llama3.2:3b
```

### 3. Test the Integration

```bash
# Quick availability check
node test-ollama-now.js

# Full integration test
npm run test:ollama
```

### 4. Generate Your First AI Flashcards

```bash
# Run the complete workflow demo
npx tsx src/examples/completeWorkflowExample.ts
```

## ✨ What You Get

### 🤖 AI-Powered Generation
- **Intelligent question creation** from your content
- **Multiple card types**: Definitions, Q&A, fill-in-the-blank
- **Difficulty adaptation** based on content complexity
- **Quality validation** with automatic filtering

### 🔒 Privacy-First
- **100% local processing** - your data never leaves your machine
- **No internet required** after initial model download
- **No API keys or cloud services** needed

### ⚡ Smart Fallbacks
- **Automatic fallback** to rule-based generation if AI is unavailable
- **Graceful error handling** ensures the app always works
- **Hybrid approach** combines AI and traditional methods

## 📊 Performance

| Model | Speed | Quality | Memory | Best For |
|-------|-------|---------|---------|----------|
| `phi3:mini` | ⚡⚡⚡ | ⭐⭐⭐ | 2GB | Quick testing |
| `llama3.2:3b` | ⚡⚡ | ⭐⭐⭐⭐ | 3GB | **Recommended** |
| `mistral:7b` | ⚡ | ⭐⭐⭐⭐⭐ | 5GB | High quality |

## 🎯 Example Output

**Input:** "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen."

**AI-Generated Cards:**
```
Card 1 (Definition):
Q: What is photosynthesis?
A: Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.

Card 2 (Question-Answer):
Q: What are the main inputs required for photosynthesis?
A: The main inputs for photosynthesis are sunlight, water, and carbon dioxide.

Card 3 (Question-Answer):
Q: What are the products of photosynthesis?
A: The products of photosynthesis are glucose and oxygen.
```

## 🛠️ Configuration

### Basic Setup
```typescript
import { aiConfigManager } from './src/services/AIConfigManager';

aiConfigManager.updateSettings({
  provider: 'ollama',
  model: 'llama3.2:3b',
  maxCards: 10,
  qualityThreshold: 0.7
});
```

### Advanced Configuration
```typescript
aiConfigManager.updateSettings({
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2:3b',
  timeout: 30000,
  maxRetries: 3,
  cardGenerationSettings: {
    maxCardsPerSession: 15,
    preferredCardTypes: ['definition', 'question_answer'],
    difficultyLevel: 'mixed',
    qualityThreshold: 0.8
  }
});
```

## 🧪 Testing & Examples

### Available Test Scripts

```bash
# Quick Ollama availability check
node test-ollama-now.js

# Comprehensive integration test
npm run test:ollama

# Complete workflow demonstration
npx tsx src/examples/completeWorkflowExample.ts

# Quick test with minimal content
npx tsx src/examples/completeWorkflowExample.ts --quick
```

### Manual Testing

```typescript
import { FlashcardGenerationEngine } from './src/engines/FlashcardGenerationEngine';

const engine = new FlashcardGenerationEngine();
const result = await engine.generateFlashcards(content, {
  maxCards: 5,
  qualityThreshold: 0.7
});

console.log(`Generated ${result.cards.length} cards!`);
```

## 🔧 Troubleshooting

### Common Issues

**"Ollama not available"**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

**"Model not found"**
```bash
# List available models
ollama list

# Pull the required model
ollama pull llama3.2:3b
```

**Slow generation**
- Try a smaller model: `ollama pull phi3:mini`
- Reduce `maxCards` in settings
- Increase `timeout` value

**Memory issues**
- Use smaller models (1B or 3B parameters)
- Close other applications
- Reduce batch size in settings

### Debug Mode

Enable detailed logging:
```typescript
// Set environment variable
process.env.DEBUG = 'recall:ai';

// Or enable in code
aiConfigManager.updateSettings({
  debug: true
});
```

## 📚 Architecture

### How It Works

1. **Content Processing**: Text is chunked and analyzed
2. **Keyword Extraction**: Important terms are identified using TF-IDF
3. **AI Generation**: Ollama generates contextual flashcards
4. **Quality Control**: Cards are validated and filtered
5. **Fallback System**: Rule-based generation if AI fails

### Integration Points

```
Content Input → Preprocessing → Keyword Extraction → AI Generation → Quality Control → Flashcards
                                                    ↓
                                              Fallback Generation (if AI unavailable)
```

## 🎓 Advanced Usage

### Custom Prompts

```typescript
import { PromptEngineer } from './src/services/PromptEngineering';

const promptEngineer = new PromptEngineer();
const customPrompt = promptEngineer.generateSubjectPrompt('science', context);
```

### Batch Processing

```typescript
const result = await engine.generateFlashcards(largeContent, {
  batchSize: 5,        // Process in smaller batches
  maxCards: 20,        // Generate more cards
  includeMetadata: true // Get detailed analytics
});
```

### Quality Analysis

```typescript
const result = await engine.generateFlashcards(content, {
  includeMetadata: true
});

console.log('Quality Metrics:');
console.log(`Average quality: ${result.statistics.averageQuality}`);
console.log(`Processing time: ${result.statistics.processingTime}ms`);
console.log(`AI success rate: ${result.statistics.aiUsed ? 100 : 0}%`);
```

## 🔮 Future Enhancements

- **Multi-language support** for international content
- **Subject-specific models** optimized for different domains
- **Custom model fine-tuning** for your specific content
- **Collaborative filtering** to improve card quality over time

## 📖 Documentation

- [Complete Setup Guide](docs/OLLAMA_SETUP.md)
- [AI Integration Guide](docs/AI_INTEGRATION.md)
- [API Documentation](docs/API.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

Want to improve the AI integration?

1. Test with different models and share results
2. Contribute prompt improvements
3. Add support for new card types
4. Optimize performance for different hardware

## 📄 License

MIT License - Use freely in your projects!

---

**Ready to get started?** Run `node test-ollama-now.js` to check your setup! 🚀