// 只下载公共WDI数据；原始响应不改写，已存在的快照只校验并复用。
import {readFileSync, writeFileSync, existsSync, mkdirSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {LIVING_INDICATORS} from './living_indicators.mjs';
const ROOT=resolve(import.meta.dirname,'..'),DIR=resolve(ROOT,'data/worldbank/living');
mkdirSync(DIR,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=[];
async function grab([field,def]){
  const dated=`data/worldbank/living/${def.id}.1960-2025.json`;
  const file=existsSync(resolve(ROOT,dated))?dated:`data/worldbank/living/${def.id}.all.json`,target=resolve(ROOT,file);
  // 官方接口的date范围查询持续返回502；默认全期查询已验证可读取完整单页。
  const url=`https://api.worldbank.org/v2/country/all/indicator/${def.id}?format=json&${file===dated?'date=1960:2025&':''}per_page=20000`;
  let bytes,reused=existsSync(target);
  if(reused)bytes=readFileSync(target);
  else if(existsSync(resolve(ROOT,`tmp/living-foundation-20261112/${def.id}.all.json`)))bytes=readFileSync(resolve(ROOT,`tmp/living-foundation-20261112/${def.id}.all.json`));
  else{for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(url,{signal:AbortSignal.timeout(55000)});if(!r.ok)throw new Error(def.id+' HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());break;}catch(error){if(attempt===1)throw error;console.log('retry',field,error.message);}}}
  const data=JSON.parse(bytes);if(!Array.isArray(data)||!Array.isArray(data[1])||data[0].pages!==1)throw new Error('响应不完整 '+def.id);
  if(!reused)writeFileSync(target,bytes);
  sources.push({field,...def,url,file,bytes:bytes.length,sha256:hash(bytes),fetchedAt:statSync(target).mtime.toISOString(),reused});
  writeFileSync(resolve(DIR,'SOURCES.json'),JSON.stringify({purpose:'国家×年代的生活基础数据；保留原始缺失值，统计条件到个人后果的映射是游戏设计',sources},null,2)+'\n');
  console.log(field,data[1].filter(r=>r.value!=null).length,'non-null',bytes.length,'bytes');
}
// 公开API串行读取，避免同时压满其连接。
for(const item of Object.entries(LIVING_INDICATORS))await grab(item);
writeFileSync(resolve(DIR,'SOURCES.json'),JSON.stringify({purpose:'国家×年代的生活基础数据；保留原始缺失值，统计条件到个人后果的映射是游戏设计',sources},null,2)+'\n');
