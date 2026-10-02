// reticle-lock-on —— 准星咬合（钢铁侠 HUD / 安德的游戏）
// 一张一直在动的实时配送地图（相机缓移、骑手沿街行驶）里，四个 L 形角标组成的取景框从画外右下冲入、
// 大框收缩过头再回弹，"咔"地咬合到一位正在行驶的骑手四角——之后取景框跟着她继续走（运动中的捕获，画面不冻结），
// 标签卡弹出、送达路线从她身上画向终点。
//
// 第二轮重设计（暖沙纸地图 · 同城配送「Juniper」）：
// - look = sand（米色纸感地图 + 赤陶强调色）：地图是为镜头设计的极简城市平面——街区圆角块、一条斜穿的主干道、
//   一道河、公园，路名只当纹理；强调色只给取景框、被锁定的骑手光环和送达路线。
// - 目标不再是静止卡片，而是一个在走的骑手图标：取景框飞入时要"追"着打中，咬合后逐帧跟随；
//   相机在锁定后 smooth 推近 7%，其余骑手照常行驶，周围被一层暖色柔光压淡（聚焦而不冻结）。
// - 角标 6px 圆头赤陶笔画 + 奶白衬底，飞入行程 ≥1150px，按速度做斜向运动模糊；收缩 2.5× → 0.9× → 1 一次过冲；
//   咬合帧角标向内收紧 8px 再弹回（"咔"）+ 目标光环一次扩散。
// - 标签卡（44px ETA「3 min」+ 32px 人名 + 24px 单号）与一条引线同帧弹出，出版级可读。
//
// 时间表（30fps，共 120f）：
//   0–14    预备：地图在缓移、骑手们在走（第 1 帧就是完整画面）
//   14–26   主动作①：取景框从右下画外冲入（out-cubic 12f），中心十字可见，斜向运动模糊
//   20–40   主动作②：大框收缩 2.5× → 0.9×（swift，与飞入重叠 6f 不停顿）
//   40–46   回弹 0.9× → 1（out），46 咬合：角标收紧脉冲 + 目标光环扩散 + 周围柔光压淡
//   48–62   跟随：引线与标签卡弹出（spring damping 15），卡内文字晚 3f
//   54–76   余波：送达路线从骑手画向终点（snappy 22f），终点图钉落下
//   46–120  hold：取景框跟随骑手行驶，相机 smooth 推近 7%，干净落定
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt } from '../../_fixtures/Look';

export const RETICLE_LOCK_ON_DURATION = 120;

const L = LOOKS.sand;
const ACC = L.accent; // 赤陶
const INK = L.ink;

// 时间点
const FLY0 = 14;
const FLY1 = 26;
const SHRINK0 = 20;
const UNDER = 40;
const LOCK = 46;
const cubicOut = bezier(0.33, 1, 0.68, 1); // 飞入：out-cubic，行程在 12f 里读得出"扑过来"

