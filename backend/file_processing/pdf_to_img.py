from pdf2image import convert_from_path
import os
from utils.logger_config import get_logger

# Get the shared logger instance
logger = get_logger()

def pdf_to_img(pdf_path: str, img_dir: str, img_format: str = "JPEG"):
    """
    Converts every page of a PDF to images and saves them in img_dir.
    Returns a list of saved image file paths.
    """
    logger.info(f"Converting PDF to images: {pdf_path}") #type: ignore
    os.makedirs(img_dir, exist_ok=True)
    logger.debug(f"Created output directory: {img_dir}") #type: ignore

    try:
        images = convert_from_path(pdf_path, dpi=350)
        logger.info(f"Extracted {len(images)} pages from PDF") #type: ignore

        saved_paths = []
        ext = ".jpg" if img_format.upper() == "JPEG" else ".png"
        
        for i, img in enumerate(images):
            out_path = os.path.join(img_dir, f"page_{i + 1}{ext}")
            img.save(out_path, img_format.upper())
            saved_paths.append(out_path)
            logger.debug(f"Saved page {i+1} to {out_path}") #type: ignore

        logger.info(f"Successfully converted PDF to {len(saved_paths)} images") #type: ignore
        return saved_paths
        
    except Exception as e:
        logger.error(f"Error converting PDF to images: {str(e)}") #type: ignore
        raise