# Import the utils module first to ensure logger is configured
import sys
import os
# Add the parent directory to sys.path to make sure utils is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_logger
# Get logger for this module
logger = get_logger()

# Import the module functions
from .chunking import chunk_files
from .pdf_to_img import pdf_to_img

# Import OCR processing function
try:
    from .ocr import process_document_dir
    logger.debug("OCR module imported successfully") #type: ignore
except ImportError as e:
    logger.error(f"Error importing OCR module: {e}") #type: ignore
    process_document_dir = None # type: ignore

# Import question generation function
try:
    from .question_gen import process_document_questions
    logger.debug("Question generation module imported successfully") #type: ignore
except ImportError as e:
    logger.error(f"Error importing question generation module: {e}") #type: ignore
    process_document_questions = None # type: ignore

# Import deck manager functions
try:
    from .deck_manager import generate_unique_deck_id, create_unified_deck, save_deck_to_file, cleanup_processing_directory
    logger.debug("Deck manager module imported successfully") #type: ignore
except ImportError as e:
    logger.error(f"Error importing deck manager module: {e}") #type: ignore
    generate_unique_deck_id = None # type: ignore
    create_unified_deck = None # type: ignore
    save_deck_to_file = None # type: ignore
    cleanup_processing_directory = None # type: ignore

logger.debug("file_processing module initialized") #type: ignore