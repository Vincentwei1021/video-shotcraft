// glitch-cycle — 乱码轮播：同一行等宽槽位循环轮播 4 条状态短语，每条头尾按概率关键帧
// [1,0,0,0.1,0,0,1] 全乱码、中段偶发单字抖动，切换瞬间叠 RGB 分离、整行位移与水平撕裂；
// 末条概率收 0 保证收尾干净。
//
// 第二轮重设计（极光夜 · 渲染控制台）：
// - look = aurora（深紫黑 · 紫 · 粉）。原生 1920 作画：短语是 104px 等宽大写、固定 17 个槽位
//   （短语居中补空格，字符不增删、整行永不重排），四角细括号框住槽位，像一块广播级状态屏。
// - 噪声浓度 g 一个变量同时驱动：逐字换乱码（粉 / 暗紫）、整行横向抖动（±g·36px，纵向只 ±g·10）、
//   RGB 分离（粉左 / 冰蓝右各 g·10px）、g>0.25 的水平撕裂带（中段横移 ±g·80px）、g>0.45 的 3 块
//   像素块残影——所以几种故障永不打架。每 2f 重掷一次（1f 一换糊成灰带，4f 以上看得清是另一个词）。
// - 上方状态行（脉冲点 + RENDERING · shotcraft/launch-film · #4127）、下方 1100px 进度轨（线性走满，四拍刻度 +
//   发光头）+ STEP n/4 与百分比（tabular-nums）——给噪声一个稳定的"在推进"参照。
// - 收尾：末条 READY TO SHIP 收干净的那一刻给一次柔和泛光（Q4：只给主角一次），进度到 100% 后
//   状态行转 RENDERED、脉冲点转实心，下方升起一行强调色署名（镜刻标志 + video-shotcraft）；最后 ~28f 干净海报。
//
// 时间表（30fps，共 168f）：每条短语 38f（乱 → 定 → 0.1 抽字 → 定 → 乱熔进下一条）
//   0–38    STORYBOARDING（第 0 帧即满乱码 = 开场就有画面）
//   38–76   LOCKING BEAT GRID
//   76–114  RENDERING FRAMES
//   114–168 READY TO SHIP：按 38f 走 KF_LAST，~139f 起干净；进度 0→100% 线性走到 140f
//   140–168 RENDERED 状态 + 署名升起 + hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const GLITCH_CYCLE_DURATION = 168;

const L = LOOKS.aurora;
// video-shotcraft 渲染一支宣传片的四步；最长 17 字符（LOCKING BEAT GRID）= 槽位数，别超
const PHRASES = ['STORYBOARDING', 'LOCKING BEAT GRID', 'RENDERING FRAMES', 'READY TO SHIP'];
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&<>/\\';
const KF = [1, 0, 0, 0.1, 0, 0, 1];
const KF_LAST = [1, 0, 0, 0.1, 0, 0, 0];
const MAXCH = Math.max(...PHRASES.map((p) => p.length));
const SLOT = 38; // 每条短语帧数（末条之后一直延续到片尾）
const DONE = 140; // 进度走满帧
const SIZE = 104;
const CELL = 0.64; // 槽宽（em）
const SPLIT_A = '#ff4fa3'; // RGB 分离：粉
const SPLIT_B = '#6fd8ff'; // RGB 分离：冰蓝
const BAR_W = 1100;

const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const glitchAt = (kf: number[], p: number) => {
  const segs = kf.length - 1;
  const x = Math.min(segs - 1e-6, Math.max(0, p * segs));
  const i = Math.floor(x);
  return kf[i] + (kf[i + 1] - kf[i]) * (x - i);
};
const padCenter = (s: string) => {
  const left = Math.floor((MAXCH - s.length) / 2);
  return ' '.repeat(left) + s + ' '.repeat(MAXCH - s.length - left);
};

