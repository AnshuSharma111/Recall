import asyncio
import logging
import os
import sys

from typing import List, Callable
from dotenv import load_dotenv

import uvicorn
from contextlib import asynccontextmanager
from fastapi import File, UploadFile, FastAPI, Depends, HTTPException, status, Header, WebSocket

# Create a module-level flag file to track initialization
_INIT_FLAG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".initialized")

# Function to check if this is the first run
def is_first_run():
    if not os.path.exists(_INIT_FLAG_FILE):
        # Create the flag file
        with open(_INIT_FLAG_FILE, 'w') as f:
            f.write("initialized")
        return True
    return False

# Critical Imports
logger: logging.Logger = None # type: ignore
pdf_to_img: Callable
chunk_files: Callable

# Check if this is the first run
first_run = is_first_run()

# Set up logging
try:
    from utils.logger_config import config_logger, get_logger
    # Initialize the logger once for the entire application
    config_logger()
    # Get the logger for this module
    logger = get_logger() #type: ignore
    
    # Only log on first initialization
    if first_run:
        logger.info("Logger imported successfully.")
except ImportError as e:
    logger = None # type: ignore
    sys.stderr.write(f"Error importing utils module: {e}\nShutting Down...")
    raise SystemExit(1) # 1 means failure

# Set up file processing
try:
    import file_processing
    pdf_to_img = file_processing.pdf_to_img
    chunk_files = file_processing.chunk_files
    
    # Only log this once
    if first_run:
        logger.info("File processing modules imported successfully.")
except ImportError as e:
    logger.error(f"Error importing file_processing module: {e}\nShutting Down...")
    sys.stderr.write(f"Error importing file_processing module: {e}\nShutting Down...")
    pdf_to_img = None # type: ignore
    chunk_files = None # type: ignore
    raise SystemExit(1)

# Pre and Post server operations
@asynccontextmanager
async def lifespan(app: FastAPI):
    # pre
    logger.info("Application startup (via lifespan manager)...")
    yield
    # post
    logger.info("Application shutdown...")

app = FastAPI(
    description= '''
Recall is an app built for students to improve their learning process by using 
flashcards to memorize their notes. The basic crust of Recall is: 
 
“Upload your notes to Recall and have it auto-generate high-quality flashcards for 
you automatically using AI” 
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
    logger.info("Health check endpoint called")
    return {
        "Status" : "Running"
    }

# # Job management
current_ws: WebSocket = None # type: ignore

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    '''
    Client opens a websocket connection and server reciprocates
    '''
    global current_ws
    await websocket.accept()
    current_ws = websocket
    logger.info("WebSocket connection accepted from client.")
    try:
        while True:
            await websocket.receive_text()  # To implement: ignore or handle messages
    except Exception as e:
        logger.warning(f"WebSocket closed: {e}")
    finally:
        current_ws = None # type: ignore
        logger.info("WebSocket connection closed.")

async def send_ws(message: str):
    global current_ws
    if current_ws:
        try:
            await current_ws.send_text(message)
            logger.info(f"Sent WebSocket message: {message}")
        except Exception as e:
            logger.error(f"WebSocket send error: {e}")
            current_ws = None # type: ignore

load_dotenv()
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
async def create_deck(files: List[UploadFile] = File(...)):
    '''
    Accepts one or more PDF/image files as input, starts a background job, returns job_id
    '''
    global current_ws
    logger.info(f"POST /api/create_deck called with {len(files)} files.")
    
    # verify file type (allowed: pdf, jpg, png)
    for file in files:
        if file.filename == "" or file.filename is None:
            logger.error("Invalid file name detected.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file name"
            )
        if not file.content_type in ["application/pdf", "image/jpeg", "image/png"]:
            logger.error(f"Invalid file type: {file.content_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {file.content_type}. Allowed types are: pdf, jpg, png"
            )
    await send_ws("Verification Complete")
    logger.info("File verification complete.")

    # Save files for processing
    upload_dir = './to_process'
    os.makedirs(upload_dir, exist_ok=True)
    saved_files = []
    for file in files:
        file_path = os.path.join(upload_dir, str(file.filename))
        with open(file_path, "wb") as f:
            f.write(await file.read())
        saved_files.append(file_path)
        logger.info(f"Saved file: {file_path}")

    await send_ws("Saved Files")
    logger.info("All files saved.")

    # Start processing : 1) Convert all pdfs to images and save to a dir. Leave images as is but store in common dir
    for file in saved_files:
        if file.endswith(".pdf"):
            logger.info(f"Converting PDF to images: {file}")
            # we know pdf_to_img is a callable function here
            if pdf_to_img:
                pdf_to_img(file, './to_process/images')
            else:
                # This shouldn't happen because of the earlier check, but just to be safe
                logger.error("PDF to image conversion function not available")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="PDF processing functionality is unavailable"
                )
        else:
            os.makedirs('./to_process/images', exist_ok=True)
            with open(os.path.join('./to_process/images', os.path.basename(file)), "wb") as f:
                f.write(open(file, "rb").read())
            logger.info(f"Copied image file: {file}")

    await send_ws("Converted PDFs to Images")
    logger.info("PDF conversion complete.")

    return {
        "files": [os.path.basename(f) for f in saved_files],
        "status": "Created Deck Succesfully"
    }

@app.get('/api/deck/{deck_id}', dependencies=[Depends(api_key_auth)])
async def get_deck(deck_id: str):
    '''
    Retrieves the flashcard deck for the given ID
    '''
    logger.info(f"GET /api/deck/{deck_id} called.")
    return {
        "Deck ID": deck_id,
        "Status": "Deck Retrieved"
    }

async def main():
    config = uvicorn.Config("server:app",
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
        logger.exception(f"Startup failed: {e}")
        raise SystemExit(1)