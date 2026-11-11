/* 国家与年代规则：消费具名配置，不替换 WDI 健康／人口数据。 */
(function (root) {
  'use strict';
  const NL = root.NL, data = root.NL_PROFILES || root.window.NL_PROFILES;
  const { chance } = NL.util;
  const SPECIAL_SCHOOL = new Set(['CHN', 'HKG', 'MAC', 'SGP', 'JPN', 'KOR', 'USA', 'DEU', 'IND', 'BRA', 'NGA']);
  const year = S => S.year0 + S.age;
  const get = c => data.countries[typeof c === 'string' ? c : c.id];
  function at(rows, y) {
    let value = rows[0];
    for (const row of rows) if (row.from <= y) value = row;
    return value;
  }
  function school(S, c) {
    if (S.flags.schoolPlan) return S.flags.schoolPlan;
    const p = get(c), entry = p ? at(p.school, S.year0 + 6) : { entryAge: 6, primaryYears: 6 };
    const later = p ? at(p.school, S.year0 + 18) : { lowerYears: 3, upperYears: 2 };
    return { country: c.id, source: p ? 'profile' : 'game-default', entryAge: entry.entryAge,
      secondaryAge: entry.entryAge + entry.primaryYears,
      upperAge: entry.entryAge + entry.primaryYears + later.lowerYears,
      collegeAge: Math.max(17, entry.entryAge + entry.primaryYears + later.lowerYears + later.upperYears) };
  }
  function enterSchool(S, c) { S.flags.schoolPlan = school(S, c); }
  function degreeYears(S, c) { const p = get(c); return p ? at(p.degree, year(S)).years : 4; }
  function enterDegree(S, c) {
    const years = degreeYears(S, c);
    S.flags.degreePlan = { country: c.id, startAge: S.age, years, endAge: S.age + years };
  }
  function economy(S, c) {
    const p = get(c), y = year(S);
    // 2026 年之后不把旧危机和旧房价延伸为实测。
    return y > NL.NOW_YEAR ? null : (p?.economy || []).filter(r => y >= r.from && y <= r.to)
      .sort((a, b) => b.layoffMultiplier - a.layoffMultiplier)[0] || null;
  }
  function labour(c) {
    const p = get(c);
    return p?.labour.unemploymentRate ?? 6; // 资料缺项的明确游戏默认值，见覆盖清单。
  }
  function role(S, c) {
    if (S.edu >= 3) return chance(0.78) ? 'office' : 'trade';
    if (!S.urban && chance(c.agr / 100 + 0.15)) return 'farm';
    return chance(0.55) ? 'factory' : 'trade';
  }
  function firstJob(S, c) {
    if (isServing(S)) return 'soldier';
    if (chance(labour(c) / 100)) { S.flags.jobSearchAt = S.age; return 'seeking'; }
    return role(S, c);
  }
  function service(S, c) {
    const p = get(c);
    if (!p) return null;
    const y = Math.min(year(S), NL.NOW_YEAR), period = p.servicePeriods.find(r => y >= r.from && y <= r.to);
    const policy = period ? period.policy : p.service;
    const months = policy ? S.sex === 'F' ? policy.womenMonths : policy.menMonths : 0;
    return months ? { months, selection: policy.selection } : null;
  }
  function startService(S, policy) {
    S.flags.service = { startAge: S.age, endAge: S.age + Math.ceil(policy.months / 12), months: policy.months, previousJob: S.job };
    S.job = 'soldier';
  }
  function isServing(S) { return !!S.flags.service && !S.flags.service.done && S.age < S.flags.service.endAge; }
  function canExit(S, c) {
    const y = year(S), p = get(c);
    return S.job !== 'soldier' && !isServing(S) && !(p?.restricted || []).some(r => y >= r.from && y <= r.to);
  }
  function destinations(c) { return (get(c)?.destinations || []).map(id => NL.cby[id]); }
  function housing(S, c) {
    const p = get(c);
    if (!p || p.housingUrbanOnly && !S.urban || year(S) > NL.NOW_YEAR) return null;
    return p.housing.find(r => r.year === year(S)) || null;
  }
  NL.profiles = { info: data.info, get, year, school, enterSchool, enterDegree, degreeYears, labour, role, firstJob,
    economy, service, startService, isServing, canExit, destinations, housing, specialSchool: c => SPECIAL_SCHOOL.has(c.id) };
})(typeof globalThis !== 'undefined' ? globalThis : this);
