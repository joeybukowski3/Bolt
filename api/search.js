export default async function handler(req, res) {
  const { query, mode } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: "API Key missing in Vercel settings." });
  }
  
  const isAgeOnly = mode === 'age' || query.toLowerCase().includes('how old');
  
  // Use faster model and much shorter prompt for age-only lookups
  const prompt = isAgeOnly 
    ? `You are an expert in serial number decoding. Research: ${query}. 
       Return ONLY this JSON format: 
       {
         "releaseDate": {"estimatedAge": "X years (Manufactured Month/Year)", "productionEra": "YYYY-YYYY"},
         "analysis": {"decodingMethod": {"details": "Explain the logic used to decode this specific serial number."}}
       }`
    : `You are a product research assistant for insurance claims adjusters. Research the following item: ${query}

Provide a detailed analysis in this EXACT JSON format (no extra text, just valid JSON):

{
  "analysis": {
    "entered": "${query}",
    "quickSummary": "short category label under 8 words",      
    "modelConfidence": "exact or estimated",      
    "estimatedModel": "the specific model identifier",
    "overview": "2-3 sentence paragraph describing the item",       
    "itemDescription": "concise physical description",
    "keyDetails": "key functional details",
    "technicalSpecs": "Label: Value, Label: Value",
    "materials": "primary materials",
    "status": "availability",        
    "msrp": "$0.00",
    "msrpNumeric": 0,
    "decodingMethod": { "available": true, "summary": "short logic", "details": "full breakdown" }
  },
  "releaseDate": {
    "productionEra": "YYYY-YYYY",
    "discontinuation": "info",
    "estimatedAge": "X years",
    "ageNumeric": 0,
    "serviceLife": "context"
  },
  "valuation": {
    "annualDepreciationPercent": 15,
    "estimatedACV": "$0.00",
    "acvFormula": "math",
    "acvNote": "context"
  },
  "table": [
    {"label": "Model", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"},
    {"label": "Key Specs", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"},
    {"label": "Price (New)", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"},
    {"label": "Retailers", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"}
  ],
  "technical": {
    "manual": "N/A",
    "recalls": "info",
    "failures": "info",
    "legal": "info",
    "errorCodes": []
  },
  "howItWorks": "explanation",
  "diagnostics": []
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
    if (data.error) return res.status(500).json({ error: data.error.message });
    
    const textResponse = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(textResponse));
  } catch (error) {
    res.status(500).json({ error: "API Error: " + error.message });
  }
}