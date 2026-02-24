exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS: only allow requests from the production domain and localhost for development
  const allowedOrigins = [
    'https://german-made-easy.netlify.app',
    'https://germanmadeeasy.com',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ];
  const origin = event.headers.origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const { systemPrompt, messages, maxTokens } = JSON.parse(event.body);

    // Validate maxTokens: must be between 1 and 1000 to prevent quota abuse
    const safeMaxTokens = Math.min(Math.max(parseInt(maxTokens) || 400, 1), 1000);

    // Limit message count and individual message size to prevent abuse
    const safeMessages = (Array.isArray(messages) ? messages : [])
      .slice(-30)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '',
      }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,  // safely read from Netlify dashboard
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: safeMaxTokens,
        system: typeof systemPrompt === 'string' ? systemPrompt.slice(0, 8000) : '',
        messages: safeMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI service error' }) };
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Something went wrong' }),
    };
  }
};
