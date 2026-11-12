// 统一加载：把 Node 侧需要的所有脚本按 index.html 的顺序跑进同一个 vm 上下文。
// 校验脚本都从这里取，避免各写一份文件列表、漏掉新增的事件库。
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';

export const ROOT = resolve(dirname(import.meta.filename), '..');

// 与 src/index.html 的 <script> 顺序保持一致（有副作用的按序执行）
export const FILES = [
  'src/gen/data.js', 'src/gen/cal.js', 'src/engine.js', 'src/gen/profiles.js',
  'src/profiles.js', 'src/culture.js', 'src/events.js', 'src/tags.js',
  'src/events_world.js', 'src/events_world2.js', 'src/events_world3.js', 'src/events_era.js',
  'src/events_country.js',
  'src/events_country2.js',
  'src/events_profiles.js',
  'src/gen/history.js', 'src/gen/housing.js', 'src/era.js', 'src/timeline.js', 'src/living.js',
  'src/gen/source-history.js', 'src/gen/source-native.js', 'src/history_impacts.js', 'src/source_bridge.js',
  'src/presentation.js',
];

export function load(opts) {
  const o = opts || {};
  const ctx = {
    window: {}, console, Math, Date, Float64Array, Uint32Array, JSON,
    Object, Array, String, Number, Set, Map, parseFloat, isFinite,
  };
  ctx.globalThis = ctx;
  ctx.NL_EVENT_MODE=o.eventMode || 'source';
  vm.createContext(ctx);
  const legacyExtra=new Set(['src/gen/source-history.js','src/gen/source-native.js','src/history_impacts.js','src/source_bridge.js']);
  const files = o.files || (o.eventMode==='legacy'?FILES.filter(f=>!legacyExtra.has(f)):FILES);
  for (const f of files) vm.runInContext(readFileSync(resolve(ROOT, f), 'utf8'), ctx, { filename: f });
  if (o.data !== false) ctx.NL.init(ctx.window.NL_DATA);
  return ctx;
}

export function ok(name, cond, note) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (note ? '  ' + note : ''));
  return cond ? 1 : 0;
}
