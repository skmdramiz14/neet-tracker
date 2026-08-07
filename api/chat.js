// Vercel Serverless Function — /api/chat
// Handles conversational Q&A about the user's NEET prep data.
// ANTHROPIC_API_KEY must be set in Vercel Project Settings → Environment Variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { messages, dataContext } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(200).json({ reply: "AI chat isn't set up yet — ANTHROPIC_API_KEY is missing in Vercel's environment variables." });
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
        max_tokens: 400,
        system: `You are a grounded, honest study-progress assistant for a NEET 2027 aspirant. You have access to their real logged data below. Answer their questions about their own progress, patterns, and data directly and specifically — reference actual numbers when you have them. Don't be falsely encouraging; be warm but honest. Keep answers concise (2-5 sentences unless they ask for more detail).\n\nTheir current data:\n${dataContext}`,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(200).json({ reply: "Something went wrong reaching the AI — try again in a moment." });
      return;
    }

    const result = await response.json();
    const reply = result.content?.[0]?.text || "Sorry, I couldn't generate a response.";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(200).json({ reply: "Something went wrong reaching the AI — try again in a moment." });
  }
}
