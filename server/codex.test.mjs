import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CodexTeachingProvider, DISABLED_FEATURES, SUPPORTED_VERSION, CODE_MODE_DISABLED_NOTICE, subscriptionEnvironment, eventReader, runProcess } from './codex.mjs';
import { HISTORICAL_TEACHERS } from '../src/school/personas.mjs';

const reply = { text: 'Seven is prime because its only positive divisors are 1 and 7.', suggestions: ['What about 9?'] };
const events = value => [
  { type: 'thread.started', thread_id: 'synthetic-thread' },
  { type: 'turn.started' },
  { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(value) } },
  { type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 10 } },
];
const help = '--ignore-user-config --ignore-rules --ephemeral --sandbox --json --output-schema --output-last-message --disable --strict-config --image';

function harness(t, overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'sota-provider-test-'));
  const executable = join(directory, 'codex.exe');
  writeFileSync(executable, 'test-only executable placeholder; mocked runner never executes it');
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const calls = [];
  const runner = async (exe, args, options) => {
    calls.push({ exe, args, options });
    if (args[0] === '--version') return { code: 0, stdout: `codex-cli ${overrides.version ?? SUPPORTED_VERSION}`, stderr: '' };
    if (args[0] === 'features') return { code: 0, stdout: [...DISABLED_FEATURES, 'skip_host_skill_discovery'].map(name => `${name} stable true`).join('\n'), stderr: '' };
    if (args.includes('--help')) return { code: 0, stdout: overrides.help ?? help, stderr: '' };
    if (args[0] === 'login') return { code: overrides.authCode ?? 0, stdout: '', stderr: overrides.auth ?? 'Logged in using ChatGPT' };
    if (overrides.fail) throw new Error('private failure token-test-secret');
    overrides.onExec?.(args,options);
    const value = overrides.value ?? reply;
    const lines = overrides.events ?? events(value);
    for (const line of lines) options.onLine(typeof line === 'string' ? line : JSON.stringify(line));
    if (!overrides.noFinal) writeFileSync(args[args.indexOf('--output-last-message') + 1], overrides.final ?? JSON.stringify(value));
    return { code: overrides.code ?? 0, stdout: lines.map(line => JSON.stringify(line)).join('\n'), stderr: 'private diagnostic token-test-secret' };
  };
  const provider = new CodexTeachingProvider({ executable, model: 'test-subscription-model', runner,
    environment: { PATH: 'native-path', APPDATA: 'managed-login-path', CODEX_HOME: 'managed-home', OPENAI_API_KEY: 'must-not-inherit',
      CODEX_API_KEY: 'must-not-inherit', CODEX_ACCESS_TOKEN: 'must-not-inherit', OPENAI_BASE_URL: 'must-not-inherit', ACCESS_TOKEN: 'must-not-inherit', OTHER_SECRET: 'must-not-inherit' } });
  return { provider, calls };
}

test('subscription provider contract: no API fallback, no inherited keys, isolated native invocation and replayed context', async t => {
  const { provider, calls } = harness(t);
  assert.equal((await provider.check()).configured, true);
  assert.equal(provider.status().liveValidated, false);
  const context = { mentor: HISTORICAL_TEACHERS.find(teacher => teacher.id === 'ada_lovelace'), messages: [{ role: 'user', text: 'Remember this synthetic learning question.' }], missedObjectiveIds: ['prime'] };
  assert.deepEqual(await provider.generate('teach', context), reply);
  assert.equal(provider.status().liveValidated, true);
  const call = calls.find(call => call.args[0] === 'exec' && !call.args.includes('--help'));
  assert(!call.args.includes(context.messages[0].text));
  assert(call.options.input.includes(JSON.stringify(context)));
  assert(call.options.input.includes(context.mentor.systemInstruction));
  assert(call.options.input.includes('poetical science'));
  assert.equal(call.args[call.args.indexOf('--sandbox') + 1], 'read-only');
  for (const required of ['--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config']) assert(call.args.includes(required));
  for (const feature of DISABLED_FEATURES) assert(call.args.some((arg, index) => arg === '--disable' && call.args[index + 1] === feature));
  assert(call.args.includes('forced_login_method="chatgpt"'));
  assert(call.args.includes('approval_policy="never"'));
  assert(call.args.includes('mcp_servers={}'));
  assert(call.args.includes('web_search="disabled"'));
  assert(call.args.includes('suppress_unstable_features_warning=true'));
  assert(!existsSync(call.options.cwd));
  assert.deepEqual(Object.keys(call.options.env).sort(), ['APPDATA', 'CODEX_HOME', 'PATH']);
  assert(!JSON.stringify(provider.status()).includes('token-test-secret'));
});

test('selected view is attached natively and its temporary file is cleaned without enabling tools',async t=>{
  let path;const bytes=Buffer.from('bounded-test-image');
  const {provider}=harness(t,{onExec(args){path=args[args.indexOf('--image')+1];assert.deepEqual(readFileSync(path),bytes);
    assert(args.includes('view_image'));assert(args.includes('read-only'));}});
  await provider.generate('teach',{}, {image:{bytes}});
  assert(path);assert.equal(existsSync(path),false);
});

test('missing login, API-key login and incompatible native capabilities fail closed before a model turn', async t => {
  for (const overrides of [{ auth: 'Not logged in', authCode: 1 }, { auth: 'Logged in using an API key - private-key' },
    { version: '99.0.0' }, { help: 'insufficient flags' }]) {
    const { provider, calls } = harness(t, overrides);
    assert.equal((await provider.check()).configured, false);
    await assert.rejects(provider.generate('teach', {}), error => error.status === 503 && !error.message.includes('private-key'));
    assert(!calls.some(call => call.args[0] === 'exec' && !call.args.includes('--help')));
  }
});

