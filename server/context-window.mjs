// Limit model input, never the saved learner record or number of turns.
export function recentContext(entries,{maxItems=40,maxBytes=24000}={}){
  const result=[];let bytes=2;
  for(const entry of entries.slice(-maxItems).reverse()){
    const clipped=typeof entry.text==='string'&&entry.text.length>4000;
    const value=clipped?{...entry,text:entry.text.slice(-4000),textTruncated:true}:entry;
    const size=Buffer.byteLength(JSON.stringify(value),'utf8')+1;
    if(bytes+size>maxBytes)break;
    result.unshift(value);bytes+=size;
  }
  return result;
}
