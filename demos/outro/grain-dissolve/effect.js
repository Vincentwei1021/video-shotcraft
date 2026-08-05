/* grain-dissolve — MotionLab 动效模板（Grain Dissolve → Condense 文字砂化凝聚）
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
  id: 'grain-dissolve', title: 'Grain Dissolve → Condense 文字砂化凝聚',
  src: 'x.com/amirdzm', cat: 'outro', dur: 2000,
  tags: ['feTurbulence + displacement', '能量聚合叙事'],
  desc: '干净的整行字 "{ ACME. Now Live }" 先爆裂成沸腾颗粒噪点（轮廓隐约可辨、白色辉光），同时出现带 45° 斜纹填充和像素方块角柄的选区框；噪点沸腾约半程后选区框消失，噪点云急速凝聚成更大号的颗粒短字标（占位词 "ACME"，可换成项目自己的短标），位移量衰减归零、辉光冲高回落，凝固为清晰发光短字标。四角 HUD 括角/圆点与左右中线短划全程常驻。滤镜链：feTurbulence seed 逐帧 + displacement scale 双向动画，终字同走滤镜再解除。',
  setup(stage, { E, seg }) {
    const svgNS = 'http://www.w3.org/2000/svg';
    let __gdSeq = 0;
    const uid = 'gd' + (__gdSeq++);
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 640 360');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#0a0a0c';
    // 选区框：斜纹填充 + 四角像素棋盘手柄
    const bx = 128, by = 148, bw = 384, bh = 62;
    let hatch = '';
    for (let x = bx - bh; x < bx + bw; x += 34)
      hatch += `<line x1="${x}" y1="${by + bh}" x2="${x + bh}" y2="${by}" stroke="#2c2c31" stroke-width="1"/>`;
    const handle = (x, y) => `<g transform="translate(${x - 5},${y - 5})" fill="#cfd2d8">
      <rect width="5" height="5"/><rect x="5" y="5" width="5" height="5"/></g>`;
    // 四角 HUD 括角 + 圆点
    const corner = (x, y, sx, sy) => `<path d="M${x + 14 * sx} ${y}H${x}V${y + 14 * sy}" fill="none" stroke="#3a3a40" stroke-width="1.5"/>
      <circle cx="${x + 34 * sx}" cy="${y + 28 * sy}" r="1.6" fill="#8b8d94"/>`;
    svg.innerHTML = `
      <defs>
        <filter id="${uid}" x="-40%" y="-150%" width="180%" height="400%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/>
          <feGaussianBlur in="d" stdDeviation="0"/>
        </filter>
      </defs>
      <g id="${uid}-hud">
        ${corner(88, 96, 1, 1)}${corner(552, 96, -1, 1)}${corner(88, 264, 1, -1)}${corner(552, 264, -1, -1)}
        <line x1="52" y1="180" x2="76" y2="180" stroke="#4a4a50" stroke-width="1.5" stroke-dasharray="4 3"/>
        <line x1="564" y1="180" x2="588" y2="180" stroke="#4a4a50" stroke-width="1.5" stroke-dasharray="4 3"/>
      </g>
      <g id="${uid}-box" opacity="0">
        <clipPath id="${uid}-clip"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}"/></clipPath>
        <g clip-path="url(#${uid}-clip)">${hatch}</g>
        <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#55565c" stroke-width="1"/>
        ${handle(bx, by)}${handle(bx + bw, by)}${handle(bx, by + bh)}${handle(bx + bw, by + bh)}
      </g>
      <g id="${uid}-g">
        <text id="${uid}-line" x="320" y="191" text-anchor="middle"
          style="fill:#eceef2;font:500 33px Inter,'Helvetica Neue',system-ui,sans-serif;letter-spacing:2.5px">{ ACME. Now Live }</text>
        <text id="${uid}-final" x="320" y="198" text-anchor="middle" opacity="0"
          style="fill:#fff;font:800 54px Inter,'Helvetica Neue',system-ui,sans-serif;letter-spacing:4px">ACME</text>
      </g>`;
    stage.appendChild(svg);
    const disp = svg.querySelector('feDisplacementMap');
    const turb = svg.querySelector('feTurbulence');
    const blur = svg.querySelector('feGaussianBlur');
    const grp = svg.querySelector(`#${CSS.escape(uid)}-g`);
    const line = svg.querySelector(`#${CSS.escape(uid)}-line`);
    const fin = svg.querySelector(`#${CSS.escape(uid)}-final`);
    const box = svg.querySelector(`#${CSS.escape(uid)}-box`);
    return t => {
      const burst = seg(t, 0.13, 0.28, E.outCubic);   // 干净字 → 砂化
      const cond = seg(t, 0.60, 0.71, E.inOutCubic);  // 整行噪点云 → 短字标噪点云
      const lock = seg(t, 0.68, 0.90, E.outCubic);    // 位移衰减凝固
      const settle = seg(t, 0.88, 1, E.outCubic);     // 辉光回落
      disp.setAttribute('scale', burst * 52 * (1 - lock));
      turb.setAttribute('seed', Math.floor(t * 46));
      turb.setAttribute('baseFrequency', 0.9 + burst * 0.4);
      blur.setAttribute('stdDeviation', burst * 1.1 * (1 - lock));
      line.setAttribute('opacity', 1 - cond);
      fin.setAttribute('opacity', cond);
      // 白色辉光：砂化期轻微，凝聚时冲高，凝固后回落到柔光
      const glow = burst * 0.3 + cond * 0.7 - settle * 0.45;
      grp.style.filter = `url(#${uid}) drop-shadow(0 0 ${4 + glow * 20}px rgba(255,255,255,${Math.max(0, glow) * 0.9}))`;
      // 选区框：砂化时浮现，凝聚前撤掉
      box.setAttribute('opacity', burst * (1 - seg(t, 0.55, 0.64)));
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
