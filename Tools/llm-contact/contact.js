require('dotenv').config();
const { callModel, PROVIDER_DEFAULTS, PROVIDER_ENV_KEYS } = require('./client');

// PROVIDER selects which API this hits (anthropic, openai, gemini, mistral,
// xai, deepseek — see client.js). SITE/MODEL fall back to that provider's
// defaults when not set explicitly.
const PROVIDER = process.env.PROVIDER || 'anthropic';
const PROVIDER_DEFAULT = PROVIDER_DEFAULTS[PROVIDER];
const API_KEY_ENV = PROVIDER_ENV_KEYS[PROVIDER];
const API_KEY = API_KEY_ENV && process.env[API_KEY_ENV];
const SITE = process.env.SITE || PROVIDER_DEFAULT?.site;
const PROMPT = process.env.LLM_PROMPT;
const MODEL = process.env.MODEL || PROVIDER_DEFAULT?.model;
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 1024;
const EFFORT = process.env.EFFORT; // low | medium | high | xhigh | max (optional, defaults to "high")

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

async function main() {
  if (!PROVIDER_DEFAULT) {
    console.error(`Unknown PROVIDER: "${PROVIDER}". Known providers: ${Object.keys(PROVIDER_DEFAULTS).join(', ')}`);
    process.exit(1);
  }
  requireEnv(API_KEY_ENV, API_KEY);
  requireEnv('LLM_PROMPT', PROMPT);

  const reply = await callModel({
    provider: PROVIDER,
    site: SITE,
    apiKey: API_KEY,
    model: MODEL,
    maxTokens: MAX_TOKENS,
    effort: EFFORT,
    prompt: PROMPT,
  });

  console.log(`Provider: ${PROVIDER}`);
  console.log(`Site: ${SITE}`);
  console.log(`Prompt: ${PROMPT}`);
  console.log(`Response: ${reply}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
