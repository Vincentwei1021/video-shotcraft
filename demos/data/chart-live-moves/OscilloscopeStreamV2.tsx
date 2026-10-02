// oscilloscope-stream-v2 —— 示波流线 v2（批次 6 "改改再看" 重做）
// 相对 v1 的加码：流速 5.5→8px/f；写入点亮点 1.5×（7→10.5）、余辉 90→160px；
// 流动中途插入一次突发尖峰（振幅 2.2×、持续 ~20 帧写入后随流带走），尖峰经过写入点时
// 卡头实时读数跳大并变琥珀；真图表语境：真标题/真 y 轴刻度/真时间轴/实时读数。
// 刹停逻辑保留：f100–112 out-cubic 刹停，f112 后真静止 48f。
// 帧确定性：波形与尖峰包络都是纯 worldX 函数，无 Math.random / Date.now。
//
// 质感升级：监控语境改暗场——带色相的深色柔光背景 + 颗粒、深色卡面发丝线 + 内高光；
// 调试标题去掉，卡片居中放大；曲线下加淡面积渐变，左端旧数据渐隐出画（遮罩），写入端
// 是磷光余辉 + 带光圈的写入点；尖峰段整段染琥珀并在峰顶钉一枚随流带走的事件标签；
// 读数颜色/字号随尖峰包络平滑过渡；刹停曲线初速与流速对齐（无速度跳变），LIVE 灯随之熄灭。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Backdrop, EASE, FONT, Grain, mix, ramp, softShadow, tracking } from '../../_fixtures/Polish';

export const OSCILLOSCOPE_STREAM_V2_DURATION = 160; // 112f 流动+刹停 + 48f 真静止

const AMBER = '#f59e0b';
const AMBER_TXT = '#fbbf24';
const LINE = '#dfe3ee'; // 常态曲线：冷调浅灰
const INK1 = '#f3f4f7';
const INK2 = '#a3a7b3';
const INK3 = '#6f7380';

const CARD_W = 1200;
const CARD_H = 590;
const CX = (1920 - CARD_W) / 2;
const CY = (1080 - CARD_H) / 2;
const PAD = 52;
const AXIS_W = 70; // 左侧 y 轴刻度位
const PLOT_X = PAD + AXIS_W;
const PLOT_W = CARD_W - PAD * 2 - AXIS_W; // 1026
const PLOT_H = 330;
const PLOT_Y = 170;

const HOLD = 12;
const FREEZE_START = 100;
const FREEZE_END = 112;
const SPEED = 8; // px/frame（v1 5.5 → 8，~240px/s）
const AMP = 0.72; // 基础振幅占半高比例（给尖峰留出头部空间）

// 突发尖峰：worldX ∈ [288, 448]（写入发生在 f48–68，之后随流向左带走）
const SPIKE_X0 = 288;
const SPIKE_W = 160;
const SPIKE_GAIN = 1.2; // 峰值 = 1 + 1.2 = 2.2×

const env = (x: number): number => {
  if (x <= SPIKE_X0 || x >= SPIKE_X0 + SPIKE_W) return 1;
  const p = (x - SPIKE_X0) / SPIKE_W;
  return 1 + SPIKE_GAIN * (0.5 - 0.5 * Math.cos(p * Math.PI * 2));
};

// 有效时间：HOLD 前为 0，之后匀速流动（采样窗平移是机械语义，刻意匀速），FREEZE 区间 out-cubic 刹停。
// 刹车距离取 SPEED×12/3：out-cubic 初速 = 3D/12 = SPEED，刹车起点无速度跳变。
const effTime = (frame: number): number => {
  const t = (f: number) => Math.max(f - HOLD, 0) * SPEED;
  if (frame <= FREEZE_START) return t(frame);
  const brakeDist = (SPEED * (FREEZE_END - FREEZE_START)) / 3;
  return t(FREEZE_START) + brakeDist * ramp(frame, FREEZE_START, FREEZE_END - FREEZE_START, (x) => 1 - Math.pow(1 - x, 3));
};

// 波形：四个正弦叠加，x 单位 = 世界像素
const wave = (x: number): number =>
  0.34 * Math.sin(x * 0.021) +
  0.27 * Math.sin(x * 0.052 + 1.7) +
  0.18 * Math.sin(x * 0.013 + 4.2) +
  0.12 * Math.sin(x * 0.087 + 2.3);

const signal = (x: number): number => wave(x) * env(x) * AMP; // ∈ ~[-1.6, 1.6]，常态 [-0.65, 0.65]
const yOf = (x: number): number => PLOT_H / 2 - signal(x) * (PLOT_H / 2);
// 读数映射：绘图区中线 = 1,000 req/s，上下沿 = 2,000 / 0
const valueOf = (x: number): number => Math.round(1000 + signal(x) * 1000);

const fmt = (n: number): string => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// 尖峰峰顶（worldX）：包络 × 波形的最大值，预先扫一遍（纯函数，跨帧确定）
const PEAK_X = (() => {
  let best = SPIKE_X0;
  for (let x = SPIKE_X0; x <= SPIKE_X0 + SPIKE_W; x += 0.5) if (signal(x) > signal(best)) best = x;
  return best;
})();

