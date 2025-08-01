-- Recall Database Schema
-- Local SQLite database for flashcard storage and user progress

-- Core Tables
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
  response_time INTEGER, -- in milliseconds
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 4), -- user-reported difficulty
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_statistics (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton table
  total_cards_studied INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0, -- in seconds
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