// hashtag-to-pill-materialize（bear-app 18–21.5s 的节奏骨架：两次硬切夹一次滑动）
//  1) 居中打字 "#music"：几何无衬线、朱红实心光标恒亮不闪、人手节奏
//  2) 实体化 = 1 帧硬切：文字+光标 → 宽大实体胶囊 + 音符图标 + "music"（# 被图标替换），仅 3f 1.03→1 微落定
//  3) hold ~0.6s → 一段 bezier 缩小左移，落进页面标签位（位置/缩放同曲线同起止）
//  4) 再 1 帧硬切揭示成品笔记页：底色 / 标题 / 正文 / 胶囊配色同帧全变，之后近乎静止收尾
//
// 第二轮重设计（墨夜 → 纸页 · 几何体排版）：
// - look = paper（暖白纸 + 墨 + 朱红）。前半段反用它的"墨"做暗场：暖墨色舞台 + 顶光 + 颗粒，打字字号放大到
//   180px（Futura 气质），朱红光标是画面唯一的颜色；第二记硬切时整页从墨夜翻成纸白——硬切的"啪"被明暗翻转放大。
// - 胶囊是"实体"：奶油色厚胶囊，受光上沿内高光 + 上亮下暗体积 + 两层暖色落地影，hero 时浮起，缩移中落地；
//   缩移段按速度给方向性运动模糊。落点是成品页标签行里的真实槽位（Q9），硬切前后像素重合。
// - 成品页做成完整版式（Q10）：左栏笔记应用「Tern」标签列表（#music 高亮且计数 12）、面包屑、120px 标题、
//   标签行（胶囊 + "Add tag" 幽灵按钮）、44px 正文三行、底部关联笔记行——全部可读（Q11）。
//
// 时间表（30fps，共 132f）：
//   0–8      墨色舞台 + 恒亮光标（开场即有画面）
//   8–~40    打 "#music"：5–7f/字（确定性抖动）
//   ~40–52   打完 hold
//   52       硬切实体化（+3f 1.03→1 微落定）；舞台顶光同帧提亮一档
//   52–72    hero hold 20f（浮起、影子大而虚）
//   72–88    缩小左移 16f，bezier(0.5,0,0.25,1)，0.3x 落进标签槽，后半程落地
//   91       硬切揭示成品页
//   91–132   hold 41f：极缓推镜 1 → 1.015
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, Grain, SpeedBlur, bezier, ramp, mix, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';

export const HASHTAG_TO_PILL_MATERIALIZE_DURATION = 132;

const L = LOOKS.paper;
const FUTURA = "Futura, 'Century Gothic', 'Avenir Next', 'Trebuchet MS', sans-serif";
const NIGHT = { top: '#2a211a', mid: '#1b1511', btm: '#110d0a' }; // 暖墨暗场
const CREAM = '#f3ead9';
const RED = L.accent; // 朱红：光标 / 图标 / 成品页高亮

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

const TEXT = '#music';
const TYPE_START = 8;
const rand = mulberry32(20261002);
const TYPE_AT: number[] = (() => {
  const at: number[] = [];
  let f = TYPE_START;
  for (let i = 0; i < TEXT.length; i++) {
    at.push(f);
    f += 5 + Math.floor(rand() * 3); // 5–7 帧/字
  }
  return at;
})();

const MORPH = 52;
const MOVE_START = 72;
const MOVE_END = 88;
const REVEAL = 91;

// 几何：胶囊按 hero 尺寸绘制，整体 transform 缩放
const FS = 180;
const PILL_W = 900, PILL_H = 300; // 宽大过头才有实体感，但左右留白要接近对称
const HERO = { x: 960, y: 540 };
const END_SCALE = 0.3;
// 成品页标签槽（胶囊中心）：主栏左缘 560 + 半宽
const SLOT = { x: 560 + (PILL_W * END_SCALE) / 2, y: 470 };
const moveEase = bezier(0.5, 0, 0.25, 1);

// 双八分音符（beamed）
const NoteIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }}>
    <ellipse cx="11" cy="39" rx="7.2" ry="5.6" fill={color} transform="rotate(-18 11 39)" />
    <ellipse cx="35" cy="35" rx="7.2" ry="5.6" fill={color} transform="rotate(-18 35 35)" />
    <rect x="15.4" y="12.5" width="3.2" height="27" fill={color} />
    <rect x="39.4" y="8.5" width="3.2" height="27" fill={color} />
    <polygon points="15.4,12.5 42.6,8.5 42.6,16.5 15.4,20.5" fill={color} />
  </svg>
);

