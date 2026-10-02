// document-typewriter-reveal —— 整页真排版文档在光标后自己"写"出来、侧栏跟进、
// 历史条目逐个落入轨道。信息密度最高的一拍，节奏放稳让观众读字。
// 参考实现从 template SceneWbr 剥离（self-contained）：
// 20 块内容两两一对按节拍写入（底色遮罩右锚左→右收窄，强调色 caret 骑揭示前沿，
// 永远只有一个"笔尖"）；人名 @-mention 在 wipe 完成后长出强调色底色；左右双栏靠
// 底色补丁上→下收走入场，内缘强调色细线随揭示生长后淡去；尾段 6 条历史条目从上方
// 逐个落入侧栏轨道（轻弹跳 + 空中影）；相机从标题特写拉到全页后只做微呼吸。
// 相机：标题特写 zoom 1.25 → 64f 全页 zoom 0.997 → 微呼吸。全部块 8f wipe，
// 第 g 对 cue = 6 + g·3.5，最后一对 ~49f 完成（赶在 64f 全页 settle 前）。
// 质感层（改版）：
//   · 开场机位 cy 280 会露出页面上方 150px 的空底，改为贴住页顶的标题特写；
//   · 相机关键帧走单调三次 Hermite 样条逐帧展开（原逐段 ease-in-out 在 f22 处速度归零再起步）；
//   · 写入遮罩右侧多盖（标题 120px）：块测量宽度比粗体标题实际字宽短，原版标题尾词会从遮罩外"漏"出来；
//   · @-mention 底色改 multiply 混合：原来盖在字上面，人名被洗成浅色；
//   · caret 加一层同色柔光；屏幕空间 kicker 从悬浮的灰色等宽字改成带底的发丝线 chip。
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
const PAPER = '#fefcf9'; // 与纹理纸面实测色一致（原 #fdfcfa 差 1–2 级，遮罩边缘隐约成块）
const AMBER = 'oklch(52% 0.115 65)';
const AMBER_WASH = 'oklch(95% 0.05 85)';
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

const CAM_ANCHORS: CamKey2D[] = [
  // 标题特写：cy 下限 = 540/zoom，否则视口顶会露出页面以外的空底
  { frame: 0, cx: 920, cy: 440, zoom: 1.25 },
  { frame: 22, cx: 920, cy: 452, zoom: 1.21 },
  { frame: 64, cx: 960, cy: 540, zoom: 0.997 },
  { frame: 78, cx: 960, cy: 540, zoom: 1.003 },
  { frame: 102, cx: 960, cy: 540, zoom: 0.995 },
];

// 单调三次 Hermite（Fritsch–Carlson）：各参数分别过锚点，关键帧处速度连续、不过冲
const hermite = (xs: number[], ys: number[]) => {
  const n = xs.length;
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) => (i === 0 ? 0 : i === n - 1 ? 0 : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (x: number) => {
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = Math.min(1, Math.max(0, (x - xs[i]) / h));
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
};
const CURVE = (k: 'cx' | 'cy' | 'zoom') => hermite(CAM_ANCHORS.map((a) => a.frame), CAM_ANCHORS.map((a) => a[k]));
const CX = CURVE('cx'), CY = CURVE('cy'), ZM = CURVE('zoom');
const CAM_KEYS: CamKey2D[] = Array.from({ length: DOCUMENT_TYPEWRITER_REVEAL_DURATION + 1 }, (_, f) => ({
  frame: f, cx: CX(f), cy: CY(f), zoom: ZM(f),
}));
const LINEAR = (t: number) => t;

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
  const kick = interpolate(frame, [8, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) });

  // caret follows only the newest block still being written
  let caretIdx = -1;
  blocks.forEach((_, i) => {
    if (frame >= cueFor(i) && frame <= cueFor(i) + WIPE + 2) caretIdx = i;
  });

  return (
    <>
      <PageCam2D src="textures/live/wbr-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={LINEAR}>
        {blocks.map((p, i) => {
          const cue = cueFor(i);
          const coverT = interpolate(frame, [cue, cue + WIPE], [1, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: REVEAL_EASE,
          });
          const bx = p.tag === 'li' ? p.x - 28 : p.x - 4;
          const by = p.y - 3;
          // 右侧多盖：块测量宽度比粗体标题的实际字宽短（h1 测得 328、实际约 400），否则尾词
          // 会漏出遮罩；标题类多盖 120px，正文列宽已是整栏，只补 24px
          const bw = p.w + (p.tag === 'li' ? 34 : 10) + (p.tag === 'li' ? 24 : 120);
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
                    background: AMBER_WASH, opacity: 0.9, borderRadius: 3, pointerEvents: 'none',
                    // multiply：只染纸面不洗字（盖在纹理字上方，normal 混合会把人名洗浅）
                    mixBlendMode: 'multiply',
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
                    width: 2, height: caretH, background: AMBER, borderRadius: 1,
                    boxShadow: '0 0 6px oklch(70% 0.12 70 / 0.55)',
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

      {/* screen-space kicker, top-right：带底发丝线 chip，从右侧 12px 滑入 */}
      <div
        style={{
          position: 'absolute', top: 14, right: 72, height: 44,
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px 0 16px',
          borderRadius: 22, background: 'rgba(253,252,250,0.86)',
          border: '1px solid rgba(31,41,55,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(30,25,18,0.06), 0 8px 24px -8px rgba(30,25,18,0.18)',
          fontFamily: MONO, fontSize: 22, letterSpacing: '0.12em', fontWeight: 500,
          color: 'oklch(40% 0.008 82)', textTransform: 'uppercase',
          opacity: kick, transform: `translateX(${(1 - kick) * 12}px)`, pointerEvents: 'none',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: AMBER, boxShadow: '0 0 0 3px oklch(95% 0.05 85)' }} />
        Weekly Brief · 2026-W28
      </div>
    </>
  );
};
