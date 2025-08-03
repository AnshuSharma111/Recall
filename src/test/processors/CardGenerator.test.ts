// AI Card Generator Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AICardGenerator } from '../../processors/CardGenerator';
// AI service is mocked in tests
import { Keyword, ContentChunk, KeywordCategory } from '../../types/content';
import { CardType, DifficultyLevel } from '../../types/flashcard';

// Mock the AI service
vi.mock('../../services/AIModelService');

describe('AICardGenerator', () => {
  let generator: AICardGenerator;
  let mockAIService: any;
  let mockKeywords: Keyword[];
  let mockContext: ContentChunk[];

  beforeEach(() => {
    mockAIService = {
      isAvailable: vi.fn(),
      generateCards: vi.fn(),
      getConfig: vi.fn(),
      setConfig: vi.fn()
    };

    generator = new AICardGenerator(mockAIService);

    mockKeywords = [
      {
        term: 'photosynthesis',
        importance: 0.9,
        context: ['Biology context'],
        category: KeywordCategory.CONCEPT,
        frequency: 4,
        rank: 1
      },
      {
        term: 'chlorophyll',
        importance: 0.7,
        context: ['Plant biology'],
        category: KeywordCategory.DEFINITION,
        frequency: 2,
        rank: 2
      }
    ];

    mockContext = [
      {
        id: 'chunk1',
        text: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. Chlorophyll is the green pigment that captures light energy.',
        position: 0,
        context: 'Plant biology chapter',
        importance: 0.9,
        metadata: {
          source: 'biology.txt',
          chunkType: 'paragraph',
          wordCount: 25,
          sentenceCount: 2
        }
      },
      {
        id: 'chunk2',
        text: 'The process occurs in the chloroplasts of plant cells. Light-dependent reactions happen in the thylakoids.',
        position: 1,
        context: 'Cellular biology',
        importance: 0.7,
        metadata: {
          source: 'biology.txt',
          chunkType: 'paragraph',
          wordCount: 15,
          sentenceCount: 2
        }
      }
    ];
  });

  describe('generateCards', () => {
    it('should use AI service when available', async () => {
      const mockCards = [
        {
          id: 'card1',
          front: 'What is photosynthesis?',
          back: 'The process by which plants convert light energy into chemical energy.',
          type: CardType.DEFINITION,
          difficulty: DifficultyLevel.MEDIUM,
          keywords: ['photosynthesis'],
          sourceContext: 'Biology context',
          createdAt: new Date()
        }
      ];

      mockAIService.isAvailable.mockResolvedValue(true);
      mockAIService.generateCards.mockResolvedValue(mockCards);

      const result = await generator.generateCards(mockKeywords, mockContext);

      expect(mockAIService.isAvailable).toHaveBeenCalled();
      expect(mockAIService.generateCards).toHaveBeenCalledWith(mockKeywords, mockContext);
      expect(result).toEqual(mockCards);
    });

    it('should fall back to rule-based generation when AI unavailable', async () => {
      mockAIService.isAvailable.mockResolvedValue(false);

      const result = await generator.generateCards(mockKeywords, mockContext);

      expect(result.length).toBeGreaterThan(0); // Should generate fallback cards
      expect(result[0].front).toContain('photosynthesis');
      expect(result[0].type).toBe(CardType.DEFINITION);
    });

    it('should fall back when AI service throws error', async () => {
      mockAIService.isAvailable.mockResolvedValue(true);
      mockAIService.generateCards.mockRejectedValue(new Error('AI service error'));

      const result = await generator.generateCards(mockKeywords, mockContext);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].front).toBeDefined();
      expect(result[0].back).toBeDefined();
    });

    it('should filter out low-quality AI-generated cards', async () => {
      const mockCards = [
        {
          id: 'card1',
          front: 'What is photosynthesis?',
          back: 'The process by which plants convert light energy into chemical energy.',
          type: CardType.DEFINITION,
          difficulty: DifficultyLevel.MEDIUM,
          keywords: ['photosynthesis'],
          sourceContext: 'Biology context',
          createdAt: new Date()
        },
        {
          id: 'card2',
          front: 'Bad',
          back: 'Bad',
          type: CardType.DEFINITION,
          difficulty: DifficultyLevel.MEDIUM,
          keywords: [],
          sourceContext: '',
          createdAt: new Date()
        }
      ];

      mockAIService.isAvailable.mockResolvedValue(true);
      mockAIService.generateCards.mockResolvedValue(mockCards);

      const result = await generator.generateCards(mockKeywords, mockContext);

      expect(result).toHaveLength(1); // Should filter out the bad card
      expect(result[0].front).toBe('What is photosynthesis?');
    });
  });

  describe('validateCardQuality', () => {
    it('should give high scores to good cards', () => {
      const goodCard = {
        id: 'card1',
        front: 'What is the process by which plants convert sunlight into energy?',
        back: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.',
        type: CardType.DEFINITION,
        difficulty: DifficultyLevel.MEDIUM,
        keywords: ['photosynthesis', 'plants'],
        sourceContext: 'Photosynthesis is the process by which plants use sunlight...',
        createdAt: new Date()
      };

      const quality = generator.validateCardQuality(goodCard);

      expect(quality.overall).toBeGreaterThan(0.7);
      expect(quality.clarity).toBeGreaterThan(0.8);
      expect(quality.relevance).toBeGreaterThan(0.8);
      expect(quality.feedback).toHaveLength(0);
    });

    it('should give low scores to poor cards', () => {
      const poorCard = {
        id: 'card1',
        front: 'Bad',
        back: 'Bad',
        type: CardType.DEFINITION,
        difficulty: DifficultyLevel.MEDIUM,
        keywords: [],
        sourceContext: '',
        createdAt: new Date()
      };

      const quality = generator.validateCardQuality(poorCard);

      expect(quality.overall).toBeLessThan(0.5);
      expect(quality.feedback.length).toBeGreaterThan(0);
      expect(quality.feedback).toContain('Question is too short');
      expect(quality.feedback).toContain('Answer is too short');
    });

    it('should detect undefined content', () => {
      const undefinedCard = {
        id: 'card1',
        front: 'What is undefined?',
        back: 'This contains undefined content.',
        type: CardType.DEFINITION,
        difficulty: DifficultyLevel.MEDIUM,
        keywords: ['test'],
        sourceContext: 'Test context',
        createdAt: new Date()
      };

      const quality = generator.validateCardQuality(undefinedCard);

      expect(quality.clarity).toBeLessThan(1.0);
      expect(quality.feedback).toContain('Contains undefined content');
    });
  });

  describe('fallback generation', () => {
    beforeEach(() => {
      mockAIService.isAvailable.mockResolvedValue(false);
    });

    it('should generate definition cards for top keywords', async () => {
      const result = await generator.generateCards(mockKeywords, mockContext);

      const definitionCards = result.filter(card => card.type === CardType.DEFINITION);
      expect(definitionCards.length).toBeGreaterThan(0);
      
      const photosynthesisCard = definitionCards.find(card => 
        card.keywords.includes('photosynthesis')
      );
      expect(photosynthesisCard).toBeDefined();
      expect(photosynthesisCard?.front).toContain('photosynthesis');
    });

    it('should generate question-answer cards from context', async () => {
      const result = await generator.generateCards(mockKeywords, mockContext);

      const questionCards = result.filter(card => card.type === CardType.QUESTION_ANSWER);
      expect(questionCards.length).toBeGreaterThan(0);
      
      expect(questionCards[0].front).toBeDefined();
      expect(questionCards[0].back).toBeDefined();
      expect(questionCards[0].keywords.length).toBeGreaterThan(0);
    });

    it('should map keyword categories to appropriate difficulty levels', async () => {
      const factKeyword: Keyword = {
        term: 'fact',
        importance: 0.8,
        context: ['test'],
        category: KeywordCategory.FACT,
        frequency: 1,
        rank: 1
      };

      const processKeyword: Keyword = {
        term: 'process',
        importance: 0.8,
        context: ['test'],
        category: KeywordCategory.PROCESS,
        frequency: 1,
        rank: 2
      };

      const testContext = [{
        id: 'test',
        text: 'This is a fact. This is a process that involves multiple steps.',
        position: 0,
        context: 'test',
        importance: 0.8
      }];

      const result = await generator.generateCards([factKeyword, processKeyword], testContext);

      const factCard = result.find(card => card.keywords.includes('fact'));
      const processCard = result.find(card => card.keywords.includes('process'));

      if (factCard) expect(factCard.difficulty).toBe(1); // Easy
      if (processCard) expect(processCard.difficulty).toBe(3); // Hard
    });

    it('should handle empty keywords gracefully', async () => {
      const result = await generator.generateCards([], mockContext);
      expect(result).toHaveLength(0);
    });

    it('should handle empty context gracefully', async () => {
      const result = await generator.generateCards(mockKeywords, []);
      expect(result).toHaveLength(0);
    });
  });

  describe('complexity assessment', () => {
    it('should assess text complexity correctly', () => {
      // Access private method through type assertion for testing
      const assessComplexity = (generator as any).assessComplexity.bind(generator);

      const simpleText = 'This is simple.';
      const complexText = 'This is a complex sentence because it contains multiple clauses, therefore it should receive a higher complexity score.';

      const simpleScore = assessComplexity(simpleText);
      const complexScore = assessComplexity(complexText);

      expect(complexScore).toBeGreaterThan(simpleScore);
      expect(simpleScore).toBeGreaterThan(0);
      expect(complexScore).toBeLessThanOrEqual(1);
    });
  });
});