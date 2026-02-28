let currentMode = "compact";
let fastData = null;
let detailData = null;
let currentCategory = "general";
let acvData = { msrp: 0, age: 0 };

// ── Depreciation schedules ───────────────────────────────────────────────────

const CATEGORY_DEPRECIATION = {
  tv:              { rate: 0.15, floor: 0.10, label: "Electronics / TV" },
  electronics:     { rate: 0.15, floor: 0.10, label: "Electronics" },
  refrigerator:    { rate: 0.10, floor: 0.15, label: "Major Appliance" },
  washer:          { rate: 0.10, floor: 0.15, label: "Major Appliance" },
  dryer:           { rate: 0.10, floor: 0.15, label: "Major Appliance" },
  dishwasher:      { rate: 0.10, floor: 0.15, label: "Major Appliance" },
  range:           { rate: 0.10, floor: 0.15, label: "Major Appliance" },
  hvac:            { rate: 0.08, floor: 0.20, label: "HVAC System" },
  water_heater:    { rate: 0.10, floor: 0.15, label: "Water Heater" },
  computer:        { rate: 0.25, floor: 0.05, label: "Computer / Laptop" },
  laptop:          { rate: 0.25, floor: 0.05, label: "Computer / Laptop" },
  small_appliance: { rate: 0.20, floor: 0.10, label: "Small Appliance" },
  general:         { rate: 0.12, floor: 0.10, label: "General" }
};

// ── Retailer URL builders ────────────────────────────────────────────────────

