/* bezier-source-converge-merge — MotionLab 动效模板（Bezier Converge 多源曲线汇流吞并）
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
const SRC = 'x.com/Jerrythe2d';
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const TXT = '#111111';
const LINE = '#E6E6EA';
const ACCENT = '#3B82F6';
const ACCENT_WASH = 'rgba(59,130,246,.12)';
const el = (tag, css, parent, txt) => {
  const n = document.createElement(tag);
  if (css) n.style.cssText = css;
  if (txt != null) n.textContent = txt;
  if (parent) parent.appendChild(n);
  return n;
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const mkSheet = (stage, bg) => {
  const page = el('div', `position:absolute;inset:0;background:${bg || BG};overflow:hidden;
    font-family:${SANS};-webkit-font-smoothing:antialiased;`, stage);
  const inner = el('div', `position:absolute;left:50%;top:50%;width:440px;height:240px;
    margin:-120px 0 0 -220px;`, page);
  return inner;
};
const mkBadge = (parent, size, css) => {
  const b = el('div', `position:absolute;width:${size}px;height:${size}px;border-radius:50%;
    background:#fff;border:1px solid ${LINE};box-shadow:0 2px 10px rgba(0,0,0,.07);
    display:flex;align-items:center;justify-content:center;${css || ''}`, parent);
  b.innerHTML = `<svg width="${(size * 0.52).toFixed(1)}" height="${(size * 0.52).toFixed(1)}" viewBox="0 0 24 24">
    <path d="M12 0.8 L14.3 9.7 L23.2 12 L14.3 14.3 L12 23.2 L9.7 14.3 L0.8 12 L9.7 9.7 Z" fill="${TXT}"/></svg>`;
  return b;
};
const mkCaption = (parent, text, css, size) => {
  const row = el('div', `position:absolute;display:flex;align-items:baseline;white-space:nowrap;`
    + `${css || ''}`, parent);
  const words = text.split(' ').map((w, i) => el('span',
    `font:600 ${size || 12.5}px/1.25 ${SANS};color:${DIM};letter-spacing:-0.03em;
     margin-right:${i === text.split(' ').length - 1 ? 0 : 4.5}px;`, row, w));
  const n = words.length;
  const st = 0.78 / n, win = st * 1.5;
  return {
    row, words,
    /* p: 0..1 入场加深进度 */
    inn(p) {
      for (let i = 0; i < n; i++) {
        const q = clamp01((p - i * st) / win);
        words[i].style.color = mix(q, DIM, TXT);
        words[i].style.letterSpacing = (-0.03 * (1 - q)).toFixed(4) + 'em';
      }
    },
    /* q: 0..1 出场（逐词淡回浅灰 + 整行透明） */
    out(q) {
      const stw = 0.55 / n;
      for (let i = 0; i < n; i++) {
        const p = clamp01((q - i * stw) / (stw * 1.4));
        words[i].style.color = mix(1 - p, DIM, TXT);
      }
      row.style.opacity = clamp01(1 - (q - 0.7) / 0.3);
    },
    show(v) { row.style.opacity = v; },
  };
};

