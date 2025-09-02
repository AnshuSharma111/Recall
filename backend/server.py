from fastapi import File, UploadFile, FastAPI, Depends, HTTPException, status, Header, WebSocket
from typing import List
from dotenv import load_dotenv
import os
import logging

# Try to import file_processing modules, handle missing dependencies gracefully
try:
    from file_processing import chunking, pdf_to_img
    FILE_PROCESSING_AVAILABLE = True
except ImportError as e:
    FILE_PROCESSING_AVAILABLE = False
    # We'll log this error after logging is configured

# Configure logging
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_path, mode='a'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
logger.info("=== Server starting ===")  # server start

# Log file processing module availability
if not FILE_PROCESSING_AVAILABLE:
    logger.error("File processing modules not available. Missing dependencies: paddleocr, pdf2image")
    logger.warning("Some endpoints may not function properly without file processing capabilities")
else:
    logger.info("File processing modules loaded successfully")

app = FastAPI(
    description= '''
Recall is an app built for students to improve their learning process by using 
flashcards to memorize their notes. The basic crust of Recall is: 
 
“Upload your notes to Recall and have it auto-generate high-quality flashcards for 
you automatically using AI” 
    ''',
    version="0.1.0"
)

# Job management
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

@app.get('/')
def health_check():
    '''
    Health Check Endpoint
    '''
    return {
        "Status" : "Running"
    }

@app.post('/api/create_deck', dependencies=[Depends(api_key_auth)])
async def create_deck(files: List[UploadFile] = File(...)):
    '''
    Accepts one or more PDF/image files as input, starts a background job, returns job_id
    '''
    global current_ws
    logger.info(f"POST /api/create_deck called with {len(files)} files.")
    
    # Check if file processing is available
    if not FILE_PROCESSING_AVAILABLE:
        logger.error("Cannot process files: file processing modules not available")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File processing is not available. Missing required dependencies."
        )
    
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
            pdf_to_img(file, './to_process/images')
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