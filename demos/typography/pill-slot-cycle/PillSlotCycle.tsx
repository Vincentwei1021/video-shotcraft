// pill-slot-cycle —— 句中词槽轮换：固定句干 + 槽位里的 pill 老虎机式绕滚筒翻一格，列举完落成结论句。
// 源：notion-ai 4.5–8.5s 的手法（文案、品牌、版式全部重做）。
//
// 第二轮重设计（深蓝夜 · AI 产品发布会两行海报）：
// - look = midnight（深蓝 · 电光蓝 · 青）。版式改成两行左对齐大字海报：第 1 行句干「One AI tool to」150px/800
//   纹丝不动；第 2 行是"填空槽"——开场就画着一条发丝下划线（空格待填），pill 在线上方轮换。
//   pill 是深色玻璃胶囊（140px 高，80px 字，96px 电光蓝渐变图标块），绕滚筒翻入翻出、按速度竖向模糊。
// - 收束：最后一枚 pill 上飞，「do it all.」与句干同字号同字重从下带过冲落位（全片唯一一次过冲），
//   字面是电光蓝→青的渐变；下划线同时由左到右点亮成强调色渐变 + 一次泛光——"空格被填上了"。
// - 节奏改"老虎机减速前的加速"：6 拍持续 28→16f 递减（越换越快），收束拍落定后长 hold ≥48f。
//   每拍前 9f 完成换位，剩下的时间读词；拍长 ≥16f 保证短语读得完。
// - 文案全部虚构：Relay（AI 工作台），技能短语长度 14–16 字符（长短差 <2 倍，槽宽不甩）。
//
// 时间表（30fps，共 205f）：
//   0–18     预备：眉题字距收拢；句干逐词从线下升起；空槽下划线由左向右画出
//   16–141   列举：6 拍（28/24/21/19/17/16f），每拍前 9f 换位（入 snappy 落槽 / 出 exit 加速飞走）
//   141–148  末 pill 上飞离场（7f ease-in）
//   141–157  「do it all.」从下 110px 落位（back 过冲）；147–167 下划线点亮；154–190 背后泛光一次
//   157–205  hold：全程极缓推近 1→1.03
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

const L = LOOKS.midnight;

type IconKey = 'ask' | 'search' | 'sum' | 'pen' | 'lang' | 'agenda';
const PILLS: { label: string; icon: IconKey }[] = [
  { label: 'Ask a question', icon: 'ask' },
  { label: 'Search your docs', icon: 'search' },
  { label: 'Summarize a call', icon: 'sum' },
  { label: 'Improve writing', icon: 'pen' },
  { label: 'Translate a page', icon: 'lang' },
  { label: 'Draft an agenda', icon: 'agenda' },
];
const BEATS = [28, 24, 21, 19, 17, 16]; // 越换越快
const INTRO = 16; // 第一枚 pill 入槽帧
const SWAP = 9; // 每拍前 9f 完成换位
const FIN = 16; // 结论句落位
const BEAT_START = BEATS.map((_, i) => INTRO + BEATS.slice(0, i).reduce((a, b) => a + b, 0));
const CYCLE_END = INTRO + BEATS.reduce((a, b) => a + b, 0); // 141
export const PILL_SLOT_CYCLE_DURATION = CYCLE_END + FIN + 48; // 205f ≈ 6.8s

const LEFT = 200; // 句干与槽位共同左缘（列举期间纹丝不动）
const LINE1_TOP = 336;
const SLOT_TOP = 566; // 第 2 行顶
const PILL_H = 156;
const STEM_FS = 176;
const UNDER_Y = SLOT_TOP + 200; // 填空下划线
const UNDER_W = 1920 - LEFT * 2; // 填空线横贯画面（左右安全边距相等）

