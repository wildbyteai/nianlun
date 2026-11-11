/* 世界地图：Natural Earth 陆地轮廓 + 各国首都位置。
 * 每秒按真实出生速度（全年出生数 ÷ 一年的秒数）在出生国闪一下；按住时起风、种子飘；松手后落到抽中的国家。
 */
(function (root) {
  'use strict';
  const COL = { ink: '#211C17', zhu: '#C0432B', tai: '#5B7444', zhe: '#B88A3E', dian: '#34506B', paper: '#F1E8D4', paper2: '#E8DCC2' };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  class WorldMap {
    constructor(canvas, NL, art) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.NL = NL;
      this.M = NL.map;
      this.landPath = new Path2D(this.M.path);
      this.cam = { x: this.M.w * 0.62, y: this.M.h * 0.45, z: 1.55 };
      this.tween = null;
      this.flashes = [];
      this.streaks = [];
      this.wind = 0;
      this.seed = null;
      this.pin = null;
      this.birthAcc = 0;
      this.bps = NL.info.sumBirths / 31557600;
      const cs = NL.countries;
      this.cum = [];
      let s = 0;
      for (const c of cs) { s += c.b; this.cum.push(s); }
      this.sumB = s;
      this.seedImg = null;
      if (art && art.seed) {
        const img = new Image();
        img.onload = () => { this.seedImg = img; };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(art.seed);
      }
      this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      this.W = Math.max(50, r.width);
      this.H = Math.max(50, r.height);
      this.dpr = Math.min(3, root.devicePixelRatio || 1);
      this.cv.width = Math.round(this.W * this.dpr);
      this.cv.height = Math.round(this.H * this.dpr);
      this.hatch = null;
      this.fitZoom();
    }
    // 让地图至少铺满画布高度
    fitZoom() { this.minZ = Math.max(1, (this.H / this.M.h) / (this.W / this.M.w) * 0.92); if (this.cam.z < this.minZ) this.cam.z = this.minZ; }
    scale() { return (this.W / this.M.w) * this.cam.z; }
    toScreen(x, y) { const s = this.scale(); return [(x - this.cam.x) * s + this.W / 2, (y - this.cam.y) * s + this.H / 2]; }
    toWorld(sx, sy) { const s = this.scale(); return [(sx - this.W / 2) / s + this.cam.x, (sy - this.H / 2) / s + this.cam.y]; }
    nearX(x) { const w = this.M.w; return x + Math.round((this.cam.x - x) / w) * w; }
    randomCountry() {
      const t = Math.random() * this.sumB;
      let lo = 0, hi = this.cum.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (this.cum[m] < t) lo = m + 1; else hi = m; }
      return this.NL.countries[lo];
    }
    flash(c, strong) { this.flashes.push({ x: c.x, y: c.y, t: 0, dur: strong ? 1800 : 1300, strong: !!strong }); }
    flyTo(x, y, z, ms) {
      this.tween = { fx: this.cam.x, fy: this.cam.y, fz: this.cam.z, tx: this.nearX(x), ty: y, tz: Math.max(z, this.minZ), t: 0, dur: ms };
    }
    clampCam() {
      const s = this.scale(), half = this.H / 2 / s;
      if (this.M.h <= half * 2) this.cam.y = this.M.h / 2;
      else this.cam.y = clamp(this.cam.y, half, this.M.h - half);
    }
    step(dt) {
      // 环境出生闪光（只用 Math.random，不碰游戏的随机数序列）
      this.birthAcc += (dt / 1000) * this.bps;
      while (this.birthAcc >= 1) { this.birthAcc -= 1; this.flash(this.randomCountry()); }
      for (const f of this.flashes) f.t += dt;
      this.flashes = this.flashes.filter((f) => f.t < f.dur);
      // 风
      if (this.wind > 0.02 && this.streaks.length < 40 * this.wind) {
        this.streaks.push({ x: -40, y: Math.random() * this.H, len: 20 + Math.random() * 60, v: 0.35 + Math.random() * 0.5, a: 0.18 + Math.random() * 0.25 });
      }
      for (const s of this.streaks) s.x += s.v * dt * (0.6 + this.wind * 1.4);
      this.streaks = this.streaks.filter((s) => s.x - s.len < this.W + 10);
      if (this.wind > 0.02 && !this.tween) { this.cam.x += dt * 0.05 * this.wind / this.cam.z * 3; }
      if (this.tween) {
        const tw = this.tween;
        tw.t += dt;
        const k = ease(clamp(tw.t / tw.dur, 0, 1));
        this.cam.x = tw.fx + (tw.tx - tw.fx) * k;
        this.cam.y = tw.fy + (tw.ty - tw.fy) * k;
        this.cam.z = tw.fz + (tw.tz - tw.fz) * k;
        if (tw.t >= tw.dur) this.tween = null;
      }
      this.clampCam();
      if (this.seed) this.stepSeed(dt);
    }
    stepSeed(dt) {
      const sd = this.seed;
      sd.t += dt;
      if (sd.mode === 'hover') {
        sd.rot += dt * (0.002 + this.wind * 0.014);
        sd.sx = this.W / 2 + Math.sin(sd.t / 520) * (10 + this.wind * 26);
        sd.sy = this.H * 0.3 + Math.sin(sd.t / 380) * (6 + this.wind * 10) - this.wind * 18;
      } else if (sd.mode === 'fly') {
        const k = clamp(sd.t / sd.dur, 0, 1), e = ease(k);
        const x = sd.fx + (sd.tx - sd.fx) * e, y = sd.fy + (sd.ty - sd.fy) * e - Math.sin(Math.PI * e) * sd.arc;
        const [sx, sy] = this.toScreen(x, y);
        sd.sx = sx; sd.sy = sy;
        sd.rot += dt * (0.02 * (1 - k) + 0.004);
        sd.scale = 1 - 0.45 * e;
        if (k >= 1) { sd.mode = 'landed'; if (sd.onLand) sd.onLand(); }
      } else if (sd.mode === 'landed') {
        const [sx, sy] = this.toScreen(sd.tx, sd.ty);
        sd.sx = sx; sd.sy = sy;
      }
    }
    hover() { this.seed = { mode: 'hover', t: 0, rot: 0, sx: this.W / 2, sy: this.H * 0.3, scale: 1 }; }
    land(c, ms, onLand) {
      const sd = this.seed || (this.hover(), this.seed);
      const [fx, fy] = this.toWorld(sd.sx, sd.sy);
      const tx = this.nearX(c.x);
      Object.assign(sd, { mode: 'fly', t: 0, dur: ms, fx, fy, tx, ty: c.y, arc: 40, onLand });
      this.pin = { x: tx, y: c.y, t: -ms };
      this.flyTo(tx, c.y, 3.4, ms * 1.05);
    }
    makeHatch() {
      const s = Math.round(5 * this.dpr);
      const c = document.createElement('canvas');
      c.width = s; c.height = s;
      const x = c.getContext('2d');
      x.strokeStyle = 'rgba(33,28,23,.32)';
      x.lineWidth = Math.max(1, this.dpr * 0.7);
      x.beginPath(); x.moveTo(0, s); x.lineTo(s, 0); x.moveTo(-s / 2, s / 2); x.lineTo(s / 2, -s / 2); x.moveTo(s / 2, s * 1.5); x.lineTo(s * 1.5, s / 2); x.stroke();
      this.hatch = this.ctx.createPattern(c, 'repeat');
    }
    draw() {
      const ctx = this.ctx, d = this.dpr, s = this.scale(), w = this.M.w;
      if (!this.hatch) this.makeHatch();
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.fillStyle = COL.paper;
      ctx.fillRect(0, 0, this.W, this.H);
      // 海面：错落的小浪纹
      const [wx0, wy0] = this.toWorld(0, 0), [wx1, wy1] = this.toWorld(this.W, this.H);
      const gs = 26;
      ctx.strokeStyle = 'rgba(52,80,107,.26)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gy = Math.floor(wy0 / gs) * gs; gy <= wy1 + gs; gy += gs) {
        const row = Math.round(gy / gs);
        for (let gx = Math.floor(wx0 / gs) * gs - gs; gx <= wx1 + gs; gx += gs) {
          const [sx, sy] = this.toScreen(gx + (row % 2 ? gs / 2 : 0), gy);
          const r = 3.2 * Math.min(1.6, this.cam.z / 1.5);
          ctx.moveTo(sx - r * 2, sy);
          ctx.quadraticCurveTo(sx - r, sy - r * 0.9, sx, sy);
          ctx.quadraticCurveTo(sx + r, sy - r * 0.9, sx + r * 2, sy);
        }
      }
      ctx.stroke();
      // 陆地：苔绿套色（错位）+ 墨线 + 斜线刻纹
      for (const off of [-w, 0, w]) {
        const left = (off - this.cam.x) * s + this.W / 2, right = (off + w - this.cam.x) * s + this.W / 2;
        if (right < 0 || left > this.W) continue;
        const tx = this.W / 2 + (off - this.cam.x) * s, ty = this.H / 2 - this.cam.y * s;
        ctx.setTransform(d * s, 0, 0, d * s, d * (tx + 1.6), d * (ty + 1.3));
        ctx.fillStyle = 'rgba(91,116,68,.55)';
        ctx.fill(this.landPath);
        ctx.setTransform(d * s, 0, 0, d * s, d * tx, d * ty);
        if (this.hatch.setTransform) this.hatch.setTransform(new DOMMatrix().scale(1 / (s * d)).translate(-tx * d, -ty * d));
        ctx.fillStyle = this.hatch;
        ctx.fill(this.landPath);
        ctx.strokeStyle = COL.ink;
        ctx.lineWidth = 1.15 / s;
        ctx.lineJoin = 'round';
        ctx.stroke(this.landPath);
      }
      ctx.setTransform(d, 0, 0, d, 0, 0);
      // 各国出生点：大小按年出生数
      const zk = clamp(this.cam.z / 1.55, 0.8, 2.2);
      for (const c of this.NL.countries) {
        const [sx, sy] = this.toScreen(this.nearX(c.x), c.y);
        if (sx < -12 || sx > this.W + 12 || sy < -12 || sy > this.H + 12) continue;
        const r = clamp(Math.sqrt(c.b / 1e6) * 2.1, 1.1, 10) * zk;
        ctx.beginPath(); ctx.arc(sx, sy, r + 1.1, 0, Math.PI * 2); ctx.fillStyle = COL.paper; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fillStyle = COL.ink; ctx.fill();
      }
      // 出生闪光
      for (const f of this.flashes) {
        const [sx, sy] = this.toScreen(this.nearX(f.x), f.y);
        const p = f.t / f.dur;
        ctx.globalAlpha = (1 - p) * (f.strong ? 1 : 0.9);
        ctx.strokeStyle = COL.zhu;
        ctx.lineWidth = f.strong ? 2.4 : 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, 3 + p * (f.strong ? 34 : 15), 0, Math.PI * 2); ctx.stroke();
        if (p < 0.25) { ctx.fillStyle = COL.zhu; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      // 落点
      if (this.pin && this.pin.t >= 0) {
        const [sx, sy] = this.toScreen(this.pin.x, this.pin.y);
        for (let k = 0; k < 3; k++) {
          const p = ((this.pin.t / 1600) + k / 3) % 1;
          ctx.globalAlpha = 1 - p;
          ctx.strokeStyle = COL.zhu; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 6 + p * 40, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = COL.zhu; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
      }
      // 风线
      ctx.lineCap = 'round';
      for (const st of this.streaks) {
        ctx.strokeStyle = `rgba(33,28,23,${st.a})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(st.x - st.len, st.y); ctx.quadraticCurveTo(st.x - st.len / 2, st.y - 3, st.x, st.y); ctx.stroke();
      }
      // 种子
      const sd = this.seed;
      if (sd && this.seedImg && !(sd.mode === 'landed' && this.pin && this.pin.t > 900)) {
        const size = 46 * (sd.scale || 1);
        ctx.save();
        ctx.translate(sd.sx, sd.sy);
        ctx.rotate(sd.rot);
        ctx.drawImage(this.seedImg, -size * 0.28, -size * 0.72, size, size);
        ctx.restore();
      }
    }
    tick(dt) { if (this.pin) this.pin.t += dt; this.step(dt); this.draw(); }
  }
  root.WorldMap = WorldMap;
})(typeof globalThis !== 'undefined' ? globalThis : this);
