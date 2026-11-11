/* 年轮 · 文化圈事件 下册：东南亚、中东北非、撒哈拉以南非洲（原创）
 *
 * 每个文化圈 18 条。
 * 东南亚写摩托、齐腰的水、夜市、出国当劳工与台风；
 * 中东北非写斋月、朝觐、缺水、大家族与沙尘；
 * 非洲写礼拜、水井、集市、手机钱包、停电与彩礼。
 * 一律写生活，不写立场。
 */
(function (root) {
  'use strict';
  const NL = root.NL;
  const { ri, pick, chance, clamp, fx, mark, risk } = NL.util;

  const E = [];

  // ==================== 东南亚与太平洋 ====================
  const SE = ['sea'];
  E.push(
    {
      id: 'se_rice', a0: 8, a1: 50, p: 0.18, cool: 3, icon: 'field', cult: SE,
      if: (S, c) => c.agr > 12,
      run(S) {
        fx(S, { gen: -2, shi: 3 });
        return pick([
          '插秧的时候全家都下田。水没过小腿，蚂蟥叮在脚上，要拍掉。',
          '收割那几天，天不亮就出门。稻子摊在路边晒，要有人看着，防雨。',
          '你跟着大人去田里放水。水渠的闸口要有人守，不然上游把水截走。',
        ]);
      },
    },
    {
      id: 'se_motorbike', a0: 15, a1: 45, p: 0.18, once: true, icon: 'road', cult: SE,
      run(S) {
        fx(S, { gen: -1.5, shi: 4, ye: 7 });
        return '你买了第一辆摩托。二手的，油门有点滞。第一次载着三个人过桥，桥在晃。';
      },
    },
    {
      id: 'se_flood', a0: 0, a1: 72, p: 0.12, cool: 2, icon: 'flood', cult: SE,
      if: (S, c) => (c.haz || '').includes('F'),
      run(S) {
        fx(S, { gen: -2.5, shi: -5, ye: -4 }); mark(S, 'scar');
        return pick([
          '雨季的水漫到腰。家具搬到二楼，锅架在桌子上。三天后才退。',
          '街上能撑船了。孩子在门口的水里玩，大人站在台阶上看着。',
          '水退之后，墙上留了一道黄线，比人还高。',
        ]);
      },
    },
    {
      id: 'se_typhoon', a0: 0, a1: 82, p: 0.072, cool: 3, icon: 'storm', cult: SE,
      if: (S, c) => (c.haz || '').includes('S'),
      run(S) {
        fx(S, { gen: -3, shi: -6, ye: -7 }); mark(S, 'scar'); risk(S, 1.15, 'storm');
        return '台风过境，屋顶的铁皮被掀走了。全村人在学校里躲了两天。';
      },
    },
    {
      id: 'se_tsunami', a0: 0, a1: 85, p: 0.012, once: true, icon: 'flood', cult: SE,
      era: [2004, 2004], iso: ['IDN', 'THA', 'MYS', 'MMR'],
      run(S) {
        fx(S, { gen: -6, zhi: -6, ye: -14, shi: -8 }); mark(S, 'scar'); risk(S, 1.3, 'flood');
        return '海突然退得很远。有人跑，有人站着看。水回来的时候，比房子高。';
      },
    },
    {
      id: 'se_nightmarket', a0: 14, a1: 62, p: 0.144, cool: 2, icon: 'coins', cult: SE,
      run(S) {
        fx(S, { zhi: 6, ye: 7, shi: -2 });
        return pick([
          '夜市。塑料凳、折叠桌、一盏灯。你点了一份炒粉，加了两个蛋。',
          '你在夜市帮亲戚看摊，卖烤串。烟熏得眼睛疼。',
          '夜市收摊时下起雨，摊主们一起把棚子收了，笑着骂了两句。',
        ]);
      },
    },
    {
      id: 'se_abroad', a0: 18, a1: 45, p: 0.108, once: true, icon: 'boat', cult: SE,
      run(S) {
        fx(S, { shi: 9, zhi: -9, gen: -2.5, ye: -3 }); S.migrated = true;
        return '你出国做工，签了两年。寄回来的钱盖了房，也还了中介的账。';
      },
    },
    {
      id: 'se_factory', a0: 17, a1: 38, p: 0.132, once: true, icon: 'factory', cult: SE,
      if: (S) => S.edu <= 2,
      run(S) {
        fx(S, { shi: 3, gen: -2 }); S.job = 'factory';
        return '你进了工业区的流水线。班车五点半在路口接人，迟到一次扣一天的钱。';
      },
    },
    {
      id: 'se_sarisari', a0: 20, a1: 55, p: 0.096, once: true, icon: 'coins', cult: SE,
      run(S) {
        fx(S, { shi: 5, zhi: 4 }); if (!S.job) S.job = 'trade';
        return '你在门口开了间小卖部，卖烟、洗衣粉和散装的糖。邻居可以赊账，记在本子上。';
      },
    },
    {
      id: 'se_ojek', a0: 18, a1: 52, p: 0.096, cool: 3, icon: 'road', cult: SE,
      run(S) {
        fx(S, { shi: 3, gen: -2 });
        return '你跑摩托载客。一天跑十几个小时，油钱占掉三分之一。';
      },
    },
    {
      id: 'se_temple', a0: 8, a1: 80, p: 0.096, cool: 2, icon: 'candle', cult: SE,
      run(S) {
        fx(S, { zhi: 7, ye: 5, shi: -2 });
        return pick([
          '节日去庙里，香火很旺。你跪了很久，许的愿和去年一样。',
          '教堂里坐满了人。散场时大家在门口握手，孩子跑来跑去。',
          '家里在门口摆了供品。母亲说，先人也要过节。',
        ]);
      },
    },
    {
      id: 'se_songkran', a0: 8, a1: 70, p: 0.096, cool: 3, icon: 'family', cult: SE,
      if: (S, c) => ['THA', 'MMR', 'KHM', 'LAO'].includes(c.id),
      run(S) {
        fx(S, { ye: 9, zhi: 6, gen: -0.5 });
        return '泼水节，街上全是湿的。你骑车经过，被人从头浇到脚，笑着骂了一句。';
      },
    },
    {
      id: 'se_schoolfee', a0: 7, a1: 16, p: 0.108, cool: 3, icon: 'school', cult: SE,
      run(S) {
        fx(S, { shi: -3, ye: -3 });
        return '开学要交一笔钱：校服、书本、还有「建校费」。母亲数了三遍。';
      },
    },
    {
      id: 'se_grab', a0: 20, a1: 50, p: 0.096, cool: 3, icon: 'phone', cult: SE,
      run(S) {
        fx(S, { shi: 4, gen: -1.5 });
        return '你注册成了网约车司机。评分掉了两星，你给乘客发消息问哪里做得不好。';
      },
    },
    {
      id: 'se_haze', a0: 10, a1: 65, p: 0.072, cool: 4, icon: 'drought', cult: SE,
      if: (S, c) => ['IDN', 'MYS', 'SGP', 'BRN'].includes(c.id),
      run(S) {
        fx(S, { gen: -2.5, ye: -3 }); risk(S, 1.05, 'lung');
        return '旱季烧林，烟霾飘了过来。天是黄的，学校停课，口罩卖到脱销。';
      },
    },
    {
      id: 'se_bayanihan', a0: 18, a1: 65, p: 0.096, cool: 3, icon: 'family', cult: SE,
      run(S) {
        fx(S, { zhi: 8, ye: 5 });
        return '邻居家要搬房子，全村人来帮忙抬。抬完吃了一顿饭，谁也没提钱。';
      },
    },
    {
      id: 'se_fruit', a0: 10, a1: 68, p: 0.096, cool: 2, icon: 'field', cult: SE,
      run(S) {
        fx(S, { ye: 5, shi: 2 });
        return '水果季，屋后的树上结得太多，吃不完。你摘了一筐送给邻居。';
      },
    }
  );

  // ==================== 中东北非 ====================
  const ME = ['mena'];
  E.push(
    {
      id: 'me_adhan', a0: 4, a1: 85, p: 0.12, cool: 2, icon: 'candle', cult: ME,
      run(S) {
        fx(S, { ye: 4, zhi: 4 });
        return pick([
          '天没亮，宣礼的声音从几个方向一起过来。你翻个身，接着睡。',
          '傍晚的宣礼。街上安静下来，店铺里的人陆续走出去。',
          '斋月里，日落那一声之后，整条街的人才开始吃饭。',
        ]);
      },
    },
    {
      id: 'me_ramadan', a0: 6, a1: 82, p: 0.12, cool: 2, icon: 'family', cult: ME,
      run(S) {
        fx(S, { zhi: 7, ye: 4, gen: -1 });
        return pick([
          '整个白天不吃不喝。下午最难熬，你靠在墙边，等着日落的钟声。',
          '开斋饭，一家人围坐，先吃一颗枣，再喝一口水。',
          '斋月的夜里街上比白天热闹。店铺开到很晚，孩子在外面玩。',
        ]);
      },
    },
    {
      id: 'me_tea', a0: 10, a1: 82, p: 0.108, cool: 2, icon: 'family', cult: ME,
      run(S) {
        fx(S, { zhi: 6, ye: 5 });
        return pick([
          '客人来了，先倒茶。茶要浓，杯子小，一杯要喝三口。',
          '你在街边的茶馆坐了一下午，一杯茶续了四次。',
          '有人送来一盘甜点，甜得发腻。你吃了一块，又吃了一块。',
        ]);
      },
    },
    {
      id: 'me_majlis', a0: 20, a1: 75, p: 0.096, cool: 3, icon: 'family', cult: ME,
      run(S) {
        fx(S, { zhi: 9, shi: 2 });
        return '长辈家里坐了十几个人。你按顺序问好，坐下，听他们说事。散的时候已经过了午夜。';
      },
    },
    {
      id: 'me_wedding', a0: 19, a1: 38, p: 0.18, once: true, icon: 'love', cult: ME,
      run(S) {
        fx(S, { shi: -14, zhi: 12, ye: 8 }); S.flags.debt = true;
        return '婚礼办了两场，男女分开。请了三百多人，乐队从晚上八点奏到凌晨。';
      },
    },
    {
      id: 'me_water', a0: 0, a1: 75, p: 0.108, cool: 3, icon: 'drought', cult: ME,
      if: (S, c) => c.wat < 95,
      run(S) {
        fx(S, { gen: -1.5, ye: -4 });
        return pick([
          '自来水一天只来两个小时。你把所有能装水的容器都装满了，浴缸也是。',
          '水车开进巷子，大家提着桶排队。一桶水要用两天。',
        ]);
      },
    },
    {
      id: 'me_heat', a0: 0, a1: 82, p: 0.096, cool: 2, icon: 'drought', cult: ME,
      run(S) {
        fx(S, { gen: -2, ye: -4 }); risk(S, 1.06, 'heat');
        return pick([
          '白天五十度。街上没人，店都关着，等太阳落了才开门。',
          '空调外机整夜在响。电费单来的时候，你心疼了一下。',
          '热浪持续了两周。医院里老人排满了。',
        ]);
      },
    },
    {
      id: 'me_dust', a0: 0, a1: 82, p: 0.09, cool: 2, icon: 'storm', cult: ME,
      run(S) {
        fx(S, { gen: -1.5, ye: -3 });
        return '沙尘暴，天变成橙色。窗缝里全是沙，桌上的东西一层土。';
      },
    },
    {
      id: 'me_bazaar', a0: 12, a1: 68, p: 0.12, cool: 2, icon: 'coins', cult: ME,
      run(S) {
        fx(S, { shi: 3, zhi: 5, ye: 4 });
        return pick([
          '老集市里很窄，头顶是拱形的顶，光从缝里漏下来。你在香料摊前站了很久。',
          '你和摊主讲价讲了十分钟，最后各让一步。他给你多抓了一把。',
          '集市里什么都有：铜器、地毯、衣服、刚出炉的饼。',
        ]);
      },
    },
    {
      id: 'me_souk_credit', a0: 20, a1: 62, p: 0.096, cool: 3, icon: 'coins', cult: ME,
      run(S) {
        fx(S, { shi: -3, zhi: 6 });
        return '你在常去的店里赊了账，老板记在本子上。月底发钱，你第一个去还。';
      },
    },
    {
      id: 'me_expat', a0: 22, a1: 50, p: 0.108, once: true, icon: 'boat', cult: ME,
      if: (S, c) => ['SAU', 'ARE', 'QAT', 'KWT', 'BHR', 'OMN'].includes(c.id),
      run(S) {
        fx(S, { shi: 10, zhi: -4, ye: -2 }); S.migrated = true;
        return '你在这边做工，签证绑着雇主。工资寄回去，自己住在一间合租房里。';
      },
    },
    {
      id: 'me_gulf_out', a0: 20, a1: 45, p: 0.096, once: true, icon: 'boat', cult: ME,
      if: (S, c) => ['EGY', 'JOR', 'LBN', 'SYR', 'TUN', 'DZA', 'MAR', 'YEM'].includes(c.id),
      run(S) {
        fx(S, { shi: 7, zhi: -7, gen: -2 }); S.migrated = true;
        return '你去了海湾做工，很久才回一次家。听见家里人的声音，你应了一声，声音有点抖。';
      },
    },
    {
      id: 'me_family', a0: 15, a1: 70, p: 0.12, cool: 3, icon: 'family', cult: ME,
      run(S) {
        fx(S, { zhi: 8, ye: 4, shi: -3 });
        return '亲戚来了一屋子。男人在客厅，女人在厨房，孩子在楼道里跑。饭做了三轮。';
      },
    },
    {
      id: 'me_hajj', a0: 40, a1: 75, p: 0.072, once: true, icon: 'candle', cult: ME,
      run(S) {
        fx(S, { gen: -2.5, zhi: 12, ye: 12, shi: -10 });
        return '你攒了很多年，终于去了。人山人海，你跟着走，脚肿了三天。回来那天，门口挤满了来道贺的人。';
      },
    },
    {
      id: 'me_military', a0: 18, a1: 22, p: 0.3, once: true, icon: 'war', cult: ME, sex: 'M',
      if: (S, c) => ['EGY', 'DZA', 'MAR', 'TUN', 'JOR', 'IRQ', 'IRN', 'ISR', 'TUR', 'SYR'].includes(c.id),
      run(S) {
        fx(S, { gen: 3, zhi: 5, ye: -7 });
        return '你服役一到三年。训练很苦，休假回家那天，母亲在门口站了很久。';
      },
    },
    {
      id: 'me_madrasa', a0: 5, a1: 13, p: 0.15, once: true, icon: 'book', cult: ME,
      run(S) {
        fx(S, { shi: 4, zhi: 5 });
        return '放学后你去学经文，一句一句跟着念。老师用一根小棍指着字。';
      },
    },
    {
      id: 'me_desal', a0: 14, a1: 65, p: 0.072, cool: 3, icon: 'coins', cult: ME,
      if: (S, c) => ['SAU', 'ARE', 'QAT', 'KWT', 'BHR', 'OMN', 'ISR', 'LBY'].includes(c.id),
      run(S) {
        fx(S, { shi: 3, gen: 1 });
        return '水是从海边处理过来的。水龙头拧开就有，但你从小知道这水很贵。';
      },
    }
  );

  // ==================== 撒哈拉以南非洲 ====================
  const SS = ['ssa'];
  E.push(
    {
      id: 'ss_church', a0: 5, a1: 82, p: 0.132, cool: 2, icon: 'family', cult: SS,
      run(S) {
        fx(S, { zhi: 8, ye: 6 });
        return pick([
          '周日的礼拜，唱诗班唱了四十分钟。你穿了最好的一件衣服。',
          '教堂的屋顶是铁皮的，下雨时声音大得听不清讲道。',
          '礼拜结束，大家在门口站着聊天，聊了一个多小时才散。',
        ]);
      },
    },
    {
      id: 'ss_net', a0: 0, a1: 10, p: 0.3, once: true, icon: 'mosquito', cult: SS,
      run(S) {
        fx(S, { gen: 1.5 });
        return '家里领了蚊帐，白色的，挂在床中间。晚上钻进去，像进了一个小帐篷。';
      },
    },
    {
      id: 'ss_borehole', a0: 5, a1: 62, p: 0.108, cool: 3, icon: 'flood', cult: SS,
      if: (S, c) => c.wat < 80,
      run(S) {
        fx(S, { gen: 1, zhi: 5, ye: 5 });
        return '村里打了一口井。不用再走一个钟头去河边了，女人们围着井口笑了一下午。';
      },
    },
    {
      id: 'ss_walk_school', a0: 6, a1: 15, p: 0.24, cool: 2, icon: 'school', cult: SS,
      if: (S, c) => c.id !== 'NGA' || (S.school && !S.urban),
      run(S) {
        fx(S, { gen: -1.5, ye: -2 });
        return pick([
          '走到学校要一个小时。雨季路上全是泥，鞋提在手里。',
          '你和同学一起走，路上摘野果吃。到学校时天刚亮。',
        ]);
      },
    },
    {
      id: 'ss_fees', a0: 7, a1: 18, p: 0.144, cool: 2, icon: 'school', cult: SS,
      if: (S, c) => c.id !== 'NGA' || S.school,
      run(S) {
        fx(S, { shi: -4, ye: -4 });
        return pick([
          '学费和校服钱又催了。母亲把摊子上一天的收入数了两遍。',
          '学校说要买书。你等到第三个星期才拿到，是借来的旧书。',
          '你因为没交齐费用，被叫回家待了两天。回来时课已经讲到后面了。',
        ]);
      },
    },
    {
      id: 'ss_cattle', a0: 8, a1: 45, p: 0.132, cool: 3, icon: 'field', cult: SS,
      if: (S, c) => c.agr > 25 && (c.id !== 'NGA' || !S.urban),
      run(S) {
        fx(S, { gen: 1.5, zhi: 4 });
        return '你放牛。牛走得慢，你跟在后面，一天走十几里。傍晚赶回来，数一遍头数。';
      },
    },
    {
      id: 'ss_market', a0: 16, a1: 62, p: 0.144, cool: 2, icon: 'coins', cult: SS,
      run(S) {
        fx(S, { shi: 4, zhi: 5, gen: -1 }); if (!S.job) S.job = 'trade';
        return pick([
          '你在市场摆摊，卖番茄和洋葱。太阳升起来之前要占好位置。',
          '你把货顶在头上走到市场，一趟四十分钟。',
          '今天卖得不好，剩了半筐。你降价处理掉了，起码不亏本。',
        ]);
      },
    },
    {
      id: 'ss_mobilemoney', a0: 18, a1: 60, p: 0.168, once: true, icon: 'phone', cult: SS, era: [2007, 9999],
      if: (S, c) => c.id !== 'NGA',
      run(S) {
        fx(S, { shi: 6, ye: 5 });
        return '你办了一个手机钱包。不用再走两小时去镇上汇款，站在路口就有信号。';
      },
    },
    {
      id: 'ss_generator', a0: 15, a1: 60, p: 0.132, cool: 2, icon: 'home', cult: SS,
      run(S) {
        fx(S, { shi: -4, gen: -1 });
        return pick([
          '又停电了。你把发电机拖出来，加了油，声音吵得邻居探头看。',
          '停电停了两天。冰箱里的东西坏了，你全都扔了。',
          '夜里来电了，整条街的灯一起亮，有人喊了一声。',
        ]);
      },
    },
    {
      id: 'ss_minibus', a0: 14, a1: 62, p: 0.12, cool: 2, icon: 'road', cult: SS,
      run(S) {
        fx(S, { gen: -1.5 });
        return '小巴塞了十九个人，司机还在招人。车上的收音机开得很大。';
      },
    },
    {
      id: 'ss_extended', a0: 10, a1: 62, p: 0.12, cool: 3, icon: 'family', cult: SS,
      run(S) {
        fx(S, { zhi: 8, shi: -4 });
        return '老家的亲戚来了两个孩子，要在这边读书，住下了。家里又挤了一层。';
      },
    },
    {
      id: 'ss_funeral', a0: 20, a1: 82, p: 0.108, cool: 3, icon: 'candle', cult: SS,
      run(S) {
        fx(S, { shi: -8, zhi: 10, ye: -3 });
        return '亲戚过世，葬礼办了三天。亲戚从很远的地方回来，家里杀了一头牛。';
      },
    },
    {
      id: 'ss_bride', a0: 18, a1: 32, p: 0.18, once: true, icon: 'love', cult: SS,
      if: (S, c) => c.id !== 'NGA' && !S.married,
      run(S) {
        fx(S, { shi: -10, zhi: 8, ye: 4 }); S.married = true; S.flags.debt = true;
        return '彩礼谈了几轮，最后定下几头牛和一笔钱。两家人坐在一起吃了饭。';
      },
    },
    {
      id: 'ss_football', a0: 8, a1: 42, p: 0.12, cool: 3, icon: 'field', cult: SS,
      run(S) {
        fx(S, { ye: 8, zhi: 5, gen: 1 });
        return pick([
          '空地上踢球，球是塑料袋捆的。门是两块石头。',
          '有比赛的日子，全村挤在一台电视前。进球时人全跳起来了。',
        ]);
      },
    },
    {
      id: 'ss_drought', a0: 0, a1: 72, p: 0.048, cool: 3, icon: 'drought', cult: SS,
      if: (S, c) => c.id !== 'NGA' || !S.urban,
      run(S) {
        fx(S, { gen: -2.5, shi: -6, ye: -5 }); risk(S, 1.1, 'mnut');
        return '旱了很久。河床露出来，庄稼没长起来。牲口开始一头一头地死。';
      },
    },
    {
      id: 'ss_clinic', a0: 8, a1: 62, p: 0.108, cool: 3, icon: 'clinic', cult: SS,
      run(S) {
        fx(S, { gen: 1, shi: -3 });
        return pick([
          '援助的诊所来做筛查。排队排了一上午，量了血压，发了一包药。',
          '你走了三个小时到卫生站。护士说药没了，下个月再来。',
          '孩子发烧，你借了钱送去镇上的诊所。医生说是疟疾，打了一针。',
        ]);
      },
    },
    {
      id: 'ss_land', a0: 22, a1: 55, p: 0.096, once: true, icon: 'field', cult: SS,
      if: (S, c) => c.agr > 20,
      run(S) {
        fx(S, { shi: 5, zhi: 4, gen: -1.5 }); mark(S, 'bloom');
        return '你分到一块地，在村外走半个钟头的地方。第一年种玉米，收成一般。';
      },
    },
    {
      id: 'ss_radio', a0: 8, a1: 68, p: 0.108, cool: 2, icon: 'phone', cult: SS,
      run(S) {
        fx(S, { ye: 5, zhi: 4 });
        return pick([
          '收音机用电池，电池贵。你听一会儿就关掉，留着晚上听。',
          '广播里在讲怎么防疟疾，说的是本地话。你听懂了。',
          '一群人围着一台收音机听球赛，谁也不敢出声。',
        ]);
      },
    }
  );

  NL.register(E);
})(typeof globalThis !== 'undefined' ? globalThis : this);
