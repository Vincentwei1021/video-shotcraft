/* radial-wave — MotionLab 动效模板（Grid Radial Wave 点阵涟漪）
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

R({
  id: 'radial-wave', title: 'Grid Radial Wave 点阵涟漪',
  src: 'anime.js', cat: 'ui-entrance', dur: 3800,
  tags: ['stagger', '波源可参数化'],
  desc: '17×9 圆点阵列，波从中心向外按欧氏距离 stagger 扩散：每点做 scale 0→1.5→1 + 亮度脉冲，波前过后留下常亮点阵。第二道波反向收拢。配方：offset = k·dist(cell, origin)，波源/波速/波形全参数化。',
  setup(stage, { E, seg }) {
    const COLS = 17, ROWS = 9, dots = [];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;background:#0a0b10';
    stage.appendChild(wrap);
    const cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2;
    const maxD = Math.hypot(cx, cy);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const d = document.createElement('div');
      const dist = Math.hypot(c - cx, r - cy) / maxD;
      d.style.cssText = `position:absolute;width:10px;height:10px;border-radius:50%;
        left:${(c + 0.5) / COLS * 100}%;top:${(r + 0.5) / ROWS * 100}%;
        margin:-5px;background:#6c8cff;`;
      wrap.appendChild(d);
      dots.push({ el: d, dist });
    }
    return t => {
      for (const { el, dist } of dots) {
        // 第一道波：扩散点亮；第二道波：反向脉冲
        const w1 = seg(t, dist * 0.35, dist * 0.35 + 0.18, E.outCubic);
        const w2 = seg(t, 0.62 + (1 - dist) * 0.25, 0.62 + (1 - dist) * 0.25 + 0.15);
        const pulse2 = Math.sin(w2 * Math.PI);
        const s = w1 * (1 + 0.5 * Math.sin(w1 * Math.PI)) + pulse2 * 0.8;
        el.style.transform = `scale(${s})`;
        el.style.opacity = 0.25 + w1 * 0.5 + pulse2 * 0.25;
        el.style.background = pulse2 > 0.3 ? '#b9f2ff' : '#6c8cff';
        el.style.boxShadow = pulse2 > 0.3 ? '0 0 12px #7fd8ff' : 'none';
      }
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
