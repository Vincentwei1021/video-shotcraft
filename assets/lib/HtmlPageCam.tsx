import React from 'react';
import {
  AbsoluteFill,
  Easing,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

export type HtmlCamKey = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  persp?: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const OfflinePage: React.FC<{
  src: string;
  width: number;
  height: number;
  onReady?: () => void;
}> = ({src, width, height, onReady}) => {
  const [handle] = React.useState(() =>
    delayRender(`offline HTML material: ${src}`, {timeoutInMilliseconds: 120000}),
  );
  const ready = React.useRef(false);
  const markReady = React.useCallback(() => {
    if (ready.current) return;
    ready.current = true;
    continueRender(handle);
    onReady?.();
  }, [handle, onReady]);

  return (
    <iframe
      src={staticFile(src)}
      title="Offline browser-captured HTML material"
      sandbox=""
      referrerPolicy="no-referrer"
      onLoad={markReady}
      style={{
        display: 'block',
        width,
        height,
        border: 0,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    />
  );
};

/**
 * B-route camera for a script-free, zero-network state.html.
 * `src` is a path under public/, while cx/cy/pageW/pageH use page CSS pixels.
 * The iframe remains sandboxed; element-level animation belongs in an A-route
 * FrozenHtmlFragment layer rather than reaching into this document.
 */
export const HtmlPageCam: React.FC<{
  src: string;
  pageH: number;
  keys: HtmlCamKey[];
  pageW?: number;
  frameW?: number;
  frameH?: number;
  children?: React.ReactNode;
  blur?: number;
  saturate?: number;
  ease?: (t: number) => number;
  backgroundColor?: string;
  frame?: number;
}> = ({
  src,
  pageH,
  keys,
  pageW = 1920,
  frameW = 1920,
  frameH = 1080,
  children,
  blur = 0,
  saturate = 1,
  ease = Easing.bezier(0.33, 0, 0.15, 1),
  backgroundColor = '#fff',
  frame: frameProp,
}) => {
  const ownFrame = useCurrentFrame();
  const frame = frameProp ?? ownFrame;
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const t = a.frame === b.frame
    ? 1
    : interpolate(frame, [a.frame, b.frame], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: ease,
      });
  const cx = lerp(a.cx, b.cx, t);
  const cy = lerp(a.cy, b.cy, t);
  const zoom = lerp(a.zoom, b.zoom, t);
  const filters = [
    blur > 0 ? `blur(${blur}px)` : '',
    saturate !== 1 ? `saturate(${saturate})` : '',
  ].filter(Boolean).join(' ') || undefined;
  const has3D = keys.some(
    (key) => key.rotX !== undefined || key.rotY !== undefined ||
      key.rotZ !== undefined || key.persp !== undefined,
  );

  const page = (
    <>
      <OfflinePage src={src} width={pageW} height={pageH} />
      {children}
    </>
  );

  if (!has3D) {
    return (
      <AbsoluteFill style={{overflow: 'hidden', backgroundColor}}>
        <div
          style={{
            position: 'absolute',
            width: pageW,
            height: pageH,
            transform: `translate(${frameW / 2 - cx * zoom}px, ${frameH / 2 - cy * zoom}px) scale(${zoom})`,
            transformOrigin: '0 0',
            filter: filters,
          }}
        >
          {page}
        </div>
      </AbsoluteFill>
    );
  }

  const rotX = lerp(a.rotX ?? 0, b.rotX ?? 0, t);
  const rotY = lerp(a.rotY ?? 0, b.rotY ?? 0, t);
  const rotZ = lerp(a.rotZ ?? 0, b.rotZ ?? 0, t);
  const persp = lerp(a.persp ?? 1400, b.persp ?? 1400, t);

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: `${persp * zoom}px`,
          perspectiveOrigin: `${frameW / 2}px ${frameH / 2}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: pageW,
            height: pageH,
            zoom,
            transform: `translate(${frameW / 2 / zoom - cx}px, ${frameH / 2 / zoom - cy}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transformStyle: 'preserve-3d',
            filter: filters,
          }}
        >
          {page}
        </div>
      </div>
    </AbsoluteFill>
  );
};
