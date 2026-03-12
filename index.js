let activeTab = "tab-overview";
let fastData = null;
let detailData = null;
let currentCategory = "general";
let acvData = { msrp: 0, age: 0 };
let _compareBlock = null;
let activeSearchToken = 0;
let lkqModeActive = false;
let activeReportType = null;

// ── Section filter state ──────────────────────────────────────────────────────

const selectedSections = {
  howItWorks:   true,
  replacements: true,
  diagnostics:  true,
  valuation:    true,
  overviewMetrics: true,
  currentAnalysis: true,
  variations: true,
  technicalDetails: true,
  recalls: true,
  errorFailures: true,
  manualMfr: true,
  troubleshooting: true
};

const FULL_REPORT_SECTION_IDS = [
  "full-sec-overview",
  "full-sec-analysis",
  "full-sec-variations",
  "full-sec-replacements",
  "full-sec-valuation",
  "full-sec-diagnostics",
  "full-sec-technical",
  "full-sec-recalls",
  "full-sec-errors-failures",
  "full-sec-manual-mfr",
  "full-sec-troubleshooting"
];

function setAllFullReportSectionsChecked(checked) {
  FULL_REPORT_SECTION_IDS.forEach((id) => {
    const el = byId(id);
    if (el) el.checked = checked;
  });
}

function applyFullReportSectionSelections() {
  const get = (id, fallback = true) => {
    const el = byId(id);
    return el ? Boolean(el.checked) : fallback;
  };

  selectedSections.overviewMetrics = get("full-sec-overview");
  selectedSections.currentAnalysis = get("full-sec-analysis");
  selectedSections.variations = get("full-sec-variations");
  selectedSections.replacements = get("full-sec-replacements");
  selectedSections.valuation = get("full-sec-valuation");
  selectedSections.technicalDetails = get("full-sec-technical");
  selectedSections.recalls = get("full-sec-recalls");
  selectedSections.errorFailures = get("full-sec-errors-failures");
  selectedSections.manualMfr = get("full-sec-manual-mfr");
  selectedSections.troubleshooting = get("full-sec-troubleshooting");

  const diagnosticsMaster = get("full-sec-diagnostics");
  selectedSections.diagnostics = diagnosticsMaster;
  selectedSections.howItWorks = selectedSections.technicalDetails;
}

function toggleFullReportPicker(forceOpen = null) {
  const picker = byId("full-report-picker");
  const trigger = byId("full-report-btn");
  if (!picker) return false;
  const willOpen = forceOpen === null ? !picker.classList.contains("open") : Boolean(forceOpen);
  picker.classList.toggle("open", willOpen);
  picker.setAttribute("aria-hidden", willOpen ? "false" : "true");
  if (trigger) trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
  return willOpen;
}

function syncReportActionButtons() {
  const lkqBtn = byId("lkq-report-btn");
  const fullBtn = byId("full-report-btn");
  if (!lkqBtn || !fullBtn) return;

  lkqBtn.classList.remove("report-btn--active", "report-btn--inactive");
  fullBtn.classList.remove("report-btn--active", "report-btn--inactive");

  if (activeReportType === "lkq") {
    lkqBtn.classList.add("report-btn--active");
    fullBtn.classList.add("report-btn--inactive");
  } else if (activeReportType === "full") {
    fullBtn.classList.add("report-btn--active");
    lkqBtn.classList.add("report-btn--inactive");
  }
}

function setActiveReportType(type) {
  if (type !== "lkq" && type !== "full") {
    activeReportType = null;
  } else {
    activeReportType = type;
  }
  syncReportActionButtons();
}

// ── Serial Number Decode ──────────────────────────────────────────────────────
// Maps and helpers mirror item-age.js (not loaded on this page)
const SN_YEAR_W   = {'L':2021,'M':2022,'P':2023,'R':2024,'S':2025,'T':2006,'U':2007,'W':2008,'X':2009,'Y':2010,'A':2011,'B':2012,'C':2013,'D':2014,'E':2015,'F':2016,'G':2017,'H':2018,'J':2019,'K':2020};
const SN_YEAR_S   = {'B':2011,'C':2012,'D':2013,'F':2014,'G':2015,'H':2016,'J':2017,'K':2018,'M':2019,'N':2020,'R':2021,'T':2022,'W':2023,'X':2024,'Y':2025};
const SN_YEAR_GE  = {'L':2022,'M':2023,'R':2024,'S':2025,'T':2014,'V':2015,'Z':2016,'A':2017,'D':2018,'F':2019,'G':2020,'H':2021};
const SN_MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SN_MONTH_GE = {'A':'January','B':'February','D':'March','F':'April','G':'May','H':'June','L':'July','M':'August','R':'September','S':'October','T':'November','V':'December'};

function snMonthIdx(m) {
  if (!m) return -1;
  const f = SN_MONTHS_FULL.indexOf(m);
  if (f !== -1) return f;
  const short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return short.indexOf(m);
}

const SN_DATA = {
  Appliances: {
    'Samsung':         { decode: s => { if (s.length < 10) return null; const yc = s.length >= 15 ? s[7] : s[s.length-3]; const mc = s.length >= 15 ? s[8] : s[s.length-2]; const yr = SN_YEAR_S[yc]; const mo = {'1':'Jan','2':'Feb','3':'Mar','4':'Apr','5':'May','6':'Jun','7':'Jul','8':'Aug','9':'Sep','A':'Oct','B':'Nov','C':'Dec'}[mc]; return yr && mo ? {month:mo, year:yr, details:`Samsung: year char at pos ${s.length>=15?8:'−3'}, month at next.`} : null; } },
    'Whirlpool':       { decode: s => { const yr=SN_YEAR_W[s[2]]; const wk=parseInt(s.substring(3,5)); return yr&&!isNaN(wk)?{week:wk,year:yr,details:'Whirlpool: char 3=year, digits 4-5=week.'}:null; } },
    'Maytag':          { decode: s => { const yr=SN_YEAR_W[s[2]]; const wk=parseInt(s.substring(3,5)); return yr&&!isNaN(wk)?{week:wk,year:yr,details:'Maytag/Whirlpool style.'}:null; } },
    'KitchenAid':      { decode: s => { const yr=SN_YEAR_W[s[2]]; const wk=parseInt(s.substring(3,5)); return yr&&!isNaN(wk)?{week:wk,year:yr,details:'KitchenAid/Whirlpool style.'}:null; } },
    'Jenn-Air':        { decode: s => { const yr=SN_YEAR_W[s[2]]; const wk=parseInt(s.substring(3,5)); return yr&&!isNaN(wk)?{week:wk,year:yr,details:'Jenn-Air/Whirlpool style.'}:null; } },
    'Amana':           { decode: s => { const yr=SN_YEAR_W[s[2]]; const wk=parseInt(s.substring(3,5)); return yr&&!isNaN(wk)?{week:wk,year:yr,details:'Amana/Whirlpool style.'}:null; } },
    'GE':              { decode: s => { const yr=SN_YEAR_GE[s[1]]; const mo=SN_MONTH_GE[s[0]]; return yr&&mo?{month:mo,year:yr,details:'GE: char 1=month, char 2=year.'}:null; } },
    'GE Profile':      { decode: s => { const yr=SN_YEAR_GE[s[1]]; const mo=SN_MONTH_GE[s[0]]; return yr&&mo?{month:mo,year:yr,details:'GE Profile style.'}:null; } },
    'GE Cafe':         { decode: s => { const yr=SN_YEAR_GE[s[1]]; const mo=SN_MONTH_GE[s[0]]; return yr&&mo?{month:mo,year:yr,details:'GE Cafe style.'}:null; } },
    'GE Monogram':     { decode: s => { const yr=SN_YEAR_GE[s[1]]; const mo=SN_MONTH_GE[s[0]]; return yr&&mo?{month:mo,year:yr,details:'GE Monogram style.'}:null; } },
    'Hotpoint':        { decode: s => { const yr=SN_YEAR_GE[s[1]]; const mo=SN_MONTH_GE[s[0]]; return yr&&mo?{month:mo,year:yr,details:'Hotpoint/GE style.'}:null; } },
    'LG':              { decode: s => { const yd=parseInt(s[0]); if(isNaN(yd)) return null; const mo=SN_MONTHS_FULL[parseInt(s.substring(1,3))-1]; const yr=2000+yd+(yd<5?20:10); return mo?{month:mo,year:yr,details:`LG: digit 1=year, digits 2-3=month.`}:null; } },
    'Frigidaire':      { decode: s => { const yd=parseInt(s[2]); return !isNaN(yd)?{year:2010+yd,details:'Frigidaire: 3rd digit=year last digit.'}:null; } },
    'Electrolux':      { decode: s => { const yd=parseInt(s[2]); return !isNaN(yd)?{year:2010+yd,details:'Electrolux/Frigidaire style.'}:null; } },
    'Bosch':           { decode: s => { const m=s.match(/FD\s*(\d{4})/i)||s.match(/^(\d{4})/); if(!m) return null; const yr=1920+parseInt(m[1].substring(0,2)); const mo=SN_MONTHS_FULL[parseInt(m[1].substring(2,4))-1]; return mo?{month:mo,year:yr,details:'Bosch FD: add 20 to first two FD digits.'}:null; } },
    'Thermador':       { decode: s => { const m=s.match(/FD\s*(\d{4})/i)||s.match(/^(\d{4})/); if(!m) return null; const yr=1920+parseInt(m[1].substring(0,2)); const mo=SN_MONTHS_FULL[parseInt(m[1].substring(2,4))-1]; return mo?{month:mo,year:yr,details:'Thermador/Bosch style.'}:null; } },
    'Bradford White':  { decode: s => { const ymap={'A':2004,'B':2005,'C':2006,'D':2007,'E':2008,'F':2009,'G':2010,'H':2011,'J':2012,'K':2013,'L':2014,'M':2015,'N':2016,'P':2017,'S':2018,'T':2019,'W':2020,'X':2021,'Y':2022,'Z':2023}; const mmap={'A':'Jan','B':'Feb','C':'Mar','D':'Apr','E':'May','F':'Jun','G':'Jul','H':'Aug','J':'Sep','K':'Oct','L':'Nov','M':'Dec'}; return ymap[s[0]]&&mmap[s[1]]?{month:mmap[s[1]],year:ymap[s[0]],details:'Bradford White: char 1=year, char 2=month.'}:null; } },
    'Rheem':           { decode: s => { const d=s.replace(/\D/g,'').substring(0,4); const mo=parseInt(d.substring(0,2)); const yr=2000+parseInt(d.substring(2,4)); return mo>0&&mo<=12?{month:SN_MONTHS_FULL[mo-1],year:yr,details:'Rheem: digits 1-2=month, 3-4=year.'}:null; } },
    'Ruud':            { decode: s => { const d=s.replace(/\D/g,'').substring(0,4); const mo=parseInt(d.substring(0,2)); const yr=2000+parseInt(d.substring(2,4)); return mo>0&&mo<=12?{month:SN_MONTHS_FULL[mo-1],year:yr,details:'Ruud style.'}:null; } },
    'A.O. Smith':      { decode: s => { const d=s.replace(/\D/g,'').substring(0,4); const mo=parseInt(d.substring(0,2)); const yr=2000+parseInt(d.substring(2,4)); return mo>0&&mo<=12?{month:SN_MONTHS_FULL[mo-1],year:yr,details:'A.O. Smith style.'}:null; } },
  },
  HVAC: {
    'Carrier':         { decode: s => { const wk=parseInt(s.substring(0,2)); const yr=2000+parseInt(s.substring(2,4)); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr,details:'Carrier: digits 1-2=week, 3-4=year.'}:null; } },
    'Bryant':          { decode: s => { const wk=parseInt(s.substring(0,2)); const yr=2000+parseInt(s.substring(2,4)); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr,details:'Bryant style.'}:null; } },
    'Lennox':          { decode: s => { const wk=parseInt(s.substring(0,2)); const yr=2000+parseInt(s.substring(2,4)); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr,details:'Lennox style.'}:null; } },
    'York':            { decode: s => { const wk=parseInt(s.substring(0,2)); const yr=2000+parseInt(s.substring(2,4)); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr,details:'York style.'}:null; } },
    'Trane':           { decode: s => { const yr=2000+parseInt(s.substring(2,4)); return !isNaN(yr)?{year:yr,details:'Trane: digits 3-4=year.'}:null; } },
    'American Standard':{ decode: s => { const yr=2000+parseInt(s.substring(2,4)); return !isNaN(yr)?{year:yr,details:'American Standard/Trane style.'}:null; } },
    'Goodman':         { decode: s => { const yr=2000+parseInt(s.substring(0,2)); const mo=parseInt(s.substring(2,4)); return !isNaN(yr)&&mo<=12?{month:SN_MONTHS_FULL[mo-1],year:yr,details:'Goodman: digits 1-2=year, 3-4=month.'}:null; } },
  },
  Electronics: {
    'Apple':           { decode: s => { if(s.length!==12) return null; const yc=s[3]; const wc=s[4]; return {details:`Apple 12-char: char 4 (${yc})=year code, char 5 (${wc})=week code. Manual lookup required.`}; } },
    'ASUS':            { decode: s => { const ymap={'A':2010,'B':2011,'C':2012,'D':2013,'E':2014,'F':2015,'G':2016,'H':2017,'J':2018,'K':2019,'L':2020,'M':2021,'N':2022}; const yr=ymap[s[0]]; const mo=parseInt(s[1])||( s[1]==='A'?10:s[1]==='B'?11:12); return yr&&mo<=12?{month:SN_MONTHS_FULL[mo-1],year:yr,details:'ASUS: char 1=year, char 2=month.'}:null; } },
    'Google Pixel':    { decode: s => { const yr=2010+parseInt(s[0]); return !isNaN(yr)?{year:yr,details:'Pixel: first digit + 2010 = year.'}:null; } },
  }
};

function snContextBrand() {
  if (!fastData || !fastData.analysis) return null;
  const text = ((fastData.analysis.estimatedModel || '') + ' ' + (fastData.analysis.itemDescription || '')).toLowerCase();
  const brands = [];
  for (const cat of Object.values(SN_DATA)) brands.push(...Object.keys(cat));
  brands.sort((a, b) => b.length - a.length); // longer names first
  for (const b of brands) { if (text.includes(b.toLowerCase())) return b; }
  return null;
}

