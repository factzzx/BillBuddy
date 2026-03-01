import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from ocr import extract_text
from utils import parse_bill_text
from analysis import analyze_bill
from model import load_model_if_ready, predict_price

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Try to load model once at startup (won't crash if not ready)
price_model, le_proc = load_model_if_ready()

app = Flask(__name__)
CORS(app)


@app.route("/", methods=["GET"])
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api", methods=["GET"])
def api_info():
    return jsonify({
        "message": "BillBuddy backend running",
        "routes": ["/ (GET – frontend)", "/upload (POST)", "/api (GET)"]
    })


@app.route("/<path:path>", methods=["GET"])
def frontend_static(path):
    if path in ("styles.css", "app.js"):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, path) if os.path.exists(os.path.join(FRONTEND_DIR, path)) else ("Not Found", 404)

@app.route("/upload", methods=["POST"])
def upload_bill():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    ext = os.path.splitext(file.filename)[1].lower() or ".png"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, saved_name)

    try:
        file.save(filepath)
    except Exception as e:
        return jsonify({"error": f"Could not save file: {e}"}), 500

    try:
        ocr_text = extract_text(filepath)
    except Exception as e:
        return jsonify({
            "error": "OCR failed. If you're on Mac, install Tesseract: brew install tesseract",
            "detail": str(e),
        }), 500

    parsed_data = parse_bill_text(ocr_text)

    try:
        analysis_result = analyze_bill(parsed_data)
    except Exception as e:
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500

    predicted_price = None
    if price_model is not None and le_proc is not None:
        try:
            predicted_price = predict_price(
                price_model,
                le_proc,
                parsed_data.get("procedure", "Unknown"),
                rating=4.3,
            )
        except Exception:
            predicted_price = None

    response = {
        "file_info": {
            "original_filename": file.filename,
            "stored_filename": saved_name,
        },
        "ocr": {"raw_text_preview": ocr_text[:500]},
        "parsed_data": parsed_data,
        "analysis": analysis_result,
        "ml_prediction": {"predicted_price": predicted_price},
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True, port=5000)