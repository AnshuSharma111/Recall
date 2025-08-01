import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseConnection } from '../../database/connection';
import { DeckRepository } from '../../database/repository/DeckRepository';
import { Deck, DeckSettings } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => `./test-data-${Date.now()}`)
  }
}));

describe('DeckRepository', () => {
  let dbConnection: DatabaseConnection;
  let deckRepository: DeckRepository;
  let testDataDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDataDir = `./test-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDbPath = path.join(testDataDir, 'recall.db');
    
    // Mock the app.getPath to return our unique test directory
    vi.mocked(require('electron').app.getPath).mockReturnValue(testDataDir);
    
    // Reset singleton instance
    (DatabaseConnection as any).instance = null;
    
    // Ensure test data directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    dbConnection = DatabaseConnection.getInstance();
    await dbConnection.connect();
    deckRepository = new DeckRepository();
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

  const createTestDeck = (): Deck => ({
    id: 'test-deck-1',
    name: 'Test Deck',
    description: 'A test deck for unit testing',
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
  });

  it('should create a new deck', () => {
    const testDeck = createTestDeck();
    
    const createdDeck = deckRepository.create(testDeck);
    
    expect(createdDeck).toEqual(testDeck);
  });

  it('should find deck by id', () => {
    const testDeck = createTestDeck();
    deckRepository.create(testDeck);
    
    const foundDeck = deckRepository.findById('test-deck-1');
    
    expect(foundDeck).toBeDefined();
    expect(foundDeck?.id).toBe('test-deck-1');
    expect(foundDeck?.name).toBe('Test Deck');
  });

  it('should return null when deck not found', () => {
    const foundDeck = deckRepository.findById('non-existent-deck');
    
    expect(foundDeck).toBeNull();
  });

  it('should find all decks', () => {
    const deck1 = createTestDeck();
    const deck2 = { ...createTestDeck(), id: 'test-deck-2', name: 'Test Deck 2' };
    
    deckRepository.create(deck1);
    deckRepository.create(deck2);
    
    const allDecks = deckRepository.findAll();
    
    expect(allDecks).toHaveLength(2);
    expect(allDecks.map(d => d.id)).toContain('test-deck-1');
    expect(allDecks.map(d => d.id)).toContain('test-deck-2');
  });

  it('should update deck', () => {
    const testDeck = createTestDeck();
    deckRepository.create(testDeck);
    
    const updatedDeck = deckRepository.update('test-deck-1', {
      name: 'Updated Test Deck',
      description: 'Updated description'
    });
    
    expect(updatedDeck).toBeDefined();
    expect(updatedDeck?.name).toBe('Updated Test Deck');
    expect(updatedDeck?.description).toBe('Updated description');
  });

  it('should delete deck', () => {
    const testDeck = createTestDeck();
    deckRepository.create(testDeck);
    
    const deleted = deckRepository.delete('test-deck-1');
    
    expect(deleted).toBe(true);
    
    const foundDeck = deckRepository.findById('test-deck-1');
    expect(foundDeck).toBeNull();
  });

  it('should find deck by name', () => {
    const testDeck = createTestDeck();
    deckRepository.create(testDeck);
    
    const foundDeck = deckRepository.findByName('Test Deck');
    
    expect(foundDeck).toBeDefined();
    expect(foundDeck?.id).toBe('test-deck-1');
  });

  it('should update last studied timestamp', () => {
    const testDeck = createTestDeck();
    deckRepository.create(testDeck);
    
    deckRepository.updateLastStudied('test-deck-1');
    
    const updatedDeck = deckRepository.findById('test-deck-1');
    expect(updatedDeck?.lastStudied).toBeDefined();
  });

  it('should update deck settings', () => {
    const testDeck = createTestDeck();
    deckRepository.create(testDeck);
    
    const newSettings: DeckSettings = {
      maxNewCardsPerDay: 30,
      maxReviewCardsPerDay: 150,
      enableSpacedRepetition: false,
      difficultyMultiplier: 1.5,
      autoAdvance: true
    };
    
    const updated = deckRepository.updateSettings('test-deck-1', newSettings);
    
    expect(updated).toBe(true);
    
    const updatedDeck = deckRepository.findById('test-deck-1');
    expect(updatedDeck?.settings).toEqual(newSettings);
  });

  it('should count decks', () => {
    expect(deckRepository.count()).toBe(0);
    
    deckRepository.create(createTestDeck());
    expect(deckRepository.count()).toBe(1);
    
    deckRepository.create({ ...createTestDeck(), id: 'test-deck-2' });
    expect(deckRepository.count()).toBe(2);
  });

  it('should check if deck exists', () => {
    expect(deckRepository.exists('test-deck-1')).toBe(false);
    
    deckRepository.create(createTestDeck());
    expect(deckRepository.exists('test-deck-1')).toBe(true);
  });

  it('should get decks with card counts', () => {
    const testDeck = createTestDeck();
    deckRepository.create(testDeck);
    
    const decksWithCounts = deckRepository.getDecksWithCardCounts();
    
    expect(decksWithCounts).toHaveLength(1);
    expect(decksWithCounts[0]).toHaveProperty('cardCount');
    expect(decksWithCounts[0].cardCount).toBe(0);
  });
});