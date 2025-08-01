// Flashcard and card generation types

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  type: CardType;
  difficulty: DifficultyLevel;
  keywords: string[];
  sourceContext: string;
  createdAt: Date;
}

export enum CardType {
  DEFINITION = 'definition',
  QUESTION_ANSWER = 'question_answer',
  FILL_BLANK = 'fill_blank',
  TRUE_FALSE = 'true_false',
  MULTIPLE_CHOICE = 'multiple_choice'
}

export enum DifficultyLevel {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
  EXPERT = 4
}

export interface QualityScore {
  overall: number;
  clarity: number;
  relevance: number;
  difficulty: number;
  feedback: string[];
}

export interface CardStatistics {
  cardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReviewed: Date;
  averageResponseTime: number;
  successRate: number;
}