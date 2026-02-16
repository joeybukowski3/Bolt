export default async function handler(req, res) {
  const { query } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log("API Key exists:", !!apiKey);
  console.log("Query received:", query);
  
  // 1. Safety Check
  if (!apiKey) {
    return res.status(500).json({ error: "API Key missing in Vercel settings." });
  }
  
  try {
    // 2. Call Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log("Calling Gemini API...");
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `You are a product research assistant for insurance claims adjusters. Research the following item: ${query}

Provide a detailed analysis in this EXACT JSON format (no extra text, just valid JSON):

{
  "analysis": {
    "entered": "${query}",
    "quickSummary": "short category label under 8 words, e.g. Consumer Grade Laptop Computer",
    "modelConfidence": "exact or estimated",
    "estimatedModel": "the specific model you based your research on",
    "overview": "2-3 sentence paragraph describing the item, its brand, and general context (like the intro paragraph in an insurance report)",
    "itemDescription": "concise physical/functional description, e.g. 100 Amp, 20-Space / 40-Circuit Indoor Main Breaker Load Center",
    "keyDetails": "key functional details, compatibility info, notable design features",
    "technicalSpecs": "specific technical specifications like voltage, dimensions, capacity, ratings",
    "materials": "primary materials used in construction, e.g. tin-plated aluminum bus bar, stainless steel drum",
    "status": "availability status (e.g. Discontinued, Currently Available, Limited Stock)",
    "msrp": "original MSRP or estimated price range as a string, e.g. $899.00 or Est. $180.00 - $245.00",
    "msrpNumeric": 899,
    "decodingMethod": {
      "available": true,
      "summary": "short label like Serial number encodes year and factory",
      "details": "full decoding breakdown"
    }
  },
  "releaseDate": {
    "productionEra": "production date range, e.g. late 1990s through approximately 2019. Use this when an exact year cannot be determined.",
    "discontinuation": "when/why discontinued, or Currently in production if still made",
    "estimatedAge": "specific age estimate with reasoning, e.g. Based on your 262 date code, this unit was manufactured in the 26th week of 2002 (making it 24 years old). If no serial provided, estimate from model release year.",
    "ageNumeric": 5,
    "serviceLife": "expected design life and current life stage, e.g. Most electrical panels have a design life of 30-40 years. At 24 years, it is still within its functional window but is entering the late-middle stage of its lifespan."
  },
  "valuation": {
    "annualDepreciationPercent": 15,
    "annualDepreciationDisplay": "15% or 3% - 5% for ranges",
    "lifeExpectancyYears": 7,
    "conditionFactor": 0.75,
    "estimatedACV": "$487.23",
    "acvFormula": "$899 × (1 - 0.15)^3 × 0.75 = $487.23",
    "acvNote": "optional 1-2 sentence context about the valuation, e.g. However, because it is discontinued, the labor costs for a replacement often represent the bulk of a claim settlement."
  },
  "table": [
    {"label": "Model", "original": "exact model name/number of original", "brandMatch": "specific model name/number of same-brand replacement", "option1": "specific model name/number alt 1", "option2": "specific model name/number alt 2"},
    {"label": "Key Specs", "original": "key specs of original", "brandMatch": "key specs", "option1": "key specs", "option2": "key specs"},
    {"label": "Price (New)", "original": "original MSRP or current new price", "brandMatch": "current retail price", "option1": "current retail price", "option2": "current retail price"},
    {"label": "Retailers", "original": "2-3 retailers that sell it new (e.g. Amazon, Best Buy)", "brandMatch": "2-3 retailers", "option1": "2-3 retailers", "option2": "2-3 retailers"}
  ],
  "technical": {
    "manual": "N/A",
    "recalls": "recall info or None found",
    "failures": "common issues or None",
    "legal": "legal issues or None",
    "errorCodes": [
      {"code": "E1 or F01", "description": "brief description of what this error means"}
    ],
    "errorCodesSource": {"title": "Manufacturer Error Code Reference", "url": "full URL to manufacturer error code page"}
  },
  "howItWorks": "2-4 sentence plain-language explanation of how the product works, written at a middle-school reading level with no jargon",
  "diagnostics": [
    {"title": "descriptive link title", "url": "full URL to manufacturer repair/diagnostic page", "source": "manufacturer or site name"}
  ]
}

IMPORTANT for quickSummary: Provide a short category-style label under 8 words.

IMPORTANT for modelConfidence: Set to "exact" if the user provided a full, specific model number. Set to "estimated" if the query is vague or partial. When estimated, set estimatedModel to the specific model you chose.

IMPORTANT for overview: Write 2-3 sentences as an introductory paragraph that a claims adjuster would read first. Include the brand, model identifier, what it is, and general context about its market position or history.

IMPORTANT for releaseDate: Always provide productionEra (the range of years this model was produced). If the exact manufacture year cannot be determined, describe the production era. If a serial number is provided, decode it to estimate manufacture date. ageNumeric must be a number representing the best estimate of the item's age in years.

IMPORTANT for valuation: Calculate ACV using ClaimsPages.com depreciation standards. Electronics ~15-20%/yr, Appliances ~10-12%/yr, Furniture ~10%/yr, Clothing ~20-25%/yr, Electrical components ~3-5%/yr. Assume "Good" condition (0.75). Formula: ACV = MSRP × (1 - rate)^age × conditionFactor. msrpNumeric must be a number (use midpoint if range). annualDepreciationPercent must be a number. Include acvNote with additional valuation context when relevant (e.g. discontinued items, labor cost considerations).

IMPORTANT for table: Always include specific model names/numbers for brandMatch, option1, option2. Include actual current retail prices and 2-3 retailers per option.

IMPORTANT for errorCodes: Provide known error/fault codes for this product or product category. For appliances, include common diagnostic codes (e.g. E1, F2, OE, IE). For electronics, include relevant error indicators. Provide 3-10 of the most common codes. If the product has no known error codes, return an empty array []. For errorCodesSource, provide a link to the manufacturer's official error code documentation. If none exists, set to null.

IMPORTANT for decodingMethod: If a serial number decoding scheme exists, set available to true with summary and details. Otherwise set available to false.

IMPORTANT for howItWorks: 2-4 sentences, middle-school reading level, no jargon.

IMPORTANT for diagnostics: 2-5 real manufacturer repair/diagnostic URLs. Empty array if none exist.` 
          }] 
        }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });
    
    console.log("Response status:", response.status);
    
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data).substring(0, 500));
    
    // 3. Check for AI errors
    if (data.error) {
      console.error("Gemini API error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }
    
    // 4. Parse and return
    const textResponse = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResponse);
    res.status(200).json(result);
  } catch (error) {
    console.error("Bolt Engine Error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ error: "The research engine stalled. Error: " + error.message });
  }
}
