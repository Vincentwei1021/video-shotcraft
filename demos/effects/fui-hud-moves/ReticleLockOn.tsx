// reticle-lock-on —— 准星咬合（钢铁侠 HUD / 安德的游戏）
// FakeDashboard 静置。四个 L 形角标组成的取景框从画外飞入（大框），
// 超调回弹后收缩贴紧目标卡片四角"咔"地咬合定格；咬合帧卡片微亮 +
// 上方弹一行小标签。画面不冻结，是运动中的捕获。
// f0–14 面板静置；f14–24 飞入；f20–46 收缩（含过冲回弹）；f46 咬合；
// 标签 f48–58 弹出；之后静止 ≥30f（90f 总长）。
//
// 质感升级：补导出时长（工作台原先从源码猜成 24f，只演到飞入一半）；目标框改用 fixture 真实
// 卡片几何（524×454，原 425 高差了 29px 咬不住下沿）；角标从 10px 实心黑块改为 5px 圆头强调色
// 笔画 + 白色描边衬底（任何底色上都清楚）+ 中心十字刻度；飞入段按速度做斜向运动模糊；
// 收缩改为与飞入重叠、不对称缓动的连续过冲（不再每个关键帧都停一下）；咬合帧角标一次"咔"的
// 收紧脉冲，目标微亮做成裁进圆角的顶亮渐变 + 强调色描边，其余画面轻压暗聚焦；标签换成出版级
// 深色胶囊（状态点 + 卡名 + 等宽锁定编号）；整段相机极缓推向目标，"在流动中点名"。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, SpeedBlur, mix, ramp } from '../../_fixtures/Polish';

export const RETICLE_LOCK_ON_DURATION = 90; // 3s：飞入 → 咬合 → 标签 → 静止 ≥1s

// 目标：variant A 网格第 2 张卡（第一行中间）。fixture 几何：卡 524×454 @ x=808, y=108
const CARD_X = 808;
const CARD_Y = 108;
const CARD_W = 524;
const CARD_H = 454;
const PAD = 16; // 咬合后角标与卡的呼吸距

const TCX = CARD_X + CARD_W / 2;
const TCY = CARD_Y + CARD_H / 2;

const FLY_IN = 14; // 飞入开始
const FLY_END = 24; // 飞入结束（大框就位）
const SHRINK0 = 20; // 收缩起点（与飞入尾段重叠 4f，动作连贯不停顿）
const UNDER = 40; // 收过头（0.94×）的时刻
const LOCK_END = 46; // 咬合帧
const LABEL0 = LOCK_END + 2;
const LABEL_END = LOCK_END + 12;

const ARM = 58; // L 臂长
const THICK = 5; // L 笔画粗
const INK = G.accent; // 角标色：唯一强调色

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

// 飞入位移（px）：整框从右下画外冲进来，ease-out cubic
const flyAt = (f: number) => {
  const t = interpolate(f, [FLY_IN, FLY_END], [0, 1], { easing: Easing.out(Easing.cubic), ...clamp });
  return { x: (1 - t) * 1100, y: (1 - t) * 620 };
};
// 收缩倍率：2.2 → 0.94（swift 不对称缓动，冲过头）→ 1（ease-out 回弹落定）
const shrinkAt = (f: number) =>
  f < UNDER ? mix(2.2, 0.94, ramp(f, SHRINK0, UNDER - SHRINK0, EASE.swift)) : mix(0.94, 1, ramp(f, UNDER, LOCK_END - UNDER, EASE.out));

