// mosaic-reframe — 12 张瓦片在三种排版间连续变形：规则网格 → feature mosaic → 对角瀑布串。
// 位置 / 宽高 / 旋转各自独立插值（不走 transform 整体缩放），逐片错峰，段间留 hold。
//
// 第二轮重设计（暖沙 · 胶片分镜板）：
// - look = sand（米色 · 赤陶）。主体是 video-shotcraft 的一块分镜板（12 个镜头的定帧）：12 张程序绘制的
//   "胶片照片"（落日海面 / 沙丘 / 拱门 / 雾山 / 泳池 / 柑橘静物 / 棕榈影 / 麦田八式，暖调统一），
//   1920 原生坐标直接排版（不再从 480 设计坐标放大）。
// - 因果：右上角分段控件 Grid / Mosaic / Cascade 是"布局的开关"——赤陶色指示胶囊先滑到下一档
//   （父先动），瓦片晚 4f 开始重排（子跟随），让观众看见"一次切换 → 整版重新思考"。
// - 三态三种语气：A 规则网格（档案）→ B feature mosaic（首图占 3×2，压上衬线大字图注 = 策展）
//   → C 对角瀑布（每张变成带白边的相纸，-15° 起每张 +3° 递增旋转，像一手牌被摊开 = 态度），
//   C 态左下留白处升起衬线大标题「Every shot, in sequence.」，尾帧是一张完整的分镜海报。
// - 运动：每片 x/y 用强 in-out（0.75,0,0.15,1）果断换位，w/h 晚 2f、旋转晚 4f 收敛（位置先到）；
//   换位途中按段进度 sin 包络"抬起"（放大 3.5% + 阴影变大变虚），落位贴回；B→C 旋转带一次轻过冲。
// - 错峰：A→B 自左上主图起按序号波浪扫过（先密后疏）；B→C 像发牌一样按序号依次摊开。
//
// 时间表（30fps，共 214f）：
//   0–22    预备：舞台、页眉与控件在场；12 张照片自左上沿对角线错峰升起（第 0 帧已有首张起始态）
//   22–52   hold A：读网格（全程相机极缓推近 1→1.025）
//   52–64   控件胶囊 Grid→Mosaic（snappy 12f）
//   56–92   A→B 重排：每片 26f，错峰 10f；84–104 主图图注逐词升起
//   92–128  hold B：读 mosaic
//   128–140 控件胶囊 Mosaic→Cascade；图注 128 起退场
//   132–176 B→C 摊牌：每片 30f，等间隔错峰 14f；相纸白边 0→14px；158–186 大标题逐词升起、副行淡入
//   180–214 hold C：海报落定
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, TextReveal, alpha, stagger, type } from '../../_fixtures/Look';
import { BRAND, PITCH, ShotcraftMark } from '../../_fixtures/Brand';

export const MOSAIC_REFRAME_DURATION = 214;

const L = LOOKS.sand;
const N = 12;

// ───────────── 时间常量 ─────────────
const T_AB = 52; // 控件切到 Mosaic
const T_BC = 128; // 控件切到 Cascade
const LAG = 4; // 瓦片晚于控件起跳的帧数（父先动、子跟随）
const D_AB = 26;
const D_BC = 30;
const MOVE = bezier(0.75, 0, 0.15, 1); // 果断换位：慢起 → 急走 → 长尾软落
const ROT_SETTLE = bezier(0.45, 0, 0.3, 1.22); // 旋转晚到并轻过冲一次

// ───────────── 三套布局（1920×1080 原生像素）─────────────
type Box = { x: number; y: number; w: number; h: number; rot: number };
const X0 = 96, X1 = 1824, Y0 = 212, Y1 = 984; // 内容区：安全边距 96，页眉下方

// A：4×3 规则网格
const AG = 24;
const AW = (X1 - X0 - 3 * AG) / 4, AH = (Y1 - Y0 - 2 * AG) / 3;
const A: Box[] = Array.from({ length: N }, (_, i) => ({
  x: X0 + (i % 4) * (AW + AG), y: Y0 + Math.floor(i / 4) * (AH + AG), w: AW, h: AH, rot: 0,
}));

