// 将 WDI 观测转换到来源内核 ERA 的单位及年度／五年序列合同。
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {load,ROOT} from './loader.mjs';
import {resolve} from 'node:path';
const {NL,NL_TL}=load({files:['src/gen/data.js','src/gen/cal.js','src/engine.js','src/gen/history.js','src/era.js','src/timeline.js']});
const hash=x=>createHash('sha256').update(x).digest('hex');
const defs={m:['SP.DYN.LE00.MA.IN',10,'lm'],f:['SP.DYN.LE00.FE.IN',10,'lf'],t:['SP.DYN.TFRT.IN',100,'tfr']};
const raw={},sources=[];const provenance={};
for(const [field,[indicator]]of Object.entries(defs)){
  const file=`data/worldbank/events/${indicator}.1960-2025.json`,bytes=readFileSync(resolve(ROOT,file));
  sources.push({field,file,sha256:hash(bytes)});raw[field]={};
  for(const row of JSON.parse(bytes)[1])if(row.value!=null){const id=row.countryiso3code;(raw[field][id]||={})[+row.date]=row.value;}
}
const countries={};
const median=arr=>{arr.sort((a,b)=>a-b);return arr.length?arr[Math.floor(arr.length/2)]:null;};
for(const c of NL.countries){
  const row={},est={};
  for(const [field,[,unit,baseline]]of Object.entries(defs)){
    const own=raw[field][c.id]||{},years=Object.keys(own).map(Number).sort((a,b)=>a-b);
    row[field]=[];est[field]={observed:0,interpolated:0,nearest:0,region:0,baseline:0,pre1960:10};
    for(let y=1950;y<=2025;y++){
      const yy=Math.max(1960,y);let value=own[yy];let method='observed';
      if(value==null&&years.length){const lo=years.filter(t=>t<yy).at(-1),hi=years.find(t=>t>yy);if(lo!=null&&hi!=null&&hi-lo<=11){value=own[lo]+(own[hi]-own[lo])*(yy-lo)/(hi-lo);method='interpolated';}else if(lo!=null&&yy-lo<=3){value=own[lo];method='nearest';}}
      if(value==null){value=median(NL.countries.filter(x=>x.reg===c.reg).flatMap(x=>raw[field][x.id]?.[yy]==null?[]:[raw[field][x.id][yy]]));method='region';}
      if(value==null){value=c[baseline];method='baseline';}
      assert(Number.isFinite(value)&&value>0,c.id+field+y);if(y>=1960)est[field][method]++;
      row[field].push(Math.round(value*unit));
    }
  }
  row.b=[];
  for(let y=1950;y<=2025;y++){
    const h=NL_TL.at(c.id,c.reg,Math.max(1960,y));
    row.b.push(h.pop!=null&&h.cbr!=null?+((h.pop*h.cbr).toFixed(3)):null);
  }
  for(const key of ['p','u5','im','u','g'])row[key]=[];
  const latest=NL_TL.at(c.id,c.reg,2025);
  for(let y=1950;y<=2025;y+=5){
    const h=NL_TL.at(c.id,c.reg,Math.max(1960,y));
    row.p.push(h.pop!=null?+(h.pop*1000).toFixed(3):null);
    row.u5.push(+(h.u5??c.u5).toFixed(3));row.im.push(+(h.im??c.im).toFixed(3));
    row.u.push(Math.round((h.urb??c.urb)*10));
    // 同国不变价人均GDP增长比，统一到当前收入锚；不是早年的现价PPP观测。
    const field=h.gdpReal!=null&&latest.gdpReal!=null?'gdpReal':h.pppReal!=null&&latest.pppReal!=null?'pppReal':null;
    row.g.push(field?Math.round(h[field]/Math.max(1,latest[field])*1000):1000);
  }
  countries[c.id]=row;provenance[c.id]=est;
}
// y1 是内核允许推进的日历上限，不是观测截止年。取值函数会自行将数组索引夹在末次观测。
// 若把 y1 写成 2025，会连战争、制度与未来情景的日历也冻结在 2025。
const data={y0:1950,y1:2150,observedThrough:2025,C:countries};
const output='/* tools/build_source_history.mjs；单位、估算和来源见 data/reverse/EVENT_HISTORY.json */\nwindow.NL_SOURCE_ERA='+JSON.stringify(data)+';\n';
const manifest={version:2,observedRange:[1960,2025],internalRange:[1950,2025],simulatedYearLimit:2150,future:'观测输入沿用最后可得值；日历继续推进，来源内核的经济、疾病风险和未来事件规则属于模拟情景',sources,historySourceSha256:hash(readFileSync(resolve(ROOT,'src/gen/history.js'))),units:{m:'年度男性预期寿命×10',f:'年度女性预期寿命×10',t:'年度总和生育率×100',b:'年度出生人数／1000，3位小数=1人',p:'五年人口／1000，3位小数=1人',u5:'五年五岁以下死亡率／千',im:'五年婴儿死亡率／千',u:'五年城镇百分比×10',g:'同国不变价人均GDP／2025对应值×1000；收入模型指数，非历史现价PPP'},imputation:'男女寿命与生育率：本国最长10年缺口插值→最多3年前值延用→同区同年中位数→明确的模型基线；禁止取本国未来最近值。1950–1959仅供内部亲代背景，锚1960估计，不作为观测。其他字段按HISTORY_QUALITY逐项标识；人口与出生数缺值保留null。收入指数缺同年不变价资料时用中性1000模型假设，不宣称历史收入相同。',countries:provenance,generatedSha256:hash(output)};
if(process.argv.includes('--check')){assert.equal(readFileSync(resolve(ROOT,'src/gen/source-history.js'),'utf8'),output);assert.deepEqual(JSON.parse(readFileSync(resolve(ROOT,'data/reverse/EVENT_HISTORY.json'))),manifest);}
else{writeFileSync(resolve(ROOT,'src/gen/source-history.js'),output);writeFileSync(resolve(ROOT,'data/reverse/EVENT_HISTORY.json'),JSON.stringify(manifest,null,2)+'\n');}
console.log('historical adapter',Object.keys(countries).length,'countries',Buffer.byteLength(output),'bytes');
