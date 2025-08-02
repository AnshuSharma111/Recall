import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseConnection } from '../../database/connection';
import * as fs from 'fs';
import * as path from 'path';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn()
  }
}));

describe('DatabaseConnection', () => {
  let dbConnection: DatabaseConnection;
  let testDataDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDataDir = `./test-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDbPath = path.join(testDataDir, 'recall.db');
    
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

  it('should create a singleton instance', () => {
    const instance1 = DatabaseConnection.getInstance();
    const instance2 = DatabaseConnection.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should connect to database and initialize schema', async () => {
    const db = await dbConnection.connect();
    
    expect(db).toBeDefined();
    expect(fs.existsSync(testDbPath)).toBe(true);
  });

  it('should return the same database instance on multiple connects', async () => {
    const db1 = await dbConnection.connect();
    const db2 = await dbConnection.connect();
    
    expect(db1).toBe(db2);
  });

  it('should throw error when getting database before connecting', () => {
    expect(() => dbConnection.getDatabase()).toThrow('Database not connected');
  });

  it('should close database connection', async () => {
    await dbConnection.connect();
    
    expect(() => dbConnection.getDatabase()).not.toThrow();
    
    dbConnection.close();
    
    expect(() => dbConnection.getDatabase()).toThrow('Database not connected');
  });

  it('should create all required tables', async () => {
    const db = await dbConnection.connect();
    
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    const tableNames = tables.map((table: any) => table.name);
    
    expect(tableNames).toContain('decks');
    expect(tableNames).toContain('cards');
    expect(tableNames).toContain('card_statistics');
    expect(tableNames).toContain('study_sessions');
    expect(tableNames).toContain('study_responses');
    expect(tableNames).toContain('user_statistics');
    expect(tableNames).toContain('achievements');
  });

  it('should initialize user statistics record', async () => {
    const db = await dbConnection.connect();
    
    const userStats = db.prepare('SELECT * FROM user_statistics WHERE id = 1').get();
    
    expect(userStats).toBeDefined();
    expect(userStats.id).toBe(1);
    expect(userStats.total_cards_studied).toBe(0);
    expect(userStats.current_streak).toBe(0);
  });

  it('should enable foreign keys', async () => {
    const db = await dbConnection.connect();
    
    const foreignKeysEnabled = db.pragma('foreign_keys');
    
    expect(foreignKeysEnabled[0].foreign_keys).toBe(1);
  });

  it('should get database statistics', async () => {
    await dbConnection.connect();
    
    const stats = dbConnection.getStats();
    
    expect(stats).toHaveProperty('path');
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('tables');
    expect(stats).toHaveProperty('indexes');
    expect(stats.tables.length).toBeGreaterThan(0);
  });
});