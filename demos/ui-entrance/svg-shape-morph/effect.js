/* svg-shape-morph — MotionLab 动效模板（Shape Morph 轮廓变形）
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
  id: 'b23-svg-shape-morph',
  title: 'Shape Morph 轮廓变形',
  src: 'anime.js',
  cat: 'ui-entrance', dur: 5200,
  tags: ['等点数重采样', 'inOut + scale 呼吸'],
  desc: '一个 SVG 轮廓平滑变形为另一个再变回：两条闭合轮廓先重采样到相同点数（极坐标 140 点），逐点插值 + inOutCubic，变形中段加轻微 scale 呼吸与色相漂移，得到有机的流动感。',
  setup(stage, { E, lerp, seg }) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 480 270');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#0a0b10';
    stage.appendChild(svg);
    const g = document.createElementNS(NS, 'g');
    svg.appendChild(g);

    const CX = 240, CY = 138, N = 140, BASE = 76;
    // 两个形状：同一采样点数（等价 morphTo 的点数对齐）
    const rA = th => BASE * (1 + 0.30 * Math.cos(th * 3) + 0.05 * Math.sin(th * 7 + 0.8));
    const rB = th => BASE * (1 + 0.26 * Math.sin(th * 5 + 1.2) + 0.06 * Math.cos(th * 2));
    const radA = [], radB = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      radA.push(rA(th)); radB.push(rB(th));
    }

    const fill = document.createElementNS(NS, 'path');
    const line = document.createElementNS(NS, 'path');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linejoin', 'round');
    g.appendChild(fill); g.appendChild(line);

    const cap = document.createElementNS(NS, 'text');
    cap.setAttribute('x', CX); cap.setAttribute('y', 252);
    cap.setAttribute('text-anchor', 'middle');
    cap.setAttribute('fill', '#5b6480');
    cap.style.cssText = 'font:10px "SF Mono",Menlo,monospace;letter-spacing:2px';
    cap.textContent = 'morphTo(shapeB)';
    svg.appendChild(cap);

    const build = m => {
      let d = '';
      for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2;
        const r = lerp(m, radA[i], radB[i]);
        const x = (CX + Math.cos(th) * r).toFixed(1);
        const y = (CY + Math.sin(th) * r).toFixed(1);
        d += (i ? 'L' : 'M') + x + ',' + y;
      }
      return d + 'Z';
    };

    return t => {
      const m1 = seg(t, 0.08, 0.42, E.inOutCubic);   // A → B
      const m2 = seg(t, 0.58, 0.92, E.inOutCubic);   // B → A
      const m = m1 - m2;                              // 0=A 1=B
      const d = build(m);
      fill.setAttribute('d', d);
      line.setAttribute('d', d);
      const hue = lerp(m, 185, 305);
      line.setAttribute('stroke', `hsl(${hue},90%,66%)`);
      fill.setAttribute('fill', `hsla(${hue},80%,58%,.14)`);
      line.style.filter = `drop-shadow(0 0 8px hsla(${hue},90%,60%,.4))`;
      // 变形中段的 scale 呼吸 + 缓慢自转
      const breath = 1 + 0.045 * (Math.sin(m1 * Math.PI) + Math.sin(m2 * Math.PI));
      const rot = Math.sin(t * Math.PI * 2) * 4;
      g.setAttribute('transform', `translate(${CX},${CY}) scale(${breath}) rotate(${rot}) translate(${-CX},${-CY})`);
      cap.textContent = m > 0.5 ? 'morphTo(shapeB)' : 'morphTo(shapeA)';
      cap.setAttribute('opacity', 0.4 + 0.6 * Math.abs(m - 0.5) * 2);
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
