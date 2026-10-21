import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useOperator } from './useOperator';
import type { SchoolSession } from './contracts';
const descriptor=Object.getOwnPropertyDescriptor(window,'parent');
const parent={postMessage:vi.fn()};
const request={id:'00000000-0000-4000-8000-000000000002',version:1,kind:'artifact',prompt:'Static exhibit',objectiveId:'proof',description:'Explain proof'};
const session={id:'00000000-0000-4000-8000-000000000001',revision:1,presentations:[request]} as SchoolSession;
const channel='00000000-0000-4000-8000-000000000003';
const message=(data:object,origin='http://127.0.0.1:8765',source=parent)=>window.dispatchEvent(new MessageEvent('message',{data,origin,source:source as unknown as Window}));
beforeEach(()=>{vi.clearAllMocks();Object.defineProperty(window,'parent',{configurable:true,value:parent});});
afterEach(()=>{cleanup();if(descriptor)Object.defineProperty(window,'parent',descriptor);});
it('accepts only the expected parent/origin handshake and sends bounded intent, not tools or credentials',()=>{
  const accept=vi.fn().mockResolvedValue(undefined),view=renderHook(()=>useOperator(session,accept));
  act(()=>message({type:'matrix-operator-hello',channel},'https://outside.example'));
  expect(view.result.current.connected).toBe(false);
  act(()=>message({type:'matrix-operator-hello',channel}));expect(view.result.current.connected).toBe(true);
  act(()=>view.result.current.request(session.presentations![0]));
  expect(parent.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({type:'school-operator-request',channel,
    payload:expect.objectContaining({schoolSessionId:session.id,requestId:request.id,requestVersion:1,prompt:request.prompt})}),'http://127.0.0.1:8765');
  expect(JSON.stringify(parent.postMessage.mock.calls)).not.toMatch(/Authorization|Bearer|code|shell/);
});
it('ignores wrong source/channel and stale topic or prompt results before requesting server verification',async()=>{
  const accept=vi.fn().mockResolvedValue(undefined);
  const view=renderHook(({value})=>useOperator(value,accept),{initialProps:{value:session}});
  act(()=>message({type:'matrix-operator-hello',channel}));
  const result={schoolSessionId:session.id,requestId:request.id,requestVersion:1,prompt:request.prompt,sessionId:'a'.repeat(32),actionId:'b'.repeat(64)};
  act(()=>message({type:'matrix-operator-result',channel:'wrong',result}));
  act(()=>message({type:'matrix-operator-result',channel,result},'http://127.0.0.1:8765',{postMessage:vi.fn()}));
  expect(accept).not.toHaveBeenCalled();
  await act(async()=>message({type:'matrix-operator-result',channel,result}));
  await waitFor(()=>expect(accept).toHaveBeenCalledTimes(1));
  view.rerender({value:{...session,id:'other-topic'}});
  await act(async()=>message({type:'matrix-operator-result',channel,result}));expect(accept).toHaveBeenCalledTimes(1);
});
it('reopen watches saved jobs without generating and rejects an oversized prompt before sending',()=>{
  const saved={...session,presentations:[{...session.presentations![0],operator:{requestVersion:1,matrixSessionId:'a'.repeat(32),actionId:'b'.repeat(64)}}]} as SchoolSession;
  const view=renderHook(()=>useOperator(saved,vi.fn()));
  act(()=>message({type:'matrix-operator-hello',channel}));
  expect(parent.postMessage.mock.calls.some(([value])=>value.type==='school-operator-watch')).toBe(true);
  expect(parent.postMessage.mock.calls.some(([value])=>value.type==='school-operator-request')).toBe(false);
  const count=parent.postMessage.mock.calls.length;
  act(()=>view.result.current.request({...session.presentations![0],prompt:'x'.repeat(3601)}));
  expect(parent.postMessage).toHaveBeenCalledTimes(count);expect(view.result.current.notice).toMatch(/nothing was sent/);
});
