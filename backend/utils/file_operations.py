"""
File operations utility module for common file and directory management functions.

This module provides utility functions for:
- Directory deletion with exclusion patterns
- File copying with metadata preservation
- Recursive file searching
- Directory size calculation
- Directory tree printing
- File backup creation
"""

import os
import shutil
import logging
import re
import json
import fnmatch
import uuid
from datetime import datetime
from typing import List, Dict, Set, Optional, Tuple, Union, Callable
import glob

# Get logger for this module
logger = logging.getLogger(__name__)

def delete_dir(directory: str, exclude: Optional[List[str]] = None) -> bool:
    """
    Recursively delete a directory and its contents, with optional exclusions.
    
    Args:
        directory (str): Path to the directory to delete
        exclude (Optional[List[str]]): List of file/directory patterns to exclude from deletion.
            Can include glob patterns like '*.jpg' or '*/images/*'
    
    Returns:
        bool: True if deletion was successful, False otherwise
    """
    if not os.path.exists(directory):
        logger.warning(f"Directory does not exist: {directory}")
        return True  # Consider non-existence as successful deletion
        
    if not os.path.isdir(directory):
        logger.error(f"Path is not a directory: {directory}")
        return False
        
    exclude_patterns = exclude if exclude is not None else []
    
    try:
        # Compile exclude patterns for more efficient matching
        compiled_patterns = [re.compile(fnmatch_to_regex(pattern)) for pattern in exclude_patterns]
        
        # Walk through directory bottom-up so we delete files before their parent directories
        for root, dirs, files in os.walk(directory, topdown=False):
            # Process files
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, directory)
                
                # Skip excluded files
                if any(pattern.match(rel_path) for pattern in compiled_patterns):
                    logger.debug(f"Skipping excluded file: {rel_path}")
                    continue
                    
                try:
                    os.remove(file_path)
                    logger.debug(f"Deleted file: {file_path}")
                except Exception as e:
                    logger.error(f"Error deleting file {file_path}: {e}")
                    
            # Process directories
            for dir_name in dirs:
                dir_path = os.path.join(root, dir_name)
                rel_path = os.path.relpath(dir_path, directory)
                
                # Skip excluded directories
                if any(pattern.match(rel_path) for pattern in compiled_patterns):
                    logger.debug(f"Skipping excluded directory: {rel_path}")
                    continue
                    
                # Check if directory is empty
                if not os.listdir(dir_path):
                    try:
                        os.rmdir(dir_path)
                        logger.debug(f"Deleted directory: {dir_path}")
                    except Exception as e:
                        logger.error(f"Error deleting directory {dir_path}: {e}")
        
        # Finally, try to remove the root directory if it's now empty
        if os.path.exists(directory) and not os.listdir(directory):
            os.rmdir(directory)
            logger.info(f"Deleted root directory: {directory}")
        elif os.path.exists(directory):
            logger.info(f"Root directory not empty, some files/dirs were excluded: {directory}")
            
        return True
        
    except Exception as e:
        logger.error(f"Error during directory deletion {directory}: {e}")
        return False

def fnmatch_to_regex(pattern: str) -> str:
    """
    Convert a shell-style wildcard pattern to a regular expression pattern.
    
    Args:
        pattern (str): Shell-style pattern (e.g., '*.jpg', 'data/**/temp')
        
    Returns:
        str: Regular expression pattern
    """
    # Escape all special regex characters except * and ?
    regex = re.escape(pattern)
    
    # Convert ** to match any directory depth
    regex = regex.replace('\\*\\*', '.*')
    
    # Convert * to match any character except directory separator
    regex = regex.replace('\\*', '[^/\\\\]*')
    
    # Convert ? to match a single character except directory separator
    regex = regex.replace('\\?', '[^/\\\\]')
    
    # Ensure pattern matches from the beginning to the end of the string
    return f'^{regex}$'

