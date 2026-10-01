// 子弹时间冻结环绕(bullet-time-freeze-orbit)——The Matrix bullet time。
// 中央 900×560 面板内 5 根柱状图错峰生长(动画时钟 effFrame 驱动)。
// 关键帧:0–20 hold 读布景;20–45 柱子正常生长;45–105 时钟咬死(柱子完全静止),
// 相机 perspective(1600px) 下 rotateY 0→55°(45–72)→顶点悬停(72–82)→回 0(82–105),
// 同步 scale 1→1.12→1 + translateX 摆动增强绕行感;105–120 时钟恢复柱子长完;
// 118–132 数字标签错峰浮现;132–150 全静止收尾。
//
// 改版要点:去掉调试标题与 FREEZE 大徽标,换成画面内自带的"时间证词"——
// 右上角时间码与面板里的总数计数器都走 effFrame,冻结时一起停住(时码点变色);
// 面板换出版级图表(标题/计数/刻度/轴标签/唯一强调柱);背景点阵随相机环绕
// 反向视差、地面接触影随角度收窄,读出"是相机在绕";冻结期整体轻微冷调 +
// 暗角收拢,面板表面一道随角度移动的镜面反光(裁进圆角,全片仅此一次)。
import React from 'react';
import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, mix, ramp, softShadow } from '../../_fixtures/Polish';

export const BULLET_TIME_FREEZE_ORBIT_DURATION = 150;

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const PANEL_W = 900;
const PANEL_H = 560;
const BAR_COUNT = 5;
const FREEZE_IN = 45;
const FREEZE_OUT = 105;
const TOTAL = 12480; // 计数器终值

const clampOpt = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

