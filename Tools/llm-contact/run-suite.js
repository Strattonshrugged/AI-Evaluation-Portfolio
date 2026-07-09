require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { callModel } = require('./client');

const SITE = process.env.SITE;
const API_KEY = process.env.API_KEY;
const MODEL = process.env.MODEL || 'claude-sonnet-5';
const JUDGE_MODEL = process.env.JUDGE_MODEL || MODEL;
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 1024;
const EFFORT = process.env.EFFORT; // low | medium | high | xhigh | max (optional, defaults to "high")
const SUITE = process.env.SUITE; // suite name (no .json extension)

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SUITES_DIR = path.join(REPO_ROOT, 'Suites');
const RUNS_DIR = path.join(REPO_ROOT, 'Runs');

const JUDGMENT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    reasoning: { type: 'string' },
  },
  required: ['verdict', 'reasoning'],
  additionalProperties: false,
};

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function nextRunPath(target, suite, date) {
  const prefix = `${target}_${suite}_${date}_`;
  const existing = fs.existsSync(RUNS_DIR) ? fs.readdirSync(RUNS_DIR) : [];
  const iterations = existing
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .map((f) => parseInt(f.slice(prefix.length, -5), 10))
    .filter((n) => !Number.isNaN(n));
  const next = iterations.length ? Math.max(...iterations) + 1 : 1;
  return path.join(RUNS_DIR, `${prefix}${pad3(next)}.json`);
}

function buildJudgePrompt(test, reply) {
  return [
    "Evaluate the assistant's response below against the given criteria, then return your verdict.",
    '',
    'Original prompt given to the assistant:',
    test.prompt,
    '',
    "Assistant's response:",
    reply,
    '',
    'Evaluation criteria:',
    test.judgment_criteria,
  ].join('\n');
}

async function runTest(test) {
  const reply = await callModel({
    site: SITE,
    apiKey: API_KEY,
    model: MODEL,
    maxTokens: MAX_TOKENS,
    effort: EFFORT,
    prompt: test.prompt,
  });

  const judgmentText = await callModel({
    site: SITE,
    apiKey: API_KEY,
    model: JUDGE_MODEL,
    maxTokens: MAX_TOKENS,
    effort: EFFORT,
    prompt: buildJudgePrompt(test, reply),
    schema: JUDGMENT_SCHEMA,
  });

  let passFail = null;
  let judgmentReasoning = judgmentText;
  try {
    const parsed = JSON.parse(judgmentText);
    passFail = parsed.verdict;
    judgmentReasoning = parsed.reasoning;
  } catch (err) {
    console.error(`Warning: could not parse judge output as JSON for test "${test.name}": ${err.message}`);
  }

  return {
    name: test.name,
    description: test.description ?? null,
    prompt: test.prompt,
    reply,
    judgment_criteria: test.judgment_criteria,
    pass_fail: passFail,
    judgment_reasoning: judgmentReasoning,
  };
}

async function main() {
  requireEnv('SITE', SITE);
  requireEnv('API_KEY', API_KEY);
  requireEnv('SUITE', SUITE);

  const suitePath = path.join(SUITES_DIR, `${SUITE}.json`);
  if (!fs.existsSync(suitePath)) {
    console.error(`Suite not found: ${suitePath}`);
    process.exit(1);
  }

  const suite = JSON.parse(fs.readFileSync(suitePath, 'utf8'));
  if (!Array.isArray(suite.tests) || suite.tests.length === 0) {
    console.error(`Suite "${SUITE}" has no tests`);
    process.exit(1);
  }

  console.log(`Running suite: ${SUITE} (${suite.tests.length} test${suite.tests.length === 1 ? '' : 's'})`);

  const results = [];
  for (const test of suite.tests) {
    if (!test.name || !test.prompt || !test.judgment_criteria) {
      console.error(`Skipping test in suite "${SUITE}" missing required field(s): name, prompt, judgment_criteria`);
      process.exitCode = 1;
      continue;
    }
    console.log(`  Running test: ${test.name}`);
    results.push(await runTest(test));
  }

  const suiteResult = {
    suite: SUITE,
    suite_name: suite.name ?? null,
    suite_description: suite.description ?? null,
    target_model: MODEL,
    target_site: SITE,
    judge_model: JUDGE_MODEL,
    timestamp: new Date().toISOString(),
    tests: results,
  };

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const runPath = nextRunPath(MODEL, SUITE, date);
  fs.writeFileSync(runPath, JSON.stringify(suiteResult, null, 2));
  console.log(`Saved: ${runPath}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
