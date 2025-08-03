// AI model integration interfaces

import { FlashCard } from '../types/flashcard';
import { Keyword, ContentChunk } from '../types/content';

export interface AIModelConfig {
  provider: 'ollama' | 'lmstudio';
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

export interface AIModelResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface AIModelService {
  isAvailable(): Promise<boolean>;
  generateCards(keywords: Keyword[], context: ContentChunk[]): Promise<FlashCard[]>;
  validateResponse(response: string): boolean;
  getConfig(): AIModelConfig;
  setConfig(config: Partial<AIModelConfig>): void;
}

export interface CardGenerationPrompt {
  keywords: Keyword[];
  context: ContentChunk[];
  cardTypes: string[];
  maxCards: number;
  difficulty: string;
}

export interface AIError extends Error {
  type: 'connection_failed' | 'model_unavailable' | 'generation_failed' | 'timeout' | 'invalid_response';
  statusCode?: number;
  retryable: boolean;
}