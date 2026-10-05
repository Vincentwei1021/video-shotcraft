// type-and-filter —— 真实 UI 上打字搜索、网格自己收敛成一张卡、点击穿透进详情页
// 功能演示的"操作叙事"段：让观众"跟着做一遍"。节奏必须像人手，不能像脚本。
// 参考实现从 template SceneFlyIn 118–190 段剥离（self-contained）：
// 相机移到搜索框，逐字符打字（3f/字符，光标常亮→闪烁），打完留一口气（11f），
// 25 张非目标卡按阅读序错峰淡出+下沉，目标卡滑到首行槽位（途中浮起+阴影变宽），
// 双圈强调色 ripple 点击确认 + 3px 描边 + 辉光，相机 16f 推进 zoom 2.2 交棒。
// 网格卡用真实纹理裁片（复用 projects-empty.png 里已有的卡），nano-lab 目标卡
// 过滤后滑到首行槽位。缺的 float-* 小块用纯色占位，不影响动效读感。
// 质感升级：相机跟着动作走——打字段贴近搜索框（zoom 2.0，输入字有效字高 ≈30px，读得清），
// 打完的那口气里拉开到满幅全景（zoom 1.0，页面铺满画框，不再露出页面外的空白带与页眉断边），
// 再推进点击点；搜索框打字时有强调色聚焦环；补一只 macOS 指针在全景里滑到目标卡再点击
// （"点了哪里"看得见，屏幕尺寸恒定、推进前淡出）；退场卡加轻微缩小与虚化，目标卡快速
// 滑位带纵向速度拖影；选中描边与卡片同心圆角、辉光收敛。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import { SpeedBlur, velocity } from '../../_fixtures/Polish';
import layout from '../../_textures/live-layout.json';

export const TYPE_AND_FILTER_DURATION = 73; // 118–190f 落在 shot 内 offset 0

const PAGE_H = layout.projects.pageH;
const cards = layout.projects.cards;
const PAPER = '#f9f6f1';
const FIELD = '#fefcf9';
const AMBER = 'oklch(58% 0.13 65)';
const AMBER_RGB = '176,116,40'; // AMBER 的近似 sRGB，用于半透明辉光
const QUERY = 'nano-lab';
const TYPE_START = 10; // 118 - 118 = 0 偏移基准：scene-local 从 118 起
const FILTER_START = 42; // 160 - 118
const CLICK = 58; // 176 - 118

// search box (page-space CSS px)
const SEARCH = { x: 408, y: 130, w: 1016, h: 44 };

// nano-lab target card (the one that filters to row one)
const NANO_TITLE = 'nano-lab';
const nanoIdx = cards.findIndex((c) => c.title.includes(NANO_TITLE));
const nano = cards[nanoIdx];
const NANO_TO = { x: 408, y: 247 }; // first-row slot
const CLICK_C = { x: 586, y: 391 }; // click point on the settled result card

// filter departure rank for the non-target cards (reading order)
const leaveRank = new Map<number, number>();
cards.forEach((_, i) => {
  if (i !== nanoIdx) leaveRank.set(i, leaveRank.size);
});

// camera: 打字段贴近搜索框 → 打完的呼吸位拉开到满幅全景（过滤/滑位全程可见）→ 推进点击卡
const CAM_KEYS: CamKey2D[] = [
  { frame: 0, cx: 820, cy: 270, zoom: 2.0 },
  { frame: 34, cx: 820, cy: 270, zoom: 2.0 },
  { frame: 46, cx: 960, cy: 540, zoom: 1.0 },
  { frame: 56, cx: 960, cy: 540, zoom: 1.0 },
  { frame: 72, cx: CLICK_C.x, cy: CLICK_C.y, zoom: 2.2 },
];
// 与 PageCam2D 同一缓动/插值，求当前 zoom（指针做反向缩放，保持屏幕尺寸恒定）
const CAM_EASE = Easing.bezier(0.33, 0, 0.15, 1);
const camZoom = (f: number) => {
  for (let i = 0; i < CAM_KEYS.length - 1; i++) {
    const a = CAM_KEYS[i];
    const b = CAM_KEYS[i + 1];
    if (f >= a.frame && f <= b.frame) {
      const t = interpolate(f, [a.frame, b.frame], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: CAM_EASE });
      return a.zoom + (b.zoom - a.zoom) * t;
    }
  }
  return f < CAM_KEYS[0].frame ? CAM_KEYS[0].zoom : CAM_KEYS[CAM_KEYS.length - 1].zoom;
};

