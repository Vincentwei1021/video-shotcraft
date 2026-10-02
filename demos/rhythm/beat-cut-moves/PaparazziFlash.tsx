import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';

// paparazzi flash 连闪定格：高光时刻三连白闪，每闪硬切同一素材的不同裁切
// （全景→Revenue 卡片特写→$48.2k 数字特写），每闪切入画面带 1.03→1 回落 + 半格沉降像快门
// 余韵，白闪帧加微位移抖动模拟快门震，第三闪后停在数字特写收束。
// 质感：闪光是"闪光灯"而不是白场——中心最亮、四周略衰减的径向白，闪后 6f 画面带一口
// 过曝回落（亮度↑对比↓再收回）；数字特写用 dashboard 自己的指标（不叠浮字），
// 定格裁切走 CSS zoom 保证 4x 下字边锐利；暗角 + 颗粒让三张定格读作"照片"。

export const PAPARAZZI_FLASH_DURATION = 130; // 活素材 30f + 三闪 40f + hold 60f

const F1 = 30; // 第一闪（间隔 22f）
const F2 = 52; // 第二闪（间隔 18f）
const F3 = 70; // 第三闪，之后 hold 60f
const SETTLE = 6; // 切入回落时长
const DECAY = 4; // 白层衰减时长
const BLOOM = 7; // 闪后过曝回落时长（比白层略长，读作"眼睛还没缓过来"）
const FLASHES = [F1, F2, F3];

// seed 正弦哈希，返回 -1..1（禁 Math.random）
const hash = (i: number) => {
  const s = Math.sin(i * 127.3) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

// 三个定格裁切：同一 dashboard 换倍率 / 焦点（全景 / Revenue 卡 / $48.2k 数字）
// 焦点按"不出画"取：2.3x 时视口 835px 宽，焦点 x ≤ 1920−417 才不露出画布外
type View = { scale: number; cx: number; cy: number };
const VIEW_WIDE: View = { scale: 1.0, cx: 960, cy: 540 };
const VIEW_CARD: View = { scale: 2.3, cx: 1500, cy: 336 };
const VIEW_DIGIT: View = { scale: 4.0, cx: 1478, cy: 206 };

// 定格视图：倍率走 zoom（布局级放大，字按 4x 尺寸栅格化）
const Still: React.FC<{ view: View }> = ({ view }) => (
  <div
    style={{
      position: 'absolute',
      left: 960 / view.scale - view.cx,
      top: 540 / view.scale - view.cy,
      width: 1920,
      height: 1080,
      zoom: view.scale,
    }}
  >
    <FakeDashboard variant="A" />
  </div>
);

export const PaparazziFlash: React.FC = () => {
  const frame = useCurrentFrame();

  // 当前处于哪一段：-1 = 闪前活素材段
  let seg = -1;
  for (let i = 0; i < FLASHES.length; i++) {
    if (frame >= FLASHES[i]) seg = i;
  }

  // 闪后余韵：1.03→1 的 6f 收敛 + 半格沉降（-16px 落回 0）像快门余韵
  let settleScale = 1;
  let settleY = 0;
  let bloom = 0;
  if (seg >= 0) {
    const t = 1 - ramp(frame, FLASHES[seg], SETTLE, EASE.out);
    settleScale = 1 + 0.03 * t;
    settleY = -16 * t;
    bloom = 1 - ramp(frame, FLASHES[seg], BLOOM, EASE.out);
  }

  // 白闪层：每个切点 0.95→0，4f ease-out 衰减
  let flash = 0;
  for (const f of FLASHES) {
    if (frame >= f && frame <= f + DECAY) flash = Math.max(flash, 0.95 * (1 - ramp(frame, f, DECAY, EASE.out)));
  }

  // 白闪帧全屏微位移抖动模拟快门震（seed 哈希，非随机；只在 4f 闪窗内）
  const inFlash = FLASHES.some((f) => frame >= f && frame < f + DECAY);
  const jx = inFlash ? 2 * hash(frame * 7 + 1) : 0;
  const jy = inFlash ? 2 * hash(frame * 13 + 5) : 0;

  // 闪前活素材：中景缓推 + 微横移（in-out，起止无速度突变），衬托闪后定格的"死"
  const live = ramp(frame, 0, F1, EASE.smooth);
  const liveScale = mix(1.12, 1.18, live);
  const liveX = mix(14, -10, live);

  // 余韵 + 1.2% 出血：沉降 / 抖动时画面边缘永不露底
  const bleed = 1.012;

  return (
    <AbsoluteFill style={{ background: '#111216', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '960px 540px',
          transform: `translate(${jx}px, ${jy + settleY}px) scale(${settleScale * bleed})`,
          // 闪后过曝回落：亮度 +20% / 对比 −12% / 饱和 −20%，7f 收回
          filter: bloom > 0.01
            ? `brightness(${(1 + 0.2 * bloom).toFixed(3)}) contrast(${(1 - 0.12 * bloom).toFixed(3)}) saturate(${(1 - 0.2 * bloom).toFixed(3)})`
            : undefined,
        }}
      >
        {seg === -1 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '1180px 400px',
              transform: `translateX(${liveX}px) scale(${liveScale})`,
            }}
          >
            <FakeDashboard variant="A" />
          </div>
        ) : (
          <Still view={[VIEW_WIDE, VIEW_CARD, VIEW_DIGIT][seg]} />
        )}
      </div>
      {/* 照片感：定格越近暗角越重，把视线压向数字 */}
      <Vignette strength={[0.16, 0.16, 0.22, 0.28][seg + 1]} inner={0.5} color="#14161e" />
      <Grain opacity={0.05} />
      {/* 白闪层：闪光灯的径向衰减——中心满白，四角保留一点画面 */}
      {flash > 0.004 && (
        <AbsoluteFill
          style={{
            opacity: flash,
            background:
              'radial-gradient(ellipse 80% 90% at 50% 45%, #ffffff 0%, #ffffff 45%, rgba(250,250,255,0.86) 100%)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
