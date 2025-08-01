// Deck management and organization types

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: string[]; // Card IDs
  createdAt: Date;
  lastStudied: Date;
  settings: DeckSettings;
}

export interface DeckSettings {
  maxNewCardsPerDay: number;
  maxReviewCardsPerDay: number;
  enableSpacedRepetition: boolean;
  difficultyMultiplier: number;
  autoAdvance: boolean;
}

export interface DeckStats {
  totalCards: number;
  newCards: number;
  reviewCards: number;
  masteredCards: number;
  averageSuccessRate: number;
  totalStudyTime: number;
  lastStudied: Date;
}