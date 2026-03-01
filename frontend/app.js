(function () {
  "use strict";

  var API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:5000" : "";
  var dropZone = document.getElementById("drop-zone");
  var fileInput = document.getElementById("file-input");
  var fileNameEl = document.getElementById("file-name");
  var form = document.getElementById("upload-form");
  var submitBtn = document.getElementById("submit-btn");
  var loading = document.getElementById("loading");
  var error = document.getElementById("error");
  var errorMessage = document.getElementById("error-message");
  var results = document.getElementById("results");

  function showLoading(show) {
    loading.hidden = !show;
    if (show) {
      error.hidden = true;
      results.hidden = true;
    }
  }

  function showError(msg) {
    error.hidden = false;
    errorMessage.textContent = msg;
    results.hidden = true;
  }

  function hideError() {
    error.hidden = true;
  }

  function showResults() {
    error.hidden = true;
    results.hidden = false;
  }

  function formatMoney(n) {
    if (n == null || typeof n !== "number") return "—";
    return "$" + n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  }

  function renderResults(data) {
    var parsed = data.parsed_data || {};
    var analysis = data.analysis || {};
    var ml = data.ml_prediction || {};

    document.getElementById("result-hospital").textContent = parsed.hospital || "—";
    document.getElementById("result-procedure").textContent = parsed.procedure || "—";
    document.getElementById("result-amount").textContent = formatMoney(parsed.amount);
    document.getElementById("result-insurance").textContent = parsed.insurance || "—";

    var badge = document.getElementById("comparison-badge");
    badge.textContent = "";
    badge.className = "badge";
    if (analysis.overcharge_flag) {
      badge.textContent = "Possible overcharge";
      badge.classList.add("overcharge");
    } else {
      badge.textContent = "Within range";
      badge.classList.add("within-range");
    }

    document.getElementById("result-user-price").textContent = formatMoney(analysis.user_price);
    document.getElementById("result-avg-price").textContent = formatMoney(analysis.average_price);

    var savingsWrap = document.getElementById("savings-wrap");
    var savingsEl = document.getElementById("result-savings");
    if (analysis.overcharge_flag && analysis.savings_estimate != null) {
      savingsWrap.hidden = false;
      savingsEl.textContent = formatMoney(analysis.savings_estimate);
    } else {
      savingsWrap.hidden = true;
    }

    var mlWrap = document.getElementById("ml-prediction-wrap");
    var predEl = document.getElementById("result-predicted-price");
    if (ml.predicted_price != null) {
      mlWrap.hidden = false;
      predEl.textContent = formatMoney(ml.predicted_price);
    } else {
      mlWrap.hidden = true;
    }

    var notesList = document.getElementById("result-notes");
    notesList.innerHTML = "";
    (analysis.notes || []).forEach(function (note) {
      var li = document.createElement("li");
      li.textContent = note;
      notesList.appendChild(li);
    });

    var negSection = document.getElementById("negotiation-section");
    var tipsList = document.getElementById("negotiation-tips");
    tipsList.innerHTML = "";
    if (analysis.overcharge_flag) {
      negSection.hidden = false;
      var diffPct = analysis.difference_pct;
      var avg = analysis.average_price;
      var savings = analysis.savings_estimate;
      var tips = [
        "Ask the billing department for an itemized bill and the CPT/procedure codes.",
        "Say: \"My bill is about " + (diffPct != null ? diffPct.toFixed(0) : "?") + "% above the typical range for this procedure in NJ. I'd like to pay closer to the average of " + formatMoney(avg) + ".\"",
        "Ask if they offer financial assistance, payment plans, or a self-pay / cash discount.",
        "Offer to pay in full in exchange for a reduced amount (e.g. " + formatMoney(savings || avg) + ")."
      ];
      tips.forEach(function (tip) {
        var li = document.createElement("li");
        li.textContent = tip;
        tipsList.appendChild(li);
      });
    } else {
      negSection.hidden = true;
    }

    window.__lastBillData = data;
  }

  function readAloud() {
    var data = window.__lastBillData;
    if (!data || !window.speechSynthesis) return;
    var parsed = data.parsed_data || {};
    var analysis = data.analysis || {};
    var parts = [
      "Your bill: " + (parsed.hospital || "Unknown") + ", " + (parsed.procedure || "Unknown") + ", " + formatMoney(parsed.amount) + ". ",
      analysis.overcharge_flag ? "This bill appears high compared to NJ averages. " : "Your bill is within a reasonable range. "
    ];
    (analysis.notes || []).slice(0, 2).forEach(function (n) {
      parts.push(n + " ");
    });
    if (analysis.overcharge_flag) {
      parts.push("You can negotiate by asking for an itemized bill and quoting the NJ average of " + formatMoney(analysis.average_price) + ".");
    }
    var u = new SpeechSynthesisUtterance(parts.join(""));
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    var files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      fileNameEl.textContent = files[0].name;
      submitBtn.disabled = false;
    }
  });

  fileInput.addEventListener("change", function () {
    var files = fileInput.files;
    if (files.length) {
      fileNameEl.textContent = files[0].name;
      submitBtn.disabled = false;
    } else {
      fileNameEl.textContent = "";
      submitBtn.disabled = true;
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!fileInput.files.length) return;
    var formData = new FormData();
    formData.append("file", fileInput.files[0]);
    showLoading(true);
    hideError();
    fetch(API_BASE + "/upload", {
      method: "POST",
      body: formData
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (j) {
            var msg = j.error || "Upload failed";
            if (j.detail) msg += " — " + j.detail;
            throw new Error(msg);
          }).catch(function (e) {
            if (e.message && e.message.indexOf("Upload failed") === -1) throw e;
            throw new Error("Upload failed: " + res.status);
          });
        }
        return res.json();
      })
      .then(function (data) {
        showLoading(false);
        renderResults(data);
        showResults();
      })
      .catch(function (err) {
        showLoading(false);
        var msg = err.message || "Something went wrong.";
        if (msg === "Failed to fetch" || msg.toLowerCase().includes("fetch")) {
          msg = "Could not reach the server. Start the backend (cd backend && python app.py), then open http://127.0.0.1:5000/ in your browser instead of opening the file directly.";
        } else {
          msg = msg + " Make sure the backend is running at http://127.0.0.1:5000";
        }
        showError(msg);
      });
  });

  document.getElementById("read-aloud-btn").addEventListener("click", readAloud);
})();
