import {
  PHASE1_API_VERSION,
  cacheGet,
  cacheSet,
  callGeminiJson,
  cleanRetailerNames,
  getCacheClient,
  normalizeQuery
} from "./_shared.js";

const REQUIRED_ROWS = [
  "Model",
  "Recommended Replacement",
  "Size/Capacity",
  "Price",
  "Availability",
  "Retailers",
  "Notes"
];

const CATEGORY_DYNAMIC_ROWS = {
  tv: ["Resolution Class", "Display Tech", "Refresh Tier", "HDR Tier"],
  refrigerator: ["Door Config", "Ice/Dispenser", "Counter-Depth", "Capacity Class"],
  washer: ["Load Type", "Capacity", "Cycles/Steam"],
  dishwasher: ["Noise Tier (dBA)", "Cycles", "Drying System"],
  "water heater": ["Fuel Type", "Capacity", "Recovery/BTU", "Venting Type"],
  hvac: ["SEER/Efficiency Tier", "Tonnage/BTU", "Stages", "Heat Type"]
};

const SIZE_REQUIRED_CATEGORIES = ["tv", "refrigerator", "washer", "water heater", "hvac"];

function pickCategoryKey(category) {
  const c = String(category || "").toLowerCase();
  if (c.includes("tv") || c.includes("television")) return "tv";
  if (c.includes("refrigerator") || c.includes("fridge")) return "refrigerator";
  if (c.includes("washer") || c.includes("washing")) return "washer";
  if (c.includes("dishwasher")) return "dishwasher";
  if (c.includes("water heater")) return "water heater";
  if (c.includes("hvac") || c.includes("air conditioner") || c.includes("furnace")) return "hvac";
  return "";
}

function defaultPhase1(query) {
  return {
    query: String(query || ""),
    result_type: "generic_category",
    confidence: "low",
    detected: {
      brand: null,
      category: null,
      model: null,
      size_or_capacity: null
    },
    assumptions_used: [],
    snapshot: {
      item_description:
        "Could not generate a complete report for this query. Try adding brand, model, and size details.",
      comparable_factors: [
        "Product category and intended use",
        "Core performance requirements",
        "Size or capacity match",
        "Installation and compatibility constraints"
      ]
    },
    release_age: {
      production_era: null,
      estimated_age_years: null,
      age_note: "Add a specific model to generate a reliable age estimate."
    },
    availability_status: null,
    replacement_table: {
      columns: ["Original Item", "Brand Match", "Option 1", "Option 2"],
      required_rows: [...REQUIRED_ROWS],
      dynamic_rows: [],
      cells: {}
    },
    how_it_works:
      "This tool compares item class, fit, and performance characteristics to build replacement guidance.",
    common_failures: [
      "Wear-related component degradation",
      "Power or control board instability",
      "Sensor drift or calibration issues",
      "Mechanical fatigue in moving assemblies",
      "Thermal stress or airflow restrictions"
    ],
    troubleshooting: {
      steps: [
        "Confirm input power and basic safety cutoffs.",
        "Verify visible connections, filters, and vents.",
        "Run manufacturer self-checks if available."
      ],
      repair_links: []
    },
    refinement_prompts: ["Add brand and model number", "Add size or capacity", "Add a full model label"],
    pricing: {
      eligible: false,
      reason: "Refine query to a specific model with size or capacity before generating informational pricing.",
      original_msrp: null,
      typical_new_price: null,
      depreciation_rate_percent: null,
      base_years: null
    }
  };
}

function cleanText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function detectResultTypeFromData(out) {
  const hasModel = !!out.detected.model;
  const hasBrand = !!out.detected.brand;
  const hasCategory = !!out.detected.category;
  if (hasModel) return "specific_model";
  if (hasBrand && hasCategory) return "brand_category";
  return "generic_category";
}

function valuationEligible(out) {
  if (out.result_type !== "specific_model") return false;
  if (out.confidence === "low") return false;
  if (!out.detected.model) return false;
  const categoryKey = pickCategoryKey(out.detected.category);
  if (SIZE_REQUIRED_CATEGORIES.includes(categoryKey) && !out.detected.size_or_capacity) return false;
  return true;
}

function sanitizeTable(out) {
  const table = out.replacement_table || {};
  table.columns = ["Original Item", "Brand Match", "Option 1", "Option 2"];
  table.required_rows = [...REQUIRED_ROWS];
  const categoryKey = pickCategoryKey(out.detected.category);
  const dynamicRows = CATEGORY_DYNAMIC_ROWS[categoryKey] || [];
  table.dynamic_rows = dynamicRows.slice(0, 4);
  const finalRows = [...REQUIRED_ROWS, ...table.dynamic_rows];
  const cells = {};

  for (const row of finalRows) {
    const rawRow = table.cells?.[row] || {};
    cells[row] = {
      "Original Item": cleanText(rawRow["Original Item"]) || "N/A",
      "Brand Match": cleanText(rawRow["Brand Match"]) || "N/A",
      "Option 1": cleanText(rawRow["Option 1"]) || "N/A",
      "Option 2": cleanText(rawRow["Option 2"]) || "N/A"
    };
  }

  const retailerRows = cleanRetailerNames(cells.Retailers["Brand Match"]);
  const retailerText = retailerRows.join(" | ");
  cells.Retailers["Original Item"] = retailerText;
  cells.Retailers["Brand Match"] = retailerText;
  cells.Retailers["Option 1"] = retailerText;
  cells.Retailers["Option 2"] = retailerText;

  if (out.result_type !== "specific_model") {
    cells.Price["Original Item"] = "Refine query for model-specific pricing";
    cells.Price["Brand Match"] = "Not shown for this query type";
    cells.Price["Option 1"] = "Not shown for this query type";
    cells.Price["Option 2"] = "Not shown for this query type";
  }

  table.cells = cells;
  out.replacement_table = table;
}

