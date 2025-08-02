import { ContentPreprocessor, ExtractedContent, ContentChunk } from '../interfaces/processors';
import { ValidationError } from '../models/validation';
import { v4 as uuidv4 } from 'uuid';

export class BasicContentPreprocessor implements ContentPreprocessor {
  private readonly minChunkLength = 50;
  private readonly maxChunkLength = 1000;
  private readonly overlapLength = 50;

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
      // First, try to chunk by semantic boundaries (paragraphs, sections)
      const semanticChunks = this.chunkBySemantic(cleanedText);
      
      // If semantic chunking produces chunks that are too large, split them further
      const refinedChunks = this.refineChunks(semanticChunks);
      
      // Convert to ContentChunk objects with metadata
      refinedChunks.forEach((text, index) => {
        if (text.trim().length >= this.minChunkLength) {
          chunks.push({
            id: uuidv4(),
            text: text.trim(),
            position: index,
            context: this.extractContext(text, cleanedText),
            importance: this.calculateImportance(text, cleanedText),
            metadata: {
              source: content.metadata.source,
              chunkType: this.determineChunkType(text),
              wordCount: text.trim().split(/\s+/).length,
              sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
            }
          });
        }
      });

      // Ensure we have at least one chunk
      if (chunks.length === 0) {
        chunks.push({
          id: uuidv4(),
          text: cleanedText,
          position: 0,
          context: '',
          importance: 0.5,
          metadata: {
            source: content.metadata.source,
            chunkType: 'paragraph',
            wordCount: cleanedText.trim().split(/\s+/).length,
            sentenceCount: cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length
          }
        });
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

    // Normalize whitespace
    cleaned = cleaned.replace(/\r\n/g, '\n'); // Normalize line endings
    cleaned = cleaned.replace(/\r/g, '\n'); // Handle old Mac line endings
    cleaned = cleaned.replace(/\t/g, ' '); // Convert tabs to spaces
    cleaned = cleaned.replace(/ +/g, ' '); // Collapse multiple spaces
    
    // Clean up common extraction artifacts
    cleaned = cleaned.replace(/\f/g, '\n'); // Form feed to newline
    cleaned = cleaned.replace(/\u00A0/g, ' '); // Non-breaking space to regular space
    cleaned = cleaned.replace(/[\u2000-\u200B]/g, ' '); // Various Unicode spaces
    cleaned = cleaned.replace(/[\u2010-\u2015]/g, '-'); // Various dashes to hyphen
    cleaned = cleaned.replace(/[\u2018\u2019]/g, "'"); // Smart quotes to regular quotes
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
    cleaned = cleaned.replace(/\u2026/g, '...'); // Ellipsis character
    
    // Remove excessive newlines but preserve paragraph structure
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    
    // Clean up bullet points and list markers
    cleaned = cleaned.replace(/^[\s]*[•·▪▫‣⁃]\s*/gm, '• '); // Normalize bullet points
    cleaned = cleaned.replace(/^[\s]*[-*+]\s*/gm, '• '); // Convert dashes/asterisks to bullets
    cleaned = cleaned.replace(/^[\s]*\d+\.\s*/gm, (match, offset, string) => {
      // Keep numbered lists but normalize spacing
      const num = match.match(/\d+/)?.[0] || '1';
      return `${num}. `;
    });
    
    // Clean up headers (markdown-style)
    cleaned = cleaned.replace(/^#+\s*/gm, ''); // Remove markdown headers
    cleaned = cleaned.replace(/^=+\s*$/gm, ''); // Remove underline-style headers
    cleaned = cleaned.replace(/^-+\s*$/gm, ''); // Remove dash-style headers
    
    // Remove page numbers and common footer/header artifacts
    cleaned = cleaned.replace(/^\s*Page\s+\d+\s*$/gim, '');
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, ''); // Standalone numbers (likely page numbers)
    
    // Clean up empty lines left by removals
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    
    // Final cleanup
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Detects the language of the text content
   */
  public detectLanguage(text: string): string {
    if (!text || text.trim().length < 10) {
      return 'unknown';
    }

    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleanText.split(/\s+/).filter(word => word.length > 2);
    
    if (words.length < 5) {
      return 'unknown';
    }

    // Simple language detection based on common words
    const languagePatterns = {
      english: [
        'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
        'his', 'from', 'they', 'she', 'her', 'been', 'than', 'its', 'who', 'did'
      ],
      spanish: [
        'que', 'de', 'no', 'la', 'el', 'en', 'y', 'a', 'es', 'se',
        'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'lo', 'como'
      ],
      french: [
        'de', 'le', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir',
        'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se'
      ],
      german: [
        'der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich',
        'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'
      ]
    };

    const scores: Record<string, number> = {};
    
    for (const [language, commonWords] of Object.entries(languagePatterns)) {
      scores[language] = 0;
      for (const word of words) {
        if (commonWords.includes(word)) {
          scores[language]++;
        }
      }
      // Normalize by total words checked
      scores[language] = scores[language] / Math.min(words.length, 100);
    }

    // Find the language with the highest score
    const detectedLanguage = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];

    // Require a minimum confidence threshold
    const confidence = scores[detectedLanguage];
    return confidence > 0.05 ? detectedLanguage : 'unknown';
  }

