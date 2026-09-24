/* All current assets have immutable release filenames. IndexedDB is never cleared. */
const PREFIX='macro-minimal-'+self.registration.scope+'-';
const CACHE=PREFIX+'3.1.0-r4';
const FILES=['./','index.html','styles-3.1.0.css','core-3.1.0.js','storage-3.1.0.js','app-3.1.0.js','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png'];
const shell=FILES.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(shell.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;
 if(e.request.mode==='navigate'){
  e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(new Request(e.request,{cache:'no-cache'}));if(r.ok){await c.put(new URL('index.html',self.registration.scope).href,r.clone());return r;}return (await c.match(new URL('index.html',self.registration.scope).href))||r;}catch{return await c.match(new URL('index.html',self.registration.scope).href);}})());return;
 }
 if(shell.includes(u.href))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request)));
});
