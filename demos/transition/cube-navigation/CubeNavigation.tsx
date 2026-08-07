// cube-navigation — Cube Navigation 立方体逐面导航（motion-lab 定稿转原生 Remotion）
// 内容贴在 3D 立方体六面，相机逐面浏览：正面特写 → 拉远到等轴视角看清棱角 →
// 转到下一面推近，面间穿插斜角过渡；每面按法线朝向实时算明暗。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, rand, seg, useT } from '../../_fixtures/Motion';

export const CUBE_NAVIGATION_DURATION = 180; // 6000ms @30fps

const S = 190; // 立方体边长
const H = S / 2;

// 六面：贴面变换 / 法线 / 色相 / 角标字形
const FACES = [
  { n: 'OVERVIEW', tr: `translateZ(${H}px)`, nm: [0, 0, 1], hue: 224, glyph: '◧' },
  { n: 'METRICS', tr: `rotateY(90deg) translateZ(${H}px)`, nm: [1, 0, 0], hue: 268, glyph: '◆' },
  { n: 'TIMELINE', tr: `rotateY(180deg) translateZ(${H}px)`, nm: [0, 0, -1], hue: 330, glyph: '◔' },
  { n: 'ASSETS', tr: `rotateY(-90deg) translateZ(${H}px)`, nm: [-1, 0, 0], hue: 190, glyph: '▤' },
  { n: 'SETTINGS', tr: `rotateX(90deg) translateZ(${H}px)`, nm: [0, -1, 0], hue: 154, glyph: '⚙' },
  { n: 'EXPORT', tr: `rotateX(-90deg) translateZ(${H}px)`, nm: [0, 1, 0], hue: 34, glyph: '↥' },
];

// 相机关键姿态：正面 → 等轴 → 右面 → 等轴 → 背面 → 等轴收尾
const CAM = [
  { rx: 0, ry: 0, d: 235 },
  { rx: -22, ry: -38, d: -130 },
  { rx: 0, ry: -90, d: 235 },
  { rx: -27, ry: -142, d: -130 },
  { rx: 0, ry: -180, d: 235 },
  { rx: -24, ry: -226, d: -95 },
];
// 每段关键帧的时间窗（t 域），窗间即 hold
const WIN: [number, number][] = [[0.10, 0.24], [0.30, 0.44], [0.50, 0.62], [0.66, 0.78], [0.84, 0.97]];

type Cam = { rx: number; ry: number; d: number };
const CAM_KEYS = ['rx', 'ry', 'd'] as const;

// 累加式关键帧插值：各段进度独立过 ease 后按差值叠加，天然支持窗间 hold
const acc = (t: number, base: Cam, kfs: { at: [number, number]; to: Cam }[], ease: (x: number) => number): Cam => {
  const out: Cam = { ...base };
  let prev = base;
  for (const kf of kfs) {
    const u = seg(t, kf.at[0], kf.at[1], ease);
    for (const k of CAM_KEYS) out[k] += u * (kf.to[k] - prev[k]);
    prev = kf.to;
  }
  return out;
};

const RAD = Math.PI / 180;

// x264 暗部量化校准：原样片淡入头几帧 R 通道被编码器压得比 G/B 更暗
// （按对照帧实测等效增益：f1≈×0.77、f2≈×0.88、f3-f5≈×0.97、f6 起回到 1），
// 用 rgb(0,255,255) multiply 叠加层按帧号复现该 R 通道压暗，o = 1 - 增益。
const R_CRUSH: [number, number][] = [
  [1, 0.23],
  [2, 0.12],
  [3, 0.033],
  [5, 0.025],
  [6, 0.005],
  [8, 0],
];
const rCrushAt = (f: number) => {
  if (f <= R_CRUSH[0][0]) return R_CRUSH[0][1];
  for (let i = 0; i < R_CRUSH.length - 1; i++) {
    const [f0, v0] = R_CRUSH[i];
    const [f1, v1] = R_CRUSH[i + 1];
    if (f <= f1) return v0 + ((f - f0) / (f1 - f0)) * (v1 - v0);
  }
  return 0;
};

export const CubeNavigation: React.FC = () => {
  const t = useT();
  // 当前帧号（useT 定义保证 t*(总帧-1) 恰为整数帧）
  const rCrush = rCrushAt(t * (CUBE_NAVIGATION_DURATION - 1));
  // 相机姿态：五段窗口依次插值
  const v = acc(t, CAM[0], WIN.map((w, i) => ({ at: w, to: CAM[i + 1] })), E.inOutCubic);
  // 法线明暗：Rx(rx)·Ry(ry)·n 的 z 分量
  const cy = Math.cos(v.ry * RAD), sy = Math.sin(v.ry * RAD);
  const cx = Math.cos(v.rx * RAD), sx = Math.sin(v.rx * RAD);
  return (
    <DesignStage bg="#000">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(110% 100% at 50% 10%,#171b2a,#07080e 72%)',
          perspective: 760,
          overflow: 'hidden',
          // 开场整体淡入。按对照帧实测校准：原样片采集起点晚约 0.1 帧 +
          // x264 暗部量化把淡入首帧压得更暗，整个 ramp 后移 0.1/179 对齐
          opacity: seg(t - 0.1 / 179, 0, 0.08, E.outCubic),
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${v.d}px) rotateX(${v.rx}deg) rotateY(${v.ry}deg)`,
          }}
        >
          {FACES.map((f, i) => {
            const [nx, ny, nz] = f.nm;
            const z1 = -nx * sy + nz * cy, y1 = ny;
            const z2 = y1 * sx + z1 * cx;
            const lit = Math.max(0, z2);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: -H,
                  top: -H,
                  width: S,
                  height: S,
                  transform: f.tr,
                  backfaceVisibility: 'hidden',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: `linear-gradient(155deg,hsl(${f.hue},44%,26%),hsl(${f.hue},52%,12%))`,
                  boxShadow: `inset 0 0 0 1px hsla(${f.hue},70%,70%,.4)`,
                  filter: `brightness(${(0.5 + lit * 0.62).toFixed(3)}) saturate(${(0.8 + lit * 0.4).toFixed(2)})`,
                }}
              >
                {/* 面标题 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 13,
                    font: '700 9px/1 -apple-system,sans-serif',
                    letterSpacing: 2.4,
                    color: `hsla(${f.hue},80%,82%,.95)`,
                  }}
                >
                  {f.n}
                </div>
                {/* 四条占位信息条，宽度按 rand(i*9+k) 定 */}
                {Array.from({ length: 4 }, (_, k) => (
                  <div
                    key={k}
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: 42 + k * 20,
                      height: 9,
                      borderRadius: 5,
                      width: `${34 + rand(i * 9 + k) * 46}%`,
                      background: `hsla(${f.hue},70%,72%,${0.5 - k * 0.09})`,
                    }}
                  />
                ))}
                {/* 右下角标字形 */}
                <div
                  style={{
                    position: 'absolute',
                    right: 14,
                    bottom: 12,
                    fontSize: 30,
                    lineHeight: 1,
                    color: `hsla(${f.hue},85%,80%,.55)`,
                  }}
                >
                  {f.glyph}
                </div>
              </div>
            );
          })}
        </div>
        {/* R 通道压暗层：multiply 白青色 → 只把 R 乘以 (1-rCrush)，G/B 不动 */}
        {rCrush > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgb(${Math.round(255 * (1 - rCrush))},255,255)`,
              mixBlendMode: 'multiply',
            }}
          />
        )}
      </div>
    </DesignStage>
  );
};
