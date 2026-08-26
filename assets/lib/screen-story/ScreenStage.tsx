import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, E, F } from './tokens';
import { cameraAt, type CamKey } from './camera';
import { Cursor, type CursorKey } from './Cursor';
import { HtmlSnap, type DriveFn } from './HtmlSnap';
import { MATERIALS } from './materials.gen';
import { drift, lerp, progress } from './motion';

// ScreenStage — Recordly 式舞台（卡片缩放模型）：
// macOS 壁纸垫底 + 圆角阴影窗口 + chrome 地址栏 + 素材硬切 + 光标层。
// 页面内容始终整页适配窗口（不做内部平移）；相机 {cx, cy, z} 的语义是
// 「绕页面坐标 (cx,cy) 这个锚点，把整个窗口连壳带内容放大 z 倍」——
// z>1 时窗口越过画布边缘出血，与 Recordly 的 1.5x 缩放行为一致。
// 全部是帧号纯函数。

export type Cut = { from: number; slot: string; patchCss?: string; drive?: DriveFn };

const BrandGradient: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `
        radial-gradient(1200px 800px at 18% 8%, rgba(255,71,4,0.05), transparent 60%),
        radial-gradient(1400px 900px at 85% 95%, rgba(21,54,43,0.07), transparent 55%),
        linear-gradient(160deg, ${C.paper} 0%, ${C.paper2} 58%, ${C.cream} 100%)
      `,
    }}
  />
);

const ChromeBar: React.FC<{ url: string; h: number }> = ({ url, h }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: h,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 16px',
      backgroundColor: 'rgba(250,249,247,0.96)',
      borderBottom: `1px solid ${C.border}`,
      zIndex: 5,
    }}
  >
    {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
      <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: c }} />
    ))}
    <div
      style={{
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 14px',
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        border: `1px solid ${C.border}`,
        fontFamily: F.mono,
        fontSize: 12.5,
        color: C.warmGray,
        minWidth: 320,
        justifyContent: 'center',
      }}
    >
      <svg width="10" height="12" viewBox="0 0 10 12" style={{ opacity: 0.55 }}>
        <rect x="1" y="5" width="8" height="6" rx="1.4" fill="none" stroke={C.warmGray} strokeWidth="1.3" />
        <path d="M2.8 5 V3.4 a2.2 2.2 0 0 1 4.4 0 V5" fill="none" stroke={C.warmGray} strokeWidth="1.3" />
      </svg>
      {url}
    </div>
  </div>
);

export const ScreenStage: React.FC<{
  frame: number;
  cuts: Cut[];
  camera: CamKey[];
  cursor?: CursorKey[];
  clicks?: number[];
  cursorAppearAt?: number;
  url?: string;
  /** 壁纸：staticFile 路径；null = 品牌渐变（CTA/品牌段用） */
  wallpaper?: string | null;
  /** 窗口盒（canvas 坐标，含 chrome 高度）。默认 Recordly 式大边距（内容 1280×720，
   * 画布宽的 67%）：z=1 是"桌面上的窗口"，z≈1.5 阅读时刻近满屏并留壁纸边，z≥1.75 出血 */
  rect?: { x: number; y: number; w: number; h: number };
  enterAt?: number;
  exitAt?: number;
  chrome?: boolean;
  children?: React.ReactNode;
}> = ({
  frame,
  cuts,
  camera,
  cursor = [],
  clicks = [],
  cursorAppearAt = 0,
  url = 'dashboard.tsenta.com',
  wallpaper = 'wallpaper-tahoe.jpg',
  rect = { x: 320, y: 158, w: 1280, h: 764 },
  enterAt,
  exitAt,
  chrome = true,
  children,
}) => {
  const chromeH = chrome ? 44 : 0;
  const stage = { w: rect.w, h: rect.h - chromeH };

  let active = 0;
  for (let i = 0; i < cuts.length; i++) if (cuts[i].from <= frame) active = i;
  const pageW = MATERIALS[cuts[active].slot].pageW;
  const pageH = MATERIALS[cuts[active].slot].pageH;
  const s0 = stage.w / pageW; // 整页适配窗口宽度

  // 相机 = 卡片整体缩放：锚点为页面坐标 (cx, cy)，clamp 到页面范围
  const cam = cameraAt(camera, frame, E.soft);
  const ax = Math.min(Math.max(cam.cx, 0), pageW) * s0;
  const ay = chromeH + Math.min(Math.max(cam.cy, 0), pageH) * s0;
  const bx = drift(frame, 240, 1.2);
  const by = drift(frame + 60, 300, 1.0);
  // translate+scale 等价于「绕 (ax,ay) 缩放 z」，锚点在画布上保持不动
  const zoomTransform = `translate(${(1 - cam.z) * ax + bx}px, ${(1 - cam.z) * ay + by}px) scale(${cam.z})`;

  const enter = enterAt == null ? 1 : progress(frame, enterAt, 22);
  const exit = exitAt == null ? 0 : progress(frame, exitAt, 20);
  const screenOpacity = enter * (1 - exit);
  const screenY = lerp(46, 0, enter) + lerp(0, 34, exit);
  const screenScale = lerp(0.972, 1, enter) * lerp(1, 0.984, exit);

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: F.sans, overflow: 'hidden' }}>
      {wallpaper ? (
        <Img
          src={staticFile(wallpaper)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <BrandGradient />
      )}
      {/* 缩放层：绕锚点放大整个窗口（z>1 时出血画布边缘） */}
      <div
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          transform: zoomTransform,
          transformOrigin: '0 0',
        }}
      >
        {/* 窗口本体（入退场动画在缩放层内部） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.28)',
            boxShadow: '0 42px 110px rgba(0,0,0,0.45), 0 10px 32px rgba(0,0,0,0.26)',
            backgroundColor: '#fff',
            overflow: 'hidden',
            opacity: screenOpacity,
            transform: `translateY(${screenY}px) scale(${screenScale})`,
            transformOrigin: '50% 60%',
          }}
        >
          {chrome ? <ChromeBar url={url} h={chromeH} /> : null}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: chromeH,
              width: stage.w,
              height: stage.h,
              overflow: 'hidden',
            }}
          >
            {/* 内容层：整页固定适配（scale s0），素材与光标同处页面坐标系 */}
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${s0})`, transformOrigin: '0 0' }}>
              {cuts.map((cut, i) => (
                <HtmlSnap
                  key={`${cut.slot}-${i}`}
                  slot={cut.slot}
                  frame={frame - cut.from}
                  patchCss={cut.patchCss}
                  drive={cut.drive}
                  visible={i === active}
                />
              ))}
              <Cursor frame={frame} keys={cursor} clicks={clicks} appearAt={cursorAppearAt} />
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};
