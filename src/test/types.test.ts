import { describe, it, expect } from 'vitest';
import { 
  FlashCard, 
  CardType, 
  DifficultyLevel, 
  StudySession, 
  SessionType, 
  Deck,
  ExtractedContent,
  Keyword,
  KeywordCategory
} from '../types';

describe('Type Definitions', () => {
  it('should have FlashCard interface with required properties', () => {
    const card: FlashCard = {
      id: 'test-id',
      front: 'Test question',
      back: 'Test answer',
      type: CardType.DEFINITION,
      difficulty: DifficultyLevel.MEDIUM,
      keywords: ['test'],
      sourceContext: 'test context',
      createdAt: new Date()
    };
    
    expect(card.id).toBe('test-id');
    expect(card.type).toBe(CardType.DEFINITION);
    expect(card.difficulty).toBe(DifficultyLevel.MEDIUM);
  });

  it('should have StudySession interface with required properties', () => {
    const session: StudySession = {
      id: 'session-id',
      deckId: 'deck-id',
      startTime: new Date(),
      cardsReviewed: [],
      sessionType: SessionType.REVIEW,
      pointsEarned: 0
    };
    
    expect(session.sessionType).toBe(SessionType.REVIEW);
    expect(session.cardsReviewed).toEqual([]);
  });

  it('should have Deck interface with required properties', () => {
    const deck: Deck = {
      id: 'deck-id',
      name: 'Test Deck',
      description: 'Test description',
      cards: [],
      createdAt: new Date(),
      lastStudied: new Date(),
      settings: {
        maxNewCardsPerDay: 20,
        maxReviewCardsPerDay: 100,
        enableSpacedRepetition: true,
        difficultyMultiplier: 1.0,
        autoAdvance: false
      }
    };
    
    expect(deck.name).toBe('Test Deck');
    expect(deck.settings.enableSpacedRepetition).toBe(true);
  });

  it('should have ExtractedContent interface with metadata', () => {
    const content: ExtractedContent = {
      text: 'Sample text',
      metadata: {
        source: 'test.txt',
        format: 'text/plain',
        extractedAt: new Date(),
        confidence: 0.95
      }
    };
    
    expect(content.text).toBe('Sample text');
    expect(content.metadata.confidence).toBe(0.95);
  });

  it('should have Keyword interface with categorization', () => {
    const keyword: Keyword = {
      term: 'photosynthesis',
      importance: 0.9,
      context: ['biology', 'plants'],
      category: KeywordCategory.CONCEPT
    };
    
    expect(keyword.category).toBe(KeywordCategory.CONCEPT);
    expect(keyword.importance).toBe(0.9);
  });
});