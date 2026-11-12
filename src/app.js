/* 年轮 · 主程序：屏幕流转、手势交互、年度节奏、终章、海报、本地存档 */
(function () {
  'use strict';
  const NL = window.NL, TL = window.NL_TL, ART = window.NL_ART, Snd = window.Snd, View = window.NL_VIEW;
  NL.init(window.NL_DATA);
  const YEARS = TL.available ? TL.birthYears : [NL.BIRTH_YEAR];
  const DEFAULT_YEAR = TL.available ? TL.defaultBirthYear : NL.BIRTH_YEAR;
  const ageNow = (y) => NL.NOW_YEAR - y;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const AUTO = params.get('auto') === '1';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STAT = [
    { k: 'gen', zh: '根', nm: '身体', icon: 'root' },
    { k: 'zhi', zh: '枝', nm: '亲友', icon: 'branch' },
    { k: 'ye', zh: '叶', nm: '心情', icon: 'leaf' },
    { k: 'shi', zh: '实', nm: '本事', icon: 'fruit' },
  ];
  const CLASS_TXT = ['揭不开锅', '紧巴巴', '过得去', '宽裕', '富足'];
  const YEAR_MS = 1400;
  const QUIET = ['平常的一年。', '这一年，没什么特别的。', '日子照旧。', '又是一年。', '风平浪静的一年。'];
  const yearOf = (S, a) => S.year0 + (a == null ? S.age : a);
  function yearHTML(S, a) {
    const y = yearOf(S, a);
    return `${y} 年` + (y === NL.NOW_YEAR ? '<i class="now">今天</i>' : y > NL.NOW_YEAR ? '<i class="ahead">往后</i>' : '');
  }
  function pulseDisc() {
    if (reduce) return;
    const w = $('#life-disc-wrap');
    if (!w) return;
    w.classList.remove('pulse'); void w.offsetWidth; w.classList.add('pulse');
  }

  const G = { mode: 'title', last: 0, S: null, map: null, disc: null, endDisc: null, speed: 1, paused: false, pending: false, q: [], qi: 0, t: 0, read: 0, quietN: 0, comps: null, nextSeed: params.get('seed') ? NL.parseSeed(params.get('seed')) : null, hold: null, play: null, sheet: null, birthYear: DEFAULT_YEAR };
  window.__nl = G;

  // ---------- 本地存储：读写失败不影响游戏 ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('nianlun.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('nianlun.' + k, JSON.stringify(v)); } catch (e) { /* 忽略 */ } },
  };
  // 出生年份：全局默认，模拟引擎、标题页年轮、同一阵风都跟着它走
  const savedYear = +store.get('birthYear', DEFAULT_YEAR);
  const urlYear = +params.get('y');
  G.birthYear = YEARS.includes(urlYear) ? urlYear : YEARS.includes(savedYear) ? savedYear : DEFAULT_YEAR;
  NL.setBirthYear(G.birthYear);

  function renderCohort() {
    if (!TL.available) return;
    $('#cohort-chips').innerHTML = YEARS.map((y) => `<button type="button" data-year="${y}" class="${y === G.birthYear ? 'on' : ''}" aria-pressed="${y === G.birthYear}">${y}</button>`).join('');
    $('#cohort-age').textContent = `今天 ${ageNow(G.birthYear)} 岁 · 落在哪一年，就走哪一年的世界线`;
    $('#tagline-sub').textContent = `给现在 ${ageNow(G.birthYear)} 岁的你：从 ${G.birthYear} 年重来一遍。`;
  }
  function setBirthYear(y) {
    if (!YEARS.includes(+y)) return;
    G.birthYear = +y;
    store.set('birthYear', G.birthYear);
    NL.setBirthYear(G.birthYear);
    renderCohort();
    fillAbout();
    Snd.tok(520);
  }

  // ---------- 通用 ----------
  // 一屏放不下就上「紧凑档」：媒体查询只看视口高度，而真机上刘海和小白条会吃掉
  // 60–100px，同一个 844 高的屏，可用高度可能只有 760。所以按实测溢出加 .tight。
  function fit(el) {
    if (!el) return false;
    el.classList.remove('tight', 'tighter');
    if (el.scrollHeight <= el.clientHeight + 1) return false;
    el.classList.add('tight');
    if (el.scrollHeight <= el.clientHeight + 1) return true;
    el.classList.add('tighter');
    return true;
  }
  function fitActive() { fit(document.querySelector('.scr.on')); }
  function show(id) {
    $$('.scr').forEach((el) => el.classList.toggle('on', el.id === 's-' + id));
    document.documentElement.style.background = id === 'end' ? '#211C17' : '';
    document.querySelector('meta[name=theme-color]').setAttribute('content', id === 'end' ? '#211C17' : '#F1E8D4');
    fit(document.getElementById('s-' + id));
  }
  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('on'), ms || 1800);
  }
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 忽略 */ } };
  function openSheet(id) {
    closeSheet();
    $('#veil').classList.add('on');
    $(id).classList.add('on');
    G.sheet = id;
    $$('.scr').forEach(el=>{el.inert=true;});
  }
  function closeSheet() {
    if (!G.sheet) return;
    $(G.sheet).classList.remove('on');
    $('#veil').classList.remove('on');
    G.sheet = null;
    $$('.scr').forEach(el=>{el.inert=false;});
    if(G.sceneFocus?.isConnected)G.sceneFocus.focus({preventScroll:true});G.sceneFocus=null;
  }
  function setSoundIcon() {
    const on = Snd.on;
    const svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3.5L12 18V6L7.5 10z" fill="currentColor"/>' + (on ? '<path d="M15.5 9a4 4 0 010 6M18 6.5a8 8 0 010 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>') + '</svg>';
    $$('.snd').forEach((b) => { b.innerHTML = svg; b.setAttribute('aria-label', on ? '关闭声音' : '打开声音'); });
  }
  // 静态 aria-label 会盖住按钮文字，名称必须跟当前操作和倍速一起改。
  function setPauseName() {
    const name = G.paused ? '继续' : '暂停';
    const btn = $('#btn-pause');
    btn.textContent = name;
    btn.setAttribute('aria-label', name);
  }
  function setSpeedName() {
    const shown = G.speed + '×';
    const btn = $('#btn-speed');
    btn.textContent = shown;
    btn.setAttribute('aria-label', '速度 ' + shown);
  }

  // ---------- 四项状态 ----------
  function buildStats(host) {
    host.innerHTML = STAT.map((s) => `<div class="stat" data-k="${s.k}"><span class="ic">${ART.icon[s.icon]}</span><span class="lb">${s.zh}<i>${s.nm}</i></span><div class="track"><div class="fill"></div></div><span class="pop"></span></div>`).join('');
  }
  function renderStats(host, st, d) {
    for (const s of STAT) {
      const el = host.querySelector(`[data-k=${s.k}]`);
      el.querySelector('.fill').style.width = Math.round(st[s.k]) + '%';
      if (d && d[s.k]) {
        const p = el.querySelector('.pop');
        p.textContent = (d[s.k] > 0 ? '+' : '') + d[s.k];
        p.style.color = d[s.k] > 0 ? 'var(--tai)' : 'var(--zhu)';
        p.classList.remove('go'); void p.offsetWidth; p.classList.add('go');
      }
    }
  }

  // ---------- 标题 ----------
  // 首页纵向预算按屏幕高度算：字数一多或屏幕一矮，年轮盘会把「出生年份」挤到按钮上。
  // 这里量一遍实际内容高度，把多出来的部分从年轮盘上扣掉，保证永远有一道空隙。
  function fitTitle() {
    const wrap = $('#s-title .title-wrap');
    const disc = wrap && wrap.querySelector('.title-disc');
    if (!wrap || !disc) return;
    disc.style.width = ''; // 先放回 CSS 给的上限（min(72vw, 320px, 38vh)）
    const cap = disc.getBoundingClientRect().width;
    let w = cap;
    for (let i = 0; i < 3; i++) { // 缩一次测一次，收敛到刚好不溢出
      const first = wrap.firstElementChild, last = wrap.lastElementChild;
      const used = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
      const over = used - wrap.clientHeight;
      if (over <= 0) break;
      w = Math.max(120, w - over - 4);
      disc.style.width = Math.round(w) + 'px';
    }
    if (G.titleDisc) { G.titleDisc.resize(); G.titleDisc.render(); }
  }
  function initTitle() {
    renderCohort();
    $('#logo').innerHTML = ART.logo;
    const f = store.get('forest', []);
    $('#btn-forest').textContent = f.length ? `我的林子 · ${f.length}` : '我的林子';
    let life = null;
    for (let i = 0; i < 60; i++) {
      const S = NL.runLife({ seed: 'TITLE' + i });
      if (S.death.age >= 74 && S.rings.reduce((n, r) => n + r.m.length, 0) >= 8) { life = S; break; }
    }
    if (life) {
      const cv = $('#title-disc');
      const d = new window.RingDisc(cv, { ref: 20, pad: 6 });
      d.setSeed(life.seed); d.setRings(life.rings, true); d.barkT = 1; d.render();
      G.titleDisc = d;
      if (!reduce) cv.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 240000, iterations: Infinity });
    }
    // 先量再显示：屏幕用 opacity 隐藏、不是 display:none，布局已经算得出来，
    // 这样不会先闪一下大圆盘再缩回去。
    fitTitle();
    show('title');
  }

  // ---------- 落地 ----------
  function resetDrop() {
    G.mode = 'drop';
    $('#land-label').classList.remove('on');
    const st = $('#stamp-land');
    st.classList.remove('hit');
    st.style.opacity = 0;
    const h = $('#hold');
    h.disabled = false; h.classList.remove('down');
    $('#hold-ring').style.strokeDashoffset = 352;
    $('#drop-hint').textContent = G.nextSeed ? `按住起风，松手落回同一户人家。` : `按住按钮起风，松手落回 ${G.birthYear} 年。`;
    show('drop');
    if (!G.map) {
      G.map = new window.WorldMap($('#map'), NL, ART);
      $('#stamp-land').innerHTML = ART.stampLand;
    } else {
      G.map.resize();
      G.map.pin = null; G.map.seed = null; G.map.tween = null;
      G.map.cam.x = G.map.M.w * 0.62; G.map.cam.y = G.map.M.h * 0.45; G.map.cam.z = 1.55;
    }
    G.map.fitZoom();
    G.map.hover();
    G.map.setYear(G.birthYear);G.dropSince=performance.now();
    $('#drop-year').textContent=G.birthYear;
    const bps = G.map.bps;
    $('#bps').textContent = bps.toFixed(1).replace(/\.0$/, '');
    G.hold = null;
  }
  function tickerValue() {
    return Math.round(Math.max(0,performance.now()-(G.dropSince||performance.now()))/1000*(G.map?.bps||0));
  }
  function holdStart(e) {
    if (G.mode !== 'drop' || G.hold || $('#hold').disabled) return;
    e.preventDefault();
    Snd.unlock();
    try { $('#hold').setPointerCapture(e.pointerId); } catch (x) { /* 模拟事件没有捕获对象 */ }
    G.hold = { t: 0 };
    $('#hold').classList.add('down');
    $('#drop-hint').textContent = '风起来了……';
  }
  function holdEnd() {
    if (!G.hold) return;
    const held = G.hold.t;
    G.hold = null;
    $('#hold').classList.remove('down');
    G.map.wind = 0;
    Snd.wind(0);
    if (held < 280) {
      $('#drop-hint').textContent = '再按久一点，风才起得来。';
      $('#hold-ring').style.strokeDashoffset = 352;
      return;
    }
    launch();
  }
  function launch() {
    if (G.mode !== 'drop') return;
    G.mode = 'flying';
    $('#hold').disabled = true;
    $('#hold-ring').style.strokeDashoffset = 0;
    const S = NL.newLife({ seed: G.nextSeed || undefined });
    G.nextSeed = null;
    G.S = S; G.comps = null;
    const c = NL.cby[S.born];
    $('#drop-hint').textContent = '飘啊飘……';
    Snd.swipe();
    G.map.land(c, reduce ? 200 : 1600, () => landed(c, S));
  }
  function landed(c, S) {
    const m = G.map;
    Snd.stamp(); buzz(30);
    m.flash(c, true);
    const [sx, sy] = m.toScreen(m.nearX(c.x), c.y);
    const st = $('#stamp-land');
    st.style.left = Math.round(sx - 37) + 'px';
    st.style.top = Math.round(sy - 37) + 'px';
    st.classList.remove('hit'); void st.offsetWidth; st.classList.add('hit');
    $('#land-nm').textContent = c.zh;
    const h = TL.available ? TL.at(c.id, c.reg, S.year0) : null;
    const sexLE = S.sex === 'F' ? c.lf : c.lm;
    const le = Math.round(TL.available?TL.birthFacts(S).le:sexLE);
    $('#land-sub').textContent = `${S.year0} 年，这里的新生儿平均活到 ${le} 岁`;
    $('#land-label').classList.add('on');
    $('#drop-hint').textContent = '';
    setTimeout(() => { if (G.S === S && G.mode === 'flying') enterBirth(S); }, AUTO ? 100 : 1900);
  }
  function fmtPct(x) { return x >= 10 ? Math.round(x) + '%' : x >= 1 ? x.toFixed(1) + '%' : x.toFixed(2) + '%'; }
  function enterBirth(S) {
    G.mode = 'birth';
    const c = NL.cby[S.born], f = TL.available ? TL.birthFacts(S) : NL.birthFacts(S);
    $('#birth-land').innerHTML = ART.land[c.reg.toLowerCase()] || ART.land.eas;
    $('#birth-city').innerHTML = S.urban ? ART.land.city : '';
    $('#birth-country').textContent = c.zh;
    $('#birth-year').textContent = `${S.year0} 年，你落在了`;
    const sib = S.sibOlder + S.sibPlan;
    $('#birth-tags').innerHTML = [S.sex === 'F' ? '女孩' : '男孩', S.urban ? '城里' : '乡下', '家境 · ' + CLASS_TXT[S.q - 1], sib ? `兄弟姐妹 ${sib} 个` : '独生']
      .map((t, i) => `<span class="tag ${i === 2 ? 'zhu' : ''}">${t}</span>`).join('');
    $('#birth-facts').innerHTML = [
      [f.oneIn?`1/${f.oneIn}`:'—', f.oneIn?`每 ${f.oneIn} 个新生儿里，有 1 个落在这里`:'暂无同年出生占比资料'],
      [`${Math.round(f.le)}<small>岁</small>`, `这里的${S.sex === 'F' ? '女性' : '男性'}平均能活到这个岁数`],
      [`${f.u5 >= 10 ? Math.round(f.u5) : f.u5}<small>‰</small>`, `每一千个孩子里，活不到五岁的${f.hist?._quality.u5!=='observed'?'（估计）':''}`],
      [f.worldPct!=null?`${f.worldPct}<small>%</small>`:'—', f.worldPct!=null?'按当年资料粗估的全球家境位置':'暂无同年收入比较资料'],
    ].map(([k, v]) => `<li><span class="k">${k}</span><span>${v}</span></li>`).join('');
    const bn = $('#birth-note');
    if (bn) bn.textContent = TL.available ? `统计按 ${S.year0} 年读取；缺测与估计另作标识，人物家境与往后经历属于模拟。` : '';
    buildStats($('#birth-stats'));
    renderStats($('#birth-stats'), S.st);
    show('birth');
    $('#s-birth').scrollTop = 0;
    if (AUTO) setTimeout(enterLife, 50);
  }

  // ---------- 一生 ----------
  // ---------- 一生：那一年的世界线 ----------
  // 每年往流里追加一条，旧年份留在上面可以往回滚，不再整块替换。
  // 默认牢牢贴住最新一条；玩家自己往上翻时不抢（翻回底部即恢复跟随）。
  let eraHold = false;
  function eraFollow(host) {
    if (eraHold) return;
    host.scrollTop = host.scrollHeight;
  }
  function bindEra() {
    const host = $('#life-era');
    if (!host || host.dataset.bound) return;
    host.dataset.bound = '1';
    host.addEventListener('scroll', () => {
      eraHold = host.scrollHeight - host.clientHeight - host.scrollTop > 24;
    }, { passive: true });
  }
  function pushEra(S) {
    const host = $('#life-era');
    if (!host) return;
    const c = NL.cby[S.cur] || NL.cby[S.born];
    const info = TL.available ? TL.yearInfo(c.id, c.reg, yearOf(S), S.year0) : null;
    const prev = host.querySelector('.era-item.now');
    if (prev) prev.classList.remove('now', 'flash');

    const item = document.createElement('div');
    item.className = 'era-item now';
    item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-label',`${yearOf(S)} 年的世界线详情`);
    item.addEventListener('click',()=>sceneDetail(item.querySelector('.l1').textContent,info?info.l1+'\n'+info.l2:'按已知资料推演。'));
    item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();item.click();}});
    const l1 = document.createElement('span'), l2 = document.createElement('span'), tag = document.createElement('i');
    l1.className = 'l1'; l2.className = 'l2';
    item.appendChild(l1); item.appendChild(l2);

    if (!info) {
      l1.textContent = `${yearOf(S)} · ${c.zh}`;
      tag.textContent = '那年'; l2.appendChild(tag);
      l2.appendChild(document.createTextNode('按今天的统计水平推演。'));
    } else if (info.beyond) {
      // 越过史料覆盖的最后一年后，不再逐年堆「没有史料」，只让这一条的年份区间往前走
      const old = host.querySelector('.era-item.beyond');
      if (old) {
        old.dataset.y1 = info.y;
        old.querySelector('.l1').innerHTML = `<b>${old.dataset.y0} — ${info.y}</b> · ${info.zh}`;
        old.classList.add('now');
        eraFollow(host);
        return;
      }
      item.classList.add('beyond');
      item.dataset.y0 = info.y;
      l1.innerHTML = `<b>${info.y}</b> · ${info.zh}`;
      tag.textContent = '往后'; l2.appendChild(tag);
      l2.appendChild(document.createTextNode('已知条件之后，是模拟的日子。'));
    } else {
      l1.innerHTML = `<b>${info.y}</b> · ${info.zh} · `;
      l1.appendChild(document.createTextNode(info.h?.le!=null?`预期寿命 ${info.h.le.toFixed(1)} 岁`:'逐年资料'));
      tag.textContent = '那年'; l2.appendChild(tag);
      l2.appendChild(document.createTextNode(View.compact(info.l2.replace(/^那年：/, ''),24)));
    }
    host.appendChild(item);
    if (!reduce && info && info.era && info.era.length) {
      item.classList.remove('flash'); void item.offsetWidth; item.classList.add('flash');
    }
    bindEra();
    eraFollow(host);
  }
  function whereText(S) {
    const c = NL.cby[S.cur];
    let t = `<b>${c.zh}</b>${S.urban ? '城里' : '乡下'}`;
    if (S.cur !== S.born) t += ` · 生于${NL.cby[S.born].zh}`;
    return t;
  }
  function estimateRing(S) {
    const g = NL.growthOf(S);
    return { a: S.age, w: NL.ringW(S, S.age, g), g, m: [] };
  }
  function placeholder(text) {
    const el = document.createElement('div');
    el.className = 'card quiet in';
    el.textContent = text;
    const host = $('#cards');
    host.innerHTML = '';
    host.appendChild(el);
  }
  function enterLife() {
    const S = G.S;
    G.mode = 'life';
    $('#s-life').classList.remove('is-choosing');$('#life-whisper').textContent='';$('#life-whisper').classList.remove('has-note');
    G.speed = AUTO ? 40 : 1; G.paused = false; G.pending = false; G.read = 0; G.quietN = 0; G.nowDone = false;
    setSpeedName();
    setPauseName(); $('#btn-pause').classList.remove('on');
    buildStats($('#life-stats'));
    show('life');
    if (!G.disc) G.disc = new window.RingDisc($('#life-disc'), { ref: 90, curve: 0.62, pad: 4 });
    G.disc.resize();
    G.disc.setSeed(S.seed);
    G.discRings = [];
    G.disc.setRings(G.discRings, false);
    G.disc.barkT = 0; G.disc.hi = -1;
    placeholder('第一圈年轮，正在长。');
    $('#life-era').innerHTML = '';
    eraHold = false;
    renderStats($('#life-stats'), S.st);
    beginYear();
  }
  function beginYear() {
    const S = G.S;
    $('#life-where').innerHTML = whereText(S);
    $('#life-age').textContent = S.age;
    $('#life-year').innerHTML = yearHTML(S);
    pushEra(S);
    const ageEl = $('#life-age');
    ageEl.classList.remove('pop'); void ageEl.offsetWidth; ageEl.classList.add('pop');
    if (NL.sapDue(S)) { showSap(); return; }
    startYear();
  }
  // 今天这一年的岔路。放在界面层，不进模拟引擎，
  // 免得一张卡改动事件分布、随机序列和已经校准好的死亡水平。
  function showNowCard(S) {
    const q = `${S.year0 + S.age} 年，你 ${S.age} 岁。前面 ${S.age} 圈已经长定，往后这一遍，你想怎么走？`;
    const commit = (side) => {
      if (G.nowDone) return;
      G.nowDone = true;
      G.pending = false;
      const d = side === 'L' ? { zhi: 6, ye: 2 } : { ye: 9, zhi: -3 };
      const text = side === 'L' ? '你把日子往回收了收。没什么豪言，先把觉睡够。' : '你没想清楚要换成什么样，只是决定不再照着原来的样子往下长。';
      if(S.sourceNative)NL.source.adjust(S,d);
      else for (const k in d) S.st[k] = Math.max(0, Math.min(100, S.st[k] + d[k]));
      S.log.push({ a: S.age, y: S.year0 + S.age, id: 'now_today', icon: 'road', text, d, m: [], q, pick: side === 'L' ? '稳着往下长' : '换一种活法', side });
      renderStats($('#life-stats'), S.st, d);
      Snd.chime();
      startYear();
    };
    if (AUTO) { commit('L'); return; }
    G.pending = true;
    const el = document.createElement('div');
    el.className = 'card dec in now';
    el.innerHTML = `<div class="meta"><span>${S.age} 岁</span><span>${yearHTML(S)}</span></div>
      <div class="pic">${ART.vig.road || ''}</div>
      <p class="q"></p>
      <div class="choices"><button class="l" type="button">稳着往下长</button><button class="r" type="button">换一种活法</button></div>
      <div class="swipe-tag l">稳着往下长</div><div class="swipe-tag r">换一种活法</div>`;
    el.querySelector('.q').textContent = q;
    const host = $('#cards');
    host.innerHTML = '';
    host.appendChild(el);
    Snd.tok(660);
    pulseDisc();
    el.querySelector('.choices .l').addEventListener('click', () => commit('L'));
    el.querySelector('.choices .r').addEventListener('click', () => commit('R'));
    // 和其他决策卡一样，也能左右滑
    let sx = 0, active = false, dx = 0;
    const tagL = el.querySelector('.swipe-tag.l'), tagR = el.querySelector('.swipe-tag.r');
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      active = true; sx = e.clientX; dx = 0;
      el.style.transition = 'none';
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* 忽略 */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!active) return;
      dx = e.clientX - sx;
      el.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
      const k = Math.min(1, Math.abs(dx) / 70);
      tagL.style.opacity = dx < 0 ? k : 0;
      tagR.style.opacity = dx > 0 ? k : 0;
    });
    const up = () => {
      if (!active) return;
      active = false;
      if (Math.abs(dx) > 70) { commit(dx > 0 ? 'R' : 'L'); return; }
      el.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      tagL.style.opacity = 0; tagR.style.opacity = 0;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
  function startYear() {
    const S = G.S;
    if (S.age === NL.ageNow(S) && !G.nowDone) { showNowCard(S); return; }
    G.q = S.sourceNative ? [] : NL.planYear(S);
    G.qi = 0; G.t = 0;
    G.yearHadEvent = false;
    G.sceneCount = 0;
    if(S.sourceNative)NL.source.focus(S);
    G.discRings.push(estimateRing(S));
    G.disc.opt.ref = Math.min(90, Math.max(10, (S.age + 1) * 1.8));
    G.disc.pushRing();
    G.disc.grow = 0;
    if (!reduce) G.disc.flash('ring');
  }
  function readTime(text) { return 1000 + text.length * 55; }
  function eventCard(entry) {
    if(entry.sourceId){sourceEventCard(entry);return;}
    const S = G.S;
    const el = document.createElement('div');
    el.className = 'card in' + (entry.sourceId ? ' source-note' : '');
    const d = entry.d || {};
    const chips = STAT.filter((s) => d[s.k]).map((s) => `<span class="delta ${d[s.k] > 0 ? 'up' : 'dn'}">${s.zh} ${d[s.k] > 0 ? '+' : ''}${d[s.k]}</span>`).join('');
    el.innerHTML = `<div class="meta"><span>${entry.a} 岁</span><span>${yearHTML(S, entry.a)}</span></div>
      <div class="ev"><div class="pic">${ART.vig[entry.icon] || ''}</div><p></p></div>
      <div class="deltas">${chips}</div>`;
    el.querySelector('p').textContent = entry.text;
    if(entry.history){const badge=document.createElement('span');badge.className='history-badge';badge.textContent=entry.history.followUp?'后续影响':entry.history.projected?'模拟情景':'年代经历';el.querySelector('.meta').appendChild(badge);}
    if(entry.fact){const details=document.createElement('details');details.className='event-fact';const summary=document.createElement('summary');summary.textContent='事件资料';const p=document.createElement('p');p.textContent=entry.fact;details.append(summary,p);el.querySelector('.ev').appendChild(details);}
    const host = $('#cards');
    host.innerHTML = '';
    host.appendChild(el);
    renderStats($('#life-stats'), S.st, d);
    const ms = entry.m || [];
    // 事件一发生就把记号落到正在长的这一圈上，不用等年末
    const fresh = entry.marks || [];
    if (fresh.length) {
      const r = G.discRings[G.discRings.length - 1];
      if (r) {
        r.m = r.m.concat(fresh);
        G.disc.cache = null;
        if (!reduce) G.disc.flash(ms.includes('scar') ? 'scar' : ms.includes('frost') ? 'frost' : 'bloom');
      }
    }
    pulseDisc();
    if (ms.includes('scar')) { Snd.thud(); buzz(40); } else if (ms.includes('frost')) Snd.frost(); else if (ms.includes('bloom')) Snd.chime(); else Snd.tok(440);
    G.read = readTime(entry.text);
    G.yearHadEvent = true; G.quietN = 0;
  }
  function sceneArt(art){
    const el=document.createElement('div');el.className='scene-art';el.setAttribute('aria-hidden','true');el.innerHTML=ART.vig[art]||ART.vig.road;return el;
  }
  function sceneText(text,className=''){
    const el=document.createElement('p');el.className=className;el.textContent=text;return el;
  }
  function sceneDetail(title,body,fact,choices,commit){
    const returnFocus=document.activeElement;
    $('#scene-title').textContent=title||'事情经过';
    const host=$('#scene-body');host.replaceChildren();
    if(body)host.appendChild(sceneText(body,'scene-original'));
    if(choices){
      const list=document.createElement('div');list.className='scene-full-choices';
      for(const choice of choices){
        const button=document.createElement('button');button.type='button';button.disabled=choice.disabled;
        button.appendChild(sceneText(choice.label));if(choice.sub)button.appendChild(sceneText(choice.sub,'scene-option-note'));
        button.addEventListener('click',()=>{closeSheet();commit(choice.key);});list.appendChild(button);
      }
      host.appendChild(list);
    }
    if(fact){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='资料与背景';details.append(summary,sceneText(fact));host.appendChild(details);}
    openSheet('#sh-scene');
    G.sceneFocus=returnFocus;$('#sh-scene h3 button').focus({preventScroll:true});
  }
  function paintSourceEffects(entry){
    const S=G.S;renderStats($('#life-stats'),S.st,entry.d||{});
    const ring=G.discRings.at(-1);
    if(ring&&entry.marks?.length){ring.m=ring.m.concat(entry.marks);G.disc.cache=null;}
  }
  function sourceWhisper(entry){
    paintSourceEffects(entry);
    const el=$('#life-whisper');el.textContent=View.compact(entry.text,36);el.classList.add('has-note');
    G.read=entry.sourceKind==='dec'?220:420;
  }
  function sourceEventCard(entry){
    const S=G.S,vm=View.event(entry),el=document.createElement('div');el.className='card source-note in';
    paintSourceEffects(entry);
    const meta=document.createElement('div');meta.className='meta';meta.textContent=entry.history?(entry.history.followUp?'后来，这件事仍在影响你':entry.history.projected?'往后的一个可能':'那一年，走进了你的日子'):`${entry.a} 岁`;
    const hero=document.createElement('div');hero.className='scene-hero event-hero';hero.appendChild(sceneArt(vm.art));
    const words=document.createElement('div');words.className='scene-words';words.append(sceneText(vm.title,'scene-title'),sceneText(vm.summary,'scene-summary'));hero.appendChild(words);
    const changes=document.createElement('div');changes.className='deltas scene-deltas';
    for(const stat of STAT.filter(s=>entry.d?.[s.k]).slice(0,3)){const chip=document.createElement('span');chip.className='delta '+(entry.d[stat.k]>0?'up':'dn');chip.innerHTML=ART.icon[stat.icon];chip.appendChild(document.createTextNode(' '+stat.zh+' '+(entry.d[stat.k]>0?'+':'')+entry.d[stat.k]));changes.appendChild(chip);}
    const actions=document.createElement('div');actions.className='scene-actions';
    const more=document.createElement('button');more.type='button';more.className='scene-more';more.textContent='事情经过';more.addEventListener('click',()=>sceneDetail(vm.title,entry.text,entry.fact));
    const next=document.createElement('button');next.type='button';next.className='scene-next';next.textContent='接着长';next.addEventListener('click',()=>{if(G.S===S&&!G.pending)G.read=0;});
    actions.append(more,next);el.append(meta,hero,changes,actions);$('#cards').replaceChildren(el);
    const ms=entry.m||[];
    if(!reduce&&ms.length)G.disc.flash(ms.includes('scar')?'scar':ms.includes('frost')?'frost':'bloom');
    if(ms.includes('scar'))Snd.thud();else if(ms.includes('frost'))Snd.frost();else if(ms.includes('bloom'))Snd.chime();
    G.read=Math.max(1800,Math.min(4200,vm.summary.length*72));G.yearHadEvent=true;G.quietN=0;G.sceneCount=(G.sceneCount||0)+1;
  }
  function quietCard() {
    const S = G.S;
    const el = document.createElement('div');
    el.className = 'card quiet in';
    el.textContent = `${S.age} 岁。${QUIET[(S.age * 7 + S.seed.charCodeAt(0)) % QUIET.length]}`;
    const host = $('#cards');
    host.innerHTML = '';
    host.appendChild(el);
  }
  function fire(item) {
    const S = G.S;
    if (item.dec) {
      const d = NL.askDecision(S, item);
      if (AUTO) { const e = NL.choose(S, item, NL.autoSide(S, item), d.q); eventCard(e); G.read = 0; return; }
      showDecision(d, item);
    } else {
      eventCard(NL.applyEvent(S, item));
    }
  }

  // ---------- 决策卡：左右滑或点按钮 ----------
  function showDecision(d, item) {
    G.pending = true;
    const S = G.S;
    const el = document.createElement('div');
    el.className = 'card dec in';
    el.innerHTML = `<div class="meta"><span>${S.age} 岁 · ${yearOf(S)} 年</span><span>${d.solo ? '你还说不上话' : '左右滑动，或点选项'}</span></div>
      <div class="pic">${ART.vig[d.icon] || ''}</div>
      <p class="q"></p>
      <div class="choices ${d.solo ? 'solo' : ''}"><button class="l" type="button"></button>${d.solo ? '' : '<button class="r" type="button"></button>'}</div>
      <div class="swipe-tag l"></div>${d.solo ? '' : '<div class="swipe-tag r"></div>'}`;
    el.querySelector('.q').textContent = d.q;
    el.querySelector('.choices .l').textContent = d.L;
    el.querySelector('.swipe-tag.l').textContent = d.L;
    if (!d.solo) { el.querySelector('.choices .r').textContent = d.R; el.querySelector('.swipe-tag.r').textContent = d.R; }
    const host = $('#cards');
    host.innerHTML = '';
    host.appendChild(el);
    Snd.tok(660);
    let done = false;
    const commit = (side) => {
      if (done) return;
      done = true;
      G.onKey = null;
      Snd.swipe(); buzz(15);
      el.style.transition = 'transform .28s ease-in, opacity .28s ease-in';
      const x = side === 'R' ? 480 : -480;
      el.style.transform = `translateX(${x}px) rotate(${side === 'R' ? 18 : -18}deg)`;
      el.style.opacity = 0;
      setTimeout(() => {
        const entry = NL.choose(S, item, side, d.q);
        G.pending = false;
        eventCard(entry);
      }, reduce ? 0 : 240);
    };
    el.querySelector('.choices .l').addEventListener('click', () => commit('L'));
    if (!d.solo) el.querySelector('.choices .r').addEventListener('click', () => commit('R'));
    G.onKey = (key) => { if (key === 'ArrowLeft' || d.solo) commit('L'); else if (key === 'ArrowRight') commit('R'); };
    if (d.solo) return; // 单选项卡片不用滑动
    // 手势
    let sx = 0, active = false, dx = 0, sT = 0;
    const tagL = el.querySelector('.swipe-tag.l'), tagR = el.querySelector('.swipe-tag.r');
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || done) return;
      active = true; sx = e.clientX; dx = 0; sT = performance.now();
      el.style.transition = 'none';
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* 忽略 */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!active) return;
      dx = e.clientX - sx;
      el.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
      const k = Math.min(1, Math.abs(dx) / 70);
      tagL.style.opacity = dx < 0 ? k : 0;
      tagR.style.opacity = dx > 0 ? k : 0;
    });
    const up = () => {
      if (!active) return;
      active = false;
      const v = Math.abs(dx) / Math.max(1, performance.now() - sT);
      if (Math.abs(dx) > 70 || (Math.abs(dx) > 26 && v > 0.55)) { commit(dx > 0 ? 'R' : 'L'); return; }
      el.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      tagL.style.opacity = 0; tagR.style.opacity = 0;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  // ---------- 养分卡 ----------
  function showSap() {
    const S = G.S;
    if (AUTO) { NL.autoSap(S); startYear(); return; }
    G.pending = true;
    const labels = NL.SAP_LABELS[S.age];
    const order = []; // 先进先出：三滴用完后再点，最早的那滴挪过来
    const host = $('#cards');
    const el = document.createElement('div');
    el.className = 'card sap in';
    el.innerHTML = `<h3>${S.age} 岁，接下来几年，心思放在哪？</h3>
      <p class="sub">你有 3 滴养分，点一下放一滴。</p>
      <div class="sap-grid">${STAT.map((s) => `<button type="button" data-k="${s.k}"><span class="n"></span><span class="ic">${ART.icon[s.icon]}</span><b>${s.zh}</b><small>${labels[s.k]}</small></button>`).join('')}</div>
      <button class="btn sap-go" type="button" disabled style="opacity:.45">还剩 3 滴</button>`;
    host.innerHTML = '';
    host.appendChild(el);
    Snd.tok(520);
    const go = el.querySelector('.sap-go');
    const refresh = () => {
      for (const s of STAT) {
        const n = order.filter((k) => k === s.k).length;
        const b = el.querySelector(`[data-k=${s.k}]`);
        b.querySelector('.n').textContent = n ? '×' + n : '';
        b.classList.toggle('has', n > 0);
      }
      const left = 3 - order.length;
      go.disabled = left > 0;
      go.style.opacity = left > 0 ? 0.45 : 1;
      go.textContent = left > 0 ? `还剩 ${left} 滴` : '就这样';
    };
    el.querySelectorAll('.sap-grid button').forEach((b) => b.addEventListener('click', () => {
      if (order.length >= 3) order.shift();
      order.push(b.dataset.k);
      Snd.tok(700); buzz(10);
      refresh();
    }));
    go.addEventListener('click', () => {
      if (order.length < 3) return;
      const sap = { gen: 0, zhi: 0, ye: 0, shi: 0 };
      order.forEach((k) => sap[k]++);
      NL.setSap(S, sap);
      G.pending = false;
      Snd.tok(440);
      const top = STAT.filter((s) => sap[s.k]).sort((a, b) => sap[b.k] - sap[a.k]).map((s) => s.zh).join('、');
      placeholder(`养分给了${top}。接着长。`);
      startYear();
    });
    refresh();
  }

  // ---------- 年度节奏 ----------
  function lifeTick(dt) {
    if (G.paused || G.pending || G.sheet) { G.disc.render(); return; }
    if (G.read > 0) G.read -= dt * G.speed;
    if(G.S.sourceNative){sourceLifeTick(dt);return;}
    const n = G.q.length;
    if (G.qi < n && G.t >= (G.qi + 1) / (n + 1)) {
      if (G.read <= 0) fire(G.q[G.qi++]);
      G.disc.render();
      return;
    }
    if (G.t >= 1) {
      if (G.read > 0) { G.disc.render(); return; }
      finishYear();
      return;
    }
    G.t = Math.min(1, G.t + (dt * G.speed) / YEAR_MS);
    G.disc.grow = G.t;
    G.disc.render();
  }
  function sourceLifeTick(dt){
    const S=G.S;
    if(G.read>0){G.disc.render();return;}
    const item=NL.source.next(S);
    if(item){
      if(item.type==='log'){if(View.foreground(item.entry,G.sceneCount||0))eventCard(item.entry);else sourceWhisper(item.entry);if(AUTO)G.read=0;}
      else if(item.type==='decision'){
        if(AUTO)NL.source.choose(S,NL.source.auto(S));else showSourceDecision();
      }else if(item.type==='year'){
        G.discRings[G.discRings.length-1]=item.ring;G.disc.pushRing();G.disc.grow=1;
        renderStats($('#life-stats'),S.st);Snd.ring(item.ring.g,item.ring.m.some(m=>m.t==='scar'));beginYear();
      }else if(item.type==='death'){
        if(item.ring){G.discRings[G.discRings.length-1]=item.ring;G.disc.pushRing();}
        G.disc.grow=1;startDeath();
      }
    }else if(S.sourceNative.pending){if(AUTO)NL.source.choose(S,NL.source.auto(S));else showSourceDecision();}
    else{NL.source.step(S,(dt*G.speed)/YEAR_MS);G.t=S.sourceNative.t;G.disc.grow=G.t;}
    G.disc.render();
  }
  function showSourceDecision(){
    const S=G.S,d=NL.source.decision(S);if(!d)return;
    const vm=View.decision(d);
    G.pending=true;
    $('#s-life').classList.add('is-choosing');
    const el=document.createElement('div');el.className='card dec in source-card';el.dataset.decision=d.id;
    const meta=document.createElement('div');meta.className='meta';meta.textContent=d.history?'这一年的选择':'这一步，由你';
    const hero=document.createElement('div');hero.className='scene-hero decision-hero';hero.appendChild(sceneArt(vm.art));
    const words=document.createElement('div');words.className='scene-words';words.append(sceneText(vm.title,'q'),sceneText(vm.prompt,'scene-prompt'));hero.appendChild(words);
    const body=document.createElement('div');body.className='source-body';body.tabIndex=0;body.setAttribute('aria-label','选择详情，可上下滚动');
    let input;
    if(d.input){input=document.createElement('textarea');input.maxLength=600;input.rows=2;input.placeholder=d.id==='reflect'?'写下一件想留住的小事，也可以留在心里。':d.placeholder;input.setAttribute('aria-label',d.title||'写下你的想法');body.appendChild(input);}
    const choices=document.createElement('div');choices.className='choices source-choices'+(d.choices.length===3?' is-list':'');
    let done=false;
    const commit=key=>{if(done)return;done=true;G.onKey=null;G.pending=false;$('#s-life').classList.remove('is-choosing');NL.source.choose(S,key,input?.value||'');Snd.swipe();buzz(15);placeholder('日子，继续往下长。');G.read=0;};
    vm.choices.forEach(choice=>{const button=document.createElement('button');button.type='button';button.dataset.choice=choice.key;button.disabled=choice.disabled;button.setAttribute('aria-label',choice.originalLabel+(choice.originalHint?'，'+choice.originalHint:''));
      const label=document.createElement('span');label.textContent=choice.label;button.appendChild(label);
      if(choice.hint){const sub=document.createElement('small');sub.textContent=choice.hint;button.appendChild(sub);}
      button.addEventListener('click',()=>commit(choice.key));choices.appendChild(button);
    });
    body.appendChild(choices);
    const footer=document.createElement('div');footer.className='source-footer';
    const more=document.createElement('button');more.type='button';more.className='scene-more';more.textContent='完整情境与选项';more.addEventListener('click',()=>sceneDetail(d.title,d.body,d.fact,d.choices,commit));
    const hint=document.createElement('small');hint.className='source-hint';hint.textContent=d.choices.length===2?'也可左右滑动':d.choices.length+' 个方向';
    footer.append(more,hint);el.append(meta,hero,body,footer);$('#cards').replaceChildren(el);Snd.tok(660);
    requestAnimationFrame(()=>{if(el.isConnected&&body.scrollHeight>body.clientHeight+2)hint.textContent=d.choices.length+' 个方向 · 上下滑动';});
    G.onKey=key=>{if(document.activeElement===input)return;const i=/^[1-9]$/.test(key)?+key-1:key==='ArrowLeft'?0:key==='ArrowRight'&&d.choices.length===2?1:-1;if(d.choices[i]&&!d.choices[i].disabled)commit(d.choices[i].key);};
    if(d.choices.length===2){let start=null;el.addEventListener('pointerdown',e=>{if(!e.target.closest('button,textarea,details'))start={x:e.clientX,y:e.clientY};});
      el.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>70&&Math.abs(dy)<Math.abs(dx)*.5)commit(d.choices[dx>0?1:0].key);});el.addEventListener('pointercancel',()=>{start=null;});}
  }
  function finishYear() {
    const S = G.S;
    const r = NL.endYear(S);
    const list = G.discRings;
    list[list.length - 1] = { a: r.ring.a, w: r.ring.w, g: r.ring.g, m: r.ring.m };
    G.disc.pushRing();
    G.disc.grow = 1;
    G.disc.render();
    renderStats($('#life-stats'), S.st);
    Snd.ring(r.ring.g, r.ring.m.some((m) => m.t === 'scar'));
    if (r.died) { startDeath(); return; }
    if (!G.yearHadEvent && ++G.quietN >= 2) { quietCard(); G.quietN = 0; }
    beginYear();
  }

  // ---------- 死亡 → 终章 ----------
  function startDeath() {
    const S = G.S;
    G.mode = 'dying';
    G.disc.dead = true;
    G.disc.cache = null;
    Snd.gong(); buzz(60);
    const el = document.createElement('div');
    el.className = 'card quiet in';
    el.textContent = S.death.line || '这一圈，是最后一圈。';
    const host = $('#cards');
    host.innerHTML = '';
    host.appendChild(el);
    saveLife(S);
    G.dieT = 0;
    G.dieDur = AUTO ? 60 : 2200;
  }
  function dyingTick(dt) {
    G.dieT += dt;
    G.disc.barkT = Math.min(1, G.dieT / 900);
    G.disc.render();
    if (G.dieT >= G.dieDur) enterEnd();
  }
  function saveLife(S) {
    const f = store.get('forest', []);
    f.unshift({ seed: S.seed, born: S.born, zh: NL.cby[S.born].zh, sex: S.sex, u: S.urban0 ? 1 : 0, y0: S.year0, a: S.death.age, c: S.death.label, r: S.rings.map((r) => [r.w, r.g, r.m.map((m) => [m.t, m.ang])]) });
    store.set('forest', f.slice(0, 36));
    store.set('lands', Array.from(new Set(store.get('lands', []).concat(S.born))));
  }
  function ringsFromSaved(rec) { return rec.r.map(([w, g, m]) => ({ w, g, m: m.map(([t, ang]) => ({ t, ang })) })); }
  function enterEnd() {
    G.mode = 'end';
    const S = G.S, c = NL.cby[S.born], A = S.death.age;
    show('end');
    $('#s-end').scrollTop = 0;
    $('#end-k').textContent = `${c.zh}　${S.sex === 'F' ? '女' : '男'}　${S.urban0 ? '城里' : '乡下'}　${S.year0} — ${S.death.year}`;
    $('#end-cause').textContent = `死于${S.death.label}`;
    $('#end-line').textContent = S.death.line || '';
    if (reduce || AUTO) $('#end-age').textContent = A;
    else {
      const t0 = performance.now();
      const dur = Math.min(1600, 300 + A * 16);
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); $('#end-age').textContent = Math.round(A * k * (2 - k)); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    const le = S.sex === 'F' ? c.lf : c.lm;
    const gap = A - le;
    const beyond = NL.worldBeyond(A);
    const gapT = Math.abs(gap) < 1 ? `和这里今天的${S.sex === 'F' ? '女性' : '男性'}平均寿命差不多` : `比这里今天的${S.sex === 'F' ? '女性' : '男性'}平均寿命${gap > 0 ? '多' : '少'}了 <b>${Math.abs(gap).toFixed(0)}</b> 年`;
    $('#end-compare').innerHTML = `你${gapT}。<br>按今天的死亡水平，全世界的新生儿，约 <b>${Math.round((1 - beyond) * 100)}%</b> 活不过这个岁数。`;
    const d = G.endDisc || (G.endDisc = new window.RingDisc($('#end-disc'), { ref: 20, pad: 4, theme: 'ink' }));
    d.resize();
    d.setSeed(S.seed); d.setRings(S.rings, true); d.barkT = 1; d.hi = -1; d.render();
    stopPlay();
    yearBox(-1);
    // 文案落定后再量一次：紧凑档会改年轮盘直径，必须在 d.resize() 之前定下来
    fit($('#s-end'));
    d.resize(); d.render();
    if (AUTO) window.__endReady = true;
  }
  function yearBox(i) {
    const S = G.S;
    if (i < 0) { $('#yb-y').textContent = '年轮的读法'; $('#yb-t').innerHTML = '<p>圈宽＝那一年的长势。朱色楔口是伤，靛色细点是失去，苔色叶片是好事，赭色圈是搬了家。</p>'; return; }
    const ring = S.rings[i], logs = S.log.filter((e) => e.a === ring.a);
    const y = yearOf(S, ring.a);
    $('#yb-y').textContent = `${ring.a} 岁 · ${y} 年` + (y === NL.NOW_YEAR ? ' · 今天' : y > NL.NOW_YEAR ? ' · 往后' : '');
    const box = $('#yb-t');
    box.innerHTML = '';
    if (TL.available) {
      const info = TL.yearInfoForLife(S, ring.a);
      const p = document.createElement('p');
      p.className = 'world';
      p.textContent = info.beyond ? '往后是推演，没有史料。' : (info.era.length ? `那年：${info.era[0].t}` : info.l2);
      box.appendChild(p);
    }
    if (!logs.length) { const p = document.createElement('p'); p.textContent = QUIET[(ring.a * 7 + S.seed.charCodeAt(0)) % QUIET.length]; box.appendChild(p); }
    logs.slice(-3).forEach((e) => { const p = document.createElement('p'); p.textContent = e.text; box.appendChild(p); });
  }
  function scrub(e) {
    const d = G.endDisc, wrap = $('#end-disc-wrap');
    const r = wrap.getBoundingClientRect();
    const i = d.indexAt(((e.clientX - r.left) / r.width) * d.W, ((e.clientY - r.top) / r.height) * d.H);
    if (i >= 0 && i !== d.hi) { d.hi = i; d.render(); yearBox(i); const ring = G.S.rings[i]; Snd.ring(ring.g, ring.m.some((m) => m.t === 'scar')); }
  }
  function stopPlay() { if (G.play) { clearTimeout(G.play); G.play = null; const b = $('[data-act=play]'); if (b) b.textContent = '▶　放一遍这一生'; } }
  function playLife() {
    if (G.play) { stopPlay(); return; }
    const d = G.endDisc, rings = G.S.rings;
    let i = 0;
    $('[data-act=play]').textContent = '■　停下来';
    const step = () => {
      if (i >= rings.length) { stopPlay(); return; }
      d.hi = i; d.render(); yearBox(i);
      const r = rings[i];
      Snd.ring(r.g, r.m.some((m) => m.t === 'scar'));
      i++;
      const logs = G.S.log.filter((e) => e.a === r.a).length;
      G.play = setTimeout(step, Math.min(1200, 150 + logs * 480));
    };
    step();
  }

  // ---------- 同一阵风 ----------
  const third = (s) => String(s || '').replace(/你们/g, 'TA 们').replace(/你/g, 'TA');
  function enterComps() {
    const S = G.S;
    stopPlay();
    G.mode = 'comps';
    if (!G.comps) G.comps = NL.companions(S.seed, 4);
    show('comps');
    $('#s-comps').scrollTop = 0;
    const list = [{ me: true, zh: NL.cby[S.born].zh, age: S.death.age }].concat(G.comps);
    const max = Math.max(...list.map((x) => x.age), 80);
    $('#ages').innerHTML = list.map((x, i) => `<div class="row ${x.me ? 'me' : ''}"><span class="n">${x.me ? '你' : x.zh}</span><span class="b" style="width:${Math.max(2, (x.age / max) * 100)}%;animation-delay:${i * 90}ms"></span><span class="v">${x.age}</span></div>`).join('');
    const grid = $('#comp-grid');
    grid.innerHTML = '';
    G.comps.forEach((x, i) => {
      const b = document.createElement('button');
      b.className = 'comp'; b.type = 'button';
      b.innerHTML = `<canvas></canvas><div class="tx"><div class="n">${x.zh}</div><div class="m">${x.sex === 'F' ? '女' : '男'} · ${x.urban ? '城里' : '乡下'} · 活到 ${x.age} 岁</div><div class="t"></div></div>`;
      b.querySelector('.t').textContent = third(x.hi[x.hi.length - 1] ? x.hi[x.hi.length - 1].text : x.line);
      b.addEventListener('click', () => openComp(i));
      grid.appendChild(b);
    });
    // 先排好版（可能要切紧凑档），量到真实宽度再画年轮
    fit($('#s-comps'));
    grid.querySelectorAll('.comp').forEach((b, i) => {
      const x = G.comps[i];
      const cv = b.querySelector('canvas');
      const size = cv.getBoundingClientRect().width || 140;
      window.paintDisc(cv, x.rings, x.seed, { size, pad: 2, ref: 12 });
    });
  }
  function openComp(i) {
    const x = G.comps[i];
    $('#comp-title').textContent = `${x.zh} · 活到 ${x.age} 岁`;
    const body = $('#comp-body');
    body.innerHTML = `<p>${x.sex === 'F' ? '女孩' : '男孩'}，${x.urban ? '城里' : '乡下'}，家境${CLASS_TXT[x.q - 1]}。这里的平均寿命是 ${Math.round(x.le)} 岁。</p><ul class="log-list"></ul><p style="margin-top:10px">死于${x.cause}。${third(x.line)}</p>`;
    const ul = body.querySelector('ul');
    x.hi.forEach((h) => { const li = document.createElement('li'); li.innerHTML = '<span class="a"></span><span class="t"></span>'; li.querySelector('.a').textContent = h.a + ' 岁'; li.querySelector('.t').textContent = third(h.text); ul.appendChild(li); });
    openSheet('#sh-comp');
  }

  // ---------- 年谱、林子、说明 ----------
  function openLog() {
    const S = G.S;
    if (!S) return;
    const ul = $('#log-list');
    ul.innerHTML = '';
    $('#log-legend').textContent = TL.available ? '赭色小字＝那一年的世界线；标注「年代经历」的条目已进入你的经历与结算。具体遭遇和后果属于游戏模拟。' : '';
    const byAge = {};
    S.log.forEach((e) => { (byAge[e.a] = byAge[e.a] || []).push(e); });
    const ages = [...new Set([...Object.keys(byAge).map(Number),S.age])].sort((a,b)=>b-a);
    ages.forEach((a) => {
      if (TL.available) {
        const info = TL.yearInfoForLife(S, a);
        if (info.era.length) {
          const el = document.createElement('li');
          el.className = 'era';
          el.innerHTML = '<span class="a"></span><span class="t"></span>';
          el.querySelector('.a').textContent = String(info.y);
          el.querySelector('.t').textContent = info.era[0].t;
          ul.appendChild(el);
        }
      }
      (byAge[a]||[]).forEach((e) => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="a"></span><span class="t"></span>';
        li.querySelector('.a').textContent = `${e.a} 岁 · ${e.y} 年`;
        const t = li.querySelector('.t');
        t.textContent = e.text;
        if(e.history){li.classList.add('history-entry');const em=document.createElement('em');em.textContent=(e.history.followUp?'后续影响，源于':e.history.projected?'模拟情景':'年代经历')+' · '+e.history.year+' 年'+(e.history.headline!==e.text?' · '+e.history.headline:'');t.appendChild(em);}
        if (e.pick) { const em = document.createElement('em'); em.textContent = `${e.q} → 你选了「${e.pick}」`; t.appendChild(em); }
        if(e.result){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='此时的生活';const p=document.createElement('p');p.textContent=`健康 ${Math.round(e.result.health)} · 学业阶段 ${e.result.edu} · 年收入约 ${Math.round(e.result.income).toLocaleString()} · 净资产约 ${Math.round(e.result.netWorth).toLocaleString()}（购买力国际元；模拟值）`;details.append(summary,p);t.appendChild(details);}
        ul.appendChild(li);
      });
    });
    if (!ul.children.length) ul.innerHTML = '<li class="empty">这一生才刚开始。</li>';
    openSheet('#sh-log');
  }
  function openForest() {
    const f = store.get('forest', []);
    const ul = $('#forest');
    ul.innerHTML = '';
    openSheet('#sh-forest');
    if (!f.length) { ul.style.display = 'block'; ul.innerHTML = '<li class="empty">林子还是空的。先去落一粒种子吧。</li>'; return; }
    ul.style.display = '';
    f.forEach((r) => {
      const li = document.createElement('li');
      li.innerHTML = `<canvas></canvas><b></b><span>${r.a} 岁 · ${r.c}</span><small></small>`;
      li.querySelector('b').textContent = r.zh;
      li.querySelector('small').textContent = r.y0 ? `${r.y0} 年出生` : '';
      ul.appendChild(li);
      const cv = li.querySelector('canvas');
      const size = cv.getBoundingClientRect().width || 90;
      window.paintDisc(cv, ringsFromSaved(r), r.seed, { size, pad: 2, ref: 12 });
    });
  }
  function fillAbout() {
    const y = NL.info.years;
    const tl = TL.available;
    $('#about-body').innerHTML = `
      <p>一个把统计资料过成一辈子的小游戏。「你」的一生是模拟的，生活背景来自统计资料和制度配置。</p>
      <h4>数据</h4>
      <ul>
        <li>世界银行世界发展指标（WDI，CC BY 4.0）有<b>两套口径</b>：各国最新可得年份的横截面（寿命与死亡率 ${y.le}、人均 GDP ${y.ppp}、人口 ${y.pop}），以及 ${tl ? `${TL.y0}–${TL.y1} 年` : '多年'}的逐年时间序列（预期寿命、婴儿与五岁以下死亡率、人均 GDP、城镇化、通电率、上网率、人口、粗出生率）。</li>
        <li>逐年数据为 ${NL.countries.length} 个地点建立 ${TL.fields.length} 项指标框架，各项有自己的非空年份。新增中学／高教毛入学率、ILO就业与产业结构、医疗自付、基本饮水、不变价收入序列。人口保留到人；有限跨度插值、最多3年前值延用分别标识。仅儿童死亡缺项保留同年寿命近邻估计；其他生活指标长缺口保持缺失，禁止将未来观测倒填到更早年代。</li>
        <li>横截面的缺失字段按留一比较选择寿命近邻或收入组估计；结果与缺项保存在数据文件中。逐年数据另有逐字段的观测、插值、前值延用与缺失标识，缺资料不代表当地没有这种生活。</li>
        <li>战事强度来自世界银行转载的 UCDP 战斗死亡数。地图是 Natural Earth 的 1:1.1 亿陆地轮廓（公有领域）。全部数据已存在本地，运行时不联网。</li>
        <li>事件、决策和国家制度采用 2026-11-09 采集的《80 亿分之 1》公开前端快照：完整同步模拟内核包含 278 条常规事件、188 类决策，以及家庭、职业、疾病等逐年处理，适用于 ${NL.profiles.info.covered} 个地点。原库没有配置的 ${NL.profiles.info.missing.length} 个地点保留年轮原有事件模型。原库文案及概率是游戏资料，未对全部条目逐项官方核验。</li>
        <li>完整事件内核另用 WDI 1960–2025 年的男性寿命、女性寿命与总和生育率。有限国内插值、最多3年前值延用、同区同年估计或明确的模型基线分开记录；1950–1959 年只供内部亲代背景，以1960年为锚估计。未来沿用末次环境输入，属于情景假设。</li>
        <li>学业、职业候选和医疗费用模型读取可用的当年教育、就业与卫生资料。毛入学率可超过100%，不等于你的录取概率；失业率不等于某次投递失败率；医疗自付占全国卫生支出结构，不等于你的账单比例。ILO序列本身为模型统计，与本项目插补分开。电力与基本饮水通过时间、开支、学习与家庭联系影响生活，不再叠加死亡风险。</li>
      </ul>
      <h4>时间线怎么走</h4>
      <ul>
        <li>标题页可以选出生年份（${YEARS.join(' / ')}，默认 ${DEFAULT_YEAR}）。落在哪个国家、出生在哪一年，决定了之后每一年读到的世界线。</li>
        <li>出生占比按当年有资料地点的「人口 × 粗出生率」重算；按当年资料粗估家境位置，早年缺收入资料时留空。性别寿命读取当年相应序列，儿童死亡的估计值另作标识。</li>
        <li>每年显示当年所在地的统计与史实。历史危机、战争、灾害和疫情可进入人物经历，影响工作、财产、健康和亲属；升学、支付与新技术等变化还可带来应对选择。按年龄、职业、城乡和个人条件筛选，并非同国同年人人受同一种冲击。年谱会保留「年代经历」、你的选择和当时的结果。</li>
        <li>搬家之后，年代注脚跟着<b>当年居住地</b>走。${NL.NOW_YEAR} 年之后的年份是推演，没有史料。</li>
      </ul>
      <h4>方法</h4>
      <ul>
        <li>落在哪：按选定出生年有资料地点的人口与粗出生率加权抽取。缺少该年人口／出生率的地点没有可用抽样权重，不拿未来值冒充。按住的时长不影响结果。</li>
        <li>历史收入：用同国不变价人均GDP与当前年的比值缩放游戏收入，锚定当前PPP口径；缺值时是中性的模型假设，不是早年现价PPP或某人的真实工资。城市住房优先读取BIS已公布的实质住宅价格：买房成本参考上年末，年度资产变化读取本年末；到个人成本与资产的映射是游戏模型。农村或缺少资料时保留原配置，房价指数不当作房租。</li>
        <li>活多久：有完整事件配置的地点，疾病、意外与年末死亡统一由完整内核结算，历史寿命与婴幼儿死亡率会随年代调整；不再叠加旧模型的年末死亡抽签。其余地点保留按当前 WDI 校准的年轮生命表。</li>
        <li><b>口径边界</b>：官方统计提供人口与健康等背景，不提供任何真实个人的人生剧本。具体遭遇、录取、工作、投资和死亡都由简化游戏模型产生；缺少历史观测的参数仍为游戏配置。四项状态是完整人物状态的显示投影，收入、资产、学业和家庭另有持续记录。</li>
        <li>事件会按当年居住地、年份和人物状态筛选。部分地点另有升学、就业与住房路径，选择会改变学业、职业、家底或居住安排；各地的专属内容覆盖程度仍有差异。</li>
        <li>制度名称与历史背景参考公开资料；标准课程年限读取配置，录取、职业机会、个体故事与状态数值仍是简化的游戏设定。${NL.NOW_YEAR} 年之后按已知条件延续推演，不把旧房价或危机延伸为未来实测，也不代表制度预测。</li>
      </ul>
      <h4>说明</h4>
      <p>这一局从 ${G.birthYear} 年出生开始，${NL.NOW_YEAR} 年你 ${ageNow(G.birthYear)} 岁。之后的事件属于模拟情景，不是未来史实或预测。</p>
      <p>这是简化模型，不预测任何真实个人的命运。国家和地区名称沿用数据来源的分类，只作统计标识。所有人生记录只存在你的这台设备上。</p>`;
  }

  // ---------- 海报 ----------
  function makePoster() {
    const S = G.S, c = NL.cby[S.born], W = 1080, H = 1440;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const serif = '"Songti SC","STSong","Noto Serif SC","Noto Serif CJK SC",serif';
    x.fillStyle = '#F1E8D4'; x.fillRect(0, 0, W, H);
    const R = NL.makeRng('poster' + S.seed);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(33,28,23,${R() * 0.05})`; x.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
    x.strokeStyle = '#211C17'; x.lineWidth = 6; x.strokeRect(46, 46, W - 92, H - 92);
    x.lineWidth = 2; x.strokeRect(60, 60, W - 120, H - 120);
    window.drawSVG(x, ART.logo, 90, 88, 300, 150);
    x.fillStyle = '#211C17'; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
    x.font = `800 124px ${serif}`;
    x.fillText(String(S.death.age), W - 150, 205);
    x.font = `700 44px ${serif}`;
    x.fillText('岁', W - 96, 205);
    x.font = `400 26px ${serif}`;
    x.fillText(`${S.year0} — ${S.death.year}`, W - 96, 250);
    const dc = document.createElement('canvas');
    window.paintDisc(dc, S.rings, S.seed, { size: 800, dpr: 1, pad: 6, ref: 14 });
    x.drawImage(dc, (W - 800) / 2, 260);
    x.textAlign = 'center';
    x.font = `800 74px ${serif}`;
    x.fillText(c.zh, W / 2, 1160);
    x.font = `400 36px ${serif}`;
    x.fillStyle = '#4A4038';
    x.fillText(`${S.sex === 'F' ? '女' : '男'}　${S.urban0 ? '城里' : '乡下'}　死于${S.death.label}`, W / 2, 1224);
    x.font = `400 34px ${serif}`;
    x.fillStyle = '#211C17';
    let line = S.death.line || '';
    if (line.length > 25) line = line.slice(0, 24) + '…';
    x.fillText(line, W / 2, 1288);
    window.drawSVG(x, ART.stampEnd, W - 208, H - 208, 118, 118);
    return cv.toDataURL('image/png');
  }
  function enterPoster() {
    stopPlay();
    G.mode = 'poster';
    const url = makePoster();
    G.posterURL = url;
    $('#poster-img').innerHTML = '';
    const img = new Image();
    img.src = url; img.alt = '年轮卡';
    $('#poster-img').appendChild(img);
    show('poster');
  }
  function savePoster() {
    const a = document.createElement('a');
    a.href = G.posterURL;
    a.download = `年轮-${NL.cby[G.S.born].zh}-${G.S.death.age}岁.png`;
    document.body.appendChild(a); a.click(); a.remove();
    toast('已保存。手机上没反应的话，长按图片保存。', 2600);
  }

  // ---------- 主循环 ----------
  function frame(now) {
    const dt = Math.min(64, now - (G.last || now));
    G.last = now;
    if (G.mode === 'drop' || G.mode === 'flying') {
      if (G.hold) {
        G.hold.t += dt;
        const w = Math.min(1, G.hold.t / 1500);
        G.map.wind = w;
        Snd.wind(w);
        $('#hold-ring').style.strokeDashoffset = 352 * (1 - Math.min(1, G.hold.t / 2600));
        if (G.hold.t >= 2600) holdEnd();
      }
      G.map.tick(dt);
      $('#ticker').textContent = tickerValue().toLocaleString('zh-CN');
    } else if (G.mode === 'life') lifeTick(dt);
    else if (G.mode === 'dying') dyingTick(dt);
    requestAnimationFrame(frame);
  }

  // ---------- 事件绑定 ----------
  const ACT = {
    start() { Snd.unlock(); resetDrop(); if (AUTO) setTimeout(launch, 30); },
    home() { G.mode = 'title'; G.nextSeed = null; initTitle(); },
    sound() { Snd.set(!Snd.on); store.set('sound', Snd.on); setSoundIcon(); },
    sprout() { Snd.unlock(); enterLife(); },
    pause() {
      G.paused = !G.paused;
      setPauseName();
      $('#btn-pause').classList.toggle('on', G.paused);
    },
    speed() {
      G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 4 : 1;
      setSpeedName();
    },
    log: openLog,
    close: closeSheet,
    forest: openForest,
    about: () => openSheet('#sh-about'),
    play: playLife,
    comps: enterComps,
    poster: enterPoster,
    save: savePoster,
    'back-end'() { G.mode = 'end'; show('end'); },
    again() { stopPlay(); G.nextSeed = null; resetDrop(); },
    replay() { stopPlay(); G.nextSeed = G.S.seed; resetDrop(); },
  };
  document.addEventListener('click', (e) => {
    const yr = e.target.closest('[data-year]');
    if (yr) { setBirthYear(+yr.dataset.year); return; }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const fn = ACT[t.dataset.act];
    if (fn) fn();
  });
  document.addEventListener('contextmenu', (e) => { if (!e.target.closest('img')) e.preventDefault(); });
  document.addEventListener('keydown', (e) => {
    if(e.isComposing||e.target.closest('input,textarea,[contenteditable="true"]'))return;
    if (e.key === 'Escape') closeSheet();
    if(G.sheet)return;
    if (G.onKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || /^[1-9]$/.test(e.key))) G.onKey(e.key);
  });
  const hold = $('#hold');
  hold.addEventListener('pointerdown', holdStart);
  hold.addEventListener('pointerup', holdEnd);
  hold.addEventListener('pointercancel', holdEnd);
  hold.addEventListener('lostpointercapture', holdEnd);
  const ew = $('#end-disc-wrap');
  let scrubbing = false;
  ew.addEventListener('pointerdown', (e) => { scrubbing = true; stopPlay(); try { ew.setPointerCapture(e.pointerId); } catch (x) { /* 忽略 */ } scrub(e); });
  ew.addEventListener('pointermove', (e) => { if (scrubbing) scrub(e); });
  ew.addEventListener('pointerup', () => { scrubbing = false; });
  ew.addEventListener('pointercancel', () => { scrubbing = false; });
  let rzT;
  window.addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(() => {
      if (G.map && (G.mode === 'drop' || G.mode === 'flying')) G.map.resize();
      if (G.mode === 'title') fitTitle();
      if (G.disc && (G.mode === 'life' || G.mode === 'dying')) { G.disc.resize(); G.disc.render(); }
      if (G.endDisc && G.mode === 'end') { G.endDisc.resize(); G.endDisc.render(); }
      fitActive();
    }, 120);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Snd.wind(0); stopPlay(); } });
  new ResizeObserver(()=>{if(G.disc){G.disc.resize();G.disc.render();}}).observe($('#life-disc-wrap'));

  // ---------- 启动 ----------
  Snd.set(store.get('sound', true));
  setSoundIcon();
  fillAbout();
  initTitle();
  requestAnimationFrame(frame);
  if (AUTO) setTimeout(() => ACT.start(), 60);
})();
