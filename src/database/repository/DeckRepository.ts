import { BaseRepository } from './BaseRepository';
import { Deck, DeckSettings } from '../../types';

export class DeckRepository extends BaseRepository<Deck> {
  constructor() {
    super('decks');
  }

  protected mapRowToEntity(row: any): Deck {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      cards: [], // Cards will be loaded separately
      createdAt: new Date(row.created_at),
      lastStudied: row.last_studied ? new Date(row.last_studied) : new Date(),
      settings: row.settings ? JSON.parse(row.settings) : this.getDefaultSettings()
    };
  }

  protected mapEntityToRow(entity: Deck): any {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      created_at: entity.createdAt.toISOString(),
      last_studied: entity.lastStudied.toISOString(),
      settings: JSON.stringify(entity.settings)
    };
  }

  private getDefaultSettings(): DeckSettings {
    return {
      maxNewCardsPerDay: 20,
      maxReviewCardsPerDay: 100,
      enableSpacedRepetition: true,
      difficultyMultiplier: 1.0,
      autoAdvance: false
    };
  }

  public findByName(name: string): Deck | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM decks WHERE name = ?');
      const row = stmt.get(name);
      
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding deck by name:', error);
      throw error;
    }
  }

  public findRecentlyStudied(limit: number = 10): Deck[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM decks 
        WHERE last_studied IS NOT NULL 
        ORDER BY last_studied DESC 
        LIMIT ?
      `);
      const rows = stmt.all(limit);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding recently studied decks:', error);
      throw error;
    }
  }

  public updateLastStudied(deckId: string): void {
    try {
      const stmt = this.db.prepare(`
        UPDATE decks 
        SET last_studied = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      stmt.run(deckId);
    } catch (error) {
      console.error('Error updating last studied:', error);
      throw error;
    }
  }

  public updateSettings(deckId: string, settings: DeckSettings): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE decks 
        SET settings = ? 
        WHERE id = ?
      `);
      
      const result = stmt.run(JSON.stringify(settings), deckId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating deck settings:', error);
      throw error;
    }
  }

  public getDecksWithCardCounts(): Array<Deck & { cardCount: number }> {
    try {
      const stmt = this.db.prepare(`
        SELECT d.*, COUNT(c.id) as card_count
        FROM decks d
        LEFT JOIN cards c ON d.id = c.deck_id
        GROUP BY d.id
        ORDER BY d.name
      `);
      
      const rows = stmt.all();
      
      return rows.map(row => ({
        ...this.mapRowToEntity(row),
        cardCount: row.card_count || 0
      }));
    } catch (error) {
      console.error('Error getting decks with card counts:', error);
      throw error;
    }
  }
}