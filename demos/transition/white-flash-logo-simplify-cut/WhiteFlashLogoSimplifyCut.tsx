// white-flash-logo-simplify-cut — White Flash Simplify 冲白降维切换
// 液态金属质感的彩色词标静置流光，蓄力后从字心炸出一记白闪过曝，曝光回落时同一位置已是扁平版字标——
// 一次闪白完成"华丽演出 → 正式形象"的降维。
//
// 第二轮重设计（极光 · 液态金属 → 纸面定妆）：
// - look = aurora（暗场演出段）；冲白后落到 video-shotcraft 的剪辑纸面（品牌色收编：纸 / 墨 / 琥珀）。
//   词标是品牌字标「video-shotcraft」（全小写、字标字体 700 字重，15 字符故字号压到 FS），
//   两个版本同字号同位置——观众读到的是"同一个字标被净化了"，不是换了一张图。
// - 液态段的质感是"真材质"而不是一条渐变：①流动的虹彩底色（紫 → 粉 → 桃 → 冰蓝，background-size 300% 缓流）
//   ②纵向明暗（顶亮底暗，读作有体积）③横贯字腰的镀铬地平线反光带 ④一次斜向高光扫过（Q4：只给主角一次，
//   裁进字形）⑤字下柔光 bloom + 地面倒影（翻转、渐隐）。背后一抹极光余光 + 浮尘。
// - 白闪不是整屏均匀淡入，而是"光从字里炸出来"：蓄力段字标提亮、一条横向变形镜头眩光从字心拉开，
//   随后白色径向光团从字心 6f 内撑满全屏（二次 ease-in，越来越快）。
// - 定妆段用"曝光回落"代替淡入：白层 22f 内 quint-out 退去，像眼睛适应强光——底下扁平字标早已在位，
//   只带 1.03→1 的对焦收束；随后字标上方镜刻标志描出（取景框先揭开、琥珀斜切后划入）、
//   一根琥珀短线画出、品牌短句逐词升起，完成锁定画面（标志本身不上液态质感——品牌规范禁渐变/发光）。
//
// 时间表（30fps，共 120f）：
//   0–34    演出：液态词标在场（第 0 帧即有）、虹彩缓流、高光 6–34f 扫过一次、整幅 1→1.035 缓推
//   34–46   蓄力：字标 brightness 1→1.7、bloom 加强、横向眩光拉开（ease-in）
//   44–50   冲白：径向白团从字心撑满（二次 ease-in），50–54 纯白 hold（呼吸位）
//   54–76   曝光回落：白层 1→0（quint-out）；扁平字标 1.03→1 对焦
//   72–96   锁定：琥珀短线 72–86 画出、标志 74–96 描出、品牌短句 78f 起逐词升起
//   96–120  hold：极缓前推 1→1.01 定格
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, PITCH, ShotcraftMark } from '../../_fixtures/Brand';

export const WHITE_FLASH_LOGO_SIMPLIFY_CUT_DURATION = 120;

const L = LOOKS.aurora;
const WORD = BRAND.name; // 字标全小写
const FS = 190; // 15 字符的字标按画宽压字号（原 4 字母占位字标是 300）
const CY = 500; // 词标中心 y
const FLASH0 = 44;
const WHITE = 50; // 全白、换场帧
const RECOVER = 54;

// 扁平版的三个颜色：纸面 / 墨 / 强调色（换品牌时只改这三个）——video-shotcraft：剪辑纸 / 片场墨 / 镜琥珀
const PAPER: [string, string] = ['#f7f5f0', '#ebe7de'];
const FLAT_INK: string = BRAND.ink;
const FLAT_ACCENT: string = BRAND.amber;
const MARK = 124; // 锁定段字标上方的镜刻标志尺寸

const wordStyle: React.CSSProperties = {
  fontFamily: BRAND.font, fontSize: FS, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1, whiteSpace: 'nowrap',
};

// 字标文本：「ft」处 f 后不加字距，让两道横笔重叠——+0.03em 字距下两道横笔恰好相接，
// 大字号时接缝会露出一条抗锯齿亮线
const wordText = (
  <>{WORD.slice(0, WORD.lastIndexOf('f'))}<span style={{ letterSpacing: 0 }}>f</span>{WORD.slice(WORD.lastIndexOf('f') + 1)}</>
);

