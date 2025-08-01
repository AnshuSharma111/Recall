// Data management interfaces

import { 
  Deck, 
  DeckStats, 
  FlashCard, 
  InputError, 
  ProcessingError, 
  StorageError, 
  RecoveryAction 
} from '../types';

export interface DeckManager {
  createDeck(name: string, description?: string): Deck;
  addCardToDeck(deckId: string, card: FlashCard): void;
  moveCard(cardId: string, fromDeck: string, toDeck: string): void;
  getDeckStatistics(deckId: string): DeckStats;
}

export interface ErrorHandler {
  handleInputError(error: InputError): RecoveryAction;
  handleProcessingError(error: ProcessingError): RecoveryAction;
  handleStorageError(error: StorageError): RecoveryAction;
}