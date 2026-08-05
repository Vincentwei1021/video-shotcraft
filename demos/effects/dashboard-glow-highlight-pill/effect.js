/* dashboard-glow-highlight-pill — MotionLab 动效模板（Glow Highlight Pill 金色胶囊指引）
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
  id: 'b20-dashboard-glow-highlight-pill',
  title: 'Glow Highlight Pill 金色胶囊指引',
  src: 'x.com/shapelayer',
  cat: 'effects', dur: 2000,
  tags: ['辉光描边 draw-on', '光斑巡游'],
  desc: '金字 "Ready." 悬于黑场，数据仪表盘（订单簿+K线+买卖面板，内容为占位数据）自底带透视升入后保持缓慢 rotateX/rotateY 3D 漂移；金色光斑从右侧面板巡游至底部中央拉成胶囊，背景虚化压暗（仪表盘继续漂），辉光描边从底边逆时针描出 Focus Mode 弹窗轮廓，内容淡入后描边收敛为金色细框。',
  setup(stage, { E, seg, lerp }) {
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;inset:0;background:#050403;overflow:hidden;perspective:800px;font-family:-apple-system,system-ui,sans-serif';
    stage.appendChild(root);

    // ---- 暖色底光（原片黑场并非纯黑，顶部偏暖褐）
    const amb = document.createElement('div');
    amb.style.cssText = `position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(130% 95% at 42% -8%,rgba(104,74,30,.32),rgba(44,32,14,.14) 42%,rgba(0,0,0,0) 74%);`;
    root.appendChild(amb);

    // ---- 开场发光文字 "Ready."（占位叙事词，字符数与原片近似）
    // 原片是较细的金色字（上端浅暖白、下端沉到金褐），不是纯白粗体
    const yours = document.createElement('div');
    yours.style.cssText = `position:absolute;left:50%;top:49%;transform:translate(-50%,-50%);
      font-size:27px;font-weight:400;letter-spacing:.2px;white-space:nowrap;
      background:linear-gradient(178deg,#fff8e2 6%,#f6dfa4 44%,#e0bd72 70%,#c99a45 100%);
      -webkit-background-clip:text;background-clip:text;color:transparent;
      filter:drop-shadow(0 0 7px rgba(255,232,168,.8)) drop-shadow(0 0 20px rgba(233,190,105,.5)) drop-shadow(0 0 44px rgba(200,158,78,.3));`;
    yours.textContent = 'Ready.';
    root.appendChild(yours);

    // ---- 交易所仪表盘（自底升入）。基准尺寸 = 落位后满幅尺寸，靠 scale 做推拉
    const dash = document.createElement('div');
    dash.style.cssText = `position:absolute;left:50%;top:50%;width:87%;height:91%;
      transform:translate(-50%,-50%);opacity:0;`;
    root.appendChild(dash);

    const inner = document.createElement('div');
    inner.style.cssText = `position:absolute;inset:0;border-radius:6px;background:#101114;
      border:1px solid #24272d;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.6);
      filter:brightness(1.18) saturate(1.06);`;
    dash.appendChild(inner);

    // 订单簿行（上红下绿，渐变量条）
    let obRed = '', obGreen = '';
    for (let i = 0; i < 7; i++) {
      const w1 = 30 + rand(i * 3 + 1) * 65, w2 = 30 + rand(i * 7 + 4) * 65;
      obRed += `<div style="position:relative;height:8.5px;margin:1px 0"><div style="position:absolute;right:0;top:0;bottom:0;width:${w1.toFixed(0)}%;background:linear-gradient(90deg,rgba(214,69,90,.08),rgba(214,69,90,.4))"></div><span style="position:relative;font-size:5px;color:#e05a70;padding-left:2px">1${(155.4 - i * 0.12).toFixed(2)}</span><span style="position:relative;float:right;font-size:5px;color:#7c828c;padding-right:2px">${(rand(i * 11) * 9 + 0.4).toFixed(3)}</span></div>`;
      obGreen += `<div style="position:relative;height:8.5px;margin:1px 0"><div style="position:absolute;right:0;top:0;bottom:0;width:${w2.toFixed(0)}%;background:linear-gradient(90deg,rgba(43,191,138,.08),rgba(43,191,138,.4))"></div><span style="position:relative;font-size:5px;color:#3ecf96;padding-left:2px">1${(155.0 - i * 0.12).toFixed(2)}</span><span style="position:relative;float:right;font-size:5px;color:#7c828c;padding-right:2px">${(rand(i * 13 + 6) * 9 + 0.4).toFixed(3)}</span></div>`;
    }

    // K 线（确定性随机游走，整体上行）
    // 原片 K 线是自左下向右上的明显上行走势（末段冲高），故 dv 取负偏置（SVG y 轴向下）
    let candles = '', vols = '', px = 104;
    for (let i = 0; i < 36; i++) {
      const dv = (rand(i * 2.7 + 9) - 0.60) * 13;
      const o = px, c = px + dv; px = c;
      const hi = Math.min(o, c) - rand(i * 5.1) * 5, lo = Math.max(o, c) + rand(i * 3.3) * 5;
      const up = c < o, col = up ? '#2bbf8a' : '#d6455a';
      const x = 6 + i * 7.6;
      candles += `<line x1="${x + 2}" y1="${hi.toFixed(1)}" x2="${x + 2}" y2="${lo.toFixed(1)}" stroke="${col}" stroke-width="0.8"/><rect x="${x}" y="${Math.min(o, c).toFixed(1)}" width="4" height="${Math.max(1.5, Math.abs(dv)).toFixed(1)}" fill="${col}"/>`;
      vols += `<rect x="${x}" y="${(128 - rand(i * 1.9 + 3) * 16).toFixed(1)}" width="4" height="16" fill="${col}" opacity=".45"/>`;
    }

    inner.innerHTML = `
      <div style="height:9%;border-bottom:1px solid #1a1c20;display:flex;align-items:center;padding:0 8px;gap:10px">
        <span style="font-size:8px;font-weight:800;color:#e8e6df;letter-spacing:1px">&#9670; ACME</span>
        <span style="font-size:6px;color:#9aa0aa">Trade</span><span style="font-size:6px;color:#565c66">Earn</span><span style="font-size:6px;color:#565c66">Vault</span>
        <span style="margin-left:auto;font-size:6px;color:#565c66">Support &nbsp; 0x8f...c2 &nbsp;</span>
        <span style="font-size:6px;color:#0b0c0e;background:#e6c476;border-radius:3px;padding:1px 5px;font-weight:700">Connect</span>
      </div>
      <div style="position:absolute;left:0;top:9%;bottom:16%;width:24%;border-right:1px solid #1a1c20;padding:4px 5px;box-sizing:border-box">
        <div style="display:flex;gap:8px;margin-bottom:3px"><span style="font-size:6px;color:#d8dbe0;border-bottom:1px solid #e6c476;padding-bottom:1px">Orderbook</span><span style="font-size:6px;color:#565c66">Trades</span></div>
        ${obRed}
        <div style="font-size:7px;font-weight:800;color:#e05a70;padding:2px">155.01 &#9660;</div>
        ${obGreen}
      </div>
      <div style="position:absolute;left:24%;top:9%;bottom:16%;right:22%;padding:4px 6px;box-sizing:border-box">
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:7px;font-weight:700;color:#e8e6df">&#9679; TOKEN-USD <span style="color:#565c66;font-size:5px">PERP</span></span>
          <span style="font-size:8px;font-weight:800;color:#3ecf96">155.01</span>
          <span style="font-size:5px;color:#7c828c">24h Vol $1,891,145.10 &nbsp; Funding 0.0042% &nbsp; OI $9.4M</span>
        </div>
        <svg viewBox="0 0 290 130" style="width:100%;height:84%" preserveAspectRatio="none">${candles}${vols}</svg>
      </div>
      <div style="position:absolute;right:0;top:9%;bottom:16%;width:22%;border-left:1px solid #1a1c20;padding:4px 6px;box-sizing:border-box">
        <div style="display:flex;gap:3px;margin-bottom:4px">
          <span style="flex:1;text-align:center;font-size:5.5px;color:#d8dbe0;background:#1d2026;border-radius:3px;padding:2px 0">Cross</span>
          <span style="flex:1;text-align:center;font-size:5.5px;color:#7c828c;background:#14161a;border-radius:3px;padding:2px 0">10x</span>
          <span style="flex:1;text-align:center;font-size:5.5px;color:#7c828c;background:#14161a;border-radius:3px;padding:2px 0">One-Way</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:5px;color:#7c828c;margin-bottom:2px"><span>Market</span><span>Limit</span><span>Pro</span></div>
        <div style="height:5px;margin:4px 0;background:linear-gradient(90deg,#e6c476,#e6c476 60%,#2a2d33 60%);border-radius:2px"></div>
        <div style="font-size:5px;color:#7c828c;margin-bottom:4px">&#9634; Reduce Only</div>
        <div style="display:flex;gap:4px;margin-bottom:5px">
          <div style="flex:1;height:14px;border-radius:3px;background:#19a374;display:flex;align-items:center;justify-content:center;font-size:6px;font-weight:700;color:#04120c">Buy</div>
          <div style="flex:1;height:14px;border-radius:3px;background:#d6455a;display:flex;align-items:center;justify-content:center;font-size:6px;font-weight:700;color:#1c0508">Sell</div>
        </div>
        ${['Current Position|0.00 TOKEN', 'Liq. Price|--', 'Order Value|$0.00', 'Margin Required|$0.00', 'Fees|0.035% / 0.010%'].map(s => { const p = s.split('|'); return `<div style="display:flex;justify-content:space-between;font-size:5px;color:#7c828c;margin-bottom:2.5px"><span>${p[0]}</span><span style="color:#b9bec6">${p[1]}</span></div>`; }).join('')}
        <div style="border-top:1px solid #1a1c20;margin-top:4px;padding-top:3px;font-size:5.5px;color:#d8dbe0">Account</div>
        ${['Portfolio Margin|$20,182.49', 'Unrealized PNL|+$142.11', 'Available|$1,021.19'].map(s => { const p = s.split('|'); return `<div style="display:flex;justify-content:space-between;font-size:5px;color:#7c828c;margin-top:2.5px"><span>${p[0]}</span><span style="color:#b9bec6">${p[1]}</span></div>`; }).join('')}
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:16%;border-top:1px solid #1a1c20;padding:3px 8px;box-sizing:border-box">
        <div style="display:flex;gap:9px;margin-bottom:3px">${['Positions (2)', 'Open Orders (0)', 'Balances', 'Order History', 'Trade History', 'Funding History', 'Position History'].map((s, i) => `<span style="font-size:5px;color:${i === 0 ? '#d8dbe0' : '#565c66'}">${s}</span>`).join('')}</div>
        ${[0, 1].map(i => `<div style="display:flex;gap:12px;font-size:5px;color:#7c828c;margin-bottom:2px">
          <span style="color:#d8dbe0">${i === 0 ? 'TOKEN' : 'ALT'}-USD</span><span style="color:${i === 0 ? '#3ecf96' : '#e05a70'}">${i === 0 ? '+12.40' : '-3.61'}</span>
          <span>152.30</span><span>$7,801.75</span><span>$1,775.00</span><span>74,212.07</span><span>$53,225.00</span><span style="color:#e6c476">Market | Limit</span><span style="color:#7c828c">Reverse</span>
        </div>`).join('')}
      </div>`;

    // ---- 虚化压暗层（弹窗出现时盖住仪表盘）
    const dim = document.createElement('div');
    dim.style.cssText = 'position:absolute;inset:0;background:rgba(6,5,4,.4);opacity:0;pointer-events:none';
    root.appendChild(dim);

    // ---- 金色巡游光斑
    const blob = document.createElement('div');
    // 原片光斑核心亮度打满 250+。不能用 mix-blend-mode:screen —— root 有 perspective，
    // 会把混合隔离掉导致光斑发灰；直接用实心亮核 + box-shadow 外扩辉光更接近原片。
    blob.style.cssText = `position:absolute;left:0;top:0;width:40px;height:40px;border-radius:20px;
      background:radial-gradient(60% 60% at 50% 50%,#fffefa 0%,#fffdf2 40%,#ffeec2 66%,rgba(255,206,110,.5) 85%,rgba(212,165,70,0));
      filter:blur(2px);opacity:0;pointer-events:none;
      box-shadow:0 0 18px rgba(255,235,175,.95),0 0 44px rgba(240,200,120,.6),0 0 90px rgba(212,175,90,.35);`;
    root.appendChild(blob);

    // ---- Focus Mode 弹窗 + SVG 辉光描边（从底边中点逆时针 draw-on）
    // 原片实测：弹窗横跨画面 x≈33%-56%、y≈24%-68%，是个偏窄的竖向卡片，
    // 位置不是画面正中而是略偏左（约 44.5% 处），底边坐在 K 线区中部。
    // 20×10 网格实测 t=0.94：弹窗横跨 x≈36%-60.7%、y≈27%-67% → 宽 24.5%、高 40%
    const MW = 24.5, MH = 40, MCX = 48.4, MCY = 47; // % of root
    const MRAD = 5;                                  // 弹窗圆角（px），描边共用
    // 描边与弹窗必须是同一个盒子：早前把原片 t=0.72 的辉光外溢（stroke-width 6.6 +
    // drop-shadow 外扩，单边约 7px）误读成"描边框比弹窗大 1.22 倍再收敛"，
    // 于是描边整条轨迹都浮在弹窗轮廓外侧 —— 那是 bug，不是原片节奏。
    // 逐帧实测原片 t=0.72：描边亮芯中线 x 35.4%-61.0%、y 顶 24.1%；
    // t=0.94 弹窗边框 x 36.9%-60.2%、y 顶 26.7% —— 差值正好等于半个笔宽 + 辉光，
    // 即原片描边中线就压在弹窗边框上。所以这里不做任何缩放差，只让笔宽/辉光收敛。
    const modal = document.createElement('div');
    modal.style.cssText = `position:absolute;left:${MCX}%;top:${MCY}%;width:${MW}%;height:${MH}%;
      transform:translate(-50%,-50%);opacity:0;border-radius:${MRAD}px;
      background:linear-gradient(170deg,#141310,#0d0c0a);border:1px solid rgba(230,196,118,.3);
      box-shadow:0 18px 44px rgba(0,0,0,.72);padding:6px 7px;box-sizing:border-box;`;
    modal.innerHTML = `
      <div style="font-size:5.5px;font-weight:700;color:#f2ead2;margin-bottom:4px">Focus Mode</div>
      <div style="font-size:3.4px;line-height:1.62;color:#8b8f98;margin-bottom:3px">All panels share one unified workspace layout. Changes in one panel are reflected in the others, <span style="color:#cbb26a">keeping context in one place</span>.</div>
      <div style="font-size:3.4px;color:#8b8f98;margin-bottom:4px">Choose how panels are arranged:</div>
      <div style="border:1px solid rgba(230,196,118,.42);border-radius:3px;background:rgba(230,196,118,.05);padding:4px 5px;margin-bottom:4px">
        <div style="font-size:4px;font-weight:700;color:#eee6cc">&#9679; Standard</div>
        <div style="font-size:3.3px;line-height:1.55;color:#8b8f98;margin-top:1.5px">Placeholder body copy for option one. The selected option directly determines the layout of each panel &mdash; simple and predictable.</div>
      </div>
      <div style="border:1px solid #23252a;border-radius:3px;padding:4px 5px">
        <div style="font-size:4px;font-weight:700;color:#b9bec6">&#9675; Pro</div>
        <div style="font-size:3.3px;line-height:1.55;color:#71757e;margin-top:1.5px">Placeholder body copy for option two, written a little longer so the block keeps its shape. Replace both with your own wording.</div>
      </div>
      <div style="position:absolute;left:7px;right:7px;bottom:6px;height:9px;border-radius:2.5px;background:linear-gradient(180deg,#e2bd63,#caa03e);display:flex;align-items:center;justify-content:center;font-size:4px;font-weight:700;color:#241b06">Confirm</div>`;
    root.appendChild(modal);

    // 描边 SVG：与弹窗共用同一个盒子（同 left/top/width/height/transform 链）。
    // 关键：viewBox 用弹窗的实际像素尺寸，1 unit = 1 CSS px —— 之前是 300×220 配
    // preserveAspectRatio="none"，被非等比压成 x0.39/y0.49，笔宽横竖不一、圆角被拉成
    // 椭圆、内缩的 4/6/10 units 也变成对不上的怪数值，这是"画光位置和弹窗不一致"的第二个源头。
    const RW = root.clientWidth || 480, RH = root.clientHeight || 270;
    const BW = RW * MW / 100, BH = RH * MH / 100;   // 弹窗盒子像素尺寸
    const BO = 0.5;                                  // 压在 1px 边框中线上
    // 起笔点 = 胶囊停住的位置（BLOB 末帧 x），换算成盒内坐标，保证"光斑落点即起笔点"
    const SX = (44.1 - (MCX - MW / 2)) / MW * BW;
    const r = MRAD;
    const D = `M${SX.toFixed(1)} ${(BH - BO).toFixed(1)}`
      + ` L${(r + BO).toFixed(1)} ${(BH - BO).toFixed(1)}`
      + ` A${r} ${r} 0 0 1 ${BO} ${(BH - r - BO).toFixed(1)}`
      + ` L${BO} ${(r + BO).toFixed(1)}`
      + ` A${r} ${r} 0 0 1 ${(r + BO).toFixed(1)} ${BO}`
      + ` L${(BW - r - BO).toFixed(1)} ${BO}`
      + ` A${r} ${r} 0 0 1 ${(BW - BO).toFixed(1)} ${(r + BO).toFixed(1)}`
      + ` L${(BW - BO).toFixed(1)} ${(BH - r - BO).toFixed(1)}`
      + ` A${r} ${r} 0 0 1 ${(BW - r - BO).toFixed(1)} ${(BH - BO).toFixed(1)}`
      + ` L${SX.toFixed(1)} ${(BH - BO).toFixed(1)}`;
    const svgWrap = document.createElement('div');
    svgWrap.style.cssText = `position:absolute;left:${MCX}%;top:${MCY}%;width:${MW}%;height:${MH}%;
      transform:translate(-50%,-50%);pointer-events:none;opacity:0;mix-blend-mode:screen;`;
    svgWrap.innerHTML = `<svg viewBox="0 0 ${BW.toFixed(2)} ${BH.toFixed(2)}" style="width:100%;height:100%;overflow:visible">
      <path id="b20-trace" d="${D}"
        fill="none" stroke="#fff0c4" stroke-width="3" stroke-linecap="round"
        style="filter:drop-shadow(0 0 3px rgba(255,232,160,.95)) drop-shadow(0 0 10px rgba(240,200,110,.75)) drop-shadow(0 0 26px rgba(212,175,90,.4))"/>
    </svg>`;
    root.appendChild(svgWrap);
    const trace = svgWrap.querySelector('#b20-trace');
    const P_L = trace.getTotalLength();
    trace.setAttribute('stroke-dasharray', `${P_L} ${P_L}`);
    trace.setAttribute('stroke-dashoffset', P_L);

    // 注意：本 harness 的 lerp 签名是 lerp(t, a, b)，不是 lerp(a, b, t)。
    const KF = (rows, t) => {
      if (t <= rows[0][0]) return rows[0].slice(1);
      for (let i = 1; i < rows.length; i++) {
        if (t <= rows[i][0]) {
          const a = rows[i - 1], b = rows[i];
          const p = E.inOutQuad((t - a[0]) / (b[0] - a[0]));
          return a.slice(1).map((_, k) => lerp(p, a[k + 1], b[k + 1]));
        }
      }
      return rows[rows.length - 1].slice(1);
    };

    // ---- 逐帧校准的姿态关键帧：[t, rotateX, rotateY, translateX%, translateY%, scale]
    // 原片实测：0.30 只有顶栏切片露在画面底部（极强俯仰、放得很大）；0.315 K 线区已入画；
    // 0.345 整块斜着压在左下（rotateY 明显偏左）；0.36 已基本摆正且满幅。
    // 之后仍在缓慢 3D 漂移：yaw 由偏左扫向偏右，同时轻微推远。
    const POSE = [
      [0.300, 34.0, -13.0, -7.0, 47.0, 1.62],
      [0.322, 24.0, -11.0, -5.5, 30.0, 1.44],
      [0.345, 13.0, -8.0, -3.5, 14.0, 1.22],
      [0.365, 5.5, -5.0, -1.6, 4.0, 1.055],
      [0.420, 2.6, -3.0, -0.6, 0.4, 1.005],
      [0.500, 2.2, -2.0, -0.3, 0.0, 0.966],
      [0.620, 1.8, -0.6, 0.0, -0.5, 0.943],
      [0.670, 1.6, 0.6, -0.4, -0.8, 0.852],
      // 原片实测：0.72 与 0.94 仪表盘都只占画面宽 ~61.5%（基准 87% → scale≈0.707），
      // 即 0.62-0.72 之间有一次明显的镜头后拉，把画面让给弹窗。
      [0.720, 1.4, 1.4, -0.8, -1.1, 0.707],
      [1.000, 1.2, 2.6, -0.9, -1.3, 0.700],
    ];

    // 光斑巡游关键帧（原片实测）：0.42 在右侧买卖面板处是个圆斑 →
    // 0.50 向左下移动并开始拉长 → 0.58 已是横胶囊压在 K 线区左下 →
    // 0.645 停在弹窗底边偏左处（= 描边起笔点）。[t, x%, y%, w, h]
    // 逐帧亮度质心实测（480×270，阈值 245 取光斑核心，元素尺寸按辉光外扩 ~1.6x 反推）：
    // 0.44 cx79.7 cy46.5 核 16×20 → 0.50 cx77.7 cy56.3 核 17×25 →
    // 0.56 cx71.1 cy63.9 核 40×16 → 0.61 cx57.6 cy65.2 核 64×13 →
    // 0.65 cx44.1 cy67.4 核 78×5。巡游是单调向左下走并持续横向拉长，中途不回摆。
    const BLOB = [
      [0.400, 80.5, 42.0, 22, 22],
      [0.440, 79.7, 46.5, 27, 30],
      [0.500, 77.7, 56.3, 29, 36],
      [0.560, 71.1, 63.9, 56, 25],
      [0.610, 57.6, 65.2, 82, 21],
      [0.650, 44.1, 67.4, 96, 16],
    ];

    return t => {
      // 金字：满亮保持到 t≈0.30（原片 0.315/0.33 都还在，与升入的仪表盘叠着），
      // 0.30-0.355 淡出。轻微呼吸辉光。
      const yOut = seg(t, 0.30, 0.355, E.inQuad);
      const br = 0.85 + 0.15 * Math.sin(t * Math.PI * 9);
      yours.style.opacity = (1 - yOut).toFixed(3);
      // 金字用 background-clip:text，辉光只能走 filter（textShadow 对透明字无效）
      yours.style.filter = `drop-shadow(0 0 7px rgba(255,232,168,${(0.8 * br).toFixed(2)}))` +
        ` drop-shadow(0 0 20px rgba(233,190,105,${(0.5 * br).toFixed(2)})) drop-shadow(0 0 44px rgba(200,158,78,.3))`;

      // 仪表盘自底带透视升入：0.30 起，0.365 就基本满幅摆正（原片就是这么快），
      // 之后由 POSE 关键帧继续做缓慢 3D 漂移。姿态全部走 KF，不再叠加二次 ease。
      const [prx, pry, ptx, pty, ps] = KF(POSE, t);
      dash.style.opacity = t >= 0.298 ? seg(t, 0.298, 0.315).toFixed(3) : '0';
      dash.style.transform = `translate(-50%,-50%) translate(${ptx.toFixed(2)}%,${pty.toFixed(2)}%)` +
        ` rotateX(${prx.toFixed(2)}deg) rotateY(${pry.toFixed(2)}deg) scale(${ps.toFixed(4)})`;

      // 背景虚化压暗：原片 0.64 已明显虚化（0.58 还是清晰的），0.58-0.68 过渡。
      // 虚化后仪表盘仍按 POSE 继续漂——这是原片的关键 3D 感。
      // 实测：原片背景清晰度 t=0.72 为 1.79、t=0.94 反而升到 2.17 —— 虚化是"先起后退"，
      // 描边收敛的同时模糊大幅消退，弹窗与仪表盘重新变清楚。压暗保留（亮度靠 dim 收）。
      const blUp = seg(t, 0.58, 0.66, E.inOutQuad);
      // 消退是"减轻"不是"清零"：实测原片终帧清晰度 2.17，仍低于满清晰，故只退掉约一半
      const blDown = seg(t, 0.80, 0.93, E.inOutQuad);
      const bl = blUp * (1 - blDown * 0.52);
      inner.style.filter = `blur(${(bl * 4.5).toFixed(2)}px) brightness(${(1.5 + bl * 0.05).toFixed(3)}) saturate(1.06)`;
      dim.style.opacity = (blUp * 0.22).toFixed(3);

      // 光斑 0.385-0.42 浮现 → 巡游拉长 → 0.655-0.675 交棒给描边
      const gOn = seg(t, 0.385, 0.425, E.outCubic);
      const gOff = seg(t, 0.655, 0.678, E.inQuad);
      const [bx, by, bw, bh] = KF(BLOB, t);
      blob.style.opacity = (gOn * (1 - gOff)).toFixed(3);
      blob.style.width = bw.toFixed(1) + 'px';
      blob.style.height = bh.toFixed(1) + 'px';
      blob.style.borderRadius = (bh / 2).toFixed(1) + 'px';
      blob.style.transform = 'translate(-50%,-50%)';
      blob.style.left = bx.toFixed(2) + '%';
      blob.style.top = by.toFixed(2) + '%';

      // 描边 draw-on：原片 0.66 还是横条、0.70 已描成 "C"（左+上+右上角）、
      // 0.72 右边下行近合口 → 0.655-0.735 走完一圈，outQuad 快起步。
      // 0.75-0.88 笔画由粗辉光收敛成常驻金色细框。
      // 原片 t=0.72 时右边刚下行到中段（约走完 78%），所以整圈到 0.775 才闭合
      const dr = seg(t, 0.655, 0.775, E.outQuad);
      // 收敛：0.79-0.93 走完，笔画由 7px 粗辉光收成 ~1px 常驻细金框（实测终帧 px>=200 仅 34 个）
      const settle = seg(t, 0.79, 0.93, E.inOutQuad);
      // 绘制中笔画中等粗细（原片 t=0.72 亮像素 px>=225 约 700 个，不是死白的粗棒），
      // 收敛后压到 1.1px 并把辉光几乎撤掉
      svgWrap.style.opacity = dr > 0.001 ? (1 - settle * 0.42).toFixed(3) : '0';
      trace.setAttribute('stroke-dashoffset', (P_L * (1 - dr)).toFixed(1));
      // viewBox 现在是 1:1 px，笔宽直接就是 CSS px（旧的 6.6 units 经非等比压缩后
      // 实际只有约 2.9px，故此处取 2.9 起、收敛到 1px 细框，观感不变）
      trace.setAttribute('stroke-width', (2.9 - settle * 1.9).toFixed(2));
      trace.setAttribute('stroke', settle > 0.5 ? '#e6c887' : '#fff0c4');
      trace.style.filter = settle > 0.001
        ? `drop-shadow(0 0 ${(3 - settle * 2.3).toFixed(2)}px rgba(255,232,160,${(0.95 - settle * 0.5).toFixed(2)}))` +
          ` drop-shadow(0 0 ${(10 - settle * 8).toFixed(1)}px rgba(240,200,110,${(0.75 - settle * 0.62).toFixed(2)}))`
        : 'drop-shadow(0 0 3px rgba(255,232,160,.95)) drop-shadow(0 0 10px rgba(240,200,110,.75)) drop-shadow(0 0 26px rgba(212,175,90,.4))';

      // 弹窗内容淡入：原片 t=0.72 时描边内已有可辨的暗底卡片（文字仍朦胧），0.84 后完全清晰。
      // 卡片底板比文字早一点到位，故 mBase 与 mc 分离。
      const mBase = seg(t, 0.665, 0.75, E.outCubic);
      const mc = seg(t, 0.715, 0.84, E.outCubic);
      // 弹窗/描边跟随半幅相机漂移，与背景仪表盘同向浮动
      const mDrift = ` rotateX(${(prx * 0.45).toFixed(2)}deg) rotateY(${(pry * 0.45).toFixed(2)}deg) translate(${(ptx * 0.5).toFixed(2)}%,${(pty * 0.5).toFixed(2)}%)`;
      modal.style.opacity = Math.max(mBase * 0.72, mc).toFixed(3);
      modal.style.transform = `translate(-50%,-50%) scale(${(0.985 + mc * 0.015).toFixed(4)})` + mDrift;
      modal.style.boxShadow = `0 0 ${(12 * mc).toFixed(1)}px rgba(212,175,90,${(0.3 * mc).toFixed(3)}),0 18px 44px rgba(0,0,0,.72)`;
      // 描边与弹窗共用完全相同的 transform 链（含同一 scale 与漂移），全程贴合轮廓
      svgWrap.style.transform = modal.style.transform;
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