function tryDecodeSerial(serial) {
  const s = serial.trim().replace(/\s+/g, '').toUpperCase();
  if (!s) return { type: 'unknown' };

  const hits = [];
  const contextBrand = snContextBrand();

  // Try context-matched brand first
  if (contextBrand) {
    for (const cat of Object.values(SN_DATA)) {
      if (cat[contextBrand]) {
        try { const r = cat[contextBrand].decode(s); if (r && r.year) hits.push({ brand: contextBrand, priority: true, ...r }); } catch (_) {}
        break;
      }
    }
  }

  // Brute-force remaining brands if context decode didn't produce a precise result
  const bestSoFar = hits[0];
  if (!bestSoFar || (!bestSoFar.month && !bestSoFar.week)) {
    for (const cat of Object.values(SN_DATA)) {
      for (const [brand, entry] of Object.entries(cat)) {
        if (brand === contextBrand) continue;
        try { const r = entry.decode(s); if (r && r.year) hits.push({ brand, ...r }); } catch (_) {}
      }
    }
  }

  if (!hits.length) return { type: 'unknown' };

  hits.sort((a, b) => {
    const score = x => (x.priority ? 10 : 0) + (x.month ? 2 : x.week ? 1 : 0);
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
    return { type: 'exact', year: best.year, month: best.month, ageYears, brand: best.brand, details: best.details, label: `${best.month} ${best.year}` };
  }

  if (best.week) {
    const curWeek = Math.ceil((now - new Date(curYear, 0, 1)) / (7 * 24 * 3600 * 1000));
    const diffW = (curYear - best.year) * 52 + (curWeek - best.week);
    const ageYears = Math.max(0, Math.round(diffW / 52 * 10) / 10);
    return { type: 'exact', year: best.year, week: best.week, ageYears, brand: best.brand, details: best.details, label: `Week ${best.week}, ${best.year}` };
  }

  return { type: 'range', year: best.year, ageMin: curYear - best.year, ageMax: curYear - best.year + 1, brand: best.brand, details: best.details, label: String(best.year) };
}

function handleSerialDecode() {
  const snInput = byId('sn-input');
  const snResultLi = byId('sn-result-li');
  const snResultText = byId('sn-result-text');
  const snBtn = byId('sn-decode-btn');
  if (!snInput || !snResultLi || !snResultText) return;

  const serial = snInput.value.trim();
  if (!serial) return;

  if (snBtn) { snBtn.disabled = true; snBtn.textContent = 'Decoding…'; }
  const result = tryDecodeSerial(serial);
  if (snBtn) { snBtn.disabled = false; snBtn.textContent = 'Decode Serial Number'; }

  if (result.type === 'exact') {
    const ageStr = `${result.ageYears} year${result.ageYears !== 1 ? 's' : ''}`;
    setText('r-estimated-age', `Manufactured ${result.label} — approximately ${ageStr} old. Confirmed via Serial Number.`);
    setText('m-age', `~${ageStr} old (serial confirmed)`);
    snResultText.innerHTML = `<span class="sn-status sn-confirmed">&#10003; Confirmed via Serial Number</span><span class="sn-detail">${escapeHtml(result.label)} &mdash; ~${ageStr}</span>`;
    if (acvData.msrp > 0) {
      const ageNum = Math.round(result.ageYears);
      const ageInput = byId('acv-age-input');
      if (ageInput) ageInput.value = String(ageNum);
      acvData.age = ageNum;
      renderACVDisplay(acvData.msrp, ageNum, currentCategory);
    }
  } else if (result.type === 'range') {
    const resAge = (fastData && fastData.releaseDate) ? (fastData.releaseDate.estimatedAge || '') : '';
    const era    = (fastData && fastData.releaseDate) ? (fastData.releaseDate.productionEra || '') : '';
    const consistent = resAge.includes(String(result.year)) || era.includes(String(result.year));
    const note = consistent ? 'Consistent with research data.' : 'Cross-reference with research data above.';
    setText('r-estimated-age', `Manufactured in ${result.year} — approximately ${result.ageMin}–${result.ageMax} years old. ${note}`);
    setText('m-age', `~${result.ageMin}–${result.ageMax} yrs old (serial decoded)`);
    snResultText.innerHTML = `<span class="sn-status sn-range">&#9432; Year decoded — ${escapeHtml(note)}</span><span class="sn-detail">${result.year} &mdash; ~${result.ageMin}&ndash;${result.ageMax} yrs</span>`;
    if (acvData.msrp > 0) {
      const ageInput = byId('acv-age-input');
      if (ageInput) ageInput.value = String(result.ageMin);
      acvData.age = result.ageMin;
      renderACVDisplay(acvData.msrp, result.ageMin, currentCategory);
    }
  } else {
    snResultText.innerHTML = `<span class="sn-status sn-unknown">&#10007; Serial number not recognized &mdash; estimated age based on research only</span>`;
  }
  snResultLi.style.display = '';
}

// Returns true if any "detail" section is selected (skip detail API call if all off)
function needsDetailFetch() {
  return selectedSections.howItWorks ||
         selectedSections.replacements || selectedSections.diagnostics;
}

// Show/hide cards and tab buttons based on selectedSections.
// Safe to call before first search (results hidden — no-op).
function updateSectionVisibility() {
  const resultsEl = byId("results");
  if (!resultsEl || resultsEl.classList.contains("hidden")) return;

  const metricsStrip = document.querySelector("#panel-overview .metrics-strip");
  if (metricsStrip) metricsStrip.classList.toggle("hidden", !selectedSections.overviewMetrics);

  show("card-analysis", selectedSections.currentAnalysis);
  show("card-how-it-works", selectedSections.howItWorks);
  show("r-variations", selectedSections.variations);

  const diagnosticsVisible = selectedSections.diagnostics;
  show("card-manual-mfr", diagnosticsVisible && selectedSections.manualMfr);
  show("card-recalls", diagnosticsVisible && selectedSections.recalls);
  const showErrorFailures = diagnosticsVisible && selectedSections.errorFailures;
  show("card-error-codes", showErrorFailures);
  show("card-failures", showErrorFailures);
  show("card-troubleshooting", diagnosticsVisible && selectedSections.troubleshooting);

  if (fastData && Number(fastData.searchTier) >= 3) {
    show("card-valuation", selectedSections.valuation);
  }

  renderReportSectionTabs();

  const activeTabKey = activeTab.replace('tab-', '');
  if (activeTabKey !== 'overview' && !selectedSections[activeTabKey]) {
    setActiveTab("tab-overview");
  }

  if (detailData) renderDetail(detailData);
}
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
  "Amazon":      (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  "Home Depot":  (q) => `https://www.homedepot.com/s/${encodeURIComponent(q)}`,
  "Lowe's":      (q) => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}`,
  "AJ Madison":  (q) => `https://www.ajmadison.com/cgi-bin/ajmadison/search.html?query=${encodeURIComponent(q)}`,
  "Target":      (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  "B&H":         (q) => `https://www.bhphotovideo.com/c/search?Ntt=${encodeURIComponent(q)}`,
  "Manufacturer":(q) => `https://www.google.com/search?q=${encodeURIComponent(q + " official site")}`
};

const RETAILER_SEARCH_URLS = {
  bestbuy: (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
  amazon: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  walmart: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  homedepot: (q) => `https://www.homedepot.com/s/${encodeURIComponent(q)}`,
  lowes: (q) => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}`,
  ajmadison: (q) => `https://www.ajmadison.com/cgi-bin/ajmadison/search.html?query=${encodeURIComponent(q)}`,
  target: (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  bh: (q) => `https://www.bhphotovideo.com/c/search?Ntt=${encodeURIComponent(q)}`,
  manufacturer: (brand, q) => {
    const normalizedBrand = String(brand || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (!normalizedBrand) {
      return `https://www.google.com/search?q=${encodeURIComponent(q + " official site")}`;
    }
    return `https://www.${normalizedBrand}.com/search?q=${encodeURIComponent(q)}`;
  }
};

function normalizeRetailerKey(name) {
  const key = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!key) return "";

  const aliases = {
    bestbuy: "bestbuy",
    amazon: "amazon",
    walmart: "walmart",
    homedepot: "homedepot",
    lowes: "lowes",
    ajmadison: "ajmadison",
    target: "target",
    bh: "bh",
    bhphotovideo: "bh",
    manufacturer: "manufacturer",
    official: "manufacturer",
    manufacturersite: "manufacturer"
  };
  return aliases[key] || key;
}

function buildFallbackRetailerSearchUrl(retailerName, searchQuery) {
  const combined = [retailerName, searchQuery].map((v) => String(v || "").trim()).filter(Boolean).join(" ");
  const query = combined || String(searchQuery || "").trim() || "item";
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function resolveRetailerSearchUrl(retailerName, searchQuery, brandHint = "") {
  const key = normalizeRetailerKey(retailerName);
  const query = String(searchQuery || "").trim();
  if (!key || !query) return buildFallbackRetailerSearchUrl(retailerName, searchQuery);

  const builder = RETAILER_SEARCH_URLS[key];
  if (!builder) return buildFallbackRetailerSearchUrl(retailerName, searchQuery);

  if (key === "manufacturer") {
    return builder(brandHint, query);
  }
  return builder(query);
}

function isMissingBrandValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  return text === "n/a" || text === "na" || text === "unknown" || text === "generic";
}

function isDiscontinuedValue(value) {
  if (typeof value === "boolean") return value;
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return text === "true" || text === "yes" || text.includes("discontinued") || text.includes("no longer manufactured");
}

function getRetailerSuppressionMessage(meta = {}) {
  const hasBrandField = Boolean(meta.hasBrandField) || Object.prototype.hasOwnProperty.call(meta, "brand");
  if (hasBrandField && isMissingBrandValue(meta.brand)) {
    return "No brand match available";
  }
  const discontinued =
    isDiscontinuedValue(meta.discontinued) ||
    String(meta.availability || "").toLowerCase().includes("discontinued") ||
    String(meta.availability || "").toLowerCase().includes("no longer manufactured");
  if (discontinued) {
    return "Product line discontinued by manufacturer";
  }
  return "";
}

function renderRetailerSuppressionMessage(message) {
  return `<span class="retailer-link-muted">${escapeHtml(message)}</span>`;
}

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

function decodeUnicodeEscapes(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\\u([0-9a-fA-F]{4})/g, function(_, code) {
    return String.fromCharCode(parseInt(code, 16));
  });
}

function safeText(value, fallback = "N/A") {
  let text = String(value ?? "").trim();
  text = decodeUnicodeEscapes(text);
  return text || fallback;
}

function setText(id, value, fallback = "N/A") {
  const el = byId(id);
  if (!el) return;
  el.textContent = safeText(value, fallback);
}

function escapeHtml(value) {
  let s = String(value ?? "");
  s = decodeUnicodeEscapes(s);
  return s
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

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

let imagePreviewObjectUrl = null;

function setImageSearchStatus(message, tone = "") {
  const statusEl = byId("image-search-status");
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.classList.remove("error", "success");
  if (tone) statusEl.classList.add(tone);
}

function clearImagePreview() {
  const wrap = byId("image-preview-wrap");
  const img = byId("image-preview");
  const meta = byId("image-preview-meta");
  if (imagePreviewObjectUrl) {
    URL.revokeObjectURL(imagePreviewObjectUrl);
    imagePreviewObjectUrl = null;
  }
  if (img) img.removeAttribute("src");
  if (meta) meta.textContent = "";
  if (wrap) wrap.classList.remove("active");
}

function showImagePreview(file) {
  const wrap = byId("image-preview-wrap");
  const img = byId("image-preview");
  const meta = byId("image-preview-meta");
  if (!wrap || !img || !meta) return;

  if (imagePreviewObjectUrl) URL.revokeObjectURL(imagePreviewObjectUrl);
  imagePreviewObjectUrl = URL.createObjectURL(file);
  img.src = imagePreviewObjectUrl;
  meta.textContent = `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  wrap.classList.add("active");
}

function validateImageFile(file) {
  if (!file) return "No image selected.";
  const lowerName = String(file.name || "").toLowerCase();
  const hasAllowedExt = /\.(jpe?g|png|webp|heic|heif)$/.test(lowerName);
  const hasAllowedMime = IMAGE_ALLOWED_TYPES.has(String(file.type || "").toLowerCase()) || String(file.type || "").startsWith("image/");

  if (!hasAllowedMime && !hasAllowedExt) {
    return "Invalid file type. Please use JPEG, PNG, WEBP, or HEIC.";
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return "Image is too large. Please upload an image under 10 MB.";
  }
  return null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function handleImageSearch(file) {
  const queryInput = byId("query");
  const validationError = validateImageFile(file);
  if (validationError) {
    clearImagePreview();
    setImageSearchStatus(validationError, "error");
    return;
  }

  showImagePreview(file);
  setImageSearchStatus("Analyzing image...");

  try {
    const imageData = await readFileAsDataUrl(file);
    const hint = String(queryInput?.value || "").trim();

    const response = await fetch("/api/image-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageData,
        hint,
        mimeType: file.type || null,
        fileName: file.name || null,
        size: file.size
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Image analysis failed.");
    }

    const lowConfidence = payload?.lowConfidence === true ||
      (typeof payload?.confidence === "number" && payload.confidence < 0.45);

    const proposedQuery = String(payload?.queryString || "").trim() || hint || "Unknown item (image)";
    if (queryInput) queryInput.value = proposedQuery;

    if (lowConfidence) {
      setImageSearchStatus(
        "We couldn't confidently recognize this item. Try adding a short description and searching again.",
        "error"
      );
    } else {
      setImageSearchStatus("Image analyzed. Running search...", "success");
    }

    performSearch();
  } catch (err) {
    console.error("Image search error:", err);
    setImageSearchStatus(err?.message || "Network error. Please try again.", "error");
  }
}

// Inline LKQ report mode (kept separate from full report renderFast/renderDetail pipeline)
const LKQ_SERVICE_LIFE_BY_CATEGORY = {
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

const LKQ_SN_YEAR_W = {'L':2021,'M':2022,'P':2023,'R':2024,'S':2025,'T':2006,'U':2007,'W':2008,'X':2009,'Y':2010,'A':2011,'B':2012,'C':2013,'D':2014,'E':2015,'F':2016,'G':2017,'H':2018,'J':2019,'K':2020};
const LKQ_SN_YEAR_S = {'B':2011,'C':2012,'D':2013,'F':2014,'G':2015,'H':2016,'J':2017,'K':2018,'M':2019,'N':2020,'R':2021,'T':2022,'W':2023,'X':2024,'Y':2025};
const LKQ_SN_YEAR_GE = {'L':2022,'M':2023,'R':2024,'S':2025,'T':2014,'V':2015,'Z':2016,'A':2017,'D':2018,'F':2019,'G':2020,'H':2021};
const LKQ_SN_MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LKQ_SN_MONTH_GE = {'A':'January','B':'February','D':'March','F':'April','G':'May','H':'June','L':'July','M':'August','R':'September','S':'October','T':'November','V':'December'};

const LKQ_SN_DATA = {
  Appliances: {
    'Samsung':   { decode: s => { if (s.length < 10) return null; const yc = s.length >= 15 ? s[7] : s[s.length-3]; const mc = s.length >= 15 ? s[8] : s[s.length-2]; const yr = LKQ_SN_YEAR_S[yc]; const mo = {'1':'Jan','2':'Feb','3':'Mar','4':'Apr','5':'May','6':'Jun','7':'Jul','8':'Aug','9':'Sep','A':'Oct','B':'Nov','C':'Dec'}[mc]; return yr && mo ? {month:mo, year:yr} : null; } },
    'Whirlpool': { decode: s => { const yr=LKQ_SN_YEAR_W[s[2]]; const wk=parseInt(s.substring(3,5),10); return yr&&!isNaN(wk)?{week:wk,year:yr}:null; } },
    'GE':        { decode: s => { const yr=LKQ_SN_YEAR_GE[s[1]]; const mo=LKQ_SN_MONTH_GE[s[0]]; return yr&&mo?{month:mo,year:yr}:null; } },
    'LG':        { decode: s => { const yd=parseInt(s[0],10); if(isNaN(yd)) return null; const mo=LKQ_SN_MONTHS_FULL[parseInt(s.substring(1,3),10)-1]; const yr=2000+yd+(yd<5?20:10); return mo?{month:mo,year:yr}:null; } }
  },
  HVAC: {
    'Carrier': { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
    'Bryant':  { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
    'Lennox':  { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
    'York':    { decode: s => { const wk=parseInt(s.substring(0,2),10); const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(wk)&&!isNaN(yr)?{week:wk,year:yr}:null; } },
    'Trane':   { decode: s => { const yr=2000+parseInt(s.substring(2,4),10); return !isNaN(yr)?{year:yr}:null; } },
    'Goodman': { decode: s => { const yr=2000+parseInt(s.substring(0,2),10); const mo=parseInt(s.substring(2,4),10); return !isNaN(yr)&&mo<=12?{month:LKQ_SN_MONTHS_FULL[mo-1],year:yr}:null; } }
  },
  Electronics: {
    'Google Pixel': { decode: s => { const yr=2010+parseInt(s[0],10); return !isNaN(yr)?{year:yr}:null; } }
  }
};

let lkqInlineState = {
  query: "",
  fast: null,
  detail: null,
  modelLabel: "",
  isSpecificModel: false,
  serialAgeOverride: ""
};

function lkqCleanStr(v) {
  return String(v ?? "").trim();
}

function lkqAsArray(v) {
  return Array.isArray(v) ? v : [];
}

function lkqEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lkqEnsureRoot() {
  const inner = document.querySelector("#results .results-inner");
  if (!inner) return null;
  let root = byId("lkq-inline-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "lkq-inline-root";
    root.className = "hidden";
    root.style.marginTop = "0.85rem";
    inner.insertBefore(root, inner.firstChild);
  }
  return root;
}

function lkqToggleFullReportChrome(showFull) {
  const selectors = [
    "#results .results-header",
    "#model-number-hint",
    "#report-tabs-top",
    "#estimation-banner",
    "#refine-tip",
    "#panel-overview",
    "#panel-replacements",
    "#panel-diagnostics",
    "#report-tabs-bottom",
    "#results .results-inner > footer"
  ];
  selectors.forEach((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.toggle("hidden", !showFull);
  });
}

function clearLkqInlineView() {
  lkqModeActive = false;
  lkqToggleFullReportChrome(true);
  const root = byId("lkq-inline-root");
  if (root) {
    root.classList.add("hidden");
    root.innerHTML = "";
  }
}

function lkqModelSpecific(fast, enteredQuery) {
  const searchTier = Number(fast?.searchTier || 0);
  const analysis = fast?.analysis || {};
  const model = lkqCleanStr(analysis.model || analysis.estimatedModel);
  const entered = lkqCleanStr(analysis.entered || enteredQuery);
  if (!model) return false;
  if (searchTier === 4) return true;
  if (model.toLowerCase() === entered.toLowerCase() && searchTier < 4) return false;
  return /[a-z]+\d|\d+[a-z]/i.test(model) || /\d{2,}/.test(model);
}

function lkqExtractYear(text) {
  const s = lkqCleanStr(text);
  if (!s) return null;
  const m = s.match(/\b(19|20)\d{2}\b/);
  if (m) return Number(m[0]);
  const d = s.match(/\b(19|20)\d0s\b/i);
  if (d) {
    const decade = Number(String(d[0]).slice(0, 4));
    if (/mid/i.test(s)) return decade + 5;
    if (/late/i.test(s)) return decade + 8;
    return decade;
  }
  return null;
}

function lkqExtractAgeYears(text) {
  const s = lkqCleanStr(text).toLowerCase();
  if (!s) return null;
  const m = s.match(/approximately\s+(\d+)/) || s.match(/\b(\d+)\s+years?\s+old\b/);
  if (!m) return null;
  return Number(m[1]);
}

function lkqProductionRange(fast) {
  const nowYear = new Date().getFullYear();
  const rd = fast?.releaseDate || {};
  const availability = lkqCleanStr(fast?.availability).toLowerCase();
  const discText = lkqCleanStr(rd.discontinuation);

  let introducedYear = null;
  if (typeof rd.ageNumeric === "number" && Number.isFinite(rd.ageNumeric)) {
    introducedYear = Math.max(1900, nowYear - Math.max(0, Math.round(rd.ageNumeric)));
  }
  if (!introducedYear) {
    const ageFromText = lkqExtractAgeYears(rd.estimatedAge);
    if (Number.isFinite(ageFromText)) introducedYear = Math.max(1900, nowYear - ageFromText);
  }
  if (!introducedYear) introducedYear = lkqExtractYear(rd.estimatedAge);
  if (!introducedYear) introducedYear = lkqExtractYear(rd.productionEra);

  let discontinuedYear = lkqExtractYear(discText);
  const activeSignals = [
    "currently available",
    "in production",
    "available new from manufacturer",
    "major retailers"
  ];
  const isActive = activeSignals.some((sig) => availability.includes(sig));

  if (!introducedYear && discontinuedYear) return `${discontinuedYear} - ${discontinuedYear}`;
  if (!introducedYear && !discontinuedYear) return lkqCleanStr(rd.productionEra) || "Unknown";
  if (isActive) return `${introducedYear} - Present`;
  if (discontinuedYear) return `${introducedYear} - ${discontinuedYear}`;
  return `${introducedYear} - Present`;
}

function lkqServiceLife(category, detailServiceLife) {
  const explicit = lkqCleanStr(detailServiceLife);
  if (explicit) return explicit;
  const key = lkqCleanStr(category).toLowerCase();
  return LKQ_SERVICE_LIFE_BY_CATEGORY[key] || LKQ_SERVICE_LIFE_BY_CATEGORY.general;
}

function lkqBuildAgeText() {
  if (lkqInlineState.serialAgeOverride) return lkqInlineState.serialAgeOverride;
  if (!lkqInlineState.isSpecificModel) return "Provide a model number for exact age";
  const rd = lkqInlineState.fast?.releaseDate || {};
  const est = lkqCleanStr(rd.estimatedAge);
  if (est) return est;
  if (typeof rd.ageNumeric === "number" && Number.isFinite(rd.ageNumeric)) {
    return `Approximately ${Math.max(0, Math.round(rd.ageNumeric))} years old.`;
  }
  return "Age estimate unavailable";
}

function lkqBuildRetailerLinks(retailerText, modelText) {
  return lkqBuildRetailerLinksWithMeta(retailerText, modelText, {});
}

function lkqBuildRetailerLinksWithMeta(retailerText, modelText, meta) {
  const suppressedMessage = getRetailerSuppressionMessage(meta);
  if (suppressedMessage) return `<span class="retailer-link-muted">${lkqEscapeHtml(suppressedMessage)}</span>`;

  const retailers = lkqCleanStr(retailerText).split(",").map((s) => lkqCleanStr(s)).filter(Boolean).slice(0, 4);
  if (!retailers.length) return "-";
  const q = lkqCleanStr(modelText) || lkqInlineState.query;
  const brandHint = lkqCleanStr(meta?.brand || lkqInlineState.fast?.analysis?.brand);
  const html = retailers.map((name) => {
    const url = resolveRetailerSearchUrl(name, q, brandHint);
    return `<a class="repair-link" href="${lkqEscapeHtml(url)}" target="_blank" rel="noopener noreferrer">${lkqEscapeHtml(name)}</a>`;
  }).join(" ");
  return html || "-";
}

function lkqGetRowValueAnyLabel(rows, labels, key) {
  for (const label of labels) {
    const value = lkqGetRowValue(rows, label, key);
    if (lkqCleanStr(value)) return value;
  }
  return "";
}

function lkqGetRowValue(rows, label, key) {
  const row = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === lkqCleanStr(label).toLowerCase());
  return row ? lkqCleanStr(row[key]) : "";
}

function lkqCollectSpecs(rows, key) {
  const excluded = new Set(["model", "recommended replacement", "price (new)", "price range (new)", "retailers", "availability", "notes"]);
  const out = [];
  rows.forEach((row) => {
    const label = lkqCleanStr(row?.label);
    const value = lkqCleanStr(row?.[key]);
    if (!label || !value || /^n\/?a$/i.test(value) || excluded.has(label.toLowerCase())) return;
    if (out.length < 3) out.push(`${label}: ${value}`);
  });
  if (!out.length) {
    const size = lkqGetRowValue(rows, "Size / Capacity", key);
    if (size) out.push(`Size / Capacity: ${size}`);
  }
  return out.slice(0, 3);
}

function lkqMonthIdx(m) {
  if (!m) return -1;
  const f = LKQ_SN_MONTHS_FULL.indexOf(m);
  if (f !== -1) return f;
  const short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return short.indexOf(m);
}

function lkqContextBrand(modelText) {
  const text = lkqCleanStr(modelText).toLowerCase();
  if (!text) return null;
  const brands = [];
  for (const cat of Object.values(LKQ_SN_DATA)) brands.push(...Object.keys(cat));
  brands.sort((a, b) => b.length - a.length);
  for (const b of brands) { if (text.includes(b.toLowerCase())) return b; }
  return null;
}

function lkqTryDecodeSerial(serial, modelText) {
  const s = lkqCleanStr(serial).replace(/\s+/g, "").toUpperCase();
  if (!s) return { type: "unknown" };
  const hits = [];
  const ctx = lkqContextBrand(modelText);
  if (ctx) {
    for (const cat of Object.values(LKQ_SN_DATA)) {
      if (!cat[ctx]) continue;
      try { const r = cat[ctx].decode(s); if (r && r.year) hits.push({ priority: true, ...r }); } catch (_) {}
      break;
    }
  }
  if (!hits.length) {
    for (const cat of Object.values(LKQ_SN_DATA)) {
      for (const entry of Object.values(cat)) {
        try { const r = entry.decode(s); if (r && r.year) hits.push({ ...r }); } catch (_) {}
      }
    }
  }
  if (!hits.length) return { type: "unknown" };
  hits.sort((a, b) => ((b.priority ? 1 : 0) + (b.month ? 2 : b.week ? 1 : 0)) - ((a.priority ? 1 : 0) + (a.month ? 2 : a.week ? 1 : 0)));
  const best = hits[0];
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  if (best.month) {
    const mIdx = lkqMonthIdx(best.month);
    const diffM = (curYear - best.year) * 12 + (curMonth - (mIdx !== -1 ? mIdx : curMonth));
    const ageYears = Math.max(0, Math.round(diffM / 12 * 10) / 10);
    return { type: "exact", text: `Manufactured ${best.month} ${best.year} - approximately ${ageYears} years old.` };
  }
  if (best.week) {
    const curWeek = Math.ceil((now - new Date(curYear, 0, 1)) / (7 * 24 * 3600 * 1000));
    const diffW = (curYear - best.year) * 52 + (curWeek - best.week);
    const ageYears = Math.max(0, Math.round(diffW / 52 * 10) / 10);
    return { type: "exact", text: `Manufactured Week ${best.week}, ${best.year} - approximately ${ageYears} years old.` };
  }
  return { type: "range", text: `Manufactured in ${best.year} - approximately ${curYear - best.year}-${curYear - best.year + 1} years old.` };
}

function renderLkqInline() {
  const root = lkqEnsureRoot();
  if (!root) return;
  const fast = lkqInlineState.fast || {};
  const detail = lkqInlineState.detail || {};
  const analysis = fast.analysis || {};
  const rows = lkqAsArray(detail.table);
  const mode = lkqCleanStr(detail.tableMode || "standard");
  const productionRange = lkqProductionRange(fast);
  const ageText = lkqBuildAgeText();
  const serviceLife = lkqServiceLife(analysis.category, detail.serviceLife);
  const serialSection = lkqInlineState.isSpecificModel ? `
    <div class="card" style="margin-top:0.8rem;">
      <div class="card-title"><span class="title-number">2</span> Serial Number Decode</div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
        <label for="lkq-inline-serial-input" style="font-size:0.85rem; color:var(--text-mid); font-weight:600;">Have a serial number? Enter it for exact age:</label>
        <input id="lkq-inline-serial-input" type="text" style="flex:1; min-width:180px; padding:0.48rem 0.6rem; border:1px solid var(--border-color); border-radius:8px;">
        <button id="lkq-inline-serial-btn" class="recalc-btn" type="button">Decode</button>
      </div>
      <p id="lkq-inline-serial-result" style="margin-top:0.55rem; font-size:0.82rem; color:#0f766e;"></p>
      <details id="lkq-inline-evidence-wrap" class="hidden" style="margin-top:0.5rem;">
        <summary style="cursor:pointer; font-size:0.82rem; font-weight:600; color:var(--text-mid);">How we determined this</summary>
        <ul id="lkq-inline-evidence-list" style="margin:0.45rem 0 0 1rem; color:var(--text-mid); font-size:0.82rem;"></ul>
      </details>
    </div>
  ` : "";

  let candidates = [];
  if (mode === "tiered") {
    const modelRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "model") || {};
    const priceRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "price range (new)") || {};
    const retailerRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "retailers") || {};
    const brandRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "brand") || {};
    const availabilityRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "availability") || {};
    const discontinuedRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "discontinued") || {};
    const hasBrandField = Object.keys(brandRow).length > 0;
    candidates = [
      { key: "entryLevel", tier: "Budget", model: lkqCleanStr(modelRow.entryLevel) || "-", price: lkqCleanStr(priceRow.entryLevel) || "-", retailers: retailerRow.entryLevel || "", hasBrandField, brand: lkqCleanStr(brandRow.entryLevel), availability: lkqCleanStr(availabilityRow.entryLevel), discontinued: discontinuedRow.entryLevel },
      { key: "midGrade", tier: "LKQ", model: lkqCleanStr(modelRow.midGrade) || "-", price: lkqCleanStr(priceRow.midGrade) || "-", retailers: retailerRow.midGrade || "", hasBrandField, brand: lkqCleanStr(brandRow.midGrade), availability: lkqCleanStr(availabilityRow.midGrade), discontinued: discontinuedRow.midGrade },
      { key: "premium", tier: "Premium Upgrade", model: lkqCleanStr(modelRow.premium) || "-", price: lkqCleanStr(priceRow.premium) || "-", retailers: retailerRow.premium || "", hasBrandField, brand: lkqCleanStr(brandRow.premium), availability: lkqCleanStr(availabilityRow.premium), discontinued: discontinuedRow.premium }
    ];
  } else {
    const modelRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "model") || {};
    const priceRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "price (new)") || {};
    const retailerRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "retailers") || {};
    const availabilityRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "availability") || {};
    const discontinuedRow = rows.find((r) => lkqCleanStr(r?.label).toLowerCase() === "discontinued") || {};
    const hasBrandField = rows.some((r) => ["brand", "manufacturer"].includes(lkqCleanStr(r?.label).toLowerCase()));
    candidates = [
      { key: "brandMatch", tier: "Best Match", model: lkqCleanStr(modelRow.brandMatch) || "-", price: lkqCleanStr(priceRow.brandMatch) || "-", retailers: retailerRow.brandMatch || "", hasBrandField, brand: lkqGetRowValueAnyLabel(rows, ["Brand", "Manufacturer"], "brandMatch"), availability: lkqCleanStr(availabilityRow.brandMatch), discontinued: discontinuedRow.brandMatch },
      { key: "option1", tier: "LKQ", model: lkqCleanStr(modelRow.option1) || "-", price: lkqCleanStr(priceRow.option1) || "-", retailers: retailerRow.option1 || "", hasBrandField, brand: lkqGetRowValueAnyLabel(rows, ["Brand", "Manufacturer"], "option1"), availability: lkqCleanStr(availabilityRow.option1), discontinued: discontinuedRow.option1 },
      { key: "original", tier: "Budget", model: lkqCleanStr(modelRow.original) || "-", price: lkqCleanStr(priceRow.original) || "-", retailers: retailerRow.original || "", hasBrandField, brand: lkqGetRowValueAnyLabel(rows, ["Brand", "Manufacturer"], "original"), availability: lkqCleanStr(availabilityRow.original), discontinued: discontinuedRow.original },
      { key: "option2", tier: "Premium Upgrade", model: lkqCleanStr(modelRow.option2) || "-", price: lkqCleanStr(priceRow.option2) || "-", retailers: retailerRow.option2 || "", hasBrandField, brand: lkqGetRowValueAnyLabel(rows, ["Brand", "Manufacturer"], "option2"), availability: lkqCleanStr(availabilityRow.option2), discontinued: discontinuedRow.option2 }
    ];
  }

  const tableHtml = candidates.map((c) => {
    const specs = lkqCollectSpecs(rows, c.key);
    return `<tr>
      <td>${lkqEscapeHtml(c.model)}</td>
      <td>${lkqEscapeHtml(c.tier)}</td>
      <td>${specs.length ? `<ul style="margin:0; padding-left:1rem;">${specs.map((s) => `<li>${lkqEscapeHtml(s)}</li>`).join("")}</ul>` : "-"}</td>
      <td>${lkqEscapeHtml(c.price)}</td>
      <td>${lkqBuildRetailerLinksWithMeta(c.retailers, c.model, { hasBrandField: c.hasBrandField, brand: c.brand, availability: c.availability, discontinued: c.discontinued })}</td>
    </tr>`;
  }).join("");

  root.innerHTML = `
    <div class="card" style="margin-bottom:0.8rem;">
      <div class="card-title"><span class="title-number">1</span> LKQ Report Summary</div>
      <div class="metrics-strip">
        <div class="metric-card"><span class="metric-label">Production Era</span><span class="metric-value">${lkqEscapeHtml(productionRange)}</span></div>
        <div class="metric-card"><span class="metric-label">Estimated Age</span><span class="metric-value ${lkqInlineState.isSpecificModel ? "" : "metric-sub"}">${lkqEscapeHtml(ageText)}</span></div>
        <div class="metric-card"><span class="metric-label">Service Life</span><span class="metric-value">${lkqEscapeHtml(serviceLife)}</span></div>
        <div class="metric-card"><span class="metric-label">Mode</span><span class="metric-value" style="font-size:0.88rem;">LKQ Only</span></div>
      </div>
    </div>
    ${serialSection}
    <div class="card">
      <div class="card-title"><span class="title-number">3</span> LKQ Replacement Options</div>
      <table class="data-table">
        <thead><tr><th>Item / Model</th><th>Tier</th><th>Key Specs</th><th>Est. Price / ACV</th><th>Retailer Links</th></tr></thead>
        <tbody>${tableHtml || `<tr><td colspan="5">No replacement options available.</td></tr>`}</tbody>
      </table>
      ${lkqCleanStr(detail.tableNote) ? `<div class="table-note" style="display:block; margin-top:0.6rem;"><strong>Note:</strong> ${lkqEscapeHtml(detail.tableNote)}</div>` : ""}
      ${lkqAsArray(detail.whatToConsider).length ? `<div style="margin-top:0.75rem;"><strong style="font-size:0.82rem; color:var(--text-mid);">What to consider</strong><ul style="margin:0.35rem 0 0 1rem; color:var(--text-mid); font-size:0.82rem;">${lkqAsArray(detail.whatToConsider).map((x) => `<li>${lkqEscapeHtml(lkqCleanStr(x))}</li>`).join("")}</ul></div>` : ""}
      <div style="margin-top:0.85rem; text-align:right;">
        <button id="lkq-inline-full-report-btn" class="print-btn" type="button">Generate Full Item Report</button>
      </div>
    </div>
  `;
  root.classList.remove("hidden");

  byId("lkq-inline-full-report-btn")?.addEventListener("click", () => {
    setActiveReportType("full");
    const qInput = byId("query");
    if (qInput) qInput.value = lkqInlineState.query;
    const u = new URL(window.location.href);
    u.searchParams.set("query", lkqInlineState.query);
    window.history.replaceState({}, "", u.toString());
    clearLkqInlineView();
    performSearch();
  });

  byId("lkq-inline-serial-btn")?.addEventListener("click", async () => {
    const serial = lkqCleanStr(byId("lkq-inline-serial-input")?.value);
    const resultEl = byId("lkq-inline-serial-result");
    const wrap = byId("lkq-inline-evidence-wrap");
    const list = byId("lkq-inline-evidence-list");
    if (!serial) {
      if (resultEl) { resultEl.textContent = "Enter a serial number to decode."; resultEl.style.color = "#b91c1c"; }
      return;
    }
    if (resultEl) { resultEl.textContent = "Decoding serial number..."; resultEl.style.color = "#0f766e"; }

    const local = lkqTryDecodeSerial(serial, lkqInlineState.modelLabel);
    if (local.type !== "unknown") {
      lkqInlineState.serialAgeOverride = local.text;
      if (wrap) wrap.classList.add("hidden");
      if (list) list.innerHTML = "";
      renderLkqInline();
      const rs = byId("lkq-inline-serial-result");
      if (rs) rs.textContent = "Serial decoded locally.";
      return;
    }

    try {
      const response = await fetch("/api/age-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${serial} ${lkqInlineState.modelLabel || lkqInlineState.query}`.trim() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || payload?.message || "Serial decode failed.");
      const y = lkqCleanStr(payload?.estimatedYear);
      const r = lkqCleanStr(payload?.yearRange);
      lkqInlineState.serialAgeOverride = r || y || "Exact age unavailable";
      renderLkqInline();
      const rs = byId("lkq-inline-serial-result");
      if (rs) rs.textContent = "Serial decoded using smart lookup.";
      const ev = lkqAsArray(payload?.evidence).filter((e) => e && (lkqCleanStr(e.detail) || lkqCleanStr(e.source)));
      const w2 = byId("lkq-inline-evidence-wrap");
      const l2 = byId("lkq-inline-evidence-list");
      if (ev.length && w2 && l2) {
        l2.innerHTML = ev.map((e) => `<li><strong>${lkqEscapeHtml(lkqCleanStr(e.source) || "Evidence")}</strong>: ${lkqEscapeHtml(lkqCleanStr(e.detail))}</li>`).join("");
        w2.classList.remove("hidden");
      }
    } catch (err) {
      if (resultEl) { resultEl.textContent = err?.message || "Serial decode failed."; resultEl.style.color = "#b91c1c"; }
    }
  });
}

