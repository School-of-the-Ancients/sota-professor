const fail=message=>{const error=new Error(message);error.status=400;throw error;};
export function validSurface(value){
  return value&&Object.keys(value).sort().join(',')==='assetId,localPoint,nodeIndex,objectId,primitiveIndex,selectionId'&&
    /^[a-f0-9-]{36}$/.test(value.selectionId||'')&&['objectId','assetId'].every(k=>typeof value[k]==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value[k]))&&
    ['nodeIndex','primitiveIndex'].every(k=>value[k]===null||Number.isInteger(value[k])&&value[k]>=0&&value[k]<256)&&
    (value.nodeIndex!==null||value.primitiveIndex===null)&&value.localPoint&&Object.keys(value.localPoint).sort().join(',')==='x,y,z'&&
    Object.values(value.localPoint).every(n=>Number.isFinite(n)&&Math.abs(n)<=100);
}
export function surfaceInScene(surface,scene){
  return validSurface(surface)&&scene?.objects?.some(o=>o.objectId===surface.objectId&&o.assetId===surface.assetId)?surface:null;
}
export function checkedVisual(value,surface,scene){
  if(value===undefined)return null;
  if(!surfaceInScene(surface,scene)||!value||Object.keys(value).sort().join(',')!=='dataBase64,height,mimeType,selectionId,width'||
     value.selectionId!==surface.selectionId||value.mimeType!=='image/jpeg'||typeof value.dataBase64!=='string'||value.dataBase64.length>700000||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(value.dataBase64))fail('Selected view does not match a current object surface.');
  const bytes=Buffer.from(value.dataBase64,'base64');
  if(bytes.length>512*1024||bytes.toString('base64')!==value.dataBase64||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)fail('Invalid selected JPEG view.');
  let dimensions=null;
  for(let offset=2;offset+8<bytes.length;){
    if(bytes[offset++]!==255)break;
    const marker=bytes[offset++];if(marker===0xda||marker===0xd9)break;
    const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)break;
    if([0xc0,0xc1,0xc2].includes(marker)){dimensions={height:bytes.readUInt16BE(offset+3),width:bytes.readUInt16BE(offset+5)};break;}
    offset+=length;
  }
  if(!dimensions||dimensions.width!==value.width||dimensions.height!==value.height||value.width<1||value.height<1||value.width>1280||value.height>1280)fail('Invalid selected view dimensions.');
  return {bytes,width:value.width,height:value.height,selectionId:value.selectionId};
}
