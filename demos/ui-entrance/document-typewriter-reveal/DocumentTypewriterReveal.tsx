// document-typewriter-reveal —— 整页真排版文档在光标后自己"写"出来、侧栏跟进、
// 历史条目逐个落入轨道。信息密度最高的一拍，节奏放稳让观众读字。
// 参考实现从 template SceneWbr 剥离（self-contained）：
// 20 块内容两两一对按节拍写入（底色遮罩右锚左→右收窄，强调色 caret 骑揭示前沿，
// 永远只有一个"笔尖"）；人名 @-mention 在 wipe 完成后长出强调色底色；左右双栏靠
// 底色补丁上→下收走入场，内缘强调色细线随揭示生长后淡去；尾段 6 条历史条目从上方
// 逐个落入侧栏轨道（轻弹跳 + 空中影）；相机从标题特写拉到全页后只做微呼吸。
// 相机：标题特写 zoom 1.25 → 64f 全页 zoom 0.997 → 微呼吸。全部块 8f wipe，
// 第 g 对 cue = 6 + g·3.5，最后一对 ~49f 完成（赶在 64f 全页 settle 前）。
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import layout from '../../_textures/live-layout.json';

export const DOCUMENT_TYPEWRITER_REVEAL_DURATION = 110;

type Block = { x: number; y: number; w: number; h: number; tag: string };
const blocks = layout.wbr.blocks as Block[];
const leftRail = layout.wbr.leftRail;
const rightRail = layout.wbr.rightRail;
const PAGE_H = layout.wbr.pageH;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const PAPER = '#fdfcfa';
const AMBER = 'oklch(52% 0.115 65)';
const AMBER_WASH = 'oklch(95% 0.05 85)';
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

const CAM_KEYS: CamKey2D[] = [
  { frame: 0, cx: 920, cy: 280, zoom: 1.25 },
  { frame: 22, cx: 920, cy: 310, zoom: 1.21 },
  { frame: 64, cx: 960, cy: 540, zoom: 0.997 },
  { frame: 78, cx: 960, cy: 540, zoom: 1.003 },
  { frame: 102, cx: 960, cy: 540, zoom: 0.995 },
];

const REVEAL_EASE = Easing.bezier(0.4, 0, 0.6, 1);
const cueFor = (i: number) => 6 + Math.floor(i / 2) * 3.5;
const WIPE = 8;

const PAST_WEEKS = [
  { week: '2026 第 27 周', date: '7月3日', title: '2026-W27 · Foundation Lab Weekly' },
  { week: '2026 第 26 周', date: '6月26日', title: '2026-W26 · Foundation Lab Weekly' },
  { week: '2026 第 25 周', date: '6月19日', title: '2026-W25 · Foundation Lab Weekly' },
  { week: '2026 第 24 周', date: '6月12日', title: '2026-W24 · Foundation Lab Weekly' },
  { week: '2026 第 23 周', date: '6月5日', title: '2026-W23 · Foundation Lab Weekly' },
  { week: '2026 第 22 周', date: '5月29日', title: '2026-W22 · Foundation Lab Weekly' },
];
const WEEK_Y0 = 228;
const WEEK_H = 56;
const WEEK_CUE = (i: number) => 58 + i * 5;
const WEEK_DROP = Easing.bezier(0.2, 1.15, 0.3, 1);

// member-name headings (tag=h2) get the @-mention amber wash; the pinned
// "Jackie's Download" digest heading (the first h2) is not a member name.
const memberH2 = new Set<number>();
{
  let seenH2 = 0;
  blocks.forEach((b, i) => {
    if (b.tag === 'h2' && seenH2++ > 0) memberH2.add(i);
  });
}