export const GlitchCycle: React.FC = () => {
  const frame = useCurrentFrame();
  const N = PHRASES.length;
  const slot = Math.min(N - 1, Math.floor(frame / SLOT));
  const p = Math.min(1, (frame - slot * SLOT) / SLOT);
  const text = padCenter(PHRASES[slot]);
  const g = glitchAt(slot === N - 1 ? KF_LAST : KF, p);
  const bucket = Math.floor(frame / 2);

  const jx = (rand(bucket * 5 + slot) - 0.5) * g * 36;
  const jy = (rand(bucket * 9 + slot + 40) - 0.5) * g * 10;
  const tear = g > 0.25;
  const bandTop = 12 + rand(bucket * 3 + 7) * 50;
  const bandH = 16 + rand(bucket * 11 + 3) * 24;
  const tearX = (rand(bucket * 13 + 5) - 0.5) * g * 160;
  const split = g * 10;

  const prog = Math.min(1, frame / DONE);
  const done = frame >= DONE;
  const landed = slot === N - 1 && p > 0.66; // 末条干净
  const bloom = landed ? Math.max(0, 1 - (frame - (slot * SLOT + SLOT * 0.66)) / 26) : 0;
  const link = ramp(frame, DONE + 2, 16, EASE.snappy);
  const pulse = 0.55 + 0.45 * Math.sin(frame / 4);
  const intro = ramp(frame, 0, 14, EASE.out);

  const row = (dx: number, clip?: string, key?: string) => (
    <div key={key} style={{
      position: clip ? 'absolute' : 'relative', left: 0, top: 0, display: 'flex',
      transform: `translateX(${dx.toFixed(1)}px)`, clipPath: clip,
      textShadow: g > 0.04
        ? `${split.toFixed(1)}px 0 ${alpha(SPLIT_A, 0.8 * Math.min(1, g * 1.4))}, ${(-split).toFixed(1)}px 0 ${alpha(SPLIT_B, 0.8 * Math.min(1, g * 1.4))}`
        : `0 0 ${(20 + 40 * bloom).toFixed(0)}px ${alpha(L.accent, 0.25 + 0.45 * bloom)}`,
    }}>
      {Array.from({ length: MAXCH }, (_, i) => {
        const ch = text[i];
        let content = ch;
        let color: string = L.ink;
        if (ch !== ' ') {
          const hit = rand(i * 31 + bucket * 17 + slot * 97) < g;
          if (hit) {
            content = POOL[Math.floor(rand(i * 131 + bucket * 7 + slot * 13) * POOL.length)];
            color = rand(i + bucket) > 0.5 ? L.accent2 : L.ink3;
          }
        }
        return <span key={i} style={{ width: `${CELL}em`, textAlign: 'center', color, display: 'inline-block' }}>{content}</span>;
      })}
    </div>
  );

  // 像素块残影：g 高时 3 块小矩形在槽位里闪现（每 2f 重掷）
  const blocks = g > 0.45
    ? Array.from({ length: 3 }, (_, k) => ({
      x: rand(bucket * 19 + k * 7) * 100, y: rand(bucket * 23 + k * 5) * 90,
      w: 4 + rand(bucket * 29 + k) * 14, h: 6 + rand(bucket * 31 + k) * 14, c: k % 2 ? SPLIT_B : SPLIT_A,
    }))
    : [];

  const slotW = MAXCH * CELL * SIZE;

  return (
    <AbsoluteFill>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.45 }} fill={{ x: 0.82, y: 0.12 }} breathe={0.4} vignette={0.65}>
        {/* 信号带：短语背后一条横向柔光 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 380, height: 300,
          background: `radial-gradient(ellipse 45% 50% at 50% 50%, ${alpha(L.accent, 0.16 + 0.1 * g)} 0%, ${alpha(L.accent, 0)} 70%)`,
        }} />
        {/* 扫描线（静态、极淡） */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          background: `repeating-linear-gradient(180deg, ${alpha('#000000', 0)} 0px, ${alpha('#000000', 0)} 3px, ${alpha('#000000', 0.22)} 4px)`,
        }} />
      </Stage>

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: slotW, opacity: intro }}>
          {/* 状态行 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 18, marginBottom: 54, fontFamily: FONT.mono, fontSize: 30,
            letterSpacing: '0.14em', color: L.ink2,
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: 7, boxSizing: 'border-box', border: `2px solid ${L.accent2}`,
              background: done ? L.accent2 : alpha(L.accent2, pulse * 0.8),
              boxShadow: `0 0 ${done ? 16 : 10 * pulse}px ${alpha(L.accent2, 0.7)}`,
            }} />
            <span style={{ color: done ? L.ink : L.ink2, fontWeight: 600 }}>{done ? 'RENDERED' : 'RENDERING'}</span>
            <span style={{ color: L.ink3 }}>·</span>
            <span>shotcraft/launch-film</span>
            <span style={{ marginLeft: 'auto', color: L.ink3 }}>#4127</span>
          </div>

          {/* 槽位：四角括号 + 短语 */}
          <div style={{ position: 'relative', padding: '30px 0' }}>
            {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([rx, ry], k) => (
              <div key={k} style={{
                position: 'absolute', width: 30, height: 30, left: rx ? undefined : -36, right: rx ? -36 : undefined,
                top: ry ? undefined : 0, bottom: ry ? 0 : undefined,
                borderLeft: rx ? undefined : `2px solid ${alpha(L.ink, 0.35)}`, borderRight: rx ? `2px solid ${alpha(L.ink, 0.35)}` : undefined,
                borderTop: ry ? undefined : `2px solid ${alpha(L.ink, 0.35)}`, borderBottom: ry ? `2px solid ${alpha(L.ink, 0.35)}` : undefined,
              }} />
            ))}
            <div style={{
              position: 'relative', fontFamily: FONT.mono, fontSize: SIZE, fontWeight: 600, lineHeight: 1.1,
              transform: `translate(${jx.toFixed(1)}px,${jy.toFixed(1)}px)`, whiteSpace: 'pre',
            }}>
              {tear ? (
                <>
                  <div style={{ visibility: 'hidden' }}>{row(0)}</div>
                  {row(0, `inset(0 -200px ${100 - bandTop}% -200px)`, 'a')}
                  {row(tearX, `inset(${bandTop}% -200px ${Math.max(0, 100 - bandTop - bandH)}% -200px)`, 'b')}
                  {row(0, `inset(${Math.min(100, bandTop + bandH)}% -200px 0 -200px)`, 'c')}
                </>
              ) : row(0)}
              {blocks.map((b, k) => (
                <div key={k} style={{
                  position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: b.w * 4, height: b.h * 2,
                  background: alpha(b.c, 0.55), mixBlendMode: 'screen',
                }} />
              ))}
            </div>
          </div>

          {/* 进度轨：线性走满（全片唯一线性元素），四拍刻度 + 发光头 */}
          <div style={{ position: 'relative', marginTop: 56, width: BAR_W, marginLeft: (slotW - BAR_W) / 2, height: 4, borderRadius: 2, background: alpha(L.ink, 0.1) }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, borderRadius: 2,
              background: `linear-gradient(90deg, ${alpha(L.accent, 0.3)} 0%, ${L.accent} 70%, ${L.accent2} 100%)`,
              boxShadow: `0 0 14px ${alpha(L.accent, 0.6)}`,
            }} />
            {[1, 2, 3].map((k) => {
              const x = (k * SLOT) / DONE;
              return (
                <div key={k} style={{
                  position: 'absolute', left: `${x * 100}%`, top: -7, width: 2, height: 18, marginLeft: -1,
                  background: prog >= x ? L.accent : alpha(L.ink, 0.25),
                }} />
              );
            })}
            <div style={{
              display: 'flex', justifyContent: 'space-between', position: 'absolute', left: 0, right: 0, top: 30,
              fontFamily: FONT.mono, fontSize: 32, letterSpacing: '0.1em', color: L.ink2, fontVariantNumeric: 'tabular-nums',
            }}>
              <span>STEP {slot + 1}/{N}</span>
              <span style={{ color: done ? L.ink : L.ink2 }}>{String(Math.round(prog * 100)).padStart(3, ' ')}%</span>
            </div>
          </div>

          {/* 收尾署名：镜刻标志 + 品牌名 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: -170, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 16, fontFamily: FONT.sans, fontSize: 40,
            fontWeight: 600, letterSpacing: '-0.01em', color: L.accent, opacity: link, transform: `translateY(${(1 - link) * 24}px)`,
          }}>
            <ShotcraftMark size={48} tone="dark" />
            <span>Crafted with {BRAND.name}</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
