import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Callable, Dict, Any, Optional, Union

from dotenv import load_dotenv
import uvicorn
from fastapi import File, Form, UploadFile, FastAPI, Depends, HTTPException, status, Header
from fastapi.staticfiles import StaticFiles
from utils.file_operations import ensure_dir, cleanup_processing_dir, copy_file, merge_json_files, manage_flashcards, safe_move_images, cleanup_large_files, optimize_memory_usage
from utils.deck_migration import migrate_decks_from_build
from utils.path_resolver import PathResolver

# Load environment variables if available
try:
    load_dotenv()
except Exception as e:
    print(f"Error loading .env file: {e}")

# API Key authentication setup
api_keys = os.getenv("API_KEYS", "")
keys = [k.strip() for k in api_keys.split(",") if k.strip()]

# Initialize PathResolver for centralized path management
path_resolver = PathResolver()
path_config = path_resolver.get_config()

# Define absolute paths using PathResolver
APP_BASE_DIR = path_config.project_root
BACKEND_DIR = path_config.backend_dir
DECKS_DIR = path_config.decks_dir
PROCESSING_DIR = path_config.processing_dir
STATIC_DIR = path_config.static_dir
LOGS_DIR = path_config.logs_dir
IMAGES_DIR = path_config.images_dir

# Directories are automatically created by PathResolver during initialization

def api_key_auth(x_api_key: str = Header(..., alias="X-API-Key")):
    '''
    API Key Authentication Dependency using custom header
    '''
    if x_api_key not in keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    return {"API Key": x_api_key}

# Create a module-level flag file to track initialization in the logs directory
_INIT_FLAG_FILE = os.path.join(LOGS_DIR, ".initialized")

# Function to check if this is the first run
def is_first_run():
    if not os.path.exists(_INIT_FLAG_FILE):
        # Create the flag file
        with open(_INIT_FLAG_FILE, 'w') as f:
            f.write("initialized")
        return True
    return False

# Critical Imports
logger: Optional[logging.Logger] = None
pdf_to_img: Optional[Callable] = None
chunk_files: Optional[Callable] = None
process_document_dir: Optional[Callable] = None
process_document_questions: Optional[Callable] = None

# Check if this is the first run
first_run = is_first_run()

# Set up logging
try:
    from utils.logger_config import config_logger, get_logger
    # Initialize the logger once for the entire application
    config_logger()
    # Get the logger for this module
    logger = get_logger()
    
    # Only log on first initialization
    if first_run and logger is not None:
        logger.info("Logger imported successfully.")
except ImportError as e:
    # Set up a basic console logger if the custom logger fails
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    logger.error(f"Error importing utils module: {e}")
    sys.stderr.write(f"Error importing utils module: {e}\nShutting Down...")
    raise SystemExit(1)  # 1 means failure

# Set up file processing
try:
    import file_processing
    pdf_to_img = file_processing.pdf_to_img
    chunk_files = file_processing.chunk_files
    
    # Import OCR processing function
    try:
        from file_processing.ocr import process_document_dir
        if first_run and logger is not None:
            logger.info("OCR processing module imported successfully.")
    except ImportError as e:
        if logger is not None:
            logger.error(f"Error importing OCR module: {e}")
        process_document_dir = None
        
    # Import question generation function
    try:
        from file_processing.question_gen import process_document_questions
        if first_run and logger is not None:
            logger.info("Question generation module imported successfully.")
    except ImportError as e:
        if logger is not None:
            logger.error(f"Error importing question generation module: {e}")
        process_document_questions = None
    
    # Only log this once
    if first_run and logger is not None:
        logger.info("File processing modules imported successfully.")
except ImportError as e:
    if logger is not None:
        logger.error(f"Error importing file_processing module: {e}\nShutting Down...")
    sys.stderr.write(f"Error importing file_processing module: {e}\nShutting Down...")
    pdf_to_img = None
    chunk_files = None
    process_document_dir = None
    raise SystemExit(1)

