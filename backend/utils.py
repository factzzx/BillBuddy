import re
from typing import Dict, Any

def parse_bill_text(text: str) -> Dict[str, Any]:
    """Parses bill text into structured fields.

    Expected patterns in the text:
      Hospital: <name>
      Procedure: <name>
      Amount: <number>
      Insurance: <name>
    """
    hospital = re.search(r"Hospital:\s*(.*)", text)
    procedure = re.search(r"Procedure:\s*(.*)", text)
    amount = re.search(r"Amount:\s*\$?(\d+(\.\d+)?)", text)
    insurance = re.search(r"Insurance:\s*(.*)", text)

    parsed = {
        "hospital": hospital.group(1).strip() if hospital else "Unknown",
        "procedure": procedure.group(1).strip() if procedure else "Unknown",
        "amount": float(amount.group(1)) if amount else 0.0,
        "insurance": insurance.group(1).strip() if insurance else "Unknown"
    }
    return parsed