function sanitizePhase1Payload(payload, query) {
  const fallback = defaultPhase1(query);
  const source = payload && typeof payload === "object" ? payload : {};
  const out = { ...fallback };
  out.query = String(source.query || query || "");
  out.confidence = ["high", "medium", "low"].includes(source.confidence) ? source.confidence : "low";
  out.detected = {
    brand: cleanText(source.detected?.brand),
    category: cleanText(source.detected?.category),
    model: cleanText(source.detected?.model),
    size_or_capacity: cleanText(source.detected?.size_or_capacity)
  };
  out.result_type = ["specific_model", "brand_category", "generic_category"].includes(source.result_type)
    ? source.result_type
    : detectResultTypeFromData(out);
  out.assumptions_used = Array.isArray(source.assumptions_used)
    ? source.assumptions_used.map((x) => String(x)).slice(0, 8)
    : [];
  out.snapshot = {
    item_description:
      cleanText(source.snapshot?.item_description) || fallback.snapshot.item_description,
    comparable_factors: Array.isArray(source.snapshot?.comparable_factors)
      ? source.snapshot.comparable_factors.map((x) => String(x)).slice(0, 8)
      : fallback.snapshot.comparable_factors
  };
  out.release_age = {
    production_era: cleanText(source.release_age?.production_era),
    estimated_age_years:
      typeof source.release_age?.estimated_age_years === "number"
        ? source.release_age.estimated_age_years
        : null,
    age_note: cleanText(source.release_age?.age_note)
  };
  out.availability_status = ["in_production", "discontinued_limited_new", "fully_discontinued"].includes(
    source.availability_status
  )
    ? source.availability_status
    : null;
  out.how_it_works = cleanText(source.how_it_works) || fallback.how_it_works;
  out.common_failures = Array.isArray(source.common_failures)
    ? source.common_failures.map((x) => String(x)).slice(0, 8)
    : fallback.common_failures;
  out.troubleshooting = {
    steps: Array.isArray(source.troubleshooting?.steps)
      ? source.troubleshooting.steps.map((x) => String(x)).slice(0, 6)
      : fallback.troubleshooting.steps,
    repair_links: Array.isArray(source.troubleshooting?.repair_links)
      ? source.troubleshooting.repair_links
          .map((x) => ({
            label: String(x?.label || "").trim(),
            url: String(x?.url || "").trim()
          }))
          .filter((x) => x.label && /^https?:\/\//i.test(x.url))
          .slice(0, 8)
      : []
  };
  out.refinement_prompts = Array.isArray(source.refinement_prompts)
    ? source.refinement_prompts.map((x) => String(x)).slice(0, 8)
    : fallback.refinement_prompts;
  out.replacement_table = source.replacement_table || fallback.replacement_table;
  sanitizeTable(out);

  const eligible = valuationEligible(out);
  const pricing = source.pricing && typeof source.pricing === "object" ? source.pricing : {};
  out.pricing = {
    eligible,
    reason: eligible
      ? null
      : "Refine query to a specific model with confirmed size or capacity for informational pricing.",
    original_msrp: eligible ? cleanText(pricing.original_msrp) : null,
    typical_new_price: eligible ? cleanText(pricing.typical_new_price) : null,
    depreciation_rate_percent:
      eligible && typeof pricing.depreciation_rate_percent === "number"
        ? pricing.depreciation_rate_percent
        : null,
    base_years: eligible && typeof pricing.base_years === "number" ? pricing.base_years : null
  };

  if (!eligible) {
    out.release_age.estimated_age_years = null;
    out.release_age.age_note =
      out.release_age.age_note ||
      "Add exact model and size/capacity details to unlock age and informational pricing estimates.";
  }

  if (out.result_type === "generic_category") {
    out.pricing.eligible = false;
    out.pricing.reason = "Broad category query. Add brand and model for pricing or replacement estimates.";
  }

  return out;
}

function getPhase1Prompt(query, todayIso) {
  return `You are an informational product lookup assistant.
Date: ${todayIso}
Query: ${query}

Return JSON only. No markdown.
Use concise, technical, replacement-focused language.
Never include legal or settlement language.

Required schema:
{
  "query": string,
  "result_type": "specific_model" | "brand_category" | "generic_category",
  "confidence": "high" | "medium" | "low",
  "detected": {
    "brand": string|null,
    "category": string|null,
    "model": string|null,
    "size_or_capacity": string|null
  },
  "assumptions_used": string[],
  "snapshot": {
    "item_description": string,
    "comparable_factors": string[]
  },
  "release_age": {
    "production_era": string|null,
    "estimated_age_years": number|null,
    "age_note": string|null
  },
  "availability_status": "in_production" | "discontinued_limited_new" | "fully_discontinued" | null,
  "replacement_table": {
    "columns": ["Original Item","Brand Match","Option 1","Option 2"],
    "required_rows": ["Model","Recommended Replacement","Size/Capacity","Price","Availability","Retailers","Notes"],
    "dynamic_rows": string[],
    "cells": {
      "<rowName>": {
        "Original Item": string,
        "Brand Match": string,
        "Option 1": string,
        "Option 2": string
      }
    }
  },
  "how_it_works": string,
  "common_failures": string[],
  "troubleshooting": {
    "steps": string[],
    "repair_links": [{"label": string, "url": string}]
  },
  "refinement_prompts": string[],
  "pricing": {
    "original_msrp": string|null,
    "typical_new_price": string|null,
    "depreciation_rate_percent": number|null,
    "base_years": number|null
  }
}

Rules:
- For generic_category: no pricing values; include refinement prompts.
- For brand_category: no valuation/depreciation numbers.
- Keep item_description to 2-4 sentences.
- comparable_factors must be 4-8 short bullets.
- common_failures must be 5-8 short bullets.
- Only use major national retailers in Retailers row: Best Buy, Home Depot, Lowe's, Manufacturer, AJ Madison, B&H, Walmart, Target.
- If exact product page is uncertain, use retailer names only.`;
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
    return {
      error: payload?.error?.message || `Upstream error ${response.status}`,
      status: 500
    };
  }
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = text ? JSON.parse(text.replace(/```json|```/g, "").trim()) : null;
  if (!parsed) {
    return {
      error: `Could not parse response: ${rawText.slice(0, 120)}`,
      status: 500
    };
  }
  return { data: parsed, status: 200 };
}

