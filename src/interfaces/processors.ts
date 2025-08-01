// Content processing interfaces

import { 
  ExtractedContent, 
  ContentChunk, 
  Keyword, 
  FlashCard, 
  QualityScore 
} from '../types';

export interface ContentPreprocessor {
  chunkContent(content: ExtractedContent): ContentChunk[];
  cleanText(text: string): string;
  detectLanguage(text: string): string;
}

export interface KeywordExtractor {
  extractKeywords(chunks: ContentChunk[]): Keyword[];
  rankByImportance(keywords: Keyword[]): Keyword[];
}

export interface CardGenerator {
  generateCards(keywords: Keyword[], context: ContentChunk[]): Promise<FlashCard[]>;
  validateCardQuality(card: FlashCard): QualityScore;
}