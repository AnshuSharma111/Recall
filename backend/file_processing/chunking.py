from paddleocr import LayoutDetection
import os
from utils.logger_config import get_logger

# Get the shared logger instance
logger = get_logger()

model = LayoutDetection(model_name="PP-DocLayout_plus-L")

def chunk_files(base_dir: str):
    """
    Process all images in subdirectories of base_dir.
    
    The expected structure is:
    base_dir/
        document1/
            images/
                page_1.jpg
                page_2.jpg
                ...
        document2/
            images/
                page_1.jpg
                ...
    """
    logger.info(f"Starting chunking of images from {base_dir}") #type: ignore
    
    # Check if base directory exists
    if not os.path.exists(base_dir):
        logger.error(f"Base directory {base_dir} does not exist!") #type: ignore
        return
        
    # Get all document directories
    document_dirs = [d for d in os.listdir(base_dir) 
                    if os.path.isdir(os.path.join(base_dir, d))]
    
    logger.info(f"Found {len(document_dirs)} documents to process: {document_dirs}") #type: ignore
    
    if len(document_dirs) == 0:
        logger.warning(f"No document directories found in {base_dir}") #type: ignore
        return
    
    total_images = 0
    
    for doc_name in document_dirs:
        doc_path = os.path.join(base_dir, doc_name)
        images_path = os.path.join(doc_path, "images")
        
        if not os.path.exists(images_path):
            logger.warning(f"No images directory found for {doc_name} at {images_path}, skipping") #type: ignore
            continue
        
        # Create output directories for this document
        doc_json_dir = os.path.join(doc_path, "json")
        doc_output_img_dir = os.path.join(doc_path, "processed_images")
        os.makedirs(doc_json_dir, exist_ok=True)
        os.makedirs(doc_output_img_dir, exist_ok=True)
        
        # Get all images for this document
        images = [f for f in os.listdir(images_path) if os.path.isfile(os.path.join(images_path, f))]
        logger.info(f"Processing {len(images)} images for document: {doc_name}") #type: ignore
        
        for img_name in images:
            img_path = os.path.join(images_path, img_name)
            logger.debug(f"Processing image: {img_path}") #type: ignore
            
            try:
                output = model.predict(img_path, batch_size=1, layout_nms=True)
                for res in output:
                    res.print()
                    res.save_to_img(save_path=doc_output_img_dir)
                    res.save_to_json(save_path=os.path.join(doc_json_dir, f"{img_name}.json"))
                logger.debug(f"Finished processing image: {img_name}") #type: ignore
                total_images += 1
            except Exception as e:
                logger.error(f"Error processing image {img_path}: {str(e)}") #type: ignore
    
    logger.info(f"Completed chunking of {total_images} images across {len(document_dirs)} documents") #type: ignore