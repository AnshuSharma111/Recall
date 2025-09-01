from paddleocr import LayoutDetection
import os

model = LayoutDetection(model_name="PP-DocLayout_plus-L")

JSON_OUTPUT_DIR = "./output/json"
IMG_OUTPUT_DIR = "./output/images"

def chunk_files (img_dir: str):
    images = [f for f in os.listdir(img_dir) if os.path.isfile(os.path.join(img_dir, f))]

    for img_name in images:
        output = model.predict(os.path.join(img_dir, img_name), batch_size=1, layout_nms=True)
        for res in output:
            res.print()
            res.save_to_img(save_path=IMG_OUTPUT_DIR)
            res.save_to_json(save_path=JSON_OUTPUT_DIR + f"/{img_name}.json")