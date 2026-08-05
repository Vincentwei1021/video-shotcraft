/* vertical-word-roll-blur-cycle — MotionLab 动效模板（Word Roll 竖向词条滚轮）
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
const clamp01 = v => Math.max(0, Math.min(1, v));
const ACCENT = '#4B4BF5';
const ACCENT_DIM = '#B9B9BE';
const mixHex = (a, b, k) => {
  k = clamp01(k);
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

R({
  id: 'b10-vertical-word-roll-blur-cycle',
  title: 'Word Roll 竖向词条滚轮',
  src: 'x.com/Jerrythe2d', cat: 'typography', dur: 5000,
  tags: ['相邻行方向 blur', 'outQuint+微过冲', '落定染色'],
  desc: '标语后半词用竖向滚轮循环 Apps→Teams→Data→Everyone：中心词清晰上色，相邻行浅灰带垂直 blur（滚轮景深），每步 outQuint 前快后慢带轻微过冲，落定瞬间中心词从灰染成强调色。',
  setup(stage, { E, seg }) {
    const bg = document.createElement('div');
    bg.style.cssText = `position:absolute;inset:0;background:#F7F7FA;display:flex;
      align-items:center;justify-content:center;font-family:-apple-system,system-ui,sans-serif`;
    stage.appendChild(bg);

    const ROW = 44;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:14px';
    bg.appendChild(row);
    const stat = document.createElement('div');
    stat.textContent = 'Built for';
    stat.style.cssText = 'font-size:30px;font-weight:800;color:#0B0B0C;letter-spacing:-.5px';
    row.appendChild(stat);
    const mask = document.createElement('div');
    mask.style.cssText = `position:relative;height:${ROW * 3}px;width:190px;overflow:hidden`;
    row.appendChild(mask);
    const reel = document.createElement('div');
    reel.style.cssText = 'position:absolute;left:0;top:0;will-change:transform';
    mask.appendChild(reel);
    const WORDS = ['Apps', 'Teams', 'Data', 'Everyone'];
    const items = WORDS.map(w => {
      const el = document.createElement('div');
      el.textContent = w;
      el.style.cssText = `height:${ROW}px;display:flex;align-items:center;
        font-size:30px;font-weight:800;letter-spacing:-.5px;will-change:filter`;
      reel.appendChild(el);
      return el;
    });

    // 3 次换词，每次 0.11（≈0.55s）
    const STEPS = [0.16, 0.36, 0.56];
    return t => {
      let p = 0;
      for (const s of STEPS) {
        const u = seg(t, s, s + 0.11);
        p += 0.7 * E.outQuint(u) + 0.3 * E.outBack(u); // 前快后极慢 + 轻微过冲回落
      }
      // reel 定位：中心行 = mask 第二行
      reel.style.transform = `translateY(${ROW - p * ROW}px)`;
      items.forEach((el, i) => {
        const d = Math.abs(i - p);
        const blur = d < 1 ? 3 * d : 3 + 2 * Math.min(d - 1, 1);
        const op = d < 1 ? 1 - 0.65 * d : Math.max(0.1, 0.35 - 0.23 * (d - 1));
        el.style.filter = `blur(${blur.toFixed(2)}px)`;
        el.style.opacity = op;
        // 落定染色：中心词灰→强调色（d 越小越彩）
        el.style.color = mixHex(ACCENT_DIM, ACCENT, clamp01(1 - d * 2.4));
      });
      // 结束整组淡出
      row.style.opacity = 1 - seg(t, 0.9, 0.985) * 0.999;
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
