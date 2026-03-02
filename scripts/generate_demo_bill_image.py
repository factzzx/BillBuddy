#!/usr/bin/env python3
"""
Generate a demo bill image for live demos. The image contains plain text that
OCR (Tesseract) can read and that utils.parse_bill_text() expects.

Usage (from project root):
  python scripts/generate_demo_bill_image.py

Creates: backend/demo_bill.png
"""

import os
import sys

# Project root = parent of scripts/
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
OUT_PATH = os.path.join(BACKEND_DIR, "demo_bill.png")

# Text that must appear in the image (exact labels for parser)
# Procedure must match nj_hospitals_mock.csv: Chest X-Ray, MRI Brain, etc.
# Amount 600 for Chest X-Ray is >125% of NJ average (~455) -> overcharge scenario
DEMO_LINES = [
    "Hospital: Hackensack University Medical Center",
    "Procedure: Chest X-Ray",
    "Amount: 1000",
    "Insurance: Aetna",
]


def main():
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib is required. pip install matplotlib")
        sys.exit(1)

    text = "\n".join(DEMO_LINES)
    fig, ax = plt.subplots(figsize=(6, 3))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 4)
    ax.axis("off")
    ax.text(1, 2.5, text, fontsize=14, fontfamily="monospace", verticalalignment="top")
    ax.text(1, 0.5, "Sample bill for BillBuddy demo", fontsize=10, color="gray")
    os.makedirs(BACKEND_DIR, exist_ok=True)
    plt.savefig(OUT_PATH, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"Created: {OUT_PATH}")
    print("Use this file in the app to demo overcharge detection (Chest X-Ray $600 vs NJ average ~$455).")


if __name__ == "__main__":
    main()
