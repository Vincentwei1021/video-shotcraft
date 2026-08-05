/* basic-3d-scene — MotionLab 动效模板（Impress 3D Steps 空间步进）
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
  id: 'b04-basic-3d-scene', title: 'Impress 3D Steps 空间步进',
  src: 'remotion-bits.dev', cat: 'camera', dur: 6000,
  tags: ['相机=逆变换', 'step 飞行'],
  desc: 'impress.js 式演示：卡片散布 3D 空间各处（不同 xyz+旋转+缩放），相机依次飞到每个 Step 的姿态对齐观看；核心配方 camera = stepTransform.inverse()，非当前 step 半透明+模糊做 enter/exit。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = `position:absolute;inset:0;overflow:hidden;background:
      radial-gradient(ellipse at 50% 40%,#141828 0%,#0a0b10 70%);perspective:1000px;`;
    stage.appendChild(scene);
    const world = document.createElement('div');
    world.style.cssText = `position:absolute;left:50%;top:50%;width:0;height:0;
      transform-style:preserve-3d;will-change:transform;`;
    scene.appendChild(world);
    // 每个 step：位置 + 姿态 + 缩放（相机将取其逆）
    const poses = [
      { x: 0,    y: 0,   z: 0,    rx: 0,   ry: 0,   rz: 0,  s: 1,   hue: 215, tt: 'STEP 01', sub: 'Position the idea' },
      { x: 520,  y: -60, z: -180, rx: 0,   ry: -40, rz: 0,  s: 1,   hue: 265, tt: 'STEP 02', sub: 'Rotate the view' },
      { x: 160,  y: 300, z: -520, rx: 0,   ry: 0,   rz: 90, s: 1,   hue: 165, tt: 'STEP 03', sub: 'Spin the frame' },
      { x: 220,  y: 90,  z: -260, rx: 0,   ry: 0,   rz: 0,  s: 3.1, hue: 25,  tt: 'OVERVIEW', sub: 'See everything' },
    ];
    const cards = poses.map((p, i) => {
      const c = document.createElement('div');
      const last = i === poses.length - 1;
      c.style.cssText = `position:absolute;left:${last ? -160 : -110}px;top:${last ? -100 : -70}px;
        width:${last ? 320 : 220}px;height:${last ? 200 : 140}px;box-sizing:border-box;
        border-radius:10px;padding:18px 20px;will-change:opacity,filter;
        background:linear-gradient(150deg,hsl(${p.hue},45%,16%),hsl(${p.hue},55%,9%));
        border:1px solid hsl(${p.hue},60%,34%);
        box-shadow:0 18px 50px rgba(0,0,0,.55), inset 0 1px 0 hsla(${p.hue},70%,70%,.25);
        transform:translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s / (last ? 2.2 : 1)});
        font-family:-apple-system,system-ui,sans-serif;color:#eef1f8;`;
      c.innerHTML = `<div style="font-size:11px;letter-spacing:3px;color:hsl(${p.hue},80%,68%);font-weight:700">${p.tt}</div>
        <div style="font-size:${last ? 26 : 21}px;font-weight:800;margin-top:8px">${p.sub}</div>
        <div style="margin-top:12px;height:5px;width:56%;border-radius:3px;background:hsl(${p.hue},70%,45%)"></div>
        <div style="margin-top:7px;height:5px;width:34%;border-radius:3px;background:hsla(${p.hue},50%,60%,.4)"></div>`;
      world.appendChild(c);
      return c;
    });
    // 飞行时刻表：0 停在 step0，之后三段飞行
    const flyAt = [0.22, 0.48, 0.76], FLY = 0.16;
    return t => {
      // activeFloat = 已完成的飞行进度之和 → 当前相机在哪个 step 之间
      let af = 0;
      const cam = { ...poses[0] };
      for (let i = 0; i < flyAt.length; i++) {
        const f = seg(t, flyAt[i], flyAt[i] + FLY, E.inOutCubic);
        af += f;
        const p = poses[i + 1];
        cam.x = lerp(f, cam.x, p.x); cam.y = lerp(f, cam.y, p.y); cam.z = lerp(f, cam.z, p.z);
        cam.rx = lerp(f, cam.rx, p.rx); cam.ry = lerp(f, cam.ry, p.ry); cam.rz = lerp(f, cam.rz, p.rz);
        cam.s = lerp(f, cam.s, p.s);
      }
      // 相机 = 场景逆变换：先反平移，再反旋转，再 1/scale
      world.style.transform = `scale(${1 / cam.s})
        rotateZ(${-cam.rz}deg) rotateY(${-cam.ry}deg) rotateX(${-cam.rx}deg)
        translate3d(${-cam.x}px,${-cam.y}px,${-cam.z}px)`;
      // enter/exit：距当前视点越远越暗越糊（overview 时全部点亮）
      const over = seg(t, flyAt[2], flyAt[2] + FLY);
      for (let i = 0; i < cards.length; i++) {
        const d = Math.min(1, Math.abs(af - i));
        const focus = Math.max(1 - d, over);
        cards[i].style.opacity = 0.28 + focus * 0.72;
        cards[i].style.filter = `blur(${(1 - focus) * 3.5}px)`;
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
