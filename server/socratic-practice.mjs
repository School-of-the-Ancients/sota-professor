import {randomUUID} from 'node:crypto';
import {appendEvent} from './conversation.mjs';
import {advancePointPractice,publicPractice} from './point-practice.mjs';
import {interactionProblems,interactionSettings} from './teaching-interaction.mjs';
import {recentContext} from './context-window.mjs';

const requireValue=(ok,message,status=409)=>{if(!ok){const error=new Error(message);error.status=status;throw error;}};
const stages=['observe','explain','predict','transfer'];
const badges={observe:'Noticed',explain:'Explained',predict:'Predicted',transfer:'Connected'};
const clean=label=>label.replace(/^.*?\b[1-9]\s*[-–]\s*/,'').trim();
const exhibit=(practice,scene)=>scene?.roomId===practice.roomId&&scene?.objects?.find(o=>
  o.objectId===practice.objectId&&o.assetId===practice.assetId&&o.partsRevision===practice.partsRevision);
const referencePart=(reference,scene)=>scene?.objects?.find(o=>o.objectId===reference?.objectId&&
  o.assetId===reference?.assetId&&o.partsRevision===reference?.partsRevision)?.parts?.find(p=>p.partId===reference?.partId);
const allowedSelection=(p,reference,scene)=>referencePart(reference,scene)&&
  (reference.objectId===p.objectId||p.stage==='transfer');
const record=(session,practice,input,text,lecture='')=>{
  practice.lectureReplyId=null;
  if(lecture)practice.lectureReplyId=appendEvent(session,{id:`practice-lecture:${input.requestId}`,speaker:'professor',recipient:'learner',inputKind:'text',text:lecture,worldId:practice.roomId},true).id;
  practice.replyId=appendEvent(session,{id:`practice-reply:${input.requestId}`,speaker:'professor',recipient:'learner',inputKind:'text',text,worldId:practice.roomId},true).id;
  practice.requests=[...practice.requests,input.requestId].slice(-200);
  session.revision++;session.updatedAt=new Date().toISOString();return session;
};
function context(session,practice,scene,task,learnerText=''){
  const object=exhibit(practice,scene);
  return {task,goal:session.goal,mentor:session.mentor,objectives:session.objectives,
    stage:practice.stage,nextStage:stages[stages.indexOf(practice.stage)+1]||'complete',
    currentQuestion:practice.question,initialInquiry:practice.inquiry,learnerText,selectedPart:referencePart(practice.selection,scene)||null,
    selectedObject:scene.objects.find(o=>o.objectId===practice.selection?.objectId)?.label||'',
    exhibit:{label:object.label,parts:object.parts.filter(p=>p.provenance==='authored').slice(0,24)
      .map(({partId,label,description})=>({partId,label:clean(label),description:description?.slice(0,1800)}))},
    otherExhibits:(scene.objects||[]).filter(o=>o.objectId!==object.objectId&&o.parts?.length).slice(0,3)
      .map(o=>({label:o.label,parts:o.parts.filter(p=>p.provenance==='authored').slice(0,6).map(({label,description})=>({label:clean(label),description:description?.slice(0,500)}))})),
    recentTurns:recentContext(practice.turns,{maxItems:8,maxBytes:16000}),attemptsAtStage:practice.attemptsAtStage,
    hints:practice.hints,milestones:practice.milestones.map(({label})=>label)};
}
async function generate(provider,data){
  const result=await provider.generate('practice',data);
  requireValue(result&&Object.keys(result).sort().join(',')==='decision,evidenceQuote,evidenceReason,feedback,question'&&
    ['probe','advance','scaffold'].includes(result.decision)&&
    ['feedback','question','evidenceQuote','evidenceReason'].every(k=>typeof result[k]==='string')&&
    result.feedback.length<=650&&result.question.length>0&&result.question.length<=320&&
    result.evidenceQuote.length<=1000&&result.evidenceReason.length<=700&&
    !interactionProblems(`${result.feedback} ${result.question}`,interactionSettings()).length,
    'The professor could not prepare one focused practice question. Your progress is unchanged; try again.',502);
  if(data.task==='review'&&result.decision==='advance')requireValue(
    data.learnerText.trim().split(/\s+/).length>=4&&result.evidenceQuote.trim().length>=8&&
    data.learnerText.includes(result.evidenceQuote)&&result.evidenceReason.trim().length>=12,
    'The professor could not ground that milestone in your explanation. Your progress is unchanged; try again.',502);
  return result;
}

