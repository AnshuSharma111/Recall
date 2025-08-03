import { ContentPreprocessor, ExtractedContent, ContentChunk } from '../interfaces/processors';
import { ValidationError } from '../models/validation';
import { v4 as uuidv4 } from 'uuid';

export class BasicContentPreprocessor implements ContentPreprocessor {
  private readonly minChunkLength = 50;
  private readonly maxChunkLength = 800;

  /**
   * Chunks content into logical segments for processing
   */
  public chunkContent(content: ExtractedContent): ContentChunk[] {
    if (!content.text || content.text.trim().length === 0) {
      throw new ValidationError(
        'content',
        'Cannot chunk empty content',
        'EMPTY_CONTENT',
        { content }
      );
    }

    const cleanedText = this.cleanText(content.text);
    const chunks: ContentChunk[] = [];

    try {
      // Split by paragraphs first
      const paragraphs = cleanedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      paragraphs.forEach((paragraph, index) => {
        const trimmed = paragraph.trim();
        
        if (trimmed.length >= this.minChunkLength) {
          // If paragraph is within limits, use as-is
          if (trimmed.length <= this.maxChunkLength) {
            chunks.push(this.createChunk(trimmed, index, content.metadata.source, cleanedText));
          } else {
            // Split large paragraphs by sentences
            const subChunks = this.splitLargeParagraph(trimmed);
            subChunks.forEach((subChunk, subIndex) => {
              chunks.push(this.createChunk(subChunk, index + subIndex * 0.1, content.metadata.source, cleanedText));
            });
          }
        } else {
          // Create chunk even if small
          chunks.push(this.createChunk(trimmed, index, content.metadata.source, cleanedText));
        }
      });

      // Ensure we have at least one chunk
      if (chunks.length === 0) {
        chunks.push(this.createChunk(cleanedText, 0, content.metadata.source, cleanedText));
      }

      return chunks;
    } catch (error) {
      throw new ValidationError(
        'chunking',
        `Failed to chunk content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHUNKING_FAILED',
        { originalError: error, contentLength: content.text.length }
      );
    }
  }

  /**
   * Cleans and normalizes text content
   */
  public cleanText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Normalize line endings and whitespace
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\r/g, '\n');
    cleaned = cleaned.replace(/\t/g, ' ');
    cleaned = cleaned.replace(/ +/g, ' ');
    
    // Clean up Unicode characters
    cleaned = cleaned.replace(/\u00A0/g, ' '); // Non-breaking space
    cleaned = cleaned.replace(/[\u2018\u2019]/g, "'"); // Smart quotes
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
    cleaned = cleaned.replace(/\u2026/g, '...'); // Ellipsis
    
    // Normalize excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Remove standalone page numbers
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
    cleaned = cleaned.replace(/^\s*Page\s+\d+\s*$/gim, '');
    
    // Clean up empty lines left by removals but preserve paragraph structure
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return cleaned.trim();
  }

  /**
   * Simple language detection based on common words
   */
  public detectLanguage(text: string): string {
    if (!text || text.trim().length < 20) {
      return 'unknown';
    }

    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleanText.split(/\s+/).filter(word => word.length > 2);
    
    if (words.length < 10) {
      return 'unknown';
    }

    // Simple patterns for major languages
    const patterns = {
      english: ['the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but'],
      spanish: ['que', 'de', 'no', 'la', 'el', 'en', 'y', 'a', 'es', 'se'],
      french: ['de', 'le', 'et', 'à', 'un', 'il', 'être', 'que', 'pour', 'dans'],
      german: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich']
    };

    let bestLanguage = 'unknown';
    let bestScore = 0;

    for (const [language, commonWords] of Object.entries(patterns)) {
      let score = 0;
      for (const word of words.slice(0, 50)) { // Check first 50 words
        if (commonWords.includes(word)) {
          score++;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestLanguage = language;
      }
    }

    // Require at least 3 matches for confidence
    return bestScore >= 3 ? bestLanguage : 'unknown';
  }

  /**
   * Creates a ContentChunk object with metadata
   */
  private createChunk(text: string, position: number, source: string, fullText: string): ContentChunk {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      id: uuidv4(),
      text: text.trim(),
      position: Math.floor(position),
      context: this.extractContext(text, fullText),
      importance: this.calculateImportance(text),
      metadata: {
        source,
        chunkType: this.determineChunkType(text),
        wordCount: words.length,
        sentenceCount: sentences.length
      }
    };
  }

  /**
   * Splits large paragraphs by sentences
   */
  private splitLargeParagraph(paragraph: string): string[] {
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
      
      if (testChunk.length <= this.maxChunkLength) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [paragraph];
  }

  /**
   * Extracts surrounding context for a chunk
   */
  private extractContext(chunkText: string, fullText: string): string {
    const chunkIndex = fullText.indexOf(chunkText);
    if (chunkIndex === -1) return '';
    
    const contextLength = 50;
    const beforeStart = Math.max(0, chunkIndex - contextLength);
    const afterEnd = Math.min(fullText.length, chunkIndex + chunkText.length + contextLength);
    
    const beforeContext = fullText.substring(beforeStart, chunkIndex).trim();
    const afterContext = fullText.substring(chunkIndex + chunkText.length, afterEnd).trim();
    
    const parts = [beforeContext, afterContext].filter(c => c.length > 0);
    return parts.join(' ... ');
  }

  /**
   * Calculates importance score for a chunk (0-1)
   */
  private calculateImportance(text: string): number {
    let score = 0.5; // Base score
    const lowerText = text.toLowerCase();
    
    // Boost for important keywords
    if (lowerText.includes('important') || lowerText.includes('key') || lowerText.includes('main')) {
      score += 0.2;
    }
    
    // Boost for definitions
    if (lowerText.includes('definition') || lowerText.includes('means') || lowerText.includes('refers to')) {
      score += 0.2;
    }
    
    // Boost for questions
    if (text.includes('?')) {
      score += 0.15;
    }
    
    // Boost for lists
    if (text.includes('•') || /^\d+\./.test(text.trim())) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determines the type of chunk based on content
   */
  private determineChunkType(text: string): string {
    const trimmed = text.trim();
    
    // Check for headers (short text without ending punctuation)
    if (trimmed.length < 100 && !trimmed.match(/[.!?]$/)) {
      return 'header';
    }
    
    // Check for lists
    if (trimmed.includes('•') || /^\d+\./.test(trimmed)) {
      return 'list';
    }
    
    // Check for questions
    if (trimmed.includes('?')) {
      return 'question';
    }
    
    return 'paragraph';
  }
}