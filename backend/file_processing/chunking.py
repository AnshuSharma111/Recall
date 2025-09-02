from paddleocr import LayoutDetection
import os
from utils.logger_config import get_logger

# Get the shared logger instance
logger = get_logger()

model = LayoutDetection(model_name="PP-DocLayout_plus-L")

JSON_OUTPUT_DIR = "./output/json"
IMG_OUTPUT_DIR = "./output/images"

def chunk_files(img_dir: str):
    logger.info(f"Starting chunking of images from {img_dir}") #type: ignore
    images = [f for f in os.listdir(img_dir) if os.path.isfile(os.path.join(img_dir, f))]
    logger.info(f"Found {len(images)} images to process") #type: ignore

    for img_name in images:
        logger.debug(f"Processing image: {img_name}") #type: ignore
        output = model.predict(os.path.join(img_dir, img_name), batch_size=1, layout_nms=True)
        for res in output:
            res.print()
            res.save_to_img(save_path=IMG_OUTPUT_DIR)
            res.save_to_json(save_path=JSON_OUTPUT_DIR + f"/{img_name}.json")
        logger.debug(f"Finished processing image: {img_name}") #type: ignore

    logger.info(f"Completed chunking of {len(images)} images") #type: ignore