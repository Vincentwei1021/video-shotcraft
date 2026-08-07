// counter-confetti — Counter Confetti 数字冲刺纸屑（motion-lab 定稿转原生 Remotion）
// 大数字 0 → 1000 用 easeOutQuart 冲刺，scale 走 [0.2,1.3,1.3,1] 过冲；数字到位前
// 5 帧就从两侧 burst 出 8 色纸屑，带重力下落与自转飘散。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const COUNTER_CONFETTI_DURATION = 138; // 4600ms @30fps

const PAL = ['#ff6b8b', '#ffb347', '#ffe86b', '#7bff9e', '#5fd8ff', '#6c8cff', '#c86cff', '#ff6cf0'];
const BURST = 0.52; // 计数到位(0.56)前"抢拍"

// 52 片纸屑的静态参数（种子与 effect.js 完全一致，确定性可复现）
const BITS = Array.from({ length: 52 }, (_, i) => {
  const isRect = rand(i * 3) > 0.4;
  const w = 5 + rand(i + 2) * 6;
  const h = isRect ? 8 + rand(i + 5) * 7 : w;
  const side = i % 2 ? 1 : -1;
  return {
    w,
    h,
    isRect,
    color: PAL[i % 8],
    x0: side * 250, // 从画面两侧出发（px，相对中心）
    y0: (rand(i + 30) - 0.5) * 60,
    vx: -side * (150 + rand(i * 5 + 1) * 300), // 向画面中间冲
    vy: -(230 + rand(i * 7 + 3) * 220),
    g: 900 + rand(i + 60) * 520,
    spin: (rand(i + 90) - 0.5) * 1500,
    d: rand(i + 120) * 0.06, // 每片略微错峰
  };
});

export const CounterConfetti: React.FC = () => {
  const t = useT();
  // 计数：easeOutQuart 冲刺
  const p = seg(t, 0.06, 0.56, E.outQuart);
  const val = Math.round(p * 1000);
  // scale 过冲 [0.2,1.3,1.3,1]
  const s1 = seg(t, 0.06, 0.3, E.outCubic);
  const s2 = seg(t, 0.56, 0.72, E.outBack);
  const sc = lerp(s1, 0.2, 1.3) + s2 * (1 - 1.3);
  // 到位冲击环
  const rp = seg(t, 0.545, 0.75, E.outQuart);
  return (
    <DesignStage bg="radial-gradient(80% 80% at 50% 45%,#161a2b,#07080e 75%)">
      {/* 中心辉光 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '47%',
          width: 340,
          height: 340,
          margin: -170,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(120,160,255,.28),transparent 66%)',
          opacity: 0.35 + seg(t, 0.5, 0.62, E.outCubic) * 0.65 - seg(t, 0.72, 1) * 0.5,
        }}
      />
      {/* 大数字（渐变填充文字，外层 scale 过冲） */}
      <div style={{ position: 'absolute', left: '50%', top: '47%', transformOrigin: '50% 50%', transform: `scale(${sc})` }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate(-50%,-50%)',
            whiteSpace: 'nowrap',
            fontWeight: 800,
            fontSize: 74,
            lineHeight: 1,
            // 原栈 -apple-system 在 Remotion 无头浏览器解析不到（落到 Arial），
            // 补 Helvetica 兜底——度量与原片的 SF Pro 逐字形吻合
            fontFamily: "-apple-system,Helvetica,'Segoe UI',sans-serif",
            letterSpacing: -2,
            background: 'linear-gradient(180deg,#ffffff,#a9bcff)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 34px rgba(130,160,255,.28)',
            opacity: Math.min(1, seg(t, 0.02, 0.12) * 1.2),
          }}
        >
          {val.toLocaleString('en-US')}
        </div>
      </div>
      {/* 底部标签：淡入 + letter-spacing 收拢 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '70%',
          transform: 'translate(-50%,0)',
          fontWeight: 700,
          fontSize: 10,
          lineHeight: 1,
          fontFamily: '-apple-system,Helvetica,sans-serif', // 同上：Helvetica 兜底对齐原片

          color: '#7d88a8',
          opacity: seg(t, 0.62, 0.78, E.outCubic),
          letterSpacing: lerp(seg(t, 0.62, 0.82, E.outCubic), 11, 5),
        }}
      >
        METRIC THIS WEEK
      </div>
      {/* 到位冲击环 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '47%',
          width: 120,
          height: 120,
          margin: -60,
          borderRadius: '50%',
          border: '2px solid rgba(160,190,255,.8)',
          // 原渲染无全局 border-box：120px 是内容宽，2px 边框外扩到 124px
          // （Remotion 注入了 * { box-sizing:border-box }，显式还原才对得上原片）
          boxSizing: 'content-box',
          opacity: rp > 0 ? (1 - rp) * 0.9 : 0,
          transform: `scale(${0.35 + rp * 2.6})`,
        }}
      />
      {/* 纸屑：抢拍 burst + 重力下落 + 自转 */}
      {BITS.map((b, i) => {
        const u = seg(t, BURST + b.d, 1);
        const life = u * 1.1; // 秒级时间尺度
        const x = b.x0 + b.vx * life;
        const y = b.y0 + b.vy * life + 0.5 * b.g * life * life;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: b.w,
              height: b.h,
              background: b.color,
              borderRadius: b.isRect ? 2 : '50%',
              willChange: 'transform',
              opacity: u <= 0 ? 0 : Math.min(1, u * 8) * (1 - seg(u, 0.74, 1) * 0.95),
              transform: `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotate(${b.spin * life}deg) scale(${0.8 + (1 - u) * 0.35})`,
            }}
          />
        );
      })}
    </DesignStage>
  );
};