// ───────── 地图（世界坐标 2600×1600） ─────────
const BLOCK_W = 230;
const BLOCK_H = 168;
const GAP = 30;
const hash = (n: number) => {
  const x = Math.sin(n * 71.3 + 9.7) * 43758.5453;
  return x - Math.floor(x);
};
// 街区：每块按种子决定是否分成两块地（中间一条 8px 小巷）、色调微差，让平面不像棋盘
const BLOCKS: Array<{ x: number; y: number; w: number; h: number; park: boolean; tone: string }> = [];
for (let r = 0; r < 9; r++) {
  for (let c = 0; c < 10; c++) {
    const x = c * (BLOCK_W + GAP);
    const y = r * (BLOCK_H + GAP);
    const park = (r === 2 && c === 6) || (r === 3 && c === 6) || (r === 6 && c === 2);
    const k = hash(r * 13 + c);
    const tone = park ? '#e3e0c9' : k < 0.33 ? '#e9dfd0' : k < 0.66 ? '#ebe2d4' : '#e6dccc';
    if (!park && k > 0.55) {
      const split = 0.38 + hash(r * 7 + c * 3) * 0.24;
      if (k > 0.78) {
        BLOCKS.push({ x, y, w: BLOCK_W * split - 4, h: BLOCK_H, park, tone });
        BLOCKS.push({ x: x + BLOCK_W * split + 4, y, w: BLOCK_W * (1 - split) - 4, h: BLOCK_H, park, tone });
      } else {
        BLOCKS.push({ x, y, w: BLOCK_W, h: BLOCK_H * split - 4, park, tone });
        BLOCKS.push({ x, y: y + BLOCK_H * split + 4, w: BLOCK_W, h: BLOCK_H * (1 - split) - 4, park, tone });
      }
    } else BLOCKS.push({ x, y, w: BLOCK_W, h: BLOCK_H, park, tone });
  }
}
const streetY = (r: number) => r * (BLOCK_H + GAP) - GAP / 2; // 第 r 条横街中线
const streetX = (c: number) => c * (BLOCK_W + GAP) - GAP / 2;

// 目标骑手：沿第 4 条横街向右匀速行驶（载具 = 机械匀速语义）
const TARGET_Y = streetY(4);
const targetAt = (f: number) => ({ x: 1010 + f * 2.4, y: TARGET_Y });
// 其他骑手：[横/竖, 街序号, 起点, 速度]
const OTHERS: Array<[boolean, number, number, number]> = [
  [true, 2, 300, 2.0], [true, 6, 1700, -2.2], [false, 3, 200, 1.8], [false, 8, 1300, -1.6],
  [true, 5, 600, 1.4], [false, 5, 900, 2.2], [true, 3, 2100, -1.8], [false, 2, 1100, -1.2],
];
// 终点（送达地址）
const DEST = { x: streetX(7), y: streetY(6) };

// 相机：世界 → 屏幕。缓移 + 锁定后推近（以屏幕中心为原点缩放）
const camAt = (f: number) => {
  const ox = mix(-260, -420, ramp(f, 0, 120, EASE.smooth));
  const oy = mix(-300, -330, ramp(f, 0, 120, EASE.smooth));
  const z = mix(1, 1.07, ramp(f, LOCK - 4, 64, EASE.smooth));
  return { ox, oy, z };
};
const toScreen = (f: number, w: { x: number; y: number }) => {
  const { ox, oy, z } = camAt(f);
  return { x: 960 + z * (w.x + ox - 960), y: 540 + z * (w.y + oy - 540) };
};

const Scooter: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="17" r="2.6" /><circle cx="18" cy="17" r="2.6" />
    <path d="M8.6 17h6.8l-2-7h3.2" /><path d="M6 17l3-6h4" />
  </svg>
);

const Map: React.FC<{ f: number }> = ({ f }) => (
  <svg width={2600} height={1800} style={{ position: 'absolute', left: 0, top: 0 }}>
    <rect x={-200} y={-200} width={3000} height={2200} fill="#f6efe4" />
    {/* 河：斜穿的一道 */}
    <path d="M-200 1380 C 400 1220, 700 1500, 1200 1330 S 2100 1120, 2800 1260 L 2800 1420 C 2100 1290, 1700 1500, 1200 1480 S 400 1380, -200 1530 Z" fill="#d6dde0" />
    {BLOCKS.map((b, i) => (
      <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill={b.tone} />
    ))}
    {/* 公园里的小径 */}
    <path d={`M${6 * 260 + 30} ${2 * 198 + 40} q 80 120 170 140`} stroke="#f6efe4" strokeWidth={8} fill="none" strokeLinecap="round" />
    {/* 斜穿主干道 */}
    <path d="M-100 1500 L 2700 -60" stroke="#fbf8f2" strokeWidth={46} strokeLinecap="round" />
    <path d="M-100 1500 L 2700 -60" stroke="#e8dccb" strokeWidth={2} strokeDasharray="18 16" />
    {/* 路名（纹理字） */}
    {[['HARBOR AVE', 1180, 1030, -29], ['MARKET ST', 300, TARGET_Y + 7, 0], ['ELM ST', streetX(4) + 7, 260, 90], ['QUAY RD', 1500, streetY(6) + 7, 0]].map(([t, x, y, a]) => (
      <text key={t as string} x={x as number} y={y as number} transform={`rotate(${a} ${x} ${y})`} fill="#b5a48e"
        style={{ font: `600 19px ${FONT.sans}`, letterSpacing: '0.2em' }}>{t as string}</text>
    ))}
    {/* 其他骑手：墨色小点沿街行驶 */}
    {OTHERS.map(([horiz, k, s0, v], i) => {
      const p = s0 + v * f;
      const x = horiz ? p : streetX(k);
      const y = horiz ? streetY(k) : p;
      return (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r={15} fill="#fffaf2" />
          <circle r={10} fill="#6d5d4c" />
        </g>
      );
    })}
  </svg>
);

