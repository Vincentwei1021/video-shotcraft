// beat-step-list-theme-cycle（bear 22.3–24.6s）——三通道节拍器：形容词列表逐拍上移一行、
// 视口中央固定胶囊"接住"新词并换色、整场底色同拍跟换；行 / 色 / 场锁同一个拍点。
//
// 第二轮重设计（look = custom「五套深场换肤」·video-shotcraft 的主题预设片）：
// - 版式改成一句话：左侧静止的细体「Make it」(132px / 300) + 右侧 960px 胶囊里的形容词 (132px)，
//   读作"Make it modern → playful → expressive → BOLD → yours."，最后一拍落在口号上。
// - 每个主题 = 胶囊色 + 场底色 + 胶囊上的字色 + **选中词的字体气质**（无衬线 / 圆体 / 衬线斜体 /
//   全大写 Futura），一拍里同时跳——换肤读作"同一产品多种气质"，而不只是换颜色。
// - 胶囊是一面"透镜"：胶囊外是统一的暗白无衬线列表，胶囊里是同一列表的裁切副本（深色字 + 主题字体），
//   词越过胶囊边缘才换色换字体，跳变中不会出现"还没进胶囊就先变黑"的穿帮；胶囊宽度跟着选中词
//   的实测字宽走（同一个 tInBeat 插值），不再是一条一半空着的长条。
// - 场不是平涂：底色 + 胶囊同色相大光晕（跟同一时钟换色）+ 左上冷白主光 + 暗角 + 颗粒；
//   列表按离视口中心的行距衰减透明度 / 字号 / 虚化（滚轮景深），拍头跳变带竖向运动模糊。
// - 元素层的第四路回声：右上「THEME 03 / 05」计数、左下五枚色票，都挂同一个 beat 整数换态。
//
// 时间表（30fps，共 140f）：
//   0–16    入场：「Make it」与列表由虚到实上浮，胶囊横向展开（snappy）
//   16–30   铺垫静置（极缓推镜 1.0→1.03 全程），观众读清"这是个列表"
//   30/48/66/84  四拍（BEAT_LEN 18f ≈ 100BPM）：拍头 6f 陡 ease-out 跳变 + squash，其余 12f 静置
//   84–96   末拍余波：口号行「Your product, in motion.」逐词升起
//   96–140  hold：停在 "Make it yours." 黄 / 深海军蓝的终态海报
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { FONT, Grain, SpeedBlur, Vignette, mix, ramp, velocity, EASE } from '../../_fixtures/Polish';
import { SERIF, TextReveal, alpha } from '../../_fixtures/Look';
import { PITCH, ShotcraftWordmark } from '../../_fixtures/Brand';

export const BEAT_STEP_LIST_THEME_CYCLE_DURATION = 140; // 铺垫 30f + 4 拍 × 18f + 末拍后 hold 38f

const ROW_H = 176;
const FS = 132; // 形容词字号
const CY = 520; // 视口中心行（略高于画面中线，给底部色票 / 口号留位）
// 上方垫两行、下方垫两行未选中词：起拍时 modern 在中心，末拍停在 yours. 下面仍有词垫着
const WORDS = ['minimal', 'clean', 'modern', 'playful', 'expressive', 'bold', 'yours.', 'timeless', 'quiet'];
const START_IDX = 2; // modern

// 拍点：~0.6s 一拍 = 18 帧
const BEAT_LEN = 18;
const FIRST_BEAT = 30;
const N_BEATS = 4;
const JUMP = 6; // 跳变窗：拍头 6f，其余 12f 完全静置

// 版式：「Make it」+ 胶囊整体按中位胶囊宽水平居中；胶囊宽度跟着选中词走（同一时钟插值）
const PILL_H = 156;
const PAD_L = 64; // 胶囊内左边距
const PAD_R = 76; // 右边距略大（视觉居中：小写词右侧有字怀留白）
const LEAD_W = 470; // 「Make it」占位宽
const GAP = 34;
const MID_PILL = 560;
const LEFT = (1920 - (LEAD_W + GAP + MID_PILL)) / 2; // 428
const PILL_X = LEFT + LEAD_W + GAP; // 932
const WORD_X = PILL_X + PAD_L; // 胶囊内左对齐起点
const MARGIN = 128; // 角落信息的安全边距

// 词的排版盒：整行高、左对齐、竖向居中（外层列表与胶囊透镜共用，保证两层逐像素重合）
const wordBox: React.CSSProperties = {
  position: 'absolute', top: 0, height: ROW_H, display: 'flex', alignItems: 'center',
  fontSize: FS, lineHeight: 1, letterSpacing: '-0.035em', whiteSpace: 'nowrap', transformOrigin: '0% 50%',
};

