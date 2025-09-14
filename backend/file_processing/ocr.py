import os
import json
import cv2
from paddleocr import PaddleOCR, FormulaRecognition
import numpy as np
from typing import Dict, List
from math import ceil, floor
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

# Initialize the OCR models
text_ocr = PaddleOCR(lang='en')  # For general text
formula_ocr = FormulaRecognition(model_name="PP-FormulaNet_plus-M")  # For formulas

def load_json_boxes(json_path: str) -> Dict:
    """Load the JSON file containing bounding boxes."""
    with open(json_path, 'r') as f:
        return json.load(f)

def get_image_path(json_data: Dict) -> str:
    """Get the path to the original image from JSON data."""
    input_path = json_data.get('input_path', '')
    # If the path is relative, convert to absolute using PathResolver
    if not os.path.isabs(input_path):
        if path_config:
            # Use PathResolver to get the correct project root
            input_path = os.path.join(path_config.project_root, input_path)
        else:
            # Fallback to old method
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            input_path = os.path.join(base_dir, input_path)
    return input_path

def crop_image(image: np.ndarray, coordinates: List[float]) -> np.ndarray:
    """Crop the image based on the bounding box coordinates."""
    x1 = max(0, int(floor(coordinates[0])))
    y1 = max(0, int(floor(coordinates[1])))
    x2 = min(image.shape[1], int(ceil(coordinates[2])))
    y2 = min(image.shape[0], int(ceil(coordinates[3])))
    return image[y1:y2, x1:x2]

def ocr_element(cropped_img: np.ndarray, label: str) -> Dict:
    """Apply OCR based on the element label."""
    result = {
        "label": label,
        "text": "",
        "confidence": 0.0,
        "raw_result": None
    }
    
    try:
        if label == "formula":
            ocr_result = formula_ocr.predict(cropped_img)
            if ocr_result and len(ocr_result) > 0:
                formula_text = ocr_result[0].get_latex()
                result["text"] = formula_text
                result["confidence"] = ocr_result[0].get_score() if hasattr(ocr_result[0], 'get_score') else 0.0
                result["raw_result"] = ocr_result
        else:  # text, header, figure_title, etc.
            ocr_result = text_ocr.ocr(cropped_img, cls=True)
            if ocr_result and len(ocr_result) > 0 and ocr_result[0]:
                # Extract text from all detected text regions and join them
                texts = []
                conf_sum = 0
                conf_count = 0
                
                for line in ocr_result[0]:
                    if line and len(line) >= 2:
                        text, score = line[1]
                        texts.append(text)
                        conf_sum += score
                        conf_count += 1
                
                result["text"] = " ".join(texts)
                result["confidence"] = conf_sum / conf_count if conf_count > 0 else 0.0
                result["raw_result"] = ocr_result
    except Exception as e:
        logger.error(f"Error performing OCR on {label} element: {str(e)}") #type: ignore
    
    return result

def is_contained_within(box1: List[float], box2: List[float], threshold: float = 0.9) -> bool:
    """Check if box1 is contained within box2 with given threshold.
    
    Args:
        box1: Coordinates of first box [x1, y1, x2, y2]
        box2: Coordinates of second box [x1, y1, x2, y2]
        threshold: Minimum overlap ratio to consider contained (0.0-1.0)
        
    Returns:
        True if box1 is contained within box2, False otherwise
    """
    # Calculate area of box1
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    
    # Calculate intersection
    x_left = max(box1[0], box2[0])
    y_top = max(box1[1], box2[1])
    x_right = min(box1[2], box2[2])
    y_bottom = min(box1[3], box2[3])
    
    if x_right < x_left or y_bottom < y_top:
        return False  # No intersection
    
    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    
    # Calculate ratio of intersection to box1 area
    overlap_ratio = intersection_area / area1
    
    return overlap_ratio >= threshold

