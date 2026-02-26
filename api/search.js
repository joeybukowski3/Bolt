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
    "quickSummary": "category label",
    "modelConfidence": "exact or estimated",
    "estimatedModel": "the specific model identifier",
    "overview": "2-3 sentence paragraph for a claims report",
    "itemDescription": "concise physical description",
    "keyDetails": "key functional details",
    "technicalSpecs": "Label: Value, Label: Value (comma separated string of all specs)",
    "materials": "primary materials",
    "status": "availability",
    "msrp": "$0.00",
    "msrpNumeric": 0
  },
  "releaseDate": {
    "productionEra": "e.g. 2015-2020",
    "discontinuation": "reason/date",
    "estimatedAge": "Reasoning bullet 1. Reasoning bullet 2. reasoning bullet 3. Final age estimate.",
    "ageNumeric": 0,
    "serviceLife": "design life context"
  },
  "valuation": {
    "annualDepreciationPercent": 15,
    "estimatedACV": "$0.00",
    "acvFormula": "calculation",
    "acvNote": "valuation context"
  },
  "table": [
    {"label": "Model", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"},
    {"label": "Key Specs", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"},
    {"label": "Price (New)", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"},
    {"label": "Retailers", "original": "orig", "brandMatch": "match", "option1": "opt1", "option2": "opt2"}
  ],
  "technical": {
    "manual": "URL or N/A",
    "recalls": "info",
    "failures": "info",
    "legal": "info",
    "errorCodes": []
  },
  "howItWorks": "2-4 sentence explanation",
  "diagnostics": []
}` 
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