// 胶囊（hero 尺寸）。lift = 离地高度（hero 坐标 px），落位归零
const Pill: React.FC<{ bg: string; icon: string; ink: string; lift: number; dark: boolean }> = ({ bg, icon, ink, lift, dark }) => {
  const sh = dark ? '0,0,0' : '120,60,30';
  return (
    <div style={{
      width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2, boxSizing: 'border-box',
      background: `linear-gradient(180deg, rgba(255,255,255,${dark ? 0.35 : 0.5}) 0%, rgba(255,255,255,0) 48%, rgba(60,30,10,0.05) 100%), ${bg}`,
      boxShadow: `inset 0 4px 0 rgba(255,255,255,0.75), inset 0 -4px 10px rgba(80,40,10,0.06), ` +
        `0 ${(2 + lift * 0.15).toFixed(1)}px ${(4 + lift * 0.4).toFixed(1)}px rgba(${sh},${(dark ? 0.35 : 0.06).toFixed(2)}), ` +
        `0 ${(lift * 1.4).toFixed(1)}px ${(lift * 3.6).toFixed(1)}px ${(-lift * 0.5).toFixed(1)}px rgba(${sh},${(lift * (dark ? 0.018 : 0.006)).toFixed(3)})`,
      display: 'flex', alignItems: 'center', paddingLeft: 118, gap: 64,
    }}>
      <NoteIcon size={136} color={icon} />
      <span style={{ fontFamily: FUTURA, fontSize: FS, fontWeight: 500, color: ink, letterSpacing: 2, lineHeight: 1 }}>music</span>
    </div>
  );
};

// 成品页：笔记应用 Tern
const NotePage: React.FC = () => {
  const tags = [
    { t: 'music', n: 12, on: true },
    { t: 'reading', n: 8 },
    { t: 'travel', n: 5 },
    { t: 'recipes', n: 3 },
  ];
  return (
    <>
      {/* 左栏 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 420, background: 'linear-gradient(180deg, #efe8db, #e9e1d2)',
        borderRight: `1px solid ${L.line}`, padding: '72px 44px', boxSizing: 'border-box', fontFamily: FUTURA,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 70 }}>
          <span style={{ width: 46, height: 46, borderRadius: 23, background: L.ink, display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: RED }} />
          </span>
          <span style={{ fontSize: 40, fontWeight: 700, color: L.ink }}>Tern</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.2em', color: L.ink3, marginBottom: 22 }}>TAGS</div>
        {tags.map((g) => (
          <div key={g.t} style={{
            height: 68, borderRadius: 16, display: 'flex', alignItems: 'center', padding: '0 20px', marginBottom: 6,
            background: g.on ? alpha(RED, 0.1) : 'transparent', color: g.on ? '#b8331f' : L.ink2, fontSize: 34, fontWeight: g.on ? 600 : 500,
          }}>
            <span style={{ opacity: 0.55, marginRight: 10 }}>#</span>{g.t}
            <span style={{ marginLeft: 'auto', fontSize: 28, color: g.on ? '#b8331f' : L.ink3 }}>{g.n}</span>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 44, right: 44, bottom: 70, display: 'flex', fontSize: 30, color: L.ink3 }}>
          All notes<span style={{ marginLeft: 'auto' }}>48</span>
        </div>
      </div>
      {/* 主栏 */}
      <div style={{ position: 'absolute', left: 560, right: 140, top: 0, bottom: 0, fontFamily: FUTURA }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 84, display: 'flex', alignItems: 'center', fontSize: 30, color: L.ink3, letterSpacing: 0.4 }}>
          <span>Notes</span><span style={{ margin: '0 16px' }}>/</span><span>Music</span>
          <span style={{ marginLeft: 'auto' }}>Edited just now</span>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 140, height: 1, background: L.line }} />
        <div style={{ position: 'absolute', left: -6, top: 196, fontSize: 132, fontWeight: 700, color: L.ink, letterSpacing: -2, lineHeight: 1 }}>
          Winter records
        </div>
        {/* 标签行：胶囊槽（由移动的胶囊占位）+ 幽灵按钮 */}
        <div style={{
          position: 'absolute', left: PILL_W * END_SCALE + 22, top: SLOT.y - 45, height: 90, padding: '0 34px', borderRadius: 45,
          border: `2px dashed ${alpha(L.ink, 0.18)}`, display: 'flex', alignItems: 'center', fontSize: 34, color: L.ink3, boxSizing: 'border-box',
        }}>+ Add tag</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 590, fontSize: 46, lineHeight: 1.42, color: L.ink2, fontWeight: 400 }}>
          Five albums on repeat since November — the ones I put on<br />
          when the city goes quiet and the radiator starts to tick.<br />
          Side B of the second one is the whole reason for this note.
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 84, display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: L.ink3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: RED }} />
          12 notes tagged <span style={{ color: '#b8331f', fontWeight: 600 }}>#music</span>
        </div>
      </div>
    </>
  );
};