# Pre and Post server operations
@asynccontextmanager
async def lifespan(app: FastAPI):
    # pre
    if logger is not None:
        logger.info("Application startup (via lifespan manager)...")
    
    # Log the resolved paths for verification
    if logger is not None:
        logger.info("=== PathResolver Configuration ===")
        logger.info(f"Project Root: {APP_BASE_DIR}")
        logger.info(f"Backend Directory: {BACKEND_DIR}")
        logger.info(f"Decks Directory: {DECKS_DIR}")
        logger.info(f"Processing Directory: {PROCESSING_DIR}")
        logger.info(f"Static Directory: {STATIC_DIR}")
        logger.info(f"Images Directory: {IMAGES_DIR}")
        logger.info(f"Logs Directory: {LOGS_DIR}")
        
        # Verify all paths are absolute
        paths_to_check = {
            "Project Root": APP_BASE_DIR,
            "Decks Directory": DECKS_DIR,
            "Processing Directory": PROCESSING_DIR,
            "Static Directory": STATIC_DIR,
            "Images Directory": IMAGES_DIR,
            "Logs Directory": LOGS_DIR
        }
        
        all_absolute = True
        for name, path in paths_to_check.items():
            if not os.path.isabs(path):
                logger.error(f"ERROR: {name} is not an absolute path: {path}")
                all_absolute = False
            else:
                logger.debug(f"✓ {name} is absolute: {path}")
        
        if all_absolute:
            logger.info("✓ All paths are absolute - path resolution successful")
        else:
            logger.error("✗ Some paths are not absolute - path resolution failed")
        
        logger.info("=== End PathResolver Configuration ===")
        
    # Migrate any decks from build directory to root decks directory
    try:
        migrated = migrate_decks_from_build(DECKS_DIR)
        if logger is not None and migrated > 0:
            logger.info(f"Successfully migrated {migrated} decks from build directory to {DECKS_DIR}")
    except Exception as e:
        if logger is not None:
            logger.error(f"Error migrating decks: {str(e)}")
    
    yield
    # post
    # recursively delete files in the to_process directory, but preserve any images that may be referenced
    # in existing flashcards or have been moved to the static images directory
    if os.path.exists(PROCESSING_DIR):
        # Use our utility function to clean up processing directory while preserving important subdirectories
        keep_subdirs = ["questions", "images"]
        # This is a general cleanup without a specific deck_id
        cleanup_result = cleanup_processing_dir(PROCESSING_DIR, keep_subdirs, deck_id=None)
        
        if cleanup_result and logger is not None:
            logger.info("Cleaned up temporary processing files")
        elif not cleanup_result and logger is not None:
            logger.warning("Error cleaning up processing directory")
        
        # Clean up large files to free disk space
        cleanup_large_files(PROCESSING_DIR, size_limit_mb=50)
    
    # Perform memory optimization on shutdown
    try:
        optimize_memory_usage()
    except Exception as e:
        if logger is not None:
            logger.warning(f"Error during memory optimization: {e}")
    
    if logger is not None:
        logger.info("Application shutdown...")

app = FastAPI(
    description= '''
Recall is an app built for students to improve their learning process by using 
flashcards to memorize their notes. The basic crust of Recall is: 
 
"Upload your notes to Recall and have it auto-generate high-quality flashcards for 
you automatically using AI" 
    ''',
    version="0.1.0",
    title="Recall",
    lifespan=lifespan
)

# Mount static files directory with absolute path
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get('/')
def health_check():
    '''
    Health Check Endpoint
    '''
    if logger is not None:
        logger.info("Health check endpoint called")
    return {
        "Status": "Running"
    }

# Status tracking for deck processing
processing_status: Dict[str, Dict[str, str]] = {}

# Endpoint to check deck processing status
@app.get("/api/deck/{deck_id}/status", dependencies=[Depends(api_key_auth)])
def check_deck_status(deck_id: str):
    """
    Check the processing status of a deck
    """
    global processing_status
    
    if logger is not None:
        logger.info(f"GET /api/deck/{deck_id}/status called.")
    
    # Check if the deck exists as a completed deck first
    deck_path = os.path.join(DECKS_DIR, f"{deck_id}.json")
    
    # If deck file exists, processing is complete
    if os.path.exists(deck_path):
        # Clean up the processing status since deck is complete
        if deck_id in processing_status:
            del processing_status[deck_id]
            if logger is not None:
                logger.info(f"Cleaned up processing status for completed deck {deck_id}")
        
        return {
            "status": "complete",
            "message": "Deck processing complete"
        }
    
    # If we're tracking the status, return it
    if deck_id in processing_status:
        status_info = processing_status[deck_id]
        if logger is not None:
            logger.debug(f"Returning status for deck {deck_id}: {status_info}")
        return status_info
    
    # Otherwise, return unknown status
    if logger is not None:
        logger.warning(f"No processing status found for deck {deck_id}")
    return {"status": "unknown", "message": "Unknown deck ID"}

