// AI Model Service Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalAIModelService } from '../../services/AIModelService';
import { Keyword, ContentChunk, KeywordCategory } from '../../types/content';
import { CardType } from '../../types/flashcard';

// Mock fetch globally
global.fetch = vi.fn();

describe('LocalAIModelService', () => {
  let service: LocalAIModelService;
  let mockKeywords: Keyword[];
  let mockContext: ContentChunk[];

  beforeEach(() => {
    service = new LocalAIModelService();
    vi.clearAllMocks();

    mockKeywords = [
      {
        term: 'machine learning',
        importance: 0.9,
        context: ['AI context'],
        category: KeywordCategory.CONCEPT,
        frequency: 5,
        rank: 1
      },
      {
        term: 'neural network',
        importance: 0.8,
        context: ['Deep learning context'],
        category: KeywordCategory.DEFINITION,
        frequency: 3,
        rank: 2
      }
    ];

    mockContext = [
      {
        id: 'chunk1',
        text: 'Machine learning is a method of data analysis that automates analytical model building.',
        position: 0,
        context: 'Introduction to AI',
        importance: 0.9,
        metadata: {
          source: 'test.txt',
          chunkType: 'paragraph',
          wordCount: 15,
          sentenceCount: 1
        }
      }
    ];
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [{ name: 'llama3.2:3b' }]
        })
      };
      
      (fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await service.isAvailable();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should return false when Ollama is not available', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await service.isAvailable();
      expect(result).toBe(false);
    });

    it('should return false when model is not found', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [{ name: 'different-model:1b' }]
        })
      };
      
      (fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await service.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('generateCards', () => {
    it('should generate cards successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          response: `CARD: 1
Q: What is machine learning?
A: Machine learning is a method of data analysis that automates analytical model building.
TYPE: definition

CARD: 2
Q: How does a neural network work?
A: A neural network processes information through interconnected nodes that simulate neurons.
TYPE: question_answer`,
          done: true
        })
      };

      (fetch as any).mockResolvedValueOnce(mockResponse);

      const cards = await service.generateCards(mockKeywords, mockContext);

      expect(cards).toHaveLength(2);
      expect(cards[0].front).toBe('What is machine learning?');
      expect(cards[0].back).toBe('Machine learning is a method of data analysis that automates analytical model building.');
      expect(cards[0].type).toBe(CardType.DEFINITION);
      expect(cards[0].keywords).toContain('machine learning');
    });

    it('should handle fallback parsing when structured format fails', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          response: `Q: What is machine learning?
A: A method of data analysis.

Q: What is a neural network?
A: An interconnected system of nodes.`,
          done: true
        })
      };

      (fetch as any).mockResolvedValueOnce(mockResponse);

      const cards = await service.generateCards(mockKeywords, mockContext);

      expect(cards).toHaveLength(2);
      expect(cards[0].type).toBe(CardType.QUESTION_ANSWER);
      expect(cards[0].front).toBe('What is machine learning?');
    });

    it('should throw error when no keywords provided', async () => {
      await expect(service.generateCards([], mockContext))
        .rejects
        .toThrow('No keywords provided for card generation');
    });

    it('should retry on failure and eventually succeed', async () => {
      // First call fails, second succeeds
      (fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            response: 'Q: Test question? A: Test answer.',
            done: true
          })
        });

      const cards = await service.generateCards(mockKeywords, mockContext);
      expect(cards).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(service.generateCards(mockKeywords, mockContext))
        .rejects
        .toThrow('Failed after 3 attempts');
    }, 10000);
  });

  describe('validateResponse', () => {
    it('should validate structured card format', () => {
      const response = 'CARD: 1\nQ: Question?\nA: Answer.';
      expect(service.validateResponse(response)).toBe(true);
    });

    it('should validate Q: A: format', () => {
      const response = 'Q: Question?\nA: Answer.';
      expect(service.validateResponse(response)).toBe(true);
    });

    it('should validate JSON format', () => {
      const response = '{"cards": [{"question": "Q?", "answer": "A."}]}';
      expect(service.validateResponse(response)).toBe(true);
    });

    it('should reject empty or invalid responses', () => {
      expect(service.validateResponse('')).toBe(false);
      expect(service.validateResponse('   ')).toBe(false);
      expect(service.validateResponse('Invalid response')).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should get current configuration', () => {
      const config = service.getConfig();
      expect(config.provider).toBe('ollama');
      expect(config.baseUrl).toBe('http://localhost:11434');
      expect(config.model).toBe('llama3.2:3b');
    });

    it('should update configuration', () => {
      service.setConfig({
        model: 'llama3.2:1b',
        timeout: 60000
      });

      const config = service.getConfig();
      expect(config.model).toBe('llama3.2:1b');
      expect(config.timeout).toBe(60000);
      expect(config.provider).toBe('ollama'); // Should preserve other settings
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors appropriately', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(service.generateCards(mockKeywords, mockContext))
        .rejects
        .toThrow('HTTP 404: Not Found');
    });

    it('should handle timeout errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Timeout'));

      await expect(service.generateCards(mockKeywords, mockContext))
        .rejects
        .toThrow();
    }, 10000);

    it('should handle empty responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: '', done: true })
      });

      await expect(service.generateCards(mockKeywords, mockContext))
        .rejects
        .toThrow('Empty response from model');
    }, 10000);
  });
});