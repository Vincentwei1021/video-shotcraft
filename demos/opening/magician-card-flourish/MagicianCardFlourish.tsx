// magician-card-flourish v6 —— 批次 15（无截图，用户意见即全部真相）：
// 用户意见（逐字）"这个光需要带点辉光，0.8秒就行；然后十字星应该做成更符合
// 光学实感的，现在太5毛特效了；卡片最开始出来的时候，要做成那种弹射出来的
// 效果，就是刚开始弹射出来速度慢，然后划弧线的过程减速"
// ① 光效段 1.5s→0.8s（24f），辉光加厚（三层柔晕包裹）；
// ② 十字星光学实感重做：等宽矩形条改衍射尖峰（径向渐变楔形——越远越细
//    且亮度指数渐隐），三层叠色（白细芯/蓝中层/宽淡外层近似色散），
//    旋转放慢（24f 转 ~40°，真实星芒旋转是镜头效应，快了就假）；
// ③ 弹射出场：slow-in → burst → decelerating arc（起飞先慢速蓄力挤出，
//    急加速弹射，弧线段整体减速抵达中心硬定格）。
// v5 其余保留：中心极远飞出+13 圈自旋+94% 定格+sheen 扫光。总长 126 帧。
// v10 质感（闪光/弹射/自旋/定格参数全部不动，均为用户逐轮定值）：
// ① 卡面从灰阶骨架换成出版级海报卡（品牌行 + 蓝色星光主视觉 + 标题/副题 + 作者行与 CTA），
//    主视觉呼应开场蓝色星芒——"变出来的就是这张卡"；卡背换成深海军蓝 + 细纹章 + 中心徽记；
// ② 清晰度（Q2）：卡片按定格尺寸（×1.88）布局、CSS zoom 栅格化，飞行中只做 ≤1 的缩小，
//    定格帧文字锐利（原版按 380 宽栅格化再放大 1.88 倍，定格即糊）；
// ③ 暗场从纯 #000 换成带冷色相的近黑 + 暗角 + 颗粒；定格后卡后亮起一团极淡的蓝色环境光；
// ④ 2px 灰边 → 发丝线 + 顶部内高光。
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { G } from '../../_fixtures/Fixtures';
import { FONT, Grain, Vignette, ramp, EASE } from '../../_fixtures/Polish';

const CARD_W = 380;
const CARD_H = 540;
// 对角线轴（卡片自身对角线方向，归一化）
const AX = CARD_W / Math.hypot(CARD_W, CARD_H);
const AY = CARD_H / Math.hypot(CARD_W, CARD_H);

// —— 时间轴（30fps / 126 帧）——
export const MAGICIAN_CARD_FLOURISH_DURATION = 126; // 闪光 9f + 飞行 50f + 定格展示/扫光 67f
// v9.6（批次 18）：光效 0.5s→0.3s（9f）
const TAKEOFF = 9;               // 开场光效 0.3s（9f）后卡片才起飞
const FLASH_END = 12;            // 闪光尾焰完全消失（坍缩略拖 3 帧）
const FLIGHT = 50;               // 飞行帧数
const LAND = TAKEOFF + FLIGHT;   // f=53 硬定格
const SHEEN_START = LAND + 8;    // 定格稳住 8 帧后开始扫光
const SHEEN_DUR = 26;            // 扫光时长（一次性）
const TURNS = 13;                // 飞行总圈数（整数→定格瞬间恰好正面朝镜头）
const FINAL_SCALE = 1.88;        // 终态：卡高 540×1.88≈1015 ≈ 94% 画面高（1080）

