// blur-slide — Blur Slide 逐词入场（第二轮重设计：编辑排版海报）
// 手法不变：标题逐词入场，y 位移 + blur + opacity 三通道共用同一个进度 p、同一条缓动同步收敛
// ——词是"从虚焦里浮出来"，不是"滑进来顺便淡一下"；副标题在标题收完前错峰跟进，重叠读作一句话。
//
// 设计决定
// - look：paper（暖白纸 · 墨 · 朱红）。编辑排版语境：杂志刊头 + 大衬线标题 + 无衬线副标，
//   左对齐在 168px 安全边距的网格上，右侧留白给标题的尾巴呼吸。
// - 层级：刊头 24px 全大写（纹理级）→ 栏目眉题 30px 朱红全大写 → 主标题 170px 衬线两行 →
//   副标题 46px 无衬线。主副字号差 3.7 倍，字重 400 衬线对 400 无衬线靠字体家族区分。
// - 强调色只给一个词：第二行的斜体 "cinematic." 是朱红，它最后落定、入场窗更长（主角）。
// - 文案：主 5 词 "Make every launch / feel cinematic."、副 9 词（video-shotcraft 的宣传句）；刊头是 video-shotcraft 字标。
//
// 时间表（30fps，120f）
//   0–24   刊头与发丝线已在画面（首帧不空），发丝线从左向右画出（snappy 24f）
//   4–22   栏目眉题 blur-slide 入场（与手法同族，做"预备"）
//   10–40  主标题第一行 3 词，词间 4f，每词 22f
//   26–58  第二行：先停 6f 换气，"feel" 22f、"cinematic." 30f（最后落定，字距同 p 收紧）
//   34–80  副标题 9 词，词间 2.4f、每词 20f、位移/模糊更小——层级靠幅度不靠时长；与主标题重叠 24f
//   72–98  刊脚发丝线从右向左画出 + 页码淡入（hold 段的余波，版面闭合成完整一页）
//   80–119 落定 hold 40f：整组极缓推近 1→1.03（smooth，起止零速度）+ 纸面主光极缓呼吸
// 曲线：三通道共用 EASE.out（quint-out 级），起手快、尾巴长，词"浮"上来而不是"弹"上来。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { LOOKS, SERIF, Stage, alpha } from '../../_fixtures/Look';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { ShotcraftWordmark } from '../../_fixtures/Brand';

export const BLUR_SLIDE_DURATION = 120; // 4000ms @30fps

const L = LOOKS.paper;
const LEFT = 168; // 左侧安全边距 / 网格起点

// 单词：start 起始帧、dur 入场时长、dy 位移（px）、blur 最大模糊（px）。
// opacity / translateY / blur（及可选字距）全部绑同一个 p —— 本卡的核心，不可拆成多条缓动。
type Word = { text: string; start: number; dur: number; style?: React.CSSProperties; track?: [number, number] };

