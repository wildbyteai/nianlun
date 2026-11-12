// 回归实际取数、原内核消费者和选择后果，不以“有数据文件”替代接入验收。
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,ROOT} from './loader.mjs';
import {LIVING_INDICATORS} from './living_indicators.mjs';
const {NL,NL_TL:TL,NL_NATIVE:A,NL_LIVING:L,window}=load();
const report={when:new Date().toISOString(),kind:'Node隔离模拟，非真人经历／真机',checks:[],examples:[]};
function check(name,fn){try{const result=fn();report.checks.push({name,pass:true,result});console.log('PASS',name);}catch(e){report.checks.push({name,pass:false,error:String(e.stack)});console.log('FAIL',name,e.message);}}
function rows(ind,dir='ts'){return readdirSync(resolve(ROOT,'data/worldbank',dir)).filter(f=>f.startsWith(ind+'.')&&f.endsWith('.json')).flatMap(f=>JSON.parse(readFileSync(resolve(ROOT,'data/worldbank',dir,f)))[1]);}
const rawPop=rows('SP.POP.TOTL');
check('人口原始值逐人保留，小地点不归零',()=>{
 let count=0;for(const r of rawPop){const c=NL.cby[r.countryiso3code],y=+r.date;if(!c||r.value==null||y<1960||y>2025)continue;const h=TL.at(c.id,c.reg,y);assert(Math.abs(h.pop*1e6-r.value)<.51,c.id+y);assert(h.pop>0);count++;}
 assert.equal(Math.round(TL.at('ISL',NL.cby.ISL.reg,1960).pop*1e6),175574);
 const e=window.NL_SOURCE_ERA;assert.equal(Math.round(e.C.ISL.p[2]*1000),175574);assert(e.C.ISL.b[10]>0);
 return {observedCells:count,iceland1960:175574};
});
check('早年缺项不读取未来，估计按字段标记',()=>{
 const h=TL.at('USA',NL.cby.USA.reg,1960);assert.equal(h.net,null);assert.equal(h.ppp,null);assert.equal(h.ele,null);assert.equal(h._quality.net,'missing');
 assert.equal(TL.birthFacts(NL.newLife({country:'USA',year0:1960,seed:'income-missing'})).worldPct,null);
 assert.equal(TL.at('HKG',NL.cby.HKG.reg,1990)._quality.u5,'peer_estimate');
 let checked=0;const quality=JSON.parse(readFileSync(resolve(ROOT,'data/HISTORY_QUALITY.json')));
 for(const c of NL.countries)for(const f of ['ppp','net','ele',...Object.keys(LIVING_INDICATORS)]){const first=quality.countries[c.id][f].firstObserved;if(first==null)continue;for(let y=1960;y<first;y++){assert.equal(TL.at(c.id,c.reg,y)[f],null,c.id+f+y);checked++;}}
 assert.equal(TL.at('CHN',NL.cby.CHN.reg,2025).secondary,null,'2012年不能无限延用到2025');
 assert.equal(TL.at('USA',NL.cby.USA.reg,2000).water,null,'美国首个基本饮水观测在2005');
 return {leadingMissingCells:checked,USA1960:{net:h.net,ppp:h.ppp,ele:h.ele},hongKongChildMortality:'peer_estimate'};
});
check('当年出生权重归一，城乡和家人来自对应年代',()=>{
 const snapshots=[];for(const y of [1960,1990,2010]){const counts=TL.birthCounts(y),total=Object.values(counts).reduce((a,b)=>a+b,0);assert(total>0);let sum=0;for(const c of NL.countries)sum+=TL.birthShare(c.id,y)||0;assert(Math.abs(sum-1)<1e-10);assert(counts.ISL>0);snapshots.push({year:y,total,india:TL.birthShare('IND',y),usa:TL.birthShare('USA',y)});}
 assert.notEqual(snapshots[0].india,snapshots[2].india);
 let changed=0;for(let i=0;i<100;i++){const a=NL.newLife({seed:'birth-time-'+i,year0:1960}),b=NL.newLife({seed:'birth-time-'+i,year0:2010});if(a.born!==b.born)changed++;if(a.sourceNative){assert.equal(a.sibOlder,a.sourceNative.fam.older);assert.equal(a.sibPlan,a.sourceNative.fam.younger);}}
 assert(changed>0);return {snapshots,changedBirthPlacesIn100Seeds:changed};
});
check('教育／就业／医疗的当年值进入原内核国家读取',()=>{
 const result=[];for(const [id,y]of [['IND',1995],['IND',2020],['BRA',2014],['NGA',2014],['USA',2008]]){const s=NL.newLife({country:id,year0:y-24,seed:'consumer-'+id+y}),n=s.sourceNative;n.age=24;NL.source.decision(s);const c=A.country(),h=TL.at(id,NL.cby[id].reg,y);for(const [f,k]of Object.entries({tertiary:'ter',unemployment:'un',empAgr:'agr',oop:'oop',net:'net'}))if(h[f]!=null)assert.equal(c[k],h[f]);if(h.empAgr!=null)assert(Math.abs(c.nlEmployment.agr-h.empAgr/(h.empAgr+h.empInd+h.empSer))<1e-10);result.push({id,y,ter:c.ter,un:c.un,agr:c.agr,oop:c.oop,oopDataMethod:c.nlEvidence.fields.oop.method});}
 return result;
});
check('同一人物在不同年代的升学机会参数确实不同',()=>{
 const s=NL.newLife({country:'IND',year0:1970,seed:'opportunities'}),n=s.sourceNative;n.age=18;n.edu=3;n.school='hs';n.kE=0;n.st.sm=50;const result=[];
 for(const y of [1995,2010,2020]){n.by=y-18;n.pending=null;NL.source.decision(s);result.push({year:y,grossEnrollment:A.country().ter,opportunity:A.inspectEducation().t4});}
 assert(result[2].opportunity>result[0].opportunity);report.examples.push({kind:'same-person-education',result});return result;
});
check('医疗自付进入真实诊疗扣款，而非只改说明',()=>{
 const results=[];
 for(const oop of [10,70]){const s=NL.newLife({country:'IND',year0:1983,seed:'medical-test'}),n=s.sourceNative;n.age=40;n.pending=null;n.conds={};n.money=10000;NL.source.decision(s);const c=A.country(),original=c.oop;c.oop=oop;A.inspectDecision('diag');const cost=n.flags.dgCost;assert(Number.isFinite(cost));NL.source.choose(s,'treat');assert(Math.abs(n.money-(10000-cost))<1e-8);results.push({oop,cost});c.oop=original;}
 assert(results[1].cost>results[0].cost);return {kind:'仅改变国家医疗支出参数的受控对照',results};
});
check('产业结构实际改变原求职卡的职业候选',()=>{
 const variants=[['IND',1991],['USA',1991]],results=[];
 for(const [id,y]of variants){const h=TL.at(id,NL.cby[id].reg,y),sum=h.empAgr+h.empInd+h.empSer,mix={agr:h.empAgr/sum,ind:h.empInd/sum,ser:h.empSer/sum};let agriculture=0,total=0;
  for(let i=0;i<40;i++){const s=NL.newLife({country:'IND',year0:1990,seed:'sector-controlled'}),n=s.sourceNative;n.age=22;n.edu=1;n.school=null;n.urban=false;n.pending=null;n.queue=[];s.sourceRng=NL.makeRng('sector-draw-'+i);NL.source.decision(s);const c=A.country(),oldMix=c.nlEmployment,oldAgr=c.agr;c.nlEmployment=mix;c.agr=h.empAgr;
   A.inspectDecision('job');for(const offer of n.flags.offers){total++;if(A.inspectJobSector(offer.id)==='agr')agriculture++;}c.nlEmployment=oldMix;c.agr=oldAgr;
  }results.push({injectedData:{id,y,mix},agriculture,total});
 }
 assert(results[0].agriculture>results[1].agriculture);report.examples.push({kind:'仅改变产业权重的受控原职业卡对照',results});return results;
});
function livingFixture(id,y,age,kind,access,key){
 const s=NL.newLife({country:id,year0:y-age,seed:'living-'+id+y}),n=s.sourceNative;n.age=age;n.pending=null;n.queue=[];n.school=age===12?'ms':null;n.money=1000;n.income=1000;s.sourceInbox=[];NL.source.decision(s);
 const record={id:'living-test:'+id+y+kind,scope:id,year:y,kind:'living-'+kind,livingKind:kind,headline:access?'家务之后有了一点空闲。':'家里的事情需要挪一挪时间。',access,studyWeight:1};
 A.askHistory('nl_living',{record,nlHistory:record});const d=NL.source.decision(s);assert(d.choices.some(c=>c.key===key));NL.source.choose(s,key);while(s.sourceInbox.length)NL.source.next(s);return s;
}
check('电力与饮水选择改变后年技能、家庭时间或预算，不叠死亡风险',()=>{
 const study=livingFixture('IND',2002,12,'study',false,'study'),family=livingFixture('IND',2002,12,'study',false,'family');assert(study.sourceNative.kE>family.sourceNative.kE);assert(study.sourceNative.flags.prep>0);
 const n=study.sourceNative,k=n.kE;n.age++;NL.source.decision(study);L.plan(study,n,A);assert(n.kE>k);
 const collect=livingFixture('NGA',2014,24,'water',false,'collect'),pay=livingFixture('NGA',2014,24,'water',false,'pay');assert(collect.money>pay.money);assert(collect.sourceNative.flags.nlWaterDuty);assert(!pay.sourceNative.flags.nlWaterDuty);
 assert.equal(collect.sourceNative.st.hl,pay.sourceNative.st.hl);return {studyKnowledge:study.sourceNative.kE,familyKnowledge:family.sourceNative.kE,collectMoney:collect.money,payMoney:pay.money,dutyUntil:collect.sourceNative.flags.nlWaterDuty.until};
});
check('家庭条件由真实当年覆盖影响，缺测年不造场景',()=>{
 const results=[];for(const [id,y,age]of [['USA',2000,24],['NGA',2014,24],['USA',2014,24],['IND',2002,12]]){let yes=0,no=0,queued=0;for(let i=0;i<30;i++){const s=NL.newLife({country:id,year0:y-age,seed:'coverage-'+id+y+i}),n=s.sourceNative;n.age=age;n.pending=null;n.queue=[];n.school=age===12?'ms':null;s.sourceInbox=[];s.sourceRng=NL.makeRng('coverage-draw-'+i);NL.source.decision(s);L.plan(s,n,A);const r=n.queue.find(e=>e.type==='nlHistory'&&e.p.livingKind);if(r){queued++;r.p.access?yes++:no++;}}results.push({id,y,queued,access:yes,lack:no});}
 assert.equal(results[0].queued,0);assert(results[1].lack>results[2].lack);assert(results[3].queued>0);return results;
});
check('住房读取原有年份记录，旧价格不延长成未来观测',()=>{
 const c=NL.cby.USA,s=NL.newLife({country:'USA',year0:1990,seed:'housing-check'});s.age=30;s.urban=true;const observed=NL.profiles.housing(s,c);s.age=60;assert.equal(NL.profiles.housing(s,c),null);assert.equal(observed.source,'BIS');assert.equal(L.housing('NGA',2020,true),null);return {country:'USA',observedYear:2020,record:observed,futureYear:2050,future:null,note:'BIS实质住宅价格变化，不是全球逐年租金；尼日利亚缺项保留'};
});
check('官方房价变化进入实际年度资产结算与购房成本',()=>{
 let s;for(let i=0;i<20;i++){const a=NL.newLife({country:'USA',year0:1968,seed:'house-finance-'+i});while(a.phase==='life'&&a.age<40)NL.source.runYear(a);if(a.phase==='life'&&a.age===40&&a.cur==='USA'){s=a;break;}}assert(s);
 const n=s.sourceNative;n.pending=null;n.urban=true;n.house=100000;n.owns.house=35;n.money=1e7;n.queue=[];s.sourceInbox=[];NL.source.decision(s);
 n.flags.hMk=0;n.flags.hMkC='USA';const beforePrice=A.inspectHousePrice();L.plan(s,n,A);const afterPrice=A.inspectHousePrice();assert.notEqual(beforePrice,afterPrice);
 const change=L.housing('USA',2008,true).change;A.inspectFinanceYear();assert(Math.abs(n.house-100000*(1+change))<.001);
 return {kind:'真实财务函数中的受控资产，不是真实个人资产',year:2008,houseBefore:100000,change,houseAfter:n.house,beforeModelPurchaseCost:beforePrice,afterModelPurchaseCost:afterPrice};
});
check('缺来源内核的地点也读取当年生活条件，旧校准模式保留',()=>{
 const s=NL.newLife({country:'ISL',year0:1990,seed:'fallback-living'});assert(!s.sourceNative);s.age=24;const c=NL.util.cur(s),h=TL.at('ISL',NL.cby.ISL.reg,2014);assert.equal(c.un,h.unemployment);assert.equal(c.ter,h.tertiary);
 const legacy=load({eventMode:'legacy'});assert.equal(legacy.NL.util.cur(legacy.NL.newLife({country:'ISL',year0:1990,seed:'legacy'})),legacy.NL.cby.ISL);return {iceland2014Unemployment:c.un,iceland2014Tertiary:c.ter};
});
report.pass=report.checks.every(c=>c.pass);const out=resolve(ROOT,'validation/living-foundation-20261112');mkdirSync(out,{recursive:true});const target=resolve(out,'data-and-effects.json');if(existsSync(target)){const previous=readFileSync(target),old=JSON.parse(previous);writeFileSync(resolve(out,'data-and-effects-'+old.when.replace(/[:.]/g,'-')+'.json'),previous);}writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(report.pass?'ALL PASS':'FAILURES');process.exitCode=report.pass?0:1;
