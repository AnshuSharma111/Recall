from pdf2image import convert_from_path
import os

def pdf_to_img(pdf_path: str, img_dir: str, img_format: str = "JPEG"):
    """
    Converts every page of a PDF to images and saves them in img_dir.
    Returns a list of saved image file paths.
    """
    os.makedirs(img_dir, exist_ok=True)
    images = convert_from_path(pdf_path, dpi=350)
    saved_paths = []
    ext = ".jpg" if img_format.upper() == "JPEG" else ".png"
    for i, img in enumerate(images):
        out_path = os.path.join(img_dir, f"page_{i + 1}{ext}")
        img.save(out_path, img_format.upper())
        saved_paths.append(out_path)
    return saved_paths