/* fracture — MotionLab 动效模板（Fracture Reassemble 碎片聚合）
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
  id: 'fracture', title: 'Fracture Reassemble 碎片聚合',
  src: 'remotion-bits.dev', cat: 'opening', dur: 5200,
  tags: ['3D tiles', '曼哈顿波纹 stagger', '进出对称'],
  desc: '5×5 瓦片从 3D 空间随机碎片态（±大位移 + 三轴随机旋转 + 透明）聚合成整面海报，按曼哈顿距离从中心向外波纹式就位；hold 后全部碎片沿背离中心的方向加速旋转飞出画面。正放=开场、倒放=转场。',
  setup(stage, { E, seg }) {
    const N = 5;
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:#0b0b10;perspective:900px;overflow:hidden';
    stage.appendChild(scene);
    const grid = document.createElement('div');
    grid.style.cssText = `position:absolute;left:50%;top:50%;width:380px;height:230px;
      margin:-115px 0 0 -190px;transform-style:preserve-3d;`;
    scene.appendChild(grid);
    const tiles = [];
    const ACCENT_HUE = 218;                 // 模板强调色相，可按项目替换
    const hues = [ACCENT_HUE, ACCENT_HUE + 8, ACCENT_HUE - 8, ACCENT_HUE + 4, ACCENT_HUE - 4];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const el = document.createElement('div');
      const hue = hues[(r * 3 + c * 5) % hues.length];
      el.style.cssText = `position:absolute;left:${c * 20}%;top:${r * 20}%;width:19.2%;height:19%;
        border-radius:3px;
        background:linear-gradient(${135 + r * 20}deg, hsl(${hue},14%,${38 + ((r + c) % 3) * 14}%), hsl(${hue},20%,${22 + ((r * c) % 4) * 10}%));`;
      grid.appendChild(el);
      const seed = r * N + c;
      // 退场方向：背离画面中心（中心瓦片给随机角），保证全部飞出画面
      const ang = (r === 2 && c === 2) ? rand(seed + 300) * Math.PI * 2
        : Math.atan2(r - 2 + (rand(seed + 310) - 0.5) * 0.8, c - 2 + (rand(seed + 320) - 0.5) * 0.8);
      tiles.push({
        el,
        dx: (rand(seed) - 0.5) * 900, dy: (rand(seed + 50) - 0.5) * 600, dz: (rand(seed + 100) - 0.3) * 700,
        rx: (rand(seed + 150) - 0.5) * 360, ry: (rand(seed + 200) - 0.5) * 360, rz: (rand(seed + 250) - 0.5) * 360,
        exX: Math.cos(ang) * (620 + rand(seed + 330) * 260),
        exY: Math.sin(ang) * (470 + rand(seed + 340) * 220),
        exR: (rand(seed + 350) - 0.5) * 300,
        delay: (Math.abs(r - 2) + Math.abs(c - 2)) * 0.045,
      });
    }
    const label = document.createElement('div');
    label.textContent = 'REASSEMBLE';
    label.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      color:#fff;font-weight:800;font-size:26px;letter-spacing:8px;opacity:0;
      text-shadow:0 2px 30px rgba(0,0,0,.8);`;
    scene.appendChild(label);
    return t => {
      for (const tl of tiles) {
        const tin = seg(t, tl.delay, tl.delay + 0.34, E.inOutCubic);
        // 退场窗口收紧：最晚的角瓦片 0.79 起飞、0.97 前飞完（原 0.85 起飞导致 t=1 时还没出画）
        const tout = seg(t, 0.70 + tl.delay * 0.5, 0.70 + tl.delay * 0.5 + 0.18, E.inCubic);
        const inv = 1 - tin;   // 入场：碎片态 → 就位
        tl.el.style.transform = `translate3d(${tl.dx * inv + tl.exX * tout}px,${tl.dy * inv + tl.exY * tout}px,${tl.dz * inv}px)
          rotateX(${tl.rx * inv}deg) rotateY(${tl.ry * inv}deg) rotateZ(${tl.rz * inv + tl.exR * tout}deg)`;
        tl.el.style.opacity = Math.min(1, tin * 2.5);   // 退场不淡出，实体飞出画面
      }
      label.style.opacity = seg(t, 0.42, 0.52) - seg(t, 0.7, 0.78);
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