// B：6×4 单元格 feature mosaic，首片占 3×2
const BG = 16;
const UW = (X1 - X0 - 5 * BG) / 6, UH = (Y1 - Y0 - 3 * BG) / 4;
const SLOTS: [number, number, number, number][] = [
  [0, 0, 3, 2], [3, 0, 1, 1], [4, 0, 1, 1], [5, 0, 1, 1], [3, 1, 2, 1], [5, 1, 1, 1],
  [0, 2, 1, 1], [1, 2, 2, 1], [3, 2, 1, 2], [4, 2, 2, 1], [0, 3, 3, 1], [4, 3, 2, 1],
];
const B: Box[] = SLOTS.map(([c, r, cw, rh]) => ({
  x: X0 + c * (UW + BG), y: Y0 + r * (UH + BG), w: cw * UW + (cw - 1) * BG, h: rh * UH + (rh - 1) * BG, rot: 0,
}));

// C：对角瀑布串——竖幅相纸沿 (850,214)→(1724,930) 摊开，旋转 -15° 起每张 +3° 递增
const CW = 300, CH = 372;
const C: Box[] = Array.from({ length: N }, (_, i) => {
  const s = i / (N - 1);
  const cx = 850 + 874 * s, cy = 214 + 716 * s;
  return { x: cx - CW / 2, y: cy - CH / 2, w: CW, h: CH, rot: -15 + i * 3 };
});

// ───────────── 照片（程序插画，viewBox 160×100 + slice ≈ object-fit: cover）─────────────
type Kind = 'sun' | 'dune' | 'arch' | 'ridge' | 'pool' | 'citrus' | 'palm' | 'field';
const PHOTOS: { kind: Kind; v: number }[] = [
  { kind: 'sun', v: 0 }, { kind: 'dune', v: 0 }, { kind: 'pool', v: 0 }, { kind: 'arch', v: 0 },
  { kind: 'ridge', v: 0 }, { kind: 'citrus', v: 0 }, { kind: 'palm', v: 0 }, { kind: 'field', v: 0 },
  { kind: 'dune', v: 1 }, { kind: 'arch', v: 1 }, { kind: 'sun', v: 1 }, { kind: 'ridge', v: 1 },
];

