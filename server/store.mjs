import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { SchoolError, requireValue } from './teaching.mjs';

/** One local server owns these files. Per-owner serialization avoids lost updates. */
export class SessionStore {
  constructor(directory) { this.directory = directory; this.locks = new Map(); }
  async transaction(owner, change, { readOnly = false } = {}) {
    requireValue(/^[a-f0-9]{64}$/.test(owner), 400, 'Invalid local learner identity.');
    requireValue(readOnly || !this.locks.has(owner), 409, 'Another request is running for this browser. Wait, then reopen the session.');
    if (!readOnly) this.locks.set(owner, true);
    try {
      const file = join(this.directory, `${owner}.json`);
      let data = { version: 1, sessions: [] };
      try {
        const raw = await readFile(file, 'utf8');
        requireValue(Buffer.byteLength(raw) <= 16000000, 500, 'The local session archive is too large. It has not been modified.');
        data = JSON.parse(raw);
        requireValue(data.version === 1 && Array.isArray(data.sessions), 500, 'The local session archive is unreadable. It has not been modified.');
      } catch (error) {
        if (error.code !== 'ENOENT') throw new SchoolError(500, 'The local session archive is unreadable. It has not been modified.');
      }
      const result = await change(data);
      requireValue(!readOnly || !result.write, 500, 'A read-only archive operation cannot write.');
      if (result.write) {
        const serialized = JSON.stringify(data);
        requireValue(Buffer.byteLength(serialized) <= 16000000, 422, 'The local archive has reached its size limit. Existing records have not been modified.');
        await mkdir(this.directory, { recursive: true });
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          await writeFile(temporary, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
          await rename(temporary, file);
        } finally { await unlink(temporary).catch(() => {}); }
      }
      return result.value;
    } finally { if (!readOnly) this.locks.delete(owner); }
  }
}
