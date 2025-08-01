import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { DeckRepository } from '../../database/repository/DeckRepository';
import { Deck } from '../../types';

// Mock the DatabaseConnection to use in-memory database
vi.mock('../../database/connection', () => ({
  DatabaseConnection: {
    getInstance: () => ({
      getDatabase: () => testDb
    })
  }
}));

let testDb: Database.Database;

describe('Repository Basic Functionality', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    
    // Initialize schema
    testDb.exec(`
      CREATE TABLE decks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_studied DATETIME,
        settings JSON DEFAULT '{"maxNewCardsPerDay": 20, "maxReviewCardsPerDay": 100, "enableSpacedRepetition": true, "difficultyMultiplier": 1.0, "autoAdvance": false}'
      );
    `);
  });

  const createTestDeck = (): Deck => ({
    id: 'test-deck-1',
    name: 'Test Deck',
    description: 'A test deck for unit testing',
    cards: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    lastStudied: new Date('2024-01-01T00:00:00Z'),
    settings: {
      maxNewCardsPerDay: 20,
      maxReviewCardsPerDay: 100,
      enableSpacedRepetition: true,
      difficultyMultiplier: 1.0,
      autoAdvance: false
    }
  });

  it('should create and retrieve a deck', () => {
    const deckRepository = new DeckRepository();
    const testDeck = createTestDeck();
    
    // Create deck
    const createdDeck = deckRepository.create(testDeck);
    expect(createdDeck.id).toBe('test-deck-1');
    
    // Retrieve deck
    const retrievedDeck = deckRepository.findById('test-deck-1');
    expect(retrievedDeck).toBeDefined();
    expect(retrievedDeck?.name).toBe('Test Deck');
    expect(retrievedDeck?.description).toBe('A test deck for unit testing');
  });

  it('should update deck properties', () => {
    const deckRepository = new DeckRepository();
    const testDeck = createTestDeck();
    
    // Create deck
    deckRepository.create(testDeck);
    
    // Update deck
    const updatedDeck = deckRepository.update('test-deck-1', {
      name: 'Updated Test Deck',
      description: 'Updated description'
    });
    
    expect(updatedDeck).toBeDefined();
    expect(updatedDeck?.name).toBe('Updated Test Deck');
    expect(updatedDeck?.description).toBe('Updated description');
  });

  it('should delete deck', () => {
    const deckRepository = new DeckRepository();
    const testDeck = createTestDeck();
    
    // Create deck
    deckRepository.create(testDeck);
    
    // Verify it exists
    expect(deckRepository.exists('test-deck-1')).toBe(true);
    
    // Delete deck
    const deleted = deckRepository.delete('test-deck-1');
    expect(deleted).toBe(true);
    
    // Verify it's gone
    expect(deckRepository.exists('test-deck-1')).toBe(false);
  });

  it('should count decks', () => {
    const deckRepository = new DeckRepository();
    
    expect(deckRepository.count()).toBe(0);
    
    deckRepository.create(createTestDeck());
    expect(deckRepository.count()).toBe(1);
    
    deckRepository.create({ ...createTestDeck(), id: 'test-deck-2' });
    expect(deckRepository.count()).toBe(2);
  });

  it('should find deck by name', () => {
    const deckRepository = new DeckRepository();
    const testDeck = createTestDeck();
    
    deckRepository.create(testDeck);
    
    const foundDeck = deckRepository.findByName('Test Deck');
    expect(foundDeck).toBeDefined();
    expect(foundDeck?.id).toBe('test-deck-1');
  });
});