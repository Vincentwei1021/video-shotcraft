/* avatar-grid-radial-build-colorize — MotionLab 动效模板（Avatar Grid 分环生长随机染色）
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
const INK = '#111113';
const MID = '#8A8A8F';
const mix = (a, b, t) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
};
const paper = stage => {
  const s = document.createElement('div');
  s.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${PAPER};
    font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;`;
  stage.appendChild(s);
  return s;
};

R({
  id: 'b08-avatar-grid-radial-build-colorize', title: 'Avatar Grid 分环生长随机染色',
  src: 'x.com/Jerrythe2d', cat: 'data', dur: 5600,
  tags: ['按到中心距离分环 stagger', 'opacity+scale 无位移', '颜色插值染色'],
  desc: '8×7 小卡片网格由中心向四周分环生长（每 4 帧扩一环，1.2s 铺满），卡片内容可以是图标、图片或 logo（此处混合演示：首字母、通用图标符、色块缩略图三种占位，实际使用换成项目素材），只做 opacity+scale 0.8→1 不位移；铺满后约 15% 的卡片在 1s 内随机时刻把底色染成浅红、状态点转红，形成"异常项逐渐浮现"的呼吸感，标题层始终 100% 不透明。',
  setup(stage, { E, lerp, seg }) {
    const s = paper(stage);
    const COLS = 8, ROWS = 7, FPS = 30, TOTAL = 5.6 * FPS;
    const grid = document.createElement('div');
    grid.style.cssText = `position:absolute;inset:16px;display:grid;
      grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${ROWS},1fr);gap:10px;`;
    s.appendChild(grid);
    // 卡片内容三种占位：首字母(logo 位) / 图标符 / 色块缩略图(图片位)，实际使用换项目素材
    const INI = ['VS', 'KJ', 'EM', 'AL', 'TR', 'MN', 'BQ', 'DW', 'RC', 'SF', 'PL', 'GH'];
    const ICONS = ['◆', '▲', '●', '■', '✦', '◐', '❖', '▣'];
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const chip = document.createElement('div');
        /* 中央留空给标题 + 图例（visibility:hidden 占位，不破坏网格） */
        const hidden = r >= 2 && r <= 4 && c >= 1 && c <= 6;
        chip.style.cssText = `position:relative;border-radius:8px;background:#fff;border:1px solid #E7E7E4;
          display:flex;align-items:center;justify-content:center;overflow:hidden;
          font:700 11px/1 -apple-system,sans-serif;color:#3A3A3E;opacity:0;
          box-shadow:0 1px 2px rgba(0,0,0,.04);${hidden ? 'visibility:hidden;' : ''}`;
        const kind = Math.floor(rand(i * 9.1) * 3);   // 0=首字母 1=图标 2=图片缩略
        if (kind === 0) {
          chip.textContent = INI[Math.floor(rand(i * 3.7) * INI.length)];
        } else if (kind === 1) {
          chip.textContent = ICONS[Math.floor(rand(i * 5.3) * ICONS.length)];
          chip.style.fontSize = '13px';
          chip.style.color = '#6a6f7c';
        } else {
          const img = document.createElement('div');
          const h = Math.floor(rand(i * 7.7) * 360);
          img.style.cssText = `position:absolute;inset:0;border-radius:7px;
            background:linear-gradient(${45 + h % 90}deg, hsl(${h},18%,78%), hsl(${(h + 40) % 360},22%,62%));`;
          chip.appendChild(img);
        }
        const dot = document.createElement('div');
        dot.style.cssText = `position:absolute;right:4px;top:4px;width:5px;height:5px;border-radius:50%;
          background:#37C46B;`;
        chip.appendChild(dot);
        grid.appendChild(chip);
        const ring = Math.round(Math.hypot((c - 3.5) / 1.0, (r - 3) / 0.85));
        const delay = (ring * 4 + rand(i + 40) * 3) / TOTAL;
        const flagged = rand(i + 900) < 0.15;
        cells.push({ chip, dot, delay, flagged, at: 0.30 + rand(i + 1600) * 0.30 });
      }
    }
    const title = document.createElement('div');
    title.textContent = "Let's bring them back in";
    title.style.cssText = `position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);
      font:800 30px/1.2 -apple-system,'Helvetica Neue',sans-serif;letter-spacing:-1.2px;color:${INK};
      text-align:center;z-index:5;white-space:nowrap;`;
    s.appendChild(title);
    const legend = document.createElement('div');
    legend.style.cssText = `position:absolute;left:50%;top:56%;transform:translateX(-50%);
      display:flex;gap:14px;align-items:center;z-index:5;padding:4px 10px;opacity:0;white-space:nowrap;`;
    s.appendChild(legend);
    [['Active', '#37C46B'], ['Pending', '#F5A524'], ['Inactive', '#F0453A']].forEach(([txt, col]) => {
      const it = document.createElement('div');
      it.style.cssText = `display:flex;align-items:center;gap:5px;
        font:600 11px/1 -apple-system,sans-serif;color:${MID};`;
      const d = document.createElement('span');
      d.style.cssText = `width:6px;height:6px;border-radius:50%;background:${col};display:inline-block;`;
      const l = document.createElement('span');
      l.textContent = txt;
      it.appendChild(d); it.appendChild(l);
      legend.appendChild(it);
    });

    return t => {
      const tIn = seg(t, 0.02, 0.10, E.outQuad);
      title.style.opacity = tIn;
      title.style.transform = `translate(-50%,-50%) scale(${lerp(tIn, 0.98, 1)})`;
      legend.style.opacity = seg(t, 0.26, 0.36, E.outQuad);
      for (let i = 0; i < cells.length; i++) {
        const cl = cells[i];
        const f = 0.09 + cl.delay;
        const o = seg(t, f, f + 0.018, E.linear);
        const sc = seg(t, f, f + 0.03, E.outQuad);
        cl.chip.style.opacity = o;
        cl.chip.style.transform = `scale(${lerp(sc, 0.8, 1)})`;
        if (cl.flagged) {
          const cT = seg(t, cl.at, cl.at + 0.036, E.outQuad);
          cl.chip.style.background = mix('#ffffff', '#FDECEC', cT);
          cl.chip.style.borderColor = mix('#E7E7E4', '#F6CFCF', cT);
          cl.dot.style.background = mix('#37C46B', '#F0453A', cT);
        }
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
