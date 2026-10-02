// popup-book-rise —— 立体书立起
// FakeDashboard(A) 打平躺下（场景 rotateX 75° 透视俯视），6 张卡片是贴在页上的
// 纸片，沿各自底边从平躺错峰立起（rotateX 90°→-5° 过冲→0° 回弹，即立到 95° 再回 90°），
// 根部投影随立起角度收窄变淡。全部立起后整个场景轻微回正（75°→68°）收尾。
// 卡片用独立网格复刻 dashboard A 区布局（Fixtures 内嵌卡无法单独驱动）。
// 收尾 f108 后真静止 ≥52f。帧确定性：全由 frame 派生。
// 质感层（改版）：书页底板从灰条骨架壳换成完整 FakeDashboard(A)（侧栏 / 顶栏真实内容），
// 卡位处是"模切"留下的浅凹槽（卡立起后露出，带内阴影）；平灰 #dddddb 底换成暖调纸面桌
// （柔光 + 纸纤维颗粒 + 暗角），与 masking-tape-slap 同一材料语言；根部投影改两层
// （贴地接触线 + 随立起收窄的软影）；立起的卡面靠铰链底部有一层随角度出现的环境遮蔽，
// 立起中段卡面有一次随角度变化的受光明暗，纸片读作有体积的实物而不是贴图；
// 整页缩到 0.8（原近排立墙后两侧出画、左侧露出半截黑侧栏楔形）。
import React from 'react';
import { useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { Card, FakeDashboard } from '../../_fixtures/Fixtures';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const POPUP_BOOK_RISE_DURATION = 160; // 108f 场景回正后静止 52f

const FPS = 30;
const HOLD = 14; // 开头静置
const STAGGER = 7;
const RISE_DUR = 34; // spring 视觉收敛帧数
const LAST_START = HOLD + 5 * STAGGER; // 49
const SETTLE = LAST_START + RISE_DUR; // 83：全部立起
const REST = SETTLE + 25; // 108：场景回正完成

// dashboard A 区几何（照抄 FakeDashboard：侧栏 220 + 顶栏 72 + padding 36 + gap 28）
const AREA_X = 220 + 36;
const AREA_Y = 72 + 36;
const AREA_W = 1920 - 220 - 72;
const AREA_H = 1080 - 72 - 72;
const GAP = 28;
const CELL_W = (AREA_W - 2 * GAP) / 3;
const CELL_H = (AREA_H - GAP) / 2;

const PageCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  // 远排（row 0）先立，近排后立；同排从左到右
  const order = row === 0 ? col : 3 + col;
  const start = HOLD + order * STAGGER;

  const s = spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 11, stiffness: 130, mass: 0.9 },
    durationInFrames: RISE_DUR,
    durationRestThreshold: 0.0001,
  });
  // 平躺（贴页面 = local 0°）→ 立起（垂直页面 = local -90°，顶边朝观众翻起），
  // spring 过冲自然冲过 -90° 到约 -95°（纸的韧性）再回弹。
  const rx = interpolate(s, [0, 1], [0, -90]);

  // 根部投影：躺平时长影（卡片盖在页面上），立起后收成窄条
  const lie = 1 - Math.min(Math.abs(rx) / 90, 1); // 1 = 躺平, 0 = 立直
  const stand = 1 - Math.max(lie, 0); // 0 = 躺平, 1 = 立直（含过冲时 >1 截断）
  const shH = 14 + 90 * Math.max(lie, 0);
  const shAlpha = 0.1 + 0.16 * Math.max(lie, 0);
  // 受光：主光在观众头顶偏前，卡面从朝天转到朝镜头的中段（~45°）最亮，躺平/立直时回到常态
  const sheen = Math.sin(Math.min(1, Math.max(0, stand)) * Math.PI);

  return (
    <div
      style={{
        position: 'absolute',
        left: AREA_X + col * (CELL_W + GAP),
        top: AREA_Y + row * (CELL_H + GAP),
        width: CELL_W,
        height: CELL_H,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 模切凹槽：卡片原位留下的浅槽（被躺平的卡完全盖住，立起后露出） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 14,
          background: 'linear-gradient(180deg, #e9e8e4 0%, #eeede9 100%)',
          boxShadow: 'inset 0 2px 6px rgba(30,24,14,0.16), inset 0 0 0 1px rgba(30,24,14,0.07)',
        }}
      />
      {/* 根部投影贴在页面上，不随卡片立起：软影随立起收窄 + 一条贴地接触线 */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          bottom: -4,
          height: shH,
          background: `rgba(30,22,10,${shAlpha.toFixed(3)})`,
          borderRadius: 12,
          filter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: -2,
          height: 5,
          background: `rgba(30,22,10,${(0.28 * Math.min(1, stand)).toFixed(3)})`,
          borderRadius: 3,
          filter: 'blur(2.5px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotateX(${rx}deg)`,
          transformOrigin: '50% 100%',
          backfaceVisibility: 'hidden',
        }}
      >
        <Card w={0} h={0} seed={i + 1} style={{ width: '100%', height: '100%' }} />
        {/* 铰链环境遮蔽：立起后靠底边一层渐暗 */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
            background: 'linear-gradient(0deg, rgba(40,30,15,0.16) 0%, rgba(40,30,15,0) 26%)',
            opacity: Math.min(1, Math.max(0, stand)),
          }}
        />
        {/* 立起中段的受光明暗：上沿亮、下沿暗，随角度起落 */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%, rgba(30,22,10,0.10) 100%)',
            opacity: sheen * 0.9,
          }}
        />
      </div>
    </div>
  );
};

export const PopupBookRise: React.FC = () => {
  const frame = useCurrentFrame();

  // 场景（书页）俯视角：全程 75°，全部立起后轻微回正到 68°
  const sceneRx = interpolate(frame, [SETTLE, REST], [75, 68], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: 1920, height: 1080, background: '#e7dfd1', position: 'relative', overflow: 'hidden' }}>
      {/* 暖调纸面桌：低对比渐变 + 上方柔光（与 masking-tape-slap 同材料语言） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 20%, rgba(255,250,240,0.9) 0%, rgba(255,250,240,0) 70%), linear-gradient(180deg, #efe8dc 0%, #e3d9c8 100%)',
        }}
      />
      <Grain opacity={0.08} freq={1.1} blend="multiply" step={4} />
      <div style={{ position: 'absolute', inset: 0, perspective: 2600, perspectiveOrigin: '50% 30%' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            // 整页缩到 0.8：近排立墙后左右不出画，书页四边都留在桌面上
            transform: `translateY(-40px) scale(0.8) rotateX(${sceneRx}deg)`,
            transformOrigin: '50% 62%',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 书页底板：完整 dashboard（侧栏 + 顶栏 + 卡片网格），卡位由模切凹槽与立起的纸片覆盖 */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 6px rgba(40,28,12,0.18), 0 50px 90px -20px rgba(40,28,12,0.35)' }}>
            <FakeDashboard variant="A" />
          </div>
          {/* 6 张纸片卡沿底边立起 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <PageCard key={i} i={i} frame={frame} />
          ))}
        </div>
      </div>
      <Vignette strength={0.24} inner={0.5} color="#4a3820" />
    </div>
  );
};
