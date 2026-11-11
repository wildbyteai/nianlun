/* 年轮 · 人生模拟引擎（原创实现）
 *
 * 1. 出生国按各国「年出生数 = 人口 × 粗出生率」加权抽取（世界银行 WDI）。
 * 2. 生命表：0 岁用婴儿死亡率，1–4 岁用五岁以下死亡率反推，5–14 岁取平台值，
 *    15 岁起用 Gompertz–Makeham 曲线，再用二分法把系数校准到该国分性别预期寿命。
 * 3. 每年：排事件 → 逐条结算（决策等玩家选） → 状态回归 → 长一圈年轮 → 按生命表与风险乘子判定生死。
 * Node 与浏览器通用：挂在 globalThis.NL 上。
 */
(function (root) {
  'use strict';

  // ===== 0. 时间锚点 =====
  // 这一局是「给现在 36 岁的人，重来一遍」：1990 年出生，2026 年是今天，之后才是往后。
  // 统计指标是最新可得年份的横截面，不是 1990 年的历史复原；口径写在「数据与方法」里。
  const NOW_YEAR = 2026;
  const AGE_NOW = 36;
  const BIRTH_YEAR = NOW_YEAR - AGE_NOW;
  // 玩家可以在标题页改出生年份；不传 year0 的一生（同一阵风、标题页年轮）都跟着它走。
  let DEFAULT_BIRTH_YEAR = BIRTH_YEAR;
  const setBirthYear = (y) => { if (Number.isFinite(+y)) DEFAULT_BIRTH_YEAR = +y; return DEFAULT_BIRTH_YEAR; };
  const ageNow = (S) => NOW_YEAR - (S && S.year0 != null ? S.year0 : DEFAULT_BIRTH_YEAR);
  // 文案输出前按落地国家的文化圈处理措辞；未加载 culture.js 时原样返回。
  // 带 cult 字段的是圈层专属文案，按当地写成，不做替换（只走城市词）。
  const loc = (text, S, c, ev) => (root.NL_CUL ? root.NL_CUL.localize(text, S, c, ev) : text);

  // ===== 1. 随机数：xmur3 哈希 + sfc32，可由种子复现 =====
  let rndF = Math.random;
  const rnd = () => rndF();
  function makeRng(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    const next = () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
    let a = next(), b = next(), c = next(), d = next();
    return () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  const withRng = (f, fn) => { const keep = rndF; rndF = f; try { return fn(); } finally { rndF = keep; } };

  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  function wpick(w) {
    let total = 0;
    for (const k in w) total += Math.max(0, w[k] || 0);
    if (total <= 0) return Object.keys(w)[0];
    let t = rnd() * total;
    for (const k in w) { t -= Math.max(0, w[k] || 0); if (t <= 0) return k; }
    const keys = Object.keys(w);
    return keys[keys.length - 1];
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function normal(mu, sd) {
    const u = 1 - rnd(), v = rnd();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function poisson(lambda) { // Knuth
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rnd(); } while (p > L && k < 30);
    return k - 1;
  }
  // 标准正态 CDF（erf 的 Abramowitz–Stegun 7.1.26 近似）与其反函数（Acklam 有理逼近）
  function normCdf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }
  function invNorm(p) {
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // ===== 2. 种子码：8 位，去掉易混的 0/1/I/O =====
  const ALPH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function newSeed() {
    const buf = new Uint32Array(8);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(buf);
    else for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 4294967296);
    let s = '';
    for (const x of buf) s += ALPH[x % 32];
    return s;
  }
  const fmtSeed = (s) => s.slice(0, 4) + '-' + s.slice(4);
  function parseSeed(str) {
    const s = String(str || '').toUpperCase().replace(/[\s-]/g, '');
    if (s.length !== 8) return null;
    for (const ch of s) if (!ALPH.includes(ch)) return null;
    return s;
  }

  // ===== 3. 数据 =====
  let C = [], CBY = {}, SUMB = 0, INFO = null, MAP = null, LT = {};
  const DEST_BONUS = {
    SAS: { SAU: 3, ARE: 3, QAT: 3, KWT: 3, OMN: 3, MYS: 2, GBR: 1.5, USA: 1.2, CAN: 1.5 },
    MEA: { SAU: 2.5, ARE: 2.5, QAT: 2, DEU: 2, FRA: 2, TUR: 2, SWE: 1.5, ITA: 1.5 },
    SSF: { ZAF: 3, FRA: 2, GBR: 1.5, ITA: 1.5, SAU: 1.5, USA: 1.2, CIV: 2 },
    LCN: { USA: 4, ESP: 3, CHL: 2, ARG: 1.5, CAN: 1.5 },
    EAS: { USA: 2, JPN: 2.5, KOR: 2.5, SGP: 2, AUS: 2, MYS: 2, CAN: 1.5, NZL: 1.5 },
    ECS: { DEU: 2.5, POL: 2, RUS: 2.5, ITA: 1.5, ESP: 1.5, GBR: 1.5, KAZ: 1.5 },
    NAC: { USA: 1, CAN: 1, GBR: 1.5, AUS: 1.5 },
  };
  function init(D) {
    const F = D.fields;
    C = D.rows.map((r) => { const o = {}; F.forEach((f, i) => { o[f] = r[i]; }); return o; });
    CBY = {};
    for (const c of C) CBY[c.id] = c;
    SUMB = C.reduce((a, c) => a + c.b, 0);
    for (const c of C) {
      c.share = c.b / SUMB;
      c.sigma = sigmaOf(c);
      c.mu = Math.log(Math.max(400, c.ppp)) - c.sigma * c.sigma / 2;
      c.mood = moodBase(c);
    }
    const cal = root.NL_CAL || (root.window && root.window.NL_CAL) || {};
    for (const c of C) c.calB = cal[c.id] || null;
    INFO = { years: D.years, built: D.built, note: D.note, sumBirths: SUMB, impute: D.impute || null };
    MAP = D.map;
    LT = {};
    return { countries: C.length, sumBirths: SUMB };
  }
  // 基尼（百分数）→ 对数正态 σ
  function sigmaOf(c) {
    const g = clamp((c.gini || 36) / 100, 0.22, 0.66);
    return Math.SQRT2 * invNorm((g + 1) / 2);
  }
  // 「叶」（心情）的基准：收入越高越稳，战事压低，范围约 34–66
  function moodBase(c) {
    return clamp(46 + 9 * Math.log10(Math.max(500, c.ppp) / 2000) - 12 * (c.war || 0), 34, 66);
  }
  function chooseCountry() {
    const w = {};
    for (const c of C) w[c.id] = c.b;
    return CBY[wpick(w)];
  }

  // ===== 4. 生命表 =====
  // 婴儿当年平均存活年数 a0：Coale–Demeny 近似（Preston 等，2001，表 3.3）
  const a0Of = (q0, sex) => (sex === 'F'
    ? (q0 < 0.107 ? 0.053 + 2.8 * q0 : 0.35)
    : (q0 < 0.107 ? 0.045 + 2.684 * q0 : 0.33));
  const CHILD_SPLIT = [0.44, 0.26, 0.18, 0.12]; // 1–4 岁风险按年递减的分摊比例
  function lifeTable(c, sex) {
    const key = c.id + sex;
    if (LT[key]) return LT[key];
    const target = sex === 'F' ? c.lf : c.lm;
    const k = sex === 'F' ? 0.9 : 1.1;
    const q0 = Math.min(0.3, (c.im / 1000) * k);
    const q5 = clamp((c.u5 / 1000) * k, q0 + 4e-4, 0.45);
    const H = -Math.log((1 - q5) / (1 - q0));
    const qKid = CHILD_SPLIT.map((w) => 1 - Math.exp(-H * w));
    // 5–14 岁累计死亡约为五岁以下死亡率的 0.24 倍，按年摊平
    const plateau = 1 - Math.pow(1 - Math.min(0.25, (0.24 * c.u5 / 1000) * k), 0.1);
    const A = 3e-4 + 2.2e-5 * c.u5;                    // Makeham 背景风险
    const G = clamp(0.118 - 2.4e-4 * c.u5, 0.086, 0.116); // Gompertz 斜率
    const beta = 0.6;                                     // Kannisto 高龄平台，风险上限 1/β
    const a0 = a0Of(q0, sex);
    function build(B) {
      const q = new Float64Array(111);
      q[0] = q0;
      for (let y = 1; y <= 4; y++) q[y] = qKid[y - 1];
      for (let y = 5; y < 110; y++) {
        if (y < 15) { q[y] = plateau; continue; }
        const mu = A + B * Math.exp(G * (y + 0.5));
        q[y] = 1 - Math.exp(-mu / (1 + beta * mu));
      }
      q[110] = 1;
      let alive = 1, e = 0;
      for (let y = 0; y <= 110; y++) {
        const dead = alive * q[y];
        const frac = y === 0 ? a0 : y < 5 ? 0.4 : 0.5; // 死亡者当年平均存活比例
        e += alive - dead * (1 - frac);
        alive -= dead;
      }
      return { q, e };
    }
    let lo = -22, hi = -2.5, best;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      best = build(Math.exp(mid));
      if (best.e > target) lo = mid; else hi = mid;
    }
    const l = new Float64Array(112);
    l[0] = 1;
    for (let y = 0; y <= 110; y++) l[y + 1] = l[y] * (1 - best.q[y]);
    return (LT[key] = { q: best.q, l, e0: best.e, target });
  }
  // 从 age 岁起按生命表抽剩余寿命（整年）
  function drawDeathAge(c, sex, age) {
    const lt = lifeTable(c, sex);
    let a = age;
    while (a < 115) { if (rnd() < lt.q[Math.min(a, 110)]) return a; a++; }
    return a;
  }

  // ===== 5. 收入位置 =====
  const Z = [1, 2, 3, 4, 5].map((q) => invNorm((q - 0.5) / 5));
  const incomeOf = (c, q) => Math.exp(c.mu + c.sigma * Z[q - 1]);
  function worldPct(x) {
    let num = 0, den = 0;
    const lx = Math.log(x);
    for (const c of C) { num += c.pop * normCdf((lx - c.mu) / c.sigma); den += c.pop; }
    return Math.round((num / den) * 100);
  }

  // ===== 6. 新的一生 =====
  const EVENTS = [];
  function makeParents(c) {
    const mA = clamp(Math.round(normal(c.tfr > 3.5 ? 26 : 29, 5)), 18, 44);
    const fA = clamp(mA + ri(1, 8), 19, 62);
    const momBirth = chance(c.mmr / 100000);
    return {
      mA, fA, momBirth,
      mDie: momBirth ? 0 : drawDeathAge(c, 'F', mA) - mA,
      fDie: drawDeathAge(c, 'M', fA) - fA,
    };
  }
  function newLife(opt) {
    opt = opt || {};
    const seed = opt.seed || newSeed();
    const rng = makeRng('nianlun:' + seed);
    rndF = rng;
    const c = opt.country ? CBY[opt.country] : chooseCountry();
    const sex = chance(c.srb / (1 + c.srb)) ? 'M' : 'F';
    const urban = chance(c.urb / 100);
    const q = ri(1, 5);
    const K = 1 + poisson(Math.max(0, c.tfr - 0.8));
    const order = ri(1, K);
    const S = {
      v: 1, seed, rng, born: c.id, cur: c.id, sex, urban, urban0: urban, q, q0: q,
      sibOlder: order - 1, sibPlan: K - order, sibs: order - 1,
      age: 0, year0: opt.year0 != null ? opt.year0 : DEFAULT_BIRTH_YEAR,
      st: {
        gen: clamp(vitality(0) + (q - 3) * 3 - c.u5 / 14 + ri(-5, 5), 25, 96), // 根：身体
        zhi: 52 + Math.min(order + K - 2, 4) * 2 + ri(-6, 6),                   // 枝：亲友
        ye: 58 + ri(-7, 7),                                                     // 叶：心情
        shi: 14 + (q - 1) * 12 + ri(-4, 4),                                     // 实：家底与本事
      },
      edu: 0, school: false, job: null, married: false, spouse: null, kids: [], kidPlan: 0,
      smoker: false, exSmoker: false, chronic: null, hiv: null, migrated: false, refugee: false,
      flags: {}, once: {}, cool: {}, rings: [], log: [], marks: [], risk: 1, riskCause: null, sap: { gen: 1, zhi: 1, ye: 1, shi: 0 }, sapAt: -1,
      queue: [], phase: 'life', death: null, lastRing: null, isComp: !!opt.isComp,
      parents: makeParents(c),
    };
    if (chance(Math.max(0, (100 - c.ele) / 100) * (urban ? 0.4 : 1.4))) S.flags.noPower = true;
    return S;
  }
  const use = (S) => { rndF = S.rng; };
  let HAZ_CAL = 1; // 全局系数，只在校准工具里用；各国系数见 src/gen/cal.js

  // ===== 7. 状态工具（给事件库用） =====
  function fx(S, d) {
    for (const k in d) S.st[k] = clamp(S.st[k] + d[k], k === 'gen' ? 1 : 0, 100);
  }
  const mark = (S, t) => { S.marks.push({ t, ang: rnd() * Math.PI * 2 }); };
  const risk = (S, x, cause) => { S.risk *= x; if (cause) S.riskCause = cause; };
  const cur = (S) => CBY[S.cur];

  // ===== 8. 一年的事件 =====
  // 文化圈：由 culture.js 给出；未加载时一律按华语圈处理（保持旧行为可跑）
  const cultOf = (c) => (root.NL_CUL ? root.NL_CUL.cultureOf(c) : 'cn');
  // 年代：era 写成 [起年, 止年]，可写多段 [[1945,1969],[1990,2004]]
  function inEra(S, era) {
    const y = (S.year0 != null ? S.year0 : DEFAULT_BIRTH_YEAR) + S.age;
    if (typeof era[0] === 'number') return y >= era[0] && y <= era[1];
    for (const r of era) if (y >= r[0] && y <= r[1]) return true;
    return false;
  }
  function evOK(S, e, c) {
    if (S.age < e.a0 || S.age > e.a1) return false;
    if (e.once && S.once[e.id]) return false;
    if (e.cool && S.cool[e.id] != null && S.age - S.cool[e.id] < e.cool) return false;
    if (e.sex && e.sex !== S.sex) return false;
    if (e.era && !inEra(S, e.era)) return false;
    if (e.cult && e.cult.indexOf(cultOf(c)) < 0) return false;
    if (e.reg && e.reg.indexOf(c.reg) < 0) return false;
    if (e.iso && e.iso.indexOf(c.id) < 0) return false;
    if (e.if && !e.if(S, c)) return false;
    return true;
  }
  function planYear(S) {
    use(S);
    const c = cur(S);
    const out = [];
    let nEv = 0, nDec = 0;
    for (const e of shuffle(EVENTS.slice())) {
      if (!evOK(S, e, c)) continue;
      const p = typeof e.p === 'function' ? e.p(S, c) : e.p;
      const forced = p >= 1;
      if (!forced && !(p > 0 && chance(p))) continue;
      if (!forced) {
        if (e.dec) { if (nDec >= 1) continue; nDec++; } else { if (nEv >= 2) continue; nEv++; }
      }
      S.once[e.id] = 1; // 排进队列即视为已发生，避免同一年重复
      S.cool[e.id] = S.age;
      out.push({ id: e.id, forced, dec: !!e.dec, rank: e.rank || 0 });
    }
    out.sort((a, b) => (b.rank - a.rank) || (b.forced - a.forced) || (a.dec - b.dec));
    S.queue = out;
    return out;
  }
  const EVBY = {};
  function register(list) { for (const e of list) { EVENTS.push(e); EVBY[e.id] = e; } }
  const snap = (S) => ({ gen: S.st.gen, zhi: S.st.zhi, ye: S.st.ye, shi: S.st.shi });
  const delta = (a, b) => ({ gen: Math.round(b.gen - a.gen), zhi: Math.round(b.zhi - a.zhi), ye: Math.round(b.ye - a.ye), shi: Math.round(b.shi - a.shi) });
  function logEntry(S, e, text, d, extra) {
    const c = cur(S);
    const entry = Object.assign({ a: S.age, y: S.year0 + S.age, id: e.id, icon: e.icon || 'moon', text: loc(text, S, c, e), d, m: [] }, extra || {});
    S.log.push(entry);
    return entry;
  }
  // 普通事件：结算并返回日志条目
  function applyEvent(S, inst) {
    use(S);
    const e = EVBY[inst.id], c = cur(S);
    const before = snap(S), nMarks = S.marks.length;
    const text = e.run(S, c);
    const entry = logEntry(S, e, text, delta(before, snap(S)));
    entry.marks = S.marks.slice(nMarks);
    entry.m = entry.marks.map((m) => m.t);
    return entry;
  }
  // 决策：先给题面，再按选择结算
  function askDecision(S, inst) {
    use(S);
    const e = EVBY[inst.id], c = cur(S);
    const lab = (o) => (!o ? null : loc(typeof o.t === 'function' ? o.t(S, c) : o.t, S, c, e));
    return { id: e.id, icon: e.icon, q: loc(e.ask(S, c), S, c, e), L: lab(e.L), R: lab(e.R), solo: !e.R };
  }
  function choose(S, inst, side, qtext) {
    use(S);
    const e = EVBY[inst.id], c = cur(S);
    const before = snap(S), nMarks = S.marks.length;
    const o = side === 'R' && e.R ? e.R : e.L;
    const label = typeof o.t === 'function' ? o.t(S, c) : o.t;
    const text = o.run(S, c);
    const entry = logEntry(S, e, text, delta(before, snap(S)), { q: loc(qtext, S, c, e), pick: loc(label, S, c, e), side });
    entry.marks = S.marks.slice(nMarks);
    entry.m = entry.marks.map((m) => m.t);
    return entry;
  }
  function autoSide(S, inst) {
    const e = EVBY[inst.id];
    if (!e.R) return 'L';
    const p = typeof e.ai === 'function' ? e.ai(S, cur(S)) : e.ai == null ? 0.5 : e.ai;
    return chance(p) ? 'R' : 'L';
  }

  // ===== 9. 年终：状态回归、年轮、生死 =====
  // 活力基准：童年爬升，25 岁后加速下行
  function vitality(a) { return 74 + 16 * (1 - Math.exp(-a / 4)) - 0.055 * Math.pow(Math.max(0, a - 25), 1.6); }
  const MARK_G = { scar: -0.14, frost: -0.1, dry: -0.26, bloom: 0.14, move: -0.05 };
  // 年轮宽：年龄基准 × 长势（拉开好坏年景）× 年景波动（按种子和年龄取固定值，不消耗随机数）
  function yearNoise(seed, a) { let h = 2166136261; const s = seed + ':' + a; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; }
  function ringW(S, a, g) {
    const base = a < 18 ? 1.34 - a * 0.016 : Math.max(0.46, 1.05 - (a - 18) * 0.0095);
    return base * (0.2 + 1.6 * Math.pow(clamp(g, 0.05, 1), 1.4)) * (0.86 + 0.28 * yearNoise(S.seed, a));
  }
  function growthOf(S) { return (S.st.gen * 0.3 + S.st.ye * 0.3 + S.st.zhi * 0.2 + S.st.shi * 0.2) / 100; }
  // 国别健康落差：五岁以下死亡率越高，同龄人的身体基准越低
  const pen = (c) => c.u5 / 14;
  // 校准年龄段：0、1–4、5–14、15–44、45–69、70+
  const band = (a) => (a < 1 ? 0 : a < 5 ? 1 : a < 15 ? 2 : a < 45 ? 3 : a < 70 ? 4 : 5);

  // 风险乘子：身体比同龄基准差多少，再叠加烟、慢病和当年的意外
  function hazardMult(S) {
    const a = S.age;
    const c = cur(S);
    // 幼儿的猝死多、病程短，身体差异和当年风险对他们的放大作用减半
    let m = Math.exp((a < 5 ? 0.014 : 0.028) * (vitality(a) - pen(c) - S.st.gen));
    if (a >= 40) {
      if (S.smoker) m *= 1.5; else if (S.exSmoker) m *= 1.15;
    }
    if (S.chronic === 'untreated') m *= 1.35; else if (S.chronic === 'treated') m *= 1.1;
    if (S.hiv === 'untreated') m *= 3.6; else if (S.hiv === 'treated') m *= 1.5;
    m *= a < 5 ? Math.min(S.risk, 2.5) : a < 15 ? Math.min(S.risk, 3) : S.risk;
    if (a > 88) m = 1 + (m - 1) * Math.exp(-(a - 88) / 7); // 高龄幸存者的差异收敛
    return clamp(m, 0.35, 8) * HAZ_CAL * (c.calB ? c.calB[band(a)] : 1);
  }
  function deathProb(S) {
    const lt = lifeTable(cur(S), S.sex);
    const q = lt.q[Math.min(S.age, 109)];
    return 1 - Math.pow(1 - q, hazardMult(S));
  }

  const CAUSE = {
    neo: '出生时的并发症', inf: '肺炎', dia: '腹泻脱水', mal: '疟疾', mea: '麻疹', mnut: '营养不良', drown: '溺水',
    road: '交通事故', viol: '暴力', war: '战乱', hiv: '艾滋病', tb: '结核病', mat: '难产', heart: '心脏病',
    stroke: '中风', cancer: '癌症', lung: '慢性肺病', diab: '糖尿病', old: '衰老', fall: '摔倒', other: '急病',
    flood: '洪水', quake: '地震', storm: '台风', heat: '热浪',
  };
  function causeWeights(S, c) {
    const a = S.age, F = S.sex === 'F', w = {};
    const k = c.u5 / 1000;
    if (a === 0) {
      w.neo = 6; w.inf = 2 + k * 40; w.dia = (100 - c.wat) / 25 + k * 20; w.mal = c.mal / 60; w.mnut = (6 - S.q) * k * 10;
    } else if (a < 5) {
      w.inf = 2 + k * 30; w.dia = (100 - c.wat) / 20 + k * 20; w.mal = c.mal / 40; w.mea = (100 - c.vac) / 15;
      w.mnut = (6 - S.q) * k * 12; w.drown = 1; w.other = 1.5;
    } else if (a < 15) {
      w.inf = 1 + k * 10; w.mal = c.mal / 80; w.drown = 2; w.road = c.road / 6; w.other = 2; w.cancer = 0.8;
    } else {
      w.road = (c.road / 5) * (a < 30 ? 1.5 : a < 60 ? 1 : 0.5) * (F ? 0.4 : 1);
      if (a < 65) w.viol = (c.hom / 6) * (F ? 0.25 : 1) * (a < 35 ? 1.4 : 0.8);
      w.hiv = S.hiv ? (S.hiv === 'untreated' ? 30 : 6) : c.hiv * 0.25 * (a < 60 ? 1 : 0.3);
      w.tb = k * 25 + (c.hiv > 2 ? 1 : 0);
      if (F && a < 50) w.mat = (c.mmr / 60) * (S.flags.birthYear === a ? 8 : 0.4);
      w.heart = Math.max(0, a - 35) / 6;
      w.stroke = Math.max(0, a - 40) / 8;
      w.cancer = (Math.max(0, a - 30) / 7) * (S.smoker ? 1.6 : 1);
      w.lung = (Math.max(0, a - 50) / 14) * (S.smoker || S.exSmoker ? 3 : 1) * (S.flags.noPower ? 1.6 : 1);
      w.diab = Math.max(0, a - 45) / 18;
      w.inf = a > 65 ? (a - 65) / 6 : 0.6 + k * 6;
      if (a >= 80) w.old = (a - 78) * 0.9;
      if (a >= 72) w.fall = (a - 70) / 10;
      w.other = 1.6;
      if (c.mal > 0) w.mal = c.mal / 150;
    }
    if (S.riskCause) {
      let sum = 0;
      for (const x in w) sum += w[x] || 0;
      w[S.riskCause] = (w[S.riskCause] || 0) + sum * 2;
    }
    return w;
  }

  function endYear(S) {
    use(S);
    const c = cur(S), a = S.age;
    const sap = S.sap;
    const burden = (S.smoker && a > 30 ? 3 : 0) + (S.chronic ? 5 : 0) + (S.hiv === 'untreated' ? 14 : S.hiv ? 4 : 0);
    const genT = vitality(a) - pen(c) + (S.st.shi - 50) * 0.12 - burden;
    S.st.gen = clamp(S.st.gen + (genT - S.st.gen) * 0.2 + sap.gen * 0.5, 1, 100);
    const partnerOn = S.married && S.spouse && S.spouse.alive;
    const kidsOn = S.kids.filter((x) => x.alive).length;
    const zhiT = 44 + (S.urban ? 0 : 4) + (partnerOn ? 12 : 0) + Math.min(kidsOn, 3) * 4
      - (S.migrated ? 7 : 0) - Math.max(0, a - 72) * 0.6;
    S.st.zhi = clamp(S.st.zhi + (zhiT - S.st.zhi) * 0.13 + sap.zhi * 0.5, 0, 100);
    const yeT = c.mood + (S.st.zhi - 50) * 0.22 + (S.st.gen - vitality(a)) * 0.18 + (S.st.shi - 50) * 0.12;
    S.st.ye = clamp(S.st.ye + (yeT - S.st.ye) * 0.18 + sap.ye * 0.5, 0, 100);
    const jobGain = S.job === 'office' ? 8 : S.job && !['retired', 'seeking'].includes(S.job) ? 3 : 0;
    const shiT = 10 + (S.q - 1) * 13 + S.edu * 6 + jobGain - Math.max(0, a - 70) * 0.5;
    S.st.shi = clamp(S.st.shi + (shiT - S.st.shi) * 0.1 + sap.shi * 0.5, 0, 100);

    // 年轮：宽度 = 年龄基准 × 当年长势；童年宽、老年窄
    const marks = S.marks;
    S.marks = [];
    let g = growthOf(S);
    for (const m of marks) g += MARK_G[m.t] || 0;
    g = clamp(g, 0.05, 1);
    const ring = {
      a, w: +ringW(S, a, g).toFixed(3), g: +g.toFixed(3),
      m: marks.map((m) => ({ t: m.t, ang: +m.ang.toFixed(3) })),
      st: { gen: Math.round(S.st.gen), zhi: Math.round(S.st.zhi), ye: Math.round(S.st.ye), shi: Math.round(S.st.shi) },
      cur: S.cur,
    };
    if (chance(deathProb(S)) || a >= 119) {
      S.rings.push(ring);
      S.lastRing = ring;
      die(S, a >= 119 ? 'old' : null);
      return { ring, died: true };
    }
    S.rings.push(ring);
    S.age++;
    S.risk = 1;
    S.riskCause = null;
    return { ring, died: false };
  }

  const DEATH_LINE = {
    neo: '你只在这个世界上待了几天。', dia: '那年的水不干净。', mal: '雨季的蚊子，比药先到。',
    mea: '疫苗没有赶上你。', mnut: '你太瘦了，扛不住任何一场病。', drown: '那条河，你从小就在里面玩。',
    road: '路口那辆车，没有刹住。', viol: '那天你本不该走那条路。', war: '炮弹不认得任何人。',
    tb: '你咳了很久，最后咳不动了。', mat: '你生下了孩子，自己没能醒来。', heart: '心脏在一个平常的早上停了。',
    cancer: '确诊之后，你又撑了一年多。', lung: '最后那几年，你一直喘不上气。', diab: '血糖慢慢拖垮了你的身体。',
    old: '你睡着了，没有再醒来。', fall: '你在门口摔了一跤，再没站起来。', other: '一场病，来得很急。',
    flood: '水来得太快了。', quake: '房梁落下来的时候，你没来得及跑。', storm: '那一夜的风太大了。', heat: '那个夏天太热了。',
  };
  function deathLine(S, id) {
    if (id === 'inf') return S.age < 5 ? '那场咳嗽没有停下来。' : '一场肺炎，在冬天带走了你。';
    if (id === 'hiv') return S.hiv === 'treated' ? '你和它相处了很多年，最后还是输了。' : '药来得太晚了。';
    if (id === 'stroke') return '你倒下的时候，手里还拿着' + pick(['筷子', '锄头', '遥控器', '一封信']) + '。';
    return DEATH_LINE[id] || '';
  }
  function die(S, forceCause) {
    const c = cur(S);
    const id = forceCause || wpick(causeWeights(S, c));
    S.death = { age: S.age, cause: id, label: CAUSE[id] || '急病', year: S.year0 + S.age, line: loc(deathLine(S, id), S, c), where: S.cur };
    S.phase = 'dead';
    S.queue = [];
  }

  // ===== 9b. 养分：每段人生开头，玩家把 3 滴养分分给根枝叶实 =====
  const SAP_GATES = [7, 13, 18, 26, 36, 46, 56, 66, 76, 86];
  const SAP_LABELS = {
    7: { gen: '满山跑', zhi: '找伙伴', ye: '玩耍', shi: '读书识字' },
    13: { gen: '运动', zhi: '朋友', ye: '爱好', shi: '学习' },
    18: { gen: '作息', zhi: '人情', ye: '玩', shi: '挣钱' },
    26: { gen: '身体', zhi: '人情', ye: '自己', shi: '挣钱' },
    36: { gen: '身体', zhi: '家人', ye: '自己', shi: '存钱' },
    46: { gen: '身体', zhi: '家人', ye: '自己', shi: '存钱' },
    56: { gen: '身体', zhi: '老伴儿孙', ye: '喜欢的事', shi: '养老钱' },
    66: { gen: '养生', zhi: '老伴儿孙', ye: '晒太阳', shi: '留点钱' },
    76: { gen: '养生', zhi: '老朋友', ye: '回忆', shi: '留点钱' },
    86: { gen: '养生', zhi: '老朋友', ye: '回忆', shi: '留点钱' },
  };
  const sapDue = (S) => SAP_GATES.includes(S.age) && S.sapAt !== S.age;
  function setSap(S, sap) {
    S.sap = { gen: sap.gen || 0, zhi: sap.zhi || 0, ye: sap.ye || 0, shi: sap.shi || 0 };
    S.sapAt = S.age;
  }
  function autoSap(S) {
    use(S);
    const sap = { gen: 0, zhi: 0, ye: 0, shi: 0 };
    const keys = Object.keys(sap);
    for (let i = 0; i < 3; i++) sap[keys[Math.floor(rnd() * 4)]]++;
    setSap(S, sap);
  }

  // ===== 10. 整局自动跑（同伴、测试用） =====
  function runYear(S) {
    if (sapDue(S)) autoSap(S);
    const items = planYear(S);
    for (const it of items) {
      if (S.phase !== 'life') break;
      if (it.dec) { const d = askDecision(S, it); choose(S, it, autoSide(S, it), d.q); } else applyEvent(S, it);
    }
    return endYear(S);
  }
  function runLife(opt) {
    const S = newLife(opt);
    let guard = 0;
    while (S.phase === 'life' && guard++ < 130) runYear(S);
    return S;
  }

  // ===== 11. 摘要、出生信息、同一阵风 =====
  function birthFacts(S) {
    const c = CBY[S.born];
    const lt = lifeTable(c, S.sex);
    const inc = incomeOf(c, S.q);
    return {
      country: c, share: c.share, per1000: c.share * 1000, oneIn: Math.round(1 / c.share),
      le: S.sex === 'F' ? c.lf : c.lm, u5: c.u5, q: S.q, worldPct: worldPct(inc),
      reach65: lt.l[65], sibOlder: S.sibOlder,
    };
  }
  // 全世界新生儿（按出生数加权）活过 age 岁的比例
  let WORLD_L = null;
  function worldBeyond(age) {
    if (!WORLD_L) {
      WORLD_L = new Float64Array(112);
      for (const c of C) {
        const pM = c.srb / (1 + c.srb), m = lifeTable(c, 'M').l, f = lifeTable(c, 'F').l;
        for (let a = 0; a < 112; a++) WORLD_L[a] += c.share * (pM * m[a] + (1 - pM) * f[a]);
      }
    }
    return WORLD_L[Math.min(age + 1, 111)];
  }
  function highlights(S, n) {
    const scored = S.log.map((e, i) => {
      const d = e.d || {};
      let s = Math.abs(d.gen || 0) + Math.abs(d.zhi || 0) + Math.abs(d.ye || 0) + Math.abs(d.shi || 0);
      if (e.m && e.m.length) s += 10;
      if (e.side) s += 6;
      return { i, s };
    }).sort((x, y) => y.s - x.s).slice(0, n || 3).sort((x, y) => x.i - y.i);
    return scored.map((x) => S.log[x.i]);
  }
  function summaryOf(S) {
    const c = CBY[S.born];
    return {
      seed: S.seed, born: S.born, zh: c.zh, reg: c.reg, sex: S.sex, urban: S.urban0, q: S.q0,
      age: S.death ? S.death.age : S.age, cause: S.death ? S.death.label : '', causeId: S.death ? S.death.cause : '',
      line: S.death ? S.death.line : '', where: S.death ? CBY[S.death.where].zh : '',
      moved: S.cur !== S.born, rings: S.rings.map((r) => ({ w: r.w, g: r.g, m: r.m })),
      hi: highlights(S, 3).map((e) => ({ a: e.a, text: e.text, icon: e.icon })),
      le: S.sex === 'F' ? c.lf : c.lm,
    };
  }
  function companions(seed, n) {
    const keep = rndF;
    try {
      const out = [];
      for (let i = 1; i <= (n || 4); i++) {
        const S = runLife({ seed: seed + ':' + i, isComp: true });
        out.push(summaryOf(S));
      }
      return out;
    } finally { rndF = keep; }
  }

  // 迁移去向：净移民为正的国家，按地区亲缘加权
  function pickDest(c) {
    const destinations = root.NL.profiles ? root.NL.profiles.destinations(c) : [];
    if (destinations.length) return pick(destinations);
    const w = {};
    const bonus = DEST_BONUS[c.reg] || {};
    for (const d of C) {
      if (d.id === c.id || d.mig <= 0 || !(d.inc === 'HIC' || d.inc === 'UMC')) continue;
      w[d.id] = Math.sqrt(d.mig) * (bonus[d.id] || (d.reg === c.reg ? 1.6 : 0.6));
    }
    return CBY[wpick(w)];
  }
  // 逃难去向：离得近、没在打仗的国家
  function pickRefuge(c) {
    if (chance(0.22)) return pickDest(c);
    const w = {};
    for (const d of C) {
      if (d.id === c.id || d.war > 0.3) continue;
      const dist = Math.hypot(d.x - c.x, d.y - c.y);
      w[d.id] = Math.sqrt(d.pop / 1e6) / Math.pow(1 + dist / 30, 3);
    }
    return CBY[wpick(w)];
  }

  root.NL = {
    NOW_YEAR, AGE_NOW, BIRTH_YEAR, setBirthYear, ageNow, get birthYear() { return DEFAULT_BIRTH_YEAR; },
    ringW, growthOf, band, sapDue, setSap, autoSap, SAP_LABELS, hazardMult, vitality, setHazCal(x) { HAZ_CAL = x; },
    init, newLife, planYear, applyEvent, askDecision, choose, autoSide, endYear, runYear, runLife,
    worldBeyond, deathProb, lifeTable, incomeOf, worldPct, birthFacts, summaryOf, highlights, companions,
    newSeed, fmtSeed, parseSeed, makeRng, withRng, register, chooseCountry,
    get countries() { return C; }, get cby() { return CBY; }, get info() { return INFO; }, get map() { return MAP; },
    get events() { return EVENTS; }, CAUSE,
    util: { rnd, ri, pick, chance, clamp, wpick, normal, poisson, fx, mark, risk, cur, pickDest, pickRefuge, drawDeathAge, lifeTable, shuffle },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
