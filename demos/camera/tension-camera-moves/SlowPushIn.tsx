// 慢推压迫（slow-push-in）——studiobinder camera movements。
//
// 第二轮重设计（sand · 一套调色板的暗/亮两面）：
// - 手法不变：景 A 匀加速慢推 1.00→1.14（Easing.in(quad)，前 2 秒几乎不可察）+ 暗角同曲线收拢，
//   张力顶点（120f）零过渡硬切到亮景 B。
// - 景 A = 痛点："构建还在跑"。暖黑底（sand 的墨色压到近黑），中央 300px 等宽计时器 14:32 每 30f
//   跳一秒（新秒位从线下升起 5f——画面里唯一的"心跳"），进度条卡在 97% 只爬 0.4%，下方一行
//   "Still compiling 2,104 modules…"。背后是虚化的构建日志（纹理，非内容）缓慢上滚。
//   三层视差推近：日志 1.00→1.03、进度/说明 1.00→1.10、计时器 1.00→1.14（本体曲线）；
//   顶光随推近收窄、暗角从 0 收到 0.6——"有什么要发生了"。
// - 景 B = 释放：sand 暖白纸面 + 赤陶强调。硬切那一帧信息已完整：420px「38s」+ 同位置的进度条
//   已满 100%（与景 A 的 97% 同一条，跨切点的视觉对位）+ 60px 结论句；切后 8f 副句逐词升起，
//   整景 1.035→1.00 极缓"呼气"回落（不是过渡，切点本身零过渡）。
//
// 时间表（30fps，共 170f）：
//   0–120   景 A 慢推（ease-in quad），计时 14:32→14:35（0/30/60/90f 跳秒），暗角 0→0.6
//   120     硬切
//   120–160 景 B：结论完整入画；128 起副句逐词升起；1.035→1.00 呼气（EASE.out，40f）
//   160–170 尾帧海报 hold
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const SLOW_PUSH_IN_DURATION = 170; // 120f 慢推 + 50f 亮景

const CUT = 120; // 硬切帧
const L = LOOKS.sand;
// 景 A 的暖黑：sand 墨色系压暗（带色相，不用纯黑）
const DARK = { top: '#1d1711', mid: '#130f0b', btm: '#0b0806', ink: '#f4ebdf', ink2: '#b3a594', ink3: '#6e6153' };
const BAR_W = 960; // 进度条宽（两景同位置同宽）
const BAR_Y = 724; // 进度条中线 y（屏幕坐标）

// 背后构建日志（纹理）：确定性生成
const LOG = Array.from({ length: 44 }, (_, i) => {
  const mods = ['core/runtime', 'ui/table', 'net/http2', 'fs/watch', 'db/pool', 'auth/jwt', 'img/encode', 'cli/args'];
  const ms = 120 + ((i * 7919) % 870);
  return `[${String(14 + Math.floor(i / 9)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}]  compile  ${mods[i % mods.length]}/${(i * 37) % 97}.ts  ${ms}ms`;
});

