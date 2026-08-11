// Vercel Serverless Function — /api/format-equation
// Takes a plain-English description of an equation/formula and returns clean LaTeX.
// Reuses ANTHROPIC_API_KEY (same one already set up for everything else).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { description } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(200).json({ error: 'ANTHROPIC_API_KEY not set in Vercel.' });
    return;
  }
  if (!description || !description.trim()) {
    res.status(400).json({ error: 'No description provided.' });
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
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Convert this into a single, correct LaTeX equation (for KaTeX rendering). Respond with ONLY the raw LaTeX code, no explanation, no markdown fences, no dollar signs:\n\n${description}`,
        }],
      }),
    });

    if (!response.ok) {
      res.status(200).json({ error: 'Equation formatting failed.' });
      return;
    }

    const result = await response.json();
    let latex = (result.content?.[0]?.text || '').trim();
    latex = latex.replace(/^\$+|\$+$/g, '').replace(/```latex|```/g, '').trim();
    res.status(200).json({ latex });
  } catch (err) {
    res.status(200).json({ error: 'Request failed: ' + (err.message || 'unknown error') });
  }
}