# Function to update deck processing status
def update_deck_status(deck_id: str, status: str, message: str):
    """
    Update the status of a deck being processed
    """
    global processing_status
    processing_status[deck_id] = {
        "status": status,
        "message": message
    }
    if logger is not None:
        logger.info(f"Updated status for deck {deck_id}: {status} - {message}")

async def send_ws(message: str, deck_id: Optional[str] = None, status_type: str = "processing"):
    """
    Send status update with detailed progress information
    
    Parameters:
    - message: The status message
    - deck_id: The ID of the deck being processed
    - status_type: The type of status (processing, complete, failed)
    """
    # Update the status for the specific deck if deck_id is provided
    if deck_id:
        # Always update the status, even if not already in the dictionary
        update_deck_status(deck_id, status_type, message)
    
    if logger is not None:
        logger.info(f"Processing status update: {deck_id} - {status_type} - {message}")

# Environment variables already loaded at the top of the file

@app.post('/api/create_deck', dependencies=[Depends(api_key_auth)])
async def create_deck(deck_title: str = Form(...), files: List[UploadFile] = File(...)):
    '''
    Accepts one or more PDF/image files as input, starts a background job, returns job_id
    
    Parameters:
    - deck_title: The title for the flashcard deck
    - files: One or more PDF/image files to process
    '''
    # Generate a unique deck_id
    import uuid
    deck_id = str(uuid.uuid4())
    
    if logger is not None:
        logger.info(f"POST /api/create_deck called with deck_title: '{deck_title}' and {len(files)} files.")
        logger.info(f"Generated deck_id: {deck_id}")

    # Initialize the processing status for this deck
    update_deck_status(deck_id, "processing", "Starting file verification")
    
    if len(files) == 0:
        if logger is not None:
            logger.error("No files uploaded.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": 10,
                "message": "No files uploaded",
                "source": "N/A"
            }
        )

    await send_ws("Verifying Files", deck_id)
    if logger is not None:
        logger.info("Verifying uploaded files...")

    # Remove debugging print statement
    # for file in files:
    #     print(file.filename)

    for file in files:
        if file.filename == "" or file.filename is None:
            if logger is not None:
                logger.error("Invalid file name detected.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": 11,
                    "message": "Invalid file name",
                    "source": f"{file.filename}"
                }
            )
        if not file.content_type in ["application/pdf", "image/jpeg", "image/png", "image/jpg"]:
            if logger is not None:
                logger.error(f"Invalid file type: {file.content_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": 12,
                    "message": "Invalid file type",
                    "source": f"{file.filename}"
                }
            )

    await send_ws("Verification Complete", deck_id)
    if logger is not None:
        logger.info("File verification complete.")

    # Save files for processing
    try:
        # Use our global processing directory
        ensure_dir(PROCESSING_DIR)
        saved_files = []
        for file in files:
            file_path = os.path.join(PROCESSING_DIR, str(file.filename))
            # Verify we're using absolute paths
            if logger is not None and not os.path.isabs(file_path):
                logger.warning(f"File path is not absolute: {file_path}")
            
            # Write the file
            with open(file_path, "wb") as f:
                f.write(await file.read())
            saved_files.append(file_path)
            if logger is not None:
                logger.info(f"Saved file to absolute path: {file_path}")
    except Exception as e:
        if logger is not None:
            logger.error(f"Error saving files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": 13,
                "message": "Error saving files",
                "source": str(e)
            }
        )

    await send_ws("Saved Files", deck_id)
    if logger is not None:
        logger.info("All files saved.")

    # Start processing: Convert all pdfs to images and save to a dir with a subfolder per PDF
    for file in saved_files:
        if file.endswith(".pdf"):
            if logger is not None:
                logger.info(f"Converting PDF to images: {file}")
            await send_ws(f"Converting PDF to images: {os.path.basename(file)}", deck_id)
            # we know pdf_to_img is a callable function here
            if pdf_to_img:
                # Each PDF will be saved to its own subfolder within ./to_process/
                pdf_to_img(file, PROCESSING_DIR)
            else:
                # This shouldn't happen because of the earlier check, but just to be safe
                if logger is not None:
                    logger.error("PDF to image conversion function not available")
                await send_ws("Error: PDF conversion module not available", deck_id, "failed")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "code": 14,
                        "message": "Pdf to Image module not loaded correctly",
                        "source": f"{file}"
                    }
                )
        else:
            # For image files, follow the same structure as PDFs - create a folder per image
            img_basename = os.path.basename(file)
            img_name = os.path.splitext(img_basename)[0]
            await send_ws(f"Processing image file: {img_basename}", deck_id)
            img_output_dir = os.path.join(PROCESSING_DIR, img_name, 'images')
            # Use our utility function to ensure directory exists
            ensure_dir(img_output_dir)
            
            # Save the image using our utility function
            img_output_path = os.path.join(img_output_dir, img_basename)
            try:
                # Copy the file with error handling
                copy_file(file, img_output_path)
                if logger is not None:
                    logger.info(f"Copied image file: {file} to {img_output_dir}")
                
                # Remove the original file from the to_process root to avoid confusion
                os.remove(file)
                if logger is not None:
                    logger.debug(f"Removed original file from upload directory: {file}")
            except Exception as e:
                if logger is not None:
                    logger.error(f"Error copying image file {file}: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "code": 15,
                        "message": "Error Copying IMG file",
                        "source": f"{file}"
                    }
                )

    await send_ws("Converted PDFs to Images", deck_id)
    if logger is not None:
        logger.info("PDF conversion complete.")

    # Now process all images with chunking
    if chunk_files:
        if logger is not None:
            logger.info("Starting image chunking process")
        try:
            await send_ws("Processing images with PaddleOCR for layout detection", deck_id)
            
            # Log what's in the to_process directory
            if os.path.exists(PROCESSING_DIR):
                doc_dirs = [d for d in os.listdir(PROCESSING_DIR) 
                          if os.path.isdir(os.path.join(PROCESSING_DIR, d))]
                if logger is not None:
                    logger.info(f"Found {len(doc_dirs)} document directories in {PROCESSING_DIR}: {doc_dirs}")
                
                for doc_dir in doc_dirs:
                    doc_path = os.path.join(PROCESSING_DIR, doc_dir)
                    images_dir = os.path.join(doc_path, 'images')
                    if os.path.exists(images_dir):
                        images = [f for f in os.listdir(images_dir) 
                                if os.path.isfile(os.path.join(images_dir, f))]
                        if logger is not None:
                            logger.info(f"Document {doc_dir} has {len(images)} images: {images}")
            else:
                if logger is not None:
                    logger.warning(f"Directory {PROCESSING_DIR} does not exist!")
            
            # Process all documents in the to_process directory
            await send_ws("Performing layout analysis and text chunking", deck_id)
            chunk_files(PROCESSING_DIR)
            await send_ws("Layout detection complete", deck_id)
            if logger is not None:
                logger.info("Image chunking completed successfully")
            
            # Proceed with OCR processing after chunking
            if process_document_dir:
                if logger is not None:
                    logger.info("Starting OCR processing of detected elements")
                await send_ws("Extracting text and formulas from detected elements", deck_id)
                try:
                    # Process the chunks with OCR
                    await send_ws(f"Running OCR on detected text chunks and formulas", deck_id)
                    process_document_dir(PROCESSING_DIR)
                    await send_ws("OCR text extraction complete", deck_id)
                    if logger is not None:
                        logger.info("OCR processing completed successfully")
                    
                    # Generate questions from the OCR results if the module is available
                    if process_document_questions:
                        if logger is not None:
                            logger.info(f"Starting question generation from OCR results with deck title: '{deck_title}'")
                        await send_ws("Generating questions from extracted text", deck_id)
                        try:
                            # Pass the deck title to the question generation function
                            # Make sure to use the user-provided deck title
                            await send_ws(f"Generating flashcard questions using AI for '{deck_title}'", deck_id)
                            question_results = process_document_questions(PROCESSING_DIR, deck_name=deck_title, deck_id=deck_id)
                            
                            # Check if we have unified deck info
                            if "unified_deck" in question_results:
                                deck_info = question_results["unified_deck"]
                                actual_deck_id = deck_info['deck_id']
                                # Log both the requested title and the actual title used
                                if logger is not None:
                                    logger.info(f"Requested deck title: '{deck_title}', actual deck title: '{deck_info['deck_name']}'")
                                    logger.info(f"Original deck_id: {deck_id}, actual deck_id: {actual_deck_id}")
                                
                                # Update status for BOTH deck IDs to handle UI polling
                                completion_message = f"Deck '{deck_info['deck_name']}' created with {deck_info['question_count']} questions"
                                await send_ws(f"Question generation complete - Created deck '{deck_info['deck_name']}' with {deck_info['question_count']} questions", deck_id, "complete")
                                
                                # Update status for the original deck_id (what UI is polling)
                                update_deck_status(deck_id, "complete", completion_message)
                                # Also update status for the actual deck_id (for consistency)
                                update_deck_status(actual_deck_id, "complete", completion_message)
                                
                                if logger is not None:
                                    logger.info(f"Question generation completed successfully with deck ID {actual_deck_id}")
                                    logger.info(f"Updated status for both deck IDs: {deck_id} and {actual_deck_id}")
                            else:
                                # Fallback to old counting method
                                question_count = sum(len(files) for key, files in question_results.items() if isinstance(files, list))
                                await send_ws(f"Question generation complete - Created {question_count} sets of questions", deck_id, "complete")
                                if logger is not None:
                                    logger.info(f"Question generation completed successfully with {question_count} sets of questions")
                                # Mark processing as complete with the original deck_id since we don't have a new one
                                update_deck_status(deck_id, "complete", f"Deck created with {question_count} questions")
                            
                            # Use our utility function for cleanup
                            try:
                                # Clean up source files but keep questions directory
                                # Get the deck_id from the results if available
                                deck_id = question_results.get("unified_deck", {}).get("deck_id")
                                
                                # Pass the deck_id to organize images by deck
                                await send_ws("Cleaning up temporary files and finalizing deck", deck_id)
                                cleanup_result = cleanup_processing_dir(PROCESSING_DIR, ["questions", "images"], deck_id=deck_id)
                                
                                # Also clean up large temporary files
                                cleanup_large_files(PROCESSING_DIR, size_limit_mb=50)
                                
                                # Optimize memory usage after processing
                                optimize_memory_usage()
                                
                                if cleanup_result and logger is not None:
                                    if deck_id:
                                        logger.info(f"Cleaned up source files after processing for deck {deck_id}")
                                    else:
                                        logger.info("Cleaned up source files after processing")
                                elif not cleanup_result and logger is not None:
                                    logger.warning("Error cleaning up processing directory")
                            except Exception as e:
                                if logger is not None:
                                    logger.warning(f"Error during cleanup: {str(e)}")
                            
                        except Exception as e:
                            if logger is not None:
                                logger.error(f"Error during question generation: {str(e)}")
                            await send_ws(f"Error during question generation: {str(e)}", deck_id, "failed")
                            # Mark the processing as failed
                            update_deck_status(deck_id, "failed", f"Error during question generation: {str(e)}")
                            # We don't raise an exception here, just log the error and continue
                            # This allows the process to continue even if question generation fails
                    else:
                        if logger is not None:
                            logger.warning("Question generation function not available, skipping question generation step")
                        await send_ws("Skipping question generation (module not available)", deck_id)
                except Exception as e:
                    if logger is not None:
                        logger.error(f"Error during OCR processing: {str(e)}")
                    await send_ws(f"Error during OCR processing: {str(e)}", deck_id, "failed")
                    # Mark the processing as failed
                    update_deck_status(deck_id, "failed", f"Error during OCR processing: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail={
                            "code": 18,
                            "message": "Error during OCR processing",
                            "source": str(e)
                        }
                    )
            else:
                if logger is not None:
                    logger.warning("OCR processing function not available, skipping OCR step")
                await send_ws("Skipping OCR processing (module not available)", deck_id)
                
        except Exception as e:
            if logger is not None:
                logger.error(f"Error during image chunking: {str(e)}")
            await send_ws(f"Error processing images: {str(e)}", deck_id, "failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": 16,
                    "message": "Error during image chunking",
                    "source": str(e)
                }
            )
    else:
        if logger is not None:
            logger.error("Image chunking function not available")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": 17,
                "message": "Chunking module not loaded correctly",
                "source": "N/A"
            }
        )

    # Construct response with deck ID if available
    response_data = {
        "files": [os.path.basename(f) for f in saved_files],
        "status": "Created Deck Successfully",
        "deck_title": deck_title
    }
    
    # Generate a deck ID if not available from question generation
    import uuid
    deck_id = str(uuid.uuid4())
    
    # Add deck ID from local variables if it exists
    # Need to use locals() since question_results may not be defined
    if "question_results" in locals() and isinstance(locals()["question_results"], dict):
        question_results = locals()["question_results"]
        if "unified_deck" in question_results:
            deck_info = question_results["unified_deck"]
            deck_id = deck_info["deck_id"]
            response_data["deck_id"] = deck_id
            response_data["question_count"] = deck_info["question_count"]
    else:
        response_data["deck_id"] = deck_id
    
    # We need to leave the processing status as "processing" until the actual processing is complete
    # The status will be updated by subsequent processing steps
    update_deck_status(deck_id, "processing", "Processing has started, waiting for completion")
        
    return response_data

