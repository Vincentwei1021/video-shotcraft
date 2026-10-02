// marker-underline-title —— 白底大标题落定后，斜体 "new" 下方一道
// 马克笔下划线从左到右描画（粗细变化/端头圆润/微歪/边缘毛糙）。
// 对标 notion-ai.mp4 2.3–3.6s。与库内 draw-svg-trace 撞车，本版做马克笔质感。
// 质感层（改版）：补导出时长 75f（f42 划完后静止 33f ≥1s）；标题两行错峰 blur-slide
// （snappy，第二行晚 4f）；笔画加确定性干笔肌理——feTurbulence 位移做毛糙边 + 细碎飞白镂空，
// 墨色改带暖调的近黑并 multiply 进纸面；纸面 = 暖白低对比底 + 主光 + 颗粒；
// 品牌名换成中性占位 "Lumen AI"；整段极缓推近 1→1.015。
import React, { useId } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Backdrop, EASE, FONT, ramp } from '../../_fixtures/Polish';

export const MARKER_UNDERLINE_TITLE_DURATION = 75; // 标题 22f 落定 → f32–42 划线 → 静止 33f

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// 马克笔笔画：中轴微歪的路径 + 变宽轮廓，一次生成多边形
const buildStroke = (len: number, seed: number) => {
  const rand = mulberry32(seed);
  const N = 40;
  const top: string[] = [];
  const bot: string[] = [];
  // 预生成微歪偏移（低频）与毛糙（高频）
  const wob = Array.from({ length: N + 1 }, () => rand() - 0.5);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * len;
    // 中轴：跟随斜体微上斜（左低右高，对照截图）+ 缓波
    const mid = 19 - t * 9 + Math.sin(t * Math.PI * 1.6 + 0.4) * 2.6 + wob[i] * 1.6;
    // 宽度：起笔略细→中段饱满→收笔收尖，加高频毛糙
    const wBase = 14 + Math.sin(t * Math.PI) * 6 - Math.max(0, t - 0.86) * 46 - Math.max(0, 0.06 - t) * 70; // 起笔再收细一点，不再是平头
    const w = Math.max(2.2, wBase + wob[i] * 3);
    top.push(`${x.toFixed(1)},${(mid - w / 2).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${(mid + w / 2).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
};

const LEN = 252;
const PATH = buildStroke(LEN, 77);
const MARKER_INK = '#1b1916'; // 暖调近黑（马克笔墨，不是纯黑）

export const MarkerUnderlineTitle: React.FC = () => {
  const frame = useCurrentFrame();
  // SVG id 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const revealId = `reveal-${uid}`;
  const dryId = `dry-${uid}`;

  // 标题两行错峰落定：同一条 snappy 进度驱动 y / blur / opacity
  const line = (delay: number): React.CSSProperties => {
    const e = ramp(frame, delay, 22, EASE.snappy);
    return {
      opacity: Math.min(1, e * 1.4),
      transform: `translateY(${(1 - e) * 36}px)`,
      filter: e < 0.999 ? `blur(${((1 - e) * 8).toFixed(2)}px)` : undefined,
    };
  };

  // 下划线：标题落定停一拍后描画，10 帧从左到右（提速一档），ease-out
  const draw = interpolate(frame, [32, 42], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const drawE = 1 - Math.pow(1 - draw, 2.2);
  // 整段极缓推近（smooth，起止速度为 0）
  const push = 1 + 0.015 * ramp(frame, 0, 74, EASE.smooth);

  return (
    <AbsoluteFill>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.3 }} vignette={0.12} grain={0.05} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${push})` }}>
        <div style={{
          fontFamily: FONT.sans,
          fontWeight: 700, fontSize: 118, color: '#17181c',
          textAlign: 'center', lineHeight: 1.12, letterSpacing: '-0.028em',
        }}>
          <div style={line(0)}>
            Meet the{' '}
            <span style={{ fontStyle: 'italic', position: 'relative', display: 'inline-block' }}>
              new
              {/* 马克笔下划线：clip 从左到右揭示，保留笔形本身的粗细变化 */}
              <svg
                width={LEN} height={44} viewBox={`0 0 ${LEN} 44`}
                style={{ position: 'absolute', left: -12, bottom: -20, overflow: 'visible', mixBlendMode: 'multiply' }}
              >
                <defs>
                  <clipPath id={revealId}>
                    <rect x={0} y={-20} width={drawE * (LEN + 6)} height={60} />
                  </clipPath>
                  {/* 干笔肌理：低频位移 → 毛糙边；高频噪声阈值 → 细碎飞白（固定 seed，确定性） */}
                  <filter id={dryId} x="-5%" y="-40%" width="110%" height="180%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.09 0.5" numOctaves={2} seed={7} result="warp" />
                    <feDisplacementMap in="SourceGraphic" in2="warp" scale={1.8} xChannelSelector="R" yChannelSelector="G" result="rough" />
                    <feTurbulence type="fractalNoise" baseFrequency="0.035 0.9" numOctaves={2} seed={19} result="grain" />
                    <feColorMatrix in="grain" type="matrix"
                      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -16 11.4" result="holes" />
                    <feComposite in="rough" in2="holes" operator="in" />
                  </filter>
                </defs>
                {draw > 0 && (
                  <g clipPath={`url(#${revealId})`}>
                    <path d={PATH} fill={MARKER_INK} fillOpacity={0.94} filter={`url(#${dryId})`} />
                  </g>
                )}
              </svg>
            </span>
          </div>
          <div style={line(4)}>Lumen AI</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
