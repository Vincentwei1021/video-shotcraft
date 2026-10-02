// F 式 mask-wipe 穿窗——页面里一张真实项目卡放大成窗口，该项目的**详情页**从窗内长出接管：
// "点开一张卡进入它的世界"。卡 = nano-lab（card9），窗内 = 同一项目的 detail-full 详情页（语义闭环）。
//
// 第二轮重设计（极光夜 · 卡片即新窗口）：
// - look = aurora（紫夜 · 紫光 · 粉）。产品页不再是满屏平贴：projects-full 以 1.3× 放进一扇浮在紫夜舞台上的
//   大窗口（1728×972），对准页底的 Research Infra 区块，卡片字号够读。
// - 先演"点开"：页面滚动惯性落定 → 光标滑上卡片 → 卡片抬起 + 一圈紫粉渐变选中描边与外发光（全片唯一的光效）
//   → 按下微缩 → 卡片**冲出旧窗口**，放大到与旧窗口完全相同的框位，成为新窗口：旧窗口同时后退（0.94）、
//   压暗、轻虚化沉进舞台，新旧两扇窗前后交接。
// - 窗几何与窗内景由同一个 t 驱动（窗内详情页从 0.42 反向补偿长到 1），卡片脸在前 28% 行程内渐隐（1 − 3.6t，再慢就会被拉大成满屏的巨字残影）；
//   选中描边随窗一起长大并淡成新窗口的发丝边；飞行中挂随高度变化的两层软阴影。
// - 落定后窗内详情页极缓前推 1.2%，hold 读清标题与研究问题列表。
//
// 时间表（30fps，共 130f）：
//   0–24    页面滚动惯性落到页底（EASE.out）
//   10–30   光标滑入卡片
//   26–38   悬浮：抬起 10px、1.03×、选中描边与发光亮起
//   38–42   按下微缩
//   42–86   穿窗 44f：bezier(0.6,0,0.15,1) 先蓄后冲、长尾落位；旧窗后退压暗
//   86–130  新窗口 hold：详情页极缓前推
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, bezier, ramp, mix, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, alpha } from '../../_fixtures/Look';

export const MASKWIPE_DUR = 130;

const L = LOOKS.aurora;
const WIN = { x: 96, y: 54, w: 1728, h: 972, r: 26 };
const Z = 1.3; // 旧窗口里列表页的缩放
const OFF_X = 960 - WIN.w / 2 / Z; // 页面内容居中
const PAGE_H = layout.projects.pageH; // 1746
const VIEW_END = PAGE_H - WIN.h / Z; // 滚到页底
const VIEW_START = VIEW_END - 240;
const CARD = layout.projects.cards[8]; // nano-lab
const EXPAND = bezier(0.6, 0, 0.15, 1);
const DZ = 1.1; // 新窗口里详情页的缩放
const D_OFF_X = 960 - WIN.w / 2 / DZ;
const D_OFF_Y = 0; // 带上页头（产品名 + 导航），新窗口一眼认得是同一个产品

const RING = `linear-gradient(135deg, ${L.accent} 0%, ${L.accent2} 100%)`;

