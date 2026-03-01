// =========================
// Config
// =========================
const API_BASE_URL = "http://127.0.0.1:5000"; // Flask backend

// =========================
// DOM Elements
// =========================
const form = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const fileNameEl = document.getElementById("file-name");
const submitBtn = document.getElementById("submit-btn");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const errorMessage = document.getElementById("error-message");
const results = document.getElementById("results");

const chartSection = document.getElementById("chart-section");
const priceChartImg = document.getElementById("price-chart");
// Bill details
const resultHospital = document.getElementById("result-hospital");
const resultProcedure = document.getElementById("result-procedure");
const resultAmount = document.getElementById("result-amount");
const resultInsurance = document.getElementById("result-insurance");

// Comparison section
const comparisonBadge = document.getElementById("comparison-badge");
const resultUserPrice = document.getElementById("result-user-price");
const resultAvgPrice = document.getElementById("result-avg-price");
const savingsWrap = document.getElementById("savings-wrap");
const resultSavings = document.getElementById("result-savings");
const mlPredictionWrap = document.getElementById("ml-prediction-wrap");
const resultPredictedPrice = document.getElementById("result-predicted-price");
const resultNotesList = document.getElementById("result-notes");

// Negotiation section
const negotiationSection = document.getElementById("negotiation-section");
const negotiationTipsList = document.getElementById("negotiation-tips");
const readAloudBtn = document.getElementById("read-aloud-btn");

// =========================
// Helpers
// =========================
function formatMoney(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "N/A";
  }
  return `$${value.toFixed(2)}`;
}

function clearResults() {
  chartSection.hidden = true;
  priceChartImg.src = "";
  results.hidden = true;
  errorBox.hidden = true;
  negotiationSection.hidden = true;
  resultNotesList.innerHTML = "";
  negotiationTipsList.innerHTML = "";
  comparisonBadge.textContent = "";
  savingsWrap.hidden = true;
  mlPredictionWrap.hidden = true;
}

// =========================
// File Selection + Drag & Drop
// =========================
dropZone.addEventListener("click", () => {
  fileInput.click();
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drop-zone--active");
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drop-zone--active");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drop-zone--active");

  const file = e.dataTransfer.files[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    fileNameEl.textContent = file.name;
    submitBtn.disabled = false;
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    fileNameEl.textContent = file.name;
    submitBtn.disabled = false;
  } else {
    fileNameEl.textContent = "";
    submitBtn.disabled = true;
  }
});

// =========================
// Main submit handler
// =========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  clearResults();

  const file = fileInput.files[0];
  if (!file) {
    errorBox.hidden = false;
    errorMessage.textContent = "Please select a bill image or PDF first.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file); // key MUST be "file" (matches Flask)

  loading.hidden = false;

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST", // important
      body: formData,
    });

    // If backend returns HTML or an error, handle it
    const contentType = response.headers.get("Content-Type") || "";
    let data;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Backend error (${response.status}): ${text.slice(0, 120)}`
      );
    }

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(
        `Expected JSON but got: ${text.slice(0, 80)}`
      );
    }

    data = await response.json();
    loading.hidden = true;

    renderResults(data);
  } catch (err) {
    console.error(err);
    loading.hidden = true;
    errorBox.hidden = false;
    errorMessage.textContent =
      `Unexpected error: ${err.message}. ` +
      `Make sure the backend is running at http://127.0.0.1:5000`;
  }
});

