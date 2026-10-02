// basic-3d-scene — Impress 3D Steps 空间步进（motion-lab 定稿转原生 Remotion）
// impress.js 式演示：卡片散布 3D 空间各处（不同 xyz+旋转+缩放），相机依次飞到
// 每个 Step 的姿态对齐观看；核心配方 camera = stepTransform.inverse()，
// 非当前 step 半透明+模糊做 enter/exit。
// 设计坐标 480×270（DesignStage 等比放大，raster="zoom" 按目标尺寸栅格化，字不糊），
// 参数表数值以此坐标系标定。
// 升级：四色彩虹卡 + 灰条占位 → 统一深色材质卡（发丝线、内高光、两层深色软影）+ 单一靛蓝
// 强调色，卡内是出版级内容（步号徽标 / 标题 / 一句说明 / 进度点）；世界里铺一张远景点阵平面，
// 相机飞行时有空间参照与视差；飞行段做时间采样运动模糊，落位后当前卡微微浮起；总览卡缩成
// "标题牌"并让开前景卡，四卡同框无文字被压。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { DesignStage, lerp, seg } from '../../_fixtures/Motion';
import { Backdrop, FONT, bezier } from '../../_fixtures/Polish';

export const BASIC_3D_SCENE_DURATION = 180; // 6000ms @30fps

// 每个 step：位置 + 姿态 + 缩放（相机将取其逆）
const POSES = [
  { x: 0,   y: 0,   z: 0,    rx: 0, ry: 0,   rz: 0,  s: 1,   tt: 'STEP', no: '01', sub: 'Position the idea', note: 'Each card owns its x · y · z.', chips: ['x 0', 'y 0', 'z 0'] },
  { x: 520, y: -60, z: -180, rx: 0, ry: -40, rz: 0,  s: 1,   tt: 'STEP', no: '02', sub: 'Rotate the view',   note: 'The world turns 40° to meet it.', chips: ['x 520', 'ry −40°'] },
  { x: 160, y: 300, z: -520, rx: 0, ry: 0,   rz: 90, s: 1,   tt: 'STEP', no: '03', sub: 'Spin the frame',    note: 'Rolled 90°, read upright.', chips: ['z −520', 'rz 90°'] },
  { x: 235, y: 90,  z: -260, rx: 0, ry: 0,   rz: 0,  s: 3.1, tt: 'OVERVIEW', no: '', sub: 'See everything', note: 'Three steps, one space.', chips: [] as string[] },
];
// 总览卡内容预除系数：总览时它是"标题牌"而非巨物（2.9 让开两侧的 STEP 01 / 02 卡）
const OVER_DIV = 2.9;

// 飞行时刻表：0 停在 step0，之后三段飞行
const FLY_AT = [0.22, 0.48, 0.76];
const FLY = 0.16;
const FLY_EASE = bezier(0.62, 0, 0.22, 1); // 起步稳、落位更软的不对称 in-out

const C = {
  ink1: '#eef0f6',
  ink2: '#9ca2b4',
  ink3: '#5d6376',
  accent: '#8b8cff',
};

// 相机姿态（t 的纯函数：运动模糊子帧采样用）
const camAt = (t: number) => {
  let af = 0;
  const cam = { x: POSES[0].x, y: POSES[0].y, z: POSES[0].z, rx: 0, ry: 0, rz: 0, s: 1 };
  for (let i = 0; i < FLY_AT.length; i++) {
    const f = seg(t, FLY_AT[i], FLY_AT[i] + FLY, FLY_EASE);
    af += f;
    const p = POSES[i + 1];
    cam.x = lerp(f, cam.x, p.x); cam.y = lerp(f, cam.y, p.y); cam.z = lerp(f, cam.z, p.z);
    cam.rx = lerp(f, cam.rx, p.rx); cam.ry = lerp(f, cam.ry, p.ry); cam.rz = lerp(f, cam.rz, p.rz);
    cam.s = lerp(f, cam.s, p.s);
  }
  return { cam, af };
};

