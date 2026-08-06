// Vercel Serverless Function.
// Deploy path: /api/summary.js in your repo → becomes the endpoint /api/summary
// Set ANTHROPIC_API_KEY in Vercel Project Settings → Environment Variables.
// The key stays server-side only — never sent to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { period, dataSummary } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(200).json({ summary: dataSummary, note: 'ANTHROPIC_API_KEY not set in Vercel — showing raw data instead of a generated reflection.' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are helping a NEET 2027 aspirant reflect on their ${period} progress. Based on this logged data, write a short (3-4 sentence), honest, grounded reflective summary in a warm but not falsely encouraging tone — note real patterns, not generic praise:\n\n${dataSummary}`,
        }],
      }),
    });

    if (!response.ok) {
      res.status(200).json({ summary: dataSummary, note: 'Anthropic API call failed — showing raw data instead.' });
      return;
    }

    const result = await response.json();
    const summaryText = result.content?.[0]?.text || dataSummary;
    res.status(200).json({ summary: summaryText });
  } catch (err) {
    res.status(200).json({ summary: dataSummary, note: 'Anthropic API call failed — showing raw data instead.' });
  }
}
