import { CodexTeachingProvider, SUPPORTED_VERSION, runProcess } from './codex.mjs';
import { validateTurn } from './teaching.mjs';

// Explicit opt-in only. npm tests never invoke a real model.
const diagnose = process.argv.includes('--diagnose');
const provider = new CodexTeachingProvider({ runner: (exe, args, options) => runProcess(exe, args, {
  ...options, ...(options.onLine ? { onLine: line => {
    if (diagnose) {
      try {
        const event = JSON.parse(line);
        if (event.item?.type === 'error') {
          const diagnostic = JSON.stringify(event.item)
            .replace(/Bearer\s+[^\s"\\]+/gi, 'Bearer [redacted]')
            .replace(/\b(?:sk-|sess-)[A-Za-z0-9_-]+/g, '[redacted]')
            .replace(/\beyJ[A-Za-z0-9_.-]+/g, '[redacted]')
            .replace(/[A-Z]:\\\\Users\\\\[^\\]+/gi, '[user-path]');
          console.log(JSON.stringify({ stage: 'native-error-diagnostic', detail: diagnostic.slice(0, 1200) }));
        }
      } catch { /* Only parse native JSON; never print arbitrary process output. */ }
    }
    options.onLine(line);
  } } : {}),
}) });
const status = await provider.check();
console.log(JSON.stringify({ stage: 'native-check', ...status, verifiedCliVersion: SUPPORTED_VERSION }));
if (!status.configured) process.exitCode = 2;
else if (process.argv.includes('--live')) {
  try {
    const value = validateTurn(await provider.generate('teach', {
      goal: 'Understand prime numbers.', mentor: { name: 'Euclid', era: 'Classical antiquity', expertise: 'Mathematics' },
      objectives: [{ id: 'prime', label: 'Distinguish a prime number from a composite number.' }],
      messages: [{ role: 'user', text: 'Is 7 a prime number? Explain briefly, then ask one question.' }],
      task: 'Answer this synthetic teaching question in under 80 words. No tools or external context.',
    }));
    console.log(JSON.stringify({ stage: 'live-teaching', completed: true, requestedModel: provider.status().requestedModel,
      toolCallsAccepted: 0, advisories: provider.status().advisories ?? [], text: value.text, suggestions: value.suggestions }));
  } catch (error) { console.log(JSON.stringify({ stage: 'live-teaching', completed: false, reason: error.message })); process.exitCode = 1; }
} else console.log('Native check only. Pass --live to spend one bounded ChatGPT-subscription teaching turn.');