async function performLkqInlineSearch() {
  const qInput = byId("query");
  const query = lkqCleanStr(qInput?.value);
  if (!query) return;

  setActiveReportType("lkq");
  lkqModeActive = true;
  lkqInlineState = {
    query,
    fast: null,
    detail: null,
    modelLabel: "",
    isSpecificModel: false,
    serialAgeOverride: ""
  };

  lkqToggleFullReportChrome(false);
  const root = lkqEnsureRoot();
  if (!root) return;
  root.classList.remove("hidden");
  root.innerHTML = `<div class="card"><div class="section-spinner">Loading LKQ report...</div></div>`;

  const results = byId("results");
  if (results) {
    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  try {
    const [fastRes, detailRes] = await Promise.all([
      fetch(`/api/search?mode=research-fast&query=${encodeURIComponent(query)}`),
      fetch(`/api/search?mode=research-detail&query=${encodeURIComponent(query)}`)
    ]);
    const fast = await fastRes.json().catch(() => ({}));
    const detail = await detailRes.json().catch(() => ({}));
    if (!fastRes.ok) throw new Error(lkqCleanStr(fast?.error) || "Fast report request failed.");
    if (!detailRes.ok) throw new Error(lkqCleanStr(detail?.error) || "Detail report request failed.");

    lkqInlineState.fast = {
      searchTier: Number(fast?.searchTier || 0),
      availability: lkqCleanStr(fast?.availability),
      analysis: {
        model: lkqCleanStr(fast?.analysis?.model || fast?.analysis?.estimatedModel),
        entered: lkqCleanStr(fast?.analysis?.entered),
        category: lkqCleanStr(fast?.analysis?.category),
        specs: lkqAsArray(fast?.analysis?.topSpecs)
      },
      releaseDate: {
        productionEra: lkqCleanStr(fast?.releaseDate?.productionEra),
        estimatedAge: lkqCleanStr(fast?.releaseDate?.estimatedAge),
        ageNumeric: typeof fast?.releaseDate?.ageNumeric === "number" ? fast.releaseDate.ageNumeric : null,
        discontinuation: lkqCleanStr(fast?.releaseDate?.discontinuation)
      }
    };
    lkqInlineState.detail = {
      table: lkqAsArray(detail?.table),
      tableMode: lkqCleanStr(detail?.tableMode || "standard"),
      serviceLife: lkqCleanStr(detail?.serviceLife),
      whatToConsider: lkqAsArray(detail?.whatToConsider),
      tableNote: lkqCleanStr(detail?.tableNote)
    };
    lkqInlineState.modelLabel = lkqInlineState.fast.analysis.model;
    lkqInlineState.isSpecificModel = lkqModelSpecific(fast, query);

    renderLkqInline();
  } catch (err) {
    root.innerHTML = `<div class="card"><p style="color:#b91c1c; font-size:0.85rem;">${lkqEscapeHtml(err?.message || "Could not generate LKQ report.")}</p></div>`;
  }
}

// ── ACV calculation ──────────────────────────────────────────────────────────

function fmtDollars(n) {
  return formatUSD(n);
}

function formatUSD(value) {
  if (value === null || value === undefined || value === "" || value === "N/A" || value === "—") {
    return "Not available";
  }
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "Not available";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

const EXCHANGE_RATES = {
  "EUR": 1.08, "GBP": 1.27, "JPY": 0.0067, "CAD": 0.74, "AUD": 0.65,
  "€": 1.08, "£": 1.27, "¥": 0.0067, "C$": 0.74, "A$": 0.65
};

function convertToUSD(val) {
  if (typeof val === "number") return val;
  if (!val || typeof val !== "string" || val === "N/A" || val === "—") return null;
  
  const clean = val.trim().toUpperCase();
  let rate = 1.0;
  for (const [symbol, r] of Object.entries(EXCHANGE_RATES)) {
    if (clean.includes(symbol)) {
      rate = r;
      break;
    }
  }

  const match = val.match(/[0-9,.]+/);
  if (!match) return null;
  const num = parseFloat(match[0].replace(/,/g, ""));
  return isNaN(num) ? null : num * rate;
}

function standardizePrice(val) {
  if (!val || val === "N/A" || val === "—") return "Not available";
  
  // Handle ranges
  if (val.includes("–") || (val.includes("-") && !val.startsWith("-"))) {
    const parts = val.split(/[–-]/);
    if (parts.length === 2) {
      const v1 = convertToUSD(parts[0].trim());
      const v2 = convertToUSD(parts[1].trim());
      if (v1 !== null && v2 !== null) {
        return `${formatUSD(v1)} – ${formatUSD(v2)}`;
      }
    }
  }

  const numeric = convertToUSD(val);
  return numeric !== null ? formatUSD(numeric) : "Not available";
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

const TAB_IDS = ["tab-overview", "tab-replacements", "tab-diagnostics"];

function renderReportSectionTabs() {
  const tabs = [
    { id: "tab-overview", label: "Overview", key: "overview" },
    { id: "tab-replacements", label: "Replacement Options", key: "replacements" },
    { id: "tab-diagnostics", label: "Diagnostics & Repair", key: "diagnostics" }
  ];

  const buildHtml = () => {
    return `
      <div class="tab-bar no-print" role="tablist" aria-label="Report sections">
        ${tabs.map(t => {
          const isVisible = t.key === 'overview' || selectedSections[t.key];
          if (!isVisible) return '';
          return `
            <button class="tab-btn ${activeTab === t.id ? 'active' : ''}" 
                    role="tab" 
                    data-tab-target="${t.id}"
                    aria-selected="${activeTab === t.id ? 'true' : 'false'}" 
                    aria-controls="${t.id.replace('tab-', 'panel-')}">${t.label}</button>
          `;
        }).join('')}
      </div>
    `;
  };

  const html = buildHtml();
  const top = byId("report-tabs-top");
  const bottom = byId("report-tabs-bottom");
  if (top) top.innerHTML = html;
  if (bottom) bottom.innerHTML = html;

  // Wire up listeners for all instances
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.tabTarget;
      if (target) setActiveTab(target);
    };
    btn.onkeydown = (e) => {
      const visible = tabs.filter(t => t.key === 'overview' || selectedSections[t.key]).map(t => t.id);
      const id = btn.dataset.tabTarget;
      const idx = visible.indexOf(id);
      if (idx === -1) return;
      
      let nextId = null;
      if (e.key === "ArrowRight") nextId = visible[(idx + 1) % visible.length];
      if (e.key === "ArrowLeft")  nextId = visible[(idx - 1 + visible.length) % visible.length];
      if (e.key === "Home") nextId = visible[0];
      if (e.key === "End")  nextId = visible[visible.length - 1];
      
      if (nextId) {
        e.preventDefault();
        setActiveTab(nextId);
        // Find the button in the same container to focus
        const container = btn.closest('.report-tabs-container');
        if (container) {
          const nextBtn = container.querySelector(`[data-tab-target="${nextId}"]`);
          if (nextBtn) nextBtn.focus();
        }
      }
    };
  });
}

