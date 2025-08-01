// Study session and spaced repetition types

export interface StudySession {
  id: string;
  deckId: string;
  startTime: Date;
  endTime?: Date;
  cardsReviewed: StudyResponse[];
  sessionType: SessionType;
  pointsEarned: number;
}

export interface StudyResponse {
  cardId: string;
  correct: boolean;
  responseTime: number;
  difficulty: UserDifficulty;
  timestamp: Date;
}

export enum SessionType {
  REVIEW = 'review',
  TIMED = 'timed',
  CHALLENGE = 'challenge',
  QUICK_PRACTICE = 'quick_practice'
}

export enum UserDifficulty {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4
}

export interface UserStatistics {
  totalCardsStudied: number;
  correctAnswers: number;
  currentStreak: number;
  totalStudyTime: number;
  level: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
  category: AchievementCategory;
}

export enum AchievementCategory {
  STREAK = 'streak',
  VOLUME = 'volume',
  ACCURACY = 'accuracy',
  SPEED = 'speed',
  MILESTONE = 'milestone'
}