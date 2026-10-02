// 对开门裂幕（barn-door-split-reveal）——旧页从正中裂成两扇门向外加速让位，新页从门缝里迎上来。
//
// 第二轮重设计（余烬 · 版本更替发布）：
// - look = ember（暖黑 · 橙）。语义是"新旧交替"：旧页 = 虚构构建平台 Kiln 的现行版「Kiln 3」，
//   冷灰、无强调色、像一块熄了火的金属板；新页 = 「Kiln 4」发布海报，暖黑舞台 + 余烬橙。
//   两页同一版式、同一槽位（眉题 / 220px 字标 / 副题 / 三枚数据），所以门一开，"3"的位置上站着"4"——取代关系一眼可读。
// - 门是有厚度的实体板：内缘 10px 切面在门缝光里被照亮（橙色轮廓光），门面靠近裂缝处被光染暖；
//   门缝里透出的是新页的光——先是一条发丝亮线自中点向上下描出（预告裂点），再撑开一道光缝，
//   门滑走时新页带着一次过曝光束（屏幕混合，随门远去衰减）显影。
// - 运动：裂缝预张 ease-in（预备）接门 ease-in 加速 1000px（"让位"不是"被推走"），按速度挂横向运动模糊；
//   新页 1.08→1 迎上来（snappy，晚门 2f 起跳）；落定后副题逐词升起、三枚数据从旧值滚到新值
//   （64s → 11.8s：数字本身讲出"新版更快"）。
//
// 时间表（30fps，共 150f）：
//   0–24    旧页建立：冷灰海报，相机极缓推近 1→1.015；第 0 帧即完整画面
//   20–30   预告：中缝发丝亮线自中点向上下描出（snappy 10f），两侧门面被光染暖
//   30–40   预备：缝隙 ease-in 撑开 0→16px，光缝变亮
//   40–64   主动作：两扇门各 translateX ∓1000（ease-in 24f）+ 横向运动模糊
//   42–78   新页 1.08→1 迎上（snappy 36f）；过曝光束 40–74 衰减
//   64–110  跟随：副题逐词升起（64）、三枚数据错峰滚到新值（72–104）
//   110–150 hold：余烬缓缓上浮、字标光呼吸、相机极缓推近 1.8%，尾帧是完整的发布海报
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, mix, ramp, velocity } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, glow, stagger, type } from '../../_fixtures/Look';

export const BARN_DOOR_SPLIT_DURATION = 150;

const L = LOOKS.ember;
// 旧页：冷灰金属板（刻意不用强调色）
const OLD = { bg0: '#1d1f23', bg1: '#141518', ink: '#9a9ea7', ink2: '#6f737b', ink3: '#4a4d54', line: 'rgba(255,255,255,0.07)' };

const CRACK = 20; // 发丝亮线起
const GAP = 30; // 缝隙预张起
const SLIDE = 40; // 门开始加速
const SLIDE_D = 24;
const SLIDE_EASE = bezier(0.42, 0, 0.8, 0.25); // ease-in（≈cubic-in 偏猛）：起步可见、越走越快，不是最后一帧才消失

const gapAt = (f: number) => 16 * ramp(f, GAP, 10, EASE.exit);
const slideAt = (f: number) => 1000 * ramp(f, SLIDE, SLIDE_D, SLIDE_EASE);
const doorAt = (f: number) => gapAt(f) / 2 + slideAt(f); // 单扇外移量

// 三枚数据：旧值 → 新值
const STATS = [
  { from: 64, to: 11.8, dec: 1, unit: 's', label: 'Median build' },
  { from: 12, to: 0, dec: 0, unit: '', label: 'Config files' },
  { from: 6, to: 32, dec: 0, unit: '', label: 'Edge regions' },
];

// 两页共用的版式骨架：眉题 / 字标 / 副题 / 数据行（同槽位 = 取代关系）
const Layout: React.FC<{
  kicker: React.ReactNode; mark: React.ReactNode; sub: React.ReactNode; stats: React.ReactNode;
}> = ({ kicker, mark, sub, stats }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT.sans }}>
    <div style={{ marginTop: 214, height: 40 }}>{kicker}</div>
    <div style={{ marginTop: 26, height: 230, display: 'flex', alignItems: 'center' }}>{mark}</div>
    <div style={{ marginTop: 34, height: 60 }}>{sub}</div>
    <div style={{ marginTop: 92 }}>{stats}</div>
  </div>
);

