let currentMode = "compact";
let phase1Data = null;
let valuationState = { msrp: 0, rate: 0, years: 0 };
const loadedSections = new Map();
const loadingSections = new Set();

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

function show(el, shouldShow) {
  if (!el) return;
  el.classList.toggle("hidden", !shouldShow);
}

function toggleView() {
  const body = document.body;
  const toggleBtn = byId("view-toggle");
  if (!toggleBtn) return;
  if (currentMode === "compact") {
    currentMode = "expanded";
    body.classList.add("is-expanded");
    toggleBtn.textContent = "Expanded View";
    toggleBtn.classList.remove("active");
  } else {
    currentMode = "compact";
    body.classList.remove("is-expanded");
    toggleBtn.textContent = "Compact View";
    toggleBtn.classList.add("active");
  }
}

function tierBadgeText(resultType) {
  if (resultType === "specific_model") return "Specific Model";
  if (resultType === "brand_category") return "Brand + Category";
  return "Generic Category";
}

function renderRefinementPrompts(prompts) {
  const container = byId("refinement-chips");
  const tip = byId("refine-tip");
  const tipText = byId("refine-tip-text");
  if (!container || !tip || !tipText) return;
  const list = Array.isArray(prompts) ? prompts.filter(Boolean) : [];
  if (!list.length) {
    container.innerHTML = "";
    show(tip, false);
    return;
  }
  tipText.textContent = list.slice(0, 2).join(" | ");
  show(tip, true);
  container.innerHTML = list
    .slice(0, 6)
    .map(
      (prompt) =>
        `<button type="button" class="recalc-btn chip-btn" data-chip="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
    )
    .join("");
  container.querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const query = byId("query");
      if (!query) return;
      query.value = btn.getAttribute("data-chip") || "";
      performSearch();
    });
  });
}

function renderQuickView(data) {
  const quick = byId("quick-view");
  if (!quick) return;
  const detected = data.detected || {};
  setText("qv-category", detected.category || data.result_type);
  setText("qv-status", data.availability_status || "unknown");
  setText(
    "qv-age",
    typeof data.release_age?.estimated_age_years === "number"
      ? `${data.release_age.estimated_age_years} years`
      : data.release_age?.age_note || "Not available"
  );
  setText("qv-msrp", data.pricing?.original_msrp || "Not shown");
  setText("qv-acv", "Use Generate Price Estimate");
  show(quick, true);
}

function renderPhase1Header(data) {
  const tier = byId("tier-badge");
  setText("r-search-query", data.query, "");
  setText("r-assumptions", data.assumptions_used?.join("; ") || "None", "None");
  setText("r-item-desc", data.snapshot?.item_description);
  setText("r-key-details", (data.snapshot?.comparable_factors || []).join("; "), "N/A");
  setText("r-production-era", data.release_age?.production_era || "Unknown");
  setText(
    "r-estimated-age",
    typeof data.release_age?.estimated_age_years === "number"
      ? `${data.release_age.estimated_age_years} years`
      : data.release_age?.age_note || "Add a more specific model for age estimate."
  );
  setText("r-discontinuation", data.availability_status || "Unknown");
  setText("r-service-life", "Use category norms and manufacturer guidance.");
  setText("r-overview", `Result type: ${tierBadgeText(data.result_type)} (${safeText(data.confidence)} confidence).`, "");

  if (tier) {
    tier.textContent = tierBadgeText(data.result_type);
    tier.className = `tier-badge ${data.result_type || ""}`;
    tier.classList.remove("hidden");
  }
}

function renderPricing(data) {
  const pricing = data.pricing || {};
  const eligible = !!pricing.eligible;
  const launch = eligible ? pricing.original_msrp || "Pending estimate" : "Not shown";
  const typical = eligible ? pricing.typical_new_price || "Pending estimate" : "Not shown";
  const note = byId("r-market-price-note");

  setText("r-launch-msrp", launch);
  setText("r-market-price", typical);
  setText("qv-msrp", launch);
  if (note) {
    note.textContent = eligible
      ? "Generated from model-specific informational data."
      : pricing.reason || "Refine to a specific model with size/capacity to enable pricing.";
  }

  const recalcBtn = byId("recalc-btn");
  const genBtn = byId("generate-valuation-btn");
  if (recalcBtn) recalcBtn.disabled = !eligible;
  if (genBtn) genBtn.disabled = !eligible;

  valuationState = {
    msrp: parseFloat(String(pricing.original_msrp || "").replace(/[^0-9.]/g, "")) || 0,
    rate: Number(pricing.depreciation_rate_percent || 12),
    years: Number(pricing.base_years || 0)
  };
  if (byId("acv-age-input")) {
    byId("acv-age-input").value = String(valuationState.years || 0);
  }
  setText("r-acv", eligible ? "Click Generate Price Estimate" : "Not shown");
  setText("r-acv-formula", eligible ? "" : "");
}

function recalcACV() {
  if (!phase1Data || !phase1Data.pricing?.eligible) return;
  const input = byId("acv-age-input");
  if (!input) return;
  const years = Number(input.value || 0);
  if (!Number.isFinite(years) || years < 0) return;
  const msrp = valuationState.msrp || 0;
  const rate = (valuationState.rate || 12) / 100;
  const value = msrp > 0 ? msrp * Math.pow(1 - rate, years) : 0;
  setText("r-acv", `$${value.toFixed(2)}`);
  setText("qv-acv", `$${value.toFixed(2)}`);
  setText(
    "r-acv-formula",
    `$${msrp.toFixed(2)} x (1 - ${(rate).toFixed(2)})^${years} = $${value.toFixed(2)}`,
    ""
  );
}

function renderReplacementTable(data) {
  const table = data.replacement_table || {};
  const tbody = byId("table-body");
  const loading = byId("table-loading");
  const tableEl = byId("r-table");
  if (!tbody || !loading || !tableEl) return;
  const rows = [...(table.required_rows || []), ...(table.dynamic_rows || [])];
  const cells = table.cells || {};
  tbody.innerHTML = rows
    .map((row) => {
      const rowData = cells[row] || {};
      return `
        <tr>
          <td>${escapeHtml(row)}</td>
          <td>${escapeHtml(rowData["Original Item"] || "N/A")}</td>
          <td class="brand-match">${escapeHtml(rowData["Brand Match"] || "N/A")}</td>
          <td>${escapeHtml(rowData["Option 1"] || "N/A")}</td>
          <td>${escapeHtml(rowData["Option 2"] || "N/A")}</td>
        </tr>
      `;
    })
    .join("");
  loading.classList.add("hidden");
  tableEl.classList.remove("hidden");
}

function renderItemNotes(data) {
  const content = byId("item-notes-content");
  if (!content) return;
  const notesRow = data.replacement_table?.cells?.Notes || {};
  const availabilityMap = {
    in_production: "In production",
    discontinued_limited_new: "Discontinued with limited new stock",
    fully_discontinued: "Fully discontinued"
  };
  content.innerHTML = `
    <ul class="report-list">
      <li><span class="label">Comparable Replacement Guidance</span> <span>${escapeHtml(notesRow["Brand Match"] || "Use fit and performance parity for replacement.")}</span></li>
      <li><span class="label">Availability / Lead Time</span> <span>${escapeHtml(availabilityMap[data.availability_status] || "Status not confirmed")}</span></li>
    </ul>
  `;
}

function renderAlwaysSections(data) {
  const how = byId("how-it-works-content");
  if (how) {
    how.innerHTML = `<div class="how-it-works-text">${escapeHtml(data.how_it_works || "No explanation available.")}</div>`;
  }

  const failures = byId("failures-content");
  if (failures) {
    const list = Array.isArray(data.common_failures) ? data.common_failures : [];
    failures.innerHTML = list.length
      ? `<ul class="bullet-list">${list.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
      : `<p class="inline-note">No common failures available.</p>`;
  }

  const troubleshooting = byId("troubleshooting-content");
  if (troubleshooting) {
    const steps = Array.isArray(data.troubleshooting?.steps) ? data.troubleshooting.steps : [];
    const links = Array.isArray(data.troubleshooting?.repair_links) ? data.troubleshooting.repair_links : [];
    troubleshooting.innerHTML = `
      ${steps.length ? `<ul class="bullet-list">${steps.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : `<p class="inline-note">No steps available.</p>`}
      ${
        links.length
          ? `<ul class="diagnostics-list">${links
              .map((x) => `<li><a href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(x.label)}</a></li>`)
              .join("")}</ul>`
          : ""
      }
    `;
  }
}

function resetLazyContent() {
  const placeholders = {
    "recalls-content": "Load this section in Expanded View to fetch recall notices.",
    "error-codes-content": "Load this section in Expanded View to fetch common error codes.",
    "manual-content": "Load this section in Expanded View to fetch owner manual links.",
    "manufacturer-page-content": "Load this section in Expanded View to fetch manufacturer page links."
  };
  Object.entries(placeholders).forEach(([id, text]) => {
    const el = byId(id);
    if (!el) return;
    el.innerHTML = `<button class="collapse-btn no-print lazy-load-btn" data-section="${id}">${escapeHtml(text)}</button>`;
  });
}

function sectionKeyFromDom(sectionDomId) {
  const map = {
    "recalls-content": "recalls",
    "error-codes-content": "error_codes_common",
    "manual-content": "manual",
    "manufacturer-page-content": "manufacturer_page",
    "full-specs-container": "specs"
  };
  return map[sectionDomId] || "";
}

async function loadLazySection(section, { force = false } = {}) {
  if (!phase1Data || !section) return null;
  if (!force && loadedSections.has(section)) return loadedSections.get(section);
  if (loadingSections.has(section)) return null;

  loadingSections.add(section);
  try {
    const res = await fetch(`/api/item-sections?query=${encodeURIComponent(phase1Data.query)}&section=${encodeURIComponent(section)}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    loadedSections.set(section, data);
    renderLazySection(section, data);
    return data;
  } catch (err) {
    console.error("Lazy section load failed:", section, err);
    renderLazySection(section, {
      query: phase1Data.query,
      section,
      data: { note: "Could not load this section. Try again." },
      sources: []
    });
    return null;
  } finally {
    loadingSections.delete(section);
  }
}

