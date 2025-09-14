from pdf2image import convert_from_path
import os
from utils.logger_config import get_logger

# Get the shared logger instance
logger = get_logger()

# Import PathResolver for centralized path management
try:
    from utils.path_resolver import PathResolver
    path_resolver = PathResolver()
    path_config = path_resolver.get_config()
except ImportError:
    logger.error("PathResolver not available - using fallback paths")
    path_resolver = None
    path_config = None

def pdf_to_img(pdf_path: str, img_dir: str, img_format: str = "JPEG"):
    """
    Converts every page of a PDF to images and saves them in a dedicated subfolder.
    
    Args:
        pdf_path: Path to the PDF file
        img_dir: Base directory for image output (will create a subdirectory per PDF)
        img_format: Image format to save as (JPEG or PNG)
        
    Returns:
        List of saved image file paths.
    """
    logger.info(f"Converting PDF to images: {pdf_path}") #type: ignore
    
    # Resolve paths using PathResolver if available
    if path_resolver:
        if not os.path.isabs(pdf_path):
            pdf_path = path_resolver.resolve_path(pdf_path)
        if not os.path.isabs(img_dir):
            img_dir = path_resolver.resolve_path(img_dir)
    
    # base output directory
    if path_resolver:
        path_resolver.ensure_directory_exists(img_dir)
    else:
        os.makedirs(img_dir, exist_ok=True)
    
    # Get PDF filename without extension to use as subfolder name
    pdf_basename = os.path.basename(pdf_path)
    pdf_name = os.path.splitext(pdf_basename)[0]
    
    # Create a dedicated folder for this PDF's images
    pdf_img_dir = os.path.join(img_dir, pdf_name, "images")
    if path_resolver:
        path_resolver.ensure_directory_exists(pdf_img_dir)
    else:
        os.makedirs(pdf_img_dir, exist_ok=True)
    logger.debug(f"Created dedicated output directory: {pdf_img_dir}") #type: ignore

    try:
        images = convert_from_path(pdf_path, dpi=350)
        logger.info(f"Extracted {len(images)} pages from PDF {pdf_name}") #type: ignore

        saved_paths = []
        ext = ".jpg" if img_format.upper() == "JPEG" else ".png"
        
        for i, img in enumerate(images):
            out_path = os.path.join(pdf_img_dir, f"page_{i + 1}{ext}")
            img.save(out_path, img_format.upper())
            saved_paths.append(out_path)
            logger.debug(f"Saved page {i+1} to {out_path}") #type: ignore

        logger.info(f"Successfully converted PDF {pdf_name} to {len(saved_paths)} images") #type: ignore
        
        # Remove original PDF file after processing
        try:
            os.remove(pdf_path)
            logger.debug(f"Removed original PDF file after processing: {pdf_path}") #type: ignore
        except Exception as e:
            logger.warning(f"Could not remove original PDF file {pdf_path}: {str(e)}") #type: ignore
            
        return saved_paths
        
    except Exception as e:
        logger.error(f"Error converting PDF to images: {str(e)}") #type: ignore
        raise