export const MaskWipeReal: React.FC = () => {
  const frame = useCurrentFrame();

  // 滚动 + 悬浮 + 按下 + 穿窗
  const viewY = mix(VIEW_START, VIEW_END, ramp(frame, 0, 24, EASE.out));
  const hover = ramp(frame, 26, 12, EASE.snappy);
  const press = ramp(frame, 38, 3, EASE.out) * (1 - ramp(frame, 41, 5, EASE.out));
  const t = ramp(frame, 42, 44, EXPAND);
  const done = frame >= 86;

  // 卡片在屏幕空间的起始几何（随滚动走）+ 悬浮抬升
  const s0 = 1 + 0.03 * hover - 0.022 * press;
  const cw = CARD.w * Z, ch = CARD.h * Z;
  const cx = WIN.x + (CARD.x - OFF_X) * Z, cy = WIN.y + (CARD.y - viewY) * Z - 10 * hover;
  const g0 = { x: cx - (cw * (s0 - 1)) / 2, y: cy - (ch * (s0 - 1)) / 2, w: cw * s0, h: ch * s0, r: 12 * Z };
  const x = mix(g0.x, WIN.x, t), y = mix(g0.y, WIN.y, t), w = mix(g0.w, WIN.w, t), h = mix(g0.h, WIN.h, t), r = mix(g0.r, WIN.r, t);
  const innerScale = mix(0.42, 1, t);
  const elev = (4 + 18 * hover) * (1 - t) + 70 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t) + 40 * t;

  // 旧窗口：后退、压暗、轻虚化
  const back = ramp(frame, 42, 40, EASE.out);
  const oldScale = mix(1, 0.94, back);
  const oldDim = 0.72 * back;

  // 选中描边：悬浮时亮起，飞行中淡成发丝边
  const ring = hover * mix(1, 0.28, ramp(frame, 50, 30, EASE.out));

  // 落定后详情页极缓前推
  const settle = mix(1, 1.012, ramp(frame, 84, 46, EASE.smooth));

  // 光标
  const curT = ramp(frame, 10, 20, EASE.out);
  const curX = mix(1500, cx + cw * 0.64, curT);
  const curY = mix(1060, WIN.y + (CARD.y - VIEW_END) * Z + ch * 0.56, curT) - 10 * hover;
  const curOpacity = ramp(frame, 10, 6, EASE.out) * (1 - ramp(frame, 44, 6, EASE.out));

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.42, y: 0.0 }} fill={{ x: 0.88, y: 0.96 }} breathe={0.5}>
        <Dust look={L} count={28} seed={11} drift={0.16} opacity={0.45} />
      </Stage>

      {/* 旧窗口：列表页（穿窗完成后不再渲染） */}
      {!done && (
        <div style={{
          position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: WIN.r, overflow: 'hidden',
          transform: `scale(${oldScale.toFixed(4)})`, transformOrigin: '50% 50%', background: '#f9f6f1',
          boxShadow: `0 0 0 1px ${alpha('#e6dcff', 0.16)}, ${softShadow(56, { color: L.shadow, strength: 3 })}`,
          filter: back > 0.02 ? `blur(${(back * 4).toFixed(2)}px)` : undefined,
        }}>
          <Img src={staticFile('textures/live/projects-full.png')} style={{
            position: 'absolute', left: -OFF_X * Z, top: -viewY * Z, width: 1920 * Z,
          }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#ffffff', 0.08)} 0%, ${alpha('#ffffff', 0)} 30%, ${alpha('#1a1030', 0.1)} 100%)` }} />
          {oldDim > 0.002 && <div style={{ position: 'absolute', inset: 0, background: L.bg[1], opacity: oldDim }} />}
        </div>
      )}

      {/* 卡片即新窗口 */}
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, overflow: 'hidden', background: '#f9f6f1',
        boxShadow: `${softShadow(elev, { color: L.shadow, strength: 2.6 })}${ring > 0.01 ? `, 0 0 ${(46 * ring).toFixed(1)}px ${alpha(L.accent, 0.55 * ring)}` : ''}${done ? `, 0 0 0 1px ${alpha('#e6dcff', 0.16)}` : ''}`,
      }}>
        {/* 窗内新景：nano-lab 详情页，与窗几何同一个 t 反向补偿 */}
        {t > 0 && (
          <div style={{
            position: 'absolute', width: WIN.w, height: WIN.h, left: '50%', top: '50%',
            transform: `translate(-50%, -50%) scale(${(innerScale * settle).toFixed(4)})`, overflow: 'hidden',
          }}>
            <Img src={staticFile('textures/live/detail-full.png')} style={{ position: 'absolute', left: -D_OFF_X * DZ, top: -D_OFF_Y * DZ, width: 1920 * DZ }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#ffffff', 0.08)} 0%, ${alpha('#ffffff', 0)} 30%, ${alpha('#1a1030', 0.08)} 100%)` }} />
          </div>
        )}
        {/* 卡片脸：随放大渐隐露出窗内景 */}
        {t < 0.3 && (
          <Img src={staticFile('textures/live/card9.png')} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: Math.max(0, 1 - t * 3.6),
          }} />
        )}
      </div>

      {/* 选中描边：渐变 2px 环（mask 镂空中心），被圆角裁住，随窗一起长大 */}
      {ring > 0.01 && (
        <div style={{
          position: 'absolute', left: x - 3, top: y - 3, width: w + 6, height: h + 6, borderRadius: r + 3, padding: 2.5,
          background: RING, opacity: ring, pointerEvents: 'none',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }} />
      )}

      {/* 光标 */}
      {curOpacity > 0.01 && (
        <svg width={34} height={44} viewBox="0 0 26 34" style={{
          position: 'absolute', left: curX, top: curY, opacity: curOpacity,
          transform: `scale(${1 - 0.12 * press})`, transformOrigin: '2px 2px',
          filter: 'drop-shadow(0 4px 6px rgba(10,4,24,0.45))',
        }}>
          <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#141019" stroke="#ffffff" strokeWidth={1.8} strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
