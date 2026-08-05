/* brace-expand — MotionLab 动效模板（Brace Expand Reveal 括号拉幕）
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
const SRC = 'x.com/amirdzm';

R({
  id: 'b27-brace-expand', title: 'Brace Expand Reveal 括号拉幕',
  src: SRC, cat: 'typography', dur: 3800,
  tags: ['spring 过冲', 'clip 绑定括号间距'],
  desc: '一对紧贴的花括号先小字号出现在正中，随即带过冲地向左右滑开并放大到标题级，文字像被括号拉开幕布般在中间揭示（clip 宽度跟随括号位置），落定后字距再细微松弛。',
  setup(stage, { E, lerp, seg }) {
    stage.style.background = '#0a0b10';
    const FONT = '-apple-system,system-ui,sans-serif';
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;';
    stage.appendChild(root);
    const mkBrace = ch => {
      const b = document.createElement('div');
      b.textContent = ch;
      b.style.cssText = `position:absolute;left:0;top:0;font:800 44px ${FONT};color:#fff;` +
        'transform:translate(-50%,-50%);will-change:transform;';
      root.appendChild(b);
      return b;
    };
    const clip = document.createElement('div');
    clip.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);' +
      'overflow:hidden;height:60px;display:flex;align-items:center;justify-content:center;';
    root.appendChild(clip);
    const word = document.createElement('div');
    word.textContent = 'Your title';
    word.style.cssText = `font:800 38px ${FONT};color:#fff;white-space:nowrap;letter-spacing:1px;`;
    clip.appendChild(word);
    const bl = mkBrace('{'), br = mkBrace('}');
    const HALF = 148; // 括号最终半距
    return t => {
      const on = t >= 0.07 ? 1 : 0;               // 先单独出现（小字号，约 2 帧后再动）
      const ex = seg(t, 0.13, 0.34, E.outBack);   // 弹开：过冲约 8% 再回弹
      const sc = lerp(ex, 0.6, 1);                // 字号同步放大到标题级
      const x = HALF * ex * sc;
      bl.style.transform = `translate(-50%,-50%) translateX(${-x}px) scale(${sc})`;
      br.style.transform = `translate(-50%,-50%) translateX(${x}px) scale(${sc})`;
      bl.style.opacity = br.style.opacity = on;
      // 文字揭示宽度严格绑括号间距（幕布感，而非打字）
      clip.style.width = `${Math.max(0, x * 2 - 34)}px`;
      word.style.transform = `scale(${sc})`;
      clip.style.opacity = on;
      // 落定后 letterspacing 细微松弛
      word.style.letterSpacing = `${lerp(seg(t, 0.42, 0.62, E.inOutQuad), 1, 2.6)}px`;
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
