// pill-chip-slot-cycle-handled — 句中深色胶囊滚轮轮换，胶囊宽度随词长连续伸缩、两侧文字被挤开收拢。
//
// 第二轮重设计（暖沙 · 生活方式财务产品海报）：
// - look = sand（米色 · 赤陶 · 浓缩咖啡色）。主体是一句 150px/800 的大字句「Your [ ___ ] handled」，
//   占画宽 ~70%；胶囊是浓缩咖啡色立体胶囊（148px 高），内含赤陶色图标块 + 84px 词。
//   虚构品牌 Tally（小团队后台财务），词表 Payroll → Invoices → Taxes → Finances（词长 5–8，差 <2 倍）。
// - 滚轮是真的"轮"：胶囊上下露出前/后一项的幽灵词，半速视差 + 柱面压扁（scaleY 0.82），落定时最清楚。
// - 最后一词 Finances 是"结论"：胶囊在落定前由咖啡色转成赤陶色实心，图标块反白——
//   前三拍是证据，最后一拍盖章；随后副标题逐词升起。
// - 节奏：三次切换间隔递减（30 → 26 → 24f 起点间距，持词时间 24 → 12 → 8f），越换越快，最后一拍落定后长 hold。
//
// 时间表（30fps，共 180f）：
//   0–20    预备：眉题字距收拢；"Your" / "handled" 从线下升起（错 4f）
//   8–34    胶囊先以圆形图标块弹出（spring），随后宽度展开到 Payroll（两侧文字被推开）
//   44–64   切换 1 → Invoices（20f，滚轮缓动：2% 预备回拉 + ~5% 过冲卡入）
//   74–92   切换 2 → Taxes（18f，胶囊收窄，两侧文字收拢）
//   100–120 切换 3 → Finances（20f）；108–122 胶囊转赤陶色，落定时一次暖色泛光
//   126–150 余波：副标题逐词升起
//   150–180 hold：全程极缓推近 1→1.035
// 曲线：滚轮 bezier(0.6,-0.12,0.3,1.14)；胶囊宽度用不过冲的 swift 且晚 2f（父先动、子跟随），
// 两侧文字由 flex 布局自然挤开；滚动中词列按竖向速度方向性模糊，静止为 0。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const PILL_CHIP_SLOT_CYCLE_HANDLED_DURATION = 180;

const L = LOOKS.sand;
const ESPRESSO = ['#3a2c22', '#241a13', '#18110c']; // 胶囊竖向渐变（带暖色相的深色，不用纯黑）

type IconKey = 'pay' | 'inv' | 'tax' | 'fin';
const WORDS: { w: string; icon: IconKey }[] = [
  { w: 'Payroll', icon: 'pay' },
  { w: 'Invoices', icon: 'inv' },
  { w: 'Taxes', icon: 'tax' },
  { w: 'Finances', icon: 'fin' },
];
const LAST = WORDS.length - 1;

const SENT_FS = 150; // 句子字号
const PILL_H = 148; // 胶囊高 = 滚轮行高
const WORD_FS = 84; // 胶囊内词字号（比句子小一档：徽章依附句子）
const TILE = 100; // 图标块
const PAD_L = 24;
const GAP = 26;
const PAD_R = 54;
const SIDE_GAP = 34; // 胶囊与两侧文字间距

const SWITCHES = [44, 74, 100]; // 切换起点（帧）
const WINS = [20, 18, 20]; // 每次切换窗
const OPEN = 14; // 胶囊展开起点
const FINAL_TINT = 108; // 胶囊转赤陶色起点

// 滚轮缓动：两头缓，起步 ~2% 反向回拉（齿轮咬合前的松动），末端 ~5% 过冲卡入
const WHEEL = bezier(0.6, -0.12, 0.3, 1.14);

const posAt = (f: number) => SWITCHES.reduce((p, s, i) => p + ramp(f, s, WINS[i], WHEEL), 0);
// 宽度位置：不过冲、晚 2f（宽度跟随词，不抢在词前面）
const widthPosAt = (f: number) => SWITCHES.reduce((p, s, i) => p + ramp(f - 2, s, WINS[i], EASE.swift), 0);

