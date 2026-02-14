export default async function handler(req, res) {
  const { query } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;
  // 1. Safety Check
  if (!apiKey) {
    return res.status(500).json({ error: "API Key missing in Vercel settings." });
  }
  try {
    // 2. Call Google Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Research the following item and provide a detailed forensic analysis: ${query}. Return ONLY a JSON object with keys: analysis, table, and technical.` }] }],
        tools: [{ google_search: {} }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });
    const data = await response.json();
    // 3. Check for AI errors
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }
    // 4. Send result back to the website
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    res.status(200).json(result);
  } catch (error) {
    console.error("Bolt Engine Error:", error);
    res.status(500).json({ error: "The research engine stalled. Please try again." });
  }
}
