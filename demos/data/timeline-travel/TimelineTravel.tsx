// timeline-travel —— 时间轴横移（《反恐王国》式）
//
// 第二轮重设计（余烬地平线 · 时间旅行）：
// - look = ember（暖黑 · 橙）。画面下 1/3 是一条发光的时间轴（地平线光带压在轴上），密排的次刻度是速度参照物；
//   远景是 380px 的渐变填色大年份（2019 / 2021 / 2023 / 2026），以 0.35× 视差慢移、按距离淡入淡出；
//   近景几颗失焦光斑以 1.6× 视差掠过 —— 三层速度差让"旅行"有纵深。
// - 镜头沿轴缓起 → 冲刺 → 末段急刹（速度曲线是连续的：smoothstep 起步、巡航、末 18% 平方律刹停，
//   不再是分段 inOut 在断点处速度归零的"顿挫"）；冲刺段按相机速度给世界层横向运动模糊。
// - 相机到达刻度前 6f，对应里程碑卡以底边为轴弹簧立起（damping 11，明显过冲），节点同拍点亮。
//   卡片是出版级内容（版本 / 年份 / 52px 标题 / 说明 / 指标），末两张在掠过时可读。
// - 急刹后 14f 推近 1→1.28 到「Today」：Ferro Agents 卡强调色描边 + 背后泛光 + 轴上光带加亮。
//
// 时间表（30fps，共 160f）：
//   0–12    静置：首卡 v1.0 在 f2 起弹，页眉就位
//   12–104  旅行：0–30% 起步加速 → 巡航 → 末 18% 急刹；途经 v2.0 / v3.0 / Today 三次弹立
//   104     急停帧
//   104–118 推近 1→1.28（snappy），Today 卡点亮
//   118–160 hold（42f）：推近余量 1.28→1.3 极缓，光带呼吸
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const TIMELINE_TRAVEL_DURATION = 160;

const L = LOOKS.ember;
const W = 1920;
const AXIS_Y = 760;
const TICK_GAP = 1400; // 刻度间距（世界坐标）
const TICKS = [
  { label: 'v1.0', year: '2019', when: 'Mar 2019', title: 'First public build', desc: 'A keyboard-first editor for teams.', metric: '1.2k teams' },
  { label: 'v2.0', year: '2021', when: 'Jun 2021', title: 'Multiplayer', desc: 'Live cursors in every shared doc.', metric: '9k teams' },
  { label: 'v3.0', year: '2023', when: 'Sep 2023', title: 'Automations', desc: 'Rules that run your busywork.', metric: '24k teams' },
  { label: 'Today', year: '2026', when: 'Shipping now', title: 'Ferro Agents', desc: 'Agents that triage, draft and ship.', metric: '61k teams' },
].map((t, i) => ({ ...t, x: 960 + TICK_GAP * i }));
const WORLD_W = 960 + TICK_GAP * 3 + 1400;

const TRAVEL_START = 12;
const TRAVEL_END = 104; // 急停帧
const ZOOM_END = 118;

// 速度剖面：0–0.3 smoothstep 起步 → 巡航 → 0.82–1 平方律急刹；数值积分成位置表（确定性、速度连续）
const PROFILE = (() => {
  const n = 600;
  const vel = (u: number) => {
    if (u < 0.3) { const k = u / 0.3; return k * k * (3 - 2 * k); }
    if (u < 0.82) return 1;
    const k = (u - 0.82) / 0.18;
    return (1 - k) * (1 - k);
  };
  const acc = [0];
  for (let i = 1; i <= n; i++) acc.push(acc[i - 1] + vel((i - 0.5) / n));
  return acc.map((a) => a / acc[n]);
})();
const travelAt = (u: number) => {
  const x = Math.min(1, Math.max(0, u)) * (PROFILE.length - 1);
  const i = Math.floor(x);
  return i >= PROFILE.length - 1 ? 1 : PROFILE[i] + (PROFILE[i + 1] - PROFILE[i]) * (x - i);
};
const camXAt = (f: number) => travelAt((f - TRAVEL_START) / (TRAVEL_END - TRAVEL_START)) * TICK_GAP * 3;

// 每张卡的弹立帧：相机中心到达该刻度前 6f（由 camXAt 反查）
const arriveFrame = (i: number) => {
  if (i === 0) return 8;
  for (let f = TRAVEL_START; f <= TRAVEL_END; f++) if (camXAt(f) >= TICK_GAP * i - 60) return f; // 视觉到达（长尾刹车的最后 60px 不算）
  return TRAVEL_END;
};
const POP = TICKS.map((_, i) => arriveFrame(i) - 6);

const CARD_W = 620;
const CARD_H = 300;
const STEM = 52;