function setActiveTab(tabId) {
  if (!TAB_IDS.includes(tabId)) return;
  activeTab = tabId;

  // Toggle panels
  TAB_IDS.forEach((id) => {
    const panel = byId(id.replace("tab-", "panel-"));
    if (panel) panel.classList.toggle("active", id === tabId);
  });

  // Re-render both tab bars to sync active state
  renderReportSectionTabs();
  
  // Scroll to results top when switching (standard behavior)
  const results = byId("results");
  if (results) results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initTabs() {
  // Initially tabs are rendered when search completes, 
  // but we can ensure they are ready.
  renderReportSectionTabs();
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

function getFallbackRetailerNames(category) {
  const cat = (category || "general").toLowerCase();
  if (cat === "tv" || cat === "computer" || cat === "laptop" || cat === "electronics")
    return ["Best Buy", "Walmart", "Target"];
  if (cat === "hvac" || cat === "water_heater")
    return ["Home Depot", "Lowe's", "AJ Madison"];
  if (["washer","dryer","dishwasher","refrigerator","range"].includes(cat))
    return ["Home Depot", "Lowe's", "AJ Madison", "Best Buy"];
  if (cat === "small_appliance")
    return ["Walmart", "Target", "Best Buy"];
  return ["Best Buy", "Home Depot", "Walmart"];
}

function buildModelLink(modelText) {
  const text = (modelText || "").trim();
  if (!text || text === "N/A") return escapeHtml(text || "N/A");
  const url = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  return `<a class="model-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
}

function buildGoogleSearchLink(termText) {
  const text = (termText || "").trim();
  if (!text || text === "N/A") return escapeHtml(text || "N/A");
  const q = encodeURIComponent(text).replace(/%20/g, "+");
  const url = `https://www.google.com/search?q=${q}`;
  return `<a class="model-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
}

function getColumnMetaValue(metaMap, key, field) {
  return metaMap?.[key]?.[field];
}

function buildReplacementColumnMeta(allRows, keys) {
  const out = {};
  keys.forEach((k) => {
    out[k] = {};
  });
  allRows.forEach((row) => {
    const label = String(row?.label || "").trim().toLowerCase();
    keys.forEach((key) => {
      if (label === "brand" || label === "manufacturer") {
        out[key].hasBrandField = true;
        out[key].brand = row?.[key];
      }
      if (label === "availability") {
        out[key].availability = row?.[key];
      }
      if (label === "discontinued") {
        out[key].discontinued = row?.[key];
      }
    });
  });
  return out;
}

function buildRetailerLinks(retailerCsv, searchQuery, meta = null) {
  const suppressedMessage = getRetailerSuppressionMessage(meta || {});
  if (suppressedMessage) {
    return renderRetailerSuppressionMessage(suppressedMessage);
  }

  const filter = getRetailerFilter(currentCategory);

  // Parse API-provided names; fallback to category defaults when empty/N/A
  let names = (retailerCsv && retailerCsv !== "N/A")
    ? retailerCsv.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  let filtered = names.filter((n) => !filter || filter.has(n));

  // If still nothing, use category-appropriate fallbacks
  if (!filtered.length) filtered = getFallbackRetailerNames(currentCategory);

  const links = filtered
    .map((name) => {
      const url = resolveRetailerSearchUrl(name, searchQuery);
      if (!url) return null;
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`;
    })
    .filter(Boolean);

  // Absolute last-resort: Google search link
  if (!links.length) {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    links.push(`<a href="${escapeHtml(googleUrl)}" target="_blank" rel="noopener noreferrer">Search Online</a>`);
  }

  return `<span class="retailer-links">${links.join("")}</span>`;
}

function normalizeItemTypeKey(value) {
  const s = String(value || "").toLowerCase();
  if (!s) return "general";
  if (s.includes("tv") || s.includes("television")) return "tv";
  if (s.includes("refrigerator") || s.includes("fridge")) return "refrigerator";
  if (s.includes("washer") || s.includes("washing machine")) return "washer";
  if (s.includes("dryer")) return "dryer";
  if (s.includes("dishwasher")) return "dishwasher";
  if (s.includes("range") || s.includes("oven") || s.includes("stove") || s.includes("cooktop")) return "range";
  if (s.includes("water heater")) return "water_heater";
  if (s.includes("hvac") || s.includes("air conditioner") || s.includes("furnace") || s.includes("heat pump")) return "hvac";
  if (s.includes("iphone") || s.includes("galaxy") || s.includes("pixel")) return "phone";
  if (s.includes("cell phone") || s.includes("mobile phone")) return "phone";
  if (s.includes("laptop")) return "laptop";
  if (s.includes("computer") || s.includes("desktop")) return "computer";
  if (s.includes("phone") || s.includes("smartphone") || s.includes("mobile")) return "phone";
  return "general";
}

function sameItemType(a, b) {
  return normalizeItemTypeKey(a) === normalizeItemTypeKey(b);
}

function parseFirstNumber(value) {
  const m = String(value || "").replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/);
  return m ? Number(m[1]) : null;
}

function inferTierFromData(brand, model, summary, description, price) {
  const text = [brand, model, summary, description].map((v) => String(v || "")).join(" ").toLowerCase();
  if (/\b(luxury|ultra\s*premium|signature|professional|elite|flagship)\b/.test(text)) return "Luxury";
  if (/\b(premium|pro|plus|oled|mini[-\s]?led|qled|studio|high[-\s]?end)\b/.test(text)) return "Premium";
  if (/\b(budget|basic|value|entry)\b/.test(text)) return "Budget";
  const n = convertToUSD(price);
  if (Number.isFinite(n)) {
    if (n >= 3000) return "Luxury";
    if (n >= 1200) return "Premium";
    if (n <= 400) return "Budget";
  }
  return "Average";
}

const SPEC_TEMPLATE_BY_TYPE = {
  tv: [
    { label: "Display Type", keys: ["display type", "panel type", "screen type"] },
    { label: "Resolution", keys: ["resolution"] },
    { label: "Screen Size", keys: ["screen size", "size"] },
    { label: "Refresh Rate", keys: ["refresh rate"] },
    { label: "HDR Format", keys: ["hdr format", "hdr"] },
    { label: "Smart Platform", keys: ["smart platform", "smart tv", "operating system", "os"] },
    { label: "HDMI Inputs", keys: ["hdmi inputs", "hdmi"] },
    { label: "OLED/QLED Technology", keys: ["oled", "qled", "display technology"] }
  ],
  refrigerator: [
    { label: "Total Capacity", keys: ["total capacity", "capacity"] },
    { label: "Configuration", keys: ["configuration", "style"] },
    { label: "Ice Maker", keys: ["ice maker"] },
    { label: "Water Dispenser", keys: ["water dispenser"] },
    { label: "Depth Type", keys: ["depth type", "counter depth", "standard depth"] },
    { label: "Number of Doors", keys: ["number of doors", "doors"] },
    { label: "Compressor Type", keys: ["compressor type", "compressor"] }
  ],
  washer: [
    { label: "Capacity", keys: ["capacity"] },
    { label: "Load Type", keys: ["load type", "front load", "top load"] },
    { label: "Wash Cycles", keys: ["wash cycles", "cycles"] },
    { label: "Steam", keys: ["steam"] },
    { label: "Smart Features", keys: ["smart features", "wifi", "app"] }
  ],
  water_heater: [
    { label: "Capacity", keys: ["capacity"] },
    { label: "Fuel Type", keys: ["fuel type", "fuel"] },
    { label: "First Hour Rating", keys: ["first hour rating"] },
    { label: "Energy Factor", keys: ["energy factor", "uef", "efficiency"] },
    { label: "Dimensions", keys: ["dimensions", "dimension"] }
  ],
  dryer: [
    { label: "Capacity", keys: ["capacity"] },
    { label: "Fuel Type", keys: ["fuel type", "fuel"] },
    { label: "Dry Cycles", keys: ["dry cycles", "cycles"] },
    { label: "Steam", keys: ["steam"] },
    { label: "Smart Features", keys: ["smart features", "wifi", "app"] }
  ],
  dishwasher: [
    { label: "Capacity", keys: ["capacity", "place settings"] },
    { label: "Wash Cycles", keys: ["wash cycles", "cycles"] },
    { label: "Sound Level", keys: ["sound level", "noise"] },
    { label: "Drying System", keys: ["drying system", "dry"] },
    { label: "Smart Features", keys: ["smart features", "wifi", "app"] }
  ],
  range: [
    { label: "Fuel Type", keys: ["fuel type", "fuel"] },
    { label: "Configuration", keys: ["configuration", "style"] },
    { label: "Oven Capacity", keys: ["oven capacity", "capacity"] },
    { label: "Cooktop Elements/Burners", keys: ["burners", "elements", "cooktop"] },
    { label: "Convection", keys: ["convection"] }
  ],
  hvac: [
    { label: "Type", keys: ["type", "system type"] },
    { label: "Capacity", keys: ["capacity", "tonnage", "tons"] },
    { label: "Efficiency Rating", keys: ["seer", "seer2", "afue", "hspf", "efficiency"] },
    { label: "Compressor Type", keys: ["compressor type", "compressor"] },
    { label: "Smart Features", keys: ["smart features", "wifi", "app"] }
  ],
  laptop: [
    { label: "Screen Size", keys: ["display size", "screen size"] },
    { label: "CPU", keys: ["processor", "cpu"] },
    { label: "RAM", keys: ["memory", "ram"] },
    { label: "Storage", keys: ["storage", "ssd"] },
    { label: "GPU", keys: ["graphics", "gpu"] },
    { label: "OS", keys: ["operating system", "os"] }
  ],
  computer: [
    { label: "CPU", keys: ["processor", "cpu"] },
    { label: "RAM", keys: ["memory", "ram"] },
    { label: "Storage", keys: ["storage", "ssd"] },
    { label: "GPU", keys: ["graphics", "gpu"] },
    { label: "OS", keys: ["operating system", "os"] },
    { label: "Screen Size", keys: ["screen size", "display size"] }
  ],
  phone: [
    { label: "Display", keys: ["display", "display type", "display size", "screen size"] },
    { label: "Chipset", keys: ["chipset", "processor", "soc", "cpu"] },
    { label: "Storage", keys: ["storage"] },
    { label: "RAM", keys: ["ram", "memory"] },
    { label: "Camera", keys: ["camera"] },
    { label: "Connectivity", keys: ["connectivity", "5g", "wifi", "bluetooth"] },
    { label: "OS", keys: ["operating system", "os"] },
    { label: "Battery", keys: ["battery"] }
  ],
  general: [
    { label: "Capacity/Size", keys: ["capacity", "size"] },
    { label: "Configuration", keys: ["configuration", "type", "style"] },
    { label: "Core Feature 1", keys: ["feature", "spec"] },
    { label: "Core Feature 2", keys: ["feature", "spec"] },
    { label: "Energy/Performance", keys: ["energy", "efficiency", "performance"] }
  ]
};

