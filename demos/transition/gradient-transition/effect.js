/* gradient-transition — MotionLab 动效模板（Gradient Transition 渐变过渡）
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
  id: 'b03-gradient-transition', title: 'Gradient Transition 渐变过渡',
  src: 'remotion-bits.dev', cat: 'transition', dur: 6000,
  tags: ['gradient 参数插值', 'conic 旋转'],
  desc: '背景在三类 CSS 渐变之间平滑过渡：linear 段插值角度+色标，radial 段插值中心+半径，conic 段旋转彩虹。等价"解析 gradient 字符串逐参数插值"的配方。',
  setup(stage, { E, lerp, seg }) {
    stage.style.background = '#0a0b10';
    const mkLayer = () => {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0;opacity:0;';
      stage.appendChild(d);
      return d;
    };
    const L1 = mkLayer(), L2 = mkLayer(), L3 = mkLayer();
    const label = document.createElement('div');
    label.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      padding:6px 18px;border-radius:999px;background:rgba(8,9,14,.55);color:#fff;
      font-family:-apple-system,system-ui,sans-serif;font-size:13px;letter-spacing:4px;
      font-weight:700;backdrop-filter:blur(4px);`;
    stage.appendChild(label);
    const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
    const mixH = (a, b, k) => [lerp(k, a[0], b[0]), lerp(k, a[1], b[1]), lerp(k, a[2], b[2])];
    return t => {
      // Phase 1: linear —— 角度 40°→230°，两组色标 hsl 插值
      {
        const p = seg(t, 0, 0.4, E.inOutQuad);
        const ang = lerp(p, 40, 230);
        const c1 = mixH([340, 88, 60], [160, 78, 52], p);
        const c2 = mixH([265, 80, 52], [205, 92, 58], p);
        L1.style.background = `linear-gradient(${ang}deg, ${hsl(...c1)}, ${hsl(...c2)})`;
      }
      // Phase 2: radial —— 中心 (28%,66%)→(72%,32%)，半径 45%→85%
      {
        const p = seg(t, 0.33, 0.7, E.inOutQuad);
        const cx = lerp(p, 28, 72), cy = lerp(p, 66, 32), rr = lerp(p, 45, 85);
        const c1 = mixH([45, 95, 62], [285, 85, 58], p);
        const c2 = mixH([220, 60, 14], [230, 55, 10], p);
        L2.style.background = `radial-gradient(circle ${rr}% at ${cx}% ${cy}%, ${hsl(...c1)}, ${hsl(...c2)})`;
      }
      // Phase 3: conic —— from 角度旋转的彩虹环（首尾同色可无缝循环）
      {
        const p = seg(t, 0.66, 1, E.inOutQuad);
        const from = p * 300;
        L3.style.background = `conic-gradient(from ${from}deg at 50% 50%,
          hsl(0,85%,60%), hsl(60,85%,60%), hsl(120,75%,55%), hsl(180,80%,55%),
          hsl(240,85%,62%), hsl(300,85%,60%), hsl(0,85%,60%))`;
      }
      L1.style.opacity = 1 - seg(t, 0.3, 0.38);
      L2.style.opacity = seg(t, 0.3, 0.38) - seg(t, 0.63, 0.71);
      L3.style.opacity = seg(t, 0.63, 0.71);
      label.textContent = t < 0.34 ? 'LINEAR' : t < 0.67 ? 'RADIAL' : 'CONIC';
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
