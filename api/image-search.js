const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function cleanString(value, maxLen = 200) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.slice(0, maxLen);
}

function nullableString(value, maxLen = 120) {
  const s = cleanString(value, maxLen);
  return s || null;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), base64Data: match[2] };
}

function isAllowedMimeType(mimeType) {
  const mt = String(mimeType || "").toLowerCase();
  return ALLOWED_MIME_TYPES.has(mt) || mt.startsWith("image/");
}

function inferFromHint(hint) {
  const h = cleanString(hint, 120);
  if (!h) {
    return {
      queryString: "Unknown item (image)",
      confidence: 0.2,
      lowConfidence: true,
      brand: null,
      productType: null,
      series: null,
      model: null,
      notes: "No hint provided and visual model unavailable."
    };
  }

  return {
    queryString: h,
    confidence: 0.35,
    lowConfidence: true,
    brand: null,
    productType: null,
    series: null,
    model: null,
    notes: "Using text hint while visual recognition confidence is low."
  };
}

function buildQueryFromFields(parsed, hint) {
  const explicit = cleanString(parsed?.queryString, 140);
  if (explicit) return explicit;

  const parts = [
    cleanString(parsed?.brand, 40),
    cleanString(parsed?.series, 40),
    cleanString(parsed?.model, 40),
    cleanString(parsed?.productType, 40)
  ].filter(Boolean);

  if (parts.length) return cleanString(parts.join(" "), 140);
  if (cleanString(hint, 140)) return cleanString(hint, 140);
  return "Unknown item (image)";
}

async function runGeminiVisualAnalysis({ apiKey, mimeType, base64Data, hint }) {
  const prompt = `You are classifying an item from an uploaded image for a product research tool.
Return strict JSON only with this schema:
{
  "queryString": "short text query to run in search",
  "confidence": 0.0,
  "lowConfidence": false,
  "brand": "string or null",
  "productType": "string or null",
  "series": "string or null",
  "model": "string or null",
  "notes": "short reason"
}

Rules:
- Use the optional text hint when useful: "${cleanString(hint, 120)}"
- If uncertain, set lowConfidence=true and confidence below 0.45.
- Keep queryString concise and useful for product search.
- Do not include markdown.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini visual analysis failed (${response.status}): ${errText}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return JSON.parse(String(text).replace(/```json|```/g, "").trim());
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imageData, hint, mimeType: bodyMimeType, size } = req.body || {};
  const parsed = parseDataUrl(imageData);
  if (!parsed) return res.status(400).json({ error: "Missing or invalid image data." });

  const mimeType = String(bodyMimeType || parsed.mimeType || "").toLowerCase();
  if (!isAllowedMimeType(mimeType)) {
    return res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, WEBP, or HEIC." });
  }

  const byteSize = Number.isFinite(Number(size))
    ? Number(size)
    : Buffer.byteLength(parsed.base64Data, "base64");
  if (byteSize > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: "Image too large. Max size is 10 MB." });
  }

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  let result = null;
  try {
    if (apiKey) {
      result = await runGeminiVisualAnalysis({
        apiKey,
        mimeType,
        base64Data: parsed.base64Data,
        hint: cleanString(hint, 120)
      });
    } else {
      result = inferFromHint(hint);
    }
  } catch (err) {
    console.error("image-search handler fallback:", err.message || err);
    result = inferFromHint(hint);
  }

  const confidenceRaw = Number(result?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : 0.25;
  const lowConfidence = result?.lowConfidence === true || confidence < 0.45;
  const queryString = buildQueryFromFields(result, hint);

  return res.status(200).json({
    queryString,
    confidence,
    lowConfidence,
    brand: nullableString(result?.brand),
    productType: nullableString(result?.productType),
    series: nullableString(result?.series),
    model: nullableString(result?.model),
    notes: cleanString(result?.notes, 280) || null
  });
}
