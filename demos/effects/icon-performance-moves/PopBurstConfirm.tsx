// 爆花确认（pop-burst-confirm）——确认时刻的三连爆：蓄力缩 → 弹大过冲 → 同帧炸粒子 + 扩散环。
//
// 第二轮重设计（石墨夜 · 一颗翡翠绿）：
// - look = graphite（近单色暗场），唯一的颜色是成功那一刻"通电"的翡翠绿——之前全画面没有一点彩色，
//   绿只在释放帧出现，颜色本身就是爆点。主角是一枚 380px 的部署状态盘（半屏特写）：
//   待确认态 = 石墨凹盘 + 外圈白色进度环 + 盘心等宽大号百分比；释放态 = 翡翠绿釉面盘 + 白色粗对勾。
// - 节奏「涨—缩—停—爆—落—亮字」：进度环 0–22f 加速冲到 100%（ease-in，越来越急，观众在等）→
//   22–25f 盘子缩到 0.62x（exit）→ 停 3f 蓄力 → 28f 释放：5f 弹到 1.3x，再一记弹簧落回 1（damping 13，
//   一次可见回弹）。粒子 / 冲击环 / 绿色泛光与释放同帧齐发（三件套同帧是"爆花"成立条件）。
// - 粒子按空气阻力减速（指数衰减），线长 = 速度 × 系数：飞得快时是长划痕、慢下来收成短点，不是匀速平移；
//   12 根白 / 绿两色交错，外圈再撒 10 颗细小火花点做"粒子细响"。
// - 余波：盘子 40–62f 上移让位，标题「Live in production.」逐词从线下升起（120px / 700，句点是绿色），
//   等宽副行 32px 交代服务名 / 版本 / 用时；地面一圈反光由冷白转绿。
// - 镜头：释放帧整体 +2% 冲击推一下再回落（不抖），hold 段 1→1.02 极缓推进。
//
// 时间表（30fps，共 120f）：
//   0–22    预备：进度环 82% → 100% 加速；盘心百分比滚动（第 1 帧画面里就有盘和环）
//   22–28   蓄力：缩 0.62x（3f）+ 停 3f，百分比淡出
//   28–48   主动作：弹 1.3x → 弹簧落回；粒子 18f / 冲击环 22f / 泛光 20f；对勾 30–40f 画出
//   40–80   跟随：盘子上移让位（40–62f）、标题逐词升起（46f 起）、副行（60f 起）
//   80–120  hold：极缓推进，尾帧是一张完整的"已上线"海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

const DUR = 120;
export const POP_BURST_CONFIRM_DURATION = DUR; // 4s

const L = LOOKS.graphite;
const G0 = '#5ef2a6'; // 翡翠绿亮端（釉面顶）
const G1 = '#10b765'; // 翡翠绿暗端（釉面底）
const GLOW = '#2ee48a'; // 泛光 / 冲击环

const POP = 28; // 释放帧
const R = 190; // 盘半径（直径 380 = 半屏特写）
const CX = 960;

const hs = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};
const easeInProgress = bezier(0.5, 0, 0.9, 0.55); // 进度环：越来越急

// 盘子缩放：蓄力 → 过冲 → 弹簧落回
const discScale = (f: number) => {
  if (f < 22) return 1;
  if (f < 25) return mix(1, 0.62, ramp(f, 22, 3, EASE.exit));
  if (f < POP) return 0.62;
  if (f < POP + 5) return mix(0.62, 1.3, ramp(f, POP, 5, EASE.snappy));
  return mix(1.3, 1, springAt(f, POP + 5, { damping: 13, stiffness: 210 }));
};

