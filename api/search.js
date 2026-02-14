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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    console.log("Calling Gemini API...");
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Research the following item and provide a detailed forensic analysis: ${query}. 

Return your response in this EXACT JSON format (no markdown, just valid JSON):

{
  "analysis": {
    "entered": "the user's input",
    "description": "brief description of the item",
    "details": "key specifications or features",
    "status": "current availability status",
    "age": "estimated age or release year",
    "msrp": "original retail price"
  },
  "table": [
    {
      "label": "Model",
      "original": "original model details",
      "brandMatch": "current equivalent from same brand",
      "option1": "alternative option 1",
      "option2": "alternative option 2"
    },
    {
      "label": "Price",
      "original": "original price",
      "brandMatch": "brand match price",
      "option1": "option 1 price",
      "option2": "option 2 price"
    }
  ],
  "technical": {
    "manual": "URL to service manual PDF or N/A",
    "recalls": "any recall information or None found",
    "failures": "common failure patterns or None documented",
    "legal": "class action suits or legal issues, or None found"
  }
}` 
          }] 
        }],
        tools: [{ google_search: {} }],
        generationConfig: { 
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
    
    // Remove markdown code blocks if present
    textResponse = textResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const result = JSON.parse(textResponse);
    res.status(200).json(result);
  } catch (error) {
    console.error("Bolt Engine Error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ error: "The research engine stalled. Error: " + error.message });
  }
}
