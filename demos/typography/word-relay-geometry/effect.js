/* word-relay-geometry — MotionLab 动效模板（Word Relay Geometry 利益词几何接力）
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
  id: 'b15-word-relay-geometry',
  title: 'Word Relay Geometry 利益词几何接力',
  src: 'x.com/bohdanmotion',
  cat: 'typography', dur: 6000,
  tags: ['path trim 生长', 'outline→fill', 'sheen 扫光', '微尘粒子'],
  desc: '三个利益词接力：Faster（虚线大圆）→ Better（三实线圆相扣）→ Stronger（金属 sheen 从左扫到右变纯白）。旧词与几何淡出缩小，新词描边→填充进场，圆路径带 trim 生长感；背景漂浮微尘粒子。',
  setup(stage, { E, lerp, seg }) {
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;inset:0;background:#07080c;overflow:hidden;';
    stage.appendChild(root);

    // 微尘粒子（预创建 20 个，缓慢上浮 loop）
    const parts = [];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      const s = 1 + rand(i * 3) * 1.4;
      p.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;
        background:#fff;left:${rand(i) * 100}%;`;
      root.appendChild(p);
      parts.push({ el: p, x: rand(i) * 100, ph: rand(i + 40), sp: 0.5 + rand(i + 80) * 0.8 });
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const CIRC_R = 78;

    // 每个词一个 scene：{ wrap, svg 几何, outline, fill 层 }
    const mkScene = (label, geom) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;inset:0;opacity:0;';
      root.appendChild(wrap);
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '-240 -135 480 270');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      wrap.appendChild(svg);
      const circles = [];
      for (const g of geom) {
        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('cx', g.x); c.setAttribute('cy', 0); c.setAttribute('r', g.r);
        c.setAttribute('fill', 'none');
        c.setAttribute('stroke', '#565e78');
        c.setAttribute('stroke-width', '1.1');
        if (g.dash) c.setAttribute('stroke-dasharray', '5 7');
        else {
          // trim 生长：pathLength 归一化
          c.setAttribute('pathLength', '1');
          c.setAttribute('stroke-dasharray', '1');
          c.setAttribute('stroke-dashoffset', '1');
        }
        c.setAttribute('transform', 'rotate(-90)');
        svg.appendChild(c);
        circles.push({ el: c, dash: !!g.dash, d: g.d || 0 });
      }
      const word = document.createElement('div');
      word.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);
        font-family:-apple-system,"Helvetica Neue",sans-serif;font-size:56px;font-weight:800;line-height:1;`;
      wrap.appendChild(word);
      const outline = document.createElement('div');
      outline.textContent = label;
      outline.style.cssText = 'color:transparent;-webkit-text-stroke:1px #6a7186;';
      const fill = document.createElement('div');
      fill.textContent = label;
      fill.style.cssText = 'position:absolute;inset:0;color:#fff;';
      word.appendChild(outline); word.appendChild(fill);
      return { wrap, word, circles, outline, fill };
    };

    const sFaster = mkScene('Faster', [{ x: 0, r: CIRC_R + 22, dash: true }]);
    const sBetter = mkScene('Better', [
      { x: -110, r: 62, d: 0 }, { x: 0, r: 62, d: 0.06 }, { x: 110, r: 62, d: 0.12 },
    ]);
    const sStronger = mkScene('Stronger', []);
    // Stronger 的 sheen 层：金属渐变 background-clip
    const sheen = document.createElement('div');
    sheen.textContent = 'Stronger';
    sheen.style.cssText = `position:absolute;inset:0;color:transparent;
      background-image:linear-gradient(100deg,#585f72 0%,#8d95aa 38%,#ffffff 50%,#8d95aa 62%,#585f72 100%);
      background-size:280% 100%;-webkit-background-clip:text;background-clip:text;`;
    sStronger.word.appendChild(sheen);

    // 时段划分：每词 in(0.07) + hold + out(0.07)
    const SLOTS = [
      { s: sFaster, t0: 0.0, t1: 0.36 },
      { s: sBetter, t0: 0.32, t1: 0.68 },
      { s: sStronger, t0: 0.64, t1: 1.0 },
    ];

    return t => {
      // 粒子上浮
      for (const p of parts) {
        const y = (1 - ((t * p.sp + p.ph) % 1)) * 110 - 5;
        p.el.style.top = `${y}%`;
        p.el.style.opacity = 0.12 + 0.18 * Math.sin((t * 3 + p.ph) * Math.PI * 2) ** 2;
      }

      for (let i = 0; i < SLOTS.length; i++) {
        const { s, t0, t1 } = SLOTS[i];
        const isLast = i === SLOTS.length - 1;
        const tin = seg(t, t0, t0 + 0.07, E.outCubic);
        const tout = isLast ? 0 : seg(t, t1 - 0.05, t1, E.inQuad);
        const alive = tin > 0 && tout < 1;
        s.wrap.style.opacity = alive ? tin * (1 - tout) : 0;
        if (!alive) continue;
        // 出场：整体缩小淡出
        s.word.style.transform = `translate(-50%,-52%) scale(${lerp(tout, 1, 0.86)})`;
        // 几何 trim 生长 / 反向消隐
        for (const c of s.circles) {
          if (c.dash) {
            const grow = seg(t, t0 + 0.01, t0 + 0.14, E.outCubic);
            c.el.setAttribute('opacity', grow * (1 - tout));
            c.el.setAttribute('transform', `rotate(${-90 + t * 30}) scale(${lerp(grow, 0.4, 1)})`);
          } else {
            const trim = seg(t, t0 + 0.02 + c.d, t0 + 0.14 + c.d, E.outCubic)
                       - seg(t, t1 - 0.06, t1, E.inQuad) * (isLast ? 0 : 1);
            c.el.setAttribute('stroke-dashoffset', 1 - Math.max(0, trim));
          }
        }
        // outline→fill（Stronger 走 sheen 路线）
        if (s === sStronger) {
          const sh = seg(t, t0 + 0.05, t0 + 0.2, E.outQuad); // 出现（描边→sheen）
          const sweep = seg(t, t0 + 0.08, t0 + 0.26, E.inOutCubic); // 扫光位置
          const white = seg(t, t0 + 0.27, t0 + 0.34, E.outQuad); // 收为纯白
          s.outline.style.opacity = 1 - sh;
          sheen.style.opacity = sh * (1 - white);
          sheen.style.backgroundPosition = `${lerp(sweep, 100, 0)}% 0`;
          s.fill.style.opacity = white;
          s.fill.style.textShadow = `0 0 ${white * 18}px rgba(255,255,255,.3)`;
        } else {
          const fillp = seg(t, t0 + 0.06, t0 + 0.18, E.inOutCubic);
          s.fill.style.clipPath = `inset(-20% ${(1 - fillp) * 100}% -20% 0)`;
          s.outline.style.opacity = 1 - fillp * 0.75;
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