@app.get('/api/deck/{deck_id}', dependencies=[Depends(api_key_auth)])
async def get_deck(deck_id: str):
    '''
    Retrieves the flashcard deck for the given ID
    '''
    if logger is not None:
        logger.info(f"GET /api/deck/{deck_id} called.")
    
    # Look for the deck file in the decks directory
    deck_path = os.path.join(DECKS_DIR, f"{deck_id}.json")
    
    if logger is not None:
        logger.debug(f"Looking for deck at absolute path: {deck_path}")
    
    if not os.path.exists(deck_path):
        if logger is not None:
            logger.error(f"Deck not found at path: {deck_path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": 20,
                "message": "Deck not found",
                "source": deck_id
            }
        )
    
    try:
        # Use our utility function to retrieve the deck
        success, result = manage_flashcards(deck_path, 'get')
        
        if not success or not result:
            if logger is not None:
                logger.error(f"Error retrieving deck: {deck_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": 21,
                    "message": "Error retrieving deck",
                    "source": deck_id
                }
            )
            
        return result
        
    except Exception as e:
        if logger is not None:
            logger.error(f"Error reading deck file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": 21,
                "message": "Error reading deck file",
                "source": str(e)
            }
        )
            
@app.get('/api/deck/{deck_id}/status', dependencies=[Depends(api_key_auth)])
async def get_deck_processing_status(deck_id: str):
    '''
    Retrieves the processing status for a specific deck
    '''
    global processing_status
    
    if logger is not None:
        logger.info(f"GET /api/deck/{deck_id}/status called.")
    
    # Check if the deck exists as a completed deck first
    deck_path = os.path.join(DECKS_DIR, f"{deck_id}.json")
    
    # If deck file exists, processing is complete
    if os.path.exists(deck_path):
        return {
            "status": "Complete",
            "message": "Deck processing complete"
        }
    
    # If we're tracking the status, return it
    if deck_id in processing_status:
        # Return the status info directly from the dict
        return processing_status[deck_id]
        
    # Otherwise, return not found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": 22,
            "message": "No processing status found for this deck",
            "source": deck_id
        }
    )

