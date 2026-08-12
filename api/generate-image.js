// Vercel Serverless Function — /api/generate-image
// Generates an illustration/diagram image using OpenAI's current image model (gpt-image-1).
// Requires OPENAI_API_KEY in Vercel Project Settings → Environment Variables.
// This is a SEPARATE key from ANTHROPIC_API_KEY — get it from platform.openai.com.
// Note: image generation costs real money per image (check OpenAI's current pricing).
//
// IMPORTANT: DALL-E 3 was retired by OpenAI in May 2026. The current model is gpt-image-1,
// which always returns base64-encoded image data (not a URL). This function returns that
// base64 data to the client, which uploads it to Firebase Storage for permanent hosting.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.status(200).json({ error: 'OPENAI_API_KEY not set in Vercel — image generation needs a separate OpenAI API key.' });
    return;
  }
  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: 'No prompt provided.' });
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `A clean, simple, educational diagram/illustration for a NEET biology/chemistry/physics study note: ${prompt}. Style: clear labeled diagram, textbook illustration style, white background, no photorealism.`,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      res.status(200).json({ error: 'Image generation failed: ' + errBody.slice(0, 300) });
      return;
    }

    const result = await response.json();
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      res.status(200).json({ error: 'No image data returned.' });
      return;
    }
    // Return base64 PNG data — the client uploads this to Firebase Storage for a permanent URL.
    res.status(200).json({ imageBase64: b64, mediaType: 'image/png' });
  } catch (err) {
    res.status(200).json({ error: 'Image generation request failed: ' + (err.message || 'unknown error') });
  }
}
