/* chip-lift-to-user-pill — MotionLab 动效模板（Chip Lift 选中 chip 长成人名药丸）
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
const INK = '#0B0B0C';
const TXT = '#111111';
const LINE = '#E6E6EA';
const el = (tag, css, parent, txt) => {
  const n = document.createElement(tag);
  if (css) n.style.cssText = css;
  if (txt != null) n.textContent = txt;
  if (parent) parent.appendChild(n);
  return n;
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const mix = (p, a, b) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};
const mkSheet = (stage, bg) => {
  const page = el('div', `position:absolute;inset:0;background:${bg || BG};overflow:hidden;
    font-family:${SANS};-webkit-font-smoothing:antialiased;`, stage);
  const inner = el('div', `position:absolute;left:50%;top:50%;width:440px;height:240px;
    margin:-120px 0 0 -220px;`, page);
  return inner;
};
const mkBadge = (parent, size, css) => {
  const b = el('div', `position:absolute;width:${size}px;height:${size}px;border-radius:50%;
    background:#fff;border:1px solid ${LINE};box-shadow:0 2px 10px rgba(0,0,0,.07);
    display:flex;align-items:center;justify-content:center;${css || ''}`, parent);
  b.innerHTML = `<svg width="${(size * 0.52).toFixed(1)}" height="${(size * 0.52).toFixed(1)}" viewBox="0 0 24 24">
    <path d="M12 0.8 L14.3 9.7 L23.2 12 L14.3 14.3 L12 23.2 L9.7 14.3 L0.8 12 L9.7 9.7 Z" fill="${TXT}"/></svg>`;
  return b;
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

R({
  id: 'b09-chip-lift-to-user-pill',
  title: 'Chip Lift 选中 chip 长成人名药丸',
  src: SRC, cat: 'interaction', dur: 5000,
  tags: ['反色硬切', '距离交错淡出', '左缘锚定横向生长'],
  desc: '网格里的目标 chip 先 3 帧硬切反色成黑底白字，其余 chip 按到它的距离交错淡出并缩到 0.9；黑 chip 保持左缘不动向右生长成药丸，内部逐字打出人名并点亮绿点，再拉一条 1px 连接线接到圆形徽标。',
  setup(stage, { E, lerp, seg }) {
    const inner = mkSheet(stage);
    const COLS = 4, ROWS = 3, CW = 40, CH = 24, GX = 10, GY = 9, GX0 = 8, GY0 = 70;
    const TC = 1, TR = 1;                       // 目标 chip 的列/行
    const labels = ['JD', 'MK', 'CD', 'RL', 'AV', 'TP', 'KN', 'BW', 'CE', 'HR', 'LM', 'DQ'];
    const chips = [];
    let target = null;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const isT = (c === TC && r === TR);
      const x = GX0 + c * (CW + GX), y = GY0 + r * (CH + GY);
      const d = el('div', `position:absolute;left:${x}px;top:${y}px;width:${CW}px;height:${CH}px;
        border-radius:${CH / 2}px;background:#fff;border:1px solid ${LINE};
        display:flex;align-items:center;box-sizing:border-box;overflow:hidden;
        box-shadow:0 1px 3px rgba(0,0,0,.04);`, inner);
      const tag = el('div', `position:absolute;left:0;top:0;width:${CW}px;height:${CH}px;
        display:flex;align-items:center;justify-content:center;
        font:600 10.5px/1 ${SANS};letter-spacing:.6px;color:${TXT};`, d, isT ? 'CD' : labels[i]);
      if (isT) { target = { el: d, tag: tag, x: x, y: y }; }
      else chips.push({ el: d, dist: Math.abs(c - TC) + Math.abs(r - TR) });
    }
    inner.appendChild(target.el);               // 目标提到最上层

    // 药丸内部：人名逐字 + 绿点
    const name = 'Casey Doe';
    const nameWrap = el('div', `position:absolute;left:13px;top:0;height:${CH}px;display:flex;
      align-items:center;white-space:nowrap;`, target.el);
    const chars = name.split('').map(ch => el('span',
      `font:600 11px/1 ${SANS};color:#fff;opacity:0;white-space:pre;letter-spacing:.2px;`, nameWrap, ch));
    const dot = el('div', `position:absolute;top:${(CH - 7) / 2}px;width:7px;height:7px;border-radius:50%;
      background:#35D07F;box-shadow:0 0 8px rgba(53,208,127,.6);opacity:0;`, target.el);

    // 连接线 + AI 徽标 + 字幕
    const PX = target.x, PW0 = CW, PW1 = 190;
    const conn = el('div', `position:absolute;left:${PX + PW1}px;top:${target.y + CH / 2}px;height:1px;
      width:0px;background:${TXT};`, inner);
    const badge = mkBadge(inner, 26, `left:${PX + PW1 + 90 - 2}px;top:${target.y + CH / 2 - 13}px;opacity:0;`);
    const cap = mkCaption(inner, 'Starting with Casey', `left:${PX + PW1 - 18}px;top:${target.y + CH + 34}px;`, 13);
    cap.show(0);

    return t => {
      // A 反色硬切（3 帧感）
      const a = seg(t, 0.04, 0.085, E.linear);
      const aq = a < 0.34 ? 0 : a < 0.67 ? 0.5 : 1;      // 台阶化 → 硬切质感
      target.el.style.background = mix(aq, '#ffffff', INK);
      target.el.style.borderColor = mix(aq, LINE, INK);
      target.tag.style.color = mix(aq, TXT, '#ffffff');

      // B 其余 chip 按距离交错淡出 + scale .9
      chips.forEach(c => {
        const d0 = 0.10 + c.dist * 0.022;
        const p = seg(t, d0, d0 + 0.075, E.outQuad);
        c.el.style.opacity = 1 - p;
        c.el.style.transform = `scale(${lerp(p, 1, 0.9)})`;
      });

      // C 药丸从左缘生长 + 逐字 + 绿点
      const g = seg(t, 0.26, 0.44, E.outCubic);
      const w = lerp(g, PW0, PW1);
      target.el.style.width = w + 'px';
      target.tag.style.opacity = 1 - clamp01(g * 5);
      chars.forEach((ch, i) => {
        const p = seg(g, 0.18 + i * 0.062, 0.18 + i * 0.062 + 0.05, E.outQuad);
        ch.style.opacity = p;
        ch.style.transform = `translateY(${lerp(p, 2, 0)}px)`;
      });
      const dq = seg(g, 0.85, 1, E.outBack);
      dot.style.opacity = clamp01(dq * 2);
      dot.style.transform = `scale(${dq})`;
      dot.style.left = (w - 15) + 'px';

      // D 连接线 → 徽标 → 字幕
      const cw = seg(t, 0.47, 0.57, E.outQuad);
      conn.style.width = (cw * 90).toFixed(1) + 'px';
      const bp = seg(t, 0.56, 0.63, E.outCubic);
      badge.style.opacity = bp;
      badge.style.transform = `scale(${lerp(bp, 0.8, 1)})`;
      cap.show(seg(t, 0.6, 0.66));
      cap.inn(seg(t, 0.6, 0.92));
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
