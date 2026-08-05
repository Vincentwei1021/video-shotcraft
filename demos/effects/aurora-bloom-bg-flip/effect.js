/* aurora-bloom-bg-flip — MotionLab 动效模板（Aurora Bloom 极光升腾底色反转）
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
const SRC = 'x.com/aizal_mp4';
const mix = (a, b, k) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
const PURPLE = [185, 164, 232], DEEPP = [124, 92, 255], INK = [26, 26, 26], WHITE = [245, 245, 250];
const makeWords = (parent, text, css) => text.split(' ').map(w => {
  const s = document.createElement('span');
  s.textContent = w;
  s.style.cssText = `display:inline-block;margin:0 .18em;will-change:filter,opacity;${css || ''}`;
  parent.appendChild(s);
  return s;
});

R({
  id: 'b17-aurora-bloom-bg-flip',
  title: 'Aurora Bloom 极光升腾底色反转',
  src: SRC, cat: 'effects', dur: 5200,
  tags: ['大半径 blur blob', '0.35s 呼吸重音'],
  desc: '浅灰底从底部升起紫橙柔焦 blob，随后整个底色 0.35s 内压暗到近黑、blob 压成余晖；文案同步 blur-out → 换句 blur-in（强调色→白收色），换句间留空档不 cross-fade。文案为中性占位；blob/文字的紫橙是这个效果本体的光色（DEEPP/PURPLE 常量），落地时可整组换成项目色。',
  setup(stage, { E, seg, lerp }) {
    const bg = document.createElement('div');
    bg.style.cssText = 'position:absolute;inset:0;background:#ececec;overflow:hidden;';
    stage.appendChild(bg);
    const blobWrap = document.createElement('div');
    blobWrap.style.cssText = 'position:absolute;inset:-10%;will-change:transform,opacity;';
    bg.appendChild(blobWrap);
    const mkBlob = (css) => {
      const b = document.createElement('div');
      b.style.cssText = `position:absolute;border-radius:50%;filter:blur(60px);will-change:transform;${css}`;
      blobWrap.appendChild(b);
      return b;
    };
    const blobA = mkBlob('left:8%;bottom:-45%;width:90%;height:85%;background:radial-gradient(circle,rgba(107,79,224,.85) 0%,rgba(107,79,224,0) 68%);');
    const blobB = mkBlob('left:32%;bottom:-32%;width:44%;height:46%;background:radial-gradient(circle,rgba(217,122,74,.9) 0%,rgba(217,122,74,0) 66%);');
    const blobC = mkBlob('left:-12%;bottom:-40%;width:64%;height:60%;background:radial-gradient(circle,rgba(255,255,255,.8) 0%,rgba(255,255,255,0) 62%);');
    const line = document.createElement('div');
    line.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      font:600 26px -apple-system,system-ui,sans-serif;`;
    bg.appendChild(line);
    const la = document.createElement('div'); la.style.cssText = 'position:absolute;';
    const lb = document.createElement('div'); lb.style.cssText = 'position:absolute;';
    line.appendChild(la); line.appendChild(lb);
    // 占位文案（词数/字长贴近原片，逐词错相节奏依赖这个）
    const wa = makeWords(la, 'For many years', 'color:#1a1a1a');
    const wb = makeWords(lb, 'everything changed');
    const LIGHT = [236, 236, 236], DARK = [10, 10, 18];
    return t => {
      // blob 升起 + 放大
      const rise = seg(t, 0.04, 0.62, E.outCubic);
      const flip = seg(t, 0.63, 0.70, E.inOutQuad);      // 快速压暗，故意只 ~0.35s
      blobWrap.style.transform = `translateY(${lerp(rise, 32, -6)}%) scale(${lerp(rise, 1, 1.25)})`;
      blobWrap.style.opacity = lerp(flip, 1, 0.4);
      // 橙色核心横向慢漂
      blobB.style.transform = `translateX(${Math.sin(t * Math.PI * 2.2) * 8}%)`;
      blobC.style.opacity = 1 - flip;                     // 白色融边在暗场里收掉
      bg.style.background = mix(LIGHT, DARK, flip);
      // 文案 A：blob 上升期 blur-out
      wa.forEach((w, i) => {
        const out = seg(t, 0.46 + i * 0.04, 0.56 + i * 0.04, E.inQuad);
        w.style.opacity = 1 - out;
        w.style.filter = `blur(${out * 8}px)`;
      });
      // 空档后文案 B：逐词 blur-in + 紫→白收色
      wb.forEach((w, i) => {
        const d0 = 0.76 + i * 0.06;
        const a = seg(t, d0, d0 + 0.11, E.outQuint);
        const c = seg(t, d0 + 0.10, d0 + 0.26, E.outQuad);
        w.style.opacity = a;
        w.style.filter = `blur(${(1 - a) * 8}px)`;
        w.style.color = mix(DEEPP, WHITE, c);
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
