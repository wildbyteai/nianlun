/* 年轮的呈现：原始记录与选项保持原样，只安排画面、信息层级和停顿。 */
(function(root){
  'use strict';
  const compact=(text,n=36)=>{
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(clean.length<=n)return clean;
    const first=clean.match(/^.*?[。！？]/)?.[0];
    if(first&&first.length<=n)return first;
    return clean.slice(0,n-1).replace(/[，、；：\s]+$/,'')+'…';
  };
  const topics=[
    [/避难|难民|逃离|逃难/,'refugee','离开熟悉的地方'],
    [/战争|战乱|冲突|征召|军队|服役/,'war','生活的另一面'],
    [/地震|震灾/,'quake','地面晃动的那天'],
    [/洪水|海啸|淹没/,'flood','水涨了上来'],
    [/台风|飓风|风暴/,'storm','风雨中的一年'],
    [/干旱|饥荒|缺粮/,'drought','难熬的年景'],
    [/去世|离世|过世|葬礼|丧命|失去(?:了)?(?:父亲|母亲|亲人|家人|孩子|伴侣)/,'candle','有些人，留在这一圈'],
    [/生下|出生|怀孕|婴儿|育儿/,'cradle','家里多了一个人'],
    [/结婚|婚礼|恋爱|伴侣|离婚|爱上/,'love','两个人的日子'],
    [/发烧|病倒|肺炎|腹泻|住院|癌症/,'fever','身体需要你慢下来'],
    [/医院|医疗|检查|诊断|疫苗|健康/,'clinic','照料身体'],
    [/疟疾|蚊子/,'mosquito','雨季里的小心事'],
    [/高中|中学|小学|学校|考试|学费|升学|备考/,'school','读书的路'],
    [/大学|毕业|科系|文凭/,'diploma','路口到了'],
    [/兑换|银行门口|银行.*排队/,'bank','要先去银行一趟'],
    [/现金|钞票|银行|汇率|货币|积蓄|物价|债务|经济|收入/,'coins','手里的钱与往后的日子'],
    [/手机|上网|电脑|软件|支付|AI|通信/,'phone','新的东西，新的办法'],
    [/工厂|车间|机械|生产线/,'factory','开工的日子'],
    [/工作|求职|就业|裁员|公司|生意|创业/,'office','谋生的路'],
    [/农田|种子|庄稼|收成|农活/,'field','靠土地过日子'],
    [/搬家|房子|住房|住处|租房/,'home','有一个落脚的地方'],
    [/远行|出国|移居|留学|返乡/,'boat','到远方去'],
    [/家人|父亲|母亲|父母|亲友|团聚/,'family','身边的人'],
    [/退休|年老|孙子|孙女/,'elder','慢下来的时光'],
    [/抽烟|吸烟|香烟/,'smoke','手上的习惯'],
    [/夜晚|睡眠|休息|安静/,'moon','平常日子的光'],
  ];
  function topic(text){for(const [rx,art,title]of topics)if(rx.test(text))return {art,title};return {art:'road',title:'日子往前走'};}
  const decisionArt={
    school:'school',school2:'school',school3:'school',hsch:'school',noschool:'school',college:'diploma',major:'book',afterUni:'diploma',phd:'book',adultedu:'book',retake:'school',
    temper:'guest',hobby:'road',reflect:'moon',job:'office',jobchange:'office',biz:'factory',retire:'elder',
    war:'war',enlist:'war',service:'war',disaster:'storm',abroad:'boat',homecoming:'home',city:'home',
    illness:'clinic',diag:'clinic',hivtx:'clinic',care:'elder',smoke:'smoke',drink:'home',
    kids:'cradle',kidq:'child',babycare:'cradle',kidschool:'school',kiduni:'diploma',kidcare:'child',
    partner:'love',wedtalk:'love',divtalk:'love',faithq:'candle',faithopen:'candle',buy:'coins',invest:'coins',loan:'coins',
  };
  const edits={
    temper:{title:'家里来了客人',prompt:'你会先做什么？',labels:{cur:'仔细看看新东西',act:'绕着客人跑来跑去',warm:'把手里的东西递过去',grit:'坚持自己拆开包裹'}},
    hobby:{title:'找到一件喜欢的事',prompt:'有空的时候，你想做什么？'},
    school2:{title:'小学读完了',prompt:'继续上学，还是先帮家里？'},
    school3:{title:'下一段路，怎么走？',labels:{go:'继续读高中',voc_tech:'学机械、电机',voc_office:'学商业、信息技术',work:'开始工作'}},
    college:{title:'高中毕业，下一站',prompt:'继续求学，还是走进社会？',labels:{uni:'参加大学入学考试',job:'直接就业',abroad:'出国留学'}},
    major:{title:'选一门想学的专业',prompt:'这会影响你的第一份工作。'},
    job:{title:'第一份工作',prompt:'看看眼前的机会，再作决定。'},
    jobchange:{title:'要换一条谋生的路吗？'},
  };
  const historyArt={study:'school',cash:'bank',digital:'phone',technology:'phone',health:'clinic',livelihood:'field',career:'office','living-study':'book','living-water':'home'};
  const historyTitle={study:'考试变了，准备也要变',cash:'银行门口排起长队',digital:'街边多了一种新办法',technology:'学点新的，试着用起来',health:'去看看能用的医疗服务',livelihood:'试试新的生产办法',career:'新的谋生机会'};
  function choiceView(choice,d){
    let label=edits[d.id]?.labels?.[choice.key]||choice.label;
    if(d.id==='reflect')label=choice.key==='write'?'写下来':'留在心里';
    if(d.id==='job')label=label.replace(/[（(].*?[）)]/g,'').replace(/·医事检验师/,'·检验师');
    let hint=choice.sub||'';
    const pay=hint.match(/年收入\s*US\$([\d,]+(?:\.\d+)?)\s*PPP/);
    if(pay){const value=+pay[1].replace(/,/g,'');hint='约'+(value>=10000?(value/10000).toFixed(1)+'万':Math.round(value).toLocaleString('zh-CN'))+' 国际元／年';}
    else if(hint.length>22){const chance=hint.match(/录取机会[：:]?\s*([^·。]+)/);hint=chance?'录取机会'+chance[1].trim():compact(hint.split(/[·；。]/)[0],20);}
    return {key:choice.key,label,hint,originalLabel:choice.label,originalHint:choice.sub||'',disabled:choice.disabled};
  }
  function decision(d){
    const edit=edits[d.id]||{},h=d.history;
    const art=h?(historyArt[h.kind]||topic(d.body).art):(decisionArt[d.id]||topic(d.title+' '+d.body).art);
    let title=edit.title||d.title,prompt=edit.prompt||compact(d.body,34);
    if(d.id==='reflect'){title=d.title.replace('暂停片刻 · ','长到');prompt='把这一刻，留在年轮里。';}
    if(h){title=historyTitle[h.kind]||d.title;prompt=compact(h.headline,38);}
    if(h?.kind==='living-water'&&!h.access)return {art:'water',title,prompt,choices:d.choices.map(c=>choiceView(c,d)),input:d.input};
    return {art,title,prompt,choices:d.choices.map(c=>choiceView(c,d)),input:d.input};
  }
  function event(entry){
    if(entry.sourceKind==='death')return {art:'candle',title:'这一圈，停在这里',summary:compact(entry.text,49)};
    const text=entry.text||'',t=topic(text);
    const distant=entry.history&&/传来|消息|新闻|听说/.test(text);
    return {art:distant?'book':t.art,title:distant?'远处的消息':t.title,summary:compact(text,49)};
  }
  function foreground(entry,count){
    if(entry.sourceKind==='dec')return false;
    if(entry.history||entry.side||['big','warm','loss','bad','death'].includes(entry.sourceKind))return true;
    if(['note','comp','ms'].includes(entry.sourceKind))return false;
    return count<2;
  }
  root.NL_VIEW={decision,event,foreground,compact};
})(globalThis);
