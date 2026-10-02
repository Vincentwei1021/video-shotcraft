// freeze-annotate 定格标注——真实卡片流运动中瞬间定格，马克笔圈注目标卡 + 箭头点题，解冻继续。
//
// 第二轮重设计（「评审暂停」· porcelain 瓷白 + 钴蓝马克笔）：
// - look = porcelain（冷白舞台 · 钴蓝强调）。主角仍是产品真实的项目卡流（2x 截图纹理，Q1）；
//   卡片立在冷白展台上，舞台有顶光与地面接触影，不再是平铺页面截图。
// - 定格要"像按下暂停"：45f 一帧切到斜率 0——快门白闪 3f、整帧套上钴蓝取景框四角（8f 弹入）、
//   左上时间码从「● LIVE 00:00:01:14」走字到「❚❚ PAUSED」并停住；其余卡去饱和 + 退淡，目标卡被拾起。
// - 标注是一套钴蓝马克笔：超椭圆一笔圈（1.08 圈、收笔不闭合、feTurbulence 手绘抖动）10f 画完 →
//   弧线箭头 6f + 箭头 3f → 右上 68px 粗体批注「Ship this first.」从线下升起 + 手绘下划线 →
//   批注署名一行。解冻前 8f 墨迹淡出，但在目标卡右上角留下一枚评论图钉「1」随卡离场——标注被"存下来了"。
// - 解冻：ease-in 起步（smootherstep），一张卡的行程 22f 赶完（平均斜率 >1 补偿停掉的时间），
//   快段按速度方向性模糊，落定时下一张卡停在屏中、带图钉的目标卡留在左侧。
//
// 时间表（30fps，共 158f）：
//   0–45    流动 1×（26px/f，轻微模糊），时间码走字——开场第 1 帧就在动
//   45      定格（瞬切，无缓入）：快门白闪 45–48、取景框 45–53 弹入、时间码变 PAUSED
//   45–55   拾起目标、其余卡去饱和退淡
//   54–64   圈注一笔（10f）；64–70 箭杆、70–73 箭头
//   66–78   批注升起；78–88 下划线；84–96 署名
//   96–108  hold（读）
//   104–112 墨迹淡出、取景框收回；图钉 104 起钉到卡角
//   112–134 解冻：ease-in 起步 → 刹停，一张卡行程（峰值 ≈55px/f，平均斜率 >1）
//   134–158 hold 24f：静止落定，带评论图钉的目标卡停在左侧
import React, { useId } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, FONT, SpeedBlur, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const FREEZEANNOTATE_DUR = 158;

const L = LOOKS.porcelain;
const INK = L.accent; // 钴蓝马克笔

const CARD_W = 600;
const GAP = 52;
const PITCH = CARD_W + GAP;
const RAIL = layout.projects.cards;
const TARGET_K = 5;
const TARGET_FILE = 'card9.png'; // nano-lab: automated research loop
const SHIFT = RAIL.findIndex((c) => c.file === TARGET_FILE) - TARGET_K;
const fileOf = (k: number) => RAIL[(((k + SHIFT) % RAIL.length) + RAIL.length) % RAIL.length].file;
const cardH = (file: string) => (file === 'card1.png' || file === 'card2.png' ? (CARD_W * 576) / 716 : (CARD_W * 624) / 716);
const RAIL_TOP = 336;
const PX = 26; // 每源帧导轨位移（px）

const FREEZE = 45;
const THAW = 112;
const LAND = 134;
const THAW_SRC = PITCH / PX; // 解冻段一张卡的源帧行程（带图钉的目标卡停在左侧，留在尾帧海报里）

// remap：流动斜率 1 → 定格斜率 0（瞬切）→ 解冻 smootherstep（ease-in 起步，峰值斜率 ≈2.1，落定为 0）
const srcAt = (f: number) => {
  if (f <= FREEZE) return Math.max(0, f);
  if (f <= THAW) return FREEZE;
  const t = Math.min(1, (f - THAW) / (LAND - THAW));
  return FREEZE + THAW_SRC * t * t * t * (t * (6 * t - 15) + 10);
};
// 定格时目标卡中心落屏中
const OFFSET = 960 - (TARGET_K * PITCH + CARD_W / 2) + FREEZE * PX;
const railX = (f: number) => OFFSET - srcAt(f) * PX;

