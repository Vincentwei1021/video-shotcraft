/* list-reveal — MotionLab 动效模板（List Reveal 菜单逐项找位）
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
  id: 'b02-list-reveal', title: 'List Reveal 菜单逐项找位',
  src: 'remotion-bits.dev', cat: 'ui-entrance', dur: 3600,
  tags: ['嵌套 stagger', '整体漂移分离'],
  desc: '垂直菜单列表项依次 scale 找位入场（outBack 轻微过冲），同时整个列表容器全程缓慢上移——"整体漂移"与"逐项入场"两层运动分离叠加。',
  setup(stage, { E, lerp, seg }) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;background:#0a0b10;display:flex;align-items:center;justify-content:center';
    stage.appendChild(wrap);
    const list = document.createElement('div');
    list.style.cssText = 'position:relative;width:240px;display:flex;flex-direction:column;gap:9px';
    wrap.appendChild(list);
    const LABELS = ['Dashboard', 'Projects', 'Analytics', 'Messages', 'Settings', 'Sign out'];
    const hues = [225, 250, 275, 300, 210, 340];
    const items = LABELS.map((s, i) => {
      const it = document.createElement('div');
      it.style.cssText = `display:flex;align-items:center;gap:11px;padding:9px 13px;
        border-radius:10px;background:#161a26;border:1px solid #262c40;opacity:0;`;
      const ic = document.createElement('div');
      ic.style.cssText = `width:15px;height:15px;border-radius:5px;flex:none;
        background:linear-gradient(140deg,hsl(${hues[i]},75%,64%),hsl(${hues[i]},70%,46%));`;
      const tx = document.createElement('div');
      tx.textContent = s;
      tx.style.cssText = 'font:500 13px/1 -apple-system,sans-serif;color:#c6cde2';
      it.appendChild(ic); it.appendChild(tx);
      list.appendChild(it);
      return it;
    });
    return t => {
      // 整体：全程线性缓慢上移
      list.style.transform = `translateY(${lerp(t, 16, -16)}px)`;
      items.forEach((it, i) => {
        const p = seg(t, 0.06 + i * 0.09, 0.06 + i * 0.09 + 0.24, E.outBack);
        it.style.opacity = Math.min(1, p * 2.2);
        it.style.transform = `scale(${0.78 + Math.max(0, p) * 0.22}) translateY(${lerp(Math.max(0, p), 14, 0)}px)`;
      });
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
