/* carousel-3d — MotionLab 动效模板（3D Carousel 环形画廊）
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
  id: 'b04-3d-carousel', title: '3D Carousel 环形画廊',
  src: 'remotion-bits.dev', cat: 'ui-entrance', dur: 5600,
  tags: ['sin/cos 环排布', '双面同向贴图'],
  desc: '8 张卡片按 sin/cos 排成圆环并匀速整环自转，每卡只绕 Y 公转、自身 billboard 朝外，正反两层同向贴图 + backface-visibility:hidden，任何时刻卡片都正立不倒置；相机全程固定（浅俯角近景），配方 angle=i*360/n+frame*speed。',
  setup(stage) {
    const scene = document.createElement('div');
    scene.style.cssText = `position:absolute;inset:0;overflow:hidden;perspective:950px;
      background:radial-gradient(ellipse at 50% 55%,#131120 0%,#0a0b10 75%);`;
    stage.appendChild(scene);
    const cam = document.createElement('div');
    cam.style.cssText = `position:absolute;left:50%;top:50%;width:0;height:0;
      transform-style:preserve-3d;will-change:transform;`;
    scene.appendChild(cam);
    const ring = document.createElement('div');
    ring.style.cssText = 'position:absolute;transform-style:preserve-3d;will-change:transform;';
    cam.appendChild(ring);
    const N = 8, RADIUS = 190, cards = [];
    const icons = ['◆', '●', '▲', '■', '✦', '◗', '⬢', '◉'];
    for (let i = 0; i < N; i++) {
      const hue = 200 + i * 22;
      // 卡片容器只做环上定位（绕 Y 公转 + billboard 朝外），永不绕 X/Z，卡永远正立
      const c = document.createElement('div');
      c.style.cssText = `position:absolute;left:-46px;top:-62px;width:92px;height:124px;
        transform-style:preserve-3d;
        transform:rotateY(${i * 360 / N}deg) translateZ(${RADIUS}px);`;
      // 正反两层同向贴图 + backface-visibility:hidden：从环外/环内看都是正立不镜像的同一张卡
      const faceCss = `position:absolute;inset:0;border-radius:9px;box-sizing:border-box;padding:10px;
        backface-visibility:hidden;-webkit-backface-visibility:hidden;
        background:linear-gradient(160deg,hsl(${hue},60%,42%),hsl(${hue + 28},70%,20%));
        border:1px solid hsla(${hue},80%,75%,.5);
        box-shadow:0 12px 34px rgba(0,0,0,.5), inset 0 1px 0 hsla(${hue},80%,85%,.35);
        font-family:-apple-system,system-ui,sans-serif;color:#f2f5fb;`;
      const faceHtml = `<div style="font-size:24px">${icons[i]}</div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;margin-top:34px">CARD 0${i + 1}</div>
        <div style="margin-top:6px;height:4px;width:70%;border-radius:2px;background:rgba(255,255,255,.4)"></div>
        <div style="margin-top:4px;height:4px;width:45%;border-radius:2px;background:rgba(255,255,255,.22)"></div>`;
      const front = document.createElement('div');
      front.style.cssText = faceCss;
      front.innerHTML = faceHtml;
      const back = document.createElement('div');
      back.style.cssText = faceCss + 'transform:rotateY(180deg);';
      back.innerHTML = faceHtml;
      c.appendChild(front); c.appendChild(back);
      ring.appendChild(c);
      cards.push({ el: c, base: i * 360 / N });
    }
    // 地面反光盘
    const floor = document.createElement('div');
    floor.style.cssText = `position:absolute;left:-230px;top:70px;width:460px;height:460px;
      border-radius:50%;transform:rotateX(90deg);
      background:radial-gradient(circle,rgba(110,140,255,.14) 0%,transparent 62%);`;
    cam.appendChild(floor);
    // 相机全程固定：浅俯角近景，不拉远不变角
    cam.style.transform = 'translateZ(-90px) rotateX(-8deg) translateY(-10px)';
    return t => {
      const spin = t * 360;                                        // 整片正好公转 1 圈可循环
      ring.style.transform = `rotateY(${spin}deg)`;
      for (const c of cards)
        c.el.style.transform = `rotateY(${c.base}deg) translateZ(${RADIUS}px)`;
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
