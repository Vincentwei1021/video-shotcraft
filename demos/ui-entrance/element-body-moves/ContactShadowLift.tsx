// contact-shadow-lift｜接触阴影离面抬升
//
// 第二轮重设计（瓷白桌面 · 2.5D 斜俯拍 · 逐张点名）：
// - look = porcelain（冷白 + 钴蓝）。三张 440×580 竖版 video-shotcraft 镜头配方卡平躺在一张斜俯拍（rotateX ≈ 30°）的
//   瓷白桌面上：Whip pan 8f / Crash zoom 12f / Logo sting 24f（选定卡的图标位是 video-shotcraft 标志）。手法本身做成真的物理：
//   卡沿桌面法线 translateZ 抬起，阴影是另一层「躺在桌面 z=0 上」的实体——接触核（小而实、几乎贴边）
//   随抬升变大、变虚、变淡并向背光方向（右下）偏移；环境影（大而软）同步扩散。卡本体不带 box-shadow，
//   影子留在桌上，所以"纸片离桌"的距离是被阴影证明的，不是被缩放暗示的。
// - 节奏「扫—扫—选」：前两张是轻快的点名（抬 10f out-cubic → 悬停 14f → 落回 8f in-cubic + 2f 微压卡壳），
//   第三张是选定：抬得更慢更高（14f，弹簧落座、一次轻微过冲），停在空中不落回，钴蓝描边 + 对勾弹出，
//   成为结尾海报的唯一主角。一次只有一张离桌（P4），其余两张同步轻微压暗让位。
// - 相机：整段极缓的斜俯角回正（30°→26°）+ 跟随被点名的卡横移 ±40px（平滑，无速度突变）。
//
// 时间表（30fps，共 150f）：
//   0–16    预备：桌面、三卡已在位，标题逐词升起
//   16–50   点名 1：抬 16–26、悬停、落回 40–48、卡壳 48–50
//   50–84   点名 2：同上
//   86–100  选定 3：抬升 14f（spring damping 16，~3% 过冲），100f 起悬停呼吸
//   96–118  余波：钴蓝描边、对勾弹出（对勾描线）、节拍格同步染成钴蓝
//   118–150 hold：选定卡停在空中，极缓推镜
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';
import { ShotcraftMark } from '../../_fixtures/Brand';

export const CONTACT_SHADOW_LIFT_DURATION = 150;

const L = LOOKS.porcelain;

// ───────────── 版式（桌面坐标系，px） ─────────────
const CARD_W = 420;
const CARD_H = 600;
const GAP = 60;
const DESK_W = 3 * CARD_W + 2 * GAP; // 1448
const DESK_H = CARD_H;
const RADIUS = 30;

// ───────────── 抬升 ─────────────
const LIFT_Z = 96; // 沿桌面法线的抬升（屏幕上约 40–50px 的可见位移，远大于 28px 判例下限）
const LIFT_S = 1.05;
const SCANS = [16, 50]; // 前两张点名起点
const PICK = 86; // 第三张选定起点

const outCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const inCubic = (t: number) => Math.pow(Math.min(1, Math.max(0, t)), 3);

// 点名（会落回）：返回 lift 0→1→0 与缩放（含落地卡壳）
const scanMotion = (t: number) => {
  if (t < 0 || t >= 34) return { lift: 0, s: 1 };
  const up = outCubic(t / 10);
  const down = inCubic((t - 24) / 8);
  const lift = up - down;
  let s = 1 + (LIFT_S - 1) * lift;
  if (t >= 32) s = 0.99 + 0.01 * outCubic((t - 32) / 2); // 2f 微压卡壳后回到 1
  else if (t >= 31) s = 0.99;
  const hover = t >= 10 && t < 24 ? Math.sin(((t - 10) / 14) * Math.PI) : 0;
  return { lift: lift + 0.05 * hover, s };
};

// 选定（不落回）：弹簧抬起 + 悬停呼吸
const pickMotion = (f: number) => {
  if (f < PICK) return { lift: 0, s: 1 };
  const k = springAt(f, PICK, { damping: 16, stiffness: 120 });
  const breathe = f > PICK + 16 ? 0.04 * Math.sin(((f - PICK - 16) / 40) * Math.PI * 2) * ramp(f, PICK + 16, 20, EASE.smooth) : 0;
  const lift = 1.15 * k + breathe;
  return { lift, s: 1 + (LIFT_S - 1) * Math.min(1.2, k) };
};

