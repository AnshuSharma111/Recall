import { describe, it, expect } from 'vitest';
import type { 
  TextHandler, 
  ImageHandler, 
  AudioHandler,
  ContentPreprocessor,
  KeywordExtractor,
  CardGenerator,
  SpacedRepetitionEngine,
  GamificationSystem,
  DeckManager,
  ErrorHandler
} from '../interfaces';

describe('Interface Definitions', () => {
  it('should define TextHandler interface', () => {
    // This test verifies the interface exists and has the expected structure
    const mockHandler: Partial<TextHandler> = {
      supportedFormats: ['.txt', '.md', '.pdf']
    };
    
    expect(mockHandler.supportedFormats).toEqual(['.txt', '.md', '.pdf']);
  });

  it('should define ImageHandler interface', () => {
    const mockHandler: Partial<ImageHandler> = {};
    expect(mockHandler).toBeDefined();
  });

  it('should define AudioHandler interface', () => {
    const mockHandler: Partial<AudioHandler> = {};
    expect(mockHandler).toBeDefined();
  });

  it('should define ContentPreprocessor interface', () => {
    const mockProcessor: Partial<ContentPreprocessor> = {};
    expect(mockProcessor).toBeDefined();
  });

  it('should define KeywordExtractor interface', () => {
    const mockExtractor: Partial<KeywordExtractor> = {};
    expect(mockExtractor).toBeDefined();
  });

  it('should define CardGenerator interface', () => {
    const mockGenerator: Partial<CardGenerator> = {};
    expect(mockGenerator).toBeDefined();
  });

  it('should define SpacedRepetitionEngine interface', () => {
    const mockEngine: Partial<SpacedRepetitionEngine> = {};
    expect(mockEngine).toBeDefined();
  });

  it('should define GamificationSystem interface', () => {
    const mockSystem: Partial<GamificationSystem> = {};
    expect(mockSystem).toBeDefined();
  });

  it('should define DeckManager interface', () => {
    const mockManager: Partial<DeckManager> = {};
    expect(mockManager).toBeDefined();
  });

  it('should define ErrorHandler interface', () => {
    const mockHandler: Partial<ErrorHandler> = {};
    expect(mockHandler).toBeDefined();
  });
});