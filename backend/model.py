import os
from typing import Tuple, Optional

import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import LabelEncoder
from numpy import array

DATA_PATH = os.path.join(os.path.dirname(__file__), "nj_hospitals_mock.csv")


class PricePredictor(nn.Module):
    def __init__(self, input_size: int):
        super().__init__()
        self.fc1 = nn.Linear(input_size, 16)
        self.fc2 = nn.Linear(16, 1)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        return self.fc2(x)


def _train_model_from_csv() -> Tuple[PricePredictor, LabelEncoder]:
    """
    Internal helper: read CSV, encode procedures, train a small regression model.
    """

    df = pd.read_csv(DATA_PATH)

    # Encode procedure names as integers
    le_proc = LabelEncoder()
    df["procedure_encoded"] = le_proc.fit_transform(df["procedure_name"])

    # Features: [procedure_encoded, rating]
    X = df[["procedure_encoded", "rating"]].values
    y = df["avg_price_usd"].values

    X_tensor = torch.tensor(X, dtype=torch.float32)
    y_tensor = torch.tensor(y, dtype=torch.float32).view(-1, 1)

    model = PricePredictor(input_size=2)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    # Small training loop – dataset is tiny, so this is fast
    for epoch in range(300):
        optimizer.zero_grad()
        outputs = model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer.step()

    return model, le_proc


def load_model_if_ready() -> Tuple[Optional[PricePredictor], Optional[LabelEncoder]]:
    """
    Function Ali already uses in app.py.

    Tries to train a model from CSV. If anything fails, returns (None, None)
    so the app still runs without ML.
    """
    if not os.path.exists(DATA_PATH):
        print("[model] CSV not found, skipping model training.")
        return None, None

    try:
        model, le_proc = _train_model_from_csv()
        print("[model] PricePredictor trained successfully.")
        return model, le_proc
    except Exception as e:
        print(f"[model] Error training model: {e}")
        return None, None


def predict_price(
    price_model: PricePredictor,
    le_proc: LabelEncoder,
    procedure: str,
    rating: float = 4.3,
) -> Optional[float]:
    """
    Predict an expected price for the given procedure and rating.

    If procedure is unknown, fall back to a default encoding (0).
    """

    if price_model is None or le_proc is None:
        return None

    try:
        proc_encoded = le_proc.transform([procedure])[0]
    except ValueError:
        # If the procedure wasn't seen during training, just map to 0
        proc_encoded = 0

    x = array([[proc_encoded, rating]], dtype="float32")
    x_tensor = torch.tensor(x)

    with torch.no_grad():
        pred = price_model(x_tensor).item()

    return float(pred)