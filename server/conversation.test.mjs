import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journal,appendEvent,markDelivery} from './conversation.mjs';
import {createSession,advanceSession} from './teaching.mjs';
import {mockProvider} from './fixtures.mjs';

test('legacy messages survive journal migration; retries cannot alter event identities',()=>{
  const session={id:'lesson',createdAt:'today',messages:[{role:'assistant',text:'Hello'}]};
  assert.equal(journal(session).events.length,1);
  const event={id:'turn1',speaker:'learner',recipient:'operator',inputKind:'voice',text:'Move the cube',worldId:'world'};
  appendEvent(session,event);appendEvent(session,event);
  assert.equal(journal(session).events.length,2);
  assert.throws(()=>appendEvent(session,{...event,text:'Delete everything'}),/identity changed/);
  assert.throws(()=>appendEvent(session,{...event,id:'fake',speaker:'professor'}),/speaker/);
});
test('shared Operator context reaches the teacher without becoming learner assessment evidence',async()=>{
  const provider=mockProvider();const generate=provider.generate.bind(provider);let context;
  provider.generate=async(kind,input)=>{if(kind==='teach')context=input;return generate(kind,input);};
  let session=await createSession(provider,{goal:'Learn algorithms',mentor:'Ada Lovelace'});
  assert.equal(session.conversation.events.length,1);
  appendEvent(session,{id:'op1',speaker:'learner',recipient:'operator',inputKind:'voice',text:'Move the cube',worldId:'world'});
  const event={id:'spoken1',speaker:'learner',recipient:'professor',inputKind:'voice',text:'Explain the cube',worldId:'world'};
  appendEvent(session,event);
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:event.text},event.id);
  assert(context.sharedConversation.some(event=>event.text==='Move the cube'));
  assert(!session.messages.some(message=>message.text==='Move the cube'));
  assert.equal(session.conversation.events.filter(event=>event.id==='spoken1').length,1);
  markDelivery(session,{eventId:'reply:spoken1',delivery:'interrupted'});
  markDelivery(session,{eventId:'reply:spoken1',delivery:'speaking'});
  assert.equal(session.conversation.events.at(-1).delivery,'interrupted');
});
