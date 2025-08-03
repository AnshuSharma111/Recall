// AI Configuration Management

import { AIModelConfig } from '../interfaces/ai';

export interface AISettings {
  enabled: boolean;
  provider: 'ollama' | 'lmstudio';
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
  fallbackEnabled: boolean;
  cardGenerationSettings: {
    maxCardsPerSession: number;
    preferredCardTypes: string[];
    difficultyLevel: 'easy' | 'medium' | 'hard' | 'mixed';
    qualityThreshold: number;
  };
}

export class AIConfigManager {
  private static readonly STORAGE_KEY = 'recall_ai_settings';
  private settings: AISettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  getSettings(): AISettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  getModelConfig(): AIModelConfig {
    return {
      provider: this.settings.provider,
      baseUrl: this.settings.baseUrl,
      model: this.settings.model,
      timeout: this.settings.timeout,
      maxRetries: this.settings.maxRetries
    };
  }

  isAIEnabled(): boolean {
    return this.settings.enabled;
  }

  isFallbackEnabled(): boolean {
    return this.settings.fallbackEnabled;
  }

  getDefaultOllamaSettings(): Partial<AISettings> {
    return {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2:3b',
      timeout: 30000,
      maxRetries: 3
    };
  }

  getDefaultLMStudioSettings(): Partial<AISettings> {
    return {
      provider: 'lmstudio',
      baseUrl: 'http://localhost:1234',
      model: 'local-model',
      timeout: 45000,
      maxRetries: 2
    };
  }

  resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  validateSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.settings.baseUrl || !this.isValidUrl(this.settings.baseUrl)) {
      errors.push('Invalid base URL');
    }

    if (!this.settings.model || this.settings.model.trim().length === 0) {
      errors.push('Model name is required');
    }

    if (this.settings.timeout < 5000 || this.settings.timeout > 300000) {
      errors.push('Timeout must be between 5 and 300 seconds');
    }

    if (this.settings.maxRetries < 1 || this.settings.maxRetries > 10) {
      errors.push('Max retries must be between 1 and 10');
    }

    if (this.settings.cardGenerationSettings.maxCardsPerSession < 1 || 
        this.settings.cardGenerationSettings.maxCardsPerSession > 50) {
      errors.push('Max cards per session must be between 1 and 50');
    }

    if (this.settings.cardGenerationSettings.qualityThreshold < 0 || 
        this.settings.cardGenerationSettings.qualityThreshold > 1) {
      errors.push('Quality threshold must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private loadSettings(): AISettings {
    try {
      // Check if we're in a browser environment
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(AIConfigManager.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...this.getDefaultSettings(), ...parsed };
        }
      }
    } catch (error) {
      console.warn('Failed to load AI settings from storage:', error);
    }
    
    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    try {
      // Check if we're in a browser environment
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AIConfigManager.STORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch (error) {
      console.error('Failed to save AI settings to storage:', error);
    }
  }

  private getDefaultSettings(): AISettings {
    return {
      enabled: true,
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2:3b',
      timeout: 30000,
      maxRetries: 3,
      fallbackEnabled: true,
      cardGenerationSettings: {
        maxCardsPerSession: 10,
        preferredCardTypes: ['definition', 'question_answer'],
        difficultyLevel: 'mixed',
        qualityThreshold: 0.6
      }
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance for global access
export const aiConfigManager = new AIConfigManager();