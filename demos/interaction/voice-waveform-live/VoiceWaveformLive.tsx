// voice-waveform-live —— raycast-teams 19.5–26s：
// 录音胶囊内实时声纹：细竖条随"说话"起伏（种子随机+相邻插值），
// 说话时中部高耸、停顿缩成点线，波形从右往左滚动；右端提交钮。
// 演：说(0.5–1.9s) → 停(1.9–2.7s) → 说(2.7–4.1s) → 提交(4.1–5s)。
// 质感升级：带色相的暗场（Backdrop + 胶囊下方随说话亮灭的地面光）；emoji 麦克风换 SVG 图标，
// 说话时外圈强调色呼吸环随包络扩散；玻璃胶囊改 1.5px 渐变边 + 上亮下暗体积 + 两层落地影；
// 声纹条全圆角、白→淡靛纵向渐变，历史端向左渐隐（alpha 遮罩），最新一条略亮作"现在"；
// 提交时箭头上飞淡出、对勾落入，按钮一次柔光；入场带 6px→0 收焦。说停包络与全部参数不变。
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Backdrop } from '../../_fixtures/Polish';

export const VOICE_WAVEFORM_LIVE_DURATION = 150; // 入场 12f + 说 1.4s + 停 0.8s + 说 1.4s + 提交塌缩
const ACCENT_RGB = '150,158,255';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// 值噪声：整数采样点取种子随机值，采样点之间平滑插值
const noiseAt = (x: number) => {
  const i = Math.floor(x);
  const fr = x - i;
  const a = mulberry32(i * 7919 + 13)();
  const b = mulberry32((i + 1) * 7919 + 13)();
  const s = fr * fr * (3 - 2 * fr); // smoothstep
  return a + (b - a) * s;
};

