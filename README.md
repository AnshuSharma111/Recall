# Recall
Recall is an app built for students to improve their learning process by using flashcards to memorize their notes. The basic crust of Recall is:

“Upload your notes to Recall and have it auto-generate high-quality flashcards for you automatically using AI”

The key features of Recall include:
1.	Smart AI powered flash card generation
2.	Robust support for all types of PDFs (scanned, handwritten, text)
3.	Handles Latex and mathematical equations
4.	Generates high-quality questions
5.	Does not hallucinate; uses your PDF to generate cards.

## Architecture

Recall consists of two main components with an evolving optimized architecture:

### Frontend (Qt/C++)
- **Main Application**: Built with Qt framework for cross-platform desktop support featuring consolidated optimized architecture
- **Integrated Architecture**: MainWindow includes advanced performance monitoring, resource management, and server lifecycle management
- **Server Management**: Dedicated ServerManager class with health monitoring, automatic recovery, and configurable timeouts
- **Resource Caching**: High-performance ResourceCache with dual caching system leveraging Qt's QPixmapCache for images and animations
- **Performance Monitoring**: Comprehensive PerformanceMonitor with operation profiling, memory usage tracking, and network monitoring
- **Deck Management**: Create, view, and manage flashcard decks with user feedback
- **File Upload**: Drag-and-drop interface for PDF and image uploads
- **Real-time Progress**: WebSocket-based progress tracking during processing
- **State Management**: Robust dialog state management system with proper UI control handling and error recovery
- **Build Environment Support**: Automatic working directory detection and correction for Python server execution
- **Enhanced Shutdown**: Comprehensive application shutdown with visual feedback, animation support, graceful server termination, and debug logging
- **UI Framework**: Enhanced with QFrame components for improved layout and visual organization
- **Note**: Frontend optimizations remain active while backend optimizations are temporarily disabled

### Backend (Python)
- **FastAPI Server**: RESTful API with WebSocket support for real-time communication
- **Document Processing Pipeline**: Multi-stage processing using PaddleOCR for layout detection and text extraction
- **Robust OCR System**: Intelligent fallback mechanism from optimized OCR to regular OCR processing with graceful error handling, clear user feedback, and performance optimizer fallbacks
- **Enhanced Import Management**: Improved Python path resolution for reliable module imports across different environments
- **Centralized Path Management**: PathResolver utility integrated throughout the server for consistent file handling across development and build environments
- **Basic File Operations**: Essential file handling utilities for document processing and deck management
- **AI Integration**: Groq API integration for intelligent flashcard generation
- **Simplified Architecture**: Optimization component initialization has been removed to ensure stable basic server functionality

## File Structure

```
recall/
├── backend/                    # Python backend server (basic mode)
│   ├── file_processing/       # Document processing modules
│   ├── utils/                 # Utility modules including PathResolver (optimization components removed)
│   ├── server.py             # Main FastAPI server (simplified architecture)
│   └── requirements.txt      # Python dependencies
├── decks/                    # Generated flashcard decks (JSON)
├── static/                   # Static assets
│   └── images/              # Processed images from documents
├── to_process/              # Temporary processing directory
├── docs/                    # Documentation
├── *.cpp, *.h              # Qt frontend source files
├── mainwindow.h            # Main window with integrated performance monitoring and optimization
├── CMakeLists.txt          # Build configuration
└── README.md
```

# Goals
*	**Smart, Local-First Study Assistant**
    * Runs primarily on the desktop (Qt/Python).
    * Emphasis on privacy, offline-first workflow, and performance.
*	**Optimized for Heavy Study Domains**
    * Especially useful for subjects with dense material or repetition (medicine, law, STEM, languages).
    * Handles scanned notes and math-heavy content gracefully.
*	**Rich Flashcard Generation**
    * Beyond simple Q&A: supports cloze deletions, true/false, multiple-choice, and timed recall cards.
    * Cards tailored to the content and keywords, not generic.
*   **Structured Output, Not Freeform**
    * Everything is formatted into study-ready decks.
    * Focus on active recall and spaced repetition, not chatty AI responses.
*	**Quality Questions**
    * Produces quality cards instead of shallow questions.

# Non-Goals
*	Chatbot functionality – we won’t provide freeform Q&A or conversational tutoring.
*	Note-taking features – Not replacing Obsidian, Notion, or OneNote.
*	General PDF reader – We’re not aiming to be a reading interface.
*	Plain Anki clone – No manual flashcard creation as the core workflow.
*	Broad AI assistant – Focused only on study material: flashcards, not on scheduling, writing help, etc.
