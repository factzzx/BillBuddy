# BillBuddy

BillBuddy is an AI-powered healthcare bill negotiation copilot that helps patients understand and challenge their medical bills. Users upload a photo of their bill, and BillBuddy automatically reads it, compares the charges against real hospital pricing data, flags any overcharges, and generates a personalized negotiation script so they can confidently fight for a fair price.

## TEAM
| Name    | Role                              |
|---------|-----------------------------------|
| Ali     | Backend Lead (Flask API)          |
| Rushil  | Data & ML Engineer (PyTorch)      |
| Antonio | Frontend Developer (UI)           |
| Taha    | Infrastructure / DevOps           |
| Thomas  | Product / UX / Documentation      |

## Procedure

1, Upload an image of a medical bill.

2, OCR will convert the image into machine readable text.

3, BillBuddy will parse hospital, procedure, amount and balance.

4, BillBuddy will then compare the prices against NJ hospital price dataset.

5, BillBuddy will predict expected price with PyTorch model.


## SETUP

### 1. Clone the repo
```bash
   git clone https://github.com/<your-username>/BillBuddy.git
   cd BillBuddy
```

### 2. Create a virtual environment
```bash
python -m venv venv
```

Activate it:
- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the backend
```bash
cd backend
python app.py
```

You should see Flask start up at: `http://127.0.0.1:5000/`

Visiting that URL in your browser should return:
```json
{ "status": "BillBuddy backend running" }
```

### 5. Open the frontend
Open `frontend/index.html` in your browser. No extra server needed — just double-click the file.

---