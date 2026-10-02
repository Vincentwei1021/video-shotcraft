// brace-expand — Brace Expand Reveal 括号拉幕
// 一对紧贴的花括号先小字号出现在正中，随即带一次过冲向左右弹开并放大到标题级，括号之间的标题像被拉开的幕布
// 一样从中间露出（clip 宽度严格绑括号间距），落定后字距再细微松弛。
//
// 第二轮重设计（午夜 · 开发者发布会字卡）：
// - look = midnight。画面是一张技术产品发布字卡：等宽 300px 电光蓝花括号（带泛光）夹住 164px 800 字重的
//   「Edge Functions」（字宽贴满括号内腔）；上方等宽眉题「// new in Nimbus 3」、下方副标逐词浮现。背景是编辑器式点阵网格
//   （径向渐隐）+ 顶光 + 地平线光带，括号下方一道冷光反射。
// - 开场：第 0 帧画面中心已有一个闪烁的输入光标（编辑器语感，不是空帧）；6f 光标被一对紧贴的 0.4 倍小括号
//   "{}" 硬切替换（符号啪地在那儿，不淡入）——先建立"这是一对括号"。
// - 主动作：14f 起物理弹簧 ex（damping 14 / stiffness 130：起跳后 ~8f 到位、~11f 过冲峰 ≈9%、一次回弹）；
//   sc = mix(0.4, 1, ex)，幕布半宽 x = (HALF−内缘)·ex·sc，位移与放大乘在一起（放大本身也在推开括号）；
//   括号中心 = ±(x + 内缘·sc)，文字 clip 宽度 = 2x，严格绑括号内缘，括号与文字共用同一个 sc。括号按水平速度加方向性运动模糊，落定为 0。
// - 余波：落定后字距 −0.05em → −0.03em 松弛（呼一口气）、括号泛光从峰值回落；眉题与副标随后入场。
//
// 时间表（30fps，共 120f）：
//   0–6     光标闪烁（中心，第 0 帧即在）
//   6–14    小括号 "{}" 硬切出现、静置 8f
//   14–38   弹开：弹簧 ~22f 到位、~25f 过冲峰 ≈9%、~38f 收敛；文字从中间被"拉"出来
//   40–64   松弛：字距 −0.05→−0.03em（smooth）、泛光回落
//   44–80   眉题字距收拢入场（44f）、副标逐词浮现（54f 起）
//   80–120  hold：整幅极缓前推 1→1.012
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, glow, springAt, type } from '../../_fixtures/Look';

export const BRACE_EXPAND_DURATION = 120;

const L = LOOKS.midnight;
const CY = 520; // 标题中线
const HALF = 676; // 括号中心最终半距（px）
const BRACE_FS = 300; // 括号最终字号
const BRACE_INNER = 64; // 括号字形中心到内缘的距离（×sc），clip 从这里起算
const TITLE = 'Edge Functions';
const TITLE_FS = 164; // 字宽 ≈ 内腔宽 2·(HALF−内缘)：幕布拉到头才露全（换文案要同步调 HALF 或字号）
const APPEAR = 6;
const EXPAND = 14;

const expandAt = (f: number) => (f < EXPAND ? 0 : springAt(f, EXPAND, { damping: 14, stiffness: 130 }));
// 幕布半宽 x = (HALF − 内缘)·ex·sc；括号中心 = ±(x + 内缘·sc)——ex=0 时两只括号内缘相贴成 "{}"
const braceX = (f: number) => {
  const ex = expandAt(f);
  return (HALF - BRACE_INNER) * ex * mix(0.4, 1, ex);
};

const Brace: React.FC<{ ch: string; x: number; sc: number; v: number; glowK: number }> = ({ ch, x, sc, v, glowK }) => (
  <SpeedBlur vx={v} amount={0.22} max={16}>
    <div style={{
      position: 'absolute', left: 960 + x, top: CY, transform: `translate(-50%, -52%) scale(${sc.toFixed(4)})`,
      fontFamily: FONT.mono, fontSize: BRACE_FS, fontWeight: 500, lineHeight: 1, color: L.accent,
      textShadow: glow(L.accent, 0.5 + 0.5 * glowK),
    }}>{ch}</div>
  </SpeedBlur>
);

