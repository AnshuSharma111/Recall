// Handler implementations
export { BasicTextHandler } from './TextHandler';

// Re-export interfaces for convenience
export type { 
  TextHandler, 
  ImageHandler, 
  AudioHandler,
  ExtractedContent,
  ValidationResult,
  QualityAssessment,
  OCRResult,
  TranscriptionResult,
  TranscriptionProgress
} from '../interfaces/handlers';