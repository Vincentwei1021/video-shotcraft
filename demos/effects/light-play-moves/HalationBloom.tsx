// halation-bloom —— 高光晕染：白字 crash-zoom 撞停那一帧，字后一圈柔晕猛涨炸开，再回落成驻留呼吸光。
//
// 第二轮重设计（深蓝夜 · 显示器峰值亮度发布页）：
// - look = midnight。主角是一行「2,000 nits」——虚构显示器 Vesper XDR 的峰值亮度：数字 330px / 860 字重，
//   填充是"自己发光"的白→冰蓝竖向渐变，单位 nits 96px 贴基线。语义正好对上手法：亮度数字一撞停就把屏幕"照亮"。
// - 晕分四层（胶片 halation 的物理顺序）：贴边紧芯（blur 5，不扩）→ 主晕（blur 22 + 提亮，scale 1→1.32 猛涨）
//   → 外圈电光蓝 halation 边（blur 56，扩得最开、退得最干净）→ 一道横向变形镜头光条（anamorphic streak，
//   撞停帧从数字中心横向抽开、12f 收干）。扩散 out-cubic 6f、消散 linear 20f 解耦（判例），再缓收到 0.24 稳态。
// - 空间：Stage 顶光 + 地平线光带；数字下方一面"玻璃地台"倒影（翻转副本 + 渐隐遮罩，撞停时一起被照亮）；
//   背景浮尘极淡。撞停同帧整片暗场被照亮一下（中心径向抬亮）再退。
// - 版式：眉题 PEAK BRIGHTNESS（26px caps 宽字距 + 两侧发丝线，字距收拢入场）在上；副标题 48px 逐词升起，
//   型号行 30px mono 降亮。全部居中、轴线对齐数字中心。
//
// 时间表（30fps，共 150f）：
//   0–6     预备：暗场 + 地平线光带 + 浮尘已在画面（不是黑帧）
//   6–14    主动作：数字 crash-zoom 2.7→0.94（8f in-quad，时间采样运动模糊）
//   14      撞停帧：四层晕 + 横向光条 + 背景受光同帧起爆
//   14–19   回弹：弹簧 0.94→1（damping 15，一次可见过冲）
//   14–20   晕猛涨（out-cubic）；20–40 线性回落到 0.38；40–58 缓收到 0.24 稳态
//   20–40   跟随：单位 nits 从右滑入（晚 6f）、眉题字距收拢
//   34–58   副标题逐词升起，型号行淡入
//   58–150  hold：相机极缓推进 1→1.025（ease-out，越来越慢），驻留晕随推进轻呼吸，尾 ~15f 近乎静止
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const HALATION_BLOOM_DURATION = 150;

const L = LOOKS.midnight;

const ZOOM_START = 6;
const IMPACT = 14; // 撞停帧
const POP_END = IMPACT + 6; // 晕猛涨 6f
const FALL_END = POP_END + 20; // 20f 线性回落
const SETTLE_END = FALL_END + 18; // 缓收到稳态

const NUM_SIZE = 330;
const CY = 470; // 数字块中心（略高于几何中心，给副标题留位）
const FLOOR = CY + 146; // 玻璃地台线（≈ 数字基线下 10px）：倒影以它为镜面
const ICE = '#bcd2ff'; // 冰蓝：数字底部的发光色
const HALO = L.accent; // 外圈 halation：电光蓝

const inQuad = bezier(0.55, 0.085, 0.68, 0.53);
const outCubic = bezier(0.215, 0.61, 0.355, 1);

// crash-zoom：8f in-quad 加速撞停到 0.94，撞停后弹簧回到 1（一次可见过冲）
const scaleAt = (f: number) => {
  if (f < IMPACT) return mix(2.7, 0.94, ramp(f, ZOOM_START, IMPACT - ZOOM_START, inQuad));
  return mix(0.94, 1, springAt(f, IMPACT, { damping: 15, stiffness: 260 }));
};

