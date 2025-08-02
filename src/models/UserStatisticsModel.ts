import { UserStatistics, Achievement, AchievementCategory } from '../types';
import { ModelValidator, ValidationResult, ValidationError } from './validation';

export interface UserLevel {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
}

export class UserStatisticsModel implements UserStatistics {
  public totalCardsStudied: number;
  public correctAnswers: number;
  public currentStreak: number;
  public totalStudyTime: number; // in seconds
  public level: number;
  public achievements: Achievement[];
  public totalPoints: number;
  public longestStreak: number;
  public lastStudyDate: Date | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<UserStatistics> = {}) {
    this.totalCardsStudied = data.totalCardsStudied || 0;
    this.correctAnswers = data.correctAnswers || 0;
    this.currentStreak = data.currentStreak || 0;
    this.totalStudyTime = data.totalStudyTime || 0;
    this.level = data.level || 1;
    this.achievements = data.achievements || [];
    this.totalPoints = this.calculateTotalPoints();
    this.longestStreak = Math.max(this.currentStreak, 0);
    this.lastStudyDate = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Validate on construction
    const validation = this.validate();
    if (!validation.isValid) {
      throw new ValidationError(
        'construction',
        `Invalid UserStatistics data: ${validation.errors.map(e => e.message).join(', ')}`,
        'INVALID_DATA',
        data
      );
    }
  }

  /**
   * Validates the user statistics data
   */
  public validate(): ValidationResult {
    const validator = new ModelValidator();

    validator
      .validateNumber('totalCardsStudied', this.totalCardsStudied, 'Total cards studied', {
        min: 0,
        integer: true
      })
      .validateNumber('correctAnswers', this.correctAnswers, 'Correct answers', {
        min: 0,
        integer: true
      })
      .validateNumber('currentStreak', this.currentStreak, 'Current streak', {
        min: 0,
        integer: true
      })
      .validateNumber('totalStudyTime', this.totalStudyTime, 'Total study time', {
        min: 0,
        integer: true
      })
      .validateNumber('level', this.level, 'Level', {
        min: 1,
        max: 100,
        integer: true
      })
      .validateArray('achievements', this.achievements, 'Achievements', {
        maxLength: 1000,
        itemValidator: (item, index) => {
          const errors: ValidationError[] = [];
          if (!item || typeof item !== 'object') {
            errors.push(new ValidationError(
              `achievements[${index}]`,
              `Achievement at index ${index} must be an object`,
              'INVALID_TYPE',
              item
            ));
          } else {
            if (!item.id || typeof item.id !== 'string') {
              errors.push(new ValidationError(
                `achievements[${index}].id`,
                `Achievement ID at index ${index} must be a string`,
                'INVALID_TYPE',
                item.id
              ));
            }
            if (!item.name || typeof item.name !== 'string') {
              errors.push(new ValidationError(
                `achievements[${index}].name`,
                `Achievement name at index ${index} must be a string`,
                'INVALID_TYPE',
                item.name
              ));
            }
          }
          return errors;
        }
      });

    // Custom validations
    if (this.correctAnswers > this.totalCardsStudied) {
      validator.addCustomError(
        'correctAnswers',
        'Correct answers cannot exceed total cards studied',
        'INVALID_RATIO'
      );
    }

    return validator.getResult();
  }

  /**
   * Records a study session
   */
  public recordStudySession(cardsStudied: number, correctAnswers: number, studyTime: number, maintainStreak: boolean = true): UserStatisticsModel {
    const now = new Date();
    const newTotalCards = this.totalCardsStudied + cardsStudied;
    const newCorrectAnswers = this.correctAnswers + correctAnswers;
    const newTotalTime = this.totalStudyTime + studyTime;

    let newStreak = this.currentStreak;
    let newLongestStreak = this.longestStreak;

    if (maintainStreak) {
      // Check if this continues the streak
      const daysSinceLastStudy = this.lastStudyDate 
        ? Math.floor((now.getTime() - this.lastStudyDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysSinceLastStudy <= 1) {
        if (daysSinceLastStudy === 1 || !this.lastStudyDate) {
          newStreak = this.currentStreak + 1;
        }
        // If daysSinceLastStudy === 0, streak stays the same (same day)
      } else {
        newStreak = 1; // Reset streak but start new one
      }

      newLongestStreak = Math.max(newLongestStreak, newStreak);
    }

    const updatedData = {
      totalCardsStudied: newTotalCards,
      correctAnswers: newCorrectAnswers,
      currentStreak: newStreak,
      totalStudyTime: newTotalTime,
      level: this.calculateLevel(newTotalCards, newCorrectAnswers),
      achievements: [...this.achievements]
    };

    const newModel = new UserStatisticsModel(updatedData);
    newModel.longestStreak = newLongestStreak;
    newModel.lastStudyDate = now;
    newModel.updatedAt = now;

    return newModel;
  }

  /**
   * Breaks the current streak
   */
  public breakStreak(): UserStatisticsModel {
    const updatedData = {
      ...this.toObject(),
      currentStreak: 0
    };

    const newModel = new UserStatisticsModel(updatedData);
    newModel.longestStreak = this.longestStreak;
    newModel.lastStudyDate = this.lastStudyDate;
    newModel.updatedAt = new Date();

    return newModel;
  }

  /**
   * Adds an achievement
   */
  public addAchievement(achievement: Achievement): UserStatisticsModel {
    // Check if achievement already exists
    const exists = this.achievements.some(a => a.id === achievement.id);
    if (exists) {
      return this;
    }

    const updatedData = {
      ...this.toObject(),
      achievements: [...this.achievements, achievement]
    };

    const newModel = new UserStatisticsModel(updatedData);
    newModel.longestStreak = this.longestStreak;
    newModel.lastStudyDate = this.lastStudyDate;
    newModel.updatedAt = new Date();

    return newModel;
  }

  /**
   * Calculates accuracy percentage
   */
  public getAccuracy(): number {
    if (this.totalCardsStudied === 0) return 0;
    return (this.correctAnswers / this.totalCardsStudied) * 100;
  }

  /**
   * Calculates average study time per card (in seconds)
   */
  public getAverageStudyTimePerCard(): number {
    if (this.totalCardsStudied === 0) return 0;
    return this.totalStudyTime / this.totalCardsStudied;
  }

  /**
   * Gets study time in human-readable format
   */
  public getFormattedStudyTime(): string {
    const hours = Math.floor(this.totalStudyTime / 3600);
    const minutes = Math.floor((this.totalStudyTime % 3600) / 60);
    const seconds = this.totalStudyTime % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calculates level based on total cards and accuracy
   */
  private calculateLevel(totalCards: number, correctAnswers: number): number {
    const accuracy = totalCards > 0 ? (correctAnswers / totalCards) * 100 : 0;
    const baseLevel = Math.floor(totalCards / 100) + 1; // 1 level per 100 cards
    const accuracyBonus = Math.floor(accuracy / 10); // Bonus levels for high accuracy
    
    return Math.min(Math.max(baseLevel + accuracyBonus, 1), 100);
  }

  /**
   * Calculates total points from achievements
   */
  private calculateTotalPoints(): number {
    return this.achievements.reduce((total, achievement) => {
      // Assuming achievements have a points property, default to 0 if not
      return total + ((achievement as any).points || 0);
    }, 0);
  }

  /**
   * Gets user level information
   */
  public getLevelInfo(): UserLevel {
    const levels: UserLevel[] = [
      { level: 1, title: 'Beginner', minPoints: 0, maxPoints: 99, benefits: ['Basic features'] },
      { level: 2, title: 'Student', minPoints: 100, maxPoints: 299, benefits: ['Basic features', 'Progress tracking'] },
      { level: 3, title: 'Scholar', minPoints: 300, maxPoints: 599, benefits: ['All previous', 'Advanced statistics'] },
      { level: 4, title: 'Expert', minPoints: 600, maxPoints: 999, benefits: ['All previous', 'Custom challenges'] },
      { level: 5, title: 'Master', minPoints: 1000, maxPoints: Infinity, benefits: ['All features unlocked'] }
    ];

    const currentLevel = Math.min(Math.max(this.level, 1), levels.length);
    return levels[currentLevel - 1] || levels[0];
  }

  /**
   * Checks if user qualifies for specific achievements
   */
  public checkForNewAchievements(): Achievement[] {
    const newAchievements: Achievement[] = [];
    const existingIds = new Set(this.achievements.map(a => a.id));

    // Streak achievements
    if (this.currentStreak >= 7 && !existingIds.has('streak_7')) {
      newAchievements.push({
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Study for 7 consecutive days',
        unlockedAt: new Date(),
        category: AchievementCategory.STREAK
      });
    }

    if (this.currentStreak >= 30 && !existingIds.has('streak_30')) {
      newAchievements.push({
        id: 'streak_30',
        name: 'Month Master',
        description: 'Study for 30 consecutive days',
        unlockedAt: new Date(),
        category: AchievementCategory.STREAK
      });
    }

    // Volume achievements
    if (this.totalCardsStudied >= 100 && !existingIds.has('cards_100')) {
      newAchievements.push({
        id: 'cards_100',
        name: 'Century Scholar',
        description: 'Study 100 flashcards',
        unlockedAt: new Date(),
        category: AchievementCategory.VOLUME
      });
    }

    if (this.totalCardsStudied >= 1000 && !existingIds.has('cards_1000')) {
      newAchievements.push({
        id: 'cards_1000',
        name: 'Thousand Thoughts',
        description: 'Study 1000 flashcards',
        unlockedAt: new Date(),
        category: AchievementCategory.VOLUME
      });
    }

    // Accuracy achievements
    const accuracy = this.getAccuracy();
    if (accuracy >= 90 && this.totalCardsStudied >= 50 && !existingIds.has('accuracy_90')) {
      newAchievements.push({
        id: 'accuracy_90',
        name: 'Precision Pro',
        description: 'Achieve 90% accuracy with at least 50 cards',
        unlockedAt: new Date(),
        category: AchievementCategory.ACCURACY
      });
    }

    // Time achievements
    if (this.totalStudyTime >= 3600 && !existingIds.has('time_1hour')) {
      newAchievements.push({
        id: 'time_1hour',
        name: 'Hour Hero',
        description: 'Study for a total of 1 hour',
        unlockedAt: new Date(),
        category: AchievementCategory.MILESTONE
      });
    }

    return newAchievements;
  }

  /**
   * Gets study statistics summary
   */
  public getStatsSummary(): {
    accuracy: number;
    averageTimePerCard: number;
    studyEfficiency: number;
    progressToNextLevel: number;
  } {
    const accuracy = this.getAccuracy();
    const avgTime = this.getAverageStudyTimePerCard();
    
    // Study efficiency: balance of accuracy and speed
    const efficiency = avgTime > 0 ? (accuracy / 100) * (60 / Math.max(avgTime, 1)) : 0;
    
    // Progress to next level (simplified)
    const currentLevelCards = (this.level - 1) * 100;
    const nextLevelCards = this.level * 100;
    const progress = ((this.totalCardsStudied - currentLevelCards) / (nextLevelCards - currentLevelCards)) * 100;

    return {
      accuracy: Math.round(accuracy * 100) / 100,
      averageTimePerCard: Math.round(avgTime * 100) / 100,
      studyEfficiency: Math.round(efficiency * 100) / 100,
      progressToNextLevel: Math.min(Math.max(progress, 0), 100)
    };
  }

  /**
   * Converts the model to a plain object
   */
  public toObject(): UserStatistics {
    return {
      totalCardsStudied: this.totalCardsStudied,
      correctAnswers: this.correctAnswers,
      currentStreak: this.currentStreak,
      totalStudyTime: this.totalStudyTime,
      level: this.level,
      achievements: [...this.achievements]
    };
  }

  /**
   * Creates a deep copy of the user statistics
   */
  public clone(): UserStatisticsModel {
    const cloned = new UserStatisticsModel(this.toObject());
    cloned.longestStreak = this.longestStreak;
    cloned.lastStudyDate = this.lastStudyDate;
    cloned.updatedAt = new Date(this.updatedAt);
    return cloned;
  }

  /**
   * Converts to JSON string
   */
  public toJSON(): string {
    return JSON.stringify({
      ...this.toObject(),
      longestStreak: this.longestStreak,
      lastStudyDate: this.lastStudyDate?.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    });
  }

  /**
   * Creates UserStatisticsModel from JSON string
   */
  public static fromJSON(json: string): UserStatisticsModel {
    const data = JSON.parse(json);
    const model = new UserStatisticsModel(data);
    
    if (data.longestStreak !== undefined) {
      model.longestStreak = data.longestStreak;
    }
    if (data.lastStudyDate) {
      model.lastStudyDate = new Date(data.lastStudyDate);
    }
    if (data.updatedAt) {
      model.updatedAt = new Date(data.updatedAt);
    }
    
    return model;
  }
}