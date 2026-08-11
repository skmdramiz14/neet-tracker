// Vercel Serverless Function — /api/summarize-note
// Takes a long pasted note and returns a crisp quick-revision summary.
// Reuses ANTHROPIC_API_KEY (same one already set up for Auto-Summary and Chat).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { longText } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(200).json({ error: 'ANTHROPIC_API_KEY not set in Vercel.' });
    return;
  }
  if (!longText || !longText.trim()) {
    res.status(400).json({ error: 'No text provided.' });
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
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Turn this long note into a crisp, exam-ready quick-revision summary for a NEET aspirant — bullet points, key facts/formulas only, no fluff, organized under short subheadings if the content has multiple parts:\n\n${longText}`,
        }],
      }),
    });

    if (!response.ok) {
      res.status(200).json({ error: 'Summary generation failed.' });
      return;
    }

    const result = await response.json();
    const summary = result.content?.[0]?.text || '';
    res.status(200).json({ summary });
  } catch (err) {
    res.status(200).json({ error: 'Request failed: ' + (err.message || 'unknown error') });
  }
}
