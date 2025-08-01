// Input handler and processing types

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: TextRegion[];
  requiresReview: boolean;
}

export interface TextRegion {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  segments: AudioSegment[];
  duration: number;
}

export interface AudioSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual' | 'skip';
  message: string;
  options?: RecoveryOption[];
}

export interface RecoveryOption {
  label: string;
  action: () => void;
}

// Error types
export interface InputError extends Error {
  type: 'file_format' | 'file_size' | 'file_corrupted';
  file?: string;
}

export interface ProcessingError extends Error {
  type: 'ocr_failed' | 'transcription_failed' | 'ai_unavailable' | 'generation_failed';
  context?: unknown;
}

export interface StorageError extends Error {
  type: 'write_failed' | 'read_failed' | 'corruption_detected' | 'migration_failed';
  operation?: string;
}