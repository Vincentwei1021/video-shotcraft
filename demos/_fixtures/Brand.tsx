// video-shotcraft 品牌件——demo 里出现 logo / 品牌名 / 宣传语时统一用这里：
// 标志 <ShotcraftMark>（「镜刻 / Frame Chisel」：开口取景框 + 琥珀斜切，与 assets/brand/logo-mark.svg 同一组路径）、
// 字标 <ShotcraftWordmark>、品牌色 BRAND、宣传文案库 PITCH。规范见 assets/brand/BRAND.md：
// 字标全小写（不做全大写科技字标）；标志不旋转斜切、不加发光/渐变/描边/投影，琥珀是唯一强调色。
// 纯 props 函数，只依赖 react；copy demo 时连同本文件一并带上并改 import 路径。
import React from 'react';

export const BRAND = {
  name: 'video-shotcraft', // 正式名：全小写 + 连字符
  short: 'Shotcraft', // 句中简称 / 空间受限时
  repo: 'github.com/Vincentwei1021/video-shotcraft',
  amber: '#D3923C', // 标志里的斜切色 = 品牌强调色
  ink: '#171714', // 亮底上的取景框色
  paper: '#F5F3EE', // 暗底上的取景框色（反白版）/ 浅色背景
  slate: '#B5B0A5', // 次级文字（暗底）
  font: '"Avenir Next", Avenir, Inter, "Helvetica Neue", "PingFang SC", Arial, sans-serif', // 字标字体
} as const;

// 标志的两段路径（viewBox 0 0 128 128）：frame = 开口取景框，cut = 斜切。分开导出，方便分段做动画
// （框先画出 / 斜切后划入、斜切单独上光等）。
export const MARK_PATHS = {
  frame: 'M16 16h96v26H42v44h70v26H16V16Z',
  cut: 'M92 48h28L84 84H56l36-36Z',
} as const;

// 标志。tone='dark' 用于暗底（取景框反白），'light' 用于亮底；frameColor / cutColor 可覆盖。
// cutProgress 0→1：斜切沿自身方向从无到有划入（默认 1 = 完整）；frameProgress 同理按取景框描出比例裁切。
export const ShotcraftMark: React.FC<{
  size?: number; tone?: 'dark' | 'light'; frameColor?: string; cutColor?: string;
  frameProgress?: number; cutProgress?: number; style?: React.CSSProperties;
}> = ({ size = 96, tone = 'dark', frameColor, cutColor, frameProgress = 1, cutProgress = 1, style }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const fp = Math.max(0, Math.min(1, frameProgress));
  const cp = Math.max(0, Math.min(1, cutProgress));
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" style={{ display: 'block', overflow: 'visible', ...style }}>
      <defs>
        {/* 取景框：自左向右揭开 */}
        <clipPath id={`f${id}`}><rect x={16} y={0} width={96 * fp} height={128} /></clipPath>
        {/* 斜切：沿 45° 方向从左下划向右上 */}
        <clipPath id={`c${id}`}><polygon points={`56,84 ${56 + 36 * cp},${84 - 36 * cp} ${84 + 36 * cp},${84 - 36 * cp} 84,84`} /></clipPath>
      </defs>
      {fp > 0 && <path d={MARK_PATHS.frame} fill={frameColor ?? (tone === 'dark' ? BRAND.paper : BRAND.ink)} clipPath={fp < 1 ? `url(#f${id})` : undefined} />}
      {cp > 0 && <path d={MARK_PATHS.cut} fill={cutColor ?? BRAND.amber} clipPath={cp < 1 ? `url(#c${id})` : undefined} />}
    </svg>
  );
};

// 字标：标志 + video-shotcraft 横排（logo-lockup.svg 的比例：标志高 ≈ 字号 2.1 倍，700 字重，+0.03em 字距）。
// size = 字号（px）；只要字不要标志时 mark={false}。
export const ShotcraftWordmark: React.FC<{
  size?: number; tone?: 'dark' | 'light'; color?: string; mark?: boolean;
  markScale?: number; gap?: number; weight?: number; fontFamily?: string; style?: React.CSSProperties;
}> = ({ size = 48, tone = 'dark', color, mark = true, markScale = 2.1, gap, weight, fontFamily, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: gap ?? size * 0.5, ...style }}>
    {mark && <ShotcraftMark size={size * markScale} tone={tone} />}
    <span style={{
      fontFamily: fontFamily ?? BRAND.font,
      fontSize: size, fontWeight: weight ?? 700, lineHeight: 1, letterSpacing: '0.03em', whiteSpace: 'nowrap',
      color: color ?? (tone === 'dark' ? BRAND.paper : BRAND.ink),
    }}>{BRAND.name}</span>
  </div>
);

// 宣传文案库——要写口号 / 标题 / 副标题 / 评价时从这里挑或照这个口径改写，别编与事实不符的数字
// （卡片数、star 数、用户数这类会变的数字不要写进画面）。
export const PITCH = {
  en: {
    motto: 'Frame motion. Craft the shot.', // 品牌短句（BRAND.md）
    taglines: [
      'One prompt to a finished promo.',
      'Cinematic product videos, crafted by your agent.',
      'Every shot, tuned in one place.',
      'Shot recipes for cinematic product films.',
      'Storyboard. Animate. Sound-design. Deliver.',
      'Your product, in motion.',
      'From screenshot to showreel.',
      'Direct the film. Let the agent shoot it.',
    ],
    features: [
      'Shot recipe cards', 'Real page captures', '2.5D camera moves', 'Beat-synced cuts',
      'Film-grade SFX', 'Motion workbench', 'Remotion render', 'JianYing export',
    ],
    praise: [
      'Feels like a launch film from a real studio.',
      'The first agent skill that actually understands pacing.',
      'Our promo shipped the same afternoon.',
      'Camera moves I would have keyframed for a week.',
      'Motion design without the motion designer bill.',
    ],
    works: 'An agent skill for Claude Code & Codex · Built on Remotion',
  },
  zh: {
    motto: '把运动，刻成镜头。', // 品牌短句（BRAND.md）
    taglines: [
      '一句话，出一支片。',
      '镜头配方卡，宣传片一键直出。',
      '让你的 agent 拍出电影感产品片。',
      '每一个镜头，都调到了位。',
      '分镜、动效、音效、交付，一条龙。',
      '把截图拍成大片。',
    ],
    features: ['镜头配方卡', '真实页面实拍', '2.5D 运镜', '踩点剪辑', '电影级音效', '动效工作台', 'Remotion 渲染', '剪映工程导出'],
    praise: [
      '像专业工作室做的发布片。',
      '第一个真正懂节奏的 agent 技能。',
      '下午提需求，晚上片子就上线了。',
      '这些运镜，我自己 K 帧要一周。',
    ],
    works: '适用于 Claude Code 与 Codex 的 agent 技能 · 基于 Remotion',
  },
} as const;
