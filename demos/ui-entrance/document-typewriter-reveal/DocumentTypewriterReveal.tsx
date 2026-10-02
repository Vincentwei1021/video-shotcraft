// document-typewriter-reveal —— 整页真排版文档在光标后自己"写"出来、侧栏跟进、历史条目逐个落入轨道
// （第二轮重设计 · 极光暗场 · 悬浮应用窗）
// 手法不变：内容块两两一对按节拍被"写"出（页面底色遮罩右锚收窄，强调色笔尖骑在揭示前沿，永远只有一个笔尖）；
// 人名标题写完后长出强调色底；左右双栏随后自上而下揭开；尾段 6 条历史周报逐条落入左栏。
//
// 设计决定
// - look = aurora（紫夜 + 紫/粉光）。真实周报页面截图保留（Q1），但不再铺满全屏：它是一扇悬浮在紫夜舞台上的
//   应用窗口——圆角、发丝亮边、背后一圈紫色背光、脚下的长投影；暖白纸面在冷紫夜里像一盏灯。
// - 相机（单调 Hermite 样条，起止无速度突变）：开场 1.42x 斜侧（rotY −18°）特写标题，窗口左上角与舞台光同时入画；
//   笔尖往下写时相机一路后撤、把斜侧角收小，到全窗（双栏完整入画，Q10）；最后微俯、上移让出底部给一行标语。
// - 笔尖：深紫 3px caret + 同色柔光；人名标题的强调底改成极光紫 multiply（只染纸不洗字）。
// - 收尾标语「The weekly brief / writes itself.」——第二行强调色，底部左对齐窗口左缘。
//
// 时间表（30fps，共 150f）
//   0–8     标题特写已在画面（窗口 + 光），笔尖在标题起点
//   8–58    写入：20 块两两一对，第 g 对 cue = 8 + 4.4g，每块 9f（in-out），最后一对 ~57f 写完
//   0–64    相机后撤：1.42x 斜侧 → 0.86x 全窗
//   54/62   左 / 右栏自上而下揭开（10f）+ 内缘强调线生长后淡去
//   66–100  历史周报 6 条逐条落入左栏（每 5f 一条，9f 轻弹跳 + 空中影）
//   70–104  相机微俯上移到海报位（0.74x）
//   100–126 标语逐词升起
//   126–150 hold：0.8% 极缓推近，光的呼吸
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, TextReveal, alpha, type } from '../../_fixtures/Look';
import layout from '../../_textures/live-layout.json';

export const DOCUMENT_TYPEWRITER_REVEAL_DURATION = 150;

const L = LOOKS.aurora;
type Block = { x: number; y: number; w: number; h: number; tag: string };
const blocks = layout.wbr.blocks as Block[];
const leftRail = layout.wbr.leftRail;
const rightRail = layout.wbr.rightRail;
const PAGE_W = 1920;
const PAGE_H = layout.wbr.pageH;

const PAPER = '#fefcf9'; // 纹理纸面实测色
const CARET = '#7a4dff'; // 深一档的极光紫：暖白纸上要看得见
const WASH = 'rgba(196,170,255,0.4)';
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

// ───────────── 相机 ─────────────
type Cam = { cx: number; cy: number; zoom: number; rotX: number; rotY: number; sx: number; sy: number };
type Key = Cam & { frame: number };
const ANCHORS: Key[] = [
  { frame: 0, cx: 690, cy: 320, zoom: 1.42, rotX: 8, rotY: -18, sx: 0, sy: 0 },
  { frame: 26, cx: 770, cy: 390, zoom: 1.24, rotX: 6, rotY: -13, sx: 0, sy: 0 },
  { frame: 64, cx: 960, cy: 540, zoom: 0.86, rotX: 4, rotY: -6, sx: 0, sy: -10 },
  { frame: 104, cx: 960, cy: 540, zoom: 0.74, rotX: 9, rotY: -3, sx: 0, sy: -78 },
  { frame: 150, cx: 960, cy: 540, zoom: 0.746, rotX: 9, rotY: -3, sx: 0, sy: -80 },
];
const PARAMS: (keyof Cam)[] = ['cx', 'cy', 'zoom', 'rotX', 'rotY', 'sx', 'sy'];
const hermite = (xs: number[], ys: number[]) => {
  const n = xs.length;
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) => (i === 0 || i === n - 1 ? 0 : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
};
const CURVES = Object.fromEntries(PARAMS.map((p) => [p, hermite(ANCHORS.map((k) => k.frame), ANCHORS.map((k) => k[p]))])) as Record<keyof Cam, (x: number) => number>;
const camAt = (f: number): Cam => Object.fromEntries(PARAMS.map((p) => [p, CURVES[p](f)])) as Cam;
// 相机层：缩放走布局级 zoom（Q2），把页面点 (cx,cy) 送到屏幕 (960+sx, 540+sy)
const PERSP = 2200;