// 数字 + 单位：solid = 晕层用的单色副本；unit = 单位入场进度（晕层里单位跟着本体）
const Figure: React.FC<{ solid?: string; unit: number; gradient?: boolean }> = ({ solid, unit, gradient }) => {
  const fill: React.CSSProperties = gradient
    ? { backgroundImage: `linear-gradient(180deg, #ffffff 30%, #e6eeff 62%, ${ICE} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
    : { color: solid };
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
      {/* padding/负 margin：background-clip:text 只画在盒内，负字距会让末位字形伸出盒外被裁 */}
      <span style={{ ...type(NUM_SIZE, 860), letterSpacing: '-0.055em', lineHeight: 1, padding: '0.06em 0.1em', margin: '-0.06em -0.1em', ...fill }}>2,000</span>
      <span
        style={{
          ...type(96, 600), letterSpacing: '-0.02em', lineHeight: 1, marginLeft: 26,
          opacity: unit, transform: `translateX(${mix(60, 0, unit).toFixed(1)}px)`, display: 'inline-block',
          ...(gradient ? { color: alpha(L.ink, 0.92) } : { color: solid }),
        }}
      >
        nits
      </span>
    </div>
  );
};

// 以数字中心为原点的定位层
const At: React.FC<{ scale: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ scale, style, children }) => (
  <div
    style={{
      position: 'absolute', left: 0, right: 0, top: CY - 200, height: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `scale(${scale.toFixed(4)})`, transformOrigin: '50% 50%', ...style,
    }}
  >
    {children}
  </div>
);

export const HalationBloom: React.FC = () => {
  const frame = useCurrentFrame();
  const hit = frame >= IMPACT;

  // 相机：hold 段极缓推进（越来越慢，尾段近乎静止）
  const cam = 1 + 0.025 * ramp(frame, IMPACT + 10, 150 - IMPACT - 10, EASE.out);

  const s = scaleAt(frame);
  const textOpacity = ramp(frame, ZOOM_START, 3, EASE.linear);
  const unit = ramp(frame, IMPACT + 6, 16, EASE.snappy);

  // —— 晕：扩散 out-cubic / 消散 linear 解耦 ——
  // 扩散：6f out-cubic 猛涨到 1.18，随消散一起收回 1.03（停在大尺寸会读成"重影"而不是晕）
  const pop = ramp(frame, IMPACT, POP_END - IMPACT, outCubic);
  const recede = ramp(frame, POP_END, SETTLE_END - POP_END, EASE.swift);
  const bloomScale = 1 + 0.18 * pop - 0.15 * recede;
  const bloomBlur = mix(14, 30, pop) - 8 * recede;
  const bloomOpacity = !hit
    ? 0
    : frame < FALL_END
      ? mix(1, 0.38, ramp(frame, POP_END, FALL_END - POP_END, EASE.linear))
      : mix(0.38, 0.24, ramp(frame, FALL_END, SETTLE_END - FALL_END, EASE.out));
  // 驻留呼吸：稳态后极轻的明暗起伏（±8%），让 hold 段画面活着
  const breathe = frame > SETTLE_END ? 1 + 0.08 * Math.sin((frame - SETTLE_END) / 14) * ramp(frame, SETTLE_END, 20, EASE.smooth) : 1;
  const core = hit ? mix(0.95, 0.42, ramp(frame, IMPACT, SETTLE_END - IMPACT, EASE.out)) : 0;
  const halo = bloomOpacity * 0.85 * breathe;
  const haloScale = 1 + 0.14 * ramp(frame, IMPACT, POP_END - IMPACT + 4, outCubic) - 0.1 * recede;
  // 横向光条：撞停帧抽开（scaleX out-expo），12f 收干
  const streakT = ramp(frame, IMPACT, 4, EASE.snappy);
  const streakA = hit ? 1 - ramp(frame, IMPACT + 1, 13, EASE.out) : 0;
  // 背景受光
  const spill = hit ? mix(1, 0.32, ramp(frame, IMPACT + 1, SETTLE_END - IMPACT, EASE.out)) * breathe : 0;

  // 入场运动模糊：快门 0.5f，按字边位移取子帧（第 k 层 1/(k+1) = 等权平均）
  const flying = frame > ZOOM_START && frame < IMPACT;
  const edge = flying ? Math.abs(scaleAt(frame) - scaleAt(frame - 0.5)) * 640 : 0;
  const n = flying ? Math.max(1, Math.min(12, Math.ceil(edge / 6))) : 1;
  const sd = n > 1 ? Math.min(5, (edge / (n - 1)) * 0.5) : 0;

  const kicker = ramp(frame, IMPACT + 4, 26, EASE.snappy);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={null} horizon={0.7} intensity={0.75}>
        <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.35} />
      </Stage>

      {/* 撞停受光：整片暗场中心被照亮 */}
      {spill > 0 && (
        <div
          style={{
            position: 'absolute', inset: 0, opacity: spill, mixBlendMode: 'screen',
            background: `radial-gradient(ellipse 46% 40% at 50% ${(CY / 1080) * 100}%, ${alpha('#d8e4ff', 0.2)} 0%, ${alpha(HALO, 0.1)} 42%, ${alpha(HALO, 0)} 76%)`,
          }}
        />
      )}

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(4)})`, transformOrigin: `50% ${(CY / 1080) * 100}%` }}>
        {/* 玻璃地台：地平线发丝线 + 倒影（翻转副本，渐隐遮罩） */}
        <div
          style={{
            position: 'absolute', left: 260, right: 260, top: FLOOR, height: 1,
            background: `linear-gradient(90deg, transparent, ${alpha('#cfdcff', 0.22 + 0.25 * spill)}, transparent)`,
            opacity: ramp(frame, IMPACT - 1, 4, EASE.out),
          }}
        />
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: FLOOR + 1, height: 260, overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.18) 22%, transparent 42%)',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.18) 22%, transparent 42%)',
            opacity: ramp(frame, IMPACT - 1, 4, EASE.out) * (0.4 + 0.4 * spill),
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: -FLOOR - 1, width: 1920, height: 1080, transform: 'scaleY(-1)', transformOrigin: `50% ${FLOOR}px`, filter: 'blur(3px)' }}>
            <At scale={s}>
              <Figure solid="#dfe8ff" unit={unit} />
            </At>
          </div>
        </div>

        {/* 晕层 1：外圈电光蓝 halation（最宽最暗） */}
        {hit && (
          <At scale={s * haloScale} style={{ opacity: halo, filter: 'blur(64px)' }}>
            <Figure solid={HALO} unit={unit} />
          </At>
        )}
        {/* 晕层 2：主晕（blur 22 + brightness，scale 猛涨） */}
        {hit && (
          <At scale={s * bloomScale} style={{ opacity: bloomOpacity * breathe, filter: `blur(${bloomBlur.toFixed(1)}px) brightness(1.8)` }}>
            <Figure solid="#e4ecff" unit={unit} />
          </At>
        )}
        {/* 晕层 3：紧芯（贴字边，不扩） */}
        {hit && (
          <At scale={s} style={{ opacity: core, filter: 'blur(5px)' }}>
            <Figure solid="#ffffff" unit={unit} />
          </At>
        )}

        {/* 本体：crash-zoom（飞行段时间采样运动模糊） */}
        {Array.from({ length: n }, (_, k) => (
          <At
            key={k}
            scale={scaleAt(frame - (0.5 * k) / Math.max(1, n - 1))}
            style={{ opacity: textOpacity * (k === 0 ? 1 : 1 / (k + 1)), filter: sd > 0.3 ? `blur(${sd.toFixed(2)}px)` : undefined }}
          >
            <Figure gradient unit={unit} />
          </At>
        ))}

        {/* 横向变形光条：数字中线上抽开，芯白边蓝 */}
        {streakA > 0.01 && (
          <>
            <div
              style={{
                position: 'absolute', left: 960 - 900, top: CY - 4, width: 1800, height: 8, borderRadius: 4,
                transform: `scaleX(${mix(0.15, 1, streakT).toFixed(3)})`, opacity: streakA,
                background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.95) 0%, ${alpha('#9fbaff', 0.6)} 30%, ${alpha(HALO, 0)} 100%)`,
                filter: 'blur(1px)', mixBlendMode: 'screen',
              }}
            />
            <div
              style={{
                position: 'absolute', left: 960 - 1000, top: CY - 40, width: 2000, height: 80,
                transform: `scaleX(${mix(0.2, 1, streakT).toFixed(3)})`, opacity: streakA * 0.8,
                background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(HALO, 0.55)} 0%, ${alpha(HALO, 0)} 100%)`,
                filter: 'blur(12px)', mixBlendMode: 'screen',
              }}
            />
          </>
        )}

        {/* 眉题：PEAK BRIGHTNESS，字距由宽收紧 + 两侧发丝线 */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: CY - 262, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28,
            opacity: kicker,
          }}
        >
          <div style={{ width: mix(0, 120, kicker), height: 1, background: alpha(L.accent, 0.7) }} />
          <div
            style={{
              ...type(26, 650, { caps: true }), letterSpacing: `${mix(0.7, 0.34, kicker).toFixed(3)}em`, color: '#9fbaff',
            }}
          >
            Peak brightness
          </div>
          <div style={{ width: mix(0, 120, kicker), height: 1, background: alpha(L.accent, 0.7) }} />
        </div>
      </div>

      {/* 副标题 + 型号行（不随相机推进，保持版式稳定） */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: CY + 262, textAlign: 'center' }}>
        <TextReveal
          text="Bright enough for the noon sun."
          by="word"
          variant="rise"
          start={IMPACT + 20}
          each={20}
          gap={3}
          style={{ ...type(52, 560), color: L.ink }}
        />
      </div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: CY + 348, textAlign: 'center',
          ...type(30, 500, { mono: true }), letterSpacing: '0.12em', color: L.ink3,
          opacity: ramp(frame, IMPACT + 36, 18, EASE.out),
        }}
      >
        VESPER XDR · 32″ · 1,000,000:1
      </div>
    </AbsoluteFill>
  );
};
