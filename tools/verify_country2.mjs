// 三国年代路径验收：制度边界、真实选择结算、关联后续和整局内容检查。
import { load, ROOT } from './loader.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const { NL } = load();
const report = { when: new Date().toISOString(), kind: '本地引擎模拟，非真机', checks: [], samples: [], examples: [] };
function ok(name, pass, detail = '') {
  report.checks.push({ name, pass: !!pass, detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
}
function fixture(country, y, age, opt = {}) {
  const S = NL.newLife({ seed: 'country2-fixture', country, year0: y - age });
  return Object.assign(S, { age, school: true, edu: 2, urban: true, q: 3 }, opt);
}
function queued(id, country, y, age, opt = {}) {
  const e = NL.events.find(e => e.id === id);
  if (!e) return false; // 旧圈层升学卡已由统一配置路径替代。
  const p = e.p;
  try { e.p = 1; return NL.planYear(fixture(country, y, age, opt)).some(x => x.id === id); }
  finally { e.p = p; }
}
function decision(id, country, y, age, side, opt = {}) {
  const S = fixture(country, y, age, opt), inst = { id };
  const q = NL.askDecision(S, inst), out = NL.choose(S, inst, side, q.q);
  return { S, q, out };
}
const ask = (id, c, y, age) => NL.askDecision(fixture(c, y, age), { id }).q;
const worker = { school: false, job: 'trade' };

ok('三国升学替代通用大学卡', ['IND', 'BRA', 'NGA'].every(c => !queued('university', c, 2008, 17)));
ok('印度不再重复南亚圈的十年级／JEE／默认婚配／客服节点',
  ['sa_board', 'sa_jee', 'sa_rishta', 'sa_dowry', 'sa_callcenter'].every(id => !queued(id, 'IND', 2010, id === 'sa_board' ? 16 : id === 'sa_jee' ? 18 : 25)));
const skills = decision('in_secondary', 'IND', 2006, 16, 'L');
const senior = decision('in_secondary', 'IND', 2006, 16, 'R');
ok('印度十年级后继续读高中仍为中等教育，学艺会退出升学线', senior.S.edu === 2 && senior.S.school &&
  !skills.S.school && skills.S.job === 'trade' && !queued('in_entrance', 'IND', 2008, 18, { school: skills.S.school, edu: skills.S.edu }));
ok('印度 JEE Main／Advanced 名称从 2013 年开始', !/Main|Advanced/.test(ask('in_entrance', 'IND', 2012, 18)) && /Main.*Advanced/.test(ask('in_entrance', 'IND', 2013, 18)));
ok('印度新品种试种限早期农村家庭', queued('in_crop_trial', 'IND', 1970, 10, { urban: false }) &&
  !queued('in_crop_trial', 'IND', 1965, 10, { urban: false }) && !queued('in_crop_trial', 'IND', 1990, 10, { urban: false }) &&
  !queued('in_crop_trial', 'IND', 1970, 10, { urban: true }));
ok('印度早期厂工和改革后新岗位按 1991 年分开', queued('in_factory_early', 'IND', 1990, 25, worker) &&
  !queued('in_factory_early', 'IND', 1991, 25, worker) && !queued('in_services', 'IND', 1990, 25, worker) && queued('in_services', 'IND', 1991, 25, worker));
const oldJob = decision('in_factory_early', 'IND', 1985, 23, 'L', worker);
const serviceJob = decision('in_services', 'IND', 2013, 23, 'R', worker);
ok('印度厂工／服务业选择改变职业、居住与家庭联系', oldJob.S.job === 'factory' && serviceJob.S.job === 'office' &&
  serviceJob.S.urban && serviceJob.S.migrated && serviceJob.S.flags.inWork === 'business-services' && oldJob.out.d.zhi !== serviceJob.out.d.zhi);
ok('印度学校热餐只给 2002 年起在校儿童', !queued('in_school_meal', 'IND', 2001, 8) && queued('in_school_meal', 'IND', 2002, 8) &&
  !queued('in_school_meal', 'IND', 2005, 8, { school: false }));
ok('印度换钞仅在 2016 年出现，UPI 商户卡不提前', queued('in_cash2016', 'IND', 2016, 30, worker) &&
  [2015, 2017].every(y => !queued('in_cash2016', 'IND', y, 30, worker)) &&
  !queued('in_upi', 'IND', 2016, 30, { ...worker, flags: { phone: true } }) && queued('in_upi', 'IND', 2017, 30, { ...worker, flags: { phone: true } }));
const cash = decision('in_upi', 'IND', 2020, 30, 'L', worker);
const upi = decision('in_upi', 'IND', 2020, 30, 'R', worker);
ok('印度收款选择有不同状态，并要求已有手机', cash.S.flags.inPayment === 'cash' && upi.S.flags.inPayment === 'upi' &&
  cash.S.st.shi !== upi.S.st.shi && !queued('in_upi', 'IND', 2020, 30, worker));
const married = { married: true, spouse: { alive: true } };
const joint = decision('in_family', 'IND', 2010, 28, 'L', married);
const separate = decision('in_family', 'IND', 2010, 28, 'R', married);
ok('印度同住选择决定后续大家庭事件，不给未婚人物默认配偶',
  queued('sa_joint', 'IND', 2011, 29, { ...married, flags: joint.S.flags }) &&
  !queued('sa_joint', 'IND', 2011, 29, { ...married, flags: separate.S.flags }) && !queued('in_family', 'IND', 2010, 28));
ok('巴西升学区分 Vestibular／ENEM／Sisu', /Vestibular/.test(ask('br_entrance', 'BRA', 1997, 18)) &&
  !/Sisu/.test(ask('br_entrance', 'BRA', 2009, 18)) && /ENEM.*Sisu/.test(ask('br_entrance', 'BRA', 2010, 18)));
ok('巴西高通胀日常不会延续到雷亚尔之后', queued('br_inflation', 'BRA', 1993, 30, worker) && !queued('br_inflation', 'BRA', 1994, 30, worker) &&
  !queued('la_inflacion', 'BRA', 2020, 30, worker) && queued('br_real94', 'BRA', 1994, 30) && !queued('br_real94', 'BRA', 1995, 30));
const formal = decision('br_work', 'BRA', 2019, 25, 'L', worker);
const independent = decision('br_work', 'BRA', 2019, 25, 'R', worker);
ok('巴西正式岗位和接活会进入不同职业与登记后续', formal.S.job === 'office' && formal.S.flags.brWork === 'registered' &&
  independent.S.job === 'trade' && !queued('br_mei', 'BRA', 2020, 26, { ...worker, job: formal.S.job, flags: formal.S.flags }) &&
  queued('br_mei', 'BRA', 2020, 26, { ...worker, flags: independent.S.flags }));
ok('巴西劳动记录名称在 2019 年切换', !/电子/.test(ask('br_work', 'BRA', 2018, 25)) && /电子/.test(ask('br_work', 'BRA', 2019, 25)));
const mei = decision('br_mei', 'BRA', 2015, 30, 'R', worker);
ok('巴西 MEI 从 2009 年起，选择会记录经营登记', !queued('br_mei', 'BRA', 2008, 30, worker) && queued('br_mei', 'BRA', 2009, 30, worker) && mei.S.flags.businessRegistered);
const kid = { kids: [{ alive: true, y: 25 }], q: 2 };
ok('巴西家庭支持只给相应年份有孩子的低家底家庭',
  [2004, 2020, 2023].every(y => queued('br_family_support', 'BRA', y, 30, kid)) &&
  [2003, 2021, 2022].every(y => !queued('br_family_support', 'BRA', y, 30, kid)) &&
  !queued('br_family_support', 'BRA', 2024, 30, { q: 2 }) && !queued('br_family_support', 'BRA', 2024, 30, { ...kid, q: 4 }));
ok('巴西 SUS 与 Pix 不提前出现', !queued('br_sus', 'BRA', 1989, 55) && queued('br_sus', 'BRA', 1990, 55) &&
  !queued('br_pix', 'BRA', 2019, 30, { ...worker, flags: { phone: true } }) && queued('br_pix', 'BRA', 2020, 30, { ...worker, flags: { phone: true } }));
const pix = decision('br_pix', 'BRA', 2020, 30, 'R', worker);
ok('巴西 Pix 需要已有手机且结算记录收款方式', pix.S.flags.brPayment === 'pix' && !queued('br_pix', 'BRA', 2020, 30, worker));
const selfBuild = decision('br_housing', 'BRA', 2008, 30, 'R');
const applyHome = decision('br_housing', 'BRA', 2009, 30, 'R');
ok('巴西自建和申请住房不是同一个结果，申请不直接获得房产', selfBuild.S.flags.home && applyHome.S.flags.housingApplication && !applyHome.S.flags.home);
ok('巴西不默认走北上美国、美国亲戚汇款或山坡占地线', ['la_emigrar', 'la_remesa', 'la_ladera'].every(id => !queued(id, 'BRA', 2015, 30, worker)));
ok('尼日利亚升学区分独立招生／JAMB／UTME／全面机考', !/JAMB|UTME/.test(ask('ng_entrance', 'NGA', 1977, 18)) &&
  /JAMB/.test(ask('ng_entrance', 'NGA', 1978, 18)) && /UTME/.test(ask('ng_entrance', 'NGA', 2010, 18)) &&
  !/机考/.test(ask('ng_entrance', 'NGA', 2014, 18)) && /机考/.test(ask('ng_entrance', 'NGA', 2015, 18)));
const apprentice = decision('ng_entrance', 'NGA', 2008, 18, 'L');
const apprenticeS = fixture('NGA', 2011, 21, { school: false, flags: { ...apprentice.S.flags } });
NL.applyEvent(apprenticeS, { id: 'ng_apprentice_finish' });
ok('尼日利亚学徒有三年后的独立接活和中年传艺', !apprentice.S.school && apprentice.S.job === 'trade' &&
  !queued('ng_apprentice_finish', 'NGA', 2010, 20, { flags: apprentice.S.flags }) &&
  queued('ng_apprentice_finish', 'NGA', 2011, 21, { flags: apprentice.S.flags }) &&
  apprenticeS.flags.ngApprenticeDone && apprenticeS.job === 'trade' && queued('ng_mentor', 'NGA', 2035, 45, { flags: apprenticeS.flags }));
ok('尼日利亚已转行不会被旧学徒结业覆盖职业', !queued('ng_apprentice_finish', 'NGA', 2011, 21, { flags: { ngApprenticeAt: 18, ngWork: 'film' } }));
ok('尼日利亚 1986 年前后有不同的进货与工作节点', queued('ng_trade_early', 'NGA', 1985, 25, worker) && !queued('ng_trade_early', 'NGA', 1986, 25, worker) &&
  !queued('ng_sap', 'NGA', 1985, 25, worker) && queued('ng_sap', 'NGA', 1986, 25, worker) && !queued('ng_sap', 'NGA', 1994, 25, worker));
ok('尼日利亚普通手机和 GSM 生意从 2001 年开始', ['phone', 'era_mobile', 'ng_gsm'].every(id => !queued(id, 'NGA', 2000, 25, worker)) &&
  queued('ng_gsm', 'NGA', 2001, 25, worker));
const gsm = decision('ng_gsm', 'NGA', 2002, 25, 'R', worker);
ok('尼日利亚 GSM 选择记录手机与职业，避免重复首次买手机', gsm.S.flags.phone && gsm.S.job === 'trade' && !queued('phone', 'NGA', 2003, 26, { flags: gsm.S.flags }));
ok('尼日利亚代理银行从 2013 年起，替代泛非手机钱包卡', !queued('ng_agentbank', 'NGA', 2012, 30, worker) &&
  queued('ng_agentbank', 'NGA', 2013, 30, worker) && !queued('ss_mobilemoney', 'NGA', 2013, 30));
const tape = decision('ng_screen', 'NGA', 1995, 25, 'R', worker);
const online = decision('ng_screen', 'NGA', 2018, 25, 'R', worker);
ok('尼日利亚影视工作随年代更换载体，保留职业与传艺后续', tape.S.flags.ngMedia === 'tape' && online.S.flags.ngMedia === 'online' &&
  online.S.flags.ngWork === 'film' && /剪辑/.test(online.out.text) && queued('ng_mentor', 'NGA', 2040, 47, { flags: online.S.flags }));
const sharedPower = decision('ng_power', 'NGA', 2010, 30, 'L', worker);
const ownPower = decision('ng_power', 'NGA', 2010, 30, 'R', worker);
ok('尼日利亚用电选择有不同成本、关系与设备状态', sharedPower.S.flags.ngPower === 'shared' && ownPower.S.flags.ngPower === 'own' &&
  sharedPower.S.st.shi !== ownPower.S.st.shi && sharedPower.S.st.zhi !== ownPower.S.st.zhi);
ok('尼日利亚只给已婚且配偶健在的人物家庭聚会选择', !queued('ng_family', 'NGA', 2010, 28) && queued('ng_family', 'NGA', 2010, 28, married) &&
  !queued('ss_bride', 'NGA', 2010, 28));
ok('尼日利亚奥运夺冠严格在 1996 年，城市学生不默认走牧牛或长途上学线', queued('ng_olympics96', 'NGA', 1996, 10) &&
  !queued('ng_olympics96', 'NGA', 1997, 10) && !queued('ss_cattle', 'NGA', 2010, 10) && !queued('ss_walk_school', 'NGA', 2010, 10) &&
  !queued('ss_fees', 'NGA', 2010, 10, { school: false }));

const ids = NL.events.filter(e => /^(in_|br_|ng_)/.test(e.id));
ok('新国家事件不会泄漏到邻国或其他目标国家', ids.every(e => ['IND', 'BRA', 'NGA', 'PAK', 'MEX', 'GHA'].filter(c => !e.iso.includes(c)).every(c =>
  !queued(e.id, c, 2020, e.a0, { ...worker, ...married, flags: { phone: true } }))));

const bounds = { in_crop_trial: [1966, 1989], in_factory_early: [1960, 1990], in_services: [1991, 9999], in_school_meal: [2002, 9999],
  in_cash2016: [2016, 2016], in_upi: [2017, 9999], br_inflation: [1980, 1993], br_real94: [1994, 1994], br_sus: [1990, 9999],
  br_pix: [2020, 9999], br_mei: [2009, 9999], ng_trade_early: [1970, 1985], ng_sap: [1986, 1993], ng_gsm: [2001, 2012],
  ng_screen: [1993, 9999], ng_agentbank: [2013, 9999], ng_olympics96: [1996, 1996] };
const admissions = new Set(['university', 'sa_jee', 'in_entrance', 'br_entrance', 'ng_entrance']);
const seen = {}, bad = [], duplicates = [];
let total = 0;
for (const country of ['IND', 'BRA', 'NGA']) for (const birth of [1960, 1970, 1980, 1990, 2000, 2010]) {
  let pure = 0, ownEvents = 0, withOwn = 0;
  const stateCounts = {};
  for (let i = 0; i < 200; i++) {
    const S = NL.runLife({ country, year0: birth, seed: 'country2-audit:' + i }); total++;
    if (!S.rings.every(r => r.cur === S.born)) continue;
    pure++;
    const own = S.log.filter(x => /^(in_|br_|ng_)/.test(x.id));
    if (own.length) withOwn++;
    ownEvents += own.length;
    if (S.log.filter(x => admissions.has(x.id)).length > 1) duplicates.push({ country, birth, seed: S.seed });
    for (const x of S.log) {
      if (/^(in_|br_|ng_)/.test(x.id)) seen[x.id] = (seen[x.id] || 0) + 1;
      const text = [x.q, x.pick, x.text].filter(Boolean).join(' '), b = bounds[x.id];
      const invalid = /undefined|NaN|\[object/.test(text) || b && (x.y < b[0] || x.y > b[1]) ||
        x.y < 2013 && /JEE Main|Advanced/.test(text) || x.y < 2010 && /Sisu|UTME/.test(text) ||
        x.y < 2020 && /Pix/.test(text) || x.y < 2017 && /UPI/.test(text) ||
        country === 'NGA' && x.y < 2001 && /手机|GSM/.test(text) ||
        country === 'IND' && ['sa_board', 'sa_jee', 'sa_rishta', 'sa_dowry', 'sa_callcenter'].includes(x.id) ||
        country === 'BRA' && ['la_inflacion', 'la_emigrar', 'la_remesa', 'la_ladera'].includes(x.id) ||
        country === 'NGA' && ['ss_mobilemoney', 'ss_bride'].includes(x.id);
      if (invalid && bad.length < 20) bad.push({ country, birth, seed: S.seed, ...x });
    }
    for (const [k, v] of Object.entries(S.flags).filter(([k]) => /^(in[A-Z]|br[A-Z]|ng[A-Z])/.test(k))) {
      const key = k + '=' + v; stateCounts[key] = (stateCounts[key] || 0) + 1;
    }
    if (report.examples.filter(e => e.country === country && e.birth === birth).length < 2 && own.length >= 4)
      report.examples.push({ country, birth, seed: S.seed, age: S.age, log: own });
  }
  report.samples.push({ country, birth, count: 200, pure, withOwn, ownEvents, stateCounts });
}
ok('三国六个出生年代整局没有已知技术／制度错位或坏文案', bad.length === 0, total + ' 局');
ok('整局不会重复大学录取', duplicates.length === 0, JSON.stringify(duplicates.slice(0, 3)));
ok('30 个新增节点均在自然抽样中出现', ids.every(e => seen[e.id]), '未覆盖：' + ids.filter(e => !seen[e.id]).map(e => e.id).join(','));
report.violations = bad;
report.coverage = seen;
report.sha256 = {};
for (const file of ['src/engine.js', 'src/events.js', 'src/events_world2.js', 'src/events_world3.js', 'src/events_era.js', 'src/events_country2.js', 'src/era.js', 'src/gen/cal.js'])
  report.sha256[file] = createHash('sha256').update(readFileSync(resolve(ROOT, file))).digest('hex');
const out = resolve(ROOT, 'validation/india-brazil-nigeria-20261110', report.when.replace(/[:.]/g, '-'));
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'engine.json'), JSON.stringify(report, null, 2) + '\n');
console.log('报告：' + resolve(out, 'engine.json'));
console.log(report.checks.filter(c => c.pass).length + ' PASS / ' + report.checks.filter(c => !c.pass).length + ' FAIL');
process.exit(report.checks.every(c => c.pass) ? 0 : 1);
