// Motion 动效公共件 —— 源自 motion-lab 孵化轮沉淀的 48 张卡共用：
// 缓动表 E / 分段进度 seg / 插值 lerp / 确定性伪随机 rand + DesignStage 设计坐标容器。
// 全部是纯函数，由 useCurrentFrame 驱动，满足 Remotion 确定性渲染要求。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export const E = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inQuart: (t: number) => t * t * t * t,
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t: number, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  outElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  spring: (t: number, bounce = 0.25) => {
    const w = 8 + 8 * (1 - bounce);
    return 1 - Math.exp(-6 * t) * Math.cos(w * t * bounce * 2.2);
  },
};

export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;

// 分段进度：t 在 [t0,t1] 内归一化后过 ease，越界钳位——所有动效的时间轴原语
export const seg = (t: number, t0: number, t1: number, ease: (x: number) => number = E.linear) =>
  ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));

// 确定性伪随机（等价 Remotion random(seed)，同种子跨帧/跨渲染可复现）
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 全片归一化进度 t∈[0,1]：末帧恰为 1（与样片渲染的 t 映射逐帧一致）
export const useT = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return Math.min(1, frame / Math.max(1, durationInFrames - 1));
};

// 设计坐标容器：内容按 w×h（默认 480×270）作画，等比放大铺满合成分辨率。
// motion-lab 系动效的参数表数值都在此坐标系下标定，换算比例时数值不动。
// raster='zoom'：用 CSS zoom 放大（布局期放大，字形按目标尺寸光栅化，等效原采集
// 的 DPR=4 截图管线）。默认 transform scale（合成期放大）。文字密集的小字号场景
// 两种管线字形形状有可感差异，对齐原片样片时选 zoom。
export const DesignStage: React.FC<{
  w?: number;
  h?: number;
  bg?: string;
  raster?: 'scale' | 'zoom';
  children: React.ReactNode;
}> = ({ w = 480, h = 270, bg, raster = 'scale', children }) => {
  const { width } = useVideoConfig();
  const scale = width / w;
  return (
    <AbsoluteFill style={{ background: bg ?? '#000', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          overflow: 'hidden',
          ...(raster === 'zoom'
            ? { zoom: scale }
            : { transform: `scale(${scale})`, transformOrigin: 'top left' }),
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
