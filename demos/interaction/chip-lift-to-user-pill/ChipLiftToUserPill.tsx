// chip-lift-to-user-pill —— Chip Lift 选中 chip 长成人名药丸
// 网格里的目标 chip 3 帧台阶硬切反色，其余 chip 按到它的曼哈顿距离交错淡出缩小；反色 chip 左缘锚定向右生长成药丸，
// 内部逐字打出人名并点亮在线点，再拉一条连接线接到圆形徽标，最后字幕逐词加深。
//
// 第二轮重设计（酸柠暗场 · 协作工具"拉一个人进来"）：
// - look = lime（石墨暗场 · 荧光黄绿）。按 1080p 原生排版重写（不再用 480×270 设计坐标放大）：4×3 头像缩写网格，
//   chip 168×100、40px 字，网格占画宽 ~39%，眉题「Design team · 12 online」。虚构协作产品 Wren 的新建会话。
// - 两段质感：选中是硬的——反色走 3 档台阶（0 / 0.5 / 1，每档 2f，不缓动），暗灰 chip 一下变成近白实体；
//   之后是软的——药丸左缘锚定 smooth 生长到 640px，缩写先撤、人名逐字升起（打字挂在生长进度 g 上），
//   生长收尾荧光绿在线点 overshoot 弹出并带一圈泛光（全片唯一的强调色主角）。
// - 余项按曼哈顿距离从选中点向外扩散退场（opacity→0 + scale→0.9），空间因果优先于时间顺序。
// - 连接线：药丸定型后才起笔，荧光绿细线 + 领跑光点，抵达即徽标（Wren 标）弹入——"线到即物到"；
//   字幕 60px「Starting a thread with Noor」与药丸左缘对齐逐词加深，下方 32px 副句交代上下文。
// - 机位：选择与生长段静止（左缘锚定的"展开"读法不受影响）；定型后 smooth 横移 + 上移把结果组送到画面中心。
//
// 时间表（30fps，共 165f）：
//   0–26    眉题 + 12 个 chip 由中心向外错峰升起（按到目标的距离排序）
//   26–38   读：网格静置（Stage 光呼吸）
//   38–44   反色硬切：38–39f 原色 / 40–41f 半灰 / 42f 起近白（三档台阶）
//   44–74   余项按距离扩散退场（dist×3.3f 起步，各 11f）
//   58–88   药丸生长 168→640（30f，outCubic）；人名逐字；84–88 在线点弹出
//   90–126  机位 smooth 横移到结果组居中 + 推近 5%（hold 段再缓推 1.5%）
//   96–110  连接线 0→170px（outQuad）+ 领跑光点；108–118 徽标弹入
//   112–150 字幕显形、逐词加深；副句 122f 升起
//   150–165 落定 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha, glow, springAt, type } from '../../_fixtures/Look';

export const CHIP_LIFT_TO_USER_PILL_DURATION = 165;

const L = LOOKS.lime;
const LIME = L.accent;
const PILL_BG = '#f4f6ee'; // 反色目标：近白（暗场里的"反色"）
const PILL_INK = '#10120c';

// ── 网格 ──
const COLS = 4, ROWS = 3, CW = 168, CH = 100, GX = 24, GY = 24;
const GRID_W = COLS * CW + (COLS - 1) * GX;
const GRID_H = ROWS * CH + (ROWS - 1) * GY;
const GX0 = 960 - GRID_W / 2;
const GY0 = 556 - GRID_H / 2;
const TC = 1, TR = 1; // 目标 chip
const LABELS = ['JD', 'MK', 'CR', 'RL', 'AV', 'NH', 'KN', 'BW', 'CE', 'HR', 'LM', 'DQ'];
const TX = GX0 + TC * (CW + GX);
const TY = GY0 + TR * (CH + GY);
const CELLS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS), c = i % COLS;
  return { i, x: GX0 + c * (CW + GX), y: GY0 + r * (CH + GY), label: LABELS[i], dist: Math.abs(c - TC) + Math.abs(r - TR), isT: c === TC && r === TR };
});

