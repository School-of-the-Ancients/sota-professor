import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { StringDecoder } from 'node:string_decoder';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { SchoolError, requireValue, validatePlan, validateTurn } from './teaching.mjs';
import { schemas, teachingPrompt } from './schemas.mjs';

// Verified against the installed CLI's help/features on Demerzel. New versions
// fail closed until their invocation and tool surface have been checked.
export const SUPPORTED_VERSION = '0.159.0';
export const CODE_MODE_DISABLED_NOTICE = 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.';
export const DISABLED_FEATURES = [
  'shell_tool', 'unified_exec', 'apps', 'plugins', 'hooks', 'shell_snapshot',
  'browser_use', 'browser_use_external', 'browser_use_full_cdp_access',
  'computer_use', 'code_mode_host', 'code_mode', 'code_mode_only', 'in_app_browser',
  'image_generation', 'realtime_conversation', 'view_image', 'multi_agent', 'multi_agent_v2',
  'skill_search', 'skill_mcp_dependency_install', 'tool_suggest', 'request_permissions_tool',
  'default_mode_request_user_input', 'workspace_dependencies', 'sleep_tool', 'goals',
  'in_app_local_automation', 'remote_plugin', 'memories', 'unbounded_connection_retries',
];
const LIMIT = 1024 * 1024;
const REQUIRED_FLAGS = ['--ignore-user-config', '--ignore-rules', '--ephemeral', '--sandbox', '--json', '--output-schema', '--output-last-message', '--disable', '--strict-config'];
const ALLOWED_ENV = new Set(['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
  'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP', 'HOME', 'CODEX_HOME', 'HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'NO_PROXY', 'SYSTEMDRIVE']);

/** Inherit native login location and OS/proxy settings, never API/token/provider overrides. */
export function subscriptionEnvironment(environment = process.env) {
  return Object.fromEntries(Object.entries(environment).filter(([key, value]) => ALLOWED_ENV.has(key.toUpperCase()) && typeof value === 'string'));
}

export function discoverCodex(environment = process.env) {
  if (environment.SCHOOL_CODEX_EXE) return environment.SCHOOL_CODEX_EXE;
  if (process.platform === 'win32' && environment.APPDATA) {
    const executable = join(environment.APPDATA, 'npm', 'node_modules', '@openai', 'codex', 'node_modules', '@openai', 'codex-win32-x64', 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe');
    if (existsSync(executable)) return executable;
  }
  // Never execute cmd/PowerShell/npm shims or build a command string.
  for (const directory of (environment.PATH ?? '').split(process.platform === 'win32' ? ';' : ':')) {
    const executable = join(directory, process.platform === 'win32' ? 'codex.exe' : 'codex');
    if (isAbsolute(executable) && existsSync(executable)) return executable;
  }
  return '';
}

/** Every subprocess is direct, hidden, bounded and cancellable. Raw output stays server-side. */
export function runProcess(executable, args, { cwd, env, input = '', timeoutMs = 15000, onLine }) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(executable, args, { cwd, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = []; const stderr = []; const decoder = new StringDecoder('utf8'); let bytes = 0; let pending = ''; let failure;
    const stop = error => { if (!failure) { failure = error; child.kill(); } };
    const timer = setTimeout(() => stop(new SchoolError(504, 'Codex took too long. Subscription limits or local connectivity may be involved. Your session is unchanged.')), timeoutMs);
    const collect = (list, part, scan) => {
      bytes += part.length;
      if (bytes > LIMIT) return stop(new SchoolError(502, 'Codex returned too much output. Your session is unchanged.'));
      list.push(part);
      if (scan && onLine) {
        pending += decoder.write(part);
        const lines = pending.split('\n'); pending = lines.pop();
        try { for (const line of lines) if (line.trim()) onLine(line); }
        catch (error) { stop(error instanceof SchoolError ? error : new SchoolError(502, 'Codex returned an invalid teaching event.')); }
      }
    };
    child.stdout.on('data', part => collect(stdout, part, true));
    child.stderr.on('data', part => collect(stderr, part, false));
    child.on('error', () => stop(new SchoolError(503, 'The native Codex process could not start on this computer.')));
    child.on('close', code => {
      clearTimeout(timer);
      pending += decoder.end();
      if (!failure && onLine && pending.trim()) { try { onLine(pending); } catch (error) { failure = error; } }
      if (failure) reject(failure);
      else resolveResult({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

export function eventReader() {
  let thread = false; let started = false; let completed = false; let lastMessage;
  const advisories = [];
  return {
    advisories,
    line(raw) {
      let event;
      try { event = JSON.parse(raw); } catch { throw new SchoolError(502, 'Codex returned malformed teaching events.'); }
      requireValue(event && typeof event === 'object' && !completed, 502, 'Codex returned an invalid teaching event sequence.');
      if (event.type === 'thread.started') { requireValue(!thread && !started, 502, 'Codex returned an invalid teaching event sequence.'); thread = true; }
      else if (event.type === 'turn.started') { requireValue(thread && !started, 502, 'Codex returned an invalid teaching event sequence.'); started = true; }
      else if (event.type === 'turn.completed') { requireValue(started, 502, 'Codex did not start a teaching turn.'); completed = true; }
      else if (['item.started', 'item.updated', 'item.completed'].includes(event.type)) {
        if (event.item?.type === 'error') {
          // Codex 0.159 emits this intentional disabled-host state as an error
          // item. It grants no authority and is not a failed inference turn.
          // Accept only this exact controller notice, never arbitrary errors.
          if (event.type === 'item.completed' && event.item.message === CODE_MODE_DISABLED_NOTICE
            && Object.keys(event.item).every(key => ['id', 'type', 'message'].includes(key))) {
            advisories.push('code_mode_host_disabled'); return;
          }
          const detail = JSON.stringify(event.item);
          let reason = 'Native Codex reported a teaching error.';
          if (/schema|additionalProperties|required|output_schema|response.format/i.test(detail)) reason = 'Native Codex rejected the structured response schema.';
          else if (/model.*(not|unavailable|unsupported)|unrecognized.model|unsupported.model|does not exist/i.test(detail)) reason = 'The selected model is unavailable for this native Codex request.';
          else if (/usage.limit|rate.limit|quota|limit.exceeded/i.test(detail)) reason = 'The ChatGPT subscription usage limit was reached.';
          else if (/network|connect|websocket|transport|TLS|DNS|stream.*disconnect|retry/i.test(detail)) reason = 'Native Codex could not complete its network connection.';
          else if (/auth|401|403|expired|sign.in/i.test(detail)) reason = 'Native Codex could not authenticate this subscription request.';
          else if (/sandbox|permission|read.only|access.denied/i.test(detail)) reason = 'Native Codex could not enforce its local permissions.';
          throw new SchoolError(502, reason + ' Your session is unchanged; no API fallback was used.');
        }
        const type = /^[a-z_]{1,60}$/.test(event.item?.type) ? event.item.type : 'unknown';
        requireValue(started && event.item && ['agent_message', 'reasoning'].includes(event.item.type), 502, `An unsupported Codex item (${type}) was returned. The teaching process was stopped.`);
        if (event.type === 'item.completed' && event.item.type === 'agent_message') lastMessage = event.item.text;
      } else throw new SchoolError(502, 'Codex failed, was interrupted, or returned an unsupported teaching event. Your session is unchanged.');
    },
    result(final) {
      try {
        requireValue(completed && typeof lastMessage === 'string' && final.length <= 40000
          && JSON.stringify(JSON.parse(lastMessage)) === JSON.stringify(JSON.parse(final)), 502, 'Codex did not complete a matching structured teaching response.');
        return JSON.parse(final);
      } catch (error) { if (error instanceof SchoolError) throw error; throw new SchoolError(502, 'Codex returned malformed teaching JSON. Your session is unchanged.'); }
    },
  };
}

export class CodexTeachingProvider {
  constructor({ executable = discoverCodex(), model = process.env.SCHOOL_CODEX_MODEL || 'gpt-6.1-sol', runner = runProcess, environment = process.env, timeoutMs = 120000 } = {}) {
    this.executable = executable; this.model = model; this.runner = runner;
    this.env = subscriptionEnvironment(environment); this.timeoutMs = timeoutMs;
    this.ready = false; this.capabilitiesChecked = false; this.liveValidated = false;
    this.message = 'Checking native Codex and its existing ChatGPT sign-in on this computer. Subscription limits apply.';
  }
  status() {
    return { provider: 'codex-chatgpt', configured: this.ready, liveValidated: this.liveValidated,
      requestedModel: this.model, message: this.message, ...(this.lastAdvisories ? { advisories: this.lastAdvisories } : {}) };
  }
  async workspace(operation) {
    const root = resolve(tmpdir());
    const directory = mkdtempSync(join(root, 'school-codex-'));
    try { return await operation(directory); }
    finally {
      const target = resolve(directory);
      if (target.startsWith(root + sep) && basename(target).startsWith('school-codex-')) rmSync(target, { recursive: true, force: true });
    }
  }
  async verify(directory) {
    requireValue(isAbsolute(this.executable) && existsSync(this.executable) && lstatSync(this.executable).isFile()
      && (process.platform !== 'win32' || this.executable.toLowerCase().endsWith('.exe'))
      && /^[a-zA-Z0-9][\w.:-]{0,99}$/.test(this.model), 503, 'A supported native Codex executable is needed on this computer. No API-key fallback is available.');
    if (!this.capabilitiesChecked) {
      const version = await this.runner(this.executable, ['--version'], { cwd: directory, env: this.env });
      requireValue(version.code === 0 && version.stdout.trim() === `codex-cli ${SUPPORTED_VERSION}`, 503, `This teaching adapter is verified for Codex ${SUPPORTED_VERSION}. The installed version needs a compatibility review before teaching can run.`);
      const help = await this.runner(this.executable, ['exec', '--help'], { cwd: directory, env: this.env });
      const features = await this.runner(this.executable, ['features', 'list'], { cwd: directory, env: this.env });
      const names = new Set(features.stdout.split(/\r?\n/).map(line => line.trim().split(/\s+/)[0]));
      requireValue(help.code === 0 && features.code === 0 && REQUIRED_FLAGS.every(flag => help.stdout.includes(flag))
        && [...DISABLED_FEATURES, 'skip_host_skill_discovery'].every(feature => names.has(feature)),
      503, 'The installed Codex cannot enforce this adapter’s teaching-only configuration. It was not started.');
      this.capabilitiesChecked = true;
    }
    const auth = await this.runner(this.executable, ['login', 'status'], { cwd: directory, env: this.env });
    requireValue(auth.code === 0 && (auth.stdout + '\n' + auth.stderr).split(/\r?\n/).some(line => line.trim() === 'Logged in using ChatGPT'),
      503, 'Codex ChatGPT sign-in is unavailable for the Windows account running School. Sign in with codex login on this computer, then recheck. No API-key fallback is available.');
    this.ready = true;
    this.message = `Codex on this computer · ChatGPT sign-in · ${this.model}. Subscription limits apply; model access is verified only by a completed teaching turn.`;
  }
  async check() {
    try { await this.workspace(directory => this.verify(directory)); }
    catch (error) { this.ready = false; this.message = error instanceof SchoolError ? error.message : 'Native Codex is unavailable on this computer. Your saved sessions remain available.'; }
    return this.status();
  }
  async generate(kind, context) {
    requireValue(Object.hasOwn(schemas, kind), 400, 'Unknown teaching operation.');
    const prompt = teachingPrompt(kind, context);
    requireValue(Buffer.byteLength(prompt) <= 160000, 422, 'This session exceeds the teaching context limit. Its full history remains saved.');
    try {
      return await this.workspace(async directory => {
        await this.verify(directory);
        const schemaPath = join(directory, 'response-schema.json');
        const finalPath = join(directory, 'response.json');
        writeFileSync(schemaPath, JSON.stringify(schemas[kind]), { encoding: 'utf8', mode: 0o600 });
        const args = ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config', '--skip-git-repo-check',
          '--sandbox', 'read-only', '--json', '--color', 'never', '--output-schema', schemaPath, '--output-last-message', finalPath,
          '--config', 'approval_policy="never"', '--config', 'web_search="disabled"', '--config', 'forced_login_method="chatgpt"',
          '--config', 'model_provider="openai"', '--config', 'mcp_servers={}', '--config', 'project_doc_max_bytes=0',
          '--config', 'suppress_unstable_features_warning=true',
          '--enable', 'skip_host_skill_discovery'];
        for (const feature of DISABLED_FEATURES) args.push('--disable', feature);
        args.push('--model', this.model, '-');
        const events = eventReader();
        const result = await this.runner(this.executable, args, { cwd: directory, env: this.env, input: prompt, timeoutMs: this.timeoutMs, onLine: line => events.line(line) });
        requireValue(result.code === 0, 502, 'Codex did not complete the teaching request. Check subscription limits, selected model access and local connectivity. No API fallback was used.');
        requireValue(existsSync(finalPath) && lstatSync(finalPath).isFile() && lstatSync(finalPath).size <= 40000, 502, 'Codex did not write a complete structured teaching response.');
        const value = events.result(readFileSync(finalPath, 'utf8'));
        this.lastAdvisories = [...events.advisories];
        // Domain validation runs again in the teaching core before any save.
        if (kind === 'plan') validatePlan(value);
        if (kind === 'teach') validateTurn(value);
        this.liveValidated = true;
        return value;
      });
    } catch (error) {
      if (error instanceof SchoolError) { if (error.status === 503) { this.ready = false; this.message = error.message; } throw error; }
      throw new SchoolError(502, 'The local Codex teaching request failed. Your session is unchanged. No API fallback was used.');
    }
  }
}
