import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard, Card } from '../../_fixtures/Fixtures';
import { EASE, ramp, mix, softShadow, Backdrop, Grain } from '../../_fixtures/Polish';

// portal-wipe 穿窗入景·改〔批次 1 重做 → 质感升级〕
// 批次 1 弱点：3 层 7 卡散开幅度大(0.85)+blur，穿窗后画面碎读不清。
// 本版：窗放大 bezier(0.7,0,0.3,1) 40f 先慢后快；窗内只 2 层
// （远景整页 dashboard 缩略 + 近景 2 张卡），散开系数近 0.3 / 远 0.08，
// 不加 blur；穿窗完成(f65)后所有层 8f 内缓停(f73)，之后静止 hold 77f 读清新场景。
// 质感升级：门户卡就是旧 dashboard 网格里的真实槽位（第 2 行第 3 张，seed 6），
// 放大前先悬浮抬起作预备；窗内是反差的深色世界（暗色 Backdrop + 深色 dashboard 悬浮窗 +
// 两张深色浮卡，终点全部完整落在画内、压住大窗两角做出前后景）；旧场景随窗变大压暗。
//
// 节拍（150f @30fps）：
//   0–12   hold：旧 dashboard 建立，目标卡在自己的网格槽位里
//   12–25  预备：目标卡悬浮抬起（-8px、+2%、阴影变大变虚）
//   25–65  窗放大 40f：卡放大成全屏窗，窗内新场景随之显形
//   65–73  缓停 8f：近/远两层视差余势收干（Easing.out 自然归零）
//   73–150 静止 hold：新场景完整可读
export const PORTAL_WIPE_V2_DURATION = 150;

// FakeDashboard A 网格槽位（侧栏 220 + pad 36，顶栏 72 + pad 36，卡 524×454，gap 28）
const SLOT = { x: 220 + 36 + 2 * (524 + 28), y: 72 + 36 + 454 + 28, w: 524, h: 454 };
const SLOT_SEED = 6; // FakeDashboard A 第 6 张卡（seed = i + 1）

// 近景两张浮卡的**终点**（散开 ×1.3 之后），按 960/540 中心反推散开前的位置与尺寸
const NEAR_K = 1.3;
const NEAR_FINAL = [
  { x: 96, y: 676, w: 400, h: 270, seed: 71 },
  { x: 1452, y: 104, w: 360, h: 240, seed: 72 },
];
const NEAR = NEAR_FINAL.map((c) => ({
  ...c,
  x: 960 + (c.x - 960) / NEAR_K,
  y: 540 + (c.y - 540) / NEAR_K,
  w: c.w / NEAR_K,
  h: c.h / NEAR_K,
}));

export const PortalWipeV2: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 预备：目标卡悬浮抬起 ──
  const hover = ramp(frame, 12, 13, EASE.snappy);
  const s0 = 1 + 0.02 * hover;
  const c0 = {
    x: SLOT.x - (SLOT.w * (s0 - 1)) / 2,
    y: SLOT.y - 8 * hover - (SLOT.h * (s0 - 1)) / 2,
    w: SLOT.w * s0,
    h: SLOT.h * s0,
    r: 14,
  };

  // ── 窗放大：40f，先慢后快再缓收 ──
  const t = interpolate(frame, [25, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  const x = mix(c0.x, 0, t);
  const y = mix(c0.y, 0, t);
  const w = mix(c0.w, 1920, t);
  const h = mix(c0.h, 1080, t);
  const r = mix(c0.r, 0, t);

  // ── 窗内视差散开：40→73f，Easing.out 保证 f65 穿窗完成后 8f 内速度归零 ──
  const spread = interpolate(frame, [40, 73], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 窗内整体从缩略推到满幅
  const innerScale = mix(0.42, 1, t);
  // 窗阴影高度：静置 4 → 悬浮 18 → 飞行 ~48 → 铺满归零
  const elev = (4 + 14 * hover) * (1 - t) + 48 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t);
  // 旧场景随窗变大压暗
  const oldDim = 0.32 * ramp(frame, 25, 34, EASE.out);

  return (
    <AbsoluteFill style={{ background: '#111216', overflow: 'hidden' }}>
      {/* 旧场景：dashboard A（穿窗完成后不再渲染） */}
      {t < 1 && (
        <>
          <FakeDashboard variant="A" />
          {oldDim > 0.002 && <AbsoluteFill style={{ background: `rgba(14,15,20,${oldDim.toFixed(3)})` }} />}
        </>
      )}

      {/* 窗（放大的卡）——内藏新场景 */}
      <div
        style={{
          position: 'absolute', left: x, top: y, width: w, height: h,
          borderRadius: r, overflow: 'hidden',
          boxShadow: t < 1 ? softShadow(elev, { strength: 1.2 }) : 'none',
        }}
      >
        {/* 窗内 1920×1080 舞台，随穿窗从 0.42 推到 1 */}
        {t > 0 && (
          <div
            style={{
              position: 'absolute', width: 1920, height: 1080, left: '50%', top: '50%',
              transform: `translate(-50%, -50%) scale(${innerScale})`,
              overflow: 'hidden',
            }}
          >
            <Backdrop tone="dark" light={{ x: 0.5, y: 0.2 }} accent="#5b63d3" grain={0} vignette={0.55} />
            {/* 静态颗粒（不换帧）：暗场防色带，hold 段像素恒定 */}
            <Grain opacity={0.07} step={100000} blend="soft-light" />
            {/* 远景层（系数 0.08，不加 blur）：新场景整页深色 dashboard 悬浮窗 */}
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + spread * 0.08})`, transformOrigin: '960px 540px' }}>
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080,
                  transform: 'translate(-50%, -50%) scale(0.78)', transformOrigin: 'center',
                  borderRadius: 20, overflow: 'hidden',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px -20px rgba(0,0,0,0.7), 0 12px 30px rgba(0,0,0,0.35)',
                }}
              >
                <FakeDashboard variant="B" tone="dark" />
              </div>
            </div>

            {/* 近景层（系数 0.3，不加 blur）：只 2 张深色浮卡，散开后完整落在画内、压住大窗两角 */}
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + spread * (NEAR_K - 1)})`, transformOrigin: '960px 540px' }}>
              {NEAR.map((c) => (
                <div key={c.seed} style={{ position: 'absolute', left: c.x, top: c.y, borderRadius: 14, boxShadow: softShadow(40, { color: '#000000', strength: 1.4 }) }}>
                  <Card w={c.w} h={c.h} seed={c.seed} tone="dark" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 卡正面：放大初期渐隐，露出窗内新场景 */}
        {t < 0.42 && (
          <div style={{ position: 'absolute', inset: 0, opacity: Math.max(0, 1 - t * 2.4) }}>
            <Card w={c0.w} h={c0.h} seed={SLOT_SEED} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
