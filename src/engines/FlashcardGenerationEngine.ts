// Comprehensive Flashcard Generation Engine

import { FlashCard, CardType, DifficultyLevel, QualityScore } from '../types/flashcard';
import { ExtractedContent, ContentChunk, Keyword } from '../types/content';
import { BasicContentPreprocessor } from '../processors/ContentPreprocessor';
import { BasicKeywordExtractor } from '../processors/KeywordExtractor';
import { AICardGenerator } from '../processors/CardGenerator';
import { LocalAIModelService } from '../services/AIModelService';
import { aiConfigManager } from '../services/AIConfigManager';
// UUID import removed as it's not used in this file

export interface GenerationOptions {
  maxCards?: number;
  preferredTypes?: CardType[];
  difficultyLevel?: 'easy' | 'medium' | 'hard' | 'mixed';
  qualityThreshold?: number;
  enableAI?: boolean;
  batchSize?: number;
  includeMetadata?: boolean;
  customPrompts?: Record<CardType, string>;
}

export interface GenerationResult {
  cards: FlashCard[];
  statistics: GenerationStatistics;
  metadata: GenerationMetadata;
}

export interface GenerationStatistics {
  totalGenerated: number;
  byType: Record<CardType, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  averageQuality: number;
  processingTime: number;
  aiUsed: boolean;
  fallbackUsed: boolean;
}

export interface GenerationMetadata {
  sourceContent: {
    originalLength: number;
    chunksCreated: number;
    keywordsExtracted: number;
  };
  processing: {
    startTime: Date;
    endTime: Date;
    steps: ProcessingStep[];
  };
  quality: {
    passedCards: number;
    rejectedCards: number;
    averageScores: QualityScore;
  };
}

export interface ProcessingStep {
  name: string;
  duration: number;
  success: boolean;
  details?: any;
}

export class FlashcardGenerationEngine {
  private contentPreprocessor: BasicContentPreprocessor;
  private keywordExtractor: BasicKeywordExtractor;
  private cardGenerator: AICardGenerator;
  private aiService: LocalAIModelService;

  constructor() {
    this.contentPreprocessor = new BasicContentPreprocessor();
    this.keywordExtractor = new BasicKeywordExtractor();
    this.aiService = new LocalAIModelService(aiConfigManager.getModelConfig());
    this.cardGenerator = new AICardGenerator(this.aiService);
  }

