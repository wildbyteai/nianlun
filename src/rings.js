/* 年轮盘：把每一年画成一圈。
 * 圈宽 = 当年长势；好年景浅而宽，坏年景深而窄；
 * 朱色楔口 = 伤疤（病、灾、险），靛色点环 = 霜（失去），苔色叶点 = 好事，赭色圈 = 迁徙（生长中心随之偏移）。
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const N = 200;
  const COL = { ink: '#211C17', zhu: '#C0432B', tai: '#5B7444', zhe: '#B88A3E', dian: '#34506B', paper: '#F1E8D4' };
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // 早材颜色：长势好偏浅、偏暖
  function woodColor(g) {
    const a = [222, 196, 146], b = [239, 222, 186];
    const t = clamp((g - 0.3) / 0.45, 0, 1);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }

  class RingDisc {
    constructor(canvas, opt) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.opt = Object.assign({ ref: 26, pad: 8, theme: 'paper' }, opt || {});
      this.rings = [];
      this.dead = false;
      this.grow = 1;
      this.hi = -1;
      this.barkT = 0;
      this.seed = 'nianlun';
      this.layout = null;
      this.cache = null;
      this.flashAt = -1;
      this.flashKind = 'ring';
      this.resize();
    }
    resize(w, h) {
      if (w && h) { this.W = w; this.H = h; } else {
        const r = this.cv.getBoundingClientRect();
        this.W = Math.max(20, r.width); this.H = Math.max(20, r.height);
      }
      this.dpr = this.opt.dpr || Math.min(3, root.devicePixelRatio || 1);
      this.cv.width = Math.round(this.W * this.dpr);
      this.cv.height = Math.round(this.H * this.dpr);
      this.layout = null; this.cache = null;
    }
    setSeed(str) { this.seed = String(str); this.noise = null; this.layout = null; this.cache = null; }
    setRings(rings, dead) { this.rings = rings || []; this.dead = !!dead; this.layout = null; this.cache = null; }
    pushRing() { this.layout = null; this.cache = null; }
    // 每年开圈、每次事件落一个记号，都给一圈向外的光，让「长了一圈」看得见
    flash(kind) {
      this.flashAt = (root.performance && root.performance.now ? root.performance.now() : Date.now());
      this.flashKind = kind || 'ring';
    }
    makeNoise() {
      const R = prng(hash(this.seed));
      const harm = [];
      // 起伏收小一点：原来 ±2.6% 的谐波叠加偏心生长，圆盘会长成明显的椭圆，
      // 在小屏上看着像「轮子缺了一块」。
      for (let k = 2; k <= 6; k++) harm.push({ k, a: (0.006 + R() * 0.013) / Math.sqrt(k - 1), p: R() * TAU });
      const cracks = [];
      const nc = 2 + Math.floor(R() * 3);
      for (let i = 0; i < nc; i++) cracks.push({ ang: R() * TAU, len: 0.22 + R() * 0.45, seed: Math.floor(R() * 1e9) });
      this.noise = { harm, cracks, ecc: R() * TAU, eccK: 0.022 + R() * 0.032 };
    }
    computeLayout() {
      if (!this.noise) this.makeNoise();
      if (this.opt.curve) return this.computeCurve();
      return this.computeLinear();
    }
    // 生长期：每圈半径只由自己之前的累计宽度决定，不随总圈数重排。
    // 指数小于 1，童年圈宽、晚年圈窄；REF 是一生累计宽度的参考值。
    computeCurve() {
      const harm = this.noise.harm;
      const n = this.rings.length;
      const Rmax = (Math.min(this.W, this.H) / 2 - (this.opt.pad + 9)) * 0.94;
      const REF = this.opt.ref || 90, EXP = this.opt.curve;
      const R = prng(hash(this.seed + ':r'));
      let eccAng = this.noise.ecc, cum = 0, prevR0 = 0, prevW = 1, ox = 0, oy = 0;
      const curves = [];
      for (let i = 0; i < n; i++) {
        const ring = this.rings[i];
        cum += ring.w;
        const r0 = Rmax * Math.min(1.03, Math.pow(cum / REF, EXP));
        const wpx = Math.max(0.5, r0 - prevR0);
        prevR0 = r0;
        const moved = ring.m && ring.m.some((m) => m.t === 'move');
        if (moved) eccAng += (R() - 0.5) * 2.6;
        const sh = wpx * this.noise.eccK * (moved ? 2.2 : 1);
        ox += Math.cos(eccAng) * sh;
        oy += Math.sin(eccAng) * sh;
        const amp = 0.1 * Math.min(wpx, prevW);
        prevW = wpx;
        const p1 = R() * TAU, p2 = R() * TAU;
        const pts = new Float32Array(N * 2);
        for (let j = 0; j < N; j++) {
          const t = (j / N) * TAU;
          let w = 1;
          for (const h of harm) w += h.a * Math.sin(h.k * t + h.p);
          const rr = r0 * w + amp * (Math.sin(3 * t + p1) * 0.6 + Math.sin(7 * t + p2) * 0.4);
          pts[j * 2] = this.W / 2 + ox + Math.cos(t) * rr;
          pts[j * 2 + 1] = this.H / 2 + oy + Math.sin(t) * rr;
        }
        curves.push({ pts, r0, wpx, cx: this.W / 2 + ox, cy: this.H / 2 + oy });
      }
      this.layout = { cx: this.W / 2, cy: this.H / 2, k: 1, Rmax, curves, total: cum };
    }
    // 静态图（终章、海报、同伴小图）：按实际总宽自适应，铺满画布
    computeLinear() {
      const { harm } = this.noise;
      const eccK = this.noise.eccK;
      const n = this.rings.length;
      const margin = this.opt.pad + 9; // 给树皮留位置，长到最后也不裁切
      const Rmax = Math.min(this.W, this.H) / 2 - margin;
      let total = 0;
      for (const r of this.rings) total += r.w;
      // 以 (0,0) 为髓心算一遍形状；偏心生长让外框不对称，所以第二步再按实际外框缩放居中
      const build = (k) => {
        const R = prng(hash(this.seed + ':r'));
        let eccAng = this.noise.ecc, cum = 0, ox = 0, oy = 0, prevW = 1;
        const curves = [];
        for (let i = 0; i < n; i++) {
          const ring = this.rings[i];
          const wpx = ring.w * k;
          cum += ring.w;
          const r0 = cum * k;
          const moved = ring.m && ring.m.some((m) => m.t === 'move');
          if (moved) eccAng += (R() - 0.5) * 2.6;
          const sh = wpx * eccK * (moved ? 2.2 : 1);
          ox += Math.cos(eccAng) * sh;
          oy += Math.sin(eccAng) * sh;
          const amp = 0.1 * Math.min(wpx, prevW);
          prevW = wpx;
          const p1 = R() * TAU, p2 = R() * TAU;
          const pts = new Float32Array(N * 2);
          for (let j = 0; j < N; j++) {
            const t = (j / N) * TAU;
            let w = 1;
            for (const h of harm) w += h.a * Math.sin(h.k * t + h.p);
            const rr = r0 * w + amp * (Math.sin(3 * t + p1) * 0.6 + Math.sin(7 * t + p2) * 0.4);
            pts[j * 2] = ox + Math.cos(t) * rr;
            pts[j * 2 + 1] = oy + Math.sin(t) * rr;
          }
          curves.push({ pts, r0, wpx, cx: ox, cy: oy });
        }
        return curves;
      };
      const k0 = Rmax / Math.max(total, this.opt.ref);
      let curves = build(k0);
      let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
      for (const c of curves) for (let j = 0; j < N * 2; j += 2) {
        if (c.pts[j] < x0) x0 = c.pts[j]; if (c.pts[j] > x1) x1 = c.pts[j];
        if (c.pts[j + 1] < y0) y0 = c.pts[j + 1]; if (c.pts[j + 1] > y1) y1 = c.pts[j + 1];
      }
      const fit = Math.min(1, (this.W / 2 - margin) / Math.max(1e-6, (x1 - x0) / 2), (this.H / 2 - margin) / Math.max(1e-6, (y1 - y0) / 2));
      const k = k0 * fit;
      if (fit < 1) curves = build(k);
      const cx = this.W / 2 - ((x0 + x1) / 2) * fit, cy = this.H / 2 - ((y0 + y1) / 2) * fit;
      for (const c of curves) {
        for (let j = 0; j < N * 2; j += 2) { c.pts[j] += cx; c.pts[j + 1] += cy; }
        c.cx += cx; c.cy += cy;
      }
      this.layout = { cx, cy, k, Rmax, curves, total };
    }
    // 第 i 圈外沿（按 grow 从上一圈插值）
    outer(i, grow) {
      const L = this.layout, c = L.curves[i].pts;
      if (grow >= 1) return c;
      const out = new Float32Array(N * 2);
      const prev = i > 0 ? L.curves[i - 1].pts : null;
      for (let j = 0; j < N * 2; j += 2) {
        const px = prev ? prev[j] : L.cx, py = prev ? prev[j + 1] : L.cy;
        out[j] = px + (c[j] - px) * grow;
        out[j + 1] = py + (c[j + 1] - py) * grow;
      }
      return out;
    }
    inner(i) {
      const L = this.layout;
      if (i > 0) return L.curves[i - 1].pts;
      const a = new Float32Array(N * 2);
      for (let j = 0; j < N * 2; j += 2) { a[j] = L.cx; a[j + 1] = L.cy; }
      return a;
    }
    pathOf(pts, ctxPath) {
      const p = ctxPath || new Path2D();
      p.moveTo(pts[0], pts[1]);
      for (let j = 2; j < N * 2; j += 2) p.lineTo(pts[j], pts[j + 1]);
      p.closePath();
      return p;
    }
    band(outer, inner, frac) { // 外沿往里 frac 比例的一条带
      const p = new Path2D();
      p.moveTo(outer[0], outer[1]);
      for (let j = 2; j < N * 2; j += 2) p.lineTo(outer[j], outer[j + 1]);
      p.closePath();
      const q = [];
      for (let j = 0; j < N * 2; j += 2) q.push(outer[j] + (inner[j] - outer[j]) * frac, outer[j + 1] + (inner[j + 1] - outer[j + 1]) * frac);
      p.moveTo(q[0], q[1]);
      for (let j = N * 2 - 2; j >= 2; j -= 2) p.lineTo(q[j], q[j + 1]);
      p.closePath();
      return p;
    }
    drawRing(ctx, i, grow) {
      const ring = this.rings[i], L = this.layout;
      const out = this.outer(i, grow), inn = this.inner(i);
      const wpx = L.curves[i].wpx * grow;
      const marks = ring.m || [];
      const dry = marks.some((m) => m.t === 'dry');
      const moved = marks.some((m) => m.t === 'move');
      // 早材
      ctx.fillStyle = woodColor(ring.g);
      ctx.fill(this.band(out, inn, 1), 'evenodd');
      // 正在形成的这一圈先带一层苔色，长成了才褪回木色
      if (grow < 1) {
        ctx.fillStyle = `rgba(91,116,68,${((1 - grow) * 0.24).toFixed(3)})`;
        ctx.fill(this.band(out, inn, 1), 'evenodd');
      }
      // 晚材（年轮线）
      const lw = clamp(wpx * (dry ? 0.55 : 0.3), Math.min(0.55, wpx * 0.4), dry ? 3.4 : 2.4);
      const frac = wpx > 0 ? clamp(lw / wpx, 0, 0.9) : 0;
      ctx.fillStyle = moved ? COL.zhe : COL.ink;
      ctx.globalAlpha = moved ? 0.95 : dry ? 0.9 : clamp(0.2 + Math.pow(1 - ring.g, 1.3) * 1.05, 0.2, 0.9);
      ctx.fill(this.band(out, inn, frac), 'evenodd');
      ctx.globalAlpha = 1;
      // 记号
      for (const m of marks) {
        const j = Math.round((m.ang / TAU) * N) % N;
        const ox = out[j * 2], oy = out[j * 2 + 1], ix = inn[j * 2], iy = inn[j * 2 + 1];
        if (m.t === 'scar') {
          // 楔口按绝对尺寸画，年轮再密也看得见
          const span = clamp(Math.round(wpx * 1.2 + 2), 2, 4);
          const j1 = (j + N - span) % N, j2 = (j + span) % N;
          const dx = ox - ix, dy = oy - iy, dl = Math.hypot(dx, dy) || 1;
          const size = Math.min(this.W, this.H);
          const inward = Math.max(wpx, size * 0.024), outward = Math.max(wpx * 0.3, size * 0.006);
          ctx.beginPath();
          ctx.moveTo(out[j1 * 2], out[j1 * 2 + 1]);
          ctx.lineTo(ox + (dx / dl) * outward, oy + (dy / dl) * outward);
          ctx.lineTo(out[j2 * 2], out[j2 * 2 + 1]);
          ctx.lineTo(ox - (dx / dl) * inward, oy - (dy / dl) * inward);
          ctx.closePath();
          ctx.fillStyle = COL.zhu;
          ctx.fill();
        } else if (m.t === 'frost') {
          ctx.fillStyle = COL.dian;
          for (let q = 0; q < N; q += 7) {
            const x = (out[q * 2] + inn[q * 2]) / 2, y = (out[q * 2 + 1] + inn[q * 2 + 1]) / 2;
            ctx.beginPath(); ctx.arc(x, y, clamp(wpx * 0.22, 0.85, 1.4), 0, TAU); ctx.fill();
          }
        } else if (m.t === 'bloom') {
          ctx.fillStyle = COL.tai;
          for (let q = -1; q <= 1; q++) {
            const jj = (j + q * 4 + N) % N;
            const x = (out[jj * 2] + inn[jj * 2]) / 2, y = (out[jj * 2 + 1] + inn[jj * 2 + 1]) / 2;
            const a = Math.atan2(y - L.cy, x - L.cx) + Math.PI / 2;
            ctx.beginPath(); ctx.ellipse(x, y, clamp(wpx * 0.9, 2.6, 4.2), clamp(wpx * 0.36, 1.05, 1.7), a, 0, TAU); ctx.fill();
          }
        }
      }
    }
    drawPith(ctx) {
      const L = this.layout;
      ctx.fillStyle = COL.ink;
      ctx.beginPath(); ctx.arc(L.cx, L.cy, 2.4, 0, TAU); ctx.fill();
    }
    drawBark(ctx) {
      const L = this.layout, n = this.rings.length;
      const t = this.barkT;
      if (t <= 0) return;
      const base = n ? L.curves[n - 1].pts : this.inner(0);
      const ccx = n ? L.curves[n - 1].cx : L.cx, ccy = n ? L.curves[n - 1].cy : L.cy;
      const bw = (n ? 7 : 4) * t;
      const R = prng(hash(this.seed + ':bark'));
      const outer = new Float32Array(N * 2);
      for (let j = 0; j < N * 2; j += 2) {
        const dx = base[j] - ccx, dy = base[j + 1] - ccy, d = Math.hypot(dx, dy) || 1;
        const b = bw * (0.75 + R() * 0.5);
        outer[j] = base[j] + (dx / d) * b; outer[j + 1] = base[j + 1] + (dy / d) * b;
      }
      const p = this.pathOf(outer);
      this.pathOf(base, p);
      const dark = this.opt.theme === 'ink';
      ctx.fillStyle = dark ? '#5A4634' : COL.ink;
      ctx.fill(p, 'evenodd');
      // 树皮上的刻痕：宁可轻一点，也不能把外圈切成一节一节的虚线，
      // 那在手机上就是「轮子缺了一块」。
      ctx.strokeStyle = dark ? 'rgba(33,28,23,.55)' : 'rgba(241,232,212,.3)';
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let j = 0; j < N; j += 4) {
        const i2 = j * 2, f = 0.22 + R() * 0.34;
        ctx.moveTo(base[i2] + (outer[i2] - base[i2]) * 0.2, base[i2 + 1] + (outer[i2 + 1] - base[i2 + 1]) * 0.2);
        ctx.lineTo(base[i2] + (outer[i2] - base[i2]) * (0.2 + f), base[i2 + 1] + (outer[i2 + 1] - base[i2 + 1]) * (0.2 + f));
      }
      ctx.stroke();
    }
    drawCambium(ctx) {
      const L = this.layout, n = this.rings.length;
      if (!n) return;
      const t = clamp(this.grow, 0, 1);
      const out = this.outer(n - 1, Math.max(0.001, t));
      ctx.save();
      ctx.strokeStyle = 'rgba(91,116,68,.92)';
      ctx.lineWidth = 1.2 + 2.8 * (1 - t);
      ctx.shadowColor = 'rgba(91,116,68,.75)';
      ctx.shadowBlur = 4 + 10 * (1 - t);
      ctx.stroke(this.pathOf(out));
      ctx.restore();
    }
    // 一圈向外散开的光：每年开圈一次，事件落记号时按记号颜色再来一次
    drawRipple(ctx) {
      if (this.flashAt < 0) return;
      const now = root.performance && root.performance.now ? root.performance.now() : Date.now();
      const t = (now - this.flashAt) / 640;
      if (t >= 1) { this.flashAt = -1; return; }
      const L = this.layout, n = this.rings.length;
      if (!n) return;
      const col = { scar: '192,67,43', bloom: '91,116,68', frost: '52,80,107' }[this.flashKind] || '91,116,68';
      const out = this.outer(n - 1, Math.max(0.001, this.grow));
      ctx.save();
      ctx.translate(L.cx, L.cy);
      ctx.scale(1 + 0.13 * t, 1 + 0.13 * t);
      ctx.translate(-L.cx, -L.cy);
      ctx.strokeStyle = `rgba(${col},${((1 - t) * 0.7).toFixed(3)})`;
      ctx.lineWidth = 1.5 + 3 * (1 - t);
      ctx.stroke(this.pathOf(out));
      ctx.restore();
    }
    drawCracks(ctx) {
      const L = this.layout, n = this.rings.length;
      if (!n || this.barkT < 1) return;
      const last = L.curves[n - 1].pts;
      for (const c of this.noise.cracks) {
        const R = prng(c.seed);
        const j = Math.round((c.ang / TAU) * N) % N;
        const sx = last[j * 2], sy = last[j * 2 + 1];
        const ex = L.cx + (sx - L.cx) * (1 - c.len), ey = L.cy + (sy - L.cy) * (1 - c.len);
        const steps = 9, pts = [];
        for (let s = 0; s <= steps; s++) {
          const f = s / steps;
          const nx = -(ey - sy), ny = ex - sx, nl = Math.hypot(nx, ny) || 1;
          const jit = s === 0 || s === steps ? 0 : (R() - 0.5) * 3.2;
          pts.push([sx + (ex - sx) * f + (nx / nl) * jit, sy + (ey - sy) * f + (ny / nl) * jit]);
        }
        ctx.beginPath();
        const wid = 2.4;
        for (let s = 0; s <= steps; s++) { const w = wid * (1 - s / steps); const [x, y] = pts[s]; s ? ctx.lineTo(x + w * 0.5, y + w * 0.5) : ctx.moveTo(x + w * 0.5, y + w * 0.5); }
        for (let s = steps; s >= 0; s--) { const w = wid * (1 - s / steps); const [x, y] = pts[s]; ctx.lineTo(x - w * 0.5, y - w * 0.5); }
        ctx.closePath();
        ctx.fillStyle = COL.ink;
        ctx.fill();
      }
    }
    drawHighlight(ctx) {
      const i = this.hi;
      if (i < 0 || i >= this.rings.length) return;
      const out = this.outer(i, 1), inn = this.inner(i);
      ctx.fillStyle = 'rgba(192,67,43,.28)';
      ctx.fill(this.band(out, inn, 1), 'evenodd');
      ctx.strokeStyle = COL.zhu;
      ctx.lineWidth = 2;
      ctx.stroke(this.pathOf(out));
    }
    buildCache(upto) {
      const c = document.createElement('canvas');
      c.width = this.cv.width; c.height = this.cv.height;
      const x = c.getContext('2d');
      x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      for (let i = 0; i < upto; i++) this.drawRing(x, i, 1);
      if (upto > 0 || !this.rings.length) this.drawPith(x);
      this.cache = { c, upto };
    }
    render() {
      if (!this.layout) this.computeLayout();
      const n = this.rings.length;
      const growing = !this.dead && this.grow < 1 && n > 0;
      const upto = growing ? n - 1 : n;
      if (!this.cache || this.cache.upto !== upto) this.buildCache(upto);
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      ctx.drawImage(this.cache.c, 0, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (growing) this.drawRing(ctx, n - 1, Math.max(0.001, this.grow));
      if (growing || !this.dead) this.drawPith(ctx);
      if (this.dead) { this.drawBark(ctx); this.drawCracks(ctx); }
      else { this.drawCambium(ctx); this.drawRipple(ctx); }
      this.drawHighlight(ctx);
    }
    // 指针位置 → 第几圈（-1 表示圆心外或空）
    indexAt(x, y) {
      if (!this.layout) this.computeLayout();
      const L = this.layout, n = this.rings.length;
      if (!n) return -1;
      const t = Math.atan2(y - L.cy, x - L.cx);
      const j = Math.round((((t % TAU) + TAU) % TAU) / TAU * N) % N;
      const d = Math.hypot(x - L.cx, y - L.cy);
      for (let i = 0; i < n; i++) {
        const p = L.curves[i].pts;
        if (Math.hypot(p[j * 2] - L.cx, p[j * 2 + 1] - L.cy) >= d) return i;
      }
      return d < L.curves[n - 1].r0 * 1.25 + 12 ? n - 1 : -1;
    }
    radiusOf(i) { if (!this.layout) this.computeLayout(); return i < 0 ? 0 : this.layout.curves[Math.min(i, this.rings.length - 1)].r0; }
  }

  // 一次性画一张静态年轮（小图、海报用）
  function paintDisc(canvas, rings, seed, opt) {
    const d = new RingDisc(canvas, Object.assign({ ref: 20 }, opt));
    if (opt && opt.size) d.resize(opt.size, opt.size);
    d.setSeed(seed);
    d.setRings(rings, true);
    d.barkT = 1;
    d.render();
    return d;
  }
  root.RingDisc = RingDisc;
  root.paintDisc = paintDisc;
})(typeof globalThis !== 'undefined' ? globalThis : this);
