require('dotenv').config();

const SITE = process.env.SITE;
const API_KEY = process.env.API_KEY;
const PROMPT = process.env.LLM_PROMPT;
const MODEL = process.env.MODEL || 'claude-sonnet-5';
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 1024;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

function extractReply(body) {
  return (
    body.content?.find((block) => block.type === 'text')?.text ??
    body.choices?.[0]?.message?.content ??
    JSON.stringify(body)
  );
}

async function main() {
  requireEnv('SITE', SITE);
  requireEnv('API_KEY', API_KEY);
  requireEnv('LLM_PROMPT', PROMPT);

  const response = await fetch(SITE, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: PROMPT }],
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`Request failed: ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  const body = JSON.parse(text);
  const reply = extractReply(body);

  console.log(`Site: ${SITE}`);
  console.log(`Prompt: ${PROMPT}`);
  console.log(`Response: ${reply}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
