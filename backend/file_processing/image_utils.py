import os
import shutil
import logging
import uuid
from typing import Optional

# Set up logging
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

def copy_image_to_static(image_path: str, static_dir: Optional[str] = None, preserve_structure: bool = True, deck_id: Optional[str] = None) -> Optional[str]:
    """
    Copy an image file to the static images directory and return the new path
    
    Args:
        image_path: Original path to the image file
        static_dir: Directory to store permanent images (uses PathResolver if None)
        preserve_structure: Whether to preserve the directory structure (e.g., ocr_results)
        deck_id: Optional deck ID to create a deck-specific folder for the image
        
    Returns:
        The new path to the image in the static directory, or None if copying failed
    """
    if not os.path.exists(image_path):
        logger.error(f"Image not found at path: {image_path}")
        return None
    
    # Use PathResolver for static directory if not provided
    if static_dir is None:
        if path_config:
            static_dir = path_config.images_dir
        else:
            static_dir = "./static/images"  # Fallback
        
    # Organize images by deck if deck_id is provided
    if deck_id:
        # Create deck-specific folder in static/images
        static_dir = os.path.join(static_dir, deck_id)
    
    # Create the static directory if it doesn't exist
    os.makedirs(static_dir, exist_ok=True)
    
    # Determine target location
    filename = os.path.basename(image_path)
    target_path = ""
    
    if preserve_structure:
        # Try to preserve directory structure from to_process
        if "to_process" in image_path:
            # Extract the subdirectory structure after to_process
            rel_path = image_path.split("to_process")[1].lstrip('\\/')
            # Get the subdirectory (e.g. "ocr_results")
            parts = rel_path.split(os.sep)
            if len(parts) > 2 and parts[-2] != "":  # Check if there's a meaningful subdirectory
                subdir = parts[-2]
                # Create the subdirectory in static if needed
                target_subdir = os.path.join(static_dir, subdir)
                os.makedirs(target_subdir, exist_ok=True)
                target_path = os.path.join(target_subdir, filename)
            else:
                target_path = os.path.join(static_dir, filename)
        else:
            # If not from to_process, just preserve any significant subdirectory
            if "ocr_results" in image_path:
                ocr_dir = os.path.join(static_dir, "ocr_results")
                os.makedirs(ocr_dir, exist_ok=True)
                target_path = os.path.join(ocr_dir, filename)
            else:
                target_path = os.path.join(static_dir, filename)
    else:
        # Use a unique filename to avoid collisions
        file_ext = os.path.splitext(image_path)[1]
        unique_filename = f"{str(uuid.uuid4())}{file_ext}"
        target_path = os.path.join(static_dir, unique_filename)
    
    try:
        # Copy the image to the static directory
        shutil.copy2(image_path, target_path)
        logger.info(f"Copied image from {image_path} to {target_path}")
        
        # Return the path relative to the application root
        return target_path
    except Exception as e:
        logger.error(f"Error copying image to static directory: {e}")
        return None

def ensure_image_in_static(img_path: Optional[str], deck_id: Optional[str] = None) -> Optional[str]:
    """
    Ensure that an image is stored in the static directory
    
    Args:
        img_path: Path to the image file
        deck_id: Optional deck ID to organize images by deck
        
    Returns:
        Path to the image in the static directory, or None if the operation failed
    """
    if not img_path:
        return None
        
    # If the image is already in the static directory, return its path
    static_images_path = path_config.images_dir if path_config else "./static/images"
    if os.path.normpath(img_path).startswith(os.path.normpath(static_images_path)):
        return img_path
        
    # Copy the image to the static directory
    return copy_image_to_static(img_path, deck_id=deck_id)