// 时间码 mm:ss:ff(30fps)
const timecode = (f: number) => {
  const ff = Math.floor(f) % 30;
  const ss = Math.floor(f / 30);
  return `00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
};

export const BulletTimeFreezeOrbit: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 子弹时间时钟:0–45 正常走,45–105 冻结,105 起恢复 ──
  const effFrame =
    frame < FREEZE_IN ? frame : frame < FREEZE_OUT ? FREEZE_IN : FREEZE_IN + (frame - FREEZE_OUT);

  // ── 冻结区间的相机环绕(用真实 frame 驱动) ──
  const rotY =
    frame < 72
      ? interpolate(frame, [45, 72], [0, 55], { ...clampOpt, easing: Easing.inOut(Easing.cubic) })
      : frame < 82
        ? 55 // 顶点悬停 10f
        : interpolate(frame, [82, 105], [55, 0], { ...clampOpt, easing: Easing.inOut(Easing.cubic) });
  const orbitT = rotY / 55; // 0→1→0,复用做 scale / translateX
  const scale = 1 + 0.12 * orbitT;
  const tx = -170 * Math.sin(orbitT * Math.PI * 0.5) - 60 * orbitT; // 绕行横摆
  const ty = -24 * orbitT;

  // 冻结氛围:进出各 8f 平滑过渡
  const frozen = ramp(frame, FREEZE_IN, 8, EASE.out) * (1 - ramp(frame, FREEZE_OUT - 4, 10, EASE.smooth));

  // ── 柱子:错峰生长,全部由 effFrame 驱动(冻结即静止) ──
  const chartW = PANEL_W - 150;
  const chartH = PANEL_H - 236;
  const barW = 92;
  const gap = (chartW - BAR_COUNT * barW) / (BAR_COUNT - 1);
  const bars = Array.from({ length: BAR_COUNT }).map((_, i) => {
    const full = chartH * (0.42 + h(i + 1) * 0.55); // 目标高度
    const start = 20 + i * 4;
    const end = 48 + i * 3; // 20–60f 区间内错峰
    const p = interpolate(effFrame, [start, end], [0, 1], { ...clampOpt, easing: Easing.out(Easing.cubic) });
    const value = Math.round((full / chartH) * 100); // 标签与柱高一致
    return { hNow: full * p, full, value };
  });
  const maxIdx = bars.reduce((m, b, i) => (b.full > bars[m].full ? i : m), 0);
  // 总数计数器:同样吃 effFrame,冻结时停在半途
  const countP = interpolate(effFrame, [20, 64], [0, 1], { ...clampOpt, easing: Easing.out(Easing.cubic) });
  const count = Math.round(TOTAL * countP);

  // 镜面反光:随相机角度横扫面板(只在环绕期出现)
  const sheenX = mix(-40, 120, orbitT); // 百分比位置
  const sheenA = Math.sin(Math.min(1, orbitT) * Math.PI) * 0.5 + orbitT * 0.12;

  // 背景点阵反向视差 + 地面接触影随角度收窄
  const bgShift = rotY * 5.5;
  const shadowW = PANEL_W * scale * mix(1, Math.cos((rotY * Math.PI) / 180), 0.85);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.2 }} grain={0} vignette={0.18} />
      {/* 背景点阵:相机绕行时反向平移(远景视差) */}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(40,44,60,0.16) 1.6px, rgba(40,44,60,0) 2.6px)',
          backgroundSize: '44px 44px',
          backgroundPosition: `${bgShift.toFixed(2)}px 0px`,
          WebkitMaskImage: 'radial-gradient(ellipse 60% 62% at 50% 52%, #000 20%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 60% 62% at 50% 52%, #000 20%, transparent 100%)',
        }}
      />

      {/* 时间码 HUD:跟 effFrame 走,冻结时停住、点变成强调色 */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 18px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.72)',
          border: `1px solid ${G.hairline}`,
          boxShadow: softShadow(6),
          fontFamily: FONT.mono,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: frozen > 0.5 ? G.accent : '#e5484d',
            boxShadow: `0 0 0 4px ${frozen > 0.5 ? G.accentSoft : 'rgba(229,72,77,0.14)'}`,
          }}
        />
        <div style={{ fontSize: 32, fontWeight: 500, color: G.ink1, letterSpacing: '0.02em' }}>{timecode(effFrame)}</div>
        <div
          style={{
            overflow: 'hidden',
            width: 112 * frozen,
            opacity: frozen,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 650,
            letterSpacing: '0.12em',
            color: G.accent,
            whiteSpace: 'nowrap',
          }}
        >
          FROZEN
        </div>
      </div>

      {/* 地面接触影:相机环绕时随面板投影宽度收窄、跟着横摆 */}
      <div
        style={{
          position: 'absolute',
          left: 960 + tx - shadowW / 2,
          top: 540 + (PANEL_H * scale) / 2 + ty - 10,
          width: shadowW,
          height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(20,22,34,0.22) 0%, rgba(20,22,34,0) 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* 3D 舞台 */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: 1600 }}>
        <div
          style={{
            width: PANEL_W,
            height: PANEL_H,
            position: 'relative',
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
            border: `1px solid ${G.hairline}`,
            borderRadius: 22,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(28)}`,
            boxSizing: 'border-box',
            padding: '40px 64px 0 86px',
            overflow: 'hidden',
            transform: `translateX(${tx}px) translateY(${ty}px) rotateY(${rotY}deg) scale(${scale})`,
          }}
        >
          {/* 面板头:标题 + 副标 + 计数器 */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 650, color: G.ink1, letterSpacing: '-0.02em' }}>Active teams</div>
              <div style={{ marginTop: 6, fontSize: 19, color: G.ink2 }}>Weekly · last 5 weeks</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: G.ink1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {count.toLocaleString('en-US')}
              </div>
              <div style={{ marginTop: 6, fontSize: 16, color: G.ink3 }}>total seats</div>
            </div>
          </div>

          {/* 图表区:刻度 + 柱子 */}
          <div style={{ position: 'relative', width: chartW, height: chartH, marginTop: 34 }}>
            {[0, 1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: (chartH / 4) * i, height: 1, background: G.hairline }} />
                <div
                  style={{
                    position: 'absolute',
                    left: -40,
                    top: (chartH / 4) * i - 9,
                    fontSize: 14,
                    color: G.ink3,
                    fontVariantNumeric: 'tabular-nums',
                    width: 30,
                    textAlign: 'right',
                  }}
                >
                  {100 - i * 25}
                </div>
              </React.Fragment>
            ))}
            {/* 基线 */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, background: G.hairlineStrong }} />
            {bars.map((b, i) => {
              const lk = ramp(frame, 118 + i * 2, 12, EASE.out); // 标签错峰浮现
              const hot = i === maxIdx;
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: 'absolute',
                      left: i * (barW + gap),
                      bottom: 1.5,
                      width: barW,
                      height: b.hNow,
                      borderRadius: '10px 10px 3px 3px',
                      background: hot
                        ? 'linear-gradient(180deg, #6d74e0 0%, #545bcf 100%)'
                        : 'linear-gradient(180deg, #e3e4ea 0%, #d6d8e0 100%)',
                      boxShadow: hot ? 'inset 0 1px 0 rgba(255,255,255,0.35)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                    }}
                  />
                  {/* 数字标签:恢复段浮现 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: i * (barW + gap),
                      bottom: 1.5 + b.full + 12 + mix(-8, 0, lk),
                      width: barW,
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 28,
                      letterSpacing: '-0.02em',
                      color: hot ? G.accent : G.ink1,
                      opacity: lk,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {b.value}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: i * (barW + gap),
                      top: chartH + 12,
                      width: barW,
                      textAlign: 'center',
                      fontSize: 15,
                      color: G.ink3,
                    }}
                  >
                    W{i + 1}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* 侧转背光:面板转离主光时整体略暗(漫反射随角度衰减) */}
          {orbitT > 0.001 && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: '#1a1e30', opacity: 0.09 * orbitT }} />
          )}
          {/* 镜面反光:随相机角度横扫,裁在面板圆角内 */}
          {sheenA > 0.01 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                opacity: sheenA,
                background: `linear-gradient(105deg, rgba(255,255,255,0) ${sheenX - 20}%, rgba(255,255,255,0.7) ${sheenX}%, rgba(255,255,255,0) ${sheenX + 20}%)`,
              }}
            />
          )}
        </div>
      </AbsoluteFill>

      {/* 冻结期冷调 + 暗角收拢:时间停了,空气也凝住 */}
      {frozen > 0.001 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            opacity: frozen,
            background:
              'radial-gradient(ellipse 66% 66% at 50% 50%, rgba(70,84,150,0) 52%, rgba(40,48,96,0.16) 100%), rgba(110,124,200,0.035)',
          }}
        />
      )}
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
