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

### Architectural Evolution
The application has evolved from a basic MainWindow implementation to an advanced OptimizedMainWindow architecture featuring:
- **Modular Design**: Separated concerns with dedicated ServerManager, ResourceCache, and PerformanceMonitor classes
- **Performance Focus**: Built-in performance monitoring, resource caching, and memory management
- **Enhanced Reliability**: Advanced server lifecycle management with health monitoring and automatic recovery
- **Resource Efficiency**: Intelligent caching systems and proactive memory optimization

### Frontend (Qt/C++)
- **Main Application**: Built with Qt framework for cross-platform desktop support
- **Optimized Architecture**: New OptimizedMainWindow with advanced performance monitoring and resource management
- **Server Management**: Dedicated ServerManager class with health monitoring and automatic recovery
- **Resource Caching**: Intelligent caching system for images and animations with configurable size limits
- **Performance Monitoring**: Real-time performance tracking with memory usage monitoring and operation profiling
- **Deck Management**: Create, view, and manage flashcard decks
- **File Upload**: Drag-and-drop interface for PDF and image uploads
- **Real-time Progress**: WebSocket-based progress tracking during processing
- **State Management**: Robust dialog state management system with proper UI control handling
- **Build Environment Support**: Automatic working directory detection and correction for Python server execution in build environments

### Backend (Python)
- **FastAPI Server**: RESTful API with WebSocket support for real-time communication
- **Document Processing Pipeline**: Multi-stage processing using PaddleOCR for layout detection and text extraction
- **Centralized Path Management**: PathResolver utility integrated throughout the server for consistent file handling across development and build environments
- **Performance Optimization**: Comprehensive performance optimizer with memory management, file caching, and parallel processing capabilities
- **Connection Pool Optimization**: Advanced HTTP connection pooling with adaptive timeouts, request batching, and network performance monitoring
- **AI Integration**: Groq API integration for intelligent flashcard generation

## File Structure

```
recall/
├── backend/                    # Python backend server
│   ├── file_processing/       # Document processing modules
│   ├── utils/                 # Utility modules including PathResolver and PerformanceOptimizer
│   ├── server.py             # Main FastAPI server
│   └── requirements.txt      # Python dependencies
├── decks/                    # Generated flashcard decks (JSON)
├── static/                   # Static assets
│   └── images/              # Processed images from documents
├── to_process/              # Temporary processing directory
├── docs/                    # Documentation
├── *.cpp, *.h              # Qt frontend source files
├── optimized_mainwindow.h   # Optimized main window with performance monitoring
├── CMakeLists.txt          # Build configuration
└── README.md
```

## Key Features

### PathResolver System
The application uses a centralized PathResolver utility that is integrated throughout the backend:
- Automatically detects project root in both development and build environments
- Ensures consistent file paths across all components with absolute path resolution
- Creates necessary directories automatically during server startup
- Provides security validation for file operations
- Supports both singleton pattern and convenience functions
- **Performance Optimized**: Thread-safe caching with 5-minute TTL for fast repeated access
- **Thread Safety**: Reentrant locks enable safe concurrent access across multiple threads
- Comprehensive startup logging for path verification and debugging
- **Integration Status**: Fully integrated in backend server and core file processing modules (question_gen.py, image_utils.py, deck_manager.py with enhanced fallback handling, ocr.py)
- **Testing**: Automated integration tests verify PathResolver functionality across all modules

### Robust File Processing
- Handles PDFs, images, and scanned documents
- Multi-stage processing pipeline with layout detection
- OCR with formula recognition for mathematical content
- Real-time progress updates via WebSocket
- **Enhanced Deck Management**: Improved deck saving with PathResolver integration, automatic path validation, and build directory detection prevention

### Advanced Network Optimization
- **Optimized Connection Pooling**: HTTP connection reuse with configurable limits and automatic cleanup
- **Adaptive Timeout Management**: Dynamic timeout adjustment based on historical response times using 95th percentile analysis
- **Request Batching**: Efficient batching of multiple requests for improved throughput and reduced overhead
- **Performance Monitoring**: Comprehensive network performance tracking with success rates, response times, and bandwidth monitoring
- **Intelligent Retry Logic**: Exponential backoff retry mechanisms with status code-based retry decisions
- **Network Health Monitoring**: Real-time network health assessment with error rate tracking and status reporting

