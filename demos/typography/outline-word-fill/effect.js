/* outline-word-fill — MotionLab 动效模板（Outline→Solid Fill 空心字辉光填充）
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
  id: 'b15-outline-word-fill',
  title: 'Outline→Solid Fill 空心字辉光填充',
  src: 'x.com/bohdanmotion',
  cat: 'typography', dur: 2500,
  tags: ['text-stroke', 'zoom 落位', '瞬时填充'],
  desc: '空心 "Faster"（细灰描边、中等字重）从约 3 倍巨大尺寸急缓收缩落位居中；背后巨大虚线圆随后从画外持续收缩到字周围，两侧水平虚线从画框边缘向内伸向圆；描边先微微增亮，随即实心白色一帧内瞬间点亮（无慢扫），带一闪即逝的微辉光后定格纯白。',
  setup(stage, { E, lerp, seg }) {
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;inset:0;background:#050505;overflow:hidden;';
    stage.appendChild(root);

    // 背景微尘
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div');
      const s = 1 + rand(i * 7 + 2) * 1.2;
      p.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;
        background:#fff;opacity:${0.06 + rand(i + 55) * 0.14};
        left:${rand(i + 13) * 100}%;top:${rand(i + 29) * 100}%;`;
      root.appendChild(p);
    }

    // 虚线大圆（SVG，从画外收缩落位 + 缓慢自转）
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '-240 -135 480 270');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    root.appendChild(svg);
    const cirG = document.createElementNS(svgNS, 'g');
    const cir = document.createElementNS(svgNS, 'circle');
    cir.setAttribute('cx', 0); cir.setAttribute('cy', 0); cir.setAttribute('r', 88);
    cir.setAttribute('fill', 'none');
    cir.setAttribute('stroke', '#7d838e');
    cir.setAttribute('stroke-width', '1');
    cir.setAttribute('stroke-dasharray', '6 8');
    cirG.appendChild(cir);
    svg.appendChild(cirG);
    // 左右水平虚线：从画框边缘向内伸向圆
    const mkDash = sgn => {
      const l = document.createElementNS(svgNS, 'line');
      l.setAttribute('y1', 0); l.setAttribute('y2', 0);
      l.setAttribute('x1', sgn * 240); l.setAttribute('x2', sgn * 240);
      l.setAttribute('stroke', '#7d838e'); l.setAttribute('stroke-width', '1');
      l.setAttribute('stroke-dasharray', '5 7');
      svg.appendChild(l);
      return l;
    };
    const dashL = mkDash(-1), dashR = mkDash(1);

    // 双层文字（中等字重，占画宽约三成）
    const word = document.createElement('div');
    word.style.cssText = `position:absolute;left:50%;top:50%;
      font-family:-apple-system,"Helvetica Neue",sans-serif;font-size:48px;font-weight:500;
      letter-spacing:.5px;line-height:1;`;
    root.appendChild(word);
    const outline = document.createElement('div');
    outline.textContent = 'Faster';
    outline.style.cssText = 'color:transparent;-webkit-text-stroke:1px #565b63;';
    const solid = document.createElement('div');
    solid.textContent = 'Faster';
    solid.style.cssText = 'position:absolute;inset:0;color:#fff;opacity:0;';
    word.appendChild(outline); word.appendChild(solid);

    return t => {
      // 空心字从 ~3.2x 急缓收缩落位（原片 4.83→5.15s）
      const born = seg(t, 0.05, 0.14, E.outCubic);
      const zoom = seg(t, 0.05, 0.19, E.outCubic);
      word.style.opacity = born;
      word.style.transform = `translate(-50%,-53%) scale(${lerp(zoom, 3.2, 1)})`;
      // 描边临近点亮前微微增亮（6.4→6.55s）
      const bright = seg(t, 0.66, 0.73, E.outQuad);
      const g = Math.round(lerp(bright, 86, 145));
      outline.style.webkitTextStroke = `1px rgb(${g - 4},${g},${g + 8})`;
      // 虚线圆：字落位后出现，从画外一路收缩到字周围（5.1→6.6s）
      const cin = seg(t, 0.16, 0.3, E.outQuad);
      const shrink = seg(t, 0.16, 0.76, E.outCubic);
      cirG.setAttribute('transform', `scale(${lerp(shrink, 2.8, 1)}) rotate(${t * 18})`);
      cir.setAttribute('opacity', cin * 0.85);
      // 水平虚线从画框边缘向内伸向圆（5.9→6.5s）
      const ext = seg(t, 0.5, 0.72, E.outCubic);
      dashL.setAttribute('x2', -240 + ext * 144);
      dashR.setAttribute('x2', 240 - ext * 144);
      dashL.setAttribute('opacity', ext); dashR.setAttribute('opacity', ext);
      // 实心白一帧内瞬间点亮（原片 6.54→6.56s 硬切，无慢扫）
      const pop = seg(t, 0.742, 0.762);
      solid.style.opacity = pop;
      outline.style.opacity = 1 - pop;
      // 一闪即逝的微辉光，随后定格纯白
      const flash = pop * (1 - seg(t, 0.762, 0.86, E.outQuad));
      solid.style.textShadow = flash > 0.01
        ? `0 0 ${flash * 16}px rgba(255,255,255,${flash * 0.45})` : 'none';
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
