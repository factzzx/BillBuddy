# backend/ocr.py

import os
import pytesseract
import cv2

# Use system Tesseract on macOS/Linux; Windows needs explicit path if not on PATH
if os.name == "nt":
    _tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(_tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = _tesseract_path


def extract_text(image_path: str) -> str:
    """
    Runs OCR on the uploaded image. Returns empty string if file is not an image or OCR fails.
    """
    img = cv2.imread(image_path)
    if img is None:
        return ""

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        text = pytesseract.image_to_string(gray)
        return text or ""
    except Exception:
        return ""