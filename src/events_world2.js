/* 年轮 · 文化圈事件 中册：东欧中亚、拉美、南亚（原创）
 *
 * 每个文化圈 18 条，从童年到老年一条线。
 * 东欧写达恰、赫鲁晓夫楼、排队等房与九零年代的物价；
 * 拉美写山坡自建房、汇款、公交与雨季；
 * 南亚写嫁妆、说亲、季风、三轮车与海湾打工。
 */
(function (root) {
  'use strict';
  const NL = root.NL;
  const { ri, pick, chance, clamp, fx, mark, risk } = NL.util;

  const E = [];

  // ==================== 东欧、俄罗斯、高加索、中亚 ====================
  const EU = ['eur'];
  E.push(
    {
      id: 'eu_babushka', a0: 0, a1: 12, p: 0.33, once: true, icon: 'elder', cult: EU,
      run(S) {
        fx(S, { zhi: 8, ye: 4 });
        return '你是奶奶带大的。她把你裹得很厚，出门前要检查三遍围巾。';
      },
    },
    {
      id: 'eu_heating', a0: 4, a1: 70, p: 0.084, cool: 3, icon: 'home', cult: EU,
      run(S) {
        fx(S, { gen: -1, ye: -3 });
        return pick([
          '供暖在十月中就开了。屋里热得开窗，外面零下二十度。',
          '热水停了两周，说是管道检修。你用锅烧水洗澡。',
          '楼里的暖气片漏水，楼下邻居上来敲门。',
        ]);
      },
    },
    {
      id: 'eu_banya', a0: 18, a1: 80, p: 0.09, cool: 3, icon: 'family', cult: EU,
      run(S) {
        fx(S, { gen: 2, zhi: 6, ye: 5 });
        return pick([
          '周五去澡堂。蒸到出汗，再跳进冷水池，出来时整个人轻了。',
          '你和朋友在澡堂里坐了两个小时，聊的都是别人的事。',
        ]);
      },
    },
    {
      id: 'eu_chess', a0: 7, a1: 15, p: 0.132, once: true, icon: 'book', cult: EU,
      run(S) {
        fx(S, { shi: 5, ye: 3 });
        return '你去了少年宫，学国际象棋。老师是个退休的工程师，讲棋的时候很慢。';
      },
    },
    {
      id: 'eu_forest', a0: 10, a1: 62, p: 0.09, cool: 2, icon: 'field', cult: EU,
      run(S) {
        fx(S, { gen: 1, ye: 5, shi: 2 });
        return pick([
          '秋天的周末去林子里采蘑菇。回来分了一半给邻居，剩下的晒在阳台上。',
          '你带着桶去采浆果。蚊子很多，但回来熬的果酱能吃一冬。',
          '全家去林子里烤肉。有人带了吉他，唱到天黑。',
        ]);
      },
    },
    {
      id: 'eu_army', a0: 18, a1: 21, p: 0.42, once: true, icon: 'war', cult: EU, sex: 'M',
      if: (S, c) => !S.school && !S.flags.service && !!NL.profiles.service(S, c),
      run(S, c) {
        const policy = NL.profiles.service(S, c); NL.profiles.startService(S, policy);
        fx(S, { gen: 3.5, zhi: 5, ye: -7 });
        return `你接到服役安排，登记役期 ${policy.months} 个月。先收好工作上的东西，再和家里安排联系的办法。`;
      },
    },
    {
      id: 'eu_vodka', a0: 20, a1: 70, p: 0.108, cool: 3, icon: 'family', cult: EU,
      run(S) {
        fx(S, { zhi: 6, gen: -2 });
        return pick([
          '桌上第三轮敬酒。你不喝，长辈说这不合适。你喝了。',
          '婚礼上有人举杯讲了十分钟，讲完所有人都站起来。',
          '你和老同学在厨房里喝到半夜，说的话第二天都不记得。',
        ]);
      },
    },
    {
      id: 'eu_panel', a0: 25, a1: 45, p: 0.21, once: true, icon: 'home', cult: EU,
      run(S) {
        fx(S, { ye: 3, shi: 2 });
        return '你分到一间公寓，在一栋五层预制板楼里。厨房三平米，阳台朝北。';
      },
    },
    {
      id: 'eu_wait', a0: 24, a1: 42, p: 0.12, once: true, icon: 'home', cult: EU,
      if: (S, c) => c.inc !== 'HIC',
      run(S) {
        fx(S, { ye: -4, zhi: 3 });
        return '你在等分房的名单上排了六年。每年去问一次，回答都是「快了」。';
      },
    },
    {
      id: 'eu_dacha', a0: 26, a1: 72, p: 0.15, once: true, icon: 'field', cult: EU,
      run(S) {
        fx(S, { gen: 1.5, ye: 6, shi: 3 });
        return '你在郊外有一小块地，一间木房子。夏天种土豆和黄瓜，冬天腌起来。';
      },
    },
    {
      id: 'eu_harvest', a0: 30, a1: 75, p: 0.096, cool: 2, icon: 'field', cult: EU,
      if: (S) => S.age > 30,
      run(S) {
        fx(S, { gen: -1.5, ye: 4 });
        return '整个九月都在收土豆。腰疼了三天，但地窖满了，心里踏实。';
      },
    },
    {
      id: 'eu_inflation', a0: 22, a1: 48, p: 0.18, once: true, icon: 'coins', cult: EU,
      era: [1990, 2000],
      run(S) {
        fx(S, { shi: -8, ye: -7 });
        return '工资发下来，一周就花完了。你把钱换成别的东西，什么都行，只要不是纸币。';
      },
    },
    {
      id: 'eu_kiosk', a0: 20, a1: 45, p: 0.132, once: true, icon: 'coins', cult: EU,
      era: [1990, 2005],
      run(S) {
        fx(S, { shi: 6, ye: 4 }); S.job = S.job || 'trade';
        return '你在街边支了个摊，卖烟、口香糖和罐装啤酒。一天下来，钱是现的。';
      },
    },
    {
      id: 'eu_moscow', a0: 18, a1: 40, p: 0.12, once: true, icon: 'road', cult: EU,
      if: (S, c) => c.inc !== 'HIC' || c.id === 'RUS' || c.id === 'UKR',
      run(S) {
        fx(S, { shi: 4, zhi: -6, ye: -2 }); S.migrated = true;
        return '你去了大城市打工。住在城郊的合租房，通勤一小时四十分钟。';
      },
    },
    {
      id: 'eu_olivier', a0: 5, a1: 82, p: 0.096, cool: 3, icon: 'family', cult: EU,
      run(S) {
        fx(S, { zhi: 5, ye: 5 });
        return pick([
          '新年夜，桌上有一大盆沙拉，一碗一碗地盛。电视里在放老电影。',
          '跨年的钟声敲响时，所有人都在举杯，说了一句每年都说的话。',
          '你按老办法腌了一罐酸黄瓜。开盖那天气味冲得一屋子都是。',
        ]);
      },
    },
    {
      id: 'eu_winter', a0: 10, a1: 82, p: 0.096, cool: 2, icon: 'storm', cult: EU,
      run(S) {
        fx(S, { gen: -1.5, ye: -3 });
        return pick([
          '零下二十五度，睫毛结了霜。你在公交站等了二十分钟。',
          '大雪封了路，学校停课三天。你在院子里堆了一个很高的雪人。',
          '冰面化了一半，一个小孩掉进河里，被人拉了上来。',
        ]);
      },
    },
    {
      id: 'eu_emigrate', a0: 20, a1: 42, p: 0.072, once: true, dec: true, icon: 'boat', cult: EU,
      ask: () => '有人介绍去西欧做工，中介费要攒两年。',
      L: {
        t: '留下',
        run(S) { fx(S, { zhi: 4, ye: 2 }); return '你留下了。后来听说去的人里，有的安了家，有的回来了。'; },
      },
      R: {
        t: '走',
        run(S) {
          fx(S, { shi: 6, zhi: -7, ye: -3 }); S.migrated = true; S.flags.emigrated = true;
          return '你去了。头两年在工地和仓库，语言不通，靠手势。寄回来的钱在老家盖了房。';
        },
      },
      ai: 0.45,
    },
    {
      id: 'eu_dom', a0: 28, a1: 50, p: 0.072, once: true, icon: 'home', cult: EU,
      if: (S, c) => c.inc !== 'HIC' || c.urb < 75,
      run(S) {
        fx(S, { shi: -6, ye: 6, gen: -1.5 }); mark(S, 'bloom');
        return '你在城郊盖了房子。砖是分批买的，墙砌了两年。冬天还没装上窗。';
      },
    },
    {
      id: 'eu_may9', a0: 30, a1: 78, p: 0.084, cool: 3, icon: 'family', cult: EU,
      run(S) {
        fx(S, { zhi: 5, ye: 3 });
        return '五月的长假，全家去墓地给长辈上坟，摆一瓶酒、一块面包。回来的路上谁都没说话。';
      },
    }
  );

  // ==================== 拉丁美洲 ====================
  const LA = ['lat'];
  E.push(
    {
      id: 'la_bautizo', a0: 0, a1: 8, p: 0.36, once: true, icon: 'candle', cult: LA,
      run(S) {
        fx(S, { zhi: 7, ye: 4 });
        return '你受了洗礼。教母给你穿了一身白，抱着你站了很久，衣袖把脸挡住了。';
      },
    },
    {
      id: 'la_futbol', a0: 7, a1: 18, p: 0.27, once: true, icon: 'field', cult: LA,
      run(S) {
        fx(S, { gen: 2.5, zhi: 7, ye: 6 }); mark(S, 'bloom');
        return '你在街上踢球。球是旧的，球门是两块石头。天黑到看不见才回去。';
      },
    },
    {
      id: 'la_ladera', a0: 20, a1: 45, p: 0.12, once: true, icon: 'home', cult: LA,
      if: (S, c) => c.id !== 'BRA',
      run(S) {
        fx(S, { gen: -2.5, shi: -4, ye: 3 }); mark(S, 'bloom');
        return '你在山坡上占了一块地，用砖和铁皮盖起两间屋。水要自己去接，电是从邻居家拉的线。';
      },
    },
    {
      id: 'la_bus', a0: 14, a1: 62, p: 0.096, cool: 2, icon: 'road', cult: LA,
      run(S) {
        fx(S, { gen: -1 });
        return pick([
          '公交车上挤满了人，司机一路没关门。有人在车上卖糖、卖药、讲一段话。',
          '你站在车门口，抓着栏杆，路面一颠整个人都飞起来。',
          '车坏了，所有人下车在路边等下一班。太阳很毒。',
        ]);
      },
    },
    {
      id: 'la_remesa', a0: 16, a1: 55, p: 0.15, cool: 3, icon: 'coins', cult: LA,
      if: (S, c) => c.id !== 'BRA',
      run(S) {
        fx(S, { shi: 4, zhi: 5 });
        return '在美国的亲戚汇了一笔钱过来。你去柜台取，手续费扣掉了一截。';
      },
    },
    {
      id: 'la_carnaval', a0: 12, a1: 65, p: 0.096, cool: 3, icon: 'family', cult: LA,
      run(S) {
        fx(S, { ye: 9, zhi: 6, gen: -1 });
        return pick([
          '狂欢节，整条街都是人。音乐从下午响到第二天早上。',
          '你被涂了一脸颜料，笑得停不下来。',
          '队伍经过你家门口，你搬了椅子坐在台阶上看。',
        ]);
      },
    },
    {
      id: 'la_dengue', a0: 5, a1: 60, p: 0.084, cool: 3, icon: 'mosquito', cult: LA,
      if: (S, c) => c.mal > 0 || c.u5 > 12,
      run(S) {
        fx(S, { gen: -5, ye: -8 }); risk(S, 1.2, 'other'); mark(S, 'scar');
        return '你得了登革热，烧到四十度，骨头疼得像被人拆开。卫生队来院子里喷了药。';
      },
    },
    {
      id: 'la_informal', a0: 16, a1: 62, p: 0.15, cool: 2, icon: 'coins', cult: LA,
      if: (S, c) => c.id !== 'BRA' || S.job === 'trade',
      run(S) {
        fx(S, { shi: 3, gen: -1.5 });
        return pick([
          '你在路口卖东西。一整天站着，收的钱装在一个布袋里。',
          '你给人家刷墙、搬货、修水管，什么活都接。当天结账。',
          '你在市场帮人看摊，老板管一顿饭。',
        ]);
      },
    },
    {
      id: 'la_inflacion', a0: 25, a1: 55, p: 0.06, cool: 4, icon: 'coins', cult: LA,
      if: (S, c) => c.id !== 'BRA',
      run(S) {
        fx(S, { shi: -7, ye: -6 });
        return '物价一个月涨了一轮。你发了工资就赶紧去买米和油，钱放在手里会变少。';
      },
    },
    {
      id: 'la_emigrar', a0: 19, a1: 40, p: 0.084, once: true, dec: true, icon: 'boat', cult: LA,
      if: (S, c) => c.id !== 'BRA',
      ask: () => '同村的人说，往北走能挣到五倍的钱。路很长，也不一定进得去。',
      L: {
        t: '留下',
        run(S) { fx(S, { zhi: 5, ye: 2 }); return '你留下了。后来有人回来盖了房，也有人再没消息。'; },
      },
      R: {
        t: '走',
        run(S) {
          if (chance(0.55)) { fx(S, { shi: 8, zhi: -8, ye: -5, gen: -3 }); S.migrated = true; return '你走了很久。到了以后在餐馆后厨干活，一周六天，钱确实多。'; }
          fx(S, { shi: -10, ye: -8, gen: -2.5 }); return '你在半路被拦下，遣送回来。借的钱还没还完。';
        },
      },
      ai: 0.45,
    },
    {
      id: 'la_barrio', a0: 12, a1: 32, p: 0.12, once: true, icon: 'moon', cult: LA,
      run(S) {
        fx(S, { ye: 8, zhi: 6 });
        return '街区里有人组了个乐队，你跟着学。第一次上台，手抖得按不住弦。';
      },
    },
    {
      id: 'la_mercado', a0: 14, a1: 65, p: 0.108, cool: 2, icon: 'coins', cult: LA,
      run(S) {
        fx(S, { zhi: 5, ye: 4 });
        return pick([
          '周末的集市，卖水果的、卖鞋的、卖草药的挤在一条街上。你买了一大袋芒果。',
          '你在市场吃了碗汤，老板娘记得你上次来过。',
          '集市散场时下起雨，所有人一起收摊，喊成一片。',
        ]);
      },
    },
    {
      id: 'la_seguridad', a0: 18, a1: 60, p: 0.096, cool: 3, icon: 'moon', cult: LA,
      run(S) {
        fx(S, { ye: -6, gen: -1 }); risk(S, 1.06, 'viol');
        return pick([
          '街角的店被抢了。老板第二天照常开门，装了铁栅栏。',
          '你晚上尽量不独自出门。钱分开放，回家的路线也换了一条。',
          '有人在巷子里被抢了包。警察来了，做了笔录，就走了。',
        ]);
      },
    },
    {
      id: 'la_quince', a0: 14, a1: 16, p: 1, once: true, icon: 'love', cult: LA, sex: 'F',
      if: (S, c) => c.id !== 'BRA' || (S.q >= 3 && S.age < S.parents.fDie),
      run(S) {
        fx(S, { ye: 10, zhi: 9, shi: -5 });
        return '十五岁生日，家里办了一场。你穿了一条大裙子，和父亲跳了第一支舞。';
      },
    },
    {
      id: 'la_familia', a0: 20, a1: 62, p: 0.12, cool: 3, icon: 'family', cult: LA,
      run(S) {
        fx(S, { zhi: 8, ye: 5, shi: -3 });
        return '周日的午饭，来了十几个人。桌子拼了两张，孩子在地上跑。';
      },
    },
    {
      id: 'la_agua', a0: 6, a1: 62, p: 0.096, cool: 2, icon: 'flood', cult: LA,
      if: (S, c) => c.wat < 92,
      run(S) {
        fx(S, { gen: -1.5, ye: -3 });
        return '停水三天。你把浴缸蓄满，用桶一点点舀。';
      },
    },
    {
      id: 'la_techo', a0: 20, a1: 50, p: 0.084, once: true, icon: 'home', cult: LA,
      if: (S) => S.q <= 3,
      run(S) {
        fx(S, { shi: 5, gen: -1.5, zhi: 4 });
        return '亲戚们一起来帮你盖屋顶。水泥是凑钱买的，中午大家吃了一锅炖菜。';
      },
    },
    {
      id: 'la_radio', a0: 8, a1: 60, p: 0.096, cool: 2, icon: 'phone', cult: LA,
      run(S) {
        fx(S, { ye: 5, zhi: 3 });
        return '收音机从早开到晚。解说员喊进球的时候，整条街都在叫。';
      },
    }
  );

  // ==================== 南亚 ====================
  const SA = ['sas'];
  E.push(
    {
      id: 'sa_boil', a0: 0, a1: 12, p: 0.3, once: true, icon: 'fever', cult: SA,
      run(S) {
        fx(S, { gen: -1 });
        return '家里的水都要烧开才喝。你从小就知道，生水会拉肚子。';
      },
    },
    {
      id: 'sa_bike', a0: 8, a1: 18, p: 0.18, once: true, icon: 'road', cult: SA,
      run(S) {
        fx(S, { gen: 1.5, ye: 4 });
        return '你骑自行车上学。路是土路，雨季要推着走。车铃是后来才装上的。';
      },
    },
    {
      id: 'sa_tuition', a0: 10, a1: 18, p: 0.12, cool: 2, icon: 'school', cult: SA,
      run(S) {
        fx(S, { shi: -4, ye: -4 });
        return pick([
          '补习班的费用又涨了。家里说，只要你能读，钱的事不用你管。',
          '你每天放学去补习，一节课两个小时。回家还要做完三本练习。',
        ]);
      },
    },
    {
      id: 'sa_surname', a0: 16, a1: 28, p: 0.15, cool: 4, icon: 'home', cult: SA,
      run(S) {
        fx(S, { ye: -5, zhi: 4 });
        return '有人来说亲，第一句话问的是你家的姓氏。你父亲报了村名，对方点了头。';
      },
    },
    {
      id: 'sa_rishta', a0: 19, a1: 30, p: 0.24, once: true, dec: true, icon: 'love', cult: SA,
      if: (S, c) => c.id !== 'IND' && !S.married,
      ask: () => '亲戚带了一家人来看你。大人们在客厅说话，让你端茶进去。',
      L: {
        t: '按家里的意思',
        run(S) {
          S.married = true; fx(S, { zhi: 10, ye: 2, shi: -3 });
          return '婚事定了。你只在那天见过对方一面，记得的是一件蓝色的衣服。';
        },
      },
      R: {
        t: '说想再等等',
        run(S) { fx(S, { zhi: -6, ye: -3 }); return '你说想再等等。母亲没说什么，父亲三天没跟你讲话。'; },
      },
      ai: 0.6,
    },
    {
      id: 'sa_dowry', a0: 18, a1: 30, p: 0.18, once: true, icon: 'coins', cult: SA,
      if: (S, c) => c.id !== 'IND',
      run(S) {
        fx(S, { shi: -12, zhi: 6, ye: -4 }); S.flags.debt = true;
        return '婚事谈下来，嫁妆和酒席的钱要借。父亲把地抵了一部分。';
      },
    },
    {
      id: 'sa_wedding', a0: 20, a1: 45, p: 0.12, cool: 3, icon: 'family', cult: SA,
      run(S) {
        fx(S, { shi: -5, zhi: 8, ye: 6 });
        return pick([
          '婚礼季，一个月赶了三场。乐队、彩灯、长长的队伍，吃了三天。',
          '亲戚家办喜事，你被派去厨房帮忙切菜，切了一整天。',
          '你随了礼，坐了两个小时，打包了一点甜点回家。',
        ]);
      },
    },
    {
      id: 'sa_monsoon', a0: 5, a1: 72, p: 0.108, cool: 2, icon: 'flood', cult: SA,
      run(S) {
        fx(S, { gen: -2, ye: -4, shi: -3 });
        return pick([
          '雨季来得晚，来得猛。街上的水到膝盖，你走了一个小时才到家。',
          '雨下了三天三夜。屋顶漏了，你把锅碗都摆出来接水。',
          '雨终于来了。全村人都站在门口看，孩子在雨里跑。',
        ]);
      },
    },
    {
      id: 'sa_drought', a0: 0, a1: 72, p: 0.036, cool: 4, icon: 'drought', cult: SA,
      run(S) {
        fx(S, { gen: -2, shi: -6 }); risk(S, 1.06, 'mnut');
        return '连着两年雨少。井里的水打上来是浑的，要等一会儿才能用。';
      },
    },
    {
      id: 'sa_auto', a0: 16, a1: 62, p: 0.12, cool: 2, icon: 'road', cult: SA,
      run(S) {
        fx(S, { gen: -1, shi: 2 });
        return '三轮车在车流里穿。你和另外两个人挤在后座，谁也不说话。';
      },
    },
    {
      id: 'sa_callcenter', a0: 18, a1: 32, p: 0.12, once: true, icon: 'phone', cult: SA,
      if: (S, c) => c.id !== 'IND' && S.edu >= 2 && S.urban,
      run(S) {
        fx(S, { shi: 6, gen: -2.5, ye: -3 }); S.job = 'office';
        return '你进了客服中心，上夜班，对着电话说英语。白天睡觉，窗帘一直拉着。';
      },
    },
    {
      id: 'sa_gulf', a0: 20, a1: 45, p: 0.12, once: true, icon: 'boat', cult: SA,
      run(S) {
        fx(S, { shi: 8, zhi: -8, gen: -3, ye: -3 }); S.migrated = true;
        return '你去了海湾，在工地上干了三年。宿舍八个人一间，护照在工头手里。';
      },
    },
    {
      id: 'sa_joint', a0: 20, a1: 65, p: 0.132, cool: 3, icon: 'family', cult: SA,
      if: (S, c) => c.id !== 'IND' || (S.married && S.flags.inHousehold === 'joint'),
      run(S) {
        fx(S, { zhi: 9, ye: 4, shi: -3 });
        return '婚后你住进了大家庭。院子里四代人，饭要分两批吃，水管早上要排队。';
      },
    },
    {
      id: 'sa_cricket', a0: 8, a1: 42, p: 0.12, cool: 3, icon: 'field', cult: SA,
      run(S) {
        fx(S, { ye: 7, zhi: 5 });
        return pick([
          '巷子里打板球。球拍是一块木板，球打丢了就换一个。',
          '有比赛的日子，整条街的电视都开着，进球时能听见一片喊声。',
          '你在空地上练投球，练到肩膀疼。',
        ]);
      },
    },
    {
      id: 'sa_festival', a0: 10, a1: 72, p: 0.096, cool: 2, icon: 'candle', cult: SA,
      run(S) {
        fx(S, { ye: 7, zhi: 6, shi: -2 });
        return pick([
          '庙里过节，人挤到走不动。你排了很久才进去，出来时额头上有一点红。',
          '灯节，屋顶和窗台都点了灯。邻居端来一盘甜的。',
          '节前家里做了很多吃的，油炸的东西堆了一桌。',
        ]);
      },
    }
  );

  NL.register(E);
})(typeof globalThis !== 'undefined' ? globalThis : this);