export const HashtagToPillMaterialize: React.FC = () => {
  const frame = useCurrentFrame();

  const typedCount = TYPE_AT.filter((t) => frame >= t).length;
  const typed = TEXT.slice(0, typedCount);

  const moveAt = (f: number) => moveEase(Math.min(1, Math.max(0, (f - MOVE_START) / (MOVE_END - MOVE_START))));
  const pxAt = (f: number) => mix(HERO.x, SLOT.x, moveAt(f));
  const pyAt = (f: number) => mix(HERO.y, SLOT.y, moveAt(f));
  const moveT = moveAt(frame);
  const px = pxAt(frame);
  const py = pyAt(frame);
  const ps = mix(1, END_SCALE, moveT);
  const vx = velocity(pxAt, frame);
  const vy = velocity(pyAt, frame);
  const lift = 16 * (1 - Math.min(1, Math.max(0, (moveT - 0.35) / 0.65)));
  const settle = frame >= MORPH ? mix(1.03, 1, ramp(frame, MORPH, 3, EASE.out)) : 1;

  const revealed = frame >= REVEAL;
  const lit = frame >= MORPH; // 实体化同帧舞台提亮一档（硬切，不渐变）
  const push = revealed ? mix(1, 1.015, ramp(frame, REVEAL, 41, EASE.swift)) : 1;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: revealed ? L.bg[1] : NIGHT.mid }}>
      {revealed ? (
        <Stage look={L} keyLight={{ x: 0.62, y: 0.1 }} fill={null} vignette={0.12} grain={0.05} />
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${NIGHT.top}, ${NIGHT.mid} 55%, ${NIGHT.btm})` }}>
          <AbsoluteFill style={{
            background: `radial-gradient(ellipse 52% 58% at 50% 34%, rgba(255,226,190,${lit ? 0.16 : 0.1}) 0%, rgba(255,226,190,0) 72%)`,
          }} />
          {/* 地面光池：胶囊浮起时它在下方投出一团暖光 */}
          <AbsoluteFill style={{
            background: `radial-gradient(ellipse 34% 12% at 50% 76%, rgba(255,200,150,${lit ? 0.08 : 0.03}) 0%, rgba(255,200,150,0) 70%)`,
          }} />
          <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 46%, rgba(0,0,0,0) 45%, rgba(5,3,2,0.55) 100%)' }} />
          <Grain opacity={0.1} blend="soft-light" />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '50% 40%' }}>
        {revealed && <NotePage />}

        {/* 打字层：文字 + 恒亮朱红光标（不闪），实体化帧整体消失 */}
        {frame < MORPH && (
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', transform: 'translateY(-6px)' }}>
              <span style={{
                fontFamily: FUTURA, fontSize: FS, fontWeight: 500, color: CREAM, letterSpacing: 2, whiteSpace: 'pre', lineHeight: 1,
                textShadow: '0 2px 30px rgba(255,210,160,0.12)',
              }}>
                {typed}
              </span>
              <span style={{ display: 'inline-block', width: 9, height: 206, background: RED, marginLeft: 12, borderRadius: 3, boxShadow: `0 0 24px ${alpha(RED, 0.5)}` }} />
            </div>
          </AbsoluteFill>
        )}

        {/* 胶囊层：1 帧硬切出现 → hold → 缩移落槽 → 揭示帧同帧换配色 */}
        {frame >= MORPH && (
          <SpeedBlur vx={vx} vy={vy} amount={0.1} max={8}>
            <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${px}px, ${py}px) scale(${ps * settle})` }}>
              {/* origin 0 0 + translate 先行：缩放绕目标中心，落位不漂移 */}
              <div style={{ transform: 'translate(-50%, -50%)' }}>
                {revealed
                  ? <Pill bg="#fbe4db" icon={RED} ink="#a92e1b" lift={0} dark={false} />
                  : <Pill bg={CREAM} icon={RED} ink="#2a1d12" lift={lift} dark />}
              </div>
            </div>
          </SpeedBlur>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
