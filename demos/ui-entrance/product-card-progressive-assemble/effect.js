/* product-card-progressive-assemble — MotionLab 动效模板（Progressive Assemble 字段逐个落位）
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
const SRC = 'x.com/tvnxty';
const ACCENT = '#ff6a1f';
const ACCENT_SOFT = 'rgba(255,122,26,.42)';

R({
  id: 'b06-product-card-progressive-assemble',
  title: 'Progressive Assemble 字段逐个落位',
  src: SRC, cat: 'ui-entrance', dur: 5000,
  tags: ['字段 stagger', '价格降级', '马克笔高亮'],
  desc: '详情卡像被逐字段抓取般自建：图→标题→breadcrumb pill 依次 pop→价格出现后被划线降级、强调色新价 spring 跳出→正文逐行揭示+强调色高亮块由左向右刷过→色卡点亮。整卡极慢 scale 前推保持呼吸。',
  setup(stage, { E, lerp, seg }) {
    stage.style.background = '#0d0e13';
    const card = document.createElement('div');
    card.style.cssText = `position:absolute;left:50%;top:50%;width:78%;height:74%;
      transform:translate(-50%,-50%);background:#f6f5f2;border-radius:12px;
      box-shadow:0 18px 50px rgba(0,0,0,.5);font-family:-apple-system,Helvetica,sans-serif;
      display:flex;padding:4.5%;box-sizing:border-box;gap:5%;`;
    stage.appendChild(card);

    const F = f => f / 60; // recipe 帧 → t
    const fields = []; // {el, t0, mode}
    const field = (el, f0, mode) => { fields.push({ el, t0: F(f0), mode: mode || 'rise' }); return el; };

    // 左：商品图占位
    const thumb = document.createElement('div');
    thumb.style.cssText = `flex:0 0 38%;background:#e2e0da;border-radius:8px;position:relative;overflow:hidden;`;
    const shape = document.createElement('div');
    shape.style.cssText = `position:absolute;left:18%;top:14%;width:64%;height:72%;
      background:linear-gradient(160deg,#2b3040,#171a24);border-radius:40% 40% 14% 14%/26% 26% 10% 10%;`;
    const zip = document.createElement('div');
    zip.style.cssText = 'position:absolute;left:49%;top:20%;width:2%;height:58%;background:#525a70;';
    shape.appendChild(zip); thumb.appendChild(shape);
    card.appendChild(field(thumb, 0));

    // 右列
    const col = document.createElement('div');
    col.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0;';
    card.appendChild(col);

    const title = document.createElement('div');
    title.textContent = 'Sample Product Title';
    title.style.cssText = 'font-size:19px;font-weight:800;color:#17181c;letter-spacing:-.3px;';
    col.appendChild(field(title, 4));

    // breadcrumb pills
    const crumbs = document.createElement('div');
    crumbs.style.cssText = 'display:flex;gap:6px;margin:8px 0 10px;';
    col.appendChild(crumbs);
    ['Category', 'Subgroup', 'Detail'].forEach((txt, i) => {
      const p = document.createElement('div');
      p.textContent = txt;
      p.style.cssText = `font-size:9px;font-weight:600;color:#5a5e6b;background:#e9e7e1;
        padding:3px 9px;border-radius:99px;`;
      crumbs.appendChild(field(p, 8 + i * 2, 'pop'));
    });

    // 价格
    const priceRow = document.createElement('div');
    priceRow.style.cssText = 'display:flex;align-items:baseline;gap:9px;margin-bottom:11px;';
    const oldP = document.createElement('span');
    oldP.textContent = '$249';
    oldP.style.cssText = 'font-size:21px;font-weight:800;color:#17181c;';
    const newP = document.createElement('span');
    newP.textContent = '$189';
    newP.style.cssText = `font-size:21px;font-weight:800;color:${ACCENT};opacity:0;`;
    priceRow.appendChild(oldP); priceRow.appendChild(newP);
    col.appendChild(field(priceRow, 16));

    // 描述行 + 马克笔高亮
    const marks = [];
    const lines = [
      [['Placeholder copy for '], ['a key highlight', 1], [' in the'] ],
      [['product body. '], ['Second highlight', 1], [' sits here on'] ],
      [['the third line of neutral sample text.']],
    ];
    const descWrap = document.createElement('div');
    descWrap.style.cssText = 'font-size:10.5px;line-height:1.75;color:#494d58;';
    col.appendChild(descWrap);
    const lineEls = [];
    lines.forEach((segs, li) => {
      const ln = document.createElement('div');
      ln.style.whiteSpace = 'nowrap';
      segs.forEach(([txt, isMark]) => {
        if (!isMark) { const s = document.createElement('span'); s.textContent = txt; ln.appendChild(s); return; }
        const m = document.createElement('span');
        m.style.cssText = 'position:relative;display:inline-block;';
        const hl = document.createElement('span');
        hl.style.cssText = `position:absolute;left:-2px;right:-2px;top:8%;bottom:4%;
          background:${ACCENT_SOFT};border-radius:2px;transform:scaleX(0);transform-origin:left center;`;
        const tx = document.createElement('span');
        tx.textContent = txt;
        tx.style.cssText = 'position:relative;font-weight:700;color:#26282f;';
        m.appendChild(hl); m.appendChild(tx); ln.appendChild(m);
        marks.push({ hl, t0: F(30 + li * 2 + 4) });
      });
      descWrap.appendChild(ln);
      lineEls.push(field(ln, 30 + li * 2));
    });

    // 色卡
    const swRow = document.createElement('div');
    swRow.style.cssText = 'display:flex;gap:7px;margin-top:auto;';
    col.appendChild(swRow);
    ['#191b20', '#8b8f99', '#3a5b8c'].forEach((cclr, i) => {
      const s = document.createElement('div');
      s.style.cssText = `width:16px;height:16px;border-radius:4px;background:${cclr};
        outline:1.5px solid rgba(0,0,0,.12);outline-offset:1.5px;`;
      swRow.appendChild(field(s, 40 + i * 2, 'pop'));
    });

    return t => {
      // 整卡呼吸前推
      const push = seg(t, 0, 0.75, E.outQuad);
      card.style.transform = `translate(-50%,-50%) scale(${lerp(push, 1, 1.06)})`;
      // 字段落位
      for (const f of fields) {
        const k = seg(t, f.t0, f.t0 + 0.1, E.outCubic);
        f.el.style.opacity = Math.min(1, k * 2);
        f.el.style.transform = f.mode === 'pop'
          ? `scale(${lerp(E.outBack(Math.min(1, k)), 0.4, 1)})`
          : `translateY(${lerp(k, 6, 0)}px)`;
      }
      // 价格降级（f=26）
      const cut = t >= F(26);
      oldP.style.color = cut ? '#9a9da6' : '#17181c';
      oldP.style.textDecoration = cut ? 'line-through' : 'none';
      oldP.style.fontSize = cut ? '15px' : '21px';
      const nk = seg(t, F(26), F(26) + 0.12);
      newP.style.opacity = Math.min(1, nk * 3);
      newP.style.transform = `scale(${lerp(E.spring(nk, 0.35), 1.15, 1)})`;
      // 马克笔
      for (const m of marks) {
        m.hl.style.transform = `scaleX(${seg(t, m.t0, m.t0 + 0.085, E.outCubic)})`;
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
