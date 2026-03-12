(function () {
  const RETAILER_URLS = {
    "Amazon": (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
    "Best Buy": (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
    "Walmart": (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
    "Home Depot": (q) => `https://www.homedepot.com/s/${encodeURIComponent(q)}`,
    "Lowe's": (q) => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}`,
    "AJ Madison": (q) => `https://www.ajmadison.com/cgi-bin/ajmadison/search.html?query=${encodeURIComponent(q)}`,
    "Target": (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
    "B&H": (q) => `https://www.bhphotovideo.com/c/search?Ntt=${encodeURIComponent(q)}`,
    "Manufacturer": (q) => `https://www.google.com/search?q=${encodeURIComponent(q + " official site")}`
  };

  const SERVICE_LIFE_BY_CATEGORY = {
    tv: "7-10 years",
    refrigerator: "10-15 years",
    washer: "10-14 years",
    dryer: "10-14 years",
    dishwasher: "9-12 years",
    hvac: "12-20 years",
    water_heater: "8-12 years",
    computer: "4-7 years",
    small_appliance: "5-10 years",
    general: "Varies by item type"
  };

  const state = {
    query: "",
    fast: null,
    detail: null,
    isSpecificModel: false,
    modelLabel: "",
    serialAgeOverride: "",
    serialEvidence: []
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function cleanStr(value) {
    return String(value || "").trim();
  }

  function setInlineMessage(text, isError) {
    const el = byId("lkq-inline-message");
    if (!el) return;
    el.textContent = text || "";
    el.style.color = isError ? "#b91c1c" : "#64748b";
  }

  function setHidden(id, isHidden) {
    const el = byId(id);
    if (!el) return;
    el.classList.toggle("hidden", Boolean(isHidden));
  }

  function getUrlQuery() {
    const params = new URLSearchParams(window.location.search);
    return cleanStr(params.get("query"));
  }

  function setUrlQuery(query) {
    const url = new URL(window.location.href);
    url.searchParams.set("query", query);
    window.history.replaceState({}, "", url.toString());
  }

  function isSpecificModelIdentified(fast, enteredQuery) {
    const searchTier = Number(fast?.searchTier || 0);
    const analysis = fast?.analysis || {};
    const model = cleanStr(analysis.model || analysis.estimatedModel);
    const entered = cleanStr(analysis.entered || enteredQuery);

    if (!model) return false;
    if (searchTier === 4) return true;

    const modelLower = model.toLowerCase();
    const genericWords = ["unknown", "general", "item", "appliance", "device", "equipment"];
    if (genericWords.includes(modelLower)) return false;
    if (modelLower === entered.toLowerCase() && searchTier < 4) return false;

    const hasModelPattern = /[a-z]+\d|\d+[a-z]/i.test(model) || /\d{2,}/.test(model);
    return hasModelPattern;
  }

  function deriveServiceLife(category, serviceLife) {
    const explicit = cleanStr(serviceLife);
    if (explicit) return explicit;
    const key = cleanStr(category).toLowerCase();
    return SERVICE_LIFE_BY_CATEGORY[key] || SERVICE_LIFE_BY_CATEGORY.general;
  }

  function buildEstimatedAgeText() {
    if (state.serialAgeOverride) return state.serialAgeOverride;

    if (!state.isSpecificModel) {
      return "Provide a model number for exact age";
    }

    const releaseDate = state.fast?.releaseDate || {};
    const estimatedAge = cleanStr(releaseDate.estimatedAge);
    if (estimatedAge) return estimatedAge;

    const ageNumeric = releaseDate?.ageNumeric;
    if (typeof ageNumeric === "number" && Number.isFinite(ageNumeric)) {
      return `Approximately ${Math.max(0, Math.round(ageNumeric))} years old.`;
    }

    const era = cleanStr(releaseDate.productionEra);
    return era || "Age estimate unavailable";
  }

  function renderAgeCards() {
    const analysis = state.fast?.analysis || {};
    const releaseDate = state.fast?.releaseDate || {};
    const category = cleanStr(analysis.category || "general").toLowerCase();

    const productionEra = cleanStr(releaseDate.productionEra) || "Unknown";
    const ageText = buildEstimatedAgeText();
    const serviceLife = deriveServiceLife(category, state.detail?.serviceLife);

    byId("lkq-production-era").textContent = productionEra;

    const ageEl = byId("lkq-estimated-age");
    ageEl.textContent = ageText;
    ageEl.classList.toggle("muted", !state.isSpecificModel && !state.serialAgeOverride);

    byId("lkq-service-life").textContent = serviceLife;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getTableValue(rows, label, key) {
    const target = cleanStr(label).toLowerCase();
    const row = rows.find((r) => cleanStr(r?.label).toLowerCase() === target);
    if (!row) return "";
    return cleanStr(row[key]);
  }

  function collectSpecs(rows, key) {
    const excluded = new Set([
      "model",
      "recommended replacement",
      "price (new)",
      "price range (new)",
      "retailers",
      "availability",
      "notes"
    ]);

    const specs = [];
    for (const row of rows) {
      const label = cleanStr(row?.label);
      const val = cleanStr(row?.[key]);
      if (!label || !val || /^n\/?a$/i.test(val)) continue;
      if (excluded.has(label.toLowerCase())) continue;
      specs.push(`${label}: ${val}`);
      if (specs.length >= 3) break;
    }

    if (!specs.length) {
      const size = getTableValue(rows, "Size / Capacity", key);
      const notes = getTableValue(rows, "Notes", key);
      if (size) specs.push(`Size / Capacity: ${size}`);
      if (notes && specs.length < 3) specs.push(`Notes: ${notes}`);
    }

    return specs.slice(0, 3);
  }

  function buildRetailerLinks(retailerText, modelText) {
    const retailers = cleanStr(retailerText)
      .split(",")
      .map((s) => cleanStr(s))
      .filter(Boolean)
      .slice(0, 4);

    if (!retailers.length) return "-";

    const query = cleanStr(modelText) || state.query;
    const links = retailers.map((name) => {
      const fn = RETAILER_URLS[name] || ((q) => `https://www.google.com/search?q=${encodeURIComponent(name + " " + q)}`);
      const href = fn(query);
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`;
    });

    return `<div class="lkq-retailer-links">${links.join("")}</div>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderLkqTable() {
    const tableRows = asArray(state.detail?.table);
    const tableMode = cleanStr(state.detail?.tableMode || "standard");
    const tbody = byId("lkq-table-body");

    if (!tableRows.length) {
      tbody.innerHTML = `<tr><td colspan="5">No replacement options available for this query.</td></tr>`;
      return;
    }

    let candidates = [];

    if (tableMode === "tiered") {
      const modelRow = tableRows.find((r) => cleanStr(r?.label).toLowerCase() === "model") || {};
      const priceRow = tableRows.find((r) => cleanStr(r?.label).toLowerCase() === "price range (new)") || {};
      const retailersRow = tableRows.find((r) => cleanStr(r?.label).toLowerCase() === "retailers") || {};

      candidates = [
        {
          key: "entryLevel",
          tier: "Budget",
          model: cleanStr(modelRow.entryLevel) || "-",
          price: cleanStr(priceRow.entryLevel) || "-",
          retailers: cleanStr(retailersRow.entryLevel),
          specs: collectSpecs(tableRows, "entryLevel")
        },
        {
          key: "midGrade",
          tier: "LKQ",
          model: cleanStr(modelRow.midGrade) || "-",
          price: cleanStr(priceRow.midGrade) || "-",
          retailers: cleanStr(retailersRow.midGrade),
          specs: collectSpecs(tableRows, "midGrade")
        },
        {
          key: "premium",
          tier: "Premium Upgrade",
          model: cleanStr(modelRow.premium) || "-",
          price: cleanStr(priceRow.premium) || "-",
          retailers: cleanStr(retailersRow.premium),
          specs: collectSpecs(tableRows, "premium")
        }
      ];
    } else {
      const modelRow = tableRows.find((r) => cleanStr(r?.label).toLowerCase() === "model") || {};
      const priceRow = tableRows.find((r) => cleanStr(r?.label).toLowerCase() === "price (new)") || {};
      const retailersRow = tableRows.find((r) => cleanStr(r?.label).toLowerCase() === "retailers") || {};

      candidates = [
        {
          key: "brandMatch",
          tier: "Best Match",
          model: cleanStr(modelRow.brandMatch) || "-",
          price: cleanStr(priceRow.brandMatch) || "-",
          retailers: cleanStr(retailersRow.brandMatch),
          specs: collectSpecs(tableRows, "brandMatch")
        },
        {
          key: "option1",
          tier: "LKQ",
          model: cleanStr(modelRow.option1) || "-",
          price: cleanStr(priceRow.option1) || "-",
          retailers: cleanStr(retailersRow.option1),
          specs: collectSpecs(tableRows, "option1")
        },
        {
          key: "original",
          tier: "Budget",
          model: cleanStr(modelRow.original) || "-",
          price: cleanStr(priceRow.original) || "-",
          retailers: cleanStr(retailersRow.original),
          specs: collectSpecs(tableRows, "original")
        },
        {
          key: "option2",
          tier: "Premium Upgrade",
          model: cleanStr(modelRow.option2) || "-",
          price: cleanStr(priceRow.option2) || "-",
          retailers: cleanStr(retailersRow.option2),
          specs: collectSpecs(tableRows, "option2")
        }
      ];
    }

    const rowsHtml = candidates.map((c) => {
      const specsHtml = c.specs.length
        ? `<ul class="lkq-spec-list">${c.specs.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
        : "-";

      return `<tr>
        <td>${escapeHtml(c.model)}</td>
        <td>${escapeHtml(c.tier)}</td>
        <td>${specsHtml}</td>
        <td>${escapeHtml(c.price || "-")}</td>
        <td>${buildRetailerLinks(c.retailers, c.model)}</td>
      </tr>`;
    }).join("");

    tbody.innerHTML = rowsHtml;

    const tableNote = cleanStr(state.detail?.tableNote);
    const noteEl = byId("lkq-table-note");
    noteEl.textContent = tableNote;
    noteEl.classList.toggle("hidden", !tableNote);

    const considerList = byId("lkq-consider-list");
    const considerWrap = byId("lkq-consider");
    const items = asArray(state.detail?.whatToConsider).map((v) => cleanStr(v)).filter(Boolean);
    considerList.innerHTML = items.map((v) => `<li>${escapeHtml(v)}</li>`).join("");
    considerWrap.classList.toggle("hidden", items.length === 0);
  }

  function renderEvidence(evidence) {
    const detailEl = byId("lkq-evidence");
    const listEl = byId("lkq-evidence-list");
    const items = asArray(evidence).filter((e) => e && (cleanStr(e.detail) || cleanStr(e.source)));

    if (!items.length) {
      detailEl.classList.add("hidden");
      listEl.innerHTML = "";
      return;
    }

    listEl.innerHTML = items
      .map((item) => `<li><strong>${escapeHtml(cleanStr(item.source) || "Evidence")}</strong>: ${escapeHtml(cleanStr(item.detail))}</li>`)
      .join("");
    detailEl.classList.remove("hidden");
  }

  // Local serial decode utility copied from index.js patterns (narrowed for LKQ page)
  const SN_YEAR_W = {'L':2021,'M':2022,'P':2023,'R':2024,'S':2025,'T':2006,'U':2007,'W':2008,'X':2009,'Y':2010,'A':2011,'B':2012,'C':2013,'D':2014,'E':2015,'F':2016,'G':2017,'H':2018,'J':2019,'K':2020};
  const SN_YEAR_S = {'B':2011,'C':2012,'D':2013,'F':2014,'G':2015,'H':2016,'J':2017,'K':2018,'M':2019,'N':2020,'R':2021,'T':2022,'W':2023,'X':2024,'Y':2025};
  const SN_YEAR_GE = {'L':2022,'M':2023,'R':2024,'S':2025,'T':2014,'V':2015,'Z':2016,'A':2017,'D':2018,'F':2019,'G':2020,'H':2021};
  const SN_MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const SN_MONTH_GE = {'A':'January','B':'February','D':'March','F':'April','G':'May','H':'June','L':'July','M':'August','R':'September','S':'October','T':'November','V':'December'};

  const SN_DATA = {
    Appliances: {
      'Samsung':   { decode: s => { if (s.length < 10) return null; const yc = s.length >= 15 ? s[7] : s[s.length-3]; const mc = s.length >= 15 ? s[8] : s[s.length-2]; const yr = SN_YEAR_S[yc]; const mo = {'1':'Jan','2':'Feb','3':'Mar','4':'Apr','5':'May','6':'Jun','7':'Jul','8':'Aug','9':'Sep','A':'Oct','B':'Nov','C':'Dec'}[mc]; return yr && mo ? {month:mo, year:yr} : null; } },
      'Whirlpool': { decode: s => { const yr=SN_YEAR_W[s[2]]; const wk=parseInt(s.substring(3,5),10); return yr&&!isNaN(wk)?{week:wk,year:yr}:null; } },
      'GE':        { decode: s => { const yr=SN_YEAR_GE[s[1]]; const mo=SN_MONTH_GE[s[0]]; return yr&&mo?{month:mo,year:yr}:null; } },
      'LG':        { decode: s => { const yd=parseInt(s[0],10); if(isNaN(yd)) return null; const mo=SN_MONTHS_FULL[parseInt(s.substring(1,3),10)-1]; const yr=2000+yd+(yd<5?20:10); return mo?{month:mo,year:yr}:null; } }
    },
    HVAC: {
      'Carrier': { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
      'Bryant':  { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
      'Lennox':  { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
      'York':    { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
      'Trane':   { decode: s => { const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(yr)?{year:yr}:null; } },
      'Goodman': { decode: s => { const yr=2000+parseInt(s.substring(0,2),10); const mo=parseInt(s.substring(2,4),10); return !isNaN(yr)&&mo<=12?{month:SN_MONTHS_FULL[mo-1],year:yr}:null; } }
    },
    Electronics: {
      'Google Pixel': { decode: s => { const yr=2010+parseInt(s[0],10); return !isNaN(yr)?{year:yr}:null; } }
    }
  };

  function snMonthIdx(m) {
    if (!m) return -1;
    const f = SN_MONTHS_FULL.indexOf(m);
    if (f !== -1) return f;
    const short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return short.indexOf(m);
  }

  function getContextBrand(modelText) {
    const text = cleanStr(modelText).toLowerCase();
    if (!text) return null;
    const brands = [];
    for (const cat of Object.values(SN_DATA)) brands.push(...Object.keys(cat));
    brands.sort((a, b) => b.length - a.length);
    for (const b of brands) {
      if (text.includes(b.toLowerCase())) return b;
    }
    return null;
  }

  function tryDecodeSerialLocal(serial, modelText) {
    const s = cleanStr(serial).replace(/\s+/g, "").toUpperCase();
    if (!s) return { type: "unknown" };

    const hits = [];
    const contextBrand = getContextBrand(modelText);

    if (contextBrand) {
      for (const cat of Object.values(SN_DATA)) {
        if (!cat[contextBrand]) continue;
        try {
          const r = cat[contextBrand].decode(s);
          if (r && r.year) hits.push({ brand: contextBrand, priority: true, ...r });
        } catch (_) {}
        break;
      }
    }

    if (!hits.length) {
      for (const cat of Object.values(SN_DATA)) {
        for (const [brand, entry] of Object.entries(cat)) {
          try {
            const r = entry.decode(s);
            if (r && r.year) hits.push({ brand, ...r });
          } catch (_) {}
        }
      }
    }

    if (!hits.length) return { type: "unknown" };

    hits.sort((a, b) => {
      const score = (x) => (x.priority ? 10 : 0) + (x.month ? 2 : x.week ? 1 : 0);
      return score(b) - score(a);
    });

    const best = hits[0];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (best.month) {
      const mIdx = snMonthIdx(best.month);
      const diffM = (curYear - best.year) * 12 + (curMonth - (mIdx !== -1 ? mIdx : curMonth));
      const ageYears = Math.max(0, Math.round(diffM / 12 * 10) / 10);
      return { type: "exact", year: best.year, month: best.month, ageYears, label: `${best.month} ${best.year}` };
    }

    if (best.week) {
      const curWeek = Math.ceil((now - new Date(curYear, 0, 1)) / (7 * 24 * 3600 * 1000));
      const diffW = (curYear - best.year) * 52 + (curWeek - best.week);
      const ageYears = Math.max(0, Math.round(diffW / 52 * 10) / 10);
      return { type: "exact", year: best.year, week: best.week, ageYears, label: `Week ${best.week}, ${best.year}` };
    }

    return { type: "range", year: best.year, ageMin: curYear - best.year, ageMax: curYear - best.year + 1, label: String(best.year) };
  }

  async function decodeSerialFallback(serial, model) {
    const response = await fetch("/api/age-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `${serial} ${model}`.trim() })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || "Could not decode serial number.");
    }

    return payload;
  }

  function renderSerialResult(message, isError) {
    const el = byId("lkq-serial-result");
    el.textContent = message;
    el.classList.toggle("error", Boolean(isError));
  }

  async function onSerialSubmit(event) {
    event.preventDefault();

    const serial = cleanStr(byId("lkq-serial-input")?.value);
    if (!serial) {
      renderSerialResult("Enter a serial number to decode.", true);
      return;
    }

    renderSerialResult("Decoding serial number...", false);

    const localResult = tryDecodeSerialLocal(serial, state.modelLabel);
    if (localResult.type === "exact") {
      state.serialAgeOverride = `Manufactured ${localResult.label} - approximately ${localResult.ageYears} years old.`;
      state.serialEvidence = [];
      renderAgeCards();
      renderEvidence([]);
      renderSerialResult("Serial decoded locally.", false);
      return;
    }

    if (localResult.type === "range") {
      state.serialAgeOverride = `Manufactured in ${localResult.year} - approximately ${localResult.ageMin}-${localResult.ageMax} years old.`;
      state.serialEvidence = [];
      renderAgeCards();
      renderEvidence([]);
      renderSerialResult("Serial decoded locally (year-level precision).", false);
      return;
    }

    try {
      const payload = await decodeSerialFallback(serial, state.modelLabel || state.query);
      const estYear = cleanStr(payload?.estimatedYear);
      const yearRange = cleanStr(payload?.yearRange);
      const fallbackAge = yearRange || estYear || "Exact age unavailable";

      state.serialAgeOverride = estYear && yearRange
        ? `${yearRange} (estimated year ${estYear})`
        : fallbackAge;
      state.serialEvidence = asArray(payload?.evidence);

      renderAgeCards();
      renderEvidence(state.serialEvidence);
      renderSerialResult("Serial decoded using smart lookup.", false);
    } catch (err) {
      renderSerialResult(err?.message || "Serial decode failed.", true);
    }
  }

  function renderSerialSection() {
    setHidden("lkq-serial-section", !state.isSpecificModel);
    if (!state.isSpecificModel) {
      renderEvidence([]);
      renderSerialResult("", false);
    }
  }

  async function loadLkqReport(query) {
    state.query = cleanStr(query);
    state.serialAgeOverride = "";
    state.serialEvidence = [];

    const queryInput = byId("lkq-query-input");
    if (queryInput) queryInput.value = state.query;

    setInlineMessage("", false);
    setHidden("lkq-loading", false);
    setHidden("lkq-content", true);

    try {
      const [fastResp, detailResp] = await Promise.all([
        fetch(`/api/search?mode=research-fast&query=${encodeURIComponent(state.query)}`),
        fetch(`/api/search?mode=research-detail&query=${encodeURIComponent(state.query)}`)
      ]);

      const fastPayload = await fastResp.json().catch(() => ({}));
      const detailPayload = await detailResp.json().catch(() => ({}));

      if (!fastResp.ok) {
        throw new Error(cleanStr(fastPayload?.error) || "Fast report request failed.");
      }
      if (!detailResp.ok) {
        throw new Error(cleanStr(detailPayload?.error) || "Detail report request failed.");
      }

      const analysis = fastPayload?.analysis || {};
      const releaseDate = fastPayload?.releaseDate || {};
      const model = cleanStr(analysis.model || analysis.estimatedModel);

      state.fast = {
        searchTier: Number(fastPayload?.searchTier || 0),
        analysis: {
          model,
          entered: cleanStr(analysis.entered),
          category: cleanStr(analysis.category),
          specs: asArray(analysis.topSpecs)
        },
        releaseDate: {
          productionEra: cleanStr(releaseDate.productionEra),
          estimatedAge: cleanStr(releaseDate.estimatedAge),
          ageNumeric: typeof releaseDate.ageNumeric === "number" ? releaseDate.ageNumeric : null
        }
      };

      state.detail = {
        table: asArray(detailPayload?.table),
        tableMode: cleanStr(detailPayload?.tableMode || "standard"),
        serviceLife: cleanStr(detailPayload?.serviceLife),
        whatToConsider: asArray(detailPayload?.whatToConsider),
        tableNote: cleanStr(detailPayload?.tableNote)
      };

      state.modelLabel = state.fast.analysis.model;
      state.isSpecificModel = isSpecificModelIdentified(fastPayload, state.query);

      renderAgeCards();
      renderSerialSection();
      renderLkqTable();

      setHidden("lkq-content", false);
      setInlineMessage("", false);
    } catch (err) {
      setInlineMessage(err?.message || "Could not generate LKQ report.", true);
      setHidden("lkq-content", true);
    } finally {
      setHidden("lkq-loading", true);
    }
  }

  function bindEvents() {
    byId("lkq-query-btn")?.addEventListener("click", () => {
      const q = cleanStr(byId("lkq-query-input")?.value);
      if (!q) {
        setInlineMessage("Enter a query to generate an LKQ report.", true);
        return;
      }
      setUrlQuery(q);
      loadLkqReport(q);
    });

    byId("lkq-query-input")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      byId("lkq-query-btn")?.click();
    });

    byId("lkq-serial-form")?.addEventListener("submit", onSerialSubmit);

    byId("lkq-full-report-btn")?.addEventListener("click", () => {
      if (!state.query) return;
      window.location.href = `/index.html?query=${encodeURIComponent(state.query)}`;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    const q = getUrlQuery();
    if (!q) {
      setInlineMessage("Add a query in the URL or use the input above to run an LKQ report.", false);
      return;
    }
    loadLkqReport(q);
  });
})();
