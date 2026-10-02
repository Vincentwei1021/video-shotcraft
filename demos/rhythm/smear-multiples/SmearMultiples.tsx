// 残像分身（smear-multiples）——smear frame 多重残像。
//
// 第二轮重设计（极光暗场 · 功能开关晋级）：
// - look = aurora。两条泳道「Staging → Production」（虚构发布平台 Tidewater），主角是一张功能开关卡
//   「Instant checkout」。卡片从预发泳道一记高速弧线横跨 960px 落进生产泳道——这次位移本身就是信息（晋级上线）。
// - 手法：身后拖 4 个"可数"的完整分身——第 k 个直接取 posAt(f − 2k)（同一条位置/弧线/倾角函数换帧号求值），
//   不拉伸不模糊；分身描边按序从紫过渡到粉、不透明度 0.5/0.32/0.18/0.09 递减，像一串被留在空中的残像。
//   速度门限 v>25px/f 才出现、与前一副本间距 <40px 时淡出（保"可数"）；落位前 3f 分身延迟 ×(1−cv) 收拢合一。
// - 物理：发射前 8f 预备回拉 20px + 下蹲；飞行走上拱 46px 的弧线、按速度前倾 ≤4°；过冲 30px 后 7f 回弹。
// - 落位余波（元素层，不动相机）：生产泳道亮灯、计数 12→13、状态药丸 STAGING 25% → LIVE、灰度条 25%→100% 填满，
//   卡下一次柔光绽放（Q4：只给主角一次），底部说明行升起。
//
// 时间表（30fps，共 100f）：
//   0–20    预备：泳道错峰升起（0/4f）、卡片已在预发槽位；20f 前画面已完整
//   22–30   预备回拉 + 下蹲（anticipation）
//   30–42   高速弧线横移（inOut cubic，峰值 ≈120px/f）+ 4 分身
//   39–42   分身收拢合一；42–49 过冲回弹落座
//   43–70   余波：亮灯、计数、药丸切换、灰度条填满、柔光、说明行（52f 起）
//   70–100  hold：1.5% 极缓推进（ease-out）
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const SMEAR_MULTIPLES_DURATION = 100; // 预备 30f + 横移 12f + 回弹 7f + 余波/hold 51f

const L = LOOKS.aurora;

const CW = 560;
const CH = 300;
const X0 = 200; // 预发槽位卡左缘（泳道中心 480）
const X1 = 1160; // 生产槽位卡左缘（泳道中心 1440）
const Y = 360; // 卡顶边
const OVER = 30;
const PRE = 20;
const ARC = 46;

const PRE_START = 22;
const LAUNCH = 30;
const ARRIVE = 42;
const SETTLE = 49;

const C = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 本体位置：x（预备回拉 → 高速横移到过冲点 → 回弹）、y（下蹲 → 上拱弧线 → 落回）、倾角（按速度）
const xAt = (f: number) => {
  if (f < LAUNCH) return X0 - PRE * ramp(f, PRE_START, LAUNCH - PRE_START, EASE.smooth);
  if (f < ARRIVE) return interpolate(f, [LAUNCH, ARRIVE], [X0 - PRE, X1 + OVER], { ...C, easing: Easing.inOut(Easing.cubic) });
  return interpolate(f, [ARRIVE, SETTLE], [X1 + OVER, X1], { ...C, easing: Easing.out(Easing.cubic) });
};
const yAt = (f: number) => {
  if (f < LAUNCH) return 8 * ramp(f, PRE_START, LAUNCH - PRE_START, EASE.smooth); // 下蹲
  const t = interpolate(f, [LAUNCH, ARRIVE], [0, 1], { ...C, easing: Easing.inOut(Easing.cubic) });
  const crouch = 8 * (1 - ramp(f, LAUNCH, 4, EASE.out));
  return crouch - ARC * Math.sin(Math.PI * t);
};
const tiltAt = (f: number) => {
  const v = xAt(f + 0.5) - xAt(f - 0.5);
  return Math.max(-4, Math.min(4, v / 30));
};