export const ReticleLockOn: React.FC = () => {
  const f = useCurrentFrame();
  const { ox, oy, z } = camAt(f);
  const tw = targetAt(f);
  const ts = toScreen(f, tw);

  // ① 飞入：整框从右下画外冲入（相对目标的偏移 1150, 640 → 0）
  const flyOff = (fr: number) => {
    const t = ramp(fr, FLY0, FLY1 - FLY0, cubicOut);
    return { x: (1 - t) * 1150, y: (1 - t) * 640 };
  };
  const fo = flyOff(f), fo0 = flyOff(f - 0.5), fo1 = flyOff(f + 0.5);
  // ② 收缩：2.5 → 0.9（swift，过冲）→ 1（out 回弹）
  const shrink = f < UNDER ? mix(2.5, 0.9, ramp(f, SHRINK0, UNDER - SHRINK0, EASE.swift)) : mix(0.9, 1, ramp(f, UNDER, LOCK - UNDER, EASE.out));
  // ③ 咬合"咔"：锁定瞬间再向内收紧 8px 后弹回（5f）
  const bite = f >= LOCK ? Math.max(0, 1 - (f - LOCK) / 5) * Math.min(1, (f - LOCK + 1) / 1) : 0;
  const HALF = 74; // 咬合后半边长（目标图标 64px + 呼吸距）
  const hw = HALF * shrink * z - 8 * bite;
  const showReticle = f >= FLY0;
  const retOp = ramp(f, FLY0, 3, EASE.out);
  const locked = f >= LOCK;
  const focus = ramp(f, LOCK - 2, 14, EASE.out);
  // 目标光环扩散（锁定时一次）
  const ring = ramp(f, LOCK, 18, EASE.out);
  // 十字：飞行中可见，锁定后淡出（准星 → 取景框的语义交接）
  const cross = 1 - ramp(f, LOCK - 6, 8, EASE.out);

  // 标签卡与引线
  const card = springAt(f, 48, { damping: 15, stiffness: 190 });
  const cardText = ramp(f, 51, 12, EASE.snappy);
  // 送达路线：骑手 → 终点（沿街：先右再上）
  const route = ramp(f, 54, 22, EASE.snappy);
  const pin = springAt(f, 70, { damping: 13, stiffness: 220 });
  const corner = { x: DEST.x, y: TARGET_Y };
  const segA = Math.abs(corner.x - tw.x), segB = Math.abs(DEST.y - corner.y);
  const routeLen = segA + segB;
  const drawn = routeLen * route;
  const routePts = drawn <= segA
    ? `M${tw.x} ${tw.y} H${tw.x + drawn}`
    : `M${tw.x} ${tw.y} H${corner.x} V${corner.y + (drawn - segA)}`;
  const destS = toScreen(f, DEST);

  // 标签卡位置：取景框右上方
  const cx = ts.x + hw + 70, cy = ts.y - hw - 250;

  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[1], fontFamily: FONT.sans }}>
      {/* 地图层（世界坐标，相机缓移 + 推近） */}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(960px,540px) scale(${z.toFixed(4)}) translate(-960px,-540px) translate(${ox.toFixed(2)}px,${oy.toFixed(2)}px)`, transformOrigin: '0 0' }}>
        <Map f={f} />
        {/* 送达路线（锁定后） */}
        {route > 0 && (
          <svg width={2600} height={1800} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <path d={routePts} stroke={alpha(ACC, 0.25)} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={routePts} stroke={ACC} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {/* 舞台光与颗粒压在地图之上（只放氛围：主光 + 暗角 + 颗粒） */}
      <Stage look={L} keyLight={{ x: 0.3, y: 0.0 }} fill={null} intensity={0.5} vignette={0.2}
        style={{ background: 'transparent', mixBlendMode: 'multiply' }} />
      {/* 聚焦：目标外一层暖色柔光压淡 */}
      {focus > 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle 420px at ${ts.x.toFixed(1)}px ${ts.y.toFixed(1)}px, ${alpha(L.bg[0], 0)} 30%, ${alpha(L.bg[0], 0.5 * focus)} 100%)`,
        }} />
      )}

      {/* 终点图钉：路线末端一枚墨色圆点 + 右侧地址胶囊 */}
      {pin > 0.01 && (
        <div style={{ position: 'absolute', left: destS.x, top: destS.y, transform: `scale(${pin.toFixed(4)})`, transformOrigin: '0 0' }}>
          <div style={{ position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14, background: INK, boxShadow: `0 0 0 5px #fffaf2, ${softShadow(10, { color: L.shadow, strength: 1.4 })}` }} />
          <div style={{
            position: 'absolute', left: 30, top: -30, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 12px 16px', borderRadius: 18,
            background: INK, color: '#fff8f0', fontSize: 26, fontWeight: 650, whiteSpace: 'nowrap', boxShadow: softShadow(16, { color: L.shadow, strength: 1.6 }),
          }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff8f0" strokeWidth={2.2} strokeLinejoin="round"><path d="M4 11 12 4l8 7v9H4z" /></svg>
            42 Linden Row
          </div>
        </div>
      )}

      {/* 目标骑手（屏幕坐标，跟随相机） */}
      <div style={{ position: 'absolute', left: ts.x, top: ts.y, transform: `translate(-50%,-50%) scale(${z.toFixed(4)})` }}>
        {ring > 0 && ring < 1 && (
          <div style={{
            position: 'absolute', left: 32 - 110 * ring - 32, top: 32 - 110 * ring - 32, width: 64 + 220 * ring, height: 64 + 220 * ring,
            borderRadius: '50%', border: `3px solid ${alpha(ACC, 0.7 * (1 - ring))}`,
          }} />
        )}
        <div style={{
          width: 64, height: 64, borderRadius: 32, background: locked ? ACC : INK, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 5px #fffaf2, ${softShadow(12, { color: L.shadow, strength: 1.5 })}${locked ? `, 0 0 0 ${(5 + 14 * focus).toFixed(1)}px ${alpha(ACC, 0.18 * focus)}` : ''}`,
        }}>
          <Scooter size={36} color="#fffaf2" />
        </div>
      </div>

      {/* 取景框：四个 L 角（奶白衬底 + 赤陶芯，圆头），飞入段按速度斜向模糊 */}
      {showReticle && (
        <SpeedBlur vx={fo1.x - fo0.x} vy={fo1.y - fo0.y} amount={0.16} max={12}>
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${fo.x.toFixed(2)}px, ${fo.y.toFixed(2)}px)`, opacity: retOp }}>
            <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
              {corners.map(([dx, dy], i) => {
                const x = ts.x + dx * hw, y = ts.y + dy * hw, arm = 44;
                const d = `M${x} ${y - dy * arm} L${x} ${y} L${x - dx * arm} ${y}`;
                return (
                  <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d={d} stroke="#fffaf2" strokeWidth={12} />
                    <path d={d} stroke={ACC} strokeWidth={6} />
                  </g>
                );
              })}
              {cross > 0.01 && (
                <g stroke={ACC} strokeWidth={4} strokeLinecap="round" opacity={cross}>
                  <line x1={ts.x - 22} x2={ts.x - 8} y1={ts.y} y2={ts.y} /><line x1={ts.x + 8} x2={ts.x + 22} y1={ts.y} y2={ts.y} />
                  <line y1={ts.y - 22} y2={ts.y - 8} x1={ts.x} x2={ts.x} /><line y1={ts.y + 8} y2={ts.y + 22} x1={ts.x} x2={ts.x} />
                </g>
              )}
            </svg>
          </div>
        </SpeedBlur>
      )}

      {/* 引线：右上角标 → 标签卡 */}
      {card > 0.01 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
          <path d={`M${ts.x + hw + 6} ${ts.y - hw - 6} L${mix(ts.x + hw + 6, cx, Math.min(1, card))} ${mix(ts.y - hw - 6, cy + 180, Math.min(1, card))}`}
            stroke={ACC} strokeWidth={3} strokeLinecap="round" />
        </svg>
      )}
      {/* 标签卡 */}
      {card > 0.01 && (
        <div style={{
          position: 'absolute', left: cx, top: cy, width: 430, transform: `scale(${card.toFixed(4)})`, transformOrigin: '0% 100%',
          background: '#fffaf3', borderRadius: 26, padding: '26px 30px', boxSizing: 'border-box',
          boxShadow: `0 0 0 1px ${L.line}, inset 0 1px 0 #ffffff, ${softShadow(30, { color: L.shadow, strength: 1.4 })}`,
        }}>
          <div style={{ opacity: cardText, transform: `translateY(${((1 - cardText) * 12).toFixed(2)}px)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 30, background: 'linear-gradient(160deg,#d9875f,#b9502a)', color: '#fff8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 750,
              }}>MK</div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>Mira Kovač</div>
                <div style={{ fontSize: 22, fontWeight: 550, color: L.ink2, marginTop: 2, fontFamily: FONT.mono }}>JNP-0718 · e-scooter</div>
              </div>
            </div>
            <div style={{ height: 1, background: L.line, margin: '22px 0 18px' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 64, fontWeight: 800, color: INK, letterSpacing: '-0.045em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>3</span>
                <span style={{ fontSize: 30, fontWeight: 650, color: INK }}>min away</span>
              </div>
              <span style={{
                fontSize: 20, fontWeight: 750, letterSpacing: '0.14em', color: ACC, background: alpha(ACC, 0.12), padding: '8px 12px', borderRadius: 10,
              }}>LOCKED</span>
            </div>
          </div>
        </div>
      )}

      {/* 左上：产品抬头 */}
      <div style={{
        position: 'absolute', left: 96, top: 84, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 26px 18px 20px', borderRadius: 22,
        background: alpha('#fffaf3', 0.92), boxShadow: `0 0 0 1px ${L.line}, ${softShadow(14, { color: L.shadow, strength: 1.1 })}`,
      }}>
        <svg width={36} height={36} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={INK} /><path d="M12 5c3 3 3 11 0 14M12 5c-3 3-3 11 0 14" stroke="#fffaf2" strokeWidth={1.8} fill="none" /></svg>
        <span style={{ fontSize: 34, fontWeight: 750, color: INK, letterSpacing: '-0.025em' }}>Juniper</span>
        <span style={{ fontSize: 26, color: L.ink3 }}>·</span>
        <span style={{ fontSize: 26, fontWeight: 550, color: L.ink2 }}>9 couriers live</span>
      </div>
    </div>
  );
};
