import { describe, it, expect, beforeEach } from 'vitest';
import { BasicContentPreprocessor } from '../../processors/ContentPreprocessor';
import { ExtractedContent } from '../../types/content';
import { ValidationError } from '../../models/validation';

describe('BasicContentPreprocessor', () => {
  let preprocessor: BasicContentPreprocessor;

  beforeEach(() => {
    preprocessor = new BasicContentPreprocessor();
  });

  describe('cleanText', () => {
    it('should normalize whitespace', () => {
      const input = 'This  has   multiple\t\tspaces\r\nand\r\ndifferent\nline\nendings';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('This has multiple spaces\nand\ndifferent\nline\nendings');
    });

    it('should clean up Unicode characters', () => {
      const input = 'Smart\u2019quotes\u00A0and\u2013dashes\u2026';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Smart\'quotes and-dashes...');
    });

    it('should normalize bullet points', () => {
      const input = '• First item\n▪ Second item\n- Third item\n* Fourth item';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('• First item\n• Second item\n• Third item\n• Fourth item');
    });

    it('should normalize numbered lists', () => {
      const input = '1.   First item\n2.    Second item\n10.  Tenth item';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('1. First item\n2. Second item\n10. Tenth item');
    });

    it('should remove markdown headers', () => {
      const input = '# Main Title\n## Subtitle\n### Sub-subtitle\nContent here';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Main Title\nSubtitle\nSub-subtitle\nContent here');
    });

    it('should remove page numbers and artifacts', () => {
      const input = 'Content here\nPage 1\nMore content\n42\nFinal content';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Content here\nMore content\nFinal content');
    });

    it('should handle empty input', () => {
      expect(preprocessor.cleanText('')).toBe('');
      expect(preprocessor.cleanText('   \n\t  ')).toBe('');
    });

    it('should limit consecutive newlines', () => {
      const input = 'Paragraph 1\n\n\n\n\nParagraph 2';
      const result = preprocessor.cleanText(input);
      
      expect(result).toBe('Paragraph 1\n\nParagraph 2');
    });
  });

  describe('detectLanguage', () => {
    it('should detect English', () => {
      const text = 'The quick brown fox jumps over the lazy dog. This is a test of the English language detection system.';
      const result = preprocessor.detectLanguage(text);
      
      expect(result).toBe('english');
    });

    it('should detect Spanish', () => {
      const text = 'El gato está en la mesa. Esta es una prueba del sistema de detección de idioma español.';
      const result = preprocessor.detectLanguage(text);
      
      expect(result).toBe('spanish');
    });

    it('should detect French', () => {
      const text = 'Le chat est sur la table. Ceci est un test du système de détection de langue française.';
      const result = preprocessor.detectLanguage(text);
      
      expect(result).toBe('french');
    });

    it('should detect German', () => {
      const text = 'Die Katze ist auf dem Tisch. Dies ist ein Test des deutschen Spracherkennungssystems.';
      const result = preprocessor.detectLanguage(text);
      
      expect(result).toBe('german');
    });

    it('should return unknown for short text', () => {
      const result = preprocessor.detectLanguage('Short');
      expect(result).toBe('unknown');
    });

    it('should return unknown for ambiguous text', () => {
      const text = 'xyz abc def ghi jkl mno pqr stu vwx';
      const result = preprocessor.detectLanguage(text);
      
      expect(result).toBe('unknown');
    });

    it('should handle empty input', () => {
      expect(preprocessor.detectLanguage('')).toBe('unknown');
      expect(preprocessor.detectLanguage('   ')).toBe('unknown');
    });
  });

  describe('chunkContent', () => {
    const createExtractedContent = (text: string): ExtractedContent => ({
      text,
      metadata: {
        source: 'test.txt',
        format: '.txt',
        extractedAt: new Date(),
        confidence: 1.0
      }
    });

    it('should chunk content by paragraphs', () => {
      const content = createExtractedContent(
        'First paragraph with some content here.\n\nSecond paragraph with different content.\n\nThird paragraph with more information.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks).toHaveLength(3);
      expect(chunks[0].text).toContain('First paragraph');
      expect(chunks[1].text).toContain('Second paragraph');
      expect(chunks[2].text).toContain('Third paragraph');
      expect(chunks[0].position).toBe(0);
      expect(chunks[1].position).toBe(1);
      expect(chunks[2].position).toBe(2);
    });

    it('should assign unique IDs to chunks', () => {
      const content = createExtractedContent('Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.');
      const chunks = preprocessor.chunkContent(content);
      
      const ids = chunks.map(chunk => chunk.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(chunks.length);
    });

    it('should calculate importance scores', () => {
      const content = createExtractedContent(
        'Important: This is a key concept.\n\nThis is a regular paragraph.\n\nWhat is the definition of this term?'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      // First chunk should have higher importance (contains "Important" and "key")
      expect(chunks[0].importance).toBeGreaterThan(chunks[1].importance);
      
      // Question chunk should have higher importance than regular paragraph
      expect(chunks[2].importance).toBeGreaterThan(chunks[1].importance);
    });

    it('should determine chunk types correctly', () => {
      const content = createExtractedContent(
        'Chapter 1: Introduction\n\n• First bullet point\n• Second bullet point\n\nWhat is machine learning?\n\nThis is a regular paragraph with multiple sentences. It contains normal content.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.find(c => c.metadata?.chunkType === 'header')).toBeDefined();
      expect(chunks.find(c => c.metadata?.chunkType === 'list')).toBeDefined();
      expect(chunks.find(c => c.metadata?.chunkType === 'question')).toBeDefined();
      expect(chunks.find(c => c.metadata?.chunkType === 'paragraph')).toBeDefined();
    });

    it('should include metadata in chunks', () => {
      const content = createExtractedContent('This is a test paragraph with several words in it.');
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks[0].metadata).toBeDefined();
      expect(chunks[0].metadata?.source).toBe('test.txt');
      expect(chunks[0].metadata?.wordCount).toBeGreaterThan(0);
      expect(chunks[0].metadata?.sentenceCount).toBeGreaterThan(0);
    });

    it('should handle very long paragraphs by splitting them', () => {
      const longText = 'This is a very long paragraph. '.repeat(50); // Creates a very long paragraph
      const content = createExtractedContent(longText);
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(1000); // Max chunk length
      });
    });

    it('should merge very short chunks', () => {
      const content = createExtractedContent('Short.\n\nAlso short.\n\nThis is a longer paragraph with more content to make it substantial.');
      const chunks = preprocessor.chunkContent(content);
      
      // Should merge the first two short chunks
      expect(chunks.length).toBeLessThan(3);
    });

    it('should extract context for chunks', () => {
      const content = createExtractedContent(
        'Introduction paragraph.\n\nMain content paragraph with important information.\n\nConclusion paragraph.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      const mainChunk = chunks.find(c => c.text.includes('Main content'));
      
      expect(mainChunk?.context).toBeTruthy();
      expect(mainChunk?.context.length).toBeGreaterThan(0);
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

    it('should create at least one chunk for very short content', () => {
      const content = createExtractedContent('Short content that is below minimum chunk length.');
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('Short content that is below minimum chunk length.');
    });

    it('should handle content with mixed formatting', () => {
      const content = createExtractedContent(
        '# Title\n\nIntroduction paragraph.\n\n• Bullet point 1\n• Bullet point 2\n\n1. Numbered item\n2. Another item\n\nConclusion.'
      );
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.id).toBeTruthy();
        expect(chunk.text.trim().length).toBeGreaterThan(0);
        expect(chunk.importance).toBeGreaterThanOrEqual(0);
        expect(chunk.importance).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getPreprocessingStats', () => {
    it('should calculate preprocessing statistics', () => {
      const originalText = 'Original  text\r\nwith\textra   whitespace\n\n\nand formatting.';
      const cleanedText = preprocessor.cleanText(originalText);
      const content = {
        text: cleanedText,
        metadata: {
          source: 'test.txt',
          format: '.txt',
          extractedAt: new Date(),
          confidence: 1.0
        }
      };
      const chunks = preprocessor.chunkContent(content);
      
      const stats = preprocessor.getPreprocessingStats(originalText, cleanedText, chunks);
      
      expect(stats.originalLength).toBe(originalText.length);
      expect(stats.cleanedLength).toBe(cleanedText.length);
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThanOrEqual(1);
      expect(stats.chunkCount).toBe(chunks.length);
      expect(stats.averageChunkLength).toBeGreaterThan(0);
      expect(stats.languageDetected).toBe('english');
    });

    it('should handle empty content in stats', () => {
      const stats = preprocessor.getPreprocessingStats('', '', []);
      
      expect(stats.originalLength).toBe(0);
      expect(stats.cleanedLength).toBe(0);
      expect(stats.compressionRatio).toBe(0);
      expect(stats.chunkCount).toBe(0);
      expect(stats.averageChunkLength).toBe(0);
      expect(stats.languageDetected).toBe('unknown');
    });
  });

  describe('edge cases', () => {
    it('should handle content with only punctuation', () => {
      const content = {
        text: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        metadata: {
          source: 'test.txt',
          format: '.txt',
          extractedAt: new Date(),
          confidence: 1.0
        }
      };
      
      const chunks = preprocessor.chunkContent(content);
      expect(chunks).toHaveLength(1);
    });

    it('should handle content with mixed languages', () => {
      const text = 'Hello world. Bonjour le monde. Hola mundo.';
      const language = preprocessor.detectLanguage(text);
      
      // Should detect the most prominent language or unknown
      expect(['english', 'french', 'spanish', 'unknown']).toContain(language);
    });

    it('should handle very large content', () => {
      const largeText = 'This is a sentence. '.repeat(1000);
      const content = {
        text: largeText,
        metadata: {
          source: 'large.txt',
          format: '.txt',
          extractedAt: new Date(),
          confidence: 1.0
        }
      };
      
      const chunks = preprocessor.chunkContent(content);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(1000);
      });
    });
  });
});