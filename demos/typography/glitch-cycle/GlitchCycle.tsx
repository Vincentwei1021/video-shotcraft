// glitch-cycle — Glitch Cycle 乱码轮播（motion-lab 定稿转原生 Remotion）
// 同一位置循环轮播状态短语，每条短语头尾乱码、中段偶发轻微抖动
// （glitch 概率关键帧 [1,0,0,0.1,0,0,1]，最后一条结尾收为 0 保证 t=1 画面干净），
// 切换瞬间伴随 RGB 分离与位移抖动；底部细进度条随 t 匀速填满。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层（改版）：短语在固定槽位里左右对称填空格（仍不增删字符、不重排），行真正居中；
// glitch 浓度 g 再驱动一条水平撕裂带（行切三段、中段横移），切换峰值更像信号故障；
// 进度条加四拍刻度 + 步骤/百分比状态行（tabular-nums），末条落定时状态点转实心；
// 暗场柔光底 + 暗角 + 颗粒，强调色统一为批次靛蓝。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DesignStage, lerp, rand, useT } from '../../_fixtures/Motion';
import { Backdrop, FONT, Grain } from '../../_fixtures/Polish';

export const GLITCH_CYCLE_DURATION = 168; // 5600ms @30fps

const PHRASES = ['INITIALIZING', 'LOADING ASSETS', 'COMPILING SHADERS', 'READY TO SHIP'];
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&<>/\\';
// glitch 概率关键帧 [1,0,0,0.1,0,0,1]（最后一条结尾收为 0，保证 t=1 画面干净）
const KF = [1, 0, 0, 0.1, 0, 0, 1];
const KF_LAST = [1, 0, 0, 0.1, 0, 0, 0];
const MAXCH = Math.max(...PHRASES.map((p) => p.length));
const ACCENT = '#8f97ff';
const INK = '#e4e8f4';
const BAR_W = 150;

// 关键帧折线采样：p∈[0,1] 映射到 kf 段内线性插值
const glitchAt = (kf: number[], p: number) => {
  const segs = kf.length - 1;
  const x = Math.min(segs - 1e-6, Math.max(0, p * segs));
  const i = Math.floor(x);
  return lerp(x - i, kf[i], kf[i + 1]);
};

// 短语居中填进 MAXCH 个固定槽位：左右对称补空格（槽位数不变 → 整行永不重排）
const padCenter = (s: string) => {
  const left = Math.floor((MAXCH - s.length) / 2);
  return ' '.repeat(left) + s + ' '.repeat(MAXCH - s.length - left);
};

export const GlitchCycle: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  const N = PHRASES.length;
  const slot = Math.min(N - 1, Math.floor(t * N));
  const p = t * N - slot; // 短语内进度 0..1
  const text = padCenter(PHRASES[slot]);
  const g = glitchAt(slot === N - 1 ? KF_LAST : KF, p);
  const bucket = Math.floor(frame / 2); // 乱码跳字节流：每 2 帧换一批随机字符
  // 整行抖动 + RGB 分离，强度跟随 glitch 概率
  const jx = (rand(bucket * 5 + slot) - 0.5) * g * 10;
  const jy = (rand(bucket * 9 + slot + 40) - 0.5) * g * 4;
  // 撕裂带：g>0.25 时行切三段，中段（随机高度 18–40%）按 g 横移
  const tear = g > 0.25;
  const bandTop = 15 + rand(bucket * 3 + 7) * 45;
  const bandH = 18 + rand(bucket * 11 + 3) * 22;
  const tearX = (rand(bucket * 13 + 5) - 0.5) * g * 22;
  const done = slot === N - 1 && g < 0.02 && p > 0.5; // 末条收干净后：状态点转实心

  const row = (dx: number, clip?: string, key?: string) => (
    <div
      key={key}
      style={{
        position: clip ? 'absolute' : 'relative',
        left: 0,
        top: 0,
        display: 'flex',
        transform: `translateX(${dx}px)`,
        clipPath: clip,
        textShadow:
          g > 0.04
            ? `${g * 3}px 0 rgba(255,70,110,${g * 0.75}), ${-g * 3}px 0 rgba(70,215,255,${g * 0.75}), 0 0 12px rgba(143,151,255,0.18)`
            : '0 0 12px rgba(143,151,255,0.16)',
      }}
    >
      {Array.from({ length: MAXCH }, (_, i) => {
        const ch = text[i];
        let content = ch;
        let color: string | undefined;
        if (ch !== ' ') {
          // 逐字符按种子掷 glitch：命中显示乱码 + 变色，未命中显示真字符
          const hit = rand(i * 31 + bucket * 17 + slot * 97) < g;
          if (hit) {
            content = POOL[Math.floor(rand(i * 131 + bucket * 7 + slot * 13) * POOL.length)];
            color = rand(i + bucket) > 0.5 ? ACCENT : '#4c5370';
          } else {
            color = INK;
          }
        }
        return (
          <span key={i} style={{ minWidth: '0.66em', textAlign: 'center', color }}>
            {content}
          </span>
        );
      })}
    </div>
  );

  const pct = Math.round(t * 100);
  return (
    <>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.42 }} accent="#5b63d3" vignette={0.6} grain={0} />
      <DesignStage bg="transparent">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              fontFamily: FONT.mono,
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: 3,
              lineHeight: 1.2,
              transform: `translate(${jx}px,${jy}px)`,
            }}
          >
            {tear ? (
              <>
                {/* 占位行（不可见）撑住尺寸，三段切片绝对定位叠上 */}
                <div style={{ visibility: 'hidden' }}>{row(0)}</div>
                {row(0, `inset(0 0 ${100 - bandTop}% 0)`, 'a')}
                {row(tearX, `inset(${bandTop}% -20px ${Math.max(0, 100 - bandTop - bandH)}% -20px)`, 'b')}
                {row(0, `inset(${Math.min(100, bandTop + bandH)}% 0 0 0)`, 'c')}
              </>
            ) : (
              row(0)
            )}
          </div>
        </div>
        {/* 底部进度条：随 t 匀速填满（全片唯一线性元素），四拍刻度 + 状态行 */}
        <div style={{ position: 'absolute', left: 240 - BAR_W / 2, top: '63%', width: BAR_W }}>
          <div
            style={{
              position: 'relative',
              height: 2,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${t * 100}%`,
                background: `linear-gradient(90deg, rgba(143,151,255,0.35) 0%, ${ACCENT} 100%)`,
                boxShadow: '0 0 6px rgba(143,151,255,0.6)',
              }}
            />
          </div>
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: (BAR_W * k) / 4 - 0.25,
                top: -1.5,
                width: 0.5,
                height: 5,
                background: t * 4 >= k ? 'rgba(143,151,255,0.9)' : 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 7,
              fontFamily: FONT.mono,
              fontSize: 8,
              letterSpacing: 1.2,
              color: 'rgba(228,232,244,0.5)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  boxSizing: 'border-box',
                  border: `0.75px solid ${ACCENT}`,
                  background: done ? ACCENT : g > 0.3 ? 'rgba(143,151,255,0.55)' : 'transparent',
                  boxShadow: done ? '0 0 5px rgba(143,151,255,0.8)' : undefined,
                }}
              />
              STEP {slot + 1}/{N}
            </span>
            <span style={{ color: done ? 'rgba(228,232,244,0.85)' : undefined }}>{String(pct).padStart(3, ' ')}%</span>
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.08} blend="soft-light" />
    </>
  );
};
