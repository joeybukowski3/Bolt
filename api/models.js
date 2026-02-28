export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY;
  const apiVersion = process.env.GEMINI_API_VERSION || "v1beta";

  if (!apiKey) {
    return res.status(500).json({ error: "API Key missing in Vercel settings." });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}`;
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      return res.status(500).json({
        error: "Upstream error",
        upstreamStatus: response.status,
        upstreamBody: text
      });
    }

    res.status(200).send(text);
  } catch (error) {
    console.error("Models endpoint error:", error);
    res.status(500).json({ error: "Models endpoint error: " + error.message });
  }
}
