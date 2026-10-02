// hashtag-to-pill-materialize（bear-app 18–21.5s 重做版，按原片密帧逐帧对照）
// 原片实测节奏（25fps 逐帧）：
//  1) 白底居中打字 "#music"：几何无衬线（Futura 气质）、中灰墨色、红色实心光标恒亮不闪、人手节奏
//  2) 实体化 = 1 帧硬切：文字+光标 → 宽大浅灰无描边胶囊 + 灰色双八分音符图标 + "music"（字号不变，#被图标替换）
//  3) 停约 0.6s → 整体平滑缩小（→~0.55x）并左移落到页面标签位（约 0.55s，easeInOut）
//  4) 再 1 帧硬切揭示成品笔记页：奶油底、墨绿大标题 "My favorite shots"、胶囊换成鼠尾草绿、正文三行——
//     原片没有"胶囊飞入下方滑入卡片"的段落（批次 8 的飞行段为杜撰，已砍）
// 质感升级：两张底都换成带极淡纸感的渐变 + 颗粒（防大面积纯色死平）；胶囊是"实体"——受光上沿
// 内高光 + 微体积渐变 + 离地软影（hero 时浮起 10px，缩移中随落位降到 0，归位即"嵌进"页面）；
// 缩移段按速度给方向性运动模糊；成品页补一行页眉元信息（面包屑 + 编辑时间），版式完整。
// 两次硬切、缩移曲线与全部时间点不变。
// 品牌轮：话题词 "#music" → "#shots"（与原词等长，胶囊版式不变），音符图标换场记板，
// 成品页讲 video-shotcraft 的镜头（标题 "My favorite shots"，正文点名 video-shotcraft）。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { Grain, SpeedBlur, velocity } from '../../_fixtures/Polish';

// 揭示 83f 后真静止 37f（≈1.2s 呼吸，R1），全段 4s
export const HASHTAG_TO_PILL_MATERIALIZE_DURATION = 120;
const FONT = "Futura, 'Century Gothic', 'Avenir Next', 'Trebuchet MS', sans-serif";

const C = {
  bgWhite: 'linear-gradient(180deg, #fdfdfc 0%, #fbfbfa 60%, #f6f6f3 100%)',
  bgCream: 'linear-gradient(180deg, #f6f3e8 0%, #f3f0e4 55%, #eeeadc 100%)',
  meta: '#a7a392',
  ink: '#454543',
  cursor: '#e0453f',
  pillGray: '#e9e9e7',
  pillTextGray: '#4b4b49',
  iconGray: '#7e7e7c',
  pillSage: '#d5e0cf',
  iconSage: '#5c7a63',
  titleGreen: '#2d5c47',
  pillSageText: '#3f5e4c',
  body: '#4c4b43',
};

// ---- mulberry32（仅用于打字节奏的人手抖动，确定性）----
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEXT = '#shots';
// 打字起点 & 每字间隔（帧），4–8 帧带抖动，模拟原片真人节奏
const TYPE_START = 8;
const rand = mulberry32(20260717);
const TYPE_AT: number[] = (() => {
  const at: number[] = [];
  let f = TYPE_START;
  for (let i = 0; i < TEXT.length; i++) {
    at.push(f);
    f += 4 + Math.floor(rand() * 3); // 4–6 帧（原片 ~6字/秒）
  }
  return at;
})();

// ---- 时间轴（30fps，共 132 帧，节奏对齐原片 18–21.5s）----
const MORPH = 48;       // 1 帧硬切实体化（打完 hold ~0.5s，原片 0.45s）
const MOVE_START = 66;  // 胶囊开始缩小左移（morph 后 0.6s，原片同）
const MOVE_END = 80;    // 落位（0.47s，原片 ~0.45s）
const REVEAL = 83;      // 1 帧硬切揭示成品页，之后静置收尾

