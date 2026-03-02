let activeTab = "tab-overview";
let fastData = null;
let detailData = null;
let currentCategory = "general";
let acvData = { msrp: 0, age: 0 };

// ── Section filter state ──────────────────────────────────────────────────────

const selectedSections = {
  howItWorks:   true,
  itemNotes:    true,
  replacements: true,
  diagnostics:  true,
  technical:    true
};

// Returns true if any "detail" section is selected (skip detail API call if all off)
function needsDetailFetch() {
  return selectedSections.howItWorks || selectedSections.itemNotes ||
         selectedSections.replacements || selectedSections.diagnostics ||
         selectedSections.technical;
}

// Show/hide cards and tab buttons based on selectedSections.
// Safe to call before first search (results hidden — no-op).
function updateSectionVisibility() {
  const resultsEl = byId("results");
  if (!resultsEl || resultsEl.classList.contains("hidden")) return;

  // Cards inside the Overview panel
  show("card-how-it-works", selectedSections.howItWorks);
  show("card-item-notes",   selectedSections.itemNotes);

  // Tab buttons + redirect if the active tab is being hidden
  const tabMap = [
    { tab: "tab-replacements", key: "replacements" },
    { tab: "tab-diagnostics",  key: "diagnostics"  },
    { tab: "tab-technical",    key: "technical"    }
  ];
  tabMap.forEach(({ tab, key }) => {
    const btn = byId(tab);
    if (!btn) return;
    const on = selectedSections[key];
    btn.classList.toggle("hidden", !on);
    btn.setAttribute("aria-disabled", on ? "false" : "true");
    if (!on && activeTab === tab) setActiveTab("tab-overview");
  });

  // If detail data is already loaded, re-render so newly-enabled sections populate
  if (detailData) renderDetail(detailData);
}

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

const ELECTRONICS_ONLY = new Set(["Best Buy", "Walmart", "Target", "B&H", "Manufacturer"]);
const HVAC_ONLY = new Set(["Home Depot", "Lowe's", "AJ Madison", "Manufacturer", "Walmart"]);

function getRetailerFilter(category) {
  const cat = (category || "general").toLowerCase();
  if (cat === "tv" || cat === "computer" || cat === "laptop") return ELECTRONICS_ONLY;
  if (cat === "hvac" || cat === "water_heater") return HVAC_ONLY;
  return null;
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
  // Update metrics strip ACV
  setText("m-acv", acvStr);
}

// ── Tab navigation ────────────────────────────────────────────────────────────

const TAB_IDS = ["tab-overview", "tab-replacements", "tab-diagnostics", "tab-technical", "tab-notes"];

function setActiveTab(tabId) {
  if (!TAB_IDS.includes(tabId)) return;
  activeTab = tabId;

  TAB_IDS.forEach((id) => {
    const btn = byId(id);
    const panel = byId(id.replace("tab-", "panel-"));
    if (btn) {
      btn.classList.toggle("active", id === tabId);
      btn.setAttribute("aria-selected", id === tabId ? "true" : "false");
    }
    if (panel) panel.classList.toggle("active", id === tabId);
  });
}

function getVisibleTabs() {
  return TAB_IDS.filter((id) => {
    const btn = byId(id);
    return btn && !btn.classList.contains("hidden");
  });
}

