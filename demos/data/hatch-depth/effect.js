/* hatch-depth — MotionLab 动效模板（Hatch → Depth Chart 斜纹柱实体化）
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
  id: 'hatch-depth', title: 'Hatch → Depth Chart 斜纹柱实体化',
  src: 'x.com/amirdzm', cat: 'data', dur: 4400,
  tags: ['占位→数据', '两段填充'],
  desc: '标签下的斜纹条逐条 wipe 伸长（保持 45° 斜纹占位质感），随后斜纹层淡出、强调色实心层淡入，蜕变为数据横柱条形图——几何无跳变、只换纹理与颜色，讲"占位变真数据"的隐喻。',
  setup(stage, { E, seg }) {
    const ACCENT = '#5B8DEF';               // 模板强调色，可按项目替换
    const ACCENT_HI = '#8FB2F7';            // 同族高亮（数值文字）
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;inset:0;background:#0a0a0c;padding:36px 60px;
      display:flex;flex-direction:column;justify-content:center;gap:13px;font-family:"SF Mono",monospace;`;
    stage.appendChild(wrap);
    const rows = [];
    const widths = [0.85, 0.55, 0.95, 0.4, 0.7];
    const labels = ['SERIES_A', 'SERIES_B', 'GROUP_C', 'GROUP_D', 'OTHER_E'];
    labels.forEach((lb, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:14px;height:26px';
      const label = document.createElement('span');
      label.textContent = lb;
      label.style.cssText = 'color:#8b91a3;font-size:11px;width:70px;flex:none;text-align:right';
      const barHost = document.createElement('div');
      barHost.style.cssText = 'position:relative;height:100%;flex:1';
      const hatch = document.createElement('div');
      hatch.style.cssText = `position:absolute;left:0;top:0;height:100%;width:0;border-radius:3px;
        background:repeating-linear-gradient(45deg,#565860 0 4px,transparent 4px 9px);
        border:1px solid #565860;`;
      const solid = document.createElement('div');
      solid.style.cssText = `position:absolute;left:0;top:0;height:100%;width:0;border-radius:3px;
        background:linear-gradient(90deg,${ACCENT},${ACCENT_HI});opacity:0;`;
      const val = document.createElement('span');
      val.style.cssText = `position:absolute;top:50%;transform:translateY(-50%);color:${ACCENT_HI};font-size:10px;opacity:0`;
      barHost.appendChild(hatch); barHost.appendChild(solid); barHost.appendChild(val);
      row.appendChild(label); row.appendChild(barHost);
      wrap.appendChild(row);
      rows.push({ label, hatch, solid, val, w: widths[i], i });
    });
    const head = document.createElement('div');
    head.innerHTML = '<span style="color:#e8eaf0;font-weight:700">METRICS</span>&nbsp;&nbsp;<span style="color:#67d17c">● LIVE</span>&nbsp;&nbsp;<span style="color:#8b91a3">TOTAL 875K&nbsp;&nbsp;AVG 1.02M</span>';
    head.style.cssText = 'position:absolute;top:20px;left:60px;font:600 12px "SF Mono",monospace;letter-spacing:1px;transform:translateY(-30px);opacity:0';
    wrap.appendChild(head);
    return t => {
      for (const { label, hatch, solid, val, w, i } of rows) {
        const grow = seg(t, 0.06 + i * 0.05, 0.06 + i * 0.05 + 0.22, E.outCubic);
        const morph = seg(t, 0.5 + i * 0.03, 0.5 + i * 0.03 + 0.14);
        const wiggle = 1 + Math.sin(t * 30 + i * 2.1) * 0.02 * seg(t, 0.7, 0.85);
        const wPct = grow * w * 100 * wiggle;
        hatch.style.width = wPct + '%';
        solid.style.width = wPct + '%';
        hatch.style.opacity = 1 - morph;
        solid.style.opacity = morph;
        label.style.color = morph > 0.5 ? '#5c626f' : '#8b91a3';
        val.textContent = Math.round(w * 420 * grow) + 'K';
        val.style.left = `calc(${wPct}% + 8px)`;
        val.style.opacity = morph;
      }
      const headIn = seg(t, 0.62, 0.78, E.outCubic);
      head.style.transform = `translateY(${-30 + headIn * 30}px)`;
      head.style.opacity = headIn;
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
