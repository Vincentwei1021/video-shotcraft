/* scanline-assemble-flyin — MotionLab 动效模板（Scanline Assemble 扫描装配组件飞入）
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
  id: 'b29-scanline-assemble-flyin',
  title: 'Scanline Assemble 扫描装配组件飞入',
  src: 'reference/brand-scan',
  cat: 'effects',
  dur: 4600,
  tags: ['扫描线自上而下', '组件四方飞入贴合', '空页面逐段成形'],
  desc: '页面开场为空的暗底网格，一条亮扫描线自上而下掠过；扫过每个区块的落点后，该处组件从画外四面八方飞入（左上 logo 自左、右侧模块卡自右、H1 自左下、CTA 自下、页脚社交自下方两侧），带轻微过冲和残影模糊，贴合落位瞬间闪一道细亮边。扫完整页恰好装配完成。页面内容为中性占位模板，强调色可按项目替换。',
  setup(stage, { E, lerp, seg }) {
    const ACCENT = '#9fb6e8', A_RGB = '159,182,232'; // 模板强调色，可按项目替换
    const { root, page, parts } = buildPage(stage);

    // 空页底：暗网格（组件飞入前唯一可见的东西）
    const gridBg = document.createElement('div');
    gridBg.style.cssText = 'position:absolute;inset:0;opacity:.5;' +
      'background:repeating-linear-gradient(0deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px),' +
      'repeating-linear-gradient(90deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px);';
    page.insertBefore(gridBg, page.firstChild);

    // 每个组件的飞入方案：{key, y 落点(触发用), from:[dx,dy], rot}
    const plan = [
      { key: 'topbar', y: 30, from: [0, -70], rot: 0 },
      { key: 'logo', y: 53, from: [-160, -30], rot: -6 },
      { key: 'module', y: 100, from: [230, 40], rot: 5 },
      { key: 'h1', y: 148, from: [-260, 60], rot: -4 },
      { key: 'cta', y: 192, from: [-60, 130], rot: 3 },
      { key: 'footer', y: 257, from: [-140, 70], rot: 2 },
      { key: 'social', y: 262, from: [150, 70], rot: -3 },
    ];
    // 触发时刻：扫描线（0.05→0.72 纵扫 -30→300）到达组件落点 y
    let prev = -1;
    for (const pl of plan) {
      pl.ft = Math.max(0.05 + ((pl.y + 30) / 330) * 0.67 - 0.02, prev + 0.045);
      prev = pl.ft;
      const n = parts[pl.key];
      n.style.willChange = 'transform,opacity,filter';
      n.style.opacity = '0';
      // 贴合闪边层
      const flash = document.createElement('div');
      flash.style.cssText = `position:absolute;inset:-3px;border:1px solid rgba(${A_RGB},.9);` +
        `border-radius:4px;opacity:0;pointer-events:none;`;
      n.appendChild(flash);
      pl.node = n;
      pl.flash = flash;
    }

    const line = mkScanline(root, ACCENT, A_RGB);

    const status = document.createElement('div');
    status.style.cssText = `position:absolute;left:50%;top:14px;transform:translateX(-50%);` +
      `font:600 7px ${MONO};letter-spacing:2px;color:#8d93a0;z-index:60;`;
    root.appendChild(status);

    return t => {
      const p = seg(t, 0.05, 0.72);
      const ly = lerp(p, -30, 300);
      line.style.transform = `translateY(${ly - 40}px)`;
      line.style.opacity = seg(t, 0.03, 0.08) * (1 - seg(t, 0.72, 0.77));

      let placed = 0;
      for (const pl of plan) {
        const a = seg(t, pl.ft, pl.ft + 0.15, E.outBack);   // 飞入（过冲贴合）
        const vis = t >= pl.ft ? 1 : 0;
        if (a >= 0.99) placed++;
        const dx = lerp(a, pl.from[0], 0);
        const dy = lerp(a, pl.from[1], 0);
        const rot = lerp(a, pl.rot, 0);
        pl.node.style.opacity = vis * Math.min(1, seg(t, pl.ft, pl.ft + 0.06) * 1.4);
        pl.node.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg)`;
        // 运动中残影模糊，落位即清晰
        const speed = a > 0 && a < 0.97 ? 1 - a : 0;
        pl.node.style.filter = speed > 0.03 ? `blur(${speed * 2.2}px)` : 'none';
        // 贴合瞬间闪一道细亮边
        pl.flash.style.opacity = seg(t, pl.ft + 0.11, pl.ft + 0.15) * (1 - seg(t, pl.ft + 0.15, pl.ft + 0.26));
      }

      const done = seg(t, 0.80, 0.86);
      if (done >= 1) {
        status.textContent = 'ASSEMBLY · COMPLETE';
        status.style.color = ACCENT;
      } else {
        status.textContent = `BUILD · 0${placed}/0${plan.length}`;
        status.style.color = '#8d93a0';
      }
      status.style.opacity = seg(t, 0.02, 0.07);
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