// =========================
// Render results
// =========================
function renderResults(data) {
  const parsed = data.parsed_data || {};
  const analysis = data.analysis || {};
  const ml = data.ml_prediction || {};

  // Bill details
  resultHospital.textContent = parsed.hospital || "Unknown hospital";
  resultProcedure.textContent = parsed.procedure || "Unknown procedure";
  resultAmount.textContent = formatMoney(parsed.amount || analysis.user_price);
  resultInsurance.textContent = parsed.insurance || "Unknown / Not detected";

  // Comparison
  const userPrice = analysis.user_price ?? parsed.amount;
  const avgPrice = analysis.average_price;
  const diffPct = analysis.difference_pct;
  const savingsEstimate = analysis.savings_estimate;

  resultUserPrice.textContent = formatMoney(Number(userPrice));
  resultAvgPrice.textContent = formatMoney(
    typeof avgPrice === "number" ? avgPrice : null
  );

  // Badge + savings
  setComparisonBadge(analysis.overcharge_flag, diffPct);

  if (typeof savingsEstimate === "number" && savingsEstimate > 0) {
    savingsWrap.hidden = false;
    resultSavings.textContent = formatMoney(savingsEstimate);
  } else {
    savingsWrap.hidden = true;
  }

  // ML prediction
  if (typeof ml.predicted_price === "number") {
    mlPredictionWrap.hidden = false;
    resultPredictedPrice.textContent = formatMoney(ml.predicted_price);
  } else {
    mlPredictionWrap.hidden = true;
  }

  // ----- Chart image -----
  if (analysis.plot_path) {
    // Backend currently writes price_plot.png in backend/static.
    // Flask serves it at /static/price_plot.png.
    // We ignore the Windows path and use the known URL.
    const chartUrl = "http://127.0.0.1:5000/static/price_plot.png";

    // Cache-buster so the browser doesn't reuse an old image
    priceChartImg.src = `${chartUrl}?t=${Date.now()}`;
    chartSection.hidden = false;
  } else {
    chartSection.hidden = true;
  }

  // Notes
  const notes = analysis.notes || [];
  resultNotesList.innerHTML = "";
  notes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    resultNotesList.appendChild(li);
  });

  // Negotiation tips
  buildNegotiationTips(analysis, parsed, ml);

  results.hidden = false;
}

// =========================
// Comparison badge
// =========================
function setComparisonBadge(overchargeFlag, diffPct) {
  comparisonBadge.className = "badge"; // reset classes

  if (overchargeFlag === true) {
    comparisonBadge.textContent =
      diffPct != null
        ? `Likely overcharged by ~${diffPct.toFixed(1)}%`
        : "Likely overcharged";
    comparisonBadge.classList.add("badge--warning");
  } else if (overchargeFlag === false) {
    comparisonBadge.textContent =
      diffPct != null
        ? `Within normal range (about ${diffPct.toFixed(1)}% above average)`
        : "Within normal range";
    comparisonBadge.classList.add("badge--ok");
  } else {
    comparisonBadge.textContent = "Not enough data to compare";
    comparisonBadge.classList.add("badge--neutral");
  }
}

// =========================
// Negotiation tips
// =========================
function buildNegotiationTips(analysis, parsed, ml) {
  const tips = [];
  const hospital = parsed.hospital || "the hospital";
  const procedure = parsed.procedure || "this procedure";

  if (analysis.overcharge_flag) {
    tips.push(
      `Call ${hospital} billing department and mention that your bill for ${procedure} is about ` +
        `${analysis.difference_pct?.toFixed(1) || "X"}% higher than the New Jersey average.`
    );
    if (analysis.savings_estimate && analysis.savings_estimate > 0) {
      tips.push(
        `Ask if they can match the average price – that could save you around ${formatMoney(
          analysis.savings_estimate
        )}.`
      );
    }
  } else {
    tips.push(
      `Your price looks within a normal range. If you still need support, you can ask ${hospital} if they offer payment plans or financial assistance.`
    );
  }

if (typeof ml.predicted_price === "number") {
  const diff = Math.abs(ml.predicted_price - (analysis.user_price || 0));

  if (diff > (analysis.user_price || 0) * 0.5) {
    tips.push(
      `Our AI model predicted ${formatMoney(ml.predicted_price)}, but due to limited training data this estimate may vary significantly.`
    );
  } else {
    tips.push(
      `Our AI model estimates a fair price of around ${formatMoney(
        ml.predicted_price
      )}. You can use this as another reference when negotiating.`
    );
  }
}
  negotiationTipsList.innerHTML = "";
  tips.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    negotiationTipsList.appendChild(li);
  });

  if (tips.length > 0) {
    negotiationSection.hidden = false;
  } else {
    negotiationSection.hidden = true;
  }
}

// =========================
// Read aloud (optional)
// =========================
if ("speechSynthesis" in window && readAloudBtn) {
  readAloudBtn.addEventListener("click", () => {
    const parts = [];

    if (!results.hidden) {
      parts.push(
        `Hospital: ${resultHospital.textContent}. Procedure: ${resultProcedure.textContent}.`
      );
      parts.push(
        `Your price is ${resultUserPrice.textContent}. NJ average is ${resultAvgPrice.textContent}.`
      );
      if (!savingsWrap.hidden) {
        parts.push(
          `Estimated savings if adjusted: ${resultSavings.textContent}.`
        );
      }
      if (!mlPredictionWrap.hidden) {
        parts.push(
          `Our AI model predicts a fair price of ${resultPredictedPrice.textContent}.`
        );
      }
    }

    const utterance = new SpeechSynthesisUtterance(parts.join(" "));
    window.speechSynthesis.speak(utterance);
  });
}