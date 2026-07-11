require('dotenv').config();
const { callModel } = require('./client');

const SITE = process.env.SITE;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PROMPT = process.env.LLM_PROMPT;
const MODEL = process.env.MODEL || 'claude-sonnet-5';
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 1024;
const EFFORT = process.env.EFFORT; // low | medium | high | xhigh | max (optional, defaults to "high")

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

async function main() {
  requireEnv('SITE', SITE);
  requireEnv('ANTHROPIC_API_KEY', API_KEY);
  requireEnv('LLM_PROMPT', PROMPT);

  const reply = await callModel({
    site: SITE,
    apiKey: API_KEY,
    model: MODEL,
    maxTokens: MAX_TOKENS,
    effort: EFFORT,
    prompt: PROMPT,
  });

  console.log(`Site: ${SITE}`);
  console.log(`Prompt: ${PROMPT}`);
  console.log(`Response: ${reply}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
