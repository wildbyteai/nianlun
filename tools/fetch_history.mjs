// 下载 WDI 逐年时间序列，供「按出生地点与年份走时间线」使用。
// 用法：node tools/fetch_history.mjs（已有文件跳过，--force 重下）
// 与 fetch_data.mjs 的区别：那边用 mrnev=1 取最新横截面，这边取 1960 起每一年。
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(import.meta.filename), '..');
const TS = resolve(ROOT, 'data/worldbank/ts');
mkdirSync(TS, { recursive: true });
const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 逐段取，单次响应约 1.5 MB，避免一次拉 60 年超时
const RANGES = [[1960, 1980], [1981, 2000], [2001, 2025]];
const INDICATORS = {
  le: 'SP.DYN.LE00.IN', im: 'SP.DYN.IMRT.IN', u5: 'SH.DYN.MORT',
  ppp: 'NY.GDP.PCAP.PP.CD', urb: 'SP.URB.TOTL.IN.ZS',
  ele: 'EG.ELC.ACCS.ZS', net: 'IT.NET.USER.ZS',
  pop: 'SP.POP.TOTL', cbr: 'SP.DYN.CBRT.IN',
};

const sources = [];
async function grab(url, file, label) {
  if (!force && existsSync(file)) {
    const buf = readFileSync(file);
    sources.push({ label, url, file: file.replace(ROOT + '/', ''), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), reused: true });
    return;
  }
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200) throw new Error('响应太短');
      writeFileSync(file, buf);
      sources.push({ label, url, file: file.replace(ROOT + '/', ''), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), fetched_at: new Date().toISOString() });
      console.log('ok', label, buf.length);
      await sleep(200);
      return;
    } catch (e) {
      console.log('retry', label, e.message);
      await sleep(1200 * (i + 1));
    }
  }
  throw new Error('下载失败：' + label);
}

const api = 'https://api.worldbank.org/v2';
for (const [key, id] of Object.entries(INDICATORS)) {
  for (const [a, b] of RANGES) {
    const url = `${api}/country/all/indicator/${id}?format=json&date=${a}:${b}&per_page=20000`;
    await grab(url, resolve(TS, `${id}.${a}-${b}.json`), `${key}:${a}-${b}`);
  }
}
writeFileSync(resolve(ROOT, 'data/SOURCES_HISTORY.json'), JSON.stringify({ generated_at: new Date().toISOString(), indicators: INDICATORS, ranges: RANGES, sources }, null, 1));
console.log('完成', sources.length, '个文件');