// 说话包络（按"声音发生时刻"计）：说→停→说
const envelope = (t: number) => {
  const seg = (a: number, b: number, rise = 5, fall = 7) =>
    interpolate(t, [a, a + rise, b - fall, b], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  // 两段说话内部再叠音节起伏
  const talk = Math.max(seg(15, 57), seg(80, 124));
  const syllable = 0.55 + 0.45 * noiseAt(t / 4.5 + 200);
  return talk * syllable;
};

const N_BARS = 64;

export const VoiceWaveformLive: React.FC = () => {
  const f = useCurrentFrame();

  // 提交动作
  const submitAt = 126;
  const submitted = f >= submitAt;
  const btnPress = interpolate(f, [submitAt, submitAt + 3, submitAt + 9], [1, 0.82, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  // 提交后波形整体塌缩 + 胶囊微缩离场感
  const collapse = interpolate(f, [submitAt, submitAt + 12], [1, 0.06], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.ease),
  });
  const capsuleScale = interpolate(f, [submitAt, submitAt + 14], [1, 0.96], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  // 胶囊入场
  const inOp = interpolate(f, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  const inScale = interpolate(f, [0, 14], [1.04, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const inBlur = interpolate(f, [0, 12], [6, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  // 提交图标：箭头 6f 上飞淡出，对勾 3f 后落入
  const arrowOut = interpolate(f, [submitAt + 1, submitAt + 7], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic),
  });
  const checkIn = interpolate(f, [submitAt + 4, submitAt + 11], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6)),
  });
  const sentGlow = interpolate(f, [submitAt, submitAt + 4, submitAt + 22], [0, 1, 0.35], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const SCROLL = 1.6; // 帧→采样时间比：滚动速度

  const bars = Array.from({ length: N_BARS }).map((_, i) => {
    // 从右往左滚动：最右条是"现在"，越靠左越旧
    const sampleT = f - (N_BARS - 1 - i) * SCROLL;
    const env = sampleT < 0 ? 0 : envelope(sampleT);
    // 空间权重：中部高耸
    const center = Math.pow(Math.sin((i / (N_BARS - 1)) * Math.PI), 0.8);
    const jitter = 0.35 + 0.65 * noiseAt(sampleT * 1.7 + i * 0.13);
    const hRaw = env * center * jitter;
    const h = Math.max(5, hRaw * 235 * collapse); // 静默=5px 点线
    return h;
  });

  const nowEnv = envelope(f);
  const micGlow = submitted ? 0 : nowEnv;
  // 地面光：跟着"现在"的音量亮灭（平滑一点，取最近几条的均值），提交后随塌缩熄灭
  const floor = (bars.slice(-10).reduce((a, b) => a + b, 0) / 10 / 235) * collapse;

  return (
    <AbsoluteFill style={{ background: '#08080a', overflow: 'hidden' }}>
      {/* 暗场：带冷色相的渐变 + 缓慢漂移的绸缎顶光 + 暗角颗粒 */}
      <Backdrop tone="dark" light={{ x: 0.42, y: 0.2 }} drift={40} accent="#8088f0" vignette={0.55} grain={0.07} />
      {/* 胶囊下方的地面光：随说话亮灭（"它在听"的环境回执） */}
      <div style={{
        position: 'absolute', left: 960 - 760, top: 540 + 90, width: 1520, height: 360,
        background: `radial-gradient(ellipse 50% 50% at 50% 40%, rgba(${ACCENT_RGB},${(0.05 + 0.16 * floor).toFixed(3)}) 0%, rgba(${ACCENT_RGB},0) 70%)`,
        opacity: inOp,
      }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 1320, height: 300, borderRadius: 150,
            opacity: inOp,
            transform: `scale(${inScale * capsuleScale})`,
            filter: inBlur > 0.05 ? `blur(${inBlur.toFixed(2)}px)` : undefined,
            // 1.5px 渐变玻璃边：顶沿受光、侧边渐暗、底沿压暗
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0.07) 38%, rgba(255,255,255,0.03) 70%, rgba(0,0,0,0.35))',
            padding: 1.5, boxSizing: 'border-box',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5), 0 40px 90px -20px rgba(0,0,0,0.75)',
          }}
        >
          <div
            style={{
              width: '100%', height: '100%', borderRadius: 148.5,
              background: 'linear-gradient(180deg, rgba(34,35,42,0.92) 0%, rgba(22,23,28,0.94) 55%, rgba(17,18,22,0.96) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -10px 24px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', gap: 36,
              padding: '0 44px', boxSizing: 'border-box',
            }}
          >
            {/* 麦克风圆钮：说话时发亮 + 强调色呼吸环随包络外扩 */}
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <div
                style={{
                  position: 'absolute', inset: -10 - 8 * micGlow, borderRadius: '50%',
                  border: `1.5px solid rgba(${ACCENT_RGB},${(0.5 * micGlow).toFixed(3)})`,
                  boxShadow: `0 0 ${(22 * micGlow).toFixed(1)}px rgba(${ACCENT_RGB},${(0.35 * micGlow).toFixed(3)})`,
                }}
              />
              <div
                style={{
                  position: 'absolute', inset: 0, borderRadius: 48,
                  background: `radial-gradient(circle at 50% 30%, rgba(255,255,255,${(0.14 + micGlow * 0.12).toFixed(3)}), rgba(255,255,255,${(0.04 + micGlow * 0.06).toFixed(3)}) 70%)`,
                  boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,${(0.2 + 0.15 * micGlow).toFixed(3)}), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 ${(28 * micGlow).toFixed(1)}px rgba(${ACCENT_RGB},${(micGlow * 0.4).toFixed(3)})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width={50} height={50} viewBox="0 0 24 24" fill="none">
                  <rect x={8.5} y={3} width={7} height={12} rx={3.5} fill={`rgba(240,241,248,${(0.75 + 0.25 * micGlow).toFixed(3)})`} />
                  <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" stroke="rgba(240,241,248,0.85)" strokeWidth={1.8} strokeLinecap="round" />
                  <path d="M12 18v3M9 21h6" stroke="rgba(240,241,248,0.85)" strokeWidth={1.8} strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 声纹条区 */}
            <div style={{
              flex: 1, height: 244, display: 'flex', alignItems: 'center',
              gap: 6, overflow: 'hidden',
              // 历史端向左渐隐：越旧越淡，读作"从现在往过去流走"
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 16%, #000 100%)',
              maskImage: 'linear-gradient(90deg, transparent 0%, #000 16%, #000 100%)',
            }}>
              {bars.map((h, i) => {
                const k = h / 235;
                const a = 0.38 + k * 0.62 + (i === N_BARS - 1 && !submitted ? 0.15 : 0);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: h, borderRadius: 99,
                      background: `linear-gradient(180deg, rgba(246,246,252,${Math.min(1, a).toFixed(3)}) 0%, rgba(${ACCENT_RGB},${Math.min(1, a * (0.55 + 0.4 * k)).toFixed(3)}) 50%, rgba(246,246,252,${Math.min(1, a).toFixed(3)}) 100%)`,
                    }}
                  />
                );
              })}
            </div>

            {/* 提交钮：白圆 + 上箭头；提交时箭头上飞、对勾落入，一次柔光 */}
            <div
              style={{
                width: 96, height: 96, borderRadius: 48, flexShrink: 0, position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(180deg, #ffffff 0%, #ececf1 100%)',
                transform: `scale(${btnPress})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.45), 0 10px 26px -6px rgba(0,0,0,0.6), 0 0 ${(56 * sentGlow).toFixed(1)}px rgba(220,224,255,${(0.55 * sentGlow).toFixed(3)})`,
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" style={{ position: 'absolute', opacity: 1 - arrowOut, transform: `translateY(${(-26 * arrowOut).toFixed(2)}px)` }}>
                <path
                  d="M12 20V5M12 5l-6.5 6.5M12 5l6.5 6.5"
                  stroke="#111114" strokeWidth="2.6" strokeLinecap="round"
                  strokeLinejoin="round" fill="none"
                />
              </svg>
              {checkIn > 0.001 && (
                <svg width="46" height="46" viewBox="0 0 24 24" style={{ position: 'absolute', opacity: Math.min(1, checkIn * 1.4), transform: `translateY(${(14 * (1 - checkIn)).toFixed(2)}px) scale(${(0.7 + 0.3 * checkIn).toFixed(3)})` }}>
                  <path d="M5.5 12.5l4.2 4.2L18.5 7.8" stroke="#111114" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
