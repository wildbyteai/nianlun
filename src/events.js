/* 年轮 · 事件库（原创文案）
 * 字段：id、a0/a1 年龄区间、p 每年触发概率（>=1 为必然发生）、once 一生一次、cool 冷却年数、
 *       sex 限定性别、if 前置条件、icon 插图名、rank 同年排序（大者先出）。
 * 普通事件 run(S,c) 返回文案；决策 dec:true，ask(S,c) 给题面，L/R 两个选项各自 run，ai 是自动选右的概率。
 */
(function (root) {
  'use strict';
  const NL = root.NL;
  const P = NL.profiles;
  const U = NL.util;
  const { ri, pick, chance, clamp, fx, mark, risk, normal, drawDeathAge, pickDest, pickRefuge } = U;
  const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const low = (c) => c.inc === 'LIC' || c.inc === 'LMC';
  const place = (S) => (S.urban ? '街坊' : '村里');
  const has = (c, h) => (c.haz || '').includes(h);
  const aliveKids = (S) => S.kids.filter((k) => k.alive);

  function makeSpouse(S, c) {
    const sSex = S.sex === 'F' ? 'M' : 'F';
    const sAge = clamp(S.age + (S.sex === 'F' ? ri(0, 6) : -ri(0, 4)), 18, 95);
    const dAge = drawDeathAge(c, sSex, sAge);
    return { age0: sAge, at: S.age, dieAt: S.age + Math.max(1, dAge - sAge), alive: true };
  }
  const kidPlan = (c) => Math.max(1, Math.round(normal(c.tfr * 1.05, 1)));
  function firstJob(S, c) {
    return P.firstJob(S, c);
  }
  function jobText(S) {
    if (S.job === 'seeking') return '你开始找工作。递交申请、等回音，眼下先把开支安排好。';
    if (S.job === 'farm') return '你跟着家里下地，一年到头看天吃饭。';
    if (S.job === 'factory') return `你进了${pick(['服装厂', '电子厂', '砖厂', '食品厂'])}，一天站十个小时。`;
    if (S.job === 'office') return '你在城里找到一份坐办公室的工作。';
    return `你${pick(['在街口摆了个摊', '在饭馆后厨帮工', '跑起了摩的', '在工地上搬砖'])}。`;
  }

  const E = [
    // ---------------- 出生与婴儿 ----------------
    {
      id: 'birth', a0: 0, a1: 0, p: 1, once: true, icon: 'cradle', rank: 9,
      run(S, c) {
        const hosp = chance(c.att / 100);
        const kg = clamp(normal(3.25 - c.u5 / 400, 0.42), 1.6, 4.6);
        S.flags.kg = Math.round(kg * 10) / 10;
        let t = hosp
          ? (S.urban ? `${S.year0} 年，你在${c.zh}的一家医院出生，${S.flags.kg} 公斤。` : `${S.year0} 年，你在镇上的卫生院出生，${S.flags.kg} 公斤。`)
          : `${S.year0} 年，你在家里出生。接生的是${S.urban ? '隔壁的大婶' : '村里的老人'}，剪刀在火上烤过。`;
        t += S.sibOlder > 0 ? `上面有 ${S.sibOlder} 个哥哥姐姐。` : '你是家里第一个孩子。';
        if (!hosp) fx(S, { gen: -2 });
        if (S.flags.kg < 2.5) { fx(S, { gen: -8 }); mark(S, 'frost'); t += '你太小了，哭声像小猫。'; }
        return t;
      },
    },
    {
      id: 'mother_birth', a0: 0, a1: 0, p: 1, once: true, icon: 'candle', rank: 8,
      if: (S) => S.parents.momBirth,
      run(S) { fx(S, { ye: -10, zhi: -12, gen: -4 }); mark(S, 'frost'); S.parents.mDone = true; return '你出生那天，母亲没能挺过来。'; },
    },
    {
      id: 'first_step', a0: 1, a1: 1, p: 0.92, once: true, icon: 'child',
      run(S) { fx(S, { ye: 3 }); return `你会走路了。你说的第一个词是「${pick(['妈', '爸', '饭', '灯', '狗', '不', '要'])}」。`; },
    },
    {
      id: 'sick_baby', a0: 0, a1: 4, cool: 1, icon: 'fever',
      p: (S, c) => clamp(c.u5 / 1000 * 2.4 + (100 - c.wat) / 100 * 0.1, 0.02, 0.4),
      run(S, c) {
        const kind = U.wpick({ dia: 100 - c.wat + 5, pne: 30, fev: 25 });
        const t0 = kind === 'dia' ? '你拉了好几天肚子，眼窝都陷了下去。' : kind === 'pne' ? '你得了肺炎，夜里咳得喘不上气。' : '你连着烧了三天。';
        const care = chance(clamp((S.urban ? 0.6 : 0.3) + (S.q - 3) * 0.12 + c.att / 300, 0.1, 0.95));
        if (care) { fx(S, { gen: -5 }); return t0 + (S.urban ? '家里连夜抱你去了医院。' : '家里借了辆摩托，把你送到镇上。'); }
        fx(S, { gen: -12 }); mark(S, 'scar'); risk(S, 1.8, kind === 'dia' ? 'dia' : 'inf');
        return t0 + '最近的诊所在二十里外，家里只能守着你。';
      },
    },
    {
      id: 'malaria', a0: 0, a1: 75, cool: 2, icon: 'mosquito',
      if: (S, c) => c.mal > 5,
      p: (S, c) => clamp(c.mal / 1000 * (S.age < 5 ? 0.8 : 0.3), 0, 0.3),
      run(S) {
        const net = chance(0.55 + (S.q - 3) * 0.1);
        const t = (net ? '家里有蚊帐，可那晚它破了个洞。' : '雨季来了，蚊子也来了。') + '你得了疟疾，烧得说胡话。';
        if (S.age < 5) { fx(S, { gen: -14 }); mark(S, 'scar'); risk(S, 2.2, 'mal'); } else { fx(S, { gen: -7 }); risk(S, 1.3, 'mal'); }
        return t;
      },
    },
    {
      id: 'vaccine', a0: 1, a1: 1, once: true, icon: 'clinic', p: (S, c) => c.vac / 100 * 0.85,
      run(S) { fx(S, { gen: 4 }); return '该打的疫苗都打上了。你哭了一下午，换来一辈子少生几场病。'; },
    },
    {
      id: 'measles', a0: 1, a1: 6, once: true, icon: 'fever',
      if: (S, c) => c.vac < 90, p: (S, c) => (100 - c.vac) / 100 * 0.12,
      run(S) { fx(S, { gen: -9 }); mark(S, 'scar'); risk(S, 1.6, 'mea'); return `${S.urban ? '幼儿园' : '村子'}里闹麻疹，你也没躲过。`; },
    },
    {
      id: 'hunger', a0: 1, a1: 6, cool: 2, icon: 'field',
      if: (S, c) => S.q <= 2 && c.u5 > 20, p: (S, c) => clamp((c.u5 - 15) / 350, 0, 0.3),
      run(S) { fx(S, { gen: -7, shi: -3 }); mark(S, 'dry'); risk(S, 1.3, 'mnut'); return '家里的粮食不够吃。你比同龄的孩子矮了半个头。'; },
    },
    {
      id: 'sibling', a0: 1, a1: 14, icon: 'cradle', p: 0.4,
      if: (S) => S.sibPlan > 0,
      run(S) {
        S.sibPlan--; S.sibs++;
        fx(S, { zhi: 3, ye: S.q <= 2 ? -1 : 1 });
        return `家里又添了一个${chance(0.5) ? '弟弟' : '妹妹'}。` + (S.q <= 2 ? '饭桌上又多了一双筷子。' : '');
      },
    },
    {
      id: 'power', a0: 2, a1: 40, once: true, icon: 'home',
      if: (S) => S.flags.noPower, p: (S, c) => 0.06 + c.ele / 1200,
      run(S) { delete S.flags.noPower; fx(S, { ye: 5, shi: 3 }); mark(S, 'bloom'); return `${S.urban ? '你家' : '村里'}通电了。你盯着那只灯泡，看了一晚上。`; },
    },
    {
      id: 'water', a0: 4, a1: 14, once: true, icon: 'road', p: 0.25,
      if: (S, c) => c.wat < 85 && !S.urban,
      run(S) { fx(S, { gen: -2, shi: -2 }); return `每天天不亮，你就提着桶去${pick(['河边', '井边', '山脚的泉眼'])}打水，来回一个钟头。`; },
    },

    // ---------------- 童年 ----------------
    {
      id: 'school_start', a0: 4, a1: 8, p: 1, once: true, icon: 'school', rank: 5,
      if: (S, c) => S.age === P.school(S, c).entryAge,
      run(S, c) {
        P.enterSchool(S, c);
        const pIn = clamp(0.55 + c.sec / 220 + (S.q - 3) * 0.08 + (S.urban ? 0.1 : 0) - (S.sex === 'F' && c.cm > 20 ? 0.1 : 0), 0.25, 0.995);
        if (chance(pIn)) {
          S.school = true; S.edu = 1; fx(S, { shi: 5, zhi: 3 });
          return '你背上书包去上学了。' + (S.urban ? '学校门口有卖糖的。' : '去学校的路，要走一个钟头。');
        }
        S.flags.noSchool = true; fx(S, { shi: -8 });
        return S.urban ? '家里交不起学费。你开始在街上帮大人看摊。' : '最近的学校在山那边。你开始帮家里放羊。';
      },
    },
    {
      id: 'top_student', a0: 7, a1: 17, cool: 4, icon: 'book',
      if: (S) => S.school, p: (S) => clamp(0.07 + (S.st.shi - 50) / 500, 0.02, 0.2),
      run(S) { fx(S, { shi: 6, ye: 4 }); return '你考了全班第一。家里把奖状贴在了墙上最显眼的地方。'; },
    },
    {
      id: 'best_friend', a0: 6, a1: 16, once: true, icon: 'love', p: 0.18,
      run(S) { fx(S, { zhi: 8, ye: 4 }); return `你交到了一个最好的朋友。你们${pick(['一起逃过课', '在河里摸过鱼', '分过同一根冰棍', '交换过秘密'])}。`; },
    },
    {
      id: 'bully', a0: 7, a1: 15, cool: 5, icon: 'moon', p: 0.05,
      run(S) { fx(S, { ye: -6, zhi: -3 }); return '几个大孩子在放学路上堵住了你。你没跟家里说。'; },
    },
    {
      id: 'child_work', a0: 7, a1: 14, cool: 3, icon: 'field', p: 0.25,
      if: (S) => !S.school && S.q <= 3,
      run(S) { fx(S, { gen: -3, shi: -2, ye: -2 }); return `你每天${pick(['天不亮就下地', '在砖窑搬砖', '在集市上帮人卸货', '给人家放牛'])}，挣的钱刚够买一点米。`; },
    },
    {
      id: 'phone', a0: 9, a1: 45, once: true, icon: 'phone', era: [1997, 9999],
      if: (S, c) => !S.flags.phone && (c.id !== 'NGA' || S.year0 + S.age >= 2001),
      p: (S, c) => c.net / 100 * (S.age < 14 ? 0.08 : 0.25) * (S.q >= 3 ? 1.3 : 0.8),
      run(S) { S.flags.phone = true; fx(S, { zhi: 3, shi: 2, ye: 2 }); return `你有了第一部手机，${S.q <= 2 ? '二手的，屏幕裂了一道' : '新的，你舍不得撕膜'}。`; },
    },
    {
      id: 'crush', a0: 12, a1: 17, once: true, icon: 'love', p: 0.2,
      run(S) { fx(S, { ye: 4 }); return `你偷偷喜欢上了${pick(['同桌', '邻居家的孩子', '隔壁班的一个人'])}，谁也没告诉。`; },
    },
    {
      id: 'dream', a0: 9, a1: 15, once: true, icon: 'moon', p: 0.1,
      run(S) { S.flags.dream = pick(['医生', '老师', '司机', '歌手', '飞行员', '开一家店']); fx(S, { shi: 3 }); return `你在作文里写：长大想当${S.flags.dream}。`; },
    },
    {
      id: 'hobby', a0: 8, a1: 60, once: true, icon: 'book', p: 0.06,
      run(S) { fx(S, { ye: 5, zhi: 2 }); return `你迷上了${pick(['踢球', '唱歌', '下棋', '钓鱼', '种花', '画画', '跳舞', '修收音机'])}。`; },
    },
    {
      id: 'girl_out', a0: 10, a1: 15, once: true, sex: 'F', icon: 'school', p: 0.15,
      if: (S, c) => S.school && c.cm > 15 && S.q <= 2,
      run(S) { S.school = false; fx(S, { shi: -8, ye: -5 }); return '家里说，女孩子读到这里就够了。'; },
    },
    {
      id: 'secondary_auto', a0: 8, a1: 16, p: 1, once: true, icon: 'school', rank: 4,
      if: (S, c) => S.age === P.school(S, c).secondaryAge && S.school && S.edu === 1 && c.sec >= 95 && S.q >= 2,
      run(S) { S.edu = 2; fx(S, { shi: 4 }); return '你升上了中学。'; },
    },
    {
      id: 'secondary', dec: true, a0: 8, a1: 16, p: 1, once: true, icon: 'school',
      if: (S, c) => S.age === P.school(S, c).secondaryAge && S.school && S.edu === 1 && !(c.sec >= 95 && S.q >= 2),
      ask: (S) => (S.q <= 2 ? '小学读完了。家里供不起两个孩子同时读书。' : '小学读完了。家里地里缺人手。'),
      L: { t: '回家干活', run(S) { S.school = false; S.job = S.urban ? 'trade' : 'farm'; fx(S, { shi: -6, ye: -2 }); return '你把书包挂在了墙上，跟着大人干活。'; } },
      R: {
        t: '接着读',
        run(S) { S.edu = 2; fx(S, { shi: 6, ye: -1 }); if (S.q <= 2) { fx(S, { zhi: -2 }); return '你接着读。家里的日子又紧了一点。'; } return '你升上了中学。'; },
      },
      ai: (S, c) => clamp(c.sec / 100 + (S.q - 3) * 0.12, 0.05, 0.98),
    },
    {
      id: 'war_child', a0: 1, a1: 15, cool: 6, icon: 'war',
      if: (S, c) => c.war > 0.1, p: (S, c) => 0.035 * c.war * c.war * (0.3 + 0.7 * Math.exp(-S.age / 15)),
      run(S, c) {
        if (chance(0.4)) {
          const d = pickRefuge(c);
          S.refugee = true; S.migrated = true; S.cur = d.id; S.urban = true; S.q = 1;
          fx(S, { zhi: -10, ye: -10, gen: -5 }); mark(S, 'move');
          return `战火烧到了家门口。大人背着你走了很多天，到了${d.zh}。`;
        }
        fx(S, { ye: -10, gen: -5 }); mark(S, 'scar'); risk(S, 2.4, 'war');
        return '战火烧到了家门口。你们在地窖里躲了很多个晚上。';
      },
    },

    // ---------------- 青年 ----------------
    {
      id: 'university', dec: true, a0: 17, a1: 23, p: 1, once: true, icon: 'diploma',
      if: (S, c) => S.school && S.edu === 2 && !P.specialSchool(c) && S.age === P.school(S, c).collegeAge &&
        (!S.flags.schoolPlan || S.flags.seniorSecondary),
      ask: (S, c) => `中学快毕业了。这里的标准大学课程约 ${P.degreeYears(S, c)} 年。` + (S.q <= 2 ? '学费和生活费，要和家里算一遍。' : '你把申请资料摊在桌上。'),
      L: { t: '出去挣钱', run(S, c) { S.school = false; S.job = firstJob(S, c); fx(S, { shi: 1 }); return jobText(S); } },
      R: {
        t: '考大学',
        run(S, c) {
          const pAdm = clamp(c.ter / 100 * 1.15 + (S.q - 3) * 0.1 + (S.st.shi - 55) / 120, 0.04, 0.95);
          if (chance(pAdm)) {
            S.edu = 3; P.enterDegree(S, c); fx(S, { shi: 12, ye: 6 }); mark(S, 'bloom');
            return S.q <= 2 || !S.urban0 ? '你考上了大学，是家里第一个。' : '你考上了大学。';
          }
          S.school = false; S.job = firstJob(S, c); fx(S, { shi: -5, ye: -7 });
          return `差了 ${ri(3, 30)} 分。${jobText(S)}`;
        },
      },
      ai: (S, c) => clamp(c.ter / 100 + 0.25 + (S.q - 3) * 0.1, 0.1, 0.95),
    },
    {
      id: 'graduate', a0: 18, a1: 30, p: (S) => S.flags.degreePlan ? 1 : 0.7, once: true, icon: 'diploma', rank: 3,
      if: (S) => S.school && S.edu === 3 && (S.flags.degreePlan ? S.age === S.flags.degreePlan.endAge : S.age >= 21 && S.age <= 23),
      run(S, c) { S.school = false; S.job = firstJob(S, c); fx(S, { shi: 6, ye: 3 }); return '你毕业了。' + jobText(S); },
    },
    {
      id: 'start_work', a0: 14, a1: 30, p: 0.45, once: true, icon: 'coins',
      if: (S) => !S.school && !S.job,
      run(S, c) { S.job = firstJob(S, c); fx(S, { shi: 3, ye: 2, zhi: 2 }); return (S.job === 'seeking' ? '' : '你开始挣钱了。') + jobText(S) + (S.job !== 'seeking' && S.q <= 2 ? '一半的工钱寄回了家。' : ''); },
    },
    {
      id: 'to_city', dec: true, a0: 16, a1: 35, once: true, icon: 'road',
      if: (S) => !S.urban && !S.school, p: (S, c) => 0.1 * (c.urb / 100 + 0.35),
      ask: () => `${pick(['表哥', '同村的一个发小', '一个远房亲戚'])}说，城里的厂子在招人。`,
      L: { t: '留在村里', run(S) { fx(S, { zhi: 2, ye: 1 }); return '你留了下来。田埂还是那条田埂。'; } },
      R: {
        t: '进城',
        run(S) {
          S.urban = true; S.job = chance(0.6) ? 'factory' : 'trade'; fx(S, { zhi: -5, shi: 5, ye: -2 }); mark(S, 'move');
          if (chance(0.35)) S.q = Math.min(5, S.q + 1);
          return '你坐了一夜的车进了城。' + jobText(S);
        },
      },
      ai: 0.5,
    },
    {
      id: 'abroad', dec: true, a0: 18, a1: 42, once: true, icon: 'boat',
      if: (S, c) => c.inc !== 'HIC' && !S.migrated && !S.school && P.canExit(S, c),
      p: (S, c) => 0.025 + (c.mig < 0 ? 0.03 : 0) + (low(c) ? 0.02 : 0),
      ask(S, c) { const d = pickDest(c); S.flags.dest = d.id; return `你打听了去${d.zh}工作的机会。路费、手续和到了之后住哪儿，都要先安排。`; },
      L: { t: '留下', run(S) { fx(S, { zhi: 2 }); return '你没有走。'; } },
      R: {
        t: (S) => '去' + NL.cby[S.flags.dest].zh,
        run(S) {
          const d = NL.cby[S.flags.dest];
          if (chance(0.72)) {
            S.cur = d.id; S.migrated = true; S.urban = true; S.q = ri(1, 2);
            S.job = S.edu >= 3 && chance(0.5) ? 'office' : 'trade';
            fx(S, { zhi: -10, ye: -3, shi: 6 }); mark(S, 'move');
            return `你在${d.zh}落了脚，${pick(['在餐馆后厨洗碗', '在工地上干活', '照顾别人家的老人', '在仓库里分拣包裹'])}。`;
          }
          fx(S, { ye: -10, shi: -4 }); S.q = Math.max(1, S.q - 1); mark(S, 'scar');
          return pick(['中介拿了钱就不见了。', '你在边境被拦了回来。']) + '借的钱还得还。';
        },
      },
      ai: 0.35,
    },
    {
      id: 'smoke', dec: true, a0: 13, a1: 26, once: true, icon: 'smoke',
      p: (S, c) => 0.22 * (((S.sex === 'M' ? c.smm : c.smf) || 5) / 30 + 0.2),
      ask: () => '朋友递过来一根烟。',
      L: { t: '摆摆手', run(S) { fx(S, { zhi: -1 }); return '你摆了摆手。朋友笑你，你也笑了。'; } },
      R: { t: '接过来', run(S) { S.smoker = true; fx(S, { zhi: 3, ye: 2, gen: -2 }); return '你呛得直咳。后来就不咳了。'; } },
      ai: (S, c) => clamp(((S.sex === 'M' ? c.smm : c.smf) || 5) / 100 * 1.3, 0.02, 0.85),
    },
    {
      id: 'meet', a0: 18, a1: 45, cool: 3, icon: 'love', p: 0.16,
      if: (S) => !S.married && !S.flags.dating,
      run(S) {
        const where = ['在朋友的婚礼上', '在回家的长途车上', '在集市上', S.job === 'factory' ? '在工厂的食堂' : '在夜校'];
        if (S.flags.phone) where.push('在网上');
        S.flags.dating = true; fx(S, { ye: 6, zhi: 5 });
        return `你遇见了一个人，${pick(where)}。`;
      },
    },
    {
      id: 'marry', dec: true, a0: 18, a1: 55, cool: 2, icon: 'love', p: 0.4,
      if: (S) => S.flags.dating && !S.married,
      ask: () => '那个人问你：要不要一起过日子？',
      L: {
        t: '再等等',
        run(S) {
          if (chance(0.5)) { delete S.flags.dating; fx(S, { ye: -6 }); return '后来，那个人走了。'; }
          return '你们又处了一阵子。';
        },
      },
      R: {
        t: '好',
        run(S, c) {
          S.married = true; S.spouse = makeSpouse(S, c); S.kidPlan = c.tfr < 2.3 ? 0 : kidPlan(c);
          fx(S, { ye: 10, zhi: 8 }); mark(S, 'bloom');
          return '你们办了婚礼。' + (S.q <= 2 ? '酒席摆了五桌，钱是借的。' : '那天来了很多人。');
        },
      },
      ai: 0.72,
    },
    {
      id: 'arranged', a0: 18, a1: 28, once: true, icon: 'home',
      if: (S, c) => !S.married && c.cm > 15, p: (S, c) => c.cm / 100 * 0.25,
      run(S, c) { S.married = true; S.spouse = makeSpouse(S, c); S.kidPlan = kidPlan(c); fx(S, { zhi: 4, ye: -2 }); return '两家人坐在一起，替你把日子定了下来。'; },
    },
    {
      id: 'kids_q', dec: true, a0: 22, a1: 42, cool: 4, icon: 'child', p: 0.35,
      if: (S, c) => S.married && S.spouse && S.spouse.alive && S.kidPlan === 0 && !S.kids.length && c.tfr < 2.3,
      ask: () => '另一半说：我们要个孩子吧。',
      L: { t: '再等等', run(S) { fx(S, { ye: 1 }); return '你们决定再等等。'; } },
      R: { t: '要', run(S, c) { S.kidPlan = Math.max(1, Math.round(normal(c.tfr + 0.4, 0.8))); fx(S, { ye: 3 }); return '你们开始数日子了。'; } },
      ai: 0.6,
    },
    {
      id: 'kid_born', a0: 18, a1: 55, cool: 1, icon: 'cradle',
      if: (S) => S.married && S.spouse && S.spouse.alive && S.kids.length < S.kidPlan && (S.sex === 'M' || S.age <= 46),
      p: (S) => (S.sex === 'F' && S.age > 38 ? 0.12 : 0.34),
      run(S, c) {
        const boy = chance(c.srb / (1 + c.srb));
        S.kids.push({ y: S.age, boy, alive: true });
        const n = S.kids.length;
        let t = `你的第${CN[n - 1] || n}个孩子出生了，是个${boy ? '男孩' : '女孩'}。`;
        fx(S, { ye: 7, zhi: 5 }); mark(S, 'bloom');
        if (S.sex === 'F') {
          S.flags.birthYear = S.age;
          if (chance(clamp(c.mmr / 1000 * 0.55, 0.004, 0.3))) {
            fx(S, { gen: -14 }); mark(S, 'scar'); risk(S, 1 + c.mmr / 90, 'mat');
            t += c.att > 85 ? '生产时大出血，医生给你输了很多血。' : '生产时大出血。卫生院太远，他们用板车把你推到了镇上。';
          }
        }
        return t;
      },
    },
    {
      id: 'kid_die', a0: 19, a1: 70, cool: 3, icon: 'candle',
      if: (S) => S.kids.some((k) => k.alive && S.age - k.y < 5),
      p: (S, c) => { const n = S.kids.filter((k) => k.alive && S.age - k.y < 5).length; return 1 - Math.pow(1 - c.u5 / 1000 / 4.5, n); },
      run(S, c) {
        const k = S.kids.filter((x) => x.alive && S.age - x.y < 5).pop();
        k.alive = false; fx(S, { ye: -25, zhi: -6 }); mark(S, 'frost');
        return c.mal > 20 ? '你最小的孩子没能熬过那个雨季。' : '你最小的孩子发了一场高烧，再也没醒过来。';
      },
    },
    {
      id: 'first_pay', a0: 15, a1: 30, once: true, icon: 'coins', p: 0.4,
      if: (S) => S.job && !['farm', 'seeking'].includes(S.job),
      run(S) { fx(S, { zhi: 3, ye: 3 }); return '你拿到了第一份工钱，' + (S.q <= 2 ? '一半寄回了家。' : '给家里买了一点东西。'); },
    },
    {
      id: 'world_screen', a0: 14, a1: 40, once: true, icon: 'phone', p: 0.06,
      if: (S, c) => S.flags.phone && c.net > 50,
      run(S) { fx(S, { shi: 3, ye: -1 }); return '你在手机上看见了世界另一头的人怎么过日子。'; },
    },

    // ---------------- 工作与家 ----------------
    {
      id: 'layoff', a0: 22, a1: 60, cool: 6, icon: 'factory', p: (S, c) => 0.035 * (P.economy(S, c)?.layoffMultiplier ?? 1),
      if: (S) => ['factory', 'office', 'trade'].includes(S.job),
      run(S) {
        fx(S, { ye: -7, shi: -5 }); mark(S, 'dry'); if (chance(0.4)) S.q = Math.max(1, S.q - 1);
        const was = S.job; S.job = 'seeking'; S.flags.jobSearchAt = S.age;
        return was === 'factory' ? '厂子停工了。你开始重新找活，先把家里的开支压下来。' : was === 'office' ? '公司裁员，名单上有你。你整理好经历，开始找下一份工作。' : '那条街要拆了，你的摊子没了地方。你先找新的摊位，也打听别的活。';
      },
    },
    {
      id: 'promotion', a0: 25, a1: 58, cool: 5, icon: 'office', p: 0.06,
      if: (S) => S.job === 'office' || (S.job === 'factory' && S.edu >= 2),
      run(S) {
        fx(S, { shi: 7, ye: 3 }); if (chance(0.4)) S.q = Math.min(5, S.q + 1);
        return S.job === 'office' ? '你升了职，有了一张靠窗的桌子。' : '你当上了车间的小组长。';
      },
    },
    {
      id: 'overtime', dec: true, a0: 18, a1: 55, cool: 8, icon: 'factory', p: 0.045,
      if: (S) => S.job === 'factory' || S.job === 'office',
      ask: () => '老板说，这个月加班，工资多给一半。',
      L: { t: '按点下班', run(S) { fx(S, { ye: 3, zhi: 2 }); return '你按点下了班，回家吃了一顿热饭。'; } },
      R: {
        t: '加班',
        run(S) {
          fx(S, { gen: -4, ye: -2 });
          if (chance(0.3)) { S.q = Math.min(5, S.q + 1); return '那一年，你攒下了第一笔钱。'; }
          return '你把那笔钱寄回了家。';
        },
      },
      ai: 0.6,
    },
    {
      id: 'lend', dec: true, a0: 25, a1: 75, cool: 15, icon: 'coins', p: 0.018,
      ask: () => `${pick(['表弟', '老同学', '邻居'])}来借钱，说下个月就还。`,
      L: { t: '不借', run(S) { fx(S, { zhi: -4 }); return '你没借。后来见面，对方不太跟你说话了。'; } },
      R: {
        t: '借',
        run(S) {
          if (chance(0.5)) { fx(S, { zhi: 5 }); return '钱真的还回来了，还多了一篮鸡蛋。'; }
          fx(S, { ye: -4 }); if (S.q > 1 && chance(0.3)) S.q--; return '钱再也没有回来。';
        },
      },
      ai: 0.5,
    },
    {
      id: 'farm_bad', a0: 14, a1: 75, cool: 3, icon: 'drought',
      if: (S) => S.job === 'farm', p: (S, c) => 0.05 + (has(c, 'D') ? 0.05 : 0),
      run(S) { fx(S, { ye: -5 }); mark(S, 'dry'); if (chance(0.3)) S.q = Math.max(1, S.q - 1); return '那年雨水不对，收成只有往年的一半。'; },
    },
    {
      id: 'farm_good', a0: 14, a1: 75, cool: 4, icon: 'field', p: 0.06,
      if: (S) => S.job === 'farm',
      run(S) { fx(S, { ye: 5 }); mark(S, 'bloom'); return '那年风调雨顺，粮仓装不下了。'; },
    },
    {
      id: 'house', a0: 25, a1: 60, once: true, dec: true, icon: 'home', p: 0.05,
      if: (S, c) => !S.flags.home && (S.q >= 3 || S.migrated) && !['CHN', 'HKG', 'SGP', 'KOR', 'DEU', 'BRA'].includes(c.id),
      ask(S, c) { const h = P.housing(S, c); return '你在算自己的住处。' + (h ? h.realChange > 0 ? '这一年的住房市场偏热，预算得往上留。' : h.realChange < 0 ? '这一年的住房市场回落，但手里的钱也有别的用途。' : '这一年的住房价格变化不大，接下来要算自己的开支。' : '房款、日常开支和住得远近，要放在一起算。'); },
      L: { t: '先用现在的住处', run(S) { S.flags.housingRoute = 'wait'; fx(S, { shi: 2, ye: 1 }); return '你先维持现有的住处。把钱留在手边，之后再看有没有合适的机会。'; } },
      R: { t: '安排自己的房子', run(S, c) { const h = P.housing(S, c); S.flags.home = true; S.flags.mortgage = S.urban; S.flags.housingRoute = S.urban ? 'buy' : 'renovate'; fx(S, { ye: 6, shi: -clamp(5 + (h?.realChange || 0) * 20, 2, 10) }); mark(S, 'bloom'); return S.urban ? '你办好手续，拿到了钥匙。还款和修理要继续付，眼下先把能住的部分收拾出来。' : '你分批买材料，慢慢修整老房子。开支紧了一阵，住起来比从前方便。'; } },
      ai: 0.5,
    },
    {
      id: 'travel', a0: 18, a1: 75, once: true, icon: 'boat', p: 0.05,
      if: (S) => S.q >= 4,
      run(S) { fx(S, { ye: 6, shi: 2 }); return `你第一次${pick(['坐飞机', '出国', '看见海'])}。`; },
    },
    {
      id: 'pet', a0: 5, a1: 80, once: true, icon: 'home', p: 0.04,
      run(S) { fx(S, { ye: 3 }); return `家里养了一只${pick(S.urban ? ['狗', '猫', '仓鼠'] : ['狗', '猫', '鸡'])}，它最喜欢你。`; },
    },
    {
      id: 'help_fire', a0: 20, a1: 80, cool: 8, icon: 'family', p: 0.03,
      run(S) { fx(S, { zhi: 5 }); return `附近有户人家着了火，你帮着忙了一夜。`; },
    },
    {
      id: 'lottery', a0: 18, a1: 80, once: true, icon: 'coins', p: 0.004,
      run(S) { fx(S, { ye: 7, zhi: 4 }); return `你买的彩票中了个小奖，够请${S.urban ? '整栋楼' : '全村'}吃一顿。`; },
    },

    // ---------------- 病与险 ----------------
    {
      id: 'hiv', a0: 18, a1: 55, once: true, icon: 'clinic',
      if: (S, c) => c.hiv > 0.8, p: (S, c) => c.hiv / 100 * 0.07,
      run(S, c) {
        const tr = chance(clamp(0.45 + Math.log10(c.ppp) * 0.1 + (S.q - 3) * 0.08, 0.3, 0.97));
        S.hiv = tr ? 'treated' : 'untreated'; mark(S, 'scar');
        fx(S, { gen: tr ? -6 : -15, ye: -12, zhi: -4 });
        return '体检那天，医生把你单独叫进了里屋。' + (tr ? '从那天起，你每天吃药。' : '那时候，药还没送到镇上。');
      },
    },
    {
      id: 'tb', a0: 15, a1: 80, once: true, icon: 'fever',
      if: (S, c) => c.u5 > 15, p: (S, c) => c.u5 / 1000 * 0.05,
      run(S) {
        mark(S, 'scar');
        if (chance(0.7)) { fx(S, { gen: -8 }); return '你咳了三个月，咳出了血丝。是结核。药要吃半年，你吃完了。'; }
        fx(S, { gen: -14 }); S.chronic = 'untreated'; risk(S, 1.5, 'tb');
        return '你咳了三个月，咳出了血丝。是结核。药吃到一半，你觉得好了，就停了。';
      },
    },
    {
      id: 'chronic', a0: 38, a1: 85, once: true, icon: 'clinic',
      p: (S, c) => 0.025 + (S.smoker ? 0.02 : 0) + (c.ppp > 15000 ? 0.01 : 0),
      run(S, c) {
        const kind = pick(['血压', '血糖']);
        const tr = chance(clamp(0.3 + (S.q - 1) * 0.15 + (100 - c.oop) / 250, 0.15, 0.95));
        S.chronic = tr ? 'treated' : 'untreated'; fx(S, { gen: -5, ye: -3 });
        return `医生说你${kind}太高。` + (tr ? '你开始每天吃药，盐也少放了。' : '药太贵，你吃了两个月就停了。');
      },
    },
    {
      id: 'med_bill', dec: true, a0: 30, a1: 88, cool: 15, icon: 'clinic',
      if: (S, c) => c.oop > 25, p: (S, c) => 0.015 + c.oop / 100 * 0.03,
      ask: () => '你胸口疼了好几天。去大医院看一次，要花掉家里几个月的收入。',
      L: {
        t: '扛一扛',
        run(S) {
          if (chance(0.6)) { fx(S, { gen: -3 }); return '过了几天，好像不疼了。'; }
          fx(S, { gen: -10 }); mark(S, 'scar'); risk(S, 1.4, 'heart'); return '疼了一整个冬天。';
        },
      },
      R: {
        t: '去看',
        run(S) {
          fx(S, { gen: 6 });
          if (chance(0.5) && S.q > 1) { S.q--; return '医生说幸好来得早。家里的积蓄也花光了。'; }
          return '医生说幸好来得早。';
        },
      },
      ai: (S) => clamp(0.3 + S.q * 0.12, 0.2, 0.9),
    },
    {
      id: 'road_hit', a0: 5, a1: 85, cool: 6, icon: 'road', p: (S, c) => c.road / 100000 * 22,
      run(S, c) {
        fx(S, { gen: -12, ye: -4 }); mark(S, 'scar'); risk(S, 3, 'road');
        return `一辆${pick(['摩托车', '卡车', '面包车'])}在路口把你撞倒了。` + (c.att > 85 ? '你在医院躺了一个月。' : '你的腿后来一直没长直。');
      },
    },
    {
      id: 'robbed', a0: 15, a1: 70, cool: 8, icon: 'moon',
      if: (S, c) => c.hom > 3, p: (S, c) => c.hom / 100000 * 35,
      run(S, c) { fx(S, { ye: -8, zhi: -2 }); if (c.hom > 15) risk(S, 1.5, 'viol'); return '你在回家的路上被人抢了。'; },
    },
    {
      id: 'war', dec: true, a0: 16, a1: 80, cool: 4, icon: 'war',
      if: (S, c) => c.war > 0.1, p: (S, c) => 0.03 * c.war * c.war * (0.3 + 0.7 * Math.exp(-S.age / 15)),
      ask: (S) => `战火烧到了${S.urban ? '你住的城' : '你们县'}。`,
      L: {
        t: '留下',
        run(S) {
          fx(S, { gen: -6, ye: -10, zhi: -4 }); mark(S, 'scar'); risk(S, 2.6, 'war');
          return pick(['你们在地窖里躲了很多个晚上。', '炮声停了又响。你学会了听声音分辨远近。']);
        },
      },
      R: {
        t: '逃',
        run(S, c) {
          const d = pickRefuge(c);
          S.refugee = true; S.migrated = true; S.cur = d.id; S.urban = true; S.q = 1;
          if (S.job === 'office' || S.job === 'farm') S.job = 'trade';
          fx(S, { zhi: -12, ye: -10, gen: -4 }); mark(S, 'move');
          return `你们${pick(['背着包袱走了七天', '挤上了最后一辆卡车', '在夜里过了河'])}，到了${d.zh}。`;
        },
      },
      ai: 0.55,
    },
    {
      id: 'flood', a0: 0, a1: 110, cool: 3, icon: 'flood',
      if: (S, c) => has(c, 'F'), p: 0.025,
      run(S) {
        fx(S, { ye: -6, gen: -3 }); mark(S, 'scar'); risk(S, 1.4, 'flood');
        if (S.q <= 3 && chance(0.3)) S.q = Math.max(1, S.q - 1);
        return `洪水漫进了${S.urban ? '街道' : '村子'}。` + (S.q >= 4 ? '你家在楼上，看着水一点点退下去。' : '你们只能往高处躲，等水退。');
      },
    },
    {
      id: 'quake', a0: 0, a1: 110, cool: 5, icon: 'quake',
      if: (S, c) => has(c, 'Q'), p: 0.01,
      run(S) {
        fx(S, { gen: -6, ye: -8 }); mark(S, 'scar'); risk(S, 2, 'quake');
        return `地震来的时候，你正在${pick(S.urban ? ['吃饭', '睡觉', '上课', '看电视'] : ['吃饭', '睡觉', '上课', '地里'])}。`
          + (S.urban ? '墙裂了一道缝，整栋楼的人都下了楼。' : '房子塌了一半。');
      },
    },
    {
      id: 'storm', a0: 0, a1: 110, cool: 3, icon: 'storm',
      if: (S, c) => has(c, 'S'), p: 0.02,
      run(S, c) {
        fx(S, { ye: -5 }); mark(S, 'scar'); risk(S, 1.3, 'storm');
        if (c.inc === 'HIC') return chance(0.5) ? '风雨最大那晚停电了，冰箱里的东西全坏了。' : '树被连根拔起，压断了一条街的电线。';
        return chance(0.5) ? '台风过境，屋顶被掀走了。' : '台风来了，你们在学校里躲了一夜。';
      },
    },
    {
      id: 'drought', a0: 0, a1: 110, cool: 3, icon: 'drought',
      if: (S, c) => has(c, 'D') && !S.urban, p: 0.025,
      run(S) { fx(S, { ye: -4, gen: -2 }); mark(S, 'dry'); if (S.job === 'farm' && chance(0.4)) S.q = Math.max(1, S.q - 1); return '连着两年没下透雨，地裂得能塞进手掌。'; },
    },
    {
      id: 'heat', a0: 0, a1: 110, cool: 3, icon: 'drought',
      if: (S, c) => has(c, 'H'), p: 0.02,
      run(S) {
        mark(S, 'dry');
        if (S.age > 60) { fx(S, { gen: -8 }); risk(S, 1.6, 'heat'); } else fx(S, { ye: -3 });
        return `那年夏天热得出奇，${S.urban ? '街上' : '村里'}好几个老人没熬过去。`;
      },
    },

    // ---------------- 离别 ----------------
    {
      id: 'mother_die', a0: 1, a1: 110, p: 1, once: true, icon: 'candle', rank: 7,
      if: (S) => !S.parents.momBirth && S.age >= S.parents.mDie,
      run(S) {
        fx(S, { ye: -12, zhi: -6 }); mark(S, 'frost'); if (S.age < 15) fx(S, { shi: -4, gen: -2 });
        return `你的母亲去世了，${S.parents.mA + S.age} 岁。` + (S.age < 15 ? `那年你 ${S.age} 岁。` : S.age > 50 ? '你也已经不年轻了。' : '');
      },
    },
    {
      id: 'father_die', a0: 0, a1: 110, p: 1, once: true, icon: 'candle', rank: 7,
      if: (S) => S.age >= S.parents.fDie,
      run(S) {
        fx(S, { ye: -12, zhi: -6 }); mark(S, 'frost'); if (S.age < 15) fx(S, { shi: -4, gen: -2 });
        if (S.age === 0) return '你还没学会认人，父亲就走了。';
        return `你的父亲去世了，${S.parents.fA + S.age} 岁。` + (S.age < 15 ? `那年你 ${S.age} 岁。` : S.age > 50 ? '你也已经不年轻了。' : '');
      },
    },
    {
      id: 'spouse_die', a0: 18, a1: 120, p: 1, cool: 1, icon: 'candle', rank: 6,
      if: (S) => S.married && S.spouse && S.spouse.alive && S.age >= S.spouse.dieAt,
      run(S) {
        S.spouse.alive = false; fx(S, { ye: -16, zhi: -10 }); mark(S, 'frost');
        return S.age >= 60 ? '老伴走了。屋里少了一个人说话。' : '你的另一半走了。那年你 ' + S.age + ' 岁。';
      },
    },
    {
      id: 'parents_care', a0: 30, a1: 70, cool: 8, icon: 'elder', p: 0.08,
      if: (S) => S.age + S.parents.mA > 70 && S.age < S.parents.mDie && !S.parents.momBirth,
      run(S) { fx(S, { ye: -3, zhi: 2 }); return `母亲${S.parents.mA + S.age}岁了。你开始${S.migrated ? '每个月往家里打一个长长的电话' : '两头跑'}。`; },
    },

    // ---------------- 晚年 ----------------
    {
      id: 'kids_leave', a0: 34, a1: 85, once: true, icon: 'road', p: 0.3,
      if: (S) => S.kids.some((k) => k.alive && S.age - k.y >= 17),
      run(S) {
        const k = S.kids.find((x) => x.alive && S.age - x.y >= 17);
        fx(S, { zhi: -3, ye: 1 });
        return `你的${k.boy ? '儿子' : '女儿'}去${pick(['城里', '外地', '国外'])}${pick(['读书', '打工'])}了。家里一下子空了。`;
      },
    },
    {
      id: 'grandchild', a0: 38, a1: 95, cool: 6, icon: 'child', p: 0.12,
      if: (S) => S.kids.some((k) => k.alive && S.age - k.y >= 19),
      run(S) { fx(S, { ye: 8, zhi: 6 }); mark(S, 'bloom'); return S.once.grand ? '又一个孙辈出生了。' : ((S.once.grand = 1), '你抱上了第一个孙辈。'); },
    },
    {
      id: 'reunion', a0: 50, a1: 110, cool: 4, icon: 'family', p: 0.12,
      if: (S) => aliveKids(S).length > 0,
      run(S) { fx(S, { ye: 6, zhi: 5 }); return '孩子们带着一家人回来了，屋子一下子挤满了。'; },
    },
    {
      id: 'retire', a0: 58, a1: 67, once: true, icon: 'elder', p: 0.35,
      if: (S) => S.job === 'office' || S.job === 'factory',
      run(S) { const was = S.job; S.job = 'retired'; fx(S, { ye: 3, shi: -4 }); return '你退休了。' + (was === 'office' ? '同事们凑钱买了一束花。' : '临走时发了一个纪念品。'); },
    },
    {
      id: 'no_retire', a0: 66, a1: 85, once: true, icon: 'field', p: 0.25,
      if: (S) => S.job === 'farm' || S.job === 'trade' || S.q <= 2,
      run(S) { fx(S, { gen: -3, shi: 1 }); return `你 ${S.age} 岁了，还在干活。对你来说，没有退休这回事。`; },
    },
    {
      id: 'quit_smoke', dec: true, a0: 35, a1: 75, cool: 6, icon: 'smoke', p: 0.14,
      if: (S) => S.smoker,
      ask: () => '体检单上，肺那一栏画了个问号。',
      L: { t: '接着抽', run(S) { fx(S, { ye: 1 }); return '你把体检单折起来，塞进了抽屉。'; } },
      R: { t: '戒了', run(S) { S.smoker = false; S.exSmoker = true; fx(S, { gen: 4, ye: -3 }); return '你戒了。前三个月最难熬。'; } },
      ai: 0.45,
    },
    {
      id: 'forget', a0: 75, a1: 120, cool: 5, icon: 'moon', p: (S) => 0.05 + (S.age - 75) * 0.005,
      run(S) { fx(S, { shi: -5, ye: -2 }); return `你开始记不清${pick(['钥匙放在哪', '孙辈的名字', '今天是星期几', '刚刚说过的话'])}。`; },
    },
    {
      id: 'sunshine', a0: 65, a1: 120, cool: 5, icon: 'elder', p: 0.08,
      run(S) { fx(S, { ye: 3 }); return `你在${S.urban ? '楼下' : '门口'}晒太阳，一坐就是一下午。`; },
    },
    {
      id: 'lonely', a0: 70, a1: 120, cool: 6, icon: 'moon', p: 0.1,
      if: (S) => !S.spouse || !S.spouse.alive,
      run(S) { fx(S, { ye: -4, zhi: -3 }); return S.flags.noPower ? '你对着院子里的鸡，说了一下午的话。' : '屋子里很安静。你把电视开着，只为了有点声音。'; },
    },
  ];

  // ===== 决策卡：玩家手势选择的主内容（L 左滑 / R 右滑） =====
  const D = (o) => Object.assign({ dec: true }, o);
  const poor = (c) => c.ppp < 8000;
  const rich = (c) => c.ppp >= 25000;
  const E2 = [
    // ---- 说不上话的年纪：只有一个选项 ----
    D({ id: 'baby_move', a0: 2, a1: 4, once: true, icon: 'road', p: 0.3,
      ask: () => '大人们在商量要不要搬家。你在地上玩一只鞋。',
      L: { t: '继续玩鞋', run(S) { fx(S, { ye: 1 }); return '他们商量完了。没有人问你。'; } } }),
    D({ id: 'baby_name', a0: 1, a1: 3, once: true, icon: 'child', p: 0.3,
      ask: () => '亲戚们围着你，争你到底长得像谁。',
      L: { t: '流口水', run(S) { fx(S, { zhi: 1 }); return '大家都笑了。'; } } }),
    // ---- 童年 ----
    D({ id: 'far_school', a0: 6, a1: 10, once: true, icon: 'road', p: 0.5, if: (S, c) => S.school && !S.urban && poor(c),
      ask: () => '学校在山那头，走一趟一个半钟头。雨季路会断。',
      L: { t: '在家放牛', run(S) { S.school = false; fx(S, { shi: -4, ye: 2 }); return '牛都听你的。老师的名字，你后来记不清了。'; } },
      R: { t: '每天走', run(S) { fx(S, { gen: -1, shi: 5 }); return '鞋底磨穿了两双。但你认得字了。'; } }, ai: 0.7 }),
    D({ id: 'lamp', a0: 7, a1: 15, once: true, icon: 'candle', p: 0.5, if: (S) => S.flags.noPower && S.school,
      ask: () => '家里没通电。晚上写作业要点灯，灯油是买来的。',
      L: { t: '天黑前写完', run(S) { fx(S, { shi: 1, ye: -1 }); return '你的字写得飞快，也写得很丑。'; } },
      R: { t: '点灯写', run(S) { fx(S, { shi: 4 }); return '母亲没说什么，第二天少打了半斤油。'; } }, ai: 0.5 }),
    D({ id: 'eraser', a0: 6, a1: 11, once: true, icon: 'book', p: 0.18, if: (S) => S.school,
      ask: () => '同桌把橡皮掰了一半给你。你们上周还打过架。',
      L: { t: '不要', run(S) { fx(S, { zhi: -2, ye: 1 }); return '你用手指蘸口水擦。'; } },
      R: { t: '收下', run(S) { fx(S, { zhi: 5, ye: 2 }); return '半块橡皮，一直用到了毕业。'; } }, ai: 0.8 }),
    D({ id: 'blocked', a0: 7, a1: 14, cool: 5, icon: 'moon', p: 0.08,
      ask: () => '放学路上，几个大孩子堵着你要钱。',
      L: { t: '绕路走', run(S) { fx(S, { ye: -3 }); return '你多走了三年的远路。'; } },
      R: { t: '打回去', run(S) { if (chance(0.45)) { fx(S, { ye: 4, zhi: 3 }); return '你流了鼻血。他们后来没再找你。'; } fx(S, { gen: -4, ye: -2 }); return '你被打得不轻。回家说是摔的。'; } }, ai: 0.4 }),
    D({ id: 'teacher', a0: 8, a1: 13, once: true, icon: 'school', p: 0.14, if: (S) => S.school && S.q <= 3,
      ask: () => '有个老师跑到你家，跟你爸妈说：这孩子脑子好使，别让孩子退学。',
      L: { t: '家里更要紧', run(S) { S.school = false; fx(S, { shi: -6, ye: -4 }); return '老师喝了杯水，走了。'; } },
      R: { t: '听老师的', run(S) { fx(S, { shi: 7, ye: 2 }); S.flags.teacher = true; return '老师垫了你的书本费。这事你记了一辈子。'; } }, ai: 0.7 }),
    D({ id: 'only_one', a0: 8, a1: 13, once: true, sex: 'F', icon: 'school', p: 0.4, if: (S, c) => S.school && S.q <= 2 && S.sibs > 0 && poor(c),
      ask: () => '家里只够供一个孩子上学。你弟弟也到年纪了。',
      L: { t: '什么也没问', run(S) { S.school = false; fx(S, { shi: -7, ye: -5 }); return '第二天，你把书包给了他。'; } },
      R: { t: '问：为什么是他', run(S) { if (chance(0.3)) { fx(S, { shi: 3, ye: 2 }); return '屋里安静了很久。最后是你接着去上学。'; } S.school = false; fx(S, { shi: -7, ye: -7, zhi: -2 }); return '没有人回答你。'; } }, ai: 0.25 }),
    D({ id: 'parents_fight', a0: 6, a1: 15, cool: 6, icon: 'home', p: 0.07,
      ask: () => '半夜，你听见爸妈在隔壁吵钱的事。',
      L: { t: '装睡', run(S) { fx(S, { ye: -3 }); return '你一直装到了天亮。'; } },
      R: { t: '起来倒水', run(S) { fx(S, { zhi: 3, ye: -1 }); return '他们看见你，一下子都不说话了。'; } }, ai: 0.4 }),
    D({ id: 'river', a0: 7, a1: 13, once: true, icon: 'flood', p: 0.14, if: (S) => !S.urban,
      ask: () => '夏天，大孩子都去河里游泳。大人说那里淹死过人。',
      L: { t: '不去', run(S) { fx(S, { ye: -2 }); return '你在岸上帮他们看衣服。'; } },
      R: { t: '去', run(S) { if (chance(0.1)) { fx(S, { gen: -6, ye: -3 }); mark(S, 'scar'); risk(S, 2, 'drown'); return '你呛了水，是别人把你拖上来的。'; } fx(S, { ye: 6, gen: 2, zhi: 3 }); return '那是你记忆里最热的一个夏天。'; } }, ai: 0.6 }),
    D({ id: 'lunch', a0: 6, a1: 13, once: true, icon: 'family', p: 0.3, if: (S, c) => S.school && poor(c),
      ask: () => '学校开始发午饭了。很多人家就为这个才让孩子来上学。',
      L: { t: '自己吃完', run(S) { fx(S, { gen: 4 }); return '那是你第一次吃得这么饱。'; } },
      R: { t: '留一半带回家', run(S) { fx(S, { gen: 1, zhi: 5, ye: 2 }); return '弟弟妹妹在门口等你。'; } }, ai: 0.5 }),
    D({ id: 'cram', a0: 8, a1: 16, cool: 4, icon: 'book', p: 0.3, if: (S, c) => S.school && S.urban && !poor(c),
      ask: () => '周末四个补习班。你已经半年没下楼玩了。',
      L: { t: '逃一节', run(S) { fx(S, { ye: 5, shi: -2 }); return '你在公园坐了两个钟头，什么也没干。'; } },
      R: { t: '上完', run(S) { fx(S, { shi: 4, ye: -4 }); return '分数涨了一点，话少了一点。'; } }, ai: 0.6 }),
    D({ id: 'found_money', a0: 7, a1: 14, once: true, icon: 'coins', p: 0.07,
      ask: () => '路上捡到一张钞票，够买一个月的铅笔。',
      L: { t: '交给老师', run(S) { fx(S, { zhi: 4 }); return '老师在全班面前表扬了你。'; } },
      R: { t: '留着', run(S) { fx(S, { ye: 3, shi: 1 }); return '你买了糖，分给了最好的朋友，没说钱是哪来的。'; } }, ai: 0.5 }),
    D({ id: 'stray_dog', a0: 6, a1: 16, once: true, icon: 'home', p: 0.05,
      ask: () => '有条瘦狗跟了你一路，到了家门口还不走。',
      L: { t: '赶走它', run(S) { fx(S, { ye: -2 }); return '它走几步就回头看你。'; } },
      R: { t: '带回家', run(S) { fx(S, { ye: 6, zhi: 1 }); return '家里多了一张嘴。它陪了你很多年。'; } }, ai: 0.7 }),
    D({ id: 'fever_money', a0: 6, a1: 16, cool: 6, icon: 'fever', p: (S, c) => (poor(c) ? 0.08 : 0.01),
      ask: () => '你发烧三天了。诊所要走半天，还要先付钱。',
      L: { t: '再扛两天', run(S) { if (chance(0.55)) { fx(S, { gen: -3 }); return '烧退了。你瘦了一圈。'; } fx(S, { gen: -12 }); mark(S, 'scar'); risk(S, 1.8, 'inf'); return '烧没退。后来你听力一直不太好。'; } },
      R: { t: '去看', run(S) { fx(S, { gen: 3, ye: -1 }); if (S.q > 1 && chance(0.2)) S.q--; return '家里卖了一只羊。'; } }, ai: (S) => clamp(0.3 + S.q * 0.13, 0.2, 0.9) }),
    D({ id: 'move_friend', a0: 8, a1: 15, once: true, icon: 'road', p: 0.06,
      ask: () => '爸妈要搬去别的地方。你最好的朋友问你：会写信吗？',
      L: { t: '说会', run(S) { fx(S, { ye: -2 }); return '你写了三封。第四封没有寄。'; } } }),
    D({ id: 'old_book', a0: 8, a1: 15, once: true, icon: 'book', p: 0.1,
      ask: () => '你在教室后面捡到一本没封面的书。',
      L: { t: '折纸飞机', run(S) { fx(S, { ye: 2 }); return '飞得最远的一架，落在了校长脚边。'; } },
      R: { t: '读完它', run(S) { fx(S, { shi: 5, ye: 3 }); return '你到现在也不知道书名。'; } }, ai: 0.5 }),
    // ---- 少年 ----
    D({ id: 'site_job', a0: 13, a1: 17, once: true, icon: 'coins', p: 0.3, if: (S) => S.school && S.q <= 3,
      ask: () => '舅舅说工地缺人，一天给的钱，比你爸干一周的还多。',
      L: { t: '继续念书', run(S) { fx(S, { shi: 3, ye: -1 }); return '舅舅摇了摇头，一个人走了。'; } },
      R: { t: '跟舅舅走', run(S) { S.school = false; S.job = 'trade'; fx(S, { shi: -3, gen: -3, zhi: 2 }); return '你第一次把钱放到妈妈手里。她数了两遍。'; } }, ai: (S) => clamp(0.65 - S.q * 0.12, 0.1, 0.7) }),
    D({ id: 'mine', a0: 13, a1: 17, once: true, icon: 'quake', p: 0.15, if: (S, c) => S.q <= 2 && poor(c) && c.agr > 20,
      ask: () => '矿上收个子小的孩子，说钻得进去。',
      L: { t: '不去', run(S) { fx(S, { ye: -1 }); return '家里的那口锅，又空了几天。'; } },
      R: { t: '去', run(S) { fx(S, { gen: -9, shi: 2 }); mark(S, 'scar'); return '你的咳嗽，就是从那年开始的。'; } }, ai: 0.4 }),
    D({ id: 'note', a0: 13, a1: 17, once: true, icon: 'love', p: 0.15, if: (S) => S.school,
      ask: () => '后排那个人往你书包里塞了张纸条，上面只写了「放学一起走吗」。',
      L: { t: '假装没看见', run(S) { fx(S, { ye: -1 }); return '那张纸条你没扔。'; } },
      R: { t: '一起走', run(S) { fx(S, { ye: 6, zhi: 3 }); return '你们什么也没说，走了很长的一段路。'; } }, ai: 0.6 }),
    D({ id: 'gang', a0: 14, a1: 22, once: true, icon: 'moon', p: 0.2, if: (S, c) => c.hom > 10 && S.q <= 3,
      ask: () => '街上那帮人问你要不要帮他们跑腿，给的钱很多。',
      L: { t: '不干', run(S) { fx(S, { zhi: -2 }); return '后来那条街你都绕着走。'; } },
      R: { t: '干', run(S) { if (chance(0.5)) { fx(S, { shi: 4, ye: 2 }); return '你买了一双新鞋，不敢穿回家。'; } fx(S, { gen: -8, ye: -8 }); mark(S, 'scar'); risk(S, 2.5, 'viol'); return '有天晚上，警察和对头同时来了。你跑掉了。'; } }, ai: 0.3 }),
    D({ id: 'cheat', a0: 12, a1: 17, once: true, icon: 'book', p: 0.08, if: (S) => S.school,
      ask: () => '考试前，有人卖答案。全班一半人都买了。',
      L: { t: '不买', run(S) { fx(S, { shi: 2, ye: -1 }); return '你考得不如他们。你自己知道差在哪。'; } },
      R: { t: '买', run(S) { fx(S, { ye: 2, shi: -2 }); return '你考得不错。心里不太踏实。'; } }, ai: 0.4 }),
    D({ id: 'talent', a0: 12, a1: 17, once: true, icon: 'road', p: 0.07,
      ask: () => '体校的人来看了你跑步，说可以去试训。',
      L: { t: '算了', run(S) { fx(S, { ye: -1 }); return '你后来偶尔还会想起那条跑道。'; } },
      R: { t: '去试试', run(S) { if (chance(0.3)) { fx(S, { gen: 6, ye: 6, shi: 3 }); mark(S, 'bloom'); return '你进了省队的预备班。'; } fx(S, { gen: 2, ye: -3 }); return '教练说：回去好好读书吧。'; } }, ai: 0.5 }),
    D({ id: 'mom_sick', a0: 12, a1: 17, once: true, icon: 'clinic', p: 0.08, if: (S) => S.school && !S.parents.momBirth && S.age < S.parents.mDie,
      ask: () => '妈妈病了，家里的活落到了你头上。',
      L: { t: '边读边干', run(S) { fx(S, { gen: -3, ye: -2, zhi: 2 }); return '你在灶台边上背完了课文。'; } },
      R: { t: '退学回家', run(S) { S.school = false; fx(S, { shi: -7, zhi: 5 }); return S.urban ? '你把书包收进了柜子，开始帮家里看店。' : '你接过了家里的活，天不亮就出门。'; } }, ai: 0.3 }),
    D({ id: 'lonely_class', a0: 12, a1: 17, once: true, icon: 'moon', p: 0.06,
      ask: () => '不知道从哪天起，班里没人跟你说话了。',
      L: { t: '一个人待着', run(S) { fx(S, { ye: -5, shi: 2 }); return '你看完了图书馆靠窗那一排的书。'; } },
      R: { t: '告诉大人', run(S) { if (chance(0.5)) { fx(S, { ye: 2, zhi: 3 }); return '老师调了座位。慢慢好了一些。'; } fx(S, { ye: -3 }); return '大人说：怎么不找找自己的原因。'; } }, ai: 0.5 }),
    D({ id: 'recruit', a0: 15, a1: 17, once: true, icon: 'war', p: (S, c) => 0.12 * c.war, if: (S, c) => c.war > 0.6,
      ask: () => '村里来了一队拿枪的人，说每家要出一个孩子。',
      L: { t: '躲进山里', run(S) { fx(S, { gen: -4, ye: -5 }); return '你在山里躲了两个月，靠家里偷偷送饭。'; } },
      R: { t: '趁夜逃走', run(S, c) { const d = pickRefuge(c); S.refugee = true; S.migrated = true; S.cur = d.id; S.urban = true; S.q = 1; fx(S, { zhi: -12, ye: -8 }); mark(S, 'move'); return `你一路走到了${d.zh}，再没回去过。`; } }, ai: 0.5 }),
    // ---- 青年 ----
    D({ id: 'first_love_end', a0: 18, a1: 28, once: true, icon: 'moon', p: 0.1, if: (S) => S.flags.dating && !S.married,
      ask: () => '那个人要去很远的地方，问你跟不跟着走。',
      L: { t: '留下', run(S) { delete S.flags.dating; fx(S, { ye: -8 }); return '车站人很多。你没有哭，回去的路上才哭。'; } },
      R: { t: '跟着走', run(S) { fx(S, { ye: 5, zhi: -5 }); S.urban = true; mark(S, 'move'); return '你们到了一座谁也不认识的城市。'; } }, ai: 0.45 }),
    D({ id: 'unpaid', a0: 18, a1: 50, cool: 10, icon: 'factory', p: 0.05, if: (S, c) => S.job === 'factory' || (S.job === 'trade' && poor(c)),
      ask: () => '老板欠了你们三个月工钱，人找不到了。',
      L: { t: '自认倒霉', run(S) { fx(S, { ye: -6 }); if (S.q > 1 && chance(0.4)) S.q--; return '你换了一家厂。'; } },
      R: { t: '堵他家门口', run(S) { if (chance(0.4)) { fx(S, { zhi: 4, ye: 3 }); return '蹲了九天，要回来七成。'; } fx(S, { gen: -4, ye: -4 }); return '你们被保安赶走了。'; } }, ai: 0.5 }),
    D({ id: 'partner_shop', a0: 22, a1: 50, once: true, icon: 'coins', p: 0.022, if: (S) => !S.school,
      ask: () => '朋友拉你合伙开店，要把你的积蓄全投进去。',
      L: { t: '算了', run(S) { fx(S, { ye: -1 }); return '朋友的店后来开起来了。你路过时进去买了瓶水。'; } },
      R: { t: '干', run(S) { S.job = 'trade'; if (chance(0.42)) { S.q = Math.min(5, S.q + 1); fx(S, { shi: 8, ye: 7 }); mark(S, 'bloom'); return '店撑过了头三年。后来开了第二家。'; } S.q = Math.max(1, S.q - 1); fx(S, { shi: -7, ye: -8, zhi: -4 }); mark(S, 'dry'); return '第二年，朋友卷走了最后一点钱。'; } }, ai: 0.4 }),
    D({ id: 'exam_gov', a0: 21, a1: 32, once: true, icon: 'office', iso: ['CHN'], era: [1994, 9999], p: 0.3, if: (S) => S.edu >= 3 && S.job === 'office',
      ask: () => '身边的人都在考编。一个岗位，四百人抢。',
      L: { t: '不考了', run(S) { fx(S, { ye: 2 }); return '你接着干手上的活。'; } },
      R: { t: '再考一年', run(S) { if (chance(0.2)) { fx(S, { shi: 8, ye: 8 }); mark(S, 'bloom'); return '你考上了。爸妈在村口放了一挂鞭。'; } fx(S, { ye: -6, shi: 1 }); return '差了两分。'; } }, ai: 0.5 }),
    D({ id: 'blue', a0: 18, a1: 70, cool: 18, icon: 'moon', p: 0.02,
      ask: () => '有一阵子，你什么都提不起劲。饭吃不出味道。',
      L: { t: '硬撑', run(S) { fx(S, { ye: -6, gen: -2 }); return '日子照样过。没人看得出来。'; } },
      R: { t: '找人说说', run(S) { fx(S, { ye: 6, zhi: 3 }); return '你说了很久。对方只是听着，这就够了。'; } }, ai: 0.5 }),
    D({ id: 'scam', a0: 20, a1: 85, cool: 20, icon: 'phone', p: (S, c) => c.net / 100 * 0.018 + (S.age > 60 ? 0.015 : 0), if: (S) => S.flags.phone,
      ask: (S) => (S.age > 60 ? '电话里的人很亲切，说这款保健品能把血管洗干净。' : '手机上有人说，投一点钱，一个月翻倍。'),
      L: { t: '挂掉', run(S) { fx(S, { ye: 1 }); return '后来听说，隔壁家中了招。'; } },
      R: { t: '试试', run(S) { fx(S, { ye: -8, shi: -5 }); if (S.q > 1) S.q--; mark(S, 'dry'); return '第二天，那个号码打不通了。'; } }, ai: 0.2 }),
    D({ id: 'remit', a0: 20, a1: 60, cool: 5, icon: 'coins', p: 0.25, if: (S) => S.migrated && !S.refugee,
      ask: () => '家里来电话，说房子漏雨，弟弟要交学费。这个月你也紧。',
      L: { t: '少寄一点', run(S) { fx(S, { zhi: -3, shi: 2 }); return '电话那头说：没事，你自己顾好。'; } },
      R: { t: '照常寄', run(S) { fx(S, { zhi: 4, shi: -3, gen: -2 }); return '你连着吃了一个月的泡面。'; } }, ai: 0.7 }),
    D({ id: 'go_home', a0: 28, a1: 70, once: true, icon: 'road', p: 0.1, if: (S) => S.migrated && !S.refugee,
      ask: () => '你在外面很多年了。妈妈在电话里说：回来吧。',
      L: { t: '再干几年', run(S) { fx(S, { zhi: -3, shi: 2 }); return '你说，明年，明年一定。'; } },
      R: { t: '回去', run(S) { S.cur = S.born; S.migrated = false; S.urban = S.urban0; fx(S, { zhi: 10, ye: 6, shi: -3 }); mark(S, 'move'); return '村口的树还在，比你记得的矮一点。'; } }, ai: 0.4 }),
    D({ id: 'refugee_life', a0: 18, a1: 70, cool: 7, icon: 'refugee', p: 0.3, if: (S) => S.refugee,
      ask: () => '难民营的人说，可以申请去第三国，要等很多年。',
      L: { t: '就地讨生活', run(S) { fx(S, { shi: 3, ye: -2 }); return '你在营地边上支了个修鞋摊。'; } },
      R: { t: '排队等', run(S) { if (chance(0.3)) { const d = pickDest(NL.cby[S.cur]); S.cur = d.id; S.refugee = false; S.q = 2; fx(S, { ye: 8, zhi: -4 }); mark(S, 'move'); return `第七年，通知来了。你去了${d.zh}。`; } fx(S, { ye: -5 }); return '表格填了一遍又一遍。'; } }, ai: 0.5 }),
    // ---- 成年 ----
    D({ id: 'tuition', a0: 30, a1: 62, cool: 12, icon: 'school', p: 0.08, if: (S) => S.kids.some((k) => k.alive && S.age - k.y >= 6 && S.age - k.y <= 18),
      ask: () => '孩子的学费又涨了。',
      L: { t: '换便宜的学校', run(S) { fx(S, { ye: -3 }); return '孩子什么也没说。'; } },
      R: { t: '咬牙供', run(S) { fx(S, { shi: -5, gen: -2, zhi: 3 }); if (S.q > 1 && chance(0.2)) S.q--; return '你多打了一份工。'; } }, ai: 0.65 }),
    D({ id: 'kid_rebel', a0: 32, a1: 65, once: true, icon: 'moon', p: 0.08, if: (S) => S.kids.some((k) => k.alive && S.age - k.y >= 13 && S.age - k.y <= 19),
      ask: () => '孩子摔了门，说你根本不懂。',
      L: { t: '吼回去', run(S) { fx(S, { zhi: -6, ye: -3 }); return '那天晚上，谁都没吃饭。'; } },
      R: { t: '敲敲门', run(S) { fx(S, { zhi: 5, ye: 1 }); return '门没开。但第二天早饭，孩子吃了。'; } }, ai: 0.6 }),
    D({ id: 'mid_job', a0: 38, a1: 55, once: true, icon: 'office', p: 0.12, if: (S) => S.job === 'office' || S.job === 'factory',
      ask: () => '新来的领导比你小十五岁。他问你：有没有考虑过换个方向？',
      L: { t: '忍着', run(S) { fx(S, { ye: -5, shi: 2 }); return '你学会了在会议上不说话。'; } },
      R: { t: '自己干', run(S) { S.job = 'trade'; if (chance(0.35)) { fx(S, { shi: 7, ye: 7 }); mark(S, 'bloom'); return '开头两年很难。后来居然成了。'; } fx(S, { shi: -8, ye: -5 }); if (S.q > 1) S.q--; mark(S, 'dry'); return '你把积蓄赔了进去，又回去找了份工。'; } }, ai: 0.35 }),
    D({ id: 'machine', a0: 30, a1: 62, once: true, icon: 'factory', p: 0.14, if: (S, c) => (S.job === 'factory' || S.job === 'office') && c.net > 40,
      ask: () => '厂里新来了一批机器，不吃饭，不请假。人事说要转岗培训。',
      L: { t: '混到退休', run(S) { fx(S, { shi: -4, ye: -2 }); return '你的位置，一年比一年靠近门口。'; } },
      R: { t: '从头学', run(S) { fx(S, { shi: 7, gen: -2 }); return `你 ${S.age} 岁了，重新拿起本子，记下机器上每一个按键的用处。`; } }, ai: 0.5 }),
    D({ id: 'checkup', a0: 40, a1: 75, cool: 18, icon: 'clinic', p: 0.04,
      ask: () => '单位体检，有一项指标被打了星号。',
      L: { t: '不管它', run(S) { if (chance(0.4)) { fx(S, { gen: -8 }); mark(S, 'scar'); risk(S, 1.6, 'cancer'); return '两年后，它不是星号了。'; } return '后来也没怎么样。'; } },
      R: { t: '去复查', run(S) { fx(S, { gen: 4, ye: -1 }); return '发现得早，切掉了。'; } }, ai: (S) => clamp(0.3 + S.q * 0.12, 0.2, 0.9) }),
    D({ id: 'old_friend', a0: 35, a1: 70, once: true, icon: 'family', p: 0.025,
      ask: () => '老同学张罗聚会。二十年没见了。',
      L: { t: '找个借口', run(S) { fx(S, { zhi: -2 }); return '后来有人带来一张合影，你看了很久。'; } },
      R: { t: '去', run(S) { fx(S, { zhi: 6, ye: 4 }); return '大家都老了。一喝酒，又都没老。'; } }, ai: 0.6 }),
    D({ id: 'marriage_cold', a0: 32, a1: 60, once: true, icon: 'home', p: 0.035, if: (S) => S.married && S.spouse && S.spouse.alive,
      ask: () => '你们已经很久没好好说过话了。',
      L: { t: '分开', run(S) { S.married = false; S.spouse = null; S.flags.dating = false; fx(S, { ye: -6, zhi: -7 }); mark(S, 'frost'); return '东西分得很快。照片不知道该归谁。'; } },
      R: { t: '坐下来谈', run(S) { fx(S, { zhi: 5, ye: 2 }); return '你们在阳台上坐到了半夜。'; } }, ai: 0.75 }),
    D({ id: 'build_road', a0: 30, a1: 70, once: true, icon: 'road', p: 0.06, if: (S) => !S.urban,
      ask: () => '村里要集资修路，每家出一笔。',
      L: { t: '不出', run(S) { fx(S, { zhi: -4 }); return '路修好了。你走的时候，总觉得有人在看。'; } },
      R: { t: '出', run(S) { fx(S, { zhi: 6, shi: -2 }); return '水泥路一直通到了村口。'; } }, ai: 0.7 }),
    D({ id: 'adopt_stray', a0: 40, a1: 75, once: true, icon: 'child', p: 0.012,
      ask: () => '亲戚家出了事，留下一个孩子，没人愿意接。',
      L: { t: '帮着出点钱', run(S) { fx(S, { shi: -1, zhi: 1 }); return '逢年过节，你会去看看那孩子。'; } },
      R: { t: '接回家', run(S) { S.kids.push({ y: S.age - 8, boy: chance(0.5), alive: true }); fx(S, { zhi: 8, ye: 4, shi: -3 }); mark(S, 'bloom'); return '家里多了一张书桌。'; } }, ai: 0.4 }),
    D({ id: 'parent_nurse', a0: 38, a1: 72, once: true, icon: 'elder', p: 0.06, if: (S) => (S.age < S.parents.fDie || (!S.parents.momBirth && S.age < S.parents.mDie)) && S.age > 40,
      ask: () => '父母老了，需要有人在身边。你的工作在外地。',
      L: { t: '花钱请人', run(S) { fx(S, { zhi: -4, shi: -2 }); return '你每周打电话问一次。他们总说挺好的，要你放心。'; } },
      R: { t: '回去照顾', run(S) { fx(S, { zhi: 7, ye: -2, shi: -5 }); return '你学会了给人翻身、喂饭。'; } }, ai: 0.5 }),
    // ---- 晚年 ----
    D({ id: 'to_kids', a0: 62, a1: 90, once: true, icon: 'home', p: 0.07, if: (S) => aliveKids(S).length > 0,
      ask: () => '孩子说，把你接到城里一起住吧。',
      L: { t: '住惯老地方', run(S) { fx(S, { ye: 2, zhi: -2 }); return '院子里那棵树，还得有人浇水。'; } },
      R: { t: '搬过去', run(S) { S.urban = true; fx(S, { zhi: 4, ye: -3 }); return '电梯你学了三天。楼下一个熟人也没有。'; } }, ai: 0.5 }),
    D({ id: 'smartphone_old', a0: 62, a1: 88, once: true, icon: 'phone', era: [2010, 9999], p: 0.06, if: (S, c) => c.net > 40,
      ask: () => '孙辈教你用手机视频，教了三遍了。',
      L: { t: '算了，太难', run(S) { fx(S, { ye: -1 }); return '你还是喜欢等电话。'; } },
      R: { t: '再教一遍', run(S) { fx(S, { zhi: 5, ye: 4 }); S.flags.phone = true; return '第一次接通的时候，你对着屏幕喊得很大声。'; } }, ai: 0.65 }),
    D({ id: 'memoir', a0: 65, a1: 95, once: true, icon: 'book', p: 0.05,
      ask: () => '孩子问你：你年轻时候是什么样的？',
      L: { t: '没什么好说的', run(S) { fx(S, { ye: -1 }); return '你摆了摆手，接着看电视。'; } },
      R: { t: '从头讲', run(S) { fx(S, { zhi: 6, ye: 6 }); return '你讲了三个晚上。很多事是第一次说。'; } }, ai: 0.7 }),
    D({ id: 'last_visit', a0: 68, a1: 95, once: true, icon: 'road', p: 0.1, if: (S) => S.cur !== S.born || S.urban !== S.urban0,
      ask: () => '你想再回一趟出生的地方。路很远，医生不建议。',
      L: { t: '听医生的', run(S) { fx(S, { ye: -2 }); return '你让孩子把那边的照片放大，贴在墙上。'; } },
      R: { t: '回去', run(S) { fx(S, { ye: 10, gen: -4 }); mark(S, 'bloom'); return '你摸了摸老房子的门框，上面还有你的身高线。'; } }, ai: 0.5 }),
    D({ id: 'care_home', a0: 75, a1: 105, once: true, icon: 'elder', p: 0.14, if: (S, c) => rich(c) || S.q >= 4,
      ask: () => '你一个人住，已经摔过两次了。孩子看了几家养老院。',
      L: { t: '在家待着', run(S) { fx(S, { gen: -3, ye: 3 }); return '你在每个房间都放了一把椅子。'; } },
      R: { t: '去养老院', run(S) { fx(S, { gen: 4, ye: -4, zhi: 2 }); return '同屋的老人每天问你一遍叫什么。'; } }, ai: 0.5 }),
    D({ id: 'will', a0: 70, a1: 105, once: true, icon: 'coins', p: 0.1, if: (S) => aliveKids(S).length > 1,
      ask: () => '你手上还有点东西，孩子们都盯着。',
      L: { t: '分给最需要的', run(S) { fx(S, { zhi: -3, ye: 2 }); return '有人谢你，有人不再来看你。'; } },
      R: { t: '一人一份', run(S) { fx(S, { zhi: 3 }); return '谁也没有特别高兴。这大概就算公平。'; } }, ai: 0.5 }),
    D({ id: 'plant', a0: 60, a1: 110, once: true, icon: 'field', p: 0.05,
      ask: () => '邻居送了你一棵小树苗。它结果的时候，你多半看不到了。',
      L: { t: '送给别人', run(S) { fx(S, { ye: -1 }); return '你说，种了也是浪费。'; } },
      R: { t: '种下', run(S) { fx(S, { ye: 8, zhi: 2 }); mark(S, 'bloom'); return '你每天去看它一眼。它会比你活得久。'; } }, ai: 0.7 }),
  ];

  NL.register(E);
  NL.register(E2);
})(typeof globalThis !== 'undefined' ? globalThis : this);