export const ReticleLockOn: React.FC = () => {
  const frame = useCurrentFrame();

  const fly = flyAt(frame);
  const fly0 = flyAt(frame - 0.5);
  const fly1 = flyAt(frame + 0.5);
  const shrink = shrinkAt(frame);
  // 咬合"咔"：锁定瞬间角标再向内收紧 6px 后弹回（4f）
  const bite = interpolate(frame, [LOCK_END, LOCK_END + 1, LOCK_END + 5], [0, 1, 0], clamp);
  const hw = (CARD_W / 2 + PAD) * shrink - 6 * bite;
  const hh = (CARD_H / 2 + PAD) * shrink - 6 * bite;

  // 咬合帧：卡片微亮（快闪 0.55 后停在 0.28；裁进卡片圆角）
  const glow = interpolate(frame, [LOCK_END, LOCK_END + 3, LOCK_END + 10], [0, 0.55, 0.28], clamp);
  // 聚焦：目标之外轻压暗（锁定后 10f 内到 0.10）
  const focus = interpolate(frame, [LOCK_END - 2, LOCK_END + 10], [0, 1], { easing: Easing.out(Easing.cubic), ...clamp });

  // 标签：咬合后从左上角标上方弹出（scale back 过冲 + 淡入）
  const labelT = interpolate(frame, [LABEL0, LABEL_END], [0, 1], { easing: Easing.out(Easing.back(1.8)), ...clamp });

  // 相机：全程极缓推向目标（1 → 1.035），smooth in-out，无起止速度突变
  const cam = mix(1, 1.035, ramp(frame, 0, RETICLE_LOCK_ON_DURATION - 1, EASE.smooth));

  const showReticle = frame >= FLY_IN;
  const locked = frame >= LOCK_END;
  const reticleOp = interpolate(frame, [FLY_IN, FLY_IN + 3], [0, 1], clamp);

  // 四个 L 角：位置 = 中心 ± (hw, hh)，各自镜像
  const corners = [
    { x: TCX - hw, y: TCY - hh, sx: 1, sy: 1 },
    { x: TCX + hw, y: TCY - hh, sx: -1, sy: 1 },
    { x: TCX - hw, y: TCY + hh, sx: 1, sy: -1 },
    { x: TCX + hw, y: TCY + hh, sx: -1, sy: -1 },
  ];
  // L 笔画：白色衬底（外扩 2px）+ 强调色芯，圆头
  const stroke = (w: number, h: number, under: boolean): React.CSSProperties => ({
    position: 'absolute', left: under ? -2 : 0, top: under ? -2 : 0,
    width: w + (under ? 4 : 0), height: h + (under ? 4 : 0), borderRadius: 4,
    background: under ? 'rgba(255,255,255,0.92)' : INK,
    boxShadow: under ? '0 2px 6px rgba(16,18,40,0.18)' : 'none',
  });

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: `${TCX}px ${TCY}px` }}>
        <FakeDashboard variant="A" />
        {/* 聚焦压暗：目标卡外一圈巨型 box-shadow（目标处镂空、圆角一致） */}
        {focus > 0 && (
          <div style={{
            position: 'absolute', left: CARD_X, top: CARD_Y, width: CARD_W, height: CARD_H, borderRadius: 14,
            boxShadow: `0 0 0 3000px rgba(16,18,28,${(0.1 * focus).toFixed(3)})`, pointerEvents: 'none',
          }} />
        )}
        {/* 咬合微亮层：条件渲染，锁定前不存在；顶亮底淡的渐变裁进圆角 + 强调色细描边 */}
        {locked && (
          <div style={{
            position: 'absolute', left: CARD_X, top: CARD_Y, width: CARD_W, height: CARD_H, borderRadius: 14,
            overflow: 'hidden', pointerEvents: 'none',
            boxShadow: `0 0 0 1.5px rgba(91,99,211,${(0.55 * focus).toFixed(3)}), 0 18px 48px -16px rgba(91,99,211,${(0.35 * focus).toFixed(3)})`,
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: glow,
              background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.55) 60%, rgba(255,255,255,0.35) 100%)',
            }} />
          </div>
        )}
        {showReticle && (
          <SpeedBlur vx={fly1.x - fly0.x} vy={fly1.y - fly0.y} amount={0.3} max={22}>
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${fly.x}px, ${fly.y}px)`, opacity: reticleOp }}>
              {corners.map((c, i) => (
                <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, transform: `scale(${c.sx}, ${c.sy})`, transformOrigin: '0 0' }}>
                  {/* L 形角标：横臂 + 竖臂（先衬底后芯） */}
                  <div style={stroke(ARM, THICK, true)} />
                  <div style={stroke(THICK, ARM, true)} />
                  <div style={stroke(ARM, THICK, false)} />
                  <div style={stroke(THICK, ARM, false)} />
                </div>
              ))}
              {/* 中心十字刻度：飞行中可见，锁定后淡出（准星→取景框的语义交接） */}
              {[0, 1].map((k) => (
                <div key={k} style={{
                  position: 'absolute', left: TCX - (k ? 1.5 : 14), top: TCY - (k ? 14 : 1.5), width: k ? 3 : 28, height: k ? 28 : 3,
                  borderRadius: 2, background: INK, opacity: 0.8 * (1 - focus), boxShadow: '0 0 0 2px rgba(255,255,255,0.85)',
                }} />
              ))}
            </div>
          </SpeedBlur>
        )}
        {/* 小标签：左上角标正上方弹出（落在顶栏空白区，不压邻卡标题） */}
        {frame >= LABEL0 && (
          <div style={{
            position: 'absolute', left: TCX - hw + 2, top: TCY - hh - 70,
            transform: `scale(${labelT})`, transformOrigin: '0 100%', opacity: Math.min(1, labelT * 1.5),
            display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap',
            background: 'linear-gradient(180deg, #23252c 0%, #17181d 100%)', color: '#fff', fontFamily: FONT.sans,
            padding: '10px 16px 10px 14px', borderRadius: 12,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(0,0,0,0.25), 0 2px 4px rgba(16,18,24,0.18), 0 16px 32px -10px rgba(16,18,24,0.45)',
          }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: '#8a91ff', boxShadow: '0 0 0 4px rgba(138,145,255,0.22)' }} />
            <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.015em' }}>Top pages</span>
            <span style={{
              fontFamily: FONT.mono, fontSize: 18, fontWeight: 500, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)',
              padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.07)',
            }}>LOCK 02</span>
          </div>
        )}
      </div>
      <Grain opacity={0.035} />
    </div>
  );
};