  /**
   * Main entry point for flashcard generation
   */
  async generateFlashcards(
    content: ExtractedContent,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const processingSteps: ProcessingStep[] = [];
    
    // Set default options
    const opts = this.setDefaultOptions(options);
    
    try {
      // Step 1: Content preprocessing
      const chunks = await this.executeStep(
        'Content Preprocessing',
        () => this.contentPreprocessor.chunkContent(content),
        processingSteps
      );

      // Step 2: Keyword extraction
      const keywords = await this.executeStep(
        'Keyword Extraction',
        () => this.keywordExtractor.extractKeywords(chunks),
        processingSteps
      );

      // Step 3: Keyword ranking and filtering
      const rankedKeywords = await this.executeStep(
        'Keyword Ranking',
        () => this.filterAndRankKeywords(keywords, opts),
        processingSteps
      );

      // Step 4: Card generation (with batching if needed)
      const rawCards = await this.executeStep(
        'Card Generation',
        () => this.generateCardsInBatches(rankedKeywords, chunks, opts),
        processingSteps
      );

      // Step 5: Quality filtering and enhancement
      const qualityCards = await this.executeStep(
        'Quality Control',
        () => this.applyQualityControl(rawCards, opts),
        processingSteps
      );

      // Step 6: Post-processing and finalization
      const finalCards = await this.executeStep(
        'Post-processing',
        () => this.postProcessCards(qualityCards, opts),
        processingSteps
      );

      const endTime = Date.now();

      // Generate statistics and metadata
      const statistics = this.generateStatistics(finalCards, startTime, endTime, processingSteps);
      const metadata = this.generateMetadata(content, chunks, keywords, processingSteps, finalCards, startTime, endTime);

      return {
        cards: finalCards,
        statistics,
        metadata
      };

    } catch (error) {
      console.error('Flashcard generation failed:', error);
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates cards in batches to manage memory and processing
   */
  private async generateCardsInBatches(
    keywords: Keyword[],
    chunks: ContentChunk[],
    options: GenerationOptions
  ): Promise<FlashCard[]> {
    const batchSize = options.batchSize || 10;
    const allCards: FlashCard[] = [];
    
    // Split keywords into batches
    for (let i = 0; i < keywords.length; i += batchSize) {
      const keywordBatch = keywords.slice(i, i + batchSize);
      const relevantChunks = this.findRelevantChunks(keywordBatch, chunks);
      
      try {
        const batchCards = await this.cardGenerator.generateCards(keywordBatch, relevantChunks);
        allCards.push(...batchCards);
        
        // Respect max cards limit
        if (options.maxCards && allCards.length >= options.maxCards) {
          break;
        }
      } catch (error) {
        console.warn(`Batch ${i / batchSize + 1} failed:`, error);
        continue;
      }
    }

    return allCards;
  }

  /**
   * Finds chunks relevant to a set of keywords
   */
  private findRelevantChunks(keywords: Keyword[], chunks: ContentChunk[]): ContentChunk[] {
    const keywordTerms = keywords.map(k => k.term.toLowerCase());
    
    return chunks.filter(chunk => 
      keywordTerms.some(term => 
        chunk.text.toLowerCase().includes(term)
      )
    ).sort((a, b) => b.importance - a.importance);
  }

  /**
   * Applies quality control to generated cards
   */
  private async applyQualityControl(
    cards: FlashCard[],
    options: GenerationOptions
  ): Promise<FlashCard[]> {
    const qualityThreshold = options.qualityThreshold || 0.6;
    const qualityCards: FlashCard[] = [];

    for (const card of cards) {
      const quality = this.cardGenerator.validateCardQuality(card);
      
      if (quality.overall >= qualityThreshold) {
        // Enhance card with quality metadata if requested
        if (options.includeMetadata) {
          (card as any).qualityScore = quality;
        }
        qualityCards.push(card);
      }
    }

    // Remove duplicates
    return this.removeDuplicateCards(qualityCards);
  }

  /**
   * Removes duplicate cards based on content similarity
   */
  private removeDuplicateCards(cards: FlashCard[]): FlashCard[] {
    const uniqueCards: FlashCard[] = [];
    const seenContent = new Set<string>();

    for (const card of cards) {
      const contentHash = this.generateContentHash(card);
      
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        uniqueCards.push(card);
      }
    }

    return uniqueCards;
  }

  /**
   * Generates a hash for card content to detect duplicates
   */
  private generateContentHash(card: FlashCard): string {
    const normalizedFront = card.front.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const normalizedBack = card.back.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return `${normalizedFront}|${normalizedBack}`;
  }

  /**
   * Post-processes cards for final output
   */
  private async postProcessCards(
    cards: FlashCard[],
    options: GenerationOptions
  ): Promise<FlashCard[]> {
    let processedCards = [...cards];

    // Apply difficulty filtering if specified
    if (options.difficultyLevel && options.difficultyLevel !== 'mixed') {
      processedCards = this.filterByDifficulty(processedCards, options.difficultyLevel);
    }

    // Apply type filtering if specified
    if (options.preferredTypes && options.preferredTypes.length > 0) {
      processedCards = processedCards.filter(card => 
        options.preferredTypes!.includes(card.type)
      );
    }

    // Limit to max cards
    if (options.maxCards) {
      processedCards = processedCards.slice(0, options.maxCards);
    }

    // Sort by quality and importance
    processedCards.sort((a, b) => {
      const aQuality = (a as any).qualityScore?.overall || 0.5;
      const bQuality = (b as any).qualityScore?.overall || 0.5;
      return bQuality - aQuality;
    });

    return processedCards;
  }

  /**
   * Filters cards by difficulty level
   */
  private filterByDifficulty(cards: FlashCard[], level: 'easy' | 'medium' | 'hard'): FlashCard[] {
    const difficultyMap = {
      easy: DifficultyLevel.EASY,
      medium: DifficultyLevel.MEDIUM,
      hard: DifficultyLevel.HARD
    };

    const targetDifficulty = difficultyMap[level];
    return cards.filter(card => card.difficulty === targetDifficulty);
  }

  /**
   * Filters and ranks keywords based on options
   */
  private filterAndRankKeywords(keywords: Keyword[], options: GenerationOptions): Keyword[] {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    let filtered = this.keywordExtractor.rankByImportance(keywords);
    
    // Ensure we have a valid array
    if (!filtered || !Array.isArray(filtered)) {
      filtered = keywords;
    }

    // Limit keywords for processing efficiency
    const maxKeywords = Math.min(options.maxCards || 20, 30);
    filtered = filtered.slice(0, maxKeywords);

    return filtered;
  }

  /**
   * Sets default options for generation
   */
  private setDefaultOptions(options: GenerationOptions): GenerationOptions {
    return {
      maxCards: 10,
      preferredTypes: [CardType.DEFINITION, CardType.QUESTION_ANSWER],
      difficultyLevel: 'mixed',
      qualityThreshold: 0.6,
      enableAI: aiConfigManager.isAIEnabled(),
      batchSize: 5,
      includeMetadata: false,
      ...options
    };
  }

  /**
   * Executes a processing step with timing and error handling
   */
  private async executeStep<T>(
    stepName: string,
    operation: () => T | Promise<T>,
    steps: ProcessingStep[]
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      steps.push({
        name: stepName,
        duration,
        success: true,
        details: this.getStepDetails(stepName, result)
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      steps.push({
        name: stepName,
        duration,
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      throw error;
    }
  }

  /**
   * Gets details for a processing step
   */
  private getStepDetails(stepName: string, result: any): any {
    switch (stepName) {
      case 'Content Preprocessing':
        return { chunksCreated: Array.isArray(result) ? result.length : 0 };
      case 'Keyword Extraction':
        return { keywordsExtracted: Array.isArray(result) ? result.length : 0 };
      case 'Card Generation':
        return { cardsGenerated: Array.isArray(result) ? result.length : 0 };
      case 'Quality Control':
        return { cardsAfterQuality: Array.isArray(result) ? result.length : 0 };
      default:
        return {};
    }
  }

  /**
   * Generates processing statistics
   */
  private generateStatistics(
    cards: FlashCard[],
    startTime: number,
    endTime: number,
    steps: ProcessingStep[]
  ): GenerationStatistics {
    const byType = cards.reduce((acc, card) => {
      acc[card.type] = (acc[card.type] || 0) + 1;
      return acc;
    }, {} as Record<CardType, number>);

    const byDifficulty = cards.reduce((acc, card) => {
      acc[card.difficulty] = (acc[card.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<DifficultyLevel, number>);

    const averageQuality = cards.length > 0 
      ? cards.reduce((sum, card) => {
          const quality = (card as any).qualityScore?.overall || 0.5;
          return sum + quality;
        }, 0) / cards.length
      : 0;

    const aiUsed = steps.some(step => step.name === 'Card Generation' && step.success);
    const fallbackUsed = steps.some(step => step.details?.fallbackUsed);

    return {
      totalGenerated: cards.length,
      byType,
      byDifficulty,
      averageQuality,
      processingTime: endTime - startTime,
      aiUsed,
      fallbackUsed
    };
  }

  /**
   * Generates processing metadata
   */
  private generateMetadata(
    content: ExtractedContent,
    chunks: ContentChunk[],
    keywords: Keyword[],
    steps: ProcessingStep[],
    cards: FlashCard[],
    startTime: number,
    endTime: number
  ): GenerationMetadata {
    const qualityScores = cards
      .map(card => (card as any).qualityScore)
      .filter(score => score);

    const averageScores: QualityScore = qualityScores.length > 0 
      ? {
          overall: qualityScores.reduce((sum, s) => sum + s.overall, 0) / qualityScores.length,
          clarity: qualityScores.reduce((sum, s) => sum + s.clarity, 0) / qualityScores.length,
          relevance: qualityScores.reduce((sum, s) => sum + s.relevance, 0) / qualityScores.length,
          difficulty: qualityScores.reduce((sum, s) => sum + s.difficulty, 0) / qualityScores.length,
          feedback: []
        }
      : { overall: 0, clarity: 0, relevance: 0, difficulty: 0, feedback: [] };

    return {
      sourceContent: {
        originalLength: content?.text?.length || 0,
        chunksCreated: chunks?.length || 0,
        keywordsExtracted: keywords?.length || 0
      },
      processing: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        steps: steps || []
      },
      quality: {
        passedCards: cards?.length || 0,
        rejectedCards: 0, // Would need to track this during quality control
        averageScores
      }
    };
  }

  /**
   * Gets engine status and configuration
   */
  public async getEngineStatus(): Promise<{
    aiAvailable: boolean;
    configuration: any;
    lastGeneration?: Date;
  }> {
    return {
      aiAvailable: await this.aiService.isAvailable(),
      configuration: aiConfigManager.getSettings(),
      lastGeneration: undefined // Could track this
    };
  }

  /**
   * Updates engine configuration
   */
  public updateConfiguration(updates: Partial<any>): void {
    aiConfigManager.updateSettings(updates);
    this.aiService = new LocalAIModelService(aiConfigManager.getModelConfig());
    this.cardGenerator = new AICardGenerator(this.aiService);
  }
}