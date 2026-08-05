/* glass-pill-dictation-typing — MotionLab 动效模板（Glass Pill Dictation 玻璃胶囊听写）
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
const SRC = 'x.com/aizal_mp4';
const mk = (p, css, tag) => {
  const d = document.createElement(tag || 'div');
  d.style.cssText = css;
  p.appendChild(d);
  return d;
};
const UI = '-apple-system,system-ui,"Segoe UI",sans-serif';
const mkBars = (parent, n, color, w, gap) => {
  const wrap = mk(parent, `display:flex;align-items:center;gap:${gap}px;height:100%`);
  const bars = [];
  for (let i = 0; i < n; i++) bars.push(mk(wrap, `width:${w}px;border-radius:${w}px;background:${color};height:4px;`));
  return { wrap, bars };
};

R({
  id: 'b18-glass-pill-dictation-typing',
  title: 'Glass Pill Dictation 玻璃胶囊听写',
  src: SRC, cat: 'interaction', dur: 1650,
  tags: ['整体过冲缩放落位', '内嵌强调色光渐熄', '听写方标声波'],
  desc: '纯黑底上一条定宽玻璃胶囊：整条以约 1.25 倍略大弹出后缓落到位，胶囊内部自左暗到右亮铺一层强调色光（ACCENT 变量，默认紫）；光标先行出现，随后打字出现占位句「Speak or type here」，光随打字进度渐渐熄灭，收尾成中性深色玻璃条；右端是描边圆角方块里的竖条声波图标——全片最安静的一拍。',
  setup(stage, { E, lerp, seg }) {
    // 模板强调色：实际使用时按项目品牌色替换这一个变量（内嵌光 + 外泛光共用）
    const ACCENT_RGB = '146,126,212';
    const root = mk(stage, 'position:absolute;inset:0;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center;');
    const PH = 46, ICON = 30;
    const pill = mk(root, `position:relative;height:${PH}px;border-radius:${PH / 2}px;box-sizing:border-box;
      display:flex;align-items:center;padding:0 8px 0 16px;overflow:hidden;
      background:#0d0d13;will-change:transform,opacity;`);
    // 内嵌强调色光：左暗右亮的渐层，随打字进度熄灭（原片光在胶囊内部，无外部光晕）
    const glow = mk(pill, `position:absolute;inset:0;pointer-events:none;
      background:linear-gradient(90deg,rgba(${ACCENT_RGB},0) 0%,rgba(${ACCENT_RGB},.35) 42%,rgba(${ACCENT_RGB},.95) 100%);`);
    const txt = mk(pill, `position:relative;font:400 21px ${UI};color:#f4f4f5;white-space:pre;letter-spacing:.3px;flex:none;`);
    const caret = mk(pill, `position:relative;width:2px;height:23px;border-radius:1px;background:#eaeaec;margin-left:2px;flex:none;`);
    const iconBox = mk(pill, `position:relative;margin-left:auto;width:${ICON}px;height:${ICON}px;border-radius:9px;box-sizing:border-box;
      border:1.5px solid rgba(255,255,255,.5);background:rgba(255,255,255,.05);
      display:flex;align-items:center;justify-content:center;flex:none;`);
    const wave = mkBars(iconBox, 5, '#ececee', 1.5, 2.2);
    const BASE = [13, 7, 10, 6, 9];                        // 竖条基准高度（左高右低的听写图标）

    const TEXT = 'Speak or type here';       // 占位句，长度贴近原片（19→18 字符），打字节奏不变
    // 定宽：原片胶囊宽度约为整句文本宽度的 2 倍，不随词伸缩
    const meas = mk(root, `position:absolute;visibility:hidden;white-space:pre;font:400 21px ${UI};letter-spacing:.3px;top:-999px;`);
    meas.textContent = TEXT;
    const PW = Math.round(meas.offsetWidth + 168);

    return t => {
      // 出场：整体略大（~1.25x）快速浮现，约 0.45s 内缓落到位
      const s = lerp(seg(t, 0, 0.22, E.outCubic), 1.25, 1);
      pill.style.width = `${PW}px`;
      pill.style.opacity = seg(t, 0, 0.025).toFixed(3);
      pill.style.transform = `scale(${s.toFixed(4)})`;
      // 打字：caret 先行（~t0.03），字符 t0.06→0.73 匀速铺完，尾段保持
      const n = Math.floor(seg(t, 0.06, 0.73) * TEXT.length + 1e-6);
      txt.textContent = TEXT.slice(0, n);
      caret.style.opacity = (seg(t, 0.025, 0.045) * (1 - seg(t, 0.75, 0.8))).toFixed(3);
      // 强调色光随打字进度渐熄；同步收掉描边亮度的一点富余
      const g = 1 - seg(t, 0.08, 0.76, E.inOutQuad);
      glow.style.opacity = g.toFixed(3);
      pill.style.boxShadow = `inset 0 0 0 1px rgba(255,255,255,${(0.16 + 0.1 * g).toFixed(3)}), inset 0 14px 22px rgba(255,255,255,${(0.03 + 0.04 * g).toFixed(3)}), 0 0 ${(26 * g).toFixed(1)}px rgba(${ACCENT_RGB},${(0.28 * g).toFixed(3)})`;
      // 声波竖条轻微呼吸（原片几乎静止，仅微动）
      wave.bars.forEach((b, i) => {
        b.style.height = `${(BASE[i] + 1.6 * Math.sin(t * 18 + i * 1.7)).toFixed(2)}px`;
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