const IRIS = 'linear-gradient(100deg, #7c6bff 0%, #b18cff 16%, #f472b6 32%, #ffc6a8 46%, #8fdcff 62%, #7c6bff 78%, #c58cff 90%, #7c6bff 100%)';

const centered = (y: number): React.CSSProperties => ({
  position: 'absolute', left: 0, right: 0, top: y - FS * 0.5, height: FS, display: 'flex', justifyContent: 'center', alignItems: 'center',
});

// 液态词标（一个 span 上叠多层背景并全部 clip 到字形）
const LiquidWord: React.FC<{ frame: number; bright: number }> = ({ frame, bright }) => {
  const flow = (frame * 1.1) % 300;
  const sheen = ramp(frame, 6, 28, EASE.swift); // 斜向高光一次扫过
  const sx = mix(-30, 130, sheen);
  const layers = [
    // 斜向高光（只在 6–34f 出现）
    sheen > 0 && sheen < 1
      ? `linear-gradient(105deg, rgba(255,255,255,0) ${sx - 10}%, rgba(255,255,255,0.85) ${sx}%, rgba(255,255,255,0) ${sx + 10}%)`
      : 'linear-gradient(0deg, transparent, transparent)',
    // 镀铬地平线：字腰一道亮带 + 其下一道暗带
    'linear-gradient(180deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.34) 49%, rgba(255,255,255,0.1) 52%, rgba(40,10,70,0.28) 56%, rgba(40,10,70,0) 68%)',
    // 纵向体积：顶亮底暗
    'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 38%, rgba(20,5,40,0) 60%, rgba(20,5,40,0.45) 100%)',
    IRIS,
  ];
  return (
    <span style={{
      ...wordStyle,
      backgroundImage: layers.join(', '),
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 300% 100%',
      backgroundPosition: `0 0, 0 0, 0 0, ${flow}% 0`,
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      filter: bright > 1.001 ? `brightness(${bright.toFixed(3)}) saturate(${(1 / Math.sqrt(bright)).toFixed(3)})` : undefined,
      paddingBottom: 20,
    }}>{wordText}</span>
  );
};

