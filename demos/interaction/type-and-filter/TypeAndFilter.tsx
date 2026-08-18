// type-and-filter —— 真实 UI 上打字搜索、网格自己收敛成一张卡、点击穿透进详情页
// 功能演示的"操作叙事"段：让观众"跟着做一遍"。节奏必须像人手，不能像脚本。
// 参考实现从 template SceneFlyIn 118–190 段剥离（self-contained）：
// 相机移到搜索框，逐字符打字（3f/字符，光标常亮→闪烁），打完留一口气（11f），
// 25 张非目标卡按阅读序错峰淡出+下沉，目标卡滑到首行槽位（途中浮起+阴影变宽），
// 双圈强调色 ripple 点击确认 + 3px 描边 + 辉光，相机 16f 推进 zoom 2.2 交棒。
// 网格卡用真实纹理裁片（复用 projects-empty.png 里已有的卡），nano-lab 目标卡
// 过滤后滑到首行槽位。缺的 float-* 小块用纯色占位，不影响动效读感。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import layout from '../../_textures/live-layout.json';

export const TYPE_AND_FILTER_DURATION = 73; // 118–190f 落在 shot 内 offset 0

const PAGE_H = layout.projects.pageH;
const cards = layout.projects.cards;
const PAPER = '#f9f6f1';
const FIELD = '#fefcf9';
const AMBER = 'oklch(58% 0.13 65)';
const QUERY = 'nano-lab';
const TYPE_START = 10; // 118 - 118 = 0 偏移基准：scene-local 从 118 起
const FILTER_START = 42; // 160 - 118

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

// camera: hold through typing/breath/filter/slide, then push into the clicked card
const CAM_KEYS: CamKey2D[] = [
  { frame: 0, cx: 960, cy: 380, zoom: 0.9 },
  { frame: 56, cx: 960, cy: 380, zoom: 0.9 },
  { frame: 72, cx: CLICK_C.x, cy: CLICK_C.y, zoom: 2.2 },
];

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

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <PageCam2D src="textures/live/projects-empty.png" pageH={PAGE_H} keys={CAM_KEYS}>
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
                transform: `translate3d(0px, ${8 * outT}px, 0px)`,
                opacity: 1 - outT, borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(60,45,30,.08)',
              }}
            >
              <Img src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
            </div>
          );
        })}

        {/* ---- nano-lab: slides up to the first-row slot on filter, floating ---- */}
        {(() => {
          const slideT = interpolate(frame, [FILTER_START, FILTER_START + 10], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.35, 0, 0.2, 1),
          });
          const slideDy = (NANO_TO.y - nano.y) * slideT;
          const slideDx = (NANO_TO.x - nano.x) * slideT;
          const float = Math.sin(slideT * Math.PI);
          const slideScale = 1 + 0.02 * float;
          const slideZ = 18 * float;
          return (
            <div
              style={{
                position: 'absolute', left: nano.x, top: nano.y, width: nano.w, height: nano.h,
                transform: `translate3d(${slideDx}px, ${slideDy}px, ${slideZ}px) scale(${slideScale})`,
                transformOrigin: 'center center',
                boxShadow: `0 ${2 + 14 * float}px ${6 + 26 * float}px rgba(60,45,30,${0.08 + 0.1 * float})`,
                borderRadius: 16, overflow: 'hidden', zIndex: 2,
              }}
            >
              <Img src={staticFile(`textures/live/${nano.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
            </div>
          );
        })()}

        {/* ---- search box: paper patch over the placeholder (keeps magnifier), typed text + caret ---- */}
        {frame >= 0 ? (
          <div
            style={{
              position: 'absolute', left: 440, top: SEARCH.y + 4,
              width: SEARCH.x + SEARCH.w - 448, height: SEARCH.h - 8,
              background: FIELD, opacity: 1, pointerEvents: 'none',
            }}
          />
        ) : null}
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
            <span style={{ display: 'inline-block', width: 2, height: 20, marginLeft: 2, background: AMBER }} />
          ) : null}
        </div>

        {/* ---- click ripple: two concentric amber rings ---- */}
        {[0, 1].map((r) => {
          const start = 58 + r * 3; // 176 - 118
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
                width: rad * 2, height: rad * 2, borderRadius: '50%',
                border: `2px solid ${AMBER}`, opacity: 1 - t, pointerEvents: 'none', zIndex: 5,
              }}
            />
          );
        })}

        {/* ---- selected-card amber outline, lit from the click ---- */}
        {frame >= 60 ? (
          <div
            style={{
              position: 'absolute', left: NANO_TO.x - 6, top: NANO_TO.y - 6,
              width: nano.w + 12, height: nano.h + 12, borderRadius: 16,
              border: `3px solid ${AMBER}`, boxShadow: '0 0 40px rgba(180,120,50,0.5)',
              opacity: interpolate(frame, [60, 63], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              pointerEvents: 'none', zIndex: 4,
            }}
          />
        ) : null}
      </PageCam2D>
    </AbsoluteFill>
  );
};
