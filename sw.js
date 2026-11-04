'use strict';
const CACHE='still-public-shell-v1';
const ASSETS=['./','index.html','style.css?v=3','touch.css?v=4','workspace.css?v=5','lens.css?v=5','compact.css?v=6','smart.css?v=7','gpu.js?v=6','symbols.js?v=7','controls.js?v=7','subject-ui.js?v=7','editor.js?v=7','app.js?v=7','subject-worker.js','models/u2netp.onnx','vendor/subject/ort.wasm.min.js','vendor/subject/ort-wasm-simd.wasm','THIRD_PARTY_SUBJECT.md','vendor/subject/ONNXRUNTIME-LICENSE','vendor/subject/ONNXRUNTIME-ThirdPartyNotices.txt','vendor/subject/U2NET-LICENSE','vendor/subject/rembg-LICENSE.txt','demo.jpg','manifest.webmanifest','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png'];
const allowed=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('still-public-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match(new URL('./',self.registration.scope).href)));return;
 }
 // Only application assets, never selected photos or arbitrary requests.
 if(allowed.has(url.pathname))event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