export const DocumentTypewriterReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const kick = interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // caret follows only the newest block still being written
  let caretIdx = -1;
  blocks.forEach((_, i) => {
    if (frame >= cueFor(i) && frame <= cueFor(i) + WIPE + 2) caretIdx = i;
  });

  return (
    <>
      <PageCam2D src="textures/live/wbr-full.png" pageH={PAGE_H} keys={CAM_KEYS}>
        {blocks.map((p, i) => {
          const cue = cueFor(i);
          const coverT = interpolate(frame, [cue, cue + WIPE], [1, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: REVEAL_EASE,
          });
          const bx = p.tag === 'li' ? p.x - 28 : p.x - 4;
          const by = p.y - 3;
          const bw = p.w + (p.tag === 'li' ? 34 : 10);
          const bh = p.h + 6;
          const caretX = bx + bw * (1 - coverT);
          const caretH = Math.min(20, p.h - 2);
          const nameCue = cue + WIPE + 4;
          const nameGrow = memberH2.has(i)
            ? interpolate(frame, [nameCue, nameCue + 8], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
              })
            : 0;

          return (
            <div key={i}>
              {nameGrow > 0 ? (
                <div
                  style={{
                    position: 'absolute', left: p.x - 3, top: p.y - 1,
                    width: (p.w + 8) * nameGrow, height: p.h + 2,
                    background: AMBER_WASH, opacity: 0.7, borderRadius: 3, pointerEvents: 'none',
                  }}
                />
              ) : null}

              {coverT > 0 ? (
                <div
                  style={{
                    position: 'absolute', left: bx, top: by, width: bw, height: bh,
                    overflow: 'hidden', pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: `${coverT * 100}%`, background: PAPER,
                    }}
                  />
                </div>
              ) : null}

              {i === caretIdx ? (
                <div
                  style={{
                    position: 'absolute', left: caretX, top: p.y + (p.h - caretH) / 2,
                    width: 2, height: caretH, background: AMBER,
                    opacity: coverT > 0 ? 1 : interpolate(frame, [cue + WIPE, cue + WIPE + 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>
          );
        })}

        {/* side-rail entrances: paper patch shrinks downward = rail revealed */}
        {[
          { rail: leftRail, cue: 46, inner: 'right' as const },
          { rail: rightRail, cue: 54, inner: 'left' as const },
        ].map(({ rail, cue, inner }, i) => {
          const t = interpolate(frame, [cue, cue + 10], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
          });
          const lineFade = interpolate(frame, [cue + 10, cue + 24], [1, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <div key={`rail${i}`}>
              {t < 1 ? (
                <div
                  style={{
                    position: 'absolute', left: rail.x, top: rail.y + rail.h * t,
                    width: rail.w, height: rail.h * (1 - t), background: PAPER, pointerEvents: 'none',
                  }}
                />
              ) : null}
              {frame >= cue && lineFade > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: inner === 'right' ? rail.x + rail.w - 1.5 : rail.x,
                    top: rail.y, width: 1.5, height: rail.h * t,
                    background: AMBER, opacity: lineFade, pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>
          );
        })}

        {/* past weeks drop into the left rail from above, stacking in order */}
        {PAST_WEEKS.map((w, i) => {
          const cue = WEEK_CUE(i);
          if (frame < cue) return null;
          const t = interpolate(frame, [cue, cue + 8], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: WEEK_DROP,
          });
          const appear = interpolate(frame, [cue, cue + 3], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const air = Math.max(0, 1 - t);
          return (
            <div
              key={w.week}
              style={{
                position: 'absolute', left: 4, top: WEEK_Y0 + i * WEEK_H,
                width: leftRail.w - 8, height: WEEK_H,
                transform: `translateY(${-44 * air}px)`, opacity: appear,
                boxShadow: air > 0.02 ? `0 ${10 * air}px ${20 * air}px rgba(30,25,18,${0.16 * air})` : 'none',
                background: PAPER, borderBottom: '1px solid rgba(31,41,55,0.07)',
                padding: '8px 10px 0', boxSizing: 'border-box',
                fontFamily: SANS, pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{w.week}</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>{w.date}</span>
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {w.title}
              </div>
            </div>
          );
        })}
      </PageCam2D>

      {/* screen-space kicker, top-right */}
      <div
        style={{
          position: 'absolute', top: 16, right: 96, textAlign: 'right',
          fontFamily: MONO, fontSize: 24, letterSpacing: '0.14em',
          color: 'oklch(50% 0.006 82)', textTransform: 'uppercase',
          opacity: kick, pointerEvents: 'none',
        }}
      >
        Weekly Brief · 2026-W28
      </div>
    </>
  );
};
