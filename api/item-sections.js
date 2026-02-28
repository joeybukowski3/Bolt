import {
  PHASE2_API_VERSION,
  cacheGet,
  cacheSet,
  callGeminiJson,
  getCacheClient,
  normalizeQuery,
  retailerSearchLinks,
  sanitizeSources
} from "./_shared.js";

const ALLOWED_SECTIONS = new Set([
  "specs",
  "recalls",
  "error_codes_common",
  "error_codes_full",
  "manual",
  "manufacturer_page",
  "valuation",
  "retailer_links"
]);

function fallbackSection(query, section) {
  const base = { query, section, data: null, sources: [] };
  switch (section) {
    case "specs":
      return { ...base, data: { specs: [], note: "No technical specifications available." } };
    case "recalls":
      return {
        ...base,
        data: { summary: "No Recalls or Class Actions found that match searched item", notices: [] }
      };
    case "error_codes_common":
      return { ...base, data: { codes: [], note: "No common error codes available." } };
    case "error_codes_full":
      return { ...base, data: { codes: [], note: "No full error code list available." } };
    case "manual":
      return { ...base, data: { links: [], note: "No owner manual link found." } };
    case "manufacturer_page":
      return { ...base, data: { links: [], note: "No manufacturer page found." } };
    case "valuation":
      return {
        ...base,
        data: {
          eligible: false,
          note: "Model specificity is required before generating informational price estimates."
        }
      };
    case "retailer_links":
      return { ...base, data: { links: retailerSearchLinks(query, query, query) } };
    default:
      return base;
  }
}

function getSectionPrompt(query, section, todayIso) {
  const sectionRules = {
    specs: "Return structured technical specs only.",
    recalls:
      "Return recall/legal notice summary from official manufacturer, government, or recognized legal notice sources only. If none, return exact summary text: No Recalls or Class Actions found that match searched item",
    error_codes_common: "Return 5-12 common error/fault codes only if applicable.",
    error_codes_full: "Return a fuller list of applicable error/fault codes.",
    manual: "Return only manufacturer or authorized manual links.",
    manufacturer_page: "Return official manufacturer item or category page.",
    valuation:
      "Return informational pricing estimate only when model specificity is high; otherwise mark as ineligible with guidance.",
    retailer_links:
      "Return retailer search links for major national storefront retailers only: Best Buy, Home Depot, Lowe's, Manufacturer, AJ Madison, B&H, Walmart, Target."
  };

  return `You are generating one lazy-loaded section for an item lookup report.
Date: ${todayIso}
Query: ${query}
Section: ${section}

${sectionRules[section]}

Return JSON only:
{
  "query": "${query}",
  "section": "${section}",
  "data": {},
  "sources": [{"label":"", "url":""}]
}`;
}

function sanitizeSectionPayload(query, section, payload) {
  const fallback = fallbackSection(query, section);
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload.data && typeof payload.data === "object" ? payload.data : fallback.data;
  return {
    query: String(payload.query || query),
    section: String(payload.section || section),
    data,
    sources: sanitizeSources(payload.sources)
  };
}

export default async function handler(req, res) {
  const query = String(req.query?.query || "").trim();
  const section = String(req.query?.section || "").trim();
  const refresh = req.query?.refresh === "1";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY;
  const rawModel = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
  const model = rawModel.startsWith("models/") ? rawModel.slice("models/".length) : rawModel;
  const todayIso = new Date().toISOString().slice(0, 10);

  if (!apiKey) return res.status(500).json({ error: "API Key missing in Vercel settings." });
  if (!query) return res.status(400).json({ error: "Missing query parameter." });
  if (!ALLOWED_SECTIONS.has(section)) return res.status(400).json({ error: "Invalid section parameter." });

  const cacheClient = getCacheClient();
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = `item:phase2:v1:${model}:${section}:${normalizedQuery}`;
  res.setHeader("x-phase2-version", PHASE2_API_VERSION);

  if (!refresh) {
    const cached = await cacheGet(cacheClient, cacheKey);
    if (cached) {
      res.setHeader("x-cache", "HIT");
      return res.status(200).json(cached);
    }
  }
  res.setHeader("x-cache", "MISS");

  if (section === "retailer_links") {
    const direct = {
      query,
      section,
      data: { links: retailerSearchLinks(query, query, query) },
      sources: []
    };
    await cacheSet(cacheClient, cacheKey, direct, 30 * 24 * 60 * 60);
    return res.status(200).json(direct);
  }

  try {
    const prompt = getSectionPrompt(query, section, todayIso);
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
      const fallback = fallbackSection(query, section);
      fallback.error = result.payload?.error?.message || "Section generation failed.";
      return res.status(200).json(fallback);
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
    const finalData = sanitizeSectionPayload(query, section, parsed);
    finalData.meta = { phase: "phase2", version: PHASE2_API_VERSION, as_of: todayIso };
    await cacheSet(cacheClient, cacheKey, finalData, 30 * 24 * 60 * 60);
    return res.status(200).json(finalData);
  } catch (error) {
    console.error("item-sections error:", error);
    return res.status(200).json(fallbackSection(query, section));
  }
}
