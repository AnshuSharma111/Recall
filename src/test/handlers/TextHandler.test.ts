import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BasicTextHandler } from '../../handlers/TextHandler';
import { ValidationError } from '../../models/validation';

// Mock the external dependencies
vi.mock('pdf-parse', () => {
  return {
    default: vi.fn()
  };
});

vi.mock('mammoth', () => ({
  extractRawText: vi.fn()
}));

describe('BasicTextHandler', () => {
  let handler: BasicTextHandler;

  beforeEach(() => {
    handler = new BasicTextHandler();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct supported formats', () => {
      expect(handler.supportedFormats).toEqual(['.txt', '.md', '.pdf', '.docx']);
    });
  });

  describe('extractText', () => {
    describe('plain text files', () => {
      it('should extract text from .txt files', async () => {
        const mockFile = new File(['Hello, world!'], 'test.txt', { type: 'text/plain' });
        
        const result = await handler.extractText(mockFile);
        
        expect(result.text).toBe('Hello, world!');
        expect(result.metadata.source).toBe('test.txt');
        expect(result.metadata.format).toBe('.txt');
        expect(result.metadata.confidence).toBe(1.0);
        expect(result.metadata.size).toBe(mockFile.size);
        expect(result.metadata.originalFileName).toBe('test.txt');
        expect(result.metadata.extractedAt).toBeInstanceOf(Date);
      });

      it('should extract text from .md files', async () => {
        const markdownContent = '# Title\n\nThis is **bold** text.';
        const mockFile = new File([markdownContent], 'test.md', { type: 'text/markdown' });
        
        const result = await handler.extractText(mockFile);
        
        expect(result.text).toBe(markdownContent);
        expect(result.metadata.format).toBe('.md');
        expect(result.metadata.confidence).toBe(1.0);
      });

      it('should handle empty text files', async () => {
        const mockFile = new File([''], 'empty.txt', { type: 'text/plain' });
        
        const result = await handler.extractText(mockFile);
        
        expect(result.text).toBe('');
        expect(result.metadata.source).toBe('empty.txt');
      });

      it('should handle files with special characters', async () => {
        const specialContent = 'Café naïve résumé 中文 العربية';
        const mockFile = new File([specialContent], 'special.txt', { type: 'text/plain' });
        
        const result = await handler.extractText(mockFile);
        
        expect(result.text).toBe(specialContent);
      });
    });

    describe('PDF files', () => {
      it('should extract text from PDF files', async () => {
        const mockPdfParse = (await import('pdf-parse')).default;
        const mockPdfData = {
          text: 'PDF content here',
          numpages: 1
        };
        
        (mockPdfParse as any).mockResolvedValue(mockPdfData);
        
        const mockFile = new File([new ArrayBuffer(100)], 'test.pdf', { type: 'application/pdf' });
        
        const result = await handler.extractText(mockFile);
        
        expect(result.text).toBe('PDF content here');
        expect(result.metadata.format).toBe('.pdf');
        expect(result.metadata.confidence).toBe(0.95);
      });

      it('should handle PDFs with no extractable text', async () => {
        const mockPdfParse = (await import('pdf-parse')).default;
        const mockPdfData = {
          text: '',
          numpages: 1
        };
        
        (mockPdfParse as any).mockResolvedValue(mockPdfData);
        
        const mockFile = new File([new ArrayBuffer(100)], 'empty.pdf', { type: 'application/pdf' });
        
        await expect(handler.extractText(mockFile)).rejects.toThrow(ValidationError);
        await expect(handler.extractText(mockFile)).rejects.toThrow('PDF appears to contain no extractable text');
      });

      it('should handle PDF parsing errors', async () => {
        const mockPdfParse = (await import('pdf-parse')).default;
        (mockPdfParse as any).mockRejectedValue(new Error('PDF parsing failed'));
        
        const mockFile = new File([new ArrayBuffer(100)], 'corrupt.pdf', { type: 'application/pdf' });
        
        await expect(handler.extractText(mockFile)).rejects.toThrow(ValidationError);
        await expect(handler.extractText(mockFile)).rejects.toThrow('PDF extraction failed');
      });
    });

    describe('DOCX files', () => {
      it('should extract text from DOCX files', async () => {
        const mockMammoth = await import('mammoth');
        const mockResult = {
          value: 'DOCX content here',
          messages: []
        };
        
        (mockMammoth.extractRawText as any).mockResolvedValue(mockResult);
        
        const mockFile = new File([new ArrayBuffer(100)], 'test.docx', { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        
        const result = await handler.extractText(mockFile);
        
        expect(result.text).toBe('DOCX content here');
        expect(result.metadata.format).toBe('.docx');
        expect(result.metadata.confidence).toBe(0.98);
      });

      it('should handle DOCX files with no extractable text', async () => {
        const mockMammoth = await import('mammoth');
        const mockResult = {
          value: '',
          messages: []
        };
        
        (mockMammoth.extractRawText as any).mockResolvedValue(mockResult);
        
        const mockFile = new File([new ArrayBuffer(100)], 'empty.docx', { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        
        await expect(handler.extractText(mockFile)).rejects.toThrow(ValidationError);
        await expect(handler.extractText(mockFile)).rejects.toThrow('DOCX file appears to contain no extractable text');
      });

      it('should handle DOCX parsing errors', async () => {
        const mockMammoth = await import('mammoth');
        (mockMammoth.extractRawText as any).mockRejectedValue(new Error('DOCX parsing failed'));
        
        const mockFile = new File([new ArrayBuffer(100)], 'corrupt.docx', { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        
        await expect(handler.extractText(mockFile)).rejects.toThrow(ValidationError);
        await expect(handler.extractText(mockFile)).rejects.toThrow('DOCX extraction failed');
      });
    });

    describe('unsupported formats', () => {
      it('should reject unsupported file formats', async () => {
        const mockFile = new File(['content'], 'test.xyz', { type: 'application/unknown' });
        
        await expect(handler.extractText(mockFile)).rejects.toThrow(ValidationError);
        await expect(handler.extractText(mockFile)).rejects.toThrow('Unsupported file format: .xyz');
      });

      it('should handle files without extensions', async () => {
        const mockFile = new File(['content'], 'noextension', { type: 'text/plain' });
        
        await expect(handler.extractText(mockFile)).rejects.toThrow(ValidationError);
        await expect(handler.extractText(mockFile)).rejects.toThrow('Unsupported file format: ');
      });
    });
  });

  describe('validateContent', () => {
    it('should validate good content successfully', () => {
      const content = 'This is a well-formed sentence with proper structure. It contains multiple sentences and good vocabulary.';
      
      const result = handler.validateContent(content);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect empty content', () => {
      const result = handler.validateContent('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Extracted content is empty');
    });

    it('should detect whitespace-only content', () => {
      const result = handler.validateContent('   \n\t  ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Extracted content is empty');
    });

    it('should warn about very short content', () => {
      const result = handler.validateContent('Short');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Content is very short (5 characters). Consider adding more content for better flashcard generation.');
    });

    it('should warn about content with few words', () => {
      const result = handler.validateContent('One two three four');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Content contains very few words. This might not be sufficient for meaningful flashcard generation.');
    });

    it('should warn about content without sentences', () => {
      const result = handler.validateContent('word1 word2 word3 word4 word5 word6');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No complete sentences detected. Content might be fragmented or poorly formatted.');
    });

    it('should warn about unusually long words', () => {
      const content = 'supercalifragilisticexpialidocious antidisestablishmentarianism pneumonoultramicroscopicsilicovolcanoconiosisverylongword';
      
      const result = handler.validateContent(content);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Unusually long average word length detected. This might indicate extraction errors.');
    });

    it('should detect repeated character patterns', () => {
      const content = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      
      const result = handler.validateContent(content);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Content contains patterns that might indicate extraction issues. Please review the extracted text.');
    });

    it('should handle null content gracefully', () => {
      const result = handler.validateContent(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getContentStats', () => {
    it('should calculate basic statistics correctly', () => {
      const content = 'This is a test. It has multiple sentences!\n\nAnd multiple paragraphs too.';
      
      const stats = handler.getContentStats(content);
      
      expect(stats.wordCount).toBe(12);
      expect(stats.characterCount).toBe(content.length);
      expect(stats.sentenceCount).toBe(3);
      expect(stats.paragraphCount).toBe(2);
      expect(stats.estimatedReadingTime).toBe(1); // 12 words / 200 wpm = 0.06 minutes, rounded up to 1
    });

    it('should handle empty content', () => {
      const stats = handler.getContentStats('');
      
      expect(stats.wordCount).toBe(0);
      expect(stats.characterCount).toBe(0);
      expect(stats.sentenceCount).toBe(0);
      expect(stats.paragraphCount).toBe(0);
      expect(stats.estimatedReadingTime).toBe(0);
    });

    it('should handle content with only whitespace', () => {
      const stats = handler.getContentStats('   \n\n  \t  ');
      
      expect(stats.wordCount).toBe(0);
      expect(stats.paragraphCount).toBe(0);
    });
  });

  describe('estimateReadingTime', () => {
    it('should calculate reading time correctly', () => {
      const content = 'word '.repeat(200); // 200 words
      
      const time = handler.estimateReadingTime(content, 200);
      
      expect(time).toBe(1); // 200 words / 200 wpm = 1 minute
    });

    it('should round up partial minutes', () => {
      const content = 'word '.repeat(150); // 150 words
      
      const time = handler.estimateReadingTime(content, 200);
      
      expect(time).toBe(1); // 150 words / 200 wpm = 0.75 minutes, rounded up to 1
    });

    it('should use default reading speed', () => {
      const content = 'word '.repeat(400); // 400 words
      
      const time = handler.estimateReadingTime(content);
      
      expect(time).toBe(2); // 400 words / 200 wpm (default) = 2 minutes
    });
  });
});