const motionOf = (i: number, f: number) => (i < 2 ? scanMotion(f - SCANS[i]) : pickMotion(f));

// ───────────── 内容 ─────────────
// 镜头配方卡：tag = 镜头名、hours = 时长（帧）、days = 落在哪几拍（沿用原字段名）
type Focus = { tag: string; hours: string; note: string; days: number[]; glyph: 'whip' | 'zoom' | 'sting' };
const CARDS: Focus[] = [
  { tag: 'Whip pan', hours: '8f', note: 'A blurred hand-off between two scenes.', days: [0, 1, 0, 1, 0, 0, 0], glyph: 'whip' },
  { tag: 'Crash zoom', hours: '12f', note: 'Punch in on the number that matters.', days: [1, 0, 1, 0, 1, 1, 0], glyph: 'zoom' },
  { tag: 'Logo sting', hours: '24f', note: 'Lands the mark on the final downbeat.', days: [1, 1, 1, 1, 1, 0, 0], glyph: 'sting' },
];

// whip = 横摇速度线、zoom = 推镜取景角标；sting（片尾 logo 一击）直接用 video-shotcraft 标志（标志不随选中态换色）
const Glyph: React.FC<{ kind: Focus['glyph']; color: string }> = ({ kind, color }) =>
  kind === 'sting' ? (
    <ShotcraftMark size={46} tone="light" />
  ) : (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'whip' && <path d="M3 8h11M6 12h14M3 16h11M16 8.5l4 3.5-4 3.5" />}
      {kind === 'zoom' && (<><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /><circle cx={12} cy={12} r={2.4} /></>)}
    </svg>
  );

const DAYS = ['1', '2', '3', '4', '5', '6', '7']; // 节拍号（沿用原变量名）