const RETAILER_URLS = {
  "Best Buy":    (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
  "Walmart":     (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  "Home Depot":  (q) => `https://www.homedepot.com/s/${encodeURIComponent(q)}`,
  "Lowe's":      (q) => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}`,
  "AJ Madison":  (q) => `https://www.ajmadison.com/cgi-bin/ajmadison/search.html?query=${encodeURIComponent(q)}`,
  "Target":      (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  "B&H":         (q) => `https://www.bhphotovideo.com/c/search?Ntt=${encodeURIComponent(q)}`,
  "Manufacturer":(q) => `https://www.google.com/search?q=${encodeURIComponent(q + " official site")}`
};

// Category-based retailer filters (sets of allowed retailers)
const ELECTRONICS_ONLY = new Set(["Best Buy", "Walmart", "Target", "B&H", "Manufacturer"]);
const HVAC_ONLY = new Set(["Home Depot", "Lowe's", "AJ Madison", "Manufacturer", "Walmart"]);

function getRetailerFilter(category) {
  const cat = (category || "general").toLowerCase();
  if (cat === "tv" || cat === "computer" || cat === "laptop") return ELECTRONICS_ONLY;
  if (cat === "hvac" || cat === "water_heater") return HVAC_ONLY;
  return null; // null = no filter, show all
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function byId(id) {
  return document.getElementById(id);
}

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function setText(id, value, fallback = "N/A") {
  const el = byId(id);
  if (!el) return;
  el.textContent = safeText(value, fallback);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function show(elOrId, shouldShow) {
  const el = typeof elOrId === "string" ? byId(elOrId) : elOrId;
  if (!el) return;
  el.classList.toggle("hidden", !shouldShow);
}

// ── ACV calculation ──────────────────────────────────────────────────────────

function fmtDollars(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function calcACV(msrp, age, category) {
  const sched = CATEGORY_DEPRECIATION[category] || CATEGORY_DEPRECIATION.general;
  const raw = msrp * Math.pow(1 - sched.rate, age) * 0.75;
  const floor = msrp * sched.floor;
  const acv = Math.max(raw, floor);
  return { acv, raw, floor, sched };
}

function buildACVSteps(msrp, age, result) {
  const { acv, raw, floor, sched } = result;
  const floorUsed = raw < floor;
  return [
    `Launch MSRP:           ${fmtDollars(msrp)}`,
    `Category:              ${sched.label}`,
    `Depreciation rate:     ${(sched.rate * 100).toFixed(0)}%/year`,
    `Age:                   ${age} year${age !== 1 ? "s" : ""}`,
    `Pre-floor ACV:         ${fmtDollars(msrp)} × (1 - ${sched.rate})^${age} × 0.75 = ${fmtDollars(raw)}`,
    `Floor value (${(sched.floor * 100).toFixed(0)}%):    ${fmtDollars(floor)}`,
    floorUsed
      ? `Floor applied ⤷        Est. ACV = ${fmtDollars(acv)}`
      : `Est. ACV =             ${fmtDollars(acv)}`
  ].join("\n");
}

function renderACVDisplay(msrp, age, category) {
  const result = calcACV(msrp, age, category);
  const acvStr = fmtDollars(result.acv);
  setText("r-acv", acvStr);
  setText("qv-acv", acvStr);
  setText(
    "r-acv-formula",
    `ACV = MSRP × (1 − rate)^years × 0.75, floor at ${(result.sched.floor * 100).toFixed(0)}%`,
    ""
  );
  const stepsEl = byId("r-acv-steps");
  if (stepsEl) {
    stepsEl.textContent = buildACVSteps(msrp, age, result);
    stepsEl.style.display = "block";
  }
}

// ── View toggle ──────────────────────────────────────────────────────────────

function toggleView() {
  const toggleBtn = byId("view-toggle");
  if (!toggleBtn) return;
  if (currentMode === "compact") {
    currentMode = "expanded";
    document.body.classList.add("is-expanded");
    toggleBtn.textContent = "Expanded View";
    toggleBtn.classList.remove("active");
  } else {
    currentMode = "compact";
    document.body.classList.remove("is-expanded");
    toggleBtn.textContent = "Compact View";
    toggleBtn.classList.add("active");
  }
}

// ── Recalculate ACV (from age input, no API call) ────────────────────────────

function recalcACV() {
  const input = byId("acv-age-input");
  if (!input || !acvData.msrp) return;
  const age = Number(input.value || 0);
  if (!Number.isFinite(age) || age < 0) return;
  renderACVDisplay(acvData.msrp, age, currentCategory);
}

// ── Retailer link builder ────────────────────────────────────────────────────

function buildRetailerLinks(retailerCsv, searchQuery) {
  if (!retailerCsv || retailerCsv === "N/A") {
    return '<span class="none-found">No retailer info</span>';
  }
  const filter = getRetailerFilter(currentCategory);
  const names = retailerCsv.split(",").map((s) => s.trim()).filter(Boolean);
  const links = names
    .filter((name) => !filter || filter.has(name))
    .map((name) => {
      const urlFn = RETAILER_URLS[name];
      if (!urlFn) return null;
      return `<a href="${escapeHtml(urlFn(searchQuery))}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`;
    })
    .filter(Boolean);
  return links.length
    ? `<span class="retailer-links">${links.join("")}</span>`
    : '<span class="none-found">No retailer links available</span>';
}

// ── renderFast ───────────────────────────────────────────────────────────────

function renderFast(data) {
  if (!data || typeof data !== "object") return;
  fastData = data;

  const analysis = data.analysis || {};
  const releaseDate = data.releaseDate || {};
  const searchTier = Number(data.searchTier) || 1;
  currentCategory = analysis.category || "general";

  // Tier badge
  const tierMap = {
    "Entry Level":       "tier-entry",
    "Mid-Grade":         "tier-mid",
    "Upper Mid-Grade":   "tier-upper",
    "Premium":           "tier-premium",
    "Luxury / Designer": "tier-luxury"
  };
  const tierBadgeEl = byId("tier-badge");
  if (tierBadgeEl && analysis.tier) {
    tierBadgeEl.textContent = analysis.tier;
    tierBadgeEl.className = `tier-badge ${tierMap[analysis.tier] || "tier-entry"}`;
    tierBadgeEl.classList.remove("hidden");
  }

  // Section 1 text
  setText("r-overview", analysis.quickSummary, "");
  setText("r-search-query", analysis.entered || "");
  setText("r-assumptions", analysis.modelConfidence ? `Model confidence: ${analysis.modelConfidence}` : "N/A");
  setText("r-item-desc", analysis.itemDescription);
  setText("r-key-details", analysis.keyDetails || "");
  setText("r-production-era", releaseDate.productionEra || "Unknown");
  setText("r-estimated-age", releaseDate.estimatedAge || "Not available");
  setText("r-discontinuation", releaseDate.discontinuation || analysis.status || "Unknown");
  setText("r-service-life", "");

  // Clear refinement chips
  const chipsEl = byId("refinement-chips");
  if (chipsEl) chipsEl.innerHTML = "";

  // Refine tip
  const refineTip = byId("refine-tip");
  const refineTipText = byId("refine-tip-text");
  if (refineTip && refineTipText) {
    if (searchTier < 3 && data.refineTip) {
      refineTipText.textContent = data.refineTip;
      refineTip.classList.remove("hidden");
    } else {
      refineTip.classList.add("hidden");
    }
  }

  // Error/estimation banner
  const estBanner = byId("estimation-banner");
  const estText = byId("estimation-text");
  if (estBanner && estText) {
    if (data.error) {
      estText.textContent = data.error;
      estBanner.classList.remove("hidden");
    } else {
      estBanner.classList.add("hidden");
    }
  }

  // Advisory (show for tier 1/2)
  const ageAdvisory = byId("age-advisory");
  if (ageAdvisory) show(ageAdvisory, searchTier < 3);

  // Hide Generate Price Estimate button — ACV is automatic now
  const genBtn = byId("generate-valuation-btn");
  if (genBtn) genBtn.style.display = "none";

  // Hide "Show Full Technical Specifications" — specs come from detail
  const specsBtn = byId("toggle-specs");
  if (specsBtn) specsBtn.style.display = "none";
  const fullSpecs = byId("full-specs-container");
  if (fullSpecs) fullSpecs.style.display = "none";

  // Tiered visibility
  const quickView = byId("quick-view");
  const cardItemNotes = byId("card-item-notes");
  const cardTable = byId("card-table");
  const msrpRow = byId("msrp-row");
  const acvRow = byId("acv-row");
  const valuationSubtitle = byId("valuation-subtitle");
  const valuationList = byId("valuation-list");

  if (searchTier === 1) {
    show(quickView, false);
    show(cardItemNotes, false);
    show(cardTable, false);
    show(msrpRow, false);
    show(acvRow, false);
    show(valuationSubtitle, false);
    show(valuationList, false);
  } else if (searchTier === 2) {
    show(quickView, false);
    show(cardItemNotes, true);
    show(cardTable, false);
    show(msrpRow, false);
    show(acvRow, false);
    show(valuationSubtitle, false);
    show(valuationList, false);
  } else {
    show(quickView, true);
    show(cardItemNotes, true);
    show(cardTable, true);
    show(msrpRow, true);
    show(acvRow, true);
    show(valuationSubtitle, true);
    show(valuationList, true);
  }

  // MSRP + ACV (tier 3 only)
  if (searchTier === 3) {
    const msrp = analysis.launchMsrpNumeric || 0;
    const age = releaseDate.ageNumeric || 0;

    setText("r-launch-msrp", analysis.launchMsrp || "Not available");
    setText("r-market-price", analysis.currentMarketPrice || "Not available");
    const noteEl = byId("r-market-price-note");
    if (noteEl) noteEl.textContent = analysis.currentMarketPriceNote || "";

    setText("qv-category", analysis.quickSummary || analysis.category || "");
    setText("qv-status", analysis.status || data.availability || "");
    setText("qv-age", age > 0 ? `~${age} years` : (releaseDate.estimatedAge || "Not available"));
    setText("qv-msrp", analysis.launchMsrp || "Not available");

    if (msrp > 0) {
      acvData = { msrp, age };
      const ageInput = byId("acv-age-input");
      if (ageInput) ageInput.value = String(age);
      renderACVDisplay(msrp, age, currentCategory);
      const recalcBtn = byId("recalc-btn");
      if (recalcBtn) recalcBtn.disabled = false;
    } else {
      setText("r-acv", "Not available (no MSRP data)");
      setText("qv-acv", "N/A");
      setText("r-acv-formula", "", "");
      const acvStepsEl = byId("r-acv-steps");
      if (acvStepsEl) acvStepsEl.style.display = "none";
      const recalcBtn = byId("recalc-btn");
      if (recalcBtn) recalcBtn.disabled = true;
    }
  } else {
    setText("r-acv", "");
    setText("qv-acv", "");
  }

  // Show results, reset to compact mode
  const results = byId("results");
  if (results) results.classList.remove("hidden");

  currentMode = "compact";
  document.body.classList.remove("is-expanded");
  const viewBtn = byId("view-toggle");
  if (viewBtn) {
    viewBtn.textContent = "Compact View";
    viewBtn.classList.add("active");
  }
}

// ── renderDetail ─────────────────────────────────────────────────────────────

function renderDetail(data) {
  if (!data || typeof data !== "object") return;
  detailData = data;

  const query = (fastData?.analysis?.entered || "").trim();

  // ─ Item Notes card ─
  const itemNotesContent = byId("item-notes-content");
  if (itemNotesContent) {
    const lkq = data.itemNotes?.lkqEvaluation || {};
    const mustMatch = Array.isArray(lkq.mustMatchSpecs) ? lkq.mustMatchSpecs : [];
    const acceptable = Array.isArray(lkq.acceptableVariation) ? lkq.acceptableVariation : [];
    const availDetail = data.itemNotes?.availabilityDetail || "";

    const mustMatchHtml = mustMatch.length
      ? `<ul class="lkq-spec-list">${mustMatch.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
      : '<p class="none-found">No must-match specs specified.</p>';

    const acceptableHtml = acceptable.length
      ? `<div class="lkq-title" style="margin-top:0.5rem">Acceptable variation:</div>
         <ul class="lkq-spec-list variation">${acceptable.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
      : "";

    itemNotesContent.innerHTML = `
      <div class="lkq-block">
        <div class="lkq-title">LKQ Replacement Evaluation${lkq.tier ? ` — ${escapeHtml(lkq.tier)}` : ""}</div>
        <div class="lkq-title" style="margin-top:0.5rem">Must match:</div>
        ${mustMatchHtml}
        ${acceptableHtml}
      </div>
      ${availDetail ? `<div class="section-subtitle">Availability Detail</div><p class="report-overview">${escapeHtml(availDetail)}</p>` : ""}
    `;
  }

  // ─ Replacement table ─
  const tableLoading = byId("table-loading");
  const tableEl = byId("r-table");
  const tbody = byId("table-body");
  if (tbody && tableLoading && tableEl) {
    const allRows = [...(data.table || []), ...(data.dynamicRows || [])];
    if (allRows.length) {
      tbody.innerHTML = allRows
        .map((row) => {
          const isRetailers = (row.label || "").toLowerCase().includes("retailer");
          const origCell = isRetailers ? buildRetailerLinks(row.original, query) : escapeHtml(row.original || "N/A");
          const bmCell = isRetailers ? buildRetailerLinks(row.brandMatch, query) : escapeHtml(row.brandMatch || "N/A");
          const o1Cell = isRetailers ? buildRetailerLinks(row.option1, query) : escapeHtml(row.option1 || "N/A");
          const o2Cell = isRetailers ? buildRetailerLinks(row.option2, query) : escapeHtml(row.option2 || "N/A");
          return `<tr>
            <td>${escapeHtml(row.label || "")}</td>
            <td>${origCell}</td>
            <td class="brand-match">${bmCell}</td>
            <td>${o1Cell}</td>
            <td>${o2Cell}</td>
          </tr>`;
        })
        .join("");
      tableLoading.classList.add("hidden");
      tableEl.classList.remove("hidden");
    }
  }

  // ─ Technical specs + materials + service life ─
  setText("r-tech-specs", data.technicalSpecs || "");
  setText("r-materials", data.materials || "");
  setText("r-service-life", data.serviceLife || "");

  // ─ How It Works ─
  const howContent = byId("how-it-works-content");
  if (howContent) {
    howContent.innerHTML = `<p class="how-it-works-text">${escapeHtml(data.howItWorks || "No description available.")}</p>`;
  }

  // ─ Recalls ─
  const recallsContent = byId("recalls-content");
  if (recallsContent) {
    const recalls = Array.isArray(data.recalls) ? data.recalls : [];
    if (data.recallsNone || !recalls.length) {
      recallsContent.innerHTML = `<p class="none-found">No recalls or class action notices found that match this item.</p>`;
    } else {
      recallsContent.innerHTML = `<ul class="recalls-list">${recalls
        .map(
          (r) => `<li>
            <div class="recall-title">&#9888; ${escapeHtml(r.title || "Recall Notice")}</div>
            ${r.date ? `<div class="recall-date">${escapeHtml(r.date)}</div>` : ""}
            ${r.description ? `<div class="recall-desc">${escapeHtml(r.description)}</div>` : ""}
            ${r.url ? `<a class="recall-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">View official notice &#8594;</a>` : ""}
          </li>`
        )
        .join("")}</ul>`;
    }
  }

  // ─ Error Codes ─
  const errorCodesContent = byId("error-codes-content");
  if (errorCodesContent) {
    const codes = Array.isArray(data.errorCodes) ? data.errorCodes : [];
    if (!data.errorCodesApplicable || !codes.length) {
      errorCodesContent.innerHTML = `<p class="none-found">${data.errorCodesApplicable === false ? "Error codes not applicable to this product category." : "No error codes available."}</p>`;
    } else {
      errorCodesContent.innerHTML = `
        <table class="error-codes-table">
          <thead><tr><th>Code</th><th>Meaning</th><th>Likely Cause</th></tr></thead>
          <tbody>${codes
            .map(
              (c) => `<tr>
                <td>${escapeHtml(c.code || "")}</td>
                <td>${escapeHtml(c.meaning || "")}</td>
                <td>${escapeHtml(c.likelyCause || "")}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table>`;
    }
  }

  // ─ Common Failures ─
  const failuresContent = byId("failures-content");
  if (failuresContent) {
    const failures = Array.isArray(data.failures) ? data.failures : [];
    if (!failures.length) {
      failuresContent.innerHTML = `<p class="none-found">No common failures data available.</p>`;
    } else {
      failuresContent.innerHTML = `<ul class="failures-list">${failures
        .map(
          (f) => `<li>
            <div class="failures-component">${escapeHtml(f.component || "")}</div>
            ${f.whyItFails ? `<div class="failures-detail">${escapeHtml(f.whyItFails)}</div>` : ""}
            ${f.symptoms ? `<div class="failures-symptoms">Symptoms: ${escapeHtml(f.symptoms)}</div>` : ""}
          </li>`
        )
        .join("")}</ul>`;
    }
  }

  // ─ Owner's Manual (Section 8) ─
  const manualContent = byId("manual-content");
  if (manualContent) {
    if (data.manual?.url) {
      manualContent.innerHTML = `
        <div class="mfr-links">
          <div class="mfr-link-item">
            <span class="mfr-link-label">Owner's Manual</span>
            <a class="mfr-link-a" href="${escapeHtml(data.manual.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.manual.title || "View Manual")} &#8594;</a>
          </div>
        </div>`;
    } else {
      manualContent.innerHTML = `<p class="none-found">No owner's manual link found.</p>`;
    }
  }

  // ─ Manufacturer Page (Section 9) ─
  const mfrPageContent = byId("manufacturer-page-content");
  if (mfrPageContent) {
    if (data.manufacturerPage?.url) {
      mfrPageContent.innerHTML = `
        <div class="mfr-links">
          <div class="mfr-link-item">
            <span class="mfr-link-label">Product Page</span>
            <a class="mfr-link-a" href="${escapeHtml(data.manufacturerPage.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.manufacturerPage.label || "View Page")} &#8594;</a>
          </div>
        </div>`;
    } else {
      mfrPageContent.innerHTML = `<p class="none-found">No manufacturer page found.</p>`;
    }
  }

  // ─ Troubleshooting (Section 10) ─
  const troubleshootingContent = byId("troubleshooting-content");
  if (troubleshootingContent) {
    const steps = Array.isArray(data.troubleshooting?.steps) ? data.troubleshooting.steps : [];
    const resources = Array.isArray(data.troubleshooting?.repairResources)
      ? data.troubleshooting.repairResources
      : [];
    troubleshootingContent.innerHTML = `
      ${
        steps.length
          ? `<ol class="troubleshoot-steps">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
          : `<p class="none-found">No troubleshooting steps available.</p>`
      }
      ${
        resources.length
          ? `<div class="repair-resources">${resources
              .map(
                (r) =>
                  `<a class="repair-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">&#128279; ${escapeHtml(r.name)}</a>`
              )
              .join("")}</div>`
          : ""
      }
    `;
  }
}

// ── Copy summary ─────────────────────────────────────────────────────────────

function copySummary() {
  if (!fastData) return;
  const a = fastData.analysis || {};
  const rd = fastData.releaseDate || {};
  const recRow = detailData?.table?.find((r) => (r.label || "").toLowerCase().includes("recommended")) || {};
  const retRow = detailData?.table?.find((r) => (r.label || "").toLowerCase().includes("retailer")) || {};
  const acvEl = byId("r-acv");
  const acvStr = acvEl ? acvEl.textContent.trim() : "N/A";

  const lines = [
    "Bolt Research Report",
    `Item: ${a.quickSummary || ""}`,
    `Model: ${a.estimatedModel || a.entered || ""}`,
    `Manufacture Date / Age: ${rd.estimatedAge || "N/A"}`,
    `Launch MSRP: ${a.launchMsrp || "N/A"} | Current Market: ${a.currentMarketPrice || "N/A"}`,
    `Est. ACV: ${acvStr}`,
    `LKQ Replacement: ${recRow.brandMatch || "N/A"}`,
    `Available at: ${retRow.original || retRow.brandMatch || "N/A"}`,
    "Source: boltresearchteam.com"
  ];

  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    const btn = byId("copy-btn");
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => { btn.textContent = old; }, 1500);
  });
}

// ── performSearch ─────────────────────────────────────────────────────────────

async function performSearch() {
  const queryInput = byId("query");
  if (!queryInput) return;
  const query = queryInput.value.trim();
  if (!query) return;

  // Check sessionStorage cache first
  const cacheKey = `bolt_v3_${query.toLowerCase()}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { fast, detail } = JSON.parse(cached);
      if (fast) {
        fastData = null;
        detailData = null;
        renderFast(fast);
        if (detail) renderDetail(detail);
        return;
      }
    }
  } catch (_) {}

  // Start loading state
  const loaderDog = byId("loader-dog");
  const loaderText = byId("loader-text");
  if (loaderDog) loaderDog.classList.add("running");
  if (loaderText) loaderText.classList.add("visible");

  // Reset detail sections to skeleton/spinner state
  const spinnerSections = [
    "item-notes-content",
    "how-it-works-content",
    "recalls-content",
    "error-codes-content",
    "failures-content",
    "manual-content",
    "manufacturer-page-content",
    "troubleshooting-content"
  ];
  spinnerSections.forEach((id) => {
    const el = byId(id);
    if (el) {
      if (id === "item-notes-content") {
        el.innerHTML = `
          <div class="skeleton-line med"></div>
          <div class="skeleton-line full"></div>
          <div class="skeleton-line short"></div>`;
      } else {
        el.innerHTML = `<div class="section-spinner">Loading...</div>`;
      }
    }
  });

  // Reset table to spinner
  const tableLoading = byId("table-loading");
  const tableEl = byId("r-table");
  if (tableLoading) tableLoading.classList.remove("hidden");
  if (tableEl) tableEl.classList.add("hidden");

  fastData = null;
  detailData = null;

  // Kick off both fetches simultaneously
  const fastPromise = fetch(`/api/search?mode=research-fast&query=${encodeURIComponent(query)}`)
    .then((r) => r.json())
    .catch((err) => { console.error("Fast fetch error:", err); return null; });

  const detailPromise = fetch(`/api/search?mode=research-detail&query=${encodeURIComponent(query)}`)
    .then((r) => r.json())
    .catch((err) => { console.error("Detail fetch error:", err); return null; });

  // Render fast when ready — stops the loader
  fastPromise.then((fast) => {
    if (loaderDog) loaderDog.classList.remove("running");
    if (loaderText) loaderText.classList.remove("visible");
    if (fast && typeof fast === "object") {
      renderFast(fast);
    } else {
      const results = byId("results");
      if (results) results.classList.remove("hidden");
      const estBanner = byId("estimation-banner");
      const estText = byId("estimation-text");
      if (estBanner && estText) {
        estText.textContent = "Could not generate report, please refine query.";
        estBanner.classList.remove("hidden");
      }
    }
  });

  // Render detail when ready
  detailPromise.then((detail) => {
    if (detail && typeof detail === "object" && !detail.error) {
      renderDetail(detail);
    }
  });

  // Save both to sessionStorage when both complete
  Promise.all([fastPromise, detailPromise]).then(([fast, detail]) => {
    if (fast && detail) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ fast, detail }));
      } catch (_) {}
    }
  });
}

// ── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = byId("btn");
  const queryInput = byId("query");
  const toggleBtn = byId("view-toggle");
  const copyBtn = byId("copy-btn");
  const printBtn = byId("print-btn");
  const recalcBtn = byId("recalc-btn");

  if (searchBtn) searchBtn.addEventListener("click", performSearch);
  if (queryInput) {
    queryInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") performSearch();
    });
  }
  if (toggleBtn) toggleBtn.addEventListener("click", toggleView);
  if (copyBtn) copyBtn.addEventListener("click", copySummary);
  if (printBtn) printBtn.addEventListener("click", () => window.print());
  if (recalcBtn) recalcBtn.addEventListener("click", recalcACV);
});
