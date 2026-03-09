// Bolt AI Assist — Chat API
// Proxies conversation history to Gemini and returns the AI reply.
// API key never leaves the server.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { history } = req.body || {};
  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'history array is required' });
  }

  const SYSTEM_INSTRUCTION = `You are Bolt AI Assist, a specialized research assistant built for insurance adjusters, underwriters, and claims professionals using the Bolt platform.

Your primary goal is to help users research equipment age, technical specifications, repairability, and replacement values for insurance claims.

Key Responsibilities:
1. Serial Number Decoding: Identify and explain serial number date codes for major brands — Carrier, Rheem, Goodman, Trane, Lennox, York, Whirlpool, GE, Samsung, LG, Bosch, Maytag, Frigidaire, Kenmore, and others — to determine manufacture date.
2. Technical Specifications: Provide BTU ratings, SEER ratings, wattage, capacity, dimensions, and other technical details for insurance valuation.
3. Life Expectancy: Provide standard industry estimates for the useful life of appliances, HVAC systems, water heaters, and electronics.
4. Replacement Values: Help estimate current market replacement costs appropriate for insurance documentation.
5. Field Diagnostics: Answer questions about electrical, HVAC, and appliance diagnostics relevant to claims assessment.

Format responses clearly. Use bullet points or numbered lists for multi-step instructions or comparisons. Be concise but thorough. Always note when estimates should be verified with official manufacturer sources for final claims decisions.`;

  // Build Gemini-format contents array (must alternate user/model)
  const contents = history.map(function(msg) {
    return {
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text || '' }]
    };
  });

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't process that request. Please try again.";

    return res.status(200).json({ reply });
  } catch (e) {
    console.error('chat handler error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
