"""
Optimized FastAPI server with performance enhancements.

This version includes:
- Async file handling
- Connection pooling
- Memory optimization
- Performance monitoring
- Caching mechanisms
"""

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
from fastapi import File, Form, UploadFile, FastAPI, Depends, HTTPException, status, Header, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Import optimization modules
from utils.performance_optimizer import (
    get_memory_manager, get_processing_pool, get_file_cache,
    performance_monitor, optimize_for_memory, get_performance_stats
)
from utils.async_file_handler import get_async_file_handler, get_streaming_upload_handler
from utils.connection_pool import get_network_optimizer
from utils.file_operations import ensure_dir, cleanup_processing_dir, copy_file, merge_json_files, manage_flashcards, safe_move_images, cleanup_large_files, optimize_memory_usage
from utils.deck_migration import migrate_decks_from_build
from utils.path_resolver import PathResolver

# Import optimized processing modules
from file_processing.optimized_ocr import process_document_dir_optimized

# Load environment variables
try:
    load_dotenv()
except Exception as e:
    print(f"Error loading .env file: {e}")

# API Key authentication setup
api_keys = os.getenv("API_KEYS", "")
keys = [k.strip() for k in api_keys.split(",") if k.strip()]

# Initialize PathResolver and optimization components
path_resolver = PathResolver()
path_config = path_resolver.get_config()
memory_manager = get_memory_manager()
processing_pool = get_processing_pool()
file_cache = get_file_cache()
async_file_handler = get_async_file_handler()
network_optimizer = get_network_optimizer()

# Define absolute paths using PathResolver
APP_BASE_DIR = path_config.project_root
BACKEND_DIR = path_config.backend_dir
DECKS_DIR = path_config.decks_dir
PROCESSING_DIR = path_config.processing_dir
STATIC_DIR = path_config.static_dir
LOGS_DIR = path_config.logs_dir
IMAGES_DIR = path_config.images_dir

def api_key_auth(x_api_key: str = Header(..., alias="X-API-Key")):
    """API Key Authentication Dependency using custom header"""
    if x_api_key not in keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    return {"API Key": x_api_key}

# Initialize flag file for first run detection
_INIT_FLAG_FILE = os.path.join(LOGS_DIR, ".initialized")

def is_first_run():
    """Check if this is the first run"""
    if not os.path.exists(_INIT_FLAG_FILE):
        with open(_INIT_FLAG_FILE, 'w') as f:
            f.write("initialized")
        return True
    return False

# Critical Imports with error handling
logger: Optional[logging.Logger] = None
pdf_to_img: Optional[Callable] = None
chunk_files: Optional[Callable] = None
process_document_dir: Optional[Callable] = None
process_document_questions: Optional[Callable] = None

first_run = is_first_run()

# Set up logging
try:
    from utils.logger_config import config_logger, get_logger
    config_logger()
    logger = get_logger()
    
    if first_run and logger is not None:
        logger.info("Optimized server starting up...")
        logger.info("Logger imported successfully.")
except ImportError as e:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    logger.error(f"Error importing utils module: {e}")
    sys.stderr.write(f"Error importing utils module: {e}\nShutting Down...")
    raise SystemExit(1)

# Set up file processing with optimization
try:
    import file_processing
    pdf_to_img = file_processing.pdf_to_img
    chunk_files = file_processing.chunk_files
    
    # Import OCR processing function (use optimized version)
    try:
        process_document_dir = process_document_dir_optimized
        if first_run and logger is not None:
            logger.info("Optimized OCR processing module loaded successfully.")
    except ImportError as e:
        if logger is not None:
            logger.error(f"Error importing optimized OCR module: {e}")
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

