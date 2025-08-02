import { Deck, DeckSettings, FlashCard, CardType, DifficultyLevel } from '../types';
import { ModelValidator, ValidationResult, ValidationError } from './validation';
import { FlashCardModel } from './FlashCardModel';
import { v4 as uuidv4 } from 'uuid';

export interface DeckStats {
  totalCards: number;
  cardsByType: Record<CardType, number>;
  cardsByDifficulty: Record<DifficultyLevel, number>;
  averageComplexity: number;
  uniqueKeywords: string[];
  lastModified: Date;
}

export class DeckModel implements Deck {
  public readonly id: string;
  public name: string;
  public description: string;
  public cards: string[]; // Card IDs - actual cards managed separately
  public readonly createdAt: Date;
  public lastStudied: Date;
  public settings: DeckSettings;

  constructor(data: Partial<Deck> & { name: string }) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.description = data.description || '';
    this.cards = data.cards || [];
    this.createdAt = data.createdAt || new Date();
    this.lastStudied = data.lastStudied || new Date();
    this.settings = data.settings || this.getDefaultSettings();

    // Validate on construction
    const validation = this.validate();
    if (!validation.isValid) {
      throw new ValidationError(
        'construction',
        `Invalid Deck data: ${validation.errors.map(e => e.message).join(', ')}`,
        'INVALID_DATA',
        data
      );
    }
  }

  /**
   * Gets default deck settings
   */
  private getDefaultSettings(): DeckSettings {
    return {
      maxNewCardsPerDay: 20,
      maxReviewCardsPerDay: 100,
      enableSpacedRepetition: true,
      difficultyMultiplier: 1.0,
      autoAdvance: false
    };
  }

  /**
   * Validates the deck data
   */
  public validate(): ValidationResult {
    const validator = new ModelValidator();

    validator
      .validateRequired('name', this.name, 'Deck name')
      .validateString('name', this.name, 'Deck name', { 
        minLength: 1, 
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-_\.]+$/ // Allow alphanumeric, spaces, hyphens, underscores, dots
      })
      .validateString('description', this.description, 'Description', {
        maxLength: 500
      })
      .validateArray('cards', this.cards, 'Cards', {
        maxLength: 10000, // Reasonable limit for performance
        itemValidator: (item, index) => {
          const errors: ValidationError[] = [];
          if (typeof item !== 'string') {
            errors.push(new ValidationError(
              `cards[${index}]`,
              `Card ID at index ${index} must be a string`,
              'INVALID_TYPE',
              item
            ));
          } else if (item.length === 0) {
            errors.push(new ValidationError(
              `cards[${index}]`,
              `Card ID at index ${index} cannot be empty`,
              'EMPTY_VALUE',
              item
            ));
          }
          return errors;
        }
      })
      .validateDate('createdAt', this.createdAt, 'Created date')
      .validateDate('lastStudied', this.lastStudied, 'Last studied date');

    // Validate settings
    this.validateSettings(validator);

    // Custom validations
    const uniqueCards = new Set(this.cards);
    if (uniqueCards.size !== this.cards.length) {
      validator.addCustomError(
        'cards',
        'Duplicate card IDs detected',
        'DUPLICATE_CARDS'
      );
    }

    return validator.getResult();
  }

  /**
   * Validates deck settings
   */
  private validateSettings(validator: ModelValidator): void {
    if (!this.settings) {
      validator.addCustomError('settings', 'Settings are required', 'REQUIRED');
      return;
    }

    validator
      .validateNumber('settings.maxNewCardsPerDay', this.settings.maxNewCardsPerDay, 'Max new cards per day', {
        min: 1,
        max: 500,
        integer: true
      })
      .validateNumber('settings.maxReviewCardsPerDay', this.settings.maxReviewCardsPerDay, 'Max review cards per day', {
        min: 1,
        max: 1000,
        integer: true
      })
      .validateNumber('settings.difficultyMultiplier', this.settings.difficultyMultiplier, 'Difficulty multiplier', {
        min: 0.1,
        max: 5.0
      });

    if (typeof this.settings.enableSpacedRepetition !== 'boolean') {
      validator.addCustomError(
        'settings.enableSpacedRepetition',
        'Enable spaced repetition must be a boolean',
        'INVALID_TYPE'
      );
    }

    if (typeof this.settings.autoAdvance !== 'boolean') {
      validator.addCustomError(
        'settings.autoAdvance',
        'Auto advance must be a boolean',
        'INVALID_TYPE'
      );
    }
  }

  /**
   * Updates the deck with new data
   */
  public update(updates: Partial<Pick<Deck, 'name' | 'description' | 'settings'>>): DeckModel {
    const updatedData = {
      ...this.toObject(),
      ...updates
    };

    return new DeckModel(updatedData);
  }

  /**
   * Updates deck settings
   */
  public updateSettings(newSettings: Partial<DeckSettings>): DeckModel {
    const updatedSettings = {
      ...this.settings,
      ...newSettings
    };

    return this.update({ settings: updatedSettings });
  }

  /**
   * Adds card IDs to the deck
   */
  public addCards(cardIds: string[]): DeckModel {
    const uniqueCards = Array.from(new Set([...this.cards, ...cardIds]));
    const updatedData = {
      ...this.toObject(),
      cards: uniqueCards
    };

    return new DeckModel(updatedData);
  }

  /**
   * Removes card IDs from the deck
   */
  public removeCards(cardIds: string[]): DeckModel {
    const filteredCards = this.cards.filter(cardId => !cardIds.includes(cardId));
    const updatedData = {
      ...this.toObject(),
      cards: filteredCards
    };

    return new DeckModel(updatedData);
  }

  /**
   * Moves cards to another deck (returns updated current deck)
   */
  public moveCardsTo(cardIds: string[]): DeckModel {
    return this.removeCards(cardIds);
  }

  /**
   * Checks if deck contains specific card IDs
   */
  public hasCards(cardIds: string[]): boolean {
    return cardIds.every(cardId => this.cards.includes(cardId));
  }

  /**
   * Gets card count
   */
  public getCardCount(): number {
    return this.cards.length;
  }

  /**
   * Checks if deck is empty
   */
  public isEmpty(): boolean {
    return this.cards.length === 0;
  }

  /**
   * Updates last studied timestamp
   */
  public markAsStudied(): DeckModel {
    const updatedData = {
      ...this.toObject(),
      lastStudied: new Date()
    };

    return new DeckModel(updatedData);
  }

  /**
   * Calculates deck statistics (requires actual card data)
   */
  public calculateStats(cardModels: FlashCardModel[]): DeckStats {
    const deckCards = cardModels.filter(card => this.cards.includes(card.id));
    
    const cardsByType: Record<CardType, number> = {
      [CardType.DEFINITION]: 0,
      [CardType.QUESTION_ANSWER]: 0,
      [CardType.FILL_BLANK]: 0,
      [CardType.TRUE_FALSE]: 0,
      [CardType.MULTIPLE_CHOICE]: 0
    };

    const cardsByDifficulty: Record<DifficultyLevel, number> = {
      [DifficultyLevel.EASY]: 0,
      [DifficultyLevel.MEDIUM]: 0,
      [DifficultyLevel.HARD]: 0,
      [DifficultyLevel.EXPERT]: 0
    };

    let totalComplexity = 0;
    const allKeywords = new Set<string>();

    deckCards.forEach(card => {
      cardsByType[card.type]++;
      cardsByDifficulty[card.difficulty]++;
      totalComplexity += card.getComplexityScore();
      card.keywords.forEach(keyword => allKeywords.add(keyword));
    });

    return {
      totalCards: deckCards.length,
      cardsByType,
      cardsByDifficulty,
      averageComplexity: deckCards.length > 0 ? totalComplexity / deckCards.length : 0,
      uniqueKeywords: Array.from(allKeywords),
      lastModified: this.lastStudied
    };
  }

  /**
   * Suggests optimal study settings based on deck size and complexity
   */
  public suggestOptimalSettings(cardModels: FlashCardModel[]): Partial<DeckSettings> {
    const stats = this.calculateStats(cardModels);
    const suggestions: Partial<DeckSettings> = {};

    // Adjust new cards per day based on deck size
    if (stats.totalCards < 50) {
      suggestions.maxNewCardsPerDay = Math.min(10, stats.totalCards);
    } else if (stats.totalCards < 200) {
      suggestions.maxNewCardsPerDay = 15;
    } else {
      suggestions.maxNewCardsPerDay = 20;
    }

    // Adjust review cards based on complexity
    if (stats.averageComplexity > 0.7) {
      suggestions.maxReviewCardsPerDay = 50; // Fewer reviews for complex content
      suggestions.difficultyMultiplier = 1.2; // Increase intervals for complex cards
    } else if (stats.averageComplexity < 0.3) {
      suggestions.maxReviewCardsPerDay = 150; // More reviews for simple content
      suggestions.difficultyMultiplier = 0.8; // Decrease intervals for simple cards
    }

    return suggestions;
  }

  /**
   * Validates deck name uniqueness (requires external deck list)
   */
  public static validateUniqueName(name: string, existingDecks: DeckModel[]): ValidationResult {
    const validator = new ModelValidator();
    
    const nameExists = existingDecks.some(deck => 
      deck.name.toLowerCase() === name.toLowerCase()
    );

    if (nameExists) {
      validator.addCustomError(
        'name',
        'A deck with this name already exists',
        'DUPLICATE_NAME',
        name
      );
    }

    return validator.getResult();
  }

  /**
   * Converts the model to a plain object
   */
  public toObject(): Deck {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      cards: [...this.cards],
      createdAt: this.createdAt,
      lastStudied: this.lastStudied,
      settings: { ...this.settings }
    };
  }

  /**
   * Creates a deep copy of the deck
   */
  public clone(): DeckModel {
    return new DeckModel(this.toObject());
  }

  /**
   * Converts to JSON string
   */
  public toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  /**
   * Creates DeckModel from JSON string
   */
  public static fromJSON(json: string): DeckModel {
    const data = JSON.parse(json);
    return new DeckModel({
      ...data,
      createdAt: new Date(data.createdAt),
      lastStudied: new Date(data.lastStudied)
    });
  }

  /**
   * Creates multiple DeckModel instances from array data
   */
  public static fromArray(decks: Partial<Deck>[]): DeckModel[] {
    return decks.map(deck => new DeckModel(deck as any));
  }
}