export const BraceExpand: React.FC = () => {
  const frame = useCurrentFrame();
  const on = frame >= APPEAR;
  const ex = expandAt(frame);
  const sc = mix(0.4, 1, ex);
  const x = braceX(frame);
  const v = braceX(frame + 0.5) - braceX(frame - 0.5); // 括号水平速度（px/帧）

  // 文字揭示宽度：严格绑括号内缘（= 2x），两侧 14px 羽化（窄时跟着收）
  const clipW = Math.max(0, 2 * x);
  const bx = x + BRACE_INNER * sc; // 括号中心
  const feather = Math.min(14, clipW / 4);
  const mask = `linear-gradient(90deg, transparent 0px, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent 100%)`;

  // 落定后字距松弛 + 泛光回落（泛光峰值跟着过冲走）
  const relax = ramp(frame, 40, 24, EASE.smooth);
  const ls = mix(-0.05, -0.03, relax);
  const glowK = Math.min(1, ex) * (1 - ramp(frame, 34, 30, EASE.out));

  // 光标：0–6f 闪烁
  const caretOn = !on && Math.floor(frame / 3) % 2 === 0;

  const cam = 1 + 0.012 * ramp(frame, 70, 50, EASE.smooth);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={null} horizon={0.66} breathe={0.4}>
        {/* 编辑器点阵：32px 栅格，中心亮、四周隐去 */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle, ${alpha('#a9bcff', 0.16)} 1.4px, transparent 1.8px)`,
          backgroundSize: '32px 32px', backgroundPosition: '16px 8px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 48%, #000 0%, rgba(0,0,0,0.35) 55%, transparent 85%)',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 48%, #000 0%, rgba(0,0,0,0.35) 55%, transparent 85%)',
        }} />
        {/* 括号下方的冷光反射带（随弹开展宽） */}
        <div style={{
          position: 'absolute', left: 960 - (x + 120), width: 2 * (x + 120), top: CY + 150, height: 90,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.22 * Math.min(1, ex))} 0%, ${alpha(L.accent, 0)} 70%)`,
        }} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: `50% ${CY}px` }}>
        {/* 眉题：等宽注释 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: CY - 248, textAlign: 'center', color: L.accent2,
          ...type(32, 500, { mono: true }), letterSpacing: `${mix(0.5, 0.08, ramp(frame, 44, 20, EASE.snappy)).toFixed(3)}em`,
          opacity: ramp(frame, 44, 14, EASE.out),
        }}>// new in Nimbus 3</div>

        {/* 标题：clip 宽度绑括号间距（幕布感，不是淡入/打字） */}
        {on && (
          <div style={{
            position: 'absolute', left: 960 - clipW / 2, width: clipW, top: CY - 110, height: 220, overflow: 'hidden',
            WebkitMaskImage: mask, maskImage: mask,
          }}>
            <div style={{
              position: 'absolute', left: clipW / 2, top: 110, transform: `translate(-50%, -54%) scale(${sc.toFixed(4)})`,
              fontFamily: FONT.sans, fontSize: TITLE_FS, fontWeight: 800, letterSpacing: `${ls.toFixed(4)}em`, lineHeight: 1,
              whiteSpace: 'nowrap',
              backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #e8eeff 55%, #a9b9e8 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', paddingBottom: 8,
            }}>{TITLE}</div>
          </div>
        )}

        {on && <Brace ch="{" x={-bx} sc={sc} v={-v} glowK={glowK} />}
        {on && <Brace ch="}" x={bx} sc={sc} v={v} glowK={glowK} />}

        {/* 开场光标 */}
        {caretOn && (
          <div style={{
            position: 'absolute', left: 960 - 4, top: CY - 60, width: 8, height: 120, borderRadius: 2,
            background: L.accent, boxShadow: glow(L.accent, 0.6),
          }} />
        )}

        {/* 副标 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: CY + 170, textAlign: 'center', color: L.ink2, ...type(44, 450) }}>
          <TextReveal text="Run code 40ms from every user." by="word" variant="blur" start={54} each={16} gap={3} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