export function publicSocraticPractice(p){
  return {id:p.id,mode:p.mode,status:p.status,objectId:p.objectId,objectLabel:p.objectLabel,
    index:stages.indexOf(p.stage),total:4,found:p.milestones.length,streak:0,hints:p.hints,
    roundId:p.status==='active'?p.roundId:null,stage:p.stage,hideLabels:p.stage==='observe',
    question:p.question,feedback:p.feedback,replyId:p.replyId,lectureReplyId:p.lectureReplyId,
    milestones:p.milestones.map(({label})=>({label})),revisions:p.revisions,
    evidenceNote:'Practice evidence from this conversation, not a mastery score.'};
}

// Existing recognition practice remains resumable. Starting a new activity opts
// into dialogue and archives the previous activity without changing its scores.
export async function advancePractice(provider,existing,input,scene){
  if(input?.action!=='start'&&existing.practice?.mode!=='socratic')return advancePointPractice(existing,input,scene);
  requireValue(input&&['start','answer','respond','repeat','hint','stop'].includes(input.action),'Unknown practice action.',400);
  requireValue(Object.keys(input).every(k=>['revision','action','requestId','objectId','practiceId','roundId','partReference','text','inputKind','eventId'].includes(k)),'Unexpected practice input.',400);
  requireValue(typeof input.requestId==='string'&&/^[a-zA-Z0-9:._-]{1,160}$/.test(input.requestId),'Invalid practice request.',400);
  if(existing.practice?.requests?.includes(input.requestId))return existing;
  requireValue(input.revision===existing.revision,'The lesson changed. Refresh before continuing.');
  const session=structuredClone(existing);let p=session.practice;
  if(input.action==='start'){
    requireValue(scene?.runtimeId&&scene.roomId,'Connect the current Matrix world before starting practice.');
    if(p?.mode==='socratic'&&p.status==='active')return existing;
    if(p?.mode==='socratic'&&p.status==='stopped'&&exhibit(p,scene)){
      p.status='active';return record(session,p,input,p.question,'Let us continue from your saved question.');
    }
    if(p)session.practiceHistory=[...(session.practiceHistory||[]),p.mode==='socratic'?publicSocraticPractice(p):publicPractice(p)].slice(-20);
    const candidates=(scene.objects||[]).filter(o=>o.parts?.some(part=>part.provenance==='authored'&&part.description));
    const object=input.objectId?candidates.find(o=>o.objectId===input.objectId):candidates.find(o=>o.objectId===scene.selectedPart?.objectId)||candidates[0];
    requireValue(object,'Select an exhibit with described teaching parts.');
    p=session.practice={mode:'socratic',id:randomUUID(),status:'active',objectId:object.objectId,objectLabel:object.label,
      assetId:object.assetId,partsRevision:object.partsRevision,roomId:scene.roomId,runtimeId:scene.runtimeId,
      stage:'observe',roundId:randomUUID(),question:'',feedback:'',milestones:[],turns:[],requests:[],
      selection:null,revisions:0,hints:0,attemptsAtStage:0,replyId:null,lectureReplyId:null};
    const reply=await generate(provider,context(session,p,scene,'opening'));
    p.question=reply.question;p.inquiry=reply.question;p.feedback='Point to your best guess, then explain it.';
    return record(session,p,input,p.question,reply.feedback);
  }
  requireValue(p&&p.id===input.practiceId,'This practice session changed. Refresh it.');
  if(input.action==='stop'){p.status='stopped';return record(session,p,input,'Practice paused. Your ideas and progress are saved.');}
  requireValue(p.status==='active'&&p.roundId===input.roundId,'The practice question changed.');
  requireValue(scene?.runtimeId&&exhibit(p,scene),'The exhibit or its teaching parts changed. Stop and start a fresh practice.');
  p.runtimeId=scene.runtimeId;
  if(input.action==='repeat')return record(session,p,input,p.question);
  if(input.action==='hint'){
    const reply=await generate(provider,context(session,p,scene,'hint'));
    p.hints++;p.feedback='Hint used · your progress is kept';
    // The hint is a teaching phase; the same question remains available after it.
    p.question=reply.question;p.roundId=randomUUID();
    return record(session,p,input,p.question,reply.feedback);
  }
  if(input.action==='answer'){
    const part=referencePart(input.partReference,scene);
    requireValue(part,'That selected part is no longer available. Point again.');
    requireValue(allowedSelection(p,input.partReference,scene),'Point to a part of the exhibit we are exploring.');
    if(p.selection?.partId!==input.partReference.partId&&p.selection)p.revisions++;
    p.selection=structuredClone(input.partReference);
    const event=appendEvent(session,{id:`practice-input:${input.requestId}`,speaker:'learner',recipient:'professor',inputKind:'text',
      text:`Pointed to ${part.label}.`,partReference:p.selection,worldId:p.roomId});
    p.turns.push({stage:p.stage,eventId:event.id,text:event.text});
    if(p.stage==='observe'){
      p.milestones.push({label:badges.observe,eventId:event.id,reason:'Made an observation by choosing a part; correctness not inferred.'});
      p.stage='explain';p.roundId=randomUUID();p.attemptsAtStage=0;
      p.question='What do you notice about that part that supports your choice?';
    }else p.question=p.stage==='explain'?'What about your new choice supports your explanation?':p.question;
    p.feedback='Selection saved · tell me your reasoning';
    return record(session,p,input,p.question);
  }
  requireValue(typeof input.text==='string'&&input.text.trim().length>0&&input.text.length<=3000&&
    (!input.inputKind||['text','voice'].includes(input.inputKind)),'Give a short explanation or ask for a hint.',400);
  // A spoken claim can accompany a fresh point, but never a stale reference.
  if(input.partReference){
    requireValue(allowedSelection(p,input.partReference,scene),'Point to this exhibit again before explaining.');
    if(p.selection&&p.selection.partId!==input.partReference.partId)p.revisions++;
    p.selection=structuredClone(input.partReference);
  }
  if(p.stage==='observe'&&!p.selection)return record(session,p,input,'First point to your best guess and press A or X. We will explore your reason together.');
  if(p.stage==='observe'){
    p.milestones.push({label:badges.observe,reason:'Chose a part while explaining; correctness not inferred.'});p.stage='explain';
  }
  const text=input.text.trim(),reply=await generate(provider,context(session,p,scene,'review',text));
  const saved=input.eventId?session.conversation?.events.find(e=>e.id===input.eventId):null;
  if(input.eventId)requireValue(saved&&saved.speaker==='learner'&&saved.recipient==='professor'&&saved.text.trim()===text,
    'The saved explanation changed. Repeat your answer.',400);
  const event=saved||appendEvent(session,{id:`practice-input:${input.requestId}`,speaker:'learner',recipient:'professor',
    inputKind:input.inputKind||'text',text,worldId:p.roomId,...(p.selection?{partReference:p.selection}:{})});
  p.turns.push({stage:p.stage,eventId:event.id,text,decision:reply.decision});
  p.attemptsAtStage++;
  if(reply.decision==='advance'){
    if(p.attemptsAtStage>1)p.revisions++;
    p.milestones.push({label:badges[p.stage],eventId:event.id,quote:reply.evidenceQuote,reason:reply.evidenceReason});
    const next=stages[stages.indexOf(p.stage)+1];
    if(next){p.stage=next;p.attemptsAtStage=0;}else p.status='complete';
  }
  p.roundId=randomUUID();p.question=reply.question;p.feedback=reply.decision==='advance'?
    `${p.milestones.at(-1).label} · supported by your explanation`:reply.decision==='scaffold'?'Let us use a clue and try together':'Explore your reasoning';
  if(p.status==='complete'){p.question='Exploration complete. Your reasoning is saved; this is practice, not a mastery score.';}
  return record(session,p,input,p.question,reply.feedback);
}
