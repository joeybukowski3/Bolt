export default async function handler(req, res) {
  const { query } = req.query;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing in Vercel settings." });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
        systemInstruction: { 
          parts: [{ text: `Analyze the item: ${query}. Return JSON ONLY. Use the structure we discussed for Current Item Analysis, Replacement Options, and Technical Info.` }] 
        },
        tools: [{ google_search: {} }],
        generationConfig: { 
          responseMimeType: "application/json" 
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "The AI was unable to parse the search results. Please try again." });
  }
}
    res.status(500).json({ error: "Failed to fetch data" });
  }

}
