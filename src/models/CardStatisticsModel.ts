import { CardStatistics, StudyResponse, UserDifficulty } from '../types';
import { ModelValidator, ValidationResult, ValidationError } from './validation';

export interface ReviewHistory {
  date: Date;
  correct: boolean;
  responseTime: number;
  difficulty: UserDifficulty;
}

export class CardStatisticsModel implements CardStatistics {
  public readonly cardId: string;
  public easeFactor: number;
  public interval: number;
  public repetitions: number;
  public nextReview: Date;
  public lastReviewed: Date;
  public averageResponseTime: number;
  public successRate: number;
  public totalReviews: number;
  public reviewHistory: ReviewHistory[];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(cardId: string, data: Partial<CardStatistics> = {}) {
    this.cardId = cardId;
    this.easeFactor = data.easeFactor !== undefined ? data.easeFactor : 2.5; // SM-2 default
    this.interval = data.interval !== undefined ? data.interval : 1; // Days
    this.repetitions = data.repetitions !== undefined ? data.repetitions : 0;
    this.nextReview = data.nextReview || new Date();
    this.lastReviewed = data.lastReviewed || new Date();
    this.averageResponseTime = data.averageResponseTime !== undefined ? data.averageResponseTime : 0;
    this.successRate = data.successRate !== undefined ? data.successRate : 0;
    this.totalReviews = 0;
    this.reviewHistory = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Validate on construction
    const validation = this.validate();
    if (!validation.isValid) {
      throw new ValidationError(
        'construction',
        `Invalid CardStatistics data: ${validation.errors.map(e => e.message).join(', ')}`,
        'INVALID_DATA',
        { cardId, ...data }
      );
    }
  }

  /**
   * Validates the card statistics data
   */
  public validate(): ValidationResult {
    const validator = new ModelValidator();

    validator
      .validateRequired('cardId', this.cardId, 'Card ID')
      .validateString('cardId', this.cardId, 'Card ID', { minLength: 1 })
      .validateNumber('easeFactor', this.easeFactor, 'Ease factor', {
        min: 1.3, // SM-2 minimum
        max: 5.0  // Reasonable maximum
      })
      .validateNumber('interval', this.interval, 'Interval', {
        min: 1,
        max: 365, // Max 1 year
        integer: true
      })
      .validateNumber('repetitions', this.repetitions, 'Repetitions', {
        min: 0,
        integer: true
      })
      .validateDate('nextReview', this.nextReview, 'Next review date')
      .validateDate('lastReviewed', this.lastReviewed, 'Last reviewed date')
      .validateNumber('averageResponseTime', this.averageResponseTime, 'Average response time', {
        min: 0
      })
      .validateNumber('successRate', this.successRate, 'Success rate', {
        min: 0,
        max: 100
      });

    return validator.getResult();
  }

  /**
   * Records a study response and updates statistics using SM-2 algorithm
   */
  public recordResponse(response: StudyResponse): CardStatisticsModel {
    const now = new Date();
    
    // Add to review history
    const newHistory = [...this.reviewHistory, {
      date: now,
      correct: response.correct,
      responseTime: response.responseTime,
      difficulty: response.difficulty
    }];

    // Keep only last 50 reviews for performance
    if (newHistory.length > 50) {
      newHistory.splice(0, newHistory.length - 50);
    }

    // Calculate new statistics
    const newTotalReviews = this.totalReviews + 1;
    const correctReviews = newHistory.filter(h => h.correct).length;
    const newSuccessRate = (correctReviews / newTotalReviews) * 100;
    
    const totalResponseTime = newHistory.reduce((sum, h) => sum + h.responseTime, 0);
    const newAverageResponseTime = totalResponseTime / newHistory.length;

    // SM-2 Algorithm implementation
    const { easeFactor, interval, repetitions } = this.calculateSM2(
      response.correct,
      response.difficulty,
      this.easeFactor,
      this.interval,
      this.repetitions
    );

    // Calculate next review date
    const nextReview = new Date(now.getTime() + (interval * 24 * 60 * 60 * 1000));

    const updatedData: Partial<CardStatistics> = {
      easeFactor,
      interval,
      repetitions,
      nextReview,
      lastReviewed: now,
      averageResponseTime: newAverageResponseTime,
      successRate: newSuccessRate
    };

    const newModel = new CardStatisticsModel(this.cardId, updatedData);
    newModel.totalReviews = newTotalReviews;
    newModel.reviewHistory = newHistory;
    newModel.updatedAt = now;

    return newModel;
  }

  /**
   * SM-2 Spaced Repetition Algorithm
   * Based on the SuperMemo SM-2 algorithm
   */
  private calculateSM2(
    correct: boolean,
    userDifficulty: UserDifficulty,
    currentEase: number,
    currentInterval: number,
    currentRepetitions: number
  ): { easeFactor: number; interval: number; repetitions: number } {
    let easeFactor = currentEase;
    let interval = currentInterval;
    let repetitions = currentRepetitions;

    if (correct) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;

      // Adjust ease factor based on user-reported difficulty
      const difficultyAdjustment = this.getDifficultyAdjustment(userDifficulty);
      easeFactor = Math.max(1.3, easeFactor + difficultyAdjustment);
    } else {
      // Incorrect response - reset repetitions and set short interval
      repetitions = 0;
      interval = 1;
      
      // Decrease ease factor for failed cards
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    return { easeFactor, interval, repetitions };
  }