function renderLazySection(section, payload) {
  const data = payload?.data || {};
  const src = Array.isArray(payload?.sources) ? payload.sources : [];
  if (section === "specs") {
    const container = byId("extended-specs-list");
    if (!container) return;
    const specs = Array.isArray(data.specs) ? data.specs : [];
    container.innerHTML = specs.length
      ? specs.map((spec) => `<li><span class="label">${escapeHtml(spec.label || "Spec")}</span> <span>${escapeHtml(spec.value || "")}</span></li>`).join("")
      : `<li>${escapeHtml(data.note || "No additional specs found.")}</li>`;
    return;
  }

  if (section === "recalls") {
    const el = byId("recalls-content");
    if (!el) return;
    const notices = Array.isArray(data.notices) ? data.notices : [];
    if (!notices.length) {
      el.innerHTML = `<p class="inline-note">No Recalls or Class Actions found that match searched item</p>`;
      return;
    }
    el.innerHTML = `<ul class="diagnostics-list">${notices
      .map((n) => `<li>${escapeHtml(n.summary || n.title || "Notice")} ${n.url ? `<a href="${escapeHtml(n.url)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</li>`)
      .join("")}</ul>`;
    return;
  }

  if (section === "error_codes_common" || section === "error_codes_full") {
    const el = byId("error-codes-content");
    if (!el) return;
    const common = loadedSections.get("error_codes_common")?.data?.codes || [];
    const full = loadedSections.get("error_codes_full")?.data?.codes || [];
    const merged = [...common, ...full];
    if (!merged.length) {
      el.innerHTML = `<p class="inline-note">${escapeHtml(data.note || "No error codes available.")}</p>`;
    } else {
      el.innerHTML = `
        <table class="error-codes-table">
          <thead><tr><th>Code</th><th>Description</th></tr></thead>
          <tbody>
            ${merged
              .map((c) => `<tr><td>${escapeHtml(c.code || "")}</td><td>${escapeHtml(c.description || "")}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      `;
    }
    const alreadyLoadedFull = loadedSections.has("error_codes_full");
    if (!alreadyLoadedFull) {
      el.innerHTML += `<button class="collapse-btn no-print" id="load-full-codes-inline">Load Full Error Codes</button>`;
      const btn = byId("load-full-codes-inline");
      if (btn) btn.addEventListener("click", () => loadLazySection("error_codes_full"));
    }
    return;
  }

  if (section === "manual") {
    const el = byId("manual-content");
    if (!el) return;
    const links = Array.isArray(data.links) ? data.links : [];
    el.innerHTML = links.length
      ? `<ul class="diagnostics-list">${links
          .map((x) => `<li><a href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(x.label || "Manual Link")}</a></li>`)
          .join("")}</ul>`
      : `<p class="inline-note">${escapeHtml(data.note || "No owner manual link found.")}</p>`;
    return;
  }

  if (section === "manufacturer_page") {
    const el = byId("manufacturer-page-content");
    if (!el) return;
    const links = Array.isArray(data.links) ? data.links : [];
    el.innerHTML = links.length
      ? `<ul class="diagnostics-list">${links
          .map((x) => `<li><a href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(x.label || "Manufacturer Page")}</a></li>`)
          .join("")}</ul>`
      : `<p class="inline-note">${escapeHtml(data.note || "No manufacturer page found.")}</p>`;
    return;
  }

  if (section === "valuation") {
    if (data.eligible === false) {
      setText("r-acv", "Not available");
      setText("r-acv-note", data.note || "Refine query for model-specific pricing.");
      return;
    }
    if (typeof data.estimated_value === "number") {
      setText("r-acv", `$${data.estimated_value.toFixed(2)}`);
      setText("qv-acv", `$${data.estimated_value.toFixed(2)}`);
    }
    if (data.formula) setText("r-acv-formula", data.formula, "");
    if (data.note) setText("r-acv-note", data.note, "");
    if (typeof data.depreciation_rate_percent === "number") {
      valuationState.rate = data.depreciation_rate_percent;
    }
  }

  if (src.length) {
    const sourcesHtml = `<div class="inline-note">Sources: ${src
      .map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label || "Source")}</a>`)
      .join(" | ")}</div>`;
    if (section === "recalls" && byId("recalls-content")) byId("recalls-content").innerHTML += sourcesHtml;
    if ((section === "manual" || section === "manufacturer_page") && byId("manual-content")) {
      const target = section === "manual" ? byId("manual-content") : byId("manufacturer-page-content");
      if (target) target.innerHTML += sourcesHtml;
    }
  }
}

function toggleFullSpecs() {
  const container = byId("full-specs-container");
  const btn = byId("toggle-specs");
  if (!container || !btn) return;
  const isHidden = container.style.display === "none" || container.classList.contains("hidden");
  if (isHidden) {
    container.style.display = "block";
    container.classList.remove("hidden");
    btn.textContent = "Hide Full Technical Specifications";
    if (!loadedSections.has("specs")) {
      const list = byId("extended-specs-list");
      if (list) list.innerHTML = "<li>Loading specifications...</li>";
      loadLazySection("specs");
    }
  } else {
    container.style.display = "none";
    btn.textContent = "Show Full Technical Specifications";
  }
}

function collectVisibleSummary() {
  if (!phase1Data) return "No report data available.";
  const lines = [];
  lines.push(`Item Lookup Summary`);
  lines.push(`Query: ${phase1Data.query}`);
  lines.push(`Type: ${tierBadgeText(phase1Data.result_type)} (${phase1Data.confidence})`);
  lines.push(`Description: ${phase1Data.snapshot?.item_description || "N/A"}`);
  lines.push(`Production Era: ${phase1Data.release_age?.production_era || "Unknown"}`);
  lines.push(`Estimated Age: ${typeof phase1Data.release_age?.estimated_age_years === "number" ? `${phase1Data.release_age.estimated_age_years} years` : phase1Data.release_age?.age_note || "N/A"}`);

  if (byId("r-acv") && byId("r-acv").offsetParent !== null) {
    lines.push(`Depreciated Value Estimate: ${byId("r-acv").textContent || "Not shown"}`);
  }
  if (currentMode === "expanded") {
    if (loadedSections.has("recalls")) lines.push(`Recall Notices: Loaded`);
    if (loadedSections.has("error_codes_common")) lines.push(`Error Codes: Loaded`);
    if (loadedSections.has("manual")) lines.push(`Owner's Manual: Loaded`);
    if (loadedSections.has("manufacturer_page")) lines.push(`Manufacturer Page: Loaded`);
  }
  return lines.join("\n");
}