const StatRow: React.FC<{ cells: { value: string; label: string; color: string; labelColor: string; line: string; o?: number; y?: number }[] }> = ({ cells }) => (
  <div style={{ display: 'flex', gap: 56 }}>
    {cells.map((c, k) => (
      <div key={k} style={{ width: 300, borderTop: `1px solid ${c.line}`, paddingTop: 26, opacity: c.o ?? 1, transform: `translateY(${(c.y ?? 0).toFixed(2)}px)` }}>
        <div style={{ ...type(72, 700), color: c.color, letterSpacing: '-0.04em' }}>{c.value}</div>
        <div style={{ ...type(30, 500), color: c.labelColor, marginTop: 10 }}>{c.label}</div>
      </div>
    ))}
  </div>
);

// 旧页：Kiln 3（冷灰海报）
const OldPage: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 30%, #25272c 0%, ${OLD.bg0} 45%, ${OLD.bg1} 100%)` }}>
    {/* 板面的细横纹：拉丝金属的质地（极淡） */}
    <div style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 4px)' }} />
    <Layout
      kicker={<span style={{ ...type(30, 650, { caps: true }), letterSpacing: '0.22em', color: OLD.ink3 }}>Current release</span>}
      mark={<span style={{ ...type(220, 760), color: OLD.ink, letterSpacing: '-0.055em' }}>Kiln 3</span>}
      sub={<span style={{ ...type(48, 450), color: OLD.ink2 }}>Reliable builds for growing teams.</span>}
      stats={<StatRow cells={STATS.map((s) => ({
        value: `${s.from.toFixed(s.dec)}${s.unit}`, label: s.label, color: OLD.ink, labelColor: OLD.ink3, line: OLD.line,
      }))} />}
    />
  </div>
);

// 新页：Kiln 4（余烬舞台上的发布海报）
const NewPage: React.FC<{ frame: number }> = ({ frame }) => {
  const statP = (k: number) => ramp(frame, 72 + stagger(k, 3, 12, EASE.out), 26, EASE.snappy);
  const breath = 0.85 + 0.15 * Math.sin(frame / 16);
  return (
    <>
      <Layout
        kicker={
          <span style={{ ...type(30, 700, { caps: true }), letterSpacing: '0.22em', color: L.accent }}>Introducing</span>
        }
        mark={
          <span style={{ ...type(220, 800), letterSpacing: '-0.055em', color: L.ink, position: 'relative' }}>
            Kiln{' '}
            <span style={{
              backgroundImage: `linear-gradient(180deg, ${L.accent2} 0%, ${L.accent} 70%, #e0471a 100%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              filter: `drop-shadow(0 0 ${(30 * breath).toFixed(1)}px ${alpha(L.accent, 0.55)})`,
            }}>4</span>
          </span>
        }
        sub={
          <span style={{ ...type(48, 450), color: L.ink2 }}>
            <TextReveal text="Builds in seconds, not minutes." start={64} by="word" variant="rise" each={18} gap={3} />
          </span>
        }
        stats={<StatRow cells={STATS.map((s, k) => {
          const p = statP(k);
          const v = mix(s.from, s.to, p);
          return {
            value: `${v.toFixed(s.dec)}${s.unit}`, label: s.label,
            color: L.ink,
            labelColor: L.ink2, line: alpha(L.accent, 0.35),
            o: ramp(frame, 66 + k * 4, 12, EASE.out), y: mix(18, 0, ramp(frame, 66 + k * 4, 18, EASE.snappy)),
          };
        })} />}
      />
    </>
  );
};

// 门：960 宽视口里装一整页旧页（右门内层左移 960 对位拼合）+ 内缘切面 + 裂缝光染
// （门不投影到新页上：光从门后来，影子落向镜头一侧，投在门缝里只会把光压灰）
const Door: React.FC<{ side: 'left' | 'right'; offset: number; light: number; edge: number }> = ({ side, offset, light, edge }) => {
  const inner = side === 'left' ? 'right' : 'left';
  const toward = side === 'left' ? 'to left' : 'to right';
  return (
    <div style={{
      position: 'absolute', top: 0, left: side === 'left' ? 0 : 960, width: 960, height: 1080, overflow: 'hidden',
      transform: `translateX(${side === 'left' ? -offset : offset}px)`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: side === 'left' ? 0 : -960, width: 1920, height: 1080 }}>
        <OldPage />
      </div>
      {/* 门面被裂缝光染暖：靠缝最亮，向外 520px 衰减 */}
      {light > 0.01 && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, [inner]: 0, width: 620, mixBlendMode: 'screen', opacity: light,
          background: `linear-gradient(${toward}, ${alpha(L.light, 0.5)} 0%, ${alpha(L.light, 0.14)} 30%, ${alpha(L.light, 0)} 100%)`,
        }} />
      )}
      {/* 板材切面：10px 厚度带，被门缝光照亮（亮 → 暖 → 暗） */}
      {edge > 0.01 && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, [inner]: 0, width: 10, opacity: edge,
          background: `linear-gradient(${toward}, #ffe2c2 0%, ${L.accent} 35%, #5a2410 100%)`,
        }} />
      )}
    </div>
  );
};