export const WhiteFlashLogoSimplifyCut: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 演出段 ──
  const push = 1 + 0.035 * ramp(frame, 0, FLASH0, EASE.smooth);
  const charge = ramp(frame, 34, 12, EASE.exit); // 蓄力 0→1（越来越快）
  const bright = 1 + 0.7 * charge;
  const flare = ramp(frame, 34, 14, EASE.exit);

  // ── 冲白 ──
  const burst = ramp(frame, FLASH0, WHITE - FLASH0, (t) => t * t); // 径向白团半径（二次 ease-in：后 3 帧肉眼可见地吞掉字标）
  const whiteHold = frame >= WHITE && frame < RECOVER ? 1 : 0;
  const recover = 1 - ramp(frame, RECOVER, 22, EASE.out); // 曝光回落 1→0
  const whiteA = frame < WHITE ? burst : frame < RECOVER ? 1 : recover;

  // ── 定妆段 ──
  const focus = ramp(frame, RECOVER - 2, 26, EASE.snappy);
  const flatScale = mix(1.03, 1, focus) * (1 + 0.01 * ramp(frame, 96, 24, EASE.smooth));
  const rule = ramp(frame, 72, 14, EASE.snappy);
  const mark = ramp(frame, 74, 14, EASE.snappy); // 标志取景框揭开
  const cut = ramp(frame, 84, 12, EASE.snappy); // 琥珀斜切划入

  const dark = frame < WHITE;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: dark ? L.bg[1] : PAPER[0] }}>
      {dark ? (
        <>
          <Stage look={L} keyLight={{ x: 0.5, y: 0.2 }} fill={{ x: 0.82, y: 0.85 }} breathe={0.6}>
            <Dust look={L} count={36} seed={4} drift={0.2} opacity={0.5} />
            {/* 字后极光余光 */}
            <div style={{
              position: 'absolute', left: 360, right: 360, top: CY - 260, height: 520,
              background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#a78bfa', 0.28 + 0.25 * charge)} 0%, ${alpha('#f472b6', 0.08)} 45%, rgba(0,0,0,0) 72%)`,
            }} />
          </Stage>

          <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: `50% ${CY}px` }}>
            {/* bloom：同色模糊副本 */}
            <div style={{ ...centered(CY), opacity: 0.42 + 0.4 * charge, filter: 'blur(38px)' }}>
              <span style={{ ...wordStyle, backgroundImage: IRIS, backgroundSize: '300% 100%', backgroundPosition: `${(frame * 1.1) % 300}% 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{wordText}</span>
            </div>
            {/* 地面倒影：翻转 + 渐隐 */}
            <div style={{
              ...centered(CY + FS * 0.86), transform: 'scaleY(-1)', opacity: 0.22,
              WebkitMaskImage: 'linear-gradient(0deg, #000 0%, rgba(0,0,0,0.4) 30%, transparent 62%)',
              maskImage: 'linear-gradient(0deg, #000 0%, rgba(0,0,0,0.4) 30%, transparent 62%)',
            }}>
              <LiquidWord frame={frame} bright={bright} />
            </div>
            {/* 主词标 */}
            <div style={centered(CY)}>
              <LiquidWord frame={frame} bright={bright} />
            </div>
            {/* 横向变形眩光：从字心拉开 */}
            {flare > 0 && (
              <>
                {/* 眩光：宽而软的光晕 + 细亮核（核的两端渐隐，不加描边阴影——否则亮线会带一圈暗边） */}
                <div style={{
                  position: 'absolute', left: 960 - 1100 * flare, width: 2200 * flare, top: CY - 24, height: 48,
                  background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#e9e2ff', 0.55 * flare)} 0%, rgba(233,226,255,0) 100%)`,
                }} />
                <div style={{
                  position: 'absolute', left: 960 - 1000 * flare, width: 2000 * flare, top: CY - 2, height: 4,
                  background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${(0.95 * flare).toFixed(3)}) 50%, rgba(255,255,255,0) 100%)`,
                }} />
                <div style={{
                  position: 'absolute', left: 960 - 900 * flare, width: 1800 * flare, top: CY - 90, height: 180,
                  background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#d8ccff', 0.45 * flare)} 0%, rgba(216,204,255,0) 70%)`,
                }} />
              </>
            )}
          </div>
        </>
      ) : (
        <>
          {/* 纸面：冷白带一丝紫 + 顶部柔光 + 轻暗角 + 颗粒 */}
          <AbsoluteFill style={{ background: `linear-gradient(180deg, ${PAPER[0]} 0%, ${PAPER[1]} 100%)` }} />
          <AbsoluteFill style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)' }} />
          <Vignette strength={0.1} inner={0.5} color="#2a2620" />
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${flatScale.toFixed(5)})`, transformOrigin: `50% ${CY}px` }}>
            <div style={centered(CY)}>
              <span style={{ ...wordStyle, color: FLAT_INK, paddingBottom: 20 }}>{wordText}</span>
            </div>
            {/* 锁定：镜刻标志（取景框揭开 → 琥珀斜切划入）+ 琥珀短线 + 品牌短句 */}
            <div style={{ position: 'absolute', left: 960 - MARK / 2, top: CY - FS * 0.5 - 44 - MARK }}>
              <ShotcraftMark size={MARK} tone="light" frameProgress={mark} cutProgress={cut} />
            </div>
            <div style={{
              position: 'absolute', left: 960 - 48, top: CY + FS * 0.5 + 62, width: 96, height: 5, borderRadius: 3,
              background: FLAT_ACCENT, transform: `scaleX(${rule.toFixed(4)})`,
            }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: CY + FS * 0.5 + 106, textAlign: 'center', color: '#716d64', ...type(46, 480) }}>
              <TextReveal text={PITCH.en.motto} by="word" variant="rise" start={78} each={18} gap={4} />
            </div>
          </div>
          <Grain opacity={0.04} />
        </>
      )}

      {/* 白闪：先是从字心撑开的径向白团，满屏后整层白，再随曝光回落退去 */}
      {whiteA > 0.001 && (
        frame < WHITE ? (
          <AbsoluteFill style={{
            background: `radial-gradient(circle ${(80 + burst * 1500).toFixed(1)}px at 50% ${CY}px, rgba(255,255,255,1) 0%, rgba(255,255,255,${(0.6 + 0.4 * burst).toFixed(3)}) 55%, rgba(255,255,255,0) 100%)`,
            opacity: Math.min(1, burst * 1.4),
          }} />
        ) : (
          <AbsoluteFill style={{ background: '#ffffff', opacity: whiteHold ? 1 : whiteA }} />
        )
      )}
    </AbsoluteFill>
  );
};
