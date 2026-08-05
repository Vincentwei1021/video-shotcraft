/* pill-chip-slot-cycle-handled — MotionLab 动效模板（Chip Slot Cycle 胶囊滚轮挤开）
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
  id: 'b11-pill-chip-slot-cycle-handled',
  title: 'Chip Slot Cycle 胶囊滚轮挤开',
  src: 'x.com/1amanly',
  cat: 'typography', dur: 5000,
  tags: ['垂直滚轮', '宽度自适应挤开', '幽灵项'],
  desc: '白底句式 "Your [chip] Handled"：深色胶囊内词垂直滚轮轮换（Sales→Workflow→Admin→Reports），上下露出灰色幽灵项，胶囊宽度随词长平滑变化，两侧文字被自然挤开收拢。',
  setup(stage, { E, lerp, seg }) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;inset:0;background:#fbfbfd;display:flex;
      align-items:center;justify-content:center;font-family:-apple-system,system-ui,sans-serif;`;
    stage.appendChild(wrap);

    const WORDS = [
      { w: 'Sales', e: '⚡' }, { w: 'Workflow', e: '📈' },
      { w: 'Admin', e: '⚙️' }, { w: 'Reports', e: '📄' },
    ];
    const FONT = '700 22px -apple-system,system-ui,sans-serif';

    // 量宽
    const meas = document.createElement('span');
    meas.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${FONT};`;
    wrap.appendChild(meas);
    const widths = WORDS.map(o => {
      meas.textContent = o.w;
      const w = meas.offsetWidth || o.w.length * 13; // 兜底：setup 时未挂载
      return w + 74;
    });
    meas.remove();

    const mkSide = txt => {
      const s = document.createElement('div');
      s.textContent = txt;
      s.style.cssText = 'color:#15171d;font-weight:800;font-size:30px;letter-spacing:-0.5px;flex:none;';
      return s;
    };
    const chip = document.createElement('div');
    chip.style.cssText = `position:relative;height:48px;margin:0 14px;flex:none;
      border-radius:99px;background:#1a1c24;box-shadow:0 8px 24px rgba(20,22,40,.22);
      overflow:hidden;`;
    const colIn = document.createElement('div');
    colIn.style.cssText = 'position:absolute;left:0;right:0;top:0;';
    WORDS.forEach(o => {
      const row = document.createElement('div');
      row.style.cssText = `height:48px;display:flex;align-items:center;gap:9px;
        padding-left:18px;white-space:nowrap;`;
      row.innerHTML = `<span style="font-size:18px">${o.e}</span>
        <span style="font:${FONT};color:#fff">${o.w}</span>`;
      colIn.appendChild(row);
    });
    chip.appendChild(colIn);

    // 幽灵项（chip 外，上/下）
    const mkGhost = () => {
      const g = document.createElement('div');
      g.style.cssText = `position:absolute;left:50%;transform:translateX(-50%);
        font:${FONT};color:#15171d;opacity:0.13;white-space:nowrap;`;
      chipWrap.appendChild(g);
      return g;
    };
    const chipWrap = document.createElement('div');
    chipWrap.style.cssText = 'position:relative;flex:none;';
    chipWrap.appendChild(chip);
    const gTop = mkGhost(), gBot = mkGhost();
    gTop.style.top = '-38px'; gBot.style.top = '58px';

    wrap.append(mkSide('Your'), chipWrap, mkSide('Handled'));

    return t => {
      // 三次切换：0.25 / 0.47 / 0.69
      let pos = 0;
      [0.25, 0.47, 0.69].forEach(s0 => { pos += seg(t, s0, s0 + 0.12, E.inOutCubic); });
      const ci = Math.min(WORDS.length - 1, Math.floor(pos));
      const frac = pos - ci;

      colIn.style.transform = `translateY(${-pos * 48}px)`;
      chip.style.width = lerp(frac, widths[ci], widths[Math.min(ci + 1, WORDS.length - 1)]) + 'px';

      // 幽灵项：当前词的前/后邻居，随滚动微移
      const near = Math.round(pos);
      gTop.textContent = near > 0 ? WORDS[near - 1].w : '';
      gBot.textContent = near < WORDS.length - 1 ? WORDS[near + 1].w : '';
      const roll = (pos - near) * 48 * 0.5;
      gTop.style.transform = `translateX(-50%) translateY(${-roll}px)`;
      gBot.style.transform = `translateX(-50%) translateY(${-roll}px)`;
      const settle = 1 - Math.min(1, Math.abs(pos - near) * 3);
      gTop.style.opacity = gBot.style.opacity = 0.13 * (0.4 + settle * 0.6);
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
