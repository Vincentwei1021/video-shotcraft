/* scan-bracket-sweep — MotionLab 动效模板（Scan Bracket 取景括号扫描光带）
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
const INK = '#0B0B0C';
const el = (tag, css, parent, txt) => {
  const n = document.createElement(tag);
  if (css) n.style.cssText = css;
  if (txt != null) n.textContent = txt;
  if (parent) parent.appendChild(n);
  return n;
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const inOutSin = x => 0.5 - Math.cos(Math.PI * clamp01(x)) / 2;
const mkSheet = (stage, bg) => {
  const page = el('div', `position:absolute;inset:0;background:${bg || BG};overflow:hidden;
    font-family:${SANS};-webkit-font-smoothing:antialiased;`, stage);
  const inner = el('div', `position:absolute;left:50%;top:50%;width:440px;height:240px;
    margin:-120px 0 0 -220px;`, page);
  return inner;
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

R({
  id: 'b09-scan-bracket-sweep',
  title: 'Scan Bracket 取景括号扫描光带',
  src: SRC, cat: 'effects', dur: 5000,
  tags: ['四角取景括号落位', 'easeInOutSine 往复', '朝来向的渐变拖尾'],
  desc: '骨架文档弹到画面中央，四角落下黑色 L 形取景括号（向内位移 8px），随后一条 2.5px 黑实线带着 80px 深灰→透明拖尾在文档上往复扫 5 趟，两端慢中间快，尾迹方向始终朝运动来向，文档本身完全静止。',
  setup(stage, { E, lerp, seg }) {
    const inner = mkSheet(stage);
    const DW = 300, DH = 178, DX = (440 - DW) / 2, DY = (240 - DH) / 2;
    const holder = el('div', `position:absolute;left:${DX}px;top:${DY}px;width:${DW}px;height:${DH}px;`, inner);
    const doc = mkDoc(holder, DW, DH, 4, 'left:0;top:0;transform-origin:50% 50%;');
    // 扫描光带（裁在文档内）
    const clip = el('div', `position:absolute;left:0;top:0;width:${DW}px;height:${DH}px;
      border-radius:10px;overflow:hidden;pointer-events:none;`, holder);
    const bar = el('div', 'position:absolute;left:0;right:0;top:0;height:0;', clip);
    const trail = el('div', `position:absolute;left:0;right:0;height:82px;`, bar);
    const line = el('div', `position:absolute;left:0;right:0;top:0;height:2.5px;background:${INK};`, bar);
    // 四角取景括号
    const CS = 34, CB = `2px solid ${INK}`;
    const corners = [
      { css: `left:-7px;top:-7px;border-left:${CB};border-top:${CB};`, dx: 1, dy: 1 },
      { css: `right:-7px;top:-7px;border-right:${CB};border-top:${CB};`, dx: -1, dy: 1 },
      { css: `right:-7px;bottom:-7px;border-right:${CB};border-bottom:${CB};`, dx: -1, dy: -1 },
      { css: `left:-7px;bottom:-7px;border-left:${CB};border-bottom:${CB};`, dx: 1, dy: -1 },
    ].map(c => ({ el: el('div', `position:absolute;width:${CS}px;height:${CS}px;opacity:0;${c.css}`, holder), dx: c.dx, dy: c.dy }));

    const PASSES = 5;
    return t => {
      const dp = seg(t, 0, 0.11, E.outCubic);
      doc.card.style.transform = `scale(${lerp(dp, 0.86, 1)})`;
      doc.card.style.opacity = clamp01(dp * 3);

      corners.forEach((c, i) => {
        const p = seg(t, 0.08 + i * 0.022, 0.08 + i * 0.022 + 0.055, E.outCubic);
        c.el.style.opacity = p;
        c.el.style.transform = `translate(${(1 - p) * 8 * c.dx}px,${(1 - p) * 8 * c.dy}px)`;
      });

      const sp = seg(t, 0.17, 0.95, E.linear);
      const raw = sp * PASSES;
      const pi = Math.min(PASSES - 1, Math.floor(raw));
      const local = clamp01((raw - pi) / 0.88);            // 每趟末尾留 12% 停顿
      const dir = pi % 2 === 0 ? 1 : -1;
      const prog = inOutSin(local);
      const y = dir > 0 ? prog * DH : DH - prog * DH;
      bar.style.transform = `translateY(${y.toFixed(2)}px)`;
      if (dir > 0) { trail.style.top = '-82px'; trail.style.background = 'linear-gradient(180deg,rgba(20,20,22,0),rgba(20,20,22,.5))'; }
      else { trail.style.top = '2.5px'; trail.style.background = 'linear-gradient(180deg,rgba(20,20,22,.5),rgba(20,20,22,0))'; }
      clip.style.opacity = (seg(t, 0.16, 0.2) * (1 - seg(t, 0.93, 0.99))).toFixed(3);
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
