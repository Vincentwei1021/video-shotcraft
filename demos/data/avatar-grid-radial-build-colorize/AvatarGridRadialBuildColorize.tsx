// avatar-grid-radial-build-colorize — Avatar Grid 分环生长随机染色（motion-lab 定稿转原生 Remotion）
// 8×7 小卡片网格由中心向四周分环生长（每 4 帧扩一环，1.2s 铺满），卡片内容混合三种占位：
// 首字母头像 / 应用图标 / 缩略图，只做 opacity + scale 0.8→1 不位移；铺满后约 15% 的卡片
// 在 1s 内随机时刻把底色染成浅红、状态点转红，形成"异常项逐渐浮现"的呼吸感。
// 中央 3×6 区域 visibility:hidden 占位留给标题与图例，标题层始终 100% 不透明。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
//
// 质感升级：柔光背景 + 颗粒（在 DesignStage 外按输出像素铺，避免 zoom 放粗颗粒）；卡片走
// 发丝线 + 内高光 + 随"长出"抬升的两层软阴影；Unicode 符号换成矢量应用图标、随机色相色块
// 换成定调的双色缩略图；生长用 overshoot 小幅落座；染色一拍内底/边/点同曲线 + 卡片轻顿一下
// + 状态点一圈涟漪（裁在卡片内），其余卡片同时微微退后，让红点自己跳出来；图例计数实时翻动。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, rand, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, Grain, mix as lerpN, softShadow, tracking } from '../../_fixtures/Polish';

export const AVATAR_GRID_RADIAL_BUILD_COLORIZE_DURATION = 168; // 5600ms @30fps

const INK = '#17181c';
const INK2 = '#5d5f66';
const INK3 = '#8d9097';
const CARD_WHITE = '#ffffff';
const FLAG_BG = '#FDECEC';
const LINE = '#E6E6E2';
const FLAG_LINE = '#F6CFCF';
const OK = '#37C46B';
const WARN = '#F5A524';
const BAD = '#F0453A';

