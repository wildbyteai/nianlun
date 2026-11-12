// 浏览器模拟验证：无头 Chrome + CDP，按三个手机视口走完整局。用法：node tools/browser_check.mjs [视口宽x高 ...]
// 先启动 dist 的 loopback HTTP 服务；输出 validation/browser/<运行时间>/，保留旧证据。这是模拟，不等于真机。
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { visualFixtures } from './visual_fixtures.mjs';
const ROOT = resolve(dirname(import.meta.filename), '..');
const OUT = resolve(ROOT, 'validation/browser', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(OUT, { recursive: true });
const PAGE = process.env.NIANLUN_PREVIEW_URL || 'http://127.0.0.1:18765/nianlun.html';
const CHROME = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9365;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWS = (process.argv.slice(2).length ? process.argv.slice(2) : ['390x844', '360x800', '430x932']).map((v) => v.split('x').map(Number));
const VISUAL_ONLY=process.env.NIANLUN_VISUAL_ONLY==='1';
const visual=visualFixtures();

mkdirSync(resolve(ROOT, 'tmp'), { recursive: true });
const prof = mkdtempSync(resolve(ROOT, 'tmp/chrome-browser-check-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let ver;
for (let i = 0; i < 50; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch { await delay(200); } }
if (!ver) { console.log('Chrome 没有启动'); process.exit(2); }

class CDP {
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    const c = new CDP(); c.ws = ws; c.id = 0; c.wait = new Map(); c.handlers = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && c.wait.has(m.id)) { const p = c.wait.get(m.id); c.wait.delete(m.id); m.error ? p.no(new Error(JSON.stringify(m.error))) : p.ok(m.result); }
      else if (m.method) for (const h of c.handlers) h(m);
    };
    return c;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((ok, no) => { this.wait.set(id, { ok, no }); this.ws.send(JSON.stringify({ id, method, params, sessionId })); setTimeout(() => { if (this.wait.has(id)) { this.wait.delete(id); no(new Error('timeout ' + method)); } }, 30000); });
  }
}
const browser = await CDP.open(ver.webSocketDebuggerUrl);
const report = { page: PAGE, bundleSHA256: createHash('sha256').update(readFileSync(resolve(ROOT, 'dist/nianlun.html'))).digest('hex'), chrome: ver.Browser, when: new Date().toISOString(), kind: '浏览器模拟验证（非真机）', views: [] };
report.presentation=visual.checks;

