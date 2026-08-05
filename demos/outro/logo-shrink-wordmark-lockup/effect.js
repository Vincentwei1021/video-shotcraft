/* logo-shrink-wordmark-lockup — MotionLab 动效模板（Shrink & Lockup 图标收束落位）
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
const NS = 'http://www.w3.org/2000/svg';
const ACCENT = '#e0342c';
const WORDMARK = 'BRAND';
const arcPath = (cx, cy, r, a0, a1) => {
  const p = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
};

R({
  id: 'b28-logo-shrink-wordmark-lockup',
  title: 'Shrink & Lockup 图标收束落位',
  src: '抖音 观机社', cat: 'outro', dur: 4400,
  tags: ['scale 回弹刹车', '字母 stagger'],
  desc: '霓虹切口大环 easeInOut 快速缩成中央实心小白 O（抽象几何 mark，末尾轻微过冲刹车），随后图标左移让位，五个字母从左到右逐个 opacity+8px 滑入完成 lockup，强调色标语延迟整行淡入收尾。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:#05060a;overflow:hidden';
    stage.appendChild(scene);

    // 图标：SVG 双弧切口环 —— 抽象几何 mark，非任何具体品牌 logo（收束时缺口愈合、霓虹转纯白）
    const ICON = 30; // 图标基准尺寸(px)
    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = `position:absolute;left:50%;top:50%;width:${ICON}px;height:${ICON}px;
      margin:${-ICON / 2}px 0 0 ${-ICON / 2}px;`;
    scene.appendChild(iconWrap);
    const isvg = document.createElementNS(NS, 'svg');
    isvg.setAttribute('viewBox', '0 0 30 30');
    isvg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
    iconWrap.appendChild(isvg);
    const mkArcs = (a0, a1, col, w, blur) => {
      const g = document.createElementNS(NS, 'g');
      for (const [b0, b1] of [[a0, a1], [a0 + 180, a1 + 180]]) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', arcPath(15, 15, 10.5, b0, b1));
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', col);
        p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round');
        if (blur) p.style.filter = `blur(${blur}px)`;
        g.appendChild(p);
      }
      isvg.appendChild(g);
      return g;
    };
    const neonGlow = mkArcs(-32, 122, 'rgba(110,90,255,.6)', 6.5, 2.5); // 霓虹晕（带缺口）
    const neonCore = mkArcs(-32, 122, '#dfe9ff', 3.4, 0);
    const solidO = document.createElementNS(NS, 'circle'); // 愈合后的实心白 O
    solidO.setAttribute('cx', 15); solidO.setAttribute('cy', 15); solidO.setAttribute('r', 10.5);
    solidO.setAttribute('fill', 'none'); solidO.setAttribute('stroke', '#fff');
    solidO.setAttribute('stroke-width', 5.5);
    isvg.appendChild(solidO);

    // 字母行（图标右侧）
    const WORD = WORDMARK;
    const letters = [];
    const row = document.createElement('div');
    row.style.cssText = `position:absolute;left:calc(50% - 40px);top:50%;height:${ICON}px;margin-top:${-ICON / 2}px;
      display:flex;align-items:center;gap:2px;`;
    scene.appendChild(row);
    for (const ch of WORD) {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.cssText = `color:#f2f5fa;font:800 27px/1 -apple-system,'Helvetica Neue',sans-serif;
        letter-spacing:2px;opacity:0;`;
      row.appendChild(s);
      letters.push(s);
    }
    // 强调色标语（占位文案，字符数与原片近似）
    const slogan = document.createElement('div');
    slogan.textContent = 'BUILD. SHIP. REPEAT.';
    slogan.style.cssText = `position:absolute;left:0;right:0;top:calc(50% + 34px);text-align:center;
      color:${ACCENT};font:600 13px/1 -apple-system,sans-serif;letter-spacing:5px;opacity:0;`;
    scene.appendChild(slogan);

    const SHIFT = -68; // 图标 lockup 左位偏移

    return t => {
      // 收束：scale 5.4→1（easeInOut），末尾轻微 1.05 过冲刹车
      const k = seg(t, 0.02, 0.28, E.inOutCubic);
      const brake = Math.sin(seg(t, 0.26, 0.37) * Math.PI) * 0.06;
      const s = lerp(k, 5.4, 1) * (1 + brake);
      // 左移让位：落位后 t 0.34-0.47
      const shift = seg(t, 0.34, 0.47, E.inOutCubic) * SHIFT;
      iconWrap.style.transform = `translateX(${shift}px) scale(${s})`;
      // 霓虹缺口态 → 实心白 O 交叉淡化（随收束进行）
      const heal = seg(t, 0.10, 0.28, E.inOutQuad);
      neonGlow.setAttribute('opacity', (1 - heal));
      neonCore.setAttribute('opacity', (1 - heal * 0.75));
      neonCore.setAttribute('stroke', heal > 0.5 ? '#fff' : '#dfe9ff');
      solidO.setAttribute('opacity', heal);

      // 字母从左到右 stagger：opacity 0→1 + translateX 8px→0
      letters.forEach((el, i) => {
        const lk = seg(t, 0.46 + i * 0.035, 0.46 + i * 0.035 + 0.10, E.outCubic);
        el.style.opacity = lk;
        el.style.transform = `translateX(${lerp(lk, 8, 0)}px)`;
      });
      // 标语延迟整行淡入
      slogan.style.opacity = seg(t, 0.72, 0.84, E.outQuad);
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