// 颜色插值（底/描边/点三通道共用同一条 cT 曲线）
const hex2rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const mix = (a: string, b: string, t: number) => {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(
    A[2] + (B[2] - A[2]) * t,
  )})`;
};

const COLS = 8;
const ROWS = 7;
const TOTAL = 5.6 * 30; // 总帧数（delay 换算用）

// 网格几何：等价 inset:16px + gap:10px 的 CSS grid，绝对定位手排保住亚像素节距
const GAP = 10;
const CELL_W = (480 - 32 - (COLS - 1) * GAP) / COLS; // 47.25
const CELL_H = (270 - 32 - (ROWS - 1) * GAP) / ROWS; // ≈25.43

// 首字母头像：名字缩写 + 一组低饱和底色（同色相深字），像真实成员列表而不是灰字块
const INI = ['VS', 'KJ', 'EM', 'AL', 'TR', 'MN', 'BQ', 'DW', 'RC', 'SF', 'PL', 'GH'];
const TINTS: Array<[string, string]> = [
  ['#E4E6FA', '#4B53C2'], // 靛
  ['#DDEFEA', '#2F7D68'], // 青
  ['#F4E9DA', '#9A6A2C'], // 砂
  ['#E9E3F3', '#6D4E9E'], // 紫
  ['#E2ECF6', '#3B6A99'], // 蓝灰
  ['#EFE6E1', '#8A5A48'], // 陶
];
// 应用图标底：同一套色相的饱和版渐变（图标是白色矢量）
const ICON_GRAD: Array<[string, string]> = [
  ['#7C83E6', '#545CCB'],
  ['#4FB39A', '#2E8A73'],
  ['#E7B36A', '#C98A38'],
  ['#9C82D2', '#7458B4'],
  ['#6E9BD0', '#46739F'],
  ['#3C3F4A', '#22242B'],
];
// 缩略图：定调的双色"风景照"（天空 → 远山 → 近山），替代随机色相渐变
const THUMBS: Array<[string, string, string, string]> = [
  ['#BCCDE3', '#8CA3C4', '#5A7398', '#F6E7CF'], // 晨雾蓝
  ['#E9CDB6', '#C59A7E', '#8C6352', '#FCEBD6'], // 砂岩
  ['#C2DDD2', '#86B3A3', '#4E7F71', '#F1F4E2'], // 松林
  ['#D3CAEA', '#A193CB', '#6B5E9A', '#F7EAF1'], // 暮紫
  ['#E6DDC2', '#BDB08A', '#857A57', '#FBF3DC'], // 麦田
];

// 白色矢量图标（12×12 视框），替代字体回退不可控的 Unicode 符号
const ICON_PATHS = [
  'M6 1.6 L10.4 6 L6 10.4 L1.6 6 Z', // 菱形
  'M6 2 L10.2 9.6 H1.8 Z', // 三角
  'M6 1.8 A4.2 4.2 0 1 0 6.001 1.8 Z M6 4 A2 2 0 1 1 5.999 4 Z', // 圆环
  'M6.8 1.4 L2.8 6.8 H5.6 L5 10.6 L9.2 5 H6.4 Z', // 闪电
  'M2.2 2.2 H5.2 V5.2 H2.2 Z M6.8 2.2 H9.8 V5.2 H6.8 Z M2.2 6.8 H5.2 V9.8 H2.2 Z M6.8 6.8 H9.8 V9.8 H6.8 Z', // 四宫格
  'M6 1.2 C6.5 4.6 7.4 5.5 10.8 6 C7.4 6.5 6.5 7.4 6 10.8 C5.5 7.4 4.6 6.5 1.2 6 C4.6 5.5 5.5 4.6 6 1.2 Z', // 四角星
];

// 每格的静态参数（种子跨帧确定）
const CELLS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  const hidden = r >= 2 && r <= 4 && c >= 1 && c <= 6; // 中央留空给标题 + 图例（占位不破坏网格）
  const kind = Math.floor(rand(i * 9.1) * 3); // 0=首字母 1=图标 2=图片缩略
  const ini = INI[(i * 7) % INI.length]; // 步长 7（与 12 互素）：左右/上下相邻格不撞同一缩写
  const tone = Math.floor(rand(i * 5.3) * TINTS.length);
  const icon = Math.floor(rand(i * 2.9) * ICON_PATHS.length);
  const thumb = Math.floor(rand(i * 7.7) * THUMBS.length);
  const ring = Math.round(Math.hypot((c - 3.5) / 1.0, (r - 3) / 0.85)); // 到中心的"环号"
  const delay = (ring * 4 + rand(i + 40) * 3) / TOTAL; // 每 4 帧扩一环 + 帧级抖动
  const flagged = !hidden && rand(i + 900) < 0.15; // ~15% 异常卡
  const pending = !hidden && !flagged && rand(i + 1300) < 0.12; // 少量 Pending（2 张）（琥珀点，静态），让图例三色都有归属
  const at = 0.3 + rand(i + 1600) * 0.3; // 染色随机时刻
  return { r, c, hidden, kind, ini, tone, icon, thumb, delay, flagged, pending, at };
});
const VISIBLE = CELLS.filter((c) => !c.hidden);
const N_PENDING = VISIBLE.filter((c) => c.pending).length;

const LEGEND: Array<[string, string]> = [
  ['Active', OK],
  ['Pending', WARN],
  ['Inactive', BAD],
];

// 卡片内容（按 kind 三选一）
const CellContent: React.FC<{ cl: (typeof CELLS)[number]; fade: number }> = ({ cl, fade }) => {
  if (cl.kind === 0) {
    const [bg, fg] = TINTS[cl.tone];
    return (
      <div
        style={{
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: bg,
          color: fg,
          boxShadow: `inset 0 0 0 0.5px rgba(20,22,28,0.06)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 6.2,
          fontWeight: 650,
          letterSpacing: '0.01em',
          fontFamily: FONT.sans,
        }}
      >
        {cl.ini}
      </div>
    );
  }
  if (cl.kind === 1) {
    const [a, b] = ICON_GRAD[cl.tone];
    return (
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: `linear-gradient(160deg, ${a}, ${b})`,
          boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.35), 0 0.5px 1px rgba(16,18,26,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={8} height={8} viewBox="0 0 12 12" style={{ display: 'block' }}>
          <path d={ICON_PATHS[cl.icon]} fill="#ffffff" fillRule="evenodd" />
        </svg>
      </div>
    );
  }
  const [sky, far, near, sun] = THUMBS[cl.thumb];
  return (
    <div style={{ position: 'absolute', inset: 0, filter: fade > 0 ? `saturate(${1 - fade * 0.3})` : undefined }}>
      <svg width="100%" height="100%" viewBox="0 0 48 26" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`sky${cl.thumb}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sun} />
            <stop offset="1" stopColor={sky} />
          </linearGradient>
        </defs>
        <rect width="48" height="26" fill={`url(#sky${cl.thumb})`} />
        <circle cx={14 + (cl.thumb * 7) % 20} cy="9" r="3.4" fill={sun} opacity="0.9" />
        <path d={`M0 18 C8 ${12 + cl.thumb} 15 13 22 16 C29 ${19 - cl.thumb} 37 11 48 15 V26 H0 Z`} fill={far} />
        <path d={`M0 22 C10 18 18 ${20 + (cl.thumb % 2)} 27 21 C36 ${22 - cl.thumb * 0.5} 42 19 48 20 V26 H0 Z`} fill={near} />
      </svg>
    </div>
  );
};

