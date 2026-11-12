// 引擎统计校验：生命表校准、抽样频率、整局模拟的卒年与决策数量。用法：node tools/verify_sim.mjs [每国局数]
import { load } from './loader.mjs';
const ctx = load({eventMode:'legacy'});
const NL = ctx.NL;
const info = ctx.window.NL_INFO || NL.info;
let pass = 0, fail = 0;
const ok = (name, cond, note = '') => { (cond ? pass++ : fail++); console.log((cond ? 'PASS ' : 'FAIL ') + name + (note ? '  ' + note : '')); };
ok('事件 id 唯一', new Set(NL.events.map((e) => e.id)).size === NL.events.length, NL.events.length + ' 个事件');
ok('没有未成年婚育事件', !NL.events.some((e) => /marry|arranged|kid_born|meet/.test(e.id) && e.a0 < 18));
const dec = NL.events.filter((e) => e.dec);
ok('决策卡数量足够', dec.length >= 50, dec.length + ' 张');
const REQ = ['cradle','fever','mosquito','clinic','school','book','diploma','field','factory','office','road','boat','love','child','home','family','coins','phone','smoke','flood','storm','quake','drought','war','refugee','candle','elder','moon'];
ok('事件插图都在清单内', NL.events.every((e) => REQ.includes(e.icon)), [...new Set(NL.events.filter((e) => !REQ.includes(e.icon)).map((e) => e.icon))].join(','));
// 生命表
let maxErr = 0, mono = true;
for (const c of NL.countries) for (const s of ['M', 'F']) {
  const t = NL.lifeTable(c, s); maxErr = Math.max(maxErr, Math.abs(t.e0 - t.target));
  for (let i = 0; i < 111; i++) if (t.l[i + 1] > t.l[i] + 1e-12) mono = false;
  if (t.q[110] !== 1) mono = false;
}
ok('生命表校准到分性别预期寿命', maxErr < 0.01, '最大误差 ' + maxErr.toFixed(5) + ' 岁');
ok('存活曲线单调', mono);
// 复现性
const a = NL.runLife({ seed: 'ABCD2345' }), b = NL.runLife({ seed: 'ABCD2345' });
ok('同种子同人生', a.born === b.born && a.death.age === b.death.age && a.log.length === b.log.length, a.born + ' ' + a.death.age);
// 出生抽样
const N = 60000, cnt = {};
const rng = NL.makeRng('sample'); NL.withRng(rng, () => { for (let i = 0; i < N; i++) { const c = NL.chooseCountry(); cnt[c.id] = (cnt[c.id] || 0) + 1; } });
let maxDev = 0; for (const c of [...NL.countries].sort((x, y) => y.b - x.b).slice(0, 8)) maxDev = Math.max(maxDev, Math.abs(cnt[c.id] / N - c.share) * 100);
ok('出生抽样贴合出生占比', maxDev < 0.5, '前 8 国最大偏差 ' + maxDev.toFixed(2) + ' pp');
// 整局模拟
const per = +(process.argv[2] || 3000);
const calIds = ['NGA','TCD','IND','PAK','BGD','IDN','CHN','BRA','MEX','USA','DEU','JPN','UKR','AFG','ZAF'];
function simulate(id, n) {
  let sum = 0, dec = 0, marks = 0, long = 0, ages = [], moved = 0, stay = 0, staySum = 0;
  for (let i = 0; i < n; i++) {
    const S = NL.runLife({ seed: 'V' + id + ':' + i, country: id });
    // 「留守」= 一生没换国家。生命表是全国平均，本身就含国内迁移的人，
    // 所以这里不再按是否搬过家筛选，否则样本会被偏成「从没离开过村子的人」，比全国平均低 2–4 岁。
    if (S.cur === S.born) { stay++; staySum += S.death.age; }
    sum += S.death.age; ages.push(S.death.age); dec += S.log.filter((e) => e.side).length;
    if (S.death.age >= 60) long += 1; if (S.cur !== S.born) moved++;
    marks += S.rings.reduce((x, r) => x + r.m.length, 0);
  }
  return { mean: sum / n, stayMean: stay ? staySum / stay : sum / n, dec: dec / n, marks: marks / n, moved: moved / n };
}
// 校准：逐步调整全局系数，让加权误差接近 0
function tableMean(c) { // 生命表给出的平均整数卒年（与模拟口径一致，男女按出生性别比加权）
  const w = c.srb / (1 + c.srb);
  const mean = (t) => { let s = 0; for (let a = 0; a <= 110; a++) s += (t.l[a] - t.l[a + 1]) * a; return s; };
  return w * mean(NL.lifeTable(c, 'M')) + (1 - w) * mean(NL.lifeTable(c, 'F'));
}

const rows = [];
let weighted = 0, ww = 0, maxGap = 0;
for (const id of calIds) {
  const c = NL.cby[id]; const r = simulate(id, per); const t = tableMean(c);
  rows.push(`${c.zh.padEnd(6, '　')} 留守 ${r.stayMean.toFixed(1).padStart(5)} / 生命表 ${t.toFixed(1).padStart(5)}  全体 ${r.mean.toFixed(1).padStart(5)}  决策 ${r.dec.toFixed(1).padStart(4)}  迁移 ${(r.moved*100).toFixed(0).padStart(3)}%`);
  if (c.war >= 0.5) { rows[rows.length - 1] += '  （战乱国：留守者本身就是没逃出去的人，只列示）'; continue; }
  weighted += Math.abs(r.stayMean - t) * c.b; ww += c.b; maxGap = Math.max(maxGap, Math.abs(r.stayMean - t));
}
console.log(rows.join('\n'));
ok('非战乱国未出国人生的平均卒年贴合生命表', weighted / ww < 1.2 && maxGap < 2.5, '出生加权平均偏差 ' + (weighted / ww).toFixed(2) + ' 岁，最大 ' + maxGap.toFixed(2));
// 文案健全
let bad = 0, sample = [];
for (let i = 0; i < 300; i++) {
  const S = NL.runLife({ seed: 'TXT' + i });
  for (const e of S.log) if (typeof e.text !== 'string' || /undefined|NaN|null|\[object/.test(e.text) || !e.text.trim()) { bad++; sample.push(e.id); }
  if (!S.death.line && S.death.cause !== 'hiv') { bad++; sample.push('death:' + S.death.cause); }
}
ok('300 局文案没有占位符或空文本', bad === 0, sample.slice(0, 6).join(','));
const seen = new Set(); for (let i = 0; i < 1500; i++) for (const e of NL.runLife({ seed: 'COV' + i }).log) seen.add(e.id);
const never = NL.events.filter((e) => !seen.has(e.id)).map((e) => e.id);
console.log('1500 局覆盖事件 ' + seen.size + '/' + NL.events.length + (never.length ? '  未触发: ' + never.join(' ') : ''));
console.log(`\n结果：${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