async function runView(W, H) {
  let Rref = null;
  try { return await runViewInner(W, H, (r) => { Rref = r; }); } catch (e) { e.R = Rref; throw e; }
}
async function runViewInner(W, H, expose) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => browser.send(m, p, sessionId);
  const R = { view: `${W}x${H}`, shots: [], errors: [], requests: [], checks: {} };
  expose(R);
  browser.handlers.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') R.errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 300) || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) R.errors.push('console.' + m.params.type + ': ' + m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200));
    if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (!u.startsWith('data:')) R.requests.push(u.slice(0, 120)); }
  });
  await s('Runtime.enable'); await s('Network.enable'); await s('Page.enable');
  // 新建的标签页默认在后台，Chrome 会暂停 requestAnimationFrame；切到前台并模拟焦点
  await browser.send('Target.activateTarget', { targetId });
  await s('Page.bringToFront');
  await s('Emulation.setFocusEmulationEnabled', { enabled: true });
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const ev = async (expr) => { const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const until = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await delay(80); } throw new Error('等待超时：' + expr); };
  const shot = async (name) => { const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 82 }); const f = `${W}x${H}-${name}.jpg`; writeFileSync(resolve(OUT, f), Buffer.from(r.data, 'base64')); R.shots.push(f); };
  const center = async (sel) => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}),host=el.closest('.source-body,.sheet .body,.era-strip');const r0=el.getBoundingClientRect();if(host){const h=host.getBoundingClientRect();if(r0.bottom>h.bottom||r0.top<h.top)host.scrollTop+=r0.top-h.top-(host.clientHeight-r0.height)/2;}else if(r0.bottom>innerHeight||r0.top<0)el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}})()`);
  const touch = (type, x, y) => s('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  const tap = async (sel) => { const p = await center(sel); await touch('touchStart', p.x, p.y); await delay(40); await touch('touchEnd', p.x, p.y); await delay(80); };
  const overflow = async (label) => {
    // 等有限入场动画结束后量稳定布局，避免把卡片的translateY计为页面溢出。
    const previousPause=await ev(`(()=>{const g=window.__nl;if(g?.mode!=='life')return null;const p=g.paused;g.paused=true;return p})()`);
    await ev(`Promise.allSettled((document.querySelector('.scr.on')?.getAnimations({subtree:true})||[]).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished)).then(()=>true)`);
    const o = await ev(`(()=>{const on=document.querySelector('.scr.on');const bad=[];const seen=(el)=>{for(let e=el;e&&e!==document.body;e=e.parentElement){const cs=getComputedStyle(e);if(cs.opacity==='0'||cs.visibility==='hidden'||cs.display==='none')return false;if(e!==el&&cs.overflow==='hidden'&&e!==on)return 'clip'}return true};for(const el of on.querySelectorAll('*')){const r=el.getBoundingClientRect();const v=seen(el);if(!v||v==='clip')continue;if(r.width&&(r.right>innerWidth+1||r.left<-1)&&getComputedStyle(el).position!=='fixed'&&!el.closest('.card.dec')&&!el.closest('canvas'))bad.push((el.className||el.tagName)+':'+Math.round(r.left)+'-'+Math.round(r.right))}return {docW:document.documentElement.scrollWidth,vw:innerWidth,bad:bad.slice(0,5)}})()`);
    R.checks['横向溢出-' + label] = o.docW <= o.vw + 1 && !o.bad.length ? '通过' : JSON.stringify(o);
    // 除了年谱/海报等弹层，每一屏本身都不该需要纵向滚动
    const vOver = await ev(`(()=>{const on=document.querySelector('.scr.on');return on?on.scrollHeight-on.clientHeight:0})()`);
    R.checks['不需纵滚-' + label] = vOver <= 1 ? '通过' : '超出 ' + vOver + 'px';
    if(previousPause!==null)await ev(`window.__nl.paused=${previousPause}`);
  };
  const targetUrl=new URL(PAGE),seed=W===360?'2222225A':W===430?'2222224F':'22222228';
  if(!targetUrl.searchParams.has('seed'))targetUrl.searchParams.set('seed',seed);
  R.page=targetUrl.href;
  await s('Page.navigate', { url: targetUrl.href });
  await until(`document.querySelector('#s-title.on')!==null`);
  await delay(700);
  await shot('01-title'); await overflow('标题');
  // 标题页按钮都在视口内
  R.checks['标题按钮可见'] = (await ev(`[...document.querySelectorAll('#s-title button.btn')].every(b=>{const r=b.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0&&r.height>=44})`)) ? '通过' : '有按钮被截断或小于 44px';
  R.checks['出生年份可选'] = (await ev(`document.querySelectorAll('#cohort-chips button').length===6&&/1990/.test(document.querySelector('#tagline-sub').textContent)`)) ? '通过' : '出生年份选项缺失';
  R.checks['国家制度卡已载入'] = (await ev(`['hk_entrance','sg_secondary','kr_jeonse','us_college','de_training'].every(id=>NL.events.some(e=>e.id===id))`)) ? '通过' : '单文件成品缺少国家事件';
  await tap('[data-act=start]');
  await until(`document.querySelector('#s-drop.on')!==null`);
  await delay(900);
  await shot('02-drop'); await overflow('落地');
  // 按住 1.6 秒
  const hp = await center('#hold');
  await touch('touchStart', hp.x, hp.y);
  await delay(1100); await shot('03-hold');
  await delay(500);
  await touch('touchEnd', hp.x, hp.y);
  await delay(1750); await shot('04-landed');
  await until(`document.querySelector('#s-birth.on')!==null`, 8000);
  await delay(700);
  await shot('05-birth'); await overflow('出生');
  R.checks['出生信息'] = await ev(`document.querySelectorAll('#birth-facts li').length===4&&!/undefined|NaN/.test(document.querySelector('#s-birth').innerText)`) ? '通过' : '缺字段或出现 undefined/NaN';
  const birthTxt = await ev(`document.querySelector('#birth-country').textContent+' / '+[...document.querySelectorAll('#birth-tags .tag')].map(t=>t.textContent).join(' ')`);
  R.birth = birthTxt;
  // 出生页必须一屏放下：地图 + 四项数据 + 状态 + 说明 + 「发芽」按钮，不用往下拉。
  R.checks['出生页一屏放下'] = (await ev(`(()=>{const s=document.querySelector('#s-birth');const b=document.querySelector('[data-act=sprout]').getBoundingClientRect();return {req:Math.ceil(b.bottom-innerHeight), over:s.scrollHeight-s.clientHeight, btn:Math.round(b.height)}})()`)).over <= 1 && (await ev(`document.querySelector('[data-act=sprout]').getBoundingClientRect().bottom`)) <= H - 4 ? '通过' : '需要滚动才能看到「发芽」';
  await ev(`document.querySelector('#s-birth').scrollTop=1e4`);
  await tap('[data-act=sprout]');
  await until(`document.querySelector('#s-life.on')!==null`);
  await delay(2600);
  await overflow('一生'); await shot('06-life');
  R.checks['当年世界线'] = (await ev(`(()=>{const e=document.querySelector('#life-era .era-item.now');if(!e)return false;const m=document.querySelector('#life-year').textContent.match(/[0-9]{4}/);return !!m&&e.innerText.indexOf(m[0])>=0&&/预期寿命|往后/.test(e.innerText)&&/那年|往后/.test(e.innerText)})()`)) ? '通过' : '没有显示那一年的统计与年代注脚';
  if(!VISUAL_ONLY){
  await tap('[data-act=log]'); await delay(320);
  R.checks['年谱含世界线'] = (await ev(`document.querySelectorAll('#log-list li.era').length>=1`)) ? '通过' : '年谱里没有世界线';
  await tap('#sh-log [data-act=close]'); await delay(280);
  let decN = 0, sapN = 0, steps = 0, side = 1, shotDec = false, shotSap = false, shotMid = false, eraChecked = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    const st = await ev(`(()=>{const g=window.__nl;return {mode:g.mode,dec:!!document.querySelector('.card.dec'),source:!!document.querySelector('.source-card'),choices:document.querySelectorAll('.source-choices button').length,input:!!document.querySelector('.source-card textarea'),solo:!!document.querySelector('.card.dec .choices.solo'),sap:!!document.querySelector('.card.sap'),age:g.S&&g.S.age}})()`);
    if (st.mode === 'end' || st.mode === 'dying') break;
    if (!eraChecked && st.age >= 8) {
      const e = await ev(`(()=>{const h=document.querySelector('#life-era');return {n:h.querySelectorAll('.era-item').length,scroll:h.scrollHeight>h.clientHeight+4,last:h.lastElementChild===h.querySelector('.era-item.now')}})()`);
      R.checks['世界线累积可滚'] = (e.n >= 8 && e.scroll && e.last) ? '通过' : `只有 ${e.n} 条 / 可滚 ${e.scroll} / 最新在末尾 ${e.last}`;
      eraChecked = true;
    }
    if (st.sap) {
      if (!shotSap) { await delay(450); await shot('08-sap'); await overflow('养分'); shotSap = true; }
      for (const k of ['gen', 'ye', sapN % 2 ? 'zhi' : 'shi']) await tap(`.card.sap [data-k=${k}]`);
      await tap('.card.sap .sap-go'); sapN++;
      await delay(150); continue;
    }
    if (st.dec) {
      if (!shotDec && !st.solo) { await delay(450); await shot('07-decision'); await overflow('决策'); shotDec = true; }
      if(st.source){
        await ev(`Promise.all(document.querySelector('.source-card').getAnimations().map(a=>a.finished)).then(()=>true)`);
        const expected=await ev(`NL.source.decision(window.__nl.S).choices.length`);
        R.checks['原库选项完整显示']=expected===st.choices?'通过':`${expected} 个选项只显示 ${st.choices}`;
        const bounds=await ev(`(()=>{const card=document.querySelector('.source-card').getBoundingClientRect(),hint=document.querySelector('.source-hint').getBoundingClientRect(),body=document.querySelector('.source-body'),start=body.scrollTop;const buttons=[...document.querySelectorAll('.source-choices button')];const reachable=buttons.every(b=>{const initial=b.getBoundingClientRect(),host=body.getBoundingClientRect();body.scrollTop+=initial.top-host.top-(body.clientHeight-initial.height)/2;const r=b.getBoundingClientRect(),box=body.getBoundingClientRect(),cy=r.top+r.height/2;return r.height>=44&&cy>=box.top&&cy<=box.bottom&&cy<=innerHeight;});body.scrollTop=start;return {cardBottom:card.bottom,hintBottom:hint.bottom,reachable,height:innerHeight}})()`);
        if(bounds.cardBottom>H+1||bounds.hintBottom>H+1||!bounds.reachable)R.checks['决策卡边界及全部选项可达']=JSON.stringify(bounds);
        else if(!R.checks['决策卡边界及全部选项可达'])R.checks['决策卡边界及全部选项可达']='通过';
        if(st.choices>2){R.checks['多选卡支持滚动']=(await ev(`(()=>{const e=document.querySelector('.source-body');return getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>=e.clientHeight})()`))?'通过':'不可滚动';}
        if(st.input){await ev(`document.querySelector('.source-card textarea').value='我想多陪伴身边的人，也继续学习。'`);R.checks['输入卡保留文本框']='通过';}
        const index=decN%st.choices;
        await tap(`.source-choices button:nth-child(${index+1})`);
      }
      else if (st.solo) { await tap('.card.dec .choices .l'); }
      else {
        // 真实拖拽手势：横向滑 140px
        const p = await center('.card.dec .q');
        side = -side;
        await touch('touchStart', p.x, p.y);
        for (let k = 1; k <= 6; k++) { await touch('touchMove', p.x + side * k * 24, p.y + k); await delay(16); }
        if (decN === 1) await shot('07b-swiping');
        await touch('touchEnd', p.x + side * 144, p.y + 6);
      }
      decN++;
      await delay(st.source?100:380); continue;
    }
    if (!shotMid && st.age >= 30) { await shot('09-midlife'); shotMid = true; }
    if (st.age >= 4 && (await ev('window.__nl.speed')) < 8) await ev('window.__nl.speed=60');
    await delay(40); steps++;
  }
  await until(`window.__nl.mode==='end'`, 15000);
  await delay(1800);
  await shot('10-end'); await overflow('终章');
  const end = await ev(`({age:+document.querySelector('#end-age').textContent,cause:document.querySelector('#end-cause').textContent,rings:window.__nl.S.rings.length,log:window.__nl.S.log.length,decisions:window.__nl.S.log.filter(e=>e.side).length})`);
  R.life = Object.assign(end, { decisionsSwiped: decN, sapRounds: sapN, ms: Date.now() - t0 });
  // 在年轮上从圆心往外划
  const dp = await center('#end-disc-wrap');
  await touch('touchStart', dp.x, dp.y);
  for (let k = 1; k <= 8; k++) { await touch('touchMove', dp.x + k * dp.w * 0.05, dp.y - k * 2); await delay(30); }
  await shot('11-scrub');
  await touch('touchEnd', dp.x + dp.w * 0.4, dp.y);
  R.checks['划年轮显示当年'] = (await ev(`window.__nl.endDisc.hi>=0&&/岁/.test(document.querySelector('#yb-y').textContent)`)) ? '通过' : '没有选中年份';
  await tap('[data-act=play]'); await delay(1200);
  R.checks['放一遍'] = (await ev(`!!window.__nl.play`)) ? '通过' : '没有在播放';
  await tap('[data-act=play]');
  await tap('[data-act=comps]');
  await until(`document.querySelector('#s-comps.on')!==null`);
  await delay(1100);
  await shot('12-comps'); await overflow('同一阵风');
  R.checks['四个同伴'] = (await ev(`document.querySelectorAll('#comp-grid .comp').length===4&&document.querySelectorAll('#ages .row').length===5`)) ? '通过' : '数量不对';
  await tap('#comp-grid .comp'); await delay(500); await shot('13-comp-sheet'); await tap('#sh-comp [data-act=close]'); await delay(400);
  await ev(`document.querySelector('#s-comps').scrollTop=1e4`);
  await tap('#s-comps [data-act=poster]');
  await until(`document.querySelector('#s-poster.on')!==null`);
  await delay(600);
  await shot('14-poster'); await overflow('海报');
  R.checks['海报图片'] = (await ev(`(()=>{const i=document.querySelector('#poster-img img');return !!i&&i.naturalWidth===1080&&i.src.length>50000})()`)) ? '通过' : '海报没有生成';
  // 回到标题看林子
  await ev(`document.querySelector('[data-act=home]').click()`);
  await delay(300);
  await tap('#btn-forest'); await delay(600); await shot('15-forest');
  R.checks['林子有记录'] = (await ev(`document.querySelectorAll('#forest canvas').length>=1`)) ? '通过' : '没有记录';
  await tap('#sh-forest [data-act=close]');
  await delay(450);
  await tap('#s-title [data-act=about]'); await delay(600); await shot('16-about');
  R.checks['数据说明弹层'] = (await ev(`document.querySelector('#sh-about.on')!==null&&/世界银行/.test(document.querySelector('#about-body').innerText)&&/逐年时间序列/.test(document.querySelector('#about-body').innerText)`)) ? '通过' : '没有打开或没写逐年数据';
  await tap('#sh-about [data-act=close]'); await delay(450);
  // 年轮码入口已下线：确认首页页脚不再出现这一项，且整页无残留节点
  R.checks['年轮码入口已移除'] = (await ev(`document.querySelector('[data-act=seed]')===null&&document.querySelector('#sh-seed')===null`)) ? '通过' : '首页还有入口';
  }else R.scope='只验证受控视觉场景，不作为整局验收';
  R.visualCases=[];
  for(const fixture of visual.fixtures){
    await ev(`(()=>{const f=${JSON.stringify(fixture)},g=window.__nl,s=NL.newLife({seed:f.own.seed,country:f.own.born,year0:f.own.year0});
      Object.assign(s,f.own);s.sourceNative=f.native;s.sourceInbox=[];s.sourceMarks=[];s.sourceHistory=[];s.log=[];s.phase='life';s.death=null;
      s.sourceNative.phase='life';s.sourceNative.deathAt=null;s.sourceNative.age=s.age;s.sourceNative.cur=s.cur;s.sourceNative.queue=[];
      if(f.type==='event')s.sourceNative.pending=null;
      g.S=s;g.mode='life';g.pending=false;g.paused=false;g.sheet=null;g.read=0;g.speed=1;g.sceneCount=0;g.onKey=null;
      document.querySelectorAll('.scr').forEach(el=>{el.classList.toggle('on',el.id==='s-life');el.inert=false;});document.querySelectorAll('.sheet,.veil').forEach(el=>el.classList.remove('on'));
      document.querySelector('#s-life').classList.remove('is-choosing','tight','tighter');document.querySelector('#cards').replaceChildren();
      document.querySelector('#life-age').textContent=s.age;document.querySelector('#life-age').classList.remove('pop');document.querySelector('#life-year').textContent=(s.year0+s.age)+' 年';const where=document.querySelector('#life-where'),name=document.createElement('b');name.textContent=NL.cby[s.cur].zh;where.replaceChildren(name,document.createTextNode(s.urban?'城里':'乡下'));document.querySelector('#life-whisper').textContent='';document.querySelector('#life-whisper').classList.remove('has-note');
      document.querySelector('#app').scrollTop=0;document.querySelector('#app').scrollLeft=0;document.querySelector('#s-life').scrollTop=0;document.querySelector('#s-life').scrollLeft=0;
      document.querySelector('#btn-pause').textContent='暂停';document.querySelector('#btn-pause').setAttribute('aria-label','暂停');document.querySelector('#btn-speed').textContent='1×';
      const era=document.querySelector('#life-era');era.replaceChildren();for(const a of [Math.max(0,s.age-1),s.age]){const i=NL_TL.yearInfo(s.cur,NL.cby[s.cur].reg,s.year0+a,s.year0),el=document.createElement('div');el.className='era-item'+(a===s.age?' now':'');const h=document.createElement('span'),p=document.createElement('span');h.className='l1';p.className='l2';h.textContent=i.l1.split('（')[0];p.textContent=NL_VIEW.compact(i.l2,24);el.append(h,p);era.appendChild(el);}era.scrollTop=era.scrollHeight;
      g.disc.setSeed(s.seed);g.discRings=s.rings.concat({a:s.age,w:NL.ringW(s,s.age,NL.growthOf(s)),g:NL.growthOf(s),m:[]});g.disc.opt.ref=Math.min(90,Math.max(10,(s.age+1)*1.8));g.disc.setRings(g.discRings,false);g.disc.grow=1;g.disc.barkT=0;
      NL.source.decision(s);const snapshot=NL_NATIVE.snapshot();
      if(f.type==='decision')s.sourceInbox.push({type:'decision',pending:s.sourceNative.pending,snapshot});
      else s.sourceInbox.push({type:'log',entry:{a:s.age,text:f.data.text,kind:f.data.sourceKind,dk:f.data.sourceId,fact:f.data.fact,nlHistory:f.data.history},snapshot,historical:!!f.data.history});
      if(!window.__visualOriginalChoose){window.__visualOriginalChoose=NL.source.choose;NL.source.choose=(state,key,input)=>{window.__visualChosen={key,input};return window.__visualOriginalChoose(state,key,input);};}window.__visualChosen=null;
    })()`);
    await until(fixture.type==='decision'?`document.querySelector('.source-card')?.dataset.decision===${JSON.stringify(fixture.data.id)}`:`!!document.querySelector('.source-note')`);
    await ev(`Promise.all(document.querySelector('#cards .card').getAnimations().map(a=>a.finished)).then(()=>true)`);await delay(80);
    const layout=await ev(`(()=>{const el=document.querySelector('#cards .card'),r=el.getBoundingClientRect(),a=el.querySelector('.scene-art').getBoundingClientRect(),hint=el.querySelector('.source-footer,.scene-actions').getBoundingClientRect(),age=document.querySelector('#life-age').getBoundingClientRect(),where=document.querySelector('#life-where').getBoundingClientRect();return {bottom:r.bottom,artWidth:a.width,artHeight:a.height,chars:el.innerText.length,footer:hint.bottom,docWidth:document.documentElement.scrollWidth,zoom:visualViewport.scale,ageTop:age.top,ageRight:age.right,whereLeft:where.left,appScrollTop:document.querySelector('#app').scrollTop,appScrollLeft:document.querySelector('#app').scrollLeft}})()`);
    const caseResult={name:fixture.name,kind:'受控渲染条件',forcedExposure:!!fixture.forcedExposure,layout,checks:{}};
    caseResult.checks['插图可见']=layout.artWidth>=70&&layout.artHeight>=50;
    caseResult.checks['纸卡与操作不出屏']=layout.bottom<=H+1&&layout.footer<=H+1&&layout.docWidth<=W+1;
    caseResult.checks['主卡文字精简']=layout.chars<=230;
    caseResult.checks['输入后取景保持']=layout.zoom<=1.01&&layout.ageTop>=-1&&layout.ageRight<=W+1&&layout.whereLeft>=-1;
    await shot('visual-'+fixture.name);
    if(fixture.type==='decision'){
      const keys=await ev(`[...document.querySelectorAll('.source-choices button')].map(b=>b.dataset.choice)`);
      caseResult.checks['原选项key全部保留']=JSON.stringify(keys)===JSON.stringify(fixture.data.choices.map(c=>c.key));
      if(fixture.data.input){await tap('.source-card textarea');await s('Input.insertText',{text:'记得给家人留点时间。'});}
      await tap('.source-card .scene-more');await until(`!!document.querySelector('#sh-scene.on')`);
      await ev(`Promise.all(document.querySelector('#sh-scene').getAnimations().map(a=>a.finished)).then(()=>true)`);await delay(60);
      caseResult.checks['原始情境完整']=await ev(`document.querySelector('#scene-body').textContent.includes(${JSON.stringify(fixture.data.body)})`);
      caseResult.checks['原始选项说明完整']=await ev(`(()=>{const f=${JSON.stringify(fixture.data)},t=document.querySelector('#scene-body').textContent;return f.choices.every(c=>t.includes(c.label)&&(!c.sub||t.includes(c.sub)))})()`);
      if(['job','history-cash'].includes(fixture.name))await shot('visual-'+fixture.name+'-detail');
      const picked=fixture.data.choices.find(c=>!c.disabled),before=await ev(`window.__nl.S.sourceNative.done[${JSON.stringify(fixture.data.id)}]||0`);
      await tap('#sh-scene .scene-full-choices button:nth-child('+(fixture.data.choices.indexOf(picked)+1)+')');
      await until(`(window.__nl.S.sourceNative.done[${JSON.stringify(fixture.data.id)}]||0)>${before}`);
      caseResult.submitted=await ev('window.__visualChosen');caseResult.expectedKey=picked.key;
      caseResult.checks['实际提交同一key']=caseResult.submitted?.key===picked.key;
      if(fixture.data.input)caseResult.checks['输入进入原内核']=await ev(`JSON.stringify(window.__nl.S.sourceNative).includes('记得给家人留点时间。')`);
    }else{
      await tap('.source-note .scene-more');const frozen=await ev(`({age:window.__nl.S.sourceNative.age,t:window.__nl.S.sourceNative.t})`);await delay(2200);
      caseResult.checks['查看经过时暂停推进']=await ev(`window.__nl.S.sourceNative.age===${frozen.age}&&window.__nl.S.sourceNative.t===${frozen.t}`);
      caseResult.checks['事件全文保留']=await ev(`document.querySelector('#scene-body').textContent.includes(${JSON.stringify(fixture.data.text)})`);
      await tap('#sh-scene [data-act=close]');
    }
    await ev('window.__nl.paused=true');
    R.visualCases.push(caseResult);
    R.checks['视觉场景-'+fixture.name]=Object.values(caseResult.checks).every(Boolean)?'通过':JSON.stringify(caseResult.checks);
  }
  R.checks['没有外部网络请求'] = R.requests.every((u) => u.startsWith(new URL(PAGE).origin + '/')) ? '通过' : R.requests.filter((u) => !u.startsWith(new URL(PAGE).origin + '/')).join(' ');
  R.checks['没有脚本错误'] = R.errors.length ? R.errors.join(' | ') : '通过';
  await browser.send('Target.closeTarget', { targetId });
  return R;
}
let fail = 0;
for (const [W, H] of VIEWS) {
  try { const r = await runView(W, H); report.views.push(r); for (const [k, v] of Object.entries(r.checks)) { if (v !== '通过') fail++; } console.log(`${W}x${H}`, JSON.stringify(r.life||{visualCases:r.visualCases.length}), Object.entries(r.checks).filter(([, v]) => v !== '通过').map(([k, v]) => k + '：' + v).join('；') || '全部通过'); }
  catch (e) { fail++; report.views.push({ view: `${W}x${H}`, fatal: String(e.message || e), partial: e.R }); console.log(`${W}x${H} 失败：`, e.message, e.R ? JSON.stringify(e.R.errors).slice(0, 400) : ''); }
}
writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 1));
chrome.kill();
await delay(300);
rmSync(prof, { recursive: true, force: true });
console.log(fail ? `有 ${fail} 项未通过` : '全部通过');
process.exit(fail ? 1 : 0);
