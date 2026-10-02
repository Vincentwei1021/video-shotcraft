// D 式 黑场字卡（black-card）——前镜收尾"熄灯"进黑场，章节字卡逐词压印出现，再交棒后镜。
// 章节级分段 + 呼吸位二合一；一支 30s 片 D 式 ≤2 次。
//
// 第二轮重设计（暖黑影院 · 章节卡）：
// - look = ember（暖黑 · 余烬橙 · 琥珀）。两景都是浮在暖黑舞台上的产品窗口（真实截图纹理：
//   A = projects-full 项目板，B = wbr-full 周报页），舞台有主光；"淡入黑场"不再是整屏叠黑，
//   而是**熄灯**：主光收暗 + 窗口亮度落下 + 相机带着前镜推进惯性继续轻推，像影院灯光渐暗。
// - 字卡 = 左对齐的电影章节版式：眉题「CHAPTER 02」（等宽 32px，章节号用强调色）→ 132px 两行大标题
//   「Every project, / one weekly report.」逐词**压印**（由大 1.16 + 虚 10px 落到实，前密后疏）→
//   发丝线由左向右画出 → 等宽副行 → 底部四段章节进度条（01–04），第 2 段被琥珀光填满 = "我们在第二章"。
// - 交棒：字卡上浮淡出 → 主光重新亮起，B 窗口从暗里"被照亮"并从 1.05 轻收落定。
//
// 时间表（30fps，共 140f）：
//   0–30    A 景：窗口受光，相机惯性轻推 1.00→1.04（前镜的尾巴，第 0 帧就有画面）
//   14–32   熄灯：主光 1→0.18、A 窗口亮度落到 0（in-out，18f）
//   28–36   眉题字距收拢入场
//   34–58   六个词逐词压印（每词 14f，起跑按 EASE.out 前密后疏）
//   48–64   发丝线画出、副行升起；42–70 章节条分段画出，第 2 段 56–74 被填满
//   74–104  完整字卡 hold 30f（R1），字块极缓前推 1.5%，暖光呼吸
//   104–114 字卡上浮 + 虚化淡出（ease-in 出场）
//   110–128 开灯：主光回升、B 窗口亮度 0→1、1.05→1 落定
//   128–140 B 真静止 hold
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp, mix, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, alpha, type } from '../../_fixtures/Look';

export const BLACKCARD_DUR = 140;

const L = LOOKS.ember;
const LEFT = 168; // 字卡左对齐基线（安全边距）

// 产品窗口：1680×945 居中，圆角 + 发丝线 + 两层软阴影；页面按 1x 布局、横向裁掉两侧空白边
const WIN = { x: 120, y: 68, w: 1680, h: 945 };
// lit：受光程度 0–1。熄灯/开灯不是整窗均匀变暗，而是一道自下而上的暗幕（光向顶部的主光收回 /
// 从主光处倾泻下来），暗幕边缘 30% 软过渡。
const Window: React.FC<{ src: string; pageX: number; pageY: number; pageW?: number; lit: number; scale: number }> = ({ src, pageX, pageY, pageW = 1920, lit, scale }) => {
  const edge = mix(-30, 130, 1 - lit); // 暗幕上沿（% 窗高，自下而上）
  return (
  <div style={{
    position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 22, overflow: 'hidden',
    transform: `scale(${scale.toFixed(4)})`, transformOrigin: '50% 46%',
    boxShadow: `0 0 0 1px ${alpha('#ffe6d2', 0.1 * lit)}, ${softShadow(56, { color: L.shadow, strength: 3 * lit })}`,
    background: '#f9f6f1',
  }}>
    <Img src={staticFile(src)} style={{ position: 'absolute', left: pageX, top: pageY, width: pageW }} />
    {/* 受光：顶部一道暖色内高光 + 自上而下极淡的光衰（窗不是死平的贴图） */}
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#fff3e6', 0.1)} 0%, ${alpha('#fff3e6', 0)} 30%, ${alpha('#2a160c', 0.1)} 100%)` }} />
    <div style={{ position: 'absolute', inset: 0, borderRadius: 22, boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.7)}` }} />
    {/* 熄灯：窗口亮度落到舞台暗色 */}
    {lit < 0.999 && (
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(0deg, ${L.bg[1]} 0%, ${L.bg[1]} ${(edge - 30).toFixed(1)}%, ${alpha(L.bg[1], 0.55 * (1 - lit))} ${edge.toFixed(1)}%, ${alpha(L.bg[1], 0.35 * (1 - lit))} 100%)`,
      }} />
    )}
  </div>
  );
};

