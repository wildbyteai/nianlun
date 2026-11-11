/* 把内嵌的 SVG 字符串画到 Canvas 上（不经过 <img>，导出图片时不会污染画布）。
 * 支持 g / path / circle / ellipse / rect / polygon / polyline / line，
 * 以及 transform（matrix / translate / scale / rotate）、fill / stroke / opacity 等常用属性。
 */
(function (root) {
  'use strict';
  const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  function parseTransform(str, m) {
    if (!str) return m;
    const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
    let r;
    while ((r = re.exec(str))) {
      const v = (r[2].match(NUM) || []).map(Number);
      let n;
      if (r[1] === 'matrix') n = new DOMMatrix(v.slice(0, 6));
      else if (r[1] === 'translate') n = new DOMMatrix().translate(v[0] || 0, v[1] || 0);
      else if (r[1] === 'scale') n = new DOMMatrix().scale(v[0], v.length > 1 ? v[1] : v[0]);
      else if (r[1] === 'rotate') n = v.length > 2 ? new DOMMatrix().translate(v[1], v[2]).rotate(v[0]).translate(-v[1], -v[2]) : new DOMMatrix().rotate(v[0]);
      else if (r[1] === 'skewX') n = new DOMMatrix().skewX(v[0]);
      else n = new DOMMatrix().skewY(v[0]);
      m = m.multiply(n);
    }
    return m;
  }
  const INHERIT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'fill-opacity', 'stroke-opacity', 'stroke-miterlimit', 'stroke-dasharray'];
  function styleOf(el, parent) {
    const s = Object.assign({}, parent);
    for (const k of INHERIT) { const v = el.getAttribute(k); if (v != null) s[k] = v; }
    const st = el.getAttribute('style');
    if (st) for (const part of st.split(';')) { const [k, v] = part.split(':').map((x) => x && x.trim()); if (k && v && INHERIT.includes(k)) s[k] = v; }
    const op = el.getAttribute('opacity');
    s.opacity = (parent.opacity == null ? 1 : parent.opacity) * (op != null ? +op : 1);
    return s;
  }
  function shapePath(el) {
    const n = el.tagName.toLowerCase(), a = (k) => +el.getAttribute(k) || 0;
    const p = new Path2D();
    if (n === 'path') return new Path2D(el.getAttribute('d') || '');
    if (n === 'circle') { p.arc(a('cx'), a('cy'), a('r'), 0, Math.PI * 2); return p; }
    if (n === 'ellipse') { p.ellipse(a('cx'), a('cy'), a('rx'), a('ry'), 0, 0, Math.PI * 2); return p; }
    if (n === 'rect') {
      const x = a('x'), y = a('y'), w = a('width'), h = a('height'), rx = Math.min(a('rx') || a('ry'), w / 2, h / 2);
      if (rx && p.roundRect) p.roundRect(x, y, w, h, rx); else p.rect(x, y, w, h);
      return p;
    }
    if (n === 'line') { p.moveTo(a('x1'), a('y1')); p.lineTo(a('x2'), a('y2')); return p; }
    if (n === 'polygon' || n === 'polyline') {
      const v = (el.getAttribute('points') || '').match(NUM) || [];
      for (let i = 0; i + 1 < v.length; i += 2) i ? p.lineTo(+v[i], +v[i + 1]) : p.moveTo(+v[i], +v[i + 1]);
      if (n === 'polygon') p.closePath();
      return p;
    }
    return null;
  }
  function walk(ctx, el, m, style, color) {
    const tag = el.tagName && el.tagName.toLowerCase();
    if (!tag || ['defs', 'title', 'desc', 'metadata', 'style', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient'].includes(tag)) return;
    const mm = parseTransform(el.getAttribute('transform'), m);
    const st = styleOf(el, style);
    if (tag === 'g' || tag === 'svg') { for (const ch of el.children) walk(ctx, ch, mm, st, color); return; }
    const path = shapePath(el);
    if (!path) return;
    const col = (v) => (v === 'currentColor' ? color : v);
    ctx.save();
    ctx.setTransform(ctx.__base.multiply(mm));
    const fill = st.fill == null ? (tag === 'line' || tag === 'polyline' ? 'none' : '#000') : st.fill;
    if (fill !== 'none' && tag !== 'line') {
      ctx.globalAlpha = st.opacity * (st['fill-opacity'] != null ? +st['fill-opacity'] : 1);
      ctx.fillStyle = col(fill);
      ctx.fill(path, st['fill-rule'] === 'evenodd' ? 'evenodd' : 'nonzero');
    }
    if (st.stroke && st.stroke !== 'none') {
      ctx.globalAlpha = st.opacity * (st['stroke-opacity'] != null ? +st['stroke-opacity'] : 1);
      ctx.strokeStyle = col(st.stroke);
      ctx.lineWidth = st['stroke-width'] != null ? +st['stroke-width'] : 1;
      ctx.lineCap = st['stroke-linecap'] || 'butt';
      ctx.lineJoin = st['stroke-linejoin'] || 'miter';
      if (st['stroke-dasharray'] && st['stroke-dasharray'] !== 'none') ctx.setLineDash((st['stroke-dasharray'].match(NUM) || []).map(Number));
      ctx.stroke(path);
    }
    ctx.restore();
  }
  const cache = {};
  function parse(svg) {
    if (cache[svg]) return cache[svg];
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const el = doc.documentElement;
    const vb = (el.getAttribute('viewBox') || '0 0 100 100').match(NUM).map(Number);
    return (cache[svg] = { el, vb });
  }
  // 把 svg 画进 (x, y, w, h)，保持比例居中
  function drawSVG(ctx, svg, x, y, w, h, color) {
    if (!svg) return;
    const { el, vb } = parse(svg);
    const s = Math.min(w / vb[2], h / vb[3]);
    const ox = x + (w - vb[2] * s) / 2 - vb[0] * s, oy = y + (h - vb[3] * s) / 2 - vb[1] * s;
    ctx.save();
    const base = ctx.getTransform().translate(ox, oy).scale(s);
    ctx.__base = base;
    walk(ctx, el, new DOMMatrix(), { opacity: 1 }, color || '#211C17');
    ctx.restore();
  }
  root.drawSVG = drawSVG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
