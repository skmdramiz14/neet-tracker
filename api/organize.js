// Vercel Serverless Function — /api/organize
// Takes rough/messy user input and returns a clean, categorized Quick Recall entry.
// ANTHROPIC_API_KEY must be set in Vercel Project Settings → Environment Variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { rawText } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(200).json({ error: 'ANTHROPIC_API_KEY not set in Vercel.' });
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
        max_tokens: 250,
        messages: [{
          role: 'user',
          content: `A NEET aspirant wrote this rough note of something they keep forgetting:\n\n"${rawText}"\n\nRewrite it as a short, crisp, exam-ready recall entry (1-2 sentences max, or a clean formula if it's a formula — no fluff, no restating "the formula is"). Also classify it and guess the NEET subject if possible.\n\nRespond with ONLY valid JSON, no markdown, no other text, in exactly this shape:\n{"content": "...", "category": "Formula|Concept|Date|Name|Fact|Other", "subject": "Physics|Physical Chemistry|Inorganic Chemistry|Organic Chemistry|Botany|Zoology|"}\n\nUse an empty string for subject if none of those clearly apply.`,
        }],
      }),
    });

    if (!response.ok) {
      res.status(200).json({ error: 'AI request failed.' });
      return;
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '{}';
    let parsed;
    try {
      // Strip any accidental markdown fencing before parsing.
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      res.status(200).json({ error: "Couldn't parse the AI's response." });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(200).json({ error: 'AI request failed.' });
  }
}
