/**
 * Example usage of the BasicTextHandler
 * This demonstrates how to use the text extraction functionality
 */

import { BasicTextHandler } from '../handlers/TextHandler';

export async function demonstrateTextHandler() {
  const handler = new BasicTextHandler();
  
  console.log('Supported formats:', handler.supportedFormats);
  
  // Example 1: Processing a simple text file
  const textContent = `
    # Introduction to Machine Learning
    
    Machine learning is a subset of artificial intelligence that focuses on algorithms 
    that can learn and make decisions from data. It has three main types:
    
    1. Supervised Learning - Uses labeled data to train models
    2. Unsupervised Learning - Finds patterns in unlabeled data  
    3. Reinforcement Learning - Learns through interaction and rewards
    
    Key concepts include feature engineering, model validation, and overfitting prevention.
  `;
  
  const mockFile = new File([textContent], 'ml-intro.txt', { type: 'text/plain' });
  
  try {
    // Extract text
    const extracted = await handler.extractText(mockFile);
    console.log('Extracted content:', {
      textLength: extracted.text.length,
      source: extracted.metadata.source,
      format: extracted.metadata.format,
      confidence: extracted.metadata.confidence
    });
    
    // Validate content
    const validation = handler.validateContent(extracted.text);
    console.log('Validation result:', {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });
    
    if (validation.warnings.length > 0) {
      console.log('Warnings:', validation.warnings);
    }
    
    // Get content statistics
    const stats = handler.getContentStats(extracted.text);
    console.log('Content statistics:', stats);
    
    return {
      extracted,
      validation,
      stats
    };
    
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

// Example of handling different file types
export function getFileTypeExample(filename: string): string {
  const handler = new BasicTextHandler();
  
  if (handler.supportedFormats.some(format => filename.endsWith(format))) {
    return `✅ ${filename} is supported`;
  } else {
    return `❌ ${filename} is not supported. Supported formats: ${handler.supportedFormats.join(', ')}`;
  }
}

// Example usage (commented out to avoid execution during import)
/*
async function runExample() {
  try {
    const result = await demonstrateTextHandler();
    console.log('Text handler demonstration completed successfully');
  } catch (error) {
    console.error('Text handler demonstration failed:', error);
  }
}

// Uncomment to run the example
// runExample();
*/