import os
import json
import uuid
import logging
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional

# Set up basic logging
logger = logging.getLogger(__name__)

# Import PathResolver for centralized path management
try:
    from utils.path_resolver import PathResolver
    path_resolver = PathResolver()
    path_config = path_resolver.get_config()
except ImportError:
    logger.error("PathResolver not available - using fallback paths")
    path_resolver = None
    path_config = None

# Import image utilities
try:
    from .image_utils import update_question_image_paths
except ImportError:
    # Define a fallback if the module is not available
    def update_question_image_paths(questions, deck_id=None):
        logger.warning("Image utils module not available, image paths won't be updated")
        return questions

def generate_unique_deck_id() -> str:
    """Generate a unique ID for a deck"""
    return str(uuid.uuid4())

def validate_question_data(data: Any) -> List[Dict[str, Any]]:
    """
    Validate and extract actual question objects from various data formats
    
    Args:
        data: Question data in various formats
        
    Returns:
        List of validated question dictionaries
    """
    valid_questions = []
    
    # Case 1: Direct list of dictionaries
    if isinstance(data, list):
        # Check if it's a list of strings (placeholder data)
        if all(isinstance(item, str) for item in data):
            logger.warning(f"Found list of strings instead of question objects: {data[:3]}...")
            return []
            
        # Process actual question objects
        for item in data:
            if isinstance(item, dict) and "question" in item:
                valid_questions.append(item)
    
    # Case 2: Dictionary with questions key
    elif isinstance(data, dict) and "questions" in data:
        # Recursively process the questions list
        return validate_question_data(data["questions"])
        
    # Case 3: Nested lists of questions (common when processing multiple files)
    elif isinstance(data, list) and all(isinstance(item, list) for item in data):
        for sublist in data:
            valid_questions.extend(validate_question_data(sublist))
            
    return valid_questions

