/* 年轮 · 时间线层（原创）
 *
 * 输入：出生／定居的国家 + 年份。输出：那一年的真实统计与年代注脚。
 * 数据来自 src/gen/history.js（世界银行 WDI 逐年时间序列）与 src/era.js（史实短句）。
 * 这一层只读，不改模拟引擎的随机序列、事件概率与死亡校准。
 * 引擎仍以「今天的医疗水平」推演寿命，所以出生卡的年份数据与生命表口径分开标注。
 */
(function (root) {
  'use strict';
  const H = root.NL_HIST || root.window && root.window.NL_HIST;
  const E = root.NL_ERA || root.window && root.window.NL_ERA;
  const BIRTH_YEARS = [1960, 1970, 1980, 1990, 2000, 2010];
  const DEFAULT_BIRTH_YEAR = 1990;
  const NOW_YEAR = 2026;

  if (!H || !E) {
    root.NL_TL = { available: false, birthYears: BIRTH_YEARS, defaultBirthYear: DEFAULT_BIRTH_YEAR };
    return;
  }

  const Y0 = H.y0, Y1 = H.y1, F = H.f;
  const cacheC = {}, cacheR = {};
  function parse(s) {
    return s.split('|').map((a) => a.split(',').map((v) => v === '' ? null : +v));
  }
  function seriesOf(id, reg) {
    if (cacheC[id] === undefined) cacheC[id] = H.d[id] ? parse(H.d[id]) : null;
    if (cacheR[reg] === undefined) cacheR[reg] = H.r[reg] ? parse(H.r[reg]) : null;
    return { c: cacheC[id], r: cacheR[reg] };
  }
  // 2026 年（今天）还没有 WDI 年终值，沿用 2025；2027 起才叫「往后」
  const inRange = (y) => y >= Y0 && y <= NOW_YEAR;

  // 取某国某年的 9 项指标；缺数回退到同地区同年中位数，再回退到最近可得年份
  function at(id, reg, year) {
    if (!inRange(year)) return null;
    const i = Math.min(year, Y1) - Y0, { c, r } = seriesOf(id, reg), out = {};
    for (let k = 0; k < F.length; k++) {
      let v = c && c[k] ? c[k][i] : null;
      let est = v == null;
      if (v == null && r && r[k]) v = r[k][i];
      if (v == null && c && c[k]) {
        for (let j = i; j >= 0; j--) if (c[k][j] != null) { v = c[k][j]; break; }
        if (v == null) for (let j = i + 1; j <= Y1 - Y0; j++) if (c[k][j] != null) { v = c[k][j]; break; }
      }
      out[F[k]] = v;
      out._est = out._est || est;
    }
    out.year = year; out.id = id;
    return out;
  }

  // 用当年各国「人口 × 粗出生率」重算出生占比，而不是沿用今天的人口结构
  const shareCache = {};
  function birthShare(id, year) {
    const key = String(year);
    if (shareCache[key]) return shareCache[key][id] || null;
    const cs = root.NL.countries;
    const b = {};
    let sum = 0;
    for (const c of cs) {
      const h = at(c.id, c.reg, year);
      const pop = h && h.pop != null ? h.pop : c.pop / 1e6;
      const cbr = h && h.cbr != null ? h.cbr : c.b / (c.pop || 1) * 1000;
      const v = Math.max(0, pop) * Math.max(0, cbr) / 1000;
      b[c.id] = v; sum += v;
    }
    const out = {};
    for (const k in b) out[k] = sum > 0 ? b[k] / sum : null;
    shareCache[key] = out;
    return out[id] || null;
  }
  // 标准正态 CDF（与引擎同款近似）
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
  function sigmaOf(c) {
    const g = Math.min(0.66, Math.max(0.22, (c.gini || 36) / 100));
    return Math.SQRT2 * invNorm((g + 1) / 2);
  }
  // 全世界当年有多少人，收入不如你（按各国当年人均 GDP 与对数正态粗算）
  function worldIncomePct(year, income) {
    if (!inRange(year) || !(income > 0)) return null;
    const cs = root.NL.countries, lx = Math.log(income);
    let num = 0, den = 0;
    for (const c of cs) {
      const h = at(c.id, c.reg, year);
      const ppp = h && h.ppp != null ? h.ppp : c.ppp;
      const pop = h && h.pop != null ? h.pop : c.pop / 1e6;
      const s = sigmaOf(c);
      const mu = Math.log(Math.max(400, ppp)) - s * s / 2;
      num += pop * normCdf((lx - mu) / s);
      den += pop;
    }
    return den > 0 ? Math.round(num / den * 100) : null;
  }

  // 出生卡：把引擎的「今天横截面」换成出生那一年的真实数据
  function birthFacts(S) {
    const c = root.NL.cby[S.born], f = root.NL.birthFacts(S), y = S.year0;
    const h = at(c.id, c.reg, y);
    f.year = y; f.hist = h;
    if (!h) return f;
    if (h.le != null && c.le) f.le = (S.sex === 'F' ? c.lf : c.lm) * (h.le / c.le);
    if (h.u5 != null) f.u5 = h.u5;
    const sh = birthShare(c.id, y);
    if (sh) { f.share = sh; f.oneIn = Math.max(1, Math.round(1 / sh)); f.per1000 = sh * 1000; }
    if (h.ppp != null) {
      const inc = root.NL.incomeOf(c, S.q) * (h.ppp / Math.max(400, c.ppp));
      const pct = worldIncomePct(y, inc);
      if (pct != null) f.worldPct = pct;
    }
    return f;
  }

  // 年代注脚：home > region > world，按年份精确匹配
  function eraAt(id, reg, year) {
    const out = [];
    const push = (arr, kind) => { if (arr) for (const e of arr) if (e[0] === year) out.push({ y: e[0], t: e[1], k: kind }); };
    push(E.home[id], 'home');
    push(E.region[reg], 'region');
    push(E.world, 'world');
    return out;
  }
  function eraLine(id, reg, year) {
    const a = eraAt(id, reg, year);
    return a.length ? a[0] : null;
  }

  const money = (v) => v == null ? null : v >= 10000 ? (v / 10000).toFixed(1) + ' 万美元' : Math.round(v) + ' 美元';
  const one = (v) => v == null ? null : v.toFixed(1);
  function tidbit(h, year) {
    const keys = ['im', 'ppp', 'urb', 'net', 'ele', 'u5'];
    for (let n = 0; n < keys.length; n++) {
      const k = keys[(year + n) % keys.length], v = h[k];
      if (v == null) continue;
      switch (k) {
        case 'im': return `每千个婴儿里，约 ${Math.round(v)} 个活不过一岁`;
        case 'u5': return `每千个孩子里，约 ${Math.round(v)} 个活不到五岁`;
        case 'ppp': return `按购买力算，人均 GDP 约 ${money(v)}`;
        case 'urb': return `每 100 人里，约 ${Math.round(v)} 人住在城里`;
        case 'net': return v < 1 ? '这一带几乎还没有人上网' : `每 100 人里，约 ${Math.round(v)} 人上网`;
        case 'ele': return `每 100 户里，约 ${Math.round(v)} 户通了电`;
      }
    }
    return '这一年，统计表里留下的数字不多。';
  }

  // 一生界面 / 年谱 / 终章共用的「这一年」描述
  function yearInfo(id, reg, year, birthYear) {
    const zh = (root.NL.cby[id] || {}).zh || id;
    if (!inRange(year)) {
      return { y: year, zh, beyond: true, l1: `${year} · 往后 · 按今天的统计水平推演`, l2: '', era: [] };
    }
    const h = at(id, reg, year) || {};
    const delta = birthYear != null && h.le != null ? (() => { const b = at(id, reg, birthYear); return b && b.le != null ? h.le - b.le : null; })() : null;
    const leTxt = h.le != null
      ? `预期寿命 ${one(h.le)} 岁` + (delta != null && Math.abs(delta) >= 0.5 ? `（比 ${birthYear} 年 ${delta > 0 ? '+' : ''}${one(delta)}）` : '')
      : '这一年的寿命数据缺失';
    const era = eraAt(id, reg, year);
    return {
      y: year, zh, h, beyond: false, era, delta,
      l1: `${year} · ${zh} · ${leTxt}`,
      l2: era.length ? `那年：${era[0].t}` : `那年：${tidbit(h, year)}`,
    };
  }
  // 从状态里取某一年的所在地（年轮里存了 cur）
  function yearInfoForLife(S, age) {
    const ring = S.rings && S.rings[age];
    const id = ring && ring.cur ? ring.cur : S.cur || S.born;
    const c = root.NL.cby[id] || root.NL.cby[S.born];
    return yearInfo(id, c.reg, S.year0 + age, S.year0);
  }

  root.NL_TL = {
    available: true, birthYears: BIRTH_YEARS, defaultBirthYear: DEFAULT_BIRTH_YEAR,
    nowYear: NOW_YEAR, y0: Y0, y1: Y1, fields: F,
    at, birthShare, worldIncomePct, birthFacts, eraAt, eraLine, yearInfo, yearInfoForLife,
    ageNow: (y) => NOW_YEAR - y,
    note: E.note,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
