import { User, UserSession, AuthenticationResult, UserCreationData, UserUpdateData, UserPreferences } from './types';
import { DatabaseConnection } from '../database/connection';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

/**
 * UserManager handles local user authentication and identity management
 * Designed for offline-first operation with future multi-user support
 */
export class UserManager {
  private db: Database.Database;
  private currentUser: User | null = null;
  private currentSession: UserSession | null = null;

  constructor() {
    this.db = DatabaseConnection.getInstance().getDatabase();
    this.initializeUserTables();
  }

  /**
   * Initialize user-related database tables
   */
  private initializeUserTables(): void {
    try {
      // Users table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login_at DATETIME,
          preferences JSON DEFAULT '{}',
          is_active BOOLEAN DEFAULT 1
        );
      `);

      // User sessions table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          session_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        );
      `);

      // Create indexes for performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
      `);

      console.log('User authentication tables initialized');
    } catch (error) {
      console.error('Failed to initialize user tables:', error);
      throw new Error(`User table initialization failed: ${error}`);
    }
  }

  /**
   * Create a new user account
   */
  public async createUser(userData: UserCreationData): Promise<AuthenticationResult> {
    try {
      // Check if username already exists
      const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
      if (existingUser) {
        return {
          success: false,
          error: 'Username already exists'
        };
      }

      const userId = uuidv4();
      const now = new Date();
      
      // Create default preferences
      const defaultPreferences: UserPreferences = {
        theme: 'system',
        language: 'en',
        studySettings: {
          defaultSessionLength: 20,
          autoAdvanceCards: false,
          showTimer: true,
          enableSounds: true,
          defaultDifficulty: 'medium',
          spacedRepetitionSettings: {
            maxNewCardsPerDay: 20,
            maxReviewCardsPerDay: 100,
            difficultyMultiplier: 1.0
          }
        },
        notifications: {
          studyReminders: true,
          streakReminders: true,
          achievementNotifications: true,
          reminderTime: '19:00'
        },
        privacy: {
          shareStatistics: false,
          allowAnalytics: false,
          dataRetentionDays: 365
        }
      };

      // Merge with provided preferences
      const preferences = {
        ...defaultPreferences,
        ...userData.preferences
      };

      // Insert user into database
      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, display_name, email, created_at, last_login_at, preferences, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        userData.username,
        userData.displayName,
        userData.email || null,
        now.toISOString(),
        now.toISOString(),
        JSON.stringify(preferences),
        1
      );

      // Create user object
      const user: User = {
        id: userId,
        username: userData.username,
        displayName: userData.displayName,
        email: userData.email,
        createdAt: now,
        lastLoginAt: now,
        preferences,
        isActive: true
      };

      // Create initial session
      const session = await this.createSession(user);

      return {
        success: true,
        user,
        session
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: `Failed to create user: ${error}`
      };
    }
  }

  /**
   * Authenticate user by username (local authentication)
   */
  public async authenticateUser(username: string): Promise<AuthenticationResult> {
    try {
      const stmt = this.db.prepare(`
        SELECT id, username, display_name, email, created_at, last_login_at, preferences, is_active
        FROM users 
        WHERE username = ? AND is_active = 1
      `);

      const row = stmt.get(username) as any;
      if (!row) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Update last login time
      const now = new Date();
      this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
        .run(now.toISOString(), row.id);

      // Create user object
      const user: User = {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        email: row.email,
        createdAt: new Date(row.created_at),
        lastLoginAt: now,
        preferences: JSON.parse(row.preferences),
        isActive: Boolean(row.is_active)
      };

      // Create session
      const session = await this.createSession(user);

      return {
        success: true,
        user,
        session
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      return {
        success: false,
        error: `Authentication failed: ${error}`
      };
    }
  }

  /**
   * Create a new user session
   */
  private async createSession(user: User): Promise<UserSession> {
    const sessionId = uuidv4();
    const now = new Date();

    // Deactivate any existing sessions for this user
    this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?')
      .run(user.id);

    // Create new session
    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (session_id, user_id, start_time, last_activity, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(sessionId, user.id, now.toISOString(), now.toISOString(), 1);

    const session: UserSession = {
      userId: user.id,
      sessionId,
      startTime: now,
      lastActivity: now,
      isActive: true
    };

    this.currentUser = user;
    this.currentSession = session;

    return session;
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current user session
   */
  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Update user session activity
   */
  public updateSessionActivity(): void {
    if (!this.currentSession) return;

    try {
      const now = new Date();
      this.db.prepare('UPDATE user_sessions SET last_activity = ? WHERE session_id = ?')
        .run(now.toISOString(), this.currentSession.sessionId);
      
      this.currentSession.lastActivity = now;
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Update user information
   */
  public async updateUser(userId: string, updateData: UserUpdateData): Promise<boolean> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (updateData.displayName !== undefined) {
        updates.push('display_name = ?');
        values.push(updateData.displayName);
      }

      if (updateData.email !== undefined) {
        updates.push('email = ?');
        values.push(updateData.email);
      }

      if (updateData.preferences !== undefined) {
        // Get current preferences and merge
        const currentUser = this.getUserById(userId);
        if (currentUser) {
          const mergedPreferences = {
            ...currentUser.preferences,
            ...updateData.preferences
          };
          updates.push('preferences = ?');
          values.push(JSON.stringify(mergedPreferences));
        }
      }

      if (updates.length === 0) {
        return true; // Nothing to update
      }

      values.push(userId);
      const stmt = this.db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `);

      const result = stmt.run(...values);
      
      // Update current user if it's the same user
      if (this.currentUser && this.currentUser.id === userId) {
        const updatedUser = this.getUserById(userId);
        if (updatedUser) {
          this.currentUser = updatedUser;
        }
      }

      return result.changes > 0;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  /**
   * Get user by ID
   */
  public getUserById(userId: string): User | null {
    try {
      const stmt = this.db.prepare(`
        SELECT id, username, display_name, email, created_at, last_login_at, preferences, is_active
        FROM users 
        WHERE id = ? AND is_active = 1
      `);

      const row = stmt.get(userId) as any;
      if (!row) return null;

      return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        email: row.email,
        createdAt: new Date(row.created_at),
        lastLoginAt: new Date(row.last_login_at),
        preferences: JSON.parse(row.preferences),
        isActive: Boolean(row.is_active)
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Get all users (for future multi-user support)
   */
  public getAllUsers(): User[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, username, display_name, email, created_at, last_login_at, preferences, is_active
        FROM users 
        WHERE is_active = 1
        ORDER BY last_login_at DESC
      `);

      const rows = stmt.all() as any[];
      
      return rows.map(row => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        email: row.email,
        createdAt: new Date(row.created_at),
        lastLoginAt: new Date(row.last_login_at),
        preferences: JSON.parse(row.preferences),
        isActive: Boolean(row.is_active)
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  /**
   * Deactivate user account
   */
  public async deactivateUser(userId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare('UPDATE users SET is_active = 0 WHERE id = ?');
      const result = stmt.run(userId);

      // End all sessions for this user
      this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?')
        .run(userId);

      // Clear current user if it's the same user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = null;
        this.currentSession = null;
      }

      return result.changes > 0;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  /**
   * End current session and logout
   */
  public async logout(): Promise<boolean> {
    try {
      if (this.currentSession) {
        this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE session_id = ?')
          .run(this.currentSession.sessionId);
      }

      this.currentUser = null;
      this.currentSession = null;
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  /**
   * Check if a session is valid and active
   */
  public isSessionValid(sessionId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        SELECT 1 FROM user_sessions 
        WHERE session_id = ? AND is_active = 1
      `);

      return !!stmt.get(sessionId);
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions (older than 30 days)
   */
  public cleanupExpiredSessions(): number {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stmt = this.db.prepare(`
        UPDATE user_sessions 
        SET is_active = 0 
        WHERE last_activity < ? AND is_active = 1
      `);

      const result = stmt.run(thirtyDaysAgo.toISOString());
      
      if (result.changes > 0) {
        console.log(`Cleaned up ${result.changes} expired sessions`);
      }

      return result.changes;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }
}