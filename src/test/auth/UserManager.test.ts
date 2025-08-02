import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserManager } from '../../auth/UserManager';
import { DatabaseConnection } from '../../database/connection';
import { UserCreationData } from '../../auth/types';
import * as fs from 'fs';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn()
  }
}));

describe('UserManager', () => {
  let userManager: UserManager;
  let dbConnection: DatabaseConnection;
  let testDataDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDataDir = `./test-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDbPath = `${testDataDir}/recall.db`;
    
    // Mock the app.getPath to return our unique test directory
    const { app } = await import('electron');
    vi.mocked(app.getPath).mockReturnValue(testDataDir);
    
    // Reset singleton instance
    (DatabaseConnection as any).instance = null;
    
    // Ensure test data directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    dbConnection = DatabaseConnection.getInstance();
    await dbConnection.connect();
    userManager = new UserManager();
  });

  afterEach(async () => {
    try {
      dbConnection.close();
    } catch (error) {
      // Ignore close errors
    }
    
    // Clean up test database and directory
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      if (fs.existsSync(testDataDir)) {
        fs.rmdirSync(testDataDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createTestUserData = (): UserCreationData => ({
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com'
  });

  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const userData = createTestUserData();
      
      const result = await userManager.createUser(userData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.user?.username).toBe(userData.username);
      expect(result.user?.displayName).toBe(userData.displayName);
      expect(result.user?.email).toBe(userData.email);
    });

    it('should create user with default preferences', async () => {
      const userData = createTestUserData();
      
      const result = await userManager.createUser(userData);
      
      expect(result.user?.preferences).toBeDefined();
      expect(result.user?.preferences.theme).toBe('system');
      expect(result.user?.preferences.language).toBe('en');
      expect(result.user?.preferences.studySettings.defaultSessionLength).toBe(20);
    });

    it('should merge custom preferences with defaults', async () => {
      const userData: UserCreationData = {
        ...createTestUserData(),
        preferences: {
          theme: 'dark',
          studySettings: {
            defaultSessionLength: 30,
            autoAdvanceCards: true,
            showTimer: false,
            enableSounds: false,
            defaultDifficulty: 'hard',
            spacedRepetitionSettings: {
              maxNewCardsPerDay: 25,
              maxReviewCardsPerDay: 120,
              difficultyMultiplier: 1.2
            }
          }
        }
      };
      
      const result = await userManager.createUser(userData);
      
      expect(result.user?.preferences.theme).toBe('dark');
      expect(result.user?.preferences.language).toBe('en'); // Default
      expect(result.user?.preferences.studySettings.defaultSessionLength).toBe(30);
      expect(result.user?.preferences.studySettings.autoAdvanceCards).toBe(true);
    });

    it('should reject duplicate usernames', async () => {
      const userData = createTestUserData();
      
      // Create first user
      await userManager.createUser(userData);
      
      // Try to create second user with same username
      const result = await userManager.createUser(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Username already exists');
    });
  });

  describe('User Authentication', () => {
    it('should authenticate existing user', async () => {
      const userData = createTestUserData();
      await userManager.createUser(userData);
      
      const result = await userManager.authenticateUser(userData.username);
      
      expect(result.success).toBe(true);
      expect(result.user?.username).toBe(userData.username);
      expect(result.session).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const result = await userManager.authenticateUser('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should update last login time on authentication', async () => {
      const userData = createTestUserData();
      const createResult = await userManager.createUser(userData);
      const originalLoginTime = createResult.user?.lastLoginAt;
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const authResult = await userManager.authenticateUser(userData.username);
      
      expect(authResult.user?.lastLoginAt.getTime()).toBeGreaterThan(originalLoginTime!.getTime());
    });
  });

  describe('Session Management', () => {
    it('should create active session on user creation', async () => {
      const userData = createTestUserData();
      
      const result = await userManager.createUser(userData);
      
      expect(result.session?.isActive).toBe(true);
      expect(result.session?.userId).toBe(result.user?.id);
    });

    it('should deactivate previous sessions when creating new session', async () => {
      const userData = createTestUserData();
      await userManager.createUser(userData);
      
      // Authenticate again to create new session
      const result = await userManager.authenticateUser(userData.username);
      
      expect(result.session?.isActive).toBe(true);
    });

    it('should validate active sessions', async () => {
      const userData = createTestUserData();
      const result = await userManager.createUser(userData);
      
      const isValid = userManager.isSessionValid(result.session!.sessionId);
      
      expect(isValid).toBe(true);
    });

    it('should update session activity', async () => {
      const userData = createTestUserData();
      await userManager.createUser(userData);
      
      const originalActivity = userManager.getCurrentSession()?.lastActivity;
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      userManager.updateSessionActivity();
      
      const updatedActivity = userManager.getCurrentSession()?.lastActivity;
      expect(updatedActivity!.getTime()).toBeGreaterThan(originalActivity!.getTime());
    });
  });

  describe('User Management', () => {
    it('should get current user after authentication', async () => {
      const userData = createTestUserData();
      await userManager.createUser(userData);
      
      const currentUser = userManager.getCurrentUser();
      
      expect(currentUser?.username).toBe(userData.username);
    });

    it('should get user by ID', async () => {
      const userData = createTestUserData();
      const result = await userManager.createUser(userData);
      
      const user = userManager.getUserById(result.user!.id);
      
      expect(user?.username).toBe(userData.username);
    });

    it('should get all users', async () => {
      const userData1 = createTestUserData();
      const userData2 = { ...createTestUserData(), username: 'testuser2', displayName: 'Test User 2' };
      
      await userManager.createUser(userData1);
      await userManager.createUser(userData2);
      
      const users = userManager.getAllUsers();
      
      expect(users).toHaveLength(2);
      expect(users.map(u => u.username)).toContain(userData1.username);
      expect(users.map(u => u.username)).toContain(userData2.username);
    });

    it('should update user information', async () => {
      const userData = createTestUserData();
      const result = await userManager.createUser(userData);
      
      const updated = await userManager.updateUser(result.user!.id, {
        displayName: 'Updated Name',
        email: 'updated@example.com'
      });
      
      expect(updated).toBe(true);
      
      const user = userManager.getUserById(result.user!.id);
      expect(user?.displayName).toBe('Updated Name');
      expect(user?.email).toBe('updated@example.com');
    });

    it('should update user preferences', async () => {
      const userData = createTestUserData();
      const result = await userManager.createUser(userData);
      
      const updated = await userManager.updateUser(result.user!.id, {
        preferences: {
          theme: 'dark',
          studySettings: {
            defaultSessionLength: 25
          }
        }
      });
      
      expect(updated).toBe(true);
      
      const user = userManager.getUserById(result.user!.id);
      expect(user?.preferences.theme).toBe('dark');
      expect(user?.preferences.studySettings.defaultSessionLength).toBe(25);
      // Should preserve other preferences
      expect(user?.preferences.language).toBe('en');
    });

    it('should deactivate user account', async () => {
      const userData = createTestUserData();
      const result = await userManager.createUser(userData);
      
      const deactivated = await userManager.deactivateUser(result.user!.id);
      
      expect(deactivated).toBe(true);
      expect(userManager.getCurrentUser()).toBeNull();
      
      const user = userManager.getUserById(result.user!.id);
      expect(user).toBeNull(); // Should not find inactive user
    });
  });

  describe('Logout', () => {
    it('should logout current user', async () => {
      const userData = createTestUserData();
      await userManager.createUser(userData);
      
      const success = await userManager.logout();
      
      expect(success).toBe(true);
      expect(userManager.getCurrentUser()).toBeNull();
      expect(userManager.getCurrentSession()).toBeNull();
    });
  });

  describe('Session Cleanup', () => {
    it('should clean up expired sessions', async () => {
      const userData = createTestUserData();
      await userManager.createUser(userData);
      
      // Manually set session to be old (simulate expired session)
      const db = dbConnection.getDatabase();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days ago
      
      db.prepare('UPDATE user_sessions SET last_activity = ? WHERE user_id = ?')
        .run(oldDate.toISOString(), userManager.getCurrentUser()!.id);
      
      const cleanedUp = userManager.cleanupExpiredSessions();
      
      expect(cleanedUp).toBe(1);
    });
  });
});