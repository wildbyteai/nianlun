/* 年轮 · 文化圈事件 上册：华语圈、日韩、欧美（原创）
 *
 * 文化圈只共享适用的日常场景；考试、住房与地名另用 iso / era 收窄。
 * 国家制度节点的补充见 events_country.js；概率与状态变化是游戏设定。
 */
(function (root) {
  'use strict';
  const NL = root.NL;
  const { ri, pick, chance, clamp, fx, mark, risk, wpick } = NL.util;

  const E = [];

  // ==================== 华语圈 ====================
  const CN = ['cn'];
  E.push(
    {
      id: 'cn_dusheng', a0: 5, a1: 9, p: 0.33, once: true, icon: 'home', cult: CN, iso: ['CHN'], era: [1980, 2026],
      if: (S) => S.sibs === 0 && S.sibPlan === 0,
      run(S) {
        fx(S, { zhi: -4 });
        return pick([
          '邻居逗你：你爸妈就你一个，将来四个老人全靠你。你听不懂，只顾着玩。',
          '你听见大人压着声音说，就这一个，将来怎么办。屋里安静了一会儿。',
        ]);
      },
    },
    {
      id: 'cn_jiazhang', a0: 8, a1: 13, p: 0.18, cool: 3, icon: 'school', cult: CN,
      run(S) {
        const good = S.st.shi > 45 || chance(0.4);
        if (good) { fx(S, { ye: 5, zhi: 3 }); return '开完家长会，你妈回来把成绩单摊在桌上，一项一项看。看完什么也没说，去厨房多炒了一个菜。'; }
        fx(S, { ye: -6 }); return '开完家长会，你爸一路没说话。到家才问了一句：你上课都在干什么。';
      },
    },
    {
      id: 'cn_zhongkao', a0: 14, a1: 15, p: 1, once: true, dec: true, icon: 'book', cult: CN, iso: ['CHN'], era: [1978, 9999], rank: 6,
      if: (S) => S.school,
      ask: () => '中考出分了。普高和职业学校，你要选一条路。',
      L: {
        t: '去职校学门手艺',
        run(S) { S.edu = 2; S.flags.vocational = true; fx(S, { shi: 6, ye: -3 }); mark(S, 'bloom'); return '你去了职业学校，开始学机械加工。车间里要先学会认每一种工具。'; },
      },
      R: {
        t: '再拼一次，考普高',
        run(S, c) {
          const p = clamp(0.34 + (S.q - 3) * 0.12 + (c.sec - 80) / 100, 0.05, 0.9);
          if (chance(p)) { S.edu = 2; fx(S, { shi: 7, ye: 5 }); mark(S, 'bloom'); return '你考上了普高。分数刚好压线，家里松了一口气。'; }
          S.edu = 2; S.flags.vocational = true; fx(S, { ye: -8, shi: -2 }); return `差了 ${ri(2, 26)} 分。你转向职业课程，宿舍在一栋很旧的楼里。`;
        },
      },
      ai: (S, c) => clamp(0.4 + (c.sec - 80) / 120 + (S.q - 3) * 0.1, 0.1, 0.9),
    },
    {
      id: 'cn_gaokao', a0: 17, a1: 18, p: 1, once: true, dec: true, icon: 'diploma', cult: CN, iso: ['CHN'], era: [1977, 9999], rank: 7,
      if: (S) => S.school && S.edu === 2 && !S.flags.vocational,
      ask: () => '高考。考场外站满了送考的家长。',
      L: {
        t: '报省内的学校',
        run(S, c) {
          if (chance(clamp(c.ter / 100 + 0.15, 0.1, 0.9))) { S.edu = 3; fx(S, { shi: 8, ye: 5, zhi: 4 }); mark(S, 'bloom'); return '你被省内一所大学录取。' + (S.year0 + S.age >= 2008 ? '你查了回家的车次，想着放假就能回去。' : '你把通知书和火车票放在一起，母亲又检查了一遍行李。'); }
          S.edu = 2; S.school = false; fx(S, { ye: -7 }); return '你落榜了。查分那天夜里，你在楼道里坐了很久。';
        },
      },
      R: {
        t: '报很远的外省',
        run(S) {
          if (chance(0.55)) { S.edu = 3; fx(S, { shi: 12, ye: 8 }); S.migrated = true; mark(S, 'bloom'); return '你被一所很远的大学录取。第一次坐那么久的火车，窗外的地形一路在变。'; }
          S.edu = 2; S.school = false; S.job = 'factory'; fx(S, { ye: -9, zhi: -5 }); return '你没考上，也不想复读。去了外地一家厂。';
        },
      },
      ai: 0.45,
    },
    {
      id: 'cn_kaoyan', a0: 21, a1: 25, p: 0.21, once: true, dec: true, icon: 'book', cult: CN, iso: ['CHN'], era: [1978, 9999],
      if: (S) => S.edu >= 3,
      ask: () => '毕业前，宿舍的人都在准备考研。',
      L: {
        t: '直接工作',
        run(S, c) { S.job = 'office'; fx(S, { shi: 3, ye: 2 }); return '你没考研，签了一家公司的三方协议。工资不高，但总算有了去处。'; },
      },
      R: {
        t: '再考一年',
        run(S) {
          if (chance(clamp(0.3 + (S.q - 3) * 0.12, 0.08, 0.8))) { S.edu = 4; fx(S, { shi: 14, ye: 6 }); mark(S, 'bloom'); return '你考上了。分数线出来那晚，你在自习室哭了一场，然后接着背书。'; }
          S.job = 'trade'; fx(S, { ye: -10, shi: 2 }); return '第二年还是差了十几分。你去了家小公司做运营，把书都收进了纸箱。';
        },
      },
      ai: 0.55,
    },
    {
      id: 'cn_chunyun', a0: 18, a1: 50, p: 0.072, cool: 4, icon: 'road', cult: CN, iso: ['CHN'],
      if: (S) => S.migrated || S.job === 'factory' || !S.urban0,
      run(S) {
        fx(S, { zhi: 4, gen: -1.5 });
        return pick([
          '抢到一张站票。你在车厢连接处站了十四个小时，脚肿了，但你还是愿意。',
          '春运的候车厅里坐满了人，你把行李垫在头下睡了一夜。',
          '火车晚点六个小时。到家时天已经亮了，你妈在门口等着，手里还拿着一件外套。',
        ]);
      },
    },
    {
      id: 'cn_shoufu', a0: 26, a1: 40, p: 0.18, once: true, dec: true, icon: 'home', cult: CN, iso: ['CHN'], era: [1999, 9999],
      if: (S) => (!S.urban0 || S.q >= 3) && !S.flags.home,
      ask: () => '售楼处把首付和月供列在一张纸上。凑齐首付，要用掉家里大半积蓄。',
      L: {
        t: '先不买，继续租',
        run(S) { fx(S, { ye: 4, shi: 3 }); return '你没买。房东第二年涨了租，你搬了一次家。'; },
      },
      R: {
        t: '凑齐首付买下来',
        run(S) {
          S.flags.home = true; S.flags.mortgage = true; fx(S, { shi: 10, ye: -6, gen: -1.5 }); risk(S, 1.02); mark(S, 'bloom');
          return '你签了三十年的贷款。每个月还完，卡里只剩一点。但钥匙拿到手那天，你在空房子里站了很久。';
        },
      },
      ai: 0.6,
    },
    {
      id: 'cn_chaiqian', a0: 30, a1: 60, p: 0.03, once: true, dec: true, icon: 'home', cult: CN, iso: ['CHN'], era: [1999, 9999],
      if: (S) => !S.urban0 || S.q >= 3,
      ask: () => '老房子贴了通知，要拆。签字能选两套回迁房，或者一笔补偿款。',
      L: {
        t: '要房',
        run(S) { fx(S, { shi: 14, zhi: -6, ye: -4 }); S.flags.moved = true; return '你要了两套回迁房。三年后交房，小区在原来的位置上，但邻居换了大半。'; },
      },
      R: {
        t: '要钱',
        run(S) { fx(S, { shi: 9, ye: 6 }); return '你拿了补偿款，在别处买了一套大一点的。搬家那天你回头看了一眼那条巷子。'; },
      },
      ai: 0.5,
    },
    {
      id: 'cn_waimai', a0: 24, a1: 45, p: 0.084, cool: 2, icon: 'factory', cult: CN, iso: ['CHN'], era: [2010, 9999],
      if: (S) => S.job === 'office' || S.job === 'factory',
      run(S) {
        fx(S, { gen: -2, ye: -3 });
        return pick([
          '你在工位上吃外卖，塑料盒摞在垃圾桶边上。抬头看表，已经十一点。',
          '周报写到第三版。你点了碗面，吃的时候已经不烫了。',
          '下班的地铁上你睡着了，坐过了两站。',
        ]);
      },
    },
    {
      id: 'cn_qun', a0: 30, a1: 55, p: 0.06, cool: 5, dec: true, icon: 'phone', cult: CN, era: [2000, 9999],
      if: (S) => S.edu >= 2,
      ask: (S) => `高中同学群里有人张罗聚会，叫 ${S.year0 + 18} 届的同学都来。`,
      L: {
        t: '不去',
        run(S) { fx(S, { ye: 2 }); return '你没去。后来在群里看到合照，认出了几个人，没说话。'; },
      },
      R: {
        t: '去一趟',
        run(S) {
          const ok = chance(0.5);
          if (ok) { fx(S, { zhi: 8, ye: 5 }); return '饭桌上聊起从前，笑得停不下来。有人说你一点没变。'; }
          fx(S, { ye: -5 }); return '一桌人聊房子、聊孩子、聊谁混得好。你吃完就先走了。';
        },
      },
      ai: 0.4,
    },
    {
      id: 'cn_hongbao', a0: 22, a1: 70, p: 0.096, cool: 3, icon: 'coins', cult: CN,
      run(S) {
        fx(S, { shi: -3, zhi: 5 });
        return pick([
          '过年发红包，你把要给孩子们的一个个分好，口袋很快就空了。',
          '你妈把红包塞回你手里，说你自己留着。你又塞回去。',
          '亲戚家的孩子考上了大学，你包了一个厚一点的红包。',
        ]);
      },
    },
    {
      id: 'cn_silaoren', a0: 35, a1: 58, p: 0.12, once: true, icon: 'elder', cult: CN,
      if: (S) => S.parents && S.married,
      run(S) {
        fx(S, { gen: -3, ye: -5, zhi: 3 }); mark(S, 'bloom');
        return '两边家里都有老人需要照顾。你把复诊日期抄在纸上，在工作和医院之间排时间。';
      },
    },
    {
      id: 'cn_xuequ', a0: 30, a1: 45, p: 0.096, once: true, dec: true, icon: 'school', cult: CN, iso: ['CHN'], era: [2000, 9999],
      if: (S) => S.married && S.kids.some((k) => k.alive && k.age0 + (S.age - k.at) >= 4 && k.age0 + (S.age - k.at) <= 7),
      ask: () => '孩子要上小学了。片区内的学校一般，另一所好一点的，得换套房。',
      L: {
        t: '就上片区内的',
        run(S) { fx(S, { ye: 3 }); return '孩子就近上了学。接送十分钟，你觉得这样也挺好。'; },
      },
      R: {
        t: '换房，去好学区',
        run(S) {
          if (S.q >= 4) { fx(S, { shi: -12, gen: -2.5, ye: 4 }); mark(S, 'bloom'); return '你把房子换到了老城区，面积小了一半。孩子进了那所学校。'; }
          fx(S, { shi: -16, gen: -4, ye: -6 }); risk(S, 1.03);
          return '你借了钱换房，背上了第二笔贷款。孩子进去了，你开始算每一笔开销。';
        },
      },
      ai: 0.55,
    },
    {
      id: 'cn_peidu', a0: 36, a1: 52, p: 0.06, once: true, icon: 'home', cult: CN, iso: ['CHN'],
      if: (S) => S.kids.some((k) => k.alive && k.age0 + (S.age - k.at) >= 12 && k.age0 + (S.age - k.at) <= 17),
      run(S) {
        fx(S, { gen: -2.5, zhi: -4, ye: -3 });
        return '为了孩子上高中，你在学校旁边租了个小房子，一个人陪读。另一半留在原地。';
      },
    },
    {
      id: 'cn_tijian', a0: 40, a1: 65, p: 0.108, cool: 3, icon: 'clinic', cult: CN,
      run(S) {
        if (chance(0.3)) {
          fx(S, { gen: -2.5 }); risk(S, 1.05);
          return '体检报告上有一项被标了箭头。医生说先观察，三个月后复查。你把单子折起来放进了钱包。';
        }
        fx(S, { ye: 4 });
        return '体检报告基本正常。你回家把那张纸摊开，说医生让照常吃饭、照常走路。';
      },
    },
    {
      id: 'cn_fangjia', a0: 28, a1: 55, p: 0.072, cool: 4, icon: 'home', cult: CN, iso: ['CHN'], era: [1999, 9999],
      run(S) {
        const up = chance(0.6);
        if (up && S.q >= 3) { fx(S, { shi: 5 }); return '你住的那一片，房价又涨了一轮。中介打电话问你卖不卖。'; }
        if (!up) { fx(S, { shi: -4, ye: -3 }); return '同小区有人降价成交。你在楼道里听见邻居在算，自己亏了多少。'; }
        return '你算了算，这些年交的房租，够付一套小房子的首付了。';
      },
    },
    {
      id: 'cn_guangchang', a0: 55, a1: 78, p: 0.096, cool: 2, icon: 'elder', cult: CN,
      if: (S) => S.age > 55,
      run(S) {
        fx(S, { ye: 6, gen: -0.5 });
        return pick([
          '你加入了小区广场上的队伍。音响放在花坛边上，七点准时开始。',
          '你每天傍晚下楼走两圈，认识了几个同样闲着的人。',
          '你孙辈教了你一个新舞步，你学了两晚才会。',
        ]);
      },
    },
    {
      id: 'cn_cityleave', a0: 55, a1: 80, p: 0.072, once: true, dec: true, icon: 'road', cult: CN,
      ask: () => '孩子想让你搬去他们那边住。老房子这边，你住了大半辈子。',
      L: {
        t: '留在原地',
        run(S) { fx(S, { ye: 5, zhi: -3 }); return '你留下了。楼下的树又高了一截，你认得每一个常在院里坐着的人。'; },
      },
      R: {
        t: '搬过去',
        run(S) { fx(S, { zhi: 8, ye: -2 }); S.flags.moved = true; return '你搬去了。新小区很干净，但你不认识路，买菜要走二十分钟。'; },
      },
      ai: 0.4,
    }
  );

  // ==================== 日韩 ====================
  const JK = ['jpkr'];
  E.push(
    {
      id: 'jk_youchien', a0: 4, a1: 6, p: 0.36, once: true, icon: 'school', cult: JK, iso: ['JPN'],
      run(S) {
        fx(S, { ye: -2, shi: 3 });
        return '入园考试。你在一间小教室里被问了几个问题，出来时手里拿着一张贴纸。';
      },
    },
    {
      id: 'jk_juku', a0: 9, a1: 15, p: 0.24, cool: 2, icon: 'book', cult: JK, iso: ['JPN'],
      if: (S) => S.urban,
      run(S) {
        fx(S, { shi: 6, gen: -2, ye: -5 });
        return pick([
          '塾里下课已经十点。你骑车回家，路上只有自动售货机亮着。',
          '你在塾的走廊上等下一节课，墙上是排名表，名字按分数排。',
          '模考成绩贴在塾的门口。你找到了自己的名字，往下数了很久。',
        ]);
      },
    },
    {
      id: 'jk_bukatsu', a0: 12, a1: 17, p: 0.24, once: true, icon: 'field', cult: JK, iso: ['JPN'],
      run(S) {
        fx(S, { zhi: 8, gen: 1.5, ye: 5 }); mark(S, 'bloom');
        return '你加入了运动部。每天练到天黑，先辈走了你才能走。夏天晒得脱了一层皮。';
      },
    },
    {
      id: 'jk_juken', a0: 17, a1: 18, p: 1, once: true, dec: true, icon: 'diploma', cult: JK, rank: 7, iso: ['JPN'],
      if: (S) => S.school,
      ask: () => '考试那天早上，母亲做了早饭，站在门口送你。',
      L: {
        t: '考本地国立',
        run(S, c) {
          if (chance(clamp(c.ter / 100 + 0.1, 0.1, 0.85))) { S.edu = 3; fx(S, { shi: 10, ye: 6 }); mark(S, 'bloom'); return '你考上了本地国立大学。学费不算高，家里松了一口气。'; }
          S.edu = 2; S.school = false; fx(S, { ye: -9 }); return '你没考上，转去学一门手艺。';
        },
      },
      R: {
        t: '冲东京的私立',
        run(S) {
          if (chance(0.42)) { S.edu = 3; fx(S, { shi: 14, ye: 8 }); S.migrated = true; mark(S, 'bloom'); return '你考上了东京的私立。一个人搬进六叠的房间，第一晚没睡着。'; }
          S.edu = 2; S.school = false; fx(S, { ye: -8, shi: -4 }); return '你落榜了。你把招生资料留下，先找了一份工作。';
        },
      },
      ai: 0.5,
    },
    {
      id: 'jk_shushoku', a0: 20, a1: 24, p: 0.33, once: true, dec: true, icon: 'office', cult: JK, iso: ['JPN'],
      if: (S) => S.edu >= 2,
      ask: () => '就职活动开始了。你换上正装，一天跑了三场说明会。',
      L: {
        t: '进大公司，稳定',
        run(S) {
          if (chance(clamp(0.3 + (S.q - 3) * 0.1, 0.08, 0.75))) { S.job = 'office'; fx(S, { shi: 10, zhi: 4 }); return '你进了一家大公司。人事讲完福利，又叮嘱了一遍调动和加班的规矩。'; }
          S.job = 'trade'; fx(S, { ye: -6 }); return '大公司全落空了。你去了一家小公司，合同一年一签。';
        },
      },
      R: {
        t: '先去小公司看看',
        run(S) { S.job = 'trade'; fx(S, { shi: 3, ye: 1 }); return '你进了一家十来个人的公司。老板记得每个人的名字。'; },
      },
      ai: 0.55,
    },
    {
      id: 'jk_nomikai', a0: 22, a1: 45, p: 0.096, cool: 2, icon: 'family', cult: JK, iso: ['JPN'],
      if: (S) => S.job === 'office',
      run(S) {
        fx(S, { zhi: 6, gen: -1.5, ye: -2 });
        return pick([
          '欢迎会喝到第二场。你先给部长倒酒，再给自己倒。末班车赶上了。',
          '你在居酒屋里坐着，听同事讲同一个笑话第五遍，笑得刚好。',
          '送别会上有人哭了。散场时已经错过末班车，你在车站附近等到天亮。',
        ]);
      },
    },
    {
      id: 'jk_zangyo', a0: 27, a1: 50, p: 0.084, cool: 2, icon: 'factory', cult: JK,
      if: (S) => S.job === 'office' || S.job === 'factory',
      run(S) {
        fx(S, { gen: -3, ye: -4 }); risk(S, 1.04);
        return pick([
          '这个月加班八十个小时。回家路上，你在站台上站着睡着了。',
          '终电上全是打领带的人，一半在睡。你也睡了，醒来时坐过了站。',
          '上司说，年轻人多担待。你把话吞了回去。',
        ]);
      },
    },
    {
      id: 'jk_1k', a0: 24, a1: 40, p: 0.15, once: true, icon: 'home', cult: JK, iso: ['JPN'],
      run(S) {
        fx(S, { ye: 3 });
        return '你租了一间六叠的房子，带一个小灶台。洗澡要去街角的钱汤。';
      },
    },
    {
      id: 'jk_jishin', a0: 0, a1: 90, p: 0.024, cool: 5, icon: 'quake', cult: JK, iso: ['JPN'],
      run(S) {
        fx(S, { gen: -3, ye: -8 }); mark(S, 'scar'); risk(S, 1.15, 'quake');
        return pick([
          '地震来的时候，碗柜的门全开了。你钻到桌子底下，等晃动停下来。',
          '半夜被摇醒，你光着脚跑下楼。街上站满了人，都在等余震。',
          '停电了三天。便利店的货架是空的，你排队接水。',
        ]);
      },
    },
    {
      id: 'jk_obon', a0: 20, a1: 80, p: 0.09, cool: 3, icon: 'family', cult: JK, iso: ['JPN'], era: [1964, 9999],
      run(S) {
        fx(S, { zhi: 6, ye: 5 });
        return pick([
          '盂兰盆节回了老家。新干线上全是回乡的人，你站着吃了便当。',
          '一家人在墓前浇水、点香。回来的路上买了西瓜。',
          '新年寄了年贺状，写到手酸。收到的第一张是小学同学。',
        ]);
      },
    },
    {
      id: 'jk_kouden', a0: 35, a1: 78, p: 0.09, cool: 4, icon: 'coins', cult: JK, iso: ['JPN'],
      run(S) {
        fx(S, { shi: -6, zhi: 5 });
        return pick([
          '同事的父亲过世了。你去了通夜，包了香典，坐在最后一排。',
          '亲戚家办喜事，你按规矩包了礼金，红白事各有各的数目。',
          '町内会收了会费，说是要修路灯。你交了，还去帮忙搬了器材。',
        ]);
      },
    },
    {
      id: 'jk_gunpye', a0: 19, a1: 22, p: 1, once: true, icon: 'war', cult: JK, sex: 'M',
      if: (S, c) => c.id === 'KOR' || c.id === 'PRK',
      run(S) {
        fx(S, { gen: 3, zhi: 6, ye: -6 });
        return '你进了部队。剃了头，第一次打电话回家时，说了不到一分钟。';
      },
    },
    {
      id: 'jk_konbini', a0: 18, a1: 42, p: 0.084, cool: 2, icon: 'coins', cult: JK, iso: ['JPN'],
      if: (S) => S.job === 'trade' || S.edu <= 2,
      run(S) {
        fx(S, { shi: 3, gen: -1.5 });
        return '你在便利店上夜班。关东煮的汤要换，货要补，凌晨三点最困。';
      },
    },
    {
      id: 'jk_gosiwon', a0: 21, a1: 30, p: 0.18, once: true, icon: 'home', cult: JK, iso: ['KOR'], era: [1980, 9999],
      if: (S, c) => c.id === 'KOR',
      run(S) { fx(S, { ye: -4, shi: 4 }); return '你住进了考试院。房间只放得下一张床和一张桌，窗户对着走廊。'; },
    },
    {
      id: 'jk_kaigo', a0: 68, a1: 92, p: 0.108, cool: 2, icon: 'elder', cult: JK, iso: ['JPN'], era: [2000, 9999],
      run(S) {
        fx(S, { gen: -1.5, zhi: 4 });
        return pick([
          '介护的人每周来两次，帮你洗澡、量血压。走的时候把垃圾也带走了。',
          '你一个人住。社区的人会来敲门，确认你还好。',
          '你把药分装在盒子里，一格一格，早中晚。',
        ]);
      },
    },
    {
      id: 'jk_shinbun', a0: 60, a1: 88, p: 0.12, cool: 2, icon: 'book', cult: JK,
      run(S) {
        fx(S, { ye: 3 });
        return '报纸每天早上送到门口。你先看地方版，看有没有认识的名字。';
      },
    },
    {
      id: 'jk_tokkyu', a0: 25, a1: 55, p: 0.072, cool: 3, icon: 'road', cult: JK,
      run(S) {
        fx(S, { gen: -1.5, ye: -2 });
        return '满员电车。你的脸贴着车门，一站一站地数。四十分钟里没人说一句话。';
      },
    },
    {
      id: 'jk_hikkoshi', a0: 22, a1: 45, p: 0.072, once: true, icon: 'road', cult: JK, iso: ['JPN'],
      run(S) {
        fx(S, { zhi: -5, ye: 2 }); S.flags.moved = true;
        return '你搬到了东京。房间小了一半，房租贵了一倍。搬家公司在门口鞠了一躬。';
      },
    },
    {
      id: 'jk_jiko', a0: 30, a1: 55, p: 0.06, once: true, icon: 'office', cult: JK, iso: ['JPN'],
      if: (S) => S.job === 'office',
      run(S) {
        fx(S, { ye: -8, gen: -2 }); risk(S, 1.05);
        return '你被调去一个不熟的部门，说是「研修」。同一批进来的人，只剩你还在原来的位置。';
      },
    }
  );

  // ==================== 欧美 ====================
  const WE = ['west'];
  E.push(
    {
      id: 'we_license', a0: 16, a1: 18, p: 0.48, once: true, icon: 'road', cult: WE,
      run(S) {
        fx(S, { ye: 8, zhi: 3 });
        return pick([
          '你考到了驾照。第一次一个人开出去，绕着街区转了三圈才敢上主路。',
          '路考第二次才过。考官说你转弯太快，你自己觉得刚好。',
        ]);
      },
    },
    {
      id: 'we_car', a0: 17, a1: 30, p: 0.18, once: true, icon: 'road', cult: WE,
      if: (S, c) => c.urb < 92,
      run(S) {
        const old = chance(0.6);
        fx(S, { shi: -4, ye: 6 });
        return old
          ? '你买了一辆二手的，里程表上已经二十万公里。开回家那天，你在车里坐了很久。'
          : '你贷款买了第一辆车。每月还款不多，但保险贵得离谱。';
      },
    },
    {
      id: 'we_prom', a0: 17, a1: 18, p: 0.33, once: true, icon: 'love', cult: WE,
      run(S) {
        fx(S, { ye: 9, zhi: 5 });
        return '毕业舞会。你借了一套西装，照相的时候手不知道往哪儿放。';
      },
    },
    {
      id: 'we_loan', a0: 18, a1: 26, p: 0.36, once: true, icon: 'diploma', cult: WE, iso: ['USA', 'CAN', 'GBR', 'AUS', 'NZL'],
      if: (S) => S.edu >= 3 && S.q <= 3,
      run(S) {
        fx(S, { shi: -10, ye: -4 }); S.flags.debt = true; S.flags.studentDebt = true;
        return '学生贷款签字的时候，你算了下总额，比自己以为的多了一位数。';
      },
    },
    {
      id: 'we_repay', a0: 24, a1: 42, p: 0.12, cool: 3, icon: 'coins', cult: WE,
      if: (S) => S.flags.studentDebt,
      run(S) {
        fx(S, { shi: -6, ye: -3 });
        return `还款又扣了一笔，还有 ${ri(6, 22)} 年。你看了看工资单，把想买的东西从购物车里删了。`;
      },
    },
    {
      id: 'we_insurance', a0: 22, a1: 62, p: 0.096, cool: 3, icon: 'clinic', cult: WE,
      if: (S, c) => c.id === 'USA',
      run(S) {
        fx(S, { shi: -5, ye: -4 });
        return '你换了工作，保险要重新选。 deductible 那一栏你看了很久，最后还是选了便宜的那档。';
      },
    },
    {
      id: 'we_church', a0: 5, a1: 80, p: 0.084, cool: 3, icon: 'family', cult: WE,
      run(S) {
        fx(S, { zhi: 7, ye: 5 });
        return pick([
          '周日上午去教堂。散场后大家在门口聊了很久，有人问你最近怎么样。',
          '复活节的礼拜人特别多，你迟到了，站在后面。',
          '社区教堂办义卖，你去帮忙摆桌子，顺便买了两本书。',
        ]);
      },
    },
    {
      id: 'we_thanksgiving', a0: 20, a1: 82, p: 0.09, cool: 3, icon: 'family', cult: WE,
      if: (S, c) => c.id === 'USA' || c.id === 'CAN',
      run(S) {
        fx(S, { zhi: 6, ye: 6, gen: -1 });
        return pick([
          '感恩节开了六个小时的车回去。桌上有一只火鸡，和每年一样的配菜。',
          '你在厨房帮忙，被派去切洋葱。窗外开始下雪。',
          '饭后大家挤在沙发上看球赛，有人睡着了。',
        ]);
      },
    },
    {
      id: 'we_basement', a0: 25, a1: 80, p: 0.06, cool: 4, icon: 'flood', cult: WE,
      if: (S, c) => (c.haz || '').includes('F'),
      run(S) {
        fx(S, { shi: -6, gen: -1 });
        return '暴雨下了两天，地下室进了水。你搬出抽水机，扔掉了泡坏的东西，然后给保险公司打电话。';
      },
    },
    {
      id: 'we_bus', a0: 6, a1: 12, p: 0.24, cool: 2, icon: 'school', cult: WE,
      run(S) {
        fx(S, { ye: 2 });
        return '你坐校车上学。司机记得每个人的名字，也记得谁今天没来。';
      },
    },
    {
      id: 'we_football', a0: 10, a1: 18, p: 0.15, once: true, icon: 'field', cult: WE,
      if: (S, c) => c.id === 'USA',
      run(S) {
        fx(S, { gen: 2.5, zhi: 7, ye: 4 }); mark(S, 'bloom');
        return '周五晚上的比赛，看台上坐满了人。你的名字被念到的时候，全场都在喊。';
      },
    },
    {
      id: 'we_mortgage', a0: 28, a1: 45, p: 0.18, once: true, dec: true, icon: 'home', cult: WE,
      if: (S, c) => c.id !== 'DEU' && !S.flags.home,
      ask: () => '看中了一套房子。经纪人问你要不要出价。',
      L: {
        t: '再租几年',
        run(S) { fx(S, { ye: 3, shi: 4 }); return '你没出价。那套房子两周后卖掉了，价格比你预想的高一点。'; },
      },
      R: {
        t: '签三十年的贷款',
        run(S) {
          S.flags.home = true; S.flags.mortgage = true; fx(S, { shi: 10, gen: -2, ye: -3 }); mark(S, 'bloom'); S.flags.moved = true;
          return '你签了三十年的贷款。搬进去那天，前房主在厨房留了一瓶酒和一张纸条。';
        },
      },
      ai: 0.55,
    },
    {
      id: 'we_severance', a0: 30, a1: 58, p: 0.072, cool: 4, icon: 'factory', cult: WE,
      if: (S) => S.job === 'office' || S.job === 'factory',
      run(S) {
        fx(S, { shi: -8, ye: -7 }); risk(S, 1.04);
        return '公司重组，你的岗位被合并了。人事给了三个月工资，让你当天就走。';
      },
    },
    {
      id: 'we_nursing', a0: 72, a1: 95, p: 0.09, cool: 3, icon: 'elder', cult: WE,
      run(S) {
        fx(S, { gen: -1.5, zhi: 4 });
        return pick([
          '你搬进了一家养老社区。房间朝南，护工每天来两次。',
          '孩子来看你，带了一束花。走的时候说下个月再来。',
          '养老院组织了一场音乐会，有人弹钢琴，你跟着哼了两句。',
        ]);
      },
    },
    {
      id: 'we_yardsale', a0: 30, a1: 72, p: 0.072, cool: 3, icon: 'coins', cult: WE,
      run(S) {
        fx(S, { shi: 3, ye: 4, zhi: 3 });
        return '周末在车道上摆了旧货。邻居停下来聊了半小时，买走一盏灯和两把椅子。';
      },
    },
    {
      id: 'we_blizzard', a0: 0, a1: 90, p: 0.054, cool: 4, icon: 'storm', cult: WE,
      if: (S, c) => /Q|S/.test(c.haz || ''),
      run(S) {
        fx(S, { gen: -1.5, ye: -5 });
        return '暴雪封了路，停电两天。你把冰箱里的东西搬到窗台上，靠雪冻着。';
      },
    },
    {
      id: 'we_therapy', a0: 24, a1: 55, p: 0.06, cool: 4, icon: 'moon', cult: WE,
      run(S) {
        fx(S, { ye: 7, gen: 1 });
        return '你开始每周见一次心理咨询师。第一次去的时候，说了四十分钟，中间停了很久。';
      },
    },
    {
      id: 'we_tipping', a0: 18, a1: 65, p: 0.084, cool: 3, icon: 'coins', cult: WE,
      if: (S, c) => c.id === 'USA',
      run(S) {
        fx(S, { shi: -2, zhi: 2 });
        return '结账时你在小费那一栏犹豫了一下，最后写了百分之二十。';
      },
    },
    {
      id: 'we_diy', a0: 30, a1: 65, p: 0.06, cool: 3, icon: 'home', cult: WE,
      if: (S, c) => c.urb < 85,
      run(S) {
        fx(S, { shi: 4, gen: -1.5, ye: 3 });
        return '你自己修了后院的栅栏。跑了三趟建材店，最后一根钉子敲歪了，你也懒得管。';
      },
    },
    {
      id: 'we_commute', a0: 24, a1: 60, p: 0.084, cool: 2, icon: 'road', cult: WE,
      if: (S) => S.job === 'office',
      run(S) {
        fx(S, { gen: -1, ye: -3 });
        return '单程通勤一小时。你在车里听完了一整本有声书，也听完了很多没听完的播客。';
      },
    }
  );

  NL.register(E);
})(typeof globalThis !== 'undefined' ? globalThis : this);