function initTabs() {
  TAB_IDS.forEach((id) => {
    const btn = byId(id);
    if (!btn) return;
    btn.addEventListener("click", () => setActiveTab(id));
    btn.addEventListener("keydown", (e) => {
      const visible = getVisibleTabs();
      const idx = visible.indexOf(id);
      if (idx === -1) return;
      if (e.key === "ArrowRight") { e.preventDefault(); const next = visible[(idx + 1) % visible.length]; setActiveTab(next); byId(next)?.focus(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); const prev = visible[(idx - 1 + visible.length) % visible.length]; setActiveTab(prev); byId(prev)?.focus(); }
      if (e.key === "Home") { e.preventDefault(); setActiveTab(visible[0]); byId(visible[0])?.focus(); }
      if (e.key === "End")  { e.preventDefault(); setActiveTab(visible[visible.length - 1]); byId(visible[visible.length - 1])?.focus(); }
    });
  });
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

// ── Spec pill renderer ───────────────────────────────────────────────────────

function renderSpecPills(containerId, topSpecs) {
  const el = byId(containerId);
  if (!el) return;
  if (!Array.isArray(topSpecs) || !topSpecs.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = topSpecs
    .slice(0, 5)
    .map((s) => `<span class="quick-spec-pill"><strong>${escapeHtml(s.label || "")}:</strong> ${escapeHtml(s.value || "")}</span>`)
    .join("");
}

// ── renderFast ───────────────────────────────────────────────────────────────

function renderFast(data) {
  if (!data || typeof data !== "object") return;
  fastData = data;

  const analysis = data.analysis || {};
  const releaseDate = data.releaseDate || {};
  const searchTier = Number(data.searchTier) || 1;
  currentCategory = analysis.category || "general";

  // Tier badge (results header)
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

  // Top specs pills (Section 1)
  const topSpecs = Array.isArray(analysis.topSpecs) ? analysis.topSpecs : [];
  renderSpecPills("r-top-specs-pills", topSpecs);

  // Section 3: Release Date & Age
  setText("r-production-era", releaseDate.productionEra || "Unknown");
  setText("r-estimated-age", releaseDate.estimatedAge || "Not available");
  setText("r-discontinuation", releaseDate.discontinuation || analysis.status || "Unknown");
  setText("r-service-life", ""); // filled by renderDetail

  // Advisory banner (show for tier 1/2/3 — less than specific model)
  const ageAdvisory = byId("age-advisory");
  if (ageAdvisory) show(ageAdvisory, searchTier < 4);

  // Clear refinement chips
  const chipsEl = byId("refinement-chips");
  if (chipsEl) chipsEl.innerHTML = "";

  // Refine tip
  const refineTip = byId("refine-tip");
  const refineTipText = byId("refine-tip-text");
  if (refineTip && refineTipText) {
    if (searchTier < 4 && data.refineTip) {
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

  // Tiered card visibility
  // Tier 1: general term — hide valuation, item notes; tab-replacements tab shows empty state
  // Tier 2: category only — hide valuation, item notes; show replacement table (tiered mode)
  // Tier 3+: full report
  const cardValuation = byId("card-valuation");
  const cardItemNotes = byId("card-item-notes");

  if (searchTier <= 1) {
    show(cardValuation, false);
    show(cardItemNotes, false);
  } else if (searchTier === 2) {
    show(cardValuation, false);
    show(cardItemNotes, false);
  } else {
    show(cardValuation, true);
    show(cardItemNotes, true);
  }

  // Metrics strip — age and availability always, MSRP/ACV only for tier 3+
  const ageShort = (releaseDate.estimatedAge || "").split(".")[0] || "—";
  setText("m-age", ageShort);
  setText("m-availability", data.availability || "—");
  if (searchTier < 3) {
    setText("m-msrp", "—");
    setText("m-acv", "—");
  }

  // Section 4: MSRP + ACV (tier 3+ only)
  if (searchTier >= 3) {
    const msrp = analysis.launchMsrpNumeric || 0;
    const age = releaseDate.ageNumeric || 0;

    setText("r-launch-msrp", analysis.launchMsrp || "Not available");
    setText("r-market-price", analysis.currentMarketPrice || "Not available");
    const noteEl = byId("r-market-price-note");
    if (noteEl) noteEl.textContent = analysis.currentMarketPriceNote || "";

    if (msrp > 0) {
      acvData = { msrp, age };
      const ageInput = byId("acv-age-input");
      if (ageInput) ageInput.value = String(age);
      setText("m-msrp", analysis.launchMsrp || "—");
      renderACVDisplay(msrp, age, currentCategory);
      const recalcBtn = byId("recalc-btn");
      if (recalcBtn) recalcBtn.disabled = false;
    } else {
      setText("r-acv", "Not available (no MSRP data)");
      setText("r-acv-formula", "", "");
      const acvStepsEl = byId("r-acv-steps");
      if (acvStepsEl) acvStepsEl.style.display = "none";
      const recalcBtn = byId("recalc-btn");
      if (recalcBtn) recalcBtn.disabled = true;
    }
  } else {
    setText("r-acv", "");
  }

  // ── Variations (Section 1) ──────────────────────────────────────────────────
  const variationsSection = byId("r-variations");
  const variationChips = byId("r-variation-chips");
  const variations = Array.isArray(data.variations) ? data.variations : [];
  if (variationsSection && variationChips) {
    if (variations.length) {
      variationChips.innerHTML = variations
        .map(
          (v) =>
            `<button class="variation-chip" data-vquery="${escapeHtml(v.query)}">
              <span class="variation-chip-label">${escapeHtml(v.label)}</span>
              ${v.note ? `<span class="variation-chip-note">${escapeHtml(v.note)}</span>` : ""}
            </button>`
        )
        .join("");
      // Wire click → set input + search
      variationChips.querySelectorAll(".variation-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          const q = btn.dataset.vquery;
          if (!q) return;
          const input = byId("query");
          if (input) input.value = q;
          performSearch();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
      variationsSection.classList.remove("hidden");
    } else {
      variationsSection.classList.add("hidden");
    }
  }

  // Show results, reset to overview tab
  const results = byId("results");
  if (results) results.classList.remove("hidden");
  setActiveTab("tab-overview");
}

// ── renderDetail ─────────────────────────────────────────────────────────────

function renderDetail(data) {
  if (!data || typeof data !== "object") return;
  detailData = data;

  const query = (fastData?.analysis?.entered || "").trim();

  // ─ Item Notes card ─
  const itemNotesContent = selectedSections.itemNotes ? byId("item-notes-content") : null;
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
  if (!selectedSections.replacements) {
    // Hide the table elements when section is off
    const tl = byId("table-loading"); if (tl) tl.classList.add("hidden");
    const te = byId("r-table"); if (te) te.classList.add("hidden");
  } else {
  const tableMode = data.tableMode || "standard";
  const isTiered = tableMode === "tiered";

  // Table note
  const tableNoteEl = byId("table-note");
  if (tableNoteEl) {
    if (data.tableNote) {
      tableNoteEl.innerHTML = `<strong>Note:</strong> ${escapeHtml(data.tableNote)}`;
      tableNoteEl.classList.remove("hidden");
    } else {
      tableNoteEl.classList.add("hidden");
    }
  }

  // Update table header based on tableMode
  const tableHeadRow = byId("table-head-row");
  if (tableHeadRow) {
    if (isTiered) {
      tableHeadRow.innerHTML = `
        <th>Feature</th>
        <th class="tier-entry-col"><span class="tier-col-badge tier-col-entry">Entry Level</span></th>
        <th class="tier-mid-col"><span class="tier-col-badge tier-col-mid">Mid-Grade</span></th>
        <th class="tier-premium-col"><span class="tier-col-badge tier-col-premium">Premium</span></th>`;
    } else {
      tableHeadRow.innerHTML = `<th>Feature</th><th>Original Item</th><th class="highlight">Brand Match</th><th>Option 1</th><th>Option 2</th>`;
    }
  }

  // Extract per-column model names from the "Model" row so retailer links
  // search for the actual replacement item, not the original query.
  const modelRow = (data.table || []).find((r) => (r.label || "").toLowerCase() === "model");
  const colSearch = isTiered
    ? {
        entryLevel: modelRow?.entryLevel || query,
        midGrade:   modelRow?.midGrade   || query,
        premium:    modelRow?.premium    || query
      }
    : {
        original:   modelRow?.original   || query,
        brandMatch: modelRow?.brandMatch || query,
        option1:    modelRow?.option1    || query,
        option2:    modelRow?.option2    || query
      };

  const tableLoading = byId("table-loading");
  const tableEl = byId("r-table");
  const tbody = byId("table-body");
  if (tbody && tableLoading && tableEl) {
    const allRows = [...(data.table || []), ...(data.dynamicRows || [])];
    if (allRows.length) {
      if (isTiered) {
        tbody.innerHTML = allRows
          .map((row) => {
            const isRetailers = (row.label || "").toLowerCase().includes("retailer");
            const elCell = isRetailers ? buildRetailerLinks(row.entryLevel, colSearch.entryLevel) : escapeHtml(row.entryLevel || "N/A");
            const mgCell = isRetailers ? buildRetailerLinks(row.midGrade,   colSearch.midGrade)   : escapeHtml(row.midGrade   || "N/A");
            const prCell = isRetailers ? buildRetailerLinks(row.premium,    colSearch.premium)    : escapeHtml(row.premium    || "N/A");
            return `<tr>
              <td>${escapeHtml(row.label || "")}</td>
              <td>${elCell}</td>
              <td>${mgCell}</td>
              <td>${prCell}</td>
            </tr>`;
          })
          .join("");
      } else {
        tbody.innerHTML = allRows
          .map((row) => {
            const isRetailers = (row.label || "").toLowerCase().includes("retailer");
            const origCell = isRetailers ? buildRetailerLinks(row.original,   colSearch.original)   : escapeHtml(row.original   || "N/A");
            const bmCell   = isRetailers ? buildRetailerLinks(row.brandMatch, colSearch.brandMatch) : escapeHtml(row.brandMatch || "N/A");
            const o1Cell   = isRetailers ? buildRetailerLinks(row.option1,    colSearch.option1)    : escapeHtml(row.option1    || "N/A");
            const o2Cell   = isRetailers ? buildRetailerLinks(row.option2,    colSearch.option2)    : escapeHtml(row.option2    || "N/A");
            return `<tr>
              <td>${escapeHtml(row.label || "")}</td>
              <td>${origCell}</td>
              <td class="brand-match">${bmCell}</td>
              <td>${o1Cell}</td>
              <td>${o2Cell}</td>
            </tr>`;
          })
          .join("");
      }
      tableLoading.classList.add("hidden");
      tableEl.classList.remove("hidden");
    }
  }

  // Narrow Your Results box
  const narrowResultsEl = byId("narrow-results");
  const narrowResultsTip = byId("narrow-results-tip");
  if (narrowResultsEl && narrowResultsTip) {
    if (data.narrowYourResults) {
      narrowResultsTip.textContent = data.narrowYourResults;
      narrowResultsEl.classList.remove("hidden");
    } else {
      narrowResultsEl.classList.add("hidden");
    }
  }

  } // end if (selectedSections.replacements)

  // ─ Technical Details panel ─
  if (selectedSections.technical) {
    const techPanelContent = byId("tech-panel-content");
    if (techPanelContent) {
      const techSpecs = data.technicalSpecs || "";
      const specs = techSpecs.split(",").map((s) => s.trim()).filter(Boolean);
      let techHtml = "";
      if (specs.length) {
        techHtml += `<ul class="report-list">${specs.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`;
      }
      if (data.materials) {
        techHtml += `<div class="section-subtitle">Materials</div><p class="report-overview">${escapeHtml(data.materials)}</p>`;
      }
      if (data.serviceLife) {
        techHtml += `<div class="section-subtitle">Service Life</div><p class="report-overview">${escapeHtml(data.serviceLife)}</p>`;
      }
      techPanelContent.innerHTML = techHtml || `<p class="none-found">No technical specifications available.</p>`;
    }
  }

  // ─ Service life (always in Release Date card) ─
  setText("r-service-life", data.serviceLife || "");

  // ─ How It Works ─
  if (selectedSections.howItWorks) {
    const howContent = byId("how-it-works-content");
    if (howContent) {
      howContent.innerHTML = `<p class="how-it-works-text">${escapeHtml(data.howItWorks || "No description available.")}</p>`;
    }
  }

  // ─ Diagnostics group (Recalls, Error Codes, Failures, Manual, Troubleshooting) ─
  if (!selectedSections.diagnostics) return; // skip rest

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

  // ─ Error Codes (Section 8) ─
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

  // ─ Common Reported Failures (Section 9) ─
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

  // ─ Owner's Manual + Manufacturer Page combined (Section 10) ─
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

  // ─ Troubleshooting (Section 11) ─
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
  const acvEl = byId("r-acv");
  const acvStr = acvEl ? acvEl.textContent.trim() : "N/A";

  const lines = [
    "Bolt Research Report",
    `Item: ${a.quickSummary || ""}`,
    `Model: ${a.estimatedModel || a.entered || ""}`,
    `Manufacture Date / Age: ${rd.estimatedAge || "N/A"}`,
    `Launch MSRP: ${a.launchMsrp || "N/A"} | Current Market: ${a.currentMarketPrice || "N/A"}`,
    `Est. ACV: ${acvStr}`
  ];

  if (selectedSections.replacements && detailData) {
    const recRow = detailData.table?.find((r) => (r.label || "").toLowerCase().includes("recommended")) || {};
    const retRow = detailData.table?.find((r) => (r.label || "").toLowerCase().includes("retailer")) || {};
    if (recRow.brandMatch) lines.push(`LKQ Replacement: ${recRow.brandMatch}`);
    if (retRow.original || retRow.brandMatch) lines.push(`Available at: ${retRow.original || retRow.brandMatch}`);
  }

  lines.push("Source: boltresearchteam.com");

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
  const cacheKey = `bolt_v6_${query.toLowerCase()}`;
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
    "how-it-works-content",
    "recalls-content",
    "error-codes-content",
    "failures-content",
    "troubleshooting-content"
  ];
  spinnerSections.forEach((id) => {
    const el = byId(id);
    if (el) el.innerHTML = `<div class="section-spinner">Loading...</div>`;
  });

  const skeletonSections = ["item-notes-content"];
  skeletonSections.forEach((id) => {
    const el = byId(id);
    if (el) {
      el.innerHTML = `
        <div class="skeleton-line med"></div>
        <div class="skeleton-line full"></div>
        <div class="skeleton-line short"></div>`;
    }
  });

  // Manual + mfr page spinner
  const manualContent = byId("manual-content");
  if (manualContent) manualContent.innerHTML = `<div class="section-spinner">Loading...</div>`;
  const mfrPageContent = byId("manufacturer-page-content");
  if (mfrPageContent) mfrPageContent.innerHTML = "";

  // Reset table to spinner
  const tableLoading = byId("table-loading");
  const tableEl = byId("r-table");
  if (tableLoading) tableLoading.classList.remove("hidden");
  if (tableEl) tableEl.classList.add("hidden");

  // Reset variations
  const variationsSectionReset = byId("r-variations");
  if (variationsSectionReset) variationsSectionReset.classList.add("hidden");
  const variationChipsReset = byId("r-variation-chips");
  if (variationChipsReset) variationChipsReset.innerHTML = "";

  // Reset table note, narrow results
  const tableNoteEl = byId("table-note");
  if (tableNoteEl) tableNoteEl.classList.add("hidden");
  const narrowResultsEl = byId("narrow-results");
  if (narrowResultsEl) narrowResultsEl.classList.add("hidden");

  // Reset table header to standard layout
  const tableHeadRow = byId("table-head-row");
  if (tableHeadRow) tableHeadRow.innerHTML = `<th>Feature</th><th>Original Item</th><th class="highlight">Brand Match</th><th>Option 1</th><th>Option 2</th>`;

  // Reset technical panel
  const techPanelContent = byId("tech-panel-content");
  if (techPanelContent) techPanelContent.innerHTML = `<div class="section-spinner">Loading...</div>`;

  // Reset metrics strip
  setText("m-age", "—");
  setText("m-msrp", "—");
  setText("m-acv", "—");
  setText("m-availability", "—");

  fastData = null;
  detailData = null;

  // Kick off both fetches simultaneously (skip detail if all detail sections are off)
  const fastPromise = fetch(`/api/search?mode=research-fast&query=${encodeURIComponent(query)}`)
    .then((r) => r.json())
    .catch((err) => { console.error("Fast fetch error:", err); return null; });

  const detailPromise = needsDetailFetch()
    ? fetch(`/api/search?mode=research-detail&query=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .catch((err) => { console.error("Detail fetch error:", err); return null; })
    : Promise.resolve(null);

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
  const copyBtn = byId("copy-btn");
  const printBtn = byId("print-btn");
  const recalcBtn = byId("recalc-btn");

  if (searchBtn) searchBtn.addEventListener("click", performSearch);
  if (queryInput) {
    queryInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") performSearch();
    });
  }
  if (copyBtn) copyBtn.addEventListener("click", copySummary);
  if (printBtn) printBtn.addEventListener("click", () => window.print());
  if (recalcBtn) recalcBtn.addEventListener("click", recalcACV);
  initTabs();

  // Section filter checkboxes
  const filterMap = [
    { id: "sec-how-it-works", key: "howItWorks"   },
    { id: "sec-item-notes",   key: "itemNotes"    },
    { id: "sec-replacements", key: "replacements" },
    { id: "sec-diagnostics",  key: "diagnostics"  },
    { id: "sec-technical",    key: "technical"    }
  ];
  filterMap.forEach(({ id, key }) => {
    const checkbox = byId(id);
    if (!checkbox) return;
    const chip = checkbox.closest(".section-filter-chip");
    checkbox.addEventListener("change", () => {
      selectedSections[key] = checkbox.checked;
      if (chip) chip.classList.toggle("is-checked", checkbox.checked);
      updateSectionVisibility();
    });
  });
});
