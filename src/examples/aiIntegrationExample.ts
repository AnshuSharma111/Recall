// AI Integration Usage Example

import { LocalAIModelService } from '../services/AIModelService';
import { AICardGenerator } from '../processors/CardGenerator';
import { aiConfigManager } from '../services/AIConfigManager';
import { Keyword, ContentChunk, KeywordCategory } from '../types/content';

/**
 * Example demonstrating how to use the AI integration for flashcard generation
 */
export async function demonstrateAIIntegration() {
  console.log('🤖 AI Integration Demo Starting...\n');

  // 1. Configure AI settings
  console.log('1. Configuring AI settings...');
  aiConfigManager.updateSettings({
    enabled: true,
    provider: 'ollama',
    model: 'llama3.2:3b',
    cardGenerationSettings: {
      maxCardsPerSession: 5,
      preferredCardTypes: ['definition', 'question_answer'],
      difficultyLevel: 'mixed',
      qualityThreshold: 0.7
    }
  });

  const settings = aiConfigManager.getSettings();
  console.log('✅ AI Settings configured:', {
    provider: settings.provider,
    model: settings.model,
    enabled: settings.enabled
  });

  // 2. Initialize AI service
  console.log('\n2. Initializing AI service...');
  const aiService = new LocalAIModelService(aiConfigManager.getModelConfig());
  
  // Check if AI service is available
  const isAvailable = await aiService.isAvailable();
  console.log(`✅ AI Service available: ${isAvailable}`);

  if (!isAvailable) {
    console.log('⚠️  AI service not available. Make sure Ollama is running with the specified model.');
    console.log('   Run: ollama pull llama3.2:3b');
    console.log('   Then: ollama serve');
  }

  // 3. Prepare sample content
  console.log('\n3. Preparing sample content...');
  const sampleKeywords: Keyword[] = [
    {
      term: 'machine learning',
      importance: 0.95,
      context: ['AI and data science'],
      category: KeywordCategory.CONCEPT,
      frequency: 8,
      rank: 1
    },
    {
      term: 'neural network',
      importance: 0.85,
      context: ['Deep learning fundamentals'],
      category: KeywordCategory.DEFINITION,
      frequency: 5,
      rank: 2
    },
    {
      term: 'supervised learning',
      importance: 0.75,
      context: ['ML algorithms'],
      category: KeywordCategory.PROCESS,
      frequency: 4,
      rank: 3
    }
  ];

  const sampleContext: ContentChunk[] = [
    {
      id: 'chunk_1',
      text: 'Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.',
      position: 0,
      context: 'Introduction to Machine Learning',
      importance: 0.9,
      metadata: {
        source: 'ml_textbook.pdf',
        chunkType: 'paragraph',
        wordCount: 35,
        sentenceCount: 2
      }
    },
    {
      id: 'chunk_2',
      text: 'Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information using a connectionist approach to computation.',
      position: 1,
      context: 'Neural Network Basics',
      importance: 0.8,
      metadata: {
        source: 'ml_textbook.pdf',
        chunkType: 'paragraph',
        wordCount: 25,
        sentenceCount: 2
      }
    },
    {
      id: 'chunk_3',
      text: 'Supervised learning algorithms build a mathematical model of training data that contains both inputs and desired outputs. The algorithm learns to map inputs to outputs based on the training examples.',
      position: 2,
      context: 'Learning Algorithms',
      importance: 0.75,
      metadata: {
        source: 'ml_textbook.pdf',
        chunkType: 'paragraph',
        wordCount: 30,
        sentenceCount: 2
      }
    }
  ];

  console.log(`✅ Prepared ${sampleKeywords.length} keywords and ${sampleContext.length} context chunks`);

  // 4. Generate flashcards
  console.log('\n4. Generating flashcards...');
  const cardGenerator = new AICardGenerator(aiService);

  try {
    const startTime = Date.now();
    const generatedCards = await cardGenerator.generateCards(sampleKeywords, sampleContext);
    const endTime = Date.now();

    console.log(`✅ Generated ${generatedCards.length} flashcards in ${endTime - startTime}ms`);

    // 5. Display generated cards
    console.log('\n5. Generated Flashcards:');
    console.log('=' .repeat(50));

    generatedCards.forEach((card, index) => {
      console.log(`\nCard ${index + 1}:`);
      console.log(`Type: ${card.type}`);
      console.log(`Difficulty: ${card.difficulty}`);
      console.log(`Keywords: ${card.keywords.join(', ')}`);
      console.log(`Front: ${card.front}`);
      console.log(`Back: ${card.back}`);
      
      // Validate card quality
      const quality = cardGenerator.validateCardQuality(card);
      console.log(`Quality Score: ${(quality.overall * 100).toFixed(1)}%`);
      
      if (quality.feedback.length > 0) {
        console.log(`Feedback: ${quality.feedback.join(', ')}`);
      }
      console.log('-'.repeat(30));
    });

    // 6. Statistics
    console.log('\n6. Generation Statistics:');
    const cardTypes = generatedCards.reduce((acc, card) => {
      acc[card.type] = (acc[card.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Card Types:', cardTypes);
    
    const avgQuality = generatedCards.reduce((sum, card) => {
      return sum + cardGenerator.validateCardQuality(card).overall;
    }, 0) / generatedCards.length;
    
    console.log(`Average Quality Score: ${(avgQuality * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Card generation failed:', error);
    
    if (error instanceof Error && error.message.includes('AI service')) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('- Ensure Ollama is installed and running');
      console.log('- Check that the specified model is available');
      console.log('- Verify the base URL is correct');
      console.log('- Try increasing the timeout setting');
    }
  }

  console.log('\n🎉 AI Integration Demo Complete!');
}

/**
 * Example of configuring different AI providers
 */
export function demonstrateProviderConfiguration() {
  console.log('🔧 AI Provider Configuration Examples:\n');

  // Ollama configuration
  console.log('1. Ollama Configuration:');
  const ollamaSettings = aiConfigManager.getDefaultOllamaSettings();
  console.log(JSON.stringify(ollamaSettings, null, 2));

  // LM Studio configuration
  console.log('\n2. LM Studio Configuration:');
  const lmStudioSettings = aiConfigManager.getDefaultLMStudioSettings();
  console.log(JSON.stringify(lmStudioSettings, null, 2));

  // Custom configuration
  console.log('\n3. Custom Configuration:');
  aiConfigManager.updateSettings({
    provider: 'ollama',
    baseUrl: 'http://192.168.1.100:11434', // Remote Ollama instance
    model: 'mistral:7b',
    timeout: 60000,
    cardGenerationSettings: {
      maxCardsPerSession: 15,
      preferredCardTypes: ['definition', 'question_answer', 'fill_blank'],
      difficultyLevel: 'hard',
      qualityThreshold: 0.8
    }
  });

  const customSettings = aiConfigManager.getSettings();
  console.log(JSON.stringify(customSettings, null, 2));

  // Validate settings
  const validation = aiConfigManager.validateSettings();
  console.log('\n4. Settings Validation:');
  console.log(`Valid: ${validation.isValid}`);
  if (!validation.isValid) {
    console.log('Errors:', validation.errors);
  }
}

// Export for use in other examples or demos
// Note: These exports are available from the contentPreprocessorExample if needed