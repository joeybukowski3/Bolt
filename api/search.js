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
            text: `You are a product research assistant. Research the following item: ${query}

Provide a detailed analysis in this EXACT JSON format (no extra text, just valid JSON):

{
  "analysis": {
    "entered": "${query}",
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
  "table": [
    {"label": "Model", "original": "details", "brandMatch": "current version", "option1": "alt 1", "option2": "alt 2"},
    {"label": "Display", "original": "", "brandMatch": "", "option1": "", "option2": ""},
    {"label": "Price", "original": "", "brandMatch": "", "option1": "", "option2": ""}
  ],
  "technical": {
    "manual": "N/A",
    "recalls": "recall info or None found",
    "failures": "common issues or None",
    "legal": "legal issues or None"
  }
}

IMPORTANT for decodingMethod: If the product has a known serial number decoding scheme (like many electronics, guitars, appliances, etc.), set available to true and provide the summary and details. If no serial number decoding information is known, set available to false, summary to "", and details to "".` 
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