// 目标卡显示尺寸 → 圈注几何（定格时卡被拾起 −16px、放大 3%）
const TARGET_H = cardH(TARGET_FILE);
const CX = 960;
const CY = RAIL_TOP + TARGET_H / 2 - 16;
const RX = 1.2 * (CARD_W / 2) * 1.03;
const RY = 1.22 * (TARGET_H / 2) * 1.03;
const SE = 2 / 3; // 超椭圆参数指数 2/n（n=3）

// 一笔马克笔圈：左上起笔，顺时针 1.08 圈，半径随行程内收 4%（收笔不闭合，像手画）
const circlePath = (() => {
  const N = 140;
  const a0 = -2.3;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = a0 + u * Math.PI * 2 * 1.08;
    const k = 1 - 0.04 * u;
    const c = Math.cos(a), sn = Math.sin(a);
    const px = Math.sign(c) * Math.pow(Math.abs(c), SE) * RX * k;
    const py = Math.sign(sn) * Math.pow(Math.abs(sn), SE) * RY * k;
    pts.push(`${(CX + px).toFixed(1)} ${(CY + py).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
})();

// 时间码（30fps）：定格后停住
const timecode = (f: number) => {
  const total = 30 * 72 + Math.floor(srcAt(f)); // 从 00:00:01:12 起
  const ff = total % 30;
  const ss = Math.floor(total / 30) % 60;
  const mm = Math.floor(total / 1800) % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `00:${p(mm)}:${p(ss)}:${p(ff)}`;
};

// 取景框四角
const Bracket: React.FC<{ x: number; y: number; sx: 1 | -1; sy: 1 | -1; s: number }> = ({ x, y, sx, sy, s }) => (
  <div
    style={{
      position: 'absolute',
      left: sx === 1 ? x : x - 64,
      top: sy === 1 ? y : y - 64,
      width: 64,
      height: 64,
      borderLeft: sx === 1 ? `4px solid ${INK}` : undefined,
      borderRight: sx === -1 ? `4px solid ${INK}` : undefined,
      borderTop: sy === 1 ? `4px solid ${INK}` : undefined,
      borderBottom: sy === -1 ? `4px solid ${INK}` : undefined,
      transform: `translate(${(-sx * (1 - s) * 40).toFixed(1)}px, ${(-sy * (1 - s) * 40).toFixed(1)}px)`,
      opacity: Math.min(1, s * 1.5),
    }}
  />
);

export const FreezeAnnotateReal: React.FC = () => {
  const frame = useCurrentFrame();
  const roughId = `rough-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const x0 = railX(frame);
  const v = velocity(railX, frame);
  const frozen = frame >= FREEZE && frame < THAW;
  const blurV = frozen ? 0 : Math.sign(v) * Math.max(0, Math.abs(v) - 8);

  // 定格聚焦：10f 拾起目标、退淡其余；解冻前还原
  const focus = ramp(frame, FREEZE, 10, EASE.snappy) * (1 - ramp(frame, THAW - 8, 12, EASE.swift));
  const flash = frame >= FREEZE ? 1 - ramp(frame, FREEZE, 4, EASE.out) : 0;
  const frameIn = frame >= FREEZE ? springAt(frame, FREEZE, { damping: 16, stiffness: 260 }) : 0;
  const frameOut = ramp(frame, 104, 8, EASE.exit);
  const bracket = frameIn * (1 - frameOut);

  // 圈注时序
  const draw = ramp(frame, 54, 10, EASE.swift);
  const shaft = ramp(frame, 64, 6, EASE.out);
  const head = ramp(frame, 70, 3, EASE.out);
  const under = ramp(frame, 78, 10, EASE.swift);
  const sign = ramp(frame, 84, 12, EASE.out);
  const fade = 1 - ramp(frame, 104, 8, EASE.out);
  const showInk = frame >= 54 && fade > 0.001;

  // 图钉：墨迹淡出时钉到目标卡右上角，随卡离场
  const pin = frame >= 104 ? springAt(frame, 104, { damping: 13, stiffness: 240 }) : 0;

  // 箭头：右上批注 → 圈的右上缘
  const ax0 = 1296, ay0 = 262;
  const ax1 = CX + RX * 0.72, ay1 = CY - RY * 0.78;
  const qx = ax1 + 30, qy = ay0 + 4;
  const arrowD = `M ${ax0} ${ay0} Q ${qx} ${qy} ${ax1} ${ay1}`;
  const ang = Math.atan2(ay1 - qy, ax1 - qx);
  const wing = (s: number) =>
    `M ${ax1.toFixed(1)} ${ay1.toFixed(1)} L ${(ax1 - Math.cos(ang + s * 0.5) * 34).toFixed(1)} ${(ay1 - Math.sin(ang + s * 0.5) * 34).toFixed(1)}`;

  const cards: React.ReactNode[] = [];
  for (let k = 0; k < 14; k++) {
    const left = x0 + k * PITCH;
    if (left > 1980 || left + CARD_W < -60) continue;
    const file = fileOf(k);
    const isT = k === TARGET_K;
    const h = cardH(file);
    const lift = isT ? focus : 0;
    cards.push(
      <div
        key={k}
        style={{
          position: 'absolute',
          left: k * PITCH,
          top: 0,
          width: CARD_W,
          height: h,
          transform: isT ? `translateY(${(-16 * lift).toFixed(2)}px) scale(${(1 + 0.03 * lift).toFixed(4)})` : undefined,
          opacity: isT ? 1 : 1 - 0.5 * focus,
          filter: !isT && focus > 0.01 ? `saturate(${(1 - 0.9 * focus).toFixed(3)})` : undefined,
          zIndex: isT ? 2 : 1,
        }}
      >
        {/* 两层软阴影：接触影 + 环境影（拾起时加深加大） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            boxShadow: `0 2px 4px ${alpha(L.shadow, 0.08)}, 0 ${(24 + 26 * lift).toFixed(0)}px ${(60 + 40 * lift).toFixed(0)}px -18px ${alpha(L.shadow, 0.22 + 0.14 * lift)}`,
          }}
        />
        <Img
          src={staticFile(`textures/live/${file}`)}
          style={{ position: 'relative', width: '100%', height: '100%', display: 'block', borderRadius: 16 }}
        />
        {isT && pin > 0.001 && (
          <div
            style={{
              position: 'absolute',
              right: -22,
              top: -22,
              width: 52,
              height: 52,
              borderRadius: '26px 26px 26px 6px',
              background: INK,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${pin.toFixed(4)})`,
              transformOrigin: '0% 100%',
              boxShadow: `0 8px 20px -6px ${alpha(INK, 0.6)}`,
              ...type(26, 750),
            }}
          >
            1
          </div>
        )}
      </div>,
    );
  }

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.1 }} fill={{ x: 0.5, y: 1.0 }} horizon={0.86} />
      {/* 展台地面：一道很淡的冷灰接地带，让卡片"立在台上" */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: RAIL_TOP + TARGET_H + 26,
          height: 120,
          background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${alpha(L.shadow, 0.08)} 0%, ${alpha(L.shadow, 0)} 70%)`,
        }}
      />

      {/* 导轨 */}
      <SpeedBlur vx={blurV} amount={0.3} max={26}>
        <div style={{ position: 'absolute', left: 0, top: RAIL_TOP, transform: `translateX(${x0.toFixed(2)}px)` }}>{cards}</div>
      </SpeedBlur>

      {/* 左上：时间码（定格即停） */}
      <div style={{ position: 'absolute', left: 96, top: 96, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 18px',
            borderRadius: 12,
            background: frozen ? INK : alpha(L.ink, 0.06),
            color: frozen ? '#fff' : L.ink2,
            ...type(24, 750, { mono: true }),
            letterSpacing: '0.12em',
          }}
        >
          {frozen ? (
            <span style={{ display: 'flex', gap: 5 }}>
              <span style={{ width: 6, height: 20, background: '#fff', borderRadius: 1 }} />
              <span style={{ width: 6, height: 20, background: '#fff', borderRadius: 1 }} />
            </span>
          ) : (
            <span style={{ width: 12, height: 12, borderRadius: 6, background: '#e5484d' }} />
          )}
          {frozen ? 'PAUSED' : 'LIVE'}
        </div>
        <span style={{ ...type(30, 600, { mono: true }), color: frozen ? INK : L.ink2 }}>{timecode(frame)}</span>
      </div>
      <div style={{ position: 'absolute', right: 96, top: 102, display: 'flex', alignItems: 'baseline', gap: 16, opacity: 1 - focus }}>
        <span style={{ ...type(32, 700), color: L.ink }}>Larkspur</span>
        <span style={{ ...type(30, 450), color: L.ink3 }}>Weekly review</span>
      </div>

      {/* 墨迹：圈 + 箭头 + 下划线 */}
      {showInk && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: fade, mixBlendMode: 'multiply' }}>
          <defs>
            <filter id={roughId}>
              <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="11" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
            </filter>
          </defs>
          <g filter={`url(#${roughId})`} fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" opacity={0.92}>
            <path d={circlePath} strokeWidth={11} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} transform={`rotate(-3 ${CX} ${CY})`} />
            {shaft > 0 && <path d={arrowD} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - shaft} />}
            {head > 0 && (
              <>
                <path d={wing(1)} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - head} />
                <path d={wing(-1)} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - head} />
              </>
            )}
            {under > 0 && (
              <path
                d="M 1318 214 C 1430 206 1590 210 1728 202"
                strokeWidth={8}
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - under}
              />
            )}
          </g>
        </svg>
      )}

      {/* 批注：粗体钴蓝，从线下升起；署名一行 */}
      {showInk && frame >= 66 && (
        <div style={{ position: 'absolute', left: 1318, top: 112, opacity: fade, transform: 'rotate(-2deg)', transformOrigin: '0% 100%' }}>
          <div style={{ ...type(68, 820), color: INK, whiteSpace: 'nowrap' }}>
            <TextReveal text="Ship this first." by="word" variant="rise" start={66} each={14} gap={3} />
          </div>
        </div>
      )}
      {showInk && sign > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 1322,
            top: 240,
            opacity: sign * fade,
            transform: `translateY(${mix(10, 0, sign).toFixed(2)}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            ...type(30, 550),
            color: L.ink2,
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 17, background: `linear-gradient(135deg, #8aa4ff, ${INK})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(18, 750) }}>
            M
          </span>
          Marco · design review
        </div>
      )}

      {/* 取景框四角（定格才出现） */}
      {bracket > 0.001 && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <Bracket x={48} y={48} sx={1} sy={1} s={bracket} />
          <Bracket x={1872} y={48} sx={-1} sy={1} s={bracket} />
          <Bracket x={48} y={1032} sx={1} sy={-1} s={bracket} />
          <Bracket x={1872} y={1032} sx={-1} sy={-1} s={bracket} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 64,
              textAlign: 'center',
              opacity: bracket,
              ...type(22, 700, { mono: true }),
              letterSpacing: '0.24em',
              color: alpha(INK, 0.8),
            }}
          >
            FRAME HELD · 0 FPS
          </div>
        </AbsoluteFill>
      )}

      {/* 快门白闪 */}
      {flash > 0.001 && <AbsoluteFill style={{ background: '#ffffff', opacity: 0.7 * flash, pointerEvents: 'none' }} />}
    </AbsoluteFill>
  );
};
