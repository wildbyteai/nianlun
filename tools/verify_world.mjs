// 世界线校验：文化圈分流是否生效、年代轴是否按出生年切换、文案有没有串味。
// 用法：node tools/verify_world.mjs [每国局数]
import { load } from './loader.mjs';

const ctx = load({eventMode:'legacy'});
const NL = ctx.NL;
const CUL = ctx.NL_CUL;
const N = +(process.argv[2] || 600);
let pass = 0, fail = 0;
const ok = (name, cond, note = '') => { (cond ? pass++ : fail++); console.log((cond ? 'PASS ' : 'FAIL ') + name + (note ? '  ' + note : '')); };

// ---------- 1. 每个国家都落到某个圈里 ----------
const CIRC = Object.keys(CUL.CULT);
const stray = NL.countries.filter((c) => CIRC.indexOf(CUL.cultureOf(c)) < 0);
ok('192 国全部归入九个文化圈', stray.length === 0, stray.map((c) => c.id).join(',') || CIRC.length + ' 个圈');
const dist = {};
for (const c of NL.countries) { const k = CUL.cultureOf(c); dist[k] = (dist[k] || 0) + 1; }
ok('每个圈至少两个国家', CIRC.every((k) => dist[k] >= 2), CIRC.map((k) => CUL.ZH[k] + dist[k]).join(' '));

// ---------- 2. 每个圈都有专属事件，且覆盖全年龄 ----------
const byCult = {};
for (const e of NL.events) if (e.cult) for (const k of e.cult) (byCult[k] = byCult[k] || []).push(e);
const thin = CIRC.filter((k) => (byCult[k] || []).length < 12);
ok('每个圈至少 12 条专属事件', thin.length === 0, CIRC.map((k) => k + ':' + (byCult[k] || []).length).join(' '));
const covered = CIRC.filter((k) => {
  const list = byCult[k] || [];
  return [5, 12, 20, 35, 55, 70].every((a) => list.some((e) => e.a0 <= a && e.a1 >= a));
});
ok('每个圈的专属事件覆盖 5/12/20/35/55/70 岁', covered.length === CIRC.length, '缺口：' + CIRC.filter((k) => covered.indexOf(k) < 0).join(','));

// ---------- 3. 抽样跑人生 ----------
const IDS = ['USA', 'DEU', 'CHN', 'JPN', 'KOR', 'RUS', 'BRA', 'IND', 'VNM', 'SAU', 'NGA', 'ETH'];
const run = {};
for (const id of IDS) {
  const ev = new Map(), texts = new Set(); let total = 0, n = 0, stayed = 0;
  for (let i = 0; i < N; i++) {
    const S = NL.runLife({ seed: 'W' + i, country: id, year0: 1990 });
    total += S.log.length; n++;
    const stay = S.cur === S.born;
    // 文案只收「一辈子都在出生国」的人：中途去过别国又回来的，那几年的文案本来就该跟着落地国走
    const pure = S.rings.every((r) => r.cur === S.born);
    if (stay) stayed++;
    for (const e of S.log) {
      ev.set(e.id, (ev.get(e.id) || 0) + 1);
      if (pure) texts.add(e.text);
    }
  }
  run[id] = { ev, texts, total, per: total / n, stayed: stayed / n };
}
ok('每局日志条数在合理区间', IDS.every((id) => run[id].per > 55 && run[id].per < 135),
  IDS.map((id) => id + ':' + run[id].per.toFixed(0)).join(' '));

// ---------- 4. 跨国分布距离 ----------
function distOf(m, total) { const o = new Map(); for (const [k, v] of m) o.set(k, v / total); return o; }
function jsd(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]); let d = 0;
  for (const k of keys) {
    const p = a.get(k) || 0, q = b.get(k) || 0, m = (p + q) / 2;
    if (p > 0) d += 0.5 * p * Math.log2(p / m);
    if (q > 0) d += 0.5 * q * Math.log2(q / m);
  }
  return Math.sqrt(d);
}
const D = {}; for (const id of IDS) D[id] = distOf(run[id].ev, run[id].total);
const cross = [], same = [];
for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) {
  const a = IDS[i], b = IDS[j];
  const v = jsd(D[a], D[b]);
  (CUL.cultureOf(NL.cby[a]) === CUL.cultureOf(NL.cby[b]) ? same : cross).push({ a, b, v });
}
const avg = (xs) => xs.reduce((s, x) => s + x.v, 0) / xs.length;
const minCross = cross.reduce((m, x) => (x.v < m.v ? x : m));
ok('跨文化圈事件分布距离 ≥ 0.42', avg(cross) >= 0.42,
  '平均 ' + avg(cross).toFixed(3) + '，最像的一对 ' + minCross.a + '/' + minCross.b + ' ' + minCross.v.toFixed(3));
ok('跨圈差异大于同圈差异', avg(cross) > avg(same) + 0.06,
  '跨圈 ' + avg(cross).toFixed(3) + ' > 同圈 ' + avg(same).toFixed(3));