  /**
   * Gets difficulty adjustment for ease factor based on user feedback
   */
  private getDifficultyAdjustment(difficulty: UserDifficulty): number {
    switch (difficulty) {
      case UserDifficulty.AGAIN:
        return -0.15;
      case UserDifficulty.HARD:
        return -0.05;
      case UserDifficulty.GOOD:
        return 0;
      case UserDifficulty.EASY:
        return 0.15;
      default:
        return 0;
    }
  }

  /**
   * Checks if the card is due for review
   */
  public isDue(currentDate: Date = new Date()): boolean {
    return currentDate >= this.nextReview;
  }

  /**
   * Gets days until next review
   */
  public getDaysUntilReview(currentDate: Date = new Date()): number {
    const diffTime = this.nextReview.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Gets the card's learning stage
   */
  public getLearningStage(): 'new' | 'learning' | 'review' | 'mastered' {
    if (this.repetitions === 0) {
      return 'new';
    } else if (this.repetitions < 3) {
      return 'learning';
    } else if (this.successRate >= 90 && this.repetitions >= 5) {
      return 'mastered';
    } else {
      return 'review';
    }
  }

  /**
   * Gets performance trend over recent reviews
   */
  public getPerformanceTrend(reviewCount: number = 10): 'improving' | 'declining' | 'stable' {
    if (this.reviewHistory.length < 4) {
      return 'stable';
    }

    const recentReviews = this.reviewHistory.slice(-reviewCount);
    const firstHalf = recentReviews.slice(0, Math.floor(recentReviews.length / 2));
    const secondHalf = recentReviews.slice(Math.floor(recentReviews.length / 2));

    const firstHalfSuccess = firstHalf.filter(r => r.correct).length / firstHalf.length;
    const secondHalfSuccess = secondHalf.filter(r => r.correct).length / secondHalf.length;

    const difference = secondHalfSuccess - firstHalfSuccess;

    if (difference > 0.1) {
      return 'improving';
    } else if (difference < -0.1) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Gets difficulty assessment based on statistics
   */
  public getDifficultyAssessment(): 'easy' | 'medium' | 'hard' | 'very_hard' {
    const avgResponseTime = this.averageResponseTime;
    const successRate = this.successRate;

    if (successRate >= 90 && avgResponseTime <= 5000) {
      return 'easy';
    } else if (successRate >= 75 && avgResponseTime <= 10000) {
      return 'medium';
    } else if (successRate >= 50) {
      return 'hard';
    } else {
      return 'very_hard';
    }
  }

  /**
   * Gets review statistics summary
   */
  public getReviewSummary(): {
    totalReviews: number;
    successRate: number;
    averageResponseTime: number;
    currentStreak: number;
    longestStreak: number;
    learningStage: string;
    nextReviewIn: number;
  } {
    // Calculate current streak
    let currentStreak = 0;
    for (let i = this.reviewHistory.length - 1; i >= 0; i--) {
      if (this.reviewHistory[i].correct) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    for (const review of this.reviewHistory) {
      if (review.correct) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return {
      totalReviews: this.totalReviews,
      successRate: Math.round(this.successRate * 100) / 100,
      averageResponseTime: Math.round(this.averageResponseTime),
      currentStreak,
      longestStreak,
      learningStage: this.getLearningStage(),
      nextReviewIn: this.getDaysUntilReview()
    };
  }

  /**
   * Resets the card statistics (for relearning)
   */
  public reset(): CardStatisticsModel {
    const resetData: Partial<CardStatistics> = {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(),
      averageResponseTime: 0,
      successRate: 0
    };

    const newModel = new CardStatisticsModel(this.cardId, resetData);
    newModel.totalReviews = 0;
    newModel.reviewHistory = [];
    newModel.updatedAt = new Date();

    return newModel;
  }

  /**
   * Converts the model to a plain object
   */
  public toObject(): CardStatistics {
    return {
      cardId: this.cardId,
      easeFactor: this.easeFactor,
      interval: this.interval,
      repetitions: this.repetitions,
      nextReview: this.nextReview,
      lastReviewed: this.lastReviewed,
      averageResponseTime: this.averageResponseTime,
      successRate: this.successRate
    };
  }

  /**
   * Creates a deep copy of the card statistics
   */
  public clone(): CardStatisticsModel {
    const cloned = new CardStatisticsModel(this.cardId, this.toObject());
    cloned.totalReviews = this.totalReviews;
    cloned.reviewHistory = [...this.reviewHistory];
    cloned.updatedAt = new Date(this.updatedAt);
    return cloned;
  }

  /**
   * Converts to JSON string
   */
  public toJSON(): string {
    return JSON.stringify({
      ...this.toObject(),
      totalReviews: this.totalReviews,
      reviewHistory: this.reviewHistory,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    });
  }

  /**
   * Creates CardStatisticsModel from JSON string
   */
  public static fromJSON(json: string): CardStatisticsModel {
    const data = JSON.parse(json);
    const model = new CardStatisticsModel(data.cardId, {
      ...data,
      nextReview: new Date(data.nextReview),
      lastReviewed: new Date(data.lastReviewed)
    });
    
    if (data.totalReviews !== undefined) {
      model.totalReviews = data.totalReviews;
    }
    if (data.reviewHistory) {
      model.reviewHistory = data.reviewHistory.map((h: any) => ({
        ...h,
        date: new Date(h.date)
      }));
    }
    if (data.updatedAt) {
      model.updatedAt = new Date(data.updatedAt);
    }
    
    return model;
  }

  /**
   * Creates multiple CardStatisticsModel instances from array data
   */
  public static fromArray(statsArray: Array<{ cardId: string } & Partial<CardStatistics>>): CardStatisticsModel[] {
    return statsArray.map(stats => new CardStatisticsModel(stats.cardId, stats));
  }
}