# Critical Bug Fixes Design Document

## Overview

This design document outlines the technical approach to fix the critical bugs in the Recall application. The fixes focus on proper path resolution, UI state management, process completion detection, and robust error handling.

## Architecture

### Path Resolution Architecture

The core issue is that the application uses different base directories depending on whether it's running in development or build mode. We need a centralized path resolution system that consistently points to the project root.

```
Current (Broken):
Build Mode: build/Desktop_Qt_6_x_x/decks/
Dev Mode: project_root/decks/

Desired (Fixed):
Both Modes: project_root/decks/
```

### UI State Management Architecture

The create deck dialog needs proper state management with clear transitions between states:

```
States: Idle -> Processing -> Complete/Error -> Idle
- Idle: All controls enabled
- Processing: Controls disabled, progress shown
- Complete: Success message, auto-close
- Error: Error message, retry options
```

## Components and Interfaces

### 1. Path Resolution Component

**Location:** `backend/utils/path_resolver.py` (new file)

**Interface:**
```python
class PathResolver:
    @staticmethod
    def get_project_root() -> str
    @staticmethod
    def get_decks_dir() -> str
    @staticmethod
    def get_static_dir() -> str
    @staticmethod
    def get_images_dir() -> str
    @staticmethod
    def resolve_path(relative_path: str) -> str
```

**Key Methods:**
- `get_project_root()`: Determines the actual project root regardless of execution context
- Path resolution logic that works for both development and build environments
- Centralized directory path management

### 2. Enhanced Server Path Configuration

**Location:** `backend/server.py` (modifications)

**Changes:**
- Replace current path logic with PathResolver
- Add comprehensive path logging on startup
- Ensure all file operations use resolved paths
- Add path validation and directory creation

### 3. UI State Manager Component

**Location:** `createdeckdialog.h/.cpp` (modifications)

**New State Management:**
```cpp
enum class DialogState {
    Idle,
    Processing,
    Complete,
    Error
};

class CreateDeckDialog {
private:
    DialogState currentState;
    void setState(DialogState newState);
    void updateUIForState();
    void enableControls(bool enabled);
};
```

### 4. Enhanced Status Polling System

**Location:** `createdeckdialog.cpp` (modifications)

**Improvements:**
- Better completion state detection
- Proper timeout handling
- Graceful error recovery
- Background processing option handling

## Data Models

### Path Configuration Model

```python
@dataclass
class PathConfig:
    project_root: str
    decks_dir: str
    static_dir: str
    images_dir: str
    processing_dir: str
    logs_dir: str
    
    def validate(self) -> bool:
        """Validate all paths exist or can be created"""
```

### Dialog State Model

```cpp
struct DialogState {
    bool isProcessing;
    bool canCancel;
    bool showProgress;
    QString statusMessage;
    int progressValue;
};
```

### Status Response Model

```python
@dataclass
class DeckStatus:
    deck_id: str
    status: str  # "processing", "complete", "failed", "error"
    message: str
    progress: int
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
```

## Error Handling

### 1. Path Resolution Errors

**Strategy:** Graceful fallback with clear error messages

```python
def get_project_root() -> str:
    try:
        # Primary method: Look for specific project markers
        current = os.path.abspath(__file__)
        while current != os.path.dirname(current):
            if os.path.exists(os.path.join(current, 'CMakeLists.txt')):
                return current
            current = os.path.dirname(current)
        
        # Fallback: Use environment variable or current directory
        return os.environ.get('RECALL_PROJECT_ROOT', os.getcwd())
    except Exception as e:
        logger.error(f"Path resolution failed: {e}")
        raise PathResolutionError(f"Cannot determine project root: {e}")
```

### 2. UI Error Handling

**Strategy:** Prevent crashes with proper state management

```cpp
void CreateDeckDialog::onStatusCheckFinished() {
    if (!statusReply) return;
    
    try {
        // Handle response
        if (statusReply->error() != QNetworkReply::NoError) {
            handleNetworkError(statusReply->error());
            return;
        }
        
        // Process status response
        processStatusResponse(statusReply->readAll());
        
    } catch (const std::exception& e) {
        handleUnexpectedError(QString::fromStdString(e.what()));
    }
}
```

### 3. Background Processing Handling

**Strategy:** Proper cleanup and state management

```cpp
void CreateDeckDialog::onBackgroundDeclined() {
    // Stop status polling
    stopStatusPolling();
    
    // Cancel network requests
    if (statusReply) {
        statusReply->abort();
        statusReply = nullptr;
    }
    
    // Reset UI state
    setState(DialogState::Idle);
    
    // Close dialog gracefully
    reject();
}
```

## Testing Strategy

### 1. Path Resolution Testing

**Test Cases:**
- Development environment path resolution
- Build environment path resolution
- Missing directory creation
- Permission error handling
- Invalid path scenarios

**Test Implementation:**
```python
def test_path_resolution_build_environment():
    # Mock build environment structure
    # Verify correct project root detection
    # Ensure paths point to project root, not build dir

def test_directory_creation():
    # Test automatic directory creation
    # Verify proper permissions
    # Handle creation failures
```

### 2. UI State Testing

**Test Cases:**
- State transitions during normal operation
- Error state handling
- Background processing decline
- Network timeout scenarios
- Concurrent operation handling

**Test Implementation:**
```cpp
void TestCreateDeckDialog::testStateTransitions() {
    // Test Idle -> Processing transition
    // Test Processing -> Complete transition
    // Test Processing -> Error transition
    // Verify UI updates for each state
}
```

### 3. Integration Testing

**Test Cases:**
- End-to-end deck creation with correct paths
- UI responsiveness during processing
- Error recovery scenarios
- Cross-platform path handling

## Implementation Plan

### Phase 1: Path Resolution Fix
1. Create `PathResolver` utility class
2. Update `server.py` to use centralized path resolution
3. Add comprehensive path logging
4. Test path resolution in both environments

### Phase 2: UI State Management
1. Implement dialog state management system
2. Add proper control enabling/disabling
3. Improve status polling logic
4. Add timeout and error handling

### Phase 3: Error Handling Enhancement
1. Implement graceful background processing decline
2. Add comprehensive error recovery
3. Improve user feedback and messaging
4. Add proper cleanup mechanisms

### Phase 4: Testing and Validation
1. Create comprehensive test suite
2. Test in both development and build environments
3. Validate all error scenarios
4. Performance and stability testing

## Security Considerations

### Path Traversal Prevention
- Validate all resolved paths are within expected directories
- Sanitize user-provided file names
- Prevent access to system directories

### Resource Management
- Proper cleanup of temporary files
- Memory management for large file operations
- Network request timeout and cancellation

## Performance Considerations

### Path Resolution Caching
- Cache resolved paths to avoid repeated calculations
- Invalidate cache when environment changes
- Minimize file system operations

### UI Responsiveness
- Asynchronous status polling
- Non-blocking UI updates
- Proper progress indication

## Monitoring and Logging

### Enhanced Logging
- Log all path resolution decisions
- Track UI state transitions
- Monitor error frequencies
- Performance metrics for file operations

### Debug Information
- Startup path configuration dump
- State transition logging
- Network request/response logging
- Error context preservation