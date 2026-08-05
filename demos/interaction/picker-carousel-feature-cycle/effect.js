/* picker-carousel-feature-cycle — MotionLab 动效模板（Picker Carousel 功能名吸附轮播）
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
const PAPER = '#F3F3F1';
const INK = '#111113';
const MID = '#8A8A8F';
const paper = stage => {
  const s = document.createElement('div');
  s.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${PAPER};
    font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;`;
  stage.appendChild(s);
  return s;
};

R({
  id: 'b08-picker-carousel-feature-cycle', title: 'Picker Carousel 功能名吸附轮播',
  src: 'x.com/Jerrythe2d', cat: 'interaction', dur: 3600,
  tags: ['outQuint 吸附后静止', '内容穿过焦点药丸', 'scaleY 呼吸'],
  desc: '移动端风竖向选择器：焦点药丸不动、内容穿过它，每项停靠 0.45s 且带明显 outQuint 减速吸附 + 4–5 帧静止；按到中心距离分层控制 opacity/字号/灰度，落定时药丸做 scaleY 1→1.06→1 极轻呼吸，左外侧固定方形 AI 徽标。',
  setup(stage, { E, lerp, seg }) {
    const s = paper(stage);
    const rowH = 34, ITEMS = ['Data Cleanup', 'Direct Message', 'Smart Segments', 'Batch Actions', 'Reward Program', 'Automated Flows', 'Variant Testing'];
    const ICON = ['◎', '✉', '◧', '◈', '★', '↺', '⚑'];
    const vp = document.createElement('div');
    vp.style.cssText = `position:absolute;left:50%;top:50%;width:300px;height:${rowH * 5}px;
      transform:translate(-50%,-50%);overflow:hidden;`;
    s.appendChild(vp);
    const pill = document.createElement('div');
    pill.style.cssText = `position:absolute;left:0;right:0;top:${rowH * 2}px;height:${rowH}px;
      border-radius:999px;background:#fff;border:1px solid #E3E3E6;
      box-shadow:0 2px 8px rgba(0,0,0,.06);`;
    vp.appendChild(pill);
    const list = document.createElement('div');
    list.style.cssText = 'position:absolute;left:0;right:0;top:0;';
    vp.appendChild(list);
    const rows = ITEMS.map((txt, i) => {
      const r = document.createElement('div');
      r.style.cssText = `height:${rowH}px;display:flex;align-items:center;justify-content:center;gap:8px;
        font:600 17px/1 -apple-system,'Helvetica Neue',sans-serif;color:${INK};`;
      const ic = document.createElement('span');
      ic.textContent = ICON[i];
      ic.style.cssText = 'font-size:14px;opacity:0;';
      const tx = document.createElement('span');
      tx.textContent = txt;
      r.appendChild(ic); r.appendChild(tx);
      list.appendChild(r);
      return { r, ic };
    });
    const fade = document.createElement('div');
    fade.style.cssText = `position:absolute;inset:0;pointer-events:none;
      background:linear-gradient(180deg,${PAPER} 0%,rgba(243,243,241,0) 26%,rgba(243,243,241,0) 74%,${PAPER} 100%);`;
    vp.appendChild(fade);
    const ai = document.createElement('div');
    ai.textContent = 'AI';
    ai.style.cssText = `position:absolute;left:50%;top:50%;margin:-11px 0 0 -186px;width:26px;height:22px;
      border-radius:6px;background:${INK};color:#fff;display:flex;align-items:center;justify-content:center;
      font:700 10px/1 -apple-system,sans-serif;letter-spacing:.5px;`;
    s.appendChild(ai);

    const STEPS = 5, HOLD = 5 / 14;
    return t => {
      const g = seg(t, 0.05, 0.95) * STEPS;
      const step = Math.min(STEPS - 1, Math.floor(g));
      const local = Math.min(1, g - step);
      const mv = E.outQuint(Math.min(1, local / (1 - HOLD)));
      const pos = step + mv;
      list.style.transform = `translateY(${rowH * 2 - pos * rowH}px)`;
      for (let i = 0; i < rows.length; i++) {
        const d = Math.abs(i - pos);
        const k = Math.min(1, d);
        const k2 = Math.min(2, d);
        const o = k2 <= 1 ? lerp(k2, 1, 0.55) : lerp(k2 - 1, 0.55, 0.18);
        rows[i].r.style.opacity = o;
        rows[i].r.style.fontSize = lerp(Math.min(1, d / 2), 17, 14) + 'px';
        rows[i].r.style.color = d < 0.5 ? INK : (d < 1.5 ? MID : '#B9B9BE');
        rows[i].ic.style.opacity = Math.max(0, 1 - d * 1.6);
      }
      const land = Math.max(0, (local - (1 - HOLD)) / HOLD);
      const breath = land > 0 ? Math.sin(Math.min(1, land / 0.6) * Math.PI) * 0.06 : 0;
      pill.style.transform = `scaleY(${1 + breath})`;
      vp.style.opacity = Math.min(1, seg(t, 0, 0.05) * 1);
      ai.style.opacity = seg(t, 0.02, 0.09);
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
