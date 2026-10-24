import {randomUUID} from 'node:crypto';
import {appendEvent} from './conversation.mjs';

const requireValue=(condition,message,status=409)=>{if(!condition){const error=new Error(message);error.status=status;throw error;}};
const cleanLabel=label=>label.replace(/^.*?\b[1-9]\s*[-–]\s*/,'').trim();
const currentPart=(practice,scene)=>{
  const object=scene?.objects?.find(o=>o.objectId===practice.objectId&&o.assetId===practice.assetId&&o.partsRevision===practice.partsRevision);
  return object?.parts?.find(p=>p.partId===practice.rounds[practice.index]?.partId);
};
const question=(practice)=>`Point to the ${practice.rounds[practice.index].label}. Press A or X when you have found it.`;
const explain=(practice)=>{
  const round=practice.rounds[practice.index];
  return `${round.label}. ${round.description} Now, ${question(practice)}`;
};
export function publicPractice(value){
  if(!value)return null;
  return {id:value.id,status:value.status,objectId:value.objectId,objectLabel:value.objectLabel,
    index:value.index,total:value.rounds.length,found:value.found.length,streak:value.streak,hints:value.hints,
    roundId:value.status==='active'?value.rounds[value.index].id:null,
    question:value.status==='active'?question(value):value.status==='complete'?'All parts found. Practice complete.':'Practice stopped.',
    feedback:value.feedback,replyId:value.replyId};
}
export function advancePointPractice(existing,input,scene){
  requireValue(input&&['start','answer','repeat','hint','stop'].includes(input.action),'Unknown practice action.',400);
  requireValue(Object.keys(input).every(key=>['revision','action','requestId','objectId','practiceId','roundId','partReference'].includes(key)),
    'Unexpected practice input.',400);
  requireValue(typeof input.requestId==='string'&&/^[a-zA-Z0-9:._-]{1,160}$/.test(input.requestId),'Invalid practice request.',400);
  // A lost response may be checked/retried with the same identity, never scored twice.
  if(existing.practice?.requests?.includes(input.requestId))return existing;
  requireValue(input.revision===existing.revision,'The lesson changed. Refresh before continuing.');
  const session=structuredClone(existing);
  let practice=session.practice,speech='';
  if(input.action==='start'){
    requireValue(scene?.runtimeId&&scene.roomId,'Connect the current Matrix world before starting practice.');
    if(practice?.status==='active')return existing;
    if(practice?.status==='stopped'&&practice.index<practice.rounds.length&&
       (!input.objectId||input.objectId===practice.objectId)&&currentPart(practice,scene)){
      practice.status='active';practice.runtimeId=scene.runtimeId;speech=`Let's continue. ${explain(practice)}`;
    }else{
    if(practice)session.practiceHistory=[...(session.practiceHistory||[]),publicPractice(practice)].slice(-20);
    const candidates=(scene.objects||[]).filter(o=>o.parts?.some(p=>p.provenance==='authored'&&p.description));
    const object=input.objectId?candidates.find(o=>o.objectId===input.objectId):
      candidates.find(o=>o.objectId===scene.selectedPart?.objectId)||candidates[0];
    requireValue(object,'Select an exhibit with named teaching parts.');
    const parts=object.parts.filter(p=>p.provenance==='authored'&&p.description)
      .map((p,index)=>({...p,order:Number(p.label.match(/\b([1-9])\s*[-–]/)?.[1])||100+index}))
      .sort((a,b)=>a.order-b.order).slice(0,3);
    practice=session.practice={id:randomUUID(),status:'active',runtimeId:scene.runtimeId,roomId:scene.roomId,
      objectId:object.objectId,assetId:object.assetId,partsRevision:object.partsRevision,objectLabel:object.label,
      rounds:parts.map(p=>({id:randomUUID(),partId:p.partId,label:cleanLabel(p.label),description:p.description})),
      index:0,found:[],streak:0,hints:0,attempts:[],requests:[],feedback:'',replyId:null};
    speech=`Let's explore the ${object.label}. I will explain a part, then you find it. ${explain(practice)}`;
    }
  }else{
    requireValue(practice&&practice.id===input.practiceId,'This practice session changed. Refresh it.');
    if(input.action==='stop'){practice.status='stopped';speech='Practice paused. Your progress is saved. We can keep talking.';}
    else{
      requireValue(practice.status==='active'&&input.roundId===practice.rounds[practice.index].id,'The practice question changed.');
      requireValue(scene?.runtimeId&&scene.roomId===practice.roomId&&currentPart(practice,scene),
        'The exhibit or its teaching parts changed. Stop and start a fresh practice.');
      practice.runtimeId=scene.runtimeId;
      if(input.action==='repeat')speech=explain(practice);
      else if(input.action==='hint'){
        practice.hints++;speech=`Hint: find the ${practice.rounds[practice.index].label}. ${practice.rounds[practice.index].description} ${question(practice)}`;
      }else{
        const reference=input.partReference;
        const selected=scene.objects.find(o=>o.objectId===reference?.objectId&&o.assetId===reference?.assetId&&o.partsRevision===reference?.partsRevision);
        const part=selected?.parts?.find(p=>p.partId===reference?.partId);
        requireValue(part,'That selected part is no longer available. Point again.');
        const correct=selected.objectId===practice.objectId&&part.partId===practice.rounds[practice.index].partId;
        const feedback=correct?`Yes, that's the ${practice.rounds[practice.index].label}.`:`You selected ${cleanLabel(part.label)}. Try the ${practice.rounds[practice.index].label}.`;
        practice.attempts.push({requestId:input.requestId,roundId:input.roundId,partReference:structuredClone(reference),correct});
        requireValue(practice.attempts.length<=100,'This practice has reached its attempt limit. Start a new practice.');
        appendEvent(session,{id:`practice-input:${input.requestId}`,speaker:'learner',recipient:'professor',inputKind:'text',
          text:`Pointed to ${part.label}.`,worldId:scene.roomId,partReference:reference});
        practice.streak=correct?practice.streak+1:0;
        if(correct){practice.found.push(practice.rounds[practice.index].partId);practice.index++;
          if(practice.index===practice.rounds.length){practice.status='complete';speech=`${feedback} You found all ${practice.rounds.length} parts. Practice complete!`;}
          else speech=`${feedback} ${practice.found.length} of ${practice.rounds.length} found. ${explain(practice)}`;
        }else speech=`${feedback} ${question(practice)}`;
        practice.feedback=feedback;
      }
    }
  }
  practice.requests=[...practice.requests,input.requestId].slice(-100);
  const event=appendEvent(session,{id:`practice-reply:${input.requestId}`,speaker:'professor',recipient:'learner',inputKind:'text',
    text:speech,worldId:practice.roomId},true);
  practice.replyId=event.id;
  session.revision++;session.updatedAt=new Date().toISOString();
  return session;
}