def copy_file(src: str, dst: str, preserve_metadata: bool = True) -> bool:
    """
    Copy a file from source to destination with optional metadata preservation.
    
    Args:
        src (str): Source file path
        dst (str): Destination file path
        preserve_metadata (bool): If True, preserves file metadata (timestamps, permissions)
    
    Returns:
        bool: True if successful, False otherwise
    """
    if not os.path.exists(src):
        logger.error(f"Source file does not exist: {src}")
        return False
        
    try:
        # Create destination directory if it doesn't exist
        dst_dir = os.path.dirname(dst)
        if dst_dir and not os.path.exists(dst_dir):
            os.makedirs(dst_dir, exist_ok=True)
            
        if preserve_metadata:
            shutil.copy2(src, dst)  # copy2 preserves metadata
        else:
            shutil.copy(src, dst)   # copy doesn't preserve metadata
            
        logger.debug(f"Copied file from {src} to {dst}")
        return True
        
    except Exception as e:
        logger.error(f"Error copying file from {src} to {dst}: {e}")
        return False

def find_files(base_dir: str, pattern: str) -> List[str]:
    """
    Find files matching a pattern in a directory (recursive).
    
    Args:
        base_dir (str): Base directory to start search
        pattern (str): File pattern to match (e.g., '*.json', '**/*.png')
    
    Returns:
        List[str]: List of matching file paths (absolute)
    """
    if not os.path.exists(base_dir) or not os.path.isdir(base_dir):
        logger.error(f"Base directory invalid or doesn't exist: {base_dir}")
        return []
        
    try:
        # Use glob for pattern matching
        if '**' in pattern:
            # Python 3.5+ supports recursive glob with **
            return glob.glob(os.path.join(base_dir, pattern), recursive=True)
        else:
            return glob.glob(os.path.join(base_dir, pattern))
            
    except Exception as e:
        logger.error(f"Error searching for files in {base_dir} with pattern {pattern}: {e}")
        return []

def get_dir_size(directory: str) -> int:
    """
    Calculate total size of a directory in bytes.
    
    Args:
        directory (str): Directory path
    
    Returns:
        int: Total size in bytes
    """
    total_size = 0
    
    if not os.path.exists(directory) or not os.path.isdir(directory):
        logger.warning(f"Directory does not exist or is not a directory: {directory}")
        return 0
        
    try:
        for dirpath, dirnames, filenames in os.walk(directory):
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                if os.path.isfile(file_path) and not os.path.islink(file_path):
                    total_size += os.path.getsize(file_path)
                    
        return total_size
        
    except Exception as e:
        logger.error(f"Error calculating directory size for {directory}: {e}")
        return 0

def ensure_dir(directory: str) -> bool:
    """
    Ensure a directory exists, creating it if necessary.
    
    Args:
        directory (str): Directory path to ensure exists
    
    Returns:
        bool: True if directory exists or was created successfully, False otherwise
    """
    if os.path.exists(directory):
        if os.path.isdir(directory):
            return True
        else:
            logger.error(f"Path exists but is not a directory: {directory}")
            return False
            
    try:
        os.makedirs(directory, exist_ok=True)
        logger.debug(f"Created directory: {directory}")
        return True
    except Exception as e:
        logger.error(f"Failed to create directory {directory}: {e}")
        return False

def list_subdirs(directory: str, include_hidden: bool = False) -> List[str]:
    """
    List all subdirectories in a directory.
    
    Args:
        directory (str): Parent directory path
        include_hidden (bool): If True, include hidden directories (starting with .)
    
    Returns:
        List[str]: List of subdirectory names (not full paths)
    """
    if not os.path.exists(directory) or not os.path.isdir(directory):
        logger.warning(f"Directory does not exist: {directory}")
        return []
        
    try:
        subdirs = [d for d in os.listdir(directory) 
                  if os.path.isdir(os.path.join(directory, d))]
                  
        if not include_hidden:
            subdirs = [d for d in subdirs if not d.startswith('.')]
            
        return subdirs
        
    except Exception as e:
        logger.error(f"Error listing subdirectories in {directory}: {e}")
        return []

def backup_file(file_path: str, backup_suffix: str = '.bak') -> Optional[str]:
    """
    Create a backup copy of a file.
    
    Args:
        file_path (str): Path to the file to backup
        backup_suffix (str): Suffix to append to the backup file
    
    Returns:
        Optional[str]: Path to the backup file if successful, None otherwise
    """
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        logger.error(f"File does not exist: {file_path}")
        return None
        
    backup_path = f"{file_path}{backup_suffix}"
    
    try:
        shutil.copy2(file_path, backup_path)
        logger.debug(f"Created backup of {file_path} at {backup_path}")
        return backup_path
    except Exception as e:
        logger.error(f"Error creating backup of {file_path}: {e}")
        return None