export default async function handler(req, res) {
  const query = String(req.query?.query || "").trim();
  const mode = String(req.query?.mode || "research");
  const refresh = req.query?.refresh === "1";
  const apiKey = process.env.GEMINI_API_KEY;
  const rawModel = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
  const model = rawModel.startsWith("models/") ? rawModel.slice("models/".length) : rawModel;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key missing in Vercel settings." });
  }
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter." });
  }

  res.setHeader("x-gemini-model", model);

  if (mode === "age") {
    const ageResult = await runAgeMode(query, apiKey, model);
    if (ageResult.error) return res.status(ageResult.status).json({ error: ageResult.error });
    return res.status(200).json(ageResult.data);
  }

  const cacheClient = getCacheClient();
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = `item:phase1:v1:${model}:${normalizedQuery}`;
  res.setHeader("x-phase1-version", PHASE1_API_VERSION);

  if (!refresh) {
    const cached = await cacheGet(cacheClient, cacheKey);
    if (cached) {
      res.setHeader("x-cache", "HIT");
      return res.status(200).json(cached);
    }
  }
  res.setHeader("x-cache", "MISS");

  try {
    const todayIso = new Date().toISOString().slice(0, 10);
    const prompt = getPhase1Prompt(query, todayIso);
    let result = await callGeminiJson({
      apiKey,
      model,
      prompt,
      withSearchTool: true,
      temperature: 0.1
    });

    if (
      result.response.status === 400 &&
      /tool|google_search/i.test(String(result.payload?.error?.message || ""))
    ) {
      result = await callGeminiJson({
        apiKey,
        model,
        prompt,
        withSearchTool: false,
        temperature: 0.1
      });
    }

    if (!result.response.ok) {
      const soft = defaultPhase1(query);
      soft.error = result.payload?.error?.message || "Upstream error";
      soft.meta = {
        phase: "phase1",
        version: PHASE1_API_VERSION,
        as_of: todayIso,
        degraded: true
      };
      return res.status(200).json(soft);
    }

    const text = result.payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      } catch (_err) {
        parsed = null;
      }
    }
    if (!parsed || typeof parsed !== "object") {
      return res.status(200).json({
        ...defaultPhase1(query),
        error: "Could not generate report, please refine query."
      });
    }

    const finalData = sanitizePhase1Payload(parsed, query);
    finalData.meta = {
      phase: "phase1",
      version: PHASE1_API_VERSION,
      as_of: todayIso
    };

    const ttl = finalData.result_type === "specific_model" ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
    await cacheSet(cacheClient, cacheKey, finalData, ttl);
    return res.status(200).json(finalData);
  } catch (error) {
    console.error("Search Engine Error:", error);
    const soft = defaultPhase1(query);
    soft.error = "Could not generate report, please refine query.";
    soft.meta = {
      phase: "phase1",
      version: PHASE1_API_VERSION,
      as_of: new Date().toISOString().slice(0, 10),
      degraded: true
    };
    return res.status(200).json(soft);
  }
}
