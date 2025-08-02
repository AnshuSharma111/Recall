import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseConnection } from '../../database/connection';
import { CardRepository } from '../../database/repository/CardRepository';
import { DeckRepository } from '../../database/repository/DeckRepository';
import { FlashCard, CardType, DifficultyLevel, Deck } from '../../types';
import * as fs from 'fs';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn()
  }
}));

describe('CardRepository', () => {
  let dbConnection: DatabaseConnection;
  let cardRepository: CardRepository;
  let deckRepository: DeckRepository;
  let testDataDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDataDir = `./test-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDbPath = `${testDataDir}/recall.db`;
    
    // Mock the app.getPath to return our unique test directory
    const { app } = await import('electron');
    vi.mocked(app.getPath).mockReturnValue(testDataDir);
    
    // Reset singleton instance
    (DatabaseConnection as any).instance = null;
    
    // Ensure test data directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    dbConnection = DatabaseConnection.getInstance();
    await dbConnection.connect();
    cardRepository = new CardRepository();
    deckRepository = new DeckRepository();

    // Create a test deck
    const testDeck: Deck = {
      id: 'test-deck-1',
      name: 'Test Deck',
      description: 'A test deck',
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
    deckRepository.create(testDeck);
  });

  afterEach(async () => {
    try {
      dbConnection.close();
    } catch (error) {
      // Ignore close errors
    }
    
    // Clean up test database and directory
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      if (fs.existsSync(testDataDir)) {
        fs.rmdirSync(testDataDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createTestCard = (): FlashCard => ({
    id: 'test-card-1',
    front: 'What is the capital of France?',
    back: 'Paris',
    type: CardType.QUESTION_ANSWER,
    difficulty: DifficultyLevel.MEDIUM,
    keywords: ['geography', 'france', 'capital'],
    sourceContext: 'Geography textbook chapter 5',
    createdAt: new Date()
  });

  it('should create a card with deck association', () => {
    const testCard = createTestCard();
    
    const createdCard = cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    expect(createdCard).toEqual(testCard);
  });

  it('should find cards by deck id', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const cards = cardRepository.findByDeckId('test-deck-1');
    
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('test-card-1');
  });

  it('should find card by id', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const foundCard = cardRepository.findById('test-card-1');
    
    expect(foundCard).toBeDefined();
    expect(foundCard?.front).toBe('What is the capital of France?');
    expect(foundCard?.back).toBe('Paris');
  });

  it('should move card to different deck', () => {
    // Create second deck
    const deck2: Deck = {
      id: 'test-deck-2',
      name: 'Test Deck 2',
      description: 'Second test deck',
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
    deckRepository.create(deck2);

    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const moved = cardRepository.moveCardToDeck('test-card-1', 'test-deck-2');
    
    expect(moved).toBe(true);
    
    const cardsInDeck1 = cardRepository.findByDeckId('test-deck-1');
    const cardsInDeck2 = cardRepository.findByDeckId('test-deck-2');
    
    expect(cardsInDeck1).toHaveLength(0);
    expect(cardsInDeck2).toHaveLength(1);
  });

  it('should find cards by keyword', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const cards = cardRepository.findByKeyword('geography');
    
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('test-card-1');
  });

  it('should find cards by type', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const cards = cardRepository.findByType(CardType.QUESTION_ANSWER);
    
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe(CardType.QUESTION_ANSWER);
  });

  it('should find cards by difficulty', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const cards = cardRepository.findByDifficulty(DifficultyLevel.MEDIUM);
    
    expect(cards).toHaveLength(1);
    expect(cards[0].difficulty).toBe(DifficultyLevel.MEDIUM);
  });

  it('should search cards by text content', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const cards = cardRepository.searchCards('capital');
    
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('capital');
  });

  it('should get card count by deck', () => {
    expect(cardRepository.getCardCountByDeck('test-deck-1')).toBe(0);
    
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    expect(cardRepository.getCardCountByDeck('test-deck-1')).toBe(1);
  });

  it('should delete cards by deck id', () => {
    const testCard1 = createTestCard();
    const testCard2 = { ...createTestCard(), id: 'test-card-2' };
    
    cardRepository.createWithDeck(testCard1, 'test-deck-1');
    cardRepository.createWithDeck(testCard2, 'test-deck-1');
    
    const deletedCount = cardRepository.deleteByDeckId('test-deck-1');
    
    expect(deletedCount).toBe(2);
    expect(cardRepository.findByDeckId('test-deck-1')).toHaveLength(0);
  });

  it('should update card', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const updatedCard = cardRepository.update('test-card-1', {
      front: 'What is the capital of Germany?',
      back: 'Berlin'
    });
    
    expect(updatedCard).toBeDefined();
    expect(updatedCard?.front).toBe('What is the capital of Germany?');
    expect(updatedCard?.back).toBe('Berlin');
  });

  it('should delete card', () => {
    const testCard = createTestCard();
    cardRepository.createWithDeck(testCard, 'test-deck-1');
    
    const deleted = cardRepository.delete('test-card-1');
    
    expect(deleted).toBe(true);
    expect(cardRepository.findById('test-card-1')).toBeNull();
  });
});