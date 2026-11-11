/* 合成音效：全部用 WebAudio 现场合成，不带音频文件。首次点按后才启动。 */
(function (root) {
  'use strict';
  const S = { on: true, ctx: null, master: null, wind: null };
  function ensure() {
    if (S.ctx) { if (S.ctx.state === 'suspended') S.ctx.resume(); return S.ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    S.ctx = ctx; S.master = master;
    return ctx;
  }
  function env(g, t, a, peak, d) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(freq, opt) {
    if (!S.on) return;
    const ctx = ensure(); if (!ctx) return;
    opt = opt || {};
    const t = ctx.currentTime + (opt.delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opt.drop) o.frequency.exponentialRampToValueAtTime(freq * opt.drop, t + (opt.d || 0.3));
    env(g, t, opt.a || 0.005, opt.v || 0.3, opt.d || 0.3);
    o.connect(g); g.connect(S.master);
    o.start(t); o.stop(t + (opt.a || 0.005) + (opt.d || 0.3) + 0.05);
  }
  function noiseBuf(ctx, sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  const Snd = {
    get on() { return S.on; },
    set(on) { S.on = !!on; if (!on) Snd.wind(0); },
    unlock() { if (S.on) ensure(); },
    // 木鱼一样的「笃」
    tok(p) { tone(p || 520, { type: 'triangle', d: 0.12, v: 0.35, drop: 0.7 }); tone((p || 520) * 2.76, { d: 0.05, v: 0.08 }); },
    // 好事：两声清亮的钟
    chime() { tone(784, { d: 1.1, v: 0.16 }); tone(1175, { d: 0.9, v: 0.1, delay: 0.09 }); tone(1568, { d: 0.6, v: 0.05, delay: 0.09 }); },
    // 坏事：一声闷响
    thud() { tone(70, { d: 0.5, v: 0.5, drop: 0.6 }); tone(140, { type: 'triangle', d: 0.2, v: 0.12, drop: 0.5 }); },
    // 失去：低沉的长音
    frost() { tone(220, { type: 'sine', d: 1.6, v: 0.14, a: 0.05 }); tone(261.6, { type: 'sine', d: 1.4, v: 0.09, a: 0.08, delay: 0.12 }); },
    swipe() {
      if (!S.on) return; const ctx = ensure(); if (!ctx) return;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx, 0.25);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
      const g = ctx.createGain(); env(g, ctx.currentTime, 0.01, 0.18, 0.18);
      src.connect(f); f.connect(g); g.connect(S.master); src.start();
    },
    // 落地：印章压下去
    stamp() { tone(110, { d: 0.35, v: 0.6, drop: 0.5 }); Snd.tok(330); },
    // 终了：非谐和泛音的钟
    gong() {
      const f = 98;
      [[1, 0.3, 4.5], [2.4, 0.12, 3.2], [3.9, 0.07, 2.4], [5.4, 0.05, 1.8], [6.8, 0.03, 1.4]].forEach(([k, v, d]) => tone(f * k, { d, v, a: 0.01 }));
    },
    // 年轮放音：长势越好音越高，用五声音阶
    ring(g, scar) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
      const idx = Math.max(0, Math.min(scale.length - 1, Math.round(g * (scale.length - 1))));
      const f = 196 * Math.pow(2, scale[idx] / 12);
      tone(f, { type: 'triangle', d: 0.32, v: 0.16 });
      if (scar) tone(82, { d: 0.25, v: 0.28, drop: 0.6 });
    },
    // 风：带通噪声，强度跟着按压时间
    wind(level) {
      if (!S.on && level > 0) return;
      const ctx = S.ctx || (level > 0 ? ensure() : null);
      if (!ctx) return;
      if (!S.wind && level > 0) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx, 2); src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
        const g = ctx.createGain(); g.gain.value = 0.0001;
        src.connect(f); f.connect(g); g.connect(S.master); src.start();
        S.wind = { src, f, g };
      }
      if (S.wind) {
        const t = ctx.currentTime;
        S.wind.g.gain.setTargetAtTime(Math.max(0.0001, level * 0.32), t, 0.08);
        S.wind.f.frequency.setTargetAtTime(380 + level * 900, t, 0.1);
        if (level <= 0) { const w = S.wind; S.wind = null; setTimeout(() => { try { w.src.stop(); } catch (e) { /* 已停 */ } }, 600); }
      }
    },
  };
  root.Snd = Snd;
})(typeof globalThis !== 'undefined' ? globalThis : this);