const Photo: React.FC<{ i: number }> = ({ i }) => {
  const { kind, v } = PHOTOS[i];
  const id = `mr${i}`;
  const g = (stops: [string, number][], vertical = true) => (
    <linearGradient id={`${id}g`} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
      {stops.map(([c, o], k) => <stop key={k} offset={o} stopColor={c} />)}
    </linearGradient>
  );
  let body: React.ReactNode = null;
  let defs: React.ReactNode = null;
  if (kind === 'sun') {
    const warm = v === 0;
    const sx = warm ? 126 : 80; // 主图的太阳偏右，给左下图注让位
    defs = g(warm ? [['#f6c58e', 0], ['#ec8f5b', 0.55], ['#d8643f', 1]] : [['#f4d3b0', 0], ['#e6a07a', 0.6], ['#c97a62', 1]]);
    body = (
      <>
        <rect width="160" height="64" fill={`url(#${id}g)`} />
        <circle cx={sx} cy="56" r={warm ? 15 : 11} fill="#fff1d6" />
        <circle cx={sx} cy="56" r={warm ? 26 : 20} fill="#fff1d6" opacity="0.18" />
        <rect y="60" width="160" height="40" fill={warm ? '#3e4a63' : '#5a5f78'} />
        <rect y="60" width="160" height="6" fill={warm ? '#566078' : '#6e728a'} opacity="0.8" />
        {[63, 67, 72, 78, 85].map((y, k) => (
          <rect key={k} x={sx - (16 - k * 2.2)} y={y} width={2 * (16 - k * 2.2)} height={1.2 + k * 0.2} rx="0.6" fill="#ffe2b4" opacity={0.75 - k * 0.12} />
        ))}
      </>
    );
  } else if (kind === 'dune') {
    const a = v === 0;
    defs = g(a ? [['#f3dcc0', 0], ['#ecc39a', 1]] : [['#e9d2c4', 0], ['#e1b6a0', 1]]);
    body = (
      <>
        <rect width="160" height="100" fill={`url(#${id}g)`} />
        <circle cx={a ? 118 : 40} cy="24" r="8" fill="#fff4e2" opacity="0.9" />
        <path d="M0 62 C 30 46, 60 44, 92 58 S 140 66, 160 52 V100 H0Z" fill={a ? '#dc9a68' : '#cf8f72'} />
        <path d="M0 74 C 40 60, 70 64, 100 76 S 140 82, 160 70 V100 H0Z" fill={a ? '#c4733f' : '#b4705a'} />
        <path d="M30 100 C 60 80, 100 78, 160 86 V100Z" fill={a ? '#8f4a2b' : '#7f4c3f'} />
        <path d="M0 62 C 30 46, 60 44, 92 58" fill="none" stroke="#fbe3c4" strokeWidth="0.8" opacity="0.7" />
      </>
    );
  } else if (kind === 'arch') {
    const a = v === 0;
    defs = g(a ? [['#efd2b4', 0], ['#e2b48f', 1]] : [['#e9c9c0', 0], ['#d9a497', 1]], false);
    body = (
      <>
        <rect width="160" height="100" fill={`url(#${id}g)`} />
        <path d="M58 100 V52 A22 22 0 0 1 102 52 V100Z" fill={a ? '#6e3f2b' : '#5d3a3a'} />
        <path d="M66 100 V56 A14 14 0 0 1 94 56 V100Z" fill={a ? '#f1c795' : '#f0c2a8'} opacity="0.9" />
        <polygon points="0,0 70,0 20,100 0,100" fill="#ffffff" opacity="0.12" />
        <polygon points="102,100 160,40 160,100" fill={a ? '#b97d58' : '#a8706a'} opacity="0.45" />
        <rect y="92" width="160" height="8" fill={a ? '#c08a62' : '#b1817a'} />
      </>
    );
  } else if (kind === 'ridge') {
    const a = v === 0;
    defs = g(a ? [['#e9e4dc', 0], ['#c9cfd6', 1]] : [['#efe0d0', 0], ['#d7c4b4', 1]]);
    body = (
      <>
        <rect width="160" height="100" fill={`url(#${id}g)`} />
        <polygon points="0,62 26,40 46,54 74,28 104,52 126,38 160,56 160,100 0,100" fill={a ? '#a9b4c2' : '#c4ab98'} />
        <polygon points="0,74 34,54 62,68 96,46 130,66 160,58 160,100 0,100" fill={a ? '#7d8ca0' : '#a5846c'} />
        <polygon points="0,86 40,70 84,84 120,68 160,80 160,100 0,100" fill={a ? '#4f5d72' : '#7a5a46'} />
        <rect y="56" width="160" height="10" fill="#ffffff" opacity="0.18" />
      </>
    );
  } else if (kind === 'pool') {
    defs = g([['#6cc3c1', 0], ['#2f8c96', 1]]);
    body = (
      <>
        <rect width="160" height="100" fill={`url(#${id}g)`} />
        <rect y="0" width="160" height="22" fill="#efe2cf" />
        <rect y="20" width="160" height="3" fill="#d9c7ad" />
        {[40, 62, 84].map((y, k) => <rect key={k} x="0" y={y} width="160" height="1.6" fill="#ffffff" opacity="0.35" />)}
        <path d="M10 50 Q 40 44 70 52 T 130 50" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
        <path d="M30 72 Q 60 66 90 74 T 150 72" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
        <polygon points="100,23 160,23 160,100 130,100" fill="#1c5f6c" opacity="0.35" />
      </>
    );
  } else if (kind === 'citrus') {
    defs = g([['#f1e3cc', 0], ['#e6d1b2', 1]]);
    body = (
      <>
        <rect width="160" height="100" fill={`url(#${id}g)`} />
        <rect y="64" width="160" height="36" fill="#c67a45" />
        <rect y="64" width="160" height="2" fill="#e29a63" />
        <ellipse cx="74" cy="78" rx="44" ry="5" fill="#8d4f2a" opacity="0.4" />
        <circle cx="64" cy="60" r="15" fill="#ef8a36" />
        <circle cx="90" cy="64" r="11" fill="#f3a246" />
        <circle cx="59" cy="55" r="4" fill="#ffd29a" opacity="0.7" />
        <circle cx="87" cy="60" r="3" fill="#ffe0b0" opacity="0.7" />
        <path d="M64 45 q 5 -6 11 -4 q -4 6 -11 4z" fill="#5d7a4a" />
      </>
    );
  } else if (kind === 'palm') {
    defs = g([['#ecc2aa', 0], ['#e0a68c', 1]], false);
    body = (
      <>
        <rect width="160" height="100" fill={`url(#${id}g)`} />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <path key={k} d={`M40 10 Q ${60 + k * 14} ${10 + k * 10} ${78 + k * 16} ${28 + k * 14}`} fill="none" stroke="#b97862" strokeWidth={5 - k * 0.4} strokeLinecap="round" opacity="0.55" />
        ))}
        <path d="M40 10 L 34 100" stroke="#b97862" strokeWidth="3" opacity="0.5" />
        <rect y="88" width="160" height="12" fill="#c98d74" />
      </>
    );
  } else {
    defs = g([['#f3e1c0', 0], ['#e9c992', 1]]);
    body = (
      <>
        <rect width="160" height="100" fill={`url(#${id}g)`} />
        <rect y="0" width="160" height="40" fill="#e8d7bd" />
        <circle cx="128" cy="20" r="7" fill="#fff3dc" />
        {Array.from({ length: 9 }, (_, k) => (
          <path key={k} d={`M80 40 L ${-60 + k * 35} 100`} stroke="#c49a52" strokeWidth={1.4 + k * 0.1} opacity="0.55" />
        ))}
        <path d="M0 40 H160" stroke="#b9925a" strokeWidth="1" opacity="0.6" />
      </>
    );
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>{defs}</defs>
      {body}
    </svg>
  );
};

