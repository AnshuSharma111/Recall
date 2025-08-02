import { describe, it, expect } from 'vitest';
import { FlashCardModel } from '../../models/FlashCardModel';
import { ValidationError } from '../../models/validation';
import { CardType, DifficultyLevel } from '../../types';

describe('FlashCardModel', () => {
  const validCardData = {
    front: 'What is the capital of France?',
    back: 'Paris',
    type: CardType.QUESTION_ANSWER,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['geography', 'france', 'capital'],
    sourceContext: 'Geography textbook chapter 5'
  };

  describe('Construction and Validation', () => {
    it('should create a valid flashcard with required fields', () => {
      const card = new FlashCardModel({
        front: 'Test question',
        back: 'Test answer'
      });

      expect(card.front).toBe('Test question');
      expect(card.back).toBe('Test answer');
      expect(card.id).toBeDefined();
      expect(card.createdAt).toBeInstanceOf(Date);
      expect(card.type).toBe(CardType.QUESTION_ANSWER);
      expect(card.difficulty).toBe(DifficultyLevel.MEDIUM);
    });

    it('should create a flashcard with all fields', () => {
      const card = new FlashCardModel(validCardData);

      expect(card.front).toBe(validCardData.front);
      expect(card.back).toBe(validCardData.back);
      expect(card.type).toBe(validCardData.type);
      expect(card.difficulty).toBe(validCardData.difficulty);
      expect(card.keywords).toEqual(validCardData.keywords);
      expect(card.sourceContext).toBe(validCardData.sourceContext);
    });

    it('should throw ValidationError for missing front text', () => {
      expect(() => {
        new FlashCardModel({
          front: '',
          back: 'Test answer'
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing back text', () => {
      expect(() => {
        new FlashCardModel({
          front: 'Test question',
          back: ''
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for identical front and back text', () => {
      expect(() => {
        new FlashCardModel({
          front: 'Same text',
          back: 'Same text'
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid card type', () => {
      expect(() => {
        new FlashCardModel({
          front: 'Test question',
          back: 'Test answer',
          type: 'invalid_type' as CardType
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for text exceeding maximum length', () => {
      expect(() => {
        new FlashCardModel({
          front: 'a'.repeat(1001), // Exceeds 1000 char limit
          back: 'Test answer'
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Validation Method', () => {
    it('should return valid result for correct data', () => {
      const card = new FlashCardModel(validCardData);
      const validation = card.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect duplicate keywords and add warning', () => {
      const card = new FlashCardModel({
        ...validCardData,
        keywords: ['test', 'duplicate', 'test', 'duplicate']
      });
      const validation = card.validate();

      expect(validation.warnings).toContain('Duplicate keywords detected and will be removed');
    });

    it('should validate keyword array items', () => {
      expect(() => {
        new FlashCardModel({
          ...validCardData,
          keywords: ['valid', '', 'also-valid'] // Empty string should fail
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Update Operations', () => {
    it('should update card properties', () => {
      const card = new FlashCardModel(validCardData);
      const updatedCard = card.update({
        front: 'Updated question',
        difficulty: DifficultyLevel.HARD
      });

      expect(updatedCard.front).toBe('Updated question');
      expect(updatedCard.difficulty).toBe(DifficultyLevel.HARD);
      expect(updatedCard.back).toBe(validCardData.back); // Unchanged
      expect(updatedCard.id).toBe(card.id); // Same ID
    });

    it('should add keywords without duplicates', () => {
      const card = new FlashCardModel(validCardData);
      const updatedCard = card.addKeywords(['new-keyword', 'geography']); // 'geography' already exists

      expect(updatedCard.keywords).toContain('new-keyword');
      expect(updatedCard.keywords.filter(k => k === 'geography')).toHaveLength(1);
    });

    it('should remove keywords', () => {
      const card = new FlashCardModel(validCardData);
      const updatedCard = card.removeKeywords(['geography', 'france']);

      expect(updatedCard.keywords).not.toContain('geography');
      expect(updatedCard.keywords).not.toContain('france');
      expect(updatedCard.keywords).toContain('capital');
    });
  });

  describe('Search and Query Methods', () => {
    it('should find cards with specific keywords', () => {
      const card = new FlashCardModel(validCardData);

      expect(card.hasKeywords(['geography'])).toBe(true);
      expect(card.hasKeywords(['history'])).toBe(false);
      expect(card.hasKeywords(['geography', 'history'])).toBe(true); // At least one match
    });

    it('should search content across all text fields', () => {
      const card = new FlashCardModel(validCardData);

      expect(card.searchContent('capital')).toBe(true); // In front text
      expect(card.searchContent('Paris')).toBe(true); // In back text
      expect(card.searchContent('textbook')).toBe(true); // In source context
      expect(card.searchContent('france')).toBe(true); // In keywords
      expect(card.searchContent('nonexistent')).toBe(false);
    });

    it('should perform case-insensitive search', () => {
      const card = new FlashCardModel(validCardData);

      expect(card.searchContent('CAPITAL')).toBe(true);
      expect(card.searchContent('paris')).toBe(true);
      expect(card.searchContent('FRANCE')).toBe(true);
    });
  });

  describe('Complexity and Difficulty Analysis', () => {
    it('should calculate complexity score', () => {
      const simpleCard = new FlashCardModel({
        front: 'A',
        back: 'B',
        keywords: []
      });

      const complexCard = new FlashCardModel({
        front: 'This is a very long and complex question that requires detailed understanding of multiple concepts and their relationships',
        back: 'This is an equally complex answer that provides comprehensive explanation with multiple examples and detailed analysis',
        keywords: ['complex', 'detailed', 'comprehensive', 'analysis', 'concepts', 'relationships', 'examples']
      });

      const simpleScore = simpleCard.getComplexityScore();
      const complexScore = complexCard.getComplexityScore();

      expect(simpleScore).toBeLessThan(complexScore);
      expect(simpleScore).toBeGreaterThanOrEqual(0);
      expect(complexScore).toBeLessThanOrEqual(1);
    });

    it('should suggest appropriate difficulty level', () => {
      const simpleCard = new FlashCardModel({
        front: 'A',
        back: 'B'
      });

      const complexCard = new FlashCardModel({
        front: 'Explain the complex interrelationships between quantum mechanics and general relativity in the context of modern theoretical physics',
        back: 'The relationship involves multiple theoretical frameworks...',
        keywords: ['quantum', 'mechanics', 'relativity', 'theoretical', 'physics', 'frameworks', 'complex']
      });

      expect(simpleCard.suggestDifficulty()).toBe(DifficultyLevel.EASY);
      expect(complexCard.suggestDifficulty()).toBeGreaterThan(DifficultyLevel.EASY);
    });
  });

  describe('Serialization', () => {
    it('should convert to plain object', () => {
      const card = new FlashCardModel(validCardData);
      const obj = card.toObject();

      expect(obj.front).toBe(validCardData.front);
      expect(obj.back).toBe(validCardData.back);
      expect(obj.id).toBe(card.id);
      expect(obj.createdAt).toBeInstanceOf(Date);
    });

    it('should serialize to and from JSON', () => {
      const card = new FlashCardModel(validCardData);
      const json = card.toJSON();
      const restored = FlashCardModel.fromJSON(json);

      expect(restored.front).toBe(card.front);
      expect(restored.back).toBe(card.back);
      expect(restored.id).toBe(card.id);
      expect(restored.createdAt.getTime()).toBe(card.createdAt.getTime());
    });

    it('should create from array data', () => {
      const cardsData = [
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' }
      ];

      const cards = FlashCardModel.fromArray(cardsData);

      expect(cards).toHaveLength(2);
      expect(cards[0].front).toBe('Q1');
      expect(cards[1].front).toBe('Q2');
    });

    it('should create deep copy with clone', () => {
      const card = new FlashCardModel(validCardData);
      const cloned = card.clone();

      expect(cloned.id).toBe(card.id);
      expect(cloned.front).toBe(card.front);
      expect(cloned).not.toBe(card); // Different instances
      expect(cloned.keywords).not.toBe(card.keywords); // Different arrays
    });
  });
});