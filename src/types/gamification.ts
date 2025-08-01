// Gamification and engagement types

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date;
  streakActive: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  difficulty: DifficultyLevel;
  timeLimit: number;
  pointsReward: number;
  requirements: ChallengeRequirement[];
  isActive: boolean;
  expiresAt: Date;
}

export enum ChallengeType {
  SPEED_ROUND = 'speed_round',
  ACCURACY_TEST = 'accuracy_test',
  ENDURANCE = 'endurance',
  PERFECT_STREAK = 'perfect_streak'
}

export interface ChallengeRequirement {
  type: 'cards_correct' | 'time_limit' | 'accuracy_rate' | 'consecutive_correct';
  value: number;
}

export interface TranscriptionProgress {
  percentage: number;
  currentSegment: number;
  totalSegments: number;
  estimatedTimeRemaining: number;
}