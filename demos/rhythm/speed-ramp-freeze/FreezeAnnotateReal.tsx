// freeze-annotate 定格标注（轮 G）——真实卡片流运动中定格，
// 马克笔琥珀圈注（feTurbulence 手绘抖动）圈住目标卡 + 箭头点题，解冻继续。
// remap：0–45 流动 → 45–100 定格（斜率0）→ 100–135 解冻（1.4x 补偿）。
import { useId } from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';

export const FREEZEANNOTATE_DUR = 135;

const CARD_W = 460;
const GAP = 60;
const RAIL = layout.projects.cards.slice(0, 9);
const TARGET_I = 5;
const AMBER = '#b45309';

export const FreezeAnnotateReal: React.FC = () => {
  const frame = useCurrentFrame();
  // 滤镜 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const roughId = `rough-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const src = interpolate(frame, [0, 45, 100, 135], [0, 45, 45, 94], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const dx = src * 22;
  const draw = interpolate(frame, [52, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const arrowDraw = interpolate(frame, [60, 66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fade = interpolate(frame, [96, 104], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 导轨起点 -880：定格时（dx=990）目标卡 k=5 中心 = -880+2600-990+230 = 960 屏中
  const X0 = -880;
  const targetX = X0 + TARGET_I * (CARD_W + GAP) - dx + CARD_W / 2;
  const C = 1750; // 椭圆周长近似
  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 370, transform: `translateX(${-dx + X0}px)` }}>
        {Array.from({ length: 14 }).map((_, k) => {
          const c = RAIL[k % RAIL.length];
          const isTarget = k === TARGET_I;
          return (
            <Img
              key={k}
              src={staticFile(`textures/live/${isTarget ? 'card4-hires.png' : c.file}`)}
              style={{
                position: 'absolute', left: k * (CARD_W + GAP), top: 0,
                width: CARD_W, borderRadius: 12,
                boxShadow: '0 4px 16px rgba(31,28,23,0.10)',
              }}
            />
          );
        })}
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: fade }}>
        <defs>
          <filter id={roughId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
          </filter>
        </defs>
        <ellipse
          cx={targetX} cy={560} rx={290} ry={230}
          fill="none" stroke={AMBER} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - draw)}
          transform={`rotate(-6 ${targetX} 560)`}
          filter={`url(#${roughId})`}
        />
        <path
          d={`M ${targetX + 330} 190 Q ${targetX + 220} 240 ${targetX + 140} 320`}
          fill="none" stroke={AMBER} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={420} strokeDashoffset={420 * (1 - arrowDraw)}
          filter={`url(#${roughId})`}
        />
      </svg>
    </AbsoluteFill>
  );
};
