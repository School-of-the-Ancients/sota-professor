import {randomUUID} from 'node:crypto';
import {avatarCatalog,curatedAppearance} from './appearance.mjs';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function matrix(path,body){
  const headers={Accept:'application/json',Origin:'http://127.0.0.1:8765'};
  if(process.env.SANDBOX_TOKEN)headers.Authorization=`Bearer ${process.env.SANDBOX_TOKEN}`;
  if(body)headers['Content-Type']='application/json';
  const response=await fetch('http://127.0.0.1:8765'+path,{method:body?'POST':'GET',headers,
    ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('The avatar service is unavailable.');
  return response.json();
}

export class AppearancePreparer {
  constructor({store,provider,catalog=avatarCatalog,submit=body=>matrix('/api/professor/avatar-jobs',body),
    status=id=>matrix('/api/professor/avatar-jobs/'+id),wait=pause}){
    Object.assign(this,{store,provider,catalog,submit,status,wait});this.jobs=new Map();
  }
  start(owner,session){
    session.appearance={mode:'auto',catalogId:'generic-professor',reason:'Finding a suitable saved appearance.',
      method:'pending',representation:'generic',status:'matching',token:randomUUID()};
    let publish;
    const ticket={owner,session:structuredClone(session),published:new Promise(resolve=>{publish=resolve;}),publish};
    this.launch(ticket);return ticket;
  }
  publish(ticket){ticket?.publish(true);}
  abandon(ticket){ticket?.publish(false);}
  resume(owner,session){
    if(session.appearance?.mode==='auto'&&['matching','queued','submitting','running'].includes(session.appearance.status)){
      const ticket={owner,session:structuredClone(session),published:Promise.resolve(true)};this.launch(ticket);
    }
  }
  launch(ticket){
    const key=ticket.owner+':'+ticket.session.id;
    if(this.jobs.has(key))return;
    const work=this.run(ticket).finally(()=>this.jobs.delete(key));this.jobs.set(key,work);
  }
  async update(ticket,fields){
    return this.store.transaction(ticket.owner,data=>{
      const session=data.sessions.find(item=>item.id===ticket.session.id);
      if(!session||session.appearance?.mode!=='auto'||session.appearance.token!==ticket.session.appearance.token)return {value:false};
      session.appearance={...session.appearance,...fields};
      session.appearanceRevision=(session.appearanceRevision||0)+1;
      return {write:true,value:true};
    },{waitForLock:true,background:true});
  }
  async run(ticket){
    const {session}=ticket;
    try{
      let catalog,choice,plan,job;
      if(!session.appearance.jobId){
        try{catalog=await this.catalog();}
        catch{await this.wait(250);catalog=await this.catalog();}
        choice=curatedAppearance(catalog,session.mentor);
        if(!choice){
          const candidates=catalog.filter(item=>item.automaticSelection&&!item.visualTags?.includes('fantasy'));
          plan=await this.provider.generate('appearance_plan',{teacher:{id:session.mentor.id,name:session.mentor.name,era:session.mentor.era,expertise:session.mentor.expertise},
            candidates:candidates.map(({catalogId,displayName,visualTags})=>({catalogId,displayName,visualTags}))});
          if(!plan||typeof plan.suitable!=='boolean'||typeof plan.description!=='string')throw Error('Appearance planning returned an invalid result.');
          if(plan?.suitable===true)choice=candidates.find(item=>item.catalogId===plan.catalogId&&item.catalogId!=='generic-professor');
          if(plan.suitable&&!choice)throw Error('Appearance planning chose an unavailable model.');
          if(!plan.suitable&&!plan.description.trim())throw Error('Appearance planning did not provide a visual description.');
        }
      }
      if(!await ticket.published)return;
      if(choice){await this.update(ticket,{catalogId:choice.catalogId,reason:plan?.reason||'Reusing a suitable saved professor model.',
        method:'library',representation:choice.representation||'approximate',status:'ready'});return;}
      if(!await this.update(ticket,{status:'matching'}))return;
      if(session.appearance.jobId)job=await this.status(session.appearance.jobId);
      else{
        const description=typeof plan?.description==='string'&&plan.description.trim()?plan.description.slice(0,1200):
          `A human teaching avatar representing ${session.mentor.name}, ${session.mentor.era}, with suitable age, hairstyle and period-inspired clothing.`;
        job=await this.submit({schoolSessionId:session.id,teacher:{id:session.mentor.id||'custom-teacher',name:session.mentor.name,era:session.mentor.era},description});
      }
      for(let attempt=0;attempt<600;attempt++){
        if(job.status==='ready'){
          catalog=await this.catalog();choice=catalog.find(item=>item.catalogId===job.catalogId&&item.assetSha256===job.sha256);
          if(!choice)throw Error('The generated model is not yet in the validated avatar catalog.');
          await this.update(ticket,{catalogId:choice.catalogId,status:'ready',method:'created',representation:'approximate',reason:'Created in VRoid Studio and saved to your model library.'});return;
        }
        if(!await this.update(ticket,{jobId:job.id,status:job.status,reason:job.message||'Creating a reusable professor model in VRoid Studio.'}))return;
        if(['failed','cancelled','unconfirmed'].includes(job.status))return;
        await this.wait(1500);job=await this.status(job.id);
      }
      await this.update(ticket,{status:'unconfirmed',reason:'Avatar creation is still unconfirmed. Check the Operator job before retrying.'});
    }catch(error){
      if(await ticket.published)await this.update(ticket,{status:'unavailable',reason:String(error.message||'Avatar creation unavailable').slice(0,400)}).catch(()=>{});
    }
  }
  async idle(){await Promise.all([...this.jobs.values()]);}
}
