// contact-shadow-lift｜接触阴影离面抬升
// 浅底上一排 3 张卡，逐张被"点名"抬起：卡 translateY(-28px)+scale(1.08)，
// 其正下方独立椭圆阴影同步放大变淡——纸片离桌感；落回时阴影收紧变实，
// 落地 2f 卡壳 scale 0.99 微压。三张依次各来一遍。收尾真静止 ≥35f。
// 质感层（改版）：顶栏从灰条占位换成出版级产品顶栏（字标 / 导航 / 搜索 / 头像）；
// 接触影改为"实心核 + 宽软环境影"两层带色相的径向椭圆；被点名的卡悬停时有 ±1.5px 的
// 漂浮呼吸（两端为 0，不影响落点）与一圈强调色发丝描边，其余两张同步轻微压暗让位；
// 柔光浅底 + 颗粒。抬升幅度 / 时间轴 / 阴影 scale 与 opacity 区间保持原参数。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { Backdrop, FONT } from '../../_fixtures/Polish';

export const CONTACT_SHADOW_LIFT_DURATION = 160; // 末次动画止于 f125，留 35f 真静止

const outCubic = Easing.out(Easing.cubic);
const inCubic = Easing.in(Easing.cubic);

// 每张卡的局部时间轴（局部帧 t）：
// [0,10)   抬起  out-cubic
// [10,28)  悬停 18f
// [28,36)  落回  in-cubic
// [36,38)  落地卡壳 scale 0.99
// [38,43)  回弹 0.99→1.0 out-cubic
// t<0 或 t>=43 完全静止（rest 态）
const LIFT_Y = -28; // 原案 -8 → 加码 -20 → QA 保险再到 -28
const LIFT_S = 1.08;

