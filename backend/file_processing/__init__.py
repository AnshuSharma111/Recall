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

logger.debug("file_processing module initialized") #type: ignore