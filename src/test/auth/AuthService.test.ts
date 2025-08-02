import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../../auth/AuthService';
import { DatabaseConnection } from '../../database/connection';
import { UserCreationData } from '../../auth/types';
import * as fs from 'fs';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn()
  }
}));

describe('AuthService', () => {
  let authService: AuthService;
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
    
    // Reset singleton instances
    (DatabaseConnection as any).instance = null;
    (AuthService as any).instance = null;
    
    // Ensure test data directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    dbConnection = DatabaseConnection.getInstance();
    await dbConnection.connect();
    authService = AuthService.getInstance();
    await authService.initialize();
  });

  afterEach(async () => {
    try {
      await authService.logout();
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

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const status = authService.getAuthStatus();
      
      expect(status.isInitialized).toBe(true);
    });

    it('should detect no users on first run', () => {
      expect(authService.hasUsers()).toBe(false);
    });

    it('should throw error when not initialized', () => {
      const uninitializedService = new (AuthService as any)();
      
      expect(() => uninitializedService.hasUsers()).toThrow('AuthService not initialized');
    });
  });

  describe('User Management', () => {
    it('should create user successfully', async () => {
      const userData = createTestUserData();
      
      const result = await authService.createUser(userData);
      
      expect(result.success).toBe(true);
      expect(result.user?.username).toBe(userData.username);
      expect(authService.hasUsers()).toBe(true);
    });

    it('should login user successfully', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      await authService.logout();
      
      const result = await authService.login(userData.username);
      
      expect(result.success).toBe(true);
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()?.username).toBe(userData.username);
    });

    it('should logout user successfully', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      
      const success = await authService.logout();
      
      expect(success).toBe(true);
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should get all users', async () => {
      const userData1 = createTestUserData();
      const userData2 = { ...createTestUserData(), username: 'testuser2' };
      
      await authService.createUser(userData1);
      await authService.createUser(userData2);
      
      const users = authService.getUsers();
      
      expect(users).toHaveLength(2);
    });
  });

  describe('Auto-login', () => {
    it('should auto-login when single user exists', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      await authService.logout();
      
      const result = await authService.autoLogin();
      
      expect(result.success).toBe(true);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should not auto-login when multiple users exist', async () => {
      const userData1 = createTestUserData();
      const userData2 = { ...createTestUserData(), username: 'testuser2' };
      
      await authService.createUser(userData1);
      await authService.createUser(userData2);
      await authService.logout();
      
      const result = await authService.autoLogin();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('multiple users');
    });

    it('should not auto-login when no users exist', async () => {
      const result = await authService.autoLogin();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('no users found');
    });
  });

  describe('Default User Creation', () => {
    it('should create default user when no users exist', async () => {
      const result = await authService.createDefaultUser();
      
      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('user');
      expect(result.user?.displayName).toBe('Default User');
      expect(authService.hasUsers()).toBe(true);
    });

    it('should not create default user when users already exist', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      
      const result = await authService.createDefaultUser();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Users already exist');
    });
  });

  describe('User Profile Updates', () => {
    it('should update user preferences', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      
      const success = await authService.updateUserPreferences({
        theme: 'dark',
        studySettings: {
          defaultSessionLength: 30
        }
      });
      
      expect(success).toBe(true);
      expect(authService.getCurrentUser()?.preferences.theme).toBe('dark');
    });

    it('should update user profile', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      
      const success = await authService.updateUserProfile('New Name', 'new@example.com');
      
      expect(success).toBe(true);
      expect(authService.getCurrentUser()?.displayName).toBe('New Name');
      expect(authService.getCurrentUser()?.email).toBe('new@example.com');
    });

    it('should throw error when updating without authentication', async () => {
      await expect(authService.updateUserPreferences({ theme: 'dark' }))
        .rejects.toThrow('No user is currently authenticated');
    });
  });

  describe('Session Management', () => {
    it('should update session activity', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      
      const originalActivity = authService.getCurrentSession()?.lastActivity;
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      authService.updateActivity();
      
      const updatedActivity = authService.getCurrentSession()?.lastActivity;
      expect(updatedActivity!.getTime()).toBeGreaterThan(originalActivity!.getTime());
    });

    it('should validate session', async () => {
      const userData = createTestUserData();
      const result = await authService.createUser(userData);
      
      const isValid = authService.isSessionValid(result.session!.sessionId);
      
      expect(isValid).toBe(true);
    });

    it('should handle session validation when not initialized', () => {
      const uninitializedService = new (AuthService as any)();
      
      const isValid = uninitializedService.isSessionValid('test-session');
      
      expect(isValid).toBe(false);
    });
  });

  describe('Authentication Status', () => {
    it('should return correct auth status when not authenticated', () => {
      const status = authService.getAuthStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.hasUsers).toBe(false);
      expect(status.isAuthenticated).toBe(false);
      expect(status.currentUser).toBeNull();
      expect(status.sessionActive).toBe(false);
    });

    it('should return correct auth status when authenticated', async () => {
      const userData = createTestUserData();
      await authService.createUser(userData);
      
      const status = authService.getAuthStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.hasUsers).toBe(true);
      expect(status.isAuthenticated).toBe(true);
      expect(status.currentUser).toBe(userData.username);
      expect(status.sessionActive).toBe(true);
    });
  });

  describe('User Deactivation', () => {
    it('should deactivate user', async () => {
      const userData = createTestUserData();
      const result = await authService.createUser(userData);
      
      const success = await authService.deactivateUser(result.user!.id);
      
      expect(success).toBe(true);
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Administrative Functions', () => {
    it('should get user by ID', async () => {
      const userData = createTestUserData();
      const result = await authService.createUser(userData);
      
      const user = authService.getUserById(result.user!.id);
      
      expect(user?.username).toBe(userData.username);
    });

    it('should throw error when getting user by ID without initialization', () => {
      const uninitializedService = new (AuthService as any)();
      
      expect(() => uninitializedService.getUserById('test-id'))
        .toThrow('AuthService not initialized');
    });
  });
});