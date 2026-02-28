# backend/ocr.py

import pytesseract
import cv2

# IMPORTANT: set this path correctly
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def extract_text(image_path: str) -> str:
    """
    Runs real OCR on the uploaded image.
    """
    img = cv2.imread(image_path)

    if img is None:
        return ""

    # Optional: convert to grayscale for better OCR
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    text = pytesseract.image_to_string(gray)

    return text