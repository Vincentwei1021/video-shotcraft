// invisible-cut：前景遮挡隐形切——离镜头极近的失焦前景物贴脸横扫，糊满全屏的那一两帧里
// 背景从 A 无痕硬切成 B，前景扫出画时观众以为还是同一镜。（invisible-cut + foreground-occlusion-swipe）
//
// 第二轮重设计（暖沙生活方式 · "点下预订，一晃就订好了"）：
// - look = sand（米色 · 赤陶 · 靛蓝点缀），衬线标题 + 无衬线 UI 的旅行 App「Halden」。
//   A：沙漠营地详情页——左侧 860px 程序绘制的沙丘日落"照片"，右侧衬线大标题、日期/人数、价格与赤陶「Reserve」大按钮；
//   B：预订成功——左侧 150px 衬线「You're going.」，右侧一张票根卡（顶部还是那张沙丘照片 = 视觉连续，打孔线、
//   大号确认码、赤陶对勾印章）。因果是一条线：按下 Reserve → 一晃 → 已订好。版式左右互换，换景幅度大但不突兀。
// - 遮挡物 = 贴着镜头掠过的失焦深棕前景（像镜头前走过一根立柱）：纯渐变绘制（中心实、两侧 340px 软边 = 失焦 +
//   运动模糊的观感），前缘一道赤陶轮廓光读作"受光的物体"；前方 640px 软投影先扫过页面（近物遮光）。
//   不用 CameraMotionBlur（12 倍采样太贵），软边渐变本身就是糊。
// - 一条 take 的错觉：全程一条恒定方向的慢横移（内容 +40→−40px，smooth 缓动起止）贯穿切点；
//   遮挡物同向但快 50 倍（近大远小的视差）；切前 A 被"带风"拖左 28px（ease-in），切后 B 从右 28px 回稳（ease-out 14f）。
//
// 时间表（30fps，共 110f）：
//   0–24    A 静置（首帧即完整画面），横移极缓起步，照片里的日轮微微呼吸
//   24–32   预备：Reserve 按钮按下（0.96 缩放 + 压暗 6f）→ 文案换成「Reserving…」
//   32–46   遮挡物右→左扫过 14f（bezier 0.3,0,0.7,1）；39f 实心区盖满 1920，硬切 A→B
//   39–53   B 从右回稳；46–64 印章弹簧落座、对勾描画；45–68 说明行与确认码错峰升起
//   70–110  hold 40f：横移收尾、日轮呼吸
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const INVISIBLE_CUT_DURATION = 110;

const S = LOOKS.sand;
const PAD = 120;
const PRESS = 24; // 按下 Reserve
const SW_START = 32; // 遮挡物入画
const SW_END = 46; // 遮挡物出画
const CUT = 39; // 硬切：实心区盖满画幅的那一帧
const SOFT = 340; // 遮挡物软边宽
const CORE = 2600; // 遮挡物实心宽（> 1920，留出 >1 帧的全遮窗口）
const OCC_W = CORE + SOFT * 2;
const B_SHIFT = 40; // B 页排版右移量（抵消横移终点 −40）

// 遮挡物左缘位置：从画右外 → 画左外
const SWEEP_EASE = bezier(0.3, 0, 0.7, 1); // 起止有加减速、中段最快
const occX = (f: number) => mix(1940, -OCC_W - 20, ramp(f, SW_START, SW_END - SW_START, SWEEP_EASE));

