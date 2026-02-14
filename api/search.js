export default async function handler(req, res) {
  const { query } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;

  const systemPrompt = `Analyze the item: ${query}. Return JSON ONLY.
  Structure:
  {
    "analysis": {"entered": "...", "description": "...", "details": "...", "status": "...", "age": "...", "msrp": "..."},
    "table": [
      {"label": "Brand", "original": "...", "brandMatch": "...", "option1": "...", "option2": "..."},
      {"label": "Model #", "original": "...", "brandMatch": "...", "option1": "...", "option2": "..."},
      {"label": "Capacity/Size", "original": "...", "brandMatch": "...", "option1": "...", "option2": "..."},
      {"label": "Price (2026)", "original": "N/A", "brandMatch": "$...", "option1": "$...", "option2": "$..."}
    ],
    "technical": {"manual": "URL or N/A", "recalls": "...", "failures": "...", "legal": "..."}
  }
  For Age: Include serial decoding (1st digit year, 2nd/3rd month). Explaining cycles (e.g. 1=2001/2011/2021).`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
}