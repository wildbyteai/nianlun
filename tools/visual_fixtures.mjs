// 从实际内核生成可重放的渲染条件；截图标为受控场景，不当作自然抽样或真人经历。
import assert from 'node:assert/strict';
import {load} from './loader.mjs';
export function visualFixtures(){
  const {NL,NL_VIEW:V,NL_NATIVE:A,NL_HISTORY_IMPACTS:H}=load(),found=new Map();let decisionsChecked=0,quiet=0,scenes=0;
  const required=['temper','reflect','hobby','school3','college','major','job','history-study','history-cash','history-digital','event-health','event-history','living-study-lit','living-study-daylight','living-water-near','living-water-fetch'];
  const specs=[['IND',1990,'22222224'],['USA',1990,'22222226'],['BRA',1990,'2222225A'],['NGA',1990,'22222229'],['IND',1970,'visual-india'],['BRA',1970,'visual-brazil'],['NGA',1970,'visual-nigeria'],['IND',1990,'visual-india-2']];
  function capture(name,type,S,data){
    if(found.has(name))return;
    const own=Object.fromEntries(['seed','born','cur','sex','q','q0','urban','urban0','year0','age','st','rings','sap','sapAt'].map(key=>[key,S[key]]));
    found.set(name,JSON.parse(JSON.stringify({name,type,own,native:S.sourceNative,data})));
  }
  for(const [country,year0,seed]of specs){
    const S=NL.newLife({country,year0,seed});let steps=0;
    while(S.phase==='life'&&S.age<55&&steps++<2500){
      let item;
      while((item=NL.source.next(S))){
        if(item.type==='decision'&&S.sourceNative.pending){
          const d=NL.source.decision(S),before=JSON.stringify(d),vm=V.decision(d);decisionsChecked++;
          assert.equal(JSON.stringify(d),before,'呈现函数修改了原始决策');
          assert.deepEqual(Array.from(vm.choices,c=>c.key),Array.from(d.choices,c=>c.key));
          assert.deepEqual(Array.from(vm.choices,c=>c.originalLabel),Array.from(d.choices,c=>c.label));
          if(required.includes(d.id))capture(d.id,'decision',S,d);
          if(d.history&&['study','cash','digital'].includes(d.history.kind))capture('history-'+d.history.kind,'decision',S,d);
          if(d.history?.livingKind==='study')capture('living-study-'+(d.history.access?'lit':'daylight'),'decision',S,d);
          if(d.history?.livingKind==='water')capture('living-water-'+(d.history.access?'near':'fetch'),'decision',S,d);
          NL.source.choose(S,NL.source.auto(S));
        }else if(item.type==='log'){
          const entry=item.entry;
          if(V.foreground(entry,3))scenes++;else quiet++;
          if(entry.history&&!entry.history.projected)capture('event-history','event',S,entry);
          if(/疫苗|检查|住院|医生|病倒/.test(entry.text))capture('event-health','event',S,entry);
        }
      }
      if(S.phase!=='life')break;
      if(S.sourceNative.pending)NL.source.choose(S,NL.source.auto(S));else NL.source.step(S,.2);
    }
    if(required.every(key=>found.has(key)))break;
  }
  // 重放实际已排入当年队列的生活条件，保留国家统计和家庭抽签结果；不伪造低覆盖率。
  for(const [kind,age]of [['study',12],['water',24]]){
    for(let attempt=0;attempt<50;attempt++){
      const names=kind==='study'?['living-study-lit','living-study-daylight']:['living-water-near','living-water-fetch'];
      if(names.every(name=>found.has(name)))break;
      const S=NL.newLife({country:attempt%2?'IND':'NGA',year0:1990,seed:'living-render-'+kind+attempt});
      while(S.phase==='life'&&S.age<age)NL.source.runYear(S);
      if(S.phase!=='life'||S.age!==age)continue;
      const queued=S.sourceNative.queue.find(q=>q.type==='nlHistory'&&q.p.livingKind===kind);if(!queued)continue;
      const record=queued.p,name=kind==='study'?'living-study-'+(record.access?'lit':'daylight'):'living-water-'+(record.access?'near':'fetch');
      S.sourceNative.pending=null;S.sourceInbox=[];NL.source.decision(S);A.askHistory('nl_living',{record,nlHistory:record});
      capture(name,'decision',S,NL.source.decision(S));found.get(name).forcedExposure=true;
    }
  }
  // 曝露抽签未命中的现金场景，单独构造同国同年的合法年龄条件，不冒充自然触发。
  if(!found.has('history-cash')){
    let S;
    for(let attempt=0;attempt<20;attempt++){
      const candidate=NL.newLife({country:'IND',year0:1990,seed:attempt?'visual-cash-'+attempt:'22222224'});
      while(candidate.phase==='life'&&candidate.age<26)NL.source.runYear(candidate);
      if(candidate.phase==='life'&&candidate.age===26&&candidate.cur==='IND'){S=candidate;break;}
    }
    assert(S,'现金场景没有活到对应年份的人物背景');
    const record=H.records.find(r=>r.id==='era:IND:2016');
    S.sourceNative.pending=null;S.sourceNative.queue=[];S.sourceInbox=[];
    NL.source.decision(S);A.askHistory('nl_era',{record,nlHistory:record});
    const d=NL.source.decision(S);assert(d?.history?.id===record.id);capture('history-cash','decision',S,d);found.get('history-cash').forcedExposure=true;
  }
  assert(required.every(key=>found.has(key)),'缺少受控场景：'+required.filter(key=>!found.has(key)).join(','));
  assert(quiet>0&&scenes>0,'轻提示与主要事件必须分流');
  assert.equal(V.foreground({sourceKind:'bad',history:{id:'history'}},100),true);
  assert.equal(V.foreground({sourceKind:'dec'},0),false);
  assert(V.decision(found.get('job').data).choices.some(c=>c.hint.includes('国际元／年')),'职业卡缺少年收入');
  return {fixtures:[...found.values()],checks:{decisionsChecked,quiet,scenes,allKeysRetained:true,originalTextRetained:true,jobIncomeVisible:true}};
}
