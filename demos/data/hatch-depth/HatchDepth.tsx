// hatch-depth — 斜纹占位条逐条伸长，再原位"上墨"成实心数据条：占位草图变成真数据（几何不动、只换皮）
//
// 第二轮重设计（暖沙制图台 · 铅笔草图 → 墨色数据）：
// - look = sand（米色 · 深墨棕 · 赤陶）。整屏就是一张为镜头设计的条形图（不再收进 480×270 小面板）：
//   左列 40px 渠道名、横柱 72px 高最长 ~1120px、柱端 44px 读数、底部 100K 刻度网格；
//   连标题都先是一条铅笔斜纹占位条——整张图先是"草图"，再整体"上线"。
// - 草图态：细铅笔斜纹（18px 平铺、锚在条左端，伸长时纹理不爬动）+ 虚线描边，标签是弱灰；
//   右上角是 DRAFT 虚线胶囊。
// - 上墨：每条柱一道 115° 斜切的擦除前沿从左扫到右（斜纹在前沿后退场、实心墨色在前沿后到位），读数同步从 0 滚到终值；
//   最大值那条（Referral）上赤陶色，其余是深墨棕——强调色只给主角。标题占位条同拍虚化成真标题，胶囊翻成 ● LIVE。
// - 余波：全体柱宽 ±1.5% 阻带衰减微颤一次（"活数据在呼吸"），之后真静止；hold 段整张图极缓推近。
//
// 时间表（30fps，共 150f）：
//   0–6     预备：舞台、标签与网格在场（开场第 1 帧就有图表骨架）
//   4–48    生长：5 条斜纹占位柱错峰伸长（起点 4/11/17/22/26，间隔递减 = 越点越快），各 22f snappy
//   48–60   草图 hold（一拍停顿，让观众读到"这只是占位"）
//   60–96   上墨：逐条斜切擦除（60 + i·6 起，各 18f swift），读数 0→终值；66f 标题占位→真标题，82f DRAFT→LIVE
//   96–118  余波：柱宽阻尼微颤（±1.5%，~22f 收敛到 0）、合计 1.45M 落定
//   118–150 hold：整图 1.0→1.02 极缓推近，尾帧是完整的数据海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const HATCH_DEPTH_DURATION = 150;

const L = LOOKS.sand;
const SCALE_MAX = 420; // 柱宽 1.0 对应 420K（数值 = w × 420）
const ROWS = [
  { label: 'Organic', w: 0.85 },
  { label: 'Direct', w: 0.55 },
  { label: 'Referral', w: 0.95 },
  { label: 'Paid', w: 0.4 },
  { label: 'Email', w: 0.7 },
];
const LEAD = 2; // 最大值那条：赤陶色主角
const GROW_AT = [4, 11, 17, 22, 26]; // 生长错峰（间隔 7→6→5→4，越点越快）
const GROW_DUR = 22;
const INK_AT = (i: number) => 60 + i * 6; // 上墨起点
const INK_DUR = 18;

// 版式（1920×1080 原生坐标）
const LABEL_R = 430; // 标签右对齐线
const BAR_X = 470;
const BAR_FULL = 1180; // w=1 的满幅
const ROW_Y0 = 368;
const PITCH = 116;
const BAR_H = 72;

// 铅笔斜纹：细线 45°（"/" 向，与擦除前沿平行），18px 平铺，背景锚在条左上角（伸长不重算相位）
const PENCIL = alpha(L.ink, 0.42);
const HATCH = `linear-gradient(135deg, ${PENCIL} 0%, ${PENCIL} 11%, transparent 11%, transparent 50%, ${PENCIL} 50%, ${PENCIL} 61%, transparent 61%, transparent 100%)`;

// 斜切擦除前沿：edge = 前沿 x（条内 px），soft = 羽化半宽
const wipeMask = (edge: number, soft: number, invert: boolean) => {
  const a = invert ? 'transparent' : '#000';
  const b = invert ? '#000' : 'transparent';
  return `linear-gradient(115deg, ${a} ${(edge - soft).toFixed(1)}px, ${b} ${(edge + soft).toFixed(1)}px)`;
};

