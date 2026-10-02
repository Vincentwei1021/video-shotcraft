// deck-deal-flyin —— 实体牌堆特写环绕开局 → 拉远 → 一摞卡硬加速甩进网格 →
// 相机追逐滚动 → 满板停半秒。展示"内容量大/源源不断汇入"的列表页第一印象。
// 参考实现从 template SceneFlyIn 0–113 段剥离（self-contained），保留三段核心：
//   1) 0–35 orbit 环绕特写：26 卡叠成有物理高度的实体牌堆，暗色拉丝金属背景，
//      相机侧斜特写绕堆环绕（四件套：侧面倾斜角+可感知高度+orbit+反差深色材质）；
//   2) 预备拍（anticipation）：首张出牌前牌堆整体下压 + 顶卡向出牌反方向回拉，
//      幅度必须过肉眼阈值（48/30px 判例）；
//   3) 36–113 发牌 + 追逐 scroll + 0.5s 满板 rest：26 卡按阅读序发向网格，
//      出牌间隔硬加速收缩（gap 4f→0.2f），单卡飞行带 z 弧顶 + settle 过冲 +
//      press 回弹，相机追逐向下滚动越来越快，满板静止 0.5s。
// 运动模糊（相机快速段）本 demo 用残影 ghost 近似，不依赖 @remotion/motion-blur。
// 质感层（改版）：
//   · 相机：原关键帧逐段 ease-in-out，会在 f34/f62/f82 三处完全停住再起步（运镜顿挫）；
//     改为过同一组关键帧的单调三次 Hermite 样条，逐帧展开成 PageCam2D 关键帧（线性插值），
//     速度在关键帧处连续，追逐 scroll 真正"越来越快"，满板前自然减速入 rest；
//   · 金属桌面：粗糙的交叉条纹换成确定性 feTurbulence 各向异性拉丝纹 + 宽幅镜面高光带 + 暖主光；
//   · 金属 → 页面：半透明叠化在中段是一片脏灰，改为以牌堆为圆心的柔边光圈揭开（iris reveal），
//     像"灯从牌堆处亮起"；开场段叠暗角 + 颗粒，随金属一同退场。
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import { Grain, Vignette } from '../../_fixtures/Polish';
import layout from '../../_textures/live-layout.json';

export const DECK_DEAL_FLYIN_DURATION = 113;

const cards = layout.projects.cards;
const PAGE_H = layout.projects.pageH;
const PAPER = '#f9f6f1';

const COLS = [408, 781.328125, 1154.65625];
const CARD_W = 357.328125;
const EXTRA_ROWS = [1795, 2188, 2581, 2974, 3367];
const PAPER_EXT = { x: 0, y: PAGE_H, w: 1920, h: 2036 };

// 16 overflow extras extend the grid DOWNWARD
const extras = Array.from({ length: 16 }, (_, i) => ({
  file: `card${((i * 3 + 2) % 10) + 1}.png`,
  x: i === 0 ? COLS[2] : COLS[(i - 1) % 3],
  y: i === 0 ? 1402 : EXTRA_ROWS[Math.floor((i - 1) / 3)],
  w: CARD_W,
  h: 312,
  title: '',
}));

const PILE = { x: 1430, y: 240 };
const N_CARDS = 26;
const DEAL_START = 36;
const STACK_STEP = 3;

const METAL_FADE = [34, 56] as const;

const grid = [
  ...cards.map((c) => ({ file: c.file, x: c.x, y: c.y, w: c.w, h: c.h, title: c.title })),
  ...extras,
]
  .sort((a, b) => a.y - b.y || a.x - b.x)
  .map((c, k) => ({
    ...c,
    cue: DEAL_START + 4 * k - 0.0792 * k * (k - 1),
    px: PILE.x + (((k * 7) % 9) - 4) * 2,
    py: PILE.y + (((k * 5) % 7) - 3) * 2,
    protZ: ((k * 11) % 7) - 3,
    pz: (N_CARDS - k) * STACK_STEP,
  }));

const PILE_CX = PILE.x + CARD_W / 2;
const PILE_CY = PILE.y + 156;

const HOVER_H = 40;
const SETTLE_EASE = Easing.bezier(0.3, 0, 0.25, 1.15);
const DIVE_EASE = Easing.bezier(0.3, 0, 0.2, 1);

// anticipation: before the first deal, the whole pile presses down and the top
// card pulls back against the deal direction (magnitude must pass the eye — 48/30px)
const ANTICIPATE = {
  from: 28, // 36 - 8
  to: 36,
  pileDown: 48,
  topPull: 30,
};

