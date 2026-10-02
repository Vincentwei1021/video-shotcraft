// masking-tape-slap —— 纸胶带拍定
// 一张 Card 轻飘入位后悬着微晃（±1.5° 正弦 + 5px 上下浮），两条半透明纸胶带
// 先后从画外拍在对角（scale 1.45→1 + rotate 过冲 + 一帧压扁）。第一条拍下晃动减半，
// 第二条拍下同帧卡片停晃、投影瞬间变薄、整卡 2px 下沉——"按死"的一瞬是主角。
// 帧确定性：全部由 frame 派生，无随机。收尾 f86 后真静止 34f。
// 质感层（改版）：去掉调试标题"MASKING TAPE SLAP"；平灰底换成暖调纸面桌（柔光 + 纸纤维颗粒）；
// 卡片入场带一点倾角跟随、投影改为随悬浮高度变化的两层；胶带换成琥珀色和纸胶带
// （纵向纤维纹 + 边缘透光 + 贴纸面的薄影），两条落点各自歪 2–3°（手工感）；
// 胶带扑入 6f 按速度加方向性运动模糊；拍下瞬间卡面在胶带落点处有一圈极轻的压痕暗影。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Card } from '../../_fixtures/Fixtures';
import { Grain, SpeedBlur, Vignette, softShadow } from '../../_fixtures/Polish';

export const MASKING_TAPE_SLAP_DURATION = 120; // 4s：飘入 → 微晃 → 两拍 → 按死后静止 34f

const CARD_W = 560;
const CARD_H = 350;
const CX = (1920 - CARD_W) / 2;
const CY = (1080 - CARD_H) / 2;

const FLOAT_START = 12; // 开头 12f 空场静置
const FLOAT_END = 38;
const SLAP1 = 58;
const SLAP2 = 82;
const APPROACH = 6; // 胶带从画外扑向卡面的帧数
const FREEZE = 2; // 拍死后晃动归零帧数

