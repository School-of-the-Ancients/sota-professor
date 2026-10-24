import { randomBytes } from 'node:crypto';
import { createSession, advanceSession, publicSession, requireValue, SchoolError } from './teaching.mjs';
import { createTeacher, teacherRoster } from './mentors.mjs';
import { findTeacher } from '../src/school/personas.mjs';
import { ExhibitPreparer } from './exhibit-preparation.mjs';
import { acceptOperatorResult } from './operator.mjs';
import { journal, appendEvent, markDelivery } from './conversation.mjs';
import { acceptTaskResult } from './operator-tasks.mjs';

const COOKIE = 'sota-local-learner';
const UUID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';

async function readBody(req) {
  requireValue(req.headers['content-type']?.split(';')[0] === 'application/json', 415, 'Send JSON requests.');
  let size = 0;
  const parts = [];
  for await (const part of req) {
    size += part.length;
    requireValue(size <= 12000, 413, 'The request is too large.');
    parts.push(part);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new SchoolError(400, 'Invalid JSON request.'); }
}

export function createSchoolApi({ store, provider, now = Date.now }) {
  const preparations = new ExhibitPreparer({ store, provider });
  const rates = new Map();
  let active = 0;
  let globalRate = { start: now(), count: 0 };
  let journalRate = { start: now(), count: 0 };
  const handler = async (req, res, next = () => {}) => {
    if (!req.url?.startsWith('/api/school')) return next();
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(value));
    };
    let counted = false;
    let ticket = null;
    try {
      // Local prototype only: defend against DNS rebinding and cross-site subscription use.
      const host = req.headers.host ?? '';
      requireValue(/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host), 403, 'School is available on the local computer only.');
      requireValue(!req.headers.origin || req.headers.origin === `http://${host}`, 403, 'Cross-origin requests are disabled.');
      requireValue(!req.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(req.headers['sec-fetch-site']), 403, 'Cross-site requests are disabled.');
      const path = req.url.split('?')[0];
      if (req.method === 'GET' && path === '/api/school/status') return send(200, provider.check ? await provider.check() : provider.status());
      let owner = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
      if (!owner || !/^[a-f0-9]{64}$/.test(owner)) {
        owner = randomBytes(32).toString('hex');
        res.setHeader('Set-Cookie', `${COOKIE}=${owner}; HttpOnly; SameSite=Strict; Path=/api/school; Max-Age=31536000`);
      }
      requireValue(req.method === 'GET' || req.method === 'POST', 405, 'Method not allowed.');
      if (req.method === 'POST') {
        const time = now();
        if (time - globalRate.start > 60000) globalRate = { start: time, count: 0 };
        if (time - journalRate.start > 60000) journalRate = { start: time, count: 0 };
        const metadata = /\/(conversation|speech-delivery|operator-task-result)$/.test(path);
        const globalBucket = metadata ? journalRate : globalRate;
        requireValue(globalBucket.count < (metadata ? 240 : 40), 429, 'The local request limit has been reached. Wait a minute before continuing.');
        for (const [key, value] of rates) if (time - value.start > 60000) rates.delete(key);
        const rateKey = owner + (metadata ? ':journal' : ':teaching');
        const bucket = rates.get(rateKey) ?? { start: time, count: 0 };
        requireValue(bucket.count < (metadata ? 120 : 12) && rates.size < 1000, 429, 'Too many requests. Wait a minute before continuing.');
        bucket.count++;
        globalBucket.count++;
        rates.set(rateKey, bucket);
        requireValue(active < 4, 503, 'The local teaching server is busy. Try again shortly.');
        active++;
        counted = true;
      }
      if (path === '/api/school/teachers') {
        const body = req.method === 'POST' ? await readBody(req) : null;
        const result = await store.transaction(owner, async data => {
          if (req.method === 'GET') return { value: teacherRoster(data.teachers) };
          requireValue((data.teachers?.length || 0) < 30, 422, 'This archive has reached its limit of 30 custom teachers.');
          const existing = typeof body?.name === 'string' ? findTeacher(body.name, data.teachers) : null;
          if (existing && Object.keys(body).length === 1) return { value: existing };
          const teacher = await createTeacher(provider, body);
          data.teachers = [...(data.teachers || []), teacher];
          return { write: true, value: teacher };
        }, { readOnly: req.method === 'GET' });
        return send(req.method === 'POST' ? 201 : 200, result);
      }
      const match = path.match(new RegExp(`^/api/school/sessions/(${UUID})(?:/(message|quiz|answers|assess|presentation|presentation-edit|exhibit-prepare|operator-result|operator-task-result|conversation|spoken-message|speech-delivery))?$`));
      if (req.method === 'GET' && path === '/api/school/sessions') {
        const list = await store.transaction(owner, data => ({ value: data.sessions.map(session => ({ id: session.id, title: session.title,
          mentorName: session.mentor.name, status: session.status, updatedAt: session.updatedAt })).reverse() }), { readOnly: true });
        return send(200, list);
      }
      if (req.method === 'POST' && path === '/api/school/sessions') {
        const body = await readBody(req);
        const session = await store.transaction(owner, async data => {
          requireValue(data.sessions.length < 50, 422, 'This local browser has reached its limit of 50 quests. Export and preserve your learning records before starting another archive.');
          const created = await createSession(provider, body, data.teachers || [], selected => { ticket = preparations.start(owner, selected); });
          data.sessions.push(created);
          return { write: true, value: created };
        });
        preparations.publish(ticket);
        return send(201, preparations.snapshot(session, owner));
      }
      requireValue(match, 404, 'School endpoint not found.');
      const body = req.method === 'POST' ? await readBody(req) : null;
      const session = await store.transaction(owner, async data => {
        const index = data.sessions.findIndex(session => session.id === match[1]);
        requireValue(index >= 0, 404, 'Session not found in this browser archive.');
        if (req.method === 'GET' && !match[2]) return { value: data.sessions[index] };
        requireValue(req.method === 'POST' && match[2], 405, 'Method not allowed.');
        if(match[2]==='operator-task-result'){
          const changed=await acceptTaskResult(data.sessions[index],body);
          return {write:changed,value:data.sessions[index]};
        }
        if (match[2] === 'conversation') {
          requireValue(body && Object.keys(body).join() === 'event', 400, 'Send one conversation event.');
          appendEvent(data.sessions[index], body.event);
          return { write: true, value: data.sessions[index] };
        }
        if (match[2] === 'speech-delivery') {
          markDelivery(data.sessions[index], body);
          return { write: true, value: data.sessions[index] };
        }
        if (match[2] === 'spoken-message') {
          requireValue(body && Object.keys(body).sort().join() === 'eventId,revision', 400, 'Invalid spoken message.');
          const events = journal(data.sessions[index]).events;
          const event = events.find(item => item.id === body.eventId && item.speaker === 'learner' && item.recipient === 'professor');
          requireValue(event, 400, 'Record this learner turn before delivery.');
          if (events.some(item => item.id === `reply:${event.id}`)) return { value: data.sessions[index] };
          data.sessions[index] = await advanceSession(provider, data.sessions[index], 'message', { revision: body.revision, text: event.text }, event.id);
          return { write: true, value: data.sessions[index] };
        }
        if (match[2] === 'operator-result') {
          const changed = await acceptOperatorResult(data.sessions[index], body);
          return { write: changed, value: data.sessions[index] };
        }
        if (match[2] === 'exhibit-prepare') {
          const request = data.sessions[index].presentations?.find(item => item.origin === 'initial');
          requireValue(!request || !preparations.jobs.has(`${owner}:${request.preparation?.token}`), 409, 'The initial exhibit request is already preparing. No duplicate job was started.');
        }
        const updated = await advanceSession(provider, data.sessions[index], match[2], body);
        if (match[2] === 'exhibit-prepare') ticket = preparations.start(owner, updated);
        data.sessions[index] = updated;
        return { write: true, value: updated };
      }, { readOnly: req.method === 'GET', waitForLock: ['conversation','speech-delivery','operator-task-result'].includes(match[2]) });
      preparations.publish(ticket);
      return send(200, preparations.snapshot(session, owner));
    } catch (error) {
      preparations.abandon(ticket);
      send(error instanceof SchoolError || error.status ? error.status : 500,
        { error: error instanceof SchoolError || error.status ? error.message : 'The local server could not save this request. Reopen the session to check its state before retrying.' });
    } finally { if (counted) active--; }
  };
  handler.preparations = preparations;
  return handler;
}
