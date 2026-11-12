// 完整来源内核验收：登记完整 ≠ 每个罕见分支都已覆盖。动态覆盖单独报告。
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {load,ROOT} from './loader.mjs';
const {NL,NL_NATIVE:A,NL_HISTORY_IMPACTS:H}=load();
const hash=x=>createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(readFileSync(resolve(ROOT,'data/reverse/EVENT_LIBRARY.json')));
const report={when:new Date().toISOString(),kind:'Node隔离模拟及构造条件验收；非真人经历／真机',sourceSHA256:manifest.source.sha256,files:Object.fromEntries(['src/engine.js','src/source_bridge.js','src/history_impacts.js','src/living.js','src/timeline.js','src/profiles.js','src/gen/history.js','src/gen/housing.js','src/gen/source-native.js','src/gen/source-history.js'].map(f=>[f,hash(readFileSync(resolve(ROOT,f)))])),checks:[],matrix:{lives:0,failures:[],decisions:[],events:[],historyRecords:0},examples:[]};
function check(name,test){try{const result=test();report.checks.push({name,pass:true,result});console.log('PASS',name);}catch(error){report.checks.push({name,pass:false,error:String(error.stack)});console.log('FAIL',name,error.message);}}
check('原库完整登记，与主程序静态清单对应',()=>{assert.equal(manifest.counts.events,278);assert.equal(manifest.counts.decisions,188);assert.equal(manifest.counts.annualHandlers,91);assert.deepEqual([...A.metadata().events],manifest.events);assert.deepEqual([...A.metadata().decisions],manifest.decisions);return manifest.counts;});
check('历史统计已实际启用，出生设定保留',()=>{
  const opts={country:'IND',seed:'22222224',year0:1960},legacy=NL.newLife({...opts,legacy:true}),s=NL.newLife(opts);
  assert.equal(s.sourceNative.era,'past');assert.equal(s.sourceNative.by,1960);
  for(const key of ['born','sex','q'])assert.equal(s[key],legacy[key]);
  assert.equal(s.urban,s.sourceNative.urban);assert.equal(s.sibOlder,s.sourceNative.fam.older);
  s.sourceNative.age=90;NL.source.decision(s);assert.equal(A.country().yr,2050,'观测截止年不能冻结未来日历');
  return {era:s.sourceNative.era,by:s.sourceNative.by,sex:s.sex,q:s.q,urban:s.urban,futureCountryYear:A.country().yr};
});
check('输入与四选题保留，选择应用到原状态',()=>{
  const s=NL.newLife({country:'IND',seed:'input-fixture',year0:1990});s.sourceNative.age=5;s.sourceNative.pending=null;
  NL.source.decision(s);A.inspectDecision('reflect');const input=NL.source.decision(s);assert(input.input);assert.equal(input.choices.length,2);
  NL.source.choose(s,'write','记得把时间留给家人。');assert(JSON.stringify(s.sourceNative).includes('记得把时间留给家人。'));
  s.sourceNative.age=2;s.sourceNative.pending=null;NL.source.decision(s);A.inspectDecision('temper');const multi=NL.source.decision(s);assert.equal(multi.choices.length,4);
  NL.source.choose(s,multi.choices[3].key);assert(s.sourceNative.done.temper>0);return {input:input.id,multi:multi.id,choices:multi.choices.map(c=>c.key)};
});
function fixture(record,key){
  const s=NL.newLife({country:record.scope,seed:'era-choice-'+record.id,year0:record.year-18});const n=s.sourceNative;
  n.age=18;n.edu=2;n.school='hs';n.pending=null;n.money=1000;n.queue=[];s.sourceInbox=[];
  NL.source.decision(s);A.askHistory('nl_era',{record,nlHistory:record});NL.source.choose(s,key);
  while(s.sourceInbox.length)NL.source.next(s);
  return s;
}
check('三国历史选择改变财务／学业并延续到后年',()=>{
  const results=[];
  for(const id of ['era:IND:2013','era:BRA:1998','era:NGA:2015']){
    const record=H.records.find(r=>r.id===id),learn=fixture(record,'prepare'),work=fixture(record,'earn');
    assert(learn.sourceNative.kE>work.sourceNative.kE);assert(learn.money<work.money);assert.equal(learn.sourceNative.flags.nlTraining.until,record.year+2);
    const n=learn.sourceNative,knowledge=n.kE;n.age++;NL.source.decision(learn);H.plan(learn,n,A);assert(n.kE>knowledge);
    results.push({id,studyKnowledge:learn.sourceNative.kE,workKnowledge:work.sourceNative.kE,studyMoney:learn.money,workMoney:work.money,continuesUntil:n.flags.nlTraining.until});
  }
  return results;
});
check('原历史汇率冲击真实扣减资产，迁居后的地区不串用',()=>{
  const s=NL.newLife({country:'NGA',seed:'currency-fixture',year0:1990}),n=s.sourceNative;
  n.age=26;n.money=10000;n.invest='cash';n.pending=null;n.queue=[{at:0,type:'hist',id:'E|NGA|ngn16|2016'}];s.sourceInbox=[];
  NL.source.step(s,.02);assert.equal(n.money,9000);while(s.sourceInbox.length)NL.source.next(s);assert(s.log.some(e=>e.history?.id==='native:E|NGA|ngn16|2016'));
  const record=H.records.find(r=>r.id==='era:IND:2013');assert(!H.eligible(record,'BRA',18));assert(!H.eligible(record,'IND',5));
  return {before:10000,after:n.money,record:s.sourceHistory.map(h=>h.id)};
});
check('同种子在交错模拟后仍可复现',()=>{
  const results=[];
  for(const country of ['IND','BRA','NGA','USA','CHN','JPN']){
    const opts={country,seed:'repro:'+country,year0:1970},a=NL.runLife(opts);
    NL.runLife({country:'DEU',seed:'interleave:'+country,year0:2010});
    const b=NL.runLife(opts),pack=s=>JSON.stringify({death:s.death,rings:s.rings,log:s.log});assert.equal(hash(pack(a)),hash(pack(b)),country);results.push({country,age:a.age,sha256:hash(pack(a))});
  }
  return results;
});
const dec=new Set(),ev=new Set(),birthYears=[1960,1990,2010],per=Number(process.argv[2]||2);
console.time('matrix');
for(const c of NL.countries)for(const year0 of birthYears)for(let i=0;i<per;i++){
  try{
    const s=NL.runLife({country:c.id,year0,seed:`source-v1:${c.id}:${year0}:${i}`});report.matrix.lives++;
    assert(s.death&&s.phase==='dead');assert.equal(s.rings.length,s.age+1);assert.equal(s.death.year,year0+s.age);
    assert(s.rings.every(r=>Number.isFinite(r.w)&&r.w>0&&Number.isFinite(r.g)&&r.g>=0&&r.g<=1));
    assert(s.log.every(row=>!(/undefined|NaN/.test(row.text))));
    if(s.sourceNative){
      assert.equal(s.sourceNative.by,year0);assert.equal(s.sourceNative.era,'past');
      const initialHistory=new Set();
      for(const row of s.log)if(row.history){
        assert.equal(row.history.experienceYear,row.y);assert.equal(row.history.projected,row.y>=2026);
        if(row.history.followUp){assert(initialHistory.has(row.history.id),'没有起因的后续经历');assert(row.y>row.history.year&&row.y<=row.history.year+3,'后续影响超出设计期限');}
        else{assert.equal(row.history.year,row.y);initialHistory.add(row.history.id);}
      }
      for(const [id,count]of Object.entries(s.sourceNative.done))if(count)dec.add(id);
      for(const id of Object.keys(s.sourceNative.flags))if(id.startsWith('ev_'))ev.add(id.slice(3));
      report.matrix.historyRecords+=s.sourceHistory.length;
      if(i===0&&['IND','BRA','NGA'].includes(c.id))report.examples.push({country:c.id,year0,age:s.age,histories:s.log.filter(r=>r.history&&!r.history.projected).map(r=>({a:r.a,year:r.y,id:r.history.id,choice:r.pick||null,text:r.text,result:r.result}))});
    }
  }catch(error){report.matrix.failures.push({country:c.id,year0,i,error:String(error.stack)});}
}
console.timeEnd('matrix');
report.matrix.decisions=[...dec].sort();report.matrix.events=[...ev].sort();report.matrix.notReachedDecisions=manifest.decisions.filter(id=>!dec.has(id));report.matrix.notReachedEvents=manifest.events.filter(id=>!ev.has(id));
check('192出生地×3年代整局与年代不串年',()=>{assert.equal(report.matrix.failures.length,0,JSON.stringify(report.matrix.failures.slice(0,3)));assert.equal(report.matrix.lives,192*3*per);return {lives:report.matrix.lives,decisions:dec.size,events:ev.size,historyRecords:report.matrix.historyRecords};});
report.pass=report.checks.every(c=>c.pass);const out=resolve(ROOT,process.env.NIANLUN_VALIDATION_DIR||'validation/source-engine/'+report.when.replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const file=resolve(out,'engine-report.json');if(existsSync(file)){const previous=readFileSync(file),old=JSON.parse(previous);writeFileSync(resolve(out,'engine-report-'+old.when.replace(/[:.]/g,'-')+'.json'),previous);}
writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log('full source',report.pass?'PASS':'FAIL',report.matrix.lives,'lives',dec.size,'decisions',ev.size,'events');process.exitCode=report.pass?0:1;
