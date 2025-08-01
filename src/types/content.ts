// Content processing and extraction types

export interface ExtractedContent {
  text: string;
  metadata: {
    source: string;
    format: string;
    extractedAt: Date;
    confidence?: number;
  };
}

export interface ContentChunk {
  id: string;
  text: string;
  position: number;
  context: string;
  importance: number;
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
  errors: string[];
  warnings: string[];
}

export interface QualityAssessment {
  score: number;
  issues: string[];
  recommendations: string[];
}