// ---- 几何（1920x1080，等比换算自原片 1280x720 实测像素）----
const FS = 132;                       // 打字/胶囊文字字号（原片 glyph 等高换算）
const HERO = { x: 960, y: 540 };      // 大胶囊中心
const PILL_W = 740, PILL_H = 236;     // 原片实测 493x157 @720p ×1.5
const END_SCALE = 0.554;              // 落位缩放（原片 273/493）
const SLOT = { x: 361, y: 473 };      // 标签位中心（原片灰胶囊落点 (244.5,317.5)×1.5 与揭示位折中）

// 场记板图标（实心剪影，与原音符图标同一视觉重量）：板身 + 左铰链翘起的拍板，拍板斜纹用遮罩镂空
const ClapperIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }}>
      <defs>
        <mask id={`k${id}`}>
          <rect x="0" y="0" width="48" height="48" fill="#fff" />
          {[0, 1, 2].map((i) => (
            <polygon key={i} points={`${11 + i * 10},8 ${15.5 + i * 10},8 ${19.5 + i * 10},18 ${15 + i * 10},18`} fill="#000" />
          ))}
        </mask>
      </defs>
      <rect x="4" y="21" width="40" height="23" rx="3.5" fill={color} />
      <g transform="rotate(-17 5 19.5)">
        <rect x="4" y="9" width="40" height="9" rx="2" fill={color} mask={`url(#k${id})`} />
      </g>
    </svg>
  );
};

// 胶囊（大字号绘制，整体 transform 缩放，保证实体化前后文字原位等大）
// lift = 离地高度（大字号坐标 px）：hero 时浮起，落位时归零贴进页面
const Pill: React.FC<{ bg: string; iconColor: string; textColor: string; lift: number }> = ({ bg, iconColor, textColor, lift }) => (
  <div style={{
    width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2,
    // 无描边：实体感来自上亮下暗的微体积 + 顶沿内高光 + 离地软影（不是边框）
    background: `linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 46%, rgba(0,0,0,0.025) 100%), ${bg}`,
    boxShadow: `inset 0 3px 0 rgba(255,255,255,0.7), inset 0 -2px 0 rgba(40,40,30,0.03), ` +
      `0 ${(1 + lift * 0.12).toFixed(1)}px ${(2 + lift * 0.3).toFixed(1)}px rgba(40,40,30,${(0.04 + lift * 0.003).toFixed(3)}), ` +
      `0 ${(lift * 1.6).toFixed(1)}px ${(lift * 4).toFixed(1)}px ${(-lift * 0.6).toFixed(1)}px rgba(40,40,30,${(lift * 0.009).toFixed(3)})`,
    display: 'flex', alignItems: 'center', paddingLeft: 96, boxSizing: 'border-box', gap: 66,
  }}>
    <ClapperIcon size={104} color={iconColor} />
    <span style={{ fontSize: FS, fontWeight: 500, color: textColor, letterSpacing: 2 }}>shots</span>
  </div>
);