// ───────────── 写入节拍 ─────────────
const REVEAL_EASE = Easing.bezier(0.4, 0, 0.6, 1);
const cueFor = (i: number) => 8 + Math.floor(i / 2) * 4.4;
const WIPE = 9;

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
const WEEK_CUE = (i: number) => 66 + i * 5;
const WEEK_DROP = Easing.bezier(0.2, 1.15, 0.3, 1);

// 成员名标题（tag=h2，跳过第一个"Jackie's Download"摘要标题）写完后长出强调底
const memberH2 = new Set<number>();
{
  let seenH2 = 0;
  blocks.forEach((b, i) => {
    if (b.tag === 'h2' && seenH2++ > 0) memberH2.add(i);
  });
}

export const DocumentTypewriterReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);

  // 只有一个笔尖：跟最新的、仍在写的块
  let caretIdx = -1;
  blocks.forEach((_, i) => {
    if (frame >= cueFor(i) && frame <= cueFor(i) + WIPE + 2) caretIdx = i;
  });
  // 开场 8f 笔尖在标题起点闪烁待命
  const idleBlink = frame < cueFor(0) ? (Math.floor(frame / 4) % 2 === 0 ? 1 : 0.25) : 0;

  const tagIn = ramp(frame, 100, 20, EASE.out);

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.88, y: 0.95 }} horizon={0.9} breathe={0.7} intensity={0.9}>
        <Dust look={L} count={24} seed={9} drift={0.16} opacity={0.4} />
      </Stage>

      {/* 3D 相机 */}
      <AbsoluteFill style={{ transform: `translate(${cam.sx.toFixed(2)}px, ${cam.sy.toFixed(2)}px)` }}>
        <div style={{ position: 'absolute', inset: 0, perspective: `${(PERSP * cam.zoom).toFixed(2)}px`, perspectiveOrigin: '960px 540px' }}>
          <div
            style={{
              position: 'absolute', width: PAGE_W, height: PAGE_H, zoom: cam.zoom,
              transform: `translate(${(960 / cam.zoom - cam.cx).toFixed(3)}px, ${(540 / cam.zoom - cam.cy).toFixed(3)}px) rotateY(${cam.rotY.toFixed(3)}deg) rotateX(${cam.rotX.toFixed(3)}deg)`,
              transformOrigin: `${cam.cx.toFixed(2)}px ${cam.cy.toFixed(2)}px`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 背光：窗口背后的一圈紫光（页面空间，随窗口一起透视） */}
            <div
              style={{
                position: 'absolute', left: -220, top: -180, width: PAGE_W + 440, height: PAGE_H + 400, pointerEvents: 'none',
                background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.34)} 0%, ${alpha(L.accent2, 0.1)} 55%, transparent 72%)`,
                transform: 'translateZ(-40px)',
              }}
            />
            {/* 应用窗口：真实截图 + 写入遮罩 + 栏位 + 历史条目，全部裁进圆角 */}
            <div
              style={{
                position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, borderRadius: 26, overflow: 'hidden',
                background: PAPER,
                boxShadow: `0 0 0 1.5px ${alpha('#ffffff', 0.35)}, 0 70px 160px -20px ${alpha(L.shadow, 0.95)}, 0 20px 60px ${alpha('#000000', 0.55)}`,
              }}
            >
              <Img src={staticFile('textures/live/wbr-full.png')} style={{ position: 'absolute', width: PAGE_W, height: PAGE_H }} />

              {blocks.map((p, i) => {
                const cue = cueFor(i);
                const coverT = interpolate(frame, [cue, cue + WIPE], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: REVEAL_EASE });
                const bx = p.tag === 'li' ? p.x - 28 : p.x - 4;
                const by = p.y - 3;
                const bw = p.w + (p.tag === 'li' ? 34 : 10) + (p.tag === 'li' ? 24 : 120);
                const bh = p.h + 6;
                const caretX = bx + bw * (1 - coverT);
                const caretH = Math.min(22, p.h - 2);
                const nameCue = cue + WIPE + 4;
                const nameGrow = memberH2.has(i)
                  ? interpolate(frame, [nameCue, nameCue + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) })
                  : 0;
                // 写入中的笔尖只骑在实际文字宽度内（遮罩右侧多盖的空白段不走笔尖）
                const textRight = p.x + p.w + 6;
                return (
                  <React.Fragment key={i}>
                    {nameGrow > 0 ? (
                      <div style={{ position: 'absolute', left: p.x - 4, top: p.y - 1, width: (p.w + 10) * nameGrow, height: p.h + 2, background: WASH, borderRadius: 4, mixBlendMode: 'multiply' }} />
                    ) : null}
                    {coverT > 0 ? (
                      <div style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${coverT * 100}%`, background: PAPER }} />
                      </div>
                    ) : null}
                    {i === caretIdx ? (
                      <div
                        style={{
                          position: 'absolute', left: Math.min(caretX, textRight), top: p.y + (p.h - caretH) / 2, width: 3, height: caretH, background: CARET, borderRadius: 2,
                          boxShadow: `0 0 8px ${alpha(CARET, 0.6)}, 0 0 20px ${alpha(L.accent, 0.45)}`,
                          opacity: coverT > 0 ? 1 : interpolate(frame, [cue + WIPE, cue + WIPE + 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                        }}
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
              {/* 开场待命笔尖 */}
              {idleBlink > 0 ? (
                <div style={{ position: 'absolute', left: blocks[0].x - 4, top: blocks[0].y + 3, width: 3, height: 22, background: CARET, borderRadius: 2, opacity: idleBlink, boxShadow: `0 0 8px ${alpha(CARET, 0.6)}` }} />
              ) : null}

              {/* 双栏揭开：纸面补丁自上而下收走，内缘强调线随揭示生长后淡去 */}
              {[
                { rail: leftRail, cue: 54, inner: 'right' as const },
                { rail: rightRail, cue: 62, inner: 'left' as const },
              ].map(({ rail, cue, inner }, i) => {
                const t = interpolate(frame, [cue, cue + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) });
                const lineFade = interpolate(frame, [cue + 10, cue + 24], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                return (
                  <React.Fragment key={`rail${i}`}>
                    {t < 1 ? <div style={{ position: 'absolute', left: rail.x, top: rail.y + rail.h * t, width: rail.w, height: rail.h * (1 - t), background: PAPER }} /> : null}
                    {frame >= cue && lineFade > 0 ? (
                      <div style={{ position: 'absolute', left: inner === 'right' ? rail.x + rail.w - 2 : rail.x, top: rail.y, width: 2, height: rail.h * t, background: CARET, opacity: lineFade, boxShadow: `0 0 10px ${alpha(L.accent, 0.6)}` }} />
                    ) : null}
                  </React.Fragment>
                );
              })}

              {/* 历史周报：从上方逐条落入左栏 */}
              {PAST_WEEKS.map((w, i) => {
                const cue = WEEK_CUE(i);
                if (frame < cue) return null;
                const t = interpolate(frame, [cue, cue + 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: WEEK_DROP });
                const appear = interpolate(frame, [cue, cue + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const air = Math.max(0, 1 - t);
                return (
                  <div
                    key={w.week}
                    style={{
                      position: 'absolute', left: 4, top: WEEK_Y0 + i * WEEK_H, width: leftRail.w - 8, height: WEEK_H,
                      transform: `translateY(${-48 * air}px)`, opacity: appear,
                      boxShadow: air > 0.02 ? `0 ${12 * air}px ${24 * air}px rgba(40,20,60,${0.2 * air})` : 'none',
                      background: PAPER, borderBottom: '1px solid rgba(31,41,55,0.07)', padding: '8px 10px 0', boxSizing: 'border-box', fontFamily: SANS,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{w.week}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{w.date}</span>
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</div>
                  </div>
                );
              })}
              {/* 窗口上沿受光：一道极淡的顶部高光（玻璃感） */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)' }} />
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* 收尾标语：底部，左对齐窗口左缘 */}
      <div style={{ position: 'absolute', left: 250, top: 930, display: 'flex', alignItems: 'baseline', gap: 0, ...type(84, 760), color: L.ink, opacity: tagIn > 0 ? 1 : 0 }}>
        <TextReveal text="The weekly brief" by="word" variant="rise" start={100} each={16} gap={3} />
        <TextReveal text="writes itself." by="word" variant="rise" start={108} each={16} gap={3} style={{ color: L.accent, marginLeft: '0.26em' }} />
      </div>
    </AbsoluteFill>
  );
};