// ---------- 5. 同种子逐岁重合率 ----------
function keysOf(id) {
  const out = [];
  for (let i = 0; i < 400; i++) {
    const S = NL.runLife({ seed: 'X' + i, country: id, year0: 1990 });
    const m = new Set();
    for (const e of S.log) m.add(e.a + '|' + e.id);
    out.push(m);
  }
  return out;
}
const K = {}; for (const id of ['USA', 'JPN', 'CHN', 'IND']) K[id] = keysOf(id);
const overlap = (a, b) => { let s = 0, t = 0; for (let i = 0; i < 400; i++) for (const k of K[a][i]) { t++; if (K[b][i].has(k)) s++; } return s / t; };
const ov = [['USA', 'JPN'], ['USA', 'CHN'], ['USA', 'IND'], ['JPN', 'CHN']].map(([a, b]) => ({ p: a + '/' + b, v: overlap(a, b) }));
ok('同种子跨圈逐岁重合率 < 10%', ov.every((x) => x.v < 0.10), ov.map((x) => x.p + ' ' + (x.v * 100).toFixed(1) + '%').join(' '));

// ---------- 6. 文案串味 ----------
const BAD = {
  cn: ['榻榻米', '达恰', '斋月', '三轮车', '彩礼'],
  jpkr: ['村里', '镇上', '达恰', '斋月', '彩礼', '学区房'],
  west: ['村里', '公社', '达恰', '斋月', '三轮车', '彩礼', '卫生院'],
  eur: ['村里', '斋月', '三轮车', '榻榻米'],
  lat: ['榻榻米', '达恰', '斋月', '学区房'],
  sas: ['榻榻米', '达恰', '学区房'],
  sea: ['榻榻米', '达恰', '斋月', '学区房'],
  mena: ['榻榻米', '达恰', '学区房'],
  ssa: ['榻榻米', '达恰', '学区房'],
};
const dirty = [];
for (const id of IDS) {
  const k = CUL.cultureOf(NL.cby[id]);
  for (const t of run[id].texts) {
    for (const w of BAD[k] || []) if (t.indexOf(w) >= 0) dirty.push(id + ':' + w + ':' + t.slice(0, 26));
  }
}
ok('圈层文案里没有别的圈才有的东西', dirty.length === 0, dirty.slice(0, 4).join(' | '));

// ---------- 7. 年代轴按出生年切换 ----------
const BANDS = [[1945, 1969], [1970, 1989], [1990, 2004], [2005, 2016], [2017, 2026]];
const eraEv = NL.events.filter((e) => e.era);
ok('年代事件数量足够', eraEv.length >= 30, eraEv.length + ' 条');
for (const [y0, y1] of BANDS) {
  const birth = Math.max(1945, y0 - 25); // 出生在段前 25 年，这一段正好落在 20–45 岁
  const hits = new Map();
  for (const cid of ['CHN', 'BRA', 'USA', 'NGA']) {
    for (let i = 0; i < 300; i++) {
      const S = NL.runLife({ seed: 'E' + y0 + cid + ':' + i, country: cid, year0: birth });
      for (const e of S.log) hits.set(e.id, (hits.get(e.id) || 0) + 1);
    }
  }
  const inBand = eraEv.filter((e) => {
    const a = Array.isArray(e.era[0]) ? e.era : [e.era];
    // 只算这段里人正好在 5–85 岁的，且四个取样国里至少有一个能抽到
    if (!a.some(([s, t]) => Math.max(s, y0) <= Math.min(t, y1) && Math.min(t, y1) >= birth + 5 && Math.max(s, y0) <= birth + 85)) return false;
    if (!e.cult) return true;
    return ['CHN', 'BRA', 'USA', 'NGA'].some((cid) => e.cult.indexOf(CUL.cultureOf(NL.cby[cid])) >= 0);
  });
  const fired = inBand.filter((e) => hits.has(e.id));
  ok(`年代段 ${y0}–${y1} 能被抽到`, fired.length >= Math.min(3, inBand.length), fired.length + '/' + inBand.length + ' 条触发');
}
// 反向：年代事件不该出现在区间外
const outside = [];
for (let i = 0; i < 500; i++) {
  const S = NL.runLife({ seed: 'Z' + i, country: 'BRA', year0: 1990 });
  for (const e of S.log) {
    const ev = NL.events.find((x) => x.id === e.id);
    if (!ev || !ev.era) continue;
    const y = e.y, a = Array.isArray(ev.era[0]) ? ev.era : [ev.era];
    if (!a.some(([s, t]) => y >= s && y <= t)) outside.push(e.id + '@' + y);
  }
}
ok('年代事件没有跑到区间之外', outside.length === 0, outside.slice(0, 5).join(','));

// ---------- 8. 迁移与圈层切换 ----------
const rich = IDS.filter((id) => ['USA', 'DEU', 'JPN', 'KOR'].includes(id) && run[id].stayed < 0.97);
const poor = IDS.filter((id) => run[id].stayed < 0.45);
ok('跨国迁移率没有失控', rich.length === 0 && poor.length === 0,
  (rich.length ? '欧美日韩迁出过多：' + rich.join(',') + '；' : '') + (poor.length ? '留不住：' + poor.join(',') + '；' : '') +
  IDS.map((id) => id + ':' + (run[id].stayed * 100).toFixed(0) + '%留').join(' '));

console.log('\n结果：' + pass + ' PASS / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
