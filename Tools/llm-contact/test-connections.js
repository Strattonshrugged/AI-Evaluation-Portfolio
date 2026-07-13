// Standalone API key/connectivity check. Unlike run-suite.js, this writes
// nothing to Runs/ — console output only. Skips any provider whose API key
// env var isn't set, so it's safe to run with a partially-filled .env.
require('dotenv').config();
const { callModel, PROVIDER_DEFAULTS, PROVIDER_ENV_KEYS } = require('./client');

const TEST_PROMPT = 'Reply with exactly one word: OK';
// Reasoning models (e.g. deepseek-v4-flash) spend tokens on hidden reasoning_content
// before the visible answer, so a tight budget can hit finish_reason "length" with
// an empty content field. 100 leaves headroom for that plus the one-word answer.
const MAX_TOKENS = 100;

const PROVIDERS = Object.entries(PROVIDER_ENV_KEYS).map(([provider, envKey]) => ({ provider, envKey }));

async function testProvider({ provider, envKey }) {
  const apiKey = process.env[envKey];
  const model = PROVIDER_DEFAULTS[provider].model;

  if (!apiKey) {
    return { provider, model, status: 'skipped', detail: `${envKey} not set` };
  }

  const start = Date.now();
  try {
    const reply = await callModel({ provider, apiKey, model, maxTokens: MAX_TOKENS, prompt: TEST_PROMPT });
    return { provider, model, status: 'ok', ms: Date.now() - start, reply: reply.trim().replace(/\s+/g, ' ').slice(0, 60) };
  } catch (err) {
    return { provider, model, status: 'fail', ms: Date.now() - start, error: err.message.split('\n')[0] };
  }
}

async function main() {
  console.log('Testing API connections (no Runs/ record written)\n');

  const results = await Promise.all(PROVIDERS.map(testProvider));

  for (const r of results) {
    const label = r.provider.padEnd(10);
    const model = r.model.padEnd(22);
    if (r.status === 'ok') {
      console.log(`OK      ${label} ${model} ${r.ms}ms  "${r.reply}"`);
    } else if (r.status === 'fail') {
      console.log(`FAIL    ${label} ${model} ${r.ms}ms  ${r.error}`);
    } else {
      console.log(`SKIPPED ${label} ${model} (${r.detail})`);
    }
  }

  const failed = results.filter((r) => r.status === 'fail');
  const tested = results.filter((r) => r.status !== 'skipped');

  console.log(`\n${tested.length - failed.length}/${tested.length} configured provider(s) OK`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