// 分身「褪色度」：分身是不透明的褪色副本（颜色向底色褪），从远到近叠放、后一个遮住前一个，
// 只露出前缘一条——4 张清晰可数，内容不会互相透叠成一团（半透明副本在暗底暗卡上会糊成乱码）
const GHOST_OPS = [0.5, 0.32, 0.18, 0.09];
const GHOST_TINT = ['#a78bfa', '#c084fc', '#e879f9', '#f472b6']; // 紫 → 粉

const hexMix = (a: string, b: string, t: number) => {
  const pa = a.match(/\w\w/g)!.map((x) => parseInt(x, 16));
  const pb = b.match(/\w\w/g)!.map((x) => parseInt(x, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

// 功能开关卡（ghost 时：去阴影、不透明的褪色底 + 染色描边、内容按褪色度降亮）
const FlagCard: React.FC<{ live: number; rollout: number; ghost?: number }> = ({ live, rollout, ghost }) => {
  const g = ghost !== undefined;
  const tint = g ? GHOST_TINT[ghost] : L.accent;
  const fade = g ? GHOST_OPS[ghost] : 1;
  const isLive = live > 0.5;
  return (
    <div style={{
      width: CW, height: CH, borderRadius: 26, boxSizing: 'border-box', padding: '34px 36px', position: 'relative', overflow: 'hidden',
      background: g ? `linear-gradient(160deg, ${hexMix('#0e0a1a', '#3a2766', fade)} 0%, ${hexMix('#0e0a1a', '#2a1d4a', fade)} 100%)` : `linear-gradient(160deg, #241b3b 0%, #1a1430 55%, #150f26 100%)`,
      border: `${g ? 2 : 1.5}px solid ${g ? alpha(tint, 0.3 + fade) : alpha('#e9dcff', 0.16)}`,
      boxShadow: g ? undefined : `inset 0 1px 0 ${alpha('#ffffff', 0.12)}, 0 30px 60px -20px ${alpha(L.shadow, 0.95)}, 0 0 0 1px ${alpha('#000', 0.3)}`,
    }}>
      <div style={{ opacity: g ? 0.12 + fade * 1.1 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width={26} height={26} viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="none" stroke={L.ink2} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" /></svg>
        <div style={{ ...type(24, 500, { mono: true }), color: L.ink2 }}>checkout.instant</div>
        {/* 开关 */}
        <div style={{ marginLeft: 'auto', width: 74, height: 40, borderRadius: 20, background: isLive ? L.accent : alpha(L.ink, 0.16), position: 'relative' }}>
          <div style={{ position: 'absolute', top: 5, left: mix(5, 39, live), width: 30, height: 30, borderRadius: 15, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }} />
        </div>
      </div>
      <div style={{ ...type(60, 800), color: L.ink, marginTop: 30, letterSpacing: '-0.035em' }}>Instant checkout</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 32 }}>
        <div style={{
          padding: '8px 16px', borderRadius: 999, ...type(22, 700, { caps: true }), letterSpacing: '0.14em',
          background: isLive ? alpha(L.accent2, 0.18) : alpha(L.ink, 0.08), color: isLive ? '#ffc4e3' : L.ink2,
          border: `1px solid ${isLive ? alpha(L.accent2, 0.5) : alpha(L.ink, 0.14)}`,
        }}>
          {isLive ? 'Live' : 'Staging'}
        </div>
        <div style={{ flex: 1, height: 10, borderRadius: 5, background: alpha(L.ink, 0.1), overflow: 'hidden' }}>
          <div style={{ width: `${rollout}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${L.accent}, ${L.accent2})` }} />
        </div>
        <div style={{ ...type(30, 700, { mono: true }), color: L.ink, width: 90, textAlign: 'right' }}>{Math.round(rollout)}%</div>
      </div>
      </div>
    </div>
  );
};

// 泳道：标题 + 计数 + 内凹槽位
const Lane: React.FC<{ cx: number; title: string; count: number; lit: number; enter: number; dot: string; rows: [string, string][] }> = ({ cx, title, count, lit, enter, dot, rows }) => (
  <div style={{ position: 'absolute', left: cx - 310, top: Y - 140, width: 620, height: CH + 380, opacity: enter, transform: `translateY(${mix(30, 0, enter)}px)` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 8, height: 60 }}>
      <div style={{
        width: 16, height: 16, borderRadius: 8, background: lit > 0 ? dot : alpha(L.ink, 0.3),
        boxShadow: lit > 0 ? `0 0 ${(18 * lit).toFixed(1)}px ${alpha(dot, 0.9 * lit)}` : undefined,
      }} />
      <div style={{ ...type(48, 700), color: lit > 0 ? L.ink : L.ink2 }}>{title}</div>
      <div style={{ marginLeft: 'auto', marginRight: 8, ...type(34, 600, { mono: true }), color: L.ink3 }}>{count}</div>
    </div>
    {/* 内凹槽位：上下左右各留 30px 包住卡片 */}
    <div style={{
      position: 'absolute', left: 0, top: 110, width: 620, height: CH + 60 + rows.length * 86 + 6, borderRadius: 38,
      background: `linear-gradient(180deg, ${alpha('#ffffff', 0.035)}, ${alpha('#ffffff', 0.01)})`,
      boxShadow: `inset 0 2px 8px ${alpha('#000', 0.5)}, inset 0 0 0 1px ${alpha('#e9dcff', 0.07 + 0.12 * lit)}`,
    }} />
    {/* 泳道里的其他开关：紧凑行（纹理级信息，降亮） */}
    {rows.map(([name, pct], i) => (
      <div key={name} style={{
        position: 'absolute', left: 30, right: 30, top: 140 + CH + 22 + i * 86, height: 70, borderRadius: 18,
        background: alpha('#ffffff', 0.03), border: `1px solid ${alpha('#e9dcff', 0.07)}`,
        display: 'flex', alignItems: 'center', padding: '0 26px', gap: 16,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: alpha(L.ink, 0.3) }} />
        <div style={{ ...type(30, 600), color: L.ink3 }}>{name}</div>
        <div style={{ marginLeft: 'auto', ...type(26, 600, { mono: true }), color: L.ink3 }}>{pct}</div>
      </div>
    ))}
  </div>
);

export const SmearMultiples: React.FC = () => {
  const frame = useCurrentFrame();
  const bx = xAt(frame);
  const by = yAt(frame);
  const speed = Math.abs(xAt(frame) - xAt(frame - 1));
  const speedGate = interpolate(speed, [25, 60], [0, 1], C);
  // 落位合拢：39–42 三帧内分身延迟收缩到 0 + 不透明度归零
  const cv = interpolate(frame, [ARRIVE - 3, ARRIVE], [0, 1], { ...C, easing: Easing.out(Easing.quad) });
  const convergeFade = frame >= ARRIVE - 3 ? 1 - cv : 0;

  // 落位余波
  const landed = ramp(frame, ARRIVE + 1, 12, EASE.out);
  const live = ramp(frame, ARRIVE + 2, 8, EASE.snappy);
  const rollout = mix(25, 100, ramp(frame, ARRIVE + 4, 16, EASE.snappy));
  const bloom = frame >= ARRIVE ? Math.sin(Math.PI * Math.min(1, (frame - ARRIVE) / 34)) : 0;
  const arrived = frame >= ARRIVE + 1;

  const laneL = ramp(frame, 0, 18, EASE.snappy);
  const laneR = ramp(frame, 4, 18, EASE.snappy);
  const cardIn = ramp(frame, 2, 16, EASE.snappy);
  const cam = mix(1, 1.015, ramp(frame, SETTLE, 100 - SETTLE, EASE.out));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans, background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.78, y: 0.95 }} breathe={0.4}>
        <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.4} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '50% 55%' }}>
        {/* 眉题 */}
        <div style={{ position: 'absolute', left: 140, top: 92, display: 'flex', alignItems: 'center', gap: 16, opacity: laneL }}>
          <div style={{ ...type(26, 700, { caps: true }), letterSpacing: '0.24em', color: L.accent }}>Tidewater</div>
          <div style={{ width: 40, height: 1.5, background: alpha(L.ink, 0.3) }} />
          <div style={{ ...type(26, 600, { caps: true }), letterSpacing: '0.24em', color: L.ink3 }}>Release flags</div>
        </div>

        <Lane cx={480} title="Staging" count={arrived ? 7 : 8} lit={0} enter={laneL} dot={L.accent} rows={[['Saved carts', '10%'], ['Gift wrapping', '5%']]} />
        <Lane cx={1440} title="Production" count={arrived ? 13 : 12} lit={landed} enter={laneR} dot={L.accent2} rows={[['Smart search', '100%'], ['One-tap refunds', '100%']]} />

        {/* 方向箭头（泳道之间的发丝线） */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: laneR * 0.6 }}>
          <path d={`M 880 ${Y - 118} L 1040 ${Y - 118} M 1028 ${Y - 128} L 1040 ${Y - 118} L 1028 ${Y - 108}`} stroke={alpha(L.ink, 0.35)} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* 腾空的预发槽位：虚线框 + 去向说明（落位后淡入） */}
        {frame > ARRIVE && (
          <div style={{
            position: 'absolute', left: X0, top: Y, width: CW, height: CH, borderRadius: 26, boxSizing: 'border-box',
            border: `2px dashed ${alpha(L.ink, 0.16)}`, opacity: landed,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, ...type(32, 600), color: L.ink3,
          }}>
            Moved to Production <span style={{ color: L.accent }}>→</span>
          </div>
        )}

        {/* 落位柔光：生产槽位下一次绽放 */}
        {bloom > 0.01 && (
          <div style={{
            position: 'absolute', left: X1 - 200, top: Y - 160, width: CW + 400, height: CH + 320,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent2, 0.32 * bloom)} 0%, ${alpha(L.accent, 0.12 * bloom)} 40%, ${alpha(L.accent, 0)} 70%)`,
            mixBlendMode: 'screen',
          }} />
        )}

        {/* 4 个分身：第 k 个取 frame − 2k 帧时刻的 x / y / 倾角；合拢期延迟 ×(1−cv) */}
        {GHOST_OPS.map((_, i) => {
          const k = i + 1;
          const gf = frame - k * 2 * (1 - cv);
          const gx = xAt(gf);
          const prev = k === 1 ? bx : xAt(frame - (k - 1) * 2 * (1 - cv));
          const sepGate = interpolate(Math.abs(prev - gx), [40, 90], [0, 1], C);
          const op = Math.max(speedGate * sepGate, convergeFade); // 褪色已在卡内体现（不透明副本），这里只做出现/收拢门限
          if (op <= 0.001) return null;
          return (
            <div key={k} style={{ position: 'absolute', left: gx, top: Y + yAt(gf), opacity: op, transform: `rotate(${tiltAt(gf).toFixed(2)}deg)` }}>
              <FlagCard live={0} rollout={25} ghost={i} />
            </div>
          );
        }).reverse()}

        {/* 本体 */}
        <div style={{
          position: 'absolute', left: bx, top: Y + by + mix(24, 0, cardIn), opacity: cardIn,
          transform: `rotate(${tiltAt(frame).toFixed(2)}deg)`,
        }}>
          <FlagCard live={live} rollout={rollout} />
        </div>

        {/* 说明行 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 952, textAlign: 'center', ...type(40, 500), color: L.ink2 }}>
          <TextReveal text="Promoted to production in 0.4 s — zero downtime." by="word" variant="blur" start={ARRIVE + 10} each={16} gap={2.5} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
