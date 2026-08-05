/* research-card-stack-scroll — MotionLab 动效模板（Research Stack 论文卡叠压滚流）
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
const SRC = 'x.com/tvnxty';
const ORANGE = '#FF6A1F';
const ORANGE_SOFT = '#FF8A44';
const INK = '#1A1A1A';
const FONT = '-apple-system,system-ui,"SF Pro Text","PingFang SC",sans-serif';
const div = (css, parent) => {
  const d = document.createElement('div');
  d.style.cssText = css;
  if (parent) parent.appendChild(d);
  return d;
};

R({
  id: 'b05-research-card-stack-scroll', title: 'Research Stack 论文卡叠压滚流',
  src: SRC, cat: 'ui-entrance', dur: 4800,
  tags: ['每 12 帧一张的紧密节奏', '落位 1 帧 squash', 'depth 递增 blur + brightness 衰减'],
  desc: '深色论文卡沿微微向右下的轴线连续飞入并叠压在中心：入场是 translateY(-40)+scale 0.94→1 的 6 帧短促 spring，落位带 1 帧压缩；只有最上一张全清晰渲染标题+作者+摘要，下方卡按 depth 递增 blur/变暗只露顶部标题条，背景浅灰横向 grid 同步移动做速度参照。',
  setup(stage, { E, lerp, seg }) {
    const W = stage.clientWidth || 520, H = stage.clientHeight || 292;
    const F = 144, fr = f => f / F, PER = 12, GAP = 30, XOFF = 9;
    stage.style.background = '#FAFAFA';
    const grid = div('position:absolute;inset:-40px;background-image:linear-gradient(rgba(0,0,0,.055) 1px,transparent 1px);' +
      'background-size:100% 24px;', stage);

    const LW = 420, LH = 250;
    const S = Math.min(W / LW, H / LH);
    const track = div('position:absolute;left:50%;top:50%;width:0;height:0;transform-origin:0 0;', stage);
    track.style.transform = `scale(${S})`;

    const TITLES = [
      'Sparse Attention Mechanisms for Long-Context Reasoning',
      'Retrieval Drift in Multi-Hop Agent Pipelines',
      'Latent Caching Reduces Tool-Call Latency by 41%',
      'On the Calibration of Preference Reward Models',
      'Grid-Aligned Motion Priors for UI Animation',
      'Cheap Verifiers Beat Expensive Samplers',
      'Structured Decoding Without Grammar Loss',
      'Depth-Ordered Compositing for Live Interfaces',
      'Token-Budget Routing in Agent Fleets',
      'Contrastive Layouts for Document Understanding',
      'Fast Approximate Re-Ranking at Query Time',
      'Signal Propagation in Deep Residual Agents',
      'A Note on Deterministic Replay of Motion',
    ];
    const CW = 296, CH = 96;
    const cards = TITLES.map((tt, i) => {
      const el = div(`position:absolute;left:${-CW / 2}px;top:${-CH / 2 - 14}px;width:${CW}px;height:${CH}px;` +
        `background:${INK};border-radius:11px;overflow:hidden;font-family:${FONT};z-index:${i};opacity:0;` +
        `box-shadow:0 14px 34px rgba(0,0,0,.22);border:1px solid #2A2A2A;box-sizing:border-box;`, track);
      div(`position:absolute;left:0;top:0;width:3px;height:100%;background:${i % 4 === 1 ? ORANGE : '#2E2E2E'};`, el);
      const title = div(`position:absolute;left:14px;top:11px;width:264px;font:650 9.5px/1.35 ${FONT};color:#F0F0F0;`, el);
      title.textContent = tt;
      const body = div('position:absolute;left:14px;top:40px;width:266px;', el);
      const auth = div(`font:500 8px/1 ${FONT};color:${ORANGE_SOFT};letter-spacing:.3px;`, body);
      auth.textContent = `A. Author, B. Writer, C. Reader · preprint:24${10 + i}.0${i % 9}${i % 7}`;
      for (let k = 0; k < 4; k++)
        div(`margin-top:${k ? 5 : 9}px;width:${100 - k * 11 - rand(i * 5 + k) * 12}%;height:4px;border-radius:2px;background:#3A3A3A;`, body);
      return { el, body, i };
    });

    return t => {
      const f = t * F;
      grid.style.transform = `translateY(${(f / PER * GAP * S) % 24}px)`;
      const focus = Math.floor(f / PER);
      cards.forEach(c => {
        const e = f - c.i * PER;
        const p = seg(Math.max(0, Math.min(1, (e + 6) / 6)), 0, 1, E.outCubic);
        const drift = Math.max(0, e) / PER * GAP;
        const squash = e >= 0 && e < 1.6 ? 0.97 : 1;
        const y = lerp(p, -40, 0) + drift;
        const x = Math.max(0, e) / PER * XOFF;
        const depth = Math.min(1, drift / (GAP * 3));
        c.el.style.opacity = e < -6 ? 0 : Math.min(1, (e + 6) / 2) * (1 - Math.max(0, (drift - GAP * 3.2) / (GAP * 1.6)));
        c.el.style.transform = `translate(${x}px,${y}px) scale(${lerp(p, 0.94, 1)},${lerp(p, 0.94, 1) * squash})`;
        c.el.style.filter = `blur(${(depth * 4).toFixed(2)}px) brightness(${(1 - depth * 0.25).toFixed(3)})`;
        c.body.style.opacity = c.i === focus ? 1 : 0;
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
