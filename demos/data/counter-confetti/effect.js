/* counter-confetti — MotionLab 动效模板（Counter Confetti 数字冲刺纸屑）
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
  id: 'b01-counter-confetti', title: 'Counter Confetti 数字冲刺纸屑',
  src: 'remotion-bits.dev', cat: 'data', dur: 4600,
  tags: ['easeOutQuart 计数', 'scale 过冲', '抢拍 5 帧粒子'],
  desc: '大数字 0 → 1000 用 easeOutQuart 冲刺，scale 走 [0.2,1.3,1.3,1] 过冲；数字到位前 5 帧就从两侧 burst 出 8 色纸屑，带重力下落与自转飘散。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:radial-gradient(80% 80% at 50% 45%,#161a2b,#07080e 75%);overflow:hidden';
    stage.appendChild(scene);

    const glow = document.createElement('div');
    glow.style.cssText = `position:absolute;left:50%;top:47%;width:340px;height:340px;margin:-170px;
      border-radius:50%;background:radial-gradient(circle,rgba(120,160,255,.28),transparent 66%);opacity:0`;
    scene.appendChild(glow);

    const numWrap = document.createElement('div');
    numWrap.style.cssText = 'position:absolute;left:50%;top:47%;transform-origin:50% 50%';
    scene.appendChild(numWrap);
    const num = document.createElement('div');
    num.textContent = '0';
    num.style.cssText = `position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;
      font:800 74px/1 -apple-system,'Segoe UI',sans-serif;letter-spacing:-2px;
      background:linear-gradient(180deg,#ffffff,#a9bcff);-webkit-background-clip:text;
      background-clip:text;color:transparent;text-shadow:0 0 34px rgba(130,160,255,.28)`;
    numWrap.appendChild(num);
    const label = document.createElement('div');
    label.textContent = 'METRIC THIS WEEK';
    label.style.cssText = `position:absolute;left:50%;top:70%;transform:translate(-50%,0);opacity:0;
      font:700 10px/1 -apple-system,sans-serif;letter-spacing:5px;color:#7d88a8`;
    scene.appendChild(label);

    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:50%;top:47%;width:120px;height:120px;margin:-60px;
      border-radius:50%;border:2px solid rgba(160,190,255,.8);opacity:0`;
    scene.appendChild(ring);

    const PAL = ['#ff6b8b', '#ffb347', '#ffe86b', '#7bff9e', '#5fd8ff', '#6c8cff', '#c86cff', '#ff6cf0'];
    const BURST = 0.52;                                     // 计数到位(0.56)前"抢拍"
    const bits = [];
    for (let i = 0; i < 52; i++) {
      const el = document.createElement('div');
      const isRect = rand(i * 3) > 0.4;
      const w = 5 + rand(i + 2) * 6, h = isRect ? 8 + rand(i + 5) * 7 : w;
      el.style.cssText = `position:absolute;left:50%;top:50%;width:${w}px;height:${h}px;
        background:${PAL[i % 8]};border-radius:${isRect ? '2px' : '50%'};opacity:0;will-change:transform`;
      scene.appendChild(el);
      const side = i % 2 ? 1 : -1;
      bits.push({
        el,
        x0: side * 250, y0: (rand(i + 30) - 0.5) * 60,       // 从画面两侧出发（px，相对中心）
        vx: -side * (150 + rand(i * 5 + 1) * 300),           // 向画面中间冲
        vy: -(230 + rand(i * 7 + 3) * 220),
        g: 900 + rand(i + 60) * 520,
        spin: (rand(i + 90) - 0.5) * 1500,
        d: rand(i + 120) * 0.06,                            // 每片略微错峰
      });
    }

    const oc = t => 1 - Math.pow(1 - t, 4);                  // easeOutQuart
    return t => {
      // 计数
      const p = seg(t, 0.06, 0.56, oc);
      const val = Math.round(p * 1000);
      num.textContent = val.toLocaleString('en-US');
      // scale 过冲 [0.2,1.3,1.3,1]
      const s1 = seg(t, 0.06, 0.30, E.outCubic);
      const s2 = seg(t, 0.56, 0.72, E.outBack);
      const sc = lerp(s1, 0.2, 1.3) + s2 * (1 - 1.3);
      numWrap.style.transform = `scale(${sc})`;
      num.style.opacity = Math.min(1, seg(t, 0.02, 0.12) * 1.2);
      glow.style.opacity = 0.35 + seg(t, 0.5, 0.62, E.outCubic) * 0.65 - seg(t, 0.72, 1) * 0.5;

      // 到位冲击环
      const rp = seg(t, 0.545, 0.75, E.outQuart);
      ring.style.opacity = rp > 0 ? (1 - rp) * 0.9 : 0;
      ring.style.transform = `scale(${0.35 + rp * 2.6})`;
      label.style.opacity = seg(t, 0.62, 0.78, E.outCubic);
      label.style.letterSpacing = lerp(seg(t, 0.62, 0.82, E.outCubic), 11, 5) + 'px';

      // 纸屑：抢拍 burst + 重力下落 + 自转
      for (let i = 0; i < bits.length; i++) {
        const b = bits[i];
        const u = seg(t, BURST + b.d, 1);
        const life = u * 1.1;                               // 秒级时间尺度
        const x = b.x0 + b.vx * life;
        const y = b.y0 + b.vy * life + 0.5 * b.g * life * life;
        b.el.style.opacity = u <= 0 ? 0 : Math.min(1, u * 8) * (1 - seg(u, 0.74, 1) * 0.95);
        b.el.style.transform =
          `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotate(${b.spin * life}deg) scale(${0.8 + (1 - u) * 0.35})`;
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