const CAM_ANCHORS: CamKey2D[] = [
  { frame: 0, cx: PILE_CX - 30, cy: PILE_CY + 60, zoom: 1.95, rotX: 46, rotY: -30, rotZ: 9, persp: 1100 },
  { frame: 34, cx: PILE_CX + 30, cy: PILE_CY + 40, zoom: 1.85, rotX: 42, rotY: 26, rotZ: -7, persp: 1100 },
  { frame: 62, cx: 960, cy: 900, zoom: 0.88, rotX: 26, rotY: 0, rotZ: 2, persp: 1300 },
  { frame: 82, cx: 950, cy: 1900, zoom: 0.78, rotX: 14, rotY: 0, rotZ: 0, persp: 1300 },
  { frame: 98, cx: 960, cy: 3032, zoom: 0.72, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 },
  { frame: 113, cx: 960, cy: 3032, zoom: 0.72, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 },
];

// —— 相机样条：单调三次 Hermite（Fritsch–Carlson），各参数分别过锚点，关键帧处速度连续 ——
type CamParam = 'cx' | 'cy' | 'zoom' | 'rotX' | 'rotY' | 'rotZ' | 'persp';
const PARAMS: CamParam[] = ['cx', 'cy', 'zoom', 'rotX', 'rotY', 'rotZ', 'persp'];
const hermite = (xs: number[], ys: number[]) => {
  const n = xs.length;
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  // 最后一段（满板 rest）两端速度为 0：相机稳稳停住
  m[n - 1] = 0;
  return (x: number) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = Math.min(1, Math.max(0, (x - xs[i]) / h));
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
};
const CURVES = Object.fromEntries(
  PARAMS.map((p) => [p, hermite(CAM_ANCHORS.map((k) => k.frame), CAM_ANCHORS.map((k) => (k[p] as number | undefined) ?? (p === 'persp' ? 1400 : 0)))]),
) as Record<CamParam, (x: number) => number>;
const CAM_KEYS: CamKey2D[] = Array.from({ length: DECK_DEAL_FLYIN_DURATION + 1 }, (_, f) => ({
  frame: f,
  cx: CURVES.cx(f),
  cy: CURVES.cy(f),
  zoom: CURVES.zoom(f),
  rotX: CURVES.rotX(f),
  rotY: CURVES.rotY(f),
  rotZ: CURVES.rotZ(f),
  persp: CURVES.persp(f),
}));
const LINEAR = (t: number) => t;

