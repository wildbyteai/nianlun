// 国家／年代验收：经过引擎筛选、决策结算和整局模拟，检查具体反例。
import { load, ROOT } from './loader.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const { NL } = load({eventMode:'legacy'});
const report = { when: new Date().toISOString(), kind: '本地引擎模拟，非真机', checks: [], samples: [], examples: [] };
const ok = (name, pass, detail = '') => {
  report.checks.push({ name, pass: !!pass, detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
};
function fixture(country, y, age, opt = {}) {
  const S = NL.newLife({ seed: 'country-fixture', country, year0: y - age });
  Object.assign(S, { age, school: true, edu: 2, urban: true, q: 3 }, opt);
  return S;
}
function queued(id, country, y, age, opt) {
  const e = NL.events.find(e => e.id === id), keep = e.p;
  const S = fixture(country, y, age, opt);
  try { e.p = 1; return NL.planYear(S).some(x => x.id === id); }
  finally { e.p = keep; }
}
function decision(id, country, y, age, side, opt) {
  const S = fixture(country, y, age, opt), inst = { id };
  const q = NL.askDecision(S, inst);
  const out = NL.choose(S, inst, side, q.q);
  return { S, q, out };
}

ok('大陆高考不会分给港澳或新加坡', queued('cn_gaokao', 'CHN', 2007, 17) &&
  ['HKG', 'MAC', 'SGP'].every(c => !queued('cn_gaokao', c, 2007, 17)));
ok('日本地名和制度事件不会分给韩国或朝鲜',
  ['jk_juken', 'jk_1k', 'jk_obon', 'jk_kouden', 'jk_hikkoshi', 'jk_konbini'].every(id =>
    queued(id, 'JPN', 2025, id === 'jk_juken' ? 18 : 35) &&
    ['KOR', 'PRK'].every(c => !queued(id, c, 2025, id === 'jk_juken' ? 18 : 35))));
ok('德国不触发高额学生贷款卡', !queued('we_loan', 'DEU', 2010, 22, { edu: 3 }));
ok('1990 年代以前不会获得手机或手机钱包', !queued('phone', 'USA', 1980, 20) && !queued('ss_mobilemoney', 'KEN', 1985, 25));
ok('有兄弟姐妹或计划添丁时不说你家只有一个孩子',
  !queued('cn_dusheng', 'CHN', 1998, 8, { sibs: 2 }) &&
  !queued('cn_dusheng', 'CHN', 1998, 8, { sibs: 0, sibPlan: 1 }) &&
  queued('cn_dusheng', 'CHN', 1998, 8, { sibs: 0, sibPlan: 0 }));
ok('1991 年没有同学群', !queued('cn_qun', 'CHN', 1991, 31));
const reunion = decision('cn_qun', 'CHN', 2026, 36, 'L');
ok('毕业届次按出生年份固定', reunion.q.q.includes('2008 届'), reunion.q.q);
const train = decision('cn_gaokao', 'CHN', 1987, 17, 'L');
ok('1987 年上大学的结算不含高铁', !/高铁/.test(train.out.text), train.out.text);

const hkOld = NL.askDecision(fixture('HKG', 2008, 18), { id: 'hk_entrance' });
const hkNew = NL.askDecision(fixture('HKG', 2012, 18), { id: 'hk_entrance' });
ok('香港 2012 年切换文凭试', /高级程度会考/.test(hkOld.q) && /DSE/.test(hkNew.q));
const sgOld = NL.askDecision(fixture('SGP', 2026, 16), { id: 'sg_secondary' });
const sgNew = NL.askDecision(fixture('SGP', 2027, 16), { id: 'sg_secondary' });
ok('新加坡 2027 年切换 SEC', /O 水准/.test(sgOld.q) && /SEC/.test(sgNew.q));
const moOld = NL.askDecision(fixture('MAC', 2016, 18), { id: 'mo_entrance' });
const moNew = NL.askDecision(fixture('MAC', 2017, 18), { id: 'mo_entrance' });
ok('澳门四校联考不会提前到 2017 年以前', !/四校联考/.test(moOld.q) && /四校联考/.test(moNew.q));
const krOld = NL.askDecision(fixture('KOR', 1992, 18), { id: 'kr_entrance' });
const krNew = NL.askDecision(fixture('KOR', 1993, 18), { id: 'kr_entrance' });
ok('韩国修能名称不提前到首次考试以前', !/修能/.test(krOld.q) && /修能/.test(krNew.q));

const oldJob = decision('cn_employment', 'CHN', 1982, 22, 'R', { school: false });
const newJob = decision('cn_employment', 'CHN', 2012, 22, 'R', { school: false });
ok('两代人的就业选择改变职业与结算', oldJob.S.job === 'trade' && newJob.S.job === 'office' && oldJob.out.text !== newJob.out.text);
ok('单位住房和商品房首付不会错用年代',
  queued('cn_unit_housing', 'CHN', 1987, 27, { job: 'factory' }) &&
  !queued('cn_shoufu', 'CHN', 1987, 27) &&
  !queued('cn_unit_housing', 'CHN', 2017, 27, { job: 'factory' }) && queued('cn_shoufu', 'CHN', 2017, 27));
const voc = decision('cn_zhongkao', 'CHN', 2004, 14, 'L');
ok('职业课程不会重复参加普高升学线', voc.S.flags.vocational && !queued('cn_gaokao', 'CHN', 2007, 17, { flags: voc.S.flags }));
const finishVoc = fixture('CHN', 2007, 17, { flags: voc.S.flags });
NL.applyEvent(finishVoc, { id: 'cn_vocational_finish' });
ok('职校结业后进入工作状态', !finishVoc.school && finishVoc.job === 'factory');
const poly = decision('sg_secondary', 'SGP', 2006, 16, 'L');
const jc = decision('sg_secondary', 'SGP', 2006, 16, 'R');
ok('理工学院和初级学院走不同后续路径', poly.S.edu === 3 && jc.S.edu === 2 &&
  !queued('sg_entrance', 'SGP', 2008, 18, { edu: poly.S.edu }) && queued('sg_entrance', 'SGP', 2008, 18, { edu: jc.S.edu }));
const apprentice = decision('de_training', 'DEU', 2006, 16, 'L');
ok('德国培训路径有职业和结业后续', apprentice.S.job === 'factory' && !apprentice.S.school &&
  queued('de_apprentice_finish', 'DEU', 2009, 19, { flags: apprentice.S.flags }) &&
  !queued('de_entrance', 'DEU', 2008, 18, { school: apprentice.S.school }));
const hdb = decision('sg_hdb', 'SGP', 2020, 30, 'R', { married: true });
ok('购房会记录住房和贷款，避免再次买房', hdb.S.flags.home && hdb.S.flags.mortgage &&
  !queued('sg_hdb', 'SGP', 2021, 31, { married: true, flags: hdb.S.flags }));
const rent = decision('kr_jeonse', 'KOR', 2020, 30, 'L');
const deposit = decision('kr_jeonse', 'KOR', 2020, 30, 'R');
ok('韩国月租与全租有不同家底和住房状态', rent.S.flags.housingRoute === 'wolse' && deposit.S.flags.housingRoute === 'jeonse' && rent.S.st.shi !== deposit.S.st.shi);
ok('本地升学节点不和通用大学卡重复', ['CHN', 'HKG', 'MAC', 'SGP', 'JPN', 'KOR', 'USA', 'DEU'].every(c => !queued('university', c, 2007, 17)));
ok('汶川与东日本地震严格使用事发年', !queued('era_wenchuan', 'CHN', 2009, 20) && !queued('era_fukushima', 'JPN', 2012, 20) &&
  queued('era_wenchuan', 'CHN', 2008, 20) && queued('era_fukushima', 'JPN', 2011, 20));

const forbidden = {
  HKG: /中考|普高|省内|外省|春运|单位又贴了分房/,
  MAC: /中考|普高|省内|外省|春运|单位又贴了分房/,
  SGP: /中考|普高|省内|外省|春运|单位又贴了分房/,
  KOR: /东京|新干线|六叠|钱汤|年贺状|町内会|居酒屋/,
  PRK: /东京|新干线|六叠|钱汤|年贺状|町内会|居酒屋/,
};
let bad = [], sameYear = [], count = 0;
for (const country of ['CHN', 'HKG', 'MAC', 'SGP', 'JPN', 'KOR', 'PRK', 'USA', 'DEU']) {
  for (const birth of [1960, 1970, 1980, 1990, 2000, 2010]) {
    let pure = 0; const events = new Set();
    for (let i = 0; i < 80; i++) {
      const S = NL.runLife({ seed: 'country-audit:' + i, country, year0: birth }); count++;
      if (!S.rings.every(r => r.cur === S.born)) continue;
      pure++;
      for (const x of S.log) {
        events.add(x.id);
        const t = [x.q, x.pick, x.text].filter(Boolean).join(' ');
        if (forbidden[country]?.test(t) || /undefined|NaN|\[object/.test(t) ||
            x.y < 1990 && /手机|网吧|同学群|群里|快递柜|手机钱包/.test(t) ||
            country === 'CHN' && x.y < 2008 && /高铁/.test(t)) {
          if (bad.length < 15) bad.push({ country, birth, seed: S.seed, ...x });
        }
      }
      const edu = S.log.filter(x => ['cn_gaokao', 'hk_entrance', 'mo_entrance', 'sg_entrance', 'jk_juken', 'kr_entrance', 'us_college', 'de_entrance', 'university'].includes(x.id));
      if (edu.length > 1) sameYear.push({ country, birth, seed: S.seed, ids: edu.map(x => x.id) });
      if (i === 0) report.examples.push({ country, birth, seed: S.seed, log: S.log.filter(x => /^(cn_|hk_|mo_|sg_|kr_|us_|de_|jk_juken)/.test(x.id)) });
    }
    report.samples.push({ country, birth, count: 80, pure, eventTypes: events.size });
  }
}
ok('九地六个出生年代整局没有已知国家／技术错位', bad.length === 0, count + ' 局');
ok('同一人不会重复走大学录取节点', sameYear.length === 0, JSON.stringify(sameYear.slice(0, 3)));
report.violations = bad;
report.sha256 = {};
for (const file of ['src/events.js', 'src/events_world.js', 'src/events_world2.js', 'src/events_world3.js', 'src/events_era.js', 'src/events_country.js', 'src/engine.js', 'src/gen/cal.js']) {
  report.sha256[file] = createHash('sha256').update(readFileSync(resolve(ROOT, file))).digest('hex');
}
const out = resolve(ROOT, 'validation/country-era-20261110', report.when.replace(/[:.]/g, '-'));
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'engine.json'), JSON.stringify(report, null, 2) + '\n');
console.log('报告：' + resolve(out, 'engine.json'));
console.log(report.checks.filter(c => c.pass).length + ' PASS / ' + report.checks.filter(c => !c.pass).length + ' FAIL');
process.exit(report.checks.every(c => c.pass) ? 0 : 1);
