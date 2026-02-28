import os
import uuid
from flask import Flask, request, jsonify

from ocr import extract_text
from utils import parse_bill_text
from analysis import analyze_bill
from model import load_model_if_ready, predict_price

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Try to load model once at startup (won't crash if not ready)
price_model, le_proc = load_model_if_ready()

app = Flask(__name__)

@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "message": "BillBuddy backend running",
        "routes": ["/ (GET)", "/upload (POST)"]
    })

@app.route("/upload", methods=["POST"])
def upload_bill():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Save safely (unique filename)
    ext = os.path.splitext(file.filename)[1].lower() or ".png"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, saved_name)
    file.save(filepath)

    # 1) OCR
    ocr_text = extract_text(filepath)

    # 2) Parse bill text
    parsed_data = parse_bill_text(ocr_text)

    # 3) Analyze vs NJ dataset
    analysis_result = analyze_bill(parsed_data)

    # 4) Predict expected price (only if model exists)
    predicted_price = None
    if price_model is not None and le_proc is not None:
        predicted_price = predict_price(
            price_model,
            le_proc,
            parsed_data.get("procedure", "Unknown"),
            rating=4.3
        )

    response = {
        "file_info": {
            "original_filename": file.filename,
            "stored_filename": saved_name
        },
        "ocr": {
            "raw_text_preview": ocr_text[:500]
        },
        "parsed_data": parsed_data,
        "analysis": analysis_result,
        "ml_prediction": {"predicted_price": predicted_price}
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True, port=5000)