// —— 拉丝金属纹理：确定性 feTurbulence（x 极低频 / y 高频 = 横向拉丝），无缝小图平铺 ——
const BRUSH_TILE = (() => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'>` +
    `<filter id='b' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.0018 0.62' numOctaves='3' seed='11' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.6 0.6 0.6 0 -0.66'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#b)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

// 金属 → 页面的光圈揭开：f34→58 以牌堆为圆心，柔边半径从 0 扩到 3400px（页面空间）
const REVEAL = [34, 58] as const;

export const DeckDealFlyin: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [REVEAL[0], REVEAL[1]], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.5, 0, 0.75, 0.6),
  });
  const holeR = 3400 * reveal;
  const feather = 520 + 900 * reveal;
  // 开场氛围（暗角 + 颗粒）随金属一起退场
  const moodOp = interpolate(frame, [30, 56], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // anticipation progress (0→1 during 28→36)
  const antT = interpolate(frame, [ANTICIPATE.from, ANTICIPATE.to], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });
  const antDone = frame >= ANTICIPATE.to;

  return (
    <AbsoluteFill>
    <PageCam2D src="textures/live/projects-empty.png" pageH={PAGE_H} keys={CAM_KEYS} ease={LINEAR}>
      {/* dark brushed-metal table under the opening pile close-up */}
      {frame < METAL_FADE[1] + 4 ? (
        <div
          style={{
            position: 'absolute', left: -3000, top: -3000, width: 9000, height: 9000,
            // 光圈揭开：牌堆处先"亮"出纸面，柔边向外扩散；尾段整体再收掉残余
            opacity: interpolate(frame, [METAL_FADE[1] - 6, METAL_FADE[1] + 4], [1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
            WebkitMaskImage: reveal > 0
              ? `radial-gradient(circle at ${3000 + PILE_CX}px ${3000 + PILE_CY}px, transparent ${holeR.toFixed(0)}px, #000 ${(holeR + feather).toFixed(0)}px)`
              : undefined,
            maskImage: reveal > 0
              ? `radial-gradient(circle at ${3000 + PILE_CX}px ${3000 + PILE_CY}px, transparent ${holeR.toFixed(0)}px, #000 ${(holeR + feather).toFixed(0)}px)`
              : undefined,
            background: [
              // 暖主光：落在牌堆上
              `radial-gradient(1300px 900px at ${3000 + PILE_CX}px ${3000 + PILE_CY}px, rgba(255,214,150,0.22), rgba(255,190,120,0.07) 40%, transparent 68%)`,
              // 宽幅镜面高光带：拉丝金属被斜光扫过的那条亮带
              `linear-gradient(104deg, transparent ${3000 + PILE_CX - 1500}px, rgba(220,228,240,0.10) ${3000 + PILE_CX - 500}px, rgba(240,244,252,0.16) ${3000 + PILE_CX}px, rgba(220,228,240,0.08) ${3000 + PILE_CX + 600}px, transparent ${3000 + PILE_CX + 1700}px)`,
              // 各向异性拉丝纹（确定性噪声小图平铺）
              `${BRUSH_TILE} 0 0 / 640px 640px repeat`,
              // 钢色底：冷灰带一点蓝
              'linear-gradient(115deg, #24272d 0%, #33373f 30%, #202228 56%, #2c2f36 80%, #1a1c21 100%)',
            ].join(', '),
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* paper extension below the texture */}
      <div
        style={{
          position: 'absolute', left: PAPER_EXT.x, top: PAPER_EXT.y,
          width: PAPER_EXT.w, height: PAPER_EXT.h, background: PAPER, pointerEvents: 'none',
        }}
      />

      {/* 26 cards: pile at top-right, each deals itself on accelerating cadence */}
      {grid.map((c, i) => {
        const { cue } = c;
        const radius = 16;

        // deal dive (cue→cue+8) then settle (cue+8→cue+12)
        const diveT = interpolate(frame, [cue, cue + 8], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: DIVE_EASE,
        });
        const settleT = interpolate(frame, [cue + 8, cue + 12], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: SETTLE_EASE,
        });

        const dx = (c.px - c.x) * (1 - diveT);
        const dy = (c.py - c.y) * (1 - diveT);
        const rotFlight = c.protZ * (1 - diveT);
        const arc = Math.sin(diveT * Math.PI) * 90;
        const zDive = interpolate(diveT, [0, 1], [c.pz, HOVER_H]) + arc;
        const z = frame < cue ? c.pz : zDive * (1 - settleT);

        const dealScale = 1 + Math.sin(diveT * Math.PI) * 0.06;
        const press = interpolate(frame, [cue + 10, cue + 11, cue + 12], [1, 0.996, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const scale = dealScale * press;

        const landed = frame >= cue + 12;
        const inPile = frame < cue;

        // anticipation: whole pile presses down, top card pulls back
        const antDy = inPile ? ANTICIPATE.pileDown * antT : 0;
        const antPull = i === 0 && inPile ? ANTICIPATE.topPull * antT : 0;

        const transform = landed
          ? 'translate3d(0px, 0px, 0px)'
          : inPile
            ? `translate3d(${c.px - c.x - antPull}px, ${c.py - c.y + antDy}px, ${c.pz}px) rotateZ(${c.protZ}deg)`
            : `translate3d(${dx}px, ${dy}px, ${z}px) rotateZ(${rotFlight}deg) scale(${scale})`;

        const shadow = landed
          ? '0 2px 6px rgba(60,45,30,.08)'
          : inPile
            ? i === N_CARDS - 1
              // 牌堆最底一张：在金属桌面上投一块大而虚的落影（随金属退场减弱），牌堆"压"在桌上
              ? `0 1px 3px rgba(60,45,30,.14), 0 22px 48px rgba(0,0,0,${(0.5 * (1 - reveal) + 0.1).toFixed(3)})`
              : '0 1px 3px rgba(60,45,30,.14)'
            : `0 ${36 - 30 * settleT}px ${70 - 60 * settleT}px rgba(60,45,30,${0.3 - 0.22 * settleT})`;

        // motion-blur ghost during the deal (cheap approximation)
        const showGhost = diveT > 0.02 && diveT < 0.98;
        const ghostLagX = (c.px - c.x) * 0.05;
        const ghostLagY = (c.py - c.y) * 0.05;

        return (
          <div key={`${c.file}-${i}`} style={{ transformStyle: 'preserve-3d' }}>
            {showGhost ? (
              <div
                style={{
                  position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
                  transform: `translate3d(${dx + ghostLagX}px, ${dy + ghostLagY}px, ${z}px) rotateZ(${rotFlight}deg) scale(${scale})`,
                  transformOrigin: 'center center', opacity: 0.25 * (1 - diveT),
                  filter: 'blur(6px)', borderRadius: radius, overflow: 'hidden', pointerEvents: 'none',
                }}
              >
                <Img src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
              </div>
            ) : null}

            <div
              style={{
                position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
                transform, transformOrigin: 'center center', boxShadow: shadow,
                borderRadius: radius, overflow: 'hidden',
              }}
            >
              <Img src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
            </div>
          </div>
        );
      })}

      {/* near-edge rim light along the extended board's leading (bottom) edge */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0,
          top: PAPER_EXT.y + PAPER_EXT.h - 8, height: 8,
          background: 'rgba(255,255,255,0.85)', filter: 'blur(6px)', opacity: 0.5, pointerEvents: 'none',
        }}
      />
    </PageCam2D>
      {moodOp > 0 ? (
        <AbsoluteFill style={{ opacity: moodOp, pointerEvents: 'none' }}>
          <Vignette strength={0.55} inner={0.4} color="#050608" />
          <Grain opacity={0.09} blend="soft-light" />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
