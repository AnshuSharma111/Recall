import { describe, it, expect, beforeEach } from 'vitest';
import { CardStatisticsModel } from '../../models/CardStatisticsModel';
import { ValidationError } from '../../models/validation';
import { UserDifficulty } from '../../types';

describe('CardStatisticsModel', () => {
  let cardStats: CardStatisticsModel;
  const cardId = 'test-card-123';

  beforeEach(() => {
    cardStats = new CardStatisticsModel(cardId);
  });

  describe('Construction and Validation', () => {
    it('should create card statistics with default values', () => {
      expect(cardStats.cardId).toBe(cardId);
      expect(cardStats.easeFactor).toBe(2.5);
      expect(cardStats.interval).toBe(1);
      expect(cardStats.repetitions).toBe(0);
      expect(cardStats.averageResponseTime).toBe(0);
      expect(cardStats.successRate).toBe(0);
      expect(cardStats.nextReview).toBeInstanceOf(Date);
      expect(cardStats.lastReviewed).toBeInstanceOf(Date);
    });

    it('should create card statistics with provided data', () => {
      const data = {
        easeFactor: 2.8,
        interval: 7,
        repetitions: 3,
        averageResponseTime: 5000,
        successRate: 85
      };

      const stats = new CardStatisticsModel(cardId, data);

      expect(stats.easeFactor).toBe(2.8);
      expect(stats.interval).toBe(7);
      expect(stats.repetitions).toBe(3);
      expect(stats.averageResponseTime).toBe(5000);
      expect(stats.successRate).toBe(85);
    });

    it('should throw ValidationError for invalid card ID', () => {
      expect(() => {
        new CardStatisticsModel(''); // Empty card ID
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid ease factor', () => {
      expect(() => {
        new CardStatisticsModel(cardId, {
          easeFactor: 1.0 // Below minimum of 1.3
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid interval', () => {
      expect(() => {
        new CardStatisticsModel(cardId, {
          interval: 0 // Below minimum of 1
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Study Response Recording', () => {
    it('should record correct response and update statistics', () => {
      const response = {
        cardId: cardId,
        correct: true,
        responseTime: 3000,
        difficulty: UserDifficulty.GOOD,
        timestamp: new Date()
      };

      const updatedStats = cardStats.recordResponse(response);

      expect(updatedStats.totalReviews).toBe(1);
      expect(updatedStats.successRate).toBe(100);
      expect(updatedStats.averageResponseTime).toBe(3000);
      expect(updatedStats.repetitions).toBe(1);
      expect(updatedStats.reviewHistory).toHaveLength(1);
    });

    it('should record incorrect response and reset repetitions', () => {
      // First, build up some repetitions
      let stats = cardStats;
      for (let i = 0; i < 3; i++) {
        stats = stats.recordResponse({
          cardId: cardId,
          correct: true,
          responseTime: 3000,
          difficulty: UserDifficulty.GOOD,
          timestamp: new Date()
        });
      }

      expect(stats.repetitions).toBe(3);

      // Now record an incorrect response
      const incorrectResponse = {
        cardId: cardId,
        correct: false,
        responseTime: 5000,
        difficulty: UserDifficulty.AGAIN,
        timestamp: new Date()
      };

      const updatedStats = stats.recordResponse(incorrectResponse);

      expect(updatedStats.repetitions).toBe(0); // Reset to 0
      expect(updatedStats.interval).toBe(1); // Reset to 1 day
      expect(updatedStats.easeFactor).toBeLessThan(stats.easeFactor); // Decreased
    });

    it('should adjust ease factor based on user difficulty', () => {
      const easyResponse = {
        cardId: cardId,
        correct: true,
        responseTime: 2000,
        difficulty: UserDifficulty.EASY,
        timestamp: new Date()
      };

      const updatedStats = cardStats.recordResponse(easyResponse);
      expect(updatedStats.easeFactor).toBeGreaterThan(cardStats.easeFactor);
    });

    it('should calculate intervals using SM-2 algorithm', () => {
      let stats = cardStats;

      // First review (correct)
      stats = stats.recordResponse({
        cardId: cardId,
        correct: true,
        responseTime: 3000,
        difficulty: UserDifficulty.GOOD,
        timestamp: new Date()
      });
      expect(stats.interval).toBe(1); // First interval is 1 day

      // Second review (correct)
      stats = stats.recordResponse({
        cardId: cardId,
        correct: true,
        responseTime: 3000,
        difficulty: UserDifficulty.GOOD,
        timestamp: new Date()
      });
      expect(stats.interval).toBe(6); // Second interval is 6 days

      // Third review (correct)
      stats = stats.recordResponse({
        cardId: cardId,
        correct: true,
        responseTime: 3000,
        difficulty: UserDifficulty.GOOD,
        timestamp: new Date()
      });
      expect(stats.interval).toBeGreaterThan(6); // Subsequent intervals use ease factor
    });
  });

  describe('Review Status and Timing', () => {
    it('should check if card is due for review', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const stats = new CardStatisticsModel(cardId, {
        nextReview: yesterday
      });

      expect(stats.isDue(now)).toBe(true);
    });

    it('should check if card is not due for review', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const stats = new CardStatisticsModel(cardId, {
        nextReview: tomorrow
      });

      expect(stats.isDue(now)).toBe(false);
    });

    it('should calculate days until next review', () => {
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      const stats = new CardStatisticsModel(cardId, {
        nextReview: threeDaysLater
      });

      expect(stats.getDaysUntilReview(now)).toBe(3);
    });
  });

  describe('Learning Stage Assessment', () => {
    it('should identify new cards', () => {
      expect(cardStats.getLearningStage()).toBe('new');
    });

    it('should identify learning cards', () => {
      const stats = new CardStatisticsModel(cardId, {
        repetitions: 2
      });

      expect(stats.getLearningStage()).toBe('learning');
    });

    it('should identify review cards', () => {
      const stats = new CardStatisticsModel(cardId, {
        repetitions: 4,
        successRate: 75
      });

      expect(stats.getLearningStage()).toBe('review');
    });

    it('should identify mastered cards', () => {
      const stats = new CardStatisticsModel(cardId, {
        repetitions: 6,
        successRate: 95
      });

      expect(stats.getLearningStage()).toBe('mastered');
    });
  });

  describe('Performance Analysis', () => {
    it('should detect improving performance trend', () => {
      const stats = new CardStatisticsModel(cardId);
      
      // Add review history with improving trend
      stats.reviewHistory = [
        { date: new Date(), correct: false, responseTime: 5000, difficulty: UserDifficulty.HARD },
        { date: new Date(), correct: false, responseTime: 4500, difficulty: UserDifficulty.HARD },
        { date: new Date(), correct: true, responseTime: 4000, difficulty: UserDifficulty.GOOD },
        { date: new Date(), correct: true, responseTime: 3500, difficulty: UserDifficulty.GOOD },
        { date: new Date(), correct: true, responseTime: 3000, difficulty: UserDifficulty.EASY },
        { date: new Date(), correct: true, responseTime: 2500, difficulty: UserDifficulty.EASY }
      ];

      expect(stats.getPerformanceTrend()).toBe('improving');
    });

    it('should detect declining performance trend', () => {
      const stats = new CardStatisticsModel(cardId);
      
      // Add review history with declining trend
      stats.reviewHistory = [
        { date: new Date(), correct: true, responseTime: 2500, difficulty: UserDifficulty.EASY },
        { date: new Date(), correct: true, responseTime: 3000, difficulty: UserDifficulty.EASY },
        { date: new Date(), correct: true, responseTime: 3500, difficulty: UserDifficulty.GOOD },
        { date: new Date(), correct: false, responseTime: 4000, difficulty: UserDifficulty.HARD },
        { date: new Date(), correct: false, responseTime: 4500, difficulty: UserDifficulty.HARD },
        { date: new Date(), correct: false, responseTime: 5000, difficulty: UserDifficulty.AGAIN }
      ];

      expect(stats.getPerformanceTrend()).toBe('declining');
    });

    it('should assess difficulty correctly', () => {
      const easyStats = new CardStatisticsModel(cardId, {
        successRate: 95,
        averageResponseTime: 3000
      });

      const hardStats = new CardStatisticsModel(cardId, {
        successRate: 40,
        averageResponseTime: 15000
      });

      expect(easyStats.getDifficultyAssessment()).toBe('easy');
      expect(hardStats.getDifficultyAssessment()).toBe('very_hard');
    });
  });

  describe('Review Summary', () => {
    it('should provide comprehensive review summary', () => {
      const stats = new CardStatisticsModel(cardId, {
        repetitions: 5,
        successRate: 80,
        averageResponseTime: 4000
      });

      // Add some review history
      stats.reviewHistory = [
        { date: new Date(), correct: true, responseTime: 3000, difficulty: UserDifficulty.GOOD },
        { date: new Date(), correct: true, responseTime: 4000, difficulty: UserDifficulty.GOOD },
        { date: new Date(), correct: false, responseTime: 5000, difficulty: UserDifficulty.HARD },
        { date: new Date(), correct: true, responseTime: 3500, difficulty: UserDifficulty.GOOD },
        { date: new Date(), correct: true, responseTime: 3000, difficulty: UserDifficulty.EASY }
      ];
      stats.totalReviews = 5;

      const summary = stats.getReviewSummary();

      expect(summary.totalReviews).toBe(5);
      expect(summary.successRate).toBe(80);
      expect(summary.averageResponseTime).toBe(4000);
      expect(summary.currentStreak).toBe(2); // Last 2 reviews were correct
      expect(summary.longestStreak).toBe(2);
      expect(summary.learningStage).toBe('review');
      expect(typeof summary.nextReviewIn).toBe('number');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset card statistics for relearning', () => {
      const stats = new CardStatisticsModel(cardId, {
        easeFactor: 3.0,
        interval: 30,
        repetitions: 10,
        successRate: 85
      });

      const resetStats = stats.reset();

      expect(resetStats.easeFactor).toBe(2.5);
      expect(resetStats.interval).toBe(1);
      expect(resetStats.repetitions).toBe(0);
      expect(resetStats.successRate).toBe(0);
      expect(resetStats.totalReviews).toBe(0);
      expect(resetStats.reviewHistory).toHaveLength(0);
    });
  });

  describe('Serialization', () => {
    it('should convert to plain object', () => {
      const stats = new CardStatisticsModel(cardId, {
        easeFactor: 2.8,
        interval: 7,
        repetitions: 3
      });

      const obj = stats.toObject();

      expect(obj.cardId).toBe(cardId);
      expect(obj.easeFactor).toBe(2.8);
      expect(obj.interval).toBe(7);
      expect(obj.repetitions).toBe(3);
    });

    it('should serialize to and from JSON', () => {
      const stats = new CardStatisticsModel(cardId, {
        easeFactor: 2.8,
        interval: 7,
        repetitions: 3
      });

      const json = stats.toJSON();
      const restored = CardStatisticsModel.fromJSON(json);

      expect(restored.cardId).toBe(stats.cardId);
      expect(restored.easeFactor).toBe(stats.easeFactor);
      expect(restored.interval).toBe(stats.interval);
      expect(restored.repetitions).toBe(stats.repetitions);
    });

    it('should create from array data', () => {
      const statsArray = [
        { cardId: 'card1', easeFactor: 2.5, interval: 1 },
        { cardId: 'card2', easeFactor: 2.8, interval: 7 }
      ];

      const models = CardStatisticsModel.fromArray(statsArray);

      expect(models).toHaveLength(2);
      expect(models[0].cardId).toBe('card1');
      expect(models[1].cardId).toBe('card2');
    });

    it('should create deep copy with clone', () => {
      const stats = new CardStatisticsModel(cardId, {
        easeFactor: 2.8,
        interval: 7
      });

      stats.reviewHistory = [
        { date: new Date(), correct: true, responseTime: 3000, difficulty: UserDifficulty.GOOD }
      ];

      const cloned = stats.clone();

      expect(cloned.cardId).toBe(stats.cardId);
      expect(cloned.easeFactor).toBe(stats.easeFactor);
      expect(cloned).not.toBe(stats); // Different instances
      expect(cloned.reviewHistory).not.toBe(stats.reviewHistory); // Different arrays
      expect(cloned.reviewHistory[0]).toEqual(stats.reviewHistory[0]);
    });
  });
});