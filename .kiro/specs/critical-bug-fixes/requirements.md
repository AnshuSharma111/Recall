# Critical Bug Fixes Requirements Document

## Introduction

This document outlines the critical bugs that need to be fixed in the Recall application. These bugs are preventing the application from functioning correctly and providing a good user experience. The issues primarily relate to file path management, UI state handling, and process completion detection.

## Requirements

### Requirement 1

**User Story:** As a user creating flashcard decks, I want my decks and associated files to be saved in the correct root directories, so that they are accessible and properly organized regardless of where the application is executed from.

#### Acceptance Criteria

1. WHEN a deck is created through the UI THEN the deck JSON file SHALL be saved to `{project_root}/decks/` directory
2. WHEN images are processed during deck creation THEN they SHALL be saved to `{project_root}/static/images/` directory
3. WHEN the application runs from the build directory THEN it SHALL still save files to the project root directories
4. WHEN determining file paths THEN the system SHALL use absolute paths based on the project root, not relative to the execution directory
5. IF the root directories don't exist THEN the system SHALL create them automatically

### Requirement 2

**User Story:** As a user, I want the create deck dialog to properly detect when deck creation is complete and close automatically, so that I don't get stuck in an infinite loading state.

#### Acceptance Criteria

1. WHEN deck creation is successfully completed THEN the create deck dialog SHALL automatically close and return to the main interface
2. WHEN the backend reports deck creation as "complete" THEN the UI SHALL detect this status change immediately
3. WHEN polling for deck status THEN the system SHALL properly handle all completion states ("complete", "failed", "error")
4. WHEN deck creation fails THEN the dialog SHALL show appropriate error messages and allow retry or cancellation
5. IF status polling fails THEN the system SHALL implement proper timeout and error handling

### Requirement 3

**User Story:** As a user, I want the create deck dialog interface to be properly disabled during processing and the background option to work correctly, so that I have a smooth user experience without crashes.

#### Acceptance Criteria

1. WHEN deck creation starts THEN all interactive elements (buttons, file list, title field) SHALL be disabled
2. WHEN processing is in progress THEN the "Create Deck" button SHALL be disabled and show processing state
3. WHEN the "Continue in background" prompt appears AND user selects "No" THEN the application SHALL handle this gracefully without crashing
4. WHEN processing completes THEN all UI elements SHALL be re-enabled appropriately
5. WHEN background processing is declined THEN the system SHALL properly cancel the operation and clean up resources

### Requirement 4

**User Story:** As a developer, I want proper path resolution throughout the application, so that file operations work consistently regardless of the execution context.

#### Acceptance Criteria

1. WHEN the application determines the base directory THEN it SHALL correctly identify the project root regardless of build vs development mode
2. WHEN creating directory paths THEN the system SHALL use a centralized path resolution function
3. WHEN the backend server starts THEN it SHALL log the resolved paths for verification
4. WHEN file operations occur THEN they SHALL use the resolved absolute paths consistently
5. IF path resolution fails THEN the system SHALL provide clear error messages and fallback behavior

### Requirement 5

**User Story:** As a user, I want proper error handling and recovery mechanisms, so that the application doesn't crash when I make normal user choices.

#### Acceptance Criteria

1. WHEN any dialog operation is cancelled THEN the application SHALL return to a stable state
2. WHEN network operations fail THEN the UI SHALL show appropriate error messages without crashing
3. WHEN background processing is declined THEN the system SHALL clean up any partial work
4. WHEN unexpected errors occur THEN the application SHALL log detailed information for debugging
5. IF the application encounters unrecoverable errors THEN it SHALL fail gracefully with user-friendly messages

### Requirement 6

**User Story:** As a user, I want visual feedback about the current state of deck creation, so that I understand what's happening and can make informed decisions.

#### Acceptance Criteria

1. WHEN deck creation starts THEN the progress bar SHALL show meaningful progress updates
2. WHEN different processing stages occur THEN the status label SHALL update with descriptive messages
3. WHEN processing takes a long time THEN the system SHALL offer the background processing option at appropriate intervals
4. WHEN errors occur THEN the UI SHALL clearly indicate the error state and provide actionable options
5. WHEN processing completes successfully THEN the UI SHALL show a clear success indication before closing

### Requirement 7

**User Story:** As a developer debugging issues, I want comprehensive logging of path resolution and file operations, so that I can quickly identify and fix path-related problems.

#### Acceptance Criteria

1. WHEN the application starts THEN it SHALL log all resolved directory paths
2. WHEN file operations occur THEN the system SHALL log source and destination paths
3. WHEN path resolution logic executes THEN it SHALL log the decision-making process
4. WHEN errors occur THEN the logs SHALL include full path information and context
5. WHEN debugging mode is enabled THEN additional path-related information SHALL be logged

### Requirement 8

**User Story:** As a user, I want the deck creation process to be robust and handle edge cases properly, so that I can reliably create decks without worrying about system state.

#### Acceptance Criteria

1. WHEN multiple deck creation attempts are made THEN the system SHALL handle concurrent operations safely
2. WHEN the application is closed during deck creation THEN partial work SHALL be cleaned up appropriately
3. WHEN disk space is low THEN the system SHALL detect this and provide appropriate warnings
4. WHEN file permissions prevent operations THEN the system SHALL provide clear error messages and suggestions
5. IF system resources are exhausted THEN the application SHALL degrade gracefully rather than crashing