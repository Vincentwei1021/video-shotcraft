// integration-hub-map v5 —— 批次 14 单点节奏修正：
// 用户意见（逐字）"动作对了，但是需要翻的时候很快，最后快完成的时候变慢下来"
// → rotateY 0→180° 改为快翻+尾段减速：强 ease-out（cubic），前 ~40% 时间
//   完成 ~80% 角度，尾段明显减速缓着陆；仍一次连贯完成、无分段停顿
//   （判例："匀速"=无停顿≠字面 linear，本条已被用户亲自纠正为快翻尾缓）。
//   90° 侧棱时刻随之提前到 ~f28，白热爆发峰值同步前移对齐。其余全保留。
// —— 以下为 v3 说明（结构沿用）：
// ① 开头不是"转一个角度"，而是页面整个 rotateY 翻转 180° 翻到背面，
//    得到一张新的页面（双面卡：正面=近景旧页，背面=翻正后的新中枢页），
//    翻到侧棱（~90°）时白热爆发吞没画面（对应截图 3/4）。
// ② 五图标光管连上后有"输送感"：亮脉冲沿管线方向（图标→中枢）持续
//    循环流动，直到片尾不停。
// 运动结构对照截图：S1 近景正视可读 → S2 翻转中+拉远+泛光起 →
// S3/S4 侧棱白热爆发+图标浮现 → S5/S6 新页转正、光管连入 → S7/S8 稳定输送。
// —— 质感层（改版）：
// · 相机推拉/平移从 4 段关键帧（每段 inOut，关键帧处速度归零）改为一条连续曲线，前摇缓、无顿点
// · 面板推拉改走 CSS zoom（布局级缩放），2.05x 近景与落定 1x 文字都按原生分辨率栅格化（Q2）；正面旧页换成出版级文档
// · 图标瓷贴弹现带一次过冲、连通后染上本管末端色的霓虹余光；github/salesforce 换成可辨识字形
// · 光管：彩虹管体收细 + 白热芯 + 生长头火花，输送脉冲改成"亮头+拖尾"彗星形；管口接入瞬间一圈小涟漪
// · 背景霓虹框去掉闪烁、减细减淡并随相机做弱视差，颗粒 + 暗角压住大面积暗场
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Grain, Vignette, bezier } from '../../_fixtures/Polish';

export const INTEGRATION_HUB_MAP_DURATION = 150; // 前摇 0.5s + 快翻 1.2s + 两拍接入 0.7s + 输送呼吸 ~2.6s

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = mulberry32(20260718);
const NOISE: number[] = Array.from({ length: 200 }, () => rand());

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';
const INK = '#1d1e25', INK2 = '#5f616b', INK3 = '#a0a2ab', HAIR = 'rgba(20,22,28,0.08)';
const ACC = '#5b55c8';

// 面板推拉走 CSS zoom（布局级缩放）而非 transform scale：任意推拉量下文字都按显示尺寸原生栅格化（Q2）
const PW = 820, PH = 520;

// ---------- 中枢面板（Enterprise MQLs，内容对照截图 1/7） ----------
const LIST: { icon: string; title: string; sub: string }[] = [
  { icon: '#4a9fd8', title: 'Q3 Enterprise Deal', sub: 'Revenue · Pipeline · Q3 Quota' },
  { icon: '#4a9fd8', title: 'Major Enterprise Account - UK', sub: 'Revenue · MQL · International' },
  { icon: '#34a853', title: 'Enterprise Pitch Deck', sub: 'Open in GDrive' },
  { icon: '#a259ff', title: 'MQL Lead Form Design', sub: 'Figma File · Last Edited' },
  { icon: '#f2c744', title: 'Enterprise Sales', sub: 'ClickUp Space' },
  { icon: '#9a9a98', title: 'Enterprise Closed Archive', sub: 'Archived · In Enterprise Sales' },
  { icon: '#c8c8c6', title: 'Open Enterprise Lead - Follow up', sub: 'In Progress · In Enterprise Sales · Yesterday' },
];

