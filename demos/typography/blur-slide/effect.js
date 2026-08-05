/* blur-slide — MotionLab 动效模板（Blur Slide 逐词入场）
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
  id: 'b02-blur-slide', title: 'Blur Slide 逐词入场',
  src: 'remotion-bits.dev', cat: 'typography', dur: 3800,
  tags: ['split stagger', 'blur 通道'],
  desc: '标题逐词入场：y 40→0 + blur 10→0 + opacity 0→1，词间 stagger 极短（1 帧量级），easeOutCubic——y/blur/opacity 三通道同缓动同步收敛的"专业文字 reveal"。副标题随后同法跟进。',
  setup(stage, { E, lerp, seg }) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;inset:0;background:#0a0b10;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:16px;overflow:hidden;`;
    stage.appendChild(wrap);
    const mkLine = (text, css) => {
      const line = document.createElement('div');
      line.style.cssText = 'display:flex;gap:0.32em;' + css;
      wrap.appendChild(line);
      return text.split(' ').map(w => {
        const s = document.createElement('span');
        s.textContent = w;
        s.style.opacity = '0';
        line.appendChild(s);
        return s;
      });
    };
    // 占位文案：词数与字长贴近原稿，替换时保持 4 词 / 5 词以维持 stagger 节奏
    const h1 = mkLine('Your headline goes here',
      'font:800 34px/1.15 -apple-system,sans-serif;color:#eef1fa;letter-spacing:-0.5px;');
    const h2 = mkLine('Short supporting subtitle for placeholders',
      'font:400 14px/1.4 -apple-system,sans-serif;color:#7d86a3;');
    const apply = (spans, t0, gap, dy) => {
      spans.forEach((s, i) => {
        const p = seg(t0, i * gap, i * gap + 0.32, E.outCubic);
        s.style.opacity = p;
        s.style.transform = `translateY(${lerp(p, dy, 0)}px)`;
        s.style.filter = `blur(${(1 - p) * 10}px)`;
      });
    };
    return t => {
      apply(h1, seg(t, 0.06, 0.62), 0.055, 40);
      apply(h2, seg(t, 0.34, 0.9), 0.04, 26);
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