function copySummary() {
  if (!phase1Data) return;
  const summary = collectVisibleSummary();
  navigator.clipboard.writeText(summary).then(() => {
    const btn = byId("copy-btn");
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => {
      btn.textContent = old;
    }, 1500);
  });
}

async function performSearch() {
  const queryInput = byId("query");
  if (!queryInput) return;
  const query = queryInput.value.trim();
  if (!query) return;

  const loaderDog = byId("loader-dog");
  const loaderText = byId("loader-text");
  const results = byId("results");
  if (loaderDog) loaderDog.classList.add("running");
  if (loaderText) loaderText.classList.add("visible");
  if (results) results.classList.add("hidden");

  loadedSections.clear();
  loadingSections.clear();

  try {
    const response = await fetch(`/api/search?mode=research&query=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!response.ok && (!data || typeof data !== "object")) {
      throw new Error(`Search failed (${response.status})`);
    }
    if (!data || typeof data !== "object" || !data.query || !data.snapshot) {
      throw new Error(data?.error || "Could not generate report, please refine query.");
    }

    phase1Data = data;
    renderPhase1Header(data);
    renderRefinementPrompts(data.refinement_prompts || []);
    renderPricing(data);
    renderReplacementTable(data);
    renderItemNotes(data);
    renderAlwaysSections(data);
    renderQuickView(data);
    resetLazyContent();

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

    const fullSpecs = byId("full-specs-container");
    const specsBtn = byId("toggle-specs");
    if (fullSpecs) {
      fullSpecs.style.display = "none";
      fullSpecs.classList.add("hidden");
    }
    if (specsBtn) specsBtn.textContent = "Show Full Technical Specifications";

    currentMode = "compact";
    document.body.classList.remove("is-expanded");
    const viewBtn = byId("view-toggle");
    if (viewBtn) {
      viewBtn.textContent = "Compact View";
      viewBtn.classList.add("active");
    }

    if (results) results.classList.remove("hidden");
  } catch (error) {
    console.error("Search failed:", error);
    alert(error.message || "Could not generate report, please refine query.");
  } finally {
    if (loaderDog) loaderDog.classList.remove("running");
    if (loaderText) loaderText.classList.remove("visible");
  }
}

function bindLazyButtons() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains("lazy-load-btn")) {
      const domSection = target.getAttribute("data-section") || "";
      const key = sectionKeyFromDom(domSection);
      if (!key) return;
      target.disabled = true;
      target.textContent = "Loading...";
      loadLazySection(key);
      return;
    }
    if (target.id === "generate-valuation-btn") {
      loadLazySection("valuation");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = byId("btn");
  const queryInput = byId("query");
  const toggleBtn = byId("view-toggle");
  const specsBtn = byId("toggle-specs");
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
  if (specsBtn) specsBtn.addEventListener("click", toggleFullSpecs);
  if (copyBtn) copyBtn.addEventListener("click", copySummary);
  if (printBtn) printBtn.addEventListener("click", () => window.print());
  if (recalcBtn) recalcBtn.addEventListener("click", recalcACV);
  bindLazyButtons();
});
