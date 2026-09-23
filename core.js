/* Macro Tracker 3.0 — pure data and migration functions. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MacroCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fields = ['calories', 'protein', 'carbs', 'fat'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const num = v => v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
  const uid = () => 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  const today = (d = new Date()) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const shift = (date,n) => { const d = new Date(date+'T12:00:00'); d.setDate(d.getDate()+n); return today(d); };
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(new Date(s+'T12:00:00').valueOf()) && today(new Date(s+'T12:00:00')) === s;
  const started = e => !!String(e.name || '').trim() || fields.some(k => e[k] !== '' && e[k] !== null && e[k] !== undefined);
  function entry(e, id) {
    return {...copy(e), id:e.id || id || uid(), name:String(e.name || '').slice(0,300), ...Object.fromEntries(fields.map(k=>[k,num(e[k])])), source:e.source || 'legacy', quantity:num(e.quantity) || 1, unit:e.unit || '份'};
  }
  function totals(entries) {
    const result = {calories:0,protein:0,carbs:0,fat:0,missingCalories:false,missingProtein:false,estimated:false};
    for (const e of entries) {
      fields.forEach(k => { result[k] += num(e[k]) || 0; });
      result.missingCalories ||= num(e.calories) === null;
      result.missingProtein ||= num(e.protein) === null;
      result.estimated ||= !['label','weighed'].includes(e.source);
    }
    return result;
  }
  function scale(e, factor) {
    if (!Number.isFinite(factor) || factor <= 0) throw Error('份量必须大于零');
    const out = entry(e); fields.forEach(k => out[k] = num(e[k]) === null ? null : Math.round(e[k]*factor*1000)/1000);
    out.quantity=(num(e.quantity)||1)*factor;
    if (Array.isArray(e.components)) out.components = e.components.map(c=>scale(c,factor));
    return out;
  }
  function target(t) {
    const calories=num(t?.calories ?? t?.caloriesTarget), protein=num(t?.protein ?? t?.proteinTarget);
    return calories > 0 && protein > 0 ? {calories,protein} : null;
  }
  function legacyDay(r, targets = []) {
    const entries=[];
    (r.meals || []).forEach((m,mi)=>(m.entries || []).forEach((e,ei)=>{ if(started(e)) entries.push({...entry(e,`legacy_${r.date}_${mi}_${ei}`),legacyMeal:mi+1,legacyItem:ei+1}); }));
    return {date:r.date,entries,weight:num(r.bodyWeight),coverage:'unknown',target:target(r.targetSnapshot)||target(targets.find(t=>t.date===r.date)),legacy:copy(r),updatedAt:r.updatedAt||r.savedAt||'',recoveredDraft:false};
  }
  function migrate(raw) {
    const data={schema:3,revision:0,days:{},templates:[],targets:[],createdAt:new Date().toISOString(),migration:{date:new Date().toISOString(),records:0,drafts:0,favorites:0}};
    const records=new Map(Object.entries(raw.localRecords || {}));
    (raw.records||[]).forEach(r=>records.set(r.date,r));
    for(const [date,r] of records) if(validDate(date)){data.days[date]=legacyDay({...r,date},raw.dailyTargets);data.migration.records++;}
    for(const d of raw.drafts||[]) {
      if(!validDate(d.date)) continue;
      const old=data.days[d.date];
      // Missing timestamps cannot safely settle a conflict; keep saved record and archive draft.
      if(!old || (d.updatedAt && old.updatedAt && d.updatedAt>old.updatedAt)) {
        data.days[d.date]={...legacyDay(d,raw.dailyTargets),target:old?.target||target((raw.dailyTargets||[]).find(t=>t.date===d.date)),recoveredDraft:true};
      }
      data.migration.drafts++;
    }
    const favorites=new Map((raw.localFavorites||[]).map(f=>[f.id,f]));
    (raw.favorites||[]).forEach(f=>favorites.set(f.id,f));
    for(const f of favorites.values()) {
      const components=(f.entries?.length?f.entries:[f]).filter(started).map((e,i)=>entry(e,`${f.id}_${i}`));
      if(!components.length)continue;
      const sum=totals(components);
      data.templates.push({...copy(f),id:f.id||uid(),name:f.name||components.map(c=>c.name).join(' + '),components,calories:sum.missingCalories?null:sum.calories,protein:sum.missingProtein?null:sum.protein,carbs:components.some(c=>c.carbs===null)?null:sum.carbs,fat:components.some(c=>c.fat===null)?null:sum.fat,source:'legacy',quantity:1,unit:'份'});
    }
    data.migration.favorites=data.templates.length;
    const latest=Object.values(data.days).filter(d=>d.target).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
    const lastTarget=(raw.dailyTargets||[]).filter(t=>target(t)).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
    const inherited=latest?.target || target(lastTarget);
    if(inherited)data.targets.push({...inherited,from:today(),source:'继承旧版最近已保存目标（固定使用）'});
    return data;
  }
  function csvParse(text) {
    text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++) {const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted || cell==='')quoted=!quoted;else throw Error('CSV 引号格式无效');}
      else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
    if(quoted)throw Error('CSV 引号未闭合');row.push(cell);if(row.some(Boolean))rows.push(row);return rows;
  }
  function importCSV(text) {
    const rows=csvParse(text);let header=rows.shift()||[],favoriteMode=false;const records={},favorites={};
    if(!['date','name','calories','protein'].every(k=>header.includes(k)))throw Error('不是支持的 Macro Tracker CSV：缺少必要表头');
    for(const cells of rows){if(cells[0]==='__macro_tracker_favorites__'){favoriteMode=true;header=null;continue;}if(!header){header=cells;continue;}
      const r=Object.fromEntries(header.map((k,i)=>[k,cells[i]??'']));
      fields.forEach(k=>{if(r[k]!==undefined && r[k]!=='' && (num(r[k])===null))throw Error(`CSV 中 ${k} 包含无效数字`);});
      if(favoriteMode){if(!r.favoriteId)throw Error('收藏记录缺少 ID');const f=favorites[r.favoriteId] ||= {id:r.favoriteId,name:r.favoriteName,entries:[],usageCount:Number(r.usageCount)||0,lastUsedAt:r.lastUsedAt,updatedAt:r.updatedAt,createdAt:r.createdAt};f.entries.push(Object.fromEntries(['name',...fields].map(k=>[k,r[k]??''])));continue;}
      if(!validDate(r.date))throw Error('CSV 中包含无效日期：'+r.date);
      const d=records[r.date] ||= {date:r.date,bodyWeight:r.bodyWeight,dayType:r.dayType,trainingPerformance:r.trainingPerformance,hungerLevel:r.hungerLevel,sleepScore:r.sleepScore,meals:[],_coverage:r.coverage||'unknown'};
      const meal=Number(r.meal||1);if(!Number.isInteger(meal)||meal<1||meal>100)throw Error('餐次格式无效');
      let m=d.meals.find(m=>m.id===meal);if(!m){m={id:meal,entries:[]};d.meals.push(m);}
      m.entries.push({...Object.fromEntries(['name',...fields].map(k=>[k,r[k]??''])),source:r.source||'legacy'});
    }
    const out=migrate({records:Object.values(records),favorites:Object.values(favorites),dailyTargets:[]});out.targets=[];
    for(const d of Object.values(out.days)) d.coverage=records[d.date]._coverage==='complete'&&!totals(d.entries).missingCalories?'complete':'unknown';
    return out;
  }
  function csvExport(data) {
    const head=['date','dayType','bodyWeight','meal','item','name',...fields,'trainingPerformance','hungerLevel','sleepScore','coverage','source'];const rows=[head];
    Object.values(data.days).sort((a,b)=>a.date.localeCompare(b.date)).forEach(d=>{(d.entries.length?d.entries:[{}]).forEach((e,i)=>rows.push([d.date,d.legacy?.dayType||'',d.weight??'',e.legacyMeal||1,i+1,e.name||'',...fields.map(k=>e[k]??''),d.legacy?.trainingPerformance||'',d.legacy?.hungerLevel||'',d.legacy?.sleepScore||'',d.coverage,e.source||'']));});
    rows.push(['__macro_tracker_favorites__'],['favoriteId','favoriteName','entry','name',...fields,'usageCount','lastUsedAt','updatedAt','createdAt']);
    data.templates.forEach(t=>(t.components?.length?t.components:[t]).forEach((e,i)=>rows.push([t.id,t.name,i+1,e.name,...fields.map(k=>e[k]??''),t.usageCount||0,t.lastUsedAt||'',t.updatedAt||'',t.createdAt||''])));
    return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  }
  function validate(data) {
    if(data?.schema!==3 || !data.days || Array.isArray(data.days)||!Array.isArray(data.templates)||!Array.isArray(data.targets))throw Error('备份结构或版本不受支持');
    if(Object.keys(data.days).length>50000 || data.templates.length>10000)throw Error('备份过大');
    for(const [date,d] of Object.entries(data.days)) {
      if(!validDate(date)||d.date!==date||!Array.isArray(d.entries)||d.entries.length>5000)throw Error('备份日期或食物列表无效');
      for(const e of d.entries) checkEntry(e);
      if(d.weight!==null&&d.weight!==undefined&&(num(d.weight)===null||d.weight>500))throw Error('备份体重无效');
      if(!['unknown','partial','complete'].includes(d.coverage))throw Error('备份完整性状态无效');
    }
    data.templates.forEach(t=>{checkEntry(t);(t.components||[]).forEach(checkEntry);});
    data.targets.forEach(t=>{if(!validDate(t.from)||!target(t))throw Error('备份目标无效');});
    return copy(data);
  }
  function checkEntry(e){if(!e||typeof e!=='object')throw Error('无效食物');fields.forEach(k=>{if(e[k]!==null&&e[k]!==undefined&&(num(e[k])===null||Number(e[k])>100000))throw Error('备份营养数值无效');});}
  function merge(current,incoming,replace=false) {
    const out=copy(current);let days=0,skipped=0;
    for(const [date,d] of Object.entries(incoming.days)){if(out.days[date]&&!replace){skipped++;continue;}out.days[date]=copy(d);days++;}
    const map=new Map(out.templates.map(t=>[t.id,t]));incoming.templates.forEach(t=>{if(!map.has(t.id)||replace)map.set(t.id,copy(t));});out.templates=[...map.values()];
    return {data:out,days,skipped};
  }
  function getTarget(data,date) {return data.days[date]?.target || data.targets.filter(t=>t.from<=date).sort((a,b)=>a.from.localeCompare(b.from)).at(-1) || null;}
  function week(data,end) {
    const dates=Array.from({length:7},(_,i)=>shift(end,i-6));const complete=dates.map(d=>data.days[d]).filter(d=>d?.coverage==='complete'&&!totals(d.entries).missingCalories&&d.entries.length);
    const protein=complete.filter(d=>!totals(d.entries).missingProtein && getTarget(data,d.date));
    return {dates,complete:complete.length,average:complete.length?complete.reduce((s,d)=>s+totals(d.entries).calories,0)/complete.length:null,proteinDays:protein.length,proteinMet:protein.filter(d=>totals(d.entries).protein>=getTarget(data,d.date).protein).length};
  }
  return {fields,copy,num,uid,today,shift,validDate,started,entry,totals,scale,target,migrate,csvParse,importCSV,csvExport,validate,merge,getTarget,week};
});
