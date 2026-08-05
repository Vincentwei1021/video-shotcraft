/* doc-park-left-pill-deal — MotionLab 动效模板（Doc Park 文档靠左 + 结论慢发牌）
   自包含：直接在浏览器 <script> 引入即可；接 Remotion 时用 setup+render：
     const render = MotionLab.effect.setup(stageEl, MotionLab);
     render(frame / durationInFrames);   // 确定性 render(t)，t∈[0,1] */
(() => {
// ---- MotionLab 最小运行时（自包含；接 Remotion 时只需 setup+render） ----
const E = {
  linear: t => t, inQuad: t => t*t, outQuad: t => t*(2-t),
  inOutQuad: t => t<.5 ? 2*t*t : -1+(4-2*t)*t,
  inCubic: t => t*t*t, outCubic: t => 1 - Math.pow(1-t,3),
  inOutCubic: t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
  outQuart: t => 1 - Math.pow(1-t,4), outQuint: t => 1 - Math.pow(1-t,5),
  inQuart: t => t*t*t*t,
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10*t),
  inExpo: t => t === 0 ? 0 : Math.pow(2, 10*t-10),
  outBack: (t, s=1.70158) => 1 + (s+1)*Math.pow(t-1,3) + s*Math.pow(t-1,2),
  inBack: (t, s=1.70158) => (s+1)*t*t*t - s*t*t,
  outElastic: t => t===0?0 : t===1?1 : Math.pow(2,-10*t) * Math.sin((t*10-.75)*(2*Math.PI/3)) + 1,
  spring: (t, bounce=.25) => { const w = 8 + 8*(1-bounce); return 1 - Math.exp(-6*t) * Math.cos(w*t*bounce*2.2); },
};
const lerp = (t, a, b) => a + (b-a)*t;
const seg = (t, t0, t1, ease=E.linear) => ease(Math.min(1, Math.max(0, (t-t0)/(t1-t0))));
// 确定性伪随机（等价 Remotion random(seed)，渲染可复现）
const rand = seed => { let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const MotionLab = { E, lerp, seg, register(fx) { MotionLab.effect = fx; } };
const R = fx => MotionLab.register(fx);

// ---- 该效果依赖的文件级共享量 ----
const SRC = 'x.com/Jerrythe2d';
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const TXT = '#111111';
const LINE = '#E6E6EA';
const el = (tag, css, parent, txt) => {
  const n = document.createElement(tag);
  if (css) n.style.cssText = css;
  if (txt != null) n.textContent = txt;
  if (parent) parent.appendChild(n);
  return n;
};
const mkSheet = (stage, bg) => {
  const page = el('div', `position:absolute;inset:0;background:${bg || BG};overflow:hidden;
    font-family:${SANS};-webkit-font-smoothing:antialiased;`, stage);
  const inner = el('div', `position:absolute;left:50%;top:50%;width:440px;height:240px;
    margin:-120px 0 0 -220px;`, page);
  return inner;
};
const mkCaption = (parent, text, css, size) => {
  const row = el('div', `position:absolute;display:flex;align-items:baseline;white-space:nowrap;`
    + `${css || ''}`, parent);
  const words = text.split(' ').map((w, i) => el('span',
    `font:600 ${size || 12.5}px/1.25 ${SANS};color:${DIM};letter-spacing:-0.03em;
     margin-right:${i === text.split(' ').length - 1 ? 0 : 4.5}px;`, row, w));
  const n = words.length;
  const st = 0.78 / n, win = st * 1.5;
  return {
    row, words,
    /* p: 0..1 入场加深进度 */
    inn(p) {
      for (let i = 0; i < n; i++) {
        const q = clamp01((p - i * st) / win);
        words[i].style.color = mix(q, DIM, TXT);
        words[i].style.letterSpacing = (-0.03 * (1 - q)).toFixed(4) + 'em';
      }
    },
    /* q: 0..1 出场（逐词淡回浅灰 + 整行透明） */
    out(q) {
      const stw = 0.55 / n;
      for (let i = 0; i < n; i++) {
        const p = clamp01((q - i * stw) / (stw * 1.4));
        words[i].style.color = mix(1 - p, DIM, TXT);
      }
      row.style.opacity = clamp01(1 - (q - 0.7) / 0.3);
    },
    show(v) { row.style.opacity = v; },
  };
};
const mkDoc = (parent, w, h, cols, css) => {
  const card = el('div', `position:absolute;width:${w}px;height:${h}px;background:#fff;
    border:1px solid ${LINE};border-radius:10px;box-shadow:0 8px 26px rgba(0,0,0,.06);
    overflow:hidden;${css || ''}`, parent);
  const inner = el('div', 'position:absolute;left:0;top:0;right:0;', card);
  el('div', `position:absolute;left:14px;top:12px;width:${Math.round(w * 0.34)}px;height:7px;
    border-radius:3px;background:${INK};opacity:.85;`, inner);
  el('div', `position:absolute;left:14px;top:25px;width:${Math.round(w * 0.2)}px;height:5px;
    border-radius:3px;background:${SKEL};`, inner);
  const colW = (w - 28 - (cols - 1) * 10) / cols;
  for (let c = 0; c < cols; c++) {
    const x = 14 + c * (colW + 10);
    el('div', `position:absolute;left:${x}px;top:44px;width:${(colW * 0.72).toFixed(1)}px;height:6px;
      border-radius:3px;background:#9A9AA2;`, inner);
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const ww = colW * (0.55 + rand(c * 13 + r * 7) * 0.45);
      el('div', `position:absolute;left:${x}px;top:${58 + r * 13}px;width:${ww.toFixed(1)}px;height:5px;
        border-radius:2.5px;background:${SKEL};`, inner);
    }
  }
  return { card, inner };
};
const mkIcon = (parent, key, size, css) => {
  const w = el('div', `width:${size}px;height:${size}px;flex:0 0 auto;color:${TXT};${css || ''}`, parent);
  w.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 16 16">${ICONS[key]}</svg>`;
  return w;
};

R({
  id: 'b09-doc-park-left-pill-deal',
  title: 'Doc Park 文档靠左 + 结论慢发牌',
  src: SRC, cat: 'ui-entrance', dur: 5800,
  tags: ['靠左驻留只露 35%', 'easeOutBack 慢发牌', '常驻缓慢自动滚动'],
  desc: '扫描结束文档不淡出，而是向左滑出只露约 35% 宽并微缩到 0.92；右侧按旁白节奏慢速发牌三张白底描边药丸（outBack 弹入），每张落定后其下方走逐词加深字幕、下一张到来前整句淡出；左侧文档全程做极缓慢自动滚动保持"正在被读"。',
  setup(stage, { E, lerp, seg }) {
    const inner = mkSheet(stage);
    const DW = 250, DH = 190;
    const pane = el('div', `position:absolute;left:34px;top:${(240 - DH) / 2}px;width:${DW}px;height:${DH}px;
      transform-origin:0% 50%;`, inner);
    const doc = mkDoc(pane, DW, DH, 3, 'left:0;top:0;');
    doc.inner.style.height = (DH + 60) + 'px';

    const ITEMS = [
      { n: 'Quick Start', ic: 'leaf', cap: 'Start matches their preference' },
      { n: 'Bundle Plan', ic: 'bowl', cap: 'Plan fits their weekday usage' },
      { n: 'Starter Kit', ic: 'wrap', cap: 'Kit is their top repeat item' },
    ];
    const PX = 214, PY = 54, PH = 34, PG = 14;
    const pills = ITEMS.map((it, k) => {
      const p = el('div', `position:absolute;left:${PX}px;top:${PY + k * (PH + PG)}px;width:172px;height:${PH}px;
        border-radius:${PH / 2}px;background:#fff;border:1px solid ${LINE};box-sizing:border-box;
        box-shadow:0 4px 14px rgba(0,0,0,.06);display:flex;align-items:center;gap:9px;
        padding:0 14px;opacity:0;`, inner);
      mkIcon(p, it.ic, 16);
      el('div', `font:600 12.5px/1 ${SANS};color:${TXT};letter-spacing:-.01em;`, p, it.n);
      const cap = mkCaption(inner, it.cap, `left:${PX + 4}px;top:${PY + k * (PH + PG) + PH + 7}px;`, 11);
      cap.show(0);
      return { el: p, cap };
    });

    const T0 = [0.26, 0.48, 0.70];
    return t => {
      const park = seg(t, 0.06, 0.24, E.inOutCubic);
      pane.style.transform = `translateX(${lerp(park, 0, -55)}%) scale(${lerp(park, 1, 0.92)})`;
      // 极缓慢自动滚动（t=1 处回到整数周期，画面稳定）
      doc.inner.style.transform = `translateY(${(-(t * 3 % 1) * 40).toFixed(2)}px)`;

      pills.forEach((p, k) => {
        const f = T0[k];
        const o = seg(t, f, f + 0.035, E.outQuad);
        const b = seg(t, f, f + 0.062, E.outBack);
        p.el.style.opacity = o;
        p.el.style.transform = `translateY(${lerp(b, 14, 0).toFixed(2)}px) scale(${lerp(b, 0.94, 1).toFixed(4)})`;
        // 字幕：落定 +3 帧起加深，下一张入场前淡出
        const cs = f + 0.05, ce = (k < 2 ? T0[k + 1] - 0.03 : 0.98);
        p.cap.show(seg(t, cs, cs + 0.02));
        p.cap.inn(seg(t, cs, cs + (ce - cs) * 0.7));
        const outP = seg(t, ce - 0.05, ce, E.outQuad);
        if (outP > 0) p.cap.out(outP);
      });
    };
  },
});

// ---- 导出：CommonJS / ESM-interop / 浏览器全局三态 ----
// Node/Remotion: const { effect, MotionLab } = require('.../effect.js')
// 浏览器多文件共存: window.MotionLabEffects['<name>']
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { effect: MotionLab.effect, MotionLab };
} else if (typeof window !== 'undefined') {
  window.MotionLabEffects = window.MotionLabEffects || {};
  window.MotionLabEffects[MotionLab.effect.id] = { effect: MotionLab.effect, MotionLab };
  window.MotionLab = MotionLab; // 单文件场景的便捷句柄（多文件以 MotionLabEffects 为准）
}
})();