# Pre and Post server operations with optimizations
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if logger is not None:
        logger.info("Optimized application startup (via lifespan manager)...")
    
    # Log the resolved paths for verification
    if logger is not None:
        logger.info("=== Optimized PathResolver Configuration ===")
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
        
        logger.info("=== End Optimized PathResolver Configuration ===")
    
    # Initialize performance monitoring
    try:
        # Register cleanup callbacks
        memory_manager.register_cleanup_callback(lambda: file_cache._cleanup_if_needed())
        memory_manager.register_cleanup_callback(lambda: PathResolver.clear_cache())
        
        if logger is not None:
            logger.info("Performance optimization components initialized")
    except Exception as e:
        if logger is not None:
            logger.error(f"Error initializing performance components: {e}")
    
    # Migrate any decks from build directory to root decks directory
    try:
        migrated = migrate_decks_from_build(DECKS_DIR)
        if logger is not None and migrated > 0:
            logger.info(f"Successfully migrated {migrated} decks from build directory to {DECKS_DIR}")
    except Exception as e:
        if logger is not None:
            logger.error(f"Error migrating decks: {str(e)}")
    
    yield
    
    # Shutdown
    if logger is not None:
        logger.info("Optimized application shutdown...")
    
    # Cleanup processing directory
    if os.path.exists(PROCESSING_DIR):
        keep_subdirs = ["questions", "images"]
        cleanup_result = cleanup_processing_dir(PROCESSING_DIR, keep_subdirs, deck_id=None)
        
        if cleanup_result and logger is not None:
            logger.info("Cleaned up temporary processing files")
        elif not cleanup_result and logger is not None:
            logger.warning("Error cleaning up processing directory")
        
        cleanup_large_files(PROCESSING_DIR, size_limit_mb=50)
    
    # Perform optimized memory cleanup
    try:
        optimize_for_memory()
        if logger is not None:
            logger.info("Memory optimization completed during shutdown")
    except Exception as e:
        if logger is not None:
            logger.warning(f"Error during memory optimization: {e}")
    
    # Close network connections
    try:
        await network_optimizer.close_all_pools()
        if logger is not None:
            logger.info("Network connections closed")
    except Exception as e:
        if logger is not None:
            logger.warning(f"Error closing network connections: {e}")
    
    # Shutdown processing pool
    try:
        processing_pool.shutdown(wait=True)
        if logger is not None:
            logger.info("Processing pool shutdown completed")
    except Exception as e:
        if logger is not None:
            logger.warning(f"Error shutting down processing pool: {e}")

app = FastAPI(
    description='''
Optimized Recall - AI-powered flashcard generation with performance enhancements.

Features:
- Async file processing
- Memory optimization
- Connection pooling
- Performance monitoring
- Advanced caching
    ''',
    version="0.2.0",
    title="Recall (Optimized)",
    lifespan=lifespan
)

# Mount static files directory with absolute path
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get('/')
def health_check():
    """Health Check Endpoint with performance stats"""
    if logger is not None:
        logger.info("Health check endpoint called")
    
    # Get performance statistics
    perf_stats = get_performance_stats()
    network_health = network_optimizer.get_network_health()
    
    return {
        "Status": "Running",
        "Version": "0.2.0 (Optimized)",
        "Performance": perf_stats,
        "Network": network_health
    }

# Status tracking for deck processing (optimized with caching)
processing_status: Dict[str, Dict[str, str]] = {}

@app.get("/api/deck/{deck_id}/status", dependencies=[Depends(api_key_auth)])
def check_deck_status(deck_id: str):
    """Check the processing status of a deck (cached)"""
    global processing_status
    
    if logger is not None:
        logger.info(f"GET /api/deck/{deck_id}/status called.")
    
    # Check cache first
    cache_key = f"deck_status_{deck_id}"
    cached_status = file_cache.get_cached_result(cache_key)
    
    if cached_status is not None:
        return cached_status
    
    # Check if the deck exists as a completed deck first
    deck_path = os.path.join(DECKS_DIR, f"{deck_id}.json")
    
    if os.path.exists(deck_path):
        if deck_id in processing_status:
            del processing_status[deck_id]
            if logger is not None:
                logger.info(f"Cleaned up processing status for completed deck {deck_id}")
        
        result = {
            "status": "complete",
            "message": "Deck processing complete"
        }
        
        # Cache the result for a short time
        file_cache.cache_result(cache_key, result)
        return result
    
    # If we're tracking the status, return it
    if deck_id in processing_status:
        status_info = processing_status[deck_id]
        if logger is not None:
            logger.debug(f"Returning status for deck {deck_id}: {status_info}")
        
        # Cache active status for a very short time
        file_cache.cache_result(cache_key, status_info)
        return status_info
    
    # Otherwise, return unknown status
    if logger is not None:
        logger.warning(f"No processing status found for deck {deck_id}")
    
    result = {"status": "unknown", "message": "Unknown deck ID"}
    file_cache.cache_result(cache_key, result)
    return result

def update_deck_status(deck_id: str, status: str, message: str):
    """Update the status of a deck being processed"""
    global processing_status
    processing_status[deck_id] = {
        "status": status,
        "message": message
    }
    
    # Invalidate cache
    cache_key = f"deck_status_{deck_id}"
    file_cache._remove_cache_entry(cache_key)
    
    if logger is not None:
        logger.info(f"Updated status for deck {deck_id}: {status} - {message}")

