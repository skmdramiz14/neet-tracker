// Vercel Serverless Function — /api/note-chat
// A conversational note-builder. The user chats naturally ("add a line about X",
// "make an image of Y", "write the formula for Z") and Claude classifies what
// action to take. The client then performs that action (text/image/equation)
// using the already-existing endpoints, so this function only needs to decide intent.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message, noteContext } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    res.status(200).json({ error: 'ANTHROPIC_API_KEY not set in Vercel.' });
    return;
  }
  if (!message || !message.trim()) {
    res.status(400).json({ error: 'No message provided.' });
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
        system: `You are helping a NEET aspirant build a study note through conversation. The note so far has these blocks:\n${noteContext || '(empty note so far)'}\n\nDecide what the user wants and respond with ONLY valid JSON (no markdown fences), in exactly this shape:\n{"action": "text"|"image"|"equation"|"chat", "content": "...", "reply": "..."}\n\n- action "text": user wants a line/paragraph of note content added. "content" = the actual well-written text to add (in your own words if they described it loosely). "reply" = a short confirmation like "Added that."\n- action "image": user wants an image/diagram generated. "content" = a clear image-generation prompt describing what to draw. "reply" = short confirmation like "Generating that image now."\n- action "equation": user wants a formula/equation added. "content" = a plain description of the equation for LaTeX formatting (e.g. "kinetic energy formula"). "reply" = short confirmation.\n- action "chat": user is just asking a question or chatting, not asking to add anything to the note. "content" = "". "reply" = your actual conversational answer.`,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      res.status(200).json({ error: 'Request failed.' });
      return;
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      res.status(200).json({ action: 'chat', content: '', reply: text });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(200).json({ error: 'Request failed: ' + (err.message || 'unknown error') });
  }
}
