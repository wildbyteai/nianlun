/* 年代注脚的补充经历。战争、金融危机、灾害、疫情由完整来源内核处理，避免再扣一次。
 * 这里补制度与新技能机会；年份指向 era.js 同一条记录，后果为游戏设计，并非官方因果系数。
 */
(function(root){
  'use strict';
  const NL=root.NL,A=root.NL_NATIVE,E=root.NL_ERA||root.window.NL_ERA;
  const records=[];
  function add(scope,years,kind,minAge,maxAge){
    const rows=scope==='WORLD'?E.world:E.home[scope];
    for(const year of years){const row=rows.find(r=>r[0]===year);if(!row)throw new Error('缺少年代依据 '+scope+year);
      records.push({id:'era:'+scope+':'+year,scope,year,kind,minAge,maxAge,headline:row[1],evidence:'era.js/'+(scope==='WORLD'?'world':'home/'+scope)+'/'+year});}
  }
  add('IND',[1966],'livelihood',18,60);
  add('IND',[1991,2000],'career',16,45);
  add('IND',[2013],'study',15,23);
  add('IND',[2016],'cash',18,75);
  add('IND',[2017],'digital',18,65);
  add('BRA',[1990],'health',0,85);
  add('BRA',[1998,2010],'study',15,26);
  add('BRA',[2009,2019],'career',18,60);
  add('BRA',[2020],'digital',18,65);
  add('NGA',[1978,2015],'study',15,26);
  add('NGA',[1993],'career',16,40);
  add('NGA',[2001,2013],'digital',18,60);
  add('USA',[1981,1995],'technology',12,60);
  add('CHN',[1978,1990,2001],'career',16,55);
  add('CHN',[2013],'digital',16,65);
  add('VNM',[1995,2007],'career',16,55);
  add('KEN',[2007],'digital',18,65);
  add('WORLD',[1977,1981,1989,1991,1993,1995,2007,2023,2025],'technology',12,65);
  const explanation={
    study:'考试与升学安排发生变化。你有机会调整准备方式，但要付出时间和费用。',
    career:'新的行业和制度正在改变招工方式。机会不保证落到你身上，熟悉的工作也仍要有人做。',
    livelihood:'新的生产方式传到你附近。改用它需要学习和投入，也要承担试错的代价。',
    technology:'新技术进入你能接触到的生活。要不要抽出时间学会它？',
    digital:'附近开始有了新的通信、收款或服务方式。学会使用它能省一些周折，也有设备和时间成本。',
    cash:'旧钞兑换挤占了做生意和办事的时间。你得决定先处理现金，还是继续手头的活。',
    health:'公共医疗服务逐步铺开。一次检查能让你更了解身体，也意味着要花时间前往。',
  };
  const choices={
    study:[['prepare','调整备考，补上新要求','花钱和时间，增加学业积累'],['earn','先做工，帮家里挣一点','增加眼前收入，暂缓准备'],['wait','照原来的安排继续','暂时不作额外投入']],
    cash:[['prepare','请假去兑换，留好日用现金','损失一点工钱，减少现金周转影响'],['help','和亲友互相照应','需要奔波，亲友联系增加'],['wait','先把手里的工作做完','保留工时，承担一笔周转损失']],
    health:[['prepare','安排检查，跟进身体情况','付出出行时间，改善健康管理'],['help','陪家人去了解服务','照料亲友，自己也了解一些知识'],['wait','这次先不去','继续原来的安排']],
  };
  function options(record){return choices[record.kind]||[['prepare','抽时间学一学，试着用起来','减少眼前积蓄，积累技能；收益仍有不确定性'],['help','先和身边的人一起尝试','投入少一些，交换经验'],['wait','先守住眼前的日子','暂时不承担新成本']];}
  function eligible(record,id,age){return record.year<=2025&&(record.scope==='WORLD'||record.scope===id)&&age>=record.minAge&&age<=record.maxAge;}
  function plan(S,state,api){
    if(!state.by||state.age===0&&S.year0>2025)return;
    const year=state.by+state.age;
    // 长期后果结算使用当年状态，不提前固定未来职业或收入。
    const training=state.flags.nlTraining;
    if(training&&year>training.year&&year<=training.until){
      api.historyDelta({knowledge:.015,st:{h:-.25}});
      api.emitHistory('你继续练习前些年学到的新方法。它已经成了求学或做事时的一点积累。',training.record);
    }
    const digital=state.flags.nlDigital;
    if(digital&&year>digital.year&&year<=digital.until&&state.income>0){
      const saved=Math.max(1,state.income*.004);api.historyDelta({money:saved});
      api.emitHistory('你继续使用已经学会的服务，少跑了几趟，也省下一小笔办事成本。',digital.record);
    }
    const candidates=records.filter(r=>r.year===year&&eligible(r,state.cur,state.age)).sort((a,b)=>(a.scope==='WORLD')-(b.scope==='WORLD'));
    const record=candidates[0];if(!record)return;
    const key='nlHistory:'+record.id;if(state.flags[key])return;state.flags[key]=1;
    // 全球新品并不同时普及：城乡、家境及当地当年的网络可及性共同影响接触机会。
    const country=api.country(),prob=record.scope==='WORLD'?.12+Math.min(.55,country.net/150)+(state.urban?.15:0):.72;
    if(S.sourceRng()>=prob)return;
    api.scheduleHistory(record);
  }
  A.registerHistory('nl_era',{
    build:payload=>({title:A.current().age<12?'这一年，家里多了一道选择':'这一年，日子多了一道选择',body:payload.record.headline+'\n\n'+(A.current().age<12?'这一次由家人替你安排。':'')+explanation[payload.record.kind],fact:'年份与事件对应年代资料；你遇到的具体情境和数值后果属于游戏模拟。',choices:options(payload.record).map(([k,label,sub])=>({k,label,sub}))}),
    apply:(key,payload)=>{
      const record=payload.record,s=A.current(),base=Math.max(250,A.country().ppp*.35),cost=base*.008;
      let text;
      if(key==='prepare'){
        if(record.kind==='cash'){A.historyDelta({money:-cost*.35,st:{h:-1}});s.flags.nlCashReady=record.year;text='你抽出时间处理了旧钞兑换。少挣了一点工钱，手头周转终于安定下来。';}
        else if(record.kind==='health'){A.historyDelta({money:-cost*.25,st:{hl:3,h:1}});s.flags.nlHealthVisit=record.year;text=s.age<12?'家人带你去了解了可用的医疗服务，也留意起你需要复查的身体问题。':'你去了解了可用的医疗服务，也开始留意需要复查的身体问题。';}
        else{A.historyDelta({money:-cost,knowledge:.06,st:{h:-1}});s.flags.prep=Math.min(2,(s.flags.prep||0)+.5);s.flags.nlTraining={year:record.year,until:record.year+2,record};
          if(record.kind==='digital')s.flags.nlDigital={year:record.year,until:record.year+3,record};
          text=record.kind==='study'?'你按新的考试安排准备起来。少了一些闲暇和积蓄，但学到的东西会带到后面的升学选择里。':'你付出一笔学习或设备费用，开始练习新的做事方法。它进入了你的技能积累，后面能否用上还要看机会。';}
      }else if(key==='earn'){A.historyDelta({money:cost*1.5,st:{h:-1}});text='你把这段时间用来做工。家里多了一笔现钱，备考仍按原来的进度走。';}
      else if(key==='help'){A.historyDelta({money:-cost*.25,knowledge:.02,st:{so:3,h:1}});text='你和身边的人一起摸索，互相分担了奔波与试错。这件事也让你们走近了一点。';}
      else if(record.kind==='cash'){A.historyDelta({money:-Math.min(Math.max(0,s.money)*.03,cost*2),st:{h:-2}});text='你先顾着手里的活。随后几天，现金周转还是让你损失了一点钱，也多了些烦心事。';}
      else{text='你保留了原来的安排。这次变化没有立即改写你的日子，后来的路仍要照常走。';}
      A.emitHistory(text,record);return false;
    },
  });
  A.setHistoryHandler(record=>A.askHistory(record.livingKind?'nl_living':'nl_era',{record,nlHistory:record}));
  // 原库缺少配置的出生地仍可遇到公共技术变化；不借用相邻国家的身份与制度。
  for(const record of records)if(record.scope==='WORLD')NL.register([{
    id:'history_'+record.id,a0:record.minAge,a1:record.maxAge,p:.35,dec:true,icon:'road',once:true,
    if:(S)=>!S.sourceNative&&S.year0+S.age===record.year,
    ask:()=>record.headline+' '+explanation[record.kind],
    L:{t:'抽时间学一学',run:S=>{NL.util.fx(S,{shi:5,ye:-2});S.flags.historyLearning=record.year;return '你花了一些积蓄和闲暇，把新方法学了起来。';}},
    R:{t:'先守住眼前的日子',run:()=> '你先保留了原来的安排。'},
  }]);
  root.NL_HISTORY_IMPACTS={records,eligible,plan};
})(globalThis);