const WORD_FONT: React.CSSProperties = { ...type(WORD_FS, 720), letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'nowrap' };

// 线性图标（24 视框，stroke 继承 currentColor）
const Icon: React.FC<{ k: IconKey; size?: number }> = ({ k, size = 52 }) => {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      {k === 'pay' && (
        <>
          <rect x="2.5" y="6" width="19" height="12" rx="2.4" {...p} />
          <circle cx="12" cy="12" r="2.6" {...p} />
          <path d="M6 9.5v5M18 9.5v5" {...p} />
        </>
      )}
      {k === 'inv' && (
        <>
          <path d="M6 3h9l4 4v14l-2.4-1.5L14.3 21 12 19.5 9.7 21l-2.3-1.5L5 21V4a1 1 0 0 1 1-1z" {...p} />
          <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" {...p} />
        </>
      )}
      {k === 'tax' && (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" {...p} />
          <path d="M8 16 16 8" {...p} />
          <circle cx="8.6" cy="8.6" r="1.4" {...p} />
          <circle cx="15.4" cy="15.4" r="1.4" {...p} />
        </>
      )}
      {k === 'fin' && (
        <>
          <path d="M4 20h16" {...p} />
          <path d="M6.5 16.5v-4M11 16.5V9M15.5 16.5V11.5M20 6.5l-5.2 3.2-4-2.6L4 11" {...p} />
        </>
      )}
    </svg>
  );
};