function inferItemTypeFromAttrs(obj) {
  const text = [
    obj && obj.brand,
    obj && obj.model,
    obj && obj.summary,
    obj && obj.description
  ].map((v) => String(v || "").toLowerCase()).join(" ");

  const specs = (obj && obj.keySpecs) || {};
  const hasPhoneSignals = /iphone|galaxy|pixel|phone|smartphone/.test(text)
    || specs.camera || specs.display || specs.connectivity || /5g/.test(text);
  const hasComputerSignals = specs.cpu || specs.gpu || specs.ram || /cpu|gpu|desktop|laptop|computer/.test(text);

  if (hasPhoneSignals && !hasComputerSignals) return "phone";
  if (hasComputerSignals && !hasPhoneSignals) return "computer";
  if (hasPhoneSignals && hasComputerSignals) return /iphone|galaxy|pixel|phone|smartphone/.test(text) ? "phone" : "computer";
  return "general";
}

function findRowContaining(table, needle) {
  if (!Array.isArray(table)) return null;
  const n = String(needle || "").toLowerCase();
  return table.find((r) => String(r?.label || "").toLowerCase().includes(n)) || null;
}

function getRowValueByColumn(table, needle, colKey) {
  const row = findRowContaining(table, needle);
  if (!row) return "N/A";
  return safeText(colKey ? row[colKey] : (row.original || row.value || row.default), "N/A");
}

function normalizeSpecKey(label) {
  const raw = String(label || "").toLowerCase().trim();
  if (!raw) return "";
  const direct = {
    "display": "display",
    "display type": "display",
    "display size": "display",
    "screen size": "screenSize",
    "chipset": "chipset",
    "processor": "cpu",
    "cpu": "cpu",
    "gpu": "gpu",
    "graphics": "gpu",
    "memory": "ram",
    "ram": "ram",
    "storage": "storage",
    "camera": "camera",
    "connectivity": "connectivity",
    "operating system": "os",
    "os": "os",
    "battery": "battery"
  };
  if (direct[raw]) return direct[raw];
  if (raw.includes("display")) return "display";
  if (raw.includes("screen")) return "screenSize";
  if (raw.includes("processor") || raw.includes("chipset") || raw.includes("cpu")) return raw.includes("chipset") ? "chipset" : "cpu";
  if (raw.includes("gpu") || raw.includes("graphics")) return "gpu";
  if (raw.includes("ram") || raw.includes("memory")) return "ram";
  if (raw.includes("storage")) return "storage";
  if (raw.includes("camera")) return "camera";
  if (raw.includes("connect") || raw.includes("5g") || raw.includes("wifi")) return "connectivity";
  if (raw === "os" || raw.includes("operating system")) return "os";
  if (raw.includes("battery")) return "battery";
  return raw.replace(/[^a-z0-9]+/g, "_");
}

function collectKeySpecsForSide(fast, detailTable, colKey) {
  const specs = {};
  const analysis = fast?.analysis || {};
  const topSpecs = Array.isArray(analysis.topSpecs) ? analysis.topSpecs : [];
  topSpecs.forEach((spec) => {
    const key = normalizeSpecKey(spec?.label);
    if (!key) return;
    specs[key] = safeText(spec?.value, "N/A");
  });

  if (Array.isArray(detailTable)) {
    detailTable.forEach((row) => {
      const label = String(row?.label || "");
      const key = normalizeSpecKey(label);
      if (!key) return;
      const val = colKey ? row[colKey] : (row.original || row.value || row.default);
      const safe = safeText(val, "N/A");
      if (safe !== "N/A") specs[key] = safe;
    });
  }
  return specs;
}

function buildFallbackSpecTemplate(typeKey) {
  const base = getSpecTemplateForType(typeKey);
  return base.map((s) => ({ key: normalizeSpecKey(s.label), label: s.label, major: true }));
}

function getComparisonFeatureList(typeKey) {
  if (typeKey === "phone") {
    return [
      { key: "display", label: "Display", major: true },
      { key: "chipset", label: "Chipset", major: true },
      { key: "storage", label: "Storage", major: true },
      { key: "ram", label: "RAM", major: true },
      { key: "camera", label: "Camera", major: true },
      { key: "connectivity", label: "Connectivity", major: true },
      { key: "os", label: "OS", major: false },
      { key: "battery", label: "Battery", major: false }
    ];
  }
  if (typeKey === "computer" || typeKey === "laptop") {
    return [
      { key: "cpu", label: "CPU", major: true },
      { key: "ram", label: "RAM", major: true },
      { key: "storage", label: "Storage", major: true },
      { key: "gpu", label: "GPU", major: true },
      { key: "os", label: "OS", major: true },
      { key: "screenSize", label: "Screen Size", major: false }
    ];
  }
  return buildFallbackSpecTemplate(typeKey);
}

function normalizeForComparison(params) {
  const fast = params?.fast || {};
  const detail = params?.detail || {};
  const analysis = fast.analysis || {};
  const detailTable = Array.isArray(detail.table) ? detail.table : [];
  const colKey = params?.colKey || "";

  const model = safeText(
    colKey
      ? getRowValueByColumn(detailTable, "model", colKey)
      : (analysis.estimatedModel || getRowValueByColumn(detailTable, "model")),
    "N/A"
  );
  const brand = safeText(
    colKey
      ? getRowValueByColumn(detailTable, "brand", colKey)
      : (getRowValueByColumn(detailTable, "brand") !== "N/A" ? getRowValueByColumn(detailTable, "brand") : (analysis.quickSummary || "").split(" ")[0]),
    "N/A"
  );

  const keySpecs = collectKeySpecsForSide(fast, detailTable, colKey);
  const summary = analysis.quickSummary || "";
  const description = analysis.itemDescription || "";

  let rawType = "";
  if (params?.isOriginal) {
    rawType = analysis.itemType || analysis.category || "";
  } else if (colKey) {
    rawType = getRowValueByColumn(detailTable, "item type", colKey);
    if (rawType === "N/A") rawType = analysis.itemType || analysis.category || "";
  } else {
    rawType = analysis.itemType || analysis.category || getRowValueByColumn(detailTable, "item type");
  }

  let itemType = normalizeItemTypeKey(rawType);
  if (itemType === "general" && params?.isOriginal) {
    const inferred = inferItemTypeFromAttrs({ brand, model, summary, description, keySpecs });
    if (inferred !== "general") {
      itemType = inferred;
      console.warn("[compare] Inferred original itemType from original attributes:", inferred);
    }
  }

  const releaseYear = (() => {
    const r = fast.releaseDate || {};
    const text = `${r.productionEra || ""} ${r.estimatedAge || ""}`;
    const m = text.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : "N/A";
  })();

  const marketValue = safeText(
    colKey
      ? (getRowValueByColumn(detailTable, "market", colKey) !== "N/A"
          ? getRowValueByColumn(detailTable, "market", colKey)
          : getRowValueByColumn(detailTable, "current", colKey))
      : (analysis.currentMarketPrice || getRowValueByColumn(detailTable, "market") || getRowValueByColumn(detailTable, "current")),
    "N/A"
  );
  const msrp = safeText(
    colKey
      ? (getRowValueByColumn(detailTable, "msrp", colKey) !== "N/A"
          ? getRowValueByColumn(detailTable, "msrp", colKey)
          : getRowValueByColumn(detailTable, "retail", colKey))
      : (analysis.launchMsrp || getRowValueByColumn(detailTable, "msrp") || getRowValueByColumn(detailTable, "retail")),
    "N/A"
  );
  const replacementCost = safeText(
    colKey ? getRowValueByColumn(detailTable, "replacement", colKey) : getRowValueByColumn(detailTable, "replacement"),
    marketValue
  );

  return {
    itemType,
    brand,
    model,
    tier: inferTierFromData(brand, model, summary, description, marketValue || msrp),
    releaseYear,
    keySpecs,
    value: {
      msrp,
      marketValue,
      replacementCost
    }
  };
}

const LKQ_PRIORITY_WEIGHTS = {
  tv: { "Display Type": 3.5, "Resolution": 3.5, "Screen Size": 2.5, "Refresh Rate": 2, "HDR Format": 1.5, "Smart Platform": 1, "HDMI Inputs": 1, "OLED/QLED Technology": 2.5 },
  refrigerator: { "Total Capacity": 3.5, "Configuration": 3.5, "Ice Maker": 1.5, "Water Dispenser": 1.5, "Depth Type": 2, "Number of Doors": 2, "Compressor Type": 1.5 }
};

function getSpecTemplateForType(typeKey) {
  return SPEC_TEMPLATE_BY_TYPE[typeKey] || SPEC_TEMPLATE_BY_TYPE.general;
}

function getSpecWeight(typeKey, label) {
  const map = LKQ_PRIORITY_WEIGHTS[typeKey];
  if (map && Number.isFinite(map[label])) return map[label];
  return 1.5;
}

function getRowByKeys(table, keys) {
  if (!Array.isArray(table) || !Array.isArray(keys) || !keys.length) return null;
  return table.find((r) => {
    const lbl = String(r && r.label ? r.label : "").toLowerCase();
    return keys.some((k) => lbl.includes(String(k).toLowerCase()));
  }) || null;
}

function getDetailValueForKeys(table, keys) {
  const row = getRowByKeys(table, keys);
  if (!row) return "N/A";
  const v = row.original || row.value || row.default || "";
  return safeText(v, "N/A");
}

function getOrigColValueForKeys(table, keys, colKey) {
  const row = getRowByKeys(table, keys);
  if (!row) return "N/A";
  return safeText(row[colKey], "N/A");
}

function scoreSpecMatch(origValue, candidateValue, weight) {
  const o = String(origValue || "").trim().toLowerCase();
  const c = String(candidateValue || "").trim().toLowerCase();
  if (!o || o === "n/a") return { earned: 0, possible: weight };
  if (!c || c === "n/a") return { earned: 0, possible: weight };

  const on = parseFirstNumber(o);
  const cn = parseFirstNumber(c);
  if (Number.isFinite(on) && Number.isFinite(cn)) {
    const diff = Math.abs(on - cn) / Math.max(on, cn);
    if (diff <= 0.05) return { earned: weight, possible: weight };
    if (diff <= 0.12) return { earned: weight * 0.75, possible: weight };
    if (diff <= 0.20) return { earned: weight * 0.45, possible: weight };
    return { earned: 0, possible: weight };
  }

  if (o === c) return { earned: weight, possible: weight };
  if (o.includes(c) || c.includes(o)) return { earned: weight * 0.75, possible: weight };
  const ot = o.split(/[^a-z0-9]+/).filter(Boolean);
  const ct = new Set(c.split(/[^a-z0-9]+/).filter(Boolean));
  const overlap = ot.filter((t) => ct.has(t)).length;
  if (!ot.length) return { earned: 0, possible: weight };
  const ratio = overlap / ot.length;
  if (ratio >= 0.6) return { earned: weight * 0.6, possible: weight };
  if (ratio >= 0.3) return { earned: weight * 0.3, possible: weight };
  return { earned: 0, possible: weight };
}

function deriveLkqGrade(origCtx, candCtx, specRows, typeKey) {
  if (!origCtx || !candCtx) return "LKQ";
  if (!sameItemType(origCtx.itemType, candCtx.itemType)) return "BELOW LKQ";

  let earned = 0;
  let possible = 0;
  specRows.forEach((r) => {
    const w = getSpecWeight(typeKey, r.label);
    const result = scoreSpecMatch(r.original, r.candidate, w);
    earned += result.earned;
    possible += result.possible;
  });

  const oPrice = parseFirstNumber(origCtx?.value?.marketValue);
  const cPrice = parseFirstNumber(candCtx?.value?.marketValue);
  if (Number.isFinite(oPrice) && Number.isFinite(cPrice) && oPrice > 0) {
    const ratio = cPrice / oPrice;
    if (ratio >= 1.2) earned += 0.8;
    if (ratio <= 0.8) earned -= 0.8;
    possible += 0.8;
  }

  if (possible <= 0) return "LKQ";
  const pct = earned / possible;
  if (pct >= 0.9) return "WELL ABOVE LKQ";
  if (pct >= 0.6) return "LKQ";
  return "BELOW LKQ";
}

