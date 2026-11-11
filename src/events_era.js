/* 年轮 · 年代事件（原创）
 *
 * 第三根轴：不只是「在哪儿」，还有「什么时候」。
 * 事件按「发生年份」分成五段，用 era 字段声明，引擎按 S.year0 + S.age 判断。
 * 只写生活层面的变化：家里多了什么、街上少了什么、工作怎么找、钱怎么花。
 */
(function (root) {
  'use strict';
  const NL = root.NL;
  const { ri, pick, chance, clamp, fx, mark, risk } = NL.util;

  const E = [];

  // ==================== 1945–1969 ====================
  E.push(
    {
      id: 'era_radio', a0: 8, a1: 40, p: 0.18, once: true, icon: 'phone',
      era: [1945, 1969],
      run(S) {
        fx(S, { ye: 7, zhi: 5 });
        return '家里买了一台收音机，木壳的，要插电。晚上一家人围着听，声音调得很小。';
      },
    },
    {
      id: 'era_sugar', a0: 2, a1: 10, p: 0.21, once: true, icon: 'clinic',
      era: [1955, 1969],
      run(S) {
        fx(S, { gen: 2 });
        return '防疫队来了，给每个孩子发了一颗糖丸。你含在嘴里，舍不得咽。后来才知道那是疫苗。';
      },
    },
    {
      id: 'era_letter', a0: 16, a1: 50, p: 0.18, cool: 3, icon: 'book',
      era: [1945, 1985],
      run(S) {
        fx(S, { zhi: 5, ye: 4 });
        return pick([
          '一封家书走了十一天。你把它读了三遍，然后收进箱子。',
          '你去邮局打电报，一个字几分钱。你把想说的话删到十几个字。',
          '汇款单到了，是家里寄来的。你去邮局排队取，排了两个小时。',
        ]);
      },
    },
    {
      id: 'era_sewing', a0: 10, a1: 45, p: 0.132, once: true, icon: 'home',
      era: [1950, 1979],
      run(S) {
        fx(S, { shi: 5, zhi: 4 });
        return '家里买了台缝纫机，踩起来哒哒响。全家的衣服都从这块台面上出来。';
      },
    },
    {
      id: 'era_bike', a0: 12, a1: 45, p: 0.18, once: true, icon: 'road',
      era: [1955, 1989],
      run(S) {
        fx(S, { ye: 7, shi: 4 });
        return '你有了第一辆自行车。骑回来那天在院子里转了很多圈，舍不得骑出去。';
      },
    },
    {
      id: 'era_movie', a0: 6, a1: 42, p: 0.15, cool: 3, icon: 'moon', cult: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
      era: [1950, 1985],
      run(S) {
        fx(S, { ye: 9, zhi: 6 });
        return '放映队来了，在空地上挂起幕布。全村人搬着凳子去，孩子挤在最前面。';
      },
    },
    {
      id: 'era_literacy', a0: 14, a1: 45, p: 0.12, once: true, icon: 'book', cult: ['cn', 'sas', 'sea', 'ssa', 'mena', 'lat'],
      era: [1949, 1965],
      run(S) {
        fx(S, { shi: 5, ye: 4 });
        return '夜校开班，教认字。你白天干活，晚上去写黑板，手指头被粉笔磨得发白。';
      },
    },
    {
      id: 'era_bigfamily', a0: 0, a1: 20, p: 0.21, once: true, icon: 'family', cult: ['cn', 'sas', 'sea', 'ssa', 'mena', 'lat'],
      era: [1945, 1975],
      run(S) {
        fx(S, { zhi: 8, shi: -3 });
        return '家里兄弟姐妹六七个，晚上挤在一起睡，被子不够分。';
      },
    }
  );

  // ==================== 1970–1989 ====================
  E.push(
    {
      id: 'era_tv', a0: 6, a1: 45, p: 0.21, once: true, icon: 'home',
      era: [1970, 1989],
      run(S) {
        fx(S, { ye: 9, zhi: 6 });
        return pick([
          '家里买了第一台电视，黑白的，十二寸。邻居晚上都来看，屋里坐不下就站在窗外。',
          '电视只有一个频道，晚上十点就没节目了。你还是舍不得关。',
        ]);
      },
    },
    {
      id: 'era_tape', a0: 14, a1: 38, p: 0.168, once: true, icon: 'phone',
      era: [1978, 1995],
      run(S) {
        fx(S, { ye: 8, zhi: 4, shi: -3 });
        return '你攒钱买了一台录音机，双卡的。磁带翻录了很多遍，声音都糊了，你还是天天听。';
      },
    },
    {
      id: 'era_college77', a0: 20, a1: 35, p: 0.36, once: true, dec: true, icon: 'diploma', cult: ['cn'], iso: ['CHN'],
      era: [1977, 1980],
      if: (S) => S.edu < 3,
      ask: () => '听说大学又开始考了。报名的人比考场还多。',
      L: {
        t: '去考',
        run(S, c) {
          if (chance(clamp(0.12 + (S.q - 3) * 0.08 + (c.ter - 40) / 200, 0.02, 0.6))) { S.edu = 3; fx(S, { shi: 18, ye: 10, zhi: 6 }); mark(S, 'bloom'); return '你考上了。通知书是一张薄纸，家里把它贴在墙上。'; }
          S.edu = 2; fx(S, { ye: -8 }); return '你没考上。那年录取的人太少了。你回到原来的活上。';
        },
      },
      R: {
        t: '算了，接着干活',
        run(S) { fx(S, { shi: 3 }); return '你没去考。后来听说隔壁村有个人考上了，走了再没回来。'; },
      },
      ai: 0.6,
    },
    {
      id: 'era_individual', a0: 24, a1: 48, p: 0.156, once: true, dec: true, icon: 'coins', cult: ['cn'], iso: ['CHN'],
      era: [1980, 1995],
      ask: () => '政策松了，可以自己领执照做生意。要凑一笔本钱。',
      L: {
        t: '稳稳当当上班',
        run(S) { fx(S, { shi: 3, ye: 2 }); return '你没动。身边的人有的发了，有的赔了，你照样每月领工资。'; },
      },
      R: {
        t: '去领执照',
        run(S) {
          if (chance(0.55)) { S.job = 'trade'; fx(S, { shi: 12, ye: 8 }); mark(S, 'bloom'); return '你办了执照，在街口租了间门面。第一年就把本钱挣回来了。'; }
          fx(S, { shi: -8, ye: -6 }); return '你干了两年，赔了本钱，把设备折价卖了。';
        },
      },
      ai: 0.4,
    },
    {
      id: 'era_townshop', a0: 18, a1: 45, p: 0.144, once: true, icon: 'factory', cult: ['cn'], iso: ['CHN'],
      era: [1984, 1998],
      run(S) {
        fx(S, { shi: 6, zhi: 4 }); S.job = S.job || 'factory';
        return '镇上新开了个厂，做零件的。你去做工，一天八小时，月底发工资。';
      },
    },
    {
      id: 'era_motorbike', a0: 18, a1: 45, p: 0.15, once: true, icon: 'road',
      era: [1985, 2005],
      run(S) {
        fx(S, { ye: 8, shi: -4, gen: -1 });
        return '你买了一辆摩托。骑回家那天，全村的孩子都围过来看。';
      },
    },
    {
      id: 'era_migrant', a0: 17, a1: 42, p: 0.18, once: true, dec: true, icon: 'road', cult: ['cn', 'sea'], iso: ['CHN'],
      era: [1988, 2008],
      ask: () => '南方的厂子在招人，包住不包吃。听说一个月能挣家里半年的钱。',
      L: {
        t: '留在本地',
        run(S) { fx(S, { zhi: 5 }); return '你留下了。后来出去的人回来过节，穿得不一样，说话也变了。'; },
      },
      R: {
        t: '南下',
        run(S) {
          fx(S, { shi: 8, zhi: -7, gen: -2 }); S.migrated = true; S.job = 'factory';
          return '你坐了三十个小时的火车。厂里八个人一间宿舍，流水线上不许说话。';
        },
      },
      ai: 0.5,
    },
    {
      id: 'era_coupon', a0: 12, a1: 55, p: 0.132, once: true, icon: 'coins', cult: ['cn'], iso: ['CHN'],
      era: [1990, 1996],
      run(S) {
        fx(S, { ye: 4, shi: 2 });
        return '粮票不用了。家里抽屉里还剩一沓，母亲没舍得扔，说留着吧。';
      },
    }
  );

  // ==================== 1990–2004 ====================
  E.push(
    {
      id: 'era_pager', a0: 15, a1: 42, p: 0.21, once: true, icon: 'phone',
      era: [1993, 2002],
      run(S) {
        fx(S, { ye: 7, zhi: 5, shi: -3 });
        return '你腰间别了一个传呼机。响了要到处找公用电话，排队回过去。';
      },
    },
    {
      id: 'era_mobile', a0: 18, a1: 45, p: 0.18, once: true, icon: 'phone',
      if: (S, c) => c.id !== 'NGA' || S.year0 + S.age >= 2001,
      era: [1996, 2006],
      run(S) {
        fx(S, { ye: 8, shi: -6 });
        return '你买了第一部手机。翻盖的，来电显示是一串号码。话费很贵，你只接不打。';
      },
    },
    {
      id: 'era_netbar', a0: 14, a1: 30, p: 0.24, once: true, icon: 'office', cult: ['cn', 'sea'],
      era: [1998, 2010],
      run(S) {
        fx(S, { ye: 8, shi: 3 });
        return pick([
          '网吧里全是烟味和按键声。你开了台机器，一小时几块钱。',
          '你第一次上网。盯着屏幕看了很久，不知道该点什么。',
        ]);
      },
    },
    {
      id: 'era_dialup', a0: 14, a1: 40, p: 0.15, once: true, icon: 'office',
      era: [1996, 2005],
      if: (S, c) => c.inc === 'HIC',
      run(S) {
        fx(S, { ye: 6, shi: 4 });
        return '家里装了宽带。拨号的时候有杂音，接电话就断网。你妈一拿起话筒，你就喊。';
      },
    },
    {
      id: 'era_sars', a0: 6, a1: 60, p: 0.21, once: true, icon: 'fever',
      era: [2002, 2004],
      run(S) {
        fx(S, { gen: -2, ye: -6, shi: -3 }); mark(S, 'frost');
        return '街上没什么人。进门要量体温，学校放了很长的假，你在家里待了两个月。';
      },
    },
    {
      id: 'era_soe', a0: 30, a1: 52, p: 0.18, once: true, icon: 'factory',
      era: [1995, 2003],
      if: (S, c) => c.id === 'CHN',
      run(S) {
        fx(S, { shi: -10, ye: -9 }); S.job = 'trade'; risk(S, 1.05);
        return '厂子改制，你买断工龄回了家。那笔钱不多，你用它在街边支了个摊。';
      },
    },
    {
      id: 'era_asian', a0: 22, a1: 55, p: 0.168, once: true, icon: 'coins',
      era: [1997, 2000],
      if: (S, c) => /EAS|SEA/.test(c.reg),
      run(S) {
        fx(S, { shi: -9, ye: -7 });
        return '钱一夜之间不值钱了。你去银行排队，前面的人都在取现金。';
      },
    },
    {
      id: 'era_sms', a0: 15, a1: 45, p: 0.18, cool: 3, icon: 'phone',
      era: [1998, 2012],
      run(S) {
        fx(S, { zhi: 6, ye: 4 });
        return pick([
          '一条短信一毛钱。你打字很慢，一句话要摁几分钟。',
          '你每个月发几百条短信，月底账单出来，超出套餐一倍。',
        ]);
      },
    }
  );

  // ==================== 2005–2016 ====================
  E.push(
    {
      id: 'era_smart', a0: 12, a1: 60, p: 0.24, once: true, icon: 'phone',
      era: [2010, 2018],
      run(S) {
        fx(S, { ye: 9, shi: -4 });
        return '你换了智能手机。第一次用手指在屏幕上滑，觉得不太真实。';
      },
    },
    {
      id: 'era_ecom', a0: 18, a1: 62, p: 0.18, once: true, icon: 'coins',
      era: [2008, 2020],
      run(S) {
        fx(S, { ye: 6, shi: -3 });
        return '你第一次在网上买东西。快递三天到，拆开的时候有点怀疑，这么便宜也能用。';
      },
    },
    {
      id: 'era_im', a0: 16, a1: 65, p: 0.21, once: true, icon: 'phone',
      era: [2011, 2022],
      if: (S, c) => c.id === 'CHN' || c.id === 'HKG' || c.id === 'MAC',
      run(S) {
        fx(S, { zhi: 8, ye: 5 });
        return '你装了微信。家族群里每天几十条消息，都是转发和早安图。你设了免打扰。';
      },
    },
    {
      id: 'era_gfc', a0: 22, a1: 58, p: 0.18, once: true, icon: 'coins',
      era: [2008, 2012],
      if: (S, c) => c.inc === 'HIC',
      run(S) {
        fx(S, { shi: S.flags.mortgage ? -10 : -5, ye: -8 }); risk(S, 1.05);
        return S.flags.mortgage ? '金融危机里，街上关了很多店。房子估值低了，贷款一分没少。' : '金融危机里，街上关了很多店。你重新算了积蓄，决定先留一笔应急的钱。';
      },
    },
    {
      id: 'era_hsr', a0: 18, a1: 65, p: 0.168, once: true, icon: 'road',
      era: [2008, 2024],
      if: (S, c) => c.id === 'CHN',
      run(S) {
        fx(S, { zhi: 6, ye: 6 });
        return '高铁通了。以前要坐一天的路，现在三个小时。你回家的次数多了一倍。';
      },
    },
    {
      id: 'era_delivery', a0: 20, a1: 55, p: 0.18, once: true, icon: 'coins',
      era: [2013, 2026],
      if: (S) => S.urban,
      run(S) {
        fx(S, { ye: 4, shi: 3 });
        return '小区门口多了一排快递柜。你下班顺手取，一次取三个。';
      },
    },
    {
      id: 'era_fukushima', a0: 0, a1: 85, p: 0.3, once: true, icon: 'quake',
      era: [2011, 2011],
      if: (S, c) => c.id === 'JPN',
      run(S) {
        fx(S, { gen: -2.5, ye: -9, shi: -6 }); mark(S, 'scar');
        return '东日本地震与海啸的消息传来。你反复联系亲友，商店里多了节电和限购的告示。';
      },
    },
    {
      id: 'era_wenchuan', a0: 0, a1: 85, p: 0.24, once: true, icon: 'quake',
      era: [2008, 2008],
      if: (S, c) => c.id === 'CHN',
      run(S) {
        fx(S, { gen: -2, ye: -9, zhi: -5 }); mark(S, 'scar');
        return '汶川地震的消息传来。之后很多天，你都在等新闻里的救援消息，也在打听亲友是否平安。';
      },
    }
  );

  // ==================== 2017–2026 ====================
  E.push(
    {
      id: 'era_shortvideo', a0: 12, a1: 72, p: 0.21, once: true, icon: 'phone',
      era: [2017, 2026],
      run(S) {
        fx(S, { ye: 5, gen: -1 });
        return '一刷就到半夜。你放下手机，眼睛发涩，想不起来刚才看了什么。';
      },
    },
    {
      id: 'era_pandemic', a0: 0, a1: 90, p: 0.27, once: true, icon: 'fever',
      era: [2020, 2023],
      run(S) {
        fx(S, { gen: -2.5, ye: -8, zhi: -7, shi: -5 }); mark(S, 'frost');
        return pick([
          '街上空了。出门要戴口罩，进店要测体温。你在家待了很久，日子分不清星期几。',
          '有人病了，有人失业了。你学会在视频里跟人见面，也学会了等。',
        ]);
      },
    },
    {
      id: 'era_inflation', a0: 20, a1: 75, p: 0.18, cool: 3, icon: 'coins',
      era: [2021, 2026],
      run(S) {
        fx(S, { shi: -6, ye: -4 });
        return '同样的钱，买的东西少了。你在超市里算每克多少钱，以前从来不看。';
      },
    },
    {
      id: 'era_remote', a0: 24, a1: 60, p: 0.18, once: true, icon: 'office',
      era: [2020, 2026],
      if: (S) => S.job === 'office',
      run(S) {
        fx(S, { ye: 4, gen: -1.5, zhi: -3 });
        return '你开始在家办公。会议都在屏幕上，一天下来，一句话也没跟人当面说。';
      },
    },
    {
      id: 'era_ai', a0: 18, a1: 75, p: 0.18, once: true, icon: 'office',
      era: [2023, 2026],
      run(S) {
        fx(S, { ye: -3, shi: 5 });
        return pick([
          '你把一半的活交给了机器。它做得快，但有些地方一看就不对，你还得自己改。',
          '公司说要用新工具。培训开了两次，用的人不多，但用的人确实快了一倍。',
        ]);
      },
    },
    {
      id: 'era_house', a0: 25, a1: 58, p: 0.132, cool: 3, icon: 'home',
      era: [2018, 2026],
      if: (S, c) => c.id === 'CHN' && S.flags.home,
      run(S) {
        fx(S, { shi: -4, ye: -4 });
        return '附近几套同类房子的成交价比你买时低。你把账单又算了一遍，日常开销先紧一紧。';
      },
    },
    {
      id: 'era_gigeconomy', a0: 20, a1: 45, p: 0.168, once: true, icon: 'road', cult: ['cn', 'sea', 'sas', 'lat', 'mena'],
      era: [2016, 2026],
      run(S) {
        fx(S, { shi: 4, gen: -1.5, ye: -2 }); if (!S.job) S.job = 'trade';
        return '你注册成了骑手。单子多的时候一天跑十几个小时，系统一直在倒计时。';
      },
    },
    {
      id: 'era_heatwave', a0: 0, a1: 85, p: 0.168, cool: 3, icon: 'drought',
      era: [2019, 2026],
      run(S) {
        fx(S, { gen: -1.5, ye: -4 }); risk(S, 1.04, 'heat');
        return '夏天一年比一年热。新闻里说这是有记录以来最热的一年，去年也这么说。';
      },
    }
  );

  NL.register(E);
})(typeof globalThis !== 'undefined' ? globalThis : this);
