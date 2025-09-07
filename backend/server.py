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
from fastapi import File, UploadFile, FastAPI, Depends, HTTPException, status, Header, WebSocket
from fastapi.staticfiles import StaticFiles
from utils.file_operations import ensure_dir, cleanup_processing_dir, copy_file, merge_json_files, manage_flashcards, safe_move_images

# Create a module-level flag file to track initialization in the logs directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
logs_dir = os.path.join(backend_dir, "logs")
# Ensure logs directory exists using our utility function
ensure_dir(logs_dir)
_INIT_FLAG_FILE = os.path.join(logs_dir, ".initialized")

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
    
    # Ensure necessary directories exist
    upload_dir = './to_process'
    decks_dir = './decks'
    images_dir = './static/images'  # Permanent storage for images used in flashcards

    # Use our utility function for directory creation
    ensure_dir(upload_dir)
    ensure_dir(decks_dir)
    ensure_dir(images_dir)
    
    if logger is not None:
        logger.info(f"Ensured directories exist: {upload_dir}, {decks_dir}, {images_dir}")
    
    yield
    # post
    # recursively delete files in the to_process directory, but preserve any images that may be referenced
    # in existing flashcards or have been moved to the static images directory
    if os.path.exists(upload_dir):
        # Use our utility function to clean up processing directory while preserving important subdirectories
        keep_subdirs = ["questions", "images"]
        # This is a general cleanup without a specific deck_id
        cleanup_result = cleanup_processing_dir(upload_dir, keep_subdirs, deck_id=None)
        
        if cleanup_result and logger is not None:
            logger.info("Cleaned up temporary processing files")
        elif not cleanup_result and logger is not None:
            logger.warning("Error cleaning up processing directory")
    
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

# WebSocket management
current_ws: Optional[WebSocket] = None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    '''
    Client opens a websocket connection and server reciprocates
    '''
    global current_ws
    await websocket.accept()
    current_ws = websocket
    if logger is not None:
        logger.info("WebSocket connection accepted from client.")
    try:
        while True:
            await websocket.receive_text()  # To implement: ignore or handle messages
    except Exception as e:
        if logger is not None:
            logger.warning(f"WebSocket closed: {e}")
    finally:
        current_ws = None
        if logger is not None:
            logger.info("WebSocket connection closed.")

async def send_ws(message: str):
    global current_ws
    if current_ws:
        try:
            await current_ws.send_text(message)
            if logger is not None:
                logger.info(f"Sent WebSocket message: {message}")
        except Exception as e:
            if logger is not None:
                logger.error(f"WebSocket send error: {e}")
            current_ws = None

# Load environment variables if available
try:
    load_dotenv()
except Exception as e:
    if logger is not None:
        logger.warning(f"Error loading .env file: {e}")

api_keys = os.getenv("API_KEYS", "")
keys = [k.strip() for k in api_keys.split(",") if k.strip()]

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