// 面板外观：发丝线 + 顶部受光沿 + 投在暗场上的深影 + 一圈随 glow 增强的冷紫环境光（只给主角）
const panelShell = (glow: number): React.CSSProperties => ({
  width: PW,
  height: PH,
  background: 'linear-gradient(180deg, #fdfdfc 0%, #f7f7f5 100%)',
  borderRadius: 14,
  boxSizing: 'border-box',
  fontFamily: FONT,
  overflow: 'hidden',
  boxShadow: [
    'inset 0 1px 0 rgba(255,255,255,1)',
    '0 0 0 1px rgba(255,255,255,0.55)',
    '0 2px 6px rgba(0,0,0,0.35)',
    '0 40px 90px -24px rgba(0,0,0,0.75)',
    `0 0 ${50 + glow * 90}px rgba(236,226,255,${(0.10 + glow * 0.45).toFixed(3)})`,
    `0 0 ${150 + glow * 120}px rgba(176,110,255,${(0.16 + glow * 0.28).toFixed(3)})`,
  ].join(', '),
});

const HubPanel: React.FC<{ glow: number }> = ({ glow }) => (
  <div style={{ ...panelShell(glow), padding: '26px 30px', display: 'flex', gap: 26 }}>
    <div style={{ flex: 2 }}>
      <div style={{ fontSize: 27, fontWeight: 650, color: INK, letterSpacing: '-0.02em' }}>Enterprise MQLs</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, borderBottom: `1px solid ${HAIR}`, paddingBottom: 8 }}>
        {['All', 'Tasks', 'Docs', 'Whiteboards', 'Dashboards', 'Files', 'Chat', 'People'].map((t, i) => (
          <div key={t} style={{ fontSize: 12, color: i === 0 ? ACC : '#8e9099', fontWeight: i === 0 ? 650 : 450, position: 'relative' }}>
            {t}
            {i === 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -9, height: 2, borderRadius: 1, background: ACC }} />}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: INK3, marginTop: 14, letterSpacing: '0.04em', fontWeight: 600 }}>RECENT</div>
      {LIST.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'center', marginTop: 12 }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: 6,
              background: `linear-gradient(160deg, ${it.icon}, ${it.icon}cc)`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 2px rgba(16,18,24,0.12)',
            }}
          />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, letterSpacing: '-0.005em' }}>{it.title}</div>
            <div style={{ fontSize: 11, color: INK3, marginTop: 2 }}>{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ flex: 1, borderLeft: `1px solid ${HAIR}`, paddingLeft: 22 }}>
      <div
        style={{
          height: 30, width: 168, borderRadius: 8, marginTop: 4, fontSize: 12, color: INK2, fontWeight: 500,
          background: '#fff', boxShadow: `inset 0 0 0 1px rgba(20,22,28,0.14), 0 1px 2px rgba(16,18,24,0.05)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        + Add Location Filter
      </div>
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 24, letterSpacing: '0.08em', fontWeight: 600 }}>QUICK FILTERS</div>
      {['Assigned to Me', 'Created by Me'].map((t) => (
        <div key={t} style={{ fontSize: 13.5, color: INK2, marginTop: 11 }}>{t}</div>
      ))}
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 24, letterSpacing: '0.08em', fontWeight: 600 }}>TASK FILTERS</div>
      {[['Open', 12], ['Closed', 31], ['Archived', 7]].map(([t, n]) => (
        <div key={t} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: INK2, marginTop: 11, width: 168 }}>
          <span>{t}</span>
          <span style={{ color: INK3, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{n}</span>
        </div>
      ))}
    </div>
  </div>
);

// ---------- 翻转前的旧页面（正面）：另一张页面，翻面后才得到中枢页 ----------
const PARAS = [
  'Northwind Retail is consolidating three regional analytics vendors into a single workspace. The buying committee signed off on scope last week; legal review is the only open gate before signature.',
  'Champion is the VP of Revenue Operations. Security questionnaire returned with two follow-ups on SSO provisioning and data residency, both answered in the shared drive.',
];
const FrontPanel: React.FC<{ glow: number }> = ({ glow }) => (
  <div style={{ ...panelShell(glow), padding: '30px 34px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(160deg, #5aaee6, #3d8fcc)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }} />
      <div style={{ fontSize: 26, fontWeight: 650, color: INK, letterSpacing: '-0.02em' }}>Q3 Enterprise Deal</div>
      <div style={{ marginLeft: 'auto', fontSize: 11.5, color: INK3 }}>Edited 2h ago</div>
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      {['Revenue', 'Pipeline', 'Q3 Quota'].map((t) => (
        <div key={t} style={{ fontSize: 11.5, color: INK2, background: '#efeff1', borderRadius: 6, padding: '3px 10px', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
          {t}
        </div>
      ))}
    </div>
    <div style={{ height: 1, background: HAIR, marginTop: 18 }} />
    {/* 关键字段 */}
    <div style={{ display: 'flex', gap: 34, marginTop: 16 }}>
      {[['Amount', '$1.24M'], ['Stage', 'Negotiation'], ['Close date', 'Sep 28'], ['Owner', 'Dana Whitfield']].map(([k, v]) => (
        <div key={k}>
          <div style={{ fontSize: 10.5, color: INK3, letterSpacing: '0.06em', fontWeight: 600 }}>{k.toUpperCase()}</div>
          <div style={{ fontSize: 15, color: INK, fontWeight: 600, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{ fontSize: 15, fontWeight: 650, color: INK, marginTop: 22 }}>Summary</div>
    {PARAS.map((p, i) => (
      <div key={i} style={{ fontSize: 13, lineHeight: 1.62, color: INK2, marginTop: 8, maxWidth: 720 }}>{p}</div>
    ))}
    <div style={{ fontSize: 15, fontWeight: 650, color: INK, marginTop: 18 }}>Next steps</div>
    {['Send redlined MSA to procurement', 'Schedule SSO walkthrough with IT'].map((s, i) => (
      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, fontSize: 13, color: INK2 }}>
        <div style={{ width: 13, height: 13, borderRadius: 4, boxShadow: `inset 0 0 0 1.2px ${i ? 'rgba(20,22,28,0.22)' : ACC}`, background: i ? '#fff' : 'rgba(91,85,200,0.1)' }} />
        {s}
      </div>
    ))}
  </div>
);

// ---------- 品牌图标瓷贴 ----------
const Tile: React.FC<{ kind: string; on: number; tint: string }> = ({ kind, on, tint }) => {
  const glyph = (() => {
    switch (kind) {
      case 'figma':
        return (
          <svg width={46} height={46} viewBox="0 0 46 46">
            <path d="M16 2 h7 v14 h-7 a7 7 0 0 1 0 -14 Z" fill="#f24e1e" />
            <path d="M23 2 h7 a7 7 0 0 1 0 14 h-7 Z" fill="#ff7262" />
            <path d="M16 16 h7 v14 h-7 a7 7 0 0 1 0 -14 Z" fill="#a259ff" />
            <circle cx={30} cy={23} r={7} fill="#1abcfe" />
            <path d="M16 30 h7 v7 a7 7 0 1 1 -7 -7 Z" fill="#0acf83" />
          </svg>
        );
      case 'github':
        // 深色圆底 + 分支字形（git branch）
        return (
          <svg width={50} height={50} viewBox="0 0 50 50">
            <circle cx={25} cy={25} r={24} fill="#24292f" />
            <g fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
              <path d="M19 15 V35" />
              <path d="M31 19 C31 27 19 25 19 31" />
            </g>
            <circle cx={19} cy={14} r={3.6} fill="#24292f" stroke="#fff" strokeWidth={2.6} />
            <circle cx={19} cy={36} r={3.6} fill="#24292f" stroke="#fff" strokeWidth={2.6} />
            <circle cx={31} cy={17} r={3.6} fill="#24292f" stroke="#fff" strokeWidth={2.6} />
          </svg>
        );
      case 'salesforce':
        // 云朵：几枚同色圆 + 平底矩形求并
        return (
          <svg width={58} height={40} viewBox="0 0 58 40">
            <g fill="#00a1e0">
              <circle cx={17} cy={26} r={9} />
              <circle cx={27} cy={17} r={11} />
              <circle cx={40} cy={19} r={9.5} />
              <circle cx={47} cy={28} r={7} />
              <rect x={17} y={24} width={30} height={11} />
            </g>
          </svg>
        );
      case 'gdrive':
        return (
          <svg width={48} height={42} viewBox="0 0 48 42">
            <path d="M16 2 L32 2 L20 24 L4 24 Z" fill="#34a853" transform="translate(2,2)" />
            <path d="M32 2 L46 28 L30 28 L18 6 Z" fill="#fbbc04" transform="translate(0,2)" />
            <path d="M6 28 L42 28 L36 38 L12 38 Z" fill="#4285f4" />
          </svg>
        );
      default: // dropbox
        return (
          <svg width={48} height={42} viewBox="0 0 48 42">
            <path d="M12 0 L24 8 L12 16 L0 8 Z" fill="#0061ff" />
            <path d="M36 0 L48 8 L36 16 L24 8 Z" fill="#0061ff" />
            <path d="M12 18 L24 26 L12 34 L0 26 Z" fill="#0061ff" />
            <path d="M36 18 L48 26 L36 34 L24 26 Z" fill="#0061ff" />
          </svg>
        );
    }
  })();
  return (
    <div
      style={{
        width: 112,
        height: 112,
        borderRadius: 28,
        background: 'linear-gradient(180deg, #ffffff 0%, #f1f1f4 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,1)',
          'inset 0 -2px 4px rgba(20,22,40,0.08)',
          '0 0 0 1px rgba(255,255,255,0.4)',
          '0 18px 40px -12px rgba(0,0,0,0.7)',
          // 连通后染上本管末端色的霓虹余光
          `0 0 ${18 + on * 40}px ${tint}${Math.round(Math.min(1, on) * 0x70).toString(16).padStart(2, '0')}`,
        ].join(', '),
      }}
    >
      {glyph}
    </div>
  );
};

// ---------- 光管（彩虹渐变霓虹管） ----------
type Pipe = { kind: string; icon: [number, number]; path: string; len: number; tIcon: number; tPipe: number; tint: string };
const PIPES: Pipe[] = [
  { kind: 'figma', icon: [452, 262], path: 'M 452 322 L 452 440 Q 452 480 492 480 L 552 480', len: 300, tIcon: 52, tPipe: 62, tint: '#ffd44d' },
  { kind: 'github', icon: [252, 612], path: 'M 316 612 L 552 612', len: 240, tIcon: 52, tPipe: 62, tint: '#ffd44d' },
  { kind: 'salesforce', icon: [992, 178], path: 'M 992 240 L 992 332', len: 92, tIcon: 52, tPipe: 62, tint: '#ffd44d' },
  { kind: 'gdrive', icon: [1512, 272], path: 'M 1512 332 L 1512 440 Q 1512 480 1472 480 L 1372 480', len: 290, tIcon: 52, tPipe: 62, tint: '#ffd44d' },
  { kind: 'dropbox', icon: [1702, 618], path: 'M 1640 618 L 1372 618', len: 270, tIcon: 52, tPipe: 62, tint: '#ffd44d' },
];
const GROW = 9; // v8（批次 17）：用户意见"翻转过来后，5个app同时出现，然后同时连接"——两拍制：五图标 tIcon 统一 52 同帧出现，五管 tPipe 统一 62 同帧连接
const FLOW_SPEED = 4.6; // 输送脉冲速度 px/f
const FLOW_PERIOD = 74; // 脉冲间距（px）

// 路径上按弧长取点（只含直线段与一段二次曲线，生长头火花用）
const pointAt = (path: string, dist: number): [number, number] => {
  const tok = path.match(/[MLQ]|-?[\d.]+/g)!;
  let i = 0, cx = 0, cy = 0, rest = dist;
  let last: [number, number] = [0, 0];
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') { cx = +tok[i++]; cy = +tok[i++]; last = [cx, cy]; continue; }
    if (c === 'L') {
      const x = +tok[i++], y = +tok[i++];
      const L = Math.hypot(x - cx, y - cy);
      if (rest <= L) { const k = rest / L; return [cx + (x - cx) * k, cy + (y - cy) * k]; }
      rest -= L; cx = x; cy = y; last = [cx, cy]; continue;
    }
    if (c === 'Q') {
      const qx = +tok[i++], qy = +tok[i++], x = +tok[i++], y = +tok[i++];
      const pts: [number, number][] = [];
      for (let s = 0; s <= 16; s++) {
        const u = s / 16;
        pts.push([(1 - u) * (1 - u) * cx + 2 * (1 - u) * u * qx + u * u * x, (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * qy + u * u * y]);
      }
      for (let s = 1; s < pts.length; s++) {
        const L = Math.hypot(pts[s][0] - pts[s - 1][0], pts[s][1] - pts[s - 1][1]);
        if (rest <= L) { const k = rest / L; return [pts[s - 1][0] + (pts[s][0] - pts[s - 1][0]) * k, pts[s - 1][1] + (pts[s][1] - pts[s - 1][1]) * k]; }
        rest -= L;
      }
      cx = x; cy = y; last = [cx, cy]; continue;
    }
  }
  return last;
};

// ---------- 背景霓虹矩形轮廓 ----------
const RECTS = Array.from({ length: 9 }, (_, i) => ({
  x: [150, 660, 1740, 250, 1150, 700, 1660, 90, 1330][i],
  y: [255, 355, 545, 850, 935, 985, 830, 555, 760][i],
  w: 90 + NOISE[i * 3] * 160,
  h: 60 + NOISE[i * 3 + 1] * 70,
  hue: [265, 285, 300, 255, 275, 210, 320, 240, 40][i],
  ph: NOISE[i * 3 + 2] * Math.PI * 2,
}));

// 相机：一条连续曲线（前摇段自然很慢，无关键帧顿点）
const CAM = bezier(0.55, 0, 0.18, 1);

export const IntegrationHubMap: React.FC = () => {
  const frame = useCurrentFrame();
  // 滤镜/渐变 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // --- 相机/面板轨迹：近景正视旧页 → 整体翻转 180°（翻到背面=新页）+ 拉远落定 ---
  const cam = CAM(Math.min(1, Math.max(0, frame / 96)));
  const zoom = 2.05 + (1.0 - 2.05) * cam;
  // v6（批次 15）：用户意见"翻转再快1倍"——翻面窗口 f14–84（70 帧）
  // 压半到 f14–49（35 帧），快翻+尾段减速曲线形状保持；
  // 90° 侧棱相应提前到 ~f21.2（easeOut=0.5 → t≈0.206）。
  const rotY = interpolate(frame, [14, 49], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const panX = 130 + (0 - 130) * cam;
  const panY = 120 + (25 - 120) * cam;

  // v6：用户意见"中间不需要长时间的光晕，翻到中间闪一下就行"——
  // 长光晕平台删除，改为 90° 侧棱时刻（~f21）2 帧脉冲亮闪即回落
  const bloom = interpolate(frame, [19, 21, 23, 27], [0, 1, 0.25, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const noise = NOISE[Math.min(frame, NOISE.length - 1)];

  // 全连通后呼吸
  const allOn = Math.max(...PIPES.map((p) => p.tPipe)) + GROW;
  const breathe = frame > allOn ? 0.5 + 0.5 * Math.sin((frame - allOn) * 0.16) : 0;
  const panelGlow = bloom * 1.1 + breathe * 0.16;

  // 星图元素（图标/光管/矩形）整体可见度
  const mapIn = interpolate(frame, [34, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 背景层弱视差：跟随相机 18% 的位移与 10% 的推拉
  const bgPar = `translate(${(panX * 0.18).toFixed(2)}px, ${(panY * 0.18).toFixed(2)}px) scale(${(1 + (zoom - 1) * 0.1).toFixed(4)})`;

  return (
    <AbsoluteFill style={{ background: '#09080e' }}>
      {/* 暗紫底：中心冷紫柔光 + 左下品红余光 */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(98,58,160,0.28), transparent 70%), radial-gradient(ellipse 45% 40% at 16% 80%, rgba(150,56,128,0.13), transparent 70%), radial-gradient(ellipse 40% 35% at 86% 18%, rgba(70,90,190,0.10), transparent 70%)',
        }}
      />

      {/* 背景霓虹矩形轮廓：细、淡、轻微失焦，作远景衬场 */}
      <AbsoluteFill style={{ transform: bgPar, transformOrigin: '50% 50%' }}>
        {RECTS.map((r, i) => {
          const on = interpolate(frame, [36 + i * 4, 56 + i * 4], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const settle = interpolate(frame, [90, 120], [1, 0.62], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const a = on * settle;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: r.x,
                top: r.y,
                width: r.w,
                height: r.h,
                borderRadius: 12,
                border: `1.5px solid hsla(${r.hue} 85% 72% / ${(0.5 * a).toFixed(3)})`,
                boxShadow: `0 0 14px hsla(${r.hue} 90% 62% / ${(0.32 * a).toFixed(3)}), inset 0 0 12px hsla(${r.hue} 90% 62% / ${(0.14 * a).toFixed(3)})`,
                filter: 'blur(0.8px)',
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* 光管层 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: mapIn }}>
        <defs>
          {/* 每条管一个 userSpaceOnUse 渐变（沿管起终点），彩虹沿管线方向铺开。
              objectBoundingBox 在纯水平/垂直线上宽或高为 0 会禁用 paint，必须用户坐标。 */}
          {PIPES.map((p, i) => {
            const nums = p.path.match(/-?[\d.]+/g)!.map(Number);
            const [x1, y1] = [nums[0], nums[1]];
            const [x2, y2] = [nums[nums.length - 2], nums[nums.length - 1]];
            return (
              <linearGradient key={i} id={`rainbow-${uid}-${i}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
                <stop offset="0%" stopColor="#ffe14d" />
                <stop offset="28%" stopColor="#ff8a5a" />
                <stop offset="52%" stopColor="#ff5ad0" />
                <stop offset="76%" stopColor="#b46bff" />
                <stop offset="100%" stopColor="#5ad0ff" />
              </linearGradient>
            );
          })}
          {/* userSpaceOnUse：纯水平/垂直直线管的 bbox 为零，百分比滤镜区域会
              坍缩成 0 导致整条管不渲染（github/salesforce/dropbox 三管消失） */}
          <filter id={`pipeGlow-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
            <feGaussianBlur stdDeviation="9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`soft-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>
        {PIPES.map((p, i) => {
          const grow = interpolate(frame, [p.tPipe, p.tPipe + GROW], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.quad),
          });
          if (grow <= 0) return null;
          const dashOn = p.len * grow;
          const pulse = frame > allOn ? 0.84 + 0.16 * Math.sin((frame - allOn) * 0.16 + i) : 1;
          // 输送感：亮脉冲沿管线方向（图标→中枢）持续循环流动
          const flowOffset = -((frame - p.tPipe) * FLOW_SPEED + i * 37);
          const flowIn = interpolate(frame, [p.tPipe + GROW, p.tPipe + GROW + 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const head = pointAt(p.path, dashOn);
          const growing = grow < 1;
          return (
            <g key={i}>
              <g filter={`url(#pipeGlow-${uid})`}>
                <path
                  d={p.path}
                  fill="none"
                  stroke={`url(#rainbow-${uid}-${i})`}
                  strokeWidth={12}
                  strokeLinecap="round"
                  strokeDasharray={`${dashOn} ${p.len + 60}`}
                  opacity={0.9 * pulse}
                />
              </g>
              {/* 白热芯：细而亮，管体读作"发光的管"而不是色带 */}
              <path
                d={p.path}
                fill="none"
                stroke="rgba(255,250,255,0.92)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${dashOn} ${p.len + 60}`}
                opacity={0.8 * pulse}
              />
              {/* 生长头火花：只在 9f 生长期内出现 */}
              {growing && (
                <>
                  <circle cx={head[0]} cy={head[1]} r={16} fill="rgba(255,240,255,0.5)" filter={`url(#soft-${uid})`} />
                  <circle cx={head[0]} cy={head[1]} r={5.5} fill="#fff" />
                </>
              )}
              {grow >= 1 && flowIn > 0 && (
                <>
                  {/* 彗星拖尾：较长、较暗，柔化 */}
                  <path
                    d={p.path}
                    fill="none"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={`26 ${FLOW_PERIOD - 26}`}
                    strokeDashoffset={flowOffset}
                    opacity={0.38 * flowIn}
                    filter={`url(#soft-${uid})`}
                  />
                  {/* 彗星亮头：位于拖尾前端（朝中枢方向） */}
                  <path
                    d={p.path}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={`7 ${FLOW_PERIOD - 7}`}
                    strokeDashoffset={flowOffset - 19}
                    opacity={0.95 * flowIn}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* 图标瓷贴：同帧弹现（一次过冲），连通后染色余光 */}
      {PIPES.map((p, i) => {
        const appear = interpolate(frame, [p.tIcon, p.tIcon + 13], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        if (appear <= 0) return null;
        const pop = Easing.bezier(0.34, 1.5, 0.64, 1)(appear); // 过冲 ~8% 再回落
        const on = interpolate(frame, [p.tPipe + GROW - 2, p.tPipe + GROW + 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.icon[0] - 56,
              top: p.icon[1] - 56,
              opacity: Math.min(1, appear * 2.2),
              transform: `translateY(${((1 - pop) * 22).toFixed(2)}px) scale(${(0.72 + 0.28 * pop).toFixed(4)})`,
            }}
          >
            <Tile kind={p.kind} tint={p.tint} on={on * (frame > allOn ? 0.82 + 0.18 * breathe : 1)} />
          </div>
        );
      })}

      {/* 中枢面板：双面卡整体翻转 180°（正面旧页 → 背面新中枢页） */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1500 }}>
        <div
          style={{
            transform: `translate(${panX.toFixed(2)}px, ${panY.toFixed(2)}px) rotateY(${rotY.toFixed(3)}deg)`,
            position: 'relative',
            transformStyle: 'preserve-3d',
            width: PW * zoom,
            height: PH * zoom,
            flexShrink: 0,
          }}
        >
          {/* 正面：翻转前的旧页面 */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
            <div style={{ zoom }}>
              <FrontPanel glow={panelGlow} />
            </div>
          </div>
          {/* 背面：翻正后得到的新中枢页（预转 180° 使翻完时朝向镜头且不镜像） */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <div style={{ zoom }}>
              <HubPanel glow={panelGlow} />
            </div>
          </div>
          {/* 面板过曝罩：爆发期盖白 */}
          <div
            style={{
              position: 'absolute',
              inset: -6 * zoom,
              borderRadius: 18 * zoom,
              background: '#ffffff',
              opacity: Math.min(0.96, bloom * 1.05),
              filter: `blur(${5 * zoom}px)`,
              pointerEvents: 'none',
              transform: rotY > 90 ? 'rotateY(180deg) translateZ(1px)' : 'translateZ(1px)',
              backfaceVisibility: 'hidden',
            }}
          />
        </div>
      </AbsoluteFill>

      {/* 管口接入：五管同帧抵达中枢边缘时各起一圈小涟漪（在面板之上） */}
      {PIPES.map((p, i) => {
        const nums = p.path.match(/-?[\d.]+/g)!.map(Number);
        const [ex, ey] = [nums[nums.length - 2], nums[nums.length - 1]];
        const k = interpolate(frame, [p.tPipe + GROW - 1, p.tPipe + GROW + 13], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (k <= 0 || k >= 1) return null;
        const r = 6 + Easing.out(Easing.cubic)(k) * 26;
        return (
          <div
            key={`port-${i}`}
            style={{
              position: 'absolute', left: ex - r, top: ey - r, width: r * 2, height: r * 2, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.9)', opacity: (1 - k) * 0.85,
              boxShadow: '0 0 12px rgba(255,200,255,0.6)',
            }}
          />
        );
      })}

      {/* 全屏白热眩光（S3/S4）：白核+品红/粉翼+青蓝斑 */}
      {bloom > 0.02 && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              left: 300,
              top: 60,
              width: 1100,
              height: 900,
              background:
                'radial-gradient(closest-side, rgba(255,255,255,0.98), rgba(255,235,255,0.75) 42%, rgba(255,120,230,0.4) 68%, transparent 88%)',
              filter: 'blur(26px)',
              opacity: Math.min(1, bloom * (0.94 + 0.06 * noise)),
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 1150,
              top: 150,
              width: 700,
              height: 620,
              background: 'radial-gradient(closest-side, rgba(255,90,208,0.85), rgba(200,70,255,0.4) 60%, transparent 85%)',
              filter: 'blur(34px)',
              opacity: bloom * 0.9,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 40,
              top: 480,
              width: 620,
              height: 520,
              background: 'radial-gradient(closest-side, rgba(140,210,255,0.8), rgba(90,120,255,0.35) 60%, transparent 85%)',
              filter: 'blur(30px)',
              opacity: bloom * 0.85,
            }}
          />
          {/* 横向紫白光痕（S2 左侧光痕），只随侧棱闪出现 */}
          <div
            style={{
              position: 'absolute',
              left: 30,
              top: 700,
              width: 420,
              height: 40,
              borderRadius: 20,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(170,90,255,0.7), transparent)',
              filter: 'blur(16px)',
              opacity: interpolate(frame, [20, 34, 70, 92], [0, 0.9, 0.5, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          />
        </AbsoluteFill>
      )}
      <Vignette strength={0.55} inner={0.42} color="#040308" />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
