import Database from 'better-sqlite3';
import { DatabaseConnection } from '../connection';

export abstract class BaseRepository<T> {
  protected db: Database.Database;
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = DatabaseConnection.getInstance().getDatabase();
  }

  protected abstract mapRowToEntity(row: any): T;
  protected abstract mapEntityToRow(entity: T): any;

  public create(entity: T): T {
    try {
      const row = this.mapEntityToRow(entity);
      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row).map(() => '?').join(', ');
      const values = Object.values(row);

      const stmt = this.db.prepare(`
        INSERT INTO ${this.tableName} (${columns}) 
        VALUES (${placeholders})
      `);

      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error(`Failed to create entity in ${this.tableName}`);
      }

      return entity;
    } catch (error) {
      console.error(`Error creating entity in ${this.tableName}:`, error);
      throw error;
    }
  }

  public findById(id: string): T | null {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
      const row = stmt.get(id);
      
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error(`Error finding entity by id in ${this.tableName}:`, error);
      throw error;
    }
  }

  public findAll(): T[] {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName}`);
      const rows = stmt.all();
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error(`Error finding all entities in ${this.tableName}:`, error);
      throw error;
    }
  }

  public update(id: string, updates: Partial<T>): T | null {
    try {
      const existing = this.findById(id);
      if (!existing) {
        return null;
      }

      const updatedEntity = { ...existing, ...updates };
      const row = this.mapEntityToRow(updatedEntity);
      
      const setClause = Object.keys(row)
        .filter(key => key !== 'id')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.entries(row)
        .filter(([key]) => key !== 'id')
        .map(([, value]) => value);
      
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE ${this.tableName} 
        SET ${setClause} 
        WHERE id = ?
      `);

      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error(`Failed to update entity in ${this.tableName}`);
      }

      return updatedEntity;
    } catch (error) {
      console.error(`Error updating entity in ${this.tableName}:`, error);
      throw error;
    }
  }

  public delete(id: string): boolean {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
      const result = stmt.run(id);
      
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting entity in ${this.tableName}:`, error);
      throw error;
    }
  }

  public count(): number {
    try {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
      const result = stmt.get() as { count: number };
      
      return result.count;
    } catch (error) {
      console.error(`Error counting entities in ${this.tableName}:`, error);
      throw error;
    }
  }

  public exists(id: string): boolean {
    try {
      const stmt = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`);
      const result = stmt.get(id);
      
      return !!result;
    } catch (error) {
      console.error(`Error checking entity existence in ${this.tableName}:`, error);
      throw error;
    }
  }

  protected executeQuery(query: string, params: any[] = []): any[] {
    try {
      const stmt = this.db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      console.error(`Error executing query in ${this.tableName}:`, error);
      throw error;
    }
  }

  protected executeStatement(query: string, params: any[] = []): Database.RunResult {
    try {
      const stmt = this.db.prepare(query);
      return stmt.run(...params);
    } catch (error) {
      console.error(`Error executing statement in ${this.tableName}:`, error);
      throw error;
    }
  }

  public transaction<R>(fn: () => R): R {
    const transaction = this.db.transaction(fn);
    return transaction();
  }
}