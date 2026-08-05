/* cube-navigation — MotionLab 动效模板（Cube Navigation 立方体逐面导航）
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
const acc = (t, base, kfs, keys, seg, ease) => {
  const out = {};
  for (const k of keys) out[k] = base[k];
  let prev = base;
  for (const kf of kfs) {
    const u = seg(t, kf.at[0], kf.at[1], ease);
    for (const k of keys) out[k] += u * (kf.to[k] - prev[k]);
    prev = kf.to;
  }
  return out;
};

R({
  id: 'b01-cube-navigation', title: 'Cube Navigation 立方体逐面导航',
  src: 'remotion-bits.dev', cat: 'transition', dur: 6000,
  tags: ['六面贴内容', '等轴拉远露棱角', '法线明暗'],
  desc: '内容贴在 3D 立方体六面，相机逐面浏览：正面特写 → 拉远到等轴视角看清棱角 → 转到下一面推近，面间穿插斜角过渡；每面按法线朝向实时算明暗。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:radial-gradient(110% 100% at 50% 10%,#171b2a,#07080e 72%);perspective:760px;overflow:hidden';
    stage.appendChild(scene);
    const rig = document.createElement('div');
    rig.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d';
    scene.appendChild(rig);

    const S = 190, H = S / 2;
    const FACES = [
      { n: 'OVERVIEW', tr: `translateZ(${H}px)`, nm: [0, 0, 1], hue: 224 },
      { n: 'METRICS', tr: `rotateY(90deg) translateZ(${H}px)`, nm: [1, 0, 0], hue: 268 },
      { n: 'TIMELINE', tr: `rotateY(180deg) translateZ(${H}px)`, nm: [0, 0, -1], hue: 330 },
      { n: 'ASSETS', tr: `rotateY(-90deg) translateZ(${H}px)`, nm: [-1, 0, 0], hue: 190 },
      { n: 'SETTINGS', tr: `rotateX(90deg) translateZ(${H}px)`, nm: [0, -1, 0], hue: 154 },
      { n: 'EXPORT', tr: `rotateX(-90deg) translateZ(${H}px)`, nm: [0, 1, 0], hue: 34 },
    ];
    const faces = FACES.map((f, i) => {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:${-H}px;top:${-H}px;width:${S}px;height:${S}px;
        transform:${f.tr};backface-visibility:hidden;border-radius:6px;overflow:hidden;
        background:linear-gradient(155deg,hsl(${f.hue},44%,26%),hsl(${f.hue},52%,12%));
        box-shadow:inset 0 0 0 1px hsla(${f.hue},70%,70%,.4);`;
      const cap = document.createElement('div');
      cap.textContent = f.n;
      cap.style.cssText = `position:absolute;left:14px;top:13px;font:700 9px/1 -apple-system,sans-serif;
        letter-spacing:2.4px;color:hsla(${f.hue},80%,82%,.95)`;
      el.appendChild(cap);
      for (let k = 0; k < 4; k++) {
        const b = document.createElement('div');
        b.style.cssText = `position:absolute;left:14px;top:${42 + k * 20}px;height:9px;border-radius:5px;
          width:${34 + rand(i * 9 + k) * 46}%;background:hsla(${f.hue},70%,72%,${0.5 - k * 0.09})`;
        el.appendChild(b);
      }
      const glyph = document.createElement('div');
      glyph.textContent = ['◧', '◆', '◔', '▤', '⚙', '↥'][i];
      glyph.style.cssText = `position:absolute;right:14px;bottom:12px;font-size:30px;line-height:1;
        color:hsla(${f.hue},85%,80%,.55)`;
      el.appendChild(glyph);
      rig.appendChild(el);
      return el;
    });

    // Step：正面 → 等轴 → 右面 → 等轴 → 背面 → 等轴收尾
    const CAM = [
      { rx: 0, ry: 0, d: 235 },
      { rx: -22, ry: -38, d: -130 },
      { rx: 0, ry: -90, d: 235 },
      { rx: -27, ry: -142, d: -130 },
      { rx: 0, ry: -180, d: 235 },
      { rx: -24, ry: -226, d: -95 },
    ];
    const WIN = [[0.10, 0.24], [0.30, 0.44], [0.50, 0.62], [0.66, 0.78], [0.84, 0.97]];
    const K = ['rx', 'ry', 'd'];
    const RAD = Math.PI / 180;
    return t => {
      const v = acc(t, CAM[0], WIN.map((w, i) => ({ at: w, to: CAM[i + 1] })), K, seg, E.inOutCubic);
      rig.style.transform = `translateZ(${v.d}px) rotateX(${v.rx}deg) rotateY(${v.ry}deg)`;
      // 法线明暗：Rx(rx)·Ry(ry)·n 的 z 分量
      const cy = Math.cos(v.ry * RAD), sy = Math.sin(v.ry * RAD);
      const cx = Math.cos(v.rx * RAD), sx = Math.sin(v.rx * RAD);
      FACES.forEach((f, i) => {
        const [nx, ny, nz] = f.nm;
        const z1 = -nx * sy + nz * cy, y1 = ny;
        const z2 = y1 * sx + z1 * cx;
        const lit = Math.max(0, z2);
        faces[i].style.filter = `brightness(${(0.5 + lit * 0.62).toFixed(3)}) saturate(${(0.8 + lit * 0.4).toFixed(2)})`;
      });
      scene.style.opacity = seg(t, 0, 0.08, E.outCubic);
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