// 卡片正面：出版级海报卡（380×540 设计坐标；外层按 ×FINAL_SCALE 布局后用 zoom 栅格化）
const CardFace: React.FC = () => (
  <div style={{
    width: CARD_W, height: CARD_H, borderRadius: 22, boxSizing: 'border-box', padding: 22,
    background: 'linear-gradient(180deg, #ffffff 0%, #f6f6f4 100%)',
    border: `1px solid ${G.hairline}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
    display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden', fontFamily: FONT.sans, color: G.ink1,
  }}>
    {/* 品牌行 */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #2d6cf0 0%, #1a3fae 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
      }}>
        <svg viewBox="0 0 24 24" width={26} height={26} style={{ position: 'absolute', inset: 0 }}>
          <path d="M12 4.5 L13.4 10.6 L19.5 12 L13.4 13.4 L12 19.5 L10.6 13.4 L4.5 12 L10.6 10.6 Z" fill="#ffffff" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em' }}>Aurora</div>
      <div style={{
        marginLeft: 'auto', fontSize: 10.5, fontWeight: 650, letterSpacing: '0.1em', color: '#2457d6',
        padding: '4px 8px', borderRadius: 6, background: 'rgba(45,108,240,0.1)',
      }}>NEW</div>
    </div>
    {/* 主视觉：深蓝夜空里的一颗星芒（呼应开场闪光） */}
    <div style={{
      flex: 1, borderRadius: 14, position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse 80% 60% at 50% 46%, #1f4fb8 0%, #102a6b 42%, #0a1638 100%)',
      boxShadow: 'inset 0 0 0 1px rgba(10,20,50,0.25)',
    }}>
      {/* 同心细环 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-radial-gradient(circle at 50% 46%, rgba(255,255,255,0) 0 23px, rgba(160,200,255,0.08) 23px 24px)',
      }} />
      {/* 星芒：辉光 + 四向细芒 */}
      <div style={{
        position: 'absolute', left: '50%', top: '46%', width: 170, height: 170, margin: '-85px 0 0 -85px',
        background: 'radial-gradient(circle, rgba(170,215,255,0.9) 0%, rgba(80,150,255,0.35) 22%, rgba(60,120,255,0) 62%)',
      }} />
      <svg viewBox="-100 -100 200 200" width={200} height={200} style={{ position: 'absolute', left: '50%', top: '46%', margin: '-100px 0 0 -100px' }}>
        <defs>
          <linearGradient id="mcf-face-ray" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="1" stopColor="#7fb6ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[-38, 52, 142, 232].map((d, i) => (
          <path key={d} transform={`rotate(${d})`} d={`M 0 -1.6 L ${i % 2 ? 58 : 92} 0 L 0 1.6 Z`} fill="url(#mcf-face-ray)" />
        ))}
        <circle r={5} fill="#ffffff" />
      </svg>
      <div style={{
        position: 'absolute', left: 16, bottom: 14, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
        color: 'rgba(220,232,255,0.8)',
      }}>SEASON 04</div>
      <div style={{
        position: 'absolute', right: 16, bottom: 14, fontSize: 11, fontWeight: 500, color: 'rgba(220,232,255,0.6)',
        fontVariantNumeric: 'tabular-nums',
      }}>No. 0417</div>
    </div>
    {/* 标题 + 副题 */}
    <div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08 }}>Meet the new Aurora</div>
      <div style={{ marginTop: 7, fontSize: 17, color: G.ink2, letterSpacing: '-0.008em', lineHeight: 1.3 }}>
        A sharper way to plan, ship and share.
      </div>
    </div>
    {/* 作者行 + CTA */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: `1px solid ${G.hairline}` }}>
      <div style={{
        width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #3a3c44, #23242a)', color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: 600,
      }}>SL</div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Studio Lumen</div>
        <div style={{ fontSize: 12, color: G.ink3, marginTop: 1 }}>Oct 2026</div>
      </div>
      <div style={{
        marginLeft: 'auto', height: 32, padding: '0 16px', borderRadius: 16, display: 'flex', alignItems: 'center',
        background: G.ink1, color: '#ffffff', fontSize: 13.5, fontWeight: 600,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 6px rgba(16,18,24,0.18)',
      }}>Open</div>
    </div>
  </div>
);

// 卡背：深海军蓝 + 细纹章 + 中心徽记
const CardBack: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden',
    background: 'linear-gradient(160deg, #1f2c52 0%, #121a36 55%, #0c1126 100%)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.16)',
  }}>
    <div style={{
      position: 'absolute', inset: 0,
      background:
        'repeating-linear-gradient(45deg, rgba(150,180,255,0.06) 0 1px, transparent 1px 12px), ' +
        'repeating-linear-gradient(-45deg, rgba(150,180,255,0.06) 0 1px, transparent 1px 12px)',
    }} />
    <div style={{
      position: 'absolute', inset: 22, borderRadius: 14, boxShadow: 'inset 0 0 0 1px rgba(200,215,255,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 84, height: 84, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #2d6cf0 0%, #1a3fae 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 0 6px rgba(45,108,240,0.12)',
      }}>
        <svg viewBox="0 0 24 24" width={56} height={56}>
          <path d="M12 4.5 L13.4 10.6 L19.5 12 L13.4 13.4 L12 19.5 L10.6 13.4 L4.5 12 L10.6 10.6 Z" fill="#ffffff" />
        </svg>
      </div>
    </div>
  </div>
);

// —— 开场闪光（v8，批次 17）：以用户参考图 IMG_2505 为基准 ——
// 参考图特征（真实镜头 lens flare 星芒，密看归纳）：
// ① X 形对角星芒（4 条 45° 斜向针状光束），不是 +  形正交；
// ② 光束极细（针状），其中一条对角轴显著更长、近乎横贯画面；
// ③ 核心小而极亮（过曝白点），辉光晕很克制（小半径即衰减入黑）；
// ④ 青蓝色（参考图上星青色/下星蓝色，取青蓝中间调）；
// ⑤ 背景纯黑，光束边缘干净锐利（真实衍射，无宽糊外层）。
// 时长 0.5s：渐亮（f0–4）→ 全芒微闪（f4–10）→ 坍缩（f10–15）。
const SpawnFlash: React.FC<{ f: number }> = ({ f }) => {
  // 渐变 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  // hooks 必须在条件 return 之前调用
  const SPIKE_ID = `mcf-needle-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (f > FLASH_END) return null;
  const grow = interpolate(f, [0, 2.5], [0.2, 1], {
    extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });
  const shrink = interpolate(f, [6, TAKEOFF, FLASH_END], [1, 0.3, 0.05], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
  });
  const s = grow * shrink;
  // 亮度微闪（真实光源级细微抖动）
  const flicker = 0.94 + 0.06 * (0.5 + 0.5 * Math.sin(f * 1.9) * Math.sin(f * 0.83 + 1.7));
  const opacity = interpolate(f, [0, 2, 6, FLASH_END], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  }) * flicker;
  // v9：用户意见"开场光点的光芒要旋转90度"——闪光期间星芒动态旋转 90°
  const rot = interpolate(f, [0, FLASH_END], [0, 90], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  // 针状光束：极细楔形（根部窄、尖端归零）+ 亮度指数渐隐——对照参考图
  // v9（批次 18）：用户意见"开场光点的光芒要旋转90度"——整体转 90°：长轴 -38°→52°（陡斜近竖贯），短轴 52°→142°
  const needle = (deg: number, len: number, w0: number, op: number) => (
    <g key={`${deg}-${len}`} transform={`rotate(${deg})`} opacity={op}>
      <path d={`M 0 ${-w0 / 2} L ${len} 0 L 0 ${w0 / 2} Z`} fill={`url(#${SPIKE_ID})`} />
      <path d={`M 0 ${-w0 / 2} L ${len} 0 L 0 ${w0 / 2} Z`} fill={`url(#${SPIKE_ID})`} transform="scale(-1,1)" />
    </g>
  );
  return (
    <div style={{
      position: 'absolute', left: 960, top: 540, width: 0, height: 0,
      transform: `scale(${s})`, opacity, pointerEvents: 'none',
    }}>
      {/* v9.6 中心重做（对照用户参考图②）：不是白色圆球——
          极小过曝亮点 + 蓝色辉光 + 一圈放射状小光芒（短刺） */}
      <div style={{
        position: 'absolute', left: -13, top: -13, width: 26, height: 26, borderRadius: 13,
        background: 'radial-gradient(circle, #ffffff 0%, rgba(225,245,255,0.95) 45%, rgba(140,215,255,0) 80%)',
        filter: 'blur(0.6px)',
      }} />
      <div style={{
        position: 'absolute', left: -70, top: -70, width: 140, height: 140, borderRadius: 70,
        background: 'radial-gradient(circle, rgba(90,175,255,0.75) 0%, rgba(50,130,245,0.35) 45%, rgba(40,110,235,0) 75%)',
        filter: 'blur(4px)',
      }} />
      {/* 放射状小光芒：核心周围一圈短刺（参考图中心的 starburst 细节） */}
      <svg width={260} height={260} viewBox="-130 -130 260 260" style={{
        position: 'absolute', left: -130, top: -130, transform: `rotate(${-rot * 0.6}deg)`,
      }}>
        {[15, 52, 88, 123, 160, 197, 231, 268, 305, 341].map((deg, i) => {
          const ln = 46 + ((i * 37) % 3) * 16;
          return (
            <g key={deg} transform={`rotate(${deg})`} opacity={0.75}>
              <path d={`M 8 -1.1 L ${ln} 0 L 8 1.1 Z`} fill="rgba(150,210,255,0.85)" filter="blur(0.8px)" />
            </g>
          );
        })}
      </svg>
      {/* X 形对角针状星芒——对照 IMG_2505 复刻要点：光束通体明亮饱和
          （青蓝贯穿全长、只在最末端才灭），束身带同色辉光包裹 */}
      <svg width={3200} height={3200} viewBox="-1600 -1600 3200 3200" style={{
        position: 'absolute', left: -1600, top: -1600, transform: `rotate(${rot}deg)`,
      }}>
        <defs>
          {/* v9.6：更纯蓝（参考图光束是饱和蓝，白段只在根部一瞬） */}
          <linearGradient id={SPIKE_ID} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#eaf6ff" stopOpacity="1" />
            <stop offset="0.05" stopColor="#8cc8ff" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#3f9bff" stopOpacity="0.88" />
            <stop offset="0.62" stopColor="#2277f2" stopOpacity="0.6" />
            <stop offset="0.88" stopColor="#1b64e0" stopOpacity="0.25" />
            <stop offset="1" stopColor="#1a5fd8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 长对角轴：辉光包层（宽糊、同色发光）+ 明亮主束 + 过曝细芯 */}
        <g filter="blur(7px)" opacity={0.75}>
          {needle(-38, 826, 26, 1)}
        </g>
        <g filter="blur(1.8px)">
          {needle(-38, 840, 8, 1)}
        </g>
        {needle(-38, 819, 3, 1)}
        {/* 短对角轴：同三层 */}
        <g filter="blur(5px)" opacity={0.75}>
          {needle(52, 413, 20, 1)}
        </g>
        <g filter="blur(1.5px)">
          {needle(52, 420, 6.5, 1)}
        </g>
        {needle(52, 410, 2.6, 1)}
      </svg>
    </div>
  );
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  // 硬定格：闪光后 f=TAKEOFF 起飞，到达（f=LAND）后时间冻结——所有量按 tEff 计算
  const tEff = Math.min(1, Math.max(0, (f - TAKEOFF) / FLIGHT));
  const airborne = f >= TAKEOFF;

  // —— 自旋（v7）：用户意见"靠近镜头时，卡片自旋速度开始随距离靠近而衰减"
  // 前 40% 行程近匀速极快，之后角速度随 tEff 持续衰减（easeOut 2.4 次幂），
  // spinP(1)=1 保证整圈数——定格瞬间仍恰好正面朝镜头
  const spinP = tEff < 0.4
    ? tEff * 1.55
    : 0.62 + 0.38 * (1 - Math.pow(1 - (tEff - 0.4) / 0.6, 2.4));
  const theta = TURNS * 360 * Math.min(1, spinP);

  // —— 轨迹：画面中心的 3D 纵深远处（极小）→ 弧线飞向镜头 → 近满幅定格于中心 ——
  // v6 弹射曲线（用户意见"刚开始弹射出来速度慢，然后划弧线的过程减速"）：
  // slow-in（前 14% 慢速蓄力挤出 6% 行程）→ 斜率跳变=弹射踢出 →
  // 弧线段 easeOut(cubic) 全程减速抵达中心
  const tp = tEff < 0.14
    ? 0.06 * (tEff / 0.14) * (tEff / 0.14)
    : 0.06 + 0.94 * (1 - Math.pow(1 - (tEff - 0.14) / 0.86, 3));
  const arc = Math.sin(tp * Math.PI);
  const cx = 960 + arc * 360;
  const cy = 540 - arc * 250;
  // 纵深：真透视 scale=F/(F+z)×FINAL_SCALE，z 从极远推近到 0——
  // 终态卡高≈94% 画面高（基本贴近上下界）
  const FOCAL = 900;
  const z = interpolate(tp, [0, 1], [14000, 0]);
  const scale = FINAL_SCALE * (FOCAL / (FOCAL + z)); // 0.11 → 1.88，无过冲

  // 背面判定
  const facingBack = Math.cos((theta * Math.PI) / 180) < 0;

  // —— 定格后 sheen 扫光：一道高光斜带从卡面左侧扫到右侧（一次性）——
  const sheenP = interpolate(f, [SHEEN_START, SHEEN_START + SHEEN_DUR], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const sheenVisible = f >= SHEEN_START && f <= SHEEN_START + SHEEN_DUR;
  // 扫光经过时整卡亮度微抬升（正弦单拱），保证"整体光泽"肉眼可感
  const sheenLift = sheenVisible ? 0.07 * Math.sin(sheenP * Math.PI) : 0;

  // 按定格尺寸布局（W×H = 设计尺寸 × FINAL_SCALE），飞行中只做 ≤1 的缩小 → 定格帧按原生分辨率栅格化
  const W = CARD_W * FINAL_SCALE;
  const H = CARD_H * FINAL_SCALE;
  const R = 22 * FINAL_SCALE;
  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      {/* —— 卡片：闪光过后从中心飞出，暗场空间中飞行 —— */}
      <div style={{
        position: 'absolute', left: cx - W / 2, top: cy - H / 2,
        width: W, height: H,
        transform: `scale(${scale / FINAL_SCALE})`,
        transformOrigin: '50% 50%',
        opacity: airborne ? 1 : 0,
      }}>
        <div style={{
          width: '100%', height: '100%',
          // 透视距离随布局尺寸同比放大，保持与原版一致的透视感
          transform: `perspective(${1300 * FINAL_SCALE}px) rotate3d(${AX}, ${AY}, 0, ${theta}deg)`,
          transformOrigin: '50% 50%',
          position: 'relative',
          borderRadius: R,
          filter: sheenLift > 0 ? `brightness(${1 + sheenLift})` : undefined,
        }}>
          <div style={{ position: 'absolute', inset: 0, zoom: FINAL_SCALE }}>
            <CardFace />
            <div style={{ opacity: facingBack ? 1 : 0, position: 'absolute', inset: 0 }}>
              <CardBack />
            </div>
          </div>
          {/* 转动中的动态侧光（贴在卡面上，非环境光）；定格后随 theta 冻结 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: R, pointerEvents: 'none',
            background: `linear-gradient(${115 + Math.sin((theta * Math.PI) / 180) * 30}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,${0.14 + 0.14 * Math.abs(Math.sin((theta * Math.PI) / 180))}) 50%, rgba(255,255,255,0) 70%)`,
            mixBlendMode: 'screen',
          }} />
          {/* 定格后的一次性 sheen 扫光：斜高光带左→右扫过整卡（裁进圆角，Q4） */}
          {sheenVisible && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: R, overflow: 'hidden',
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', top: '-45%', bottom: '-45%',
                left: `${-70 + sheenP * 215}%`, width: '42%',
                background: 'linear-gradient(100deg, rgba(200,200,205,0) 0%, rgba(225,225,230,0.4) 34%, rgba(255,255,255,0.75) 50%, rgba(225,225,230,0.4) 66%, rgba(200,200,205,0) 100%)',
                transform: 'rotate(16deg)',
                // soft-light：深色主视觉上明显提亮，白卡上的深色文字基本不被洗白
                mixBlendMode: 'soft-light',
              }} />
              {/* 叠一层 screen 提亮，让深色主视觉上的高光带更亮 */}
              <div style={{
                position: 'absolute', top: '-45%', bottom: '-45%',
                left: `${-70 + sheenP * 215}%`, width: '26%',
                background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.14) 55%, rgba(255,255,255,0) 100%)',
                transform: 'rotate(16deg)',
                mixBlendMode: 'screen',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 暗场底：带冷色相的近黑（替代纯 #000）；定格后卡后亮起一团极淡的蓝色环境光（像卡还带着变出来时的光）
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const ambient = ramp(f, LAND - 4, 22, EASE.out);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 48%, #0b0d16 0%, #06070c 60%, #030406 100%)' }}>
      <AbsoluteFill style={{
        opacity: ambient,
        background: 'radial-gradient(ellipse 42% 58% at 50% 50%, rgba(45,108,240,0.22) 0%, rgba(45,108,240,0.07) 45%, rgba(45,108,240,0) 75%)',
      }} />
    </AbsoluteFill>
  );
};

// 闪光层独立于 CameraMotionBlur（细针光束旋转会被采样拆成条纹分身）
const FlashLayer: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <SpawnFlash f={f} />
    </div>
  );
};

export const MagicianCardFlourish: React.FC = () => {
  const f = useCurrentFrame();
  // 定格后全量冻结，运动模糊采样完全一致 → 定格段不再包 CameraMotionBlur（结果相同，省 7 倍渲染）
  const moving = f <= LAND;
  return (
    <AbsoluteFill>
      <Stage />
      {moving ? (
        <CameraMotionBlur shutterAngle={150} samples={7}>
          <Scene />
        </CameraMotionBlur>
      ) : (
        <Scene />
      )}
      <FlashLayer />
      <Vignette strength={0.36} inner={0.62} color="#000000" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