function lkqGradeHtml(grade) {
  if (grade === "WELL ABOVE LKQ") return '<span class="lkq-verdict" style="color:#1f6feb;font-weight:700">WELL ABOVE LKQ</span>';
  if (grade === "LKQ") return '<span class="lkq-verdict" style="color:#1a7f37;font-weight:700">LKQ</span>';
  return '<span class="lkq-verdict" style="color:#cf222e;font-weight:700">BELOW LKQ</span>';
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

function getFieldRefUrl(type, category) {
  const t = (type || "").toLowerCase();
  const c = (category || "").toLowerCase();
  
  if (t.includes("refrigerator") || c.includes("refrigerator")) return "field-reference.html?item=refrigerator";
  if (t.includes("dishwasher") || c.includes("dishwasher")) return "field-reference.html?item=dishwasher";
  if (t.includes("range") || c.includes("range") || t.includes("oven") || c.includes("oven")) {
    if (t.includes("gas") || c.includes("gas")) return "field-reference.html?item=gas-range";
    return "field-reference.html?item=electric-range";
  }
  if (t.includes("water heater") || c.includes("water heater")) return "field-reference.html?item=water-heater";
  if (t.includes("microwave") || c.includes("microwave")) return "field-reference.html?item=microwave";
  if (t.includes("hot tub") || c.includes("hot tub") || t.includes("spa") || c.includes("spa")) return "field-reference.html?item=hot-tub";
  if (t.includes("well pump") || c.includes("well pump")) return "field-reference.html?item=well-pump";
  if (t.includes("pool heater") || c.includes("pool heater")) return "field-reference.html?item=pool-heater";
  if (t.includes("generator") || c.includes("generator")) return "field-reference.html?item=generator";
  if (t.includes("panel") || c.includes("panel") || t.includes("breaker") || c.includes("breaker")) return "field-reference.html?item=service-panel";
  if (t.includes("wiring") || c.includes("wiring")) return "field-reference.html?item=home-wiring";
  
  return null;
}

function renderFast(data) {
  if (!data || typeof data !== "object") return;
  fastData = data;

  const analysis = data.analysis || {};
  const releaseDate = data.releaseDate || {};
  const searchTier = Number(data.searchTier) || 1;
  currentCategory = analysis.category || "general";

  // Technical Reference Button
  const refUrl = getFieldRefUrl(analysis.itemType, analysis.category);
  const refBtnWrap = byId("r-field-ref-wrap");
  if (refBtnWrap) {
    if (refUrl) {
      refBtnWrap.innerHTML = `<a href="${refUrl}" class="quick-spec-pill" style="background:var(--accent); color:#000; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem; border:none; margin-top:0.5rem; padding:0.4rem 0.8rem;">
        <span style="font-size:1rem;">&#128295;</span> View Technical Reference
      </a>`;
      refBtnWrap.classList.remove("hidden");
    } else {
      refBtnWrap.classList.add("hidden");
    }
  }

  // Model number hint (shown when full model not provided)
  const modelHint = byId("model-number-hint");
  if (modelHint) {
    const showHint = searchTier < 3 || analysis.modelConfidence === "estimated";
    modelHint.classList.toggle("hidden", !showHint);
  }

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

  // Reveal serial decode widget only for brands supported by the decoder
  const snInputLi   = byId("sn-input-li");
  const snResultLi  = byId("sn-result-li");
  const snInputEl   = byId("sn-input");
  const snSupported = snContextBrand() !== null;
  if (snInputLi)  snInputLi.style.display  = snSupported ? "" : "none";
  if (snResultLi) snResultLi.style.display = "none";
  if (snInputEl)  snInputEl.value          = "";

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

  if (searchTier <= 1) {
    show(cardValuation, false);
  } else if (searchTier === 2) {
    show(cardValuation, false);
  } else {
    show(cardValuation, selectedSections.valuation);
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
    const msrp = analysis.launchMsrpNumeric || convertToUSD(analysis.launchMsrp) || 0;
    const age = releaseDate.ageNumeric || 0;

    setText("r-launch-msrp", standardizePrice(analysis.launchMsrp));
    setText("r-market-price", standardizePrice(analysis.currentMarketPrice));
    const noteEl = byId("r-market-price-note");
    if (noteEl) noteEl.textContent = analysis.currentMarketPriceNote || "";

    if (msrp > 0) {
      acvData = { msrp, age };
      const ageInput = byId("acv-age-input");
      if (ageInput) ageInput.value = String(age);
      setText("m-msrp", standardizePrice(analysis.launchMsrp));
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
    if (selectedSections.variations && variations.length) {
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
  if (results) {
    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  setActiveTab("tab-overview");
}

// ── renderDetail ─────────────────────────────────────────────────────────────

function renderDetail(data) {
  if (!data || typeof data !== "object") return;
  detailData = data;

  const query = (fastData?.analysis?.entered || "").trim();

  // ─ Item Notes card ─
  // Item Notes and Availability are consolidated into LKQ guidance in Replacement Options.

  // ─ Replacement table ─
  if (!selectedSections.replacements) {
    // Hide the table elements when section is off
    const tl = byId("table-loading"); if (tl) tl.classList.add("hidden");
    const te = byId("r-table"); if (te) te.classList.add("hidden");
    const wtc = byId("lkq-evaluator-guidance");
    if (wtc) {
      wtc.innerHTML = "";
      wtc.className = "hidden";
    }
  } else {
  // ─ LKQ Considerations Checklist ─
  const wtcEl = byId("lkq-evaluator-guidance");
  if (wtcEl) {
    const topSpecs = Array.isArray(fastData?.analysis?.topSpecs) ? fastData.analysis.topSpecs : [];
    const typeKey = normalizeItemTypeKey(fastData?.analysis?.itemType || fastData?.analysis?.category || currentCategory);

    const queryText = String(fastData?.analysis?.entered || "").toLowerCase();
    const modelText = String(fastData?.analysis?.estimatedModel || "").toLowerCase();
    const descText = String(fastData?.analysis?.itemDescription || "").toLowerCase();
    const statusText = String(fastData?.analysis?.status || "").toLowerCase();
    const discText = String(fastData?.releaseDate?.discontinuation || "").toLowerCase();
    const availText = String(fastData?.availability || "").toLowerCase();
    const combinedText = [queryText, modelText, descText, statusText, discText, availText].join(" ");

    const unsafePanelTerms = [
      "federal pacific",
      "fpe",
      "zinsco",
      "sylvania zinsco",
      "pushmatic",
      "bulldog pushmatic",
      "unsafe panel",
      "obsolete panel"
    ];
    const statusTerms = ["discontinued", "obsolete", "unsafe", "no longer available", "replacement only"];

    const hasUnsafePanelSignal = unsafePanelTerms.some((term) => combinedText.includes(term));
    const hasObsoleteSignal = statusTerms.some((term) => combinedText.includes(term));
    const isPanelLike = combinedText.includes("panel") || combinedText.includes("load center") || combinedText.includes("breaker");
    const isSafetyDrivenReplacement = Boolean((hasUnsafePanelSignal && isPanelLike) || (hasObsoleteSignal && isPanelLike));
    const lkqFlags = {
      isObsolete: isSafetyDrivenReplacement,
      isSafetyDrivenReplacement,
      replacementMustBeModernCodeCompliant: isSafetyDrivenReplacement
    };

    const getSpecValue = (needleList) => {
      const row = topSpecs.find((s) => {
        const label = String(s?.label || "").toLowerCase();
        return needleList.some((needle) => label.includes(needle));
      });
      return String(row?.value || "").trim();
    };
    const parseAmp = (text) => {
      if (!text) return null;
      const m = String(text).match(/(\d{2,4})\s*a\b/i);
      return m ? Number(m[1]) : null;
    };
    const parseCount = (text) => {
      if (!text) return null;
      const m = String(text).match(/(\d{1,3})/);
      return m ? Number(m[1]) : null;
    };

    const serviceRatingRaw = getSpecValue(["service rating", "amperage", "main rating", "main breaker", "amp"]);
    const spacesRaw = getSpecValue(["spaces", "breaker spaces", "circuit capacity", "circuits", "slots"]);
    const serviceAmp = parseAmp(serviceRatingRaw);
    const existingCircuits = parseCount(spacesRaw);
    const recommendedSpaces = existingCircuits ? Math.max(existingCircuits + 2, Math.ceil(existingCircuits * 1.25)) : null;
    const ampLine = serviceAmp
      ? `Existing panel rating: ${serviceAmp}A -> Replacement must be ${serviceAmp}A or greater.`
      : "Confirm existing service rating (A) before selecting replacement; replacement main rating must be equal or greater.";
    const circuitLine = existingCircuits && recommendedSpaces
      ? `Existing circuits/spaces: ${existingCircuits} -> Select at least ${recommendedSpaces}+ spaces (includes ~20-30% spare capacity).`
      : "Count existing circuits/spaces; select a load center with equal/greater capacity plus ~20-30% spare spaces.";

    const renderChecklistItem = (text, whyText) => (
      `<li style="margin-bottom:0.5rem; display:flex; align-items:flex-start; gap:0.6rem; color:var(--text-dark); font-size:0.87rem;">
        <span style="color:var(--accent); font-size:1.05rem; font-weight:900; line-height:1;">☐</span>
        <span><strong>${escapeHtml(text)}</strong><br><span style="color:var(--text-mid);">Why: ${escapeHtml(whyText)}</span></span>
      </li>`
    );
    const renderBullet = (text) => (
      `<li style="margin-bottom:0.4rem; display:flex; align-items:flex-start; gap:0.6rem; color:var(--text-dark); font-size:0.87rem;">
        <span style="color:var(--accent); font-size:1.05rem; font-weight:900; line-height:1;">•</span>
        <span>${escapeHtml(text)}</span>
      </li>`
    );

    if (lkqFlags.isSafetyDrivenReplacement) {
      const label = "Replacement requirements & rationale";
      const subLabel = "Safety-driven replacement checklist (obsolete/discontinued equipment)";
      const baseline = "This panel line is discontinued and associated with documented safety concerns. Any current-day UL-listed load center from a reputable manufacturer will generally meet or exceed the original panel's quality and safety performance. LKQ selection should focus on correct sizing and capacity rather than matching outdated brand/tier.";
      const mustMatch = [
        renderChecklistItem(
          `Service Rating (Amperage): ${ampLine}`,
          "Prevents undersizing and utility/code conflicts."
        ),
        renderChecklistItem(
          `Circuit Capacity / Spaces: ${circuitLine}`,
          "Avoids overcrowding, tandem misuse, and future capacity limits."
        ),
        renderChecklistItem(
          "Form Factor / Installation Type: Match indoor vs outdoor (NEMA), main breaker vs main lug, and surface vs flush requirements.",
          "Ensures proper fit and correct environmental protection."
        ),
        renderChecklistItem(
          "Code Compliance: Replacement must be UL-listed, support proper grounding/bonding, and comply with current NEC/local code.",
          "Required for safe and valid replacement selection."
        )
      ].join("");
      const shouldMatch = [
        renderBullet("Prefer modern reputable manufacturers (Square D, Eaton, Siemens, GE, etc.); do not attempt unsafe legacy brand equivalence."),
        renderBullet("Prefer features that improve safety and claims outcomes when feasible: AFCI/GFCI compatibility, surge protection readiness, and clear circuit labeling.")
      ].join("");
      const docNote = "Because the original equipment is obsolete/unsafe, LKQ is satisfied by a modern code-compliant replacement that meets or exceeds capacity and rating requirements. Document existing service rating and circuit count to support sizing.";

      wtcEl.className = "wtc-box wtc-general";
      wtcEl.innerHTML = `
        <div class="wtc-label" style="border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.4rem; margin-bottom:0.75rem; display:flex; align-items:baseline; gap:0.75rem; flex-wrap:wrap;">
          <span style="white-space:nowrap;">${escapeHtml(label)}</span>
          <span style="font-size:0.7rem; font-weight:400; color:var(--text-muted-dark); text-transform:none; letter-spacing:normal;">${escapeHtml(subLabel)}</span>
        </div>
        <div style="font-size:0.83rem; color:var(--text-mid); margin-bottom:0.7rem;"><strong>Replacement baseline:</strong> ${escapeHtml(baseline)}</div>
        <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted-dark); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.35rem;">Must-Match Requirements</div>
        <ul class="wtc-list" style="list-style:none; padding-left:0; margin:0 0 0.65rem 0;">${mustMatch}</ul>
        <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted-dark); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.35rem;">Should-Match Preferences</div>
        <ul class="wtc-list" style="list-style:none; padding-left:0; margin:0 0 0.65rem 0;">${shouldMatch}</ul>
        <div style="font-size:0.8rem; color:var(--text-mid); border-top:1px solid rgba(0,0,0,0.05); padding-top:0.55rem;"><strong>Notes for claims documentation:</strong> ${escapeHtml(docNote)}</div>
      `;
    } else {
      const label = "LKQ considerations";
      const subLabel = "Match or exceed these specifications to maintain equivalent replacement utility";
      const checklistHtml = topSpecs.map((s) => {
        const itemText = `${s.label}: Match ${s.value} or better where it materially affects function, capacity, safety, or user utility.`;
        return `<li style="margin-bottom:0.4rem; display:flex; align-items:flex-start; gap:0.6rem; color:var(--text-dark); font-size:0.87rem;">
          <span style="color:var(--accent); font-size:1.05rem; font-weight:900; line-height:1;">☐</span>
          <span>${escapeHtml(itemText)}</span>
        </li>`;
      }).join("");
      const availStatus = fastData?.availability || "";
      const availNote = availStatus ? `<div style="margin-top:0.75rem; font-size:0.75rem; color:var(--text-muted-dark); border-top:1px solid rgba(0,0,0,0.05); padding-top:0.6rem;">
        <strong>Replacement context:</strong> ${escapeHtml(availStatus)}. Prioritize options that are currently available new and meet/exceed required specs.
      </div>` : "";

      wtcEl.className = "wtc-box wtc-general";
      wtcEl.innerHTML = `
        <div class="wtc-label" style="border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.4rem; margin-bottom:0.75rem; display:flex; align-items:baseline; gap:0.75rem; flex-wrap:wrap;">
          <span style="white-space:nowrap;">${escapeHtml(label)}</span>
          <span style="font-size:0.7rem; font-weight:400; color:var(--text-muted-dark); text-transform:none; letter-spacing:normal;">${escapeHtml(subLabel)}</span>
        </div>
        <ul class="wtc-list" style="list-style:none; padding-left:0; margin:0;">
          ${checklistHtml || '<li style="font-size:0.85rem; color:var(--text-muted);">Confirm key capacity/performance specs and match or exceed them for LKQ-valid replacement selection.</li>'}
        </ul>
        ${availNote}
      `;
    }
  }

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
    const columnMeta = buildReplacementColumnMeta(
      allRows,
      isTiered ? ["entryLevel", "midGrade", "premium"] : ["original", "brandMatch", "option1", "option2"]
    );
    if (allRows.length) {
      if (isTiered) {
        tbody.innerHTML = allRows
          .map((row) => {
            const isRetailers = (row.label || "").toLowerCase().includes("retailer");
            const isModel     = (row.label || "").toLowerCase() === "model";
            const isRecommendedReplacement = (row.label || "").toLowerCase().includes("recommended replacement");
            const elCell = isRetailers ? buildRetailerLinks(row.entryLevel, colSearch.entryLevel, { hasBrandField: Boolean(getColumnMetaValue(columnMeta, "entryLevel", "hasBrandField")), brand: getColumnMetaValue(columnMeta, "entryLevel", "brand"), availability: getColumnMetaValue(columnMeta, "entryLevel", "availability"), discontinued: getColumnMetaValue(columnMeta, "entryLevel", "discontinued") }) : isModel ? buildModelLink(row.entryLevel) : escapeHtml(row.entryLevel || "N/A");
            const mgCell = isRetailers ? buildRetailerLinks(row.midGrade,   colSearch.midGrade,   { hasBrandField: Boolean(getColumnMetaValue(columnMeta, "midGrade", "hasBrandField")), brand: getColumnMetaValue(columnMeta, "midGrade", "brand"), availability: getColumnMetaValue(columnMeta, "midGrade", "availability"), discontinued: getColumnMetaValue(columnMeta, "midGrade", "discontinued") }) : isModel ? buildModelLink(row.midGrade)   : escapeHtml(row.midGrade   || "N/A");
            const prCell = isRetailers ? buildRetailerLinks(row.premium,    colSearch.premium,    { hasBrandField: Boolean(getColumnMetaValue(columnMeta, "premium", "hasBrandField")), brand: getColumnMetaValue(columnMeta, "premium", "brand"), availability: getColumnMetaValue(columnMeta, "premium", "availability"), discontinued: getColumnMetaValue(columnMeta, "premium", "discontinued") }) : isModel ? buildModelLink(row.premium)    : escapeHtml(row.premium    || "N/A");
            const elFinal = isRecommendedReplacement ? buildGoogleSearchLink(row.entryLevel) : elCell;
            const mgFinal = isRecommendedReplacement ? buildGoogleSearchLink(row.midGrade) : mgCell;
            const prFinal = isRecommendedReplacement ? buildGoogleSearchLink(row.premium) : prCell;
            return `<tr>
              <td>${escapeHtml(row.label || "")}</td>
              <td>${elFinal}</td>
              <td>${mgFinal}</td>
              <td>${prFinal}</td>
            </tr>`;
          })
          .join("");
      } else {
        tbody.innerHTML = allRows
          .map((row) => {
            const isRetailers = (row.label || "").toLowerCase().includes("retailer");
            const isModel     = (row.label || "").toLowerCase() === "model";
            const isRecommendedReplacement = (row.label || "").toLowerCase().includes("recommended replacement");
            const origCell = isRetailers ? buildRetailerLinks(row.original,   colSearch.original,   { hasBrandField: Boolean(getColumnMetaValue(columnMeta, "original", "hasBrandField")), brand: getColumnMetaValue(columnMeta, "original", "brand"), availability: getColumnMetaValue(columnMeta, "original", "availability"), discontinued: getColumnMetaValue(columnMeta, "original", "discontinued") }) : isModel ? buildModelLink(row.original)   : escapeHtml(row.original   || "N/A");
            const bmCell   = isRetailers ? buildRetailerLinks(row.brandMatch, colSearch.brandMatch, { hasBrandField: Boolean(getColumnMetaValue(columnMeta, "brandMatch", "hasBrandField")), brand: getColumnMetaValue(columnMeta, "brandMatch", "brand"), availability: getColumnMetaValue(columnMeta, "brandMatch", "availability"), discontinued: getColumnMetaValue(columnMeta, "brandMatch", "discontinued") }) : isModel ? buildModelLink(row.brandMatch) : escapeHtml(row.brandMatch || "N/A");
            const o1Cell   = isRetailers ? buildRetailerLinks(row.option1,    colSearch.option1,    { hasBrandField: Boolean(getColumnMetaValue(columnMeta, "option1", "hasBrandField")), brand: getColumnMetaValue(columnMeta, "option1", "brand"), availability: getColumnMetaValue(columnMeta, "option1", "availability"), discontinued: getColumnMetaValue(columnMeta, "option1", "discontinued") }) : isModel ? buildModelLink(row.option1)    : escapeHtml(row.option1    || "N/A");
            const o2Cell   = isRetailers ? buildRetailerLinks(row.option2,    colSearch.option2,    { hasBrandField: Boolean(getColumnMetaValue(columnMeta, "option2", "hasBrandField")), brand: getColumnMetaValue(columnMeta, "option2", "brand"), availability: getColumnMetaValue(columnMeta, "option2", "availability"), discontinued: getColumnMetaValue(columnMeta, "option2", "discontinued") }) : isModel ? buildModelLink(row.option2)    : escapeHtml(row.option2    || "N/A");
            const origFinal = isRecommendedReplacement ? buildGoogleSearchLink(row.original) : origCell;
            const bmFinal = isRecommendedReplacement ? buildGoogleSearchLink(row.brandMatch) : bmCell;
            const o1Final = isRecommendedReplacement ? buildGoogleSearchLink(row.option1) : o1Cell;
            const o2Final = isRecommendedReplacement ? buildGoogleSearchLink(row.option2) : o2Cell;
            return `<tr>
              <td>${escapeHtml(row.label || "")}</td>
              <td>${origFinal}</td>
              <td class="brand-match">${bmFinal}</td>
              <td>${o1Final}</td>
              <td>${o2Final}</td>
            </tr>`;
          })
          .join("");
      }
      tableLoading.classList.add("hidden");
      tableEl.classList.remove("hidden");
      // Reveal compare trigger when table has data
      const compareTriggerEl = byId("compare-trigger-row");
      if (compareTriggerEl) compareTriggerEl.classList.remove("hidden");
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
  // Technical Details tab removed.

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
    const parts = Array.isArray(data.repairParts) ? data.repairParts : [];
    const query = (fastData?.analysis?.estimatedModel || fastData?.analysis?.entered || "").trim();
    const ctxText = ((fastData?.analysis?.itemDescription || "") + " " + query).toLowerCase();
    const cat = (currentCategory || "general").toLowerCase();

    const isAppliance = ["refrigerator", "washer", "dryer", "dishwasher", "water_heater", "small_appliance", "hvac", "range"].includes(cat);
    const isElectronics = ["tv", "electronics", "computer", "laptop", "phone"].includes(cat);
    const isHotTub = ctxText.includes("hot tub") || ctxText.includes("hottub") || ctxText.includes("spa") || ctxText.includes("jacuzzi");
    const isGenerac = ctxText.includes("generac");

    const inferPartName = (failure, idx) => {
      if (parts[idx]?.name) return parts[idx].name;
      if (failure.component) return failure.component;
      return "replacement part";
    };

    const failureRows = failures.map((f, idx) => {
      const failureText = [f.component, f.whyItFails, f.symptoms].filter(Boolean).join(" - ") || "Reported failure";
      const partName = inferPartName(f, idx);
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent((query + " " + partName).trim())}`;
      return `<li>
        <div class="failures-component">${escapeHtml(failureText)}</div>
        <div class="failures-detail"><a class="part-name-link" href="${escapeHtml(googleUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(partName)}</a></div>
      </li>`;
    });

    const resourceButtons = [];
    if (isAppliance) {
      resourceButtons.push(`<a class="repair-link" href="https://www.appliancepartspros.com" target="_blank" rel="noopener noreferrer">AppliancePartsPros</a>`);
      resourceButtons.push(`<a class="repair-link" href="https://www.searspartsdirect.com" target="_blank" rel="noopener noreferrer">Sears Parts Direct</a>`);
    }
    if (isElectronics) {
      resourceButtons.push(`<a class="repair-link" href="https://www.shopjimmy.com" target="_blank" rel="noopener noreferrer">ShopJimmy</a>`);
    }
    if (data.manufacturerPage?.url) {
      resourceButtons.push(`<a class="repair-link" href="${escapeHtml(data.manufacturerPage.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.manufacturerPage.label || "Manufacturer Support")}</a>`);
    }
    if (isHotTub) {
      resourceButtons.push(`<a class="repair-link" href="https://www.hottubsupplystore.com/search?q=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">Hot Tub Supply Store</a>`);
    }
    if (isGenerac) {
      resourceButtons.push(`<a class="repair-link" href="https://www.generac.com/for-homeowners/product-support/serial-number-lookup" target="_blank" rel="noopener noreferrer">Generac Support</a>`);
    }

    const listHtml = failureRows.length
      ? `<ul class="failures-list">${failureRows.join("")}</ul>`
      : `<p class="none-found">No common failures data available.</p>`;
    const resourcesHtml = resourceButtons.length
      ? `<div class="repair-resources">${resourceButtons.join("")}</div>`
      : "";

    failuresContent.innerHTML = `${listHtml}${resourcesHtml}`;
    if (failureRows.length) {
      const partsNote = byId("parts-available-note");
      if (partsNote) partsNote.classList.remove("hidden");
    }
  }
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

// ── Compare Replacement Option Tool ───────────────────────────────────────────

function getTableVal(table, label) {
  if (!Array.isArray(table)) return "—";
  const row = table.find((r) => (r.label || "").toLowerCase().includes(label.toLowerCase()));
  return row ? (row.original || "—") : "—";
}

function getTableColVal(table, label, col) {
  if (!Array.isArray(table)) return "—";
  const row = table.find((r) => (r.label || "").toLowerCase().includes(label.toLowerCase()));
  return row ? (row[col] || "—") : "—";
}

function buildCompareSummary(origFast, entFast, verdict, enteredQuery) {
  const origDesc  = (origFast && origFast.analysis && (origFast.analysis.quickSummary || origFast.analysis.estimatedModel)) || "the original item";
  const entDesc   = (entFast  && entFast.analysis  && (entFast.analysis.quickSummary  || entFast.analysis.estimatedModel))  || enteredQuery || "the entered model";
  const origCat   = (origFast && origFast.analysis && origFast.analysis.category) || "item";
  const entCat    = (entFast  && entFast.analysis  && entFast.analysis.category)  || "item";
  const origPrice = standardizePrice((origFast && origFast.analysis && (origFast.analysis.currentMarketPrice || origFast.analysis.launchMsrp)));
  const entPrice  = standardizePrice((entFast  && entFast.analysis  && (entFast.analysis.currentMarketPrice  || entFast.analysis.launchMsrp)));

  if (verdict === "WELL ABOVE LKQ") {
    return `${entDesc} is a ${entCat} that significantly exceeds ${origDesc} (${origCat}) on weighted LKQ criteria. Current market values — Original: ${origPrice}; Entered model: ${entPrice}.`;
  }
  if (verdict === "LKQ") {
    return `${entDesc} is a ${entCat} that meets like-kind and quality expectations compared with ${origDesc}. Current market values — Original: ${origPrice}; Entered model: ${entPrice}.`;
  }
  return `${entDesc} (${entCat}) falls below like-kind and quality expectations compared with ${origDesc} (${origCat}) on weighted category-critical specs. Current market values — Original: ${origPrice}; Entered model: ${entPrice}.`;
}

function renderCompareTable(entFast, entDetail, includeExisting) {
  const origDetail = detailData || {};
  const entDetailSafe = entDetail || {};
  const entModelName = escapeHtml(
    (entFast?.analysis?.estimatedModel || entFast?.analysis?.entered) ||
    (byId("compare-input") && byId("compare-input").value.trim()) || "Entered Model"
  );

  const cols = [{ key: "original", label: "Original Item", entered: false, source: "original" }];
  if (includeExisting) {
    const isTiered = detailData && detailData.tableMode === "tiered";
    if (isTiered) {
      cols.push({ key: "entryLevel", label: "Entry Level", entered: false, source: "orig-col" });
      cols.push({ key: "midGrade", label: "Mid-Grade", entered: false, source: "orig-col" });
      cols.push({ key: "premium", label: "Premium", entered: false, source: "orig-col" });
    } else {
      cols.push({ key: "brandMatch", label: "Brand Match", entered: false, source: "orig-col" });
      cols.push({ key: "option1", label: "Option 1", entered: false, source: "orig-col" });
      cols.push({ key: "option2", label: "Option 2", entered: false, source: "orig-col" });
    }
  }
  cols.push({ key: "entered", label: entModelName, entered: true, source: "entered" });

  const normalizedByCol = {};
  cols.forEach((col) => {
    if (col.source === "original") {
      normalizedByCol[col.key] = normalizeForComparison({ fast: fastData, detail: origDetail, isOriginal: true });
    } else if (col.source === "entered") {
      normalizedByCol[col.key] = normalizeForComparison({ fast: entFast, detail: entDetailSafe });
    } else {
      normalizedByCol[col.key] = normalizeForComparison({ fast: fastData, detail: origDetail, colKey: col.key });
    }
  });

  const originalSide = normalizedByCol.original;
  const originalTypeKey = normalizeItemTypeKey(originalSide.itemType);
  const featureSchema = getComparisonFeatureList(originalTypeKey);
  const normalizeTierLabel = (tier) => {
    const raw = String(tier || "").trim().toLowerCase();
    if (!raw) return "Average";
    if (raw.includes("luxury")) return "Luxury";
    if (raw.includes("premium")) return "Premium";
    if (raw.includes("upper")) return "Upper Mid-Grade";
    if (raw.includes("mid")) return "Mid-Grade";
    if (raw.includes("entry")) return "Entry Level";
    if (raw.includes("average")) return "Average";
    return "Average";
  };
  const formatItemTypeDisplay = (value) => {
    const key = normalizeItemTypeKey(value);
    const labels = {
      tv: "TV", refrigerator: "Refrigerator", washer: "Washer", dryer: "Dryer",
      dishwasher: "Dishwasher", range: "Range", hvac: "HVAC", water_heater: "Water Heater",
      computer: "Computer", laptop: "Laptop", phone: "Phone", small_appliance: "Small Appliance",
      electronics: "Electronics", general: "General"
    };
    return labels[key] || safeText(value, "General");
  };
  const compareIndicator = (label, originalValue, candidateValue) => {
    const oRaw = safeText(originalValue, "N/A");
    const cRaw = safeText(candidateValue, "N/A");
    if (oRaw === "N/A" || cRaw === "N/A") return null;
    const labelText = String(label || "").toLowerCase();
    const o = oRaw.toLowerCase();
    const c = cRaw.toLowerCase();
    const resolutionRank = (v) => /8k/.test(v) ? 5 : /4k|2160/.test(v) ? 4 : /1440|2k/.test(v) ? 3 : /1080|full\s*hd/.test(v) ? 2 : /720|hd/.test(v) ? 1 : 0;
    const technologyRank = (v) => /mini\s*led|oled/.test(v) ? 4 : /qled|quantum/.test(v) ? 3 : /led/.test(v) ? 2 : /lcd/.test(v) ? 1 : 0;
    let verdict = null;
    if (labelText.includes("resolution")) {
      const ro = resolutionRank(o); const rc = resolutionRank(c);
      if (ro > 0 && rc > 0) verdict = rc > ro ? "superior" : rc < ro ? "inferior" : "equal";
    }
    if (!verdict && (labelText.includes("display") || labelText.includes("technology") || labelText.includes("panel"))) {
      const to = technologyRank(o); const tc = technologyRank(c);
      if (to > 0 && tc > 0) verdict = tc > to ? "superior" : tc < to ? "inferior" : "equal";
    }
    if (!verdict) {
      const on = parseFirstNumber(oRaw);
      const cn = parseFirstNumber(candidateValue);
      if (Number.isFinite(on) && Number.isFinite(cn) && on > 0) {
        const ratio = cn / on;
        verdict = ratio <= 0.85 ? "inferior" : ratio >= 1.2 ? "superior" : "equal";
      }
    }
    if (!verdict && (o === c || c.includes(o) || o.includes(c))) verdict = "equal";
    if (!verdict) return null;
    if (verdict === "inferior") return { icon: "&#10007;", cls: "compare-quality-bad", title: "Below original quality" };
    if (verdict === "superior") return { icon: "&#9733;", cls: "compare-quality-good", title: "Above original quality" };
    return { icon: "&#10003;", cls: "compare-quality-ok", title: "Meets LKQ variance" };
  };

  const categoryMismatchValues = {};
  let hasAnyMismatch = false;
  cols.forEach((col) => {
    if (col.key === "original") {
      categoryMismatchValues[col.key] = "-";
      return;
    }
    const candidateType = normalizedByCol[col.key].itemType;
    if (!sameItemType(originalSide.itemType, candidateType)) {
      hasAnyMismatch = true;
      categoryMismatchValues[col.key] = `Category mismatch: original is ${String(originalSide.itemType).toUpperCase()}, replacement is ${String(candidateType).toUpperCase()} (check query).`;
    } else {
      categoryMismatchValues[col.key] = "-";
    }
  });

  const formatTierIndicator = (origTier, candTier) => {
    const tiers = ["Budget", "Average", "Premium", "Luxury"];
    const oIdx = tiers.indexOf(origTier);
    const cIdx = tiers.indexOf(candTier);
    if (oIdx === -1 || cIdx === -1) return "";
    
    if (cIdx < oIdx) return `<div class="tier-indicator tier-lower">✔ ${origTier} is greater than ${candTier}</div>`;
    if (cIdx === oIdx) return `<div class="tier-indicator tier-equal">✔ Same tier classification</div>`;
    return `<div class="tier-indicator tier-higher">✔ Replacement tier exceeds original tier</div>`;
  };

  const rows = [
    {
      label: "Item Type",
      values: Object.fromEntries(cols.map((col) => {
        if (col.key === "original") {
          return [col.key, formatItemTypeDisplay(originalSide.itemType || fastData?.analysis?.category || fastData?.analysis?.itemType)];
        }
        return [col.key, formatItemTypeDisplay(normalizedByCol[col.key].itemType || originalSide.itemType)];
      })),
      isHtml: false,
      mandatory: true
    },
    {
      label: "Tier",
      values: Object.fromEntries(cols.map((col) => {
        const n = normalizedByCol[col.key];
        const tierLabel = normalizeTierLabel(n.tier);
        if (col.key === "original") return tierLabel;
        const indicator = formatTierIndicator(normalizeTierLabel(originalSide.tier), tierLabel);
        return `${tierLabel}${indicator}`;
      })),
      isHtml: true,
      mandatory: true
    },
    {
      label: "Model Number",
      values: Object.fromEntries(cols.map((col) => [col.key, safeText(normalizedByCol[col.key].model, "N/A")])),
      isHtml: false,
      mandatory: true
    }
  ];

  if (hasAnyMismatch) {
    rows.push({
      label: "Category Check",
      values: categoryMismatchValues,
      isHtml: false,
      mandatory: true
    });
  }

  const specRows = featureSchema.map((feature) => {
    const values = {};
    cols.forEach((col) => {
      const n = normalizedByCol[col.key];
      values[col.key] = safeText(n.keySpecs?.[feature.key], "N/A");
    });
    return {
      label: feature.label,
      values,
      isHtml: false,
      isSpec: true,
      major: !!feature.major
    };
  });

  const visibleSpecRows = specRows.filter((row) => {
    const allNA = cols.every((col) => String(row.values[col.key] || "").toUpperCase() === "N/A");
    return !allNA;
  });

  rows.push(...visibleSpecRows);

  rows.push(
    {
      label: "Current Market Value",
      values: Object.fromEntries(cols.map((col) => [col.key, standardizePrice(normalizedByCol[col.key].value?.marketValue)])),
      isHtml: false,
      mandatory: true
    },
    {
      label: "Original MSRP",
      values: Object.fromEntries(cols.map((col) => [col.key, standardizePrice(normalizedByCol[col.key].value?.msrp)])),
      isHtml: false,
      mandatory: true
    }
  );

  const lkqRow = { label: "LKQ Grade", values: {}, isHtml: true, mandatory: true };
  const configCategories = ["computer", "laptop", "phone", "electronics"];
  const showConfigDisclaimer = configCategories.includes(originalTypeKey);
  const configDisclaimer = showConfigDisclaimer ? `<div class="config-disclaimer">(Certain configurations of this item contain upgraded parts that may affect LKQ determination)</div>` : "";

  cols.forEach((col) => {
    if (col.key === "original") {
      lkqRow.values[col.key] = lkqGradeHtml("LKQ");
      return;
    }
    const candidateSpecRows = visibleSpecRows.map((r) => ({
      label: r.label,
      original: r.values.original,
      candidate: r.values[col.key]
    }));
    const grade = deriveLkqGrade(originalSide, normalizedByCol[col.key], candidateSpecRows, originalTypeKey);
    lkqRow.values[col.key] = `${lkqGradeHtml(grade)}${col.entered ? configDisclaimer : ""}`;
  });
  rows.push(lkqRow);

  let thead = "<tr><th>Feature</th>";
  cols.forEach((col) => {
    thead += `<th${col.entered ? ' class="compare-col-entered"' : ""}>${escapeHtml(col.label)}</th>`;
  });
  thead += "</tr>";

  let tbody = rows.map((row) => {
    let tr = `<tr><td>${escapeHtml(row.label)}</td>`;
    cols.forEach((col) => {
      const val = row.values[col.key];
      const cellClass = col.entered ? ' class="compare-col-entered"' : "";
      let content = row.isHtml ? (val || "N/A") : escapeHtml(val || "N/A");
      if (row.isSpec && col.key !== "original") {
        const indicator = compareIndicator(row.label, row.values.original, row.values[col.key]);
        if (indicator) {
          content = `<span class="compare-quality ${indicator.cls}" title="${escapeHtml(indicator.title)}">${indicator.icon}</span> ${content}`;
        }
      }
      tr += `<td${cellClass}>${content}</td>`;
    });
    tr += "</tr>";
    return tr;
  }).join("");

  const enteredGrade = (() => {
    const enteredSpecRows = visibleSpecRows.map((r) => ({
      label: r.label,
      original: r.values.original,
      candidate: r.values.entered
    }));
    return deriveLkqGrade(originalSide, normalizedByCol.entered, enteredSpecRows, originalTypeKey);
  })();

  const summaryText = buildCompareSummary(fastData, entFast, enteredGrade, (byId("compare-input") || {}).value || "");
  _compareBlock = {
    key: "comparison",
    title: "Replacement Comparison",
    text: `Comparing original vs. ${(entFast && entFast.analysis && entFast.analysis.estimatedModel) || "entered model"}\nLKQ Grade: ${enteredGrade}\n${summaryText}`
  };

  return `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <div class="compare-summary">${escapeHtml(summaryText)}</div>
    <button class="compare-add-btn" id="compare-add-btn">&#128196; Add This Comparison to Report Summary</button>`;
}

async function runComparison() {
  const inputEl   = byId("compare-input");
  const loadingEl = byId("compare-loading");
  const resultEl  = byId("compare-result");
  const submitBtn = byId("compare-submit");
  const includeExisting = byId("compare-include-existing") ? byId("compare-include-existing").checked : false;

  const query = inputEl ? inputEl.value.trim() : "";
  if (!query) {
    if (inputEl) {
      inputEl.focus();
      inputEl.style.borderColor = "var(--red)";
      setTimeout(() => { inputEl.style.borderColor = ""; }, 1500);
    }
    return;
  }
  if (!fastData) return;

  if (loadingEl) loadingEl.classList.remove("hidden");
  if (resultEl) resultEl.classList.add("hidden");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const [entFastRaw, entDetailRaw] = await Promise.all([
      fetch(`/api/search?mode=research-fast&query=${encodeURIComponent(query)}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/search?mode=research-detail&query=${encodeURIComponent(query)}`).then((r) => r.json()).catch(() => null)
    ]);

    const entFast   = entFastRaw   && typeof entFastRaw   === "object" ? entFastRaw   : null;
    const entDetail = entDetailRaw && typeof entDetailRaw === "object" && !entDetailRaw.error ? entDetailRaw : null;

    if (!entFast) {
      if (resultEl) {
        resultEl.innerHTML = '<p style="color:var(--red);font-size:0.85rem;padding:0.25rem 0;">Could not retrieve data for this model. Please refine your query.</p>';
        resultEl.classList.remove("hidden");
      }
      return;
    }

    if (resultEl) {
      resultEl.innerHTML = renderCompareTable(entFast, entDetail, includeExisting);
      resultEl.classList.remove("hidden");
      const addBtn = byId("compare-add-btn");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          if (_compareBlock) {
            addBtn.textContent = "\u2713 Added to Report Summary";
            addBtn.classList.add("added");
            addBtn.disabled = true;
          }
        });
      }
    }
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
    if (submitBtn) submitBtn.disabled = false;
  }
}

function toggleComparePanel() {
  const btn   = byId("compare-toggle-btn");
  const panel = byId("compare-panel");
  if (!panel || !btn) return;
  const isOpen = !panel.classList.contains("hidden");
  panel.classList.toggle("hidden", isOpen);
  btn.classList.toggle("active", !isOpen);
}

function applyCompareIncludeLabelText() {
  const targetText = "Include loaded Brand Match & Replacement Options in this comparison";
  const cb = byId("compare-include-existing");
  if (!cb) return;
  const labelByFor = document.querySelector('label[for="compare-include-existing"]');
  if (labelByFor) {
    labelByFor.textContent = targetText;
    return;
  }
  const parentLabel = cb.closest("label");
  if (parentLabel) {
    parentLabel.textContent = targetText;
  }
}

// ── Summary Modal ─────────────────────────────────────────────────────────────

let _summaryState = {};

function openSummaryModal() {
  if (!fastData) return;
  const a = fastData.analysis || {};
  const rd = fastData.releaseDate || {};
  const acvEl = byId("r-acv");
  const acvStr = acvEl ? acvEl.textContent.trim() : "—";

  const blocks = [];

  // Summary Metrics
  blocks.push({
    key: "metrics", title: "Summary Metrics",
    text: [
      `Item: ${a.quickSummary || a.entered || "—"}`,
      `Model: ${a.estimatedModel || a.entered || "—"}`,
      `Age: ${rd.estimatedAge || "—"}`,
      `Launch MSRP: ${standardizePrice(a.launchMsrp)} | Current Market: ${standardizePrice(a.currentMarketPrice)}`,
      `Est. ACV: ${acvStr}`,
      `Availability: ${fastData.availability || "—"}`
    ].join("\n")
  });

  // Current Item Analysis
  if (a.itemDescription) {
    blocks.push({
      key: "analysis", title: "Current Item Analysis",
      text: a.itemDescription + (a.keyDetails ? `\nKey specs: ${a.keyDetails}` : "")
    });
  }

  // Variations
  const vars = Array.isArray(fastData.variations) ? fastData.variations : [];
  if (vars.length) {
    blocks.push({
      key: "variations", title: "Variations",
      text: vars.map((v) => `• ${v.label}${v.note ? ` — ${v.note}` : ""}`).join("\n")
    });
  }

  // Replacement Options
  if (detailData?.table?.length) {
    const isTiered = detailData.tableMode === "tiered";
    const rows = (detailData.table || []).slice(0, 7).map((r) =>
      isTiered
        ? `${r.label}: Entry: ${r.entryLevel || "—"} | Mid: ${r.midGrade || "—"} | Premium: ${r.premium || "—"}`
        : `${r.label}: ${r.brandMatch || r.option1 || "—"}`
    );
    blocks.push({ key: "replacements", title: "Replacement Options", text: rows.join("\n") });
  }

  // Diagnostics & Repair
  if (detailData) {
    const lines = [];
    const recalls = Array.isArray(detailData.recalls) ? detailData.recalls : [];
    if (recalls.length) lines.push(`Recalls: ${recalls.map((r) => r.title).slice(0, 3).join("; ")}`);
    else lines.push("Recalls: None found");
    const codes = Array.isArray(detailData.errorCodes) ? detailData.errorCodes : [];
    if (codes.length) lines.push(`Error codes: ${codes.map((c) => c.code).join(", ")}`);
    if (lines.length) blocks.push({ key: "diagnostics", title: "Diagnostics & Repair", text: lines.join("\n") });
  }

  // Include comparison block if user added one
  if (_compareBlock) blocks.push(_compareBlock);

  // Save state (all included by default)
  _summaryState = {};
  blocks.forEach((b) => { _summaryState[b.key] = { ...b, included: true }; });

  // Render blocks
  const container = byId("summary-sections");
  if (container) {
    container.innerHTML = blocks.map((b) => `
      <div class="summary-section-block" id="ss-${b.key}">
        <div class="summary-section-header">
          <span class="summary-section-title">${b.title}</span>
          <button class="summary-toggle-btn included" data-key="${b.key}" aria-pressed="true">&#10003; Included</button>
        </div>
        <div class="summary-section-preview">${escapeHtml(b.text)}</div>
      </div>`).join("");

    container.querySelectorAll(".summary-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        const state = _summaryState[key];
        if (!state) return;
        state.included = !state.included;
        btn.classList.toggle("included", state.included);
        btn.classList.toggle("excluded", !state.included);
        btn.setAttribute("aria-pressed", state.included ? "true" : "false");
        btn.innerHTML = state.included ? "&#10003; Included" : "&#10005; Excluded";
        const block = byId(`ss-${key}`);
        if (block) block.classList.toggle("excluded", !state.included);
      });
    });
  }

  // Clear notes
  const notesEl = byId("summary-notes");
  if (notesEl) notesEl.value = "";

  // Show modal
  const modal = byId("summary-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.scrollTop = 0;
    document.body.style.overflow = "hidden";
  }
}