const MilestoneCard: React.FC<{ i: number; hot: number }> = ({ i, hot }) => {
  const t = TICKS[i];
  const hero = i === TICKS.length - 1;
  return (
    <div
      style={{
        width: CARD_W, height: CARD_H, boxSizing: 'border-box', borderRadius: 26, padding: '34px 40px', position: 'relative',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: hero ? `linear-gradient(180deg, #2a1810 0%, ${L.surface} 100%)` : `linear-gradient(180deg, #221712 0%, ${L.surface} 100%)`,
        border: `1px solid ${hero ? alpha(L.accent, 0.25 + 0.6 * hot) : L.line}`,
        boxShadow:
          `inset 0 1px 0 ${alpha('#ffd9bf', hero ? 0.16 : 0.08)}, 0 2px 4px ${alpha(L.shadow, 0.6)}, 0 30px 60px -24px ${alpha(L.shadow, 0.95)}` +
          (hero ? `, 0 0 ${(70 * hot).toFixed(1)}px ${alpha(L.accent, 0.28 * hot)}` : ''),
      }}
    >
      {hero && (
        <div style={{ position: 'absolute', inset: 0, opacity: hot, background: `radial-gradient(ellipse 80% 70% at 20% 0%, ${alpha(L.accent, 0.16)} 0%, ${alpha(L.accent, 0)} 70%)` }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
        <div style={{
          padding: '6px 14px', borderRadius: 10, fontFamily: FONT.mono, fontSize: 26, fontWeight: 650,
          background: hero ? L.accent : alpha('#ffffff', 0.06), color: hero ? L.onAccent : L.ink2,
        }}>
          {hero ? 'v4.0' : t.label}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, ...type(28, hero ? 600 : 500), color: hero ? L.ink : L.ink3 }}>
          {hero && <div style={{ width: 10, height: 10, borderRadius: 5, background: L.accent2, boxShadow: `0 0 12px ${alpha(L.accent2, 0.8)}` }} />}
          {t.when}
        </div>
      </div>
      <div style={{ ...type(54, 750), color: L.ink, marginTop: 30, whiteSpace: 'nowrap', position: 'relative' }}>{t.title}</div>
      <div style={{ ...type(32, 400), color: L.ink2, marginTop: 12, lineHeight: 1.3, position: 'relative' }}>{t.desc}</div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', ...type(30, 600), color: hero ? L.accent : L.ink3 }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: hero ? L.accent : L.ink3 }} />
        {t.metric}
      </div>
    </div>
  );
};

const TickStop: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const tick = TICKS[i];
  const hero = i === TICKS.length - 1;
  const pop = POP[i];
  const s = frame < pop ? 0 : springAt(frame, pop, { damping: 11, stiffness: 160, mass: 0.9 }); // 明显过冲
  const lit = ramp(frame, pop, 6, EASE.out);
  const hot = ramp(frame, TRAVEL_END, 14, EASE.out) * (hero ? 1 : 0);
  return (
    <div style={{ position: 'absolute', left: tick.x, top: 0 }}>
      {/* 节点：光晕 + 实心芯 */}
      <div style={{
        position: 'absolute', left: -40, top: AXIS_Y - 40, width: 80, height: 80, borderRadius: 40,
        background: `radial-gradient(circle, ${alpha(L.accent, (hero ? 0.55 : 0.32) * lit)} 0%, ${alpha(L.accent, 0)} 70%)`,
        transform: `scale(${(0.5 + 0.5 * lit + 0.4 * hot).toFixed(3)})`,
      }} />
      <div style={{
        position: 'absolute', left: -11, top: AXIS_Y - 11, width: 22, height: 22, borderRadius: 11, boxSizing: 'border-box',
        border: `3px solid ${lit > 0 ? L.accent : L.ink3}`, background: lit > 0.5 ? (hero ? L.accent2 : L.accent) : L.bg[1],
      }} />
      {/* 刻度标签：版本 + 年份 */}
      <div style={{ position: 'absolute', left: -160, top: AXIS_Y + 40, width: 320, textAlign: 'center' }}>
        <div style={{ ...type(46, 750), color: hero ? L.accent : L.ink }}>{tick.label}</div>
        {!hero && <div style={{ ...type(30, 500), color: L.ink3, marginTop: 6 }}>{tick.year}</div>}
      </div>
      {/* 卡片从刻度线弹立：底边为轴 scaleY（带过冲），连杆同步长出 */}
      {frame >= pop && (
        <>
          <div style={{
            position: 'absolute', left: -1, top: AXIS_Y - 14 - STEM * Math.min(1, s), width: 2, height: STEM * Math.min(1, s),
            background: `linear-gradient(180deg, ${alpha(L.accent, 0.1)}, ${alpha(L.accent, 0.7)})`,
          }} />
          <div style={{
            position: 'absolute', left: -CARD_W / 2, top: AXIS_Y - 14 - STEM - CARD_H,
            transform: `scaleY(${s.toFixed(4)}) scaleX(${(0.88 + 0.12 * s).toFixed(4)})`, transformOrigin: '50% 100%',
            opacity: Math.min(1, s * 2.2),
          }}>
            <MilestoneCard i={i} hot={hot} />
          </div>
        </>
      )}
    </div>
  );
};

