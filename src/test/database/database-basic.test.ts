import { describe, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => ':memory:')
  }
}));

describe('Database Basic Functionality', () => {
  it('should create in-memory database', () => {
    const db = new Database(':memory:');
    
    expect(db).toBeDefined();
    
    // Test basic SQL operations
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
    
    const insert = db.prepare('INSERT INTO test_table (name) VALUES (?)');
    const result = insert.run('test');
    
    expect(result.changes).toBe(1);
    
    const select = db.prepare('SELECT * FROM test_table WHERE id = ?');
    const row = select.get(result.lastInsertRowid);
    
    expect(row).toEqual({
      id: result.lastInsertRowid,
      name: 'test'
    });
    
    db.close();
  });

  it('should handle JSON columns', () => {
    const db = new Database(':memory:');
    
    db.exec(`
      CREATE TABLE json_test (
        id INTEGER PRIMARY KEY,
        data JSON
      )
    `);
    
    const testData = { key: 'value', number: 42, array: [1, 2, 3] };
    
    const insert = db.prepare('INSERT INTO json_test (data) VALUES (?)');
    insert.run(JSON.stringify(testData));
    
    const select = db.prepare('SELECT * FROM json_test');
    const row = select.get() as any;
    
    expect(JSON.parse(row.data)).toEqual(testData);
    
    db.close();
  });

  it('should support foreign key constraints', () => {
    const db = new Database(':memory:');
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    db.exec(`
      CREATE TABLE parent (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      
      CREATE TABLE child (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES parent(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      );
    `);
    
    // Insert parent
    const insertParent = db.prepare('INSERT INTO parent (id, name) VALUES (?, ?)');
    insertParent.run('parent1', 'Parent 1');
    
    // Insert child
    const insertChild = db.prepare('INSERT INTO child (id, parent_id, name) VALUES (?, ?, ?)');
    insertChild.run('child1', 'parent1', 'Child 1');
    
    // Verify relationship
    const selectChild = db.prepare(`
      SELECT c.*, p.name as parent_name 
      FROM child c 
      JOIN parent p ON c.parent_id = p.id 
      WHERE c.id = ?
    `);
    const result = selectChild.get('child1') as any;
    
    expect(result.name).toBe('Child 1');
    expect(result.parent_name).toBe('Parent 1');
    
    db.close();
  });
});