// basic-3d-scene — Impress 3D Steps 空间步进（motion-lab 定稿转原生 Remotion）
// impress.js 式演示：卡片散布 3D 空间各处（不同 xyz+旋转+缩放），相机依次飞到
// 每个 Step 的姿态对齐观看；核心配方 camera = stepTransform.inverse()，
// 非当前 step 半透明+模糊做 enter/exit。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BASIC_3D_SCENE_DURATION = 180; // 6000ms @30fps

// 每个 step：位置 + 姿态 + 缩放（相机将取其逆）
const POSES = [
  { x: 0,   y: 0,   z: 0,    rx: 0, ry: 0,   rz: 0,  s: 1,   hue: 215, tt: 'STEP 01',  sub: 'Position the idea' },
  { x: 520, y: -60, z: -180, rx: 0, ry: -40, rz: 0,  s: 1,   hue: 265, tt: 'STEP 02',  sub: 'Rotate the view' },
  { x: 160, y: 300, z: -520, rx: 0, ry: 0,   rz: 90, s: 1,   hue: 165, tt: 'STEP 03',  sub: 'Spin the frame' },
  { x: 220, y: 90,  z: -260, rx: 0, ry: 0,   rz: 0,  s: 3.1, hue: 25,  tt: 'OVERVIEW', sub: 'See everything' },
];

// 飞行时刻表：0 停在 step0，之后三段飞行
const FLY_AT = [0.22, 0.48, 0.76];
const FLY = 0.16;

export const Basic3DScene: React.FC = () => {
  const t = useT();

  // activeFloat = 已完成的飞行进度之和 → 当前相机在哪个 step 之间
  let af = 0;
  const cam = { ...POSES[0] };
  for (let i = 0; i < FLY_AT.length; i++) {
    const f = seg(t, FLY_AT[i], FLY_AT[i] + FLY, E.inOutCubic);
    af += f;
    const p = POSES[i + 1];
    cam.x = lerp(f, cam.x, p.x); cam.y = lerp(f, cam.y, p.y); cam.z = lerp(f, cam.z, p.z);
    cam.rx = lerp(f, cam.rx, p.rx); cam.ry = lerp(f, cam.ry, p.ry); cam.rz = lerp(f, cam.rz, p.rz);
    cam.s = lerp(f, cam.s, p.s);
  }
  // overview 段进度（此时全部卡片点亮）
  const over = seg(t, FLY_AT[2], FLY_AT[2] + FLY);

  return (
    <DesignStage bg="#0a0b10">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 50% 40%,#141828 0%,#0a0b10 70%)',
          perspective: '1000px',
        }}
      >
        {/* world：相机 = 场景逆变换 —— 先反平移，再反旋转，再 1/scale */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transform: `scale(${1 / cam.s})
              rotateZ(${-cam.rz}deg) rotateY(${-cam.ry}deg) rotateX(${-cam.rx}deg)
              translate3d(${-cam.x}px,${-cam.y}px,${-cam.z}px)`,
          }}
        >
          {POSES.map((p, i) => {
            const last = i === POSES.length - 1;
            // enter/exit：距当前视点越远越暗越糊（overview 时全部点亮）
            const d = Math.min(1, Math.abs(af - i));
            const focus = Math.max(1 - d, over);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: last ? -160 : -110,
                  top: last ? -100 : -70,
                  width: last ? 320 : 220,
                  height: last ? 200 : 140,
                  boxSizing: 'border-box',
                  borderRadius: 10,
                  padding: '18px 20px',
                  willChange: 'opacity,filter',
                  background: `linear-gradient(150deg,hsl(${p.hue},45%,16%),hsl(${p.hue},55%,9%))`,
                  border: `1px solid hsl(${p.hue},60%,34%)`,
                  boxShadow: `0 18px 50px rgba(0,0,0,.55), inset 0 1px 0 hsla(${p.hue},70%,70%,.25)`,
                  transform: `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s / (last ? 2.2 : 1)})`,
                  fontFamily: '-apple-system,system-ui,sans-serif',
                  color: '#eef1f8',
                  opacity: 0.28 + focus * 0.72,
                  filter: `blur(${(1 - focus) * 3.5}px)`,
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: 3, color: `hsl(${p.hue},80%,68%)`, fontWeight: 700 }}>
                  {p.tt}
                </div>
                <div style={{ fontSize: last ? 26 : 21, fontWeight: 800, marginTop: 8 }}>{p.sub}</div>
                <div style={{ marginTop: 12, height: 5, width: '56%', borderRadius: 3, background: `hsl(${p.hue},70%,45%)` }} />
                <div style={{ marginTop: 7, height: 5, width: '34%', borderRadius: 3, background: `hsla(${p.hue},50%,60%,.4)` }} />
              </div>
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};