const Words: React.FC<{ words: Word[]; dy: number; blur: number; gap: string; style: React.CSSProperties }> = ({ words, dy, blur, gap, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap, whiteSpace: 'nowrap', ...style }}>
      {words.map((w, i) => {
        const p = ramp(frame, w.start, w.dur, EASE.out);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${((1 - p) * dy).toFixed(2)}px)`,
              filter: p >= 0.999 ? undefined : `blur(${((1 - p) * blur).toFixed(2)}px)`,
              letterSpacing: w.track ? `${(w.track[0] + (w.track[1] - w.track[0]) * p).toFixed(4)}em` : undefined,
              ...w.style,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

// 主标题：第一行 3 词等距 4f；第二行先停 6f 换气，主角词入场窗更长、字距同 p 由松到紧
const H1_A: Word[] = ['Make', 'every', 'launch'].map((text, i) => ({ text, start: 10 + i * 4, dur: 22 }));
const H1_B: Word[] = [
  { text: 'feel', start: 26, dur: 22 },
  {
    text: 'cinematic.', start: 30, dur: 30, track: [0.03, -0.025],
    style: { fontStyle: 'italic', color: L.accent },
  },
];
// 副标题：9 词，词间 2.4f（词数多于原稿，gap 按卡片规则压密）
const H2: Word[] = 'Shot recipes and camera moves, crafted by your agent.'.split(' ').map((text, i) => ({ text, start: 34 + i * 2.4, dur: 20 }));

export const BlurSlide: React.FC = () => {
  const frame = useCurrentFrame();
  // 整组极缓推近：以文字块左缘为原点，全程 smooth，尾段速度归零
  const push = 1 + 0.03 * ramp(frame, 0, 119, EASE.smooth);
  // 刊头发丝线：从左向右画出
  const rule = ramp(frame, 0, 24, EASE.snappy);
  // 栏目眉题：同族 blur-slide，单元 = 整行
  const kick = ramp(frame, 4, 18, EASE.out);
  // 后景刊号：从虚焦里慢慢显影（比标题慢得多，只做空间层次）
  const folio = ramp(frame, 0, 48, EASE.out);
  // 刊脚：副标题收尾时（72f）起画，26f snappy
  const foot = ramp(frame, 72, 26, EASE.snappy);
  const headline: React.CSSProperties = {
    fontFamily: SERIF, fontSize: 170, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.035em', color: L.ink,
  };
  return (
    <Stage look={L} keyLight={{ x: 0.3, y: 0.18 }} fill={null} breathe={0.6} grain={0.06} vignette={0.1}>
      {/* 纸面右下一抹朱红余温（极淡），让暖白不是死平 */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 40% 50% at 96% 100%, ${alpha(L.accent, 0.06)}, ${alpha(L.accent, 0)} 70%)` }} />

      {/* 后景：刊号大数字（5% 墨色），比文字层推得更慢且反向漂移 → 前后景视差 */}
      <div
        style={{
          position: 'absolute', right: 120, top: 150, fontFamily: SERIF, fontSize: 760, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.06em',
          color: alpha(L.ink, 0.045 * folio), filter: folio >= 0.999 ? undefined : `blur(${((1 - folio) * 24).toFixed(2)}px)`,
          transform: `translateX(${(-24 * ramp(frame, 0, 119, EASE.smooth)).toFixed(2)}px)`,
        }}
      >
        07
      </div>
        {/* 刊头：纹理级小字（不需要读），首帧即在；不随文字推近（页面家具是固定的） */}
        <div style={{ position: 'absolute', left: LEFT, right: LEFT, top: 92, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT.sans, fontSize: 24, fontWeight: 600, letterSpacing: '0.2em', color: L.ink2, opacity: 0.4 + 0.6 * rule }}>
          {/* 刊头字标：video-shotcraft（全小写，字标不加 caps 字距） */}
          <ShotcraftWordmark size={24} markScale={1.5} gap={12} tone="light" color={L.ink2} />
          <span style={{ color: L.ink3 }}>N° 07 — OCTOBER 2026</span>
        </div>
        <div style={{ position: 'absolute', left: LEFT, top: 140, width: 1920 - LEFT * 2, height: 1.5, background: alpha(L.ink, 0.22), transform: `scaleX(${rule.toFixed(4)})`, transformOrigin: '0 50%' }} />

        {/* 刊脚：副标题落定后从右向左画出一条发丝线 + 页码，给 hold 段一个收尾动作并把版面框成完整一页 */}
        <div style={{ position: 'absolute', left: LEFT, top: 972, width: 1920 - LEFT * 2, height: 1.5, background: alpha(L.ink, 0.18), transform: `scaleX(${foot.toFixed(4)})`, transformOrigin: '100% 50%' }} />
        <div style={{ position: 'absolute', right: LEFT, top: 994, fontFamily: FONT.sans, fontSize: 24, fontWeight: 600, letterSpacing: '0.2em', color: L.ink3, opacity: foot }}>
          PAGE 07
        </div>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: `${LEFT}px 560px` }}>
        {/* 栏目眉题 */}
        <div
          style={{
            position: 'absolute', left: LEFT, top: 318, display: 'flex', alignItems: 'center', gap: 18,
            fontFamily: FONT.sans, fontSize: 30, fontWeight: 650, letterSpacing: '0.16em', color: L.accent,
            opacity: kick, transform: `translateY(${((1 - kick) * 18).toFixed(2)}px)`, filter: kick >= 0.999 ? undefined : `blur(${((1 - kick) * 6).toFixed(2)}px)`,
          }}
        >
          <span style={{ width: 14, height: 14, background: L.accent, display: 'inline-block' }} />
          RELEASE NOTES
        </div>

        {/* 主标题两行：衬线 170px，负字距 */}
        <Words words={H1_A} dy={64} blur={18} gap="0.24em" style={{ ...headline, position: 'absolute', left: LEFT - 6, top: 384 }} />
        <Words words={H1_B} dy={64} blur={18} gap="0.24em" style={{ ...headline, position: 'absolute', left: LEFT - 6, top: 556 }} />

        {/* 副标题：无衬线 46px，位移与模糊都比主标题小一档 */}
        <Words
          words={H2}
          dy={26}
          blur={9}
          gap="0.26em"
          style={{ position: 'absolute', left: LEFT, top: 800, fontFamily: FONT.sans, fontSize: 46, fontWeight: 400, letterSpacing: '-0.012em', color: L.ink2, lineHeight: 1.2 }}
        />
      </div>
    </Stage>
  );
};
