/* 国家×年代的生活条件。官方总体统计到人物机会与费用的映射属于游戏模型。 */
(function(root){
  'use strict';
  const NL=root.NL,TL=root.NL_TL,H=root.NL_HOUSING||root.window.NL_HOUSING,cache=new WeakMap();
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const fields={secondary:'sec',tertiary:'ter',unemployment:'un',empAgr:'agr',oop:'oop',net:'net',ele:'ele',urb:'urb'};
  function at(id,year){const c=NL.cby[id];return c?TL.at(id,c.reg,Math.min(year,TL.y1)):null;}
  function country(base,state){
    if(!state||!Number.isFinite(state.age)||state.era==='now'||!NL.cby[base.id])return base;
    const year=(state.by||TL.nowYear)+state.age,key=year;
    let years=cache.get(base);if(!years){years=new Map();cache.set(base,years);}if(years.has(key))return years.get(key);
    const data=at(base.id,year);if(!data)return base;
    const c={...base,nlEvidence:{year,sourceYear:Math.min(year,TL.y1),fields:{}}};
    for(const [field,target]of Object.entries(fields))c.nlEvidence.fields[field]={value:base[target]??null,method:'game_config',sourceYear:null};
    for(const [field,target]of Object.entries(fields))if(data[field]!=null){c[target]=data[field];c.nlEvidence.fields[field]={value:data[field],method:year>TL.y1?'scenario_last_value':data._quality[field],sourceYear:data._sourceYear[field]};}
    if([data.empAgr,data.empInd,data.empSer].every(v=>v!=null)){
      const sum=data.empAgr+data.empInd+data.empSer;
      c.nlEmployment={agr:data.empAgr/sum,ind:data.empInd/sum,ser:data.empSer/sum};
    }
    c.nlSecondary=data.secondary;
    if(base.yr==null&&year<=TL.y1){
      const latest=at(base.id,TL.y1),field=data.gdpReal!=null&&latest.gdpReal!=null?'gdpReal':data.pppReal!=null&&latest.pppReal!=null?'pppReal':null;
      if(field){const ratio=data[field]/latest[field];c.ppp=Math.max(250,base.ppp*ratio);if(base.mu!=null)c.mu=base.mu+Math.log(c.ppp/base.ppp);}
    }
    years.set(key,c);return c;
  }
  function context(id,year){
    const d=at(id,year);if(!d)return '';
    const notes=[];
    if(d.unemployment!=null)notes.push('失业率约'+d.unemployment.toFixed(1)+'%（劳动力总体，非单次求职失败率）');
    if(d.empAgr!=null&&d.empInd!=null&&d.empSer!=null)notes.push('农业／工业／服务业就业约'+[d.empAgr,d.empInd,d.empSer].map(v=>Math.round(v)+'%').join('／'));
    return notes.join('；');
  }
  function housing(id,year,urban){return urban&&year<=H.through?H.C[id]?.[year]||null:null;}
  function housePressure(id,year,ppp,urban,atEnd=false){
    // 年中选择使用上年底价格；年度资产结算后才用本年底读数，避免同年涨跌计算两次。
    const row=housing(id,year-(atEnd?0:1),urban),anchor=housing(id,H.through,urban);
    if(row?.index==null||anchor?.index==null)return null;
    // 购买成本本身随模型收入缩放；用实质房价/模型收入相对值校正，避免把GDP再算一次。
    return clamp(Math.log((row.index/anchor.index)/(ppp/NL.cby[id].ppp)),-.6,.6);
  }
  function housingFact(id,year,urban){
    const row=housing(id,year,urban);if(row?.change==null)return '';
    return NL.cby[id].zh+' · '+year+'年末实质住宅价格同比 '+(row.change>=0?'+':'')+(row.change*100).toFixed(1)+'%（BIS）。这是样本住宅价格变化；城市住房与个人资产的映射属于游戏模型，不是租金涨幅。';
  }
  function evidence(id,year,kind){
    const c=NL.cby[id],d=at(id,year);if(!d)return '';
    const wanted=kind==='study'?['ele','secondary']:kind==='water'?['water']:kind==='job'?['unemployment','empAgr','empInd','empSer']:kind==='college'?['tertiary']:['oop'];
    const labels={ele:'电力可及人口',secondary:'中学毛入学率',water:'基本饮水覆盖人口',tertiary:'高教毛入学率',oop:'居民自付占全国卫生总支出',unemployment:'ILO模型失业率',empAgr:'农业就业份额',empInd:'工业就业份额',empSer:'服务业就业份额'};
    const method=f=>({interpolated:'插值估计',carried:'沿用'+d._sourceYear[f]+'年资料',peer_estimate:'同年近邻估计',region_estimate:'同年地区估计'}[d._quality[f]]||'估计');
    const text=wanted.filter(f=>d[f]!=null).map(f=>labels[f]+' '+d[f].toFixed(1)+'%'+(d._quality[f]==='observed'?'':'（'+method(f)+'）'));
    if(!text.length)return c.zh+' · '+year+'年。此项暂无可用的同年统计，机会与成本仍按游戏配置推演。';
    return c.zh+' · '+year+'年。'+text.join('；')+'。人口统计只约束情境与游戏权重，不等于你家或某次选择的真实概率。'+(year>TL.y1?'未来环境沿用末次资料，属于模拟情景。':'');
  }
  function plan(S,state,A){
    const year=state.by+state.age,d=at(state.cur,year);
    const pressure=housePressure(state.cur,year,A.country().ppp,state.urban);
    if(pressure!=null){state.flags.hMkC=state.cur;state.flags.hMk=pressure;}
    const practice=state.flags.nlStudyPractice;
    if(practice&&year>practice.year&&year<=practice.until){A.historyDelta({knowledge:.018,st:{h:-.2}});A.emitHistory('你保留了前些年安排下来的学习时间，功课和做事的方法一点点熟练起来。',practice.record);}
    const duty=state.flags.nlWaterDuty;
    if(duty&&year>duty.year&&year<=duty.until){A.historyDelta({st:{h:-.3,so:.2}});A.emitHistory('取水和分担家务仍占着一部分时间，你继续和家里人轮着安排。',duty.record);}
    if(!d||year>TL.y1)return;
    let kind;
    if(state.age===12&&state.school&&d.ele!=null)kind='study';
    else if(state.age===24&&d.water!=null)kind='water';
    if(!kind||state.flags['nlLiving:'+kind])return;
    state.flags['nlLiving:'+kind]=year;
    const rate=kind==='study'?d.ele:d.water;
    const probability=clamp(rate/100+(state.urban?.07:-.05)+(state.q-3)*.025,.01,.995);
    const access=rate>=99.99||S.sourceRng()<probability;
    const headline=kind==='study'?(access?'晚饭后的灯还亮着，你想给功课留一点时间。':'天黑以后家里不便用电，功课得和家务错开。'):(access?'住处附近能取得饮水，安排家务方便了一些。':'家里用水还不方便，取水和做事的时间得重新安排。');
    const record={id:'living:'+state.cur+':'+year+':'+kind,scope:state.cur,year,kind:'living-'+kind,headline,access,studyWeight:d.secondary==null?1:clamp(.8+d.secondary/500,.8,1.1),data:{value:rate,method:d._quality[kind==='study'?'ele':'water']},evidence:'WDI/'+state.cur+'/'+year+'/'+(kind==='study'?'EG.ELC.ACCS.ZS':'SH.H2O.BASW.ZS')};
    // 与原历史队列相同，经历在当年出现，后续由实际人物状态结算。
    A.scheduleHistory({...record,livingKind:kind});
  }
  function install(A){
    A.registerHistory('nl_living',{
      build:payload=>{
        const r=payload.record,s=A.current(),study=r.livingKind==='study';
        const choices=study?[
          {k:'study',label:r.access?'晚饭后留一会儿读书':'趁天亮先把功课做完',sub:'挪开一些闲暇和家务，持续积累学习经验'},
          {k:'together',label:'找同学一起学，互相借资料',sub:'多些来往，少一些独自摸索'},
          {k:'family',label:'先帮家里把手头的事做完',sub:'照料家人，这次不另留学习时间'},
        ]:r.access?[
          {k:'learn',label:'把省下的时间拿来学点东西',sub:'一小段稳定的学习时间'},
          {k:'family',label:'把时间留给家里人',sub:'家务和相处不必总赶在一起'},
          {k:'rest',label:'让自己歇一会儿',sub:'日子里留一点余地'},
        ]:[
          {k:'collect',label:'早起把水带回来',sub:'省钱，之后几年仍要安排时间'},
          {k:'together',label:'和邻居轮着跑一趟',sub:'分担奔波，也有一点共同开支'},
          {k:'pay',label:'花钱请人把水送来',sub:'减少眼前的奔波，留下这一笔开支'},
        ];
        return {title:study?'放学后的时间':r.access?'家务之后的一小段空闲':'把水带回家',body:r.headline,fact:evidence(s.cur,s.by+s.age,study?'study':'water')+'家庭条件是按城乡、家境与覆盖率抽取的模拟设定；本节点不增加死亡风险。',choices};
      },
      apply:(key,payload)=>{
        const r=payload.record,s=A.current(),study=r.livingKind==='study',cost=Math.max(2,(s.income||A.country().ppp*.25)*.004);
        let text;
        if(study&&key==='study'||!study&&key==='learn'){
          const weight=study?r.studyWeight:1;
          A.historyDelta({knowledge:.04*weight,st:{h:1}});s.flags.prep=Math.min(2,(s.flags.prep||0)+.2*weight);
          s.flags.nlStudyPractice={year:r.year,until:r.year+2,record:r};
          text='你把一小段时间留给了学习。这些练习会进入后面的功课、升学准备与做事经验。';
        }else if(key==='together'){
          A.historyDelta({money:-cost*.3,knowledge:study?.025:0,st:{so:3,h:1}});
          text=study?'你和同学互相借资料、一起做功课，学到了一点新办法。':'你和邻居分着跑，花了一点共同开支，也少了一些独自奔波。';
        }else if(key==='collect'){
          A.historyDelta({st:{h:-1,so:1}});s.flags.nlWaterDuty={year:r.year,until:r.year+2,record:r};
          text='你早起把水带回来。钱省下了，但之后几年仍要给这件家务留出时间。';
        }else if(key==='pay'){
          A.historyDelta({money:-cost,st:{h:1}});text='你付了一笔送水费用，把这段时间留给了手头的工作和家里人。';
        }else if(key==='rest'){
          A.historyDelta({st:{h:2}});text='你把省下的一点时间留给自己，慢慢过完了这个下午。';
        }else{A.historyDelta({st:{so:3,h:1}});text='你先照料了家里的事情。这段时间留给了身边的人，学习仍按原来的节奏走。';}
        A.emitHistory(text,r);return false;
      },
    });
  }
  root.NL_LIVING={at,country,context,evidence,housing,housePressure,housingFact,plan,install};
})(globalThis);
