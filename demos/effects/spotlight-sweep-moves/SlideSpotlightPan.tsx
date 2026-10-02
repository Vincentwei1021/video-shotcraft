// slide-spotlight-pan（B 贴边泛光横摇）—— 光线贴着 UI 面板边缘泛光（先沿左缘竖直爬升、转过左上角后
// 沿顶边横走），聚光头匀速右移、照到处显影；面板同时匀速左滑 = 相机右摇。
//
// 第二轮重设计（夜航 · 产品路线图）：
// - look = midnight（深蓝夜 · 电光蓝 / 青）。面板换成暗色路线图「Lodestar · Roadmap 2027」：120px 标题、
//   四季度网格、三条甘特进度条（已发布 / 进行中 / 计划中）、TODAY 竖线，Q4 是一张发光的发布卡
//   「Lodestar 3 · Nov 12」——横摇的终点就是它。暗色 UI 在黑场里：光照到的地方才"读得出来"。
// - 光的身份改成冰蓝白：四层辉光（宽糊电光蓝 + 中层天蓝 + 青偏移 + 白芯）贴着面板顶边走；
//   光头下方一团青蓝光从顶边渗进界面（光在"抚摸"边缘），顶边发丝线本身被光点亮；
//   转过左上角那 4f 光线做一次 RGB 色散（原片的彩虹转角，第一轮没做）。
// - 命门：光头与面板位移全程同一条 linear 时间轴；只在最后 16f 做"同速刹停"（速度从匀速值线性降到 0，
//   速度连续、无突变），光头停在发布卡上方，进 hold。
//
// 时间表（30fps，共 156f）：
//   0       第 1 帧：左缘竖直光线已在爬升，左侧标题一角被照出
//   0–14    光头沿左缘爬到左上角；12–16f 转角色散
//   14–118  光头沿顶边 linear 右移、面板 linear 左滑（主动作）
//   118–134 同速刹停（16f），光头落在 Q4 发布卡上方
//   126–156 hold：发布卡描边亮起、星标呼吸，尾帧是"光停在终点"的海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';
import { LOOKS, alpha, type } from '../../_fixtures/Look';

export const SLIDE_SPOTLIGHT_PAN_DURATION = 156; // 118f 匀速 + 16f 同速刹停 + 22f hold

const L = LOOKS.midnight;
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const VOID = '#04060c';

const PW = 3500;
const PH = 1300;
const TOP = 168; // 面板顶边的屏幕 y
const CR = 56;

// 统一时间轴：τ 在 0–T1 与帧同速；T1 之后 B 帧内速度线性降到 0（同速刹停），τ 终值 = T1 + B/2
const T1 = 118;
const B = 16;
const tau = (f: number) => {
  if (f <= T1) return Math.max(0, f);
  const d = Math.min(B, f - T1);
  return T1 + d - (d * d) / (2 * B);
};
const TAU_END = T1 + B / 2;
const HEAD0 = -300; // 负值 = 还在左缘竖直段（从角往下的距离）
const HEAD1 = 2870;
const SLIDE0 = 420;
const SLIDE1 = -1560;
const headAt = (f: number) => HEAD0 + ((HEAD1 - HEAD0) * tau(f)) / TAU_END;
const slideAt = (f: number) => SLIDE0 + ((SLIDE1 - SLIDE0) * tau(f)) / TAU_END;

// 季度网格
const X0 = 120;
const COLW = 780;
const qx = (q: number) => X0 + q * COLW;

const ROWS = [
  { name: 'Offline sync', team: 'Core · 4 engineers', from: qx(0) + 40, to: qx(1) + 420, state: 'shipped' as const, prog: 1 },
  { name: 'Team spaces', team: 'Collab · 6 engineers', from: qx(1) + 120, to: qx(2) + 360, state: 'active' as const, prog: 0.62 },
  { name: 'Public API v2', team: 'Platform · 3 engineers', from: qx(2) + 80, to: qx(3) + 40, state: 'planned' as const, prog: 0 },
];
const TODAY_X = qx(1) + 470;
const LAUNCH = { x: qx(3) + 90, y: 392, w: 640, h: 452 };

const Chip: React.FC<{ state: 'shipped' | 'active' | 'planned' }> = ({ state }) => {
  const m = {
    shipped: { t: 'Shipped', c: L.accent2, bg: alpha(L.accent2, 0.14) },
    active: { t: 'In progress', c: L.accent, bg: alpha(L.accent, 0.16) },
    planned: { t: 'Planned', c: L.ink2, bg: 'rgba(255,255,255,0.06)' },
  }[state];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 999, background: m.bg, color: m.c, ...type(26, 650), whiteSpace: 'nowrap' }}>
      <div style={{ width: 10, height: 10, borderRadius: 5, background: m.c }} />
      {m.t}
    </div>
  );
};

