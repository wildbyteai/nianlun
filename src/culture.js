/* 年轮 · 文化圈层（原创）
 *
 * 事件库分两层：
 *   1. 通用层（events.js）—— 出生、疾病、婚育、衰老、灾变、生死，这些在哪儿都成立。
 *   2. 圈层层（events_world.js）—— 只有落在某个文化圈才可能发生的事。
 *
 * 引擎按 S.cur（当前所在国）取圈，事件用 cult / reg / iso 三个字段声明适用范围。
 * 文案本身按圈写死在 events_world.js 里，这里只保留「通用层文案的兜底替换表」，
 * 把少数按中国乡土写成、但允许跨圈出现的句子换成中性说法。
 *
 * 九个圈：
 *   cn   华语圈（大陆、港澳、台湾、新马华人）
 *   jpkr 日本、韩国、朝鲜
 *   west 北美、西欧、南欧、大洋洲
 *   eur  东欧、俄罗斯、高加索、中亚
 *   lat  拉丁美洲与加勒比
 *   sas  南亚
 *   sea  东南亚与太平洋岛国
 *   mena 中东北非
 *   ssa  撒哈拉以南非洲
 */
(function (root) {
  'use strict';

  const set = (s) => new Set(s.trim().split(/\s+/));

  const CULT = {
    cn: set('CHN HKG MAC TWN SGP'),
    jpkr: set('JPN KOR PRK'),
    west: set(`USA CAN GBR IRL AUS NZL FRA DEU ITA ESP PRT NLD BEL LUX CHE AUT
      DNK SWE NOR FIN ISL GRC MLT CYP`),
    eur: set(`RUS UKR BLR MDA POL CZE SVK HUN ROU BGR SRB HRV BIH MNE MKD ALB SVN
      EST LVA LTU GEO ARM AZE KAZ UZB KGZ TJK TKM MNG`),
    lat: set(`ARG ATG BHS BLZ BOL BRA BRB CHL COL CRI CUB DOM ECU GRD GTM GUY HND
      HTI JAM LCA MEX NIC PAN PER PRI PRY SLV SUR TTO URY VCT VEN VIR ABW`),
    sas: set('IND PAK BGD LKA NPL BTN MDV AFG'),
    sea: set(`VNM THA IDN PHL MYS MMR KHM LAO TLS BRN PNG FJI SLB VUT WSM TON KIR
      FSM NCL PYF GUM`),
    mena: set(`SAU ARE QAT KWT BHR OMN YEM JOR LBN SYR IRQ IRN ISR PSE EGY LBY TUN
      DZA MAR MRT DJI TUR`),
    ssa: set(`NGA ETH KEN ZAF GHA TZA UGA COD SDN SSD SEN CIV CMR ZWE MOZ MDG AGO
      ZMB MWI MLI BFA NER TCD SOM RWA BDI BEN TGO SLE LBR GIN GAB NAM BWA LSO SWZ
      CAF COG COM CPV ERI GMB GNB GNQ MUS STP SYC`),
  };

  // 圈层中文名，给界面与校验脚本用
  const ZH = {
    cn: '华语圈', jpkr: '日韩', west: '欧美', eur: '东欧中亚', lat: '拉美',
    sas: '南亚', sea: '东南亚', mena: '中东北非', ssa: '非洲南部',
  };

  const IDX = {};
  for (const k in CULT) for (const iso of CULT[k]) IDX[iso] = k;

  // 没被显式列入的国家，按 WDI 地区兜底
  const REG_FALLBACK = {
    NAC: 'west', ECS: 'west', LCN: 'lat', SAS: 'sas', SSF: 'ssa',
    MEA: 'mena', EAS: 'sea',
  };

  function cultureOf(c) {
    if (!c) return 'cn';
    return IDX[c.id] || REG_FALLBACK[c.reg] || 'wna';
  }

  // ===== 通用层兜底替换：只处理仍会跨圈出现的中国乡土句子 =====
  // 圈层事件不用这里的表，它们本来就是按当地写的。
  const NEUTRAL = [
    ['家里借了辆摩托，把你送到镇上', '家里连夜把你送去了医院'],
    ['最近的诊所在二十里外，家里只能守着你。', '最近的诊所要走很远，家里只能先守着你。'],
    ['卫生院太远，他们用板车把你推到了镇上', '最近的医院太远，他们找车把你送了过去'],
    ['家里交不起学费。你开始在街上帮大人看摊。', '家里供不起学费。你开始帮大人干活。'],
    ['最近的学校在山那边。你开始帮家里放羊。', '最近的学校很远。你开始帮家里干活。'],
    ['家里把奖状贴在了墙上最显眼的地方', '家里把成绩单好好收着'],
    ['去学校的路，要走一个钟头', '去学校要走很久'],
    ['饭桌上又多了一双筷子', '餐桌又挤了一点'],
    ['家里的粮食不够吃', '家里的吃食总不够'],
    ['挣的钱刚够买一点米', '挣的钱刚够糊口'],
    ['天不亮就下地', '天不亮就出门干活'],
    ['在砖窑搬砖', '在窑厂搬货'],
    ['在集市上帮人卸货', '在市场帮人卸货'],
    ['给人家放牛', '给人家看牲口'],
    ['分过同一根冰棍', '分过同一包零食'],
    ['在河里摸过鱼', '在河边耗到天黑'],
    ['把书包挂在了墙上', '把书包收了起来'],
    ['水泥路一直通到了村口', '新路一直通到了路口'],
    ['爸妈在村口放了一挂鞭', '家里好好庆祝了一下'],
    ['那条街要拆了，你的摊子没了地方', '那条街改造，你的摊子没了地方'],
    ['院子里的鸡', '院子里的猫'],
    ['那时候，药还没送到镇上', '那时候，药还没送到'],
    ['在街口摆了个摊', '在街边做起了小买卖'],
    ['跑起了摩的', '跑起了送货'],
    ['你舍不得撕膜', '你舍不得多用'],
    ['在回家的长途车上', '在回家的长途巴士上'],
    ['在工地上搬砖', '在工地做小工'],
    ['在饭馆后厨帮工', '在餐馆后厨帮工'],
    ['翻修了老房子，盖成了两层', '把旧房子翻修了一遍'],
    ['镇上的卫生院', '当地的小医院'],
    ['村里的老人', '一位接生的人'],
    ['隔壁的大婶', '隔壁的邻居'],
    ['集资修路', '凑钱修路'], ['每家出一笔', '每户出一笔'],
    ['粮仓装不下了', '收成好得吃不完'],
    ['你接过了那把锄头', '你接过了那套农具'],
    ['周末四个补习班', '周末排满了课'],
    ['逢年过节', '每到过节'],
    ['厂子倒闭了', '厂子关了'],
    ['奖状', '成绩单'],
    ['卫生院', '诊所'], ['板车', '车'], ['摩的', '送货'],
    ['服装厂', '制衣作坊'], ['电子厂', '装配厂'], ['砖厂', '建材厂'],
    ['村口', '路口'], ['全村', '街坊四邻'], ['街坊', '邻里'],
    ['你们县', '这一带'], ['县城', '镇上'], ['二十里', '很远'],
    ['筷子', '餐具'], ['锄头', '农具'],
    ['过年', '过节'], ['村里', '这一带'], ['村子', '这一带'],
  ];

  // 城市：不管在哪个国家，城里不该出现田埂和村口
  const URBAN = [
    ['村里', '街区'], ['镇上', '城里'], ['路口', '街角'], ['田埂', '街巷'],
    ['下地', '出门'], ['放羊', '帮工'], ['院子', '阳台'], ['邻里', '邻居'],
  ];
  const CITY_CN = [
    ['村里', '小区'], ['村口', '小区门口'], ['镇上', '社区'], ['田埂', '巷子'],
    ['下地', '出门'], ['放羊', '帮工'],
  ];

  // 年代：出生年份不同，同一件事不该出现还没发明的东西
  const OLD_TECH = [
    ['第一部手机', '第一部传呼机'],
    ['在手机上看见了世界另一头的人怎么过日子', '在电视上看见了世界另一头的人怎么过日子'],
    ['手机上有人说，投一点钱', '有人上门说，投一点钱'],
    ['第一次在手机上记笔记', '第一次重新拿起笔记账'],
    ['教你用手机视频', '教你打长途电话'],
    ['你舍不得撕膜', '你舍不得多用'],
    ['屏幕裂了一道', '外壳磨花了'],
    ['在手机上', '在电话里'],
    ['手机', '电话'],
  ];
  const OLD_MEDIA = [
    ['把电视开着', '把收音机开着'],
    ['接着看电视', '接着听收音机'],
    ['在电视上', '在收音机里'],
    ['电视', '收音机'],
  ];

  for (const t of [NEUTRAL, URBAN, CITY_CN, OLD_TECH, OLD_MEDIA]) t.sort((a, b) => b[0].length - a[0].length);

  function apply(text, table) {
    let out = text;
    for (const [from, to] of table) if (out.indexOf(from) >= 0) out = out.split(from).join(to);
    return out;
  }

  /* 通用层文案出口。圈层文案（events_world.js / events_era.js）不改词，直接出。
   * 判断依据：event 上带 cult 字段即视为圈层文案。 */
  function localize(text, S, c, ev) {
    if (!text || typeof text !== 'string') return text;
    let out = text;
    const y = S && S.year0 != null ? S.year0 + (S.age || 0) : null;
    if (!ev || !ev.cult) {
      if (y != null && y < 1997) out = apply(out, OLD_TECH);
      if (y != null && y < 1978) out = apply(out, OLD_MEDIA);
      const loc = cultureOf(c);
      if (!(loc === 'cn' && S && !S.urban)) {
        if (loc === 'cn') out = apply(out, CITY_CN);
        else out = apply(out, NEUTRAL);
      }
    }
    if (S && S.urban) out = apply(out, URBAN);
    return out;
  }

  root.NL_CUL = { cultureOf, localize, CULT, ZH, IDX, REG_FALLBACK };
})(typeof globalThis !== 'undefined' ? globalThis : this);
