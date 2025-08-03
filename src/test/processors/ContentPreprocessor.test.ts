import { describe, it, expect, beforeEach } from 'vitest';
import { BasicContentPreprocessor } from '../../processors/ContentPreprocessor';
import { ExtractedContent } from '../../types/content';
import { ValidationError } from '../../models/validation';

describe('BasicContentPreprocessor', () => {
  let preprocessor: BasicContentPreprocessor;

  beforeEach(() => {
    preprocessor = new BasicContentPreprocessor();
  });

  const createExtractedContent = (text: string): ExtractedContent => ({
    text,
    metadata: {
      source: 'test.txt',
      format: '.txt',
      extractedAt: new Date(),
      confidence: 1.0
    }
  });

  describe('cleanText', () => {
    it('should normalize whitespace and line endings', () => {
      const input = 'Text  with   multiple\t\tspaces\r\nand\r\ndifferent\nline\nendings';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Text with multiple spaces\nand\ndifferent\nline\nendings');
    });

    it('should clean up Unicode characters', () => {
      const input = 'Smart\u2019quotes\u00A0and\u2026ellipsis';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Smart\'quotes and...ellipsis');
    });

    it('should remove page numbers', () => {
      const input = 'Content here\n42\nMore content\nPage 1\nFinal content';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Content here\n\nMore content\n\nFinal content');
    });

    it('should limit consecutive newlines', () => {
      const input = 'Paragraph 1\n\n\n\n\nParagraph 2';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('should handle empty input', () => {
      expect(preprocessor.cleanText('')).toBe('');
      expect(preprocessor.cleanText('   \n\t  ')).toBe('');
    });
  });

  describe('detectLanguage', () => {
    it('should detect English', () => {
      const text = 'The quick brown fox jumps over the lazy dog. This is a test of the English language detection.';
      const result = preprocessor.detectLanguage(text);
      
      expect(result).toBe('english');
    });

    it('should detect Spanish or return unknown', () => {
      const text = 'El gato que está en la mesa y el perro que está en el jardín. Esta es una prueba del sistema de detección.';
      const result = preprocessor.detectLanguage(text);
      
      expect(['spanish', 'unknown']).toContain(result);
    });

    it('should return unknown for short text', () => {
      const result = preprocessor.detectLanguage('Short text');
      expect(result).toBe('unknown');
    });

    it('should return unknown for ambiguous text', () => {
      const text = 'xyz abc def ghi jkl mno pqr stu vwx yzab cdef ghij';
      const result = preprocessor.detectLanguage(text);
      
      expect(result).toBe('unknown');
    });

    it('should handle empty input', () => {
      expect(preprocessor.detectLanguage('')).toBe('unknown');
    });
  });

  describe('chunkContent', () => {
    it('should chunk content by paragraphs', () => {
      const content = createExtractedContent(
        'First paragraph with enough content to meet minimum length requirements for chunking.\n\nSecond paragraph with different content that also meets the minimum length.\n\nThird paragraph with more information and sufficient length.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].text).toContain('First paragraph');
    });

    it('should assign unique IDs and positions to chunks', () => {
      const content = createExtractedContent(
        'First paragraph with sufficient content for chunking requirements.\n\nSecond paragraph with enough content as well.'
      );
      const chunks = preprocessor.chunkContent(content);
      
      const ids = chunks.map(chunk => chunk.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(chunks.length);
      expect(chunks[0].position).toBe(0);
      if (chunks.length > 1) {
        expect(chunks[1].position).toBe(1);
      }
    });

    it('should include metadata in chunks', () => {
      const content = createExtractedContent(
        'This is a test paragraph with several words in it to meet minimum requirements.'
      );
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks[0].metadata).toBeDefined();
      expect(chunks[0].metadata?.source).toBe('test.txt');
      expect(chunks[0].metadata?.wordCount).toBeGreaterThan(0);
      expect(chunks[0].metadata?.sentenceCount).toBeGreaterThan(0);
      expect(chunks[0].metadata?.chunkType).toBe('paragraph');
    });

    it('should determine chunk types correctly', () => {
      const content = createExtractedContent(
        'Chapter 1 Introduction\n\n• First bullet point with sufficient content for minimum length requirements\n• Second bullet point with enough content for chunking\n\nWhat is the main concept we are discussing here with sufficient content?\n\nThis is a regular paragraph with multiple sentences. It contains normal content with sufficient length for proper chunking.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      const chunkTypes = chunks.map(c => c.metadata?.chunkType);
      expect(chunkTypes.length).toBeGreaterThan(0);
      expect(chunkTypes.every(type => ['header', 'list', 'question', 'paragraph'].includes(type!))).toBe(true);
    });

    it('should calculate importance scores', () => {
      const content = createExtractedContent(
        'Important: This is a key concept that defines the main principles.\n\nThis is a regular paragraph with normal content and sufficient length.\n\nWhat is the definition of this important term we are discussing?'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      // All chunks should have importance scores between 0 and 1
      chunks.forEach(chunk => {
        expect(chunk.importance).toBeGreaterThanOrEqual(0);
        expect(chunk.importance).toBeLessThanOrEqual(1);
      });
    });

    it('should handle very long paragraphs by splitting them', () => {
      const longSentence = 'This is a very long sentence that contains a lot of information and details. ';
      const longText = longSentence.repeat(20); // Creates a very long paragraph
      const content = createExtractedContent(longText);
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(800); // Max chunk length
      });
    });

    it('should handle small paragraphs', () => {
      const content = createExtractedContent(
        'First paragraph with sufficient content to meet minimum length requirements.\n\nShort.\n\nAnother paragraph with enough content to be meaningful and meet requirements.'
      );
      const chunks = preprocessor.chunkContent(content);
      
      // Should create chunks for all content
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract context for chunks', () => {
      const content = createExtractedContent(
        'Introduction paragraph with sufficient content for context extraction.\n\nMain content paragraph with important information and enough length.\n\nConclusion paragraph with final thoughts and adequate content.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      // Context should be a string (may be empty)
      chunks.forEach(chunk => {
        expect(typeof chunk.context).toBe('string');
      });
    });

    it('should throw error for empty content', () => {
      const content = createExtractedContent('');
      
      expect(() => preprocessor.chunkContent(content)).toThrow(ValidationError);
      expect(() => preprocessor.chunkContent(content)).toThrow('Cannot chunk empty content');
    });

    it('should handle content with only whitespace', () => {
      const content = createExtractedContent('   \n\t  ');
      
      expect(() => preprocessor.chunkContent(content)).toThrow(ValidationError);
    });

    it('should create at least one chunk for short content', () => {
      const content = createExtractedContent('Short content below minimum.');
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('Short content below minimum.');
    });

    it('should handle mixed formatting content', () => {
      const content = createExtractedContent(
        'Title Header\n\nIntroduction paragraph with sufficient content for proper chunking.\n\n• Bullet point with adequate content\n• Another bullet point with enough text\n\n1. Numbered item with sufficient content\n2. Another numbered item with enough text\n\nConclusion paragraph with final content and adequate length.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      chunks.forEach(chunk => {
        expect(chunk.id).toBeTruthy();
        expect(chunk.text.trim().length).toBeGreaterThan(0);
        expect(chunk.importance).toBeGreaterThanOrEqual(0);
        expect(chunk.importance).toBeLessThanOrEqual(1);
        expect(chunk.metadata?.chunkType).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle content with only punctuation', () => {
      const content = createExtractedContent('!@#$%^&*()_+-=[]{}|;:,.<>?');
      
      const chunks = preprocessor.chunkContent(content);
      expect(chunks).toHaveLength(1);
    });

    it('should handle very large content efficiently', () => {
      const sentence = 'This is a sentence with adequate content for testing. ';
      const largeText = sentence.repeat(100);
      const content = createExtractedContent(largeText);
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(800);
      });
    });
  });
});