const WORDS: { t: string; line: 0 | 1; hot?: boolean }[] = [
  { t: 'Every', line: 0 }, { t: 'project,', line: 0 },
  { t: 'one', line: 1 }, { t: 'weekly', line: 1, hot: true }, { t: 'report.', line: 1, hot: true },
];
const W_START = 34;
const W_SPAN = 18; // 首词到末词的起跑跨度
const W_DUR = 14;
const wordStart = (i: number) => W_START + EASE.out(i / (WORDS.length - 1)) * W_SPAN;

const CHAPTERS = ['Projects', 'Weekly', 'Papers', 'Ship'];
// 描边章节号用静态字体（可变字体 SF 的字形有重叠轮廓，描边会露出内部交叉线）
const NUM_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export const BlackCardTransition: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 灯光：A 受光 → 熄灯 → 黑场留一点余温 → B 开灯 ──
  const down = ramp(frame, 14, 18, EASE.smooth);
  const up = ramp(frame, 110, 18, EASE.swift);
  const light = mix(mix(1, 0.18, down), 1, up);

  // A：惯性轻推 + 亮度落下
  const aLit = 1 - ramp(frame, 14, 18, EASE.smooth);
  const aScale = mix(1, 1.04, ramp(frame, 0, 34, EASE.out));
  // B：被照亮 + 轻收落定
  const bLit = ramp(frame, 110, 16, EASE.swift);
  const bScale = mix(1.05, 1, ramp(frame, 108, 24, EASE.snappy));

  // 字卡：退场 104–114
  const out = ramp(frame, 104, 10, EASE.exit);
  const cardOn = frame >= 26 && frame < 116;
  const hold = mix(1, 1.015, ramp(frame, 58, 56, EASE.smooth)); // hold 段极缓前推

  // 黑场暖光：字卡背后一团极淡的余烬光，随字卡出现亮起、呼吸
  const ember = ramp(frame, 24, 24, EASE.out) * (1 - out) * (1 + 0.06 * Math.sin(frame / 11));

  const kick = ramp(frame, 28, 14, EASE.snappy);
  const rule = ramp(frame, 48, 16, EASE.snappy);
  const sub = ramp(frame, 52, 14, EASE.out);
  const numDraw = ramp(frame, 32, 40, EASE.swift);
  const numFill = ramp(frame, 60, 20, EASE.out);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.04 }} fill={{ x: 0.2, y: 0.95 }} intensity={light} breathe={0.4}>
        {/* 黑场余温：字卡背后偏左的一团暖光（不是死黑） */}
        <div style={{
          position: 'absolute', inset: 0, opacity: ember,
          background: `radial-gradient(ellipse 52% 46% at 34% 50%, ${alpha(L.accent, 0.16)} 0%, ${alpha(L.accent, 0.05)} 45%, ${alpha(L.accent, 0)} 75%)`,
        }} />
        <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.35 + 0.35 * (1 - light)} />
      </Stage>

      {/* A 景（熄灯后不再渲染） */}
      {frame < 34 && <Window src="textures/live/projects-full.png" pageX={-120} pageY={-150} lit={aLit} scale={aScale} />}

      {/* B 景 */}
      {frame >= 108 && <Window src="textures/live/wbr-full.png" pageX={0} pageY={0} pageW={WIN.w} lit={bLit} scale={bScale} />}

      {/* 章节字卡 */}
      {cardOn && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 1 - out,
          transform: `translateY(${(-28 * out).toFixed(2)}px) scale(${hold.toFixed(4)})`, transformOrigin: `${LEFT}px 50%`,
          filter: out > 0.01 ? `blur(${(out * 8).toFixed(2)}px)` : undefined,
        }}>
          {/* 右侧巨型描边章节号「02」：琥珀光沿字形轮廓描出（stroke-dash 由 0 画满），描完后字腔极淡地被点亮 */}
          <svg width={900} height={900} viewBox="0 0 900 900" style={{ position: 'absolute', left: 1250, top: 70, overflow: 'visible' }}>
            <defs>
              <linearGradient id="bc-num" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={L.accent2} />
                <stop offset="0.6" stopColor={L.accent} />
                <stop offset="1" stopColor={L.accent} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <text x={0} y={720} fontFamily={NUM_FONT} fontSize={740} fontWeight={700} letterSpacing="-0.04em"
              fill={alpha(L.accent, 0.05 * numFill)} stroke="url(#bc-num)" strokeWidth={2.2}
              strokeDasharray="2700 2700" strokeDashoffset={(2700 * (1 - numDraw)).toFixed(1)} opacity={0.75}>
              02
            </text>
          </svg>

          {/* 眉题：字距由宽收紧 */}
          <div style={{
            position: 'absolute', left: LEFT, top: 268, ...type(32, 500, { mono: true }), color: L.ink2,
            letterSpacing: `${mix(0.6, 0.22, kick).toFixed(3)}em`, opacity: kick,
          }}>
            CHAPTER <span style={{ color: L.accent }}>02</span>
          </div>

          {/* 大标题：逐词压印 */}
          <div style={{ position: 'absolute', left: LEFT - 6, top: 336 }}>
            {[0, 1].map((line) => (
              <div key={line} style={{ ...type(132, 700), color: L.ink, whiteSpace: 'nowrap', lineHeight: 1.02, letterSpacing: '-0.045em' }}>
                {WORDS.map((w, i) => {
                  if (w.line !== line) return null;
                  const p = ramp(frame, wordStart(i), W_DUR, EASE.snappy);
                  const o = ramp(frame, wordStart(i), W_DUR * 0.45, EASE.out);
                  return (
                    <span key={i} style={{
                      display: 'inline-block', marginRight: '0.24em', opacity: o,
                      transform: `scale(${mix(1.16, 1, p).toFixed(4)})`, transformOrigin: '50% 70%',
                      filter: p < 0.99 ? `blur(${((1 - p) * 10).toFixed(2)}px)` : undefined,
                      ...(w.hot ? {
                        backgroundImage: `linear-gradient(100deg, ${L.accent2} 0%, ${L.accent} 70%)`,
                        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                      } : null),
                    }}>
                      {w.t}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 发丝线 + 副行 */}
          <div style={{
            position: 'absolute', left: LEFT, top: 632, width: 560, height: 2, borderRadius: 1,
            background: `linear-gradient(90deg, ${L.accent} 0%, ${alpha(L.accent, 0.5)} 60%, ${alpha(L.accent, 0)} 100%)`,
            transform: `scaleX(${rule.toFixed(4)})`, transformOrigin: '0 50%',
          }} />
          <div style={{
            position: 'absolute', left: LEFT, top: 662, ...type(32, 500, { mono: true }), color: L.ink2, letterSpacing: '0.16em',
            opacity: sub, transform: `translateY(${((1 - sub) * 14).toFixed(2)}px)`,
          }}>
            WEEKLY BRIEF · 2026-W28
          </div>

          {/* 章节进度条：四段画出，第 2 段被琥珀光填满 */}
          <div style={{ position: 'absolute', left: LEFT, right: LEFT, top: 868, display: 'flex', gap: 28 }}>
            {CHAPTERS.map((c, i) => {
              const draw = ramp(frame, 42 + i * 4, 16, EASE.snappy);
              const active = i === 1;
              const fill = active ? ramp(frame, 56, 18, EASE.swift) : i === 0 ? 1 : 0;
              const lab = ramp(frame, 48 + i * 4, 14, EASE.out);
              return (
                <div key={c} style={{ flex: 1 }}>
                  <div style={{ position: 'relative', height: 4, borderRadius: 2, background: alpha(L.ink, 0.12), transform: `scaleX(${draw.toFixed(4)})`, transformOrigin: '0 50%' }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 2, transform: `scaleX(${fill.toFixed(4)})`, transformOrigin: '0 50%',
                      background: active ? `linear-gradient(90deg, ${L.accent2}, ${L.accent})` : alpha(L.ink, 0.42),
                      boxShadow: active ? `0 0 18px ${alpha(L.accent, 0.55)}` : undefined,
                    }} />
                  </div>
                  <div style={{
                    marginTop: 18, display: 'flex', gap: 14, alignItems: 'baseline', opacity: lab,
                    transform: `translateY(${((1 - lab) * 10).toFixed(2)}px)`,
                  }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 500, color: active ? L.accent : L.ink3 }}>0{i + 1}</span>
                    <span style={{ ...type(32, active ? 600 : 450), color: active ? L.ink : L.ink3 }}>{c}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