  /**
   * Chunks content by semantic boundaries (paragraphs, sections)
   */
  private chunkBySemantic(text: string): string[] {
    const chunks: string[] = [];
    
    // Split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      
      // If paragraph is within size limits, use as-is
      if (trimmed.length <= this.maxChunkLength) {
        chunks.push(trimmed);
      } else {
        // Split large paragraphs by sentences
        const sentences = this.splitIntoSentences(trimmed);
        let currentChunk = '';
        
        for (const sentence of sentences) {
          const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
          
          if (testChunk.length <= this.maxChunkLength) {
            currentChunk = testChunk;
          } else {
            // Save current chunk and start new one
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = sentence;
          }
        }
        
        // Add the last chunk
        if (currentChunk) {
          chunks.push(currentChunk);
        }
      }
    }
    
    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Refines chunks to ensure optimal size and overlap
   */
  private refineChunks(chunks: string[]): string[] {
    const refined: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // If chunk is too small, try to merge with next chunk
      if (chunk.length < this.minChunkLength && i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        const merged = `${chunk} ${nextChunk}`;
        
        if (merged.length <= this.maxChunkLength) {
          refined.push(merged);
          i++; // Skip the next chunk since we merged it
          continue;
        }
      }
      
      // If chunk is too large, split it
      if (chunk.length > this.maxChunkLength) {
        const subChunks = this.splitLargeChunk(chunk);
        refined.push(...subChunks);
      } else {
        refined.push(chunk);
      }
    }
    