const CardFace: React.FC<{ d: Focus; sel: number; check: number }> = ({ d, sel, check }) => {
  const tint = (a: number) => alpha(sel > 0.5 ? L.accent : L.ink, a);
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '44px 46px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: tint(0.07), border: `1px solid ${tint(0.08)}`,
        }}>
          <Glyph kind={d.glyph} color={sel > 0.5 ? L.accent : L.ink2} />
        </div>
        {/* 选定对勾 */}
        <div style={{
          width: 58, height: 58, borderRadius: 29, background: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${check.toFixed(4)})`, opacity: Math.min(1, check * 2), boxShadow: `0 8px 20px -6px ${alpha(L.accent, 0.7)}`,
        }}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={22} strokeDashoffset={22 * (1 - Math.min(1, Math.max(0, check * 1.2 - 0.2)))} />
          </svg>
        </div>
      </div>
      <div style={{ ...type(26, 650, { caps: true }), letterSpacing: '0.14em', color: L.ink2, marginTop: 44 }}>{d.tag}</div>
      <div style={{ ...type(160, 780), color: L.ink, letterSpacing: '-0.055em', marginTop: 14, lineHeight: 0.92 }}>{d.hours}</div>
      <div style={{ ...type(32, 500), color: L.ink2, marginTop: 22, lineHeight: 1.32 }}>{d.note}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        {d.days.map((on, k) => (
          <div key={k} style={{
            flex: 1, height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: on ? (sel > 0.5 ? L.accent : alpha(L.ink, 0.82)) : alpha(L.ink, 0.05),
            color: on ? '#fff' : L.ink3, ...type(22, 650),
          }}>
            {DAYS[k]}
          </div>
        ))}
      </div>
    </div>
  );
};

// ───────────── 主体 ─────────────
export const ContactShadowLift: React.FC = () => {
  const frame = useCurrentFrame();
  const motions = [0, 1, 2].map((i) => motionOf(i, frame));
  const lifts = motions.map((m) => Math.max(0, Math.min(1, m.lift)));

  // 相机：斜俯角缓慢回正 + 跟随被点名的卡横移；选定后极缓推近
  const tilt = 24 - 4 * ramp(frame, 0, 150, EASE.smooth);
  const follow = lifts.reduce((acc, l, i) => acc + l * (1 - i) * 40, 0);
  const push = 1 + 0.025 * ramp(frame, PICK, 64, EASE.smooth);

  const sel = ramp(frame, PICK + 10, 10, EASE.out);
  const check = frame < PICK + 14 ? 0 : springAt(frame, PICK + 14, { damping: 13, stiffness: 220 });

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={null} grain={0.045} vignette={0.2} />

      {/* 标题（屏幕空间，不进 3D） */}
      <div style={{ position: 'absolute', top: 92, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ ...type(24, 600, { mono: true }), letterSpacing: '0.16em', color: L.ink3, opacity: ramp(frame, 0, 14, EASE.out) }}>
          SHOT RECIPES · LAUNCH FILM
        </div>
        <div style={{ ...type(120, 760), color: L.ink, marginTop: 18 }}>
          <TextReveal text="Pick your shot." by="word" start={2} each={18} gap={4} />
        </div>
      </div>

      {/* 桌面：斜俯拍 3D 平面 */}
      <div style={{ position: 'absolute', inset: 0, perspective: 2600, perspectiveOrigin: '50% 34%' }}>
        <div style={{
          position: 'absolute', left: (1920 - DESK_W) / 2, top: 350, width: DESK_W, height: DESK_H,
          transformStyle: 'preserve-3d',
          transform: `translateX(${follow.toFixed(2)}px) scale(${push.toFixed(5)}) rotateX(${tilt.toFixed(3)}deg)`,
          transformOrigin: '50% 60%',
        }}>
          {/* 桌面点阵：让"桌面"这个平面在斜俯拍下有实在的透视（远疏近密），四周渐隐 */}
          <div style={{
            position: 'absolute', left: -700, top: -520, width: DESK_W + 1400, height: DESK_H + 1000,
            backgroundImage: `radial-gradient(circle, ${alpha(L.ink, 0.13)} 1.6px, transparent 2.2px)`, backgroundSize: '44px 44px',
            backgroundPosition: '-6px 14px',
            WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 52%, #000 30%, transparent 78%)',
          }} />
          {CARDS.map((d, i) => {
            const { lift, s } = motions[i];
            const l = Math.max(0, lift);
            const x = i * (CARD_W + GAP);
            const others = Math.max(0, ...lifts.filter((_, k) => k !== i));
            return (
              <React.Fragment key={i}>
                {/* 环境影：桌面上的大而软的影，随抬升扩散、偏向背光侧（右下） */}
                <div style={{
                  position: 'absolute', left: x, top: 0, width: CARD_W, height: CARD_H, borderRadius: RADIUS,
                  background: alpha(L.shadow, 0.09 + 0.13 * l),
                  filter: `blur(${(14 + 40 * l).toFixed(1)}px)`,
                  transform: `translate3d(${(10 + 40 * l).toFixed(1)}px, ${(16 + 60 * l).toFixed(1)}px, 0.5px) scale(${(1.0 + 0.06 * l).toFixed(4)})`,
                }} />
                {/* 接触核：贴边小而实，抬起后变大、变虚、变淡 */}
                <div style={{
                  position: 'absolute', left: x, top: 0, width: CARD_W, height: CARD_H, borderRadius: RADIUS,
                  background: alpha(L.shadow, 0.32 - 0.18 * l),
                  filter: `blur(${(3 + 22 * l).toFixed(1)}px)`,
                  transform: `translate3d(${(2 + 18 * l).toFixed(1)}px, ${(4 + 36 * l).toFixed(1)}px, 1px) scale(${(0.99 + 0.05 * l).toFixed(4)})`,
                }} />
                {/* 卡本体：沿法线抬起，不带 box-shadow（影子留在桌上） */}
                <div style={{
                  position: 'absolute', left: x, top: 0, width: CARD_W, height: CARD_H, borderRadius: RADIUS, overflow: 'hidden',
                  transform: `translate3d(0, 0, ${(2 + LIFT_Z * lift).toFixed(2)}px) scale(${s.toFixed(4)})`,
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)',
                  border: `1px solid ${alpha(L.ink, 0.07)}`, boxSizing: 'border-box',
                  boxShadow: `inset 0 1px 0 #ffffff${i === 2 ? `, inset 0 0 0 ${(3 * sel).toFixed(2)}px ${L.accent}` : ''}`,
                }}>
                  <CardFace d={d} sel={i === 2 ? sel : 0} check={i === 2 ? check : 0} />
                  {/* 让位压暗：别的卡离桌时本卡轻微沉下去 */}
                  <div style={{ position: 'absolute', inset: 0, background: alpha('#dfe5ef', 1), opacity: others * 0.22, mixBlendMode: 'multiply' }} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

    </AbsoluteFill>
  );
};
