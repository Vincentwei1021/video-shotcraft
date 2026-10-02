// 爆花确认（pop-burst-confirm）——确认时刻的三连爆
// 半屏大对勾 icon（圆底+勾）：先缩 0.6x 蓄力 3f → 弹 1.35x 过冲 → 落回 1x，
// 释放帧同帧中心射出 10 根短线粒子（径向飞出后消失）+ 一圈描边圆环从
// icon 边缘扩到 2.5 倍直径淡出；随后 "Deployed" 小标签弹出。
// 节拍：0–20 静置（空心圆待确认）→ 20–23 缩 0.6x → 23–27 蓄力 3f →
// 27 释放（勾画出+粒子+圆环）→ 27–44 过冲落回 → 42–52 标签弹出 → 55 后真静止 65f。
// 帧确定，无随机源（粒子角度/长度/距离抖动用 sin 散列）。
//
// 质感升级：待确认态从"白底黑粗描边"改为安静的浅色凹槽圆 + 缓慢旋转的虚线进度环（读作"进行中"）；
// 释放帧圆底同帧"通电"成翡翠绿渐变实心盘（顶部高光 + 两层软阴影，阴影随缩放抬升），白色对勾
// 画出；10 根粒子改为两色（主色 / 浅薄荷）、长度与飞行距离按散列错落、尾部随速度收短的锥形线段；
// 冲击环外再叠一层很淡的柔光环；释放帧背后一次极短的径向柔光（只给主角一次）；标签换成出版级
// 深色胶囊（对勾图标 + Deployed + 等宽版本号），比 icon 晚 2f 带上浮弹出；全程柔光底 + 颗粒。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Backdrop, FONT, Grain, innerHighlight, softShadow } from '../../_fixtures/Polish';

const POP = 27; // 释放帧
const DUR = 120;
export const POP_BURST_CONFIRM_DURATION = DUR; // 4s

const C0 = '#2fd27c'; // 成功主色（渐变亮端）
const C1 = '#12a150'; // 成功主色（渐变暗端）
const MINT = '#a6f0c6'; // 辅助：浅薄荷
const clampX = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const hs = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1; // sin 散列