@app.get('/api/image/{image_name}', dependencies=[Depends(api_key_auth)])
async def get_image(image_name: str):
    '''
    Retrieves an image used in a flashcard deck
    '''
    if logger is not None:
        logger.info(f"GET /api/image/{image_name} called.")
    
    # Look for the image in the static images directory
    # This endpoint allows backward compatibility for older deck files that
    # might have direct image paths stored
    img_path = os.path.join(IMAGES_DIR, image_name)
    
    if logger is not None:
        logger.debug(f"Looking for image at absolute path: {img_path}")
    
    if not os.path.exists(img_path):
        if logger is not None:
            logger.error(f"Image not found at path: {img_path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": 30,
                "message": "Image not found",
                "source": image_name
            }
        )
    
    # Return the image file path
    # The StaticFiles mount at /static will serve the actual image
    return {"image_url": f"/static/images/{image_name}"}

@app.get('/api/decks', dependencies=[Depends(api_key_auth)])
async def get_all_decks():
    '''
    Retrieves metadata for all available flashcard decks
    '''
    if logger is not None:
        logger.info("GET /api/decks called - retrieving all deck metadata.")
    
    # Use our predefined constant for deck directory to ensure consistency
    decks_dir = DECKS_DIR
    
    # Check if decks directory exists
    if not os.path.exists(decks_dir):
        if logger is not None:
            logger.warning("Decks directory does not exist.")
        # Return empty list instead of error to handle case of no decks yet
        return {"decks": []}
    
    try:
        # Get all JSON files in the decks directory
        deck_files = [f for f in os.listdir(decks_dir) if f.endswith('.json')]
        
        if logger is not None:
            logger.info(f"Found {len(deck_files)} deck files.")
        
        all_decks = []
        for deck_file in deck_files:
            deck_path = os.path.join(decks_dir, deck_file)
            try:
                # More efficiently read just the metadata section instead of the full deck
                # This is especially important for large decks with many questions
                with open(deck_path, 'r', encoding='utf-8') as f:
                    # Attempt to read just the first part of the file to extract metadata
                    # Most JSON libraries don't support partial reading, so we'll read a fixed chunk
                    file_start = f.read(8192)  # Read first 8KB which should contain metadata
                    
                    # Find the metadata section in the partial JSON
                    metadata_start = file_start.find('"metadata"')
                    if metadata_start > 0:
                        # Try to find the end of the metadata section
                        # This is a bit hacky but avoids parsing the entire file
                        bracket_level = 0
                        in_metadata = False
                        metadata_json = ""
                        
                        for i in range(metadata_start, len(file_start)):
                            char = file_start[i]
                            
                            if char == '{':
                                bracket_level += 1
                                if not in_metadata and bracket_level == 1:
                                    in_metadata = True
                            elif char == '}':
                                bracket_level -= 1
                                if in_metadata and bracket_level == 0:
                                    metadata_json += '}'
                                    break
                            
                            if in_metadata:
                                metadata_json += char
                        
                        # If we couldn't extract metadata this way, fallback to full file read
                        if not metadata_json or bracket_level != 0:
                            f.seek(0)  # Reset file pointer to beginning
                            deck_data = json.load(f)
                            metadata_obj = deck_data.get("metadata", {})
                        else:
                            try:
                                # Try to parse the extracted metadata JSON
                                metadata_obj = json.loads("{" + metadata_json)
                            except json.JSONDecodeError:
                                # Fallback to reading the whole file if parsing fails
                                f.seek(0)  # Reset file pointer to beginning
                                deck_data = json.load(f)
                                metadata_obj = deck_data.get("metadata", {})
                    else:
                        # If we can't find metadata section in the first chunk, read the whole file
                        f.seek(0)  # Reset file pointer to beginning
                        deck_data = json.load(f)
                        metadata_obj = deck_data.get("metadata", {})
                
                # Extract deck_id from filename
                deck_id = os.path.splitext(deck_file)[0]  # Remove .json extension
                
                # Build metadata object with defaults for missing fields
                metadata = {
                    "deck_id": deck_id,
                    "title": metadata_obj.get("deck_name", "Untitled Deck"),  # Map from deck_name to title
                    "question_count": metadata_obj.get("question_count", 0),
                    "created_at": metadata_obj.get("created_at", ""),
                    "last_modified": metadata_obj.get("updated_at", "")  # Map from updated_at to last_modified
                }
                all_decks.append(metadata)
            except Exception as e:
                if logger is not None:
                    logger.warning(f"Error reading deck file {deck_file}: {str(e)}")
                # Skip problematic files rather than failing the entire request
        
        # Sort by creation date, newest first
        all_decks.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return {"decks": all_decks}
        
    except Exception as e:
        if logger is not None:
            logger.error(f"Error retrieving deck metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": 40,
                "message": "Error retrieving deck metadata",
                "source": str(e)
            }
        )

async def main():
    """
    Main entry point for the server
    """
    config = uvicorn.Config(
        "server:app",
        host="127.0.0.1", 
        port=8000,
        log_config=None,
        reload=False  # Disable reload to prevent duplicate imports
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        if logger is not None:
            logger.exception(f"Startup failed: {e}")
        else:
            sys.stderr.write(f"Startup failed: {e}\n")
        raise SystemExit(1)