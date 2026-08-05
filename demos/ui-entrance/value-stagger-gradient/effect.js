/* value-stagger-gradient — MotionLab 动效模板（Value Stagger 数值梯度）
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
  id: 'b23-value-stagger-gradient',
  title: 'Value Stagger 数值梯度',
  src: 'anime.js',
  cat: 'ui-entrance', dur: 5000,
  tags: ['数值梯度铺开', "from:'center'", '双轴叠加'],
  desc: 'stagger 不只错开时间，还把属性值在 N 个元素上铺成梯度：16 根柱入场时 delay=stagger(时间)，同时高度/色相/模糊都是 stagger([from,to]) 的数值梯度；第二拍换 from:"center"，脉冲幅度以中心为原点重新铺开。',
  setup(stage, { E, lerp, seg }) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;background:#0a0b10;overflow:hidden;font-family:"SF Mono",Menlo,monospace';
    stage.appendChild(wrap);

    const cap = document.createElement('div');
    cap.style.cssText = 'position:absolute;left:50%;top:9%;transform:translateX(-50%);color:#5b6480;font-size:10px;letter-spacing:1.5px;white-space:nowrap';
    cap.textContent = "scale: stagger([1, 0.35])  hue: stagger([200, 320])";
    wrap.appendChild(cap);

    // 数值梯度 util（等价 stagger([a,b]) 的 value 模式）
    const staggerVal = (i, n, a, b, ease) => {
      let k = n <= 1 ? 0 : i / (n - 1);
      if (ease) k = ease(k);
      return lerp(k, a, b);
    };

    const N = 16, C = (N - 1) / 2, bars = [];
    for (let i = 0; i < N; i++) {
      const bar = document.createElement('div');
      const hue = staggerVal(i, N, 200, 320);          // 数值梯度：色相铺开
      const hMax = staggerVal(i, N, 92, 32);           // 数值梯度：高度 1→0.35
      bar.style.cssText = `position:absolute;bottom:22%;left:${8 + i * 5.4}%;width:3.4%;
        height:${hMax}px;border-radius:5px;transform-origin:50% 100%;
        background:linear-gradient(180deg,hsl(${hue},85%,66%),hsl(${hue},70%,42%));
        box-shadow:0 0 12px hsla(${hue},85%,58%,.25);opacity:0`;
      wrap.appendChild(bar);
      const dot = document.createElement('div');
      dot.style.cssText = `position:absolute;bottom:17%;left:${8 + i * 5.4 + 1.2}%;width:4px;height:4px;
        border-radius:50%;background:hsl(${hue},70%,55%);opacity:.35`;
      wrap.appendChild(dot);
      bars.push({ bar, i, distC: Math.abs(i - C) / C });
    }

    return t => {
      for (const { bar, i, distC } of bars) {
        // 拍一：时间 stagger（linear from first）× 数值梯度（y/blur 同时铺开）
        const d = i * 0.02;
        const e = seg(t, 0.06 + d, 0.28 + d, E.outCubic);
        const y0 = staggerVal(i, N, 46, 14);           // 位移量本身也是梯度
        const b0 = staggerVal(i, N, 8, 2);             // 模糊量梯度
        // 拍二：from:'center' —— 波与幅度都以中心为原点铺开
        const w = seg(t, 0.56 + distC * 0.13, 0.74 + distC * 0.13);
        const pulse = Math.sin(w * Math.PI);
        const amp = lerp(1 - distC, 0.06, 0.42);       // 幅度梯度：中心最大
        bar.style.opacity = e;
        bar.style.filter = `blur(${(1 - e) * b0}px) brightness(${1 + pulse * 0.55})`;
        bar.style.transform = `translateY(${(1 - e) * y0}px) scaleY(${e * (1 + pulse * amp)})`;
      }
      cap.textContent = t < 0.52
        ? "scale: stagger([1, 0.35])  hue: stagger([200, 320])"
        : "pulse: stagger([.06, .42], { from: 'center' })";
      cap.style.opacity = 0.5 + 0.5 * seg(t, 0.04, 0.12);
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
