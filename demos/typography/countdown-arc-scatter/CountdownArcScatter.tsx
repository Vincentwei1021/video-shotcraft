// countdown-arc-scatter — Countdown Arc 表盘数字扫过（motion-lab 定稿转原生 Remotion）
// 白底表盘：等大深色数字沿同一大弧切向排布，整盘扫过 ~96° 减速急停（数字随位置角在
// 弧两端淡入/淡出），短刻度线同步回正；"5" 停上弧顶后落位成标题首字符，
// "min / to / install" 逐词模糊淡入，结尾整词转强调色（末双字母收尾的染色手法保留）。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const COUNTDOWN_ARC_SCATTER_DURATION = 33; // 1100ms @30fps

const INK = '#17181c';
const ACCENT_RGB = [59, 130, 246]; // #3b82f6
const R0 = 150; // 弧半径
const SP = 24; // 相邻数字角距
// i=6 是 "5"，落位时角度归零停在弧顶
const NUMS = [45, 35, 28, 22, 17, 10, 5, 4, 3];
// "5" 落位的目标点（相对 pivot）
const TARGET = { x: -148, y: -30 };

// 数字/标题共用的字形
const NUM_FONT: React.CSSProperties = {
  color: INK,
  fontWeight: 600,
  fontSize: 40,
  letterSpacing: '-0.5px',
  whiteSpace: 'nowrap',
};

// 逐词模糊淡入的时间窗：min → to → install
const WORDS: { text: string; mr: number; win: [number, number] }[] = [
  { text: 'min', mr: 11, win: [0.54, 0.68] },
  { text: 'to', mr: 11, win: [0.62, 0.78] },
  { text: 'install', mr: 0, win: [0.7, 0.9] },
];

const mix = (k: number, a: number, b: number) => Math.round(lerp(k, a, b));

export const CountdownArcScatter: React.FC = () => {
  const t = useT();
  // 整盘扫过：+96° → 0°，outCubic 减速急停
  const rot = lerp(seg(t, 0, 0.52, E.outCubic), 96, 0);
  const hand = seg(t, 0.52, 0.7, E.inOutCubic); // "5" 落位平移
  const out = seg(t, 0.5, 0.7, E.inQuad); // 其余数字原地淡出
  // 结尾整词（末双字母收尾）转强调色 #17181c → ACCENT
  const bl = seg(t, 0.84, 0.98);
  return (
    <DesignStage bg="#fff">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#fff',
          overflow: 'hidden',
          fontFamily: '-apple-system,system-ui,sans-serif',
        }}
      >
        {/* pivot：所有元素都以它为原点定位 */}
        <div style={{ position: 'absolute', left: '50%', top: '58%', width: 0, height: 0 }}>
          {NUMS.map((n, i) => {
            const is5 = n === 5;
            const pa = (i - 6) * SP + rot; // 当前位置角
            const rad = (pa * Math.PI) / 180;
            let x = Math.sin(rad) * R0;
            let y = -Math.cos(rad) * R0;
            let rSelf = pa; // 切向排布：随位置角自转
            let op = Math.max(0, Math.min(1, (70 - Math.abs(pa)) / 22)); // 弧两端淡入淡出
            if (is5) {
              x = lerp(hand, x, TARGET.x);
              y = lerp(hand, y, TARGET.y);
              rSelf *= 1 - hand;
            } else {
              op *= 1 - out;
            }
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  ...NUM_FONT,
                  opacity: op,
                  transform: `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${rSelf}deg)`,
                  // "5" 不模糊；其余数字随淡出同步糊化
                  filter: is5 ? undefined : `blur(${out * 3}px)`,
                }}
              >
                {n}
              </div>
            );
          })}
          {/* 短刻度指针（深色细线，随盘转动回正） */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              transform: `rotate(${rot * 0.35}deg)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: -1.5,
                top: -101,
                width: 3,
                height: 26,
                borderRadius: 2,
                background: INK,
                opacity: 1 - out,
              }}
            />
          </div>
          {/* 标题（相对 pivot 定位，中性占位文案），"5" 落到其左端 */}
          <div
            style={{
              position: 'absolute',
              left: -124,
              top: -30,
              transform: 'translateY(-50%)',
              ...NUM_FONT,
            }}
          >
            {WORDS.map(({ text, mr, win }, k) => {
              const p = seg(t, win[0], win[1], E.outCubic);
              const isLast = k === WORDS.length - 1;
              return (
                <span
                  key={k}
                  style={{
                    display: 'inline-block',
                    marginRight: mr || undefined,
                    opacity: p,
                    filter: `blur(${(1 - p) * 6}px)`,
                    color: isLast
                      ? `rgb(${mix(bl, 23, ACCENT_RGB[0])},${mix(bl, 24, ACCENT_RGB[1])},${mix(bl, 28, ACCENT_RGB[2])})`
                      : undefined,
                  }}
                >
                  {text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