// ───────────── 分段控件（布局开关）─────────────
const SEG = ['Grid', 'Mosaic', 'Cascade'];
const SEG_W = 168, SEG_H = 60, SEG_PAD = 6;
const Segmented: React.FC<{ frame: number }> = ({ frame }) => {
  const p1 = ramp(frame, T_AB, 12, EASE.snappy);
  const p2 = ramp(frame, T_BC, 12, EASE.snappy);
  const pos = p1 + p2; // 0 → 1 → 2
  // 胶囊在途中横向拉长（像被拽过去），到位收回
  const stretch = 1 + 0.18 * (Math.sin(Math.PI * p1) + Math.sin(Math.PI * p2));
  const press = (k: number, t: number) => 1 - 0.05 * Math.sin(Math.PI * ramp(frame, t - 3, 8, EASE.linear)) * (k > 0 ? 1 : 0);
  return (
    <div style={{
      position: 'absolute', right: 96, top: 92, width: SEG_W * 3 + SEG_PAD * 2, height: SEG_H + SEG_PAD * 2, borderRadius: 999,
      background: alpha('#ffffff', 0.55), boxShadow: `inset 0 0 0 1px ${L.line}, ${softShadow(6, { color: L.shadow, strength: 0.6 })}`,
    }}>
      <div style={{
        position: 'absolute', top: SEG_PAD, left: SEG_PAD + pos * SEG_W, width: SEG_W, height: SEG_H, borderRadius: 999,
        background: L.accent, transform: `scaleX(${stretch.toFixed(4)})`,
        boxShadow: `0 6px 16px -6px ${alpha(L.accent, 0.7)}, inset 0 1px 0 rgba(255,255,255,0.25)`,
      }} />
      {SEG.map((s, k) => {
        const on = Math.max(0, 1 - Math.abs(pos - k));
        return (
          <div key={s} style={{
            position: 'absolute', top: SEG_PAD, left: SEG_PAD + k * SEG_W, width: SEG_W, height: SEG_H,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...type(30, 600), letterSpacing: '-0.01em',
            color: on > 0.5 ? L.onAccent : L.ink2,
            transform: `scale(${(k === 1 ? press(1, T_AB) : k === 2 ? press(2, T_BC) : 1).toFixed(4)})`,
          }}>{s}</div>
        );
      })}
    </div>
  );
};

