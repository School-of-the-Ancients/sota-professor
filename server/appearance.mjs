import {SchoolError,requireValue,exact,text} from './teaching.mjs';
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function curatedAppearance(catalog,teacher){
  const names=[normalize(teacher.id),normalize(teacher.name)];
  const matches=catalog.filter(item=>item.automaticSelection===true&&
    !item.visualTags?.includes('fantasy')&&item.teacherMatches?.some(name=>names.includes(normalize(name))));
  // Explicit local upgrades take precedence over the bundled fallback cast.
  // Existing lesson appearances and manual pins are not rematched here.
  return matches.find(item=>item.libraryOwned===false)||matches[0];
}

export async function avatarCatalog(fetcher=fetch){
  const headers={Accept:'application/json'};
  if(process.env.SANDBOX_TOKEN)headers.Authorization=`Bearer ${process.env.SANDBOX_TOKEN}`;
  let response;
  try{response=await fetcher('http://127.0.0.1:8765/api/professor/avatars',{headers,redirect:'error',signal:AbortSignal.timeout(4000)});}
  catch{throw new SchoolError(503,'Connect Matrix to choose a professor appearance.');}
  requireValue(response.ok,503,'Matrix avatar catalog is unavailable.');
  const raw=await response.text();requireValue(raw.length<256000,502,'Avatar catalog is too large.');
  const value=JSON.parse(raw);
  requireValue(Array.isArray(value.avatars)&&value.avatars.length<=256,502,'Invalid avatar catalog.');
  return value.avatars.filter(item=>text(item?.catalogId,128)&&text(item.displayName,100)&&item.availability==='ready');
}

export async function chooseAppearance(provider,session,input,catalog){
  requireValue(input?.revision===session.revision,409,'This lesson changed. Reopen it before changing appearance.');
  requireValue(exact(input,input.mode==='manual'?['revision','mode','catalogId']:['revision','mode'])&&['auto','manual'].includes(input.mode),400,'Choose automatic matching or one catalog appearance.');
  let choice,reason,method;
  if(input.mode==='manual'){
    choice=catalog.find(item=>item.catalogId===input.catalogId);
    requireValue(choice,400,'That appearance is no longer available.');
    reason='Pinned by you; automatic matching will keep this choice.';method='manual';
  }else{
    const candidates=catalog.filter(item=>item.automaticSelection===true&&!item.visualTags?.includes('fantasy'));
    requireValue(candidates.length>0,409,'No automatic appearances are available. Choose a model manually.');
    choice=curatedAppearance(candidates,session.mentor);
    if(choice){reason=`Curated ${choice.displayName.toLowerCase()} representation for ${session.mentor.name}.`;method='curated';}
    else{
      try{
        const result=await provider.generate('appearance',{teacher:{name:session.mentor.name,era:session.mentor.era,expertise:session.mentor.expertise},
          candidates:candidates.map(({catalogId,displayName,visualTags})=>({catalogId,displayName,visualTags}))});
        choice=candidates.find(item=>item.catalogId===result?.catalogId);
        if(choice&&text(result.reason,400)){reason=result.reason;method='model';}else choice=null;
      }catch{/* Preserve conversation availability when matching cannot run. */}
      if(!choice){choice=candidates.find(item=>item.catalogId==='generic-professor')||candidates[0];
        reason='Generic representation: automatic matching was unavailable or returned an unknown model.';method='fallback';}
    }
  }
  const next=structuredClone(session);
  next.appearance={mode:input.mode,catalogId:choice.catalogId,reason,method,representation:choice.representation||'approximate'};
  next.revision++;next.updatedAt=new Date().toISOString();return next;
}