    return refined;
  }

  /**
   * Splits text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be improved with more sophisticated NLP
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences.length > 0 ? sentences : [text];
  }

  /**
   * Splits a large chunk into smaller pieces
   */
  private splitLargeChunk(chunk: string): string[] {
    const sentences = this.splitIntoSentences(chunk);
    const subChunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const testChunk = currentChunk ? `${currentChunk}. ${sentence}` : sentence;
      
      if (testChunk.length <= this.maxChunkLength) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          subChunks.push(currentChunk);
        }
        
        // If single sentence is still too long, split by words
        if (sentence.length > this.maxChunkLength) {
          subChunks.push(...this.splitByWords(sentence));
          currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    if (currentChunk) {
      subChunks.push(currentChunk);
    }
    
    return subChunks.length > 0 ? subChunks : [chunk];
  }

  /**
   * Splits text by words when sentences are too long
   */
  private splitByWords(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      
      if (testChunk.length <= this.maxChunkLength) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Extracts context information for a chunk
   */
  private extractContext(chunkText: string, fullText: string): string {
    const chunkIndex = fullText.indexOf(chunkText);
    if (chunkIndex === -1) return '';
    
    // Get some context before and after the chunk
    const contextLength = 100;
    const beforeStart = Math.max(0, chunkIndex - contextLength);
    const afterEnd = Math.min(fullText.length, chunkIndex + chunkText.length + contextLength);
    
    const beforeContext = fullText.substring(beforeStart, chunkIndex).trim();
    const afterContext = fullText.substring(chunkIndex + chunkText.length, afterEnd).trim();
    
    return [beforeContext, afterContext].filter(c => c.length > 0).join(' ... ');
  }

  /**
   * Calculates importance score for a chunk (0-1)
   */
  private calculateImportance(chunkText: string, fullText: string): number {
    let score = 0.5; // Base score
    
    // Increase score for chunks with certain characteristics
    const text = chunkText.toLowerCase();
    
    // Headers and titles (often important)
    if (this.isLikelyHeader(chunkText)) {
      score += 0.3;
    }
    
    // Lists and enumerations
    if (text.includes('•') || /^\d+\./.test(text.trim())) {
      score += 0.1;
    }
    
    // Definitions and explanations
    if (text.includes('definition') || text.includes('means') || text.includes('refers to')) {
      score += 0.2;
    }
    
    // Key terms and concepts
    if (text.includes('important') || text.includes('key') || text.includes('main')) {
      score += 0.1;
    }
    
    // Questions (often important for learning)
    if (text.includes('?')) {
      score += 0.15;
    }
    
    // Adjust based on position (earlier content often more important)
    const position = fullText.indexOf(chunkText) / fullText.length;
    if (position < 0.3) {
      score += 0.1; // Boost early content
    }
    
    // Adjust based on length (very short or very long chunks might be less important)
    const wordCount = chunkText.split(/\s+/).length;
    if (wordCount < 10 || wordCount > 100) {
      score -= 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determines the type of chunk based on content
   */
  private determineChunkType(text: string): string {
    const trimmed = text.trim();
    
    if (this.isLikelyHeader(trimmed)) {
      return 'header';
    }
    
    if (trimmed.includes('•') || /^\d+\./.test(trimmed)) {
      return 'list';
    }
    
    if (trimmed.includes('?')) {
      return 'question';
    }
    
    if (trimmed.split(/[.!?]+/).length === 1) {
      return 'fragment';
    }
    
    return 'paragraph';
  }

  /**
   * Checks if text is likely a header or title
   */
  private isLikelyHeader(text: string): boolean {
    const trimmed = text.trim();
    
    // Short text without punctuation at the end
    if (trimmed.length < 100 && !trimmed.endsWith('.') && !trimmed.endsWith('!') && !trimmed.endsWith('?')) {
      return true;
    }
    
    // All caps (common for headers)
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
      return true;
    }
    
    // Title case with no ending punctuation
    const words = trimmed.split(/\s+/);
    if (words.length <= 8 && words.every(word => 
      word.length === 0 || word[0] === word[0].toUpperCase()
    ) && !trimmed.match(/[.!?]$/)) {
      return true;
    }
    
    return false;
  }

  /**
   * Gets preprocessing statistics
   */
  public getPreprocessingStats(originalText: string, cleanedText: string, chunks: ContentChunk[]): {
    originalLength: number;
    cleanedLength: number;
    compressionRatio: number;
    chunkCount: number;
    averageChunkLength: number;
    languageDetected: string;
  } {
    const totalChunkLength = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
    
    return {
      originalLength: originalText.length,
      cleanedLength: cleanedText.length,
      compressionRatio: originalText.length > 0 ? cleanedText.length / originalText.length : 0,
      chunkCount: chunks.length,
      averageChunkLength: chunks.length > 0 ? totalChunkLength / chunks.length : 0,
      languageDetected: this.detectLanguage(cleanedText)
    };
  }
}