async def send_ws(message: str, deck_id: Optional[str] = None, status_type: str = "processing"):
    """Send status update with detailed progress information"""
    if deck_id:
        update_deck_status(deck_id, status_type, message)
    
    if logger is not None:
        logger.info(f"Processing status update: {deck_id} - {status_type} - {message}")

@app.post('/api/create_deck_optimized', dependencies=[Depends(api_key_auth)])
async def create_deck_optimized(
    background_tasks: BackgroundTasks,
    deck_title: str = Form(...), 
    files: List[UploadFile] = File(...)
):
    """
    Optimized deck creation endpoint with async processing.
    
    Parameters:
    - deck_title: The title for the flashcard deck
    - files: One or more PDF/image files to process
    """
    import uuid
    deck_id = str(uuid.uuid4())
    
    if logger is not None:
        logger.info(f"POST /api/create_deck_optimized called with deck_title: '{deck_title}' and {len(files)} files.")
        logger.info(f"Generated deck_id: {deck_id}")

    # Initialize the processing status for this deck
    update_deck_status(deck_id, "processing", "Starting optimized file verification")
    
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

    await send_ws("Verifying Files (Optimized)", deck_id)
    if logger is not None:
        logger.info("Verifying uploaded files with optimization...")

    # Optimized file validation
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

    await send_ws("Verification Complete (Optimized)", deck_id)
    
    # Start background processing
    background_tasks.add_task(
        process_deck_async, 
        deck_id, 
        deck_title, 
        files
    )
    
    return {
        "deck_id": deck_id,
        "status": "processing",
        "message": "Deck creation started with optimized processing",
        "files": [file.filename for file in files]
    }

