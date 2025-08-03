// Comprehensive Flashcard Generation Engine Example

import { FlashcardGenerationEngine, GenerationOptions } from '../engines/FlashcardGenerationEngine';
import { PromptEngineer } from '../services/PromptEngineering';
import { ExtractedContent } from '../types/content';
import { CardType, DifficultyLevel } from '../types/flashcard';

/**
 * Demonstrates the complete flashcard generation pipeline
 */
export async function demonstrateFlashcardGeneration() {
  console.log('🎓 Flashcard Generation Engine Demo\n');

  // Initialize the engine
  const engine = new FlashcardGenerationEngine();
  const promptEngineer = new PromptEngineer();

  // Sample educational content
  const sampleContent: ExtractedContent = {
    text: `Machine Learning and Artificial Intelligence

Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence (AI) based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.

Types of Machine Learning:

1. Supervised Learning: Uses labeled training data to learn a mapping function from inputs to outputs. Examples include classification and regression tasks.

2. Unsupervised Learning: Finds hidden patterns in data without labeled examples. Common techniques include clustering and dimensionality reduction.

3. Reinforcement Learning: An agent learns to make decisions by taking actions in an environment to maximize cumulative reward.

Neural Networks:
Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information using a connectionist approach to computation. Deep learning uses neural networks with multiple hidden layers.

Key Concepts:
- Training Data: The dataset used to teach the algorithm
- Features: Individual measurable properties of observed phenomena
- Model: The mathematical representation learned from data
- Overfitting: When a model performs well on training data but poorly on new data
- Cross-validation: A technique to assess model performance and generalization

Applications:
Machine learning has applications in image recognition, natural language processing, recommendation systems, autonomous vehicles, medical diagnosis, and financial trading.`,
    metadata: {
      source: 'ml_introduction.txt',
      format: 'text/plain',
      extractedAt: new Date(),
      confidence: 1.0,
      size: 1200,
      originalFileName: 'machine_learning_basics.txt'
    }
  };

  console.log('📚 Sample Content Loaded:');
  console.log(`- Source: ${sampleContent.metadata.source}`);
  console.log(`- Length: ${sampleContent.text.length} characters`);
  console.log(`- Format: ${sampleContent.metadata.format}\n`);

  // Demonstrate different generation scenarios
  await demonstrateBasicGeneration(engine, sampleContent);
  await demonstrateAdvancedOptions(engine, sampleContent);
  await demonstrateTypeSpecificGeneration(engine, sampleContent);
  await demonstrateDifficultyLevels(engine, sampleContent);
  await demonstratePromptEngineering(promptEngineer, sampleContent);
  await demonstrateQualityControl(engine, sampleContent);
  await demonstrateBatchProcessing(engine, sampleContent);

  console.log('🎉 Flashcard Generation Demo Complete!\n');
}

/**
 * Demonstrates basic flashcard generation
 */
async function demonstrateBasicGeneration(
  engine: FlashcardGenerationEngine,
  content: ExtractedContent
) {
  console.log('1. 📝 Basic Flashcard Generation');
  console.log('=' .repeat(40));

  try {
    const result = await engine.generateFlashcards(content);

    console.log(`✅ Generated ${result.cards.length} flashcards`);
    console.log(`⏱️  Processing time: ${result.statistics.processingTime}ms`);
    console.log(`🤖 AI used: ${result.statistics.aiUsed}`);
    console.log(`📊 Average quality: ${(result.statistics.averageQuality * 100).toFixed(1)}%`);

    // Show first few cards
    console.log('\n📋 Sample Cards:');
    result.cards.slice(0, 3).forEach((card, index) => {
      console.log(`\nCard ${index + 1} (${card.type}):`);
      console.log(`Q: ${card.front}`);
      console.log(`A: ${card.back}`);
      console.log(`Keywords: ${card.keywords.join(', ')}`);
    });

    console.log('\n📈 Statistics:');
    console.log('Card Types:', result.statistics.byType);
    console.log('Difficulty Distribution:', result.statistics.byDifficulty);

  } catch (error) {
    console.error('❌ Basic generation failed:', error);
  }

  console.log('\n');
}

/**
 * Demonstrates advanced generation options
 */
