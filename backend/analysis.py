import os
from typing import Dict, Any, List

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Path to CSV in the same backend folder
DATA_PATH = os.path.join(os.path.dirname(__file__), "nj_hospitals_mock.csv")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


def analyze_bill(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compare the user's bill to NJ hospital data for the same procedure.

    Returns a dict that extends the original structure Ali used:
    {
        "overcharge_flag": bool,
        "savings_estimate": float | None,
        "notes": [str, ...],
        "procedure_name": str,
        "average_price": float | None,
        "user_price": float,
        "difference_pct": float | None,
        "plot_path": str | None,
    }
    """

    procedure_name = parsed_data.get("procedure", "Unknown")
    user_amount = parsed_data.get("amount", 0.0)
    notes: List[str] = []

    if not os.path.exists(DATA_PATH):
        notes.append("Pricing dataset not found.")
        return {
            "overcharge_flag": False,
            "savings_estimate": None,
            "notes": notes,
            "procedure_name": procedure_name,
            "average_price": None,
            "user_price": user_amount,
            "difference_pct": None,
            "plot_path": None,
        }

    df = pd.read_csv(DATA_PATH)

    # Filter by procedure name
    procedure_data = df[df["procedure_name"] == procedure_name]

    if procedure_data.empty:
        notes.append(
            f"Procedure '{procedure_name}' not found in NJ dataset. "
            "Using raw bill amount without comparison."
        )
        return {
            "overcharge_flag": False,
            "savings_estimate": None,
            "notes": notes,
            "procedure_name": procedure_name,
            "average_price": None,
            "user_price": user_amount,
            "difference_pct": None,
            "plot_path": None,
        }

    avg_price = procedure_data["avg_price_usd"].mean()

    # Overcharge rule: more than 25% above average
    overcharge_flag = user_amount > avg_price * 1.25
    difference_pct = ((user_amount - avg_price) / avg_price * 100.0) if avg_price else None

    savings_estimate = None
    if overcharge_flag:
        savings_estimate = max(0.0, user_amount - avg_price)
        notes.append(
            f"Bill appears high: about {difference_pct:.1f}% above NJ average "
            f"for {procedure_name}."
        )
        notes.append(
            f"Estimated possible savings if reduced to average: ${savings_estimate:.2f}."
        )
    else:
        notes.append(
            f"Bill is within a reasonable range of the NJ average for {procedure_name}."
        )

    # Generate comparison plot
    os.makedirs(STATIC_DIR, exist_ok=True)

    try:
        plt.figure(figsize=(10, 5))
        plt.bar(procedure_data["hospital_name"], procedure_data["avg_price_usd"])
        plt.xticks(rotation=45, ha="right")
        plt.title(f"NJ Prices for {procedure_name}")
        plt.ylabel("Average Price (USD)")
        plt.tight_layout()

        plot_path = os.path.join(STATIC_DIR, "price_plot.png")
        plt.savefig(plot_path)
        plt.close()
    except Exception as e:
        plot_path = None
        notes.append(f"Could not generate chart: {e}")

    return {
        "overcharge_flag": bool(overcharge_flag),
        "savings_estimate": float(savings_estimate) if savings_estimate is not None else None,
        "notes": notes,
        "procedure_name": procedure_name,
        "average_price": float(avg_price),
        "user_price": float(user_amount),
        "difference_pct": float(difference_pct) if difference_pct is not None else None,
        "plot_path": plot_path,
    }