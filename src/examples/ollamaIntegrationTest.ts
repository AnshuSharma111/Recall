// Ollama Integration Test Script

import { FlashcardGenerationEngine } from '../engines/FlashcardGenerationEngine';
import { LocalAIModelService } from '../services/AIModelService';
import { aiConfigManager } from '../services/AIConfigManager';
// Removed unused import
import { ExtractedContent } from '../types/content';

/**
 * Tests the complete Ollama integration pipeline
 */
export async function testOllamaIntegration() {
  console.log('🦙 Ollama Integration Test\n');
  console.log('=' .repeat(50));

  // Step 1: Check Ollama availability
  console.log('\n1. 🔍 Checking Ollama Service...');
  await checkOllamaService();

  // Step 2: Test AI model service
  console.log('\n2. 🤖 Testing AI Model Service...');
  await testAIModelService();

  // Step 3: Test flashcard generation engine
  console.log('\n3. 🎓 Testing Flashcard Generation...');
  await testFlashcardGeneration();

  // Step 4: Performance test
  console.log('\n4. ⚡ Performance Test...');
  await performanceTest();

  console.log('\n🎉 Ollama Integration Test Complete!\n');
}

/**
 * Checks if Ollama service is running and accessible
 */
async function checkOllamaService() {
  try {
    console.log('Checking Ollama at http://localhost:11434...');
    
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Ollama service is running');
    console.log(`📦 Available models: ${data.models?.length || 0}`);
    
    if (data.models && data.models.length > 0) {
      console.log('Models:');
      data.models.forEach((model: any) => {
        console.log(`  - ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`);
      });
    }

    // Check for recommended models
    const recommendedModels = ['llama3.2:3b', 'llama3.2:1b', 'phi3:mini'];
    const availableModels = data.models?.map((m: any) => m.name) || [];
    
    console.log('\n🎯 Recommended models status:');
    recommendedModels.forEach(model => {
      const available = availableModels.some((available: string) => available.includes(model.split(':')[0]));
      console.log(`  ${available ? '✅' : '❌'} ${model}`);
    });

    if (!data.models || data.models.length === 0) {
      console.log('\n⚠️  No models found. Install a model with:');
      console.log('   ollama pull llama3.2:3b');
    }

  } catch (error) {
    console.error('❌ Ollama service check failed:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Install Ollama: https://ollama.ai');
    console.log('2. Start Ollama: ollama serve');
    console.log('3. Pull a model: ollama pull llama3.2:3b');
    throw error;
  }
}

/**
 * Tests the AI model service directly
 */