def process_json_file(json_path: str, img_path: str, res_dir: str) -> str:
    '''Process a single JSON file with detected elements and save results.
    
    Returns:
        str: Path to the saved JSON result file
    '''

    # load json data
    json_data = load_json_boxes(json_path)
    
    # Load image with memory optimization
    image = cv2.imread(img_path)
    if image is None:
        raise ValueError(f"Could not load image: {img_path}")
    
    # Get image dimensions for memory management
    img_height, img_width = image.shape[:2]
    logger.debug(f"Processing image {img_path} with dimensions {img_width}x{img_height}") #type: ignore
    
    # Create output directory if it doesn't exist
    os.makedirs(res_dir, exist_ok=True)
    
    # Get the base filename (without extension) for naming output files
    base_filename = os.path.splitext(os.path.basename(img_path))[0]

    output = {
        "text": [],
        "formulae": [],
        "imgs": []
    }

    # First, find all text paragraphs to check for formula containment later
    text_boxes = []
    for box in json_data.get('boxes', []):
        if box.get('label') == 'text':
            text_boxes.append(box.get('coordinate'))

    # process data
    text_elements, formula_elements, image_elements = 0, 0, 0
    skipped_formulas = 0
    
    for box in json_data.get('boxes', []):
        label, coordinate = box.get('label'), box.get('coordinate')

        # First off, labels that can be safely ignored (don't need that data)
        if label in ["header", "number", "figure_title"]:
            continue
            
        # For formulas, check if they are contained within any text paragraph
        if label == "formula":
            # Check if this formula is contained within any text paragraph
            is_contained = False
            for text_box in text_boxes:
                if is_contained_within(coordinate, text_box):
                    skipped_formulas += 1
                    logger.debug(f"Skipping formula {skipped_formulas} as it's contained within a text paragraph") #type: ignore
                    is_contained = True
                    break
                    
            if is_contained:
                continue  # Skip this formula
        
        # Crop the image for processing
        cropped = crop_image(image, coordinate)
        
        # Skip processing if cropped image is too small or invalid
        if cropped is None or cropped.size == 0 or cropped.shape[0] < 10 or cropped.shape[1] < 10:
            logger.debug(f"Skipping {label} element with invalid or too small crop") #type: ignore
            continue

        # Process regular text
        if label == "text":
            text_elements += 1
            logger.debug(f"Processing text element {text_elements}") #type: ignore
            result = text_ocr.predict(cropped)
            for res in result:
                if 'rec_texts' in res:
                    logger.debug(f"Found {len(res['rec_texts'])} text segments") #type: ignore
                    for text in res['rec_texts']:
                        output["text"].append(text)
            
            # Clean up cropped image from memory
            del cropped
            continue

        # Process formulas (ones that aren't contained in text)
        if label == "formula":
            formula_elements += 1
            logger.debug(f"Processing formula element {formula_elements}") #type: ignore
            result = formula_ocr.predict(cropped)
            for res in result:
                if 'rec_formula' in res:
                    logger.debug(f"Found formula: {res['rec_formula']}") #type: ignore
                    output["formulae"].append(res['rec_formula'])
            
            # Clean up cropped image from memory
            del cropped
            continue

        # For images and tables, keep them
        if label in ["image", "figure", "table"]:
            image_elements += 1
            logger.debug(f"Detected {label} element {image_elements}, saving image.") #type: ignore
            # Create a specific filename for this image
            image_filename = f"{base_filename}_{label}_{image_elements}.png"
            image_path = os.path.join(res_dir, image_filename)
            
            # Ensure the output directory exists using PathResolver
            if path_resolver:
                path_resolver.ensure_directory_exists(res_dir)
            else:
                os.makedirs(res_dir, exist_ok=True)
            
            # Save the cropped image
            cv2.imwrite(image_path, cropped)
            
            # Add the image path to the output
            output["imgs"].append(image_path)
            
            # Clean up cropped image from memory
            del cropped
            continue

    logger.info(f"Processed {text_elements} text elements, {formula_elements} formula elements, and {image_elements} image/table elements.") #type: ignore
    logger.info(f"Skipped {skipped_formulas} formulas that were contained within text paragraphs.") #type: ignore
    
    # Clean up main image from memory
    del image
    
    # Write the output to a JSON file
    output_json_path = os.path.join(res_dir, f"{base_filename}_processed.json")
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=4)
    
    logger.info(f"Results saved to {output_json_path}") #type: ignore
    
    return output_json_path

def process_document_dir(base_dir: str):
    """
    Process all JSON files in subdirectories of base_dir with OCR.
    
    The expected structure is:
    base_dir/
        document1/
            json/
                page_1.jpg.json
                page_2.jpg.json
                ...
            images/
                page_1.jpg
                page_2.jpg
                ...
        document2/
            json/
                page_1.jpg.json
                ...
            images/
                page_1.jpg
                ...
    """
    logger.info(f"Starting OCR processing of documents from {base_dir}") #type: ignore
    
    # Resolve base directory path using PathResolver if available
    if path_resolver and not os.path.isabs(base_dir):
        base_dir = path_resolver.resolve_path(base_dir)
    
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
    
    total_processed = 0
    
    for doc_name in document_dirs:
        doc_path = os.path.join(base_dir, doc_name)
        json_path = os.path.join(doc_path, "json")
        images_path = os.path.join(doc_path, "images")
        
        if not os.path.exists(json_path):
            logger.warning(f"No json directory found for {doc_name} at {json_path}, skipping") #type: ignore
            continue
            
        if not os.path.exists(images_path):
            logger.warning(f"No images directory found for {doc_name} at {images_path}, skipping") #type: ignore
            continue
        
        # Create output directory for OCR results
        ocr_results_dir = os.path.join(doc_path, "ocr_results")
        if path_resolver:
            path_resolver.ensure_directory_exists(ocr_results_dir)
        else:
            os.makedirs(ocr_results_dir, exist_ok=True)
        
        # Get all JSON files for this document
        json_files = [f for f in os.listdir(json_path) if f.endswith('.json')]
        logger.info(f"Processing {len(json_files)} layout files for document: {doc_name}") #type: ignore
        
        for json_file in json_files:
            json_file_path = os.path.join(json_path, json_file)
            logger.debug(f"Processing JSON: {json_file_path}") #type: ignore
            
            # Extract the original image filename from the JSON filename
            # JSON filename format is typically: original_image_name.json
            img_name = json_file[:-5]  # Remove .json extension
            img_path = os.path.join(images_path, img_name)
            
            if not os.path.exists(img_path):
                logger.warning(f"Original image not found for {json_file} at {img_path}, skipping") #type: ignore
                continue
            
            try:
                # Process this JSON file with its corresponding image
                process_json_file(json_file_path, img_path, ocr_results_dir)
                total_processed += 1
            except Exception as e:
                logger.error(f"Error processing {json_file_path}: {str(e)}") #type: ignore
    
    logger.info(f"Completed OCR processing of {total_processed} files across {len(document_dirs)} documents") #type: ignore