@performance_monitor
async def process_deck_async(deck_id: str, deck_title: str, files: List[UploadFile]):
    """Async deck processing with optimizations."""
    try:
        await send_ws("Starting optimized file processing", deck_id)
        
        # Save files using async file handler
        ensure_dir(PROCESSING_DIR)
        saved_files = []
        
        for file in files:
            file_path = os.path.join(PROCESSING_DIR, str(file.filename))
            
            # Use async file operations
            async def file_data_generator():
                while True:
                    chunk = await file.read(8192)
                    if not chunk:
                        break
                    yield chunk
            
            upload_result = await async_file_handler.stream_upload(
                file_data_generator(),
                file_path,
                expected_size=None
            )
            
            if upload_result['success']:
                saved_files.append(file_path)
                if logger is not None:
                    logger.info(f"Async saved file: {file_path}")
            else:
                raise Exception(f"Failed to save file {file.filename}: {upload_result.get('error')}")

        await send_ws("Files saved with async I/O", deck_id)
        
        # Process PDFs to images
        for file in saved_files:
            if file.endswith(".pdf"):
                if logger is not None:
                    logger.info(f"Converting PDF to images: {file}")
                await send_ws(f"Converting PDF: {os.path.basename(file)}", deck_id)
                
                if pdf_to_img:
                    # Run CPU-intensive task in thread pool
                    future = processing_pool.submit_task(
                        f"pdf_convert_{deck_id}",
                        pdf_to_img,
                        file, 
                        PROCESSING_DIR
                    )
                    
                    # Wait for completion (could add timeout here)
                    while not future.done():
                        await asyncio.sleep(0.1)
                    
                    if future.exception():
                        raise future.exception()
                else:
                    raise Exception("PDF conversion module not available")
            else:
                # Handle image files
                img_basename = os.path.basename(file)
                img_name = os.path.splitext(img_basename)[0]
                await send_ws(f"Processing image: {img_basename}", deck_id)
                
                img_output_dir = os.path.join(PROCESSING_DIR, img_name, 'images')
                ensure_dir(img_output_dir)
                
                img_output_path = os.path.join(img_output_dir, img_basename)
                success = await async_file_handler.copy_file_async(file, img_output_path)
                
                if success:
                    os.remove(file)  # Remove original
                    if logger is not None:
                        logger.info(f"Async processed image: {img_basename}")
                else:
                    raise Exception(f"Failed to process image: {img_basename}")

        await send_ws("PDF conversion completed (optimized)", deck_id)
        
        # Chunking with optimization
        if chunk_files:
            await send_ws("Starting optimized layout detection", deck_id)
            
            # Run chunking in thread pool
            future = processing_pool.submit_task(
                f"chunking_{deck_id}",
                chunk_files,
                PROCESSING_DIR
            )
            
            while not future.done():
                await asyncio.sleep(0.1)
            
            if future.exception():
                raise future.exception()
            
            await send_ws("Layout detection completed (optimized)", deck_id)
            
            # OCR processing with optimization
            if process_document_dir:
                await send_ws("Starting optimized OCR processing", deck_id)
                
                # Use optimized OCR with parallel processing
                ocr_result = await asyncio.get_event_loop().run_in_executor(
                    None,  # Use default executor
                    process_document_dir,
                    PROCESSING_DIR,
                    4  # Max workers for OCR
                )
                
                if ocr_result.get('success', False):
                    await send_ws("OCR processing completed (optimized)", deck_id)
                    
                    # Question generation
                    if process_document_questions:
                        await send_ws("Generating questions with AI (optimized)", deck_id)
                        
                        question_results = await asyncio.get_event_loop().run_in_executor(
                            None,
                            process_document_questions,
                            PROCESSING_DIR,
                            deck_title,
                            deck_id
                        )
                        
                        if "unified_deck" in question_results:
                            deck_info = question_results["unified_deck"]
                            actual_deck_id = deck_info['deck_id']
                            
                            completion_message = f"Optimized deck '{deck_info['deck_name']}' created with {deck_info['question_count']} questions"
                            await send_ws(completion_message, deck_id, "complete")
                            
                            # Update status for both deck IDs
                            update_deck_status(deck_id, "complete", completion_message)
                            update_deck_status(actual_deck_id, "complete", completion_message)
                            
                            if logger is not None:
                                logger.info(f"Optimized processing completed for deck {actual_deck_id}")
                        else:
                            question_count = sum(len(files) for key, files in question_results.items() if isinstance(files, list))
                            completion_message = f"Optimized deck created with {question_count} questions"
                            await send_ws(completion_message, deck_id, "complete")
                            update_deck_status(deck_id, "complete", completion_message)
                        
                        # Cleanup with optimization
                        await send_ws("Optimized cleanup in progress", deck_id)
                        
                        cleanup_result = cleanup_processing_dir(PROCESSING_DIR, ["questions", "images"], deck_id=deck_id)
                        cleanup_large_files(PROCESSING_DIR, size_limit_mb=50)
                        
                        # Trigger memory optimization
                        optimize_for_memory()
                        
                        if logger is not None:
                            logger.info("Optimized cleanup and memory optimization completed")
                    
                    else:
                        await send_ws("Question generation not available", deck_id, "complete")
                        update_deck_status(deck_id, "complete", "OCR completed, question generation skipped")
                else:
                    raise Exception("OCR processing failed")
            else:
                await send_ws("OCR processing not available", deck_id, "complete")
                update_deck_status(deck_id, "complete", "Layout detection completed, OCR skipped")
        else:
            raise Exception("Chunking module not available")
    
    except Exception as e:
        error_message = f"Optimized processing failed: {str(e)}"
        await send_ws(error_message, deck_id, "failed")
        update_deck_status(deck_id, "failed", error_message)
        
        if logger is not None:
            logger.error(f"Optimized deck processing failed for {deck_id}: {e}")

# Keep original endpoint for backward compatibility
@app.post('/api/create_deck', dependencies=[Depends(api_key_auth)])
async def create_deck(deck_title: str = Form(...), files: List[UploadFile] = File(...)):
    """Original create deck endpoint (redirects to optimized version)"""
    return await create_deck_optimized(BackgroundTasks(), deck_title, files)

@app.get("/api/performance/stats")
async def get_performance_statistics():
    """Get detailed performance statistics"""
    perf_stats = get_performance_stats()
    network_health = network_optimizer.get_network_health()
    
    # Add cache statistics
    cache_stats = {
        'cache_entries': len(file_cache._cache_index),
        'cache_size_mb': sum(entry.get('size', 0) for entry in file_cache._cache_index.values()) / (1024 * 1024)
    }
    
    return {
        "performance": perf_stats,
        "network": network_health,
        "cache": cache_stats,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/performance/optimize")
async def trigger_optimization():
    """Manually trigger performance optimization"""
    try:
        success = optimize_for_memory()
        await network_optimizer.optimize_all_pools()
        
        return {
            "success": success,
            "message": "Performance optimization completed",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "message": "Performance optimization failed"
            }
        )

if __name__ == "__main__":
    uvicorn.run(
        "optimized_server:app",
        host="127.0.0.1",
        port=8000,
        reload=False,  # Disable reload for production
        workers=1,     # Single worker for now
        log_level="info"
    )