const SceneA: React.FC<{ frame: number }> = ({ frame }) => {
  // 推近本体：Easing.in(quad)——前段几乎不可察，后段可感
  const k = interpolate(frame, [0, CUT], [0, 1], { easing: Easing.in(Easing.quad), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sMain = mix(1, 1.14, k);
  const sMid = mix(1, 1.1, k);
  const sBg = mix(1, 1.03, k);
  // 计时器：每 30f 跳一秒；新秒位 5f 从线下升起
  const sec = 32 + Math.min(3, Math.floor(frame / 30));
  const tickP = frame < 30 ? 1 : ramp(frame % 30, 0, 5, EASE.snappy);
  const prevSec = sec - 1;
  // 进度：97.0 → 97.4（卡住的焦虑）
  const pct = mix(97.0, 97.4, frame / CUT);
  const lightW = mix(60, 40, k);
  const lightA = mix(0.2, 0.13, k);
  const spin = 0.55 + 0.45 * Math.sin(frame / 5);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${DARK.top} 0%, ${DARK.mid} 55%, ${DARK.btm} 100%)`, overflow: 'hidden' }}>
      {/* 远景：顶光 + 虚化日志，只推 1.03 */}
      <AbsoluteFill style={{ transform: `scale(${sBg})` }}>
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse ${lightW}% 64% at 50% 26%, ${alpha('#ffcf9e', lightA)} 0%, ${alpha('#ffcf9e', 0)} 70%)`,
        }} />
        {[110, 1010].map((x, c) => (
          <div key={c} style={{
            position: 'absolute', left: x, top: 30 - c * 170 - frame * 0.6, width: 820,
            fontFamily: FONT.mono, fontSize: 21, lineHeight: '34px', color: DARK.ink3, opacity: 0.26,
            filter: 'blur(1.8px)', whiteSpace: 'pre',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 66% at 50% 50%, transparent 34%, #000 80%)',
            maskImage: 'radial-gradient(ellipse 60% 66% at 50% 50%, transparent 34%, #000 80%)',
          }}>
            {LOG.map((_, i) => <div key={i} style={{ paddingLeft: ((i + c) % 3) * 40 }}>{LOG[(i + c * 17) % LOG.length]}</div>)}
          </div>
        ))}
      </AbsoluteFill>

      {/* 中景：状态眉题 + 进度条 + 说明（推 1.10） */}
      <AbsoluteFill style={{ transform: `scale(${sMid})`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 268, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: L.accent, opacity: spin, boxShadow: `0 0 18px ${alpha(L.accent, 0.6 * spin)}` }} />
          <div style={{ ...type(28, 600, { caps: true }), letterSpacing: '0.22em', color: DARK.ink2 }}>Build #4182 · running</div>
        </div>
        <div style={{ position: 'absolute', left: 960 - BAR_W / 2, top: BAR_Y - 3, width: BAR_W, height: 6, borderRadius: 3, background: alpha(DARK.ink, 0.1) }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${alpha(L.accent, 0.5)}, ${L.accent})`, boxShadow: `0 0 16px ${alpha(L.accent, 0.5)}` }} />
          {/* 进度头：卡住的那一点在喘 */}
          <div style={{
            position: 'absolute', left: `${pct}%`, top: 3, width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: 7,
            background: '#ffe2c8', opacity: 0.5 + 0.5 * spin, boxShadow: `0 0 ${10 + 14 * spin}px ${alpha(L.accent, 0.9)}`,
          }} />
        </div>
        <div style={{ position: 'absolute', left: 960 - BAR_W / 2, top: BAR_Y + 30, width: BAR_W, display: 'flex', alignItems: 'baseline' }}>
          <div style={{ ...type(36, 450), color: DARK.ink2 }}>Still compiling 2,104 modules…</div>
          <div style={{ ...type(36, 600, { mono: true }), color: DARK.ink, marginLeft: 'auto' }}>{pct.toFixed(1)}%</div>
        </div>
      </AbsoluteFill>

      {/* 主体：等宽计时器（推 1.14，本卡曲线本体） */}
      <AbsoluteFill style={{ transform: `scale(${sMain})`, transformOrigin: '50% 50%' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 334, display: 'flex', justifyContent: 'center',
          fontFamily: FONT.mono, fontSize: 300, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.04em', color: DARK.ink,
          textShadow: `0 0 60px ${alpha('#ffb27a', 0.12)}`,
        }}>
          <span>14:3</span>
          {/* 秒位窗口：旧秒上移出、新秒从线下升起 */}
          <span style={{ position: 'relative', display: 'inline-block', width: '0.6em', height: '1.05em', overflow: 'hidden' }}>
            {tickP < 1 && (
              <span style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${(-tickP * 100).toFixed(2)}%)`, opacity: 1 - tickP }}>{prevSec % 10}</span>
            )}
            <span style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${((1 - tickP) * 100).toFixed(2)}%)` }}>{sec % 10}</span>
          </span>
        </div>
      </AbsoluteFill>

      {/* 暗角：与推近同曲线收拢（带色相深棕） */}
      <AbsoluteFill style={{
        opacity: mix(0, 0.62, k), pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 56% at 50% 48%, rgba(8,5,3,0) 42%, rgba(8,5,3,0.97) 100%)',
      }} />
      <Vignette strength={0.45} color="#050302" inner={0.5} />
      <Grain opacity={0.1} blend="soft-light" />
    </AbsoluteFill>
  );
};

const SceneB: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - CUT;
  // 呼气：1.035 → 1.00（只是余波，切点本身零过渡）
  const s = mix(1.035, 1, ramp(t, 0, 40, EASE.out));
  return (
    <AbsoluteFill>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.82, y: 0.95 }} intensity={1} />
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: '50% 58%' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 160, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
          <svg width={30} height={30} viewBox="0 0 30 30">
            <circle cx={15} cy={15} r={14} fill={L.accent} />
            <path d="M9 15.5 L13.2 19.6 L21.2 11" fill="none" stroke={L.onAccent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ ...type(28, 650, { caps: true }), letterSpacing: '0.22em', color: L.ink2 }}>Build #4183 · Forge 2</div>
        </div>
        {/* 主数字 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center', alignItems: 'baseline',
          ...type(440, 800), lineHeight: 1, letterSpacing: '-0.06em', color: L.ink,
        }}>
          <span>38</span>
          <span style={{ fontWeight: 600, color: L.accent, marginLeft: '0.02em', letterSpacing: '-0.02em' }}>s</span>
        </div>
        {/* 同位进度条：已满 */}
        <div style={{ position: 'absolute', left: 960 - BAR_W / 2, top: BAR_Y - 3, width: BAR_W, height: 6, borderRadius: 3, background: L.accent }} />
        <div style={{ position: 'absolute', left: 960 - BAR_W / 2, top: BAR_Y + 34, width: BAR_W }}>
          <div style={{ ...type(60, 650), color: L.ink, textAlign: 'center' }}>From 14 minutes to 38 seconds.</div>
          <div style={{ ...type(34, 450), color: L.ink2, textAlign: 'center', marginTop: 22 }}>
            <TextReveal text="Same repo. Same machine. Cold cache." by="word" variant="rise" start={CUT + 8} each={16} gap={3} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SlowPushIn: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ fontFamily: FONT.sans }}>{frame < CUT ? <SceneA frame={frame} /> : <SceneB frame={frame} />}</AbsoluteFill>;
};