// 指针路径（页面坐标）：全景落定时停在搜索框右下，46–57f 带弧线滑到点击点
const PTR_FROM = { x: 1210, y: 214 };
const ptrAt = (f: number) => {
  const t = interpolate(f, [46, 57], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const arc = Math.sin(t * Math.PI) * 60; // 向下鼓一点的弧，不走死直线
  return {
    x: PTR_FROM.x + (CLICK_C.x - PTR_FROM.x) * t,
    y: PTR_FROM.y + (CLICK_C.y - PTR_FROM.y) * t + arc,
  };
};

export const TypeAndFilter: React.FC = () => {
  const frame = useCurrentFrame();

  // typed chars: one every 3 frames (unhurried)
  const typedCount =
    frame < TYPE_START ? 0 : Math.min(QUERY.length, Math.floor((frame - TYPE_START) / 3) + 1);
  // caret: solid while typing, blinks on an 8f cycle after, until the click
  const caretOn =
    frame >= TYPE_START - 2 &&
    frame <= 67 &&
    (frame <= TYPE_START + 24 || Math.floor((frame - (TYPE_START + 24)) / 8) % 2 === 0);
  // 搜索框聚焦环：打字前 4f 亮起，点击后退去
  const focus = interpolate(frame, [TYPE_START - 6, TYPE_START - 2, CLICK, CLICK + 6], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // 指针：全景落定前淡入，点击后在推进中淡出（交棒帧画面干净）
  const ptr = ptrAt(frame);
  const ptrO = interpolate(frame, [42, 47, 62, 67], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ptrPress = interpolate(frame, [CLICK - 1, CLICK + 1, CLICK + 5], [1, 0.86, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ptrScale = (1 / camZoom(frame)) * ptrPress;

  // 目标卡滑位
  const slideAt = (f: number) =>
    interpolate(f, [FILTER_START, FILTER_START + 10], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.35, 0, 0.2, 1),
    });
  const slideT = slideAt(frame);
  const slideVy = velocity((f) => (NANO_TO.y - nano.y) * slideAt(f), frame);

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <PageCam2D src="textures/live/projects-empty.png" pageH={PAGE_H} keys={CAM_KEYS} bg={PAPER}>
        {/* ---- 25 non-target cards: staggered fade+sink on filter ---- */}
        {cards.map((c, i) => {
          if (i === nanoIdx) return null;
          const outCue = FILTER_START + leaveRank.get(i)! * 0.4;
          if (frame >= outCue + 5) return null;
          const outT = interpolate(frame, [outCue, outCue + 5], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad),
          });
          return (
            <div
              key={`${c.file}-${i}`}
              style={{
                position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
                transform: `translate3d(0px, ${8 * outT}px, 0px) scale(${1 - 0.015 * outT})`,
                opacity: 1 - outT, borderRadius: 16, overflow: 'hidden',
                filter: outT > 0.02 ? `blur(${(1.5 * outT).toFixed(2)}px)` : undefined,
                boxShadow: '0 1px 2px rgba(60,45,30,.06), 0 4px 12px -4px rgba(60,45,30,.08)',
              }}
            >
              <Img src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
            </div>
          );
        })}

        {/* ---- nano-lab: slides up to the first-row slot on filter, floating（快段纵向拖影）---- */}
        {(() => {
          const slideDy = (NANO_TO.y - nano.y) * slideT;
          const slideDx = (NANO_TO.x - nano.x) * slideT;
          const float = Math.sin(slideT * Math.PI);
          const slideScale = 1 + 0.02 * float;
          const slideZ = 18 * float;
          return (
            <SpeedBlur vx={0} vy={slideVy} amount={0.04} max={7} style={{ zIndex: 2 }}>
              <div
                style={{
                  position: 'absolute', left: nano.x, top: nano.y, width: nano.w, height: nano.h,
                  transform: `translate3d(${slideDx}px, ${slideDy}px, ${slideZ}px) scale(${slideScale})`,
                  transformOrigin: 'center center',
                  // 两层影：近地实影 + 随浮起变宽变淡的环境影
                  boxShadow: `0 ${1 + 2 * float}px ${2 + 4 * float}px rgba(60,45,30,${0.07 + 0.03 * float}), 0 ${4 + 18 * float}px ${12 + 30 * float}px -${4 + 6 * float}px rgba(60,45,30,${0.09 + 0.12 * float})`,
                  borderRadius: 16, overflow: 'hidden',
                }}
              >
                <Img src={staticFile(`textures/live/${nano.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
              </div>
            </SpeedBlur>
          );
        })()}

        {/* ---- search box: paper patch over the placeholder (keeps magnifier), typed text + caret ---- */}
        <div
          style={{
            position: 'absolute', left: 440, top: SEARCH.y + 4,
            width: SEARCH.x + SEARCH.w - 448, height: SEARCH.h - 8,
            background: FIELD, opacity: 1, pointerEvents: 'none',
          }}
        />
        {/* 聚焦环：1px 强调色描边 + 3px 浅色外环（与输入框同圆角，跟着输入状态亮/灭） */}
        <div
          style={{
            position: 'absolute', left: SEARCH.x - 1, top: SEARCH.y - 1, width: SEARCH.w + 2, height: SEARCH.h + 2,
            borderRadius: 9, boxSizing: 'border-box', pointerEvents: 'none', opacity: focus,
            border: `1px solid rgba(${AMBER_RGB},0.55)`,
            boxShadow: `0 0 0 3px rgba(${AMBER_RGB},0.14)`,
          }}
        />
        <div
          style={{
            position: 'absolute', left: 448, top: SEARCH.y, height: SEARCH.h,
            display: 'flex', alignItems: 'center',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
            fontSize: 15, letterSpacing: 0.2, color: 'oklch(25% 0.006 82)', pointerEvents: 'none',
          }}
        >
          <span>{QUERY.slice(0, typedCount)}</span>
          {caretOn ? (
            <span style={{ display: 'inline-block', width: 1.5, height: 19, marginLeft: 1.5, borderRadius: 1, background: AMBER }} />
          ) : null}
        </div>

        {/* ---- click ripple: two concentric amber rings ---- */}
        {[0, 1].map((r) => {
          const start = CLICK + r * 3; // 176 - 118
          if (frame < start || frame > start + 10) return null;
          const t = interpolate(frame, [start, start + 10], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
          });
          const rad = interpolate(t, [0, 1], [14, r === 0 ? 54 : 78]);
          return (
            <div
              key={`ripple-${r}`}
              style={{
                position: 'absolute', left: CLICK_C.x - rad, top: CLICK_C.y - rad,
                width: rad * 2, height: rad * 2, borderRadius: '50%', boxSizing: 'border-box',
                border: `${r === 0 ? 2 : 1.5}px solid ${AMBER}`,
                background: r === 0 ? `radial-gradient(circle, rgba(${AMBER_RGB},0) 55%, rgba(${AMBER_RGB},0.10) 100%)` : undefined,
                opacity: 1 - t, pointerEvents: 'none', zIndex: 5,
              }}
            />
          );
        })}

        {/* ---- selected-card amber outline, lit from the click（与卡片同心圆角 16+6）---- */}
        {frame >= CLICK + 2 ? (
          <div
            style={{
              position: 'absolute', left: NANO_TO.x - 6, top: NANO_TO.y - 6,
              width: nano.w + 12, height: nano.h + 12, borderRadius: 22, boxSizing: 'border-box',
              border: `3px solid ${AMBER}`,
              boxShadow: `0 0 0 4px rgba(${AMBER_RGB},0.10), 0 8px 34px -6px rgba(${AMBER_RGB},0.45)`,
              opacity: interpolate(frame, [CLICK + 2, CLICK + 5], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `scale(${interpolate(frame, [CLICK + 2, CLICK + 7], [1.015, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })})`,
              pointerEvents: 'none', zIndex: 4,
            }}
          />
        ) : null}

        {/* ---- macOS 指针（页面坐标定位、按相机 zoom 反向缩放 → 屏幕上恒定 ~44px）---- */}
        {ptrO > 0.001 ? (
          <svg
            width={28}
            height={28}
            viewBox="0 0 28 28"
            style={{
              position: 'absolute', left: ptr.x - 2, top: ptr.y - 1, zIndex: 6, opacity: ptrO,
              overflow: 'visible', transformOrigin: '2px 1px', transform: `scale(${(ptrScale * 1.6).toFixed(4)})`,
              filter: 'drop-shadow(0 0.6px 0.6px rgba(20,14,8,0.35)) drop-shadow(0 3px 5px rgba(20,14,8,0.25))',
            }}
          >
            <path d="M2 1 L2 23 L8 17.5 L11.5 25 L15.5 23.2 L12 15.8 L20 15 Z" fill="#17181c" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
          </svg>
        ) : null}
      </PageCam2D>
    </AbsoluteFill>
  );
};
