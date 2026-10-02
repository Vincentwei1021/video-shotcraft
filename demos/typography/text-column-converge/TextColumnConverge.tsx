// text-column-converge —— raycast-teams（实测素材 28–36s 段）重做版：
// 原片测量（1280 宽）：NEW 左缘钉死 x=412，特性词右缘钉死 x=867，
// 两词到左右屏边距相等（412 vs 413），轮换期间间距完全不收缩；
// 词换到 RAYCAST 后才发生唯一一次合拢——约 1.2s ease-in-out 连续滑动
// （左缘 412→554 / 右缘 867→725），"NEW RAYCAST" 以屏幕中线居中定格；
// 定格后约 0.6s，斜体 "COMING 2026" 在下方近乎硬切浮现。
//
// 质感升级（节拍/钉死/唯一合拢全部不动）：
// - 暗场不再是 #050506 死黑：带冷色相的深底 + 中线上方极淡顶光 + 暗角 + soft-light 颗粒。
// - 词换瞬间 1 帧提亮（原片的打字机换行感，>1f 读作故障所以只给 1f）。
// - NEW 轮换期是次级灰（像目录页标签），合拢过程中随进度提亮到与特性词同色——两半变成一句话。
// - 合拢滑动按真实速度给水平方向运动模糊（两词方向相反），静止为 0；落定后背后柔光微微亮起。
// - 斜体小字降为三级色，层级清楚；补导出时长常量（原工作台按 16f 推断，只剩开头半秒）。
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FONT, Grain, SpeedBlur, Vignette, ramp, EASE } from '../../_fixtures/Polish';

// 词轮换表：停留帧数不均（机器节奏），全程钉在右缘，不做间距收缩
const STEPS: { word: string; dur: number }[] = [
  { word: 'LAUNCHER DESIGN', dur: 16 },
  { word: 'COMPACT MODE', dur: 12 },
  { word: 'HOTKEY RECORDER', dur: 9 },
  { word: 'HOTKEY TYPES', dur: 8 },
  { word: 'VOICE FEATURES', dur: 7 },
  { word: 'SETTINGS DESIGN', dur: 8 },
  { word: 'AI CHAT', dur: 10 },
  { word: 'FILE SEARCH', dur: 12 },
  { word: 'RAYCAST', dur: 999 }, // 最后一词：停稳后触发唯一一次合拢
];

const START = 8; // 开场黑场立静

// 原片 1280 宽 → 1920 宽换算（×1.5）
const NEW_LEFT_EDGE = 618; // 412×1.5：NEW 左缘（= 左屏边距）
const WORD_RIGHT_EDGE = 1302; // 868×1.5：特性词右缘（= 右屏边距，1920-1302=618 对称）

const FS = 42; // 原片字高很小（720p 下 cap ~20px → 1080p ~30px → 字号 ~42）
const LSP = 3; // letterSpacing
// 合拢终点按本字体实际步进计算（监视器等宽：0.6em + letterSpacing），
// 保证 "NEW RAYCAST" 恰好一个空格咬合、整行居中于 960，不会重叠
const ADV = 0.6 * FS + LSP; // 每字符步进
const LINE_W = 11 * ADV; // "NEW RAYCAST" 共 11 字符
const MERGED_LEFT = 960 - LINE_W / 2; // 合拢后 NEW 左缘
const MERGED_RIGHT = 960 + LINE_W / 2; // 合拢后 RAYCAST 右缘
const CONVERGE_DUR = 36; // 合拢时长：原片 ~1.2s ≈ 36 帧
const CONVERGE_DELAY = 10; // RAYCAST 停稳后先静置 10 帧再合拢（原片 32.4→32.7s）
const SUB_DELAY = 18; // 合拢定格后 ~0.6s 出斜体小字

// 8f 黑场 + 82f 轮换 + 10f 停稳 + 36f 合拢 + 18f 定格 + 4f 小字 + 22f 静置 = 180f（6.0s）
export const TEXT_COLUMN_CONVERGE_DURATION = 180;

const INK = '#eeeef2';
const INK_NEW = '#8a8c96'; // 轮换期 NEW 的次级灰
const INK_SUB = '#a3a5ae';

