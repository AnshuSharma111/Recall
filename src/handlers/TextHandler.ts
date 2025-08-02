import { TextHandler, ExtractedContent, ValidationResult } from '../interfaces/handlers';
import { ValidationError } from '../models/validation';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export class BasicTextHandler implements TextHandler {
  public readonly supportedFormats = ['.txt', '.md', '.pdf', '.docx'];

  /**
   * Extracts text content from various file formats
   */
  public async extractText(file: File): Promise<ExtractedContent> {
    const fileExtension = this.getFileExtension(file.name);
    
    if (!this.supportedFormats.includes(fileExtension)) {
      throw new ValidationError(
        'file_format',
        `Unsupported file format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`,
        'UNSUPPORTED_FORMAT',
        { fileName: file.name, extension: fileExtension }
      );
    }

    try {
      let extractedText: string;
      let confidence = 1.0; // Text files have perfect confidence

      switch (fileExtension) {
        case '.txt':
        case '.md':
          extractedText = await this.extractPlainText(file);
          break;
        case '.pdf':
          extractedText = await this.extractPdfText(file);
          confidence = 0.95; // PDF extraction might have minor issues
          break;
        case '.docx':
          extractedText = await this.extractDocxText(file);
          confidence = 0.98; // DOCX extraction is generally reliable
          break;
        default:
          throw new ValidationError(
            'file_format',
            `Unsupported file format: ${fileExtension}`,
            'UNSUPPORTED_FORMAT',
            { fileName: file.name }
          );
      }

      return {
        text: extractedText,
        metadata: {
          source: file.name,
          format: fileExtension,
          extractedAt: new Date(),
          confidence,
          size: file.size,
          originalFileName: file.name
        }
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new ValidationError(
        'extraction',
        `Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXTRACTION_FAILED',
        { fileName: file.name, originalError: error }
      );
    }
  }

  /**
   * Validates extracted content for quality and completeness
   */
  public validateContent(content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if content is empty
    if (!content || content.trim().length === 0) {
      errors.push(new ValidationError(
        'content',
        'Extracted content is empty',
        'EMPTY_CONTENT',
        { contentLength: content?.length || 0 }
      ));
    }

    // Check minimum content length
    const minLength = 10;
    if (content && content.trim().length < minLength) {
      warnings.push(`Content is very short (${content.trim().length} characters). Consider adding more content for better flashcard generation.`);
    }

    // Check for suspicious patterns that might indicate extraction issues
    const suspiciousPatterns = [
      /^[\s\n\r]*$/,  // Only whitespace
      /^[^\w\s]*$/,   // Only special characters
      /(.)\1{20,}/,   // Repeated characters (might indicate OCR errors)
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        warnings.push('Content contains patterns that might indicate extraction issues. Please review the extracted text.');
        break;
      }
    }

    // Check for reasonable text structure
    if (content) {
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (words.length < 5) {
        warnings.push('Content contains very few words. This might not be sufficient for meaningful flashcard generation.');
      }
      
      // Check if content has proper sentence structure (contains sentence-ending punctuation)
      if (sentences.length === 1 && !content.match(/[.!?]/)) {
        warnings.push('No complete sentences detected. Content might be fragmented or poorly formatted.');
      }

      // Check average word length (might indicate extraction issues)
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      if (avgWordLength > 15) {
        warnings.push('Unusually long average word length detected. This might indicate extraction errors.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extracts text from plain text files (.txt, .md)
   */
  private async extractPlainText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (typeof text !== 'string') {
            reject(new Error('Failed to read file as text'));
            return;
          }
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Extracts text from PDF files using pdf-parse
   */
  private async extractPdfText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read PDF file'));
            return;
          }
          
          const buffer = Buffer.from(arrayBuffer);
          const pdfData = await pdfParse(buffer);
          
          if (!pdfData.text || pdfData.text.trim().length === 0) {
            reject(new ValidationError(
              'pdf_extraction',
              'PDF appears to contain no extractable text. It might be image-based or encrypted.',
              'NO_TEXT_CONTENT',
              { pages: pdfData.numpages }
            ));
            return;
          }
          
          resolve(pdfData.text);
        } catch (error) {
          reject(new ValidationError(
            'pdf_extraction',
            `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'PDF_PARSE_ERROR',
            { originalError: error }
          ));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read PDF file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extracts text from DOCX files using mammoth
   */
  private async extractDocxText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error('Failed to read DOCX file'));
            return;
          }
          
          const result = await mammoth.extractRawText({ arrayBuffer });
          
          if (!result.value || result.value.trim().length === 0) {
            reject(new ValidationError(
              'docx_extraction',
              'DOCX file appears to contain no extractable text.',
              'NO_TEXT_CONTENT',
              { messages: result.messages }
            ));
            return;
          }
          
          // Log any conversion messages as warnings
          if (result.messages && result.messages.length > 0) {
            console.warn('DOCX conversion messages:', result.messages);
          }
          
          resolve(result.value);
        } catch (error) {
          reject(new ValidationError(
            'docx_extraction',
            `DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'DOCX_PARSE_ERROR',
            { originalError: error }
          ));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read DOCX file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Gets file extension from filename
   */
  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Estimates reading time for content (words per minute)
   */
  public estimateReadingTime(content: string, wordsPerMinute: number = 200): number {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) return 0;
    return Math.ceil(words.length / wordsPerMinute);
  }

  /**
   * Gets basic content statistics
   */
  public getContentStats(content: string): {
    wordCount: number;
    characterCount: number;
    sentenceCount: number;
    paragraphCount: number;
    estimatedReadingTime: number;
  } {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return {
      wordCount: words.length,
      characterCount: content.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      estimatedReadingTime: this.estimateReadingTime(content)
    };
  }
}