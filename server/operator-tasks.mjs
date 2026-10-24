import {randomUUID} from 'node:crypto';
import {appendEvent} from './conversation.mjs';

const fail=message=>{const error=new Error(message);error.status=400;throw error;};
export function captureOperatorCalls(session,turn,replyId){
  const calls=turn.toolCalls||[];
  if(!Array.isArray(calls)||calls.length>1)fail('At most one Matrix Operator task is allowed per teaching turn.');
  if((session.operatorTasks?.length||0)+calls.length>40)fail('This lesson has reached its Operator task limit.');
  for(const call of calls){
    const args=call?.arguments;
    if(call?.name!=='matrix_operator'||Object.keys(call).sort().join()!=='arguments,name'||!args||
      Object.keys(args).sort().join()!=='instruction,objectiveId,title'||
      typeof args.title!=='string'||!args.title.trim()||args.title.length>120||
      typeof args.instruction!=='string'||!args.instruction.trim()||args.instruction.length>2000||
      !session.objectives.some(objective=>objective.id===args.objectiveId))fail('Invalid Matrix Operator tool call.');
    const task={id:randomUUID(),name:'matrix_operator',...args,sourceReplyId:replyId,status:'requested',createdAt:new Date().toISOString(),execution:null};
    session.operatorTasks=[...(session.operatorTasks||[]),task];
    appendEvent(session,{id:`task-request:${task.id}`,speaker:'professor',recipient:'operator',inputKind:'text',text:task.instruction,worldId:''},true);
  }
}
export async function acceptTaskResult(session,input,fetcher=fetch){
  if(!input||Object.keys(input).join()!=='taskId')fail('Expected a task identity.');
  const task=session.operatorTasks?.find(item=>item.id===input.taskId);
  if(!task)fail('Task does not belong to this lesson.');
  const headers={Accept:'application/json'};
  if(process.env.SANDBOX_TOKEN)headers.Authorization=`Bearer ${process.env.SANDBOX_TOKEN}`;
  let response;
  try{response=await fetcher(`http://127.0.0.1:8765/api/professor/task?schoolSessionId=${session.id}&taskId=${task.id}`,{headers,redirect:'error',signal:AbortSignal.timeout(12000)});}
  catch{const error=new Error('Could not verify the Operator task. No completion was saved.');error.status=503;throw error;}
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))fail('Operator task status is unavailable.');
  const raw=await response.text();if(raw.length>60000)fail('Operator task result is too large.');
  let value;try{value=JSON.parse(raw);}catch{fail('Invalid Operator task result.');}
  if(value.taskId!==task.id||value.schoolSessionId!==session.id||value.instruction!==task.instruction||value.objectiveId!==task.objectiveId||value.title!==task.title||
    !['queued','submitting','running','cancelling','completed','cancelled','failed','unconfirmed'].includes(value.status)||
    typeof value.message!=='string'||typeof value.result!=='string'||value.result.length>20000||!Number.isFinite(value.updatedAt))fail('Operator task identity or result does not match this lesson.');
  const execution={status:value.status,sessionId:value.sessionId,turnId:value.turnId,message:value.message,result:value.result,updatedAt:value.updatedAt};
  if(JSON.stringify(execution)===JSON.stringify(task.execution))return false;
  const changedStatus=task.status!==value.status;
  task.status=value.status;task.execution=execution;
  if(changedStatus&&value.status!=='submitting')appendEvent(session,{id:`task:${task.id}:${value.status}`,speaker:'operator',recipient:'learner',inputKind:'text',worldId:value.scope?.roomId||'',
    text:`${task.title}: ${value.message}${value.result?'\nOperator reports: '+value.result.slice(0,8500)+(value.result.length>8500?'\n[Full result retained with the task.]':''):''}`},true);
  return true;
}
