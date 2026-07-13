// Default endpoint + model per provider, used whenever a caller doesn't pass
// an explicit site/model (run-suite.js and contact.js now rely on this via
// their PROVIDER env var; test-connections.js always uses these directly).
// jsonMode picks which structured-output mechanism callOpenAICompatible uses
// when a schema is passed: 'json_schema' (OpenAI-style Structured Outputs —
// the API enforces the exact shape) where it's reliably supported, else the
// older, more universally-supported 'json_object' mode (guarantees syntactically
// valid JSON, but not the shape — callers still need to validate the shape).
const PROVIDER_DEFAULTS = {
  anthropic: { site: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5' },
  // gpt-5.4-nano (and other newer OpenAI models) reject `max_tokens` with a 400,
  // demanding `max_completion_tokens` instead — the other OpenAI-compatible
  // providers below still accept `max_tokens`.
  openai: { site: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5.4-nano', tokenParam: 'max_completion_tokens', jsonMode: 'json_schema' },
  gemini: { site: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-3.5-flash' },
  mistral: { site: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest', jsonMode: 'json_object' },
  xai: { site: 'https://api.x.ai/v1/chat/completions', model: 'grok-4.3', jsonMode: 'json_object' },
  // deepseek-chat/deepseek-reasoner are deprecated 2026-07-24; deepseek-v4-flash is the replacement.
  deepseek: { site: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash', jsonMode: 'json_object' },
};

// Which .env variable holds each provider's API key — the single source of
// truth so run-suite.js, contact.js, and test-connections.js agree on names.
const PROVIDER_ENV_KEYS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  xai: 'X_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

async function callAnthropic({ site, apiKey, model, maxTokens, effort, prompt, schema }) {
  const outputConfig = {};
  if (effort) outputConfig.effort = effort;
  if (schema) outputConfig.format = { type: 'json_schema', schema };

  const requestBody = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  // Adaptive thinking + effort are only sent when explicitly requested,
  // since older/smaller models (e.g. Haiku 4.5) reject both with a 400.
  if (effort) requestBody.thinking = { type: 'adaptive' };
  if (Object.keys(outputConfig).length > 0) requestBody.output_config = outputConfig;

  const response = await fetch(site, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const body = JSON.parse(text);

  if (body.stop_reason === 'refusal') {
    const category = body.stop_details?.category ?? 'unspecified';
    return `[REFUSED by safety classifier - category: ${category}]`;
  }

  const textBlock = body.content?.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error(`No text content in response: ${JSON.stringify(body)}`);
  }
  return textBlock.text;
}

// Covers OpenAI, Mistral, xAI, and DeepSeek: all expose an OpenAI-compatible
// /chat/completions endpoint (Bearer auth, choices[0].message.content).
async function callOpenAICompatible({ site, apiKey, model, maxTokens, tokenParam = 'max_tokens', jsonMode, prompt, schema }) {
  const requestBody = {
    model,
    [tokenParam]: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };

  if (schema && jsonMode === 'json_schema') {
    requestBody.response_format = { type: 'json_schema', json_schema: { name: 'judgment', strict: true, schema } };
  } else if (schema && jsonMode === 'json_object') {
    // Older, more universally-supported JSON mode: guarantees valid JSON syntax
    // but not the schema's shape — the caller (run-suite.js) still validates that.
    requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch(site, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const body = JSON.parse(text);
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`No text content in response: ${JSON.stringify(body)}`);
  }
  return content;
}

async function callGemini({ site, apiKey, model, maxTokens, prompt, schema }) {
  const generationConfig = { maxOutputTokens: maxTokens };
  if (schema) {
    generationConfig.responseMimeType = 'application/json';
    // Gemini's schema format is an OpenAPI-3.0 subset — it doesn't recognize
    // additionalProperties, so strip it rather than risk a 400.
    const { additionalProperties, ...geminiSchema } = schema;
    generationConfig.responseSchema = geminiSchema;
  }

  const response = await fetch(`${site}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const body = JSON.parse(text);
  const result = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!result) {
    throw new Error(`No text content in response: ${JSON.stringify(body)}`);
  }
  return result;
}

async function callModel({ provider = 'anthropic', site, apiKey, model, maxTokens, effort, prompt, schema }) {
  const defaults = PROVIDER_DEFAULTS[provider];
  if (!defaults) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const resolvedSite = site || defaults.site;
  const resolvedModel = model || defaults.model;

  switch (provider) {
    case 'anthropic':
      return callAnthropic({ site: resolvedSite, apiKey, model: resolvedModel, maxTokens, effort, prompt, schema });
    case 'openai':
    case 'mistral':
    case 'xai':
    case 'deepseek':
      return callOpenAICompatible({ site: resolvedSite, apiKey, model: resolvedModel, maxTokens, tokenParam: defaults.tokenParam, jsonMode: defaults.jsonMode, prompt, schema });
    case 'gemini':
      return callGemini({ site: resolvedSite, apiKey, model: resolvedModel, maxTokens, prompt, schema });
    default:
      throw new Error(`Unhandled provider: ${provider}`);
  }
}

module.exports = { callModel, PROVIDER_DEFAULTS, PROVIDER_ENV_KEYS };
