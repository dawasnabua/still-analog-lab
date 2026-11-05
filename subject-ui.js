/* Local subject worker, in-flight coalescing and exact-pixel RAM cache. No uploads. */
'use strict';
class StillSubject{
 constructor(){this.worker=null;this.workerMode=null;this.nextId=1;this.pending=new Map();this.cache=[];this.stats={requests:0,inferences:0,cacheHits:0,joins:0,errors:0};}
 same(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
 copy(result,extra={}){return {...result,...extra,alpha:result.alpha.slice(0)};}
 stop(message){const worker=this.worker;this.worker=null;this.workerMode=null;worker?.terminate();for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(new Error(message));}this.pending.clear();}
 ensureWorker(quality){
  if(this.worker&&this.workerMode===quality)return;
  if(this.worker)this.stop('Der Erkennungsmodus wurde gewechselt.');
  const worker=new Worker(quality==='detail'?'subject-worker.js?v=8':'subject-worker-fast.js?v=8');this.worker=worker;this.workerMode=quality;
  worker.onmessage=e=>{if(this.worker!==worker)return;const d=e.data,job=this.pending.get(d.id);if(!job)return;this.pending.delete(d.id);clearTimeout(job.timer);
   if(d.error){this.stats.errors++;job.reject(new Error(d.error));return;}
   if(!(d.alpha instanceof ArrayBuffer)||d.alpha.byteLength!==d.width*d.height){this.stats.errors++;job.reject(new Error('Die lokale Erkennung hat eine ungültige Maske geliefert.'));return;}
   this.stats.inferences++;const result={...d,quality,cacheHit:false};this.cache=this.cache.filter(c=>!(c.quality===quality&&c.width===job.width&&c.height===job.height));this.cache.push({quality,width:job.width,height:job.height,input:job.input,result});while(this.cache.length>2)this.cache.shift();job.resolve(result);
  };
  worker.onerror=e=>{if(this.worker!==worker)return;this.stats.errors++;this.stop(e.message||'Lokale Motiverkennung konnte nicht gestartet werden.');};
 }
 run(rgba,width=320,height=320,{quality='fast'}={}){
  this.stats.requests++;quality=quality==='detail'?'detail':'fast';
  const bytes=rgba instanceof ArrayBuffer?new Uint8Array(rgba):ArrayBuffer.isView(rgba)?new Uint8Array(rgba.buffer,rgba.byteOffset,rgba.byteLength):null;
  if(!bytes||bytes.length!==width*height*4)return Promise.reject(new Error('Ungültige Bilddaten für die lokale Erkennung.'));
  for(const c of this.cache)if(c.quality===quality&&c.width===width&&c.height===height&&this.same(c.input,bytes)){this.stats.cacheHits++;return Promise.resolve(this.copy(c.result,{cacheHit:true}));}
  for(const job of this.pending.values())if(job.quality===quality&&job.width===width&&job.height===height&&this.same(job.input,bytes)){this.stats.joins++;return job.promise.then(result=>this.copy(result,{coalesced:true}));}
  try{this.ensureWorker(quality);}catch(error){return Promise.reject(error);}
  const id=this.nextId++,input=bytes.slice(),buffer=input.slice().buffer;let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  const timer=setTimeout(()=>{this.stats.errors++;this.stop('Die lokale Motiverkennung hat zu lange gebraucht. Bitte erneut versuchen.');},120000);
  this.pending.set(id,{resolve,reject,timer,promise,input,width,height,quality});
  try{this.worker.postMessage({id,rgba:buffer,width,height},[buffer]);}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
  return promise.then(result=>this.copy(result));
 }
 getDebug(){return {...this.stats,mode:this.workerMode,pending:this.pending.size,cachedQualities:this.cache.map(c=>c.quality)};}
}
window.StillSubject=StillSubject;
