// Study system interfaces

import { 
  FlashCard, 
  StudyResponse, 
  StudySession, 
  UserStatistics, 
  StreakInfo, 
  Challenge, 
  Achievement,
  Deck
} from '../types';

export interface SpacedRepetitionEngine {
  calculateNextReview(card: FlashCard, response: StudyResponse): Date;
  selectCardsForSession(deck: Deck, sessionLength: number): FlashCard[];
  updateCardStatistics(card: FlashCard, response: StudyResponse): void;
}

export interface GamificationSystem {
  updateStreak(userId: string, sessionCompleted: boolean): StreakInfo;
  generateChallenge(userLevel: number): Challenge;
  calculatePoints(session: StudySession): number;
  checkAchievements(userStats: UserStatistics): Achievement[];
}