export const AvatarGridRadialBuildColorize: React.FC = () => {
  const t = useT();
  // 标题：淡入 + 0.98→1 + 3px 虚焦拉实；图例随后浮现（上移 3px 落座）
  const tIn = seg(t, 0.02, 0.1, EASE.snappy);
  const legendIn = seg(t, 0.26, 0.36, EASE.out);
  // 染色幕：其他卡片微微退后（0.30–0.62），观众视线被推向红点
  const recede = seg(t, 0.28, 0.64, EASE.smooth);
  // 相机：全程极缓推近 2.5%（平滑曲线，起止零速度），给静态网格一点呼吸
  const push = lerpN(1, 1.025, seg(t, 0, 1, EASE.smooth));

  // 图例实时计数：Inactive = 已越过染色中点的卡数
  const nBad = VISIBLE.filter((c) => c.flagged && t >= c.at + 0.018).length;
  const nActive = VISIBLE.length - N_PENDING - nBad;
  const counts = [nActive, N_PENDING, nBad];

  return (
    <AbsoluteFill style={{ background: '#efefec' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.42 }} accent="#5b63d3" grain={0} vignette={0.16} />
      <DesignStage bg="transparent" raster="zoom">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            fontFamily: FONT.sans,
            transform: `scale(${push})`,
            transformOrigin: '50% 47%',
          }}
        >
          {/* 中央柔光托底：标题区域略亮，保证字在网格中间有自己的舞台 */}
          <div
            style={{
              position: 'absolute',
              left: 60,
              right: 60,
              top: 70,
              bottom: 70,
              background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.75), rgba(255,255,255,0) 100%)',
              opacity: tIn,
            }}
          />
          <div style={{ position: 'absolute', inset: 16 }}>
            {CELLS.map((cl, i) => {
              const f = 0.09 + cl.delay;
              const o = seg(t, f, f + 0.03, EASE.out);
              // 生长：0.8→1，overshoot 小幅冲过再落座（≈1.6%），无位移
              const sc = seg(t, f, f + 0.055, EASE.overshoot);
              // 落座时阴影才抬起：长出来之前贴平，长成后静置高度 3
              const elev = seg(t, f + 0.01, f + 0.06, EASE.out) * 3;
              // 异常卡：底色染浅红、边框染粉、状态点转红——同一条 cT
              const cT = cl.flagged ? seg(t, cl.at, cl.at + 0.036, EASE.out) : 0;
              // 染色那一拍卡片轻顿一下（1→1.045→1，正弦包络）
              const tick = cl.flagged ? Math.sin(Math.PI * seg(t, cl.at, cl.at + 0.06, EASE.swift)) * 0.045 : 0;
              // 状态点涟漪：半径 2.5→10、透明度 0.45→0，裁在卡片圆角内
              const rip = cl.flagged ? seg(t, cl.at + 0.01, cl.at + 0.11, EASE.out) : 0;
              const fade = cl.flagged ? 0 : recede;
              const dot = cl.flagged ? mix(OK, BAD, cT) : cl.pending ? WARN : OK;
              const img = cl.kind === 2;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: cl.c * (CELL_W + GAP),
                    top: cl.r * (CELL_H + GAP),
                    width: CELL_W,
                    height: CELL_H,
                    boxSizing: 'border-box',
                    borderRadius: 7,
                    background: cl.flagged ? mix(CARD_WHITE, FLAG_BG, cT) : CARD_WHITE,
                    border: `0.5px solid ${cl.flagged ? mix(LINE, FLAG_LINE, cT) : img ? 'rgba(20,22,28,0.10)' : LINE}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    lineHeight: 1,
                    opacity: o * (1 - fade * 0.12),
                    boxShadow:
                      `inset 0 0.5px 0 rgba(255,255,255,0.9), ` +
                      (cT > 0
                        ? softShadow(elev + tick * 60, { color: '#7a1c16', strength: 0.6 + cT * 0.5 })
                        : softShadow(elev, { strength: 0.75 })),
                    visibility: cl.hidden ? 'hidden' : 'visible',
                    transform: `scale(${lerpN(0.8, 1, sc) + tick})`,
                  }}
                >
                  <CellContent cl={cl} fade={fade} />
                  {/* 状态点涟漪（一次，裁进卡片） */}
                  {rip > 0 && rip < 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 6.5 - lerpN(2.5, 10, rip), // 点心距右/上 6.5
                        top: 6.5 - lerpN(2.5, 10, rip),
                        width: lerpN(2.5, 10, rip) * 2,
                        height: lerpN(2.5, 10, rip) * 2,
                        borderRadius: '50%',
                        border: `0.6px solid ${BAD}`,
                        opacity: (1 - rip) * 0.55,
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: dot,
                      // 白描边：缩略图上也能读出状态点
                      boxShadow: `0 0 0 ${img ? 1 : 0.8}px rgba(255,255,255,${img ? 0.95 : 0.9})${
                        cT > 0 ? `, 0 0 ${3 * cT}px rgba(240,69,58,${0.45 * cT})` : ''
                      }`,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '45%',
              transform: `translate(-50%,-50%) scale(${lerpN(0.98, 1, tIn)})`,
              fontWeight: 760,
              fontSize: 30,
              lineHeight: 1.2,
              letterSpacing: tracking(120),
              color: INK,
              textAlign: 'center',
              zIndex: 5,
              whiteSpace: 'nowrap',
              opacity: tIn,
              filter: tIn < 0.999 ? `blur(${(1 - tIn) * 3}px)` : undefined,
            }}
          >
            Let's bring them back in
          </div>
          {/* 图例：一枚发丝线胶囊，三色点 + 实时计数（tabular-nums 不抖） */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '56.5%',
              transform: `translate(-50%, ${lerpN(3, 0, legendIn)}px)`,
              display: 'flex',
              gap: 11,
              alignItems: 'center',
              zIndex: 5,
              padding: '4.5px 10px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.82)',
              border: '0.5px solid rgba(20,22,28,0.08)',
              boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.9), ${softShadow(2, { strength: 0.7 })}`,
              opacity: legendIn,
              whiteSpace: 'nowrap',
            }}
          >
            {LEGEND.map(([txt, col], k) => (
              <div
                key={txt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 560,
                  fontSize: 10,
                  lineHeight: 1,
                  letterSpacing: '0.005em',
                  color: INK2,
                }}
              >
                <span
                  style={{
                    width: 5.5,
                    height: 5.5,
                    borderRadius: '50%',
                    background: col,
                    display: 'inline-block',
                    boxShadow: `0 0 0 1.5px ${col}22`,
                  }}
                />
                <span>{txt}</span>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 650,
                    color: k === 2 && counts[2] > 0 ? '#C8322A' : INK3,
                    minWidth: 9,
                  }}
                >
                  {counts[k]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
