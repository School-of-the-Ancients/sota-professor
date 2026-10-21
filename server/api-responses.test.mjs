import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiResponsesTeachingProvider } from './api-responses.mjs';
import { readFileSync } from 'node:fs';

test('optional API adapter remains inactive despite environment keys and is absent from runtime wiring', async () => {
  let called = false;
  const provider = new ApiResponsesTeachingProvider({ fetchImpl: async () => { called = true; } });
  await assert.rejects(provider.generate('teach', {}), /Inactive optional API adapter/);
  assert.equal(called, false);
  assert(!readFileSync(new URL('./vite-plugin.mjs', import.meta.url), 'utf8').includes('api-responses'));
});
test('explicit API contract remains server-side, structured, bounded and tool-free using mocked transport only', async () => {
  let request;
  const provider = new ApiResponsesTeachingProvider({ apiKey: 'test-only', model: 'test-model', fetchImpl: async (_url, options) => {
    request = options;
    return Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify({ text: 'A mocked reply', suggestions: [] }) }] }] });
  } });
  assert.equal((await provider.generate('teach', { messages: ['synthetic'] })).text, 'A mocked reply');
  const body = JSON.parse(request.body);
  assert.deepEqual(body.tools, []);
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert(!JSON.stringify(provider.status()).includes('test-only'));
});
test('optional API errors and refusals cannot leak upstream credentials or raw bodies', async () => {
  for (const fetchImpl of [() => new Response('private-secret', { status: 401 }), () => Response.json({ status: 'incomplete', output: [] }),
    () => Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'private-secret' }] }] }),
    () => { throw new Error('private-secret'); }]) {
    const provider = new ApiResponsesTeachingProvider({ apiKey: 'test-only', model: 'test-model', fetchImpl });
    await assert.rejects(provider.generate('teach', {}), error => error.status >= 400 && !error.message.includes('private-secret'));
  }
});
