/**
 * User authentication and identity types
 */

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
  isActive: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  studySettings: StudyPreferences;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface StudyPreferences {
  defaultSessionLength: number;
  autoAdvanceCards: boolean;
  showTimer: boolean;
  enableSounds: boolean;
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  spacedRepetitionSettings: {
    maxNewCardsPerDay: number;
    maxReviewCardsPerDay: number;
    difficultyMultiplier: number;
  };
}

export interface NotificationSettings {
  studyReminders: boolean;
  streakReminders: boolean;
  achievementNotifications: boolean;
  reminderTime?: string; // HH:MM format
}

export interface PrivacySettings {
  shareStatistics: boolean;
  allowAnalytics: boolean;
  dataRetentionDays: number;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  session?: UserSession;
  error?: string;
}

export interface UserCreationData {
  username: string;
  displayName: string;
  email?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UserUpdateData {
  displayName?: string;
  email?: string;
  preferences?: Partial<UserPreferences>;
}