// 线性图标（24 视框）
const Icon: React.FC<{ k: IconKey }> = ({ k }) => {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={54} height={54} viewBox="0 0 24 24" style={{ display: 'block' }}>
      {k === 'ask' && (
        <>
          <path d="M4 5.5h16v10H11l-4.5 3.5v-3.5H4z" {...p} />
          <path d="M10 9.2a2 2 0 0 1 3.9.6c0 1.3-1.9 1.5-1.9 2.7" {...p} />
        </>
      )}
      {k === 'search' && (
        <>
          <circle cx="10.5" cy="10.5" r="6" {...p} />
          <path d="m15 15 5 5" {...p} />
        </>
      )}
      {k === 'sum' && <path d="M4 6h16M4 10.5h16M4 15h10M4 19.5h6" {...p} />}
      {k === 'pen' && (
        <>
          <path d="M14.5 4.8 19.2 9.5 9 19.7l-5.2.5.5-5.2z" {...p} />
          <path d="M18 2.5v3M16.5 4h3" {...p} />
        </>
      )}
      {k === 'lang' && (
        <>
          <circle cx="12" cy="12" r="8.5" {...p} />
          <path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17" {...p} />
        </>
      )}
      {k === 'agenda' && (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" {...p} />
          <path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13.5h4M7.5 16.5h7" {...p} />
        </>
      )}
    </svg>
  );
};

