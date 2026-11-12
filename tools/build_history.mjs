// WDI历史表：保留原始缺失、人口到人；每个数值同时记录观测／估计身份。
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {LIVING_INDICATORS} from './living_indicators.mjs';
const ROOT=resolve(import.meta.dirname,'..'),Y0=1960,Y1=2025,N=Y1-Y0+1;
const bytes=readFileSync(resolve(ROOT,'src/gen/data.js'),'utf8');
const DATA=JSON.parse(bytes.slice(bytes.indexOf('=')+1).trim().replace(/;\s*$/,''));
const ids=DATA.rows.map(r=>r[0]),regOf=Object.fromEntries(DATA.rows.map(r=>[r[0],r[2]]));
const BASE={le:'SP.DYN.LE00.IN',im:'SP.DYN.IMRT.IN',u5:'SH.DYN.MORT',ppp:'NY.GDP.PCAP.PP.CD',urb:'SP.URB.TOTL.IN.ZS',ele:'EG.ELC.ACCS.ZS',net:'IT.NET.USER.ZS',pop:'SP.POP.TOTL',cbr:'SP.DYN.CBRT.IN'};
const IND={...BASE,...Object.fromEntries(Object.entries(LIVING_INDICATORS).map(([f,d])=>[f,d.id]))},FIELDS=Object.keys(IND);
const Q={le:1,im:1,u5:1,ppp:0,urb:2,ele:2,net:3,pop:6,cbr:3,...Object.fromEntries(Object.keys(LIVING_INDICATORS).map(f=>[f,3]))};
const raw=Object.fromEntries(FIELDS.map(f=>[f,{}])),sources=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [f,indicator]of Object.entries(IND)){
  const folder=resolve(ROOT,'data/worldbank',BASE[f]?'ts':'living');
  const files=readdirSync(folder).filter(n=>n.startsWith(indicator+'.')&&n.endsWith('.json'));
  assert(files.length,'缺少官方序列 '+indicator+'，先运行 fetch_living_history.mjs');
  for(const file of files){
    const buffer=readFileSync(resolve(folder,file));sources.push({field:f,file:resolve(folder,file).slice(ROOT.length+1),sha256:hash(buffer)});
    const j=JSON.parse(buffer);assert(Array.isArray(j[1]),file);
    for(const row of j[1]){const id=row.countryiso3code,y=+row.date,v=row.value;
      if(!id||y<Y0||y>Y1||v==null)continue;assert(Number.isFinite(v),file+id+y);
      (raw[f][id]||=Array(N).fill(null))[y-Y0]=f==='pop'?v/1e6:v;
    }
  }
}
const median=a=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;};
const quant=(f,v)=>v==null?null:Math.round(v*10**Q[f])/10**Q[f];
function fill(arr,f){
  const a=arr.slice(),q=arr.map(v=>v==null?'-':'o');
  const maxGap=['le','im','u5','pop','cbr','urb'].includes(f)?10:3;
  for(let i=0;i<N;i++)if(arr[i]==null){
    let lo=i-1,hi=i+1;while(lo>=0&&arr[lo]==null)lo--;while(hi<N&&arr[hi]==null)hi++;
    if(lo>=0&&hi<N&&hi-lo-1<=maxGap){a[i]=arr[lo]+(arr[hi]-arr[lo])*(i-lo)/(hi-lo);q[i]='i';}
    else if(lo>=0&&i-lo<=3){a[i]=arr[lo];q[i]='c';}
  }
  return {a,q};
}
const out={},quality={};
for(const id of ids){out[id]=[];quality[id]=[];for(const f of FIELDS){const s=fill(raw[f][id]||Array(N).fill(null),f);out[id].push(s.a);quality[id].push(s.q);}}
// 仅儿童死亡缺项保留原有同年寿命近邻估计；就业、教育等不借别国数值冒充本国资料。
const leIndex=FIELDS.indexOf('le');
for(const f of ['im','u5']){const fi=FIELDS.indexOf(f);for(let i=0;i<N;i++){
  const donors=ids.filter(id=>out[id][fi][i]!=null&&out[id][leIndex][i]!=null).map(id=>({id,le:out[id][leIndex][i],v:out[id][fi][i]}));
  if(donors.length<10)continue;
  for(const id of ids)if(out[id][fi][i]==null&&out[id][leIndex][i]!=null){
    const le=out[id][leIndex][i],near=donors.slice().sort((a,b)=>Math.abs(a.le-le)-Math.abs(b.le-le)||a.id.localeCompare(b.id)).slice(0,10);
    out[id][fi][i]=median(near.map(n=>n.v));quality[id][fi][i]='n';
  }
}}
const regs=[...new Set(Object.values(regOf))],regions={};
for(const reg of regs){const members=ids.filter(id=>regOf[id]===reg);regions[reg]=FIELDS.map((f,k)=>Array.from({length:N},(_,i)=>median(members.map(id=>out[id][k][i]))));}
const enc=rows=>rows.map((a,k)=>a.map(v=>quant(FIELDS[k],v)??'').join(',')).join('|');
const d=Object.fromEntries(ids.map(id=>[id,enc(out[id])])),r=Object.fromEntries(regs.map(id=>[id,enc(regions[id])]));
const method={o:'observed',i:'interpolated',c:'carried',n:'peer_estimate','-':'missing'};
const payload={v:2,y0:Y0,y1:Y1,f:FIELDS,q:Q,src:'World Bank WDI；人口按人保留；内部插值及最多3年前值延用分别标识；仅儿童死亡缺值作同年寿命近邻估计；不向最早观测之前倒填未来值',d,r,quality:Object.fromEntries(ids.map(id=>[id,quality[id].map(a=>a.join('')).join('|')])),methods:method};
const text='/* tools/build_history.mjs；质量与覆盖见 data/HISTORY_QUALITY.json */\nwindow.NL_HIST='+JSON.stringify(payload)+';\n';
const countries={};
for(const id of ids){countries[id]={};for(let k=0;k<FIELDS.length;k++){const f=FIELDS[k],original=raw[f][id]||[],ys=original.flatMap((v,i)=>v==null?[]:[Y0+i]),counts={};for(const q of quality[id][k])counts[method[q]]=(counts[method[q]]||0)+1;countries[id][f]={firstObserved:ys[0]??null,lastObserved:ys.at(-1)??null,...counts};}}
const report={version:2,range:[Y0,Y1],units:{pop:'百万人，6位小数=1人',ppp:'当年现价国际元／人',...Object.fromEntries(Object.entries(LIVING_INDICATORS).map(([f,d])=>[f,d.unit]))},methods:method,definition:'observed表示官方来源该国该年有非空发布值；ILO等序列本身为模型统计，与本项目插补分开，不等于直接观测个人',policies:{interpolation:'仅限两次本国观测之间；人口健康最长10年缺口，其余最长3年，始终标为估计',carry:'距本国上次观测最多3年，禁止链式延长',peer:'仅婴儿及五岁以下死亡率，同年全球预期寿命最近10地中位数',missing:'最早观测前及长缺口保持缺失；不以未来、本年或别国生活统计倒填'},sources,countries,generatedSHA256:hash(text)};
if(process.argv.includes('--check')){assert.equal(readFileSync(resolve(ROOT,'src/gen/history.js'),'utf8'),text);assert.deepEqual(JSON.parse(readFileSync(resolve(ROOT,'data/HISTORY_QUALITY.json'))),report);}
else{writeFileSync(resolve(ROOT,'src/gen/history.js'),text);writeFileSync(resolve(ROOT,'data/HISTORY_QUALITY.json'),JSON.stringify(report,null,2)+'\n');}
console.log('history',ids.length,'places ×',N,'years ×',FIELDS.length,'fields;',Buffer.byteLength(text),'bytes');
