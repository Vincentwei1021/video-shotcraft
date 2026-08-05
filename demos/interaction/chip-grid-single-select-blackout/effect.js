/* chip-grid-single-select-blackout — MotionLab 动效模板（Single Select 1 帧灰闪单选反黑）
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
const SRC = 'x.com/Jerrythe2d';
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
const INK = '#0B0B0C';
const TXT = '#111111';
const LINE = '#E6E6EA';
const el = (tag, css, parent, txt) => {
  const n = document.createElement(tag);
  if (css) n.style.cssText = css;
  if (txt != null) n.textContent = txt;
  if (parent) parent.appendChild(n);
  return n;
};
const mix = (p, a, b) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};
const mkSheet = (stage, bg) => {
  const page = el('div', `position:absolute;inset:0;background:${bg || BG};overflow:hidden;
    font-family:${SANS};-webkit-font-smoothing:antialiased;`, stage);
  const inner = el('div', `position:absolute;left:50%;top:50%;width:440px;height:240px;
    margin:-120px 0 0 -220px;`, page);
  return inner;
};
const mkCaption = (parent, text, css, size) => {
  const row = el('div', `position:absolute;display:flex;align-items:baseline;white-space:nowrap;`
    + `${css || ''}`, parent);
  const words = text.split(' ').map((w, i) => el('span',
    `font:600 ${size || 12.5}px/1.25 ${SANS};color:${DIM};letter-spacing:-0.03em;
     margin-right:${i === text.split(' ').length - 1 ? 0 : 4.5}px;`, row, w));
  const n = words.length;
  const st = 0.78 / n, win = st * 1.5;
  return {
    row, words,
    /* p: 0..1 入场加深进度 */
    inn(p) {
      for (let i = 0; i < n; i++) {
        const q = clamp01((p - i * st) / win);
        words[i].style.color = mix(q, DIM, TXT);
        words[i].style.letterSpacing = (-0.03 * (1 - q)).toFixed(4) + 'em';
      }
    },
    /* q: 0..1 出场（逐词淡回浅灰 + 整行透明） */
    out(q) {
      const stw = 0.55 / n;
      for (let i = 0; i < n; i++) {
        const p = clamp01((q - i * stw) / (stw * 1.4));
        words[i].style.color = mix(1 - p, DIM, TXT);
      }
      row.style.opacity = clamp01(1 - (q - 0.7) / 0.3);
    },
    show(v) { row.style.opacity = v; },
  };
};

R({
  id: 'b09-chip-grid-single-select-blackout',
  title: 'Single Select 1 帧灰闪单选反黑',
  src: SRC, cat: 'interaction', dur: 5000,
  tags: ['1 帧按压灰闪', '余项降到 18% 不位移', '选中项上移收窄'],
  desc: '五个选项 chip 以 3+2 居中排布逐个淡入；选中帧先插一帧灰色按压块，紧接 3 帧内底色变纯黑、文字变白并做 1→1.04→1 的极轻回弹，同窗口其余 chip 淡到 18% 但位置锁死；1s 后余项归零，黑 chip 上移缩小，下方浮现算式行。',
  setup(stage, { E, lerp, seg }) {
    const inner = mkSheet(stage);
    const NAMES = ['Option one plan', 'Option two plan', 'Option three long name', 'Option four', 'Option five variant'];
    const TI = 0;
    const title = el('div', `position:absolute;left:0;right:0;top:26px;text-align:center;
      font:600 11px/1 ${SANS};letter-spacing:2.4px;color:#9A9AA2;opacity:0;`, inner, 'OPTION GROUP');
    const rowsWrap = [
      el('div', `position:absolute;left:0;right:0;top:96px;display:flex;justify-content:center;gap:10px;`, inner),
      el('div', `position:absolute;left:0;right:0;top:136px;display:flex;justify-content:center;gap:10px;`, inner),
    ];
    const chips = NAMES.map((n, i) => {
      const host = rowsWrap[i < 3 ? 0 : 1];
      const c = el('div', `position:relative;height:30px;border-radius:15px;background:#fff;
        border:1px solid ${LINE};box-sizing:border-box;display:flex;align-items:center;
        padding:0 15px;box-shadow:0 1px 4px rgba(0,0,0,.04);opacity:0;overflow:hidden;`, host);
      const label = el('div', `font:600 12px/1 ${SANS};color:${TXT};letter-spacing:-.01em;white-space:nowrap;`, c, n);
      const flash = el('div', 'position:absolute;inset:0;background:rgba(120,120,120,.5);opacity:0;', c);
      return { el: c, label, flash };
    });
    const target = chips[TI];
    const formula = mkCaption(inner, '18% off  ·  42.00  →  34.44', 'left:50%;top:150px;', 14);
    formula.row.style.transform = 'translateX(-50%)';
    formula.show(0);

    const FS = 0.44;
    let cx = 0, measured = false;
    return t => {
      // 选中 chip 上移时同步回到水平中线（其余 chip 位置锁死不重排）
      if (!measured && target.el.offsetWidth) {
        cx = 220 - (target.el.offsetLeft + target.el.offsetWidth / 2);
        measured = true;
      }
      title.style.opacity = seg(t, 0.02, 0.1, E.outQuad);
      chips.forEach((c, i) => {
        const d = 0.05 + i * 0.028;
        const inP = seg(t, d, d + 0.04, E.outQuad);
        if (i === TI) {
          // 灰闪 1 帧
          c.flash.style.opacity = (seg(t, FS, FS + 0.006) * (1 - seg(t, FS + 0.006, FS + 0.014))).toFixed(3);
          const bk = seg(t, FS + 0.008, FS + 0.04, E.linear);
          c.el.style.background = mix(bk, '#ffffff', INK);
          c.el.style.borderColor = mix(bk, LINE, INK);
          c.label.style.color = mix(bk, TXT, '#ffffff');
          // 按压回弹 1→1.04→1
          const pr = seg(t, FS + 0.008, FS + 0.075, E.linear);
          const sc = 1 + Math.sin(pr * Math.PI) * 0.04 * (pr > 0 ? 1 : 0);
          const lift = seg(t, FS + 0.30, FS + 0.42, E.inOutCubic);
          c.el.style.opacity = inP;
          c.el.style.transform = `translate(${(cx * lift).toFixed(2)}px,${(-46 * lift).toFixed(2)}px) `
            + `scale(${(sc * lerp(lift, 1, 0.82)).toFixed(4)})`;
        } else {
          const fade = seg(t, FS + 0.008, FS + 0.075, E.outQuad);
          const gone = seg(t, FS + 0.30, FS + 0.35, E.outQuad);
          c.el.style.opacity = (inP * lerp(fade, 1, 0.18) * (1 - gone)).toFixed(3);
          c.el.style.transform = 'none';
        }
      });
      formula.show(seg(t, FS + 0.36, FS + 0.42));
      formula.inn(seg(t, FS + 0.37, 0.98));
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