// 卡片内容
const CardBody: React.FC<{ i: number; focus: number }> = ({ i, focus }) => {
  const p = POSES[i];
  const over = i === POSES.length - 1;
  const acc = `rgba(139,140,255,${(0.45 + 0.55 * focus).toFixed(3)})`;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {!over && (
          <div
            style={{
              height: 13, minWidth: 18, padding: '0 4px', borderRadius: 4, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `rgba(139,140,255,${(0.08 + 0.1 * focus).toFixed(3)})`,
              border: `0.5px solid rgba(139,140,255,${(0.2 + 0.3 * focus).toFixed(3)})`,
              font: `600 7px/1 ${FONT.mono}`, color: acc, fontVariantNumeric: 'tabular-nums',
            }}
          >
            {p.no}
          </div>
        )}
        <div style={{ font: `600 6.4px/1 ${FONT.sans}`, letterSpacing: '0.16em', color: C.ink3 }}>{p.tt}</div>
        <div style={{ marginLeft: 'auto', font: `500 6px/1 ${FONT.mono}`, color: C.ink3, fontVariantNumeric: 'tabular-nums' }}>
          {over ? '3 / 3' : `${p.no} / 03`}
        </div>
      </div>
      <div style={{ marginTop: 12, font: `700 ${over ? 25 : 19}px/1.08 ${FONT.sans}`, letterSpacing: '-0.025em', color: C.ink1 }}>{p.sub}</div>
      <div style={{ marginTop: 6, font: `450 ${over ? 9.5 : 8.6}px/1.3 ${FONT.sans}`, letterSpacing: '-0.005em', color: C.ink2 }}>{p.note}</div>
      {/* 姿态读数：这张卡自己的 pose（camera 取其逆）——等宽小 chip */}
      {!over && (
        <div style={{ marginTop: 11, display: 'flex', gap: 4 }}>
          {p.chips.map((c) => (
            <div
              key={c}
              style={{
                height: 12, padding: '0 5px', borderRadius: 3.5, display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                font: `500 6.4px/1 ${FONT.mono}`, color: C.ink2, fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c}
            </div>
          ))}
        </div>
      )}
      {/* 总览卡：三步目录 */}
      {over && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          {POSES.slice(0, 3).map((q) => (
            <div key={q.no} style={{ flex: 1, padding: '7px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.035)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ font: `600 6.4px/1 ${FONT.mono}`, color: C.accent }}>{q.no}</div>
              <div style={{ marginTop: 5, font: `600 7.8px/1.15 ${FONT.sans}`, letterSpacing: '-0.012em', color: C.ink1, whiteSpace: 'nowrap' }}>{q.sub}</div>
            </div>
          ))}
        </div>
      )}
      {/* 底部：步进路径（三点两线），当前步点亮；总览卡三点全亮 */}
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: over ? 20 : 16, display: 'flex', alignItems: 'center' }}>
        {[0, 1, 2].map((k) => {
          const on = over || k === i;
          const done = over || k < i;
          return (
            <React.Fragment key={k}>
              {k > 0 && <div style={{ flex: 1, height: 1, background: done || on ? 'rgba(139,140,255,0.45)' : 'rgba(255,255,255,0.08)' }} />}
              <div
                style={{
                  width: on ? 7 : 5, height: on ? 7 : 5, borderRadius: '50%', boxSizing: 'border-box',
                  background: on ? C.accent : done ? 'rgba(139,140,255,0.5)' : 'transparent',
                  border: on || done ? 'none' : '1px solid rgba(255,255,255,0.16)',
                  boxShadow: on ? `0 0 ${6 * (over ? 1 : focus)}px rgba(139,140,255,0.6)` : undefined,
                }}
              />
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};

// 一个完整的世界（给定 t）：远景点阵 + 四张卡
const World: React.FC<{ t: number; lit: number }> = ({ t, lit }) => {
  const { cam, af } = camAt(t);
  const over = seg(t, FLY_AT[2], FLY_AT[2] + FLY);
  return (
    <div
      style={{
        position: 'absolute', left: '50%', top: '50%', width: 0, height: 0,
        transformStyle: 'preserve-3d', willChange: 'transform',
        transform: `scale(${1 / cam.s})
          rotateZ(${-cam.rz}deg) rotateY(${-cam.ry}deg) rotateX(${-cam.rx}deg)
          translate3d(${-cam.x}px,${-cam.y}px,${-cam.z}px)`,
      }}
    >
      {/* 远景点阵平面：世界坐标里的"空间网格"，相机飞行/翻转时给出视差与方位感 */}
      <div
        style={{
          position: 'absolute', left: -1900, top: -1500, width: 4200, height: 3600,
          transform: 'translateZ(-1100px)',
          backgroundImage: 'radial-gradient(circle, rgba(170,176,220,0.5) 0 1.1px, transparent 1.6px)',
          backgroundSize: '36px 36px', opacity: 0.32,
          WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 52% 48%, black 30%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 50% 50% at 52% 48%, black 30%, transparent 75%)',
        }}
      />
      {POSES.map((p, i) => {
        const last = i === POSES.length - 1;
        // enter/exit：距当前视点越远越暗越糊（overview 时全部点亮）
        const d = Math.min(1, Math.abs(af - i));
        const focus = Math.max(1 - d, over);
        // 落位浮起：当前卡沿自身法线抬起 10px（飞行中为 0）
        const rise = (1 - d) * lit * 10;
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
              borderRadius: 11,
              padding: last ? '20px 20px' : '16px 20px',
              willChange: 'opacity,filter',
              background: 'linear-gradient(180deg, #1c1e26 0%, #15161c 100%)',
              border: `0.5px solid rgba(255,255,255,${(0.07 + 0.06 * focus).toFixed(3)})`,
              boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.09), 0 ${2 + rise * 0.4}px ${6 + rise}px rgba(0,0,0,0.45), 0 ${14 + rise * 1.6}px ${40 + rise * 3}px -8px rgba(0,0,0,${(0.55 + 0.15 * focus).toFixed(3)})`,
              transform: `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) translateZ(${rise}px) scale(${p.s / (last ? OVER_DIV : 1)})`,
              fontFamily: FONT.sans,
              opacity: 0.28 + focus * 0.72,
              filter: focus < 0.99 ? `blur(${((1 - focus) * 3.5).toFixed(2)}px)` : undefined,
              overflow: 'hidden',
            }}
          >
            <CardBody i={i} focus={focus} />
          </div>
        );
      })}
    </div>
  );
};

// 飞行段时间采样：快门 0.5 帧内 N 个子帧逐层 opacity 1/(i+1) 叠加；N 按本帧相机位移自适应
// （平移 + 旋转×8 + 缩放×300 的设计 px 近似，回波间距 ≤ 0.3 设计 px ≈ 屏幕 1.2px），4–12 个
const SHUTTER = 0.5;
const samplesFor = (t0: number, t1: number) => {
  const a = camAt(t0).cam, b = camAt(t1).cam;
  const disp = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) * 0.5
    + (Math.abs(a.ry - b.ry) + Math.abs(a.rz - b.rz)) * 8 + Math.abs(a.s - b.s) * 300;
  return Math.max(4, Math.min(12, Math.ceil(disp / 0.3)));
};

export const Basic3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const tOf = (f: number) => Math.min(1, Math.max(0, f / Math.max(1, durationInFrames - 1)));
  const t = tOf(frame);
  // 飞行中？（任一段内部）→ 开运动模糊；停留段 lit=1 让当前卡浮起
  const flying = FLY_AT.some((a) => t > a + 0.004 && t < a + FLY - 0.004);
  const n = flying ? samplesFor(t, tOf(frame - SHUTTER)) : 1;
  const lit = 1 - Math.max(...FLY_AT.map((a) => Math.sin(Math.PI * seg(t, a - 0.02, a + FLY + 0.02))));

  return (
    <AbsoluteFill style={{ background: '#0a0b10' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.35 }} accent="#5b5fd6" vignette={0.55} grain={0.07} />
      <DesignStage bg="transparent" raster="zoom">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* 每个子帧层自带 perspective（World 是它的直接子元素才吃得到透视） */}
          {(flying ? Array.from({ length: n }, (_, i) => i) : [0]).map((i) => (
            <div key={i} style={{ position: 'absolute', inset: 0, perspective: '1000px', opacity: 1 / (i + 1) }}>
              <World t={flying ? tOf(frame - (SHUTTER * i) / (n - 1)) : t} lit={lit} />
            </div>
          ))}
        </div>
      </DesignStage>
    </AbsoluteFill>
  );
};
