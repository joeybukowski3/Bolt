import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
  const { query, mode } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;
  const rawModel = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
  const model = rawModel.startsWith("models/") ? rawModel.slice("models/".length) : rawModel;
  const cacheEnabled = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  const refresh = req.query.refresh === '1';
  const redis = cacheEnabled
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;
  
  if (!apiKey) {
    console.error("Config error: GEMINI_API_KEY is missing.");
    return res.status(500).json({ error: "API Key missing in Vercel settings." });
  }

  res.setHeader("x-gemini-model", model);
  
  const isAgeOnly = mode === 'age';
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const cacheKey = `search:${isAgeOnly ? 'age' : 'research'}:${model}:${normalizedQuery}`;

  if (cacheEnabled && normalizedQuery && !refresh) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader("x-cache", "HIT");
        return res.status(200).json(cached);
      }
      res.setHeader("x-cache", "MISS");
    } catch (err) {
      console.error("Redis cache read error:", err);
      res.setHeader("x-cache", "ERROR");
    }
  }
  
  const prompt = isAgeOnly 
    ? `You are an expert in serial number decoding for insurance adjusters. 
       Research: ${query}. 
       Return ONLY a valid JSON object. No markdown, no backticks.
       JSON format:
       {
         "releaseDate": {
           "estimatedAge": "Age and manufacture date", 
           "productionEra": "YYYY-YYYY"
         },
         "analysis": {
           "decodingMethod": {
             "available": true,
             "summary": "Short explanation",
             "details": "Step-by-step breakdown"
           }
         },
         "howItWorks": "Brief operation explanation"
       }`
    : `You are a product research assistant for insurance claims adjusters. Research the following item: ${query}

Provide a detailed analysis in this EXACT JSON format (no extra text, just valid JSON):

{
  "analysis": {
    "entered": "${query}",
    "quickSummary": "short category label under 8 words",      
    "modelConfidence": "exact or estimated",      
    "estimatedModel": "the specific model you based your research on",
    "overview": "2-3 sentence paragraph describing the item, its brand, and general context",       
    "itemDescription": "concise physical/functional description",
    "keyDetails": "key functional details, compatibility info, notable design features",
    "technicalSpecs": "specific technical specifications like voltage, dimensions, capacity, ratings",
    "materials": "primary materials used in construction",
    "status": "availability status (e.g. Discontinued, Currently Available, Limited Stock)",        
    "msrp": "original MSRP or estimated price range as a string",
    "msrpNumeric": 899,
    "decodingMethod": {
      "available": true,
      "summary": "short label like Serial number encodes year and factory",
      "details": "full decoding breakdown"        
    }
  },
  "adjusterNotes": {
    "likeKindRationale": "why the recommended replacements are like-kind/quality",
    "availabilitySummary": "current availability / lead time summary, including 2-4 major retailers where listed (e.g. Best Buy, Target, Home Depot, Lowe's, Walmart, Costco, Amazon, Apple, Samsung, LG, Sony)",
    "warrantySummary": "warranty coverage snapshot for recommended replacements",
    "discontinuedImpact": "how discontinuation affects pricing/availability",
    "serialDecodingSummary": "high-level summary of serial/date code logic if applicable"
  },
  "releaseDate": {
    "productionEra": "production date range, e.g. late 1990s through approximately 2019",
    "discontinuation": "when/why discontinued, or Currently in production if still made",
    "estimatedAge": "specific age estimate with reasoning",
    "ageNumeric": 5,
    "serviceLife": "expected design life and current life stage"
  },
  "valuation": {
    "annualDepreciationPercent": 15,
    "annualDepreciationDisplay": "15% or 3% - 5% for ranges",
    "lifeExpectancyYears": 7,
    "conditionFactor": 0.75,
    "estimatedACV": "$487.23",
    "acvFormula": "$899 × (1 - 0.15)^3 × 0.75 = $487.23",
    "acvNote": "optional 1-2 sentence context about the valuation"
  },
  "table": [
    {"label": "Model", "original": "exact model name/number of original", "brandMatch": "specific model name/number of same-brand replacement", "option1": "specific model name/number alt 1", "option2": "specific model name/number alt 2"},
    {"label": "Recommended Replacement", "original": "original item name", "brandMatch": "best same-brand replacement", "option1": "best comparable replacement", "option2": "value alternative"},
    {"label": "Key Specs", "original": "key specs of original", "brandMatch": "key specs", "option1": "key specs", "option2": "key specs"},
    {"label": "Size / Capacity", "original": "size or capacity", "brandMatch": "size or capacity", "option1": "size or capacity", "option2": "size or capacity"},
    {"label": "Feature Match", "original": "notable features", "brandMatch": "match notes", "option1": "match notes", "option2": "match notes"},
    {"label": "Price (New)", "original": "original MSRP or current new price", "brandMatch": "current retail price", "option1": "current retail price", "option2": "current retail price"},
    {"label": "Availability", "original": "status", "brandMatch": "availability/lead time", "option1": "availability/lead time", "option2": "availability/lead time"},
    {"label": "Warranty", "original": "warranty info", "brandMatch": "warranty info", "option1": "warranty info", "option2": "warranty info"},
    {"label": "Retailers", "original": "2-3 retailers that sell it new", "brandMatch": "2-3 retailers", "option1": "2-3 retailers", "option2": "2-3 retailers"},
    {"label": "Notes", "original": "replacement notes", "brandMatch": "notes", "option1": "notes", "option2": "notes"}
  ],
  "technical": {
    "manual": "N/A",
    "recalls": "recall info or None found",       
    "failures": "common issues or None",
    "symptoms": "common user-reported symptoms or None",
    "legal": "legal issues or None",
    "errorCodes": [
      {"code": "E1 or F01", "description": "brief description of what this error means"}
    ],
    "errorCodesSource": {"title": "Manufacturer Error Code Reference", "url": "full URL to manufacturer error code page"}
  },
  "howItWorks": "2-4 sentence plain-language explanation of how the product works",
  "diagnostics": [
    {"title": "descriptive link title", "url": "full URL to manufacturer repair/diagnostic page", "source": "manufacturer or site name"}
  ]
}

IMPORTANT: For availabilitySummary, cite only major retailers and include 2-4 where the item or replacements are listed.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    console.error("Gemini request model:", model);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.1 
        }
      })
    });

    let data;
    let rawText = '';
    try {
      rawText = await response.text();
      data = rawText ? JSON.parse(rawText) : null;
    } catch (parseErr) {
      console.error("Gemini response parse error:", parseErr);
      console.error("Gemini raw response:", rawText);
      return res.status(500).json({
        error: "Upstream response parse error.",
        upstreamStatus: response.status
      });
    }

    if (!response.ok || data?.error) {
      console.error("Gemini upstream error:", {
        status: response.status,
        statusText: response.statusText,
        error: data?.error
      });
      return res.status(500).json({
        error: data?.error?.message || "Upstream error",
        upstreamStatus: response.status
      });
    }
    
    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: "No response from AI engine." });
    }

    let textResponse = data.candidates[0].content.parts[0].text;
    
    // Clean markdown if present
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(textResponse);
      if (cacheEnabled && normalizedQuery) {
        try {
          await redis.set(cacheKey, parsed, { ex: 21600 });
        } catch (err) {
          console.error("Redis cache write error:", err);
        }
      }
      res.status(200).json(parsed);
    } catch (parseErr) {
      console.error("Model JSON parse error:", parseErr);
      console.error("Model raw text:", textResponse);
      res.status(500).json({
        error: "Model returned invalid JSON.",
        upstreamStatus: response.status
      });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Search Engine Error: " + error.message });
  }
}
