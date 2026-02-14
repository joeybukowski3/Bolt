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
    // 2. Call Google Gemini (without search tool to allow JSON mode)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${apiKey}`;
    console.log("Calling Gemini API...");
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `You are a product research assistant. Research the following item and provide a detailed analysis: ${query}

Based on your knowledge and reasoning, return a JSON response with this structure:

{
  "analysis": {
    "entered": "${query}",
    "description": "brief description of the item",
    "details": "key specifications or features",
    "status": "current availability status (e.g., Discontinued, Current Model, etc.)",
    "age": "estimated age or release year",
    "msrp": "original retail price if known"
  },
  "table": [
    {"label": "Model", "original": "original model", "brandMatch": "current equivalent from same brand", "option1": "alternative option 1", "option2": "alternative option 2"},
    {"label": "Display", "original": "", "brandMatch": "", "option1": "", "option2": ""},
    {"label": "Price Range", "original": "", "brandMatch": "", "option1": "", "option2": ""},
    {"label": "Features", "original": "", "brandMatch": "", "option1": "", "option2": ""}
  ],
  "technical": {
    "manual": "N/A",
    "recalls": "information about recalls or 'None found'",
    "failures": "common failure patterns or 'None documented'",
    "legal": "class action information or 'None found'"
  }
}

Return ONLY valid JSON, no markdown code blocks.` 
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
    
    // 4. Parse the result
    let textResponse = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResponse);
    res.status(200).json(result);
  } catch (error) {
    console.error("Bolt Engine Error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ error: "The research engine stalled. Error: " + error.message });
  }
}
