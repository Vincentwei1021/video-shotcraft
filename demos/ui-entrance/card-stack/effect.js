/* card-stack — MotionLab 动效模板（Card Stack 3D 扇形展开）
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
  id: 'b02-card-stack', title: 'Card Stack 3D 扇形展开',
  src: 'remotion-bits.dev', cat: 'ui-entrance', dur: 4200,
  tags: ['spring 入场', '静态扇形终态偏移'],
  desc: '8 张卡片从屏下 spring 弹入（stagger 3 帧），叠成一摞后呈扇形展开：每张 (i-3.5)*8° 旋转 + 横移 + z 递退，形成 3D 扇面。入场动画与扇形终态偏移分层叠加。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:#0a0b10;perspective:900px;overflow:hidden';
    stage.appendChild(scene);
    const N = 8, cards = [];
    const hues = [222, 238, 254, 270, 286, 302, 318, 334];
    for (let i = 0; i < N; i++) {
      const c = document.createElement('div');
      c.style.cssText = `position:absolute;left:50%;top:50%;width:110px;height:150px;
        margin:-85px 0 0 -55px;border-radius:12px;transform-origin:50% 130%;
        background:linear-gradient(165deg,hsl(${hues[i]},45%,26%),hsl(${hues[i]},55%,14%));
        border:1px solid hsla(${hues[i]},60%,60%,.35);box-shadow:0 12px 34px rgba(0,0,0,.5);`;
      const bar = document.createElement('div');
      bar.style.cssText = `position:absolute;left:12px;top:14px;width:${40 + rand(i) * 40}px;height:8px;
        border-radius:4px;background:hsla(${hues[i]},70%,70%,.8);`;
      const bar2 = document.createElement('div');
      bar2.style.cssText = `position:absolute;left:12px;top:30px;width:${26 + rand(i + 9) * 30}px;height:6px;
        border-radius:3px;background:hsla(${hues[i]},40%,60%,.4);`;
      const glyph = document.createElement('div');
      glyph.textContent = ['◆', '●', '▲', '■', '✦', '◐', '◇', '○'][i];
      glyph.style.cssText = `position:absolute;left:50%;top:62%;transform:translate(-50%,-50%);
        font-size:30px;color:hsla(${hues[i]},80%,75%,.9);`;
      c.appendChild(bar); c.appendChild(bar2); c.appendChild(glyph);
      scene.appendChild(c);
      cards.push(c);
    }
    return t => {
      for (let i = 0; i < N; i++) {
        // 入场：屏下 spring 弹入，stagger 3 帧（0.033/张）
        const inT = seg(t, 0.02 + i * 0.033, 0.02 + i * 0.033 + 0.3);
        const y = lerp(E.spring(inT, 0.3), 300, 0);
        // 扇形：全员落位后一次性展开（静态终态偏移 × 展开进度）
        const fan = seg(t, 0.55, 0.8, E.inOutCubic);
        const k = i - (N - 1) / 2;
        const rot = k * 8 * fan;
        const tx = k * 34 * fan;
        const tz = -10 * Math.abs(k) * fan;
        cards[i].style.transform = `translate3d(${tx}px,${y}px,${tz}px) rotate(${rot}deg)`;
        cards[i].style.opacity = Math.min(1, inT * 4);
        cards[i].style.zIndex = 20 - Math.abs(k * 2);
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
