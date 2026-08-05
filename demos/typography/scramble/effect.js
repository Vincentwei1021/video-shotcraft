/* scramble — MotionLab 动效模板（Scramble Decode 乱码锁定）
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
  id: 'scramble', title: 'Scramble Decode 乱码锁定',
  src: 'anime.js / remotion-bits', cat: 'typography', dur: 3200,
  tags: ['等宽字体', '逐字锁定'],
  desc: '每个字符先高速随机跳字（种子驱动、可复现），再从左到右逐个"锁定"为真字符，锁定瞬间闪一下高亮。与 typewriter-moves 的顺序打字是完全不同的质感——黑客/解密感。',
  setup(stage, { seg }) {
    const TEXT = 'TEMPLATE MOTION DEMO';
    const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\';
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;
      justify-content:center;background:#07080c;font-family:"SF Mono",Menlo,monospace;
      font-size:34px;letter-spacing:2px;`;
    stage.appendChild(wrap);
    const spans = [...TEXT].map((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.cssText = 'min-width:0.62em;text-align:center;color:#3d4560';
      wrap.appendChild(s);
      return { el: s, ch, i };
    });
    return t => {
      const frame = Math.floor(t * 96);
      for (const { el, ch, i } of spans) {
        if (ch === ' ') continue;
        const lockAt = 0.25 + (i / spans.length) * 0.6 + rand(i * 7) * 0.06;
        if (t < 0.06) { el.textContent = ' '; continue; }
        if (t < lockAt) {
          el.textContent = POOL[Math.floor(rand(i * 131 + Math.floor(frame / 2)) * POOL.length)];
          el.style.color = '#3d4560';
          el.style.textShadow = 'none';
        } else {
          el.textContent = ch;
          const flash = 1 - seg(t, lockAt, lockAt + 0.1);
          el.style.color = flash > 0.4 ? '#dff3ff' : '#e8eaf0';
          el.style.textShadow = `0 0 ${flash * 18}px rgba(120,200,255,${flash})`;
        }
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
