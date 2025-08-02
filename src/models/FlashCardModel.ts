import { FlashCard, CardType, DifficultyLevel } from '../types';
import { ModelValidator, ValidationResult, ValidationError } from './validation';
import { v4 as uuidv4 } from 'uuid';

export class FlashCardModel implements FlashCard {
  public readonly id: string;
  public front: string;
  public back: string;
  public type: CardType;
  public difficulty: DifficultyLevel;
  public keywords: string[];
  public sourceContext: string;
  public readonly createdAt: Date;

  constructor(data: Partial<FlashCard> & { front: string; back: string }) {
    this.id = data.id || uuidv4();
    this.front = data.front;
    this.back = data.back;
    this.type = data.type || CardType.QUESTION_ANSWER;
    this.difficulty = data.difficulty || DifficultyLevel.MEDIUM;
    this.keywords = data.keywords || [];
    this.sourceContext = data.sourceContext || '';
    this.createdAt = data.createdAt || new Date();

    // Validate on construction
    const validation = this.validate();
    if (!validation.isValid) {
      throw new ValidationError(
        'construction',
        `Invalid FlashCard data: ${validation.errors.map(e => e.message).join(', ')}`,
        'INVALID_DATA',
        data
      );
    }
  }

  /**
   * Validates the flashcard data
   */
  public validate(): ValidationResult {
    const validator = new ModelValidator();

    validator
      .validateRequired('front', this.front, 'Front text')
      .validateString('front', this.front, 'Front text', { 
        minLength: 1, 
        maxLength: 1000 
      })
      .validateRequired('back', this.back, 'Back text')
      .validateString('back', this.back, 'Back text', { 
        minLength: 1, 
        maxLength: 2000 
      })
      .validateEnum('type', this.type, 'Card type', CardType)
      .validateEnum('difficulty', this.difficulty, 'Difficulty level', DifficultyLevel)
      .validateArray('keywords', this.keywords, 'Keywords', {
        maxLength: 20,
        itemValidator: (item, index) => {
          const errors: ValidationError[] = [];
          if (typeof item !== 'string') {
            errors.push(new ValidationError(
              `keywords[${index}]`,
              `Keyword at index ${index} must be a string`,
              'INVALID_TYPE',
              item
            ));
          } else if (item.length === 0) {
            errors.push(new ValidationError(
              `keywords[${index}]`,
              `Keyword at index ${index} cannot be empty`,
              'EMPTY_VALUE',
              item
            ));
          } else if (item.length > 50) {
            errors.push(new ValidationError(
              `keywords[${index}]`,
              `Keyword at index ${index} must be no more than 50 characters`,
              'MAX_LENGTH',
              item
            ));
          }
          return errors;
        }
      })
      .validateString('sourceContext', this.sourceContext, 'Source context', {
        maxLength: 500
      })
      .validateDate('createdAt', this.createdAt, 'Created date');

    // Custom validations
    if (this.front.trim() === this.back.trim()) {
      validator.addCustomError(
        'content',
        'Front and back text cannot be identical',
        'DUPLICATE_CONTENT'
      );
    }

    // Check for duplicate keywords
    const uniqueKeywords = new Set(this.keywords);
    if (uniqueKeywords.size !== this.keywords.length) {
      validator.addWarning('Duplicate keywords detected and will be removed');
    }

    return validator.getResult();
  }

  /**
   * Updates the flashcard with new data
   */
  public update(updates: Partial<Pick<FlashCard, 'front' | 'back' | 'type' | 'difficulty' | 'keywords' | 'sourceContext'>>): FlashCardModel {
    const updatedData = {
      ...this.toObject(),
      ...updates
    };

    return new FlashCardModel(updatedData);
  }

  /**
   * Adds keywords to the flashcard
   */
  public addKeywords(newKeywords: string[]): FlashCardModel {
    const uniqueKeywords = Array.from(new Set([...this.keywords, ...newKeywords]));
    return this.update({ keywords: uniqueKeywords });
  }

  /**
   * Removes keywords from the flashcard
   */
  public removeKeywords(keywordsToRemove: string[]): FlashCardModel {
    const filteredKeywords = this.keywords.filter(keyword => 
      !keywordsToRemove.includes(keyword)
    );
    return this.update({ keywords: filteredKeywords });
  }

  /**
   * Checks if the card contains specific keywords
   */
  public hasKeywords(keywords: string[]): boolean {
    return keywords.some(keyword => 
      this.keywords.includes(keyword) ||
      this.front.toLowerCase().includes(keyword.toLowerCase()) ||
      this.back.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Searches for text within the card content
   */
  public searchContent(searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();
    return (
      this.front.toLowerCase().includes(term) ||
      this.back.toLowerCase().includes(term) ||
      this.sourceContext.toLowerCase().includes(term) ||
      this.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  }

  /**
   * Calculates content complexity score (0-1)
   */
  public getComplexityScore(): number {
    const frontLength = this.front.length;
    const backLength = this.back.length;
    const keywordCount = this.keywords.length;
    
    // Simple complexity calculation based on content length and keyword density
    const lengthScore = Math.min((frontLength + backLength) / 500, 1);
    const keywordScore = Math.min(keywordCount / 10, 1);
    
    return (lengthScore * 0.7 + keywordScore * 0.3);
  }

  /**
   * Suggests difficulty level based on content
   */
  public suggestDifficulty(): DifficultyLevel {
    const complexity = this.getComplexityScore();
    
    if (complexity < 0.3) return DifficultyLevel.EASY;
    if (complexity < 0.6) return DifficultyLevel.MEDIUM;
    if (complexity < 0.8) return DifficultyLevel.HARD;
    return DifficultyLevel.EXPERT;
  }

  /**
   * Converts the model to a plain object
   */
  public toObject(): FlashCard {
    return {
      id: this.id,
      front: this.front,
      back: this.back,
      type: this.type,
      difficulty: this.difficulty,
      keywords: [...this.keywords],
      sourceContext: this.sourceContext,
      createdAt: this.createdAt
    };
  }

  /**
   * Creates a deep copy of the flashcard
   */
  public clone(): FlashCardModel {
    return new FlashCardModel(this.toObject());
  }

  /**
   * Converts to JSON string
   */
  public toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  /**
   * Creates FlashCardModel from JSON string
   */
  public static fromJSON(json: string): FlashCardModel {
    const data = JSON.parse(json);
    return new FlashCardModel({
      ...data,
      createdAt: new Date(data.createdAt)
    });
  }

  /**
   * Creates multiple FlashCardModel instances from array data
   */
  public static fromArray(cards: Partial<FlashCard>[]): FlashCardModel[] {
    return cards.map(card => new FlashCardModel(card as any));
  }
}