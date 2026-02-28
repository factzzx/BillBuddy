import pytesseract
import cv2

def extract_text(image_path: str) -> str:
    """Reads an image from disk and returns extracted text."""
    img = cv2.imread(image_path)
    if img is None:
        return ""

    text = pytesseract.image_to_string(img)
    return text
