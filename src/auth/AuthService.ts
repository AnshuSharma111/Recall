import { UserManager } from './UserManager';
import { User, UserSession, AuthenticationResult, UserCreationData } from './types';

/**
 * AuthService provides a high-level interface for user authentication
 * and manages the application's authentication state
 */
export class AuthService {
  private static instance: AuthService;
  private userManager: UserManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.userManager = new UserManager();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize the authentication service
   * This should be called when the application starts
   */
  public async initialize(): Promise<void> {
    try {
      // Clean up expired sessions on startup
      this.userManager.cleanupExpiredSessions();
      
      // Check if there are any existing users
      const users = this.userManager.getAllUsers();
      
      if (users.length === 0) {
        console.log('No users found - first time setup required');
      } else {
        console.log(`Found ${users.length} user(s) in the system`);
      }

      this.isInitialized = true;
      console.log('AuthService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AuthService:', error);
      throw new Error(`AuthService initialization failed: ${error}`);
    }
  }

  /**
   * Check if the system has any users (for first-time setup)
   */
  public hasUsers(): boolean {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }
    
    return this.userManager.getAllUsers().length > 0;
  }

  /**
   * Get all users in the system
   */
  public getUsers(): User[] {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }
    
    return this.userManager.getAllUsers();
  }

  /**
   * Create a new user account
   */
  public async createUser(userData: UserCreationData): Promise<AuthenticationResult> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    return await this.userManager.createUser(userData);
  }

  /**
   * Authenticate a user by username
   */
  public async login(username: string): Promise<AuthenticationResult> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    const result = await this.userManager.authenticateUser(username);
    
    if (result.success) {
      console.log(`User ${username} logged in successfully`);
      
      // Update session activity
      this.updateActivity();
    }

    return result;
  }

  /**
   * Logout the current user
   */
  public async logout(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    const currentUser = this.getCurrentUser();
    const success = await this.userManager.logout();
    
    if (success && currentUser) {
      console.log(`User ${currentUser.username} logged out successfully`);
    }

    return success;
  }

  /**
   * Get the currently authenticated user
   */
  public getCurrentUser(): User | null {
    if (!this.isInitialized) {
      return null;
    }
    
    return this.userManager.getCurrentUser();
  }

  /**
   * Get the current user session
   */
  public getCurrentSession(): UserSession | null {
    if (!this.isInitialized) {
      return null;
    }
    
    return this.userManager.getCurrentSession();
  }

  /**
   * Check if a user is currently authenticated
   */
  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null && this.getCurrentSession() !== null;
  }

  /**
   * Update user preferences
   */
  public async updateUserPreferences(preferences: Partial<User['preferences']>): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user is currently authenticated');
    }

    return await this.userManager.updateUser(currentUser.id, { preferences });
  }

  /**
   * Update user profile information
   */
  public async updateUserProfile(displayName?: string, email?: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user is currently authenticated');
    }

    return await this.userManager.updateUser(currentUser.id, { displayName, email });
  }

  /**
   * Update session activity (should be called periodically during app usage)
   */
  public updateActivity(): void {
    if (!this.isInitialized) {
      return;
    }

    this.userManager.updateSessionActivity();
  }

  /**
   * Check if a session is valid
   */
  public isSessionValid(sessionId: string): boolean {
    if (!this.isInitialized) {
      return false;
    }

    return this.userManager.isSessionValid(sessionId);
  }

  /**
   * Get user by ID (for administrative purposes)
   */
  public getUserById(userId: string): User | null {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    return this.userManager.getUserById(userId);
  }

  /**
   * Deactivate a user account
   */
  public async deactivateUser(userId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    return await this.userManager.deactivateUser(userId);
  }

  /**
   * Auto-login for single-user scenarios
   * If there's only one user in the system, automatically log them in
   */
  public async autoLogin(): Promise<AuthenticationResult> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    const users = this.getUsers();
    
    if (users.length === 1) {
      console.log('Single user detected, attempting auto-login');
      return await this.login(users[0].username);
    }

    return {
      success: false,
      error: 'Auto-login not available - multiple users or no users found'
    };
  }

  /**
   * Create default user for first-time setup
   */
  public async createDefaultUser(): Promise<AuthenticationResult> {
    if (!this.isInitialized) {
      throw new Error('AuthService not initialized');
    }

    if (this.hasUsers()) {
      return {
        success: false,
        error: 'Users already exist in the system'
      };
    }

    const defaultUserData: UserCreationData = {
      username: 'user',
      displayName: 'Default User',
      preferences: {
        theme: 'system',
        language: 'en'
      }
    };

    console.log('Creating default user for first-time setup');
    return await this.createUser(defaultUserData);
  }

  /**
   * Get authentication status summary
   */
  public getAuthStatus(): {
    isInitialized: boolean;
    hasUsers: boolean;
    isAuthenticated: boolean;
    currentUser: string | null;
    sessionActive: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      hasUsers: this.isInitialized ? this.hasUsers() : false,
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.getCurrentUser()?.username || null,
      sessionActive: this.getCurrentSession()?.isActive || false
    };
  }
}