function closeSummaryModal() {
  const modal = byId("summary-modal");
  if (modal) modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function generateSummary() {
  const lines = ["Bolt Research Report", ""];
  Object.values(_summaryState).forEach((block) => {
    if (!block.included) return;
    lines.push(`── ${block.title} ──`);
    lines.push(block.text);
    lines.push("");
  });
  const notes = byId("summary-notes")?.value?.trim() || "";
  if (notes) {
    lines.push("── Notes ──");
    lines.push(notes);
    lines.push("");
  }
  lines.push("Source: boltresearchteam.com");

  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    const toast = byId("summary-toast");
    if (toast) {
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 2500);
    }
  }).catch(() => {
    // Fallback: select a temp textarea
    const ta = document.createElement("textarea");
    ta.value = lines.join("\n");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    const toast = byId("summary-toast");
    if (toast) { toast.classList.remove("hidden"); setTimeout(() => toast.classList.add("hidden"), 2500); }
  });
}

function resetCompareTool() {
  const input = byId("compare-input");
  if (input) input.value = "";
  const result = byId("compare-result");
  if (result) {
    result.innerHTML = "";
    result.classList.add("hidden");
  }
  const checkbox = byId("compare-include-existing");
  if (checkbox) checkbox.checked = false;
  const panel = byId("compare-panel");
  if (panel) panel.classList.add("hidden");
  const trigger = byId("compare-trigger-row");
  if (trigger) trigger.classList.add("hidden");
  const toggle = byId("compare-toggle-btn");
  if (toggle) toggle.classList.remove("active");
  _compareBlock = null;
}

