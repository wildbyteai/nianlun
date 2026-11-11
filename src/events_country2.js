/* 年轮 · 印度、巴西、尼日利亚的年代路径（原创）
 * 公开事实与游戏分段见 research/india-brazil-nigeria-20261110.md。
 * 制度名称有年份边界；机会、费用、录取和个体遭遇为游戏设定。
 * 按当前居住地筛选；2026 年之后延续已知条件作推演。
 */
(function (root) {
  'use strict';
  const NL = root.NL;
  const { chance, clamp, fx, mark } = NL.util;
  const year = (S) => S.year0 + S.age;

  NL.register([
    // ==================== 印度 ====================
    {
      id: 'in_secondary', iso: ['IND'], a0: 16, a1: 16, p: 1, once: true, dec: true, rank: 6, icon: 'book',
      if: (S) => S.school && S.edu === 2,
      ask: () => '十年级会考之后，你可以继续读十一、十二年级，也可以先学一门手艺。',
      L: { t: '先学手艺', run(S) { S.school = false; S.job = 'trade'; S.flags.inStudy = 'skills'; fx(S, { shi: 5, ye: 2 }); return '你跟着师傅学修理。先递工具，再自己拆装；读大学的事暂时放在一边。'; } },
      R: { t: '继续读高中', run(S) { S.flags.inStudy = 'senior'; fx(S, { shi: 4, ye: -2 }); return '你继续读十一、十二年级。课本换了一摞，升学考试还在后面。'; } },
      ai: 0.6,
    },
    {
      id: 'in_entrance', iso: ['IND'], a0: 18, a1: 18, p: 1, once: true, dec: true, rank: 7, icon: 'diploma',
      if: (S) => S.school && S.edu === 2,
      ask: (S) => year(S) < 2013 ? '十二年级快读完了。你在本地学院和工程入学考试的资料间做选择。' : '十二年级快读完了。工程方向要看 JEE Main 等考试，冲 IIT 还要过 Advanced。',
      L: { t: '申请本地学院', run(S) { S.edu = 3; S.flags.inStudy = 'local-college'; fx(S, { shi: 7, zhi: 4 }); return '你留在本地读书。通勤花的时间不少，但周末还能帮家里做事。'; } },
      R: { t: '准备工程入学考', run(S, c) { S.flags.inExam = year(S) < 2013 ? 'iit-jee' : 'main-advanced'; if (chance(clamp(c.ter / 130 + (S.q - 3) * 0.08, 0.12, 0.8))) { S.edu = 3; S.flags.inStudy = 'engineering'; fx(S, { shi: 12, ye: 5, zhi: -3 }); mark(S, 'bloom'); return '你拿到工程课程的录取，搬进宿舍。奖助和生活费要再算，书却已经先买好了。'; } S.school = false; S.job = 'trade'; fx(S, { shi: 2, ye: -6 }); return '这次没有录取。你先去工作，把书留下，之后再决定要不要重考。'; } },
      ai: (S) => clamp(0.45 + (S.q - 3) * 0.08, 0.15, 0.75),
    },
    {
      id: 'in_crop_trial', iso: ['IND'], era: [1966, 1989], a0: 8, a1: 45, p: 0.2, once: true, dec: true, icon: 'field',
      if: (S) => !S.urban && (S.job === 'farm' || S.age < 16),
      ask: () => '推广员带来新品种的示范。家里先看水源，再算种子和肥料的钱。',
      L: { t: '先用熟悉的种法', run(S) { S.flags.inCrop = 'traditional'; fx(S, { zhi: 3, ye: 2 }); return '家里先照旧种。你去看了邻地的示范田，等收成出来再商量。'; } },
      R: { t: '拿一小块地试种', run(S) { S.flags.inCrop = 'trial'; fx(S, { shi: 4, ye: 3 }); return '家里只拿一小块地试。你跟着记下浇水和施肥的日子，收成出来才算这一笔账。'; } },
      ai: 0.5,
    },
    {
      id: 'in_factory_early', iso: ['IND'], era: [1960, 1990], a0: 20, a1: 30, p: 0.3, once: true, dec: true, icon: 'factory',
      if: (S) => !S.school,
      ask: () => '一家厂在招工。另一边，亲戚让你跟着做小买卖，熟悉进货和账目。',
      L: { t: '进厂学技术', run(S) { S.job = 'factory'; S.flags.inWork = 'industry'; fx(S, { shi: 6, zhi: 3 }); return '你进了车间。工具要登记，换班跟着汽笛走；月底把工资装进信封带回家。'; } },
      R: { t: '跟亲戚做买卖', run(S) { S.job = 'trade'; S.flags.inWork = 'family-trade'; fx(S, { shi: 4, zhi: 5 }); return '你跟着跑批发市场。货少量进，账要一笔笔记，熟客慢慢才认得你的脸。'; } },
      ai: 0.45,
    },
    {
      id: 'in_services', iso: ['IND'], era: [1991, 9999], a0: 20, a1: 35, p: 0.28, once: true, dec: true, icon: 'office',
      if: (S) => !S.school && S.edu >= 2,
      ask: (S) => year(S) < 2000 ? '新公司在招人。留在本地做制造，还是进城试一份文职？' : '城里的服务公司在招人，有英语客服和后台岗位。夜班和房租，也要算进去。',
      L: { t: '留在本地工作', run(S) { S.job = 'factory'; S.flags.inWork = 'local-industry'; fx(S, { shi: 5, zhi: 4 }); return '你选了本地的岗位。收入涨得慢，家里有事时却能赶回去。'; } },
      R: { t: '进城试新岗位', run(S) { S.job = 'office'; S.urban = true; S.migrated = true; S.flags.inWork = year(S) < 2000 ? 'new-firm' : 'business-services'; fx(S, { shi: 9, zhi: -5, ye: -1 }); return year(S) < 2000 ? '你搬去城里，做订单和客户资料。下班后和人合租，饭轮流做。' : '你接受岗前培训，开始轮夜班。电话那头是另一个时区，休息日常常先用来补觉。'; } },
      ai: 0.5,
    },
    {
      id: 'in_school_meal', iso: ['IND'], era: [2002, 9999], a0: 6, a1: 11, p: 0.24, once: true, icon: 'school',
      if: (S) => S.school && S.q <= 3,
      run(S) { S.flags.inSchoolMeal = true; fx(S, { gen: 1, zhi: 3, ye: 3 }); return '学校午间有了热饭。你把餐具带去，家里少操心一顿，放学后再帮着做事。'; },
    },
    {
      id: 'in_cash2016', iso: ['IND'], era: [2016, 2016], a0: 18, a1: 70, p: 0.6, once: true, dec: true, icon: 'coins',
      if: (S) => !S.school && S.job === 'trade',
      ask: () => '十一月换钞，找零紧了。你把店里的现金和待收款重新数了一遍。',
      L: { t: '排队换，少接单', run(S) { S.flags.inPayment = 'cash'; fx(S, { shi: -4, zhi: 3 }); return '你和家人轮流去办理兑换。生意先少接一些，等手里的零钱周转开。'; } },
      R: { t: '添一种电子收款', run(S) { S.flags.inPayment = 'digital'; S.flags.phone = true; fx(S, { shi: -2, ye: 3 }); return '你核对账户，添了一种电子收款。不会用的客人还付现金，你两边都记。'; } },
      ai: 0.45,
    },
    {
      id: 'in_upi', iso: ['IND'], era: [2017, 9999], a0: 18, a1: 70, p: 0.32, once: true, dec: true, icon: 'phone',
      if: (S) => S.flags.phone && S.job === 'trade' && S.flags.inPayment !== 'upi',
      ask: () => '客人问能不能用 UPI。你在手机上看了账户和收款的操作。',
      L: { t: '先照旧收款', run(S) { S.flags.inPayment = 'cash'; fx(S, { ye: 2 }); return '你先照旧收款。有人只带手机来，你请他等一下，看看能否换个付法。'; } },
      R: { t: '开通，核实到账', run(S) { S.flags.inPayment = 'upi'; fx(S, { shi: 5, ye: 3 }); return '你办好所需手续，把收款方式摆出来。客人付完，你先看到账记录，再把东西递过去。'; } },
      ai: 0.65,
    },
    {
      id: 'in_family', iso: ['IND'], a0: 23, a1: 50, p: 0.2, once: true, dec: true, icon: 'family',
      if: (S) => S.married && S.spouse && S.spouse.alive,
      ask: (S) => year(S) < 1991 ? '婚后，家里想让你们一起住。饭和开销合在一起，也少了一点自己的地方。' : '工作地点变了。继续和家人合住，还是另外租一间？',
      L: { t: '和家人一起住', run(S) { S.flags.inHousehold = 'joint'; fx(S, { shi: 5, zhi: 6, ye: -2 }); return '你们留下来。日常开销分担着付，谁照顾老人、谁接孩子，也得常常商量。'; } },
      R: { t: '另找自己的住处', run(S) { S.flags.inHousehold = 'separate'; S.flags.moved = true; fx(S, { shi: -5, zhi: -3, ye: 6 }); return '你们另外找了住处。门一关安静了，饭、房租和照顾家里的安排也要自己排。'; } },
      ai: 0.45,
    },
    {
      id: 'in_train_home', iso: ['IND'], a0: 20, a1: 68, p: 0.12, cool: 5, icon: 'road',
      if: (S) => S.migrated,
      run(S) { fx(S, { zhi: 5, ye: 3 }); return year(S) < 2010 || !S.flags.phone ? '回乡前先去车站问票。长途列车停下来时，你提着行李在人群里找自己的车厢。' : '回乡前你先查车次和候补情况。手机充满电，包里仍留一张写着地址的纸。'; },
    },
    // ==================== 巴西 ====================
    {
      id: 'br_entrance', iso: ['BRA'], a0: 18, a1: 18, p: 1, once: true, dec: true, rank: 7, icon: 'diploma',
      if: (S) => S.school && S.edu === 2,
      ask: (S) => year(S) < 1998 ? '中学读完了。各校的 Vestibular 入学考试，报名和备考要分别安排。' : year(S) < 2010 ? 'ENEM 已经出现，申请哪所学校还得逐校看。你把入学考试资料摆在桌上。' : 'ENEM 成绩出来了。你可以通过 Sisu 申请公立高校，也在看职业课程。',
      L: { t: '先学一门技术', run(S) { S.school = false; S.job = 'trade'; S.flags.brStudy = 'technical'; fx(S, { shi: 5, ye: 2 }); return '你去学技术，开始找实习和工作。学费、车费和第一笔收入，要放在一起算。'; } },
      R: { t: '申请大学', run(S, c) { S.flags.brExam = year(S) < 2010 ? 'vestibular' : 'enem-sisu'; if (chance(clamp(c.ter / 130 + (S.q - 3) * 0.08, 0.15, 0.85))) { S.edu = 3; S.flags.brStudy = 'university'; fx(S, { shi: 11, ye: 5 }); mark(S, 'bloom'); return '你拿到录取。接下来先找住处，再核对生活费和能申请的支持。'; } S.school = false; S.job = 'trade'; fx(S, { shi: 2, ye: -5 }); return '这次没有录取。你先找工，留下备考资料，等下一轮再看。'; } },
      ai: 0.55,
    },
    {
      id: 'br_inflation', iso: ['BRA'], era: [1980, 1993], a0: 18, a1: 65, p: 0.26, once: true, dec: true, icon: 'coins',
      if: (S) => !S.school,
      ask: () => '价签换得很快。工资刚到手，家里又在算米、油和交通费。',
      L: { t: '先买耐放的日用品', run(S) { S.flags.brBudget = 'supplies'; fx(S, { shi: -3, zhi: 4 }); return '你先买了家里要用的东西。橱柜挤满了，临时要用现金时还得另想办法。'; } },
      R: { t: '留一笔应急现金', run(S) { S.flags.brBudget = 'cash'; fx(S, { shi: -4, ye: 2 }); return '你留了应急的钱。过几天再去买东西，同样的一袋又要重算一遍。'; } },
      ai: 0.5,
    },
    {
      id: 'br_real94', iso: ['BRA'], era: [1994, 1994], a0: 8, a1: 80, p: 0.8, once: true, icon: 'coins',
      run(S) { S.flags.brReal = true; fx(S, { shi: 2, ye: 5 }); return '七月换成雷亚尔。家里的账本另起一页，你开始试着按月安排支出，不再总追着新价签跑。'; },
    },
    {
      id: 'br_work', iso: ['BRA'], a0: 20, a1: 35, p: 0.25, once: true, dec: true, icon: 'office',
      if: (S) => !S.school,
      ask: (S) => year(S) < 1994 ? '一家厂招人，合同要记进劳动手册。另一边，市场有当天结账的活。' : year(S) < 2019 ? '你拿到一份登记劳动手册的工作邀约，也有人拉你合伙接零活。' : '你在看电子劳动手册里的工作记录。接下来的岗位，正式雇佣和自己接活各有一条路。',
      L: { t: '接正式岗位', run(S) { S.job = year(S) < 1994 ? 'factory' : 'office'; S.flags.brWork = 'registered'; fx(S, { shi: 6, zhi: 3 }); return year(S) < 2019 ? '你办好登记，把劳动手册收进文件夹。工资按月到账，通勤和班次也定了下来。' : '你核对电子劳动记录和合同。工资按月到账，班次和通勤要重新安排。'; } },
      R: { t: '自己接活', run(S) { S.job = 'trade'; S.flags.brWork = 'self-employed'; fx(S, { shi: 5, ye: 3, zhi: -2 }); return '你开始自己找客人。一天的收入不固定，工具、进货和歇工的日子都得自己算。'; } },
      ai: 0.45,
    },
    {
      id: 'br_family_support', iso: ['BRA'], era: [[2004, 2020], [2023, 9999]], a0: 20, a1: 55, p: 0.2, once: true, icon: 'family',
      if: (S) => S.q <= 2 && S.kids.some(k => k.alive),
      run(S) { S.flags.brSupportApplication = true; fx(S, { zhi: 4, ye: 3 }); return '你去核对 Bolsa Família 和家庭登记要求。孩子上学、健康记录和家里的材料，要一份份准备。'; },
    },
    {
      id: 'br_sus', iso: ['BRA'], era: [1990, 9999], a0: 18, a1: 85, p: 0.16, once: true, icon: 'clinic',
      if: (S) => !!S.chronic || S.age >= 55 || S.kids.some(k => k.alive),
      run(S) { S.flags.brSUS = true; fx(S, { gen: 1, zhi: 3 }); return '你到 SUS 的基层卫生服务点登记和预约。时间要排，家里把要复诊的日子记在一起。'; },
    },
    {
      id: 'br_pix', iso: ['BRA'], era: [2020, 9999], a0: 18, a1: 70, p: 0.32, once: true, dec: true, icon: 'phone',
      if: (S) => S.flags.phone && S.job === 'trade',
      ask: () => '客人问能不能用 Pix。你看了收款操作，也问了怎么确认到账。',
      L: { t: '先用原来的付法', run(S) { S.flags.brPayment = 'cash'; fx(S, { ye: 2 }); return '你先用原来的付法。找零和现金存放，仍得每天清点。'; } },
      R: { t: '开通，先核实到账', run(S) { S.flags.brPayment = 'pix'; fx(S, { shi: 5, ye: 3 }); return '你办好手续，添了 Pix 收款。钱是否到账先看记录，找零的麻烦少了一些。'; } },
      ai: 0.65,
    },
    {
      id: 'br_housing', iso: ['BRA'], a0: 25, a1: 48, p: 0.2, once: true, dec: true, icon: 'home',
      if: (S) => S.urban && !S.flags.home && S.q <= 3,
      ask: (S) => year(S) < 2009 ? '房租又到期了。继续住近一点，还是和亲友一起慢慢修自己的住处？' : '你看了住房项目的申请要求。继续租近工作地点，还是先核对资格递材料？',
      L: { t: '先租近一点', run(S) { S.flags.brHousing = 'rent'; fx(S, { shi: -4, ye: 5 }); return '你先租在近一点的地方。每天少坐一段公交，钱却得每月按时备好。'; } },
      R: { t: (S) => year(S) < 2009 ? '和亲友慢慢修' : '核对资格再申请', run(S) { if (year(S) < 2009) { S.flags.home = true; S.flags.brHousing = 'self-build'; fx(S, { shi: -6, zhi: 6 }); return '你和亲友分批买材料，慢慢修起住处。屋子还不完整，先把能住的部分收拾出来。'; } S.flags.brHousing = 'application'; S.flags.housingApplication = true; fx(S, { shi: -2, zhi: 3 }); return '你按当年的要求核对条件，准备申请。递交不等于批下来，眼下的住处和通勤仍要安排。'; } },
      ai: 0.5,
    },
    {
      id: 'br_mei', iso: ['BRA'], era: [2009, 9999], a0: 22, a1: 65, p: 0.2, once: true, dec: true, icon: 'coins',
      if: (S) => S.job === 'trade' && S.flags.brWork !== 'registered',
      ask: () => '你听说 MEI 个体经营登记。做的业务能否纳入、要办什么和交什么，都得先核对。',
      L: { t: '先把账理清', run(S) { fx(S, { shi: 2, ye: 2 }); return '你先把进货、收入和欠款分开记。登记的资料留着，等核对清楚再办。'; } },
      R: { t: '符合条件就登记', run(S) { S.flags.brWork = 'mei'; S.flags.businessRegistered = true; fx(S, { shi: 4, ye: -1 }); return '核对条件后，你办了登记。收据和每期的手续要自己管，做生意多了一本日历。'; } },
      ai: 0.55,
    },
    // ==================== 尼日利亚 ====================
    {
      id: 'ng_entrance', iso: ['NGA'], a0: 18, a1: 18, p: 1, once: true, dec: true, rank: 7, icon: 'diploma',
      if: (S) => S.school && S.edu === 2,
      ask: (S) => year(S) < 1978 ? '中学快读完了。你把各校的招生资料放在一起，也在看学徒的机会。' : year(S) < 2010 ? '要准备 JAMB 的大学入学考试了。纸上的题做了一本又一本。' : year(S) < 2015 ? 'UTME 的报名资料到了。考试方式和志愿，得看当年的安排。' : 'UTME 要在考点机考。除了复习，你还要练习用电脑作答。',
      L: { t: '先跟师傅学手艺', run(S) { S.school = false; S.job = 'trade'; S.flags.ngApprenticeAt = S.age; S.flags.ngWork = 'apprentice'; fx(S, { shi: 5, zhi: 4 }); return '你跟着市场里的师傅学修理和做买卖。先认工具、记货账，再慢慢接自己的活。'; } },
      R: { t: '申请高校', run(S, c) { S.flags.ngExam = year(S) < 1978 ? 'local' : year(S) < 2010 ? 'ume' : year(S) < 2015 ? 'utme' : 'cbt'; if (chance(clamp(c.ter / 90 + (S.q - 3) * 0.08, 0.12, 0.8))) { S.edu = 3; S.flags.ngStudy = 'higher'; fx(S, { shi: 11, ye: 5 }); mark(S, 'bloom'); return '你拿到录取。学费和住处还要安排，家里先把入学要带的东西凑在一起。'; } S.school = false; S.job = 'trade'; fx(S, { shi: 2, ye: -5 }); return '这次没有录取。你先找一份工，备考资料还留在床边。'; } },
      ai: 0.5,
    },
    {
      id: 'ng_apprentice_finish', iso: ['NGA'], a0: 21, a1: 27, p: 1, once: true, icon: 'diploma',
      if: (S) => S.flags.ngWork === 'apprentice' && S.flags.ngApprenticeAt != null && S.age >= S.flags.ngApprenticeAt + 3,
      run(S) { S.flags.ngApprenticeDone = true; S.flags.ngWork = 'market'; S.job = 'trade'; fx(S, { shi: 8, zhi: 5 }); mark(S, 'bloom'); return '师傅开始把活交给你独立做。你攒工具、认供货的人，试着接自己的第一批客人。'; },
    },
    {
      id: 'ng_trade_early', iso: ['NGA'], era: [1970, 1985], a0: 18, a1: 35, p: 0.28, once: true, dec: true, icon: 'factory',
      if: (S) => !S.school,
      ask: () => '城里的仓储和工程在招人。亲戚也愿意带你在市场学着进货。',
      L: { t: '去仓储和工地', run(S) { S.job = 'factory'; S.urban = true; S.flags.ngWork = 'contract'; fx(S, { shi: 6, zhi: -3 }); return '你去了城里，按班次干活。工钱要记清，空下来就写信给家里。'; } },
      R: { t: '跟着做小买卖', run(S) { S.job = 'trade'; S.flags.ngWork = 'market'; fx(S, { shi: 4, zhi: 5 }); return '你跟着亲戚认批发市场。东西一件件卖，账记在本子上，谁能赊账要慢慢摸清。'; } },
      ai: 0.5,
    },
    {
      id: 'ng_sap', iso: ['NGA'], era: [1986, 1993], a0: 18, a1: 60, p: 0.3, once: true, dec: true, icon: 'coins',
      if: (S) => !S.school && (S.job === 'factory' || S.job === 'trade'),
      ask: () => '调整政策后，进口零件和补货的账难算了。继续修旧的，还是学找本地替代？',
      L: { t: '先把旧设备修好', run(S) { S.flags.ngSupply = 'repair'; fx(S, { shi: -3, zhi: 3 }); return '你把能修的先修好。进货少了一些，熟客还会来，欠款要一笔笔追。'; } },
      R: { t: '学找本地替代', run(S) { S.flags.ngSupply = 'local'; S.job = 'trade'; fx(S, { shi: 4, ye: -2 }); return '你换着找供货的人，试过不合用的，也慢慢摸出一套办法。'; } },
      ai: 0.5,
    },
    {
      id: 'ng_gsm', iso: ['NGA'], era: [2001, 2012], a0: 16, a1: 55, p: 0.3, once: true, dec: true, icon: 'phone',
      if: (S) => !S.school && (S.job === 'trade' || !S.flags.phone),
      ask: () => 'GSM 服务铺开，街边有了充值卡和通话生意。你也在算要不要添一部手机。',
      L: { t: '先用共享话机', run(S) { S.flags.ngPhone = 'shared'; fx(S, { shi: 2, zhi: 3 }); return '你先用附近的共享话机。要联系供货的人，就把号码记在小本子上带去。'; } },
      R: { t: '添手机，试做生意', run(S) { S.flags.phone = true; S.flags.ngPhone = 'gsm'; S.job = 'trade'; fx(S, { shi: 5, ye: 3 }); return '你办好入网，试着联系客户、卖充值卡。电量和零钱，都成了每天要检查的事。'; } },
      ai: 0.6,
    },
    {
      id: 'ng_screen', iso: ['NGA'], era: [1993, 9999], a0: 20, a1: 40, p: 0.2, once: true, dec: true, icon: 'office',
      if: (S) => S.urban && !S.school,
      ask: (S) => year(S) < 2005 ? '有人在做本地电影的录像带，缺跑腿和管道具的人。' : year(S) < 2015 ? '做本地电影和影碟发行的朋友问你，要不要跟着接一部片子。' : '做本地影视的朋友在找剪辑和线上发行的帮手。你想试一试。',
      L: { t: '先留在原来的活', run(S) { fx(S, { shi: 3, zhi: 2 }); return '你先留在原来的工作。片子出来后，你和朋友一起看，问了拍摄时的事。'; } },
      R: { t: '跟组学着做', run(S) { S.job = 'trade'; S.flags.ngMedia = year(S) < 2005 ? 'tape' : year(S) < 2015 ? 'disc' : 'online'; S.flags.ngWork = 'film'; fx(S, { shi: 5, ye: 7, zhi: -2 }); return year(S) < 2015 ? '你从搬器材、管道具做起。活不固定，第一次在片尾看到自己的名字，倒回去又看了一遍。' : '你开始学剪辑、交字幕和整理上线材料。项目不固定，文件却总在硬盘里一版版增加。'; } },
      ai: 0.45,
    },
    {
      id: 'ng_agentbank', iso: ['NGA'], era: [2013, 9999], a0: 18, a1: 75, p: 0.3, once: true, dec: true, icon: 'coins',
      if: (S) => !S.school,
      ask: () => '附近有了代理银行服务点。你先问清手续和费用，再决定还要不要跑银行。',
      L: { t: '仍去熟悉的网点', run(S) { S.flags.ngBank = 'branch'; fx(S, { shi: -2, ye: 2 }); return '你还去熟悉的网点。路费和排队要留时间，办完把凭据带回家。'; } },
      R: { t: '核对后试代理点', run(S) { S.flags.ngBank = 'agent'; fx(S, { shi: 4, ye: 3 }); return '你核对服务和费用，在附近办了一笔。先确认到账、收好凭据，再安排下一件事。'; } },
      ai: 0.6,
    },
    {
      id: 'ng_power', iso: ['NGA'], a0: 20, a1: 65, p: 0.2, once: true, dec: true, icon: 'home',
      if: (S) => S.urban && S.job === 'trade',
      ask: () => '做生意要用电。发电机、燃油和维修的账摆在一起，邻店问要不要分担。',
      L: { t: '和邻店合用', run(S) { S.flags.ngPower = 'shared'; fx(S, { shi: -3, zhi: 5 }); return '你们分担设备和燃油。哪天谁先用，要提前讲好，偶尔也为这个争几句。'; } },
      R: { t: '安排自己的设备', run(S) { S.flags.ngPower = 'own'; fx(S, { shi: -7, ye: 5 }); return '你备了自己的设备。开门时间更好安排，燃油和修理费也都得自己留出来。'; } },
      ai: 0.5,
    },
    {
      id: 'ng_family', iso: ['NGA'], a0: 23, a1: 48, p: 0.2, once: true, dec: true, icon: 'family',
      if: (S) => S.married && S.spouse && S.spouse.alive,
      ask: () => '两边亲友在商量婚后聚会。办小一点，还是多请一些远道来的家人？',
      L: { t: '办小一点', run(S) { S.flags.ngFamilyBudget = 'small'; fx(S, { shi: 3, zhi: 2 }); return '你们把人数收了收。饭还是一起做，省下的钱留给往后的日子。'; } },
      R: { t: '多请一些家人', run(S) { S.flags.ngFamilyBudget = 'extended'; fx(S, { shi: -5, zhi: 8, ye: 3 }); return '你们多请了一些亲友。大家带来食物、帮着张罗，散场后还留下来收桌椅。'; } },
      ai: 0.5,
    },
    {
      id: 'ng_olympics96', iso: ['NGA'], era: [1996, 1996], a0: 6, a1: 80, p: 0.7, once: true, icon: 'field',
      run(S) { fx(S, { ye: 7, zhi: 5 }); return '亚特兰大奥运男足夺冠的那晚，附近的人聚在一起看消息。你在回家路上，还听见有人在喊。'; },
    },
    {
      id: 'ng_mentor', iso: ['NGA'], a0: 45, a1: 72, p: 0.2, once: true, icon: 'elder',
      if: (S) => S.flags.ngApprenticeDone || S.flags.ngWork === 'film' || S.flags.ngWork === 'market',
      run(S) { S.flags.ngMentor = true; fx(S, { shi: -2, zhi: 6, ye: 4 }); return S.flags.ngWork === 'film' ? '一个年轻人来跟你学拍片。你让他先把素材整理好，再讲自己做错过的几次。' : '一个年轻人来跟你学做生意。你把旧账本拿出来，先教他认供货的人和记清每一笔账。'; },
    },
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
