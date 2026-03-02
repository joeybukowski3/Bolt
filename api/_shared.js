import { Redis } from "@upstash/redis";

const MEMORY_CACHE_KEY = "__bolt_memory_cache_v1__";

export const PHASE1_API_VERSION = "2026-02-28-phase1-v1";
export const PHASE2_API_VERSION = "2026-02-28-phase2-v1";

export const ALLOWED_RETAILERS = [
  "Best Buy",
  "Home Depot",
  "Lowe's",
  "Manufacturer",
  "AJ Madison",
  "B&H",
  "Walmart",
  "Target"
];

export function normalizeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getCacheClient() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (redisUrl && redisToken) {
    return {
      type: "redis",
      client: new Redis({ url: redisUrl, token: redisToken })
    };
  }
  if (!globalThis[MEMORY_CACHE_KEY]) {
    globalThis[MEMORY_CACHE_KEY] = new Map();
  }
  return {
    type: "memory",
    client: globalThis[MEMORY_CACHE_KEY]
  };
}

export async function cacheGet(cacheClient, key) {
  if (!cacheClient || !key) return null;
  if (cacheClient.type === "redis") {
    try {
      return await cacheClient.client.get(key);
    } catch (err) {
      console.error("Redis cache read error:", err);
      return null;
    }
  }

  const entry = cacheClient.client.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cacheClient.client.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(cacheClient, key, value, ttlSeconds) {
  if (!cacheClient || !key || !value) return;
  if (cacheClient.type === "redis") {
    try {
      await cacheClient.client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.error("Redis cache write error:", err);
    }
    return;
  }
  cacheClient.client.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export function stripMarkdownCodeFences(text) {
  return String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

export function tryParseJson(text) {
  try {
    return JSON.parse(stripMarkdownCodeFences(text));
  } catch (_err) {
    return null;
  }
}

export async function callGeminiJson({
  apiKey,
  model,
  prompt,
  temperature = 0.1,
  withSearchTool = false
}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      // responseMimeType "application/json" conflicts with the google_search
      // grounding tool — when both are set, Gemini skips the live search step
      // and generates from training data only. When withSearchTool is true we
      // omit the MIME type and let Gemini produce JSON inside a code fence,
      // which stripMarkdownCodeFences + tryParseJson already handles.
      ...(withSearchTool ? {} : { responseMimeType: "application/json" }),
      temperature
    }
  };
  if (withSearchTool) {
    body.tools = [{ google_search: {} }];
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const rawText = await response.text();
  const payload = tryParseJson(rawText);
  return { response, payload, rawText };
}

export function cleanRetailerNames(value) {
  const text = String(value || "");
  const normalized = text.toLowerCase();
  const picked = ALLOWED_RETAILERS.filter((retailer) => {
    const n = retailer.toLowerCase();
    if (n === "manufacturer") return /manufacturer|official site|brand site|brand store/i.test(text);
    return normalized.includes(n.replace("'", ""));
  });
  if (!picked.length) {
    return ["Best Buy", "Home Depot", "Lowe's", "Walmart"];
  }
  return picked;
}

export function retailerSearchLinks(query, model, brand) {
  const term = encodeURIComponent(model || query || "");
  const brandTerm = encodeURIComponent(brand || query || "");
  return [
    { label: "Best Buy", url: `https://www.bestbuy.com/site/searchpage.jsp?st=${term}` },
    { label: "Home Depot", url: `https://www.homedepot.com/s/${term}` },
    { label: "Lowe's", url: `https://www.lowes.com/search?searchTerm=${term}` },
    { label: "Manufacturer", url: `https://www.google.com/search?q=${brandTerm}+official+site` },
    { label: "AJ Madison", url: `https://www.ajmadison.com/search?query=${term}` },
    { label: "B&H", url: `https://www.bhphotovideo.com/c/search?Ntt=${term}&N=0&InitialSearch=yes&sts=ma` },
    { label: "Walmart", url: `https://www.walmart.com/search?q=${term}` },
    { label: "Target", url: `https://www.target.com/s?searchTerm=${term}` }
  ];
}

export function sanitizeSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      label: String(s?.label || s?.title || "").trim(),
      url: String(s?.url || "").trim()
    }))
    .filter((s) => s.label && /^https?:\/\//i.test(s.url))
    .slice(0, 8);
}