export const PopBurstConfirm: React.FC = () => {
  const f = useCurrentFrame();

  // icon 缩放：蓄力→过冲→落回
  const scale = (() => {
    if (f <= 20) return 1;
    if (f <= 23) return interpolate(f, [20, 23], [1, 0.6], { easing: Easing.in(Easing.quad) });
    if (f <= POP) return 0.6;
    if (f <= 33) return interpolate(f, [POP, 33], [0.6, 1.35], { easing: Easing.out(Easing.cubic) });
    return interpolate(f, [33, 44], [1.35, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2)) });
  })();

  // 圆底"通电"：释放帧起 4f 从凹槽浅色切到翡翠绿实心
  const fill = interpolate(f, [POP, POP + 4], [0, 1], { ...clampX, easing: Easing.out(Easing.quad) });
  // 对勾：释放帧起 8f 内画出（dashoffset 滑窗）
  const checkT = interpolate(f, [POP, POP + 8], [0, 1], { ...clampX, easing: Easing.out(Easing.cubic) });
  // 待确认进度环：缓慢旋转，蓄力时收紧、释放时消失
  const spin = f * 3.2;
  const pendOp = interpolate(f, [POP - 2, POP + 2], [1, 0], clampX);

  // 粒子：释放帧起 14f 径向飞出（幅度加码到 190px 保半屏可感）
  const pt = interpolate(f, [POP, POP + 14], [0, 1], clampX);
  const pe = Easing.out(Easing.cubic)(pt);

  // 圆环：释放帧起 20f 从 icon 边缘扩到 2.5 倍直径淡出
  const rt = interpolate(f, [POP, POP + 20], [0, 1], clampX);
  const re = Easing.out(Easing.cubic)(rt);
  const ringR = 200 + 300 * re;
  const ringO = 0.85 * (1 - rt);
  const ringW = 16 - 12 * rt;

  // 释放柔光：6f 内亮起又散去（只此一次）
  const bloom = interpolate(f, [POP, POP + 2, POP + 12], [0, 1, 0], clampX);

  // 标签：42f 弹出（back 超调），比 icon 落回晚 2f
  const tagT = interpolate(f, [42, 52], [0, 1], { ...clampX, easing: Easing.out(Easing.back(2.2)) });

  const CX = 960;
  const CY = 470;
  const elev = 8 + 26 * Math.max(0, scale - 0.6); // 阴影随缩放抬升

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: '#ecece9' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} grain={0} vignette={0.14} />

      {/* 释放柔光：主角背后一次 */}
      {bloom > 0 && (
        <div style={{
          position: 'absolute', left: CX - 520, top: CY - 520, width: 1040, height: 1040, borderRadius: 520,
          background: 'radial-gradient(circle, rgba(47,210,124,0.22) 0%, rgba(47,210,124,0.08) 35%, rgba(47,210,124,0) 65%)',
          opacity: bloom,
        }} />
      )}

      {/* 扩散圆环（不随 icon 缩放）：主环 + 外层柔光环 */}
      {rt > 0 && rt < 1 && (
        <svg width={1400} height={1400} style={{ position: 'absolute', left: CX - 700, top: CY - 700 }}>
          <circle cx={700} cy={700} r={ringR + 10} fill="none" stroke={C0} strokeWidth={ringW * 3} opacity={ringO * 0.18} />
          <circle cx={700} cy={700} r={ringR} fill="none" stroke={C1} strokeWidth={ringW} opacity={ringO} />
        </svg>
      )}

      {/* 粒子：10 根锥形短线径向飞出，角度/距离/长度按散列错落，速度降下来时尾巴收短 */}
      {pt > 0 && pt < 1 && (
        <svg width={1400} height={1400} style={{ position: 'absolute', left: CX - 700, top: CY - 700 }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const ang = ((i * 36 + 9 * Math.sin(i * 7.31)) * Math.PI) / 180;
            const reach = 190 * (0.8 + 0.4 * hs(i + 1));
            const d = 210 + reach * pe;
            const vel = 1 - pe; // 归一化速度
            const len = (30 + 36 * hs(i + 7)) * (0.5 + 0.5 * vel) * (1 - pt * 0.5);
            const w = (i % 3 === 0 ? 14 : 10) * (1 - pt * 0.5);
            const x1 = 700 + Math.cos(ang) * (d - len);
            const y1 = 700 + Math.sin(ang) * (d - len);
            const x2 = 700 + Math.cos(ang) * d;
            const y2 = 700 + Math.sin(ang) * d;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i % 5 < 2 ? MINT : C1} strokeWidth={w} strokeLinecap="round" opacity={1 - pt * pt} />
            );
          })}
        </svg>
      )}

      {/* 主体 icon：圆底 + 对勾（半屏特写 ~480px） */}
      <div style={{
        position: 'absolute', left: CX - 240, top: CY - 240, width: 480, height: 480,
        transform: `scale(${scale})`, transformOrigin: '50% 50%',
      }}>
        {/* 待确认态：浅色凹槽圆 */}
        <div style={{
          position: 'absolute', left: 50, top: 50, width: 380, height: 380, borderRadius: 190,
          background: 'linear-gradient(180deg, #f2f2ef 0%, #e6e6e2 100%)',
          boxShadow: 'inset 0 3px 8px rgba(20,22,28,0.10), inset 0 -1px 0 rgba(255,255,255,0.9), 0 1px 0 rgba(255,255,255,0.8)',
        }} />
        {/* 释放后：翡翠绿实心盘（顶部高光 + 两层软阴影） */}
        <div style={{
          position: 'absolute', left: 50, top: 50, width: 380, height: 380, borderRadius: 190, overflow: 'hidden',
          opacity: fill, transform: `scale(${0.92 + 0.08 * fill})`,
          background: `linear-gradient(160deg, ${C0} 0%, ${C1} 100%)`,
          boxShadow: `${innerHighlight(0.45)}, inset 0 -8px 18px rgba(0,70,30,0.25), ${softShadow(elev, { color: '#06301a', strength: 1.4 })}`,
        }}>
          <div style={{
            position: 'absolute', left: 30, top: -120, width: 320, height: 300, borderRadius: '50%',
            background: 'radial-gradient(ellipse at 45% 65%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%)',
          }} />
        </div>
        <svg width={480} height={480} viewBox="0 0 480 480" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {/* 待确认：虚线进度环，缓慢旋转 */}
          {pendOp > 0 && (
            <circle cx={240} cy={240} r={206} fill="none" stroke="#9b9da3" strokeWidth={8} strokeLinecap="round"
              strokeDasharray="2 24" opacity={0.75 * pendOp} transform={`rotate(${spin} 240 240)`} />
          )}
          {checkT > 0 && (
            <path d="M 150 245 L 215 310 L 340 175" fill="none" stroke="#ffffff" strokeWidth={36}
              strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - checkT}
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0,60,25,0.25))' }} />
          )}
        </svg>
      </div>

      {/* Deployed 标签：深色胶囊 + 对勾 + 版本号 */}
      {tagT > 0 && (
        <div style={{
          position: 'absolute', left: CX, top: CY + 300, display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap',
          transform: `translate(-50%, ${(1 - Math.min(1, tagT)) * 16}px) scale(${tagT})`, transformOrigin: '50% 0%',
          opacity: Math.min(1, tagT * 1.6), padding: '16px 26px 16px 20px', borderRadius: 40,
          background: 'linear-gradient(180deg, #24262d 0%, #17181d 100%)', color: '#ffffff', fontFamily: FONT.sans,
          boxShadow: `${innerHighlight(0.1)}, ${softShadow(14, { strength: 1.3 })}`,
        }}>
          <svg width={30} height={30} viewBox="0 0 30 30">
            <circle cx={15} cy={15} r={15} fill={C1} />
            <path d="M9 15.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 650, letterSpacing: '-0.02em' }}>Deployed</span>
          <span style={{
            fontFamily: FONT.mono, fontSize: 24, color: 'rgba(255,255,255,0.55)', padding: '4px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
          }}>v2.14.0</span>
        </div>
      )}
      <Grain opacity={0.045} />
    </div>
  );
};