function resetResultsUI() {
  // Clear in-memory state used by result rendering.
  fastData = null;
  detailData = null;
  currentCategory = "general";
  acvData = { msrp: 0, age: 0 };
  _compareBlock = null;
  _summaryState = {};

  // Hide overall results wrapper immediately to avoid mixed old/new UI.
  const resultsEl = byId("results");
  if (resultsEl) resultsEl.classList.add("hidden");

  // Reset tabs to default without triggering scroll.
  activeTab = "tab-overview";
  TAB_IDS.forEach((id) => {
    const panel = byId(id.replace("tab-", "panel-"));
    if (panel) panel.classList.toggle("active", id === "tab-overview");
  });
  renderReportSectionTabs();

  // Clear dynamic containers.
  [
    "lkq-evaluator-guidance",
    "table-body",
    "r-top-specs-pills",
    "refinement-chips",
    "r-variation-chips",
    "r-field-ref-wrap",
    "manual-content",
    "manufacturer-page-content",
    "error-codes-content",
    "failures-content",
    "troubleshooting-content",
    "recalls-content",
    "compare-result",
    "summary-sections"
  ].forEach((id) => {
    const el = byId(id);
    if (el) el.innerHTML = "";
  });

  // Remove any stale replacement rationale blocks if they exist outside expected roots.
  document.querySelectorAll("#replacement-requirements-rationale, .replacement-requirements-rationale, .lkq-considerations-block").forEach((el) => el.remove());

  // Reset field text.
  [
    "r-overview",
    "r-search-query",
    "r-assumptions",
    "r-item-desc",
    "r-production-era",
    "r-discontinuation",
    "r-estimated-age",
    "r-service-life",
    "r-launch-msrp",
    "r-market-price",
    "r-market-price-note",
    "r-acv",
    "r-acv-formula",
    "r-acv-note"
  ].forEach((id) => setText(id, "", ""));
  setText("m-age", "—");
  setText("m-msrp", "—");
  setText("m-acv", "—");
  setText("m-availability", "—");

  // Reset/hide transient blocks.
  show("model-number-hint", false);
  show("refine-tip", false);
  show("estimation-banner", false);
  show("age-advisory", false);
  show("parts-available-note", false);
  show("r-variations", false);
  show("table-note", false);
  show("narrow-results", false);
  show("lkq-evaluator-guidance", false);
  const snInputLi = byId("sn-input-li");
  const snResultLi = byId("sn-result-li");
  if (snInputLi) snInputLi.style.display = "none";
  if (snResultLi) snResultLi.style.display = "none";
  const snResultText = byId("sn-result-text");
  if (snResultText) snResultText.innerHTML = "";

  // Reset replacement table and compare tool state.
  const tableHeadRow = byId("table-head-row");
  if (tableHeadRow) {
    tableHeadRow.innerHTML = `<th>Feature</th><th>Original Item</th><th class="highlight">Brand Match</th><th>Option 1</th><th>Option 2</th>`;
  }
  const tableLoading = byId("table-loading");
  const tableEl = byId("r-table");
  if (tableLoading) tableLoading.classList.remove("hidden");
  if (tableEl) tableEl.classList.add("hidden");

  // Reset valuation controls.
  const acvSteps = byId("r-acv-steps");
  if (acvSteps) {
    acvSteps.style.display = "none";
    acvSteps.textContent = "";
  }
  const ageInput = byId("acv-age-input");
  if (ageInput) ageInput.value = "0";
  const recalcBtn = byId("recalc-btn");
  if (recalcBtn) recalcBtn.disabled = true;

  // Ensure summary modal does not carry old state into the next search.
  closeSummaryModal();
}

// ── performSearch ─────────────────────────────────────────────────────────────

async function performSearch() {
  const queryInput = byId("query");
  if (!queryInput) return;
  const query = queryInput.value.trim();
  if (!query) return;
  if (lkqModeActive) clearLkqInlineView();

  const searchToken = ++activeSearchToken;
  resetResultsUI();

  // Check sessionStorage cache first
  const cacheKey = `bolt_v6_${query.toLowerCase()}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { fast, detail } = JSON.parse(cached);
      if (fast) {
        if (searchToken !== activeSearchToken) return;
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
  byId("mascot-wrapper")?.classList.add("brt-loading");

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
    if (searchToken !== activeSearchToken) return;
    if (loaderDog) loaderDog.classList.remove("running");
    if (loaderText) loaderText.classList.remove("visible");
    byId("mascot-wrapper")?.classList.remove("brt-loading");
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
    if (searchToken !== activeSearchToken) return;
    if (detail && typeof detail === "object" && !detail.error) {
      renderDetail(detail);
    }
  });

  // Save both to sessionStorage when both complete
  Promise.all([fastPromise, detailPromise]).then(([fast, detail]) => {
    if (searchToken !== activeSearchToken) return;
    if (fast && detail) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ fast, detail }));
      } catch (_) {}
    }
  });
}

// ── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const queryInput = byId("query");
  const lkqReportBtn = byId("lkq-report-btn");
  const fullReportBtn = byId("full-report-btn");
  const fullReportRunBtn = byId("full-report-run-btn");
  const copyBtn = byId("copy-btn");
  const printBtn = byId("print-btn");
  const recalcBtn = byId("recalc-btn");

  const runDefaultFullReport = () => {
    const query = String(queryInput?.value || "").trim();
    if (!query) return;
    // FULL REPORT BRANCH: default Search/Enter always executes full performSearch flow.
    setActiveReportType("full");
    console.info("[ReportMode] Full technical research report branch");
    setAllFullReportSectionsChecked(true);
    applyFullReportSectionSelections();
    toggleFullReportPicker(false);
    clearLkqInlineView();
    performSearch();
  };

  // Main search now runs only through the report buttons below the input.

  if (lkqReportBtn) {
    lkqReportBtn.addEventListener("click", () => {
      // LKQ REPORT BRANCH: runs dedicated inline LKQ fast+detail render path, not performSearch().
      setActiveReportType("lkq");
      console.info("[ReportMode] LKQ report branch");
      toggleFullReportPicker(false);
      clearLkqInlineView();
      performLkqInlineSearch();
    });
  }

  if (fullReportBtn) {
    fullReportBtn.addEventListener("click", () => {
      setActiveReportType("full");
      toggleFullReportPicker();
    });
  }

  if (fullReportRunBtn) {
    fullReportRunBtn.addEventListener("click", () => {
      const query = String(queryInput?.value || "").trim();
      if (!query) return;
      setActiveReportType("full");
      console.info("[ReportMode] Full technical research report branch (picker run)");
      applyFullReportSectionSelections();
      toggleFullReportPicker(false);
      clearLkqInlineView();
      performSearch();
    });
  }
  const imageSearchBtn = byId("image-search-btn");
  const imageSearchInput = byId("image-search-input");
  if (imageSearchBtn && imageSearchInput) {
    imageSearchBtn.addEventListener("click", () => imageSearchInput.click());
    imageSearchInput.addEventListener("change", async () => {
      const file = imageSearchInput.files && imageSearchInput.files[0] ? imageSearchInput.files[0] : null;
      if (!file) return;
      await handleImageSearch(file);
      imageSearchInput.value = "";
    });
  }
  if (copyBtn) copyBtn.addEventListener("click", openSummaryModal);
  if (printBtn) printBtn.addEventListener("click", () => window.print());
  if (recalcBtn) recalcBtn.addEventListener("click", recalcACV);
  initTabs();

  // Summary modal buttons
  byId("summary-modal-close")?.addEventListener("click", closeSummaryModal);
  byId("generate-summary-top")?.addEventListener("click", generateSummary);
  byId("generate-summary-bottom")?.addEventListener("click", generateSummary);

  // Close modal on backdrop click (clicking outside the modal bar/body)
  byId("summary-modal")?.addEventListener("click", (e) => {
    if (e.target === byId("summary-modal")) closeSummaryModal();
  });

  // Search examples dropdown
  const examplesToggle = byId("examples-toggle");
  const examplesList = byId("examples-list");
  const examplesChevron = byId("examples-chevron");
  if (examplesToggle && examplesList) {
    examplesToggle.addEventListener("click", () => {
      const open = examplesList.classList.toggle("open");
      examplesToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (examplesChevron) examplesChevron.classList.toggle("open", open);
    });
    examplesList.querySelectorAll("button[data-example]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.dataset.example;
        const input = byId("query");
        if (input) input.value = q;
        examplesList.classList.remove("open");
        examplesToggle.setAttribute("aria-expanded", "false");
        if (examplesChevron) examplesChevron.classList.remove("open");
        runDefaultFullReport();
      });
    });
  }

  // ── Panel bottom navigation (jump to other tabs) ─────────────────────────
  document.querySelectorAll(".panel-nav-btn[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      const tabBtn = byId(tabId);
      if (!tabBtn || tabBtn.classList.contains("hidden")) return;
      setActiveTab(tabId);
      byId("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ── Homepage: hamburger menu ──────────────────────────────────────────────
  byId("brt-hamburger")?.addEventListener("click", () => {
    byId("brt-nav-links")?.classList.toggle("open");
  });

  // ── Homepage: nav CTA → scroll to and focus main search bar ──────────────
  byId("nav-cta-btn")?.addEventListener("click", () => {
    const input = byId("query");
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => input.focus(), 350);
    }
  });

  // ── Homepage: CTA search bar (bottom of page) ─────────────────────────────
  const queryCta = byId("query-cta");
  const btnCta = byId("btn-cta");
  if (btnCta) {
    btnCta.addEventListener("click", () => {
      const v = queryCta?.value?.trim();
      if (!v) return;
      const mainInput = byId("query");
      if (mainInput) mainInput.value = v;
      runDefaultFullReport();
    });
  }
  if (queryCta) {
    queryCta.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const v = queryCta.value.trim();
      if (!v) return;
      const mainInput = byId("query");
      if (mainInput) mainInput.value = v;
      runDefaultFullReport();
    });
  }

  // ── Homepage: example pills ───────────────────────────────────────────────
  document.querySelectorAll(".brt-example-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const q = pill.dataset.example;
      if (!q) return;
      const input = byId("query");
      if (input) input.value = q;
      runDefaultFullReport();
    });
  });

  // Serial decode button + Enter key
  const snBtn = byId("sn-decode-btn");
  if (snBtn) snBtn.addEventListener("click", handleSerialDecode);
  const snInputEl2 = byId("sn-input");
  if (snInputEl2) snInputEl2.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); handleSerialDecode(); } });

  // Compare tool wiring
  byId("compare-toggle-btn")?.addEventListener("click", toggleComparePanel);
  byId("compare-panel-close")?.addEventListener("click", toggleComparePanel);
  byId("compare-submit")?.addEventListener("click", runComparison);
  byId("compare-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); runComparison(); } });
  applyCompareIncludeLabelText();

  // Full report section picker defaults
  setAllFullReportSectionsChecked(true);
  applyFullReportSectionSelections();
  setActiveReportType(null);

  const initialQuery = new URLSearchParams(window.location.search).get("query");
  if (initialQuery && queryInput) {
    queryInput.value = initialQuery;
    performSearch();
  }
});
