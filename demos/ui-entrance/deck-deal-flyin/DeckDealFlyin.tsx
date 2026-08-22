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
import { Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
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

const CAM_KEYS: CamKey2D[] = [
  { frame: 0, cx: PILE_CX - 30, cy: PILE_CY + 60, zoom: 1.95, rotX: 46, rotY: -30, rotZ: 9, persp: 1100 },
  { frame: 34, cx: PILE_CX + 30, cy: PILE_CY + 40, zoom: 1.85, rotX: 42, rotY: 26, rotZ: -7, persp: 1100 },
  { frame: 62, cx: 960, cy: 900, zoom: 0.88, rotX: 26, rotY: 0, rotZ: 2, persp: 1300 },
  { frame: 82, cx: 950, cy: 1900, zoom: 0.78, rotX: 14, rotY: 0, rotZ: 0, persp: 1300 },
  { frame: 98, cx: 960, cy: 3032, zoom: 0.72, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 },
  { frame: 113, cx: 960, cy: 3032, zoom: 0.72, rotX: 0, rotY: 0, rotZ: 0, persp: 1300 },
];

export const DeckDealFlyin: React.FC = () => {
  const frame = useCurrentFrame();

  // anticipation progress (0→1 during 28→36)
  const antT = interpolate(frame, [ANTICIPATE.from, ANTICIPATE.to], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });
  const antDone = frame >= ANTICIPATE.to;

  return (
    <PageCam2D src="textures/live/projects-empty.png" pageH={PAGE_H} keys={CAM_KEYS}>
      {/* dark brushed-metal table under the opening pile close-up */}
      {frame < METAL_FADE[1] ? (
        <div
          style={{
            position: 'absolute', left: -3000, top: -3000, width: 9000, height: 9000,
            opacity: interpolate(frame, [METAL_FADE[0], METAL_FADE[1]], [1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
            background: [
              `radial-gradient(1300px 900px at ${3000 + PILE_CX}px ${3000 + PILE_CY}px, rgba(255,214,150,0.20), rgba(255,190,120,0.06) 40%, transparent 68%)`,
              'repeating-linear-gradient(100deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 2px, transparent 7px)',
              'repeating-linear-gradient(100deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 2px, transparent 4px, transparent 13px)',
              'linear-gradient(115deg, #2a2d33 0%, #383c44 28%, #22242a 55%, #33363e 78%, #1d1f24 100%)',
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
            ? '0 1px 3px rgba(60,45,30,.14)'
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
  );
};
