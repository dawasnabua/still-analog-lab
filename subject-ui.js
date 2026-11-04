/* Local worker bridge. Images never leave this browser. */
'use strict';
class StillSubject{
 constructor(){this.worker=null;this.nextId=1;this.pending=new Map();}
 run(rgba,width=320,height=320){
  if(!this.worker){this.worker=new Worker('subject-worker.js');this.worker.onmessage=e=>{const d=e.data,p=this.pending.get(d.id);if(!p)return;this.pending.delete(d.id);clearTimeout(p.timer);if(d.error)p.reject(new Error(d.error));else p.resolve(d);};this.worker.onerror=e=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(e.message||'Lokale Motiverkennung konnte nicht gestartet werden.'));}this.pending.clear();this.worker.terminate();this.worker=null;};}
  const id=this.nextId++,buffer=rgba instanceof ArrayBuffer?rgba:rgba.buffer;
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);this.worker?.terminate();this.worker=null;reject(new Error('Die lokale Motiverkennung hat zu lange gebraucht. Bitte erneut versuchen.'));},120000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({id,rgba:buffer,width,height},[buffer]);});
 }
}
window.StillSubject=StillSubject;
