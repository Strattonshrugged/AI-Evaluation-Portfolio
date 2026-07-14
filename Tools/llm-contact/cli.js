const { PROVIDER_DEFAULTS } = require('./client');

const USAGE = `Usage: node cli.js <suite> <target> [judge]

  suite   Suite name, matching a file in Suites/ without .json (e.g. LLM01-Prompt-Injection)
  target  provider[:model[:effort]] — the model under test (e.g. anthropic:claude-sonnet-5:max)
  judge   provider[:model[:effort]] — optional. Omit to self-judge with the target's own
          provider/model, or to defer entirely to the suite's own declared judge (if any) —
          a suite's judge_provider/judge_model/judge_effort always win over this argument.

Known providers (default model shown; effort support varies by model — leave it off
if the model rejects it):
${Object.entries(PROVIDER_DEFAULTS).map(([name, d]) => `  ${name.padEnd(10)} default model: ${d.model}`).join('\n')}

Examples:
  node cli.js LLM01-Prompt-Injection anthropic:claude-sonnet-5:max
  node cli.js LLM01-Prompt-Injection anthropic:claude-sonnet-5:max mistral
  node cli.js LLM01-Prompt-Injection openai mistral:mistral-small-latest
`;

function parseSpec(spec, label) {
  const [provider, model, effort] = spec.split(':');
  if (!PROVIDER_DEFAULTS[provider]) {
    console.error(`Unknown ${label} provider: "${provider}". Known providers: ${Object.keys(PROVIDER_DEFAULTS).join(', ')}`);
    process.exit(1);
  }
  return { provider, model, effort };
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(USAGE);
  process.exit(args.length === 0 ? 1 : 0);
}

const [suite, targetSpec, judgeSpec] = args;
if (!suite || !targetSpec) {
  console.error('Missing required arguments.\n');
  console.log(USAGE);
  process.exit(1);
}

const target = parseSpec(targetSpec, 'target');
const judge = judgeSpec ? parseSpec(judgeSpec, 'judge') : null;

process.env.SUITE = suite;
process.env.PROVIDER = target.provider;
if (target.model) process.env.MODEL = target.model;
if (target.effort) process.env.EFFORT = target.effort;
if (judge) {
  process.env.JUDGE_PROVIDER = judge.provider;
  if (judge.model) process.env.JUDGE_MODEL = judge.model;
  if (judge.effort) process.env.JUDGE_EFFORT = judge.effort;
}

require('./run-suite.js');