// 超宽暗色路线图面板
const Roadmap: React.FC<{ f: number }> = ({ f }) => {
  const star = 0.5 + 0.5 * Math.sin(f / 9);
  return (
    <div style={{ width: PW, height: PH, position: 'relative', overflow: 'hidden', borderRadius: `${CR}px ${CR}px 0 0`, fontFamily: FONT.sans, color: L.ink,
      background: `linear-gradient(180deg, #131c33 0%, #0e1527 40%, #0b1120 100%)`, boxShadow: `inset 0 0 0 1.5px ${alpha('#a0beff', 0.1)}, inset 0 1.5px 0 ${alpha('#cfe0ff', 0.14)}` }}>
      {/* 顶栏 + 标题 */}
      <div style={{ position: 'absolute', left: X0, top: 54, display: 'flex', alignItems: 'center', gap: 18 }}>
        <svg width={46} height={46} viewBox="0 0 46 46">
          <path d="M23 3 L27 19 L43 23 L27 27 L23 43 L19 27 L3 23 L19 19 Z" fill={L.accent} />
          <circle cx={23} cy={23} r={4} fill="#fff" />
        </svg>
        <div style={{ ...type(36, 700), letterSpacing: '-0.02em' }}>Lodestar</div>
        <div style={{ marginLeft: 24, display: 'flex', gap: 34, ...type(30, 550), color: L.ink3 }}>
          <span style={{ color: L.ink }}>Roadmap</span><span>Releases</span><span>Insights</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: X0 - 6, top: 128, ...type(120, 780), letterSpacing: '-0.05em' }}>Roadmap 2027</div>
      <div style={{ position: 'absolute', left: X0 + 900, top: 178, ...type(36, 450), color: L.ink2, width: 760 }}>
        Three bets, one launch — all before the holidays.
      </div>

      {/* 季度表头 + 网格 */}
      {[0, 1, 2, 3].map((q) => (
        <React.Fragment key={q}>
          <div style={{ position: 'absolute', left: qx(q), top: 312, width: COLW, height: 1.5, background: L.line }} />
          <div style={{ position: 'absolute', left: qx(q), top: 312, width: 1.5, height: PH, background: alpha('#a0beff', 0.07) }} />
          <div style={{ position: 'absolute', left: qx(q) + 28, top: 334, fontFamily: FONT.mono, fontSize: 30, fontWeight: 600, color: q === 3 ? L.accent : L.ink2, letterSpacing: '0.04em' }}>
            Q{q + 1}<span style={{ color: L.ink3, fontWeight: 500 }}>{'  '}{['JAN–MAR', 'APR–JUN', 'JUL–SEP', 'OCT–DEC'][q]}</span>
          </div>
        </React.Fragment>
      ))}

      {/* TODAY 竖线 */}
      <div style={{ position: 'absolute', left: TODAY_X, top: 312, width: 3, height: PH, background: `linear-gradient(180deg, ${L.accent2}, ${alpha(L.accent2, 0.15)})` }} />
      <div style={{ position: 'absolute', left: TODAY_X + 14, top: 388, fontFamily: FONT.mono, fontSize: 24, fontWeight: 700, color: L.accent2, letterSpacing: '0.1em' }}>TODAY · MAY 14</div>

      {/* 甘特进度条 */}
      {ROWS.map((r, i) => {
        const y = 440 + i * 138;
        const w = r.to - r.from;
        const planned = r.state === 'planned';
        const col = r.state === 'shipped' ? L.accent2 : L.accent;
        return (
          <div key={i} style={{ position: 'absolute', left: r.from, top: y, width: w, height: 112, borderRadius: 24, overflow: 'hidden',
            background: planned ? 'rgba(255,255,255,0.025)' : alpha(col, 0.1),
            boxShadow: planned ? `inset 0 0 0 2px ${alpha('#a0beff', 0.22)}` : `inset 0 0 0 1.5px ${alpha(col, 0.45)}, inset 0 1px 0 ${alpha('#ffffff', 0.12)}`,
            backgroundImage: planned ? `repeating-linear-gradient(135deg, rgba(160,190,255,0.06) 0 14px, rgba(0,0,0,0) 14px 28px)` : undefined }}>
            {!planned && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.prog * 100}%`, background: `linear-gradient(90deg, ${alpha(col, 0.32)}, ${alpha(col, 0.5)})` }} />}
            <div style={{ position: 'absolute', left: 30, top: 0, bottom: 0, right: 26, display: 'flex', alignItems: 'center', gap: 22 }}>
              <div>
                <div style={{ ...type(42, 680), letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>{r.name}</div>
                <div style={{ ...type(26, 500), color: L.ink2, marginTop: 4, whiteSpace: 'nowrap' }}>{r.team}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}><Chip state={r.state} /></div>
            </div>
          </div>
        );
      })}
      {/* API v2 → 发布卡的虚线依赖 */}
      <svg width={PW} height={PH} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={`M ${ROWS[2].to} ${440 + 2 * 138 + 56} C ${ROWS[2].to + 40} ${716 + 56}, ${LAUNCH.x - 50} ${LAUNCH.y + 220}, ${LAUNCH.x} ${LAUNCH.y + 220}`}
          stroke={alpha('#a0beff', 0.35)} strokeWidth={3} strokeDasharray="4 10" strokeLinecap="round" fill="none" />
      </svg>

      {/* Q4 发布卡（横摇终点） */}
      <div style={{ position: 'absolute', left: LAUNCH.x, top: LAUNCH.y, width: LAUNCH.w, height: LAUNCH.h, borderRadius: 36,
        background: `linear-gradient(160deg, ${alpha(L.accent, 0.26)} 0%, #101a33 55%, #0d1529 100%)`,
        boxShadow: `inset 0 0 0 2px ${alpha(L.accent, 0.55)}, inset 0 1px 0 rgba(255,255,255,0.18), 0 40px 90px -30px ${alpha(L.accent, 0.55)}`, padding: '40px 44px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width={34} height={34} viewBox="0 0 46 46" style={{ filter: `drop-shadow(0 0 ${6 + 8 * star}px ${alpha(L.accent, 0.9)})` }}>
            <path d="M23 3 L27 19 L43 23 L27 27 L23 43 L19 27 L3 23 L19 19 Z" fill="#fff" />
          </svg>
          <div style={{ fontFamily: FONT.mono, fontSize: 26, fontWeight: 700, letterSpacing: '0.14em', color: L.accent }}>MILESTONE · LAUNCH</div>
        </div>
        <div style={{ ...type(104, 800), letterSpacing: '-0.05em', marginTop: 34 }}>Lodestar 3</div>
        <div style={{ ...type(40, 500), color: L.ink2, marginTop: 14 }}>Ships Nov 12 · 3 bets land</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 40 }}>
          {[L.accent2, L.accent, 'rgba(160,190,255,0.35)'].map((c, i) => (
            <div key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: c }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {['Sync ✓', 'Spaces 62%', 'API v2'].map((t, i) => (
            <div key={i} style={{ flex: 1, ...type(26, 550), color: i === 2 ? L.ink3 : L.ink2 }}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const grad = (dir: string, c: string) => `linear-gradient(${dir}, rgba(0,0,0,0) 0%, ${c} 42%, ${c} 58%, rgba(0,0,0,0) 100%)`;

// 四层辉光光线（屏幕坐标）。horizontal：中心 (x, y)；vertical：中心 (x, y)
const Streak: React.FC<{ x: number; y: number; vertical?: boolean; scale?: number; opacity: number; tint?: [string, string, string] }> = ({
  x, y, vertical = false, scale = 1, opacity, tint = ['rgba(61,99,255,0.62)', 'rgba(110,170,255,0.9)', 'rgba(62,230,208,0.7)'],
}) => {
  if (opacity < 0.005) return null;
  const lay = (len: number, th: number, c: string, blur: number, dy = 0): React.CSSProperties => vertical
    ? { position: 'absolute', left: x - th / 2 + dy, top: y - (len * scale) / 2, width: th, height: len * scale, background: grad('180deg', c), filter: `blur(${blur}px)` }
    : { position: 'absolute', left: x - (len * scale) / 2, top: y - th / 2 + dy, width: len * scale, height: th, background: grad('90deg', c), filter: `blur(${blur}px)` };
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, mixBlendMode: 'screen', pointerEvents: 'none' }}>
      <div style={lay(1300, 116, tint[0], 30)} />
      <div style={lay(960, 34, tint[1], 10)} />
      <div style={lay(680, 14, tint[2], 5, 4)} />
      <div style={lay(620, 6, '#eef8ff', 1.5)} />
    </div>
  );
};

export const SlideSpotlightPan: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = slideAt(frame);
  const head = headAt(frame);
  const onTop = Math.max(0, head); // 顶边段（面板本地 x）
  const climb = Math.min(1, Math.max(0, (head - HEAD0) / -HEAD0)); // 左缘竖直段 0→1
  const vertY = TOP + 560 * (1 - climb); // 左缘光头：从下往上爬到角

  const headX = slide + onTop; // 屏幕 x
  const vGlow = head < 0 ? 1 : Math.max(0, 1 - head / 700);
  const hGlow = Math.min(1, Math.max(0, (head + 140) / 260));
  // 转角色散：光头过角的 ±2f（τ≈14.7）
  const tCorner = (-HEAD0 / (HEAD1 - HEAD0)) * TAU_END;
  const disp = Math.max(0, 1 - Math.abs(tau(frame) - tCorner) / 2.4);
  // 落定后：发布卡描边亮起
  const settle = interpolate(frame, [124, 146], [0, 1], CLAMP);

  // 光池（面板本地坐标）：跟光头；竖直段时跟左缘光头
  const poolX = head < 0 ? 40 : onTop + 80;
  const poolY = head < 0 ? vertY - TOP + 120 : 380;
  const pool = `radial-gradient(ellipse 1250px 940px at ${poolX}px ${poolY}px, rgba(3,5,12,0) 20%, rgba(3,5,12,0.08) 30%, rgba(3,5,12,0.36) 44%, rgba(3,5,12,0.7) 58%, rgba(3,5,12,0.9) 74%, rgba(3,5,12,0.97) 100%)`;

  return (
    <AbsoluteFill style={{ background: VOID, overflow: 'hidden' }}>
      {/* 面板层 */}
      <div style={{ position: 'absolute', left: 0, top: TOP, transform: `translateX(${slide.toFixed(2)}px)` }}>
        <Roadmap f={frame} />
        {/* 光池外压暗 */}
        <div style={{ position: 'absolute', left: -80, top: -40, width: PW + 160, height: PH + 80, background: pool }} />
        {/* 贴面泛光：光头下方青蓝光从顶边渗进界面 */}
        <div style={{
          position: 'absolute', left: onTop - 700, top: -20, width: 1400, height: 520, mixBlendMode: 'screen', opacity: hGlow,
          background: `radial-gradient(ellipse 700px 260px at 50% 0%, ${alpha('#5b8cff', 0.42)} 0%, ${alpha('#3ee6d0', 0.1)} 50%, rgba(0,0,0,0) 80%)`,
        }} />
        <div style={{
          position: 'absolute', left: -20, top: vertY - TOP - 360, width: 420, height: 720, mixBlendMode: 'screen', opacity: vGlow,
          background: `radial-gradient(ellipse 200px 360px at 0% 50%, ${alpha('#5b8cff', 0.42)} 0%, ${alpha('#3ee6d0', 0.08)} 55%, rgba(0,0,0,0) 80%)`,
        }} />
        {/* 顶边发丝线被光点亮（以光头为中心的一段亮线，圆角处跟着拐） */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: PW, height: 2, mixBlendMode: 'screen', opacity: hGlow,
          background: `radial-gradient(ellipse 560px 2px at ${onTop}px 50%, rgba(220,240,255,0.95), rgba(120,170,255,0.25) 60%, rgba(0,0,0,0) 100%)` }} />
        {/* 发布卡落定：描边亮起 */}
        <div style={{ position: 'absolute', left: LAUNCH.x - 3, top: LAUNCH.y - 3, width: LAUNCH.w + 6, height: LAUNCH.h + 6, borderRadius: 39, opacity: settle,
          boxShadow: `0 0 0 2.5px ${alpha('#b9d2ff', 0.9)}, 0 0 34px 6px ${alpha(L.accent, 0.5)}, 0 0 120px 20px ${alpha(L.accent, 0.22)}` }} />
      </div>

      {/* 顶边横向光线（屏幕层） */}
      <Streak x={headX} y={TOP} opacity={hGlow} />
      {/* 左缘竖直光线（起始段） */}
      <Streak x={slide} y={vertY} vertical scale={0.68} opacity={vGlow} />
      {/* 转角 RGB 色散：红 / 蓝两份错位副本，只活 ~4f */}
      {disp > 0.01 && (
        <>
          <Streak x={slide + 14} y={TOP - 10} opacity={disp * 0.9} scale={0.5} tint={['rgba(255,60,90,0.55)', 'rgba(255,90,120,0.8)', 'rgba(255,170,60,0.6)']} />
          <Streak x={slide - 12} y={TOP + 10} opacity={disp * 0.9} scale={0.5} tint={['rgba(60,90,255,0.55)', 'rgba(90,140,255,0.85)', 'rgba(150,80,255,0.6)']} />
        </>
      )}
      {/* 光头眩光 */}
      <div style={{
        position: 'absolute', left: (head < 0 ? slide : headX) - 200, top: (head < 0 ? vertY : TOP) - 90, width: 400, height: 180, mixBlendMode: 'screen',
        background: 'radial-gradient(ellipse, rgba(225,240,255,0.92), rgba(91,140,255,0.3) 45%, rgba(0,0,0,0) 72%)', filter: 'blur(10px)',
      }} />
      <Vignette strength={0.5} inner={0.45} color="#010208" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
