// magician-card-flourish —— 魔术师甩牌：蓝色星芒闪现，卡片从光里被"变"出来，
// 极速自旋弧线飞向镜头，到位瞬间硬定格，定格后一次 sheen 扫光。
//
// 第二轮重设计（午夜蓝 · 发布会邀请函）：
// - look = midnight。卡片不再是白底小字海报，而是一张深海军蓝的 video-shotcraft「Launch Film」首映票：
//   中心徽记 = video-shotcraft 标志，托在开场星芒"留在卡上"的同心细环 + 交叉针线上，大字 Launch / Film +
//   场次编号；卡面有一层随自旋角变色的全息箔（飞行中流光、定格即冻结）。卡背是纹章 + 标志。
// - 构图：卡片落在画面左 1/3（cx=700，卡高 ≈ 86% 画高），右侧留给一组 video-shotcraft 宣传文案——
//   定格后才逐行揭示，hold 段有内容在走、画面像一张完整的邀请海报。
// - 星芒（用户逐轮定值，保留）：X 形对角针状光束 + 中心小亮点/辉光/放射短刺，9f 内转 90°。
//   闪光点 = 卡片落点：观众先看到光在哪，卡就从哪"变"出来，绕一圈弧线再回到这里定格。
// - 弹射：slow-in（前 14% 时间只走 6%）→ 斜率跳变踢出 → cubic ease-out 弧线减速；
//   沿卡片对角线轴自旋 13 整圈，后 60% 角速度 2.4 次幂衰减；整圈数保证定格恰为正面。
// - 定格 = 全量冻结零回弹（魔术感）。落定瞬间：一圈蓝色光脉冲从卡边向外扩散（"啪"的一下）、
//   卡后背光亮起、舞台主光从暗到亮；8f 后 sheen 斜带扫过一次（裁进圆角，Q4）。
//
// 时间表（30fps，共 156f）：
//   0–9     星芒闪现（9f，渐亮 2.5f → 微闪 → 坍缩，转 90°）；舞台压暗只留一点冷光
//   9–57    飞行 48f：slow-in 7f → 弹射 → 弧线减速；CameraMotionBlur 只包飞行段
//   57      硬定格；光脉冲 57–79、背光与舞台光 53–85 亮起
//   65–91   sheen 扫光一次（26f）
//   62–100  右侧文案：眉题字距收拢 63 → 标题两行升起 67/74 → 副文逐词 86
//   104–156 hold：背光极缓呼吸、浮尘漂移，最后 ~1.7s 是一张完整邀请海报
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

const L = LOOKS.midnight;

const CARD_W = 380;
const CARD_H = 540;
// 对角线轴（卡片自身对角线方向，归一化）
const AX = CARD_W / Math.hypot(CARD_W, CARD_H);
const AY = CARD_H / Math.hypot(CARD_W, CARD_H);

// —— 时间轴（30fps / 156 帧）——
export const MAGICIAN_CARD_FLOURISH_DURATION = 156;
const TAKEOFF = 9; // 开场光效 0.3s（9f）后卡片才起飞
const FLASH_END = 12; // 闪光尾焰完全消失（坍缩略拖 3 帧）
const FLIGHT = 48; // 飞行帧数
const LAND = TAKEOFF + FLIGHT; // f=57 硬定格
const SHEEN_START = LAND + 8; // 定格稳住 8 帧后开始扫光
const SHEEN_DUR = 26; // 扫光时长（一次性）
const TURNS = 13; // 飞行总圈数（整数→定格瞬间恰好正面朝镜头）
const FINAL_SCALE = 1.72; // 终态：卡高 540×1.72≈929 ≈ 86% 画面高
const CX = 700; // 落点（= 闪光点）
const CY = 540;
const TEXT_X = 1130; // 右侧文案左缘

