import { randomBytes } from 'node:crypto';
import { requireValue } from './teaching.mjs';

// Short-lived, one-use continuation codes. No Codex credentials cross devices.
export class DeviceLinks {
  constructor(now = Date.now) { this.now = now; this.links = new Map(); this.attempts = []; }
  issue(owner) {
    for (const [code, link] of this.links) if (link.expiresAt <= this.now() || link.owner === owner) this.links.delete(code);
    requireValue(this.links.size < 100, 429, 'Too many device links. Try again in five minutes.');
    const code = randomBytes(6).toString('hex').toUpperCase();
    const expiresAt = this.now() + 300000;
    this.links.set(code, { owner, expiresAt });
    return { code, expiresAt };
  }
  claim(code, canSwitch) {
    this.attempts = this.attempts.filter(time => this.now() - time < 60000);
    requireValue(this.attempts.length < 10, 429, 'Too many link attempts. Wait one minute.');
    this.attempts.push(this.now());
    requireValue(typeof code === 'string' && /^[A-F0-9]{12}$/.test(code), 400, 'Enter the 12-character device code.');
    const link = this.links.get(code);
    requireValue(link && link.expiresAt > this.now(), 400, 'This device code expired or was already used.');
    requireValue(canSwitch(link.owner), 409, 'This browser already has learning records. Use a fresh browser profile to link without losing access to them.');
    this.links.delete(code);
    return link.owner;
  }
}
