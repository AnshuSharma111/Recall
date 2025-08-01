# Recall

AI-powered local flashcard generator with spaced repetition

## Overview

Recall is a local-first, privacy-focused flashcard application that transforms various content types (text, PDFs, images, audio) into structured flashcards using AI. The system emphasizes offline functionality, intelligent spaced repetition, and gamified learning experiences to enhance knowledge retention.

## Features

### 🎯 Core Functionality
- **Multi-format Input**: Support for text files, PDFs, images (OCR), and audio (transcription)
- **AI-Powered Generation**: Intelligent flashcard creation from content analysis
- **Spaced Repetition**: Optimized review scheduling based on performance
- **Local-First**: Complete offline functionality with local data storage

### 🎮 Gamification
- **Study Streaks**: Daily study tracking and streak maintenance
- **Challenges**: Timed quizzes and accuracy challenges
- **Achievements**: Milestone-based reward system
- **Progress Tracking**: Comprehensive statistics and insights

### 📚 Organization
- **Deck Management**: Topic-based card organization
- **Smart Search**: Keyword and content-based card discovery
- **Flexible Study Modes**: Review, timed, challenge, and quick practice modes

## Technology Stack

- **Frontend**: Electron + React + TypeScript
- **Database**: SQLite with better-sqlite3
- **AI Processing**: Local LLM integration (Ollama/LM Studio)
- **OCR**: Tesseract.js for image text extraction
- **Speech Recognition**: OpenAI Whisper (local deployment)
- **Build Tools**: Vite, ESLint, Vitest

## Project Structure

```
recall/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── interfaces/      # Core interface definitions
│   ├── database/        # Database layer and repositories
│   ├── test/           # Test files
│   └── App.tsx         # Main React application
├── electron/           # Electron main process
├── .kiro/             # Kiro IDE specifications
└── docs/              # Documentation
```

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd recall
```

2. Install dependencies:
```bash
npm install
```

3. Run tests:
```bash
npm test
```

4. Start development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Implementation Status

### ✅ Completed Tasks

#### Task 1: Project Foundation
- [x] Electron + React + TypeScript setup
- [x] Build tools and testing framework configuration
- [x] Core TypeScript interfaces and types
- [x] ESLint and code quality setup

#### Task 2: Database Layer
- [x] SQLite database with comprehensive schema
- [x] Repository pattern implementation
- [x] CRUD operations for all entities
- [x] Database connection management
- [x] Unit tests for database functionality

### 🚧 In Progress
- Task 3: Core data models and validation

### 📋 Planned Features
- Content processing pipeline (text, image, audio)
- AI-powered flashcard generation
- Spaced repetition algorithm
- Study interface and gamification
- OCR and speech recognition integration

## Database Schema

The application uses SQLite with the following core tables:
- `decks` - Flashcard deck organization
- `cards` - Individual flashcard storage
- `card_statistics` - Spaced repetition tracking
- `study_sessions` - Study session management
- `study_responses` - Response tracking
- `user_statistics` - Global progress tracking
- `achievements` - Gamification system

## Testing

The project includes comprehensive testing:
- Unit tests for database operations
- Repository pattern validation
- Type system verification
- Integration tests for core workflows

Run tests with:
```bash
npm test
```

## Contributing

This project follows a spec-driven development approach using Kiro IDE. All features are planned and documented in the `.kiro/specs/` directory.

## Privacy & Security

- **Local-First**: All data stays on your device
- **No Cloud Dependencies**: Complete offline functionality
- **Open Source**: Transparent and auditable codebase

## License

MIT License - see LICENSE file for details

## Roadmap

See the implementation plan in `.kiro/specs/flashcard-generator/tasks.md` for detailed development roadmap and current progress.