// 卡片正面：380×540 设计坐标；外层按 ×FINAL_SCALE 布局后用 zoom 栅格化（定格帧原生锐利，Q2）
const CardFace: React.FC<{ theta: number }> = ({ theta }) => {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // 全息箔：色相随自旋角滚动（飞行中流光，定格后 theta 冻结 → 静止）
  const holo = (theta * 0.9) % 360;
  return (
    <div style={{
      width: CARD_W, height: CARD_H, borderRadius: 24, boxSizing: 'border-box', padding: '22px 24px 24px',
      position: 'relative', overflow: 'hidden', fontFamily: FONT.sans, color: L.ink,
      background: 'linear-gradient(165deg, #16244a 0%, #0d1631 46%, #080d20 100%)',
      boxShadow: 'inset 0 0 0 1px rgba(170,200,255,0.16), inset 0 1px 0 rgba(255,255,255,0.22)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 全息箔：只在徽记区上方一抹，screen 叠加 */}
      <div style={{
        position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.28,
        background: `conic-gradient(from ${holo}deg at 50% 40%, rgba(91,140,255,0.0), rgba(62,230,208,0.5), rgba(91,140,255,0.0), rgba(167,139,250,0.45), rgba(91,140,255,0.0))`,
        WebkitMaskImage: 'radial-gradient(ellipse 70% 46% at 50% 40%, #000 0%, transparent 75%)',
      }} />
      {/* 品牌行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <ShotcraftMark size={22} tone="dark" />
        <div style={{ fontFamily: BRAND.font, fontSize: 14, fontWeight: 700, letterSpacing: '0.03em' }}>{BRAND.name}</div>
        <div style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 11, color: L.ink2, letterSpacing: '0.04em' }}>SC 01 · TAKE 01</div>
      </div>
      {/* 徽记：同心细环 + 交叉针线（开场星芒的"化石"）+ video-shotcraft 标志（标志本身不加光，背后的光晕是舞台光） */}
      <div style={{ flex: 1, position: 'relative' }}>
        <svg viewBox="-190 -150 380 300" width={332} height={262} style={{ position: 'absolute', left: 0, top: 6 }}>
          <defs>
            <radialGradient id={`halo${gid}`}>
              <stop offset="0" stopColor="#5b8cff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#5b8cff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`ray${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#bcd4ff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#5b8cff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle r={130} fill={`url(#halo${gid})`} />
          {/* 环与针线都从标志外缘（≈56 单位）往外起：标志是开口取景框，线不许从开口里穿过去 */}
          {[68, 94, 120].map((r, i) => (
            <circle key={r} r={r} fill="none" stroke={`rgba(170,200,255,${0.18 - i * 0.04})`} strokeWidth={0.8} />
          ))}
          {[-38, 52, 142, 232].map((d, i) => (
            <path key={d} transform={`rotate(${d})`} d={`M 62 -0.9 L ${i % 2 ? 110 : 180} 0 L 62 0.9 Z`} fill={`url(#ray${gid})`} />
          ))}
        </svg>
        {/* 标志压在 svg 中心（svg 332×262 @ top 6，viewBox 原点在中心 → 屏幕中心 (166, 137)） */}
        <ShotcraftMark size={112} tone="dark" style={{ position: 'absolute', left: 166 - 56, top: 6 + 131 - 56 }} />
      </div>
      {/* 标题 */}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', color: L.accent, marginBottom: 8 }}>PREMIERE · REEL 01</div>
        <div style={{ fontSize: 58, fontWeight: 760, letterSpacing: '-0.045em', lineHeight: 0.92 }}>Launch</div>
        <div style={{ fontSize: 58, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 0.98, color: '#c9d6f5' }}>Film</div>
      </div>
      {/* 底部票根行 */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', marginTop: 18, paddingTop: 12,
        borderTop: '1px dashed rgba(170,200,255,0.22)', fontFamily: FONT.mono, fontSize: 11, color: L.ink2, letterSpacing: '0.06em',
      }}>
        <span>ADMIT ONE</span>
        <span style={{ marginLeft: 'auto' }}>1920×1080 · 30 FPS</span>
      </div>
    </div>
  );
};

// 卡背：深海军蓝 + 细纹章 + 中心 video-shotcraft 标志
const CardBack: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden',
    background: 'linear-gradient(160deg, #1b2a55 0%, #101a3a 55%, #0a1028 100%)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.18)',
  }}>
    <div style={{
      position: 'absolute', inset: 0,
      background:
        'repeating-linear-gradient(45deg, rgba(150,180,255,0.07) 0 1px, transparent 1px 12px), ' +
        'repeating-linear-gradient(-45deg, rgba(150,180,255,0.07) 0 1px, transparent 1px 12px)',
    }} />
    <div style={{
      position: 'absolute', inset: 22, borderRadius: 14, boxShadow: 'inset 0 0 0 1px rgba(200,215,255,0.24)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <ShotcraftMark size={120} tone="dark" />
    </div>
  </div>
);

// —— 开场星芒（用户参考图 IMG_2505 逐轮收敛的形态，保留）——
// X 形对角针状光束（长轴 840 / 短轴 420）+ 中心小亮点 + 蓝辉光 + 放射短刺；9f 内转 90°。
const SpawnFlash: React.FC<{ f: number }> = ({ f }) => {
  const SPIKE_ID = `mcf-needle-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (f > FLASH_END) return null;
  const grow = interpolate(f, [0, 2.5], [0.2, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const shrink = interpolate(f, [6, TAKEOFF, FLASH_END], [1, 0.3, 0.05], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const s = grow * shrink;
  const flicker = 0.94 + 0.06 * (0.5 + 0.5 * Math.sin(f * 1.9) * Math.sin(f * 0.83 + 1.7));
  const opacity = interpolate(f, [0, 1.5, 6, FLASH_END], [0.35, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * flicker;
  const rot = interpolate(f, [0, FLASH_END], [0, 90], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const needle = (deg: number, len: number, w0: number) => (
    <g key={`${deg}-${len}-${w0}`} transform={`rotate(${deg})`}>
      <path d={`M 0 ${-w0 / 2} L ${len} 0 L 0 ${w0 / 2} Z`} fill={`url(#${SPIKE_ID})`} />
      <path d={`M 0 ${-w0 / 2} L ${len} 0 L 0 ${w0 / 2} Z`} fill={`url(#${SPIKE_ID})`} transform="scale(-1,1)" />
    </g>
  );
  return (
    <div style={{ position: 'absolute', left: CX, top: CY, width: 0, height: 0, transform: `scale(${s})`, opacity, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: -13, top: -13, width: 26, height: 26, borderRadius: 13,
        background: 'radial-gradient(circle, #ffffff 0%, rgba(225,245,255,0.95) 45%, rgba(140,215,255,0) 80%)', filter: 'blur(0.6px)',
      }} />
      <div style={{
        position: 'absolute', left: -70, top: -70, width: 140, height: 140, borderRadius: 70,
        background: 'radial-gradient(circle, rgba(90,175,255,0.75) 0%, rgba(50,130,245,0.35) 45%, rgba(40,110,235,0) 75%)', filter: 'blur(4px)',
      }} />
      <svg width={260} height={260} viewBox="-130 -130 260 260" style={{ position: 'absolute', left: -130, top: -130, transform: `rotate(${-rot * 0.6}deg)` }}>
        {[15, 52, 88, 123, 160, 197, 231, 268, 305, 341].map((deg, i) => {
          const ln = 46 + ((i * 37) % 3) * 16;
          return (
            <g key={deg} transform={`rotate(${deg})`} opacity={0.75}>
              <path d={`M 8 -1.1 L ${ln} 0 L 8 1.1 Z`} fill="rgba(150,210,255,0.85)" filter="blur(0.8px)" />
            </g>
          );
        })}
      </svg>
      <svg width={3200} height={3200} viewBox="-1600 -1600 3200 3200" style={{ position: 'absolute', left: -1600, top: -1600, transform: `rotate(${rot}deg)` }}>
        <defs>
          <linearGradient id={SPIKE_ID} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#eaf6ff" stopOpacity="1" />
            <stop offset="0.05" stopColor="#8cc8ff" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#3f9bff" stopOpacity="0.88" />
            <stop offset="0.62" stopColor="#2277f2" stopOpacity="0.6" />
            <stop offset="0.88" stopColor="#1b64e0" stopOpacity="0.25" />
            <stop offset="1" stopColor="#1a5fd8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g filter="blur(7px)" opacity={0.75}>{needle(-38, 826, 26)}</g>
        <g filter="blur(1.8px)">{needle(-38, 840, 8)}</g>
        {needle(-38, 819, 3)}
        <g filter="blur(5px)" opacity={0.75}>{needle(52, 413, 20)}</g>
        <g filter="blur(1.5px)">{needle(52, 420, 6.5)}</g>
        {needle(52, 410, 2.6)}
      </svg>
    </div>
  );
};

// 飞行状态（帧的纯函数；定格后 tEff=1 全量冻结）
const flight = (f: number) => {
  const tEff = Math.min(1, Math.max(0, (f - TAKEOFF) / FLIGHT));
  // 自旋：前 40% 近匀速极快，之后 2.4 次幂衰减；spinP(1)=1 → 整圈 → 定格正面
  const spinP = tEff < 0.4 ? tEff * 1.55 : 0.62 + 0.38 * (1 - Math.pow(1 - (tEff - 0.4) / 0.6, 2.4));
  const theta = TURNS * 360 * Math.min(1, spinP);
  // 行程：slow-in（前 14% 时间 6% 行程）→ 弹射 → cubic ease-out 减速
  const tp = tEff < 0.14 ? 0.06 * (tEff / 0.14) ** 2 : 0.06 + 0.94 * (1 - Math.pow(1 - (tEff - 0.14) / 0.86, 3));
  // 弧线：从落点出发向右上荡出（经过日后文案的位置），再收回落点
  const arc = Math.sin(tp * Math.PI);
  const cx = CX + arc * 470;
  const cy = CY - arc * 230;
  // 纵深：真透视 scale=F/(F+z)，z 从极远推近到 0
  const FOCAL = 900;
  const z = 14000 * (1 - tp);
  const scale = FINAL_SCALE * (FOCAL / (FOCAL + z));
  return { tEff, theta, cx, cy, scale };
};

const Card: React.FC = () => {
  const f = useCurrentFrame();
  const { theta, cx, cy, scale } = flight(f);
  const facingBack = Math.cos((theta * Math.PI) / 180) < 0;
  const sheenP = ramp(f, SHEEN_START, SHEEN_DUR, EASE.smooth);
  const sheenOn = f >= SHEEN_START && f <= SHEEN_START + SHEEN_DUR;
  const W = CARD_W * FINAL_SCALE;
  const H = CARD_H * FINAL_SCALE;
  const R = 24 * FINAL_SCALE;
  const landed = f >= LAND;
  const sin = Math.sin((theta * Math.PI) / 180);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: cx - W / 2, top: cy - H / 2, width: W, height: H,
        transform: `scale(${scale / FINAL_SCALE})`, transformOrigin: '50% 50%', opacity: f >= TAKEOFF ? 1 : 0,
      }}>
        <div style={{
          width: '100%', height: '100%', position: 'relative', borderRadius: R,
          transform: `perspective(${1300 * FINAL_SCALE}px) rotate3d(${AX}, ${AY}, 0, ${theta}deg)`, transformOrigin: '50% 50%',
          // 定格后：深色带色相的两层投影 + 一圈极淡的蓝色轮廓光
          boxShadow: landed
            ? `0 40px 90px -20px rgba(0,2,10,0.9), 0 12px 30px rgba(0,2,10,0.6), 0 0 0 1px rgba(140,175,255,0.18), 0 0 80px ${alpha(L.accent, 0.22)}`
            : `0 0 70px ${alpha(L.accent, 0.55)}, 0 0 0 1px rgba(160,195,255,0.35)`, // 飞行中：卡还带着变出来时的光（被运动模糊拖成光尾）
        }}>
          <div style={{ position: 'absolute', inset: 0, zoom: FINAL_SCALE }}>
            <CardFace theta={theta} />
            <div style={{ opacity: facingBack ? 1 : 0, position: 'absolute', inset: 0 }}><CardBack /></div>
          </div>
          {/* 转动中的动态侧光（贴在卡面上）；定格后随 theta 冻结 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: R, pointerEvents: 'none', mixBlendMode: 'screen',
            background: `linear-gradient(${115 + sin * 30}deg, rgba(255,255,255,0) 30%, rgba(200,220,255,${0.08 + 0.16 * Math.abs(sin)}) 50%, rgba(255,255,255,0) 70%)`,
          }} />
          {/* 定格后的一次性 sheen：斜高光带左→右（裁进圆角，Q4） */}
          {sheenOn && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: R, overflow: 'hidden', pointerEvents: 'none' }}>
              <div style={{
                position: 'absolute', top: '-45%', bottom: '-45%', left: `${-70 + sheenP * 215}%`, width: '34%', transform: 'rotate(16deg)',
                background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(210,225,255,0.10) 35%, rgba(235,242,255,0.34) 50%, rgba(210,225,255,0.10) 65%, rgba(255,255,255,0) 100%)',
                mixBlendMode: 'screen',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 落定瞬间的光脉冲：一圈与卡同形的圆角框从卡边向外扩散并淡出（一次）
const LandPulse: React.FC = () => {
  const f = useCurrentFrame();
  if (f < LAND || f > LAND + 24) return null;
  const p = ramp(f, LAND, 22, EASE.out);
  const W = CARD_W * FINAL_SCALE;
  const H = CARD_H * FINAL_SCALE;
  const grow = 1 + p * 0.14;
  return (
    <div style={{
      position: 'absolute', left: CX - W / 2, top: CY - H / 2, width: W, height: H, borderRadius: 24 * FINAL_SCALE,
      transform: `scale(${grow})`, opacity: (1 - p) * 0.9, pointerEvents: 'none',
      boxShadow: `0 0 0 ${(2.5 - p * 1.5).toFixed(2)}px ${alpha('#9cc0ff', 0.9)}, 0 0 40px ${alpha(L.accent, 0.7)}, inset 0 0 40px ${alpha(L.accent, 0.35)}`,
    }} />
  );
};

// 右侧文案：定格后才出现（眉题字距收拢 → 标题两行升起 → 副文逐词）
const Copy: React.FC = () => {
  const f = useCurrentFrame();
  const rule = ramp(f, 62, 22, EASE.snappy);
  return (
    <div style={{ position: 'absolute', left: TEXT_X, top: 300, width: 700, color: L.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 34 }}>
        <div style={{ width: 56 * rule, height: 2, background: L.accent, boxShadow: `0 0 12px ${alpha(L.accent, 0.8)}` }} />
        <TextReveal text="NOW SHOWING" variant="track" start={63} each={20} gap={0.8}
          style={{ ...type(TYPE_LABEL, 700, { caps: true }), letterSpacing: '0.26em', color: L.accent }} />
      </div>
      <div style={{ ...type(132, 780), color: L.ink }}>
        <TextReveal text={'Craft\nthe shot.'} by="line" variant="rise" start={67} each={22} gap={7} />
      </div>
      <div style={{ ...type(36, 420), color: L.ink2, marginTop: 40, maxWidth: 600, lineHeight: 1.38, letterSpacing: '-0.01em' }}>
        <TextReveal text={'Cinematic product videos,\ncrafted by your agent.'} by="word" variant="blur" start={86} each={16} gap={1.6} />
      </div>
    </div>
  );
};
const TYPE_LABEL = 24;

export const MagicianCardFlourish: React.FC = () => {
  const f = useCurrentFrame();
  const moving = f >= TAKEOFF && f <= LAND;
  // 舞台光：闪光时压暗（让星芒成为唯一光源），落定前后亮起，hold 段极缓呼吸
  const lit = ramp(f, LAND - 6, 30, EASE.out);
  const back = lit * (1 + 0.06 * Math.sin((f - LAND) / 16));
  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: CX / 1920, y: 0.1 }} fill={null} intensity={0.25 + 0.75 * lit} vignette={0.6}>
        {/* 卡后背光：落定后亮起的一团蓝光 */}
        <div style={{
          position: 'absolute', left: CX - 620, top: CY - 560, width: 1240, height: 1120, opacity: back,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.light, 0.38)} 0%, ${alpha(L.light, 0.1)} 42%, ${alpha(L.light, 0)} 70%)`,
        }} />
        <Dust look={L} count={26} seed={7} drift={0.22} opacity={0.35 + 0.35 * lit} />
      </Stage>
      {moving ? (
        <CameraMotionBlur shutterAngle={150} samples={7}>
          <Card />
        </CameraMotionBlur>
      ) : (
        <Card />
      )}
      <LandPulse />
      <Copy />
      {/* 闪光层独立于 CameraMotionBlur（细针光束旋转会被采样拆成条纹分身） */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <SpawnFlash f={f} />
      </div>
    </AbsoluteFill>
  );
};