def print_dir_tree(directory: str, max_depth: int = 3) -> None:
    """
    Print a directory tree structure.
    
    Args:
        directory (str): Root directory to print
        max_depth (int): Maximum depth to traverse
    """
    if not os.path.exists(directory) or not os.path.isdir(directory):
        logger.warning(f"Directory does not exist: {directory}")
        return
    
    def _print_tree(dir_path: str, prefix: str = '', depth: int = 0):
        if depth > max_depth:
            print(f"{prefix}├── ...")
            return
            
        contents = sorted(os.listdir(dir_path))
        count = len(contents)
        
        for i, item in enumerate(contents):
            is_last = i == count - 1
            item_path = os.path.join(dir_path, item)
            
            # Print item with appropriate prefix
            if is_last:
                print(f"{prefix}└── {item}")
                new_prefix = prefix + "    "
            else:
                print(f"{prefix}├── {item}")
                new_prefix = prefix + "│   "
                
            # Recursively print subdirectories
            if os.path.isdir(item_path):
                _print_tree(item_path, new_prefix, depth + 1)
    
    print(os.path.basename(directory) or directory)
    _print_tree(directory)

# Additional functions specific to the Recall application

def safe_move_images(src_dir: str, dest_dir: str, extensions: Optional[List[str]] = None) -> Dict[str, str]:
    """
    Safely move image files from source to destination directory, preserving structure.
    
    Args:
        src_dir (str): Source directory containing images
        dest_dir (str): Destination directory where images will be moved
        extensions (Optional[List[str]]): List of file extensions to consider as images (default: ['.png', '.jpg', '.jpeg'])
        
    Returns:
        Dict[str, str]: Mapping of original paths to new paths
    """
    if extensions is None:
        extensions = ['.png', '.jpg', '.jpeg']
        
    if not os.path.exists(src_dir) or not os.path.isdir(src_dir):
        logger.error(f"Source directory does not exist: {src_dir}")
        return {}
        
    ensure_dir(dest_dir)
    path_mapping = {}
    
    try:
        # Find all image files
        for ext in extensions:
            image_files = find_files(src_dir, f"**/*{ext}")
            
            for src_path in image_files:
                # Determine relative path to maintain directory structure
                rel_path = os.path.relpath(src_path, src_dir)
                dest_path = os.path.join(dest_dir, rel_path)
                
                # Create destination directory if needed
                dest_dir_path = os.path.dirname(dest_path)
                ensure_dir(dest_dir_path)
                
                # Move file
                try:
                    # Create backup before moving
                    backup_path = None
                    if os.path.exists(dest_path):
                        backup_path = backup_file(dest_path)
                    
                    # Move file (shutil.move handles cross-device moves better than os.rename)
                    shutil.move(src_path, dest_path)
                    path_mapping[src_path] = dest_path
                    logger.debug(f"Moved image {src_path} to {dest_path}")
                    
                except Exception as e:
                    logger.error(f"Error moving image {src_path} to {dest_path}: {e}")
                    # No need to restore backup - we'll handle this at the caller level
        
        return path_mapping
        
    except Exception as e:
        logger.error(f"Error during safe image move operation: {e}")
        return path_mapping

def cleanup_processing_dir(base_dir: str, keep_subdirs: Optional[List[str]] = None, deck_id: Optional[str] = None) -> bool:
    """
    Cleanup processing directory after completion, keeping specified subdirectories.
    
    Args:
        base_dir (str): Base directory to clean up
        keep_subdirs (Optional[List[str]]): List of subdirectory names to preserve
        deck_id (Optional[str]): Deck ID for organizing images in deck-specific folders
    
    Returns:
        bool: True if cleanup was successful, False otherwise
    """
    if keep_subdirs is None:
        keep_subdirs = ["questions", "images"]
        
    if not os.path.exists(base_dir) or not os.path.isdir(base_dir):
        logger.warning(f"Processing directory does not exist: {base_dir}")
        return True
    
    try:
        # Get absolute paths of subdirectories to keep
        exclude_patterns = []
        for subdir in keep_subdirs:
            # Match directories at any level
            exclude_patterns.append(f"**/{subdir}/**")
            exclude_patterns.append(f"**/{subdir}")
            
        # Delete everything except excluded patterns
        return delete_dir(base_dir, exclude_patterns)
        
    except Exception as e:
        logger.error(f"Error cleaning up processing directory {base_dir}: {e}")
        return False
        