export const PopBurstConfirm: React.FC = () => {
  const f = useCurrentFrame();

  const s = discScale(f);
  const progress = mix(0.82, 1, easeInProgress(Math.min(1, f / 22)));
  const pct = Math.round(progress * 100);
  const pendFade = 1 - ramp(f, POP - 1, 2, EASE.linear); // 待确认内容（百分比 / 进度环）释放前一帧才熄
  const charge = ramp(f, 21, 7, EASE.out); // 蓄力：盘内泛起绿色，等着被点燃
  const fill = ramp(f, POP, 3, EASE.out); // 釉面通电
  const check = ramp(f, POP + 2, 10, EASE.snappy); // 对勾画出

  // 盘子上移让位（为标题腾位置）
  const lift = ramp(f, 40, 22, EASE.swift);
  const CY = mix(500, 382, lift);

  // 镜头：释放帧 +2% 冲击（6f 回落）+ hold 段极缓推进
  const punch = f >= POP ? 0.02 * Math.exp(-(f - POP) / 4) * ramp(f, POP, 2, EASE.out) : 0;
  const cam = 1 + punch + 0.02 * ramp(f, 46, DUR - 46, EASE.smooth);

  // 冲击环：盘缘 → 2.5 倍直径
  const ringT = ramp(f, POP, 22, EASE.linear);
  const ringR = mix(R * 1.05, R * 2.5, EASE.snappy(ringT));
  // 泛光：只此一次
  const bloom = f >= POP ? Math.exp(-(f - POP) / 9) * ramp(f, POP, 2, EASE.out) : 0;
  // 地面反光：冷白 → 绿
  const floorGreen = ramp(f, POP, 10, EASE.out);

  // 粒子：阻力减速 pos = D(1 - e^{-t/τ})，速度 = D/τ · e^{-t/τ}
  const pt = f - POP;
  const TAU = 4.5;
  const sparks = pt >= 0 && pt < 20 ? Array.from({ length: 12 }, (_, i) => {
    const ang = ((i * 30 + 11 * (hs(i + 3) - 0.5)) * Math.PI) / 180;
    const D = 170 + 120 * hs(i + 11);
    const r0 = R * 1.12;
    const d = r0 + D * (1 - Math.exp(-pt / TAU));
    const v = (D / TAU) * Math.exp(-pt / TAU);
    const len = Math.max(4, v * 2.1);
    const w = i % 2 === 0 ? 9 : 6;
    const op = 1 - ramp(pt, 8, 12, EASE.linear);
    return { ang, d, len, w, op, c: i % 3 === 1 ? G0 : '#ffffff' };
  }) : [];
  const motes = pt >= 2 && pt < 30 ? Array.from({ length: 10 }, (_, i) => {
    const ang = ((i * 36 + 18 + 14 * (hs(i + 40) - 0.5)) * Math.PI) / 180;
    const D = 260 + 130 * hs(i + 50);
    const t = pt - 2;
    const d = R * 1.2 + D * (1 - Math.exp(-t / 7));
    return { ang, d, r: 3 + 3 * hs(i + 60), op: (1 - ramp(t, 10, 18, EASE.linear)) * 0.9 };
  }) : [];

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={null} horizon={0.8} intensity={0.75} />

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${CX}px 470px` }}>
        {/* 地面反光：盘子正下方一圈椭圆光（冷白 → 翡翠绿），盘子上移时变淡 */}
        <div style={{
          position: 'absolute', left: CX - 520, top: 820, width: 1040, height: 150, borderRadius: '50%',
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#d8dce4', 0.12 * (1 - floorGreen))} 0%, transparent 70%), ` +
            `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(GLOW, (0.2 + 0.25 * bloom) * floorGreen * (1 - 0.5 * lift))} 0%, transparent 70%)`,
        }} />

        {/* 释放泛光：盘后一次 */}
        {bloom > 0.01 && (
          <div style={{
            position: 'absolute', left: CX - 640, top: CY - 640, width: 1280, height: 1280, borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(GLOW, 0.5 * bloom)} 0%, ${alpha(GLOW, 0.16 * bloom)} 30%, transparent 62%)`,
          }} />
        )}
        {/* 落定后的常驻绿色余光（很淡，让主角一直有光） */}
        <div style={{
          position: 'absolute', left: CX - 520, top: CY - 520, width: 1040, height: 1040, borderRadius: '50%', opacity: fill,
          background: `radial-gradient(circle, ${alpha(GLOW, 0.13)} 0%, ${alpha(GLOW, 0.04)} 38%, transparent 64%)`,
        }} />

        {/* 冲击环 + 粒子 + 火花点 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {ringT > 0 && ringT < 1 && (
            <g>
              <circle cx={CX} cy={CY} r={ringR} fill="none" stroke={GLOW} strokeWidth={mix(26, 2, EASE.out(ringT))} opacity={0.18 * (1 - ringT)} />
              <circle cx={CX} cy={CY} r={ringR} fill="none" stroke="#c9ffe2" strokeWidth={mix(10, 1, EASE.out(ringT))} opacity={0.9 * (1 - ringT) ** 1.4} />
            </g>
          )}
          {sparks.map((p, i) => {
            const cx = Math.cos(p.ang), sy = Math.sin(p.ang);
            return (
              <line key={i} x1={CX + cx * (p.d - p.len)} y1={CY + sy * (p.d - p.len)} x2={CX + cx * p.d} y2={CY + sy * p.d}
                stroke={p.c} strokeWidth={p.w} strokeLinecap="round" opacity={p.op} />
            );
          })}
          {motes.map((m, i) => (
            <circle key={i} cx={CX + Math.cos(m.ang) * m.d} cy={CY + Math.sin(m.ang) * m.d} r={m.r} fill={i % 2 ? G0 : '#ffffff'} opacity={m.op} />
          ))}
        </svg>

        {/* 主角：状态盘 */}
        <div style={{ position: 'absolute', left: CX - 260, top: CY - 260, width: 520, height: 520, transform: `scale(${s})` }}>
          {/* 待确认：石墨凹盘 */}
          <div style={{
            position: 'absolute', left: 260 - R, top: 260 - R, width: R * 2, height: R * 2, borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 30%, #25272c 0%, #17181b 70%, #121315 100%)',
            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.06), inset 0 -10px 30px rgba(0,0,0,0.5), inset 0 0 ${60 * charge}px ${alpha(GLOW, 0.55 * charge)}, ` +
              `0 0 0 1px ${alpha(charge > 0 ? GLOW : '#ffffff', 0.07 + 0.3 * charge)}, 0 0 ${50 * charge}px ${alpha(GLOW, 0.3 * charge)}, 0 40px 80px -30px rgba(0,0,0,0.9)`,
          }} />
          {/* 通电：翡翠绿釉面盘（顶部高光 + 底部暗沿 + 接触影） */}
          <div style={{
            position: 'absolute', left: 260 - R, top: 260 - R, width: R * 2, height: R * 2, borderRadius: '50%', overflow: 'hidden',
            opacity: fill, transform: `scale(${0.9 + 0.1 * fill})`,
            background: `radial-gradient(circle at 50% 22%, ${G0} 0%, #27d47f 48%, ${G1} 86%, #0c9a55 100%)`,
            boxShadow: `inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -16px 36px rgba(0,60,30,0.45), 0 30px 70px -20px ${alpha('#00331a', 0.9)}`,
          }}>
            {/* 柔和顶光（closest-side 收到 0，不留硬边）+ 底部一道反射光弧 */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse closest-side at 50% 14%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              boxShadow: `inset 0 -3px 0 ${alpha('#b8ffd9', 0.35)}, inset 0 0 0 1.5px ${alpha('#c9ffe2', 0.35)}`,
            }} />
          </div>
          <svg width={520} height={520} viewBox="0 0 520 520" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {pendFade > 0 && (
              <g opacity={pendFade}>
                {/* 进度环：轨道 + 白色进度（从 12 点顺时针） */}
                <circle cx={260} cy={260} r={232} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
                <circle cx={260} cy={260} r={232} fill="none" stroke="#f4f4f2" strokeWidth={10} strokeLinecap="round"
                  pathLength={1} strokeDasharray={`${progress} 1`} transform="rotate(-90 260 260)"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.35))' }} />
                {/* 进度头：一颗发光亮点领跑 */}
                <circle cx={260 + 232 * Math.sin(progress * Math.PI * 2)} cy={260 - 232 * Math.cos(progress * Math.PI * 2)} r={9} fill="#ffffff"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.9)) drop-shadow(0 0 22px rgba(255,255,255,0.5))' }} />
              </g>
            )}
            {check > 0 && (
              <path d="M 172 266 L 233 326 L 352 200" fill="none" stroke="#ffffff" strokeWidth={38}
                strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - check}
                style={{ filter: 'drop-shadow(0 6px 10px rgba(0,70,30,0.35))' }} />
            )}
          </svg>
          {/* 盘心百分比（待确认态） */}
          {pendFade > 0 && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 196, textAlign: 'center', opacity: pendFade,
              fontFamily: FONT.mono, fontSize: 92, fontWeight: 500, color: L.ink, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
            }}>
              {pct}<span style={{ fontSize: 46, color: L.ink3, marginLeft: 4 }}>%</span>
            </div>
          )}
        </div>

        {/* 待确认说明：盘下等宽一行，蓄力时淡出 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', opacity: pendFade * ramp(f, 0, 8, EASE.out),
          fontFamily: FONT.mono, fontSize: 32, color: L.ink3, letterSpacing: '0.02em',
        }}>
          deploying orrery-api<span style={{ opacity: Math.floor(f / 6) % 2 ? 1 : 0.25 }}>_</span>
        </div>

        {/* 标题：逐词从线下升起；句点是唯一的绿 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 650, textAlign: 'center' }}>
          <TextReveal
            text="Live in production"
            by="word" variant="rise" start={46} each={20} gap={4}
            style={{ ...type(120, 700), letterSpacing: '-0.03em', wordSpacing: '0.08em', color: L.ink }}
          />
          {/* 句点：标题落定后单独"落"进来（绿色小弹一下，呼应爆点） */}
          <span style={{
            ...type(120, 700), color: G0, display: 'inline-block',
            opacity: ramp(f, 64, 3, EASE.linear),
            transform: `translateY(${mix(-0.5, 0, ramp(f, 64, 12, EASE.overshoot)).toFixed(3)}em)`,
          }}>.</span>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 812, textAlign: 'center' }}>
          <TextReveal
            text="orrery-api  ·  v4.2.0  ·  shipped in 38s"
            by="word" variant="blur" start={62} each={16} gap={2}
            style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 450, color: L.ink2, letterSpacing: '0.01em' }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