// 深色玻璃 pill；lift = 离槽高度（0 落槽 → 1 飞行中）
const Pill: React.FC<{ label: string; icon: IconKey; lift?: number }> = ({ label, icon, lift = 0 }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 30, height: PILL_H, padding: '0 60px 0 24px', borderRadius: 999,
    background: 'linear-gradient(180deg, rgba(48,66,118,0.92) 0%, rgba(24,33,62,0.94) 55%, rgba(17,24,45,0.96) 100%)',
    border: `1px solid ${alpha('#a6bfff', 0.22)}`,
    boxShadow:
      `inset 0 1.5px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.4), ` +
      `0 ${(24 + lift * 30).toFixed(1)}px ${(50 + lift * 30).toFixed(1)}px -18px rgba(0,2,10,0.85), ` +
      `0 0 ${(40 + lift * 20).toFixed(1)}px ${alpha(L.light, 0.16 * (1 - lift))}`,
    whiteSpace: 'nowrap',
  }}>
    <span style={{
      width: 108, height: 108, borderRadius: 34, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(145deg, #7ea2ff 0%, ${L.accent} 45%, #3557e8 100%)`,
      boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.35), 0 8px 22px -6px ${alpha(L.light, 0.7)}`,
      color: '#ffffff',
    }}>
      <Icon k={icon} />
    </span>
    <span style={{ ...type(90, 650), letterSpacing: '-0.035em', lineHeight: 1, color: L.ink }}>{label}</span>
  </div>
);

// 竖向运动模糊（只在 y 轴；std<0.3 不挂）
const VBlur: React.FC<{ id: string; std: number }> = ({ id, std }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
    <filter id={id} x="-10%" y="-60%" width="120%" height="220%">
      <feGaussianBlur stdDeviation={`0 ${std.toFixed(2)}`} />
    </filter>
  </svg>
);

const inYAt = (bf: number) => mix(150, 0, ramp(bf, 0, SWAP, EASE.snappy)); // 从下落槽
const outYAt = (bf: number) => mix(0, -170, ramp(bf, 0, SWAP - 1, EASE.exit)); // 加速上飞
const finEase = Easing.out(Easing.back(1.5));
const finYAt = (f: number) =>
  interpolate(f, [CYCLE_END, CYCLE_END + FIN], [110, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: finEase });
const speed = (fn: (x: number) => number, x: number) => Math.abs(fn(x + 0.5) - fn(x - 0.5));

export const PillSlotCycle: React.FC = () => {
  const frame = useCurrentFrame();

  // 当前拍
  let idx = 0;
  for (let i = 0; i < BEATS.length; i++) if (frame >= BEAT_START[i]) idx = i;
  const beatFrame = frame - BEAT_START[idx];
  const isFinale = frame >= CYCLE_END;

  // 下划线：开场画出（发丝灰）→ 收束点亮（强调色渐变从左到右）
  const underDraw = ramp(frame, 4, 22, EASE.snappy);
  const underLit = ramp(frame, CYCLE_END + 6, 20, EASE.swift);
  const bloom = ramp(frame, CYCLE_END + 13, 8, EASE.out) * (1 - ramp(frame, CYCLE_END + 21, 34, EASE.out));
  const push = mix(1, 1.03, ramp(frame, 0, PILL_SLOT_CYCLE_DURATION, EASE.smooth));

  let slot: React.ReactNode = null;
  if (!isFinale && frame >= INTRO) {
    const inc = PILLS[idx];
    const out = idx > 0 ? PILLS[idx - 1] : null;
    const inT = ramp(beatFrame, 0, SWAP, EASE.snappy);
    const outT = ramp(beatFrame, 0, SWAP - 1, EASE.exit);
    const inBlur = Math.min(16, speed(inYAt, beatFrame) * 0.5);
    const outBlur = Math.min(14, speed(outYAt, beatFrame) * 0.4);
    slot = (
      <>
        <VBlur id="psc-in" std={inBlur} />
        <VBlur id="psc-out" std={outBlur} />
        {out && outT < 1 && (
          <div style={{
            position: 'absolute', left: 0, top: 0, transformOrigin: '50% 100%',
            transform: `translateY(${outYAt(beatFrame).toFixed(2)}px) rotateX(${(42 * outT).toFixed(2)}deg) scale(${mix(1, 0.93, outT).toFixed(4)})`,
            opacity: 1 - outT, filter: outBlur > 0.3 ? 'url(#psc-out)' : undefined,
          }}>
            <Pill label={out.label} icon={out.icon} lift={outT} />
          </div>
        )}
        <div style={{
          position: 'absolute', left: 0, top: 0, transformOrigin: '50% 0%',
          transform: `translateY(${inYAt(beatFrame).toFixed(2)}px) rotateX(${(-48 * (1 - inT)).toFixed(2)}deg) scale(${mix(0.93, 1, inT).toFixed(4)})`,
          opacity: Math.min(1, inT * 1.6), filter: inBlur > 0.3 ? 'url(#psc-in)' : undefined,
        }}>
          <Pill label={inc.label} icon={inc.icon} lift={1 - inT} />
        </div>
      </>
    );
  } else if (isFinale) {
    const lastT = ramp(frame, CYCLE_END, 7, EASE.exit);
    const finT = ramp(frame, CYCLE_END + 2, FIN - 2, EASE.linear);
    const finBlur = Math.min(12, speed(finYAt, frame) * 0.5);
    const last = PILLS[PILLS.length - 1];
    slot = (
      <>
        <VBlur id="psc-fin" std={finBlur} />
        <VBlur id="psc-last" std={Math.min(14, lastT * 14)} />
        <div style={{
          position: 'absolute', left: -4, top: (PILL_H - STEM_FS) / 2,
          ...type(STEM_FS, 800), letterSpacing: '-0.05em', lineHeight: 1, whiteSpace: 'nowrap',
          backgroundImage: `linear-gradient(100deg, #9fb8ff 0%, ${L.accent} 38%, ${L.accent2} 100%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          opacity: Math.min(1, finT * 2.2), transform: `translateY(${finYAt(frame).toFixed(2)}px)`,
          filter: finBlur > 0.3 ? 'url(#psc-fin)' : `drop-shadow(0 0 ${(30 * bloom).toFixed(1)}px ${alpha(L.light, 0.55 * bloom)})`,
        }}>
          do it all.
        </div>
        {/* 末 pill 画在结论句之上：先飞走，结论句从它身后升起 */}
        {lastT < 1 && (
          <div style={{
            position: 'absolute', left: 0, top: 0, transformOrigin: '50% 100%',
            transform: `translateY(${(-170 * lastT).toFixed(2)}px) rotateX(${(42 * lastT).toFixed(2)}deg) scale(${mix(1, 0.93, lastT).toFixed(4)})`,
            opacity: 1 - lastT, filter: lastT > 0.03 ? 'url(#psc-last)' : undefined,
          }}>
            <Pill label={last.label} icon={last.icon} lift={lastT} />
          </div>
        )}
      </>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.74, y: 0.06 }} fill={{ x: 0.9, y: 1.05 }} breathe={0.5}>
        <Dust look={L} count={26} seed={7} drift={0.22} opacity={0.45} />
        {/* 结论泛光：落在槽位后方，只亮一次 */}
        <div style={{
          position: 'absolute', left: LEFT - 200, top: SLOT_TOP - 160, width: 1400, height: 480,
          background: `radial-gradient(ellipse 50% 50% at 40% 50%, ${alpha(L.light, 0.32)} 0%, ${alpha(L.light, 0)} 70%)`,
          opacity: bloom,
        }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '30% 50%' }}>
        {/* 眉题 */}
        <div style={{
          position: 'absolute', left: LEFT, top: LINE1_TOP - 86, display: 'flex', alignItems: 'center', gap: 16,
          opacity: ramp(frame, 0, 16, EASE.out),
        }}>
          <span style={{ width: 12, height: 12, borderRadius: 99, background: L.accent2, boxShadow: `0 0 14px ${alpha(L.accent2, 0.8)}` }} />
          <span style={{ ...type(28, 650, { caps: true }), color: L.ink2, letterSpacing: `${mix(0.42, 0.22, ramp(frame, 0, 26, EASE.snappy)).toFixed(3)}em` }}>
            Relay · Your AI workspace
          </span>
        </div>

        {/* 第 1 行：句干，左缘锚死 */}
        <div style={{ position: 'absolute', left: LEFT - 6, top: LINE1_TOP, ...type(STEM_FS, 800), letterSpacing: '-0.05em', lineHeight: 1, color: L.ink, whiteSpace: 'nowrap' }}>
          <TextReveal text="One AI tool to" by="word" start={0} each={18} gap={3} variant="rise" />
        </div>

        {/* 第 2 行：槽位（perspective 给滚筒翻转） */}
        <div style={{ position: 'absolute', left: LEFT, top: SLOT_TOP, width: 1500, height: PILL_H, perspective: 1600 }}>
          {slot}
        </div>

        {/* 填空下划线：发丝底线 + 收束时点亮的强调色渐变 */}
        <div style={{ position: 'absolute', left: LEFT, top: UNDER_Y, width: UNDER_W * underDraw, height: 3, borderRadius: 2, background: alpha(L.ink, 0.16) }} />
        <div style={{
          position: 'absolute', left: LEFT, top: UNDER_Y - 0.5, width: UNDER_W * underLit, height: 4, borderRadius: 2,
          background: `linear-gradient(90deg, ${L.accent} 0%, ${L.accent2} 100%)`,
          boxShadow: `0 0 18px ${alpha(L.accent, 0.6)}`,
        }} />
        {/* 填空线右端：⌘K 键帽（命令面板的唤起入口），收束时随下划线点亮 */}
        <div style={{
          position: 'absolute', right: LEFT, top: UNDER_Y - 92, display: 'flex', gap: 12, alignItems: 'center',
          opacity: ramp(frame, 14, 16, EASE.out),
        }}>
          <span style={{ ...type(30, 500), color: L.ink3, marginRight: 10 }}>Ask Relay</span>
          {['⌘', 'K'].map((k) => (
            <span key={k} style={{
              width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...type(32, 600), color: mixLit(underLit),
              background: 'linear-gradient(180deg, rgba(40,52,88,0.9) 0%, rgba(20,27,48,0.95) 100%)',
              border: `1px solid ${alpha('#a6bfff', 0.18 + 0.25 * underLit)}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 0 rgba(4,7,16,0.9), 0 10px 20px -8px rgba(0,0,0,0.8)`,
            }}>{k}</span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 键帽字色：平时次级色，收束点亮后提到主色
const mixLit = (t: number) => (t > 0.6 ? L.ink : L.ink2);