// 合拢进度（以帧为自变量，供求速度）
const LAST_START = START + STEPS.slice(0, -1).reduce((a, s) => a + s.dur, 0);
const cvAt = (frame: number) =>
  interpolate(frame - LAST_START - CONVERGE_DELAY, [0, CONVERGE_DUR], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

// 简单 hex 混色（NEW 由次级灰提亮到主色）
const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`;
};

export const TextColumnConverge: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - START;

  // 定位当前步
  let acc = 0;
  let idx = 0;
  let stepStart = 0;
  for (let i = 0; i < STEPS.length; i++) {
    if (t >= acc) { idx = i; stepStart = acc; }
    acc += STEPS[i].dur;
  }
  const cur = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  const local = t - stepStart;

  // 唯一一次合拢：RAYCAST 停稳 CONVERGE_DELAY 帧后，ease-in-out 连续滑动
  const cvT = isLast ? local - CONVERGE_DELAY : -1;
  const cv = interpolate(cvT, [0, CONVERGE_DUR], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // NEW 左缘：618 → 831；特性词右缘：1302 → 1088
  const newLeft = interpolate(cv, [0, 1], [NEW_LEFT_EDGE, MERGED_LEFT]);
  const wordRight = interpolate(cv, [0, 1], [WORD_RIGHT_EDGE, MERGED_RIGHT]);

  const converged = cv >= 1;

  // 斜体小字：合拢定格后 SUB_DELAY 帧，近乎硬切（4 帧快速淡入，无位移）
  const subT = converged ? cvT - CONVERGE_DUR - SUB_DELAY : -1;
  const subOp = interpolate(subT, [0, 4], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const visible = t >= 0;

  const font: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontWeight: 500,
    fontSize: FS,
    letterSpacing: LSP,
    color: INK,
    whiteSpace: 'nowrap',
    lineHeight: 1,
  };

  // 词换瞬间 1 帧提亮（首词不闪）
  const flash = local === 0 && idx > 0 ? 1 : 0;
  const wordColor = flash ? '#ffffff' : INK;
  const wordGlow = flash ? '0 0 14px rgba(200,210,255,0.35)' : 'none';

  // 合拢速度（px/帧）→ 水平运动模糊；两词相向
  const span = MERGED_LEFT - NEW_LEFT_EDGE;
  const v = (cvAt(f + 0.5) - cvAt(f - 0.5)) * span;
  // 落定后背后柔光
  const glow = ramp(cvT, CONVERGE_DUR - 6, 24, EASE.out);

  return (
    <AbsoluteFill style={{ background: '#08090c', overflow: 'hidden' }}>
      {/* 冷色深底 + 中线上方极淡顶光 */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(120,130,170,0.10), rgba(120,130,170,0) 70%), ' +
            'linear-gradient(180deg, #0d0e12 0%, #08090c 60%, #060709 100%)',
        }}
      />
      {/* 合拢落定后背后柔光微亮 */}
      <div
        style={{
          position: 'absolute', left: 960 - 520, top: 540 - 150, width: 1040, height: 300,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(170,180,230,0.10), rgba(170,180,230,0) 70%)',
          opacity: glow,
        }}
      />
      {visible && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* NEW：左缘定位（轮换期间钉死在左屏边距处）；随合拢由次级灰提亮 */}
          <SpeedBlur vx={v} amount={0.35} max={4}>
            <div style={{
              ...font, position: 'absolute',
              left: newLeft, top: 519,
              color: mixHex(INK_NEW, INK, ramp(cvT, 0, CONVERGE_DUR * 0.8, EASE.smooth)),
            }}>
              NEW
            </div>
          </SpeedBlur>
          {/* 特性词：右缘定位（词换长换短，右缘不动） */}
          <SpeedBlur vx={-v} amount={0.35} max={4}>
            <div style={{
              ...font, position: 'absolute',
              right: 1920 - wordRight, top: 519,
              color: wordColor, textShadow: wordGlow,
            }}>
              {cur.word}
            </div>
          </SpeedBlur>

          {/* 斜体小字：合拢后在整行正下方浮现，与整行同左缘 */}
          <div style={{
            ...font,
            fontStyle: 'italic',
            color: INK_SUB,
            position: 'absolute',
            left: MERGED_LEFT, top: 519 + FS + 14,
            opacity: subOp,
          }}>
            COMING 2026
          </div>
        </div>
      )}
      <Vignette strength={0.5} inner={0.45} color="#000000" />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
