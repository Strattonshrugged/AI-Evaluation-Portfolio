async function callModel({ site, apiKey, model, maxTokens, effort, prompt, schema }) {
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

module.exports = { callModel };
