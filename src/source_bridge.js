/* 完整来源内核 → 年轮显示。所有后果由来源状态结算；四个条只作显示投影。 */
(function(root){
  'use strict';
  const NL=root.NL,A=root.NL_NATIVE,clamp=NL.util.clamp;
  let configured=false;
  const mapped=s=>({gen:Math.round(s.st.hl),zhi:Math.round(s.st.so),ye:Math.round(s.st.h),
    shi:Math.round(clamp(10+(s.q-1)*10+s.edu*5+s.st.sm*.15+Math.log1p(Math.max(0,s.netWorth)/1000)*4,0,100))});
  function mirror(S,s){
    S.age=s.age;S.cur=s.cur;S.st=mapped(s);S.q=s.q;S.urban=s.urban;S.edu=s.edu;S.school=!!s.school;
    S.job=s.job;S.married=s.married;S.smoker=s.smoker;S.refugee=s.refugee;
    S.money=s.money;S.income=s.income;S.netWorth=s.netWorth;
    if(s.death){S.death={...s.death,year:S.year0+s.death.age,line:'这一生的年轮，在这里停下。'};S.phase='dead';}
  }
  function ringFor(S,year){
    const st={gen:year.hl,zhi:year.so,ye:year.h,shi:S.st.shi};
    const g=NL.growthOf({st}),m=S.sourceMarks.splice(0);
    if(year.mk==='death')m.push({t:'scar',ang:0});
    return {a:year.a,w:+NL.ringW(S,year.a,g).toFixed(3),g,m,st,cur:year.cur||S.cur};
  }
  function observe(S,item){
    if(item.type==='log'&&S.sourceChoice&&!S.sourceChoice.seen){item.choice={...S.sourceChoice};S.sourceChoice.seen=true;}
    S.sourceInbox.push(item);
  }
  function plan(S,state){if(root.NL_HISTORY_IMPACTS)root.NL_HISTORY_IMPACTS.plan(S,state,A);if(root.NL_LIVING)root.NL_LIVING.plan(S,state,A);}
  function bind(S){A.bind(S.sourceNative,S.sourceRng,item=>observe(S,item),state=>plan(S,state),S.sourceHistoryEnabled);}
  function attach(S,opt){
    if(!configured){A.configure(NL.countries);configured=true;}
    if(!A.hasCountry(S.born))return S;
    S.model=A.version;S.sourceHistoryEnabled=opt.history!==false;
    S.sourceRng=NL.makeRng('nianlun:full-events:v1:'+S.seed);
    S.sourceInbox=[];S.sourceMarks=[];S.sourceHistory=[];
    S.sourceNative=A.create(S.born,{sex:S.sex,year0:S.year0,q:S.q,urban:S.urban,isComp:S.isComp,history:S.sourceHistoryEnabled},S.sourceRng,item=>observe(S,item),state=>plan(S,state));
    S.sibOlder=S.sourceNative.fam.older;S.sibPlan=S.sourceNative.fam.younger;S.sibs=S.sibOlder;
    mirror(S,A.snapshot());S.sourceLastStats={...S.st};
    return S;
  }
  function next(S){
    const item=S.sourceInbox.shift();if(!item)return null;
    const before={...S.st};mirror(S,item.snapshot);
    if(item.type==='log'){
      const row=item.entry,d={};for(const key of Object.keys(S.st)){const diff=S.st[key]-before[key];if(diff)d[key]=diff;}
      const mark=row.kind==='loss'?'frost':row.kind==='bad'||row.kind==='death'?'scar':row.kind==='warm'||row.kind==='big'?'bloom':null;
      const marks=mark?[{t:mark,ang:S.rng()*Math.PI*2}]:[];S.sourceMarks.push(...marks);
      const text=A.plain(row.text),sourceId=row.dk||row.d||row.ev||row.act||row.kind;
      const history=row.nlHistory?{...row.nlHistory}:(item.historical?{id:'native:'+item.historyId,year:S.year0+row.a,scope:S.cur,kind:'native',headline:A.plain(row.text),projected:S.year0+row.a>=NL.NOW_YEAR}:null);
      if(history){history.experienceYear=S.year0+row.a;history.followUp=history.year<history.experienceYear;history.projected=history.experienceYear>=NL.NOW_YEAR;}
      const entry={a:row.a,y:S.year0+row.a,id:'source:'+sourceId,sourceId,sourceKind:row.kind,
        icon:row.kind==='loss'?'loss':row.kind==='bad'?'ill':row.kind==='dec'?'road':'home',
        text,d,m:mark?[mark]:[],marks,q:A.plain(row.q||''),fact:A.plain(row.fact||''),history,
        result:{money:item.snapshot.money,income:item.snapshot.income,netWorth:item.snapshot.netWorth,edu:item.snapshot.edu,job:item.snapshot.job,health:item.snapshot.st.hl}};
      if(item.choice){entry.pick=item.choice.label;entry.side=item.choice.key;entry.q=item.choice.question;}
      if(history)S.sourceHistory.push({id:history.id,a:row.a,headline:history.headline,text,result:entry.result});
      S.log.push(entry);item.entry=entry;
    }else if(item.type==='year'){
      const ring=ringFor(S,item.year);S.rings.push(ring);S.lastRing=ring;item.ring=ring;
    }else if(item.type==='death'){
      const year=S.sourceNative.years.at(-1);
      if(!S.rings.some(r=>r.a===year.a)){const ring=ringFor(S,year);S.rings.push(ring);S.lastRing=ring;item.ring=ring;}
    }
    S.sourceLastStats={...S.st};return item;
  }
  function step(S,fraction){bind(S);A.tick(fraction);}
  function decision(S){
    bind(S);const p=A.pending();if(!p)return null;
    const kinds={school2:'study',school3:'study',college:'college',job:'job',jobchange:'job',diag:'health',illness:'health'};
    const n=A.current(),extra=kinds[p.id]&&root.NL_LIVING?root.NL_LIVING.evidence(n.cur,n.by+n.age,kinds[p.id]):'';
    return {id:p.id,title:A.plain(p.view.title),body:A.plain(p.view.body),fact:[A.plain(p.view.fact),extra].filter(Boolean).join('\n\n'),input:!!p.view.input,placeholder:A.plain(p.view.ph),choices:p.view.choices.map(c=>({key:c.k,label:A.plain(c.label),sub:A.plain(c.sub),disabled:!!c.disabled})),history:p.p?.nlHistory||null};
  }
  function choose(S,key,input){
    const d=decision(S),choice=d.choices.find(c=>c.key===key);S.sourceChoice={key,label:choice?.label,question:d.title,seen:false};
    try{A.choose(key,input);}finally{S.sourceChoice=null;}
  }
  function auto(S){bind(S);return A.auto();}
  function focus(S){
    const s=S.sourceNative;s.focus=null;s.fT={health:S.sap.gen||0,family:S.sap.zhi||0,hobby:S.sap.ye||0,career:S.sap.shi||0};
  }
  function adjust(S,delta){bind(S);A.historyDelta({st:{hl:delta.gen||0,so:delta.zhi||0,h:delta.ye||0}});mirror(S,A.snapshot());}
  function runYear(S){
    const age=S.age;let guard=0;
    if(NL.sapDue(S))NL.autoSap(S);focus(S);
    while(S.phase==='life'&&S.age===age&&guard++<500){
      let item;while((item=next(S))){if(item.type==='decision'&&S.sourceNative.pending)choose(S,auto(S));}
      if(S.phase!=='life'||S.age!==age)break;
      if(S.sourceNative.pending)choose(S,auto(S));else step(S,.2);
    }
    if(guard>=500)throw new Error('来源年循环未结束 '+S.born+' '+age);
    return {ring:S.lastRing,died:S.phase==='dead'};
  }
  function runLife(opt){
    const S=NL.newLife(opt);if(!S.sourceNative){let guard=0;while(S.phase==='life'&&guard++<130)NL.runYear(S);return S;}
    let guard=0;while(S.phase==='life'&&guard++<130)runYear(S);
    while(S.sourceInbox.length)next(S);
    if(S.phase!=='dead')throw new Error('来源整局未结束 '+S.born);
    return S;
  }
  NL.source={attach,next,step,decision,choose,auto,focus,adjust,runYear,runLife,metadata:()=>A.metadata()};
})(globalThis);
