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
The application has evolved from a basic MainWindow implementation to an integrated optimized architecture featuring:
- **Consolidated Design**: MainWindow now incorporates dedicated ServerManager, ResourceCache, and PerformanceMonitor classes
- **Performance Focus**: Built-in performance monitoring, resource caching, memory management, and operation profiling
- **Enhanced Reliability**: Advanced server lifecycle management with health monitoring, automatic recovery, and configurable timeouts
- **Resource Efficiency**: Intelligent dual caching systems, proactive memory optimization, and hit/miss ratio tracking

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
├── optimized_mainwindow.h   # Legacy optimized architecture (consolidated into mainwindow.h)
├── test_server.py          # Lightweight test server for development verification
├── test_server_simple.py   # Minimal test server for crash isolation and environment testing
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
- **Intelligent OCR Fallback**: Automatic fallback from optimized OCR to regular OCR processing ensures reliability with clear status feedback
- **Performance Optimizer Resilience**: OCR processing includes fallback implementations for performance optimization utilities, ensuring functionality even when optimization modules are unavailable
- **Enhanced Import System**: Improved Python path management prevents import failures across different environments
- Real-time progress updates via WebSocket
- **Enhanced Deck Management**: Improved deck saving with PathResolver integration, automatic path validation, and build directory detection prevention

### Current Architecture Status
- **Simplified Server Mode**: The application runs with a simplified architecture where optimization component initialization has been removed
- **Core Functionality**: All essential features (document processing, AI generation, deck creation) remain fully functional
- **Performance Features**: Advanced optimization modules (connection pooling, memory management, file caching) have been removed from server initialization to ensure stability
- **Future Enhancement**: Optimization features may be re-implemented in future releases with improved stability

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

- **[Test Server](docs/TEST_SERVER.md)**: Lightweight test server for development verification and basic testing
- **[Current Server State](docs/CURRENT_SERVER_STATE.md)**: Current status of the backend server and temporarily disabled features
- **[API Endpoints](docs/API_ENDPOINTS.md)**: Complete API reference including performance monitoring endpoints
- **[Processing Workflow](docs/PROCESSING_WORKFLOW.md)**: Detailed documentation of the document processing pipeline
- **[PathResolver System](docs/PATH_RESOLVER.md)**: Comprehensive guide to the centralized path management system
- **[Performance Optimizations](docs/PERFORMANCE_OPTIMIZATIONS.md)**: Comprehensive performance optimization systems (currently disabled for stability)
- **[Connection Pool Optimization](docs/CONNECTION_POOL_OPTIMIZATION.md)**: Advanced HTTP connection pooling documentation (features currently disabled)
- **[Optimized Architecture](docs/OPTIMIZED_ARCHITECTURE.md)**: Integrated MainWindow architecture with performance monitoring and resource management
- **[MainWindow Enhancements](docs/MAINWINDOW_ENHANCEMENTS.md)**: Recent MainWindow improvements including enhanced user feedback and graceful shutdown
- **[Architecture Consolidation](docs/ARCHITECTURE_CONSOLIDATION.md)**: Recent architectural consolidation and MainWindow integration details
- **[Recent Changes](docs/RECENT_CHANGES.md)**: Latest updates including OCR performance optimizer fallbacks, enhanced import system with improved user feedback and OCR fallback mechanism
- **[OCR Fallback Enhancements](docs/OCR_FALLBACK_ENHANCEMENTS.md)**: Comprehensive documentation of OCR processing fallback mechanisms and performance optimizer resilience
- **[Build Environment Handling](docs/BUILD_ENVIRONMENT.md)**: Working directory management and build environment support
- **[Build Testing System](docs/BUILD_TESTING.md)**: Comprehensive build verification and testing infrastructure
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

### Test Server Setup
For basic testing and development verification, multiple test servers are available:

#### Lightweight Test Server
```bash
python test_server.py
```

#### Simple Test Server (Minimal)
```bash
python test_server_simple.py
```

The test servers provide:
- **test_server.py**: Basic health check endpoint at `/` and test endpoint at `/test`
- **test_server_simple.py**: Minimal FastAPI setup for isolating environment issues
- Minimal FastAPI setup for development testing
- Different ports to avoid conflicts (8000 and 8001)

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

#### Test Servers
```bash
python test_server.py                             # Lightweight test server for basic verification
python test_server_simple.py                      # Minimal test server for environment isolation
```

#### Build Tests
```bash
python test_build.py                              # Complete build verification suite
```

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

**Build tests verify**:
- CMake configuration and build process
- Qt application compilation and executable generation
- Backend Python dependencies availability
- Complete build environment validation
- Automatic cleanup of test artifacts

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