const HatchBlock: React.FC<{ w: number; h: number; radius: number; style?: React.CSSProperties }> = ({ w, h, radius, style }) => (
  <div style={{
    width: w, height: h, borderRadius: radius, boxSizing: 'border-box',
    backgroundImage: HATCH, backgroundSize: '18px 18px', backgroundPosition: '0 0', backgroundColor: alpha(L.ink, 0.035),
    border: `2px dashed ${alpha(L.ink, 0.3)}`, ...style,
  }} />
);

export const HatchDepth: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1 + 0.02 * ramp(frame, 96, 54, EASE.smooth);
  const gridIn = ramp(frame, 0, 14, EASE.out);
  // 标题：占位条 66f 起虚化退场，真标题逐词由虚到实
  const titleSwap = ramp(frame, 66, 14, EASE.out);
  const live = frame >= 82;
  const chipPop = ramp(frame, 82, 12, EASE.overshoot);
  const total = ramp(frame, 84, 26, EASE.out);
  // 余波微颤包络：96f 起 ±1.5%，指数衰减，118f 前归零
  const env = frame < 96 ? 0 : Math.exp(-(frame - 96) / 6) * (1 - ramp(frame, 110, 8, EASE.linear));

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={null} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 55%' }}>
        {/* ── 表头 ── */}
        <div style={{ position: 'absolute', left: 150, top: 104, ...type(24, 650, { caps: true }), letterSpacing: '0.26em', color: L.ink3, opacity: gridIn }}>
          Pollen Analytics — Weekly report
        </div>
        <div style={{ position: 'absolute', left: 150, top: 150, height: 100 }}>
          {/* 占位标题条（铅笔斜纹） */}
          {titleSwap < 1 && (
            <div style={{ position: 'absolute', left: 0, top: 12, opacity: (1 - titleSwap) * gridIn, filter: titleSwap > 0 ? `blur(${(titleSwap * 8).toFixed(2)}px)` : undefined }}>
              <HatchBlock w={760} h={70} radius={12} />
            </div>
          )}
          <div style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', ...type(88, 750), color: L.ink }}>
            <TextReveal text="Visitors by channel" by="word" variant="blur" start={68} each={16} gap={4} />
          </div>
        </div>
        {/* DRAFT 虚线胶囊 → ● LIVE */}
        <div style={{ position: 'absolute', right: 150, top: 176, height: 56, display: 'flex', alignItems: 'center' }}>
          {!live ? (
            <div style={{
              height: 56, padding: '0 26px', borderRadius: 28, border: `2px dashed ${alpha(L.ink, 0.35)}`, display: 'flex', alignItems: 'center',
              ...type(26, 700, { caps: true }), letterSpacing: '0.2em', color: L.ink3, opacity: gridIn * (1 - ramp(frame, 76, 6, EASE.exit)),
            }}>Draft</div>
          ) : (
            <div style={{
              height: 56, padding: '0 26px 0 22px', borderRadius: 28, background: L.ink, display: 'flex', alignItems: 'center', gap: 14,
              ...type(26, 700, { caps: true }), letterSpacing: '0.2em', color: L.surface,
              transform: `scale(${mix(0.7, 1, chipPop).toFixed(4)})`, opacity: Math.min(1, chipPop * 1.6), transformOrigin: '100% 50%',
              boxShadow: softShadow(10, { color: L.shadow }),
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, boxShadow: `0 0 0 ${(6 * (1 - ramp(frame, 86, 20, EASE.out))).toFixed(2)}px ${alpha(L.accent, 0.35)}` }} />
              Live
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', right: 150, top: 256, whiteSpace: 'nowrap', textAlign: 'right', ...type(32, 500), color: L.ink2, opacity: total }}>
          <span style={{ color: L.ink, fontWeight: 700 }}>{(1.449 * total).toFixed(2)}M</span> visitors · last 7 days
        </div>

        {/* ── 刻度网格：0 / 100K / 200K / 300K / 400K ── */}
        {[0, 1, 2, 3, 4].map((k) => {
          const x = BAR_X + ((k * 100) / SCALE_MAX) * BAR_FULL;
          return (
            <React.Fragment key={k}>
              <div style={{
                position: 'absolute', left: x, top: ROW_Y0 - 22, width: k === 0 ? 2 : 1, height: PITCH * 4 + BAR_H + 44,
                background: alpha(L.ink, k === 0 ? 0.28 : 0.1), opacity: gridIn,
              }} />
              <div style={{
                position: 'absolute', left: x, top: ROW_Y0 + PITCH * 4 + BAR_H + 36, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                ...type(26, 600), color: L.ink3, opacity: gridIn,
              }}>{k === 0 ? '0' : `${k * 100}K`}</div>
            </React.Fragment>
          );
        })}

        {/* ── 柱 ── */}
        {ROWS.map(({ label, w }, i) => {
          const y = ROW_Y0 + i * PITCH;
          const grow = ramp(frame, GROW_AT[i], GROW_DUR, EASE.snappy);
          const ink = ramp(frame, INK_AT(i), INK_DUR, EASE.swift);
          const wiggle = 1 + Math.sin((frame - 96) * 0.9 + i * 2.1) * 0.015 * env;
          const barW = grow * w * BAR_FULL * wiggle; // 斜纹层与实心层共用同一宽度（几何零跳变）
          const soft = 34;
          const edge = mix(-soft - 40, barW + soft + 40, ink); // 前沿扫过整条（含 115° 斜切的投影余量）
          const lead = i === LEAD;
          const count = Math.round(w * SCALE_MAX * ramp(frame, INK_AT(i), INK_DUR + 8, EASE.out));
          const valOn = ramp(frame, INK_AT(i) + 4, 10, EASE.out);
          const labelInk = ramp(frame, INK_AT(i), INK_DUR, EASE.out);
          const front = ink > 0.02 && ink < 0.98 && edge > 8 && edge < barW - 8; // 前沿在条内时才画一道细高光
          return (
            <React.Fragment key={label}>
              <div style={{
                position: 'absolute', left: LABEL_R - 300, width: 300, top: y, height: BAR_H, lineHeight: `${BAR_H}px`, textAlign: 'right',
                ...type(40, lead ? 700 : 600), color: labelInk > 0.5 ? (lead ? L.ink : L.ink2) : L.ink3, opacity: gridIn,
              }}>{label}</div>
              {/* 斜纹占位层：前沿之后退场 */}
              {ink < 1 && barW > 1 && (
                <div style={{
                  position: 'absolute', left: BAR_X, top: y,
                  WebkitMaskImage: ink > 0 ? wipeMask(edge, soft, true) : undefined, maskImage: ink > 0 ? wipeMask(edge, soft, true) : undefined,
                }}>
                  <HatchBlock w={barW} h={BAR_H} radius={10} />
                </div>
              )}
              {/* 实心墨色层：前沿之前到位 */}
              {ink > 0 && (
                <div style={{
                  position: 'absolute', left: BAR_X, top: y, width: barW, height: BAR_H, borderRadius: 10,
                  background: lead
                    ? `linear-gradient(180deg, #d8673d 0%, ${L.accent} 55%, #ab4522 100%)`
                    : 'linear-gradient(180deg, #43342a 0%, #2d221a 60%, #221a12 100%)',
                  boxShadow: `inset 0 1.5px 0 rgba(255,255,255,${lead ? 0.3 : 0.14}), ${softShadow(8, { color: L.shadow, strength: 1.2 })}`,
                  WebkitMaskImage: ink < 1 ? wipeMask(edge, soft, false) : undefined, maskImage: ink < 1 ? wipeMask(edge, soft, false) : undefined,
                }} />
              )}
              {front && (
                <div style={{
                  position: 'absolute', left: BAR_X + edge - 2, top: y - 6, width: 4, height: BAR_H + 12, borderRadius: 2,
                  background: lead ? '#ffd2b8' : alpha('#fff6e8', 0.9), transform: 'skewX(-25deg)', opacity: Math.sin(ink * Math.PI),
                  boxShadow: `0 0 18px ${alpha(lead ? L.accent : '#fff6e8', 0.8)}`,
                }} />
              )}
              {/* 柱端读数 */}
              <div style={{
                position: 'absolute', left: BAR_X + barW + 22, top: y, height: BAR_H, lineHeight: `${BAR_H}px`, whiteSpace: 'nowrap',
                ...type(44, 700), letterSpacing: '-0.02em', color: lead ? L.accent : L.ink, opacity: valOn,
                transform: `translateX(${mix(-10, 0, valOn).toFixed(2)}px)`,
              }}>{count}K</div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
