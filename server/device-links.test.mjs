import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DeviceLinks} from './device-links.mjs';

test('device continuation is expiring, single use and does not consume a code on an occupied target',()=>{
  let now=0;const links=new DeviceLinks(()=>now);
  const first=links.issue('owner');
  assert.match(first.code,/^[0-9]{6}$/);
  assert.throws(()=>links.claim(first.code,()=>false),/already has learning records/);
  assert.equal(links.claim(first.code,()=>true),'owner');
  assert.throws(()=>links.claim(first.code,()=>true),/already used/);
  const second=links.issue('owner');now=300001;
  assert.throws(()=>links.claim(second.code,()=>true),/expired/);
});

test('issuing a new code revokes the previous code and guesses are bounded',()=>{
  const links=new DeviceLinks(()=>0),old=links.issue('owner'),next=links.issue('owner');
  assert.throws(()=>links.claim(old.code,()=>true),/already used/);
  assert.equal(links.claim(next.code,()=>true),'owner');
  for(let i=0;i<8;i++)assert.throws(()=>links.claim('999999',()=>true),/expired/);
  assert.throws(()=>links.claim('999999',()=>true),/Wait one minute/);
});
