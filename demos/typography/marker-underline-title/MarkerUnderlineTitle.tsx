// marker-underline-title —— 白底大标题落定后，斜体 "new" 下方一道
// 马克笔下划线从左到右描画（粗细变化/端头圆润/微歪/边缘毛糙）。
// 对标 notion-ai.mp4 2.3–3.6s。与库内 draw-svg-trace 撞车，本版做马克笔质感。
import React, { useId } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

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
    const wBase = 14 + Math.sin(t * Math.PI) * 6 - Math.max(0, t - 0.86) * 46;
    const w = Math.max(2.2, wBase + wob[i] * 3);
    top.push(`${x.toFixed(1)},${(mid - w / 2).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${(mid + w / 2).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
};

export const MarkerUnderlineTitle: React.FC = () => {
  const frame = useCurrentFrame();
  // clipPath ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const revealId = `reveal-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const LEN = 252;

  // 标题落定：整块从下方 30px 弹入（ease-out），24 帧内完成
  const enter = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const eo = 1 - Math.pow(1 - enter, 3);
  const titleY = (1 - eo) * 36;
  const titleOp = Math.min(1, enter * 1.6);

  // 下划线：标题落定停一拍后描画，10 帧从左到右（提速一档），ease-out
  const draw = interpolate(frame, [32, 42], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const drawE = 1 - Math.pow(1 - draw, 2.2);
  const path = buildStroke(LEN, 77);

  return (
    <AbsoluteFill style={{ background: '#f4f4f2', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        opacity: titleOp, transform: `translateY(${titleY}px)`,
        fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif',
        fontWeight: 700, fontSize: 118, color: '#191919',
        textAlign: 'center', lineHeight: 1.12, letterSpacing: '-0.02em',
      }}>
        <div>
          Meet the{' '}
          <span style={{ fontStyle: 'italic', position: 'relative', display: 'inline-block' }}>
            new
            {/* 马克笔下划线：clip 从左到右揭示，保留笔形本身的粗细变化 */}
            <svg
              width={LEN} height={44} viewBox={`0 0 ${LEN} 44`}
              style={{ position: 'absolute', left: -12, bottom: -20, overflow: 'visible' }}
            >
              <defs>
                <clipPath id={revealId}>
                  <rect x={0} y={-20} width={drawE * (LEN + 6)} height={60} />
                </clipPath>
              </defs>
              {draw > 0 && (
                <path d={path} fill="#111111" clipPath={`url(#${revealId})`} />
              )}
            </svg>
          </span>
        </div>
        <div>Notion AI</div>
      </div>
    </AbsoluteFill>
  );
};