@app.post('/api/create_deck', dependencies=[Depends(api_key_auth)])
async def create_deck(deck_title: str, files: List[UploadFile] = File(...)):
    '''
    Accepts one or more PDF/image files as input, starts a background job, returns job_id
    
    Parameters:
    - deck_title: The title for the flashcard deck
    - files: One or more PDF/image files to process
    '''
    global current_ws
    
    if logger is not None:
        logger.info(f"POST /api/create_deck called with deck_title: '{deck_title}' and {len(files)} files.")

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

    await send_ws("Verifying Files")
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

    await send_ws("Verification Complete")
    if logger is not None:
        logger.info("File verification complete.")

    # Save files for processing
    try:
        upload_dir = './to_process'
        # Use our utility function to ensure directory exists
        ensure_dir(upload_dir)
        saved_files = []
        for file in files:
            file_path = os.path.join(upload_dir, str(file.filename))
            # Write the file
            with open(file_path, "wb") as f:
                f.write(await file.read())
            saved_files.append(file_path)
            if logger is not None:
                logger.info(f"Saved file: {file_path}")
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

    await send_ws("Saved Files")
    if logger is not None:
        logger.info("All files saved.")

    # Start processing: Convert all pdfs to images and save to a dir with a subfolder per PDF
    for file in saved_files:
        if file.endswith(".pdf"):
            if logger is not None:
                logger.info(f"Converting PDF to images: {file}")
            # we know pdf_to_img is a callable function here
            if pdf_to_img:
                # Each PDF will be saved to its own subfolder within ./to_process/
                pdf_to_img(file, './to_process')
            else:
                # This shouldn't happen because of the earlier check, but just to be safe
                if logger is not None:
                    logger.error("PDF to image conversion function not available")
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
            img_output_dir = os.path.join('./to_process', img_name, 'images')
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

    await send_ws("Converted PDFs to Images")
    if logger is not None:
        logger.info("PDF conversion complete.")

    # Now process all images with chunking
    if chunk_files:
        if logger is not None:
            logger.info("Starting image chunking process")
        try:
            await send_ws("Processing images with PaddleOCR for layout detection")
            
            # Log what's in the to_process directory
            to_process_dir = './to_process'
            if os.path.exists(to_process_dir):
                doc_dirs = [d for d in os.listdir(to_process_dir) 
                          if os.path.isdir(os.path.join(to_process_dir, d))]
                if logger is not None:
                    logger.info(f"Found {len(doc_dirs)} document directories in {to_process_dir}: {doc_dirs}")
                
                for doc_dir in doc_dirs:
                    doc_path = os.path.join(to_process_dir, doc_dir)
                    images_dir = os.path.join(doc_path, 'images')
                    if os.path.exists(images_dir):
                        images = [f for f in os.listdir(images_dir) 
                                if os.path.isfile(os.path.join(images_dir, f))]
                        if logger is not None:
                            logger.info(f"Document {doc_dir} has {len(images)} images: {images}")
            else:
                if logger is not None:
                    logger.warning(f"Directory {to_process_dir} does not exist!")
            
            # Process all documents in the to_process directory
            chunk_files('./to_process')
            await send_ws("Layout detection complete")
            if logger is not None:
                logger.info("Image chunking completed successfully")
            
            # Proceed with OCR processing after chunking
            if process_document_dir:
                if logger is not None:
                    logger.info("Starting OCR processing of detected elements")
                await send_ws("Extracting text and formulas from detected elements")
                try:
                    # Process the chunks with OCR
                    process_document_dir('./to_process')
                    await send_ws("OCR processing complete")
                    if logger is not None:
                        logger.info("OCR processing completed successfully")
                    
                    # Generate questions from the OCR results if the module is available
                    if process_document_questions:
                        if logger is not None:
                            logger.info(f"Starting question generation from OCR results with deck title: '{deck_title}'")
                        await send_ws("Generating questions from extracted text")
                        try:
                            # Pass the deck title to the question generation function
                            # Make sure to use the user-provided deck title
                            question_results = process_document_questions('./to_process', deck_name=deck_title)
                            
                            # Check if we have unified deck info
                            if "unified_deck" in question_results:
                                deck_info = question_results["unified_deck"]
                                # Log both the requested title and the actual title used
                                if logger is not None:
                                    logger.info(f"Requested deck title: '{deck_title}', actual deck title: '{deck_info['deck_name']}'")
                                await send_ws(f"Question generation complete - Created deck '{deck_info['deck_name']}' with {deck_info['question_count']} questions")
                                if logger is not None:
                                    logger.info(f"Question generation completed successfully with deck ID {deck_info['deck_id']}")
                            else:
                                # Fallback to old counting method
                                question_count = sum(len(files) for key, files in question_results.items() if isinstance(files, list))
                                await send_ws(f"Question generation complete - Created {question_count} sets of questions")
                                if logger is not None:
                                    logger.info(f"Question generation completed successfully with {question_count} sets of questions")
                            
                            # Use our utility function for cleanup
                            try:
                                # Clean up source files but keep questions directory
                                # Get the deck_id from the results if available
                                deck_id = question_results.get("unified_deck", {}).get("deck_id")
                                
                                # Pass the deck_id to organize images by deck
                                cleanup_result = cleanup_processing_dir('./to_process', ["questions", "images"], deck_id=deck_id)
                                
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
                            await send_ws(f"Error during question generation: {str(e)}")
                            # We don't raise an exception here, just log the error and continue
                            # This allows the process to continue even if question generation fails
                    else:
                        if logger is not None:
                            logger.warning("Question generation function not available, skipping question generation step")
                        await send_ws("Skipping question generation (module not available)")
                except Exception as e:
                    if logger is not None:
                        logger.error(f"Error during OCR processing: {str(e)}")
                    await send_ws(f"Error during OCR processing: {str(e)}")
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
                await send_ws("Skipping OCR processing (module not available)")
                
        except Exception as e:
            if logger is not None:
                logger.error(f"Error during image chunking: {str(e)}")
            await send_ws(f"Error processing images: {str(e)}")
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
    
    # Add deck ID from local variables if it exists
    # Need to use locals() since question_results may not be defined
    if "question_results" in locals() and isinstance(locals()["question_results"], dict):
        question_results = locals()["question_results"]
        if "unified_deck" in question_results:
            deck_info = question_results["unified_deck"]
            response_data["deck_id"] = deck_info["deck_id"]
            response_data["question_count"] = deck_info["question_count"]
        
    return response_data

@app.get('/api/deck/{deck_id}', dependencies=[Depends(api_key_auth)])
async def get_deck(deck_id: str):
    '''
    Retrieves the flashcard deck for the given ID
    '''
    if logger is not None:
        logger.info(f"GET /api/deck/{deck_id} called.")
    
    # Look for the deck file in the decks directory
    deck_path = f"./decks/{deck_id}.json"
    
    if not os.path.exists(deck_path):
        if logger is not None:
            logger.error(f"Deck not found: {deck_id}")
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
    img_path = f"./static/images/{image_name}"
    
    if not os.path.exists(img_path):
        if logger is not None:
            logger.error(f"Image not found: {image_name}")
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