// 瓦片在某帧的几何：A→B、B→C 两段各自的进度，位置 / 宽高 / 旋转错开收敛
const tileAt = (frame: number, i: number) => {
  const sAB = T_AB + LAG + stagger(i, N, 10, EASE.out);
  const sBC = T_BC + LAG + stagger(i, N, 14, EASE.linear); // 发牌：等间隔依次摊开
  const pAB = ramp(frame, sAB, D_AB, MOVE);
  const pBC = ramp(frame, sBC, D_BC, MOVE);
  const sAB2 = ramp(frame, sAB + 2, D_AB, MOVE); // 宽高晚 2f
  const sBC2 = ramp(frame, sBC + 2, D_BC, MOVE);
  const rBC = ramp(frame, sBC + 4, D_BC, ROT_SETTLE); // 旋转晚 4f + 过冲
  const a = A[i], b = B[i], c = C[i];
  // 以中心插值位置（宽高变化时中心走直线，不会"先长后跑"）
  const cxA = a.x + a.w / 2, cyA = a.y + a.h / 2, cxB = b.x + b.w / 2, cyB = b.y + b.h / 2, cxC = c.x + c.w / 2, cyC = c.y + c.h / 2;
  const cx = mix(mix(cxA, cxB, pAB), cxC, pBC);
  const cy = mix(mix(cyA, cyB, pAB), cyC, pBC);
  const w = mix(mix(a.w, b.w, sAB2), c.w, sBC2);
  const h = mix(mix(a.h, b.h, sAB2), c.h, sBC2);
  const rot = mix(0, c.rot, rBC);
  const lift = Math.max(Math.sin(Math.PI * pAB), Math.sin(Math.PI * pBC));
  return { cx, cy, w, h, rot, lift, pBC: sBC2, moving: pBC > 0 };
};

