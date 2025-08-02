/**
 * Authentication and User Identity System
 * 
 * This module provides local-first user authentication and identity management
 * designed for offline operation with future multi-user support capabilities.
 */

export { AuthService } from './AuthService';
export { UserManager } from './UserManager';
export type {
  User,
  UserSession,
  AuthenticationResult,
  UserCreationData,
  UserUpdateData,
  UserPreferences,
  StudyPreferences,
  NotificationSettings,
  PrivacySettings
} from './types';

// Re-export for convenience
export const getAuthService = () => AuthService.getInstance();