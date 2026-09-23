/* Scope-specific cache, including GitHub project subpaths. Never touches IndexedDB. */
const PREFIX='macro-minimal-'+self.registration.scope+'-';
const CACHE=PREFIX+'3.0.0-r4';
const FILES=['./','index.html','styles.css?v=3.0.0-r4','core.js?v=3.0.0-r4','storage.js?v=3.0.0-r4','app.js?v=3.0.0-r4','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(p=>new URL(p,self.registration.scope).href))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;
 const shell=FILES.map(p=>new URL(p,self.registration.scope).href);
 if(e.request.mode==='navigate'){e.respondWith((async()=>{const cache=await caches.open(CACHE);try{const r=await fetch(e.request);if(r.ok){await cache.put(new URL('index.html',self.registration.scope).href,r.clone());return r;}return (await cache.match(new URL('index.html',self.registration.scope).href))||r;}catch{return await cache.match(new URL('index.html',self.registration.scope).href);}})());return;}
 if(shell.includes(u.href))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request)));
});
