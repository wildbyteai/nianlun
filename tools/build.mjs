// 打包：把 assets/ 转成 src/gen/art.js，再把 CSS、JS 全部内联成一个离线可玩的 HTML。用法：node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
const ROOT = resolve(dirname(import.meta.filename), '..');
const A = resolve(ROOT, 'assets');
const clean = (s) => s.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim();
const read = (p) => clean(readFileSync(p, 'utf8'));
const dir = (d) => Object.fromEntries(readdirSync(resolve(A, d)).filter((f) => f.endsWith('.svg')).map((f) => [basename(f, '.svg'), read(resolve(A, d, f))]));
const art = { vig: dir('vignettes'), land: dir('lands'), icon: dir('icons'), seed: read(resolve(A, 'seed.svg')), logo: read(resolve(A, 'logo.svg')), stampLand: read(resolve(A, 'stamp-land.svg')), stampEnd: read(resolve(A, 'stamp-end.svg')) };
mkdirSync(resolve(ROOT, 'src/gen'), { recursive: true });
writeFileSync(resolve(ROOT, 'src/gen/art.js'), '/* 由 tools/build.mjs 从 assets/ 生成 */\nwindow.NL_ART=' + JSON.stringify(art) + ';\n');
let html = readFileSync(resolve(ROOT, 'src/index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + readFileSync(resolve(ROOT, 'src/style.css'), 'utf8') + '</style>');
html = html.replace(/<script src="([^"]+)"><\/script>\n?/g, (m, src) => '<script>\n' + readFileSync(resolve(ROOT, 'src', src), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>\n');
mkdirSync(resolve(ROOT, 'dist'), { recursive: true });
writeFileSync(resolve(ROOT, 'dist/nianlun.html'), html);
console.log('dist/nianlun.html', Buffer.byteLength(html), 'bytes;', 'vignettes', Object.keys(art.vig).length, 'lands', Object.keys(art.land).length);
