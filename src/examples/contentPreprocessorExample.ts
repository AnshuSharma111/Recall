/**
 * Example usage of the BasicContentPreprocessor
 * This demonstrates how to use the content preprocessing and chunking functionality
 */

import { BasicContentPreprocessor } from '../processors/ContentPreprocessor';
import { ExtractedContent } from '../types/content';

export async function demonstrateContentPreprocessor() {
  const preprocessor = new BasicContentPreprocessor();
  
  // Example content with various formatting
  const sampleContent: ExtractedContent = {
    text: `
      # Introduction to Machine Learning
      
      Machine learning is a subset of artificial intelligence that focuses on algorithms 
      that can learn and make decisions from data. It has three main types:
      
      • Supervised Learning - Uses labeled data to train models
      • Unsupervised Learning - Finds patterns in unlabeled data  
      • Reinforcement Learning - Learns through interaction and rewards
      
      What are the key concepts in machine learning?
      
      Key concepts include feature engineering, model validation, and overfitting prevention.
      These concepts are important for building effective machine learning systems.
      
      Page 1
      
      The process involves data collection, preprocessing, model training, and evaluation.
      Each step is crucial for success.
    `,
    metadata: {
      source: 'ml-guide.pdf',
      format: '.pdf',
      extractedAt: new Date(),
      confidence: 0.95
    }
  };

  try {
    console.log('=== Content Preprocessing Demo ===\n');
    
    // Step 1: Clean the text
    console.log('1. Cleaning text...');
    const cleanedText = preprocessor.cleanText(sampleContent.text);
    console.log('Original length:', sampleContent.text.length);
    console.log('Cleaned length:', cleanedText.length);
    console.log('Cleaned text preview:', cleanedText.substring(0, 100) + '...\n');
    
    // Step 2: Detect language
    console.log('2. Detecting language...');
    const language = preprocessor.detectLanguage(cleanedText);
    console.log('Detected language:', language, '\n');
    
    // Step 3: Chunk the content
    console.log('3. Chunking content...');
    const chunks = preprocessor.chunkContent(sampleContent);
    console.log('Number of chunks created:', chunks.length, '\n');
    
    // Step 4: Analyze chunks
    console.log('4. Chunk analysis:');
    chunks.forEach((chunk, index) => {
      console.log(`\nChunk ${index + 1}:`);
      console.log('  Type:', chunk.metadata?.chunkType);
      console.log('  Importance:', chunk.importance.toFixed(2));
      console.log('  Word count:', chunk.metadata?.wordCount);
      console.log('  Sentence count:', chunk.metadata?.sentenceCount);
      console.log('  Text preview:', chunk.text.substring(0, 80) + '...');
      if (chunk.context) {
        console.log('  Context:', chunk.context.substring(0, 50) + '...');
      }
    });
    
    // Step 5: Show chunk type distribution
    console.log('\n5. Chunk type distribution:');
    const typeDistribution = chunks.reduce((acc, chunk) => {
      const type = chunk.metadata?.chunkType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(typeDistribution).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} chunks`);
    });
    
    // Step 6: Show importance distribution
    console.log('\n6. Importance analysis:');
    const importanceScores = chunks.map(c => c.importance);
    const avgImportance = importanceScores.reduce((a, b) => a + b, 0) / importanceScores.length;
    const maxImportance = Math.max(...importanceScores);
    const minImportance = Math.min(...importanceScores);
    
    console.log(`  Average importance: ${avgImportance.toFixed(2)}`);
    console.log(`  Highest importance: ${maxImportance.toFixed(2)}`);
    console.log(`  Lowest importance: ${minImportance.toFixed(2)}`);
    
    return {
      cleanedText,
      language,
      chunks,
      stats: {
        chunkCount: chunks.length,
        typeDistribution,
        avgImportance,
        maxImportance,
        minImportance
      }
    };
    
  } catch (error) {
    console.error('Error during preprocessing:', error);
    throw error;
  }
}

// Example of processing different content types
export function demonstrateContentTypes() {
  const preprocessor = new BasicContentPreprocessor();
  
  const examples = [
    {
      name: 'Academic Paper',
      content: 'Abstract: This paper presents a novel approach to natural language processing. The methodology involves deep learning techniques and statistical analysis.'
    },
    {
      name: 'Technical Documentation',
      content: '## Installation\n\n1. Download the package\n2. Run npm install\n3. Configure settings\n\nThe system requires Node.js version 16 or higher.'
    },
    {
      name: 'Question Format',
      content: 'What is the difference between supervised and unsupervised learning? How do you choose the right algorithm for your problem?'
    },
    {
      name: 'List Format',
      content: '• Machine Learning\n• Deep Learning\n• Neural Networks\n• Computer Vision\n• Natural Language Processing'
    }
  ];
  
  console.log('\n=== Content Type Analysis ===\n');
  
  examples.forEach(example => {
    const language = preprocessor.detectLanguage(example.content);
    const cleaned = preprocessor.cleanText(example.content);
    
    console.log(`${example.name}:`);
    console.log(`  Language: ${language}`);
    console.log(`  Length: ${cleaned.length} characters`);
    console.log(`  Preview: ${cleaned.substring(0, 60)}...`);
    console.log('');
  });
}

// Example usage (commented out to avoid execution during import)
/*
async function runExample() {
  try {
    const result = await demonstrateContentPreprocessor();
    demonstrateContentTypes();
    console.log('\nContent preprocessing demonstration completed successfully');
  } catch (error) {
    console.error('Content preprocessing demonstration failed:', error);
  }
}

// Uncomment to run the example
// runExample();
*/