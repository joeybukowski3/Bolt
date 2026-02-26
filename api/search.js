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
    : `You are a product research assistant for insurance claims adjusters. Research: ${query}
       Return ONLY a valid JSON object. No markdown, no backticks.
       JSON format:
{
  "analysis": {
    "entered": "${query}",
    "quickSummary": "category label",      
    "modelConfidence": "exact or estimated",      
    "estimatedModel": "model identifier",
    "overview": "2-3 sentence paragraph",       
    "itemDescription": "physical description",
    "keyDetails": "functional details",
    "technicalSpecs": "Label: Value, Label: Value",
    "materials": "primary materials",
    "status": "availability",        
    "msrp": "$0.00",
    "msrpNumeric": 0,
    "decodingMethod": { "available": true, "summary": "logic summary", "details": "breakdown" }
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
    "annualDepreciationDisplay": "15%",
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
    "errorCodes": [],
    "errorCodesSource": null
  },
  "howItWorks": "explanation",
  "diagnostics": []
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
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

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    
    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: "No response from AI engine." });
    }

    let textResponse = data.candidates[0].content.parts[0].text;
    
    // Clean markdown if present
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    res.status(200).json(JSON.parse(textResponse));
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Search Engine Error: " + error.message });
  }
}