def merge_json_files(json_files: List[str], output_file: str, merge_key: Optional[str] = None) -> Optional[str]:
    """
    Merge multiple JSON files into a single output file.
    
    Args:
        json_files (List[str]): List of JSON file paths to merge
        output_file (str): Path to save the merged JSON
        merge_key (Optional[str]): If provided, merge arrays under this key
    
    Returns:
        Optional[str]: Path to the merged file if successful, None otherwise
    """
    if not json_files:
        logger.warning("No JSON files provided for merging")
        return None
        
    merged_data = {}
    
    try:
        for json_file in json_files:
            if not os.path.exists(json_file):
                logger.warning(f"JSON file does not exist: {json_file}")
                continue
                
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    file_data = json.load(f)
                    
                if merge_key is not None:
                    # Merge arrays under the specified key
                    if merge_key not in merged_data:
                        merged_data[merge_key] = []
                        
                    if merge_key in file_data and isinstance(file_data[merge_key], list):
                        merged_data[merge_key].extend(file_data[merge_key])
                    elif merge_key in file_data:
                        merged_data[merge_key].append(file_data[merge_key])
                        
                    # Copy other keys from the first file
                    if len(merged_data) == 1:  # Only merged_key exists
                        for key, value in file_data.items():
                            if key != merge_key:
                                merged_data[key] = value
                else:
                    # Simple merge: later files override earlier ones
                    merged_data.update(file_data)
                    
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing JSON file {json_file}: {e}")
                continue
                
        # Create output directory if needed
        output_dir = os.path.dirname(output_file)
        if output_dir:
            ensure_dir(output_dir)
            
        # Write merged data to output file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"Successfully merged {len(json_files)} JSON files to {output_file}")
        return output_file
        
    except Exception as e:
        logger.error(f"Error merging JSON files: {e}")
        return None
        
def manage_flashcards(deck_path: str, operation: str, cards: Optional[List[Dict]] = None, 
                      card_ids: Optional[List[str]] = None, 
                      update_data: Optional[Dict] = None) -> Tuple[bool, Optional[Dict]]:
    """
    Manage flashcards in a deck - add, delete, update or retrieve cards.
    
    Args:
        deck_path (str): Path to the JSON deck file
        operation (str): Operation to perform ('add', 'delete', 'update', 'get')
        cards (Optional[List[Dict]]): Cards to add (for 'add' operation)
        card_ids (Optional[List[str]]): IDs of cards to operate on (for 'delete'/'update'/'get')
        update_data (Optional[Dict]): Data to update cards with (for 'update' operation)
        
    Returns:
        Tuple[bool, Optional[Dict]]: (Success status, Result data or None)
    """
    if not os.path.exists(deck_path):
        if operation != 'add':
            logger.error(f"Deck file does not exist: {deck_path}")
            return False, None
        
        # For 'add' operation, create a new deck if it doesn't exist
        deck_data = {"cards": [], "metadata": {"created_at": datetime.now().isoformat()}}
    else:
        try:
            with open(deck_path, 'r', encoding='utf-8') as f:
                deck_data = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error reading deck file {deck_path}: {e}")
            # Create backup of corrupted file
            if os.path.exists(deck_path):
                backup_file(deck_path)
            return False, None
    
    result = None
    
    try:
        # Make sure the cards list exists
        if "cards" not in deck_data:
            deck_data["cards"] = []
            
        if "metadata" not in deck_data:
            deck_data["metadata"] = {"created_at": datetime.now().isoformat()}
            
        # Update the last modified timestamp
        deck_data["metadata"]["last_modified"] = datetime.now().isoformat()
            
        # Perform the requested operation
        if operation == 'add' and cards:
            # Add new cards to the deck
            for card in cards:
                if 'id' not in card:
                    card['id'] = str(uuid.uuid4())
                if 'created_at' not in card:
                    card['created_at'] = datetime.now().isoformat()
                    
            deck_data["cards"].extend(cards)
            result = {"added_count": len(cards), "added_ids": [card.get('id') for card in cards]}
            
        elif operation == 'delete' and card_ids:
            # Delete cards from the deck
            original_count = len(deck_data["cards"])
            deck_data["cards"] = [card for card in deck_data["cards"] if card.get('id') not in card_ids]
            deleted_count = original_count - len(deck_data["cards"])
            result = {"deleted_count": deleted_count}
            
        elif operation == 'update' and card_ids and update_data:
            # Update existing cards
            updated_count = 0
            for card in deck_data["cards"]:
                if card.get('id') in card_ids:
                    card.update(update_data)
                    card['last_modified'] = datetime.now().isoformat()
                    updated_count += 1
                    
            result = {"updated_count": updated_count}
            
        elif operation == 'get':
            # Get all cards or specific cards
            if card_ids:
                result = {"cards": [card for card in deck_data["cards"] if card.get('id') in card_ids]}
            else:
                result = {"cards": deck_data["cards"], "metadata": deck_data.get("metadata", {})}
                
        else:
            logger.error(f"Invalid operation or missing required parameters: {operation}")
            return False, None
            
        # Save the updated deck (except for 'get' operation)
        if operation != 'get':
            # Create output directory if needed
            output_dir = os.path.dirname(deck_path)
            if output_dir:
                ensure_dir(output_dir)
                
            # Save the deck with a backup
            if os.path.exists(deck_path):
                backup_file(deck_path)
                
            with open(deck_path, 'w', encoding='utf-8') as f:
                json.dump(deck_data, f, indent=2, ensure_ascii=False)
                
            logger.info(f"Successfully performed '{operation}' operation on deck: {deck_path}")
            
        return True, result
        
    except Exception as e:
        logger.error(f"Error managing flashcard deck {deck_path}: {e}")
        return False, None
        
