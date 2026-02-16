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
    "descriptionMain": "1-2 sentence brief description",
    "descriptionExtra": "additional description details and context",
    "detailsMain": "1-2 sentence key specifications summary",
    "detailsExtra": "remaining detailed specifications and notes",
    "status": "availability status",
    "age": "release year or age",
    "msrp": "original price",
    "decodingMethod": {
      "available": true,
      "summary": "short label like Serial number encodes year and factory",
      "details": "full decoding breakdown, e.g. 1st character is year: R=2004, T=2006, etc."
    }
  },
  "valuation": {
    "annualDepreciationPercent": "annual depreciation rate as a number, e.g. 15",
    "lifeExpectancyYears": "expected useful life in years, e.g. 7",
    "conditionFactor": "0.75",
    "estimatedACV": "calculated ACV as a dollar string, e.g. $487.23",
    "acvFormula": "the formula used, e.g. $899 × (1 - 0.15)^3 × 0.75 = $487.23"
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
    "legal": "legal issues or None"
  },
  "howItWorks": "2-4 sentence plain-language explanation of how the product works, written at a middle-school reading level with no jargon",
  "diagnostics": [
    {"title": "descriptive link title", "url": "full URL to manufacturer repair/diagnostic page", "source": "manufacturer or site name"}
  ]
}

IMPORTANT for quickSummary: Provide a short category-style label under 8 words (e.g. "Consumer Grade Laptop Computer", "French Door Refrigerator", "Professional Grade Gas Range").

IMPORTANT for modelConfidence: Set to "exact" if the user provided a full, specific model number in their query. Set to "estimated" if the query is vague, partial, or only a general description (e.g. "old fridge", "Samsung TV", "laptop"). When estimated, set estimatedModel to the specific model you chose to base your research on.

IMPORTANT for valuation: Calculate Actual Cash Value (ACV) using insurance industry depreciation standards from ClaimsPages.com. Use these rates by category: Electronics ~15-20% per year, Appliances ~10-12% per year, Furniture ~10% per year, Clothing ~20-25% per year. Assume "Good" condition with a conditionFactor of 0.75. Formula: ACV = MSRP × (1 - annualDepreciationRate)^age × conditionFactor. Show the full formula with actual numbers in acvFormula.

IMPORTANT for table: Always include specific model names/numbers (not generic descriptions) for brandMatch, option1, and option2. Include actual current retail prices. For Retailers, list 2-3 stores where each option can be purchased brand new (e.g. Amazon, Best Buy, Home Depot, Sweetwater, etc.).

IMPORTANT for decodingMethod: If the product has a known serial number decoding scheme (like many electronics, guitars, appliances, etc.), set available to true and provide the summary and details. If no serial number decoding information is known, set available to false, summary to "", and details to "".

IMPORTANT for howItWorks: Write a 2-4 sentence explanation of how this product works in plain language. Aim for a middle-school reading level. Avoid technical jargon.

IMPORTANT for diagnostics: Provide 2-5 real, working URLs to manufacturer repair pages, diagnostic tools, troubleshooting guides, or parts lookup pages relevant to this product. Use actual manufacturer websites. If no legitimate diagnostic resources exist, return an empty array [].` 
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
