/* 年轮 · 国家与制度节点（原创）
 * 制度与时间依据见 research/country-era-20261110.md。
 * 适用范围不是国籍推断；只描述在当地生活时可能遇到的一条路径。
 * 选择的概率、数值和个体经历均为游戏设定；2026 年后的制度延续属于推演。
 */
(function (root) {
  'use strict';
  const NL = root.NL;
  const { chance, clamp, fx, mark } = NL.util;
  const year = (S) => S.year0 + S.age;

  NL.register([
    {
      id: 'cn_vocational_finish', iso: ['CHN'], a0: 17, a1: 19, p: 1, once: true, icon: 'diploma',
      if: (S) => S.flags.vocational && S.school,
      run(S) { S.school = false; S.job = 'factory'; fx(S, { shi: 6, ye: 3 }); return '职业课程结业了。你带着工具进车间，师傅让你先从最慢的一道工序做起。'; },
    },
    {
      id: 'cn_employment', iso: ['CHN'], era: [1978, 9999], a0: 20, a1: 27, p: 0.32, once: true, dec: true, icon: 'office',
      if: (S) => !S.school,
      ask: (S) => year(S) < 1993 ? '单位有个招工名额。另一边，街口也有人开始自己做生意。' : '招聘会上，你拿着几份简历。熟人介绍的岗位稳一些，另一家给的钱更多。',
      L: {
        t: '选熟悉、稳一点的',
        run(S) { S.job = S.edu >= 3 ? 'office' : 'factory'; S.flags.workRoute = 'stable'; fx(S, { shi: 5, zhi: 4 }); return year(S) < 1993 ? '你进了单位。先领工作服，再认识同一个车间的人。宿舍离厂门很近。' : '你选了熟人介绍的岗位。工资涨得慢，但下班后还赶得上和家里吃饭。'; },
      },
      R: {
        t: (S) => year(S) < 1993 ? '试着自己做买卖' : '去另一座城应聘',
        run(S) { S.job = year(S) < 1993 ? 'trade' : 'office'; S.urban = true; S.migrated = true; S.flags.workRoute = 'market'; fx(S, { shi: 9, zhi: -5, ye: 2 }); return year(S) < 1993 ? '你跟人合租了一个摊位。第一次自己进货，账本记得很乱，后来才慢慢算清。' : '你去了另一座城。工资高了一些，房租也高，周末开始自己做饭。'; },
      },
      ai: 0.45,
    },
    {
      id: 'cn_unit_housing', iso: ['CHN'], era: [1978, 1998], a0: 25, a1: 42, p: 0.24, once: true, dec: true, icon: 'home',
      if: (S) => S.urban && !S.flags.home && (S.job === 'office' || S.job === 'factory') && S.flags.workRoute !== 'market',
      ask: () => '单位又贴了分房名单。你还排在后面，家里催着想办法。',
      L: { t: '接着等，先住集体宿舍', run(S) { S.flags.housingRoute = 'unit'; fx(S, { shi: 4, ye: -3 }); return '你留下来等。宿舍走廊共用一个水龙头，下班后先排队洗衣服。'; } },
      R: { t: '自己租一间', run(S) { S.flags.housingRoute = 'rent'; fx(S, { shi: -4, ye: 6, zhi: 2 }); return '你租了一间小屋。家具是拼起来的，晚上关上门，终于能安静说句话。'; } },
      ai: 0.4,
    },
    {
      id: 'hk_hkcee', iso: ['HKG'], era: [1974, 2010], a0: 16, a1: 17, p: 1, once: true, dec: true, icon: 'book', rank: 6,
      if: (S) => S.school && S.edu === 2,
      ask: () => '中五会考放榜了。要不要继续读预科，再试大学？',
      L: { t: '读职业课程，早点工作', run(S) { S.school = false; S.flags.studyRoute = 'vocational'; fx(S, { shi: 5, ye: 2 }); return '你去报职业课程。白天上课，放假跟着亲戚学做事，第一份工从熟人介绍开始。'; } },
      R: { t: '继续读预科', run(S) { S.flags.studyRoute = 'sixth-form'; fx(S, { shi: 3, ye: -2 }); return '你留下来读预科。书更厚了，校服还穿原来那套。'; } },
      ai: 0.6,
    },
    {
      id: 'hk_entrance', iso: ['HKG'], a0: 18, a1: 19, p: 1, once: true, dec: true, icon: 'diploma', rank: 7,
      if: (S) => S.school && S.edu === 2,
      ask: (S) => year(S) >= 2012 ? '中学文凭试（DSE）的成绩出来了。你把大学和其他升学课程的要求放在一起看。' : '高级程度会考放榜了。你和老师一起看大学志愿。',
      L: { t: '选较稳妥的课程', run(S) { S.edu = 3; fx(S, { shi: 7, zhi: 3 }); mark(S, 'bloom'); return '你进了本地的高等教育课程。通勤还走原来的路线，但书包里换了一批书。'; } },
      R: { t: '试第一志愿', run(S, c) { if (chance(clamp(c.ter / 140 + (S.q - 3) * 0.06, 0.2, 0.8))) { S.edu = 3; fx(S, { shi: 12, ye: 5 }); mark(S, 'bloom'); return '第一志愿录取了。你把通知给家里看，晚饭多了一道菜。'; } S.school = false; fx(S, { ye: -6, shi: 2 }); return '第一志愿没有录取。你留下课程资料，先找了一份工作。'; } },
      ai: 0.45,
    },
    {
      id: 'hk_housing', iso: ['HKG'], a0: 25, a1: 42, p: 0.2, once: true, dec: true, icon: 'home',
      if: (S) => !S.flags.home,
      ask: () => '想搬出来住。你把公屋申请条件、轮候安排和几张租房广告摊在桌上。',
      L: { t: '核对条件，先和家人住', run(S) { S.flags.housingRoute = 'family'; fx(S, { shi: 5, zhi: 3, ye: -3 }); return '你核对申请条件，把材料收进文件夹。眼下先住家里，饭桌每天都要挪开一点。'; } },
      R: { t: '租近工作地点', run(S) { S.flags.housingRoute = 'rent'; fx(S, { shi: -6, ye: 5 }); return '你租了一间小房。通勤短了，工资到账后先划掉房租，剩下的才敢花。'; } },
      ai: 0.5,
    },
    {
      id: 'mo_entrance', iso: ['MAC'], a0: 17, a1: 18, p: 1, once: true, dec: true, icon: 'diploma', rank: 7,
      if: (S) => S.school && S.edu === 2,
      ask: (S) => year(S) >= 2017 ? '四校联考的报名资料拿到了。语言和数学要准备，其他要求还得逐校看。' : '你把本地几所高校的招生资料排在桌上。考试和面试要分别准备。',
      L: { t: '申请本地课程', run(S) { S.edu = 3; fx(S, { shi: 7, zhi: 4 }); mark(S, 'bloom'); return '你留在本地读书。家里到学校不算远，晚饭时还能听到一天里的琐事。'; } },
      R: { t: '先去工作', run(S) { S.school = false; S.job = 'trade'; fx(S, { shi: 4, ye: 1 }); return '你开始找工。第一份在服务业，轮班表贴在员工通道，休息日和朋友很难对上。'; } },
      ai: 0.4,
    },
    {
      id: 'sg_secondary', iso: ['SGP'], a0: 16, a1: 16, p: 1, once: true, dec: true, icon: 'book', rank: 6,
      if: (S) => S.school && S.edu === 2,
      ask: (S) => (year(S) >= 2027 ? '中学教育证书（SEC）' : 'O 水准') + '成绩出来了。接下来，理工学院还是初级学院？',
      L: { t: '读理工学院的应用课程', run(S) { S.edu = 3; S.flags.studyRoute = 'polytechnic'; fx(S, { shi: 8, ye: 2 }); return '你选了理工学院。课程多了项目和实习，作品要做出来给人看。'; } },
      R: { t: '去初级学院，准备 A 水准', run(S) { S.flags.studyRoute = 'junior-college'; fx(S, { shi: 4, ye: -3 }); return '你进了初级学院。新的课表排得很满，接下来的目标是 A 水准。'; } },
      ai: 0.5,
    },
    {
      id: 'sg_entrance', iso: ['SGP'], a0: 18, a1: 19, p: 1, once: true, dec: true, icon: 'diploma', rank: 7,
      if: (S) => S.school && S.edu === 2,
      ask: () => 'A 水准放榜。你在本地大学的课程名单上做了几个记号。',
      L: { t: '申请本地大学', run(S, c) { if (chance(clamp(c.ter / 130 + (S.q - 3) * 0.08, 0.2, 0.85))) { S.edu = 3; fx(S, { shi: 11, ye: 4 }); mark(S, 'bloom'); return '你进了本地大学。上课要换一趟车，回家吃饭的次数少了一些。'; } S.school = false; fx(S, { shi: 2, ye: -5 }); return '申请没有成功。你先去工作，把继续读书的资料留在抽屉里。'; } },
      R: { t: '先工作，再安排进修', run(S) { S.school = false; S.job = 'trade'; fx(S, { shi: 5, ye: 1 }); return '你先找了一份工作。晚上的课程要自己排，工资里留一部分做学费。'; } },
      ai: 0.4,
    },
    {
      id: 'sg_hdb', iso: ['SGP'], era: [1968, 9999], a0: 25, a1: 42, p: 0.24, once: true, dec: true, icon: 'home',
      if: (S) => S.married && !S.flags.home,
      ask: () => '你们想安顿下来。组屋申请条件、积蓄和公积金余额，得一起算。',
      L: { t: '先和家人住，继续存', run(S) { S.flags.housingRoute = 'family'; fx(S, { shi: 6, zhi: 3, ye: -2 }); return '你们先留在家里。每月把钱存下，吃饭时仍要轮流挪椅子。'; } },
      R: { t: '核对条件，安排买组屋', run(S) { S.flags.home = true; S.flags.mortgage = true; S.flags.housingRoute = 'hdb'; fx(S, { shi: -7, ye: 9, zhi: 4 }); mark(S, 'bloom'); return '核对条件后，你们办好购房手续，把公积金和现金支出重新排了一遍。拿到钥匙时，先量的是餐桌的位置。'; } },
      ai: 0.6,
    },
    {
      id: 'sg_cpf', iso: ['SGP'], era: [1968, 9999], a0: 52, a1: 68, p: 0.18, once: true, dec: true, icon: 'elder',
      ask: () => '你翻出公积金对账单。房子、日常开销和往后的收入，要重新排一遍。',
      L: { t: '留在熟悉的家里', run(S) { fx(S, { ye: 4, shi: -3 }); return '你留下来住。每个月先算固定支出，剩下的钱慢慢花。'; } },
      R: { t: '考虑换小一点的住处', run(S) { S.flags.moved = true; fx(S, { shi: 6, zhi: -3 }); return '你开始看小一点的住处。旧家具要处理，附近的熟人也要重新认识。'; } },
      ai: 0.45,
    },
    {
      id: 'kr_hagwon', iso: ['KOR'], a0: 10, a1: 16, p: 0.2, cool: 3, icon: 'book',
      if: (S) => S.school && S.urban,
      run(S) { fx(S, { shi: 5, gen: -1, ye: -3 }); return '补习学院下课，楼下的接送车还在等。你在车里吃完一小盒饭，回家接着做题。'; },
    },
    {
      id: 'kr_entrance', iso: ['KOR'], a0: 18, a1: 18, p: 1, once: true, dec: true, icon: 'diploma', rank: 7,
      if: (S) => S.school && S.edu === 2,
      ask: (S) => (year(S) >= 1993 ? '修能考试结束了。' : '大学入学考试结束了。') + '志愿表上，本地的学校和首尔的学校圈在不同颜色里。',
      L: { t: '选本地的课程', run(S) { S.edu = 3; fx(S, { shi: 8, zhi: 4 }); mark(S, 'bloom'); return '你留在本地读书。周末能回家，生活费紧的时候，家里会带来一袋吃的。'; } },
      R: { t: '冲首尔的学校', run(S, c) { if (chance(clamp(c.ter / 150 + (S.q - 3) * 0.06, 0.15, 0.8))) { S.edu = 3; S.migrated = true; fx(S, { shi: 12, zhi: -4, ye: 4 }); mark(S, 'bloom'); return '你拿到了录取，搬去首尔。房租先付掉一大笔，课程表贴在床头。'; } S.school = false; fx(S, { ye: -6, shi: 1 }); return '没有录取。你先去找工作，书还没有扔。'; } },
      ai: 0.5,
    },
    {
      id: 'kr_work', iso: ['KOR'], a0: 22, a1: 30, p: 0.22, once: true, dec: true, icon: 'office',
      if: (S) => !S.school,
      ask: (S) => year(S) < 1997 ? '工厂和办公室都贴着招人启事。你想再考一次大公司的岗位。' : '合同到期前，你还没等到转正的消息。另一家小公司催你答复。',
      L: { t: '再准备一轮考试和面试', run(S) { fx(S, { shi: -3, ye: -3 }); return '你又报了一轮。每天记下练习和面试时间，这段日子靠积蓄撑着。'; } },
      R: { t: '先接下眼前的工作', run(S) { S.job = 'office'; fx(S, { shi: 5, ye: 2 }); return '你接下了工作。合同不长，但工资终于按月到账了。'; } },
      ai: 0.6,
    },
    {
      id: 'kr_jeonse', iso: ['KOR'], a0: 24, a1: 40, p: 0.22, once: true, dec: true, icon: 'home',
      if: (S) => !S.flags.home,
      ask: () => '全租要一大笔保证金；月租先交少一些，每月再付。你把两份合同放在一起。',
      L: { t: '选月租，留点积蓄', run(S) { S.flags.housingRoute = 'wolse'; fx(S, { shi: -4, ye: 4 }); return '你选了月租。手里还留着应急的钱，每月发薪后先划出房租。'; } },
      R: { t: '核对合同，选全租', run(S) { S.flags.housingRoute = 'jeonse'; fx(S, { shi: -9, ye: 5, zhi: 2 }); return '你核对了权属和合同，凑齐保证金。现金一下少了，退租时能不能顺利拿回，你仍放在心上。'; } },
      ai: 0.45,
    },
    {
      id: 'kr_chuseok', iso: ['KOR'], a0: 20, a1: 80, p: 0.12, cool: 3, icon: 'family',
      run(S) { fx(S, { zhi: 6, ye: 4 }); return '秋夕返乡。路上堵了很久，到了才发现亲戚已经围坐在一起，给你留了松饼。'; },
    },
    {
      id: 'kr_kimjang', iso: ['KOR'], a0: 8, a1: 78, p: 0.12, cool: 4, icon: 'family',
      run(S) { fx(S, { zhi: 5, ye: 4 }); return '入冬前一起腌泡菜。手套上全是红的，做完后每家都分走几盒。'; },
    },
    {
      id: 'kr_elder', iso: ['KOR'], a0: 58, a1: 76, p: 0.12, once: true, dec: true, icon: 'elder',
      if: (S) => !S.school,
      ask: () => '原来的工作告一段落。朋友问你要不要一起接点活，家里劝你先歇歇。',
      L: { t: '先歇一阵', run(S) { fx(S, { ye: 5, shi: -3 }); return '你把早上的闹钟关了。过了几周，开始固定去附近走路。'; } },
      R: { t: '找份时间短一点的活', run(S) { S.job = 'trade'; fx(S, { shi: 4, gen: -1 }); return '你换了一份时间短些的工作。钱少了一些，日子仍有一个出门的时辰。'; } },
      ai: 0.5,
    },
    {
      id: 'us_college', iso: ['USA'], a0: 17, a1: 18, p: 1, once: true, dec: true, icon: 'diploma', rank: 7,
      if: (S) => S.school && S.edu === 2,
      ask: () => '几封录取和资助通知放在一起。社区学院离家近，四年制学校的住宿和学费要另算。',
      L: { t: '先读社区学院，住家里', run(S) { S.edu = 3; S.flags.studyRoute = 'community-college'; fx(S, { shi: 6, zhi: 4 }); return '你先在社区学院修课。白天上课，空下来的时间打工，之后再看转学的机会。'; } },
      R: { t: '算清资助，去四年制学校', run(S) { S.edu = 3; S.flags.studyRoute = 'four-year'; fx(S, { shi: 10, zhi: -3, ye: 3 }); mark(S, 'bloom'); return '你搬进宿舍。资助覆盖了一部分，剩下的费用还得靠家里、打工或贷款补上。'; } },
      ai: (S) => clamp(0.45 + (S.q - 3) * 0.12, 0.15, 0.8),
    },
    {
      id: 'us_work', iso: ['USA'], a0: 22, a1: 35, p: 0.2, once: true, dec: true, icon: 'office',
      if: (S) => !S.school,
      ask: (S) => year(S) < 2000 ? '本地有个全职岗位，福利清单和工资一起给了你。外州另一份机会，薪水更高。' : '你收到了两份工作邀约。工资、医保和通勤距离，不能只看其中一项。',
      L: { t: '留在本地，先看福利', run(S) { S.job = 'office'; fx(S, { shi: 4, zhi: 5 }); return '你留下来。工资一般，熟人还在附近，福利清单被你收进了文件夹。'; } },
      R: { t: '搬去另一州', run(S) { S.job = 'office'; S.migrated = true; S.flags.moved = true; fx(S, { shi: 9, zhi: -5, ye: 2 }); return '你租了搬家车，沿公路开了一整天。新工作的钱多一些，保险和住处都要重新安排。'; } },
      ai: 0.5,
    },
    {
      id: 'de_training', iso: ['DEU'], a0: 16, a1: 17, p: 1, once: true, dec: true, icon: 'book', rank: 6,
      if: (S) => S.school && S.edu === 2,
      ask: (S) => year(S) < 1991 ? '学校在谈毕业后的安排。你可以去学一门技术，也可以继续准备升学。' : '你拿到一份双元制培训资料：一部分时间在企业，一部分在职业学校。另一条路是继续准备 Abitur。',
      L: { t: '去学一门技术', run(S) { S.school = false; S.job = 'factory'; S.flags.apprenticeAt = S.age; fx(S, { shi: 6, ye: 2 }); return '你签下培训安排。工作鞋放在门边，课本仍要带，师傅先教你怎么检查工具。'; } },
      R: { t: '继续准备升学', run(S) { S.flags.studyRoute = 'abitur'; fx(S, { shi: 4, ye: -2 }); return '你留下来准备升学资格。作业多了，周末仍留出一段时间和朋友碰面。'; } },
      ai: 0.5,
    },
    {
      id: 'de_apprentice_finish', iso: ['DEU'], a0: 19, a1: 22, p: 1, once: true, icon: 'diploma',
      if: (S) => S.flags.apprenticeAt != null && S.age >= S.flags.apprenticeAt + 3,
      run(S) { fx(S, { shi: 9, ye: 5 }); mark(S, 'bloom'); return '培训结束，你拿到了职业资格。师傅问你愿不愿意留下，这次谈的是正式工作的条件。'; },
    },
    {
      id: 'de_entrance', iso: ['DEU'], a0: 18, a1: 20, p: 1, once: true, dec: true, icon: 'diploma', rank: 7,
      if: (S) => S.school && S.edu === 2,
      ask: () => '升学资格拿到了。你想继续读理论，还是选更贴近应用的课程？',
      L: { t: '读应用方向', run(S) { S.edu = 3; fx(S, { shi: 8, ye: 3 }); return '你选了应用方向的课程。实习也写在计划里，学期开始前先找住处。'; } },
      R: { t: '读自己喜欢的学科', run(S) { S.edu = 3; fx(S, { shi: 9, ye: 5, zhi: -2 }); mark(S, 'bloom'); return '你报了喜欢的学科。书单很长，读不懂的地方，去找同学一起讨论。'; } },
      ai: 0.5,
    },
    {
      id: 'de_rent', iso: ['DEU'], a0: 24, a1: 45, p: 0.2, once: true, dec: true, icon: 'home',
      if: (S) => !S.flags.home,
      ask: () => '你看中一间出租公寓。押金、冷租和附加费用分开写，搬进去还得准备家具。',
      L: { t: '和人合租', run(S) { S.flags.housingRoute = 'shared'; fx(S, { shi: 5, zhi: 3, ye: -2 }); return '你选了合租。厨房值日排在冰箱上，偶尔为谁没洗锅争几句。'; } },
      R: { t: '自己租一间', run(S) { S.flags.housingRoute = 'rent'; fx(S, { shi: -5, ye: 7 }); return '你签了租约。空房子回声很大，第一件搬进去的是一张二手桌子。'; } },
      ai: 0.5,
    },
    {
      id: 'de_work', iso: ['DEU'], a0: 25, a1: 50, p: 0.12, once: true, dec: true, icon: 'factory',
      if: (S) => S.job === 'factory' || S.job === 'office',
      ask: () => '岗位要调整，企业职工委员会开了说明会。你把新的工时安排带回家看。',
      L: { t: '留下，按新安排做', run(S) { fx(S, { shi: 3, zhi: 3 }); return '你留下来。新的班表还是不方便，但至少能提前把家里的事排开。'; } },
      R: { t: '进修，申请别的岗位', run(S) { fx(S, { shi: 7, ye: 2, gen: -1 }); return '你报了进修。白天上班，晚上的练习要赶，证书拿到时很想睡一觉。'; } },
      ai: 0.5,
    },
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
