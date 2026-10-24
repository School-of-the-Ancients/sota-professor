import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession, advanceSession} from './teaching.mjs';
import {mockProvider} from './fixtures.mjs';
import {interactionSettings, interactionProblems} from './teaching-interaction.mjs';
import {teachingPrompt} from './schemas.mjs';

test('brief dialogue is default, explicit detail is allowed, and one question is the limit',()=>{
  const brief=interactionSettings([{role:'user',text:'What do you notice?'}]);
  const detail=interactionSettings([{role:'user',text:'Please explain this in detail.'}]);
  assert.equal(brief.mode,'brief_dialogue');
  assert.equal(detail.mode,'requested_detail');
  assert(interactionProblems('word '.repeat(120),brief).length);
  assert.equal(interactionProblems('word '.repeat(120),detail).length,0);
  assert.equal(interactionSettings([{role:'user',text:'Please explain in detail, but keep it short.'}]).mode,'brief_dialogue');
  assert(interactionProblems('What changed? Why did it change?',brief).length);
  assert.equal(interactionProblems('Notice the circle. Which length could you compare?',brief).length,0);
  assert(interactionProblems('- Look at the circle.\n- Look at the square.',brief).length);
  assert(interactionProblems('<expr:happy> Look at the figure.',brief).length);
});

test('current turn policy overrides a verbose saved persona and preserves grounding distinctions',()=>{
  const prompt=teachingPrompt('teach',{mentor:{systemInstruction:'Give a lengthy introduction.'},interaction:interactionSettings()});
  assert(prompt.indexOf('Conversational teaching policy')>prompt.indexOf('Give a lengthy introduction.'));
  for(const text of ['ONE focused question','Do not answer your own question','completed task may report failure','Do not claim to see the student','Reuse existing exhibits'])assert(prompt.includes(text));
});

test('shortening a multi-question draft retains its one original tool request without duplication',async()=>{
  const provider=mockProvider();let session=await createSession(provider,{goal:'Algorithms',mentor:'Ada Lovelace'});
  let calls=0;
  provider.generate=async(kind,context)=>{
    assert.equal(kind,'teach');calls++;
    if(calls===1)return {text:'word '.repeat(120)+' What do you notice? What would you change?',suggestions:[],
      toolCalls:[{name:'matrix_operator',arguments:{title:'Counters',instruction:'Create three counters',objectiveId:'sequence'}}]};
    assert(context.responseRevision.problems.length===2);
    assert.equal(context.responseRevision.toolCalls[0].arguments.title,'Counters');
    return {text:'I have requested three counters. Which operation should we try first?',suggestions:['Start with addition.'],
      toolCalls:[{name:'matrix_operator',arguments:{title:'Wrong extra action',instruction:'Create another object',objectiveId:'sequence'}}]};
  };
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:'Can Operator create counters?'});
  assert.equal(calls,2);assert.equal(session.operatorTasks.length,1);assert.equal(session.operatorTasks[0].title,'Counters');
  assert.equal(session.messages.at(-1).text,'I have requested three counters. Which operation should we try first?');
  assert.equal(session.conversation.events.filter(event=>event.speaker==='professor'&&event.recipient==='learner').length,2);
});

test('repeated invalid style leaves the saved lesson unchanged and executes no task',async()=>{
  const provider=mockProvider(),session=await createSession(provider,{goal:'Algorithms',mentor:'Ada Lovelace'});
  const before=JSON.stringify(session);
  provider.generate=async()=>({text:'What do you notice? Why?',suggestions:[]});
  await assert.rejects(advanceSession(provider,session,'message',{revision:session.revision,text:'Help me compare.'}),/short, single-question/);
  assert.equal(JSON.stringify(session),before);
});

test('next turn receives the actual student answer and distinct pending versus loaded evidence',async()=>{
  const provider=mockProvider();let session=await createSession(provider,{goal:'Algorithms',mentor:'Ada Lovelace'});
  session.operatorTasks=[{id:'task',title:'An unfinished build',status:'running',execution:{result:'',message:'Working'}}];
  session.presentations=[{id:'exhibit',version:1,title:'Sequence cards',objectiveId:'sequence',operator:{
    requestVersion:1,status:'object_loaded',summary:'Loaded with receipt',observedAt:'2026-10-24T00:00:00Z',
    build:{runtimeId:'runtime',objectIds:['cards']}}}];
  session=await advanceSession(provider,session,'message',{revision:session.revision,text:'The order changes the result.'});
  const context=provider.calls.at(-1).context;
  assert.equal(context.messages.at(-1).text,'The order changes the result.');
  assert.equal(context.operatorTasks[0].status,'running');
  assert.equal(context.operatorResults[0].status,'object_loaded');
  assert.deepEqual(context.operatorResults[0].objectIds,['cards']);
  assert.equal(context.operatorResults[0].interactionVerified,false);
  assert.equal(context.interaction.maxQuestions,1);
});
