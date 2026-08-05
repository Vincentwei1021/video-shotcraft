/* radial-ripple-phone-chips — MotionLab 动效模板（Radial Ripple Chips 同心波纹手机）
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
  id: 'b12-radial-ripple-phone-chips',
  title: 'Radial Ripple Chips 同心波纹手机',
  src: 'x.com/1amanly',
  cat: 'effects', dur: 5600,
  tags: ['同心圆呼吸', 'spring pop', '自动滚屏'],
  desc: '浅灰底同心圆多层错相呼吸如水波，中央手机 mockup 屏内 feed 缓慢自动滚动，两侧白色 chip 先后 spring pop 入场并悬浮。配色是灰阶骨架 + 单一强调色（ACCENT 变量），落地时按项目品牌色替换。',
  setup(stage, { E, lerp, seg }) {
    // 模板强调色：实际使用时按项目品牌色替换这一个变量
    const ACCENT_RGB = '122,134,153';   // = #7a8699，中性蓝灰做默认演示色
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:#f2f3f5;overflow:hidden;';
    stage.appendChild(scene);

    // 同心圆（深灰→浅灰，从大到小叠放）
    const rings = [];
    const RCOL = ['#d7dbe1', '#e0e4e9', '#e8ebef', '#eef0f3'];
    const RSZ = [560, 440, 320, 210];
    for (let i = 0; i < 4; i++) {
      const c = document.createElement('div');
      c.style.cssText = `position:absolute;left:50%;top:50%;width:${RSZ[i]}px;height:${RSZ[i]}px;
        margin:${-RSZ[i] / 2}px 0 0 ${-RSZ[i] / 2}px;border-radius:50%;background:${RCOL[i]};`;
      scene.appendChild(c);
      rings.push({ el: c, phase: i * 1.7 });
    }

    // 手机 mockup
    const phone = document.createElement('div');
    phone.style.cssText = `position:absolute;left:50%;top:50%;width:132px;height:264px;
      margin:-132px 0 0 -66px;border-radius:22px;background:#1b1c22;padding:7px;
      box-shadow:0 24px 50px rgba(58,64,74,.35);`;
    scene.appendChild(phone);
    const screen = document.createElement('div');
    screen.style.cssText = 'position:relative;width:100%;height:100%;border-radius:16px;background:#fff;overflow:hidden;';
    phone.appendChild(screen);
    const feed = document.createElement('div');
    feed.style.cssText = 'position:absolute;left:0;top:0;width:100%;';
    screen.appendChild(feed);
    for (let i = 0; i < 8; i++) {
      const card = document.createElement('div');
      card.style.cssText = `position:relative;margin:8px 8px 0;padding:7px;border-radius:8px;background:#f4f4f7;`;
      const img = document.createElement('div');
      img.style.cssText = `height:34px;border-radius:5px;background:linear-gradient(120deg,
        rgba(${ACCENT_RGB},${(0.5 - i * 0.04).toFixed(2)}),rgba(${ACCENT_RGB},${(0.8 - i * 0.05).toFixed(2)}));`;
      const l1 = document.createElement('div');
      l1.style.cssText = `margin-top:6px;height:5px;width:${62 + rand(i) * 28}%;border-radius:3px;background:#c9cad3;`;
      const l2 = document.createElement('div');
      l2.style.cssText = `margin-top:4px;height:5px;width:${34 + rand(i + 40) * 30}%;border-radius:3px;background:#dedfe6;`;
      card.appendChild(img); card.appendChild(l1); card.appendChild(l2);
      feed.appendChild(card);
    }

    // 两侧 chip
    const mkChip = (txt, side) => {
      const ch = document.createElement('div');
      ch.textContent = txt;
      ch.style.cssText = `position:absolute;top:${side === 'l' ? 38 : 56}%;
        ${side === 'l' ? 'right:calc(50% + 86px)' : 'left:calc(50% + 86px)'};
        padding:10px 18px;border-radius:999px;background:#fff;color:#2c3038;
        font:600 13px -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;
        box-shadow:0 10px 26px rgba(58,64,74,.22);opacity:0;`;
      scene.appendChild(ch);
      return ch;
    };
    const chipL = mkChip('Feature one', 'l');
    const chipR = mkChip('Feature detail', 'r');

    return t => {
      // 各层错相极缓呼吸
      for (const rg of rings) {
        const s = 1 + 0.06 * Math.sin(t * Math.PI * 2 * 1.5 + rg.phase);
        rg.el.style.transform = `scale(${s})`;
      }
      // 屏幕缓慢自动滚动
      feed.style.transform = `translateY(${-seg(t, 0.08, 0.98) * 150}px)`;
      // chip 先后 pop：scale 0.8→1 过冲 + 淡入，随后轻浮动
      const popChip = (el, t0, ph) => {
        const p = seg(t, t0, t0 + 0.12, E.outBack);
        const fl = Math.sin(t * Math.PI * 2 * 2 + ph) * 3 * seg(t, t0 + 0.12, t0 + 0.3);
        el.style.opacity = seg(t, t0, t0 + 0.08);
        el.style.transform = `scale(${lerp(p, 0.8, 1)}) translateY(${fl}px)`;
      };
      popChip(chipL, 0.22, 0);
      popChip(chipR, 0.4, 1.8);
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
