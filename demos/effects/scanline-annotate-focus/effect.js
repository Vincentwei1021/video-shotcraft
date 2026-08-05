/* scanline-annotate-focus — MotionLab 动效模板（Scanline Annotate 扫描分析取景标注）
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

// ---- 该效果依赖的共享页面构建函数 ----
const W = 480, H = 270;
const MONO = "'SF Mono',Menlo,Consolas,monospace";
const SERIF = "Georgia,'Times New Roman',serif";
function buildPage(stage) {
  stage.style.background = '#0a0b0e';
  const sc = (stage.clientWidth || W) / W;
  const root = document.createElement('div');
  root.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;` +
    `transform-origin:0 0;transform:scale(${sc});overflow:hidden;`;
  stage.appendChild(root);
  const page = document.createElement('div');
  page.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,#101116,#0c0d11);';
  root.appendChild(page);

  const parts = {};
  const grp = (key, css) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;' + css;
    page.appendChild(d);
    parts[key] = d;
    return d;
  };
  const sub = (parent, css, txt = '') => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;' + css;
    if (txt) d.textContent = txt;
    parent.appendChild(d);
    return d;
  };

  // 顶栏（url pill + 状态）
  const top = grp('topbar', 'left:0;top:0;width:480px;height:30px;');
  sub(top, `left:18px;top:11px;padding:3px 10px;border:1px solid #2a2c33;border-radius:9px;font:500 7px ${MONO};color:#8d93a0;letter-spacing:1px;`, 'app.example.com');
  sub(top, `right:18px;top:14px;font:500 7px ${MONO};color:#565b66;letter-spacing:1.5px;`, '200 OK · TLS');

  // logo：点阵 mark + 衬线字标
  const logo = grp('logo', 'left:24px;top:35px;width:100px;height:18px;');
  for (let i = 0; i < 4; i++)
    sub(logo, `width:4px;height:4px;border-radius:50%;background:#e8e9ee;left:${(i % 2) * 6}px;top:${2 + (i >> 1) * 6}px;`);
  sub(logo, `left:17px;top:0;font:400 13px ${SERIF};color:#eceef2;`).innerHTML = 'Acme <i>Studio</i>';

  // H1 两行 + 注脚
  const h1 = grp('h1', 'left:22px;top:64px;width:242px;height:84px;');
  sub(h1, `left:0;top:0;font:400 29px ${SERIF};color:#f2f3f6;letter-spacing:.3px;`, 'The headline for');
  sub(h1, `left:0;top:36px;font:italic 400 29px ${SERIF};color:#f2f3f6;letter-spacing:.3px;`, 'your product here');
  sub(h1, `left:1px;top:79px;font:500 6.5px ${MONO};color:#565b66;letter-spacing:1.5px;`, 'H1 · UI-SERIF / GEORGIA');

  // CTA 行
  const cta = grp('cta', 'left:22px;top:166px;width:136px;height:26px;');
  sub(cta, `left:0;top:0;padding:6px 13px;border:1px solid #3a3d46;border-radius:12px;font:600 7.5px ${MONO};color:#e8e9ee;letter-spacing:1.5px;`, 'GET STARTED');
  sub(cta, `left:100px;top:7px;font:500 7.5px ${MONO};color:#6a707c;letter-spacing:1.5px;`, 'DOCS');

  // 右侧模块卡
  const card = grp('module', 'left:296px;top:52px;width:162px;height:150px;background:#121319;border:1px solid #23252d;border-radius:5px;');
  sub(card, `left:10px;top:9px;font:500 6.5px ${MONO};color:#7c828e;letter-spacing:1.5px;`, 'WORK');
  sub(card, `right:10px;top:9px;font:500 6.5px ${MONO};color:#565b66;letter-spacing:1.5px;`, '04 / 08');
  sub(card, 'left:0;top:24px;width:100%;height:1px;background:#1e2028;');
  sub(card, `left:0;top:44px;width:100%;text-align:center;font:italic 400 36px ${SERIF};color:#f4f5f8;`, 'sample');
  sub(card, 'left:0;top:104px;width:100%;height:1px;background:#1e2028;');
  sub(card, `left:10px;top:112px;font:500 6px ${MONO};color:#6a707c;letter-spacing:1.5px;`, 'KINETIC TYPE · 04');
  for (let i = 0; i < 4; i++) sub(card, `left:${10 + i * 30}px;top:124px;width:24px;height:16px;background:#1a1c23;border-radius:2px;`);
  sub(card, `right:8px;top:129px;font:500 6px ${MONO};color:#565b66;`, '00:30');

  // 页脚 + 社交 chip
  const foot = grp('footer', 'left:18px;top:243px;width:220px;height:14px;');
  sub(foot, `left:0;top:3px;font:500 6.5px ${MONO};color:#4c515c;letter-spacing:1.5px;`, 'A PRODUCT OF ACME · ACME LABS, INC.');
  const soc = grp('social', 'left:352px;top:239px;width:108px;height:16px;');
  sub(soc, `left:0;top:2px;width:11px;height:11px;border:1px solid #3a3d46;border-radius:2px;font:600 7px ${MONO};color:#c9cdd6;text-align:center;line-height:11px;`, 'x');
  sub(soc, `left:17px;top:3px;font:600 7.5px ${MONO};color:#c9cdd6;letter-spacing:1.5px;`, '@USERNAME');

  return { root, page, parts };
}
function mkScanline(root, ACCENT, A_RGB) {
  const line = document.createElement('div');
  line.style.cssText = 'position:absolute;left:0;width:100%;height:40px;will-change:transform,opacity;' +
    `background:linear-gradient(180deg,transparent,rgba(${A_RGB},.07) 55%,rgba(${A_RGB},.02) 96%,transparent);`;
  const core = document.createElement('div');
  core.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:1.5px;' +
    `background:rgba(238,244,255,.9);box-shadow:0 0 7px ${ACCENT},0 0 18px rgba(${A_RGB},.35);`;
  line.appendChild(core);
  root.appendChild(line);
  return line;
}

R({
  id: 'b29-scanline-annotate-focus',
  title: 'Scanline Annotate 扫描分析取景标注',
  src: 'reference/brand-scan',
  cat: 'effects',
  dur: 4600,
  tags: ['扫描线自上而下', '取景框大→小对准', '按扫描顺序标注'],
  desc: '一条亮扫描线自上而下掠过页面，扫过之处按先后顺序弹出相机取景框：四角括号从约 1.75 倍大小快速收拢对准目标区块（对准瞬间轻微过冲再回稳），随后旁侧打出等宽小字标注。顶部状态行同步计数 00/06→06/06，扫完切换 ANALYSIS · COMPLETE。页面内容为中性占位模板，标注词与强调色均可按项目替换。',
  setup(stage, { E, lerp, seg }) {
    const ACCENT = '#9fb6e8', A_RGB = '159,182,232'; // 模板强调色，可按项目替换
    const { root, parts } = buildPage(stage);

    // 分析目标（key 对应 buildPage 的组件；bbox 手动微调留边）
    const targets = [
      { x: 18, y: 30, w: 108, h: 22, label: 'LOGO · MARK + WORDMARK', lx: 132, ly: 38 },
      { x: 292, y: 48, w: 170, h: 158, label: 'MODULE · KINETIC TYPE', lx: 292, ly: 36 },
      { x: 18, y: 58, w: 242, h: 78, label: 'H1 · SERIF DISPLAY', lx: 266, ly: 92 },
      { x: 18, y: 160, w: 136, h: 32, label: 'CTA · PRIMARY + GHOST', lx: 160, ly: 172 },
      { x: 14, y: 240, w: 224, h: 18, label: 'FOOTER · LEGAL', lx: 242, ly: 246 },
      { x: 348, y: 235, w: 116, h: 23, label: 'SOCIAL · BRAND VOICE', lx: 348, ly: 224 },
    ];
    // 触发时刻：扫描线（0.06→0.66 纵扫 -30→300）越过 bbox 下缘
    const rawT = tg => 0.06 + ((tg.y + tg.h + 30) / 330) * 0.60;
    let prev = -1;
    for (const tg of targets.slice().sort((a, b) => (a.y + a.h) - (b.y + b.h))) {
      tg.ft = Math.max(rawT(tg), prev + 0.05);   // 依序钳制最小间隔
      prev = tg.ft;
    }

    const mkCorner = (px, py) => {
      const c = document.createElement('div');
      c.style.cssText = `position:absolute;width:9px;height:9px;${px}:0;${py}:0;` +
        `border-${py}:1.5px solid #f2f3f5;border-${px}:1.5px solid #f2f3f5;`;
      return c;
    };
    const nodes = targets.map(tg => {
      const box = document.createElement('div');
      box.style.cssText = `position:absolute;left:${tg.x}px;top:${tg.y}px;width:${tg.w}px;height:${tg.h}px;` +
        'opacity:0;will-change:transform,opacity;';
      ['left,top', 'right,top', 'left,bottom', 'right,bottom'].forEach(s => {
        const [px, py] = s.split(',');
        box.appendChild(mkCorner(px, py));
      });
      const fill = document.createElement('div');
      fill.style.cssText = 'position:absolute;inset:1px;background:#fff;opacity:0;';
      box.appendChild(fill);
      const label = document.createElement('div');
      label.textContent = tg.label;
      label.style.cssText = `position:absolute;left:${tg.lx}px;top:${tg.ly}px;font:500 6.5px ${MONO};` +
        'color:#b8bdc7;letter-spacing:1.5px;opacity:0;will-change:transform,opacity;white-space:nowrap;';
      root.appendChild(box);
      root.appendChild(label);
      return { box, fill, label };
    });

    const line = mkScanline(root, ACCENT, A_RGB);

    const status = document.createElement('div');
    status.style.cssText = `position:absolute;left:50%;top:14px;transform:translateX(-50%);` +
      `font:600 7px ${MONO};letter-spacing:2px;color:#8d93a0;`;
    root.appendChild(status);

    return t => {
      const p = seg(t, 0.06, 0.66);
      const ly = lerp(p, -30, 300);
      line.style.transform = `translateY(${ly - 40}px)`;
      line.style.opacity = seg(t, 0.04, 0.09) * (1 - seg(t, 0.66, 0.71));

      let fired = 0;
      nodes.forEach((n, i) => {
        const ft = targets[i].ft;
        const a = seg(t, ft, ft + 0.11, E.outCubic);
        if (a > 0) fired++;
        const s = lerp(E.outBack(seg(t, ft, ft + 0.13)), 1.75, 1);
        n.box.style.opacity = Math.min(1, a * 1.6);
        n.box.style.transform = `scale(${a > 0 ? s : 1.75})`;
        n.fill.style.opacity = 0.07 * seg(t, ft + 0.04, ft + 0.09) * (1 - seg(t, ft + 0.09, ft + 0.22));
        const la = seg(t, ft + 0.05, ft + 0.16, E.outCubic);
        n.label.style.opacity = la;
        n.label.style.transform = `translateY(${lerp(la, 4, 0)}px)`;
      });

      const done = seg(t, 0.74, 0.80);
      if (done >= 1) {
        status.textContent = 'ANALYSIS · COMPLETE';
        status.style.color = ACCENT;
      } else {
        status.textContent = `SCAN · 0${fired}/0${targets.length}`;
        status.style.color = '#8d93a0';
      }
      status.style.opacity = seg(t, 0.03, 0.08);
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