def import_export_deck(src_path: str, dest_path: str, operation: str, 
                       format_type: str = 'json', 
                       include_images: bool = True) -> Tuple[bool, Optional[Dict]]:
    """
    Import or export a flashcard deck to/from different formats.
    
    Args:
        src_path (str): Source file/directory path
        dest_path (str): Destination file/directory path
        operation (str): Operation to perform ('import', 'export')
        format_type (str): Format type ('json', 'csv', 'anki', 'markdown')
        include_images (bool): Whether to include images in export/import
        
    Returns:
        Tuple[bool, Optional[Dict]]: (Success status, Result data or None)
    """
    result: Dict[str, Union[str, List[str], int]] = {}
    
    try:
        # Ensure destination directory exists
        dest_dir = os.path.dirname(dest_path)
        ensure_dir(dest_dir)
        
        # Handle JSON format (native format)
        if format_type == 'json':
            if operation == 'export':
                # Simply copy the deck file
                shutil.copy2(src_path, dest_path)
                result = {"exported_path": dest_path}
                
                # Handle images if needed
                if include_images and os.path.exists(src_path):
                    try:
                        with open(src_path, 'r', encoding='utf-8') as f:
                            deck_data = json.load(f)
                            
                        # Extract image paths
                        image_paths = []
                        for card in deck_data.get("cards", []):
                            # Add any image paths from card content
                            if card.get("front_image"):
                                image_paths.append(card["front_image"])
                            if card.get("back_image"):
                                image_paths.append(card["back_image"])
                                
                        # Copy images to destination
                        if image_paths:
                            # Create images directory
                            images_dir = os.path.join(dest_dir, "images")
                            ensure_dir(images_dir)
                            
                            copied_images = []
                            for img_path in image_paths:
                                if os.path.exists(img_path):
                                    img_name = os.path.basename(img_path)
                                    dest_img_path = os.path.join(images_dir, img_name)
                                    shutil.copy2(img_path, dest_img_path)
                                    copied_images.append(dest_img_path)
                                    
                            result["exported_images"] = copied_images
                    except json.JSONDecodeError:
                        logger.warning(f"Could not parse JSON deck for image export: {src_path}")
            
            elif operation == 'import':
                # Copy the JSON file to destination
                shutil.copy2(src_path, dest_path)
                result = {"imported_path": dest_path}
                
                # Handle images if needed
                if include_images:
                    src_dir = os.path.dirname(src_path)
                    images_dir = os.path.join(src_dir, "images")
                    
                    if os.path.exists(images_dir) and os.path.isdir(images_dir):
                        dest_images_dir = os.path.join(os.path.dirname(dest_path), "images")
                        ensure_dir(dest_images_dir)
                        
                        # Copy all images
                        image_files = find_files(images_dir, "**/*.{jpg,jpeg,png,gif}")
                        copied_images = []
                        
                        for img_path in image_files:
                            img_name = os.path.basename(img_path)
                            dest_img_path = os.path.join(dest_images_dir, img_name)
                            shutil.copy2(img_path, dest_img_path)
                            copied_images.append(dest_img_path)
                            
                        result["imported_images"] = copied_images
        
        # Handle CSV format
        elif format_type == 'csv':
            import csv
            
            if operation == 'export':
                # Export deck to CSV
                try:
                    with open(src_path, 'r', encoding='utf-8') as f:
                        deck_data = json.load(f)
                    
                    with open(dest_path, 'w', newline='', encoding='utf-8') as csvfile:
                        fieldnames = ['id', 'front', 'back', 'front_image', 'back_image', 
                                     'tags', 'created_at', 'last_modified']
                        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                        
                        writer.writeheader()
                        for card in deck_data.get("cards", []):
                            # Ensure all fields exist
                            row = {field: card.get(field, '') for field in fieldnames}
                            # Convert tags list to comma-separated string
                            if isinstance(row['tags'], list):
                                row['tags'] = ','.join(row['tags'])
                            writer.writerow(row)
                            
                    result = {"exported_path": dest_path, "card_count": len(deck_data.get("cards", []))}
                except Exception as e:
                    logger.error(f"Error exporting deck to CSV: {e}")
                    return False, None
            
            elif operation == 'import':
                # Import from CSV to deck
                try:
                    cards = []
                    with open(src_path, 'r', newline='', encoding='utf-8') as csvfile:
                        reader = csv.DictReader(csvfile)
                        for row in reader:
                            # Convert tags string to list
                            if 'tags' in row and row['tags']:
                                row['tags'] = row['tags'].split(',')
                            cards.append(row)
                    
                    # Create a new deck structure
                    deck_data = {
                        "cards": cards,
                        "metadata": {
                            "created_at": datetime.now().isoformat(),
                            "imported_from": src_path,
                            "import_type": "csv"
                        }
                    }
                    
                    # Save to the destination path
                    with open(dest_path, 'w', encoding='utf-8') as f:
                        json.dump(deck_data, f, indent=2, ensure_ascii=False)
                        
                    result = {"imported_path": dest_path, "card_count": len(cards)}
                except Exception as e:
                    logger.error(f"Error importing CSV to deck: {e}")
                    return False, None
        
        # Handle Markdown format
        elif format_type == 'markdown':
            if operation == 'export':
                try:
                    with open(src_path, 'r', encoding='utf-8') as f:
                        deck_data = json.load(f)
                    
                    with open(dest_path, 'w', encoding='utf-8') as md_file:
                        md_file.write(f"# Flashcard Deck\n\n")
                        md_file.write(f"Created: {deck_data.get('metadata', {}).get('created_at', '')}\n\n")
                        
                        for i, card in enumerate(deck_data.get("cards", [])):
                            md_file.write(f"## Card {i+1}\n\n")
                            md_file.write(f"### Front\n\n{card.get('front', '')}\n\n")
                            
                            if card.get('front_image'):
                                md_file.write(f"![Front Image]({card.get('front_image')})\n\n")
                                
                            md_file.write(f"### Back\n\n{card.get('back', '')}\n\n")
                            
                            if card.get('back_image'):
                                md_file.write(f"![Back Image]({card.get('back_image')})\n\n")
                                
                            if card.get('tags'):
                                tags = card.get('tags')
                                if isinstance(tags, list):
                                    tags = ', '.join(tags)
                                md_file.write(f"**Tags**: {tags}\n\n")
                                
                            md_file.write("---\n\n")
                            
                    result = {"exported_path": dest_path, "card_count": len(deck_data.get("cards", []))}
                except Exception as e:
                    logger.error(f"Error exporting deck to Markdown: {e}")
                    return False, None
                    
        else:
            logger.error(f"Unsupported format type: {format_type}")
            return False, None
            
        logger.info(f"Successfully {operation}ed deck to/from {format_type} format")
        return True, result
        
    except Exception as e:
        logger.error(f"Error in import/export operation: {e}")
        return False, None