// ── 时间 ──
const INVERT = 38; // 反色台阶起点（38/40/42 三档）
const FADE0 = 44;
const GROW0 = 58;
const GROW_DUR = 30;
const CAM0 = 90;
const LINE0 = 96;
const LINE_DUR = 14;
const BADGE0 = 108;
const CAP0 = 112;

// ── 药丸 / 结果组几何 ──
const PW0 = CW, PW1 = 640;
const NAME = 'Noor Haddad';
const LINE_W = 170;
const BADGE = 104;
const GROUP_L = TX, GROUP_R = TX + PW1 + LINE_W + BADGE;
const CAM_DX = 960 - (GROUP_L + GROUP_R) / 2;
const CAM_DY = 470 - TY; // 药丸顶落到 y≈470，字幕在其下

const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const q = Math.max(0, Math.min(1, t));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * q)).join(',')})`;
};

const WrenMark: React.FC<{ size: number; c: string }> = ({ size, c }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 7.5c3.2 0 5.4 1.6 6.6 4.8C11.8 8.6 14.6 6 19.5 5.5c-1 5.8-4.4 9.6-9.4 11.2L6.5 19l.9-3.6C5.2 13.8 4 11.2 4 7.5z" fill={c} />
  </svg>
);

export const ChipLiftToUserPill: React.FC = () => {
  const frame = useCurrentFrame();

  // 反色台阶：只有 0 / 0.5 / 1 三个取值
  // 反色台阶：每档 2f，只有 0 / 0.5 / 1 三个取值（38–39f 仍为 0 = 按下前最后一拍）
  const k = frame < INVERT + 2 ? 0 : frame < INVERT + 4 ? 0.5 : 1;

  const g = ramp(frame, GROW0, GROW_DUR, EASE.out); // 生长进度（outCubic 语义）
  const pw = mix(PW0, PW1, g);
  const dotP = ramp(g, 0.85, 0.15, EASE.overshoot);
  const camP = ramp(frame, CAM0, 36, EASE.smooth);
  const camX = CAM_DX * camP, camY = CAM_DY * camP;

  const lineP = ramp(frame, LINE0, LINE_DUR, (t) => 1 - (1 - t) * (1 - t));
  const badgeP = springAt(frame, BADGE0, { damping: 14, stiffness: 220 });
  const badgeOp = ramp(frame, BADGE0, 6, EASE.out);
  const capShow = ramp(frame, CAP0, 10, EASE.snappy);
  const subIn = ramp(frame, 122, 14, EASE.snappy);

  // 选中前后 chip 抬起
  const liftEl = 6 + 18 * k;
  const eyebrowOut = ramp(frame, FADE0, 14, EASE.exit);

  const CAP_WORDS = 'Starting a thread with Noor'.split(' ');

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.36, y: -0.08 }} fill={null} intensity={0.55} breathe={0.6}>
        <Dust look={L} count={18} seed={9} drift={0.16} opacity={0.3} />
      </Stage>

      <AbsoluteFill style={{ transform: `translate(${camX.toFixed(2)}px, ${camY.toFixed(2)}px)`, transformOrigin: `${(960 - camX).toFixed(1)}px ${(540 - camY).toFixed(1)}px`, scale: `${(1 + 0.05 * camP + 0.015 * ramp(frame, 126, 39, EASE.smooth)).toFixed(4)}` }}>
        {/* 眉题 */}
        <div style={{
          position: 'absolute', left: GX0, top: GY0 - 76, display: 'flex', alignItems: 'center', gap: 14,
          ...type(22, 650, { caps: true }), letterSpacing: '0.2em', color: L.ink2,
          opacity: ramp(frame, 0, 12, EASE.out) * (1 - eyebrowOut), transform: `translateY(${(-12 * eyebrowOut).toFixed(2)}px)`,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: LIME, boxShadow: glow(LIME, 0.4) }} />
          Design team · 12 online
        </div>

        {/* 其余 chip */}
        {CELLS.filter((c) => !c.isT).map((c) => {
          const inP = ramp(frame, 2 + c.dist * 3.5 + (c.i % 3) * 0.8, 16, EASE.snappy);
          const d0 = FADE0 + c.dist * 3.3;
          const out = ramp(frame, d0, 11, (t) => 1 - (1 - t) * (1 - t));
          return (
            <div key={c.i} style={{
              position: 'absolute', left: c.x, top: c.y, width: CW, height: CH, boxSizing: 'border-box', borderRadius: CH / 2,
              background: `linear-gradient(180deg, ${L.surface2}, ${L.surface})`, border: `1px solid ${alpha('#ffffff', 0.08)}`,
              boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.07)}, ${softShadow(8, { color: '#000000', strength: 2.2 })}`,
              display: 'grid', placeItems: 'center', ...type(40, 600), letterSpacing: '0.04em', color: L.ink2,
              opacity: inP * (1 - out), transform: `translateY(${((1 - inP) * 26).toFixed(2)}px) scale(${(1 - 0.1 * out).toFixed(4)})`,
            }}>{c.label}</div>
          );
        })}

        {/* 目标 chip → 药丸（左缘锚定，只改 width） */}
        {(() => {
          const c = CELLS.find((x) => x.isT)!;
          const inP = ramp(frame, 2, 16, EASE.snappy);
          const labelOut = Math.min(1, g * 5);
          return (
            <div style={{
              position: 'absolute', left: TX, top: TY, width: pw, height: CH, opacity: inP,
              transform: `translateY(${((1 - inP) * 26).toFixed(2)}px)`,
            }}>
              {/* 落地泛光：在线点亮起后药丸底下一抹荧光绿 */}
              <div style={{
                position: 'absolute', left: '10%', right: '-4%', top: CH * 0.55, height: CH, borderRadius: '50%',
                background: `radial-gradient(ellipse 50% 50% at 70% 40%, ${alpha(LIME, 0.16 * dotP)} 0%, transparent 70%)`, filter: 'blur(8px)',
              }} />
              <div style={{
                position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: CH / 2, overflow: 'hidden',
                background: k > 0
                  ? `linear-gradient(180deg, ${k >= 1 ? '#ffffff' : '#9a9d93'}, ${k >= 1 ? PILL_BG : '#7c7f75'})`
                  : `linear-gradient(180deg, ${L.surface2}, ${L.surface})`,
                border: `1px solid ${k > 0 ? alpha('#ffffff', 0.6) : alpha('#ffffff', 0.08)}`,
                boxShadow: `inset 0 1px 0 ${alpha('#ffffff', k > 0 ? 0.9 : 0.07)}, inset 0 -2px 0 ${alpha('#000000', 0.08 * k)}, ${softShadow(liftEl, { color: '#000000', strength: 2.4 })}`,
              }}>
                {/* 原缩写：生长开始后先撤 */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, width: CW, height: CH, display: 'grid', placeItems: 'center',
                  ...type(40, 650), letterSpacing: '0.04em', color: k >= 1 ? PILL_INK : k > 0 ? '#2a2c26' : L.ink2,
                  opacity: 1 - labelOut, transform: `translateY(${(-14 * labelOut).toFixed(2)}px)`,
                }}>{c.label}</div>
                {/* 人名逐字（挂在 g 上） */}
                <div style={{ position: 'absolute', left: 40, top: 0, height: CH, display: 'flex', alignItems: 'center', whiteSpace: 'pre' }}>
                  {NAME.split('').map((ch, i) => {
                    const p = ramp(g, 0.16 + i * 0.058, 0.06, EASE.out);
                    return (
                      <span key={i} style={{
                        display: 'inline-block', ...type(48, 680), color: PILL_INK, opacity: p,
                        transform: `translateY(${((1 - p) * 12).toFixed(2)}px)`,
                      }}>{ch}</span>
                    );
                  })}
                  <span style={{
                    marginLeft: 20, ...type(28, 520), color: '#7a7d72', opacity: ramp(g, 0.78, 0.17, EASE.out),
                    transform: `translateX(${((1 - ramp(g, 0.78, 0.17, EASE.out)) * -10).toFixed(2)}px)`,
                  }}>Product design</span>
                </div>
                {/* 在线点：吸在药丸右端 */}
                <div style={{
                  position: 'absolute', left: pw - 56, top: CH / 2 - 9, width: 18, height: 18, borderRadius: 99,
                  background: '#7fd000', transform: `scale(${dotP.toFixed(3)})`,
                  boxShadow: `0 0 0 ${(5 * dotP).toFixed(1)}px ${alpha('#7fd000', 0.18)}, 0 0 14px ${alpha('#7fd000', 0.6 * dotP)}`,
                }} />
              </div>
            </div>
          );
        })()}

        {/* 连接线 + 领跑光点 */}
        {lineP > 0 && (
          <>
            <div style={{
              position: 'absolute', left: TX + PW1 + 6, top: TY + CH / 2 - 1.5, width: (LINE_W - 6) * lineP, height: 3, borderRadius: 2,
              background: `linear-gradient(90deg, ${alpha(LIME, 0.35)}, ${LIME})`, boxShadow: `0 0 10px ${alpha(LIME, 0.45)}`,
            }} />
            {lineP < 1 && (
              <div style={{
                position: 'absolute', left: TX + PW1 + 6 + (LINE_W - 6) * lineP - 9, top: TY + CH / 2 - 9, width: 18, height: 18, borderRadius: 99,
                background: `radial-gradient(circle, #ffffff 0%, ${LIME} 45%, ${alpha(LIME, 0)} 72%)`,
              }} />
            )}
          </>
        )}

        {/* 徽标（Wren） */}
        <div style={{
          position: 'absolute', left: TX + PW1 + LINE_W, top: TY + CH / 2 - BADGE / 2, width: BADGE, height: BADGE, borderRadius: 99,
          background: `radial-gradient(circle at 35% 30%, #e4ff7a, ${LIME} 60%, #9cc41c)`,
          boxShadow: `inset 0 2px 0 rgba(255,255,255,0.45), 0 0 40px ${alpha(LIME, 0.35)}, ${softShadow(20, { color: '#000000', strength: 2.2 })}`,
          display: 'grid', placeItems: 'center', opacity: badgeOp, transform: `scale(${(0.8 + 0.2 * badgeP).toFixed(4)})`,
        }}>
          <WrenMark size={54} c={L.onAccent} />
        </div>

        {/* 字幕（与药丸左缘对齐，逐词加深） */}
        <div style={{
          position: 'absolute', left: TX, top: TY + CH + 54, display: 'flex', gap: '0.28em', whiteSpace: 'nowrap',
          ...type(60, 680), opacity: capShow, transform: `translateY(${((1 - capShow) * 18).toFixed(2)}px)`,
        }}>
          {CAP_WORDS.map((w, i) => {
            const deep = ramp(frame, CAP0 + 4 + i * 5, 10, EASE.out);
            const last = i === CAP_WORDS.length - 1;
            return <span key={i} style={{ color: last ? mixHex(L.ink3, LIME, deep) : `rgba(246,248,240,${(0.28 + 0.72 * deep).toFixed(3)})` }}>{w}</span>;
          })}
        </div>
        <div style={{ position: 'absolute', left: TX, top: TY + CH + 140, height: 44, overflow: 'hidden' }}>
          <div style={{ ...type(32, 500), color: L.ink2, whiteSpace: 'nowrap', transform: `translateY(${((1 - subIn) * 110).toFixed(1)}%)` }}>
            Design review · Checkout flow v3 · 4 files
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