def create_unified_deck(questions_list: List[Any], 
                        deck_name: str, 
                        deck_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a unified deck from multiple question sets
    
    Args:
        questions_list: List of question sets in various formats
        deck_name: Name of the deck
        deck_id: Optional deck ID (generated if not provided)
        
    Returns:
        A dictionary containing the unified deck with metadata
    """
    if deck_id is None:
        deck_id = generate_unique_deck_id()
        
    # Process and flatten all questions into a single list
    all_questions = []
    
    # Log the input format for debugging
    logger.info(f"Processing {len(questions_list)} question sets for unified deck")
    for i, question_set in enumerate(questions_list):
        logger.debug(f"Question set {i} type: {type(question_set)}")
        
        # Validate and extract actual questions
        valid_questions = validate_question_data(question_set)
        logger.info(f"Found {len(valid_questions)} valid questions in set {i}")
        
        if valid_questions:
            # Process image paths to ensure they point to the permanent static directory
            # Pass deck_id to organize images by deck
            processed_questions = update_question_image_paths(valid_questions, deck_id=deck_id)
            all_questions.extend(processed_questions)
            
    # Add fallback if no questions were found
    if not all_questions:
        logger.warning("No valid questions found in any question set. Adding placeholder question.")
        all_questions = [{
            "question_type": "flashcard",
            "question": "This is a placeholder question. Please regenerate questions.",
            "answer": "Placeholder answer",
            "tags": ["placeholder"],
            "img_path": None
        }]
    
    # Create the deck with metadata
    created_at = datetime.now().isoformat()
    deck = {
        "metadata": {
            "deck_id": deck_id,
            "deck_name": deck_name,
            "created_at": created_at,
            "updated_at": created_at,
            "question_count": len(all_questions)
        },
        "questions": all_questions
    }
    
    return deck

def save_deck_to_file(deck: Dict[str, Any], decks_dir: Optional[str] = None) -> str:
    """
    Save a deck to a JSON file in the decks directory
    
    Args:
        deck: The deck dictionary to save
        decks_dir: Directory to save the deck, uses PathResolver if None
        
    Returns:
        Path to the saved deck file
    """
    # Import utility function for directory creation
    from utils.file_operations import ensure_dir
    
    # If no decks directory specified, use PathResolver to get the correct path
    if decks_dir is None:
        if path_config:
            # Use PathResolver to get the correct decks directory
            decks_dir = path_config.decks_dir
            logger.info(f"Using PathResolver decks directory: {decks_dir}")
        else:
            # Fallback: Get the application base directory
            app_base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            decks_dir = os.path.join(app_base_dir, "decks")
            logger.warning(f"PathResolver not available, using fallback decks directory: {decks_dir}")
    
    # Ensure the decks directory is absolute
    if not os.path.isabs(decks_dir):
        if path_config:
            decks_dir = os.path.join(path_config.project_root, decks_dir)
        else:
            decks_dir = os.path.abspath(decks_dir)
    
    # Create decks directory if it doesn't exist
    ensure_dir(decks_dir)
    
    # Use the deck_id for the filename
    deck_id = deck["metadata"]["deck_id"]
    deck_path = os.path.join(decks_dir, f"{deck_id}.json")
    
    # Verify the path is correct (not in build directory)
    if "build" in deck_path.lower():
        logger.error(f"ERROR: Deck path contains 'build' directory: {deck_path}")
        if path_config:
            # Force use of PathResolver path
            corrected_path = os.path.join(path_config.decks_dir, f"{deck_id}.json")
            logger.info(f"Correcting deck path to: {corrected_path}")
            deck_path = corrected_path
            ensure_dir(os.path.dirname(deck_path))
    
    # Save the deck to a file - keep the original format exactly as provided
    with open(deck_path, "w", encoding="utf-8") as f:
        json.dump(deck, f, ensure_ascii=False, indent=2)
        
    logger.info(f"Saved unified deck to {deck_path}")
    return deck_path

def cleanup_processing_directory(base_dir: str, keep_questions: bool = False, deck_id: Optional[str] = None):
    """
    Clean up the processing directory after creating the deck
    
    Args:
        base_dir: Base directory to clean up
        keep_questions: Whether to keep the questions directory
        deck_id: Optional deck ID to organize images by deck
    """
    # First, ensure any important images are copied to the static directory
    try:
        from .image_utils import copy_image_to_static
        
        # Create static images directory with optional deck subfolder using PathResolver
        if path_config:
            if deck_id:
                static_base_dir = os.path.join(path_config.images_dir, deck_id)
                static_images_dir = static_base_dir
                static_ocr_dir = os.path.join(static_base_dir, "ocr_results")
            else:
                static_images_dir = path_config.images_dir
                static_ocr_dir = os.path.join(path_config.images_dir, "ocr_results")
        else:
            # Fallback to relative paths
            if deck_id:
                static_base_dir = f"./static/images/{deck_id}"
                static_images_dir = static_base_dir
                static_ocr_dir = f"{static_base_dir}/ocr_results"
            else:
                static_images_dir = "./static/images"
                static_ocr_dir = "./static/images/ocr_results"
            
        os.makedirs(static_images_dir, exist_ok=True)
        os.makedirs(static_ocr_dir, exist_ok=True)
        
        # Find and copy all OCR result images
        image_count = 0
        for root, _, files in os.walk(base_dir):
            for file in files:
                if file.endswith((".png", ".jpg", ".jpeg")):
                    file_path = os.path.join(root, file)
                    
                    # Determine appropriate target directory
                    if "ocr_results" in root:
                        copy_image_to_static(file_path, static_ocr_dir, preserve_structure=False, deck_id=deck_id)
                    else:
                        copy_image_to_static(file_path, static_images_dir, preserve_structure=False, deck_id=deck_id)
                    
                    image_count += 1
        
        if image_count > 0:
            if deck_id:
                logger.info(f"Preserved {image_count} images in deck folder {deck_id} before cleanup")
            else:
                logger.info(f"Preserved {image_count} images before cleanup")
    except Exception as e:
        logger.error(f"Error preserving images before cleanup: {e}")
    
    # Import the utility function from utils.file_operations
    from utils.file_operations import cleanup_processing_dir
    
    # Define which subdirectories to keep
    keep_subdirs = ["questions"] if keep_questions else []
    
    # Use our utility function for cleanup
    result = cleanup_processing_dir(base_dir, keep_subdirs)
    
    if result:
        logger.info(f"Cleaned up processing directory: {base_dir}")
    else:
        logger.warning(f"Error cleaning up processing directory: {base_dir}")
