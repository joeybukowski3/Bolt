export default async function handler(req, res) {
  const { query, mode } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: "API Key missing in Vercel settings." });
  }
  
  const isAgeOnly = mode === 'age';
  
  const prompt = isAgeOnly 
    ? `You are an expert in serial number decoding for insurance adjusters. 
       Research: ${query}. 
       Return EXACTLY this JSON format: 
       {
         "releaseDate": {
           "estimatedAge": "X years (Manufactured Month/Year)", 
           "productionEra": "YYYY-YYYY"
         },
         "analysis": {
           "decodingMethod": {
             "available": true,
             "summary": "Short explanation of the serial format",
             "details": "Step-by-step breakdown of how this specific serial was decoded"
           }
         },
         "howItWorks": "Brief 1-2 sentence explanation of the product's operation."
       }`
    : `You are a product research assistant for insurance claims adjusters. Research the following item: ${query}

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

IMPORTANT: Provide high detail for full reports.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.2 
        }
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("Gemini Error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }
    
    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: "No response from AI engine." });
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(textResponse));
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "API Error: " + error.message });
  }
}