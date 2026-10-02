// clock-wipe｜时钟扫描擦除
// FakeDashboard A → B。30–90f 一根隐形雷达指针从 12 点方向顺时针扫一圈，
// B 页在上层用大扇形 clip-path polygon 逐帧张开；扫描沿带亮线（白核+暗描边+柔光）。
// 90–96f 亮线淡出，96f 起摘罩（B 直接满屏、无 clip-path、亮线卸载），
// 96–150f 真静止 54f ≥ 40f。帧确定，无随机。
//
// 质感升级：
// - 指针身后拖一道 36° 的雷达余辉扇（强调色 0→0.13 的 conic 渐变，只铺在已扫过的 B 侧），
//   "扫描"有了时间感——刚刷新的区域还亮着、渐渐褪成新页；扫满前余辉长度随角度增长，不越过 12 点；
// - 屏心补一枚指针枢轴（深色芯 + 白环 + 强调色圆点 + 软投影）：22–30f 带过冲弹出做预备，
//   指针从它身上长出来；90–96f 与亮线同步淡出、96f 一并卸载；
// - 指针外端渐隐（SVG 线性渐变描边），不再是一根顶到画外的硬棍；四层亮线宽度/透明度照旧。
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, ramp } from '../../_fixtures/Polish';

export const CLOCK_WIPE_DURATION = 150;
const TRAIL = 36; // 余辉扇角度

const CX = 960;
const CY = 540;
const R = 1400; // 大于中心到角的距离 ~1101，扇形完全盖角
const SEGS = 72; // 顶点数固定且够密，避免锯齿跳变

// 12 点方向为 0°，顺时针（屏幕坐标 y 向下）
const polar = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};

const fanClip = (theta: number): string => {
  const pts: string[] = [`${CX}px ${CY}px`];
  for (let i = 0; i <= SEGS; i++) {
    const [x, y] = polar((theta * i) / SEGS, R);
    pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }
  return `polygon(${pts.join(', ')})`;
};

export const ClockWipe: React.FC = () => {
  const frame = useCurrentFrame();
  // 渐变/遮罩 ID 按实例生成，多实例同场不串引（useId 的冒号在 url() 里非法，需清洗）
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fadeId = `clockwipe-fade-${uid}`;
  const maskId = `clockwipe-mask-${uid}`;

  // 30–90f 指针 0→360°，linear（时钟扫描要匀速才像雷达）
  const theta = interpolate(frame, [30, 90], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wipeDone = frame >= 90;

  // 亮线：扫描期间常亮，90–96f 线性淡出，96f 起条件卸载（摘罩判例）
  const lineOpacity = interpolate(frame, [90, 96], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineMounted = frame >= 30 && frame < 96;

  const [x2, y2] = polar(theta, R);
  // 枢轴：22–30f 过冲弹出，与亮线同步淡出
  const hubIn = ramp(frame, 22, 8, EASE.overshoot);
  // 余辉扇：长度随角度增长（不越过 12 点），亮线淡出时一起褪
  const trail = Math.min(TRAIL, theta);

  return (
    <AbsoluteFill style={{ background: '#ececea' }}>
      {/* 底层：A 页。擦完后卸载（上层 B 已满屏） */}
      {!wipeDone && (
        <AbsoluteFill>
          <FakeDashboard variant="A" />
        </AbsoluteFill>
      )}

      {/* 上层：B 页。扫描期挂扇形 clip-path，擦完后摘罩直出 */}
      {frame >= 30 && (
        <AbsoluteFill style={wipeDone ? undefined : { clipPath: fanClip(theta) }}>
          <FakeDashboard variant="B" />
        </AbsoluteFill>
      )}

      {/* 雷达余辉扇：铺在指针身后已扫过的 B 侧 */}
      {lineMounted && trail > 0.5 && (
        <AbsoluteFill
          style={{
            opacity: lineOpacity,
            background: `conic-gradient(from ${(theta - trail).toFixed(2)}deg at ${CX}px ${CY}px, rgba(91,99,211,0) 0deg, rgba(91,99,211,0.13) ${trail.toFixed(2)}deg, rgba(91,99,211,0) ${trail.toFixed(2)}deg)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 扫描亮线：柔光 + 暗描边 + 白核，从屏心指向当前角度（外端渐隐） */}
      {lineMounted && (
        <svg
          width={1920}
          height={1080}
          style={{ position: 'absolute', inset: 0, opacity: lineOpacity, pointerEvents: 'none' }}
        >
          <defs>
            <linearGradient id={fadeId} gradientUnits="userSpaceOnUse" x1={CX} y1={CY} x2={x2} y2={y2}>
              <stop offset="0%" stopColor="#fff" />
              <stop offset="70%" stopColor="#fff" />
              <stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={1080}>
              <line x1={CX} y1={CY} x2={x2} y2={y2} stroke={`url(#${fadeId})`} strokeWidth={40} />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
          {/* 柔光带（QA 后加码 1.5x：白底看不清就加深+加宽） */}
          <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.35)" strokeWidth={26} strokeLinecap="round" />
          <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.60)" strokeWidth={13} strokeLinecap="round" />
          {/* 暗描边：白底上"提亮"不可见，加深保证浅色区也读得出指针 */}
          <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(10,11,18,0.55)" strokeWidth={9} strokeLinecap="round" />
          {/* 白核 */}
          <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.95)" strokeWidth={4} strokeLinecap="round" />
          </g>
        </svg>
      )}

      {/* 指针枢轴：深色芯 + 白环 + 强调色圆点 + 软投影 */}
      {frame >= 22 && frame < 96 && (
        <div
          style={{
            position: 'absolute', left: CX - 16, top: CY - 16, width: 32, height: 32, borderRadius: 16,
            background: `radial-gradient(circle at 40% 32%, #2a2c34 0%, ${G.ink1} 75%)`,
            boxShadow: '0 0 0 3px rgba(255,255,255,0.95), 0 0 0 4px rgba(16,18,26,0.18), 0 8px 22px rgba(16,18,26,0.35)',
            transform: `scale(${hubIn.toFixed(4)})`,
            opacity: lineOpacity,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 5, background: G.accent, boxShadow: `0 0 10px ${G.accent}` }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
