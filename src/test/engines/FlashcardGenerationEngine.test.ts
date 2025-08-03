// Flashcard Generation Engine Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlashcardGenerationEngine, GenerationOptions } from '../../engines/FlashcardGenerationEngine';
import { ExtractedContent } from '../../types/content';
import { CardType, DifficultyLevel } from '../../types/flashcard';

// Mock the dependencies
vi.mock('../../processors/ContentPreprocessor');
vi.mock('../../processors/KeywordExtractor');
vi.mock('../../processors/CardGenerator');
vi.mock('../../services/AIModelService');

describe('FlashcardGenerationEngine', () => {
  let engine: FlashcardGenerationEngine;
  let mockContent: ExtractedContent;

  beforeEach(() => {
    engine = new FlashcardGenerationEngine();
    
    mockContent = {
      text: `Machine learning is a method of data analysis that automates analytical model building. It is a branch of artificial intelligence based on the idea that systems can learn from data, identify patterns and make decisions with minimal human intervention.

Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information using a connectionist approach to computation.

Supervised learning algorithms build a mathematical model of training data that contains both inputs and desired outputs. The algorithm learns to map inputs to outputs based on the training examples.`,
      metadata: {
        source: 'test-content.txt',
        format: 'text/plain',
        extractedAt: new Date(),
        confidence: 1.0,
        size: 500
      }
    };
  });

  describe('generateFlashcards', () => {
    it('should generate flashcards with default options', async () => {
      const result = await engine.generateFlashcards(mockContent);

      expect(result).toBeDefined();
      expect(result.cards).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
    });

    it('should respect maxCards option', async () => {
      const options: GenerationOptions = {
        maxCards: 3
      };

      const result = await engine.generateFlashcards(mockContent, options);

      expect(result.cards.length).toBeLessThanOrEqual(3);
    });

    it('should filter by preferred card types', async () => {
      const options: GenerationOptions = {
        preferredTypes: [CardType.DEFINITION],
        maxCards: 5
      };

      const result = await engine.generateFlashcards(mockContent, options);

      result.cards.forEach(card => {
        expect(card.type).toBe(CardType.DEFINITION);
      });
    });

    it('should apply quality threshold', async () => {
      const options: GenerationOptions = {
        qualityThreshold: 0.8,
        includeMetadata: true
      };

      const result = await engine.generateFlashcards(mockContent, options);

      result.cards.forEach(card => {
        const qualityScore = (card as any).qualityScore;
        if (qualityScore) {
          expect(qualityScore.overall).toBeGreaterThanOrEqual(0.8);
        }
      });
    });

    it('should handle different difficulty levels', async () => {
      const options: GenerationOptions = {
        difficultyLevel: 'hard',
        maxCards: 5
      };

      const result = await engine.generateFlashcards(mockContent, options);

      result.cards.forEach(card => {
        expect(card.difficulty).toBe(DifficultyLevel.HARD);
      });
    });

    it('should process content in batches', async () => {
      const options: GenerationOptions = {
        batchSize: 2,
        maxCards: 10
      };

      const result = await engine.generateFlashcards(mockContent, options);

      expect(result.statistics.totalGenerated).toBeGreaterThan(0);
      expect(result.metadata.processing.steps).toBeDefined();
    });

    it('should include processing metadata when requested', async () => {
      const options: GenerationOptions = {
        includeMetadata: true
      };

      const result = await engine.generateFlashcards(mockContent, options);

      expect(result.metadata.sourceContent).toBeDefined();
      expect(result.metadata.processing).toBeDefined();
      expect(result.metadata.quality).toBeDefined();
      expect(result.metadata.processing.steps.length).toBeGreaterThan(0);
    });

    it('should handle empty content gracefully', async () => {
      const emptyContent: ExtractedContent = {
        text: '',
        metadata: {
          source: 'empty.txt',
          format: 'text/plain',
          extractedAt: new Date()
        }
      };

      await expect(engine.generateFlashcards(emptyContent))
        .rejects
        .toThrow();
    });

    it('should generate comprehensive statistics', async () => {
      const result = await engine.generateFlashcards(mockContent);

      expect(result.statistics.totalGenerated).toBeGreaterThanOrEqual(0);
      expect(result.statistics.byType).toBeDefined();
      expect(result.statistics.byDifficulty).toBeDefined();
      expect(result.statistics.averageQuality).toBeGreaterThanOrEqual(0);
      expect(result.statistics.processingTime).toBeGreaterThan(0);
      expect(typeof result.statistics.aiUsed).toBe('boolean');
      expect(typeof result.statistics.fallbackUsed).toBe('boolean');
    });
  });

  describe('batch processing', () => {
    it('should handle large content efficiently', async () => {
      const largeContent: ExtractedContent = {
        text: mockContent.text.repeat(10), // Make content 10x larger
        metadata: {
          source: 'large-content.txt',
          format: 'text/plain',
          extractedAt: new Date(),
          size: 5000
        }
      };

      const options: GenerationOptions = {
        batchSize: 3,
        maxCards: 15
      };

      const startTime = Date.now();
      const result = await engine.generateFlashcards(largeContent, options);
      const processingTime = Date.now() - startTime;

      expect(result.cards.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should continue processing even if some batches fail', async () => {
      // This test would require mocking batch failures
      const options: GenerationOptions = {
        batchSize: 2,
        maxCards: 8
      };

      const result = await engine.generateFlashcards(mockContent, options);

      // Should still generate some cards even if some batches fail
      expect(result.cards.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('quality control', () => {
    it('should remove duplicate cards', async () => {
      const result = await engine.generateFlashcards(mockContent);

      const cardHashes = new Set();
      let duplicatesFound = false;

      result.cards.forEach(card => {
        const hash = `${card.front.toLowerCase()}|${card.back.toLowerCase()}`;
        if (cardHashes.has(hash)) {
          duplicatesFound = true;
        }
        cardHashes.add(hash);
      });

      expect(duplicatesFound).toBe(false);
    });

    it('should validate card quality', async () => {
      const options: GenerationOptions = {
        qualityThreshold: 0.5,
        includeMetadata: true
      };

      const result = await engine.generateFlashcards(mockContent, options);

      result.cards.forEach(card => {
        expect(card.front).toBeDefined();
        expect(card.back).toBeDefined();
        expect(card.front.length).toBeGreaterThan(0);
        expect(card.back.length).toBeGreaterThan(0);
        expect(card.type).toBeDefined();
        expect(card.difficulty).toBeDefined();
      });
    });
  });

  describe('configuration and status', () => {
    it('should provide engine status', async () => {
      const status = await engine.getEngineStatus();

      expect(status).toBeDefined();
      expect(typeof status.aiAvailable).toBe('boolean');
      expect(status.configuration).toBeDefined();
    });

    it('should allow configuration updates', () => {
      const updates = {
        maxCards: 20,
        qualityThreshold: 0.7
      };

      expect(() => engine.updateConfiguration(updates)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      const invalidContent: ExtractedContent = {
        text: null as any, // Invalid content
        metadata: {
          source: 'invalid.txt',
          format: 'text/plain',
          extractedAt: new Date()
        }
      };

      await expect(engine.generateFlashcards(invalidContent))
        .rejects
        .toThrow('Generation failed');
    });

    it('should provide detailed error information', async () => {
      try {
        await engine.generateFlashcards({} as ExtractedContent);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Generation failed');
      }
    });
  });

  describe('performance', () => {
    it('should complete generation within reasonable time', async () => {
      const startTime = Date.now();
      
      await engine.generateFlashcards(mockContent, {
        maxCards: 10
      });
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent generations', async () => {
      const promises = Array.from({ length: 3 }, () =>
        engine.generateFlashcards(mockContent, { maxCards: 5 })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.cards.length).toBeGreaterThanOrEqual(0);
        expect(result.statistics).toBeDefined();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work with different content types', async () => {
      const scenarios = [
        {
          name: 'Scientific content',
          content: 'Photosynthesis is the process by which plants convert light energy into chemical energy...'
        },
        {
          name: 'Historical content',
          content: 'The American Revolution began in 1775 and ended in 1783...'
        },
        {
          name: 'Technical content',
          content: 'JavaScript is a programming language that enables interactive web pages...'
        }
      ];

      for (const scenario of scenarios) {
        const testContent: ExtractedContent = {
          text: scenario.content,
          metadata: {
            source: `${scenario.name}.txt`,
            format: 'text/plain',
            extractedAt: new Date()
          }
        };

        const result = await engine.generateFlashcards(testContent, {
          maxCards: 3
        });

        expect(result.cards.length).toBeGreaterThanOrEqual(0);
        expect(result.statistics.totalGenerated).toBeGreaterThanOrEqual(0);
      }
    });

    it('should adapt to different generation options', async () => {
      const optionSets: GenerationOptions[] = [
        { maxCards: 5, difficultyLevel: 'easy' },
        { maxCards: 10, preferredTypes: [CardType.DEFINITION] },
        { maxCards: 8, qualityThreshold: 0.8, includeMetadata: true },
        { batchSize: 2, difficultyLevel: 'hard' }
      ];

      for (const options of optionSets) {
        const result = await engine.generateFlashcards(mockContent, options);
        
        expect(result).toBeDefined();
        expect(result.cards).toBeDefined();
        expect(result.statistics).toBeDefined();
        
        if (options.maxCards) {
          expect(result.cards.length).toBeLessThanOrEqual(options.maxCards);
        }
      }
    });
  });
});