def update_question_image_paths(questions: list, deck_id: Optional[str] = None) -> list:
    """
    Update image paths in a list of questions to ensure they point to the static directory
    
    Args:
        questions: List of question dictionaries
        deck_id: Optional deck ID to organize images by deck
        
    Returns:
        Updated list of question dictionaries
    """
    # Import utility functions and prepare paths using PathResolver
    try:
        from utils.file_operations import ensure_dir
        if path_config:
            if deck_id:
                ocr_results_dir = os.path.join(path_config.images_dir, deck_id, "ocr_results")
                base_static_path = os.path.join(path_config.images_dir, deck_id)
            else:
                ocr_results_dir = os.path.join(path_config.images_dir, "ocr_results")
                base_static_path = path_config.images_dir
        else:
            # Fallback to relative paths
            if deck_id:
                ocr_results_dir = f"./static/images/{deck_id}/ocr_results"
                base_static_path = f"./static/images/{deck_id}"
            else:
                ocr_results_dir = "./static/images/ocr_results"
                base_static_path = "./static/images"
        
        ensure_dir(ocr_results_dir)
    except ImportError:
        # Fallback directory creation
        if path_config:
            if deck_id:
                ocr_results_dir = os.path.join(path_config.images_dir, deck_id, "ocr_results")
                base_static_path = os.path.join(path_config.images_dir, deck_id)
            else:
                ocr_results_dir = os.path.join(path_config.images_dir, "ocr_results")
                base_static_path = path_config.images_dir
        else:
            if deck_id:
                ocr_results_dir = f"./static/images/{deck_id}/ocr_results"
                base_static_path = f"./static/images/{deck_id}"
            else:
                ocr_results_dir = "./static/images/ocr_results"
                base_static_path = "./static/images"
        
        os.makedirs(ocr_results_dir, exist_ok=True)
    
    for question in questions:
        if isinstance(question, dict) and "img_path" in question and question["img_path"]:
            original_path = question["img_path"]
            
            # Skip if already pointing to correct deck-specific directory
            if deck_id and os.path.normpath(original_path).startswith(os.path.normpath(base_static_path)):
                continue
            # Skip if already pointing to static directory and no deck_id specified
            elif not deck_id and os.path.normpath(original_path).startswith(os.path.normpath(base_static_path)):
                continue
            
            # Handle paths from to_process directory
            if "to_process" in original_path and os.path.exists(original_path):
                try:
                    # Extract the filename and subdirectory structure
                    filename = os.path.basename(original_path)
                    
                    # Determine target location in static directory
                    # Ensure we keep the ocr_results directory structure if present
                    if "ocr_results" in original_path:
                        static_img_path = f"{base_static_path}/ocr_results/{filename}"
                    else:
                        static_img_path = f"{base_static_path}/{filename}"
                    
                    # Create the target directory if needed
                    os.makedirs(os.path.dirname(static_img_path), exist_ok=True)
                    
                    # Copy the image to static directory
                    shutil.copy2(original_path, static_img_path)
                    logger.info(f"Copied image from {original_path} to {static_img_path}")
                    
                    # Update the path in the question
                    question["img_path"] = static_img_path
                except Exception as e:
                    logger.error(f"Error copying image {original_path} to static: {e}")
                    # If copy fails, try to use ensure_image_in_static as fallback
                    static_img_path = ensure_image_in_static(original_path, deck_id)
                    if static_img_path:
                        question["img_path"] = static_img_path
            else:
                # If the file doesn't exist in to_process, try fixing the path
                # It might be that the path is already wrong
                if path_config:
                    processing_dir = path_config.processing_dir
                    if deck_id:
                        target_images_dir = os.path.join(path_config.images_dir, deck_id)
                        fixed_path = original_path.replace("./to_process", target_images_dir)
                        fixed_path_alt = original_path.replace("./static/images", target_images_dir)
                    else:
                        fixed_path = original_path.replace("./to_process", path_config.images_dir)
                        fixed_path_alt = original_path
                else:
                    # Fallback to relative paths
                    if deck_id:
                        fixed_path = original_path.replace("./to_process", f"./static/images/{deck_id}")
                        fixed_path_alt = original_path.replace("./static/images", f"./static/images/{deck_id}")
                    else:
                        fixed_path = original_path.replace("./to_process", "./static/images")
                        fixed_path_alt = original_path
                
                # Check possible fixed paths
                if os.path.exists(fixed_path):
                    question["img_path"] = fixed_path
                    logger.info(f"Fixed image path from {original_path} to {fixed_path}")
                elif os.path.exists(fixed_path_alt):
                    question["img_path"] = fixed_path_alt
                    logger.info(f"Fixed image path from {original_path} to {fixed_path_alt}")
                else:
                    # Try to find the file by name in static directory
                    filename = os.path.basename(original_path)
                    potential_path = f"{base_static_path}/ocr_results/{filename}"
                    
                    if os.path.exists(potential_path):
                        question["img_path"] = potential_path
                        logger.info(f"Found image by name: {potential_path}")
                    else:
                        # If we can find the file in the non-deck-specific location, copy it to the deck folder
                        if path_config:
                            old_path = os.path.join(path_config.images_dir, "ocr_results", filename)
                        else:
                            old_path = f"./static/images/ocr_results/{filename}"
                        if deck_id and os.path.exists(old_path):
                            try:
                                os.makedirs(os.path.dirname(potential_path), exist_ok=True)
                                shutil.copy2(old_path, potential_path)
                                question["img_path"] = potential_path
                                logger.info(f"Copied image from {old_path} to {potential_path}")
                            except Exception as e:
                                logger.error(f"Error copying existing image to deck folder: {e}")
                                logger.error(f"Could not find image: {original_path}")
                        else:
                            logger.error(f"Could not find image: {original_path}")
                
    return questions
