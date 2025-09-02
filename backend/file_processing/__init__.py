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

logger.debug("file_processing module initialized") #type: ignore