// 主题字体（系统字体栈，Chrome 里 ui-rounded 不生效，圆体用 Arial Rounded；缺字体时回落无衬线）
const ROUNDED = `"Arial Rounded MT Bold", "SF Pro Rounded", ${FONT.sans}`;
const GEOMETRIC = `Futura, "Avenir Next", ${FONT.sans}`;

// ink = 选中词实测字宽（1080p 渲染帧量得，132px），胶囊宽 = ink + 左右边距
type Theme = { name: string; pill: string; bg: string; ink: string; inkW: number; font: React.CSSProperties };
// 起始态 + 四拍；相邻底色同明度不同色相（都 ≈ L6–9 的深场），胶囊色与底色是配好的深浅对
const THEMES: Theme[] = [
  { name: 'Bone', pill: '#ece6da', bg: '#15120f', ink: '#17130f', inkW: 425, font: { fontFamily: FONT.sans, fontWeight: 700 } },
  { name: 'Tangerine', pill: '#ff8a3d', bg: '#1d0e17', ink: '#260e03', inkW: 384, font: { fontFamily: ROUNDED, fontWeight: 700, letterSpacing: '-0.03em' } },
  { name: 'Iris', pill: '#9d8aff', bg: '#0f0d25', ink: '#120b36', inkW: 540, font: { fontFamily: SERIF, fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.02em' } },
  { name: 'Mint', pill: '#38d690', bg: '#06181a', ink: '#03150d', inkW: 376, font: { fontFamily: GEOMETRIC, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.01em' } },
  { name: 'Sun', pill: '#ffd43b', bg: '#0f1834', ink: '#1a1404', inkW: 352, font: { fontFamily: FONT.sans, fontWeight: 800 } },
];

// 拍内跳变：陡 ease-out（指数 3.2），6 帧内完成
const snap = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3.2);

const hex = (a: string) => [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
const mixRgb = (a: string, b: string, t: number) => {
  const pa = hex(a);
  const pb = hex(b);
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
};
const css = (c: number[], a = 1) => (a >= 1 ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${a.toFixed(3)})`);
const lighten = (c: number[], k: number) => c.map((v) => Math.round(v + (255 - v) * k));
const darken = (c: number[], k: number) => c.map((v) => Math.round(v * (1 - k)));

// 一个时钟：已触发拍数 + 拍内进度（跳变只占拍头 JUMP 帧）——三通道全部从这里取值
const clock = (frame: number) => {
  const raw = (frame - FIRST_BEAT) / BEAT_LEN;
  const beat = Math.min(N_BEATS, Math.max(0, Math.floor(raw) + 1));
  const beatStart = FIRST_BEAT + (beat - 1) * BEAT_LEN;
  const tInBeat = beat === 0 ? 1 : snap((frame - beatStart) / JUMP);
  const step = beat === 0 ? 0 : beat - 1 + tInBeat; // 连续步进量
  return { beat, tInBeat, step, sinceBeat: beat === 0 ? 99 : frame - beatStart };
};

export const BeatStepListThemeCycle: React.FC = () => {
  const frame = useCurrentFrame();
  const { beat, tInBeat, step, sinceBeat } = clock(frame);

  // 三通道 —— 1) 列表上移一行
  const listY = -step * ROW_H;
  const vy = velocity((f) => -clock(f).step * ROW_H, frame); // px/帧，喂运动模糊

  // 2) 胶囊 / 3) 场底色：同一个 tInBeat 逐通道 cross-mix
  const prev = THEMES[Math.max(0, beat - 1)];
  const now = THEMES[beat];
  const mixT = beat === 0 ? 1 : tInBeat;
  const pill = mixRgb(prev.pill, now.pill, mixT);
  const bg = mixRgb(prev.bg, now.bg, mixT);
  const bgColor = css(bg);
  const pillW = mix(prev.inkW, now.inkW, mixT) + PAD_L + PAD_R;

  // 胶囊落位 squash：竖向 1.14→0.96→1、横向反相 0.97→1.01→1（体积守恒感），随拍头 6f 走完
  const sy = beat === 0 ? 1 : interpolate(tInBeat, [0, 0.6, 1], [1.14, 0.96, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sx = beat === 0 ? 1 : interpolate(tInBeat, [0, 0.6, 1], [0.97, 1.01, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 接住瞬间胶囊提亮 + 辉光涨一下，8f 指数收回
  const hit = beat === 0 ? 0 : Math.exp(-sinceBeat / 3.2);

  // 入场（0–16f）：胶囊横向展开、文字由虚到实
  const open = ramp(frame, 2, 16, EASE.snappy);
  const listIn = ramp(frame, 4, 18, EASE.out);

  // 全程极缓推镜（1.0→1.03，smooth 起止无速度突变）
  const cam = mix(1, 1.03, ramp(frame, 0, BEAT_STEP_LIST_THEME_CYCLE_DURATION, EASE.smooth));

  const listPos = START_IDX + step; // 视口中心对应的连续行号

  // 末拍余波：口号逐词升起
  const LAST = FIRST_BEAT + (N_BEATS - 1) * BEAT_LEN;

  return (
    <AbsoluteFill style={{ background: bgColor, overflow: 'hidden', fontFamily: FONT.sans }}>
      {/* 场：左上冷白主光 + 胶囊同色相大光晕（跟同一时钟换色） */}
      <AbsoluteFill style={{
        background:
          `radial-gradient(ellipse 60% 70% at 62% ${(CY / 1080) * 100}%, ${css(pill, 0.2 + 0.06 * hit)} 0%, ${css(pill, 0.06)} 45%, ${css(pill, 0)} 75%),` +
          `radial-gradient(ellipse 55% 55% at 18% 0%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 70%)`,
      }} />

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${PILL_X}px ${CY}px` }}>
        {/* 词列表（胶囊外层）：统一的暗白无衬线，按行距衰减；拍头跳变带竖向运动模糊，静置帧不挂滤镜 */}
        <SpeedBlur vx={0} vy={vy} amount={0.16} max={9}>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: CY - ROW_H / 2 - START_IDX * ROW_H,
            transform: `translateY(${(listY + (1 - listIn) * 40).toFixed(2)}px)`,
          }}>
            {WORDS.map((w, i) => {
              const d = Math.abs(i - listPos); // 离视口中心几行（连续值）
              const op = Math.max(0, 0.42 - 0.15 * Math.max(0, d - 1)) * listIn;
              const sc = 1 - Math.min(0.14, 0.05 * Math.max(0, d - 0.5));
              const blur = Math.max(0, d - 1.2) * 3.5 + (1 - listIn) * 10;
              return (
                <div key={w} style={{ height: ROW_H, position: 'relative' }}>
                  <span style={{
                    ...wordBox, left: WORD_X, fontFamily: FONT.sans, fontWeight: 700,
                    color: `rgba(255,255,255,${op.toFixed(3)})`,
                    transform: `scale(${sc.toFixed(4)})`,
                    filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
                  }}>{w}</span>
                </div>
              );
            })}
          </div>
        </SpeedBlur>

        {/* 中央固定胶囊 = 透镜：列表在其下滚动，胶囊里是同一列表的裁切副本（深色字 + 该词的主题字体），
            词越过胶囊边缘的那一刻才换字色 / 字体——视觉上"胶囊跳到下一行接住新词" */}
        <div style={{
          position: 'absolute', left: PILL_X, top: CY - PILL_H / 2, width: pillW, height: PILL_H,
          transformOrigin: '0% 50%', transform: `scale(${(sx * mix(0.55, 1, open)).toFixed(4)}, ${sy.toFixed(4)})`,
          opacity: Math.min(1, open * 2.5), borderRadius: PILL_H / 2, overflow: 'hidden',
          background: `linear-gradient(180deg, ${css(lighten(pill, 0.16 + 0.07 * hit))} 0%, ${css(lighten(pill, 0.03 * hit))} 50%, ${css(darken(pill, 0.1))} 100%)`,
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.5)',
            'inset 0 -3px 8px rgba(0,0,0,0.12)',
            '0 3px 6px rgba(0,0,0,0.35)',
            `0 30px 90px -20px ${css(pill, 0.5 + 0.25 * hit)}`,
            `0 0 ${(40 + 60 * hit).toFixed(1)}px ${css(pill, 0.18 + 0.2 * hit)}`,
          ].join(', '),
        }}>
          <SpeedBlur vx={0} vy={vy} amount={0.16} max={9}>
            <div style={{
              position: 'absolute', left: 0, right: 0, top: PILL_H / 2 - ROW_H / 2 - START_IDX * ROW_H,
              transform: `translateY(${listY.toFixed(2)}px)`,
            }}>
              {WORDS.map((w, i) => {
                const k = i - START_IDX;
                const th = k >= 0 && k < THEMES.length ? THEMES[k] : null;
                return (
                  <div key={w} style={{ height: ROW_H, position: 'relative' }}>
                    <span style={{
                      ...wordBox, left: PAD_L, fontFamily: FONT.sans, fontWeight: 700, ...(th ? th.font : null),
                      color: th ? th.ink : THEMES[0].ink, opacity: Math.min(1, open * 2),
                    }}>{w}</span>
                  </div>
                );
              })}
            </div>
          </SpeedBlur>
          {/* 胶囊顶部受光：一条贴着上沿的柔高光，盖在字上让字"在胶囊里" */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: PILL_H * 0.45, background: 'linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0))', pointerEvents: 'none' }} />
        </div>

        {/* 「Make it」：静止的锚，细体 + 右对齐贴着胶囊 */}
        <div style={{
          position: 'absolute', left: LEFT, width: LEAD_W, top: CY - FS * 0.62, textAlign: 'right',
          fontSize: FS, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'rgba(255,255,255,0.94)',
          whiteSpace: 'nowrap',
        }}>
          <TextReveal text="Make it" by="word" variant="blur" start={2} each={16} gap={4} />
        </div>
      </AbsoluteFill>

      {/* 视口上下羽化：颜色跟 bgColor 实时同步，换场不穿帮 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: `linear-gradient(${bgColor} 34%, ${css(bg, 0)})` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 330, background: `linear-gradient(${css(bg, 0)}, ${bgColor} 62%)` }} />

      {/* 顶栏：品牌 + 主题计数（挂同一个整数拍，拍头 6f 竖向滚一格） */}
      <div style={{ position: 'absolute', left: MARGIN, top: 96, opacity: ramp(frame, 0, 12, EASE.out) }}>
        <ShotcraftWordmark size={30} markScale={1.6} gap={14} tone="dark" />
      </div>
      <div style={{
        position: 'absolute', right: MARGIN, top: 98, display: 'flex', alignItems: 'baseline', gap: 18,
        opacity: ramp(frame, 0, 12, EASE.out), fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>THEME</span>
        <span style={{ display: 'inline-block', height: 38, overflow: 'hidden', fontFamily: FONT.mono, fontSize: 32, fontWeight: 500, color: '#fff' }}>
          <span style={{ display: 'block', transform: `translateY(${(-(beat - 1 + (beat === 0 ? 1 : tInBeat)) * 38).toFixed(2)}px)` }}>
            {THEMES.map((_, k) => <span key={k} style={{ display: 'block', height: 38, lineHeight: '38px' }}>{String(k + 1).padStart(2, '0')}</span>)}
          </span>
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 32, color: 'rgba(255,255,255,0.4)' }}>/ 05</span>
      </div>

      {/* 左下：五枚色票，当前主题放大 + 描圈（整数拍换态，拍头 6f 弹到位） */}
      <div style={{ position: 'absolute', left: MARGIN, top: 900, display: 'flex', alignItems: 'center', gap: 22 }}>
        {THEMES.map((t, k) => {
          const cur = k === beat;
          const pop = cur ? (beat === 0 ? 1 : interpolate(tInBeat, [0, 0.6, 1], [0.7, 1.12, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) : 1;
          const appear = ramp(frame, 6 + k * 2, 12, EASE.overshoot);
          return (
            <div key={t.name} style={{
              width: 46, height: 46, borderRadius: 23, background: t.pill,
              transform: `scale(${((cur ? 1 : 0.62) * pop * appear).toFixed(4)})`, opacity: cur ? 1 : k < beat ? 0.55 : 0.32,
              boxShadow: cur ? `0 0 0 5px ${bgColor}, 0 0 0 7px rgba(255,255,255,0.85), 0 0 30px ${alpha(t.pill, 0.6)}` : 'none',
            }} />
          );
        })}
        <span style={{
          marginLeft: 18, fontSize: 32, fontWeight: 600, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.01em',
          opacity: ramp(frame, 8, 12, EASE.out),
        }}>{now.name}</span>
      </div>

      {/* 末拍余波：口号逐词升起，右下对齐胶囊右沿 */}
      <div style={{
        position: 'absolute', right: MARGIN, top: 896, fontSize: 40, fontWeight: 500,
        color: 'rgba(255,255,255,0.72)', letterSpacing: '-0.015em', whiteSpace: 'nowrap',
      }}>
        <TextReveal text={PITCH.en.taglines[5]} by="word" variant="rise" start={LAST + 6} each={16} gap={3} />
      </div>

      <Vignette strength={0.5} inner={0.42} color="#020306" />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