export const PillChipSlotCycleHandled: React.FC = () => {
  const frame = useCurrentFrame();

  // 量宽：隐藏 span 实测每个词的宽度（系统字体，首帧 layout effect 内替换兜底值）
  const measRef = useRef<HTMLDivElement>(null);
  const [textW, setTextW] = useState<number[]>(WORDS.map((o) => o.w.length * WORD_FS * 0.56));
  useLayoutEffect(() => {
    const kids = measRef.current?.children;
    if (!kids) return;
    setTextW(WORDS.map((o, i) => (kids[i] as HTMLElement).offsetWidth || o.w.length * WORD_FS * 0.56));
  }, []);
  const fullW = textW.map((w) => PAD_L + TILE + GAP + w + PAD_R);

  // ── 滚轮位置与速度
  const pos = posAt(frame);
  const vel = (posAt(frame + 0.5) - posAt(frame - 0.5)) * PILL_H; // px/帧
  const blurY = Math.min(16, Math.abs(vel) * 0.32);

  // ── 胶囊宽度：开场由圆形展开 → 之后按 widthPos 在相邻词宽之间插值
  const wp = Math.min(LAST, Math.max(0, widthPosAt(frame)));
  const ci = Math.min(LAST - 1, Math.floor(wp));
  const frac = wp - ci;
  const settledW = mix(fullW[ci], fullW[ci + 1], frac);
  const minW = PAD_L * 2 + TILE; // 只露图标块的圆形胶囊
  const openK = springAt(frame, OPEN, { damping: 20, stiffness: 120 });
  const chipW = mix(minW, settledW, openK);

  // 胶囊弹出（图标块先到）
  const pop = springAt(frame, 8, { damping: 15, stiffness: 190 });
  const tileK = springAt(frame, 11, { damping: 13, stiffness: 210 });

  // ── 结论拍：胶囊转赤陶色、一次暖色泛光
  const tint = ramp(frame, FINAL_TINT, 14, EASE.smooth);
  const bloom = ramp(frame, 118, 8, EASE.out) * (1 - ramp(frame, 126, 30, EASE.out));

  // ── 幽灵项（前一项 / 后一项）：半速视差、柱面压扁、滚动中更淡
  const near = Math.round(pos);
  const roll = (pos - near) * PILL_H * 0.5;
  const settle = 1 - Math.min(1, Math.abs(pos - near) * 2.6);
  const ghostIn = ramp(frame, 26, 16, EASE.out);
  const ghostA = 0.13 * (0.35 + 0.65 * settle) * ghostIn * (1 - 0.85 * tint);
  const ghost = (dir: -1 | 1, idx: number): React.ReactNode =>
    idx < 0 || idx > LAST ? null : (
      <div
        style={{
          position: 'absolute', left: '50%', top: dir < 0 ? -WORD_FS - 26 : PILL_H + 22,
          ...WORD_FONT, color: L.ink, opacity: ghostA,
          transform: `translateX(-50%) translateY(${(-roll).toFixed(2)}px) scaleY(0.82)`,
          transformOrigin: dir < 0 ? '50% 100%' : '50% 0%',
          filter: blurY > 0.6 ? `blur(${(blurY * 0.25).toFixed(2)}px)` : undefined,
        }}
      >
        {WORDS[idx].w}
      </div>
    );

  // 全程极缓推近（smooth：起止速度 0）
  const push = 1 + 0.035 * ramp(frame, 0, PILL_CHIP_SLOT_CYCLE_HANDLED_DURATION, EASE.smooth);
  // 胶囊离地高度：切换时略抬起（阴影变大变虚），落定回落
  const lift = Math.min(1, Math.abs(vel) / 18);

  const sentence: React.CSSProperties = { ...type(SENT_FS, 800), letterSpacing: '-0.05em', color: L.ink, lineHeight: 1, flex: 'none' };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.3 }} fill={{ x: 0.12, y: 0.95 }} vignette={0.2}>
        {/* 胶囊下方的暖色地面光：结论拍时更暖 */}
        <div style={{
          position: 'absolute', left: 960 - 700, top: 600, width: 1400, height: 260,
          background: `radial-gradient(ellipse 50% 50% at 50% 30%, ${alpha(L.accent, 0.1 + 0.16 * bloom)} 0%, ${alpha(L.accent, 0)} 70%)`,
        }} />
      </Stage>

      {/* 隐藏量宽 */}
      <div ref={measRef} style={{ position: 'absolute', visibility: 'hidden', left: 0, top: 0 }}>
        {WORDS.map((o) => (
          <span key={o.w} style={{ ...WORD_FONT, display: 'inline-block' }}>{o.w}</span>
        ))}
      </div>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})` }}>
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id="pcsch-vblur" x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation={`0 ${blurY.toFixed(2)}`} />
          </filter>
        </svg>

        {/* 眉题：品牌 + 品类，字距由宽收紧 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18,
          opacity: ramp(frame, 2, 18, EASE.out),
        }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: L.accent, transform: `rotate(45deg) scale(${ramp(frame, 4, 14, EASE.overshoot).toFixed(3)})` }} />
          <span style={{
            ...type(28, 700, { caps: true }), color: L.ink2,
            letterSpacing: `${mix(0.5, 0.24, ramp(frame, 2, 26, EASE.snappy)).toFixed(3)}em`,
          }}>
            Tally · Back office, automated
          </span>
        </div>

        {/* 主句：flex 居中，两侧 flex:none，胶囊宽度变化时把两侧文字推开/收拢 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 540 - PILL_H / 2, height: PILL_H, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...sentence, marginRight: SIDE_GAP }}>
            <TextReveal text="Your" start={0} each={18} variant="rise" />
          </div>

          <div style={{ position: 'relative', flex: 'none', width: chipW, height: PILL_H, transform: `scale(${mix(0.55, 1, pop).toFixed(4)})`, opacity: Math.min(1, pop * 2.5) }}>
            {ghost(-1, near - 1)}
            {ghost(1, near + 1)}
            {/* 胶囊本体 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden',
              background: `linear-gradient(180deg, ${ESPRESSO[0]} 0%, ${ESPRESSO[1]} 55%, ${ESPRESSO[2]} 100%)`,
              boxShadow:
                `inset 0 1.5px 0 rgba(255,236,214,0.16), inset 0 -2px 0 rgba(0,0,0,0.35), ` +
                `0 2px 3px ${alpha(L.shadow, 0.22)}, ` +
                `0 ${(22 + lift * 14).toFixed(1)}px ${(44 + lift * 22).toFixed(1)}px -16px ${alpha(tint > 0.5 ? L.accent : L.shadow, 0.42 + 0.12 * tint)}`,
            }}>
              {/* 结论色：赤陶实心 */}
              <div style={{ position: 'absolute', inset: 0, opacity: tint, background: `linear-gradient(180deg, #d9693f 0%, ${L.accent} 55%, #a9441f 100%)` }} />
              {/* 滚轮词列 */}
              <div style={{
                position: 'absolute', left: 0, top: 0, right: 0,
                transform: `translateY(${(-pos * PILL_H).toFixed(3)}px)`,
                filter: blurY > 0.4 ? 'url(#pcsch-vblur)' : undefined,
              }}>
                {WORDS.map(({ w, icon }, i) => {
                  const fin = i === LAST;
                  return (
                    <div key={w} style={{ height: PILL_H, display: 'flex', alignItems: 'center', paddingLeft: PAD_L, gap: GAP, whiteSpace: 'nowrap' }}>
                      <span style={{
                        width: TILE, height: TILE, borderRadius: 999, flex: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: fin ? '#fbf3e9' : `linear-gradient(180deg, #d8673d 0%, ${L.accent} 60%, #ad4822 100%)`,
                        color: fin ? L.accent : '#fff3e6',
                        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.28), 0 4px 10px -4px rgba(0,0,0,0.45)',
                        transform: i === 0 ? `scale(${mix(0.4, 1, tileK).toFixed(4)})` : undefined,
                      }}>
                        <Icon k={icon} />
                      </span>
                      <span style={{ ...WORD_FONT, color: fin ? mixColor(tint) : '#f8efe4' }}>{w}</span>
                    </div>
                  );
                })}
              </div>
              {/* 柱面收光：上下边缘压暗，词滚进滚出不硬切 */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(180deg, rgba(14,9,5,0.5) 0%, rgba(14,9,5,0) 24%, rgba(14,9,5,0) 76%, rgba(14,9,5,0.5) 100%)',
                opacity: 1 - 0.55 * tint,
              }} />
            </div>
          </div>

          <div style={{ ...sentence, marginLeft: SIDE_GAP }}>
            <TextReveal text="handled" start={4} each={18} variant="rise" />
          </div>
        </div>

        {/* 角标：左下品牌字标、右下序号（随滚轮落定翻到当前项） */}
        <div style={{ position: 'absolute', left: 120, bottom: 96, height: 40, display: 'flex', alignItems: 'center', gap: 14, opacity: ramp(frame, 10, 20, EASE.out) }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: L.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: L.accent, transform: 'rotate(45deg)' }} />
          </span>
          <span style={{ ...type(34, 800), letterSpacing: '-0.03em', color: L.ink }}>Tally</span>
        </div>
        <div style={{ position: 'absolute', right: 120, bottom: 96, height: 40, display: 'flex', alignItems: 'center', ...type(30, 600, { mono: true }), color: L.ink3, opacity: ramp(frame, 10, 20, EASE.out) }}>
          <span style={{ color: near === LAST ? L.accent : L.ink2 }}>{String(near + 1).padStart(2, '0')}</span>&nbsp;/&nbsp;{String(WORDS.length).padStart(2, '0')}
        </div>

        {/* 副标题：结论落定后逐词升起 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center', ...type(44, 500), letterSpacing: '-0.015em', color: L.ink2 }}>
          <TextReveal text="Filed, paid and reconciled — while you run the business." by="word" start={126} each={16} gap={2.2} variant="rise" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Finances 词色：咖啡底上是奶白，转成赤陶底后仍是奶白（onAccent），这里只微调暖度
const mixColor = (t: number) => (t > 0.5 ? L.onAccent : '#f8efe4');
