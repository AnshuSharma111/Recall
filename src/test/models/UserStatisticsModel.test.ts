import { describe, it, expect, beforeEach } from 'vitest';
import { UserStatisticsModel } from '../../models/UserStatisticsModel';
import { ValidationError } from '../../models/validation';
import { AchievementCategory } from '../../types';

describe('UserStatisticsModel', () => {
  let userStats: UserStatisticsModel;

  beforeEach(() => {
    userStats = new UserStatisticsModel();
  });

  describe('Construction and Validation', () => {
    it('should create user statistics with default values', () => {
      expect(userStats.totalCardsStudied).toBe(0);
      expect(userStats.correctAnswers).toBe(0);
      expect(userStats.currentStreak).toBe(0);
      expect(userStats.totalStudyTime).toBe(0);
      expect(userStats.level).toBe(1);
      expect(userStats.achievements).toEqual([]);
      expect(userStats.createdAt).toBeInstanceOf(Date);
    });

    it('should create user statistics with provided data', () => {
      const data = {
        totalCardsStudied: 100,
        correctAnswers: 85,
        currentStreak: 5,
        totalStudyTime: 3600,
        level: 3,
        achievements: []
      };

      const stats = new UserStatisticsModel(data);

      expect(stats.totalCardsStudied).toBe(100);
      expect(stats.correctAnswers).toBe(85);
      expect(stats.currentStreak).toBe(5);
      expect(stats.totalStudyTime).toBe(3600);
      expect(stats.level).toBe(3);
    });

    it('should throw ValidationError for invalid data', () => {
      expect(() => {
        new UserStatisticsModel({
          totalCardsStudied: -1 // Invalid negative value
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError when correct answers exceed total cards', () => {
      expect(() => {
        new UserStatisticsModel({
          totalCardsStudied: 50,
          correctAnswers: 60 // More correct than total
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Study Session Recording', () => {
    it('should record a study session correctly', () => {
      const updatedStats = userStats.recordStudySession(10, 8, 600, true);

      expect(updatedStats.totalCardsStudied).toBe(10);
      expect(updatedStats.correctAnswers).toBe(8);
      expect(updatedStats.totalStudyTime).toBe(600);
      expect(updatedStats.currentStreak).toBe(1);
      expect(updatedStats.lastStudyDate).toBeInstanceOf(Date);
    });

    it('should maintain streak for consecutive days', () => {
      // First session
      let stats = userStats.recordStudySession(5, 4, 300, true);
      expect(stats.currentStreak).toBe(1);

      // Simulate next day study
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      stats.lastStudyDate = yesterday;

      const updatedStats = stats.recordStudySession(5, 4, 300, true);
      expect(updatedStats.currentStreak).toBe(2);
      expect(updatedStats.longestStreak).toBe(2);
    });

    it('should reset streak for non-consecutive days', () => {
      // First session
      let stats = userStats.recordStudySession(5, 4, 300, true);
      
      // Simulate study after 3 days gap
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      stats.lastStudyDate = threeDaysAgo;

      const updatedStats = stats.recordStudySession(5, 4, 300, true);
      expect(updatedStats.currentStreak).toBe(1); // Reset to 1
    });

    it('should calculate level based on cards and accuracy', () => {
      const stats = userStats.recordStudySession(150, 135, 1800, true); // 90% accuracy
      expect(stats.level).toBeGreaterThan(1);
    });
  });

  describe('Streak Management', () => {
    it('should break streak when requested', () => {
      const stats = userStats.recordStudySession(10, 8, 600, true);
      expect(stats.currentStreak).toBe(1);

      const brokenStats = stats.breakStreak();
      expect(brokenStats.currentStreak).toBe(0);
      expect(brokenStats.longestStreak).toBe(1); // Longest streak preserved
    });
  });

  describe('Achievement Management', () => {
    it('should add new achievements', () => {
      const achievement = {
        id: 'test_achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        unlockedAt: new Date(),
        category: AchievementCategory.MILESTONE
      };

      const updatedStats = userStats.addAchievement(achievement);
      expect(updatedStats.achievements).toHaveLength(1);
      expect(updatedStats.achievements[0].id).toBe('test_achievement');
    });

    it('should not add duplicate achievements', () => {
      const achievement = {
        id: 'test_achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        unlockedAt: new Date(),
        category: AchievementCategory.MILESTONE
      };

      let stats = userStats.addAchievement(achievement);
      expect(stats.achievements).toHaveLength(1);

      stats = stats.addAchievement(achievement); // Try to add same achievement
      expect(stats.achievements).toHaveLength(1); // Should still be 1
    });

    it('should check for new achievements based on progress', () => {
      // Create stats that qualify for achievements
      const stats = new UserStatisticsModel({
        totalCardsStudied: 100,
        correctAnswers: 95,
        currentStreak: 7,
        totalStudyTime: 3600
      });

      const newAchievements = stats.checkForNewAchievements();
      
      expect(newAchievements.length).toBeGreaterThan(0);
      expect(newAchievements.some(a => a.id === 'streak_7')).toBe(true);
      expect(newAchievements.some(a => a.id === 'cards_100')).toBe(true);
      expect(newAchievements.some(a => a.id === 'time_1hour')).toBe(true);
    });
  });

  describe('Statistics Calculations', () => {
    it('should calculate accuracy correctly', () => {
      const stats = new UserStatisticsModel({
        totalCardsStudied: 100,
        correctAnswers: 85
      });

      expect(stats.getAccuracy()).toBe(85);
    });

    it('should return 0 accuracy for no cards studied', () => {
      expect(userStats.getAccuracy()).toBe(0);
    });

    it('should calculate average study time per card', () => {
      const stats = new UserStatisticsModel({
        totalCardsStudied: 10,
        totalStudyTime: 600 // 10 minutes
      });

      expect(stats.getAverageStudyTimePerCard()).toBe(60); // 60 seconds per card
    });

    it('should format study time correctly', () => {
      const stats1 = new UserStatisticsModel({ totalStudyTime: 3665 }); // 1h 1m 5s
      expect(stats1.getFormattedStudyTime()).toBe('1h 1m 5s');

      const stats2 = new UserStatisticsModel({ totalStudyTime: 125 }); // 2m 5s
      expect(stats2.getFormattedStudyTime()).toBe('2m 5s');

      const stats3 = new UserStatisticsModel({ totalStudyTime: 45 }); // 45s
      expect(stats3.getFormattedStudyTime()).toBe('45s');
    });

    it('should get level information', () => {
      const stats = new UserStatisticsModel({ level: 3 });
      const levelInfo = stats.getLevelInfo();

      expect(levelInfo.level).toBe(3);
      expect(levelInfo.title).toBe('Scholar');
      expect(levelInfo.benefits).toContain('Advanced statistics');
    });

    it('should get statistics summary', () => {
      const stats = new UserStatisticsModel({
        totalCardsStudied: 100,
        correctAnswers: 90,
        totalStudyTime: 3000,
        level: 2
      });

      const summary = stats.getStatsSummary();

      expect(summary.accuracy).toBe(90);
      expect(summary.averageTimePerCard).toBe(30);
      expect(summary.studyEfficiency).toBeGreaterThan(0);
      expect(summary.progressToNextLevel).toBeGreaterThanOrEqual(0);
      expect(summary.progressToNextLevel).toBeLessThanOrEqual(100);
    });
  });

  describe('Serialization', () => {
    it('should convert to plain object', () => {
      const stats = new UserStatisticsModel({
        totalCardsStudied: 50,
        correctAnswers: 40,
        currentStreak: 3
      });

      const obj = stats.toObject();

      expect(obj.totalCardsStudied).toBe(50);
      expect(obj.correctAnswers).toBe(40);
      expect(obj.currentStreak).toBe(3);
    });

    it('should serialize to and from JSON', () => {
      const stats = new UserStatisticsModel({
        totalCardsStudied: 50,
        correctAnswers: 40,
        currentStreak: 3
      });

      const json = stats.toJSON();
      const restored = UserStatisticsModel.fromJSON(json);

      expect(restored.totalCardsStudied).toBe(stats.totalCardsStudied);
      expect(restored.correctAnswers).toBe(stats.correctAnswers);
      expect(restored.currentStreak).toBe(stats.currentStreak);
    });

    it('should create deep copy with clone', () => {
      const stats = new UserStatisticsModel({
        totalCardsStudied: 50,
        achievements: [
          {
            id: 'test',
            name: 'Test',
            description: 'Test achievement',
            unlockedAt: new Date(),
            category: AchievementCategory.MILESTONE
          }
        ]
      });

      const cloned = stats.clone();

      expect(cloned.totalCardsStudied).toBe(stats.totalCardsStudied);
      expect(cloned).not.toBe(stats); // Different instances
      expect(cloned.achievements).not.toBe(stats.achievements); // Different arrays
      expect(cloned.achievements[0]).toEqual(stats.achievements[0]);
    });
  });
});