async function testAIModelService() {
  try {
    // Configure for Ollama
    aiConfigManager.updateSettings({
      enabled: true,
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2:3b',
      timeout: 30000,
      maxRetries: 2
    });

    const aiService = new LocalAIModelService(aiConfigManager.getModelConfig());
    
    // Test availability
    console.log('Testing AI service availability...');
    const isAvailable = await aiService.isAvailable();
    console.log(`✅ AI Service available: ${isAvailable}`);

    if (!isAvailable) {
      throw new Error('AI service not available');
    }

    // Test card generation with sample data
    console.log('Testing card generation...');
    const sampleKeywords = [
      {
        term: 'photosynthesis',
        importance: 0.9,
        context: ['Biology process'],
        category: 'concept' as any,
        frequency: 3
      },
      {
        term: 'chlorophyll',
        importance: 0.7,
        context: ['Green pigment'],
        category: 'definition' as any,
        frequency: 2
      }
    ];

    const sampleContext = [
      {
        id: 'test1',
        text: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. Chlorophyll is the green pigment that captures light energy.',
        position: 0,
        context: 'Biology textbook',
        importance: 0.9
      }
    ];

    const startTime = Date.now();
    const cards = await aiService.generateCards(sampleKeywords, sampleContext);
    const duration = Date.now() - startTime;

    console.log(`✅ Generated ${cards.length} cards in ${duration}ms`);
    
    if (cards.length > 0) {
      console.log('\n📋 Sample generated card:');
      const card = cards[0];
      console.log(`Q: ${card.front}`);
      console.log(`A: ${card.back}`);
      console.log(`Type: ${card.type}`);
      console.log(`Keywords: ${card.keywords.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ AI Model Service test failed:', error);
    throw error;
  }
}

/**
 * Tests the complete flashcard generation engine
 */
async function testFlashcardGeneration() {
  try {
    const engine = new FlashcardGenerationEngine();
    
    const sampleContent: ExtractedContent = {
      text: `Artificial Intelligence and Machine Learning

Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. Machine learning focuses on the development of computer programs that can access data and use it to learn for themselves.

Types of Machine Learning:

1. Supervised Learning: The algorithm learns from labeled training data and makes predictions on new data.

2. Unsupervised Learning: The algorithm finds hidden patterns in data without labeled examples.

3. Reinforcement Learning: The algorithm learns through interaction with an environment, receiving rewards or penalties.

Neural Networks are computing systems inspired by biological neural networks. They consist of interconnected nodes that process information and can learn complex patterns in data.

Deep Learning is a subset of machine learning that uses neural networks with multiple layers to model and understand complex patterns in data.`,
      metadata: {
        source: 'ai_basics.txt',
        format: 'text/plain',
        extractedAt: new Date(),
        confidence: 1.0,
        size: 800
      }
    };

    console.log('Testing complete generation pipeline...');
    const startTime = Date.now();
    
    const result = await engine.generateFlashcards(sampleContent, {
      maxCards: 5,
      qualityThreshold: 0.6,
      includeMetadata: true
    });
    
    const duration = Date.now() - startTime;

    console.log(`✅ Generated ${result.cards.length} cards in ${duration}ms`);
    console.log(`🤖 AI used: ${result.statistics.aiUsed}`);
    console.log(`📊 Average quality: ${(result.statistics.averageQuality * 100).toFixed(1)}%`);

    // Show generated cards
    console.log('\n📚 Generated Cards:');
    result.cards.forEach((card, index) => {
      console.log(`\n${index + 1}. ${card.type.toUpperCase()}`);
      console.log(`   Q: ${card.front}`);
      console.log(`   A: ${card.back.substring(0, 100)}${card.back.length > 100 ? '...' : ''}`);
      console.log(`   Keywords: ${card.keywords.join(', ')}`);
    });

    // Show processing steps
    console.log('\n🔄 Processing Steps:');
    result.metadata.processing.steps.forEach(step => {
      const status = step.success ? '✅' : '❌';
      console.log(`${status} ${step.name}: ${step.duration}ms`);
    });

  } catch (error) {
    console.error('❌ Flashcard generation test failed:', error);
    throw error;
  }
}

/**
 * Performance test with larger content
 */
async function performanceTest() {
  try {
    const engine = new FlashcardGenerationEngine();
    
    // Create larger content for performance testing
    const largeContent: ExtractedContent = {
      text: `Computer Science Fundamentals

Data Structures and Algorithms

A data structure is a way of organizing and storing data so that it can be accessed and modified efficiently. Common data structures include arrays, linked lists, stacks, queues, trees, and graphs.

Arrays are collections of elements stored in contiguous memory locations. They provide constant-time access to elements by index but have fixed size in many programming languages.

Linked Lists consist of nodes where each node contains data and a reference to the next node. They allow dynamic size but require sequential access to elements.

Stacks follow the Last-In-First-Out (LIFO) principle. Elements are added and removed from the same end, called the top of the stack.

Queues follow the First-In-First-Out (FIFO) principle. Elements are added at the rear and removed from the front.

Trees are hierarchical data structures with a root node and child nodes. Binary trees have at most two children per node.

Graphs consist of vertices (nodes) connected by edges. They can be directed or undirected, weighted or unweighted.

Algorithms

An algorithm is a step-by-step procedure for solving a problem or completing a task. Algorithm efficiency is measured using Big O notation.

Sorting Algorithms arrange elements in a specific order. Common sorting algorithms include bubble sort, merge sort, quick sort, and heap sort.

Search Algorithms find specific elements in data structures. Linear search checks each element sequentially, while binary search works on sorted arrays.

Dynamic Programming solves complex problems by breaking them down into simpler subproblems and storing the results to avoid redundant calculations.

Greedy Algorithms make locally optimal choices at each step, hoping to find a global optimum.

Object-Oriented Programming

Object-Oriented Programming (OOP) is a programming paradigm based on the concept of objects, which contain data (attributes) and code (methods).

Encapsulation bundles data and methods that work on that data within a single unit and restricts access to some components.

Inheritance allows a class to inherit properties and methods from another class, promoting code reuse.

Polymorphism allows objects of different types to be treated as objects of a common base type.

Abstraction hides complex implementation details and shows only the necessary features of an object.`.repeat(2), // Double the content
      metadata: {
        source: 'cs_fundamentals.txt',
        format: 'text/plain',
        extractedAt: new Date(),
        confidence: 1.0,
        size: 2000
      }
    };

    console.log(`Testing with larger content (${largeContent.text.length} characters)...`);
    
    const startTime = Date.now();
    const result = await engine.generateFlashcards(largeContent, {
      maxCards: 10,
      batchSize: 3,
      qualityThreshold: 0.7
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Performance test completed in ${duration}ms`);
    console.log(`📊 Generated ${result.cards.length} cards`);
    console.log(`⚡ Rate: ${(result.cards.length / (duration / 1000)).toFixed(2)} cards/second`);
    console.log(`🧠 Processing efficiency: ${(largeContent.text.length / duration).toFixed(0)} chars/ms`);

    // Memory usage (approximate)
    const memoryUsage = process.memoryUsage();
    console.log(`💾 Memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  }
}

/**
 * Interactive setup helper
 */
export async function setupOllama() {
  console.log('🦙 Ollama Setup Helper\n');
  console.log('This will help you set up Ollama for Recall.\n');

  console.log('📋 Setup Steps:');
  console.log('1. Install Ollama from https://ollama.ai');
  console.log('2. Start Ollama service: ollama serve');
  console.log('3. Pull a recommended model:');
  console.log('   - Fast & efficient: ollama pull llama3.2:3b');
  console.log('   - Very fast: ollama pull phi3:mini');
  console.log('   - Higher quality: ollama pull mistral:7b');
  console.log('4. Test the integration: npm run test:ollama\n');

  // Check current status
  try {
    await checkOllamaService();
    console.log('\n✅ Ollama is ready! You can now use AI-powered flashcard generation.');
  } catch (error) {
    console.log('\n⚠️  Ollama setup needed. Please follow the steps above.');
  }
}

/**
 * Configuration helper
 */
export function configureOllama(model: string = 'llama3.2:3b') {
  console.log(`🔧 Configuring Ollama with model: ${model}`);
  
  aiConfigManager.updateSettings({
    enabled: true,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: model,
    timeout: 30000,
    maxRetries: 3,
    fallbackEnabled: true,
    cardGenerationSettings: {
      maxCardsPerSession: 10,
      preferredCardTypes: ['definition', 'question_answer'],
      difficultyLevel: 'mixed',
      qualityThreshold: 0.6
    }
  });

  console.log('✅ Ollama configuration updated');
  console.log('Settings:', aiConfigManager.getSettings());
}

// Export for use in other files
export { testOllamaIntegration as default };