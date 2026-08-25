// PageCam2D —— 供"真实纹理"类 demo 复用的 2.5D 页面相机。
// 把整页截图当 3D 平面相机巡游：(cx, cy) 是页面空间对准视口中心 (960,540)
// 的点，zoom 是放大倍率，可选 rotX/rotY/rotZ/persp 做斜侧机位。
// 与 template 的 PageCam 同款坐标数学，但自包含（仅依赖 remotion），
// demo 复制进项目即可跑，不 import 本库。
// 用法：
//   <PageCam2D src="textures/live/projects-full.png" pageH={PAGE_H} keys={[
//     { frame: 0, cx: 960, cy: 540, zoom: 1 },
//     { frame: 30, cx: 800, cy: 400, zoom: 1.6, rotY: 34, persp: 1200 },
//   ]}>
//     {/* 页面空间子元素：CSS px 定位 */}
//   </PageCam2D>
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';

export type CamKey2D = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
  rotX?: number; // deg
  rotY?: number; // deg（正 = 右缘后缩，即左机位）
  rotZ?: number; // deg
  persp?: number; // px
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const PageCam2D: React.FC<{
  src: string; // staticFile 路径（如 textures/live/projects-full.png）
  pageH: number;
  keys: CamKey2D[];
  children?: React.ReactNode;
  bg?: string;
  blur?: number; // px, 应用到整页（背景页 blur 化景深）
  ease?: (t: number) => number;
}> = ({ src, pageH, keys, children, bg = '#faf7f2', blur = 0, ease = Easing.bezier(0.33, 0, 0.15, 1) }) => {
  const frame = useCurrentFrame();
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const t =
    a.frame === b.frame
      ? 1
      : interpolate(frame, [a.frame, b.frame], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: ease,
        });
  const cx = lerp(a.cx, b.cx, t);
  const cy = lerp(a.cy, b.cy, t);
  const zoom = lerp(a.zoom, b.zoom, t);
  const rotX = lerp(a.rotX ?? 0, b.rotX ?? 0, t);
  const rotY = lerp(a.rotY ?? 0, b.rotY ?? 0, t);
  const rotZ = lerp(a.rotZ ?? 0, b.rotZ ?? 0, t);
  const persp = lerp(a.persp ?? 1400, b.persp ?? 1400, t);
  const has3D = keys.some(
    (k) => k.rotX !== undefined || k.rotY !== undefined || k.rotZ !== undefined || k.persp !== undefined,
  );

  if (!has3D) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: bg }}>
        <div
          style={{
            position: 'absolute',
            width: 1920,
            height: pageH,
            transform: `translate(${960 - cx * zoom}px, ${540 - cy * zoom}px) scale(${zoom})`,
            transformOrigin: '0 0',
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
        >
          <Img src={staticFile(src)} style={{ position: 'absolute', width: 1920, height: pageH }} />
          {children}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: bg }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: `${persp * zoom}px`,
          perspectiveOrigin: '960px 540px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 1920,
            height: pageH,
            zoom,
            transform: `translate(${960 / zoom - cx}px, ${540 / zoom - cy}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transformStyle: 'preserve-3d',
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
        >
          <Img src={staticFile(src)} style={{ position: 'absolute', width: 1920, height: pageH }} />
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
