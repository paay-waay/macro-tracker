/* Macro Tracker 3.2.1 — local-first UI. No analytics or remote requests. */
(() => {
'use strict';
const C=MacroCore,S=MacroStorage,$=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=(v,step=.1)=>v===null?'—':(Math.round(v/step)*step).toLocaleString('zh-CN',{maximumFractionDigits:2});

const DRAFT='macro_tracker_minimal_editor_v3';
let noticeTimer;
let db,data,page='today',date=C.today(),busy=false,undo=null,pendingImport=null,editor=null,trigger=null;
const channel='BroadcastChannel' in window?new BroadcastChannel('macro_tracker_minimal_v3'):null;
function day(){return data.days[date]||{date,entries:[],weight:null,coverage:'unknown',target:null};}
function dayFor(draft,which=date){return draft.days[which] ||= {date:which,entries:[],weight:null,coverage:'unknown',target:C.copy(C.getTarget(draft,which)),updatedAt:''};}
function notice(text,canUndo=false,error=false){clearTimeout(noticeTimer);$('notice').innerHTML=`<div class="toast ${error?'error':''}"><span>${escape(text)}</span>${canUndo?'<button data-action="undo">撤销</button>':''}<button data-action="dismiss-notice" aria-label="关闭提示">×</button></div>`;if(!error)noticeTimer=setTimeout(()=>$('notice').replaceChildren(),8000);}
function show(title,html){trigger=document.activeElement;$('sheet-title').textContent=title;$('sheet-body').innerHTML=html;if(!$('sheet').open)$('sheet').showModal();$('sheet').scrollTop=0;}
function close(){if(busy)return;$('sheet').close();editor=null;trigger?.focus?.();}
function fail(err){console.error(err);const e=$('form-error');if(e)e.textContent=err.message;notice(err.message||'操作未完成。请保留当前页面并导出备份。',false,true);}
function lock(value){busy=value;document.querySelectorAll('button').forEach(b=>b.disabled=value);}
async function commit(mutator,message='已保存',options={}){
 if(busy)return false;lock(true);const before=C.copy(data),next=C.copy(data);
 try{mutator(next);next.revision=data.revision+1;await S.write(db,next,data.revision,options);data=next;undo=options.noUndo?null:before;render();notice(message,!!undo);channel?.postMessage('changed');return true;}catch(e){fail(e);return false;}finally{lock(false);}
}
function macroDetail(e){return `<span class="p">蛋白质 ${format(e.protein)} g</span>`;}
function progress(value,target,cls=''){return target>0?`<div class="track ${cls}" role="progressbar" aria-label="${cls==='protein-track'?'蛋白质':'热量'}进度" aria-valuenow="${Math.round(value*10)/10}" aria-valuemin="0" aria-valuemax="${Math.max(target,Math.round(value*10)/10)}"><div class="fill" style="width:${Math.min(100,value/target*100)}%"></div></div>`:'';}
function dateHeader(title){return `<div class="page-heading"><h1>${title}</h1><input class="date-field" id="date" type="date" aria-label="记录日期" value="${date}" max="${C.today()}"></div>`;}
function savedDraft(){try{return JSON.parse(localStorage.getItem(DRAFT));}catch{return null;}}
function clearDraft(){localStorage.removeItem(DRAFT);}
function persistEditor(){if(!editor)return;try{const form=$('food-form');localStorage.setItem(DRAFT,JSON.stringify({date,editor,values:Object.fromEntries(new FormData(form))}));$('draft-status').textContent='';}catch{$('draft-status').textContent='草稿未能保存，请先完成本条记录';}}
function render(){
 document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-current',b.dataset.page===page?'page':'false'));
 $('view').innerHTML=page==='review'?reviewHTML():todayHTML();
}
function todayHTML(){
 const d=day(),sum=C.totals(d.entries),t=C.getTarget(data,date);
 const remain=t?t.calories-sum.calories:null;
 const macroValue=k=>sum[k]===0&&!d.entries.length?'0':format(sum[k]);
 return `${dateHeader(date===C.today()?'今天':date.slice(5).replace('-','月')+'日')}
 <section class="card daily-card" aria-label="每日进度">
  <div class="row"><span class="eyebrow">热量</span>${t?`<span class="budget ${remain<0?'over':''}">${sum.missingCalories?'有数值待补':remain<0?'超出 '+format(-remain):'还可吃 '+format(remain)}${!sum.missingCalories?' kcal':''}</span>`:'<button class="text-button" data-action="settings">设定目标</button>'}</div>
  <div class="energy"><strong>${macroValue('calories')}</strong><span>${t?'/ '+format(t.calories)+' ':''}kcal</span></div>
  ${progress(sum.calories,t?.calories,sum.missingCalories?'uncertain':remain<0?'over':'')}
  <div class="macro-grid">
   <div class="macro-cell protein"><span><i></i>蛋白质</span><div><strong>${macroValue('protein')}</strong><small>g</small></div>${progress(sum.protein,t?.protein,'protein-track')}<small>${sum.missingProtein?'有数值待补':t?(sum.protein>=t.protein?'已达标':'还差 '+format(t.protein-sum.protein)+' g'):'已记录'}</small></div>
  </div>
  <button class="weight-entry" data-action="weight" aria-label="${date}，${d.weight==null?'记录体重':'体重 '+format(d.weight,.1)+' 千克，点击修改'}"><span>体重</span><strong>${d.weight==null?'记录体重':format(d.weight,.1)+' kg'}</strong><span class="chevron" aria-hidden="true">›</span></button>
 </section>
 ${savedDraft()?'<button class="resume" data-action="resume">继续上次输入 <span>→</span></button>':''}
 <section class="card log-card"><div class="section-heading"><h2>饮食记录</h2><span class="muted">${d.entries.length} 条</span></div>
 ${d.entries.map((e,i)=>`<button class="entry" data-action="edit" data-id="${escape(e.id)}"><span class="entry-number">${String(i+1).padStart(2,'0')}</span><span class="entry-main"><strong>${escape(e.name||'这餐')}</strong><span class="macro-detail">${macroDetail(e)}</span></span><span class="entry-energy">${format(e.calories)}<small>kcal</small></span><span class="chevron" aria-hidden="true">›</span></button>`).join('')||'<div class="empty"><span class="empty-symbol" aria-hidden="true">＋</span><p>记下第一餐</p></div>'}
 ${d.entries.length?`<label class="check completion"><span>今天记完了</span><input id="coverage" type="checkbox" ${d.coverage==='complete'?'checked':''} ${sum.missingCalories?'disabled':''}><span class="switch" aria-hidden="true"></span></label>`:''}
 </section>`;
}
function reviewHTML(){
 const w=C.week(data,date),weights=Object.values(data.days).filter(d=>d.weight>0&&d.date>=C.shift(date,-27)&&d.date<=date).sort((a,b)=>a.date.localeCompare(b.date));
 const history=Object.values(data.days).filter(d=>d.date<=date).sort((a,b)=>b.date.localeCompare(a.date));
 const recorded=w.dates.filter(dt=>data.days[dt]?.entries.length),hasTargets=recorded.length&&recorded.every(dt=>C.getTarget(data,dt));
 const ratios=w.dates.map(dt=>{const d=data.days[dt];return d?.entries.length?C.totals(d.entries).calories/(hasTargets?C.getTarget(data,dt).calories:1):0;});
 const ceiling=Math.max(hasTargets?1.25:1,...ratios)*1.05,baseline=100/ceiling;
 return `${dateHeader('回顾')}<section class="card"><div class="section-heading"><h2>近 7 天</h2><span class="muted">${C.shift(date,-6).slice(5)} — ${date.slice(5)}</span></div>
 <div class="weekly-chart">${hasTargets?`<div class="target-line" style="bottom:calc(24px + 140px * ${baseline/100})"><span>目标</span></div>`:''}${w.dates.map((dt,i)=>{const d=data.days[dt],has=d?.entries.length,t=C.getTarget(data,dt),sum=has?C.totals(d.entries):null;return `<button class="day-column ${d?.coverage==='complete'?'complete':'partial'}" data-action="date" data-date="${dt}" aria-label="${dt}，${has?format(sum.calories)+' kcal，'+(d.coverage==='complete'?'已记全':'部分记录'):'未记录'}"><span class="bar-value">${has?format(sum.calories):'—'}</span><span class="bar-space"><i style="height:${has?Math.max(sum.calories?2:0,ratios[i]/ceiling*100):0}%" class="${sum?.missingCalories?'unknown':''}"></i></span><span class="day-label">${['日','一','二','三','四','五','六'][new Date(dt+'T12:00:00').getDay()]}</span></button>`;}).join('')}</div>
 <div class="chart-key"><span><i></i>已记全</span><span><i class="partial"></i>部分记录</span></div>
 <div class="review-summary"><div><span>日均热量</span><strong>${format(w.average)}<small> kcal</small></strong></div><div><span>蛋白达标</span><strong>${w.proteinDays?w.proteinMet:'—'}${w.proteinDays?`<small> / ${w.proteinDays} 天</small>`:''}</strong></div></div><div class="summary-caption">统计 ${w.complete} 个完整记录日</div></section>
 <details class="card weight-panel"><summary>体重趋势 <span>${weights.length?format(weights.at(-1).weight,.1)+' kg':'未记录'}</span></summary><div class="row section-heading"><span class="muted">近 28 天</span><button class="text-button" data-action="weight">记录体重</button></div>${weightChart(weights)}</details>
 <section class="card history"><div class="section-heading"><h2>历史</h2><input id="history-search" type="month" aria-label="筛选历史月份"></div><div id="history-list">${historyRows(history.slice(0,30))}</div>${history.length>30?'<button class="wide quiet" data-action="more-history">显示全部</button>':''}</section>`;
}
function historyRows(days){return days.map(d=>{const sum=C.totals(d.entries);return `<button data-action="date" data-date="${d.date}"><span><strong>${d.date}</strong><small>${d.entries.length} 条${d.weight?' · '+format(d.weight,.1)+' kg':''}</small></span><span>${d.entries.length?(sum.missingCalories?'已知 ':'')+format(sum.calories)+' kcal':'—'}<small>${d.entries.length?'蛋白质 '+(sum.missingProtein?'已知 ':'')+format(sum.protein)+' g':''}${d.coverage==='complete'?' · 已记全':''}</small></span></button>`;}).join('')||'<p class="empty">暂无记录</p>';}

function weightChart(rows){if(rows.length<2)return '<p class="empty">暂无体重趋势</p>';const min=Math.min(...rows.map(d=>d.weight))-.15,max=Math.max(...rows.map(d=>d.weight))+.15;const points=rows.map(d=>({x:46+(new Date(d.date+'T12:00:00')-new Date(C.shift(date,-27)+'T12:00:00'))/86400000/27*390,y:145-(d.weight-min)/(max-min)*120}));return `<svg class="chart" viewBox="0 0 480 180" role="img" aria-label="近28天体重 ${rows.length} 次，最低 ${format(min+.15)}，最高 ${format(max-.15)} 千克"><text x="0" y="24">${format(max,.1)} kg</text><text x="0" y="146">${format(min,.1)}</text><polyline class="line" points="${points.map(p=>p.x+','+p.y).join(' ')}"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="3"><title>${rows[i].date} ${rows[i].weight} kg</title></circle>`).join('')}<text x="46" y="173">${C.shift(date,-27).slice(5)}</text><text x="420" y="173">${date.slice(5)}</text></svg>`;}
function editorForm(e={},mode='new',saved=null){
 editor={entry:C.copy(e),mode};
 show(mode==='edit'?'编辑记录':'记一餐',`<form id="food-form" class="stack"><div class="food-grid">${[['calories','热量','kcal'],['protein','蛋白质','g']].map(([key,label,unit],i)=>`<label class="nutrition-input ${key}"><span>${label}<small>${unit}</small></span><input aria-label="${label}" name="${key}" type="number" min="0" max="100000" step="any" inputmode="decimal" enterkeyhint="${i?'done':'next'}" value="${e[key]??''}" placeholder="—" required></label>`).join('')}</div><div id="form-error" class="error" role="alert"></div><div id="draft-status" class="error" role="status"></div><button class="primary wide submit-food" type="submit">${mode==='edit'?'保存修改':'记入'+(date===C.today()?'今天':date.slice(5))}</button><div class="editor-tools">${mode==='edit'?`<button type="button" class="danger" data-action="remove" data-id="${escape(e.id)}">删除记录</button>`:'<button type="button" class="quiet" data-action="discard-draft">清空输入</button>'}</div></form>`);
 if(saved)Object.entries(saved).forEach(([k,v])=>{const input=$('food-form').elements.namedItem(k);if(input)input.value=v;});
 $('food-form').addEventListener('input',persistEditor);$('food-form').addEventListener('change',persistEditor);
 $('food-form').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);const out={...C.entry(e),name:e.name||'记录',source:e.source||'manual',calories:C.num(f.get('calories')),protein:C.num(f.get('protein'))};
  if(out.calories===null||out.protein===null){$('form-error').textContent='请填写热量和蛋白质';return;}
  if(e.components?.length&&(out.calories!==e.calories||out.protein!==e.protein)){out.legacyComponents=C.copy(e.components);delete out.components;}
  const ok=await commit(next=>{const d=dayFor(next);if(mode==='edit'){const i=d.entries.findIndex(x=>x.id===e.id);if(i<0)throw Error('原记录已不存在');d.entries[i]=out;}else{out.id=C.uid();d.entries.push(out);}d.coverage='partial';d.updatedAt=new Date().toISOString();},'已记入');
  if(ok){clearDraft();close();render();}
 };
 const inputs=[...$('food-form').querySelectorAll('input[type="number"]')];inputs[0].addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();inputs[1].focus();}});
 if(mode==='new'&&!saved)inputs[0].focus();
}

function weight(){show('记录体重',`<form id="weight-form" class="stack"><label>${date} · kg<input id="weight-input" type="number" min="1" max="500" step="0.01" inputmode="decimal" value="${day().weight??''}" placeholder="留空可清除当天体重"></label><div id="form-error" class="error" role="alert"></div><button class="primary wide">保存</button></form>`);$('weight-input').focus();$('weight-input').select();$('weight-form').onsubmit=async e=>{e.preventDefault();if(await commit(n=>{dayFor(n).weight=C.num($('weight-input').value);},'体重已保存'))close();};}
function settings(){
 const t=C.getTarget(data,C.today());
 show('设置',`<form id="target-form" class="stack"><h3>每日目标</h3><div class="two"><label>热量 · kcal<input name="calories" type="number" min="500" max="10000" step="1" inputmode="numeric" value="${t?.calories||''}" required></label><label>蛋白质 · g<input name="protein" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${t?.protein||''}" required></label></div><div id="form-error" class="error" role="alert"></div><button class="primary wide">保存目标</button></form><details class="settings-data"><summary>备份与数据</summary><div class="data-actions"><button data-action="backup">导出完整备份 <span>JSON ↗</span></button><button data-action="import">导入备份 <span>JSON / CSV ↙</span></button><button data-action="csv">导出表格 <span>CSV ↗</span></button><button data-action="recovery">恢复快照 <span>›</span></button><button data-action="old-drafts">历史草稿 <span>›</span></button><button data-action="original">原始备份 <span>↗</span></button></div></details><div class="settings-footer">宏量 3.2.1</div>`);
 $('target-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),t={calories:Number(f.get('calories')),protein:Number(f.get('protein')),from:C.today(),source:'手动设定'};if(await commit(n=>{n.targets=n.targets.filter(x=>x.from!==t.from);n.targets.push(t);if(n.days[t.from])n.days[t.from].target=C.target(t);},'目标已保存'))close();};
}

function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function backup(){const meta=await S.read(db,'meta');const originals=meta.filter(m=>m.key===S.BACKUP||m.key.startsWith('minimal_v3_before_'));download('macro-tracker-full-'+C.today()+'.json',JSON.stringify({format:'macro-tracker-backup',version:3,exportedAt:new Date().toISOString(),data,originals,editorDraft:savedDraft()},null,2),'application/json');notice('备份已导出');}
async function recovery(){const rows=(await S.read(db,'meta')).filter(r=>r.key.startsWith('minimal_v3_before_')).sort((a,b)=>b.key.localeCompare(a.key));show('导入前恢复快照',`<p class="muted">下载指定快照后，可通过“导入完整备份”恢复。替换重复日期前会再次预览，不会自动删除后来新增的日期。</p>${rows.map((r,i)=>`<div class="list-item"><span style="flex:1">${escape(r.value.at||r.key)}<small>${Object.keys(r.value.previous?.days||{}).length} 天记录</small></span><button data-snapshot="${i}">下载</button></div>`).join('')||'<p>还没有导入前快照。</p>'}`);$('sheet-body').querySelectorAll('[data-snapshot]').forEach(b=>b.onclick=()=>{const row=rows[Number(b.dataset.snapshot)];download('macro-tracker-recovery-'+row.key.slice(18)+'.json',JSON.stringify({format:'macro-tracker-backup',version:3,data:row.value.previous},null,2),'application/json');});}
async function oldDrafts(){const raw=(await S.read(db,'meta',S.BACKUP))?.value;const drafts=raw?.drafts||[];show('升级前草稿',`<p class="muted">原始草稿保留在升级备份。恢复到当天前请确认：这将替换新版同一天的记录，操作可以撤销。</p>${drafts.map((d,i)=>`<div class="list-item"><span style="flex:1">${escape(d.date)}<small>${escape(d.updatedAt||'无时间戳')}</small></span><button data-restore-draft="${i}">预览</button></div>`).join('')||'<p>没有旧版草稿。</p>'}`);$('sheet-body').querySelectorAll('[data-restore-draft]').forEach(b=>b.onclick=()=>{const d=drafts[Number(b.dataset.restoreDraft)];const imported=C.migrate({drafts:[d],dailyTargets:raw.dailyTargets||[]});previewImport(imported,{oldDraft:d});});}
function previewImport(incoming,payload){
 pendingImport={incoming,payload};const overlap=Object.keys(incoming.days).filter(d=>data.days[d]).length;
 show('确认导入',`<div class="stack"><p>${Object.keys(incoming.days).length} 天记录</p><p class="muted">${overlap} 个日期已存在。默认保留现有日期，补入其余记录；备份中的其他旧数据也会保留。</p><label class="check"><input id="replace-import" type="checkbox">用导入内容替换重复日期和对应旧数据</label>${payload.editorDraft?'<label class="check"><input id="import-editor-draft" type="checkbox">恢复备份中的未完成输入</label>':''}${incoming.targets.length?'<label class="check"><input id="import-targets" type="checkbox">同时恢复备份中的目标历史</label>':''}<p class="muted small">导入前会自动保存当前数据快照，原文件内容也留在本机恢复快照内。</p><div id="form-error" class="error" role="alert"></div><button class="primary wide" id="confirm-import">确认导入</button></div>`);
 $('confirm-import').onclick=async()=>{const replace=$('replace-import').checked,targets=$('import-targets')?.checked,restoreDraft=$('import-editor-draft')?.checked,p=pendingImport;const result=C.merge(data,p.incoming,replace);if(targets)result.data.targets=C.copy(p.incoming.targets);const snapshot={previous:C.copy(data),imported:p.payload,at:new Date().toISOString()};const ok=await commit(n=>{Object.assign(n,result.data);},`导入完成：${result.days} 天已导入，${result.skipped} 天保留现有记录`,{snapshot,backupKey:'minimal_v3_before_'+Date.now()});if(ok){if(restoreDraft&&p.payload.editorDraft&&C.validDate(p.payload.editorDraft.date)){try{localStorage.setItem(DRAFT,JSON.stringify(p.payload.editorDraft));}catch{notice('记录已导入，但未完成输入草稿无法保存。',false,true);}}pendingImport=null;close();render();}};
}
$('import-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>50*1024*1024)throw Error('文件超过 50 MB，请拆分或使用较小备份');const text=await f.text();let incoming,payload;if(f.name.toLowerCase().endsWith('.json')){payload=JSON.parse(text);incoming=payload.data||payload.schema===3?C.validate(payload.data||payload):Array.isArray(payload.records)||Array.isArray(payload.drafts)?C.migrate(payload):(()=>{throw Error('不支持此 JSON 格式')})();}else{incoming=C.importCSV(text);payload={fileName:f.name,csv:text};}previewImport(incoming,payload);}catch(err){fail(err);}};
document.addEventListener('click',async ev=>{
 const b=ev.target.closest('button');if(!b||busy||!data)return;
 try{if(b.dataset.page){page=b.dataset.page;date=C.today();render();window.scrollTo(0,0);return;}
 const action=b.dataset.action,id=b.dataset.id;
 if(action==='add')editorForm();else if(action==='new-entry')editorForm();else if(action==='edit')editorForm(day().entries.find(e=>e.id===id),'edit');
 else if(action==='remove'){if(await commit(n=>{const d=dayFor(n);d.entries=d.entries.filter(e=>e.id!==id);d.coverage='partial';},'记录已移除')){clearDraft();close();render();}}
 else if(action==='dismiss-notice')$('notice').replaceChildren();
 else if(action==='settings')settings();else if(action==='weight')weight();else if(action==='date'){date=b.dataset.date;page='today';render();window.scrollTo(0,0);}
 else if(action==='undo'&&undo){const old=C.copy(undo);await commit(n=>{Object.assign(n,old);},'已撤销',{noUndo:true});}
 else if(action==='resume'){const draft=savedDraft();if(draft){date=draft.date;page='today';render();editorForm(draft.editor.entry,draft.editor.mode==='edit'?'edit':'new',draft.values);}}
 else if(action==='discard-draft'){clearDraft();close();render();}
 else if(action==='backup')await backup();else if(action==='csv'){download('macro-tracker-'+C.today()+'.csv',C.csvExport(data),'text/csv;charset=utf-8');notice('CSV 已导出');}
 else if(action==='original'){const row=await S.read(db,'meta',S.BACKUP);download('macro-tracker-original-'+C.today()+'.json',JSON.stringify(row?.value||{},null,2),'application/json');}
 else if(action==='import')$('import-file').click();else if(action==='old-drafts')await oldDrafts();else if(action==='recovery')await recovery();else if(action==='more-history')$('history-list').innerHTML=historyRows(Object.values(data.days).sort((a,b)=>b.date.localeCompare(a.date)));
 }catch(err){fail(err);}
});
document.addEventListener('change',async e=>{if(!data||busy)return;try{if(e.target.id==='date'){if(!C.validDate(e.target.value)||e.target.value>C.today())return;date=e.target.value;render();}else if(e.target.id==='coverage'){const complete=e.target.checked;await commit(n=>{const d=dayFor(n);d.coverage=complete?'complete':'partial';d.confirmedAt=complete?new Date().toISOString():null;},complete?'今天已记全':'已取消');}else if(e.target.id==='history-search'){$('history-list').innerHTML=historyRows(Object.values(data.days).filter(d=>!e.target.value||d.date.startsWith(e.target.value)).sort((a,b)=>b.date.localeCompare(a.date)));}}catch(err){fail(err);}});
$('settings').onclick=()=>data&&settings();$('close-sheet').onclick=close;$('sheet').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
window.addEventListener('online',()=>data&&render());window.addEventListener('offline',()=>data&&render());
channel&&(channel.onmessage=()=>notice('另一页面更新了数据。请刷新以读取最新记录；未提交的输入草稿会保留。',false,true));
function fitKeyboard(){const v=window.visualViewport;if(!v)return;document.documentElement.style.setProperty('--view-height',v.height+'px');document.documentElement.style.setProperty('--keyboard-bottom',Math.max(0,window.innerHeight-v.height-v.offsetTop)+'px');}
window.visualViewport?.addEventListener('resize',fitKeyboard);window.visualViewport?.addEventListener('scroll',fitKeyboard);fitKeyboard();
for(const event of ['gesturestart','gesturechange'])document.addEventListener(event,e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());
document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault();},{passive:false});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key))e.preventDefault();});
(async()=>{try{const loaded=await S.init();db=loaded.db;data=loaded.data;render();if('serviceWorker' in navigator){try{const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});reg.update().catch(()=>{});}catch{notice('记录已载入；离线缓存尚未就绪，联网刷新后重试。');}}navigator.storage?.persist?.().catch(()=>{});}catch(err){$('view').innerHTML='<div class="banner error">数据暂时无法读取。没有清除或覆盖旧数据。请关闭其他旧版页面后刷新；不要清除网站数据。</div>';fail(err);}})();
})();
