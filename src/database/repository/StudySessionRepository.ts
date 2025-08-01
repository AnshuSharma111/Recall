import { BaseRepository } from './BaseRepository';
import { StudySession, SessionType, StudyResponse } from '../../types';

export class StudySessionRepository extends BaseRepository<StudySession> {
  constructor() {
    super('study_sessions');
  }

  protected mapRowToEntity(row: any): StudySession {
    return {
      id: row.id,
      deckId: row.deck_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      cardsReviewed: [], // Will be loaded separately
      sessionType: row.session_type as SessionType,
      pointsEarned: row.points_earned || 0
    };
  }

  protected mapEntityToRow(entity: StudySession): any {
    return {
      id: entity.id,
      deck_id: entity.deckId,
      start_time: entity.startTime.toISOString(),
      end_time: entity.endTime?.toISOString() || null,
      session_type: entity.sessionType,
      points_earned: entity.pointsEarned,
      cards_reviewed: entity.cardsReviewed.length
    };
  }

  public findByDeckId(deckId: string, limit?: number): StudySession[] {
    try {
      let query = 'SELECT * FROM study_sessions WHERE deck_id = ? ORDER BY start_time DESC';
      const params: any[] = [deckId];
      
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding sessions by deck ID:', error);
      throw error;
    }
  }

  public findActiveSession(deckId?: string): StudySession | null {
    try {
      let query = 'SELECT * FROM study_sessions WHERE end_time IS NULL';
      const params: any[] = [];
      
      if (deckId) {
        query += ' AND deck_id = ?';
        params.push(deckId);
      }
      
      query += ' ORDER BY start_time DESC LIMIT 1';
      
      const stmt = this.db.prepare(query);
      const row = stmt.get(...params);
      
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding active session:', error);
      throw error;
    }
  }

  public endSession(sessionId: string, pointsEarned: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE study_sessions 
        SET end_time = CURRENT_TIMESTAMP, points_earned = ? 
        WHERE id = ?
      `);
      
      const result = stmt.run(pointsEarned, sessionId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  public getSessionsByDateRange(startDate: Date, endDate: Date, deckId?: string): StudySession[] {
    try {
      let query = `
        SELECT * FROM study_sessions 
        WHERE start_time >= ? AND start_time <= ?
      `;
      const params: any[] = [startDate.toISOString(), endDate.toISOString()];
      
      if (deckId) {
        query += ' AND deck_id = ?';
        params.push(deckId);
      }
      
      query += ' ORDER BY start_time DESC';
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error getting sessions by date range:', error);
      throw error;
    }
  }

  public getSessionStats(deckId?: string): {
    totalSessions: number;
    totalStudyTime: number;
    averageSessionLength: number;
    totalPointsEarned: number;
  } {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(
            CASE 
              WHEN end_time IS NOT NULL 
              THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 * 60 
              ELSE 0 
            END
          ) as total_study_time,
          SUM(points_earned) as total_points_earned
        FROM study_sessions 
        WHERE end_time IS NOT NULL
      `;
      const params: any[] = [];
      
      if (deckId) {
        query += ' AND deck_id = ?';
        params.push(deckId);
      }
      
      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as any;
      
      const totalSessions = result.total_sessions || 0;
      const totalStudyTime = result.total_study_time || 0;
      const totalPointsEarned = result.total_points_earned || 0;
      
      return {
        totalSessions,
        totalStudyTime: Math.round(totalStudyTime),
        averageSessionLength: totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0,
        totalPointsEarned
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }

  public getRecentSessions(limit: number = 10): StudySession[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM study_sessions 
        ORDER BY start_time DESC 
        LIMIT ?
      `);
      const rows = stmt.all(limit);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      throw error;
    }
  }

  public updateCardsReviewed(sessionId: string, cardsReviewed: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE study_sessions 
        SET cards_reviewed = ? 
        WHERE id = ?
      `);
      
      const result = stmt.run(cardsReviewed, sessionId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating cards reviewed:', error);
      throw error;
    }
  }
}