// 近景失焦光斑（1.6× 视差，预模糊径向渐变，不用 filter）
const BOKEH = Array.from({ length: 12 }, (_, i) => {
  const h = (n: number) => { const x = Math.sin(n * 91.3 + 7.7) * 43758.5453; return x - Math.floor(x); };
  return { x: h(i) * 7800, y: 160 + h(i + 20) * 820, r: 40 + h(i + 40) * 90, a: 0.05 + h(i + 60) * 0.1 };
});

export const TimelineTravel: React.FC = () => {
  const frame = useCurrentFrame();
  const camX = camXAt(frame);
  const vx = -(camXAt(frame + 0.5) - camXAt(frame - 0.5)); // 世界层屏幕速度（px/f）
  const zoom = 1 + 0.28 * ramp(frame, TRAVEL_END, ZOOM_END - TRAVEL_END, EASE.snappy) + 0.02 * ramp(frame, ZOOM_END, 42, EASE.smooth);
  const hot = ramp(frame, TRAVEL_END, 14, EASE.out);
  const headIn = ramp(frame, 0, 16, EASE.snappy);
  const ORIGIN = '50% 56%';

  return (
    <div style={{ width: W, height: 1080, overflow: 'hidden', position: 'relative', fontFamily: FONT.sans, background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.25 }} fill={{ x: 0.5, y: 1.05 }} horizon={AXIS_Y / 1080} intensity={0.85 + 0.25 * hot} breathe={0.5}>
        {/* 远景：描边大年份，0.35× 视差、按距离淡入淡出；只推近 0.35 倍幅度 */}
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${(1 + (zoom - 1) * 0.35).toFixed(4)})`, transformOrigin: ORIGIN }}>
          {TICKS.map((t, i) => {
            const d = Math.abs(camX - i * TICK_GAP) / TICK_GAP;
            const op = Math.max(0, 1 - d / 0.7);
            if (op <= 0) return null;
            return (
              <div key={i} style={{
                position: 'absolute', left: 960 + (i * TICK_GAP - camX) * 0.35 - 700, width: 1400, top: 120, textAlign: 'center',
                ...type(380, 850), letterSpacing: '-0.04em', color: 'transparent',
                backgroundImage: `linear-gradient(180deg, ${alpha(L.accent2, (i === 3 ? 0.2 : 0.13) * op)} 0%, ${alpha(L.accent, 0.05 * op)} 55%, ${alpha(L.accent, 0)} 85%)`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
              }}>
                {t.year}
              </div>
            );
          })}
        </div>
      </Stage>

      {/* 推近层：以末刻度落点为原点 */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(5)})`, transformOrigin: ORIGIN }}>
        <SpeedBlur vx={vx} amount={0.11} max={8}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: 1080, transform: `translateX(${(-camX).toFixed(2)}px)` }}>
            {/* 主轴：发光细线 */}
            <div style={{
              position: 'absolute', left: 300, top: AXIS_Y - 1.5, width: WORLD_W - 900, height: 3, borderRadius: 2,
              background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 0%, ${alpha(L.accent, 0.75)} 6%, ${alpha(L.accent2, 0.9)} 82%, ${alpha(L.accent, 0)} 100%)`,
              boxShadow: `0 0 18px ${alpha(L.accent, 0.5)}`,
            }} />
            {/* 次刻度：每 140px 一根，速度参照物 */}
            {Array.from({ length: 34 }, (_, k) =>
              k % 10 === 0 ? null : (
                <div key={k} style={{
                  position: 'absolute', left: 960 + k * 140 - 1, top: AXIS_Y - (k % 5 === 0 ? 20 : 12), width: 2,
                  height: k % 5 === 0 ? 40 : 24, borderRadius: 1, background: alpha(L.ink2, k % 5 === 0 ? 0.45 : 0.25),
                }} />
              ),
            )}
            {TICKS.map((_, i) => <TickStop key={i} i={i} frame={frame} />)}
          </div>
        </SpeedBlur>
      </div>

      {/* 近景光斑：1.6× 视差掠过 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {BOKEH.map((b, i) => {
          const x = (((b.x - camX * 1.6) % 7800) + 7800) % 7800 - 400;
          if (x < -300 || x > 2200) return null;
          return (
            <div key={i} style={{
              position: 'absolute', left: x - b.r, top: b.y - b.r, width: b.r * 2, height: b.r * 2, borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(L.accent2, b.a)} 0%, ${alpha(L.accent, b.a * 0.4)} 45%, ${alpha(L.accent, 0)} 70%)`,
            }} />
          );
        })}
      </div>

      {/* 固定页眉 */}
      <div style={{ position: 'absolute', left: 120, top: 96, opacity: headIn * (1 - hot), transform: `translateY(${((1 - headIn) * 14).toFixed(2)}px)` }}>
        <div style={{ ...type(26, 700, { caps: true }), letterSpacing: '0.18em', color: L.accent }}>Ferro · Release history</div>
        <div style={{ ...type(64, 750), color: L.ink, marginTop: 14 }}>Seven years of shipping</div>
      </div>
    </div>
  );
};