const Y_TICKS = ['2.0k', '1.5k', '1.0k', '0.5k', '0'];
const X_TICKS = ['-60s', '-50s', '-40s', '-30s', '-20s', '-10s', 'now'];

const hexMix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a);
  const B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

export const OscilloscopeStreamV2: React.FC = () => {
  const frame = useCurrentFrame();
  const T = effTime(frame);

  // 主曲线采样（每 3.8px 一点）
  const N = 270;
  const ptsXY: Array<[number, number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const px = (i / N) * PLOT_W;
    const worldX = T - (PLOT_W - px);
    ptsXY.push([px, yOf(worldX), worldX]);
  }
  const pts = ptsXY.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `M0,${PLOT_H} L${pts.replace(/ /g, ' L')} L${PLOT_W},${PLOT_H} Z`;
  // 尖峰段（世界坐标在 [SPIKE_X0, SPIKE_X0+SPIKE_W] 且已写入的部分）单独染琥珀
  const spikePts = ptsXY
    .filter(([, , w]) => w >= SPIKE_X0 - 2 && w <= Math.min(T, SPIKE_X0 + SPIKE_W + 2))
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const headY = yOf(T);

  const live = 1 - ramp(frame, FREEZE_START, FREEZE_END - FREEZE_START, EASE.out); // 写入端余辉/亮点

  // 余辉段：头部往回 160px，按新旧渐变（越新越亮）
  const TAIL = 160;
  const tailPts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const px = PLOT_W - TAIL + (i / 40) * TAIL;
    tailPts.push(`${px.toFixed(2)},${yOf(T - (PLOT_W - px)).toFixed(2)}`);
  }

  // 实时读数：尖峰经过写入点时跳大 + 变琥珀（同一条包络平滑驱动）
  const spikeK = Math.min(Math.max((env(T) - 1) / SPIKE_GAIN, 0), 1);
  const hotK = ramp(spikeK, 0.1, 0.4, EASE.out);
  const readout = fmt(valueOf(T));
  const readScale = 1 + 0.32 * spikeK;
  const headCol = hexMix('#e9ecf5', AMBER, hotK);

  // 事件标签：写入点越过峰顶后弹出，钉在峰顶随流向左带走
  const peakPx = PLOT_W - (T - PEAK_X);
  const peakY = yOf(PEAK_X);
  const tagIn = ramp(frame, HOLD + Math.ceil((PEAK_X + 10) / SPEED), 10, EASE.overshoot);
  const peakVal = fmt(valueOf(PEAK_X));

  // 入场：卡片 10f 浮起
  const inP = ramp(frame, 0, 12, EASE.snappy);
  // LIVE 灯：每 30f 一次呼吸，刹停后熄成灰
  const pulse = 0.5 + 0.5 * Math.cos((frame / 30) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ background: '#0c0d11', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.3 }} accent="#5b63d3" grain={0} />

      <div
        style={{
          position: 'absolute',
          left: CX,
          top: CY,
          width: CARD_W,
          height: CARD_H,
          background: 'linear-gradient(180deg, #1a1c22 0%, #15161b 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 22,
          boxSizing: 'border-box',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), ${softShadow(36, { color: '#000000', strength: 2.2 })}`,
          opacity: inP,
          transform: `translateY(${mix(20, 0, inP).toFixed(2)}px)`,
        }}
      >
        {/* 真卡头：标题 + 副题 + 实时读数 */}
        <div style={{ position: 'absolute', left: PAD, top: 42 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 30, fontWeight: 650, color: INK1, letterSpacing: tracking(30) }}>Requests per second</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 11px 5px 9px',
                borderRadius: 99,
                background: live > 0.5 ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${live > 0.5 ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 15,
                fontWeight: 650,
                letterSpacing: tracking(15, true),
                color: live > 0.5 ? '#6ee7b7' : INK3,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: live > 0.5 ? '#34d399' : INK3,
                  boxShadow: live > 0.5 ? `0 0 0 ${(2 + 3 * pulse).toFixed(2)}px rgba(52,211,153,${(0.28 * (1 - pulse)).toFixed(3)})` : 'none',
                }}
              />
              LIVE
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: INK3, marginTop: 9 }}>api-gateway · production · last 60 s</div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: PAD,
            top: 36,
            textAlign: 'right',
            transform: `scale(${readScale.toFixed(4)})`,
            transformOrigin: 'right top',
          }}
        >
          <div
            style={{
              fontSize: 50,
              fontWeight: 700,
              lineHeight: 1.05,
              color: hexMix('#f3f4f7', AMBER_TXT, hotK),
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: tracking(50),
            }}
          >
            {readout}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: hexMix('#6f7380', AMBER, hotK), marginTop: 4, letterSpacing: '0.01em' }}>req/s</div>
        </div>

        {/* y 轴真刻度 */}
        {Y_TICKS.map((t, i) => (
          <div
            key={`yt${i}`}
            style={{
              position: 'absolute',
              left: PAD - 6,
              top: PLOT_Y + (PLOT_H / 4) * i - 11,
              width: AXIS_W - 14,
              textAlign: 'right',
              fontSize: 19,
              fontWeight: 500,
              color: INK3,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t}
          </div>
        ))}

        <div style={{ position: 'absolute', left: PLOT_X, top: PLOT_Y, width: PLOT_W, height: PLOT_H }}>
          {/* 网格：1px 发丝线，竖线更淡 */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={`h${i}`}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: (PLOT_H / 4) * i,
                height: 1,
                background: i === 4 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: (PLOT_W / 6) * i, width: 1, background: 'rgba(255,255,255,0.035)' }} />
          ))}
          {/* "now" 写入线 */}
          <div style={{ position: 'absolute', top: -8, bottom: 0, left: PLOT_W - 0.5, width: 1, background: `rgba(255,255,255,${0.05 + 0.1 * live})` }} />

          <svg width={PLOT_W} height={PLOT_H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <linearGradient id="oscArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#9aa3ff" stopOpacity={0.16} />
                <stop offset="1" stopColor="#9aa3ff" stopOpacity={0} />
              </linearGradient>
              {/* 左端旧数据渐隐：前 22% 宽度从 0 → 1 */}
              <linearGradient id="oscFadeG" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity={0} />
                <stop offset="0.22" stopColor="#fff" stopOpacity={1} />
              </linearGradient>
              <mask id="oscFade" maskUnits="userSpaceOnUse" x={-20} y={-200} width={PLOT_W + 60} height={PLOT_H + 400}>
                <rect x={-20} y={-200} width={PLOT_W + 60} height={PLOT_H + 400} fill="url(#oscFadeG)" />
              </mask>
              <linearGradient id="oscTail" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={headCol} stopOpacity={0} />
                <stop offset="1" stopColor={headCol} stopOpacity={1} />
              </linearGradient>
              <filter id="oscBlur" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            <g mask="url(#oscFade)">
              <path d={area} fill="url(#oscArea)" />
              <polyline points={pts} fill="none" stroke={LINE} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
              {spikePts && <polyline points={spikePts} fill="none" stroke={AMBER} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />}
            </g>
            {/* 磷光余辉：越新越亮，刹停后熄灭 */}
            {live > 0.01 && (
              <polyline
                points={tailPts.join(' ')}
                fill="none"
                stroke="url(#oscTail)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.55 * live}
                filter="url(#oscBlur)"
              />
            )}
            {/* 写入点：外圈光晕 + 白芯，刹停后收成一颗静止小点 */}
            <circle cx={PLOT_W} cy={headY} r={26} fill={headCol} opacity={0.22 * live} filter="url(#oscBlur)" />
            <circle cx={PLOT_W} cy={headY} r={mix(6, 10.5, live)} fill={headCol} stroke="#15161b" strokeWidth={3} />
          </svg>

          {/* 尖峰事件标记：峰顶垂下一根琥珀虚线到底部事件道，道上一枚标签；钉在峰位随流带走（左端渐隐区淡出）。
              标签放底部而不是峰顶上方——峰顶上方是卡头读数区，峰刚写入时会撞字 */}
          {tagIn > 0 && peakPx > -120 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: Math.min(1, tagIn * 1.5) * Math.min(1, Math.max(0, peakPx / (PLOT_W * 0.22))),
              }}
            >
              <svg width={PLOT_W} height={PLOT_H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <line
                  x1={peakPx}
                  x2={peakPx}
                  y1={peakY + 12}
                  y2={mix(peakY + 12, PLOT_H - 44, Math.min(1, tagIn))}
                  stroke={AMBER}
                  strokeOpacity={0.55}
                  strokeWidth={1.5}
                  strokeDasharray="4 5"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  left: peakPx,
                  top: PLOT_H - 44,
                  transform: `translateX(-50%) scale(${tagIn.toFixed(4)})`,
                  transformOrigin: '50% 0%',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 13px',
                  borderRadius: 10,
                  background: 'rgba(38,30,18,0.92)',
                  border: '1px solid rgba(245,158,11,0.42)',
                  boxShadow: '0 6px 18px -6px rgba(0,0,0,0.6)',
                  color: AMBER_TXT,
                  fontSize: 17,
                  fontWeight: 650,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 14 14">
                  <path d="M7.6 1 L3 8 H6.6 L6 13 L11 5.6 H7.4 Z" fill={AMBER_TXT} />
                </svg>
                Burst · {peakVal} req/s
              </div>
            </div>
          )}
        </div>

        {/* x 轴真时间刻度 */}
        <div style={{ position: 'absolute', left: PLOT_X, top: PLOT_Y + PLOT_H + 18, width: PLOT_W }}>
          {X_TICKS.map((t, i) => (
            <div
              key={`xt${i}`}
              style={{
                position: 'absolute',
                left: (PLOT_W / 6) * i - 40,
                width: 80,
                textAlign: i === 0 ? 'left' : i === 6 ? 'right' : 'center',
                transform: i === 0 ? 'translateX(40px)' : i === 6 ? 'translateX(-40px)' : undefined,
                fontSize: 18,
                fontWeight: 500,
                color: i === 6 ? INK2 : INK3,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
