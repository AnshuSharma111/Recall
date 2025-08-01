import { BaseRepository } from './BaseRepository';
import { FlashCard, CardType, DifficultyLevel } from '../../types';

export class CardRepository extends BaseRepository<FlashCard> {
  constructor() {
    super('cards');
  }

  protected mapRowToEntity(row: any): FlashCard {
    return {
      id: row.id,
      front: row.front,
      back: row.back,
      type: row.type as CardType,
      difficulty: row.difficulty as DifficultyLevel,
      keywords: row.keywords ? JSON.parse(row.keywords) : [],
      sourceContext: row.source_context || '',
      createdAt: new Date(row.created_at)
    };
  }

  protected mapEntityToRow(entity: FlashCard): any {
    return {
      id: entity.id,
      deck_id: '', // This will be set when adding to deck
      front: entity.front,
      back: entity.back,
      type: entity.type,
      difficulty: entity.difficulty,
      keywords: JSON.stringify(entity.keywords),
      source_context: entity.sourceContext,
      created_at: entity.createdAt.toISOString()
    };
  }

  public findByDeckId(deckId: string): FlashCard[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at');
      const rows = stmt.all(deckId);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding cards by deck ID:', error);
      throw error;
    }
  }

  public createWithDeck(card: FlashCard, deckId: string): FlashCard {
    try {
      const row = this.mapEntityToRow(card);
      row.deck_id = deckId;

      const stmt = this.db.prepare(`
        INSERT INTO cards (id, deck_id, front, back, type, difficulty, keywords, source_context, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        row.id,
        row.deck_id,
        row.front,
        row.back,
        row.type,
        row.difficulty,
        row.keywords,
        row.source_context,
        row.created_at
      );
      
      if (result.changes === 0) {
        throw new Error('Failed to create card');
      }

      return card;
    } catch (error) {
      console.error('Error creating card with deck:', error);
      throw error;
    }
  }

  public moveCardToDeck(cardId: string, newDeckId: string): boolean {
    try {
      const stmt = this.db.prepare('UPDATE cards SET deck_id = ? WHERE id = ?');
      const result = stmt.run(newDeckId, cardId);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error moving card to deck:', error);
      throw error;
    }
  }

  public findByKeyword(keyword: string): FlashCard[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM cards 
        WHERE keywords LIKE ? 
        ORDER BY created_at DESC
      `);
      const rows = stmt.all(`%"${keyword}"%`);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding cards by keyword:', error);
      throw error;
    }
  }

  public findByType(type: CardType, deckId?: string): FlashCard[] {
    try {
      let query = 'SELECT * FROM cards WHERE type = ?';
      const params: any[] = [type];
      
      if (deckId) {
        query += ' AND deck_id = ?';
        params.push(deckId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding cards by type:', error);
      throw error;
    }
  }

  public findByDifficulty(difficulty: DifficultyLevel, deckId?: string): FlashCard[] {
    try {
      let query = 'SELECT * FROM cards WHERE difficulty = ?';
      const params: any[] = [difficulty];
      
      if (deckId) {
        query += ' AND deck_id = ?';
        params.push(deckId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding cards by difficulty:', error);
      throw error;
    }
  }

  public searchCards(searchTerm: string, deckId?: string): FlashCard[] {
    try {
      let query = `
        SELECT * FROM cards 
        WHERE (front LIKE ? OR back LIKE ? OR source_context LIKE ?)
      `;
      const searchPattern = `%${searchTerm}%`;
      const params: any[] = [searchPattern, searchPattern, searchPattern];
      
      if (deckId) {
        query += ' AND deck_id = ?';
        params.push(deckId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error searching cards:', error);
      throw error;
    }
  }

  public getCardCountByDeck(deckId: string): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM cards WHERE deck_id = ?');
      const result = stmt.get(deckId) as { count: number };
      
      return result.count;
    } catch (error) {
      console.error('Error getting card count by deck:', error);
      throw error;
    }
  }

  public deleteByDeckId(deckId: string): number {
    try {
      const stmt = this.db.prepare('DELETE FROM cards WHERE deck_id = ?');
      const result = stmt.run(deckId);
      
      return result.changes;
    } catch (error) {
      console.error('Error deleting cards by deck ID:', error);
      throw error;
    }
  }
}