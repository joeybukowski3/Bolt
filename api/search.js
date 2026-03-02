import {
  cacheGet,
  cacheSet,
  callGeminiJson,
  getCacheClient,
  normalizeQuery
} from "./_shared.js";

const FAST_API_VERSION = "2026-03-02-fast-v5";
const DETAIL_API_VERSION = "2026-03-02-detail-v4";

const ALLOWED_TIERS = ["Entry Level", "Mid-Grade", "Upper Mid-Grade", "Premium", "Luxury / Designer"];
const ALLOWED_CATEGORIES = [
  "tv", "refrigerator", "washer", "dryer", "dishwasher",
  "hvac", "water_heater", "computer", "small_appliance", "general"
];

function cleanStr(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

// ── Prompts ─────────────────────────────────────────────────────────────────

function getResearchFastPrompt(query, todayIso) {
  return `You are an informational product research assistant used by product research professionals.
Today's date: ${todayIso}
Query: ${query}

CRITICAL — REAL-TIME ACCURACY REQUIRED:
Your training data has a cutoff and may be outdated. Today is ${todayIso}.
You MUST use the google_search tool before answering to verify:
1. Whether the product has been released (products announced before your cutoff may now be available)
2. Current availability status as of ${todayIso}
3. Current retail pricing
4. Whether a newer successor model has launched since your training cutoff
Do NOT state a product is "upcoming", "not yet released", or "announced" based on training data alone — search to confirm the current status first. If search results confirm it is now available, report it as available.

Return JSON only. No markdown. No insurance, claims, settlement, or legal language.
Use concise, technical, property-assessment prose. No marketing language.

Required schema:
{
  "searchTier": 1,
  "analysis": {
    "entered": "string",
    "modelConfidence": "exact or estimated",
    "estimatedModel": "string or null",
    "quickSummary": "string",
    "tier": "Entry Level or Mid-Grade or Upper Mid-Grade or Premium or Luxury / Designer",
    "category": "tv or refrigerator or washer or dryer or dishwasher or hvac or water_heater or computer or small_appliance or general",
    "itemDescription": "string",
    "topSpecs": [{"label": "string", "value": "string"}],
    "launchMsrp": "string or null",
    "launchMsrpNumeric": 0,
    "currentMarketPrice": "string or null",
    "currentMarketPriceNote": "string or null",
    "status": "string"
  },
  "releaseDate": {
    "productionEra": "string or null",
    "discontinuation": "string or null",
    "estimatedAge": "string or null",
    "ageNumeric": 0
  },
  "availability": "string",
  "refineTip": "string or null",
  "variations": [
    {"label": "string", "query": "string", "note": "string or null"}
  ]
}

searchTier classification (CRITICAL — assign exactly one):
- 1 = general term only, no brand, no model (e.g. "water heater", "TV", "refrigerator", "washing machine")
- 2 = product category with no brand or model (e.g. "side by side refrigerator", "front load washer", "65 inch TV")
- 3 = brand + product name or line, but NO alphanumeric model number (e.g. "LG TV", "Samsung refrigerator", "Asus Vivobook 15", "LG Front Load Washer", "Whirlpool top load washer")
- 4 = specific product with alphanumeric model number (e.g. "LG OLED65C3PUA", "Whirlpool WTW5000DW", "Samsung QN65QN90BAFXZA")

Rules:
- itemDescription: 2-4 sentences of professional property-assessment prose. No marketing language.
- topSpecs: Array of 4-5 most value-relevant specs for the category. Maximum 5 items.
  Use category-appropriate labels and concise values:
  TV → Screen Size, Display Technology, Resolution, Refresh Rate, Smart Platform
  Refrigerator → Total Capacity, Configuration, Ice Maker, Smart Features, Energy Rating
  Washer → Capacity, Load Type, Cycle Count, Steam, Smart Features
  Dryer → Capacity, Fuel Type, Cycle Count, Steam, Smart Features
  Dishwasher → Place Settings, Wash Programs, Drying Method, Noise Level (dBA), Smart Features
  HVAC → BTU/Tonnage, SEER Rating, System Type, Zoning, Smart/WiFi
  Water Heater → Tank Capacity, Fuel Type, First Hour Rating, UEF Rating, Smart Features
  Computer/Laptop → Processor, RAM, Storage, Display Size, GPU
  Small Appliance → Wattage/Capacity, Speed Settings, Primary Function, Smart Features
  General → Category, Brand, Key Dimensions, Primary Function, Power/Capacity Rating
- For searchTier 1 or 2: launchMsrp, launchMsrpNumeric, currentMarketPrice must be null. Provide a refineTip explaining what to add to get a full report.
- For searchTier 3 (brand + product line): populate launchMsrp as a typical price RANGE for this product line (e.g. "$799–$1,299"), launchMsrpNumeric as the midpoint, currentMarketPrice as current typical range. Provide a refineTip.
- For searchTier 4 (specific model): populate all fields including exact pricing and ageNumeric.
- estimatedAge sentence example: "First manufactured in January 2019. As of today this item is approximately 5 years old."
- ageNumeric: integer years estimated from production era. Null for tiers 1 and 2.
- availability must be exactly one of:
  "Currently available new from manufacturer and major retailers"
  "Production discontinued — units may still be available from retailers while supplies last"
  "Fully discontinued — no longer available new from any major source"
- variations: array of 2–6 clickable product variations to help the user narrow their search. Rules:
  - searchTier 1 (general term only): return []. Too broad for meaningful variants.
  - searchTier 2 (category, no brand): return 3–5 representative attribute-based variants that highlight meaningful differences, e.g. for "front load washer" → [{label:"Standard Depth", query:"front load washer standard depth", note:"Fits standard 27-inch laundry alcoves"}, ...]. Use dimensions, capacity ranges, smart vs non-smart, fuel type, etc.
  - searchTier 3 (brand + product line): return the most distinct sub-models or configurations, e.g. for "LG Front Load Washer" → [{label:"LG WM4000HWA 4.5 cu ft", query:"LG WM4000HWA", note:"Mid-range 4.5 cu ft, TurboWash"}, ...].
  - searchTier 4 (specific model): return sibling models in the same family (different storage/capacity/display/tier). e.g. for "iPhone 17" → [{label:"iPhone 17 Pro", query:"iPhone 17 Pro", note:"Larger titanium build, pro camera system"}, {label:"iPhone 17 128GB", query:"iPhone 17 128GB", note:null}, ...].
  - label: short display name (≤ 40 chars). query: the search string a user would type. note: 1 sentence max explaining the key difference (null if self-evident from the label).
  - Only include variations that exist as real, currently-available or recently-produced products. Do not fabricate SKUs.
  - Return [] if no meaningful variants exist or cannot be reliably identified.`;
}

function getResearchDetailPrompt(query, todayIso) {
  return `You are an informational product research assistant used by product research professionals.
Today's date: ${todayIso}
Query: ${query}

CRITICAL — REAL-TIME ACCURACY REQUIRED:
Your training data has a cutoff and may be outdated. Today is ${todayIso}.
You MUST use the google_search tool before answering to verify:
1. Current release status of the searched product — if it was "upcoming" in your training data, search to confirm if it has launched by ${todayIso}
2. The CURRENT production model from the same brand for the "Brand Match" column — not the model that was current during your training, but the model available NEW as of ${todayIso}
3. Current retail availability and pricing for all replacement options
4. Any recalls or safety notices issued since your training cutoff
Do NOT list a product as "upcoming" or "not yet released" based on training data alone. Search and verify first.

Return JSON only. No markdown. No insurance, claims, settlement, or legal language.

First, classify the query:
- searchTier 4: specific model with alphanumeric model number (e.g. "LG OLED65C3PUA")
- searchTier 3: brand + product name or line, no model number (e.g. "LG OLED TV", "Asus Vivobook 15", "LG Front Load Washer")
- searchTier 2: category only, no brand (e.g. "side by side refrigerator", "front load washer", "65 inch TV")
- searchTier 1: general term only (e.g. "TV", "washer")

Based on searchTier, use the correct tableMode:
- searchTier 4: tableMode = "standard"  (5-column: Original Item, Brand Match, Option 1, Option 2)
- searchTier 3: tableMode = "product-line"  (5-column: same structure, but Original = the product line baseline)
- searchTier 2 or 1: tableMode = "tiered"  (3-column: Entry Level, Mid-Grade, Premium)

Required schema:
{
  "searchTier": 4,
  "tableMode": "standard or product-line or tiered",
  "tableNote": "string or null",
  "narrowYourResults": "string or null",
  "itemNotes": {
    "lkqEvaluation": {
      "tier": "string",
      "mustMatchSpecs": ["string"],
      "acceptableVariation": ["string"]
    },
    "availabilityDetail": "string"
  },
  "table": [],
  "dynamicRows": [],
  "howItWorks": "string",
  "recalls": [
    {"title": "string", "description": "string", "date": "string", "url": "https://..."}
  ],
  "recallsNone": false,
  "errorCodes": [
    {"code": "string", "meaning": "string", "likelyCause": "string"}
  ],
  "errorCodesApplicable": true,
  "failures": [
    {"component": "string", "whyItFails": "string", "symptoms": "string"}
  ],
  "manual": {"title": "string or null", "url": "https://... or null"},
  "manufacturerPage": {"url": "https://... or null", "label": "string or null"},
  "troubleshooting": {
    "steps": ["string"],
    "repairResources": [{"name": "string", "url": "https://..."}]
  },
  "technicalSpecs": "string",
  "materials": "string",
  "serviceLife": "string"
}

--- TABLE FORMAT BY MODE ---

If tableMode = "standard" or "product-line":
table must contain these 7 rows in order:
[
  {"label": "Model", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
  {"label": "Recommended Replacement", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
  {"label": "Size / Capacity", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
  {"label": "Price (New)", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
  {"label": "Availability", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
  {"label": "Retailers", "original": "Best Buy,Walmart", "brandMatch": "Best Buy,Walmart", "option1": "Best Buy,Walmart", "option2": "Best Buy,Walmart"},
  {"label": "Notes", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"}
]
dynamicRows: 0-4 additional rows using the same {label, original, brandMatch, option1, option2} format.

Column rules for standard/product-line:
- "Original Item": the specific model searched (standard) or the product line baseline model (product-line).
- "Brand Match": The CURRENT production successor from the same brand — must be currently available new. For product-line, use the latest generation model.
- "Option 1" / "Option 2": Currently available new items from different brands. Do NOT list discontinued, refurbished, or used items.
- tableNote for product-line: "No specific model number was provided. Replacement options are based on the [Brand] [Product Line] product line, using the most recent production model as the baseline."
- Notes row: For Brand Match, explain generational context. For options, note key difference vs. Brand Match.

If tableMode = "tiered":
table must contain these rows in order:
[
  {"label": "Model", "entryLevel": "string", "midGrade": "string", "premium": "string"},
  {"label": "Price Range (New)", "entryLevel": "string", "midGrade": "string", "premium": "string"},
  {"label": "Size / Capacity", "entryLevel": "string", "midGrade": "string", "premium": "string"},
  {"label": "Availability", "entryLevel": "string", "midGrade": "string", "premium": "string"},
  {"label": "Retailers", "entryLevel": "Best Buy,Walmart", "midGrade": "Best Buy,Walmart", "premium": "Best Buy,Walmart"},
  {"label": "Notes", "entryLevel": "string", "midGrade": "string", "premium": "string"}
]
dynamicRows: 3-5 rows using {label, entryLevel, midGrade, premium} for differentiating specs (e.g. for TVs: Display Technology, Resolution, Refresh Rate; for appliances: Load Type, Capacity, Key Features).
Each tier must reference a real, currently available product. Use actual model names.
tableNote for tiered: "Your search did not include a specific brand or model. The following table compares representative options across three price tiers."

--- narrowYourResults ---
Provide narrowYourResults only for searchTier 1, 2, or 3 (not 4). This is a short paragraph (2-3 sentences) suggesting what to add to get a more specific report. Be category-specific:
- Refrigerators: suggest brand, configuration (side-by-side, French door, top/bottom freezer), and cubic footage.
- TVs: suggest brand, screen size (in inches), and display technology (OLED, QLED, LED).
- Laptops/Computers: suggest brand, intended use (gaming, business, home), and budget range.
- Washers/Dryers: suggest brand, load type (front-load, top-load), and capacity (cu ft).
- HVAC: suggest system type (central, mini-split, window unit), BTU/tonnage, and brand.
- Water Heaters: suggest fuel type (gas, electric, heat pump), tank size, and brand.
- General: suggest brand, model name, or model number for the most accurate report.

--- Other rules ---
- itemNotes: only relevant for searchTier 3 and 4. For tiers 1-2, use empty values.
- howItWorks: 3 sentences — what it does, how it works mechanically, why specs matter for replacement.
- recalls: only verified CPSC, government, or manufacturer-initiated recalls. If recallsNone is true, recalls must be [].
- errorCodes: only if applicable. If errorCodesApplicable is false, errorCodes must be [].
- failures: 3-6 common failure modes.
- manual.url and manufacturerPage.url: https:// URL if known, null if uncertain.
- troubleshooting: 3-6 actionable steps. repairResources: include RepairClinic, AppliancePartsPros, SearsPartsDirect where applicable.
- technicalSpecs: full comma-separated spec list.
- serviceLife: estimated useful life range (e.g. "8-12 years").`;
}

// ── Sanitizers ───────────────────────────────────────────────────────────────

function sanitizeFastPayload(payload, query) {
  const src = payload && typeof payload === "object" ? payload : {};
  const analysis = src.analysis && typeof src.analysis === "object" ? src.analysis : {};
  const releaseDate = src.releaseDate && typeof src.releaseDate === "object" ? src.releaseDate : {};

  const searchTier = [1, 2, 3, 4].includes(Number(src.searchTier)) ? Number(src.searchTier) : 1;
  const tier = ALLOWED_TIERS.includes(analysis.tier) ? analysis.tier : "Entry Level";
  const category = ALLOWED_CATEGORIES.includes(analysis.category) ? analysis.category : "general";
  const launchMsrpNumeric = typeof analysis.launchMsrpNumeric === "number" ? analysis.launchMsrpNumeric : null;
  const ageNumeric =
    typeof releaseDate.ageNumeric === "number" ? Math.max(0, Math.round(releaseDate.ageNumeric)) : null;

  return {
    searchTier,
    analysis: {
      entered: cleanStr(analysis.entered) || query,
      modelConfidence: ["exact", "estimated"].includes(analysis.modelConfidence)
        ? analysis.modelConfidence
        : "estimated",
      estimatedModel: cleanStr(analysis.estimatedModel),
      quickSummary: cleanStr(analysis.quickSummary) || query,
      tier,
      category,
      itemDescription: cleanStr(analysis.itemDescription) || "No description available.",
      topSpecs: Array.isArray(analysis.topSpecs)
        ? analysis.topSpecs
            .slice(0, 5)
            .map((s) => ({
              label: cleanStr(s?.label) || "",
              value: cleanStr(s?.value) || ""
            }))
            .filter((s) => s.label && s.value)
        : [],
      launchMsrp: searchTier >= 3 ? cleanStr(analysis.launchMsrp) : null,
      launchMsrpNumeric: searchTier >= 3 ? launchMsrpNumeric : null,
      currentMarketPrice: searchTier >= 3 ? cleanStr(analysis.currentMarketPrice) : null,
      currentMarketPriceNote: searchTier >= 3 ? cleanStr(analysis.currentMarketPriceNote) : null,
      status: cleanStr(analysis.status) || "Unknown"
    },
    releaseDate: {
      productionEra: cleanStr(releaseDate.productionEra),
      discontinuation: cleanStr(releaseDate.discontinuation),
      estimatedAge: cleanStr(releaseDate.estimatedAge),
      ageNumeric: searchTier >= 3 ? ageNumeric : null
    },
    availability: cleanStr(src.availability) || "Status unknown",
    refineTip:
      searchTier < 4 ? cleanStr(src.refineTip) || "Add a specific model number for a full report." : null,
    variations: Array.isArray(src.variations)
      ? src.variations
          .slice(0, 6)
          .map((v) => ({
            label: cleanStr(v?.label) || "",
            query: cleanStr(v?.query) || "",
            note:  cleanStr(v?.note)  || null
          }))
          .filter((v) => v.label && v.query)
      : []
  };
}

function sanitizeDetailPayload(payload, query) {
  const src = payload && typeof payload === "object" ? payload : {};
  const itemNotes = src.itemNotes && typeof src.itemNotes === "object" ? src.itemNotes : {};
  const lkqEval =
    itemNotes.lkqEvaluation && typeof itemNotes.lkqEvaluation === "object" ? itemNotes.lkqEvaluation : {};
  const ts = src.troubleshooting && typeof src.troubleshooting === "object" ? src.troubleshooting : {};
  const manual = src.manual && typeof src.manual === "object" ? src.manual : {};
  const mfrPage = src.manufacturerPage && typeof src.manufacturerPage === "object" ? src.manufacturerPage : {};

  const tableMode = ["standard", "product-line", "tiered"].includes(src.tableMode)
    ? src.tableMode
    : "standard";
  const isTiered = tableMode === "tiered";

  const table = Array.isArray(src.table)
    ? src.table.map((row) => {
        const base = { label: cleanStr(row?.label) || "" };
        if (isTiered) {
          return {
            ...base,
            entryLevel: cleanStr(row?.entryLevel) || "N/A",
            midGrade: cleanStr(row?.midGrade) || "N/A",
            premium: cleanStr(row?.premium) || "N/A"
          };
        }
        return {
          ...base,
          original: cleanStr(row?.original) || "N/A",
          brandMatch: cleanStr(row?.brandMatch) || "N/A",
          option1: cleanStr(row?.option1) || "N/A",
          option2: cleanStr(row?.option2) || "N/A"
        };
      })
    : [];

  const dynamicRows = Array.isArray(src.dynamicRows)
    ? src.dynamicRows.slice(0, 5).map((row) => {
        const base = { label: cleanStr(row?.label) || "" };
        if (isTiered) {
          return {
            ...base,
            entryLevel: cleanStr(row?.entryLevel) || "N/A",
            midGrade: cleanStr(row?.midGrade) || "N/A",
            premium: cleanStr(row?.premium) || "N/A"
          };
        }
        return {
          ...base,
          original: cleanStr(row?.original) || "N/A",
          brandMatch: cleanStr(row?.brandMatch) || "N/A",
          option1: cleanStr(row?.option1) || "N/A",
          option2: cleanStr(row?.option2) || "N/A"
        };
      })
    : [];

  const recalls = Array.isArray(src.recalls)
    ? src.recalls
        .map((r) => ({
          title: cleanStr(r?.title) || "",
          description: cleanStr(r?.description) || "",
          date: cleanStr(r?.date) || "",
          url: typeof r?.url === "string" && /^https?:\/\//i.test(r.url) ? r.url : null
        }))
        .filter((r) => r.title)
    : [];

  const errorCodes = Array.isArray(src.errorCodes)
    ? src.errorCodes
        .map((e) => ({
          code: cleanStr(e?.code) || "",
          meaning: cleanStr(e?.meaning) || "",
          likelyCause: cleanStr(e?.likelyCause) || ""
        }))
        .filter((e) => e.code)
    : [];

  const failures = Array.isArray(src.failures)
    ? src.failures
        .slice(0, 6)
        .map((f) => ({
          component: cleanStr(f?.component) || "",
          whyItFails: cleanStr(f?.whyItFails) || "",
          symptoms: cleanStr(f?.symptoms) || ""
        }))
        .filter((f) => f.component)
    : [];

  const steps = Array.isArray(ts.steps)
    ? ts.steps.map((s) => cleanStr(s)).filter(Boolean).slice(0, 6)
    : [];

  const repairResources = Array.isArray(ts.repairResources)
    ? ts.repairResources
        .map((r) => ({
          name: cleanStr(r?.name) || "",
          url: typeof r?.url === "string" && /^https?:\/\//i.test(r.url) ? r.url : null
        }))
        .filter((r) => r.name && r.url)
    : [];

  const manualUrl =
    typeof manual.url === "string" && /^https?:\/\//i.test(manual.url) ? manual.url : null;
  const mfrUrl =
    typeof mfrPage.url === "string" && /^https?:\/\//i.test(mfrPage.url) ? mfrPage.url : null;

  return {
    searchTier: [1, 2, 3, 4].includes(Number(src.searchTier)) ? Number(src.searchTier) : 1,
    tableMode,
    tableNote: cleanStr(src.tableNote) || null,
    narrowYourResults: cleanStr(src.narrowYourResults) || null,
    itemNotes: {
      lkqEvaluation: {
        tier: cleanStr(lkqEval.tier) || "",
        mustMatchSpecs: Array.isArray(lkqEval.mustMatchSpecs)
          ? lkqEval.mustMatchSpecs.map((s) => cleanStr(s)).filter(Boolean)
          : [],
        acceptableVariation: Array.isArray(lkqEval.acceptableVariation)
          ? lkqEval.acceptableVariation.map((s) => cleanStr(s)).filter(Boolean)
          : []
      },
      availabilityDetail: cleanStr(itemNotes.availabilityDetail) || ""
    },
    table,
    dynamicRows,
    howItWorks: cleanStr(src.howItWorks) || "No description available.",
    recalls,
    recallsNone: src.recallsNone === true || recalls.length === 0,
    errorCodes,
    errorCodesApplicable: src.errorCodesApplicable !== false,
    failures,
    manual: { title: cleanStr(manual.title), url: manualUrl },
    manufacturerPage: { url: mfrUrl, label: cleanStr(mfrPage.label) },
    troubleshooting: { steps, repairResources },
    technicalSpecs: cleanStr(src.technicalSpecs) || "",
    materials: cleanStr(src.materials) || "",
    serviceLife: cleanStr(src.serviceLife) || ""
  };
}

// ── Mode runners ─────────────────────────────────────────────────────────────

async function runFastMode(query, apiKey, model, refresh, cacheClient, todayIso) {
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = `search:v6:fast:${model}:${todayIso}:${normalizedQuery}`;

  if (!refresh) {
    const cached = await cacheGet(cacheClient, cacheKey);
    if (cached) return { data: cached, cached: true };
  }

  const prompt = getResearchFastPrompt(query, todayIso);
  let result = await callGeminiJson({ apiKey, model, prompt, withSearchTool: true, temperature: 0.1 });

  if (
    result.response.status === 400 &&
    /tool|google_search/i.test(String(result.payload?.error?.message || ""))
  ) {
    result = await callGeminiJson({ apiKey, model, prompt, withSearchTool: false, temperature: 0.1 });
  }

  if (!result.response.ok) {
    return { error: result.payload?.error?.message || "Fast mode failed.", status: result.response.status };
  }

  const text = result.payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (_) {}
  }

  const finalData = sanitizeFastPayload(parsed, query);
  finalData.meta = { mode: "research-fast", version: FAST_API_VERSION, as_of: todayIso };
  await cacheSet(cacheClient, cacheKey, finalData, 900);
  return { data: finalData, cached: false };
}

