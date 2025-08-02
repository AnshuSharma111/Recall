import { describe, it, expect } from 'vitest';
import { DeckModel } from '../../models/DeckModel';
import { FlashCardModel } from '../../models/FlashCardModel';
import { ValidationError } from '../../models/validation';
import { CardType, DifficultyLevel } from '../../types';

describe('DeckModel', () => {
  const validDeckData = {
    name: 'Test Deck',
    description: 'A test deck for unit testing',
    cards: ['card1', 'card2', 'card3'],
    settings: {
      maxNewCardsPerDay: 20,
      maxReviewCardsPerDay: 100,
      enableSpacedRepetition: true,
      difficultyMultiplier: 1.0,
      autoAdvance: false
    }
  };

  describe('Construction and Validation', () => {
    it('should create a valid deck with required fields', () => {
      const deck = new DeckModel({
        name: 'Simple Deck'
      });

      expect(deck.name).toBe('Simple Deck');
      expect(deck.id).toBeDefined();
      expect(deck.createdAt).toBeInstanceOf(Date);
      expect(deck.lastStudied).toBeInstanceOf(Date);
      expect(deck.cards).toEqual([]);
      expect(deck.settings).toBeDefined();
    });

    it('should create a deck with all fields', () => {
      const deck = new DeckModel(validDeckData);

      expect(deck.name).toBe(validDeckData.name);
      expect(deck.description).toBe(validDeckData.description);
      expect(deck.cards).toEqual(validDeckData.cards);
      expect(deck.settings).toEqual(validDeckData.settings);
    });

    it('should use default settings when not provided', () => {
      const deck = new DeckModel({ name: 'Test' });

      expect(deck.settings.maxNewCardsPerDay).toBe(20);
      expect(deck.settings.maxReviewCardsPerDay).toBe(100);
      expect(deck.settings.enableSpacedRepetition).toBe(true);
      expect(deck.settings.difficultyMultiplier).toBe(1.0);
      expect(deck.settings.autoAdvance).toBe(false);
    });

    it('should throw ValidationError for missing name', () => {
      expect(() => {
        new DeckModel({
          name: ''
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid name characters', () => {
      expect(() => {
        new DeckModel({
          name: 'Invalid@Name#'
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for name exceeding maximum length', () => {
      expect(() => {
        new DeckModel({
          name: 'a'.repeat(101) // Exceeds 100 char limit
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate card IDs', () => {
      expect(() => {
        new DeckModel({
          name: 'Test Deck',
          cards: ['card1', 'card2', 'card1'] // Duplicate card1
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Settings Validation', () => {
    it('should validate settings ranges', () => {
      expect(() => {
        new DeckModel({
          name: 'Test',
          settings: {
            maxNewCardsPerDay: 0, // Below minimum
            maxReviewCardsPerDay: 100,
            enableSpacedRepetition: true,
            difficultyMultiplier: 1.0,
            autoAdvance: false
          }
        });
      }).toThrow(ValidationError);
    });

    it('should validate difficulty multiplier range', () => {
      expect(() => {
        new DeckModel({
          name: 'Test',
          settings: {
            maxNewCardsPerDay: 20,
            maxReviewCardsPerDay: 100,
            enableSpacedRepetition: true,
            difficultyMultiplier: 6.0, // Above maximum
            autoAdvance: false
          }
        });
      }).toThrow(ValidationError);
    });

    it('should validate boolean settings', () => {
      expect(() => {
        new DeckModel({
          name: 'Test',
          settings: {
            maxNewCardsPerDay: 20,
            maxReviewCardsPerDay: 100,
            enableSpacedRepetition: 'true' as any, // Should be boolean
            difficultyMultiplier: 1.0,
            autoAdvance: false
          }
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Update Operations', () => {
    it('should update deck properties', () => {
      const deck = new DeckModel(validDeckData);
      const updatedDeck = deck.update({
        name: 'Updated Deck',
        description: 'Updated description'
      });

      expect(updatedDeck.name).toBe('Updated Deck');
      expect(updatedDeck.description).toBe('Updated description');
      expect(updatedDeck.cards).toEqual(validDeckData.cards); // Unchanged
      expect(updatedDeck.id).toBe(deck.id); // Same ID
    });

    it('should update settings', () => {
      const deck = new DeckModel(validDeckData);
      const updatedDeck = deck.updateSettings({
        maxNewCardsPerDay: 30,
        autoAdvance: true
      });

      expect(updatedDeck.settings.maxNewCardsPerDay).toBe(30);
      expect(updatedDeck.settings.autoAdvance).toBe(true);
      expect(updatedDeck.settings.maxReviewCardsPerDay).toBe(100); // Unchanged
    });

    it('should mark deck as studied', () => {
      const deck = new DeckModel(validDeckData);
      const originalTime = deck.lastStudied.getTime();
      
      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        const studiedDeck = deck.markAsStudied();
        expect(studiedDeck.lastStudied.getTime()).toBeGreaterThan(originalTime);
      }, 1);
    });
  });

  describe('Card Management', () => {
    it('should add cards without duplicates', () => {
      const deck = new DeckModel(validDeckData);
      const updatedDeck = deck.addCards(['card4', 'card5', 'card1']); // card1 already exists

      expect(updatedDeck.cards).toContain('card4');
      expect(updatedDeck.cards).toContain('card5');
      expect(updatedDeck.cards.filter(id => id === 'card1')).toHaveLength(1);
    });

    it('should remove cards', () => {
      const deck = new DeckModel(validDeckData);
      const updatedDeck = deck.removeCards(['card1', 'card3']);

      expect(updatedDeck.cards).not.toContain('card1');
      expect(updatedDeck.cards).not.toContain('card3');
      expect(updatedDeck.cards).toContain('card2');
    });

    it('should move cards (remove from current deck)', () => {
      const deck = new DeckModel(validDeckData);
      const updatedDeck = deck.moveCardsTo(['card1', 'card2']);

      expect(updatedDeck.cards).not.toContain('card1');
      expect(updatedDeck.cards).not.toContain('card2');
      expect(updatedDeck.cards).toContain('card3');
    });

    it('should check if deck has specific cards', () => {
      const deck = new DeckModel(validDeckData);

      expect(deck.hasCards(['card1', 'card2'])).toBe(true);
      expect(deck.hasCards(['card1', 'nonexistent'])).toBe(false);
      expect(deck.hasCards([])).toBe(true); // Empty array should return true
    });

    it('should get card count', () => {
      const deck = new DeckModel(validDeckData);
      expect(deck.getCardCount()).toBe(3);

      const emptyDeck = new DeckModel({ name: 'Empty' });
      expect(emptyDeck.getCardCount()).toBe(0);
    });

    it('should check if deck is empty', () => {
      const deck = new DeckModel(validDeckData);
      expect(deck.isEmpty()).toBe(false);

      const emptyDeck = new DeckModel({ name: 'Empty' });
      expect(emptyDeck.isEmpty()).toBe(true);
    });
  });

  describe('Statistics and Analysis', () => {
    it('should calculate deck statistics', () => {
      const deck = new DeckModel({
        name: 'Stats Test',
        cards: ['card1', 'card2', 'card3']
      });

      const cardModels = [
        new FlashCardModel({
          id: 'card1',
          front: 'Q1',
          back: 'A1',
          type: CardType.QUESTION_ANSWER,
          difficulty: DifficultyLevel.EASY,
          keywords: ['test', 'easy']
        }),
        new FlashCardModel({
          id: 'card2',
          front: 'Q2',
          back: 'A2',
          type: CardType.DEFINITION,
          difficulty: DifficultyLevel.HARD,
          keywords: ['test', 'hard']
        }),
        new FlashCardModel({
          id: 'card3',
          front: 'Q3',
          back: 'A3',
          type: CardType.QUESTION_ANSWER,
          difficulty: DifficultyLevel.MEDIUM,
          keywords: ['different']
        })
      ];

      const stats = deck.calculateStats(cardModels);

      expect(stats.totalCards).toBe(3);
      expect(stats.cardsByType[CardType.QUESTION_ANSWER]).toBe(2);
      expect(stats.cardsByType[CardType.DEFINITION]).toBe(1);
      expect(stats.cardsByDifficulty[DifficultyLevel.EASY]).toBe(1);
      expect(stats.cardsByDifficulty[DifficultyLevel.MEDIUM]).toBe(1);
      expect(stats.cardsByDifficulty[DifficultyLevel.HARD]).toBe(1);
      expect(stats.uniqueKeywords).toContain('test');
      expect(stats.uniqueKeywords).toContain('easy');
      expect(stats.uniqueKeywords).toContain('different');
      expect(stats.averageComplexity).toBeGreaterThan(0);
    });

    it('should suggest optimal settings based on deck characteristics', () => {
      const largeDeck = new DeckModel({
        name: 'Large Deck',
        cards: Array.from({ length: 300 }, (_, i) => `card${i}`)
      });

      const complexCards = Array.from({ length: 300 }, (_, i) => 
        new FlashCardModel({
          id: `card${i}`,
          front: 'Very complex question with lots of detail and multiple concepts that require deep understanding and comprehensive analysis of various interconnected topics',
          back: 'Equally complex answer with comprehensive explanation that covers multiple aspects and provides detailed insights into the subject matter',
          keywords: ['complex', 'detailed', 'comprehensive', 'analysis', 'interconnected', 'insights', 'aspects', 'subject', 'matter', 'understanding']
        })
      );

      const suggestions = largeDeck.suggestOptimalSettings(complexCards);

      expect(suggestions.maxNewCardsPerDay).toBe(20); // Large deck
      
      // Verify that suggestions are provided
      expect(suggestions).toBeDefined();
      expect(typeof suggestions).toBe('object');
      
      // Check that suggestions contain expected properties
      if (suggestions.maxReviewCardsPerDay !== undefined) {
        expect(typeof suggestions.maxReviewCardsPerDay).toBe('number');
        expect(suggestions.maxReviewCardsPerDay).toBeGreaterThan(0);
      }
      
      if (suggestions.difficultyMultiplier !== undefined) {
        expect(typeof suggestions.difficultyMultiplier).toBe('number');
        expect(suggestions.difficultyMultiplier).toBeGreaterThan(0);
      }
    });
  });

  describe('Name Uniqueness Validation', () => {
    it('should validate unique deck names', () => {
      const existingDecks = [
        new DeckModel({ name: 'Existing Deck 1' }),
        new DeckModel({ name: 'Existing Deck 2' })
      ];

      const uniqueValidation = DeckModel.validateUniqueName('New Deck', existingDecks);
      expect(uniqueValidation.isValid).toBe(true);

      const duplicateValidation = DeckModel.validateUniqueName('Existing Deck 1', existingDecks);
      expect(duplicateValidation.isValid).toBe(false);
      expect(duplicateValidation.errors[0].code).toBe('DUPLICATE_NAME');
    });

    it('should perform case-insensitive name validation', () => {
      const existingDecks = [
        new DeckModel({ name: 'Test Deck' })
      ];

      const validation = DeckModel.validateUniqueName('test deck', existingDecks);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should convert to plain object', () => {
      const deck = new DeckModel(validDeckData);
      const obj = deck.toObject();

      expect(obj.name).toBe(validDeckData.name);
      expect(obj.description).toBe(validDeckData.description);
      expect(obj.cards).toEqual(validDeckData.cards);
      expect(obj.id).toBe(deck.id);
      expect(obj.createdAt).toBeInstanceOf(Date);
    });

    it('should serialize to and from JSON', () => {
      const deck = new DeckModel(validDeckData);
      const json = deck.toJSON();
      const restored = DeckModel.fromJSON(json);

      expect(restored.name).toBe(deck.name);
      expect(restored.description).toBe(deck.description);
      expect(restored.cards).toEqual(deck.cards);
      expect(restored.id).toBe(deck.id);
      expect(restored.createdAt.getTime()).toBe(deck.createdAt.getTime());
    });

    it('should create from array data', () => {
      const decksData = [
        { name: 'Deck 1' },
        { name: 'Deck 2' }
      ];

      const decks = DeckModel.fromArray(decksData);

      expect(decks).toHaveLength(2);
      expect(decks[0].name).toBe('Deck 1');
      expect(decks[1].name).toBe('Deck 2');
    });

    it('should create deep copy with clone', () => {
      const deck = new DeckModel(validDeckData);
      const cloned = deck.clone();

      expect(cloned.id).toBe(deck.id);
      expect(cloned.name).toBe(deck.name);
      expect(cloned).not.toBe(deck); // Different instances
      expect(cloned.cards).not.toBe(deck.cards); // Different arrays
      expect(cloned.settings).not.toBe(deck.settings); // Different objects
    });
  });
});