# Recall - AI-Powered Flashcard Generator

Recall is a dual-component application that generates AI-powered flashcards from PDF documents. It consists of a Qt/C++ desktop application and a Python FastAPI backend server for document processing.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### System Dependencies Installation
- Install system packages:
  ```bash
  sudo apt update
  sudo apt install -y qt6-base-dev qt6-tools-dev cmake build-essential poppler-utils
  ```
  - Installation takes 2-3 minutes. NEVER CANCEL.

### Backend Setup (Python FastAPI Server)
- Navigate to backend directory: `cd backend`
- Install Python dependencies: `pip3 install -r requirements.txt`
  - Installation takes 3-5 minutes. NEVER CANCEL. Set timeout to 10+ minutes.
  - Key dependencies: fastapi, uvicorn, paddleocr, paddlepaddle, pdf2image, python-multipart
- Start the server: `python3 -m uvicorn server:app --host 0.0.0.0 --port 8000`
  - Server starts in 1-2 seconds
  - Health check: `curl http://localhost:8000/` should return `{"Status":"Running"}`
  - API docs available at: `http://localhost:8000/docs`

### Frontend Setup (Qt/C++ Desktop Application)
- Create build directory: `mkdir -p build && cd build`
- Configure with CMake: `cmake ..`
  - Configuration takes 1-2 seconds
- Build the application: `make`
  - Build takes 3-4 seconds. NEVER CANCEL. Set timeout to 5+ minutes.
- Executable created: `./Recall`
  - Requires X11 display to run (will fail in headless environments)

## Validation Scenarios

### Backend Server Validation
- ALWAYS run these tests after making backend changes:
  1. Start server: `cd backend && python3 -m uvicorn server:app --host 0.0.0.0 --port 8000`
  2. Test health endpoint: `curl -s http://localhost:8000/` should return `{"Status":"Running"}`
  3. Test API docs: `curl -s http://localhost:8000/docs` should return HTML
  4. Stop server with Ctrl+C

### Qt Application Validation
- ALWAYS run these tests after making Qt changes:
  1. Clean rebuild: `rm -rf build && mkdir build && cd build`
  2. Configure: `cmake ..`
  3. Build: `make`
  4. Verify executable exists: `ls -la Recall`

### Complete Functionality Test
- Test file upload functionality:
  1. Start backend server
  2. Create test API key in `.env`: `API_KEYS=test123`
  3. Test file upload endpoint with: `curl -X POST -H "X-API-Key: test123" -F "files=@test.pdf" http://localhost:8000/api/create_deck`

## Important Known Issues

### PaddleOCR Model Loading
- **CRITICAL**: PaddleOCR attempts to download models on import, which fails without internet access
- **WORKAROUND**: In sandboxed environments, temporarily comment out chunking imports in:
  - `backend/file_processing/__init__.py`: Comment out `from .chunking import chunk_files`
  - `backend/server.py`: Remove `chunking` from the import line
- **PRODUCTION**: Ensure internet access for initial model download (models are cached locally after first download)

### Build Dependencies
- Qt6 packages required: `qt6-base-dev qt6-tools-dev`
- PDF processing requires: `poppler-utils` (for pdf2image)
- All installations use `apt` and take 2-5 minutes total. NEVER CANCEL.

## Project Structure

### Backend Components (`backend/`)
- `server.py`: FastAPI application with file upload, WebSocket, and API key authentication
- `file_processing/pdf_to_img.py`: PDF to image conversion using pdf2image
- `file_processing/chunking.py`: Layout detection using PaddleOCR (requires internet for first run)
- `.env`: Configuration file for API keys
- `requirements.txt`: Python dependencies

### Frontend Components (Root directory)
- `main.cpp`: Qt application entry point
- `mainwindow.cpp/.h`: Main window implementation (minimal)
- `CMakeLists.txt`: CMake build configuration

### Key Configuration Files
- `CMakeLists.txt`: Qt6-based build system, targets C++17
- `backend/requirements.txt`: Complete Python dependency list
- `backend/.env`: API key configuration (format: `API_KEYS=key1,key2,key3`)

## Common Tasks Reference

### Backend Development
- Always test imports before running: `python3 -c "import fastapi, uvicorn, pdf2image; print('OK')"`
- Log files created at: `backend/server.log`
- Uploaded files stored in: `backend/to_process/`
- Image outputs stored in: `backend/to_process/images/`

### Qt Development  
- Uses Qt6 Widgets module
- Build artifacts in: `build/` directory
- Clean build command: `rm -rf build && mkdir build && cd build && cmake .. && make`

## Timing Expectations
- System package installation: 2-3 minutes. NEVER CANCEL.
- Python dependencies installation: 3-5 minutes. NEVER CANCEL. Set timeout to 10+ minutes.
- Backend server startup: 1-2 seconds
- Qt CMake configuration: 1-2 seconds
- Qt compilation: 3-4 seconds. NEVER CANCEL. Set timeout to 5+ minutes.
- Complete rebuild cycle: 6-10 minutes total. NEVER CANCEL.

## Pre-commit Validation
- Always run both backend and frontend builds before committing
- Test server startup and health check
- Verify Qt application compiles successfully
- No linting tools configured - code style follows existing patterns