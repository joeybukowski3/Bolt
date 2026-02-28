import {
  cacheGet,
  cacheSet,
  callGeminiJson,
  getCacheClient,
  normalizeQuery
} from "./_shared.js";

const FAST_API_VERSION = "2026-02-28-fast-v1";
const DETAIL_API_VERSION = "2026-02-28-detail-v1";

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
Date: ${todayIso}
Query: ${query}

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
    "keyDetails": "string",
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
  "refineTip": "string or null"
}

searchTier values:
- 1 = general term only (e.g. "water heater", "TV") — no brand or model identified
- 2 = brand + category (e.g. "LG TV", "Samsung refrigerator") — no specific model
- 3 = specific model identified (e.g. "LG OLED65C3PUA", "Whirlpool WTW5000DW")

Rules:
- itemDescription: 2-4 sentences of professional property-assessment prose. No marketing language.
- keyDetails: comma-separated replacement-relevant specs only.
- For searchTier 1 or 2: launchMsrp, launchMsrpNumeric, currentMarketPrice must be null.
- For searchTier 1 or 2: provide a refineTip explaining what to add to get a full report.
- For searchTier 3: populate all fields including pricing and ageNumeric.
- estimatedAge sentence example: "First manufactured in January 2019. As of today this item is approximately 5 years old."
- ageNumeric: integer years estimated from production era.
- availability must be exactly one of:
  "Currently available new from manufacturer and major retailers"
  "Production discontinued — units may still be available from retailers while supplies last"
  "Fully discontinued — no longer available new from any major source"`;
}

function getResearchDetailPrompt(query, todayIso) {
  return `You are an informational product research assistant used by product research professionals.
Date: ${todayIso}
Query: ${query}

Return JSON only. No markdown. No insurance, claims, settlement, or legal language.

Required schema:
{
  "searchTier": 3,
  "itemNotes": {
    "lkqEvaluation": {
      "tier": "string",
      "mustMatchSpecs": ["string"],
      "acceptableVariation": ["string"]
    },
    "availabilityDetail": "string"
  },
  "table": [
    {"label": "Model", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
    {"label": "Recommended Replacement", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
    {"label": "Size / Capacity", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
    {"label": "Price (New)", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
    {"label": "Availability", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"},
    {"label": "Retailers", "original": "Best Buy,Walmart", "brandMatch": "Best Buy,Walmart", "option1": "Best Buy,Walmart", "option2": "Best Buy,Walmart"},
    {"label": "Notes", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"}
  ],
  "dynamicRows": [
    {"label": "string", "original": "string", "brandMatch": "string", "option1": "string", "option2": "string"}
  ],
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

Rules:
- table: include all 7 required rows in the exact order shown.
- Retailers row values: comma-separated list from: Best Buy, Home Depot, Lowe's, Manufacturer, AJ Madison, B&H, Walmart, Target.
- dynamicRows: 0-4 category-specific rows (TVs: Resolution, Display Technology, Refresh Rate, HDR; appliances: Load Type, Capacity, etc.).
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

  const searchTier = [1, 2, 3].includes(Number(src.searchTier)) ? Number(src.searchTier) : 1;
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
      keyDetails: cleanStr(analysis.keyDetails) || "",
      launchMsrp: searchTier === 3 ? cleanStr(analysis.launchMsrp) : null,
      launchMsrpNumeric: searchTier === 3 ? launchMsrpNumeric : null,
      currentMarketPrice: searchTier === 3 ? cleanStr(analysis.currentMarketPrice) : null,
      currentMarketPriceNote: searchTier === 3 ? cleanStr(analysis.currentMarketPriceNote) : null,
      status: cleanStr(analysis.status) || "Unknown"
    },
    releaseDate: {
      productionEra: cleanStr(releaseDate.productionEra),
      discontinuation: cleanStr(releaseDate.discontinuation),
      estimatedAge: cleanStr(releaseDate.estimatedAge),
      ageNumeric: searchTier === 3 ? ageNumeric : null
    },
    availability: cleanStr(src.availability) || "Status unknown",
    refineTip:
      searchTier < 3 ? cleanStr(src.refineTip) || "Add a specific model number for a full report." : null
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

  const table = Array.isArray(src.table)
    ? src.table.map((row) => ({
        label: cleanStr(row?.label) || "",
        original: cleanStr(row?.original) || "N/A",
        brandMatch: cleanStr(row?.brandMatch) || "N/A",
        option1: cleanStr(row?.option1) || "N/A",
        option2: cleanStr(row?.option2) || "N/A"
      }))
    : [];

  const dynamicRows = Array.isArray(src.dynamicRows)
    ? src.dynamicRows.slice(0, 4).map((row) => ({
        label: cleanStr(row?.label) || "",
        original: cleanStr(row?.original) || "N/A",
        brandMatch: cleanStr(row?.brandMatch) || "N/A",
        option1: cleanStr(row?.option1) || "N/A",
        option2: cleanStr(row?.option2) || "N/A"
      }))
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
    searchTier: [1, 2, 3].includes(Number(src.searchTier)) ? Number(src.searchTier) : 1,
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
  const cacheKey = `search:v3:fast:${model}:${todayIso}:${normalizedQuery}`;

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
  const cacheKey = `search:v3:detail:${model}:${todayIso}:${normalizedQuery}`;

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