export const BarnDoorSplit: React.FC = () => {
  const frame = useCurrentFrame();
  const door = doorAt(frame);
  const vx = velocity(doorAt, frame);

  // 预告亮线：自中点向上下描出；缝隙一撑开就并入光缝
  const crack = ramp(frame, CRACK, 10, EASE.snappy);
  const seamLight = ramp(frame, CRACK, 12, EASE.out); // 门面光染 / 切面亮度
  const edge = frame >= GAP ? 1 : 0;
  // 过曝光束：随门远去衰减
  const flash = ramp(frame, GAP, 12, EASE.exit) * (1 - ramp(frame, SLIDE + 6, 30, EASE.out));
  const bP = ramp(frame, SLIDE + 2, 36, EASE.snappy);
  const bScale = mix(1.08, 1, bP) * mix(1, 1.018, ramp(frame, 78, 72, EASE.smooth)); // 落定后再极缓推近，hold 段不死
  const push = mix(1, 1.015, ramp(frame, 0, SLIDE, EASE.smooth));
  const doorsGone = frame > SLIDE + SLIDE_D;
  const showNew = frame >= GAP;
  // 门面光染：门滑开后随之减弱（门离光源越远越暗）
  const doorLight = seamLight * (1 - ramp(frame, SLIDE, 14, EASE.out) * 0.6);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: L.bg[2] }}>
      {/* 新页：只画一个 Stage 做舞台底；门缝一开才挂载 */}
      {showNew && (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${bScale.toFixed(5)})`, transformOrigin: '50% 46%' }}>
          <Stage look={L} keyLight={{ x: 0.5, y: 0.12 }} fill={{ x: 0.5, y: 1.08 }} breathe={0.6}>
            <Dust look={L} count={28} seed={4} drift={0.35} opacity={0.55} color={L.accent2} />
          </Stage>
          {/* 字标后的暖光晕 */}
          <div style={{
            position: 'absolute', left: 960 - 700, top: 366 - 260, width: 1400, height: 520,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.16)} 0%, ${alpha(L.accent, 0)} 70%)`,
          }} />
          <NewPage frame={frame} />
          {/* 过曝光束：门缝里涌进来的光 */}
          {flash > 0.01 && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 960 - (door + 160), width: 2 * (door + 160), mixBlendMode: 'screen', opacity: flash,
              background: `linear-gradient(90deg, ${alpha(L.light, 0)} 0%, ${alpha(L.light, 0.55)} 40%, ${alpha('#ffe6cc', 0.85)} 50%, ${alpha(L.light, 0.55)} 60%, ${alpha(L.light, 0)} 100%)`,
            }} />
          )}
        </div>
      )}

      {!doorsGone && (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 50%' }}>
          <SpeedBlur vx={-vx} amount={0.09} max={22}>
            <Door side="left" offset={door} light={doorLight} edge={edge} />
          </SpeedBlur>
          <SpeedBlur vx={vx} amount={0.09} max={22}>
            <Door side="right" offset={door} light={doorLight} edge={edge} />
          </SpeedBlur>
          {/* 裂点预告：发丝亮线 + 泛光，自中点向上下描出 */}
          {crack > 0 && frame < SLIDE + 4 && (
            <div style={{
              position: 'absolute', left: 960 - 1, top: 0, width: 2, height: 1080, transform: `scaleY(${crack.toFixed(4)})`,
              background: 'linear-gradient(180deg, rgba(255,226,194,0) 0%, #ffe2c2 22%, #fff6ec 50%, #ffe2c2 78%, rgba(255,226,194,0) 100%)',
              boxShadow: glow(L.accent, 0.9), opacity: 1 - ramp(frame, SLIDE, 4, EASE.out),
            }} />
          )}
        </div>
      )}
    </div>
  );
};