async function demonstrateAdvancedOptions(
  engine: FlashcardGenerationEngine,
  content: ExtractedContent
) {
  console.log('2. ⚙️  Advanced Generation Options');
  console.log('=' .repeat(40));

  const advancedOptions: GenerationOptions = {
    maxCards: 8,
    qualityThreshold: 0.7,
    includeMetadata: true,
    batchSize: 3,
    enableAI: true
  };

  try {
    const result = await engine.generateFlashcards(content, advancedOptions);

    console.log(`✅ Generated ${result.cards.length} high-quality cards`);
    console.log(`🎯 Quality threshold: ${advancedOptions.qualityThreshold}`);
    console.log(`📦 Batch size: ${advancedOptions.batchSize}`);

    // Show processing steps
    console.log('\n🔄 Processing Steps:');
    result.metadata.processing.steps.forEach(step => {
      const status = step.success ? '✅' : '❌';
      console.log(`${status} ${step.name}: ${step.duration}ms`);
    });

    // Show quality information
    console.log('\n📊 Quality Metrics:');
    console.log(`Overall: ${(result.metadata.quality.averageScores.overall * 100).toFixed(1)}%`);
    console.log(`Clarity: ${(result.metadata.quality.averageScores.clarity * 100).toFixed(1)}%`);
    console.log(`Relevance: ${(result.metadata.quality.averageScores.relevance * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Advanced generation failed:', error);
  }

  console.log('\n');
}

/**
 * Demonstrates type-specific card generation
 */
async function demonstrateTypeSpecificGeneration(
  engine: FlashcardGenerationEngine,
  content: ExtractedContent
) {
  console.log('3. 🎯 Type-Specific Generation');
  console.log('=' .repeat(40));

  const cardTypes = [
    CardType.DEFINITION,
    CardType.QUESTION_ANSWER,
    CardType.FILL_BLANK
  ];

  for (const cardType of cardTypes) {
    console.log(`\n📝 Generating ${cardType} cards...`);

    const options: GenerationOptions = {
      preferredTypes: [cardType],
      maxCards: 3
    };

    try {
      const result = await engine.generateFlashcards(content, options);
      
      console.log(`✅ Generated ${result.cards.length} ${cardType} cards`);
      
      if (result.cards.length > 0) {
        const sampleCard = result.cards[0];
        console.log(`Sample: ${sampleCard.front} → ${sampleCard.back.substring(0, 50)}...`);
      }

    } catch (error) {
      console.error(`❌ ${cardType} generation failed:`, error);
    }
  }

  console.log('\n');
}

/**
 * Demonstrates different difficulty levels
 */
async function demonstrateDifficultyLevels(
  engine: FlashcardGenerationEngine,
  content: ExtractedContent
) {
  console.log('4. 📊 Difficulty Level Generation');
  console.log('=' .repeat(40));

  const difficultyLevels: Array<'easy' | 'medium' | 'hard' | 'mixed'> = [
    'easy', 'medium', 'hard', 'mixed'
  ];

  for (const difficulty of difficultyLevels) {
    console.log(`\n🎚️  Generating ${difficulty} level cards...`);

    const options: GenerationOptions = {
      difficultyLevel: difficulty,
      maxCards: 2
    };

    try {
      const result = await engine.generateFlashcards(content, options);
      
      console.log(`✅ Generated ${result.cards.length} ${difficulty} cards`);
      
      // Show difficulty distribution
      const difficultyDist = result.statistics.byDifficulty;
      console.log('Distribution:', difficultyDist);

    } catch (error) {
      console.error(`❌ ${difficulty} generation failed:`, error);
    }
  }

  console.log('\n');
}

/**
 * Demonstrates prompt engineering capabilities
 */
async function demonstratePromptEngineering(
  promptEngineer: PromptEngineer,
  content: ExtractedContent
) {
  console.log('5. 🧠 Prompt Engineering');
  console.log('=' .repeat(40));

  // Mock context for demonstration
  const mockContext = {
    keywords: [
      {
        term: 'machine learning',
        importance: 0.9,
        context: ['AI and data science'],
        category: 'concept' as any,
        frequency: 5
      },
      {
        term: 'neural network',
        importance: 0.8,
        context: ['Deep learning'],
        category: 'definition' as any,
        frequency: 3
      }
    ],
    chunks: [
      {
        id: '1',
        text: content.text.substring(0, 200),
        position: 0,
        context: 'Introduction',
        importance: 0.9
      }
    ],
    maxCards: 3
  };

  console.log('🎯 Available Templates:');
  const templates = promptEngineer.getAvailableTemplates();
  templates.forEach(template => console.log(`- ${template}`));

  console.log('\n📝 Generated Prompts:');

  // Generate different types of prompts
  try {
    const basicPrompt = promptEngineer.generatePrompt(mockContext);
    console.log(`\n🔹 Basic Prompt (${basicPrompt.length} chars)`);
    console.log(basicPrompt.substring(0, 200) + '...');

    const definitionPrompt = promptEngineer.generateTypedPrompt(CardType.DEFINITION, mockContext);
    console.log(`\n🔹 Definition Prompt (${definitionPrompt.length} chars)`);
    console.log(definitionPrompt.substring(0, 200) + '...');

    const hardPrompt = promptEngineer.generateDifficultyPrompt(DifficultyLevel.HARD, mockContext);
    console.log(`\n🔹 Hard Difficulty Prompt (${hardPrompt.length} chars)`);
    console.log(hardPrompt.substring(0, 200) + '...');

    // Validate prompts
    const validation = promptEngineer.validatePrompt(basicPrompt);
    console.log(`\n✅ Prompt Validation: ${validation.isValid ? 'Valid' : 'Invalid'}`);
    if (!validation.isValid) {
      console.log('Issues:', validation.issues);
      console.log('Suggestions:', validation.suggestions);
    }

  } catch (error) {
    console.error('❌ Prompt generation failed:', error);
  }

  console.log('\n');
}

/**
 * Demonstrates quality control features
 */
async function demonstrateQualityControl(
  engine: FlashcardGenerationEngine,
  content: ExtractedContent
) {
  console.log('6. 🔍 Quality Control');
  console.log('=' .repeat(40));

  const qualityOptions: GenerationOptions = {
    maxCards: 10,
    qualityThreshold: 0.8,
    includeMetadata: true
  };

  try {
    const result = await engine.generateFlashcards(content, qualityOptions);

    console.log(`✅ Generated ${result.cards.length} high-quality cards`);
    console.log(`🎯 Quality threshold: ${qualityOptions.qualityThreshold}`);

    // Analyze quality scores
    const qualityScores = result.cards
      .map(card => (card as any).qualityScore)
      .filter(score => score);

    if (qualityScores.length > 0) {
      const avgOverall = qualityScores.reduce((sum, s) => sum + s.overall, 0) / qualityScores.length;
      const avgClarity = qualityScores.reduce((sum, s) => sum + s.clarity, 0) / qualityScores.length;
      const avgRelevance = qualityScores.reduce((sum, s) => sum + s.relevance, 0) / qualityScores.length;

      console.log('\n📊 Quality Analysis:');
      console.log(`Overall: ${(avgOverall * 100).toFixed(1)}%`);
      console.log(`Clarity: ${(avgClarity * 100).toFixed(1)}%`);
      console.log(`Relevance: ${(avgRelevance * 100).toFixed(1)}%`);

      // Show quality distribution
      const qualityRanges = {
        excellent: qualityScores.filter(s => s.overall >= 0.9).length,
        good: qualityScores.filter(s => s.overall >= 0.7 && s.overall < 0.9).length,
        fair: qualityScores.filter(s => s.overall >= 0.5 && s.overall < 0.7).length,
        poor: qualityScores.filter(s => s.overall < 0.5).length
      };

      console.log('\n📈 Quality Distribution:');
      console.log(`Excellent (90%+): ${qualityRanges.excellent}`);
      console.log(`Good (70-89%): ${qualityRanges.good}`);
      console.log(`Fair (50-69%): ${qualityRanges.fair}`);
      console.log(`Poor (<50%): ${qualityRanges.poor}`);
    }

  } catch (error) {
    console.error('❌ Quality control demo failed:', error);
  }

  console.log('\n');
}

/**
 * Demonstrates batch processing capabilities
 */
async function demonstrateBatchProcessing(
  engine: FlashcardGenerationEngine,
  content: ExtractedContent
) {
  console.log('7. 📦 Batch Processing');
  console.log('=' .repeat(40));

  // Create larger content for batch processing demo
  const largeContent: ExtractedContent = {
    ...content,
    text: content.text.repeat(3), // Triple the content
    metadata: {
      ...content.metadata,
      size: content.text.length * 3
    }
  };

  const batchOptions: GenerationOptions = {
    maxCards: 15,
    batchSize: 4,
    includeMetadata: true
  };

  try {
    console.log(`📊 Processing ${largeContent.text.length} characters in batches of ${batchOptions.batchSize}`);
    
    const startTime = Date.now();
    const result = await engine.generateFlashcards(largeContent, batchOptions);
    const processingTime = Date.now() - startTime;

    console.log(`✅ Generated ${result.cards.length} cards in ${processingTime}ms`);
    console.log(`⚡ Processing rate: ${(result.cards.length / (processingTime / 1000)).toFixed(2)} cards/second`);

    // Show batch processing steps
    console.log('\n🔄 Processing Timeline:');
    result.metadata.processing.steps.forEach((step, index) => {
      console.log(`${index + 1}. ${step.name}: ${step.duration}ms ${step.success ? '✅' : '❌'}`);
    });

    // Memory and performance metrics
    console.log('\n📈 Performance Metrics:');
    console.log(`Source content: ${result.metadata.sourceContent.originalLength} chars`);
    console.log(`Chunks created: ${result.metadata.sourceContent.chunksCreated}`);
    console.log(`Keywords extracted: ${result.metadata.sourceContent.keywordsExtracted}`);
    console.log(`Cards generated: ${result.statistics.totalGenerated}`);

  } catch (error) {
    console.error('❌ Batch processing demo failed:', error);
  }

  console.log('\n');
}

/**
 * Utility function to create sample content for different subjects
 */
export function createSampleContent(subject: string): ExtractedContent {
  const contentMap: Record<string, string> = {
    science: `Photosynthesis is the process by which plants and other organisms use sunlight to synthesize foods with the help of chlorophyll. The process converts carbon dioxide and water into glucose and oxygen. This process is crucial for life on Earth as it produces oxygen and serves as the primary source of energy for most ecosystems.`,
    
    history: `The American Revolution (1775-1783) was a colonial revolt that took place in British America. The colonists rejected the authority of the British Parliament to tax them without representation and formed the Continental Congress. Key events included the Boston Tea Party, the Declaration of Independence, and the victory at Yorktown.`,
    
    mathematics: `Calculus is a branch of mathematics that deals with rates of change and accumulation. It has two main branches: differential calculus (concerning rates of change) and integral calculus (concerning accumulation of quantities). The fundamental theorem of calculus connects these two branches.`,
    
    technology: `Cloud computing is the delivery of computing services over the internet. It includes servers, storage, databases, networking, software, analytics, and intelligence. Cloud computing offers faster innovation, flexible resources, and economies of scale. Major service models include IaaS, PaaS, and SaaS.`
  };

  return {
    text: contentMap[subject] || contentMap.science,
    metadata: {
      source: `${subject}_content.txt`,
      format: 'text/plain',
      extractedAt: new Date(),
      confidence: 1.0,
      size: contentMap[subject]?.length || 0
    }
  };
}

/**
 * Performance benchmarking function
 */
export async function benchmarkGeneration() {
  console.log('⚡ Performance Benchmark');
  console.log('=' .repeat(30));

  const engine = new FlashcardGenerationEngine();
  const testSizes = [500, 1000, 2000, 5000];
  
  for (const size of testSizes) {
    const content = createSampleContent('science');
    content.text = content.text.repeat(Math.ceil(size / content.text.length));
    content.metadata.size = content.text.length;

    const startTime = Date.now();
    try {
      const result = await engine.generateFlashcards(content, { maxCards: 10 });
      const processingTime = Date.now() - startTime;
      
      console.log(`📊 ${size} chars: ${result.cards.length} cards in ${processingTime}ms`);
    } catch (error) {
      console.log(`❌ ${size} chars: Failed`);
    }
  }
}