R({
  id: 'b09-bezier-source-converge-merge',
  title: 'Bezier Converge 多源曲线汇流吞并',
  src: SRC, cat: 'ui-entrance', dur: 5600,
  tags: ['stroke-dashoffset draw-on', 'getPointAtLength 沿路径', '被吸入式缩小'],
  desc: '左侧四个来源节点各由一条细黑贝塞尔曲线连向右侧同一汇聚点：曲线先由左向右 draw-on，节点沿自己的曲线滑向汇聚点并三段式加速缩小（56→18→0，像被吸进去），强调色数据包小圆持续沿路径滑行，吞并完成后曲线从左端反向擦除，只留圆形徽标。',
  setup(stage, { E, lerp, seg }) {
    const inner = mkSheet(stage);
    const XC = 332, YC = 120;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '440'); svg.setAttribute('height', '240');
    svg.setAttribute('viewBox', '0 0 440 240');
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    inner.appendChild(svg);

    /* 中性来源节点占位（灰阶分层，仅用于区分四路来源） */
    const SRCS = [
      { y: 36, tag: 'S1', c: '#111111' },
      { y: 92, tag: 'S2', c: '#4A4A50' },
      { y: 148, tag: 'S3', c: '#7A7A82' },
      { y: 204, tag: 'S4', c: '#A3A3AA' },
    ];
    const nodeLayer = el('div', 'position:absolute;left:0;top:0;width:440px;height:240px;', inner);
    const badge = mkBadge(inner, 34, `left:${XC - 17}px;top:${YC - 17}px;opacity:0;`);
    const endCap = mkCaption(inner, 'Four sources unified', `left:${XC - 60}px;top:${YC + 30}px;`, 12);
    endCap.show(0);

    const paths = SRCS.map((s, i) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M -22,${s.y} L 74,${s.y} C 186,${s.y} 214,${YC} ${XC},${YC}`);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', TXT);
      p.setAttribute('stroke-width', '1.2');
      svg.appendChild(p);
      // 来源节点圆
      const n = el('div', `position:absolute;left:0;top:0;border-radius:50%;background:#fff;
        border:1px solid ${LINE};box-shadow:0 3px 12px rgba(0,0,0,.08);
        display:flex;align-items:center;justify-content:center;font:700 11px/1 ${SANS};
        color:${s.c};letter-spacing:.3px;will-change:transform;`, nodeLayer, s.tag);
      // 数据包
      const pk = el('div', `position:absolute;left:0;top:0;width:7px;height:7px;border-radius:50%;
        border:1.5px solid ${ACCENT};background:${ACCENT_WASH};opacity:0;`, nodeLayer);
      return { el: p, node: n, pk: pk, len: 0, f0: 0.2 };
    });

    let ready = false;
    const prime = () => {
      paths.forEach(p => {
        p.len = p.el.getTotalLength() || 380;
        p.el.setAttribute('stroke-dasharray', p.len);
        // 求节点静止位置对应的路径 frac（x ≈ 74）
        let f = 0.2;
        for (let k = 1; k <= 40; k++) {
          const q = k / 40;
          if (p.el.getPointAtLength(p.len * q).x >= 74) { f = q; break; }
        }
        p.f0 = f;
      });
      ready = true;
    };

    return t => {
      if (!ready) prime();
      const conv = seg(t, 0.34, 0.74, E.inOutCubic);            // 汇聚主进度
      const erase = seg(t, 0.78, 0.9, E.outQuad);               // 从起点擦除
      const pkCycle = ((seg(t, 0.1, 0.74, E.linear) * 2) % 1);  // 数据包循环（t=1 时整数周期）

      paths.forEach((p, i) => {
        const draw = seg(t, 0.04 + i * 0.045, 0.04 + i * 0.045 + 0.17, E.outQuad);
        const off = erase > 0 ? -erase * p.len : p.len * (1 - draw);
        p.el.setAttribute('stroke-dashoffset', off.toFixed(1));
        p.el.setAttribute('opacity', (draw * (1 - clamp01((erase - 0.85) / 0.15))).toFixed(3));

        // 节点沿路径滑向汇聚点，三段式缩小
        const tt = conv;
        const frac = p.f0 + (1 - p.f0) * tt;
        const pt = p.el.getPointAtLength(p.len * frac);
        const size = tt < 0.75 ? lerp(tt / 0.75, 44, 15) : lerp((tt - 0.75) / 0.25, 15, 0);
        const appear = seg(t, 0.02 + i * 0.04, 0.02 + i * 0.04 + 0.1, E.outCubic);
        p.node.style.width = p.node.style.height = Math.max(0.1, size) + 'px';
        p.node.style.transform = `translate(${(pt.x - size / 2).toFixed(2)}px,${(pt.y - size / 2).toFixed(2)}px) scale(${appear.toFixed(3)})`;
        p.node.style.fontSize = Math.max(4, size * 0.26).toFixed(1) + 'px';
        p.node.style.opacity = (appear * (tt > 0.92 ? clamp01((1 - tt) / 0.08) : 1)).toFixed(3);

        // 数据包（相位偏移，恒定尺寸）
        const pf = p.f0 + (1 - p.f0) * ((pkCycle + i * 0.13) % 1);
        const q = p.el.getPointAtLength(p.len * pf);
        p.pk.style.transform = `translate(${(q.x - 3.5).toFixed(2)}px,${(q.y - 3.5).toFixed(2)}px)`;
        const pkOn = seg(t, 0.1, 0.16) * (1 - seg(t, 0.7, 0.76));
        p.pk.style.opacity = (pkOn * (1 - Math.abs(((pkCycle + i * 0.13) % 1) - 0.5) * 0.6)).toFixed(3);
      });

      const bp = seg(t, 0.16, 0.26, E.outCubic);
      badge.style.opacity = bp;
      badge.style.transform = `scale(${lerp(bp, 0.7, 1) * (1 + seg(t, 0.7, 0.78, E.outBack) * 0.12 - seg(t, 0.78, 0.86, E.outQuad) * 0.12)})`;
      endCap.show(seg(t, 0.84, 0.9));
      endCap.inn(seg(t, 0.84, 1));
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