### Dialog State Management System
- **DialogState Enum**: Four distinct states (Idle, Processing, Complete, Error) for proper UI flow control
- **State-Driven UI Updates**: Automatic enabling/disabling of controls based on current processing state
- **Error Recovery**: Graceful handling of processing failures with appropriate user feedback
- **Background Processing Support**: Proper state management for long-running operations

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

## Documentation

- **[Processing Workflow](docs/PROCESSING_WORKFLOW.md)**: Detailed documentation of the document processing pipeline
- **[PathResolver System](docs/PATH_RESOLVER.md)**: Comprehensive guide to the centralized path management system
- **[Performance Optimizations](docs/PERFORMANCE_OPTIMIZATIONS.md)**: Comprehensive performance optimization systems including caching, memory management, and parallel processing
- **[Connection Pool Optimization](docs/CONNECTION_POOL_OPTIMIZATION.md)**: Advanced HTTP connection pooling, adaptive timeouts, request batching, and network performance monitoring
- **[Optimized Architecture](docs/OPTIMIZED_ARCHITECTURE.md)**: Advanced OptimizedMainWindow architecture with performance monitoring and resource management
- **[Build Environment Handling](docs/BUILD_ENVIRONMENT.md)**: Working directory management and build environment support
- **[UI State Management](docs/UI_STATE_MANAGEMENT.md)**: Dialog state management system for robust UI behavior
- **[Deck Manager Enhancements](docs/DECK_MANAGER_ENHANCEMENTS.md)**: Enhanced deck management with PathResolver integration
- **[Testing](docs/TESTING.md)**: Comprehensive testing documentation and guidelines
- **[Design Document](docs/DESIGN_DOC_RECALL_v1.pdf)**: Complete application design and architecture

## Development Setup

### Prerequisites
- Qt development environment (Qt Creator recommended)
- Python 3.8+ with pip
- CMake for building the Qt frontend

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python server.py
```

### Frontend Setup
```bash
mkdir build
cd build
cmake ..
make
```

### Path Configuration
The application uses an intelligent PathResolver system that automatically detects the project root and configures all file paths. No manual path configuration is required - the system works in both development and build environments.

#### Build Environment Handling
The Qt frontend automatically detects when running from a build directory and sets the Python server's working directory to the project root. This ensures:
- Python server runs from the correct location regardless of build configuration
- PathResolver can properly detect project structure
- File operations use consistent paths across development and build environments
- Automatic navigation from build subdirectories (e.g., `build/Desktop_Qt_6_9_0_MinGW_64_bit-Debug`) to project root

### Testing
The application includes comprehensive testing infrastructure:

#### UI Tests
```bash
cd tests
mkdir build && cd build
cmake .. && cmake --build .
./test_createdeckdialog                           # CreateDeckDialog UI tests

# Or use Python test runner
python tests/run_ui_tests.py                      # Automated UI test execution
```

#### PathResolver Unit Tests
```bash
cd backend/tests
python test_path_resolver.py                      # Comprehensive unit tests
python test_path_resolver_simple.py               # Simplified unit tests
```

#### Integration Tests
```bash
python test_path_integration.py                   # PathResolver integration testing
cd backend/tests
python test_deck_creation_integration.py          # Deck creation integration testing
```

**UI tests verify**:
- Dialog state management and transitions (Idle, Processing, Complete, Error)
- UI control enabling/disabling during different processing states
- Progress indication and status updates
- Error handling and recovery mechanisms
- User input validation (title, file selection)
- Background processing decline scenarios
- Network error handling and timeout scenarios

**Unit tests verify**:
- PathResolver functionality in different environments (development, build)
- Singleton pattern implementation
- Path resolution algorithms and fallback mechanisms
- Directory creation and security validation
- Error handling and edge cases

**Integration tests verify**:
- PathResolver import and initialization
- Integration status across all file processing modules
- Path resolution workflows and directory creation
- Fallback handling for modules with optional PathResolver support
- Complete deck creation workflows with proper path resolution
- File saving to correct directories in different environments
- Error handling and data validation in deck creation process

#### Current Integration Status
- ✅ **UI Testing**: Comprehensive CreateDeckDialog tests with Qt Test framework
- ✅ **Backend Server**: Fully integrated with comprehensive startup logging
- ✅ **Core File Processing**: Integrated in question_gen.py, image_utils.py, deck_manager.py, ocr.py
- ⏳ **Remaining Modules**: pdf_to_img.py, chunking.py pending integration
- ⏳ **Frontend Integration**: Planned for future release
- ✅ **Testing**: Automated integration tests available
