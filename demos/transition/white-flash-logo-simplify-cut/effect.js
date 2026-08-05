/* white-flash-logo-simplify-cut — MotionLab 动效模板（White Flash Simplify 冲白降维切换）
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
const GRAD_A = '#7b3df0';
const GRAD_B = '#5a6cf5';
const GRAD_C = '#22c4e8';
const WORDMARK = 'BRAND';

R({
  id: 'b28-white-flash-logo-simplify-cut',
  title: 'White Flash Simplify 冲白降维切换',
  src: '抖音 观机社', cat: 'transition', dur: 3600,
  tags: ['冲白转场', '质感降维'],
  desc: '彩色液态质感词标（占位字标）静置后画面 0.2s 冲白（冲白瞬间叠一帧轻微 blur 做过曝感），紧接扁平渐变版字标从白底淡入 + scale 0.96→1 定格。一次闪白完成“液态质感→扁平字标”的降维切换。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:#08070c;overflow:hidden';
    stage.appendChild(scene);

    // 彩色液态词层
    const liquid = document.createElement('div');
    liquid.textContent = WORDMARK;
    liquid.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      font:900 62px/1 -apple-system,'Helvetica Neue',sans-serif;letter-spacing:6px;
      background:linear-gradient(105deg,#ff5fa2 0%,#ff9d4d 22%,#ffe45c 38%,#4de3c1 58%,#4d9bff 76%,#a05cff 100%);
      background-size:320% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
      text-shadow:none;`;
    scene.appendChild(liquid);
    // 液态高光扫层（贴在字上方的柔光条）
    const sheen = document.createElement('div');
    sheen.style.cssText = `position:absolute;left:50%;top:50%;width:220px;height:120px;margin:-60px 0 0 -110px;
      background:radial-gradient(closest-side,rgba(255,255,255,.28),transparent 70%);
      filter:blur(6px);mix-blend-mode:screen;pointer-events:none;`;
    scene.appendChild(sheen);

    // 白色全屏层
    const white = document.createElement('div');
    white.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:0';
    scene.appendChild(white);

    // 扁平渐变字标层（渐变色见块顶 GRAD_*）
    const flat = document.createElement('div');
    flat.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;opacity:0`;
    const flatWord = document.createElement('div');
    flatWord.textContent = WORDMARK;
    flatWord.style.cssText = `font:800 58px/1 -apple-system,'Helvetica Neue',sans-serif;letter-spacing:8px;
      background:linear-gradient(92deg,${GRAD_A} 0%,${GRAD_B} 45%,${GRAD_C} 100%);
      -webkit-background-clip:text;background-clip:text;color:transparent;`;
    flat.appendChild(flatWord);
    scene.appendChild(flat);

    return t => {
      // 液态层：静置期缓慢流动的渐变 + 高光微移
      const flow = t * 100;
      liquid.style.backgroundPosition = `${flow}% 0`;
      sheen.style.transform = `translateX(${lerp(t, -30, 30)}px)`;
      // 冲白瞬间给彩色层一帧过曝 blur
      const flashK = seg(t, 0.34, 0.42, E.inQuad);
      const blurPulse = Math.sin(seg(t, 0.34, 0.46) * Math.PI);
      liquid.style.filter = `blur(${blurPulse * 5}px) brightness(${1 + blurPulse * 1.2})`;
      sheen.style.opacity = 1 - flashK;
      // 白层 easeIn 冲入后保持
      white.style.opacity = flashK;
      // 扁平 logo：opacity 0→1 + scale 0.96→1，cubic ease-out
      const lk = seg(t, 0.48, 0.74, E.outCubic);
      flat.style.opacity = lk;
      flat.style.transform = `scale(${lerp(lk, 0.96, 1)})`;
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