export const MosaicReframe: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = mix(1, 1.025, ramp(frame, 0, 214, EASE.smooth)); // 全程极缓推近

  // 主图图注（B 态）：84f 起逐词升起，128f 起退场
  const capOut = ramp(frame, T_BC, 10, EASE.exit);
  // C 态大标题
  const HEAD = 158;

  const tiles = Array.from({ length: N }, (_, i) => ({ i, ...tileAt(frame, i) }));
  // 叠放次序：B→C 起按序号（后发的牌压在上面）；之前主图最高
  const inC = frame >= T_BC + LAG;
  const z = (i: number) => (inC ? 10 + i : i === 0 ? 30 : 10);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.28, y: 0.02 }} fill={{ x: 0.9, y: 0.95 }} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '50% 46%' }}>
        {/* 页眉：品牌标志 + 小写字标 + 分镜板名（标志按亮底 light 版；字标与分镜名同一基线）。
            总宽压在 x≈620 以内——C 态首张相纸的左上角在 x≈650，页眉再长会被它盖住 */}
        <div style={{ position: 'absolute', left: 96, top: 92, height: 72, display: 'flex', alignItems: 'center', gap: 18, color: L.ink }}>
          <ShotcraftMark size={50} tone="light" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <span style={{ fontFamily: BRAND.font, fontSize: 36, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1 }}>{BRAND.name}</span>
            <span style={{ ...type(32, 450), color: L.ink2 }}>Storyboard</span>
          </div>
        </div>
        <Segmented frame={frame} />

        {/* C 态大标题（左下留白处） */}
        <div style={{ position: 'absolute', left: 96, top: 676, color: L.ink }}>
          <div style={{ ...type(124, 500, { serif: true }), letterSpacing: '-0.035em', lineHeight: 1.0 }}>
            <TextReveal text="Every shot," start={HEAD} by="word" variant="rise" each={20} gap={5} />
            <br />
            <TextReveal text="in sequence." start={HEAD + 6} by="word" variant="rise" each={20} gap={5}
              unitStyle={() => ({ fontStyle: 'italic', color: L.accent })} />
          </div>
          <div style={{
            ...type(32, 450), color: L.ink2, marginTop: 26,
            opacity: ramp(frame, HEAD + 14, 16, EASE.out), transform: `translateY(${mix(12, 0, ramp(frame, HEAD + 14, 18, EASE.snappy)).toFixed(2)}px)`,
          }}>{PITCH.en.taglines[4]}</div>
        </div>

        {tiles.map(({ i, cx, cy, w, h, rot, lift, pBC }) => {
          // 开场：沿对角线错峰升起（从左上到右下）
          const order = (i % 4) + Math.floor(i / 4);
          const inP = ramp(frame, stagger(order, 6, 14, EASE.out) - 2, 16, EASE.snappy);
          const pad = 14 * pBC; // 相纸白边
          const radius = mix(16, 6, pBC);
          const scale = mix(0.94, 1, inP) * (1 + 0.035 * lift);
          const elev = 6 + 34 * lift + 8 * pBC;
          return (
            <div key={i} style={{
              position: 'absolute', left: cx - w / 2, top: cy - h / 2 + (1 - inP) * 40, width: w, height: h,
              transform: `rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
              opacity: inP, zIndex: z(i), borderRadius: radius,
              background: L.surface, boxShadow: softShadow(elev, { color: L.shadow, strength: 0.9 + 0.5 * pBC }),
            }}>
              <div style={{ position: 'absolute', inset: pad, borderRadius: Math.max(2, radius - pad * 0.7), overflow: 'hidden' }}>
                <Photo i={i} />
                {/* 照片内缘一圈极淡暗边：像冲印的晕影，让亮色照片在米色底上立得住 */}
                <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(60,30,10,0.10), inset 0 -60px 80px -40px rgba(40,20,10,0.18)' }} />
                {i === 0 && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(200deg, rgba(30,18,10,0) 40%, rgba(30,18,10,0.6) 100%)',
                    opacity: ramp(frame, T_AB + LAG + 16, 14, EASE.out) * (1 - capOut),
                  }} />
                )}
              </div>
              {/* 主图图注：B 态的策展语气 */}
              {i === 0 && frame >= T_AB + LAG + 20 && capOut < 1 && (
                <div style={{ position: 'absolute', left: 44, bottom: 36, color: '#fff8ee', opacity: 1 - capOut }}>
                  <div style={{ ...type(30, 650, { caps: true }), letterSpacing: '0.16em', color: '#ffd9b8', marginBottom: 10 }}>
                    <TextReveal text="Featured shot" start={T_AB + LAG + 22} by="word" variant="blur" each={14} />
                  </div>
                  <div style={{ ...type(84, 500, { serif: true }), letterSpacing: '-0.03em', textShadow: '0 2px 18px rgba(30,15,5,0.35)' }}>
                    <TextReveal text="Golden Hour" start={T_AB + LAG + 26} by="word" variant="rise" each={18} gap={5} />
                  </div>
                  <div style={{ ...type(32, 450), color: 'rgba(255,248,238,0.82)', marginTop: 8, opacity: ramp(frame, T_AB + LAG + 34, 14, EASE.out) }}>
                    Shot 01 · Crash zoom · 4.5 s
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Grain opacity={0.05} blend="overlay" />
    </div>
  );
};
