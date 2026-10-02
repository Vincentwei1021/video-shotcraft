// crash-zoom 急推——真实 projects 页全景一拍推到 card4（高清纹理槽位）。
// 节拍：0–32 全景 hold（极缓 creep 1→1.02，机位"活着"但不晃）→ 32–40 预备回拉
// （zoom 回退 ~3%，蓄力）→ 40–46 急推 6f（强 ease-in，速度峰值落在到位帧，冲到 2.6x）
// → 46–56 过冲回弹（阻尼余弦 2.6→2.45，一次可见回弹、微下冲 <1% 收干）→ 56–120 特写真静止。
// 运动模糊：自写的时间采样（同一镜头在快门窗口内的 N 个子帧姿态等权叠加），只给 40–47 急推段，
// 替代 CameraMotionBlur（其半透明叠层在静止帧会让底色发灰/偏黄）。
// 点名：到位后周边页面极轻压暗 + 目标卡生出两层软影（浮起 ~8px），视线被按在目标卡上。
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, Vignette, mix, ramp, softShadow } from '../../_fixtures/Polish';

export const CRASHZOOM_DUR = 120;

// card4 中心（页面空间）：x=781+357/2≈960, y=616+312/2=772
const CARD = layout.projects.cards[3];
const TARGET = { cx: CARD.x + CARD.w / 2, cy: CARD.y + CARD.h / 2 };
const VIEW_Y = 180; // 全景观察窗顶（页面 y）
const CARD_R = 8.5; // 截图里卡片圆角（页面 px）

const PUSH = 40; // 急推起点
const HIT = 46; // 到位帧（6f 急推）
const PEAK = 2.6; // 急推冲到的峰值
const REST = 2.45; // 回弹后落定倍率

// 相机姿态是帧（可小数）的纯函数：给运动模糊子帧采样用
const camAt = (f: number) => {
  // 全景 creep：0→32 极缓推近 2%（smooth 起止零速度）
  const creep = mix(1, 1.02, ramp(f, 0, 32, EASE.smooth));
  // 预备：32→40 回拉到 0.99（先退后冲）
  const wind = mix(creep, 0.99, ramp(f, 32, 8, EASE.smooth));
  let zoom = wind;
  if (f >= PUSH && f < HIT) {
    // 急推：quart-in 级加速，速度峰值在到位帧——"砸"上去
    zoom = mix(0.99, PEAK, ramp(f, PUSH, HIT - PUSH, EASE.exit));
  } else if (f >= HIT) {
    // 过冲回弹：阻尼余弦，t=0 在峰值，半周期 5.2f 回到 REST 附近（微下冲 0.6%），~10f 收干
    const t = f - HIT;
    zoom = REST + (PEAK - REST) * Math.exp(-t / 2.2) * Math.cos((Math.PI * t) / 5.2);
  }
  // 机位中心：creep 段已轻微偏向目标，急推段同曲线收敛到目标中心
  const k = f < PUSH ? ramp(f, 0, 32, EASE.smooth) * 0.04 : mix(0.04, 1, ramp(f, PUSH, HIT - PUSH, EASE.exit));
  const cx = mix(960, TARGET.cx, k);
  const cy = mix(VIEW_Y + 540, TARGET.cy, k);
  return { zoom, cx, cy };
};

const Page: React.FC<{ f: number; lift: number }> = ({ f, lift }) => {
  const { zoom, cx, cy } = camAt(f);
  return (
    <div
      style={{
        position: 'absolute', width: 1920, height: layout.projects.pageH,
        transform: `translate(${960 - cx * zoom}px, ${540 - cy * zoom}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', width: 1920 }} />
      {/* 点名压暗：卡片外一圈极大 spread 的影子当遮罩，周边页面轻压 ~7%，目标卡保持原亮度 */}
      {lift > 0.001 && (
        <div
          style={{
            position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h,
            borderRadius: CARD_R,
            boxShadow: `0 0 0 4000px rgba(38,32,24,${(0.07 * lift).toFixed(3)}), ${softShadow(8 * lift, { color: '#2a2218', strength: 1.1 })}`,
          }}
        />
      )}
      {/* 高清目标卡覆盖原位，放大后文字仍锐（Q2） */}
      <Img
        src={staticFile('textures/live/card4-hires.png')}
        style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD_R }}
      />
    </div>
  );
};

// 快门窗口内等权叠加：第 i 层不透明度 1/(i+1)，逐层 over 合成后恰为算术平均（底层不透明）。
// 子帧数按本帧位移自适应：画面边缘在快门窗口内走过的像素 / 14px（回波间距 ≤ 小字字高），封顶 40。
const SHUTTER = 0.55; // 帧（≈200° 快门）
const samplesAt = (f: number) => {
  const a = camAt(f), b = camAt(f - SHUTTER);
  const edge = Math.abs(a.zoom - b.zoom) * 1100 + Math.hypot(a.cx * a.zoom - b.cx * b.zoom, a.cy * a.zoom - b.cy * b.zoom);
  return Math.max(1, Math.min(40, Math.ceil(edge / 14)));
};

export const CrashZoomReal: React.FC = () => {
  const frame = useCurrentFrame();
  // 点名：到位后 14f 内压暗/浮起渐入（snappy），与回弹同步收
  const lift = ramp(frame, HIT - 1, 14, EASE.out);
  // 急推段画面收边：暗角随推进加深（0.08→0.24），落定后退到 0.12 只留一层很轻的
  const vig = 0.08 + 0.16 * ramp(frame, PUSH, HIT - PUSH, EASE.exit) - 0.12 * ramp(frame, HIT, 18, EASE.out);
  const n = frame >= PUSH && frame <= HIT + 1 ? samplesAt(frame) : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      {n > 1 ? (
        Array.from({ length: n }, (_, i) => (
          <AbsoluteFill key={i} style={{ opacity: 1 / (i + 1) }}>
            <Page f={frame - (SHUTTER * i) / (n - 1)} lift={lift} />
          </AbsoluteFill>
        ))
      ) : (
        <Page f={frame} lift={lift} />
      )}
      <Vignette strength={vig} inner={0.42} color="#2a2218" cy={0.5} />
    </AbsoluteFill>
  );
};
