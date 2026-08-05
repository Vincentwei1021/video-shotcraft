/* floating-glossy-label-pills — MotionLab 动效模板（Glossy Pills Carousel 高光胶囊横滑走廊）
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
  id: 'b12-floating-glossy-label-pills',
  title: 'Glossy Pills Carousel 高光胶囊横滑走廊',
  src: 'x.com/1amanly',
  cat: 'ui-entrance', dur: 4000,
  tags: ['横滑 carousel', '高光胶囊标签', '居中放大', 'wireframe 占位'],
  desc: '手法模板（面板内容为通用 wireframe 占位，落地时替换成真实页面截图即可；整卡只有一个 ACCENT 强调色变量，其余全是灰阶，按项目品牌色替换 ACCENT 即换肤）：白底四角强调色雾霭，四块浅灰 dashboard 占位 mockup（通用顶栏+左侧导航，分别是三栏卡片 / 折线图仪表盘 / 列表表格 / 表单+开关列表，全用灰色标题条、文本骨架条、色块图表拼出）横向排队，各顶一枚高光强调色胶囊标签（Feature A–D）；轨道环形循环，任一拍居中面板左右两侧都露出相邻面板的一截边缘，形成连续走廊感。开场有上一拍收尾余量（面板略偏左约 0.25s 内缓归位），随后轨道三拍向右换位（起点 t≈0.20 / 0.483 / 0.688，缓起→中段冲→缓收，第一拍更慢带长尾）——居中者放大清晰，两侧缩至 0.62、下沉变淡微模糊，整组面板+胶囊一起轻浮；t≈0.72 黑色描白边光标于右上（约 84%,13%）硬现，减速斜向左下滑，t≈0.90 停在末位胶囊右端后静止到底。',
  setup(stage, { E, lerp, seg }) {
    // ── 模板强调色：实际使用时按项目品牌色替换这一个变量 ──
    // 全卡其余颜色都是中性灰阶，唯一色相来源就是 ACCENT 及其深浅档；
    // 换品牌色只需改 ACCENT / ACCENT_LIGHT / ACCENT_DEEP 与对应的 rgb 分量。
    const ACCENT = '#7a8699';                    // 中性蓝灰做默认演示色
    const ACCENT_LIGHT = '#a8b2c0', ACCENT_DEEP = '#4c5666';
    const A_RGB = '122,134,153', AL_RGB = '168,178,192', AD_RGB = '76,86,102';
    const F = '-apple-system,BlinkMacSystemFont,sans-serif';
    const scene = document.createElement('div');
    scene.style.cssText = `position:absolute;inset:0;overflow:hidden;background:
      radial-gradient(55% 75% at 106% 42%, rgba(${A_RGB},.55), transparent 70%),
      radial-gradient(42% 50% at -6% 88%, rgba(${AD_RGB},.42), transparent 70%),
      radial-gradient(48% 40% at 12% -10%, rgba(${AL_RGB},.5), transparent 70%),
      #fbfbfc;`;
    stage.appendChild(scene);
    // 漂移雾块
    const fogs = [];
    for (let i = 0; i < 3; i++) {
      const fog = document.createElement('div');
      fog.style.cssText = `position:absolute;left:${[68, 4, 40][i]}%;top:${[8, 60, 82][i]}%;
        width:240px;height:160px;border-radius:50%;filter:blur(50px);
        background:rgba(${[AD_RGB, A_RGB, AL_RGB][i]},.14);`;
      scene.appendChild(fog); fogs.push(fog);
    }

    const ln = (par, css, txt) => {
      const d = document.createElement('div');
      d.style.cssText = css;
      if (txt) d.textContent = txt;
      par.appendChild(d);
      return d;
    };
    // 逐帧实测（480×270 裁切系）：
    //   居中面板 x 105-357（W≈252）、top=75，下缘正好压住画面底 → 真高 H≈195
    //   邻位（静止）面板 x -70..86（缩到 0.62）、top=126 → 缩放 + 下沉 51px
    //   相邻两块中心距 SP≈232
    // 内部 UI 按 330×255 的内容坐标书写，再整体等比 scale 到 252×195
    const CW = 330, CH = 255, CS = 252 / CW;
    const W = Math.round(CW * CS), H = Math.round(CH * CS), SP = 232;
    const PANEL_TOP = 75;
    const mkWin = () => {
      const outer = document.createElement('div');
      outer.style.cssText = `position:absolute;left:0;top:${PANEL_TOP}px;width:${W}px;height:${H}px;
        border-radius:8px;transform-origin:50% 0;
        box-shadow:0 0 0 1.5px rgba(${A_RGB},.6), 0 14px 34px rgba(${AD_RGB},.22);`;
      const m = document.createElement('div');
      m.style.cssText = `position:absolute;left:0;top:0;width:${CW}px;height:${CH}px;border-radius:10px;
        background:#fff;overflow:hidden;
        transform:scale(${CS});transform-origin:0 0;font-family:${F};`;
      outer.appendChild(m);
      return { outer, body: m };
    };
    // ── 通用占位（wireframe / skeleton）零件：全部只用灰条 + 色块，不写具体文案 ──
    const TITLE = '#a8adb5', TEXT = '#d4d7dd', FAINT = '#e3e5ea', LINE = '#eceef1';
    const skel = (par, x, y, w, h, col, r) =>
      ln(par, `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;
        border-radius:${r === undefined ? Math.min(h / 2, 3) : r}px;background:${col};`);
    // 窗口顶栏：强调色方块 + 字标灰条 + 右侧两枚圆点（各页面通用 chrome）
    const mkTopbar = m => {
      const bar = ln(m, 'position:absolute;left:0;top:0;width:100%;height:16px;background:#fff;border-bottom:1px solid #eceef1;z-index:1;');
      skel(bar, 8, 4, 8, 8, ACCENT, 2);
      skel(bar, 20, 6, 28, 5, '#b9bec6');
      ln(bar, 'position:absolute;right:8px;top:5.5px;width:5px;height:5px;border-radius:50%;background:#d8dbe0;');
      ln(bar, 'position:absolute;right:18px;top:5.5px;width:5px;height:5px;border-radius:50%;background:#d8dbe0;');
    };
    // 左侧导航：一条高亮项 + 若干灰条
    const mkSidebar = m => {
      const sb = ln(m, 'position:absolute;left:0;top:16px;width:70px;height:calc(100% - 16px);background:#f7f8f9;border-right:1px solid #eceef1;');
      skel(sb, 8, 8, 36, 8, ACCENT);
      for (let i = 0; i < 8; i++)
        skel(sb, 8, 26 + i * 11, 30 + rand(i + 9) * 22, 4, i === 1 ? ACCENT_LIGHT : '#d8dbe0');
    };
    // 1) 三栏卡片占位（居中标题 + 三张卡：标题条/大字块/文本骨架/按钮块）
    const bCards = m => {
      mkTopbar(m);
      skel(m, CW / 2 - 46, 30, 92, 9, TITLE);
      skel(m, CW / 2 - 70, 46, 140, 5, FAINT);
      for (let i = 0; i < 3; i++) {
        const col = ln(m, `position:absolute;left:${16 + i * 104}px;top:64px;width:92px;height:170px;
          border:1px solid ${LINE};border-radius:6px;background:#fff;`);
        skel(col, 10, 12, 38, 6, '#b9bec6');
        skel(col, 10, 26, 52, 14, TITLE, 4);
        for (let k = 0; k < 5; k++)
          skel(col, 10, 52 + k * 13, 44 + rand(i * 7 + k) * 26, 4, FAINT);
        skel(col, 10, 142, 72, 16, ACCENT, 4);
      }
    };
    // 2) 仪表盘占位（四枚数值卡 + 折线图占位）
    const bDash = m => {
      mkTopbar(m); mkSidebar(m);
      skel(m, 84, 26, 64, 9, TITLE);
      for (let i = 0; i < 4; i++) {
        const tile = ln(m, `position:absolute;left:${84 + i * 60}px;top:44px;width:54px;height:32px;
          border:1px solid ${LINE};border-radius:6px;background:#fff;`);
        skel(tile, 7, 7, 34, 8, TITLE);
        skel(tile, 7, 20, 22, 3, FAINT);
      }
      const chart = ln(m, `position:absolute;left:84px;top:86px;width:232px;height:146px;
        border:1px solid ${LINE};border-radius:6px;background:#fff;`);
      skel(chart, 8, 8, 56, 5, TEXT);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 232 146');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      area.setAttribute('d', 'M8 116 C 40 112, 56 62, 84 64 S 128 120, 152 116 S 196 50, 224 56 L224 134 L8 134 Z');
      area.setAttribute('fill', `rgba(${A_RGB},.18)`);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M8 116 C 40 112, 56 62, 84 64 S 128 120, 152 116 S 196 50, 224 56');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', ACCENT);
      path.setAttribute('stroke-width', '2');
      svg.appendChild(area); svg.appendChild(path); chart.appendChild(svg);
      for (let i = 0; i < 5; i++) skel(chart, 12 + i * 44, 138, 22, 3, FAINT);
    };
    // 3) 列表 / 表格占位（小统计条 + 多行骨架 + 状态色块）
    const bTable = m => {
      mkTopbar(m); mkSidebar(m);
      skel(m, 84, 26, 76, 9, TITLE);
      for (let i = 0; i < 4; i++) {
        const tile = ln(m, `position:absolute;left:${84 + i * 60}px;top:44px;width:54px;height:22px;
          border:1px solid ${LINE};border-radius:6px;background:#fff;`);
        skel(tile, 7, 7, 26 + rand(i + 3) * 14, 8, TITLE);
      }
      for (let i = 0; i < 7; i++) {
        const row = ln(m, `position:absolute;left:84px;top:${78 + i * 22}px;width:232px;height:18px;
          border-bottom:1px solid #f0f1f4;`);
        skel(row, 0, 6, 70 + rand(i + 21) * 60, 5, TEXT);
        // 状态色块保留功能色（异常淡红 / 正常淡绿）
        skel(row, 172, 4, 26, 9, i % 2 ? '#f2d6d6' : '#cdeccf', 4);
        ln(row, 'position:absolute;left:226px;top:6px;width:6px;height:6px;border-radius:50%;background:#28c06a;');
      }
    };
    // 4) 表单 + 开关列表占位（左侧字段框，右侧头像色块行 + 开关）
    const bForm = m => {
      mkTopbar(m); mkSidebar(m);
      skel(m, 84, 26, 96, 9, TITLE);
      skel(m, 84, 44, 44, 5, '#b9bec6');
      for (let i = 0; i < 3; i++) {
        skel(m, 84, 56 + i * 26, 34 + rand(i + 51) * 30, 4, TEXT);
        ln(m, `position:absolute;left:84px;top:${64 + i * 26}px;width:120px;height:13px;
          border:1px solid #dcdfe4;border-radius:4px;background:#fff;`);
      }
      skel(m, 84, 140, 120, 15, '#26282d', 8);
      skel(m, 84, 168, 60, 5, '#b9bec6');
      for (let i = 0; i < 3; i++) skel(m, 84, 180 + i * 9, 110 + rand(i + 71) * 60, 3, FAINT);
      skel(m, 218, 44, 40, 5, '#b9bec6');
      skel(m, 218, 122, 52, 5, '#b9bec6');
      for (let i = 0; i < 4; i++) {
        const row = ln(m, `position:absolute;left:218px;top:${56 + i * 30 + (i > 1 ? 22 : 0)}px;width:100px;height:22px;`);
        ln(row, `position:absolute;left:0;top:3px;width:13px;height:13px;border-radius:50%;
          background:hsl(${212 + i * 4},14%,${56 + i * 5}%);`);
        skel(row, 19, 3, 48, 4, '#c2c6cc');
        skel(row, 19, 11, 32, 4, FAINT);
        // 开关保留功能色（开=蓝 / 关=灰）
        const tg = ln(row, `position:absolute;right:0;top:4px;width:18px;height:10px;border-radius:6px;
          background:${i % 2 ? '#d6d9de' : '#2f7de1'};`);
        ln(tg, `position:absolute;top:1.5px;${i % 2 ? 'left:1.5px' : 'right:1.5px'};width:7px;height:7px;border-radius:50%;background:#fff;`);
      }
    };

    const mkPill = txt => {
      const p = document.createElement('div');
      // 实测居中胶囊：中心 y≈45、高 21-23，宽两档 121 / 145（原片是两条不同长度的标签）
      // → 14px 700 字 + 左右 13px 内边距（量得 122 / 138），行高 1 时总高 22
      p.style.cssText = `position:absolute;left:50%;top:28px;transform-origin:50% 50%;
        padding:4px 13px;border-radius:999px;white-space:nowrap;line-height:1;
        font:700 14px ${F};color:#fff;
        background:linear-gradient(180deg,${ACCENT_LIGHT} 0%,${ACCENT} 45%,${ACCENT_DEEP} 100%);
        box-shadow:inset 0 2px 3px rgba(255,255,255,.65), inset 0 -4px 8px rgba(34,39,47,.5),
          0 12px 28px rgba(${AD_RGB},.35);`;
      p.textContent = txt;
      const shine = document.createElement('div');
      shine.style.cssText = `position:absolute;left:12%;top:3px;width:76%;height:38%;border-radius:999px;
        background:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0));pointer-events:none;`;
      p.appendChild(shine);
      return p;
    };

    // 四组：胶囊 + 占位 mockup 横向排队（i 越大越靠左，滑入中央越晚），轨道循环
    const groups = [
      ['Feature A', bCards],
      ['Feature B', bDash],
      ['Feature C', bTable],
      ['Feature D', bForm],
    ].map(([txt, build], i) => {
      // 组坐标系：宽 W，胶囊挂 top:0 一带，面板从 top:82 起（对齐实测屏幕 y）
      const g = document.createElement('div');
      g.style.cssText = `position:absolute;left:50%;top:0;width:${W}px;height:270px;
        margin-left:${-W / 2}px;`;
      scene.appendChild(g);
      const win = mkWin(); build(win.body); g.appendChild(win.outer);
      const pill = mkPill(txt); g.appendChild(pill);
      return { g, pill, win: win.outer, i, phase: i * 1.9 };
    });

    // 黑色描白边光标（结尾划向末位胶囊，macOS 指针样式）
    const cur = document.createElement('div');
    cur.style.cssText = `position:absolute;width:0;height:0;border-left:8px solid #0d0d11;
      border-right:4px solid transparent;border-bottom:14px solid transparent;
      filter:drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 2px 3px rgba(0,0,0,.3));
      transform:rotate(-16deg);opacity:0;z-index:5;`;
    scene.appendChild(cur);

    return t => {
      // 轨道：逐帧追居中胶囊的屏幕 x，拟合出三拍 —— 起点 t≈0.20 / 0.483 / 0.688。
      // 归一化进度对 inOutCubic 的拟合极好（缓起→中段冲→缓收），不是"快进慢出"；
      // 第一拍明显更慢且带长尾（到 t≈0.48 才完全收住），后两拍干脆些。
      // 开场另有上一拍的收尾余量：t=0 时轨道偏左 11px，t≈0.19 归位。
      const BEATS = [
        { b: 0.200, d: 0.185, tail: 0.28 },   // 第 1 位 → 第 2 位
        { b: 0.483, d: 0.150, tail: 0 },      // 第 2 位 → 第 3 位
        { b: 0.688, d: 0.150, tail: 0 },      // 第 3 位 → 第 4 位
      ];
      let trackX = -11 * (1 - seg(t, 0, 0.19, E.outQuart));
      for (const B of BEATS) {
        const p = B.tail
          ? 0.85 * seg(t, B.b, B.b + B.d, E.inOutCubic) + 0.15 * seg(t, B.b, B.b + B.tail, E.outCubic)
          : seg(t, B.b, B.b + B.d, E.inOutCubic);
        trackX += p * SP;
      }
      const N = groups.length, RING = N * SP;
      for (const G of groups) {
        // 环形轨道：面板绕 4 位循环，保证任一拍都有左右邻居各露一截在画面边缘
        let wx = trackX - G.i * SP;
        wx = ((wx % RING) + RING * 1.5) % RING - RING / 2;
        const d = Math.min(1, Math.abs(wx) / SP);     // 0=正居中，1=已到邻位
        const close = 1 - d;
        const sc = lerp(close, 0.62, 1);              // 邻位实测缩到 0.62
        G.g.style.transform = `translateX(${wx}px)`;
        // 邻位（d=1）必须仍清楚可见 —— 原片左右两侧始终露出相邻面板边缘
        G.g.style.opacity = lerp(Math.min(1, close * 2.4), 0.78, 1);
        G.g.style.filter = `blur(${d * 1.3}px)`;
        G.g.style.zIndex = close > 0.5 ? 2 : 1;
        // 面板：等比缩小 + 顶边随 d 线性下沉（斜率 ≈80px）
        G.win.style.transform = `translateY(${d * 80}px) scale(${sc})`;
        // 胶囊：实测中心 y 从 45（居中）沉到 102（邻位），比面板沉得更多，
        // 且离心时贴近面板顶边 —— 单独给它一条更陡的下沉曲线
        G.pill.style.transform = `translateX(-50%) translateY(${d * 92}px) scale(${sc})`;
      }
      fogs.forEach((f, i) => {
        f.style.transform = `translate(${Math.sin(t * Math.PI * 2 * 0.5 + i * 2.1) * 18}px,${Math.cos(t * Math.PI * 2 * 0.4 + i) * 12}px)`;
      });
      // 光标：实测 t≈0.717 于右上（x≈401,y≈38）一帧硬现，减速斜滑向左下，
      // t≈0.87 抵达末位胶囊右端附近（x≈298,y≈54）后几乎静止（每帧 <1px）
      const cp = seg(t, 0.717, 0.90, E.outQuart);
      cur.style.opacity = seg(t, 0.717, 0.725);
      cur.style.left = `${lerp(cp, 403, 281) / 480 * 100}%`;
      cur.style.top = `${lerp(cp, 36, 56) / 270 * 100}%`;
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
