/* assemble-then-type-flyin — MotionLab 动效模板（Assemble + Type Fly-in 装配后文字 3D 落位）
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
const SERIF = "Georgia,'Times New Roman',serif";
const MONO2 = "'SF Mono',Menlo,Consolas,monospace";
const SERIF2 = "Georgia,'Times New Roman',serif";

MotionLab.register({
  id: 'b29-assemble-then-type-flyin',
  title: 'Assemble + Type Fly-in 装配后文字 3D 落位',
  src: 'reference/brand-scan',
  cat: 'effects',
  dur: 5200,
  tags: ['无扫描线', '组件四方飞入(无字)', '文字逐字 3D 旋转落位'],
  desc: '空的暗底网格页面上，无文字的组件骨架（框、卡片、分隔线、色块）先从四面八方飞入贴合；随后各处文字从 3D 空间逐字飞来——每个字符带独立的大角度 rotateX/Y/Z 旋转与纵深位移，旋转着落到自己应在的位置，先大标题后小标注，全部落位后页面成形。内容为中性占位模板，强调色可按项目替换。',
  setup(stage, { E, lerp, seg }) {
    stage.style.background = '#0a0b0e';
    const A_RGB = '159,182,232'; // 模板强调色，可按项目替换
    const sc = (stage.clientWidth || 480) / 480;
    const rand = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;left:0;top:0;width:480px;height:270px;' +
      `transform-origin:0 0;transform:scale(${sc});overflow:hidden;` +
      'background:linear-gradient(180deg,#101116,#0c0d11);';
    stage.appendChild(root);
    const gridBg = document.createElement('div');
    gridBg.style.cssText = 'position:absolute;inset:0;opacity:.5;' +
      'background:repeating-linear-gradient(0deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px),' +
      'repeating-linear-gradient(90deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px);';
    root.appendChild(gridBg);

    /* ---- 组件骨架（全部无文字） ---- */
    const shells = [];
    const shell = (css, from, rot, ft) => {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;will-change:transform,opacity,filter;opacity:0;' + css;
      root.appendChild(d);
      shells.push({ node: d, from, rot, ft });
      return d;
    };
    // 顶栏 url pill + 右侧短线
    shell('left:18px;top:11px;width:78px;height:14px;border:1px solid #2a2c33;border-radius:9px;', [0, -60], 0, 0.04);
    shell('right:18px;top:16px;width:52px;height:5px;background:#1d1f26;border-radius:2px;', [80, -40], 4, 0.07);
    // logo 点阵
    const mark = shell('left:24px;top:37px;width:10px;height:10px;', [-140, -30], -8, 0.10);
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `position:absolute;width:4px;height:4px;border-radius:50%;background:#e8e9ee;left:${(i % 2) * 6}px;top:${(i >> 1) * 6}px;`;
      mark.appendChild(dot);
    }
    // 右侧模块卡（含分隔线与缩略块，无文字）
    const card = shell('left:296px;top:52px;width:162px;height:150px;background:#121319;border:1px solid #23252d;border-radius:5px;', [220, 30], 6, 0.13);
    const cel = css => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;' + css; card.appendChild(d); return d; };
    cel('left:0;top:24px;width:100%;height:1px;background:#1e2028;');
    cel('left:0;top:104px;width:100%;height:1px;background:#1e2028;');
    for (let i = 0; i < 4; i++) cel(`left:${10 + i * 30}px;top:124px;width:24px;height:16px;background:#1a1c23;border-radius:2px;`);
    // CTA pill 骨架
    shell('left:22px;top:166px;width:74px;height:24px;border:1px solid #3a3d46;border-radius:12px;', [-70, 120], -4, 0.17);
    // 社交 x 方块
    shell('left:352px;top:241px;width:11px;height:11px;border:1px solid #3a3d46;border-radius:2px;', [130, 60], 5, 0.20);

    /* ---- 文字（逐字 3D 飞入） ---- */
    const texts = [];
    let charSeed = 0;
    // block: {x,y,font,color,ls,text,start,italicFrom} — span 走正常排版，动画只动 transform
    const addText = (x, y, font, color, ls, text, start, html) => {
      const box = document.createElement('div');
      box.style.cssText = `position:absolute;left:${x}px;top:${y}px;font:${font};color:${color};` +
        `letter-spacing:${ls}px;white-space:nowrap;`;
      root.appendChild(box);
      const chars = [];
      const frag = html || text;
      for (const seg of (Array.isArray(frag) ? frag : [{ s: frag }])) {
        const wrap = document.createElement('span');
        if (seg.i) wrap.style.fontStyle = 'italic';
        box.appendChild(wrap);
        for (const ch of seg.s) {
          const sp = document.createElement('span');
          sp.textContent = ch === ' ' ? ' ' : ch;
          sp.style.cssText = 'display:inline-block;will-change:transform,opacity;opacity:0;';
          wrap.appendChild(sp);
          const k = charSeed++;
          chars.push({
            sp,
            dx: (rand(k) - 0.5) * 340, dy: (rand(k + 50) - 0.5) * 260, dz: -120 - rand(k + 99) * 300,
            rx: (rand(k + 7) - 0.5) * 340, ry: (rand(k + 13) - 0.5) * 380, rz: (rand(k + 23) - 0.5) * 240,
          });
        }
      }
      texts.push({ chars, start });
      return box;
    };
    // 大字先落（0.34 起），小标注后落
    addText(22, 64, `400 29px ${SERIF2}`, '#f2f3f6', 0.3, null, 0.34, [{ s: 'The headline for' }]);
    addText(22, 100, `400 29px ${SERIF2}`, '#f2f3f6', 0.3, null, 0.40, [{ s: 'your product here', i: 1 }]);
    addText(41, 35, `400 13px ${SERIF2}`, '#eceef2', 0, null, 0.47, [{ s: 'Acme ' }, { s: 'Studio', i: 1 }]);
    addText(316, 96, `italic 400 36px ${SERIF2}`, '#f4f5f8', 0, null, 0.50, [{ s: 'sample', i: 1 }]);
    addText(34, 172, `600 7.5px ${MONO2}`, '#e8e9ee', 1.5, 'GET STARTED', 0.58);
    addText(122, 173, `500 7.5px ${MONO2}`, '#6a707c', 1.5, 'DOCS', 0.62);
    addText(24, 14, `500 7px ${MONO2}`, '#8d93a0', 1, 'app.example.com', 0.64);
    addText(306, 61, `500 6.5px ${MONO2}`, '#7c828e', 1.5, 'WORK', 0.66);
    addText(432, 61, `500 6.5px ${MONO2}`, '#565b66', 1.5, '04 / 08', 0.68);
    addText(306, 164, `500 6px ${MONO2}`, '#6a707c', 1.5, 'KINETIC TYPE · 04', 0.70);
    addText(22, 143, `500 6.5px ${MONO2}`, '#565b66', 1.5, 'H1 · UI-SERIF / GEORGIA', 0.72);
    addText(18, 246, `500 6.5px ${MONO2}`, '#4c515c', 1.5, 'A PRODUCT OF ACME · ACME LABS, INC.', 0.74);
    addText(369, 242, `600 7.5px ${MONO2}`, '#c9cdd6', 1.5, '@USERNAME', 0.76);

    return t => {
      // 阶段一：骨架四方飞入（无字）
      for (const s of shells) {
        const a = seg(t, s.ft, s.ft + 0.14, E.outBack);
        s.node.style.opacity = t >= s.ft ? Math.min(1, seg(t, s.ft, s.ft + 0.05) * 1.5) : 0;
        s.node.style.transform = `translate(${lerp(a, s.from[0], 0)}px,${lerp(a, s.from[1], 0)}px) rotate(${lerp(a, s.rot, 0)}deg)`;
        const sp = a > 0 && a < 0.97 ? 1 - a : 0;
        s.node.style.filter = sp > 0.03 ? `blur(${sp * 2}px)` : 'none';
      }
      // 阶段二：文字逐字 3D 旋转落位（间隔按块长自适应，保证 t≈0.95 前全部落位）
      for (const blk of texts) {
        const step = Math.min(0.012, Math.max(0.002, (0.94 - blk.start - 0.13) / blk.chars.length));
        blk.chars.forEach((c, i) => {
          const ft = blk.start + i * step;
          const a = seg(t, ft, ft + 0.13, E.outCubic);
          c.sp.style.opacity = a > 0 ? Math.min(1, a * 1.8) : 0;
          c.sp.style.transform = a >= 1 ? 'none' :
            `perspective(600px) translate3d(${lerp(a, c.dx, 0)}px,${lerp(a, c.dy, 0)}px,${lerp(a, c.dz, 0)}px) ` +
            `rotateX(${lerp(a, c.rx, 0)}deg) rotateY(${lerp(a, c.ry, 0)}deg) rotateZ(${lerp(a, c.rz, 0)}deg)`;
        });
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
