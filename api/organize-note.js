// Vercel Serverless Function — /api/organize-note
// Takes messy text AND/OR an image (lecture screenshot, messy handwriting photo)
// and returns a clean, organized note. Uses Claude's vision capability for images —
// no separate image-reading API needed, same ANTHROPIC_API_KEY as everything else.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { messyText, imageBase64, imageMediaType } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(200).json({ error: 'ANTHROPIC_API_KEY not set in Vercel.' });
    return;
  }
  if (!messyText && !imageBase64) {
    res.status(400).json({ error: 'Provide messy text or an image.' });
    return;
  }

  const content = [];
  content.push({
    type: 'text',
    text: `Turn the following messy input (could be rough notes, a lecture screenshot, or messy handwriting) into a clean, well-organized study note for a NEET aspirant. Use clear headings, bullet points, and correct any obvious errors. If it's an image, transcribe the relevant content first, then organize it.${messyText ? `\n\nMessy text:\n${messyText}` : ''}`,
  });
  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMediaType || 'image/jpeg', data: imageBase64 },
    });
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
        max_tokens: 800,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(200).json({ error: 'Organizing failed: ' + errText.slice(0, 200) });
      return;
    }

    const result = await response.json();
    const organized = result.content?.[0]?.text || '';
    res.status(200).json({ organized });
  } catch (err) {
    res.status(200).json({ error: 'Request failed: ' + (err.message || 'unknown error') });
  }
}