async function runDetailMode(query, apiKey, model, refresh, cacheClient, todayIso) {
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = `search:v5:detail:${model}:${todayIso}:${normalizedQuery}`;

  if (!refresh) {
    const cached = await cacheGet(cacheClient, cacheKey);
    if (cached) return { data: cached, cached: true };
  }

  const prompt = getResearchDetailPrompt(query, todayIso);
  let result = await callGeminiJson({ apiKey, model, prompt, withSearchTool: true, temperature: 0.1 });

  if (
    result.response.status === 400 &&
    /tool|google_search/i.test(String(result.payload?.error?.message || ""))
  ) {
    result = await callGeminiJson({ apiKey, model, prompt, withSearchTool: false, temperature: 0.1 });
  }

  if (!result.response.ok) {
    return { error: result.payload?.error?.message || "Detail mode failed.", status: result.response.status };
  }

  const text = result.payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (_) {}
  }

  const finalData = sanitizeDetailPayload(parsed, query);
  finalData.meta = { mode: "research-detail", version: DETAIL_API_VERSION, as_of: todayIso };
  await cacheSet(cacheClient, cacheKey, finalData, 900);
  return { data: finalData, cached: false };
}

async function runAgeMode(query, apiKey, model) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const prompt = `You decode age for products from model or serial context.
Date: ${todayIso}
Query: ${query}

Return JSON only:
{
  "releaseDate": {
    "estimatedAge": "short estimate",
    "productionEra": "YYYY-YYYY or unknown"
  },
  "analysis": {
    "decodingMethod": {
      "available": true,
      "summary": "short summary",
      "details": "brief details"
    }
  },
  "howItWorks": "short explanation"
}`;
  const { response, payload, rawText } = await callGeminiJson({
    apiKey,
    model,
    prompt,
    withSearchTool: false,
    temperature: 0.1
  });
  if (!response.ok) {
    return { error: payload?.error?.message || `Upstream error ${response.status}`, status: 500 };
  }
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = text ? JSON.parse(text.replace(/```json|```/g, "").trim()) : null;
  if (!parsed) {
    return { error: `Could not parse response: ${rawText.slice(0, 120)}`, status: 500 };
  }
  return { data: parsed, status: 200 };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const query = String(req.query?.query || "").trim();
  const mode = String(req.query?.mode || "research-fast");
  const refresh = req.query?.refresh === "1";
  const apiKey = process.env.GEMINI_API_KEY;
  const rawModel = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
  const model = rawModel.startsWith("models/") ? rawModel.slice("models/".length) : rawModel;
  const todayIso = new Date().toISOString().slice(0, 10);

  if (!apiKey) return res.status(500).json({ error: "API Key missing in Vercel settings." });
  if (!query) return res.status(400).json({ error: "Missing query parameter." });

  res.setHeader("x-gemini-model", model);

  // Age mode — unchanged for item-age.html compatibility
  if (mode === "age") {
    const ageResult = await runAgeMode(query, apiKey, model);
    if (ageResult.error) return res.status(ageResult.status).json({ error: ageResult.error });
    return res.status(200).json(ageResult.data);
  }

  const cacheClient = getCacheClient();

  // Detail mode
  if (mode === "research-detail") {
    try {
      const result = await runDetailMode(query, apiKey, model, refresh, cacheClient, todayIso);
      if (result.error) {
        const fb = sanitizeDetailPayload(null, query);
        fb.error = result.error;
        fb.meta = { mode: "research-detail", version: DETAIL_API_VERSION, as_of: todayIso, degraded: true };
        return res.status(200).json(fb);
      }
      res.setHeader("x-cache", result.cached ? "HIT" : "MISS");
      res.setHeader("x-detail-version", DETAIL_API_VERSION);
      return res.status(200).json(result.data);
    } catch (err) {
      console.error("Detail mode error:", err);
      const fb = sanitizeDetailPayload(null, query);
      fb.error = "Could not generate detail report.";
      fb.meta = { mode: "research-detail", version: DETAIL_API_VERSION, as_of: todayIso, degraded: true };
      return res.status(200).json(fb);
    }
  }

  // Fast mode (also handles mode=research for backward compat)
  try {
    const result = await runFastMode(query, apiKey, model, refresh, cacheClient, todayIso);
    if (result.error) {
      const fb = sanitizeFastPayload(null, query);
      fb.error = result.error;
      fb.meta = { mode: "research-fast", version: FAST_API_VERSION, as_of: todayIso, degraded: true };
      return res.status(200).json(fb);
    }
    res.setHeader("x-cache", result.cached ? "HIT" : "MISS");
    res.setHeader("x-fast-version", FAST_API_VERSION);
    return res.status(200).json(result.data);
  } catch (err) {
    console.error("Fast mode error:", err);
    const fb = sanitizeFastPayload(null, query);
    fb.error = "Could not generate report, please refine query.";
    fb.meta = { mode: "research-fast", version: FAST_API_VERSION, as_of: todayIso, degraded: true };
    return res.status(200).json(fb);
  }
}
