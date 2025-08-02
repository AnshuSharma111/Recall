// Content processing and extraction types
import { ValidationError } from '../models/validation';

export interface ExtractedContent {
  text: string;
  metadata: {
    source: string;
    format: string;
    extractedAt: Date;
    confidence?: number;
    size?: number;
    originalFileName?: string;
  };
}

export interface ContentChunk {
  id: string;
  text: string;
  position: number;
  context: string;
  importance: number;
  metadata?: {
    source: string;
    chunkType: string;
    wordCount: number;
    sentenceCount: number;
  };
}

export interface Keyword {
  term: string;
  importance: number;
  context: string[];
  category: KeywordCategory;
}

export enum KeywordCategory {
  CONCEPT = 'concept',
  DEFINITION = 'definition',
  PROCESS = 'process',
  FACT = 'fact',
  EXAMPLE = 'example'
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface QualityAssessment {
  score: number;
  issues: string[];
  recommendations: string[];
}