// 悬浮晃动幅度包络：入位后升起 → 第一条胶带拍下后减半 → 第二条拍下冻结（由外层处理）
const amp = (f: number): number => {
  const rise = interpolate(f, [FLOAT_END, FLOAT_END + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const damp = interpolate(f, [SLAP1, SLAP1 + 4], [1, 0.45], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return rise * damp;
};

const rawRot = (f: number): number => amp(f) * 1.5 * Math.sin((f - FLOAT_END) * 0.16);
const rawBob = (f: number): number => amp(f) * 5 * Math.sin((f - FLOAT_END) * 0.11);

// 第二条拍下（SLAP2）同帧起 2f 内把晃动按死到 0
const frozen = (f: number, raw: (x: number) => number): number =>
  f <= SLAP2
    ? raw(f)
    : interpolate(f, [SLAP2, SLAP2 + FREEZE], [raw(SLAP2), 0], {
        extrapolateRight: 'clamp',
      });

// 撕边：两端锯齿（14 点）
const TORN =
  'polygon(0% 8%, 2.5% 0%, 97% 3%, 100% 12%, 98.2% 30%, 100% 52%, 98% 74%, 100% 90%, 96.5% 100%, 3% 97%, 0% 88%, 1.8% 64%, 0% 42%, 2% 22%)';

const approachT = (f: number, land: number) =>
  interpolate(f, [land - APPROACH, land], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const Tape: React.FC<{
  frame: number;
  land: number;
  cx: number; // 胶带中心点（世界坐标）
  cy: number;
  rot: number; // 落定角度
  fromX: number; // 画外来向偏移
  fromY: number;
}> = ({ frame, land, cx, cy, rot, fromX, fromY }) => {
  if (frame < land - APPROACH) return null; // 条件卸载：拍上前真不存在

  const t = approachT(frame, land);
  const scale = interpolate(t, [0, 1], [1.45, 1]);
  const dx = fromX * (1 - t);
  const dy = fromY * (1 - t);
  const opacity = interpolate(frame, [land - APPROACH, land - APPROACH + 2], [0, 1], {
    extrapolateRight: 'clamp',
  });
  // rotate 过冲：来时欠 16° → 落帧过 7° → 4f 内回正
  const r = interpolate(frame, [land - APPROACH, land, land + 4], [rot - 16, rot + 7, rot], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // 一帧压扁：落帧 scaleY 0.72，次帧 0.9，随后复原
  const sy = frame === land ? 0.72 : frame === land + 1 ? 0.9 : 1;
  // 扑入速度（px/帧）→ 沿来向的运动模糊；落定后为 0
  const vx = frame < land ? fromX * (approachT(frame - 0.5, land) - approachT(frame + 0.5, land)) : 0;
  const vy = frame < land ? fromY * (approachT(frame - 0.5, land) - approachT(frame + 0.5, land)) : 0;
  // 空中离纸越高影越虚越远；落下后贴成一条薄影
  const air = 1 - t;

  const body = (
    <div
      style={{
        position: 'absolute',
        left: cx - 160,
        top: cy - 34,
        width: 320,
        height: 68,
        transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${scale.toFixed(4)}) scaleY(${sy})`,
        transformOrigin: '50% 50%',
        opacity,
        filter: `drop-shadow(0 ${(1 + air * 14).toFixed(1)}px ${(1.5 + air * 12).toFixed(1)}px rgba(60,40,15,${(0.2 - air * 0.08).toFixed(3)}))`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: TORN,
          // 和纸胶带：琥珀半透明底 + 纵向纤维纹 + 上下缘透光
          background: [
            'linear-gradient(180deg, rgba(255,250,235,0.35) 0%, rgba(255,250,235,0) 18%, rgba(255,250,235,0) 82%, rgba(255,250,235,0.3) 100%)',
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, rgba(120,80,20,0.04) 2px, rgba(255,255,255,0) 4px)',
            'linear-gradient(90deg, rgba(232,196,128,0.70) 0%, rgba(240,208,146,0.64) 35%, rgba(228,190,120,0.70) 70%, rgba(238,204,140,0.64) 100%)',
          ].join(', '),
        }}
      />
    </div>
  );
  return Math.hypot(vx, vy) > 2 ? (
    <SpeedBlur vx={vx} vy={vy} amount={0.3} max={18}>
      {body}
    </SpeedBlur>
  ) : (
    body
  );
};

export const MaskingTapeSlap: React.FC = () => {
  const frame = useCurrentFrame();

  // 卡片飘入：从上方 -120px 缓落，带 -3° → 0 的倾角跟随
  const floatT = interpolate(frame, [FLOAT_START, FLOAT_END], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const floatY = -120 * (1 - floatT);
  const floatRot = -3 * (1 - floatT) * (1 - floatT);
  const floatOp = interpolate(frame, [FLOAT_START, FLOAT_START + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rot = frozen(frame, rawRot) + floatRot;
  const bob = frozen(frame, rawBob);

  // 按死：2px 下沉 + 投影瞬间变薄（悬浮 elevation 由飘入高度 + 晃动决定，按死后贴到 2）
  const sink = interpolate(frame, [SLAP2, SLAP2 + FREEZE], [0, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pressed = interpolate(frame, [SLAP2, SLAP2 + FREEZE], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hover = 26 + 40 * (1 - floatT) - bob * 1.2; // 悬浮离纸高度（px）
  const elev = hover * (1 - pressed) + 2 * pressed;

  // 拍下瞬间胶带落点的一圈压痕暗影（8f 消散）
  const dent = (land: number) =>
    interpolate(frame, [land, land + 1, land + 9], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: '#ece4d6' }}>
      {/* 暖调纸面桌：低对比渐变 + 左上柔光 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 65% at 38% 28%, rgba(255,251,242,0.95) 0%, rgba(255,251,242,0) 70%), linear-gradient(180deg, #f1eadf 0%, #e9e0d1 100%)',
        }}
      />
      <Grain opacity={0.09} freq={1.1} blend="multiply" step={4} />

      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          transform: `translateY(${(floatY + bob + sink).toFixed(3)}px) rotate(${rot.toFixed(4)}deg)`,
          transformOrigin: '50% 50%',
          opacity: floatOp,
        }}
      >
        <Card
          w={CARD_W}
          h={CARD_H}
          seed={3}
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(elev, { color: '#3a2a14', strength: 1.25 })}` }}
        />
        {/* 压痕：第一条（左上）、第二条（右下）落点，裁在卡片圆角内 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, borderRadius: 14, overflow: 'hidden', pointerEvents: 'none' }}>
        {[
          { land: SLAP1, x: 34, y: 26 },
          { land: SLAP2, x: CARD_W - 34, y: CARD_H - 26 },
        ].map(({ land, x, y }) => {
          const d = dent(land);
          return d > 0 ? (
            <div
              key={land}
              style={{
                position: 'absolute', left: x - 190, top: y - 90, width: 380, height: 180, pointerEvents: 'none',
                background: 'radial-gradient(closest-side, rgba(40,28,10,0.10), rgba(40,28,10,0))', opacity: d,
              }}
            />
          ) : null;
        })}
        </div>
      </div>

      {/* 两条胶带钉在卡片对角（世界坐标，卡片在其下滑动微晃）；落点外移到角上少压内容，各自歪 2–3° */}
      <Tape frame={frame} land={SLAP1} cx={CX + 34} cy={CY + 26} rot={-42.5} fromX={-170} fromY={-130} />
      <Tape frame={frame} land={SLAP2} cx={CX + CARD_W - 34} cy={CY + CARD_H - 26} rot={-47.5} fromX={170} fromY={130} />
      <Vignette strength={0.22} inner={0.5} color="#4a3820" />
    </div>
  );
};