export const HashtagToPillMaterialize: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- 打字 ----
  const typedCount = TYPE_AT.filter((t) => frame >= t).length;
  const typed = TEXT.slice(0, typedCount);

  // ---- 缩小左移 ----
  const moveAt = (f: number) => interpolate(f, [MOVE_START, MOVE_END], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.5, 0, 0.25, 1),
  });
  const pxAt = (f: number) => interpolate(moveAt(f), [0, 1], [HERO.x, SLOT.x]);
  const pyAt = (f: number) => interpolate(moveAt(f), [0, 1], [HERO.y, SLOT.y]);
  const moveT = moveAt(frame);
  const px = pxAt(frame);
  const py = pyAt(frame);
  const ps = interpolate(moveT, [0, 1], [1, END_SCALE]);
  // 缩移峰值 ~70px/帧：按速度沿运动方向给拖影，起止处速度→0 自动无模糊
  const vx = velocity(pxAt, frame);
  const vy = velocity(pyAt, frame);
  // 离地：hero hold 时浮 10px，缩移后半程降落，落位贴平（Q9：归位即嵌入页面）
  const lift = 10 * (1 - interpolate(moveT, [0.35, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  // 实体化瞬间极轻微落定（原片近乎硬切，仅 3 帧 1.03→1，避免死板）
  const settle = interpolate(frame, [MORPH, MORPH + 3], [1.03, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });

  const revealed = frame >= REVEAL;

  return (
    <AbsoluteFill style={{ background: revealed ? C.bgCream : C.bgWhite, fontFamily: FONT }}>
      {/* 成品页（硬切揭示，之后全静） */}
      {revealed && (
        <>
          {/* 页眉元信息：面包屑 + 编辑时间，让"成品页"版式完整（辅助文字 32px，低对比不抢标题） */}
          <div style={{
            position: 'absolute', left: 164, right: 160, top: 86, display: 'flex', alignItems: 'center',
            fontSize: 32, fontWeight: 500, color: C.meta, letterSpacing: 0.6,
          }}>
            <span>Notes</span>
            <span style={{ margin: '0 18px', opacity: 0.7 }}>/</span>
            <span>Shots</span>
            <span style={{ marginLeft: 'auto' }}>Edited just now</span>
          </div>
          <div style={{
            position: 'absolute', left: 164, right: 160, top: 144, height: 1,
            background: 'linear-gradient(90deg, rgba(120,112,80,0.16), rgba(120,112,80,0.06))',
          }} />
          <div style={{
            position: 'absolute', left: 160, top: 168,
            fontSize: 122, fontWeight: 700, color: C.titleGreen, letterSpacing: 0.5,
          }}>
            My favorite shots
          </div>
          <div style={{
            position: 'absolute', left: 152, top: 618,
            fontSize: 70, fontWeight: 500, color: C.body, lineHeight: 1.33, letterSpacing: 0.3,
          }}>
            A few camera moves I keep stealing from<br />
            video-shotcraft: the crash zoom, the orbit,<br />
            the whip pan. Welcome. Bring popcorn.
          </div>
        </>
      )}

      {/* 打字层：文字 + 恒亮红光标（原片光标不闪烁），实体化帧整体消失 */}
      {frame < MORPH && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: FS, fontWeight: 500, color: C.ink, letterSpacing: 2, whiteSpace: 'pre' }}>
              {typed}
            </span>
            <span style={{
              display: 'inline-block', width: 7, height: 150,
              background: C.cursor, marginLeft: 8, borderRadius: 2,
            }} />
          </div>
        </AbsoluteFill>
      )}

      {/* 胶囊层：实体化 1 帧硬切出现 → hold → 缩小左移落位 → 揭示帧换鼠尾草绿 */}
      {frame >= MORPH && (
        <SpeedBlur vx={vx} vy={vy} amount={0.1} max={7}>
        <div style={{
          position: 'absolute', left: 0, top: 0,
          // origin 必须是 0 0：translate 先把原点送到目标中心，scale 绕该点缩放，
          // 否则默认 50% 50% 会让落位时中心漂移 (1-s)*半宽
          transformOrigin: '0 0',
          transform: `translate(${px}px, ${py}px) scale(${ps * settle})`,
        }}>
          <div style={{ transform: 'translate(-50%, -50%)' }}>
            {revealed
              ? <Pill bg={C.pillSage} iconColor={C.iconSage} textColor={C.pillSageText} lift={0} />
              : <Pill bg={C.pillGray} iconColor={C.iconGray} textColor={C.pillTextGray} lift={lift} />}
          </div>
        </div>
        </SpeedBlur>
      )}
      {/* 极弱纸面颗粒：防大面积浅底色带，揭示帧随底色一起硬切（同一层，不做过渡） */}
      <Grain opacity={0.05} step={2} />
    </AbsoluteFill>
  );
};