test('native Codex receives historical-person eligibility without an occupational teacher requirement', async t => {
  const identity = { status: 'plausible', name: 'Nikola Tesla', era: '1856–1943', reason: 'Identifiable inventor; teaching employment is not required.', caveats: ['No independent historical verification.'] };
  const { provider, calls } = harness(t, { value: identity });
  assert.deepEqual(await provider.generate('identity', { requestedName: 'Nikola Tesla' }), identity);
  const invocation = calls.find(call => call.args[0] === 'exec' && !call.args.includes('--help'));
  assert.match(invocation.options.input, /real historical person/);
  assert.match(invocation.options.input, /Formal teaching employment.*NOT required/);
  assert.match(invocation.options.input, /Do not evaluate topic fit in this step/);
  assert(invocation.args.includes('forced_login_method="chatgpt"'));
  assert.equal(invocation.args[invocation.args.indexOf('--sandbox') + 1], 'read-only');
});

test('rejects malformed JSON, missing final output, mismatched output, incomplete events, failed turns and all tool attempts', async t => {
  const cases = [
    { value: { text: '', suggestions: [] } }, { noFinal: true }, { final: '{invalid' }, { final: JSON.stringify({ ...reply, text: 'mismatch' }) },
    { events: events(reply).slice(0, 3) }, { code: 1 }, { fail: true },
    { events: [{ type: 'thread.started' }, { type: 'turn.started' }, { type: 'turn.failed', error: { message: 'private failure' } }] },
    ...['command_execution', 'mcp_tool_call', 'web_search', 'file_change', 'image_generation', 'collab_tool_call'].map(type => ({
      events: [{ type: 'thread.started' }, { type: 'turn.started' }, { type: 'item.started', item: { type, command: 'private-command' } }],
    })),
  ];
  for (const overrides of cases) {
    const { provider } = harness(t, overrides);
    await assert.rejects(provider.generate('teach', {}), error => error.status >= 400 && !/token-test-secret|private-command|private failure/.test(error.message));
    assert.equal(provider.status().liveValidated, false);
  }
});

test('unknown provider operations and oversized context never start a process', async t => {
  const { provider, calls } = harness(t);
  await assert.rejects(provider.generate('shell', {}), /Unknown teaching/);
  await assert.rejects(provider.generate('teach', { text: 'x'.repeat(160001) }), /context limit/);
  assert.equal(calls.length, 0);
});

test('environment isolation excludes every key, access-token and endpoint override even when mixed case', () => {
  assert.deepEqual(subscriptionEnvironment({ Path: 'safe', OPENAI_API_KEY: 'private', codex_api_key: 'private', ACCESS_TOKEN: 'private',
    OPENAI_BASE_URL: 'private', AWS_ACCESS_KEY_ID: 'private', CODEX_HOME: 'managed', NODE_OPTIONS: 'unsafe' }), { Path: 'safe', CODEX_HOME: 'managed' });
});

test('event reader rejects events after completion and malformed events', () => {
  const reader = eventReader();
  events(reply).forEach(event => reader.line(JSON.stringify(event)));
  assert.deepEqual(reader.result(JSON.stringify(reply)), reply);
  assert.throws(() => reader.line(JSON.stringify({ type: 'turn.started' })), /sequence/);
  assert.throws(() => eventReader().line('{invalid'), /malformed/);
});

test('accepts only the exact native disabled-code-mode advisory, never a similar error or tool', () => {
  const reader = eventReader();
  reader.line(JSON.stringify({ type: 'thread.started' }));
  reader.line(JSON.stringify({ type: 'turn.started' }));
  reader.line(JSON.stringify({ type: 'item.completed', item: { id: 'item_0', type: 'error', message: CODE_MODE_DISABLED_NOTICE } }));
  for (const event of events(reply).slice(2)) reader.line(JSON.stringify(event));
  assert.deepEqual(reader.result(JSON.stringify(reply)), reply);
  assert.deepEqual(reader.advisories, ['code_mode_host_disabled']);
  const invalid = eventReader();
  invalid.line(JSON.stringify({ type: 'thread.started' }));
  invalid.line(JSON.stringify({ type: 'turn.started' }));
  assert.throws(() => invalid.line(JSON.stringify({ type: 'item.completed', item: { type: 'error', message: CODE_MODE_DISABLED_NOTICE + ' altered' } })), /error|permissions/);
});

test('native process runner enforces deadline, output limit, event rejection and executable failure', async () => {
  await assert.rejects(runProcess(process.execPath, ['-e', 'setTimeout(()=>{}, 10000)'], { cwd: tmpdir(), env: process.env, timeoutMs: 20 }), /took too long/);
  await assert.rejects(runProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(1100000))'], { cwd: tmpdir(), env: process.env }), /too much output/);
  await assert.rejects(runProcess(process.execPath, ['-e', 'console.log("blocked event");setTimeout(()=>{}, 10000)'], {
    cwd: tmpdir(), env: process.env, onLine: () => { throw new Error('stop this tool'); } }), /invalid teaching event/);
  await assert.rejects(runProcess(join(tmpdir(), 'missing-codex-executable.exe'), [], { cwd: tmpdir(), env: process.env }), /could not start/);
});