// ───────────── 程序绘制的沙丘日落 ─────────────
const Dunes: React.FC<{ w: number; h: number; f: number; id: string }> = ({ w, h, f, id }) => {
  const breathe = 1 + 0.04 * Math.sin(f / 16);
  return (
    <svg width={w} height={h} viewBox="0 0 860 760" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d98a5c" />
          <stop offset="0.4" stopColor="#eeae78" />
          <stop offset="0.6" stopColor="#f8d2a0" />
        </linearGradient>
        <radialGradient id={`sun${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6bf" stopOpacity={0.85} />
          <stop offset="0.4" stopColor="#ffd9a6" stopOpacity={0.45} />
          <stop offset="1" stopColor="#ffd9a6" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`d1${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e09a63" />
          <stop offset="1" stopColor="#c8743f" />
        </linearGradient>
        <linearGradient id={`d2${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c76b38" />
          <stop offset="1" stopColor="#9c4724" />
        </linearGradient>
        <linearGradient id={`d3${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8f3f1f" />
          <stop offset="1" stopColor="#5e2611" />
        </linearGradient>
        <linearGradient id={`sh${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a160a" stopOpacity={0} />
          <stop offset="0.6" stopColor="#3a160a" stopOpacity={0} />
          <stop offset="1" stopColor="#3a160a" stopOpacity={0.35} />
        </linearGradient>
      </defs>
      <rect width={860} height={760} fill={`url(#sky${id})`} />
      <circle cx={560} cy={400} r={190 * breathe} fill={`url(#sun${id})`} opacity={0.95} />
      <circle cx={560} cy={400} r={56} fill="#fffbf2" />
      {/* 远丘 */}
      <path d="M0 440 C 140 400 260 420 380 440 C 520 462 640 410 860 420 L860 760 L0 760 Z" fill={`url(#d1${id})`} />
      {/* 中丘：脊线左亮右暗 */}
      <path d="M0 540 C 120 470 230 460 330 500 C 430 540 520 470 640 486 C 740 498 800 530 860 520 L860 760 L0 760 Z" fill={`url(#d2${id})`} />
      {/* 脊线受光：沿中丘脊一道亮边 */}
      <path d="M0 540 C 120 470 230 460 330 500 C 430 540 520 470 640 486" fill="none" stroke="#f3b27a" strokeWidth={3} opacity={0.55} />
      {/* 近丘 */}
      <path d="M0 650 C 160 590 300 600 430 640 C 560 680 700 600 860 620 L860 760 L0 760 Z" fill={`url(#d3${id})`} />
      {/* 营地：三顶小帐篷剪影 + 一点暖灯 */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${196 + i * 46} ${598 - i * 4})`}>
          <path d="M0 0 L 18 -26 L 36 0 Z" fill="#3b1a0c" />
          <circle cx={18} cy={-6} r={3.2} fill="#ffd38a" opacity={0.9} />
        </g>
      ))}
      <rect width={860} height={760} fill={`url(#sh${id})`} />
    </svg>
  );
};

// ───────────── A：营地详情 ─────────────
const PageA: React.FC<{ f: number }> = ({ f }) => {
  const down = ramp(f, PRESS, 4, EASE.out) * (1 - ramp(f, PRESS + 5, 8, EASE.out));
  const reserving = f >= PRESS + 4;
  return (
    <>
      <div style={{
        position: 'absolute', left: PAD, top: 160, width: 860, height: 760, borderRadius: 36, overflow: 'hidden',
        boxShadow: `0 2px 4px ${alpha(S.shadow, 0.12)}, 0 40px 90px -30px ${alpha(S.shadow, 0.45)}`,
      }}>
        <Dunes w={860} h={760} f={f} id="a" />
        <div style={{
          position: 'absolute', left: 32, top: 32, height: 60, padding: '0 24px', borderRadius: 30, display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,248,238,0.86)', boxShadow: `0 8px 24px -8px ${alpha(S.shadow, 0.4)}`,
          ...type(30, 650), color: S.ink,
        }}>
          <span style={{ color: S.accent }}>★</span> 4.92 <span style={{ color: S.ink2, fontWeight: 500 }}>· 318 reviews</span>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 1064, top: 176, width: 736 }}>
        <div style={{ ...type(28, 700, { caps: true }), letterSpacing: '0.14em', color: S.accent }}>Desert camp · Merzouga</div>
        <div style={{ fontFamily: SERIF, fontSize: 92, fontWeight: 500, lineHeight: 1.0, letterSpacing: '-0.025em', color: S.ink, marginTop: 26 }}>
          Three nights under the <i style={{ color: S.accent }}>Sahara</i> sky
        </div>
        <div style={{ display: 'flex', marginTop: 44, borderTop: `1.5px solid ${S.line}`, borderBottom: `1.5px solid ${S.line}` }}>
          {[['Dates', 'Nov 12 – 15'], ['Guests', '2 adults']].map(([k, v], i) => (
            <div key={k} style={{ flex: 1, padding: '22px 0', paddingLeft: i ? 32 : 0, borderLeft: i ? `1.5px solid ${S.line}` : undefined }}>
              <div style={{ ...type(26, 600, { caps: true }), letterSpacing: '0.1em', color: S.ink3 }}>{k}</div>
              <div style={{ ...type(40, 600), color: S.ink, marginTop: 6 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 34 }}>
          <span style={{ ...type(76, 700), color: S.ink }}>€640</span>
          <span style={{ ...type(32, 500), color: S.ink2 }}>total · free cancellation</span>
        </div>
        <div style={{
          marginTop: 34, height: 116, borderRadius: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
          background: `linear-gradient(180deg, #d0643a 0%, ${S.accent} 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 ${mix(18, 6, down)}px ${mix(40, 16, down)}px -12px ${alpha('#8a3414', 0.55)}`,
          transform: `scale(${(1 - 0.04 * down).toFixed(4)})`, filter: down > 0.01 ? `brightness(${1 - 0.12 * down})` : undefined,
          ...type(42, 650), color: S.onAccent,
        }}>
          {reserving && (
            <span style={{
              width: 30, height: 30, borderRadius: 15, border: `4px solid ${alpha(S.onAccent, 0.35)}`, borderTopColor: S.onAccent,
              transform: `rotate(${(f - PRESS) * 24}deg)`, boxSizing: 'border-box',
            }} />
          )}
          {reserving ? 'Reserving…' : 'Reserve'}
        </div>
      </div>
    </>
  );
};

// ───────────── B：预订成功 ─────────────
const PageB: React.FC<{ f: number }> = ({ f }) => {
  const seal = springAt(f, CUT + 7, { damping: 13, stiffness: 190 });
  const check = ramp(f, CUT + 12, 14, EASE.out);
  const rows = [0, 1, 2].map((i) => ramp(f, CUT + 6 + i * 5, 18, EASE.snappy));
  return (
    <>
      <div style={{ position: 'absolute', left: PAD, top: 214, width: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...type(28, 700, { caps: true }), letterSpacing: '0.14em', color: S.accent }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: S.accent }} />
          Booking confirmed
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 168, fontWeight: 500, lineHeight: 0.94, letterSpacing: '-0.035em', color: S.ink, marginTop: 30 }}>
          You’re<br /><i style={{ color: S.accent }}>going.</i>
        </div>
        <div style={{ ...type(42, 500), color: S.ink2, marginTop: 52, lineHeight: 1.35, opacity: rows[0], transform: `translateY(${(1 - rows[0]) * 22}px)` }}>
          Three nights at Atlas Dunes Camp,<br />Merzouga · Nov 12 – 15
        </div>
        <div style={{ ...type(32, 500), color: S.ink3, marginTop: 30, opacity: rows[1], transform: `translateY(${(1 - rows[1]) * 22}px)` }}>
          Itinerary and desert transfer sent to your inbox
        </div>
      </div>

      {/* 票根卡 */}
      <div style={{
        position: 'absolute', left: 1140, top: 150, width: 660, height: 780, borderRadius: 34, overflow: 'hidden', background: S.surface,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 4px ${alpha(S.shadow, 0.1)}, 0 44px 90px -30px ${alpha(S.shadow, 0.42)}`,
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 660, height: 330, overflow: 'hidden' }}>
          <Dunes w={660} h={330} f={f} id="b" />
        </div>
        {/* 打孔线 + 两侧半圆缺口 */}
        <div style={{ position: 'absolute', left: 44, right: 44, top: 520, borderTop: `3px dashed ${alpha(S.ink3, 0.45)}` }} />
        {[-26, 634].map((x) => (
          <div key={x} style={{ position: 'absolute', left: x, top: 494, width: 52, height: 52, borderRadius: 26, background: S.bg[1], boxShadow: `inset 0 2px 6px ${alpha(S.shadow, 0.18)}` }} />
        ))}
        <div style={{ position: 'absolute', left: 52, top: 362, display: 'flex', justifyContent: 'space-between', width: 556 }}>
          {[['From', 'Nov 12'], ['To', 'Nov 15']].map(([k, v]) => (
            <div key={k}>
              <div style={{ ...type(24, 650, { caps: true }), letterSpacing: '0.12em', color: S.ink3 }}>{k}</div>
              <div style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 500, letterSpacing: '-0.02em', color: S.ink, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 52, top: 570, opacity: rows[2], transform: `translateY(${(1 - rows[2]) * 20}px)` }}>
          <div style={{ ...type(24, 650, { caps: true }), letterSpacing: '0.12em', color: S.ink3 }}>Confirmation</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 600, letterSpacing: '0.02em', color: S.ink, marginTop: 8 }}>HX-4821</div>
          <div style={{ ...type(30, 500), color: S.ink2, marginTop: 14 }}>3 nights · 2 adults · €640</div>
        </div>
      </div>
      {/* 赤陶印章：压在照片与票面交界处，弹簧落座 + 对勾描画 */}
      <div style={{
        position: 'absolute', left: 1640, top: 270, width: 150, height: 150,
        transform: `rotate(${mix(-30, -8, seal)}deg) scale(${mix(1.8, 1, seal).toFixed(4)})`, opacity: Math.min(1, seal * 3),
      }}>
        <svg width={150} height={150} viewBox="0 0 150 150" style={{ overflow: 'visible', filter: `drop-shadow(0 14px 22px ${alpha('#7a2c10', 0.45)})` }}>
          <circle cx={75} cy={75} r={70} fill={S.accent} />
          <circle cx={75} cy={75} r={58} fill="none" stroke={alpha(S.onAccent, 0.5)} strokeWidth={2} strokeDasharray="3 6" />
          <path d="M48 77 L 67 96 L 104 56" fill="none" stroke={S.onAccent} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={90} strokeDashoffset={90 * (1 - check)} />
        </svg>
      </div>
    </>
  );
};

export const InvisibleCut: React.FC = () => {
  const frame = useCurrentFrame();
  const DUR = INVISIBLE_CUT_DURATION;
  // 贯穿切点的慢横移：内容 +40 → −40px（smooth 起止）；B 页整体右移 40px 排版，落定时回到 120 安全边
  const pan = 40 - 80 * ramp(frame, 0, DUR, EASE.smooth);
  // 带风推挤：切前 A 被拖左（ease-in），切后 B 从右回稳（ease-out）
  const shove = frame < CUT ? -28 * ramp(frame, SW_START - 2, CUT - SW_START + 2, EASE.exit) : 28 * (1 - ramp(frame, CUT, 14, EASE.out));
  const x = occX(frame);
  const sweeping = frame >= SW_START && frame <= SW_END;
  // 近物遮光：遮挡物前方的软投影
  const lead = x;

  return (
    <AbsoluteFill style={{ background: S.bg[1], overflow: 'hidden' }}>
      <Stage look={S} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.9, y: 0.95 }} vignette={0.2} grain={0.05} />
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(pan + shove).toFixed(2)}px)` }}>
        {frame < CUT ? <PageA f={frame} /> : <div style={{ position: 'absolute', inset: 0, left: B_SHIFT }}><PageB f={frame} /></div>}
      </div>

      {sweeping && (
        <>
          {/* 前方软投影 */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: lead - 640, width: 640 + SOFT,
            background: `linear-gradient(90deg, ${alpha('#2a170c', 0)} 0px, ${alpha('#2a170c', 0.38)} 640px, ${alpha('#2a170c', 0.5)} ${640 + SOFT}px)`,
          }} />
          {/* 失焦前景：两侧软边 + 实心核 + 前缘赤陶轮廓光 */}
          <div style={{
            position: 'absolute', top: -40, bottom: -40, left: x, width: OCC_W,
            background: `linear-gradient(90deg, rgba(43,26,16,0) 0px, rgba(43,26,16,0.85) ${SOFT * 0.6}px, #2b1a10 ${SOFT}px, #24150c ${SOFT + CORE}px, rgba(36,21,12,0.8) ${SOFT + CORE + SOFT * 0.4}px, rgba(36,21,12,0) ${OCC_W}px)`,
          }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: SOFT * 0.35, width: 260,
              background: `linear-gradient(90deg, ${alpha('#e0703f', 0)} 0%, ${alpha('#e0703f', 0.42)} 45%, ${alpha('#e0703f', 0)} 100%)`,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(255,210,170,0.08) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 100%)',
              // 只作用在实心区，软边处渐隐（否则在透明软边上画出一道硬边）
              WebkitMaskImage: `linear-gradient(90deg, transparent 0px, #000 ${SOFT}px, #000 ${SOFT + CORE}px, transparent ${OCC_W}px)`,
              maskImage: `linear-gradient(90deg, transparent 0px, #000 ${SOFT}px, #000 ${SOFT + CORE}px, transparent ${OCC_W}px)`,
            }} />
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