const cardMotion = (t: number) => {
  const y = interpolate(t, [0, 10], [0, LIFT_Y], {
    easing: outCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) + interpolate(t, [28, 36], [0, -LIFT_Y], {
    easing: inCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  let s: number;
  if (t < 28) {
    s = interpolate(t, [0, 10], [1, LIFT_S], {
      easing: outCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  } else if (t < 38) {
    s = interpolate(t, [28, 36], [LIFT_S, 0.99], {
      easing: inCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  } else {
    s = interpolate(t, [38, 43], [0.99, 1], {
      easing: outCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  }

  // 抬升进度 0（贴桌）→1（悬空），驱动阴影
  const lift = interpolate(t, [0, 10], [0, 1], {
    easing: outCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) - interpolate(t, [28, 36], [0, 1], {
    easing: inCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // 悬停漂浮：只在 [10,28) 内，正弦包络两端为 0（不改变抬起终点与落回起点）
  const hover = t >= 10 && t < 28 ? Math.sin(((t - 10) / 18) * Math.PI) : 0;
  const float = -1.5 * hover;

  return { y: y + float, s, lift };
};

const CARD_W = 360;
const CARD_H = 220;
const GAP = 120;
const STARTS = [2, 42, 82]; // 三张卡依次点名，间隔 40f；末次动画止于 f125，留 35f 真静止

const NAV = ['Overview', 'Reports', 'Projects', 'Team'];

export const ContactShadowLift: React.FC = () => {
  const frame = useCurrentFrame();
  const rowW = CARD_W * 3 + GAP * 2;
  const left0 = (1920 - rowW) / 2;
  const top = (1080 - CARD_H) / 2 - 20;

  // 当前被点名的卡的抬升量（用于其余卡让位压暗）
  const lifts = [0, 1, 2].map((i) => cardMotion(frame - STARTS[i]).lift);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.38 }} accent={G.accent} grain={0.05} vignette={0.14} />

      {/* 产品顶栏：毛玻璃白 + 发丝底线 + 字标 / 导航 / 搜索 / 头像 */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 84,
          background: 'rgba(250,250,249,0.86)', borderBottom: `1px solid ${G.hairline}`,
          boxShadow: '0 1px 0 rgba(255,255,255,0.8), 0 8px 24px -16px rgba(16,18,26,0.18)',
          display: 'flex', alignItems: 'center', padding: '0 48px', gap: 18, boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(140deg, #7d84ea, #5b63d3)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px -1px rgba(60,66,170,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 4, border: '2.5px solid #fff', boxSizing: 'border-box' }} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 650, color: G.ink1, letterSpacing: '-0.015em' }}>Northwind</div>
        <div style={{ width: 1, height: 26, background: G.hairlineStrong, margin: '0 10px' }} />
        {NAV.map((n, k) => (
          <div
            key={n}
            style={{
              fontSize: 19, fontWeight: k === 1 ? 600 : 500, color: k === 1 ? G.ink1 : G.ink2,
              padding: '8px 14px', borderRadius: 9, background: k === 1 ? G.fill2 : 'transparent',
            }}
          >
            {n}
          </div>
        ))}
        <div
          style={{
            marginLeft: 'auto', width: 300, height: 42, borderRadius: 11, background: G.fill,
            border: `1px solid ${G.hairline}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
            boxSizing: 'border-box', color: G.ink3, fontSize: 17,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={G.ink3} strokeWidth={2} strokeLinecap="round">
            <circle cx={11} cy={11} r={6.5} />
            <path d="m20 20-4.2-4.2" />
          </svg>
          Search reports
          <div style={{ marginLeft: 'auto', fontSize: 14, color: G.ink3, border: `1px solid ${G.hairlineStrong}`, borderRadius: 5, padding: '1px 6px' }}>⌘K</div>
        </div>
        <div
          style={{
            width: 40, height: 40, borderRadius: 20, background: '#e4e1ef', color: '#4c4f7a', fontSize: 15, fontWeight: 650,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(16,18,26,0.15)',
          }}
        >
          JL
        </div>
      </div>

      {[0, 1, 2].map((i) => {
        const t = frame - STARTS[i];
        const { y, s, lift } = cardMotion(t);
        const x = left0 + i * (CARD_W + GAP);
        // 让位：别的卡在抬时本卡轻微压暗（multiply 约 4%），落回后恢复
        const others = Math.max(...lifts.filter((_, k) => k !== i));
        const dim = 0.07 * others;

        // 独立接触阴影（不是 box-shadow）：卡正下方椭圆径向渐变
        const shScale = 1 + 0.72 * lift;     // 1.0 → 1.72（对比再拉大）
        const shOpacity = 0.55 - 0.37 * lift; // 0.55 → 0.18
        const shW = CARD_W * 0.88;
        const shH = 44;

        return (
          <React.Fragment key={i}>
            {/* 环境影：宽而虚，随抬升扩散 */}
            <div
              style={{
                position: 'absolute',
                left: x + (CARD_W - shW * 1.1) / 2,
                top: top + CARD_H - shH * 0.8,
                width: shW * 1.1,
                height: shH * 1.6,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at center, rgba(16,18,26,0.35) 0%, rgba(16,18,26,0.12) 45%, rgba(16,18,26,0) 72%)',
                transform: `scale(${(1 + 0.9 * lift).toFixed(4)})`,
                opacity: shOpacity * 0.8,
              }}
            />
            {/* 接触核：小而实，抬起时变大变淡（scale 1→1.72 / opacity 0.55→0.18） */}
            <div
              style={{
                position: 'absolute',
                left: x + (CARD_W - shW) / 2,
                top: top + CARD_H - shH / 2 - 4,
                width: shW,
                height: shH,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at center, rgba(16,18,26,0.6) 0%, rgba(16,18,26,0.26) 40%, rgba(16,18,26,0) 70%)',
                transform: `scale(${shScale})`,
                opacity: shOpacity,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: x,
                top,
                width: CARD_W,
                height: CARD_H,
                transform: `translateY(${y}px) scale(${s})`,
              }}
            >
              <Card w={CARD_W} h={CARD_H} seed={i + 2} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }} />
              {/* 点名描边：强调色发丝圈，随抬升出现、落回消失 */}
              <div
                style={{
                  position: 'absolute', inset: -1, borderRadius: 15, pointerEvents: 'none',
                  boxShadow: `0 0 0 1.5px rgba(91,99,211,${(0.55 * lift).toFixed(3)}), 0 0 0 6px rgba(91,99,211,${(0.08 * lift).toFixed(3)})`,
                }}
              />
              {/* 让位压暗：带色相的浅灰罩，不改几何 */}
              {dim > 0.002 && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: '#e9e9e6', opacity: others * 0.45, mixBlendMode: 'multiply' }} />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
