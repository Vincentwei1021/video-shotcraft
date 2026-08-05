/* glitch-cycle — MotionLab 动效模板（Glitch Cycle 乱码轮播）
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
  id: 'b03-glitch-cycle', title: 'Glitch Cycle 乱码轮播',
  src: 'remotion-bits.dev', cat: 'typography', dur: 5600,
  tags: ['glitch 概率脉冲', '状态轮播'],
  desc: '同一位置循环轮播状态短语，每条短语头尾乱码、中段偶发轻微抖动（glitch 概率关键帧 [1,0,0,0.1,0,0,1]），切换瞬间伴随 RGB 分离与位移抖动。',
  setup(stage, { E, lerp, seg }) {
    const PHRASES = ['INITIALIZING', 'LOADING ASSETS', 'COMPILING SHADERS', 'READY TO SHIP'];
    const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&<>/\\';
    // glitch 概率关键帧 [1,0,0,0.1,0,0,1]（最后一条结尾收为 0，保证 t=1 画面干净）
    const KF = [1, 0, 0, 0.1, 0, 0, 1];
    const KF_LAST = [1, 0, 0, 0.1, 0, 0, 0];
    const glitchAt = (kf, p) => {
      const segs = kf.length - 1;
      const x = Math.min(segs - 1e-6, Math.max(0, p * segs));
      const i = Math.floor(x);
      return lerp(x - i, kf[i], kf[i + 1]);
    };
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;
      justify-content:center;background:#0a0b10;`;
    stage.appendChild(wrap);
    const line = document.createElement('div');
    line.style.cssText = `display:flex;font-family:"SF Mono",Menlo,monospace;font-size:26px;
      letter-spacing:3px;color:#dfe6f5;`;
    wrap.appendChild(line);
    const MAXCH = Math.max(...PHRASES.map(p => p.length));
    const spans = [];
    for (let i = 0; i < MAXCH; i++) {
      const s = document.createElement('span');
      s.style.cssText = 'min-width:0.66em;text-align:center;';
      line.appendChild(s);
      spans.push(s);
    }
    const bar = document.createElement('div');
    bar.style.cssText = `position:absolute;left:50%;top:63%;width:120px;height:2px;margin-left:-60px;
      background:#232840;border-radius:1px;overflow:hidden;`;
    const barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;width:0%;background:#6c8cff;';
    bar.appendChild(barFill);
    stage.appendChild(bar);
    return t => {
      const N = PHRASES.length;
      const slot = Math.min(N - 1, Math.floor(t * N));
      const p = t * N - slot;                       // 短语内进度 0..1
      const text = PHRASES[slot];
      const g = glitchAt(slot === N - 1 ? KF_LAST : KF, p);
      const frame = Math.floor(t * 168);
      const bucket = Math.floor(frame / 2);
      for (let i = 0; i < MAXCH; i++) {
        const s = spans[i];
        const ch = i < text.length ? text[i] : ' ';
        if (ch === ' ') { s.textContent = ' '; s.style.color = ''; continue; }
        const hit = rand(i * 31 + bucket * 17 + slot * 97) < g;
        if (hit) {
          s.textContent = POOL[Math.floor(rand(i * 131 + bucket * 7 + slot * 13) * POOL.length)];
          s.style.color = rand(i + bucket) > 0.5 ? '#6c8cff' : '#4a5270';
        } else {
          s.textContent = ch;
          s.style.color = '#dfe6f5';
        }
      }
      // 整行抖动 + RGB 分离，强度跟随 glitch 概率
      const jx = (rand(bucket * 5 + slot) - 0.5) * g * 10;
      const jy = (rand(bucket * 9 + slot + 40) - 0.5) * g * 4;
      line.style.transform = `translate(${jx}px,${jy}px)`;
      line.style.textShadow = g > 0.04
        ? `${g * 3}px 0 rgba(255,60,90,${g * 0.8}), ${-g * 3}px 0 rgba(60,220,255,${g * 0.8})`
        : 'none';
      barFill.style.width = `${t * 100}%`;
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
