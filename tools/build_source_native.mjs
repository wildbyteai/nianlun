// 原目录只读：从已提取的 worker 生成完整同步模拟库。没有 worker 消息、远程服务或网站启动代码。
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {parse} from 'acorn';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ROOT=resolve(dirname(import.meta.filename),'..');
assert(process.env.NIANLUN_SOURCE_DIR,'Set NIANLUN_SOURCE_DIR to the exact upstream snapshot described in data/reverse/EVENT_LIBRARY.json');
const R=resolve(process.env.NIANLUN_SOURCE_DIR);
const sourceFile='raw/labw.zh-hans.cb0bfdb785.js',bytes=readFileSync(resolve(R,sourceFile)),source=bytes.toString('utf8');
const hash=x=>createHash('sha256').update(x).digest('hex');
const ast=parse(source,{ecmaVersion:'latest'}),body=ast.body[0].expression.callee.body;
const cut=source.indexOf('rc=!0;const W_=');assert(cut>0,'worker 启动边界变更，须重新核对');
let core=source.slice(body.start+1,cut);
const edits=[];
// 只在原有国家读取与职业行业权重这两个窄入口接入当年资料，保持188类决策及结算完整。
const topDeclarations=body.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations);
for(const name of ['p','D']){
  const countryGetter=topDeclarations.find(n=>n.id.name===name);assert(countryGetter?.init?.type==='ArrowFunctionExpression');
  edits.push({pos:countryGetter.init.body.start-body.start-1,end:countryGetter.init.body.end-body.start-1,text:'nlCountry('+source.slice(countryGetter.init.body.start,countryGetter.init.body.end)+')'});
}
const offers=body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='ao');assert(offers);
const sectors=offers.body.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations).find(n=>n.id.name==='k');
assert(sectors?.init?.type==='ObjectExpression');
edits.push({pos:sectors.init.start-body.start-1,end:sectors.init.end-body.start-1,text:'nlSectorMix(o,'+source.slice(sectors.init.start,sectors.init.end)+')'});
for(const [name,replacement]of [['$7e','nlGameHouseChange'],['GR','nlGameHouseFact'],['HR','nlGameHousePressure']]){
  const fn=body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(fn);
  edits.push({pos:fn.id.start-body.start-1,end:fn.id.end-body.start-1,text:replacement});
}
const finances=body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='DX');assert(finances);
const annual=finances.body.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations).find(n=>n.id.name==='Ba');
assert(annual?.init?.type==='ConditionalExpression');
const gain=annual.init.consequent;
edits.push({pos:gain.start-body.start-1,end:gain.end-body.start-1,text:'nlHouseReturn(e.cur,x(),e.urban,'+source.slice(gain.start,gain.end)+')'});
for(const [name,text]of [['qE',';dn.plan&&dn.plan();'],['SZ','nlActiveHistory=a.type==="hist"?a.id:null;if(a.type==="nlHistory"){nlAPI.historyFire(a.p);return;}']]){
  const fn=body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(fn);
  const pos=name==='qE'?fn.body.end-1:fn.body.start+1;edits.push({pos:pos-body.start-1,text});
}
const fireFn=body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='SZ');edits.push({pos:fireFn.body.end-body.start-2,text:';nlActiveHistory=null;'});
for(const {pos,end,text}of edits.sort((a,b)=>b.pos-a.pos))core=core.slice(0,pos)+text+core.slice(end??pos);
const api=readFileSync(resolve(ROOT,'tools/source_native_api.js'),'utf8');
const output=`/* 生成器 tools/build_source_native.mjs；来源 ${sourceFile} SHA-256 ${hash(bytes)}。游戏配置快照，非官方个人因果模型。 */\n(function(root){'use strict';\nconst ERA=root.NL_SOURCE_ERA||(root.window&&root.window.NL_SOURCE_ERA);\nif(!ERA)throw new Error('缺少完整事件的历史统计');\nconst window={ZHS:1,LANG:'zh'},navigator={language:'zh-CN',languages:['zh-CN']};\nconst nlStore=new Map(),localStorage={getItem:k=>nlStore.get(k)||null,setItem:(k,v)=>nlStore.set(k,String(v)),removeItem:k=>nlStore.delete(k)};\nconst document=undefined;\n${core}\n${api}\n})(globalThis);\n`;
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(readFileSync(resolve(ROOT,'src/gen/source-history.js'),'utf8'),ctx);vm.runInContext(output,ctx,{timeout:10000});
const meta=JSON.parse(JSON.stringify(ctx.NL_NATIVE.metadata()));assert.equal(meta.decisions.length,188);
// 与主程序的 DEC 独立核对，防止只复制到子集／只包含 worker 特有表。
const main=readFileSync(resolve(R,'raw/zh-hans.40a0d6ef1f.js'),'utf8');
const mainAst=parse(main,{ecmaVersion:'latest'});let dec;const addedIds=[],defs={},merges=[],mainEvents=new Set();
function visit(n,inShop=false){if(!n||typeof n!=='object')return;if(n.type==='VariableDeclarator'){if(n.id.name==='DEC')dec=n.init;defs[n.id.name]=n.init;if(n.id.name==='SHOP')inShop=true;}
  if(n.type==='ObjectExpression'&&!inShop){const id=n.properties.find(p=>p.key?.name==='id');if(id?.value?.type==='Literal'&&typeof id.value.value==='string'&&n.properties.some(p=>p.key?.name==='run'))mainEvents.add(id.value.value);}
  if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.object.name==='DEC')addedIds.push(n.left.computed?n.left.property.value:n.left.property.name);
  if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.object.name==='Object'&&n.callee.property.name==='assign'&&n.arguments[0]?.name==='DEC')merges.push(...n.arguments.slice(1));
  for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>visit(x,inShop));else if(v&&typeof v==='object')visit(v,inShop);}
