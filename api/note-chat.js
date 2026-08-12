// Vercel Serverless Function — /api/note-chat
// A conversational note-builder. The user chats naturally ("add a line about X",
// "make an image of Y", "write the formula for Z") and Claude decides what action
// to take. Uses Anthropic's tool-use (function calling) instead of asking the model
// to hand-write JSON as plain text — this guarantees valid, correctly-escaped output
// even for long, multi-line note content (plain-text JSON was breaking on long notes
// with unescaped newlines).

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

  const tools = [{
    name: 'note_action',
    description: 'Decide what to do with the study note based on the user message.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['text', 'image', 'equation', 'chat'], description: '"text" = add a note text block, "image" = generate an image, "equation" = add a formula, "chat" = just conversation, nothing added to the note' },
        content: { type: 'string', description: 'For text: the well-written note content to add (in your own words if the user described it loosely, can be long and multi-line). For image: a clear image-generation prompt. For equation: a plain description of the formula. For chat: leave empty.' },
        reply: { type: 'string', description: 'A short message to show the user — a brief confirmation for text/image/equation, or your actual conversational answer for chat.' },
      },
      required: ['action', 'content', 'reply'],
    },
  }];

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
        max_tokens: 1200,
        system: `You are helping a NEET aspirant build a study note through conversation. The note so far has these blocks:\n${noteContext || '(empty note so far)'}\n\nAlways call the note_action tool to respond — never respond with plain text.`,
        tools,
        tool_choice: { type: 'tool', name: 'note_action' },
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(200).json({ error: 'Request failed: ' + errText.slice(0, 200) });
      return;
    }

    const result = await response.json();
    const toolUse = result.content?.find(c => c.type === 'tool_use');
    if (!toolUse) {
      res.status(200).json({ action: 'chat', content: '', reply: "I couldn't understand that — try rephrasing." });
      return;
    }
    res.status(200).json(toolUse.input);
  } catch (err) {
    res.status(200).json({ error: 'Request failed: ' + (err.message || 'unknown error') });
  }
}
