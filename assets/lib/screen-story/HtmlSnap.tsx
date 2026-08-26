import React from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { MATERIALS } from './materials.gen';

// HtmlSnap — 以 iframe 渲染整页 HTML 快照（同源、无 sandbox，可逐帧驱动内部 DOM）。
// 快照采集时已剥 script / 禁动画；drive 必须是帧号的幂等纯函数（seek 安全）。
//
// 渲染坐标约定：iframe 以素材原始尺寸 pageW×pageH 挂载在 (0,0)，
// 外层（ScreenStage）负责相机 transform。本组件不做取景。

export type DriveFn = (doc: Document, frame: number) => void;

export const HtmlSnap: React.FC<{
  slot: string;
  frame: number;
  /** 注入快照 <head> 的补丁样式（隐藏冻结的浮层等），挂载时一次性注入 */
  patchCss?: string;
  /** 逐帧 DOM 驱动（打字、内部滚动）。幂等：同一帧多次调用结果一致 */
  drive?: DriveFn;
  visible: boolean;
}> = ({ slot, frame, patchCss, drive, visible }) => {
  const meta = MATERIALS[slot];
  if (!meta) throw new Error(`unknown material slot: ${slot}`);
  const src = `captures-html/${slot}.html`;
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [handle] = React.useState(() => delayRender(`html snap: ${slot}`, { timeoutInMilliseconds: 120000 }));
  const [ready, setReady] = React.useState(false);
  const done = React.useRef(false);

  const markReady = React.useCallback(() => {
    if (done.current) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc || doc.location.href === 'about:blank' || !doc.body || doc.body.childElementCount === 0) return;
    done.current = true;
    if (patchCss) {
      const style = doc.createElement('style');
      style.textContent = patchCss;
      doc.head.appendChild(style);
    }
    setReady(true);
    continueRender(handle);
  }, [handle, patchCss]);

  React.useEffect(() => {
    // 兜底轮询：onLoad 与挂载竞态时接管；排除 about:blank（readyState 即 complete 的坑）
    const timer = setInterval(() => {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.readyState === 'complete') markReady();
    }, 100);
    return () => clearInterval(timer);
  }, [markReady]);

  React.useLayoutEffect(() => {
    if (!ready || !drive) return;
    const doc = iframeRef.current?.contentDocument;
    if (doc) drive(doc, frame);
  }, [ready, drive, frame]);

  return (
    <iframe
      ref={iframeRef}
      src={staticFile(src)}
      title={slot}
      onLoad={markReady}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: meta.pageW,
        height: meta.pageH,
        border: 0,
        pointerEvents: 'none',
        background: '#fff',
        opacity: visible ? 1 : 0,
      }}
    />
  );
};
