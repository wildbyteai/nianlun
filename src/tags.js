/* 年轮 · 通用事件的文化圈归属（原创）
 *
 * events.js 里的 126 条是按「发展水平」写成的一套人生骨架。同一句「你在砖窑搬砖」，
 * 落在美国说不通，落在孟加拉却成立。这里不改事件代码，只声明每条事件在哪些圈里成立；
 * 引擎在 register 之后统一打上 cult 字段，planYear 时会跳过不在圈内的事件。
 *
 * 判断标准：这个场景在当地的社会条件下会不会真的出现。
 * 不写 '*' 的事件只在列出的圈里出现；写 '*' 的是生老病死、天灾、普世情感，在哪儿都一样。
 */
(function (root) {
  'use strict';

  const T = {
    // ---------- 生老病死、天灾、普世情感：全球 ----------
    birth: '*', mother_birth: '*', first_step: '*', sick_baby: '*', vaccine: '*',
    measles: '*', malaria: '*', hunger: '*', sibling: '*', best_friend: '*',
    bully: '*', crush: '*', dream: '*', hobby: '*', meet: '*', marry: '*',
    kids_q: '*', kid_born: '*', kid_die: '*', mother_die: '*', father_die: '*',
    spouse_die: '*', grandchild: '*', forget: '*', lonely: '*', quit_smoke: '*',
    chronic: '*', med_bill: '*', hiv: '*', tb: '*', road_hit: '*', robbed: '*',
    war: '*', war_child: '*', refugee_life: '*', quake: '*', storm: '*',
    heat: '*', drought: '*', flood: '*', parents_care: '*', kids_leave: '*',
    care_home: '*', will: '*', plant: '*', memoir: '*', last_visit: '*',
    adopt_stray: '*', marriage_cold: '*', old_friend: '*', checkup: '*',
    blue: '*', scam: '*', pet: '*', lottery: '*', travel: '*', smoke: '*',
    school_start: '*', secondary: '*', secondary_auto: '*', university: '*',
    graduate: '*', start_work: '*', first_pay: '*', promotion: '*', lend: '*',
    house: '*', partner_shop: '*', tuition: '*', kid_rebel: '*', mid_job: '*',
    parent_nurse: '*', to_kids: '*', smartphone_old: '*', no_retire: '*',
    help_fire: '*', reunion: '*', sunshine: '*', retire: '*', top_student: '*',
    phone: '*', world_screen: '*', abroad: '*', power: '*', water: '*',

    // ---------- 只在发展中社会成立 ----------
    child_work: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    to_city: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    remit: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    go_home: ['cn', 'sea', 'sas', 'ssa'],
    unpaid: ['cn', 'sas', 'sea', 'ssa', 'lat'],
    site_job: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    mine: ['cn', 'sas', 'ssa', 'lat', 'mena'],
    farm_bad: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena', 'eur'],
    farm_good: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena', 'eur'],
    build_road: ['cn', 'sas', 'sea', 'ssa'],
    recruit: ['ssa', 'mena', 'sas', 'sea'],
    gang: ['cn', 'west', 'lat', 'sea', 'ssa', 'mena'],

    // ---------- 农村童年场景 ----------
    lamp: ['cn', 'sas', 'sea', 'ssa'],
    far_school: ['cn', 'sas', 'sea', 'ssa'],
    eraser: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    old_book: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    teacher: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    lunch: ['cn', 'sas', 'sea', 'ssa', 'lat'],
    blocked: ['cn', 'sas', 'sea', 'ssa', 'lat', 'mena'],
    parents_fight: '*', found_money: '*', stray_dog: '*', fever_money: ['cn', 'sas', 'sea', 'ssa'],
    move_friend: '*', baby_move: '*', baby_name: '*',
    river: ['cn', 'sas', 'sea', 'ssa', 'lat'],
    girl_out: ['cn', 'sas', 'sea', 'mena', 'ssa'],

    // ---------- 婚育、教育、职场：按社会形态 ----------
    arranged: ['cn', 'sas', 'mena', 'sea', 'ssa'],
    only_one: ['cn'],
    cram: ['cn', 'jpkr', 'sas', 'sea'],
    exam_gov: ['cn', 'jpkr', 'sas'],
    layoff: ['cn', 'west', 'eur', 'jpkr', 'lat', 'sas', 'sea'],
    overtime: ['cn', 'jpkr', 'west', 'eur', 'sas', 'sea', 'lat'],
    machine: ['cn', 'west', 'eur', 'jpkr', 'lat'],
    note: ['cn', 'jpkr', 'sas', 'sea'],
    talent: ['cn', 'sas', 'ssa', 'sea', 'lat'],
    lonely_class: ['cn', 'jpkr', 'sas'],
    first_love_end: '*',
    cheat: '*',
    mom_sick: '*',
  };

  // 没列出的事件默认全球可见（新增事件自己带 cult 字段，不走这张表）
  function apply(list) {
    for (const e of list) {
      if (e.cult) continue;
      const t = T[e.id];
      if (t === '*') continue;
      if (t) e.cult = t;
    }
    return list;
  }

  root.NL_TAGS = { table: T, apply };
  // 本文件在 events.js 之后加载，直接给已注册的通用事件打标；
  // 之后加载的圈层 / 年代事件自带 cult，apply 会跳过。
  if (root.NL && root.NL.events) apply(root.NL.events);
})(typeof globalThis !== 'undefined' ? globalThis : this);
