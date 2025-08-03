// Complete Workflow Example: From Content to Flashcards

import { FlashcardGenerationEngine } from '../engines/FlashcardGenerationEngine';
import { BasicContentPreprocessor } from '../processors/ContentPreprocessor';
import { BasicKeywordExtractor } from '../processors/KeywordExtractor';
import { aiConfigManager } from '../services/AIConfigManager';
import { ExtractedContent } from '../types/content';
import { CardType } from '../types/flashcard';

/**
 * Demonstrates the complete workflow from raw content to finished flashcards
 */
export async function demonstrateCompleteWorkflow() {
  console.log('🎓 Complete Recall Workflow Demo\n');
  console.log('=' .repeat(60));

  // Sample educational content (you could load this from a file)
  const rawContent = `
# Introduction to Quantum Computing

Quantum computing is a revolutionary approach to computation that harnesses the principles of quantum mechanics to process information in fundamentally new ways.

## Key Concepts

**Quantum Bits (Qubits)**: Unlike classical bits that can only be 0 or 1, qubits can exist in a superposition of both states simultaneously. This allows quantum computers to process multiple possibilities at once.

**Superposition**: This principle allows quantum particles to exist in multiple states simultaneously until measured. In quantum computing, this means a qubit can be both 0 and 1 at the same time.

**Entanglement**: When qubits become entangled, the state of one qubit instantly affects the state of another, regardless of the distance between them. This creates powerful correlations that quantum algorithms can exploit.

**Quantum Interference**: Quantum algorithms use interference to amplify correct answers and cancel out wrong ones, leading to the right solution with high probability.

## Applications

Quantum computing has potential applications in:

1. **Cryptography**: Breaking current encryption methods and creating quantum-safe cryptography
2. **Drug Discovery**: Simulating molecular interactions to discover new medicines
3. **Financial Modeling**: Optimizing portfolios and risk analysis
4. **Machine Learning**: Accelerating certain AI algorithms
5. **Weather Prediction**: Processing vast amounts of atmospheric data

## Current Challenges

- **Quantum Decoherence**: Quantum states are fragile and easily disrupted by environmental noise
- **Error Rates**: Current quantum computers have high error rates compared to classical computers
- **Limited Qubit Count**: Today's quantum computers have relatively few qubits
- **Cost and Complexity**: Quantum computers require extreme conditions (near absolute zero temperatures)

## Major Players

Leading companies in quantum computing include IBM, Google, Microsoft, Amazon, and startups like Rigetti and IonQ. Each is pursuing different approaches to building practical quantum computers.
  `.trim();

  // Step 1: Content Extraction (simulated - in real app this would come from file upload)
  console.log('1. 📄 Content Extraction');
  console.log('-'.repeat(30));
  
  const extractedContent: ExtractedContent = {
    text: rawContent,
    metadata: {
      source: 'quantum_computing_intro.md',
      format: 'text/markdown',
      extractedAt: new Date(),
      confidence: 1.0,
      size: rawContent.length,
      originalFileName: 'quantum_computing_intro.md'
    }
  };

  console.log(`✅ Extracted ${extractedContent.text.length} characters`);
  console.log(`📁 Source: ${extractedContent.metadata.source}`);
  console.log(`📊 Format: ${extractedContent.metadata.format}`);

  // Step 2: Content Preprocessing
  console.log('\n2. 🔧 Content Preprocessing');
  console.log('-'.repeat(30));
  
  const preprocessor = new BasicContentPreprocessor();
  const chunks = preprocessor.chunkContent(extractedContent);
  
  console.log(`✅ Created ${chunks.length} content chunks`);
  chunks.slice(0, 3).forEach((chunk, index) => {
    console.log(`   ${index + 1}. "${chunk.text.substring(0, 60)}..." (${chunk.text.length} chars)`);
  });

  // Step 3: Keyword Extraction
  console.log('\n3. 🔍 Keyword Extraction');
  console.log('-'.repeat(30));
  
  const keywordExtractor = new BasicKeywordExtractor();
  const keywords = keywordExtractor.extractKeywords(chunks);
  const rankedKeywords = keywordExtractor.rankByImportance(keywords);
  
  console.log(`✅ Extracted ${keywords.length} keywords`);
  console.log('Top keywords:');
  rankedKeywords.slice(0, 8).forEach((keyword, index) => {
    console.log(`   ${index + 1}. ${keyword.term} (${keyword.category}, ${(keyword.importance * 100).toFixed(1)}%)`);
  });

  // Step 4: AI Configuration Check
  console.log('\n4. 🤖 AI Configuration');
  console.log('-'.repeat(30));
  
  // Configure for optimal performance
  aiConfigManager.updateSettings({
    enabled: true,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2:3b',
    timeout: 45000,
    maxRetries: 2,
    fallbackEnabled: true,
    cardGenerationSettings: {
      maxCardsPerSession: 8,
      preferredCardTypes: ['definition', 'question_answer'],
      difficultyLevel: 'mixed',
      qualityThreshold: 0.7
    }
  });

  const settings = aiConfigManager.getSettings();
  console.log(`✅ AI Provider: ${settings.provider}`);
  console.log(`🎯 Model: ${settings.model}`);
  console.log(`⚡ Timeout: ${settings.timeout}ms`);
  console.log(`🎚️  Quality threshold: ${settings.cardGenerationSettings.qualityThreshold}`);

  // Step 5: Flashcard Generation
  console.log('\n5. 🎓 Flashcard Generation');
  console.log('-'.repeat(30));
  
  const engine = new FlashcardGenerationEngine();
  
  try {
    const startTime = Date.now();
    const result = await engine.generateFlashcards(extractedContent, {
      maxCards: 8,
      preferredTypes: [CardType.DEFINITION, CardType.QUESTION_ANSWER],
      qualityThreshold: 0.7,
      includeMetadata: true,
      batchSize: 3
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Generated ${result.cards.length} flashcards in ${duration}ms`);
    console.log(`🤖 AI used: ${result.statistics.aiUsed ? 'Yes' : 'No'}`);
    console.log(`📊 Average quality: ${(result.statistics.averageQuality * 100).toFixed(1)}%`);
    console.log(`⚡ Generation rate: ${(result.cards.length / (duration / 1000)).toFixed(2)} cards/second`);

    // Step 6: Display Generated Cards
    console.log('\n6. 📚 Generated Flashcards');
    console.log('-'.repeat(30));
    
    result.cards.forEach((card, index) => {
      console.log(`\n📋 Card ${index + 1} (${card.type.toUpperCase()})`);
      console.log(`❓ Question: ${card.front}`);
      console.log(`✅ Answer: ${card.back}`);
      console.log(`🏷️  Keywords: ${card.keywords.join(', ')}`);
      console.log(`📊 Difficulty: ${card.difficulty}/4`);
      
      // Show quality score if available
      const qualityScore = (card as any).qualityScore;
      if (qualityScore) {
        console.log(`⭐ Quality: ${(qualityScore.overall * 100).toFixed(1)}% (Clarity: ${(qualityScore.clarity * 100).toFixed(1)}%, Relevance: ${(qualityScore.relevance * 100).toFixed(1)}%)`);
      }
    });

    // Step 7: Processing Analytics
    console.log('\n7. 📈 Processing Analytics');
    console.log('-'.repeat(30));
    
    console.log('Card Type Distribution:');
    Object.entries(result.statistics.byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} cards`);
    });

    console.log('\nDifficulty Distribution:');
    Object.entries(result.statistics.byDifficulty).forEach(([difficulty, count]) => {
      console.log(`   Level ${difficulty}: ${count} cards`);
    });

    console.log('\nProcessing Steps:');
    result.metadata.processing.steps.forEach(step => {
      const status = step.success ? '✅' : '❌';
      console.log(`   ${status} ${step.name}: ${step.duration}ms`);
    });

    console.log('\nContent Analysis:');
    console.log(`   Original length: ${result.metadata.sourceContent.originalLength} characters`);
    console.log(`   Chunks created: ${result.metadata.sourceContent.chunksCreated}`);
    console.log(`   Keywords extracted: ${result.metadata.sourceContent.keywordsExtracted}`);
    console.log(`   Cards generated: ${result.statistics.totalGenerated}`);

    // Step 8: Export Options (simulated)
    console.log('\n8. 💾 Export Options');
    console.log('-'.repeat(30));
    
    console.log('Generated flashcards can be:');
    console.log('   📱 Used in the Recall study interface');
    console.log('   📤 Exported to Anki format');
    console.log('   📊 Analyzed for study patterns');
    console.log('   🔄 Updated with spaced repetition scheduling');

    // Simulate export to JSON
    const exportData = {
      metadata: {
        source: extractedContent.metadata.source,
        generatedAt: new Date().toISOString(),
        totalCards: result.cards.length,
        processingTime: duration
      },
      cards: result.cards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        type: card.type,
        difficulty: card.difficulty,
        keywords: card.keywords,
        createdAt: card.createdAt
      }))
    };

    console.log(`\n💾 Export data ready (${JSON.stringify(exportData).length} bytes)`);

  } catch (error) {
    console.error('\n❌ Flashcard generation failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if Ollama is running: ollama serve');
    console.log('2. Verify model is available: ollama list');
    console.log('3. Try with a different model or fallback mode');
    
    // Show fallback behavior
    console.log('\n🔄 Attempting fallback generation...');
    try {
      aiConfigManager.updateSettings({ enabled: false });
      const fallbackResult = await engine.generateFlashcards(extractedContent, {
        maxCards: 5,
        enableAI: false
      });
      console.log(`✅ Fallback generated ${fallbackResult.cards.length} cards`);
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
  }

  console.log('\n🎉 Complete Workflow Demo Finished!');
  console.log('\nNext steps:');
  console.log('1. Try with your own content');
  console.log('2. Experiment with different settings');
  console.log('3. Integrate with the study system');
  console.log('4. Set up spaced repetition scheduling');
}

/**
 * Quick test with minimal content
 */
export async function quickTest() {
  console.log('⚡ Quick Recall Test\n');

  const simpleContent: ExtractedContent = {
    text: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. This process occurs in chloroplasts and is essential for life on Earth.',
    metadata: {
      source: 'quick_test.txt',
      format: 'text/plain',
      extractedAt: new Date(),
      confidence: 1.0
    }
  };

  const engine = new FlashcardGenerationEngine();
  
  try {
    const result = await engine.generateFlashcards(simpleContent, {
      maxCards: 3,
      qualityThreshold: 0.5
    });

    console.log(`✅ Quick test successful! Generated ${result.cards.length} cards`);
    
    if (result.cards.length > 0) {
      const card = result.cards[0];
      console.log(`\nSample card:`);
      console.log(`Q: ${card.front}`);
      console.log(`A: ${card.back}`);
    }

  } catch (error) {
    console.log('❌ Quick test failed:', error);
  }
}

// Export for CLI usage
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--quick') {
    quickTest();
  } else {
    demonstrateCompleteWorkflow();
  }
}