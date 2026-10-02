// multiplane parallax（轮 E）——真实页面拆 3 层深度横移：
// 背景整页（0.35x，微 blur 退后）+ 中景真实卡组（0.7x）+
// 前景浮块（1.4x，search 切片 + 高清卡，轻 blur 拉焦平面）。
// 系数克制（背景不动排版，卡组独立成层）防"排版散架"。
// 升级：每层都给齐深度锚——远景缩小一档 + 降饱和 + 空气薄雾（越远越淡），中景两层软影
// 落在"桌面"上、绝对清晰，前景放大一档 + 景深虚化 6px + 更深更远的落影 + 按速度的
// 横向运动模糊（掠过镜头时才拖影）；同一条 drive 位移乘各层系数，起停是零速 in-out。
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { Grain, SpeedBlur, Vignette, bezier, ramp, softShadow, velocity } from '../../_fixtures/Polish';

export const MULTIPLANE_DUR = 135;

const CARDS = layout.projects.cards.slice(0, 6);
const DRIVE = bezier(0.35, 0, 0.25, 1);
const driveAt = (f: number) => 1000 * ramp(f, 10, 115, DRIVE);

// 中景卡组：宽 420、间距 480；纵向错落按一条缓和的波（不是机械的奇偶 40px）
const MID_W = 420;
const MID_Y = [10, 46, 0, 38, 14, 50];

export const MultiplaneReal: React.FC = () => {
  const frame = useCurrentFrame();
  const drive = driveAt(frame);
  const vFg = -1.4 * velocity(driveAt, frame); // 前景屏幕速度（px/帧）

  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      {/* 背景层 0.35x：整页缩小一档（远）、退焦、降饱和；页面空白与底色同色，横移不露边 */}
      <AbsoluteFill style={{ transform: `translateX(${-drive * 0.35}px)`, filter: 'blur(3px) saturate(0.85)' }}>
        <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', left: 60, top: -150, width: 1820 }} />
      </AbsoluteFill>
      {/* 空气透视：远景之上一层同色薄雾，上部更浓（远处更"空"） */}
      <AbsoluteFill
        style={{ background: 'linear-gradient(180deg, rgba(249,246,241,0.62) 0%, rgba(249,246,241,0.42) 55%, rgba(249,246,241,0.5) 100%)' }}
      />
      {/* 中景层 0.7x：真实卡组横排（主阅读层，无 blur） */}
      <div style={{ position: 'absolute', left: 0, top: 330, transform: `translateX(${-drive * 0.7}px)` }}>
        {CARDS.map((c, k) => (
          <Img
            key={c.file}
            src={staticFile(`textures/live/${c.file}`)}
            style={{
              position: 'absolute', left: 200 + k * 480, top: MID_Y[k],
              width: MID_W, height: (MID_W * c.h) / c.w, borderRadius: 10,
              boxShadow: softShadow(14, { color: '#2a2218', strength: 1 }),
            }}
          />
        ))}
      </div>
      {/* 前景层 1.4x：浮块掠过镜头（更大、景深虚化、落影更深更远），只在快段带横向拖影 */}
      <SpeedBlur vx={vFg} amount={0.22} max={8}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-drive * 1.4}px)`, filter: 'blur(6px)' }}>
          <Img
            src={staticFile('textures/live/float-search.png')}
            style={{
              position: 'absolute', left: 880, top: 120, width: 960, height: (960 * 88) / 2032, borderRadius: 16,
              boxShadow: softShadow(40, { color: '#2a2218', strength: 1.2 }),
            }}
          />
          <Img
            src={staticFile('textures/live/card4-hires.png')}
            style={{
              position: 'absolute', left: 2060, top: 760, width: 560, height: (560 * 312) / 357, borderRadius: 13,
              boxShadow: softShadow(48, { color: '#2a2218', strength: 1.3 }),
            }}
          />
        </div>
      </SpeedBlur>
      <Vignette strength={0.14} inner={0.45} color="#2a2218" />
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};
