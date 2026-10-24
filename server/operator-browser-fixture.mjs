// Explicit test process only. No runtime/provider selector imports this file.
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {SessionStore} from './store.mjs';
import {createSchoolApi} from './http.mjs';
import {mockProvider} from './fixtures.mjs';
const provider=mockProvider(),generate=provider.generate.bind(provider);
provider.generate=async(kind,context)=>{
  const result=await generate(kind,context);
  if(kind==='teach' && context.messages?.at(-1)?.role==='user' && context.messages.at(-1).text.includes('go to'))
    result.presentationRequests=[{kind:'location',title:'A historical study setting',description:'A historically inspired study, labeled as an illustrative reconstruction.',
      objectiveId:context.objectives[0].id,learningIntent:'Support tracing the algorithm in a quiet study setting.',
      interaction:{requirement:'none',description:'Background atmosphere only.',capabilities:[]}}];
  return result;
};
const api=createSchoolApi({store:new SessionStore(resolve('.school-data/validation/operator-browser-fixture')),provider});
createServer((req,res)=>void api(req,res,()=>{res.writeHead(404);res.end();})).listen(3110,'127.0.0.1');
