// avatar-grid-radial-build-colorize — Avatar Grid 分环生长随机染色（motion-lab 定稿转原生 Remotion）
// 8×7 小卡片网格由中心向四周分环生长（每 4 帧扩一环，1.2s 铺满），卡片内容混合三种占位：
// 首字母 / 图标符 / 色块缩略图，只做 opacity + scale 0.8→1 不位移；铺满后约 15% 的卡片
// 在 1s 内随机时刻把底色染成浅红、状态点转红，形成"异常项逐渐浮现"的呼吸感。
// 中央 3×6 区域 visibility:hidden 占位留给标题与图例，标题层始终 100% 不透明。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const AVATAR_GRID_RADIAL_BUILD_COLORIZE_DURATION = 168; // 5600ms @30fps

const PAPER = '#F3F3F1';
const INK = '#111113';
const MID = '#8A8A8F';
const CARD_WHITE = '#ffffff';
const FLAG_BG = '#FDECEC';

// 颜色插值（effect.js 的 mix；hex2rgb 原来自 lab 页面全局，这里内联实现）
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

// 网格几何：等价 effect.js 的 inset:16px + gap:10px CSS grid，但改为绝对定位手排。
// CSS grid 在 480×270 设计坐标下会把轨道取整到整像素（放大 4 倍后节距 140/144 交替），
// 与原片的全分辨率均匀分布不符；小数设计坐标 + 绝对定位可保住亚像素节距。
const GAP = 10;
const CELL_W = (480 - 32 - (COLS - 1) * GAP) / COLS; // 47.25
const CELL_H = (270 - 32 - (ROWS - 1) * GAP) / ROWS; // ≈25.43

// 卡片内容三种占位：首字母(logo 位) / 图标符 / 色块缩略图(图片位)，实际使用换项目素材
const INI = ['VS', 'KJ', 'EM', 'AL', 'TR', 'MN', 'BQ', 'DW', 'RC', 'SF', 'PL', 'GH'];
const ICONS = ['◆', '▲', '●', '■', '✦', '◐', '❖', '▣'];

// 每格的静态参数（种子与 effect.js 逐一对应，跨帧确定）
const CELLS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  const hidden = r >= 2 && r <= 4 && c >= 1 && c <= 6; // 中央留空给标题 + 图例（占位不破坏网格）
  const kind = Math.floor(rand(i * 9.1) * 3); // 0=首字母 1=图标 2=图片缩略
  const ini = INI[Math.floor(rand(i * 3.7) * INI.length)];
  const icon = ICONS[Math.floor(rand(i * 5.3) * ICONS.length)];
  const h = Math.floor(rand(i * 7.7) * 360); // 缩略图渐变色相
  const ring = Math.round(Math.hypot((c - 3.5) / 1.0, (r - 3) / 0.85)); // 到中心的"环号"
  const delay = (ring * 4 + rand(i + 40) * 3) / TOTAL; // 每 4 帧扩一环 + 帧级抖动
  const flagged = rand(i + 900) < 0.15; // ~15% 异常卡
  const at = 0.3 + rand(i + 1600) * 0.3; // 染色随机时刻
  return { hidden, kind, ini, icon, h, delay, flagged, at };
});

const LEGEND: Array<[string, string]> = [
  ['Active', '#37C46B'],
  ['Pending', '#F5A524'],
  ['Inactive', '#F0453A'],
];

export const AvatarGridRadialBuildColorize: React.FC = () => {
  const t = useT();
  // 标题淡入 + 轻微 scale；图例随后浮现
  const tIn = seg(t, 0.02, 0.1, E.outQuad);
  const legendIn = seg(t, 0.26, 0.36, E.outQuad);
  return (
    <DesignStage bg={PAPER} raster="zoom">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          fontFamily: "-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif",
        }}
      >
        <div style={{ position: 'absolute', inset: 16 }}>
          {CELLS.map((cl, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const f = 0.09 + cl.delay;
            const o = seg(t, f, f + 0.018, E.linear);
            const sc = seg(t, f, f + 0.03, E.outQuad);
            // 异常卡：底色染浅红、边框染粉、状态点转红
            const cT = cl.flagged ? seg(t, cl.at, cl.at + 0.036, E.outQuad) : 0;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: c * (CELL_W + GAP),
                  top: r * (CELL_H + GAP),
                  width: CELL_W,
                  height: CELL_H,
                  boxSizing: 'border-box', // 等价 grid stretch：边框计入轨道尺寸
                  borderRadius: 8,
                  background: cl.flagged ? mix(CARD_WHITE, FLAG_BG, cT) : CARD_WHITE,
                  border: `1px solid ${cl.flagged ? mix('#E7E7E4', '#F6CFCF', cT) : '#E7E7E4'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  fontWeight: 700,
                  fontSize: cl.kind === 1 ? 13 : 11,
                  lineHeight: 1,
                  fontFamily: '-apple-system,Helvetica,sans-serif', // Remotion 无头浏览器缺 -apple-system，补 Helvetica 对齐原片 SF 字形
                  color: cl.kind === 1 ? '#6a6f7c' : '#3A3A3E',
                  opacity: o,
                  boxShadow: '0 1px 2px rgba(0,0,0,.04)',
                  visibility: cl.hidden ? 'hidden' : 'visible',
                  transform: `scale(${lerp(sc, 0.8, 1)})`,
                }}
              >
                {cl.kind === 0 ? cl.ini : cl.kind === 1 ? cl.icon : null}
                {cl.kind === 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 7,
                      background: `linear-gradient(${45 + (cl.h % 90)}deg, hsl(${cl.h},18%,78%), hsl(${
                        (cl.h + 40) % 360
                      },22%,62%))`,
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
                    background: cl.flagged ? mix('#37C46B', '#F0453A', cT) : '#37C46B',
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
            transform: `translate(-50%,-50%) scale(${lerp(tIn, 0.98, 1)})`,
            fontWeight: 800,
            fontSize: 30,
            lineHeight: 1.2,
            fontFamily: "-apple-system,'Helvetica Neue',sans-serif",
            letterSpacing: -1.2,
            color: INK,
            textAlign: 'center',
            zIndex: 5,
            whiteSpace: 'nowrap',
            opacity: tIn,
          }}
        >
          Let's bring them back in
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '56%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            zIndex: 5,
            padding: '4px 10px',
            opacity: legendIn,
            whiteSpace: 'nowrap',
          }}
        >
          {LEGEND.map(([txt, col]) => (
            <div
              key={txt}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
                fontSize: 11,
                lineHeight: 1,
                fontFamily: '-apple-system,Helvetica,sans-serif', // Remotion 无头浏览器缺 -apple-system，补 Helvetica 对齐原片 SF 字形
                color: MID,
              }}
            >
              <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: col, display: 'inline-block' }}
              />
              <span>{txt}</span>
            </div>
          ))}
        </div>
      </div>
    </DesignStage>
  );
};
