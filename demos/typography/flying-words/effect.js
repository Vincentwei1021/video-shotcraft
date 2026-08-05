/* flying-words — MotionLab 动效模板（Flying Words 词语纵深隧道）
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
  id: 'b01-flying-words', title: 'Flying Words 词语纵深隧道',
  src: 'remotion-bits.dev', cat: 'typography', dur: 6000,
  tags: ['大透视 z 轴穿越', '生命周期透明曲线', '确定性 spawner'],
  desc: '占位词语在远处纵深生成，沿 z 轴向相机飞来擦身而过，透明度按 [0,1,0.5,0.2,0] 生命周期曲线变化，形成 3D 词语隧道；相机不动、元素动，spawn 完全确定性、首尾无缝。词表可整体替换为项目关键词。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:radial-gradient(60% 60% at 50% 50%,#131a2c,#05060b 75%);perspective:1100px;overflow:hidden';
    stage.appendChild(scene);
    const world = document.createElement('div');
    world.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d';
    scene.appendChild(world);
    // 中心光晕，强化"隧道尽头"
    const core = document.createElement('div');
    core.style.cssText = `position:absolute;left:50%;top:50%;width:220px;height:220px;margin:-110px;
      border-radius:50%;background:radial-gradient(circle,rgba(120,150,255,.22),transparent 68%);filter:blur(6px)`;
    scene.appendChild(core);

    // 占位词表：换成项目自己的关键词即可，词数/字长接近就不影响节奏
    const WORDS = ['Motion', 'Layout', 'Camera', 'Stagger', 'Easing', 'Beat', 'Keyframe', 'Blur',
      'Scale', 'Transform', 'Rotate', 'Parallax', 'Opacity', 'Depth', 'Tween', 'Loop',
      'Spring', 'Delay', 'Fade', 'Composite', 'Grid', 'Pivot'];
    const N = WORDS.length;
    const items = WORDS.map((w, i) => {
      const el = document.createElement('div');
      el.textContent = w;
      const hue = 200 + rand(i * 11) * 130;
      el.style.cssText = `position:absolute;left:0;top:0;transform-origin:50% 50%;white-space:nowrap;
        font:800 ${20 + rand(i + 3) * 16}px/1 -apple-system,'Segoe UI',sans-serif;letter-spacing:.5px;
        color:hsl(${hue},${58 + rand(i + 5) * 30}%,${70 + rand(i + 9) * 18}%);
        text-shadow:0 0 16px hsla(${hue},90%,66%,.45);margin:-14px 0 0 -60px;`;
      world.appendChild(el);
      // 角度按黄金角铺开 + 半径避开正中，防止近处堆在一起糊成一团
      const a = i * 2.39996 + rand(i * 7 + 1) * 0.8;
      const r = 82 + rand(i * 13 + 2) * 165;
      return { el, x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, rz: (rand(i + 21) - 0.5) * 14, ph: i / N };
    });

    const OP = [0, 1, 0.5, 0.2, 0], OT = [0, 0.25, 0.6, 0.85, 1];
    const curve = u => {
      for (let k = 0; k < 4; k++) {
        if (u <= OT[k + 1]) {
          const p = (u - OT[k]) / (OT[k + 1] - OT[k]);
          return OP[k] + (OP[k + 1] - OP[k]) * p;
        }
      }
      return 0;
    };
    const CYCLES = 2;                                      // 整数圈 → t=0/t=1 画面一致
    return t => {
      for (let i = 0; i < N; i++) {
        const it = items[i];
        const u = (t * CYCLES + it.ph) % 1;
        const z = lerp(u, -1750, 800);                     // 远处生成 → 擦身而过
        const drift = 0.5 + u * 1.35;                      // 远处收拢、越近越向外散开
        const op = curve(u);
        it.el.style.transform = `translate3d(${it.x * drift}px,${it.y * drift}px,${z}px) rotateZ(${it.rz}deg)`;
        it.el.style.opacity = op;
        it.el.style.filter = u > 0.86 ? `blur(${(u - 0.86) * 26}px)` : 'none';
      }
      core.style.opacity = 0.75 + Math.sin(t * Math.PI * 4) * 0.12;
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
