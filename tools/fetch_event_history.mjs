// 原事件内核所需的分性别寿命和生育率；原有九项历史数据不覆盖、不重取。
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT} from './loader.mjs';
const fields={maleLE:'SP.DYN.LE00.MA.IN',femaleLE:'SP.DYN.LE00.FE.IN',fertility:'SP.DYN.TFRT.IN'};
const dir=resolve(ROOT,'data/worldbank/events');mkdirSync(dir,{recursive:true});
const sources=[];
for(const [field,indicator]of Object.entries(fields)){
  const url=`https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&date=1960:2025&per_page=25000`;
  const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${indicator}`);
  const bytes=Buffer.from(await r.arrayBuffer()),json=JSON.parse(bytes);
  if(!Array.isArray(json?.[1])||json[0].pages!==1)throw new Error('WDI 返回结构或页数不符合预期：'+indicator);
  const file='data/worldbank/events/'+indicator+'.1960-2025.json';writeFileSync(resolve(ROOT,file),bytes);
  sources.push({field,indicator,url,file,fetched_at:new Date().toISOString(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  console.log(field,json[1].length,'records');
}
writeFileSync(resolve(dir,'SOURCES.json'),JSON.stringify({purpose:'原事件内核的历史性别寿命与生育率；缺值处理另记在生成物来源',sources},null,2)+'\n');
