// Input handler interfaces

import { 
  ExtractedContent, 
  ValidationResult, 
  QualityAssessment, 
  OCRResult, 
  TranscriptionResult, 
  TranscriptionProgress 
} from '../types';

export interface TextHandler {
  supportedFormats: string[];
  extractText(file: File): Promise<ExtractedContent>;
  validateContent(content: string): ValidationResult;
}

export interface ImageHandler {
  processImage(file: File): Promise<OCRResult>;
  validateImageQuality(file: File): QualityAssessment;
}

export interface AudioHandler {
  transcribeAudio(file: File): Promise<TranscriptionResult>;
  getProgress(): TranscriptionProgress;
}