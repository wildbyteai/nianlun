/* 共用路径读取国家配置；已核对的国家特殊路径仍由 events_country*.js 处理。 */
(function (root) {
  'use strict';
  const NL = root.NL, P = NL.profiles;
  const { fx, mark } = NL.util;
  NL.register([
    {
      id: 'profile_upper', a0: 12, a1: 20, p: 1, once: true, dec: true, rank: 6, icon: 'book',
      if: (S, c) => !P.specialSchool(c) && S.school && S.edu === 2 && S.age === P.school(S, c).upperAge,
      ask: () => '这一阶段读完了。继续读完中学，还是先学技术、找工作？',
      L: { t: '先学技术', run(S) { S.school = false; S.job = 'trade'; S.flags.studyRoute = 'skills'; fx(S, { shi: 4, ye: 2 }); return '你收起课本，开始学一门手艺。工具、车费和第一批活，要慢慢凑起来。'; } },
      R: { t: '继续读书', run(S) { S.flags.seniorSecondary = true; fx(S, { shi: 4, ye: -2 }); return '你接着读。课本加深了，离申请高等教育还要走一段。'; } },
      ai: 0.65,
    },
    {
      id: 'profile_jobsearch', a0: 14, a1: 68, p: 1, cool: 1, rank: 2, icon: 'office',
      if: S => !S.school && S.job === 'seeking' && !P.isServing(S),
      run(S, c) {
        S.job = P.firstJob(S, c);
        if (S.job === 'seeking') { fx(S, { shi: -2, ye: -2 }); return '投出的申请还没回音。你重新整理经历，托人打听，也把下一月的开支压了一遍。'; }
        S.flags.jobSearchAt = null; fx(S, { shi: 3, ye: 3 });
        return S.job === 'office' ? '一份申请有了回音。你接受文职岗位，重新安排通勤和家里的时间。' : S.job === 'factory' ? '你找到一份生产岗位。从认工具和跟班做起，月底终于又有进账。' : S.job === 'farm' ? '你先接过家里的农活。季节和地里的事，成了眼下每天要安排的工作。' : '你接上了新的活。先把这一笔做好，再慢慢找下一位客人。';
      },
    },
    {
      id: 'profile_service', a0: 18, a1: 25, once: true, p: 0.16, icon: 'war',
      if: (S, c) => root.NL_CUL.cultureOf(c) !== 'eur' && !S.school && !S.flags.service && !!P.service(S, c),
      run(S, c) { const policy = P.service(S, c); P.startService(S, policy); fx(S, { gen: 2, ye: -4, zhi: -2 }); return `你接到服役安排，登记的役期是 ${policy.months} 个月。工作先放下，家里的事另作安排。`; },
    },
    {
      id: 'profile_service_end', a0: 19, a1: 40, once: true, p: 1, rank: 7, icon: 'road',
      if: S => S.flags.service && !S.flags.service.done && S.age >= S.flags.service.endAge,
      run(S) { if (S.job === 'soldier') S.job = S.flags.service.previousJob || 'seeking'; S.flags.service.done = true; fx(S, { ye: 4, zhi: 3 }); return '登记的役期结束了。你回到日常生活，联系原来的工作，也打听新的机会。'; },
    },
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
