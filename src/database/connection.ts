import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  private constructor() {
    // Store database in user data directory
    const userDataPath = app?.getPath('userData') || './data';
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.dbPath = path.join(userDataPath, 'recall.db');
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<Database.Database> {
    if (this.db) {
      return this.db;
    }

    try {
      this.db = new Database(this.dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Set WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Initialize schema
      await this.initializeSchema();
      
      console.log(`Database connected: ${this.dbPath}`);
      return this.db;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  public getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  private async initializeSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // Inline schema for better test compatibility
      const schema = `
        -- Recall Database Schema
        CREATE TABLE IF NOT EXISTS decks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_studied DATETIME,
          settings JSON DEFAULT '{"maxNewCardsPerDay": 20, "maxReviewCardsPerDay": 100, "enableSpacedRepetition": true, "difficultyMultiplier": 1.0, "autoAdvance": false}'
        );

        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY,
          deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
          front TEXT NOT NULL,
          back TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('definition', 'question_answer', 'fill_blank', 'true_false', 'multiple_choice')),
          difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 4),
          keywords JSON DEFAULT '[]',
          source_context TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS card_statistics (
          card_id TEXT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
          ease_factor REAL DEFAULT 2.5,
          interval INTEGER DEFAULT 1,
          repetitions INTEGER DEFAULT 0,
          next_review DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_reviewed DATETIME,
          average_response_time REAL DEFAULT 0,
          success_rate REAL DEFAULT 0,
          total_reviews INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS study_sessions (
          id TEXT PRIMARY KEY,
          deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
          start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          end_time DATETIME,
          session_type TEXT NOT NULL CHECK (session_type IN ('review', 'timed', 'challenge', 'quick_practice')),
          points_earned INTEGER DEFAULT 0,
          cards_reviewed INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS study_responses (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
          card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
          correct BOOLEAN NOT NULL,
          response_time INTEGER,
          difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 4),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_statistics (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          total_cards_studied INTEGER DEFAULT 0,
          correct_answers INTEGER DEFAULT 0,
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          total_study_time INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          total_points INTEGER DEFAULT 0,
          last_study_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('streak', 'volume', 'accuracy', 'speed', 'milestone')),
          unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          points_awarded INTEGER DEFAULT 0
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
        CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
        CREATE INDEX IF NOT EXISTS idx_card_statistics_next_review ON card_statistics(next_review);
        CREATE INDEX IF NOT EXISTS idx_study_sessions_deck_id ON study_sessions(deck_id);
        CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
        CREATE INDEX IF NOT EXISTS idx_study_responses_session_id ON study_responses(session_id);
        CREATE INDEX IF NOT EXISTS idx_study_responses_card_id ON study_responses(card_id);
        CREATE INDEX IF NOT EXISTS idx_study_responses_timestamp ON study_responses(timestamp);

        -- Initialize user statistics record
        INSERT OR IGNORE INTO user_statistics (id) VALUES (1);
      `;
      
      // Execute schema
      this.db.exec(schema);
      
      console.log('Database schema initialized');
    } catch (error) {
      console.error('Failed to initialize schema:', error);
      throw new Error(`Schema initialization failed: ${error}`);
    }
  }

  public async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // Create migrations table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Get list of executed migrations
      const executedMigrations = this.db
        .prepare('SELECT name FROM migrations')
        .all()
        .map((row: any) => row.name);

      // Run pending migrations
      const migrationsDir = path.join(__dirname, 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => file.endsWith('.sql'))
          .sort();

        for (const file of migrationFiles) {
          const migrationName = path.basename(file, '.sql');
          
          if (!executedMigrations.includes(migrationName)) {
            const migrationPath = path.join(migrationsDir, file);
            const migration = fs.readFileSync(migrationPath, 'utf8');
            
            // Execute migration in transaction
            const transaction = this.db.transaction(() => {
              this.db!.exec(migration);
              this.db!.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
            });
            
            transaction();
            console.log(`Migration executed: ${migrationName}`);
          }
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error}`);
    }
  }

  public backup(backupPath: string): void {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      this.db.backup(backupPath);
      console.log(`Database backed up to: ${backupPath}`);
    } catch (error) {
      console.error('Backup failed:', error);
      throw new Error(`Backup failed: ${error}`);
    }
  }

  public getStats(): any {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const stats = {
      path: this.dbPath,
      size: fs.statSync(this.dbPath).size,
      tables: this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all(),
      indexes: this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all()
    };

    return stats;
  }
}