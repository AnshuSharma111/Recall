/**
 * Example usage of the BasicKeywordExtractor
 * This demonstrates how to use the keyword extraction functionality
 */

import { BasicKeywordExtractor } from '../processors/KeywordExtractor';
import { BasicContentPreprocessor } from '../processors/ContentPreprocessor';
import { ExtractedContent } from '../types/content';

export async function demonstrateKeywordExtractor() {
  const preprocessor = new BasicContentPreprocessor();
  const extractor = new BasicKeywordExtractor();
  
  // Example content about machine learning
  const sampleContent: ExtractedContent = {
    text: `
      Machine Learning Fundamentals
      
      Machine learning is a method of data analysis that automates analytical model building. 
      It is a branch of artificial intelligence based on the idea that systems can learn from data, 
      identify patterns, and make decisions with minimal human intervention.
      
      Key Concepts and Definitions:
      
      Supervised Learning: Uses labeled training data to learn a mapping function from input to output.
      For example, email spam detection uses labeled examples of spam and non-spam emails.
      
      Unsupervised Learning: Finds hidden patterns in data without labeled examples.
      The process involves clustering, association rules, and dimensionality reduction.
      
      Deep Learning: A subset of machine learning that uses neural networks with multiple layers.
      Studies show that 85% of AI projects now incorporate deep learning techniques.
      
      Important algorithms include decision trees, support vector machines, and neural networks.
    `,
    metadata: {
      source: 'ml-guide.pdf',
      format: '.pdf',
      extractedAt: new Date(),
      confidence: 0.95
    }
  };

  try {
    console.log('=== Keyword Extraction Demo ===\n');
    
    // Step 1: Preprocess the content into chunks
    console.log('1. Preprocessing content...');
    const chunks = preprocessor.chunkContent(sampleContent);
    console.log(`Created ${chunks.length} content chunks\n`);
    
    // Step 2: Extract keywords from chunks
    console.log('2. Extracting keywords...');
    const keywords = extractor.extractKeywords(chunks);
    console.log(`Extracted ${keywords.length} keywords\n`);
    
    // Step 3: Rank keywords by importance
    console.log('3. Ranking keywords by importance...');
    const rankedKeywords = extractor.rankByImportance(keywords);
    console.log('Top 10 keywords:');
    rankedKeywords.slice(0, 10).forEach((keyword, index) => {
      console.log(`  ${index + 1}. "${keyword.term}" (${keyword.category})`);
      console.log(`     Importance: ${keyword.importance.toFixed(3)}`);
      console.log(`     Frequency: ${keyword.frequency}, Chunks: ${keyword.chunkCount}`);
      if (keyword.context.length > 0) {
        console.log(`     Context: "${keyword.context[0].substring(0, 60)}..."`);
      }
      console.log('');
    });
    
    // Step 4: Show extraction statistics
    console.log('4. Extraction statistics:');
    const stats = extractor.getExtractionStats(keywords);
    console.log(`  Total keywords: ${stats.totalKeywords}`);
    console.log(`  Average importance: ${stats.averageImportance.toFixed(3)}`);
    console.log('  Category distribution:');
    Object.entries(stats.categoryDistribution).forEach(([category, count]) => {
      console.log(`    ${category}: ${count} keywords`);
    });
    
    // Step 5: Show keywords by category
    console.log('\n5. Keywords by category:');
    const keywordsByCategory = keywords.reduce((acc, keyword) => {
      if (!acc[keyword.category]) {
        acc[keyword.category] = [];
      }
      acc[keyword.category].push(keyword);
      return acc;
    }, {} as Record<string, typeof keywords>);
    
    Object.entries(keywordsByCategory).forEach(([category, categoryKeywords]) => {
      console.log(`\n  ${category.toUpperCase()}:`);
      categoryKeywords
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5)
        .forEach(keyword => {
          console.log(`    - ${keyword.term} (${keyword.importance.toFixed(3)})`);
        });
    });
    
    return {
      chunks,
      keywords: rankedKeywords,
      stats
    };
    
  } catch (error) {
    console.error('Error during keyword extraction:', error);
    throw error;
  }
}

// Example of processing different content types
export function demonstrateKeywordCategories() {
  const extractor = new BasicKeywordExtractor();
  const preprocessor = new BasicContentPreprocessor();
  
  const examples = [
    {
      name: 'Definition Content',
      text: 'Machine learning is a method of data analysis that automates analytical model building.'
    },
    {
      name: 'Process Content', 
      text: 'The process involves data collection, preprocessing, model training, and evaluation phases.'
    },
    {
      name: 'Example Content',
      text: 'For example, supervised learning uses labeled training data to make predictions.'
    },
    {
      name: 'Fact Content',
      text: 'Studies show that 85% of AI projects use machine learning algorithms.'
    }
  ];
  
  console.log('\n=== Keyword Category Analysis ===\n');
  
  examples.forEach(example => {
    const content: ExtractedContent = {
      text: example.text,
      metadata: {
        source: 'example.txt',
        format: '.txt',
        extractedAt: new Date(),
        confidence: 1.0
      }
    };
    
    const chunks = preprocessor.chunkContent(content);
    const keywords = extractor.extractKeywords(chunks);
    
    console.log(`${example.name}:`);
    console.log(`  Text: "${example.text}"`);
    console.log(`  Keywords: ${keywords.map(k => `${k.term} (${k.category})`).join(', ')}`);
    console.log('');
  });
}

// Example usage (commented out to avoid execution during import)
/*
async function runExample() {
  try {
    const result = await demonstrateKeywordExtractor();
    demonstrateKeywordCategories();
    console.log('\nKeyword extraction demonstration completed successfully');
  } catch (error) {
    console.error('Keyword extraction demonstration failed:', error);
  }
}

// Uncomment to run the example
// runExample();
*/