visit(mainAst);assert(dec?.type==='ObjectExpression');for(const ref of merges){const arg=ref.type==='Identifier'?defs[ref.name]:ref;assert(arg?.type==='ObjectExpression');addedIds.push(...arg.properties.map(p=>p.key.name||p.key.value));}
const mainIds=[...new Set([...dec.properties.map(p=>p.key.name||p.key.value),...addedIds])].sort();assert.deepEqual(Array.from(meta.decisions),mainIds);
assert.deepEqual(Array.from(meta.events),[...mainEvents].sort(),'主程序常规事件与同步内核不一致');
const mainYear=readFileSync(resolve(R,'derived/fns/endYear.js'),'utf8');
const annualHandlers=[...new Set([...mainYear.matchAll(/\b([A-Za-z_$][\w$]*Year)\(/g)].map(m=>m[1]))].sort();
const manifest={version:2,source:{file:sourceFile,bytes:bytes.length,sha256:hash(bytes)},mainSource:{file:'raw/zh-hans.40a0d6ef1f.js',sha256:hash(main)},generator:'tools/build_source_native.mjs',scope:'完整同步模拟（事件、决策、逐年状态、历史规则、内嵌配置与中文文本）；排除 worker 批量实验／消息启动段及网站账号、远程UGC、DOM展示',adapterEdits:['p/D 所在地与出生地的当年国家条件读取生活统计','ao 职业候选行业权重读取当年就业结构','DX 房产年度收益优先读取BIS同年实质变化，替代旧周期组合而非叠加','$7e/GR/HR 同步住房变化、资料与价格收入压力模型，城市且有记录才采用','qE 年度计划末尾通知本地历史扩展','SZ 支持本地历史队列项'],counts:{events:meta.events.length,decisions:meta.decisions.length,annualHandlers:annualHandlers.length,countries:meta.countries.length},events:meta.events,decisions:meta.decisions,annualHandlers,generatedSha256:hash(output)};
mkdirSync(resolve(ROOT,'data/reverse'),{recursive:true});
if(process.argv.includes('--check')){assert.equal(readFileSync(resolve(ROOT,'src/gen/source-native.js'),'utf8'),output);assert.deepEqual(JSON.parse(readFileSync(resolve(ROOT,'data/reverse/EVENT_LIBRARY.json'))),manifest);}
else {writeFileSync(resolve(ROOT,'src/gen/source-native.js'),output);writeFileSync(resolve(ROOT,'data/reverse/EVENT_LIBRARY.json'),JSON.stringify(manifest,null,2)+'\n');}
console.log(JSON.stringify(manifest.counts));
