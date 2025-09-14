import os
import logging
import shutil
from utils.file_operations import ensure_dir

logger = logging.getLogger(__name__)

def migrate_decks_from_build(root_decks_dir):
    """
    Checks for decks in build directories and migrates them to the root decks directory.
    This ensures decks created during development in build folders are not lost.
    
    Args:
        root_decks_dir (str): The absolute path to the root decks directory
    
    Returns:
        int: Number of decks migrated
    """
    # Get the application base directory
    app_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Look for build directory at the same level as backend
    build_dir = os.path.join(app_dir, 'build')
    
    if not os.path.exists(build_dir):
        logger.info("No build directory found, no decks to migrate.")
        return 0
        
    # Find all deck directories in build subfolders
    build_deck_dirs = []
    for subdir in os.listdir(build_dir):
        potential_deck_dir = os.path.join(build_dir, subdir, 'decks')
        if os.path.exists(potential_deck_dir) and os.path.isdir(potential_deck_dir):
            build_deck_dirs.append(potential_deck_dir)
    
    if not build_deck_dirs:
        logger.info("No deck directories found in build folders.")
        return 0
        
    # Ensure the root decks directory exists
    ensure_dir(root_decks_dir)
    
    # Count migrated files
    migrated_count = 0
    
    # Check each build deck directory
    for build_deck_dir in build_deck_dirs:
        if not os.path.exists(build_deck_dir) or not os.path.isdir(build_deck_dir):
            continue
            
        # Find all JSON deck files
        for filename in os.listdir(build_deck_dir):
            if filename.endswith('.json'):
                source_path = os.path.join(build_deck_dir, filename)
                dest_path = os.path.join(root_decks_dir, filename)
                
                # Skip if the file already exists in the root decks directory
                if os.path.exists(dest_path):
                    logger.info(f"Deck {filename} already exists in root directory, skipping migration.")
                    continue
                    
                try:
                    # Copy the deck file
                    shutil.copy2(source_path, dest_path)
                    migrated_count += 1
                    
                    logger.info(f"Migrated deck {filename} from {build_deck_dir} to {root_decks_dir}")
                except Exception as e:
                    logger.error(f"Error migrating deck {filename}: {str(e)}")
    
    if migrated_count > 0:
        logger.info(f"Successfully migrated {migrated_count} deck(s) from build directories.")
    else:
        logger.info("No decks needed migration from build directories.")
    
    return migrated_count