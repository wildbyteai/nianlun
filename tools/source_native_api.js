/* 插入原同步模拟闭包；只导出纯模拟接口，不启动 worker 或访问原站。 */
const nlPlain = value => String(value == null ? '' : value).replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
let nlObserver = () => {}, nlPlan = () => {}, nlHistoryEnabled = true,nlActiveHistory=null;
function nlCountry(country){return root.NL_LIVING?root.NL_LIVING.country(country,e):country;}
function nlSectorMix(country,fallback){return country.nlEmployment?{...country.nlEmployment}:fallback;}
function nlHouseReturn(id,year,urban,fallback){return root.NL_LIVING?.housing(id,year,urban)?.change??fallback;}
function $7e(id,year){return nlHouseReturn(id,year,e.urban,nlGameHouseChange(id,year));}
function GR(){const official=root.NL_LIVING?.housingFact(e.cur,t0(),e.urban),original=nlGameHouseFact();return official||(original?'原站游戏配置：'+original:'');}
function HR(id,year,previous){return root.NL_LIVING?.housePressure(id,year,p().ppp,e.urban,true)??nlGameHousePressure(id,year,previous);}
function nlSnapshot() {
  return { age:e.age, cur:e.cur, sex:e.sex, q:e.q, urban:e.urban, st:{...e.st},
    edu:e.edu, school:e.school, job:e.job, money:e.money, income:e.income, netWorth:ga(),
    married:e.fam.married, kids:e.fam.kids.filter(k=>k.alive).length,
    smoker:e.smoker, refugee:e.refugee, phase:e.phase, death:e.deathAt && {...e.deathAt} };
}
dn.log = entry => nlObserver({type:'log', entry, snapshot:nlSnapshot(), historical:!!E6,historyId:nlActiveHistory});
dn.decision = pending => nlObserver({type:'decision', pending, snapshot:nlSnapshot()});
dn.year = () => nlObserver({type:'year', year:e.years[e.years.length-1], snapshot:nlSnapshot()});
dn.death = () => nlObserver({type:'death', snapshot:nlSnapshot()});
dn.plan = () => { if(nlHistoryEnabled) nlPlan(e, nlAPI); };
dn.err = error => { throw error; };
const nlAPI = {
  version:'source-events-living-20261112', plain:nlPlain,
  metadata() { return {events:Object.keys(V5).sort(), decisions:Object.keys(nn).filter(k=>!k.startsWith('nl_')).sort(), countries:q1.map(c=>c.id)}; },
  configure(countries) {
    const ids=new Set(countries.map(c=>c.id));
    for(let i=q1.length-1;i>=0;i--) if(!ids.has(q1[i].id)){delete N[q1[i].id];q1.splice(i,1);}
    for(const c of countries) if(N[c.id]) {
      const o=N[c.id];
      for(const key of ['le','u5','im','ppp','tfr','mmr','urb','agr','hiv','hom','road','net','ter','oop','cm'])
        if(Number.isFinite(c[key]))o[key]=c[key];
      o.gap=c.lf-c.lm; o.gi=c.gini/100; o.pop=c.pop/1000; o.b=c.b;
      if(Number.isFinite(c.smm))o.sm=c.smm;
      if(Number.isFinite(c.smf))o.sf=c.smf;
      o.mig=o.mig.split(',').filter(id=>ids.has(id)).join(',');
    }
  },
  hasCountry(id) { return !!N[id]; },
  bind(state,rng,observer,plan,historyEnabled=true) {
    e=state; JI=rng; nlObserver=observer||(()=>{}); nlPlan=plan||(()=>{});nlHistoryEnabled=historyEnabled;
  },
  create(country,opts,rng,observer,plan) {
    JI=rng;nlObserver=()=>{};nlPlan=()=>{};
    // 与原批量模拟器相同，按家境与城乡条件抽到同一个出生设定。
    let attempts=0;
    do { ZW('birth',60,country,{sex:opts.sex,era:'past',by:opts.year0});attempts++; }
    while((e.q!==opts.q||e.urban!==opts.urban)&&attempts<2000);
    if(e.q!==opts.q||e.urban!==opts.urban)throw new Error('无法匹配出生条件 '+country);
    e.phase='life';e.isComp=!!opts.isComp;e.nlVersion=this.version;
    nlObserver=observer;nlPlan=plan; nlHistoryEnabled=opts.history!==false;
    qE();
    return e;
  },
  tick(fraction) { MZ(e.yearSec*fraction); },
  choose(key,input) {
    if(!e.pending||!e.pending.view.choices.some(c=>c.k===key))throw new Error('不存在的决策选项 '+key);
    d2(key,input);
  },
  auto() { const key=A2(e.pending);return e.pending.view.choices.some(c=>c.k===key)?key:e.pending.view.choices[0].k; },
  snapshot:nlSnapshot,
  pending(){return e.pending;},
  scheduleHistory(record) { e.queue.push({at:.035,type:'nlHistory',id:record.id,p:record});e.queue.sort((a,b)=>a.at-b.at); },
  registerHistory(id,handler){ nn[id]=handler; },
  askHistory(id,payload){y7(id,payload);},
  emitHistory(text,record) { h(text,'hist');const row=e.log[e.log.length-1];row.nlHistory=record; },
  historyDelta(delta) {
    for(const [key,value]of Object.entries(delta.st||{}))e.st[key]=j(e.st[key]+value,0,100);
    if(delta.money)e.money+=delta.money;
    if(delta.knowledge){e.kE=(e.kE||0)+delta.knowledge;nk();}
  },
  historyFire(record){ dn.history(record); },
  setHistoryHandler(handler){dn.history=handler;},
  country(){return p();},
  current(){return e;},
  // 仅供隔离验收构造条件；生产页面不暴露调试入口。
  inspectDecision(id,payload){y7(id,payload);},
  inspectEducation(){return cn(D(),e.sex,e.q,e.urban,e.dis,1);},
  inspectJobSector(id){return G[id].s;},
  inspectFinanceYear(){DX();},
  inspectHousePrice(){return Cn(p());},
};
root.NL_NATIVE=nlAPI;
if(root.NL_LIVING)root.NL_LIVING.install(nlAPI);
