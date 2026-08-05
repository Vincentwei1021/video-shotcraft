/* mosaic-reframe — MotionLab 动效模板（Mosaic Reframe 三段布局重排）
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
const smooth = x => x * x * (3 - 2 * x);
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
  id: 'b01-mosaic-reframe', title: 'Mosaic Reframe 三段布局重排',
  src: 'remotion-bits.dev', cat: 'transition', dur: 6000,
  tags: ['布局插值重排', 'index stagger', 'smoothstep hold'],
  desc: '12 张图片瓦片在三种排版间连续变形：4x3 规则网格 → 带一块 2x2 大图的 feature mosaic → 对角线瀑布串（每片 -15°+i*3° 递增旋转）。位置与宽高各自独立插值，每片按 index 微 stagger，smoothstep 缓动，段间留 hold。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:#0a0b10;overflow:hidden';
    stage.appendChild(scene);

    // ---- layout A: 4x3 规则网格 ----
    const gw = (92 - 3 * 2) / 4, gh = (92 - 2 * 2) / 3;
    const A = [];
    for (let i = 0; i < 12; i++) {
      const c = i % 4, r = (i / 4) | 0;
      A.push({ x: 4 + c * (gw + 2), y: 4 + r * (gh + 2), w: gw, h: gh, rot: 0 });
    }
    // ---- layout B: feature mosaic（6x4 单元格，t0 占 3x2）----
    const uw = (92 - 5 * 1.2) / 6, uh = (92 - 3 * 1.2) / 4;
    const slots = [[0,0,3,2],[3,0,1,1],[4,0,1,1],[5,0,1,1],[3,1,2,1],[5,1,1,1],
                   [0,2,1,1],[1,2,2,1],[3,2,1,2],[4,2,2,1],[0,3,3,1],[4,3,2,1]];
    const B = slots.map(([c, r, cw, rh]) => ({
      x: 4 + c * (uw + 1.2), y: 4 + r * (uh + 1.2),
      w: cw * uw + (cw - 1) * 1.2, h: rh * uh + (rh - 1) * 1.2, rot: 0,
    }));
    // ---- layout C: 对角线瀑布串 ----
    const C = [];
    for (let i = 0; i < 12; i++) {
      C.push({ x: 1 + i * 6.4, y: -7 + i * 7.6, w: 23, h: 27, rot: -15 + i * 3 });
    }

    const tiles = A.map((_, i) => {
      const el = document.createElement('div');
      const hue = 198 + i * 13;
      el.style.cssText = `position:absolute;border-radius:7px;overflow:hidden;
        background:linear-gradient(${140 + i * 9}deg,hsl(${hue},58%,42%),hsl(${hue + 26},64%,20%));
        box-shadow:0 8px 22px rgba(0,0,0,.45),inset 0 0 0 1px hsla(${hue},70%,72%,.22);`;
      // 占位"图片"内容：一枚圆点 + 两条信息条
      const dot = document.createElement('div');
      dot.style.cssText = `position:absolute;left:9px;top:9px;width:9px;height:9px;border-radius:50%;
        background:hsla(${hue + 40},90%,78%,.95);box-shadow:0 0 10px hsla(${hue + 40},90%,70%,.7);`;
      const b1 = document.createElement('div');
      b1.style.cssText = `position:absolute;left:9px;bottom:16px;height:5px;width:${34 + rand(i) * 30}%;
        border-radius:3px;background:hsla(0,0%,100%,.6);`;
      const b2 = document.createElement('div');
      b2.style.cssText = `position:absolute;left:9px;bottom:8px;height:4px;width:${20 + rand(i + 7) * 24}%;
        border-radius:2px;background:hsla(0,0%,100%,.28);`;
      el.appendChild(dot); el.appendChild(b1); el.appendChild(b2);
      scene.appendChild(el);
      return el;
    });

    const K = ['x', 'y', 'w', 'h', 'rot'];
    return t => {
      for (let i = 0; i < 12; i++) {
        const st = i * 0.007;                                  // ≈ index*2 帧微 stagger
        const v = acc(t, A[i], [
          { at: [0.26 + st, 0.42 + st], to: B[i] },            // A → B
          { at: [0.62 + st, 0.80 + st], to: C[i] },            // hold 后 B → C
        ], K, seg, smooth);
        const pop = seg(t, i * 0.012, i * 0.012 + 0.14, E.outCubic);   // 开场逐片浮现
        const el = tiles[i];
        el.style.left = v.x + '%'; el.style.top = v.y + '%';
        el.style.width = v.w + '%'; el.style.height = v.h + '%';
        el.style.transform = `rotate(${v.rot}deg) scale(${lerp(pop, 0.82, 1)})`;
        el.style.opacity = pop;
        el.style.zIndex = 10 + (i === 0 ? 5 : 0);
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
