// scramble — Scramble Decode 乱码锁定（motion-lab 定稿转原生 Remotion）
// 每个字符先高速随机跳字（种子驱动、可复现），再从左到右逐个"锁定"为真字符，
// 锁定瞬间闪一下高亮辉光。与 typewriter 的顺序打字完全不同的质感——黑客/解密感。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
//
// 质感升级：
// - raster="zoom"：字形按 1080p 目标尺寸光栅化；字号 34→28 让整行留出安全边距（原来几乎顶满画幅）。
// - 乱码层有"运算感"：每个未锁字的亮度随重掷闪烁（种子驱动），锁定前沿 2 个字提亮成冷青色，
//   像解算头扫过去；锁定瞬间字形 1.14→1 轻压 + 青白光晕在 ~3f 内衰完。
// - 暗场 Backdrop（带冷色余光）+ 文字背后一条随锁定进度增亮的柔光带 + 颗粒，替代 #07080c 平铺。
// - 锁定窗前移到 0.22→0.76，末字落定后留 ~14f 完整句静置。
import React from 'react';
import { DesignStage, rand, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, Grain } from '../../_fixtures/Polish';

export const SCRAMBLE_DURATION = 96; // 3200ms @30fps

const TEXT = 'AUTOPILOT NOW ONLINE'; // 20 字符（贴近参数表的 20 字节拍）
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\';
const CHARS = [...TEXT];
const N = CHARS.length;

const LOCK_START = 0.22; // 首字锁定
const LOCK_SPAN = 0.54; // 线性铺开宽度（末字基准 0.76）
const LOCK_JITTER = 0.06; // 每字随机延后 ≤6f
const FLASH = 0.035; // 锁定闪光窗（≈3f）

const lockAtOf = (i: number) => LOCK_START + (i / N) * LOCK_SPAN + rand(i * 7) * LOCK_JITTER;

export const Scramble: React.FC = () => {
  const t = useT();
  const frame = Math.floor(t * 96);

  // 已锁定比例 → 背后光带亮度
  let locked = 0;
  let nonSpace = 0;
  let front = -1; // 下一个待锁定字的序号（锁定前沿）
  CHARS.forEach((ch, i) => {
    if (ch === ' ') return;
    nonSpace++;
    if (t >= lockAtOf(i)) locked++;
    else if (front < 0) front = i;
  });
  const power = EASE.out(locked / Math.max(1, nonSpace));
  const boot = seg(t, 0.04, 0.2, EASE.out); // 噪声起手时光带先微亮

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#07080c' }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.46 }} vignette={0.6} grain={0} />
      {/* 文字背后的柔光带：锁得越多越亮（"系统上电"） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1500,
          height: 300,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(80,160,255,0.16), rgba(80,160,255,0) 70%)',
          opacity: 0.25 * boot + 0.75 * power,
        }}
      />
      <DesignStage bg="transparent" raster="zoom">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT.mono,
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: 2,
          }}
        >
          {CHARS.map((ch, i) => {
            let content: string = ch;
            let color = '#3d4560';
            let textShadow = 'none';
            let scale = 1;
            if (ch !== ' ') {
              // 锁定时刻：从左到右基础 stagger + 种子微扰
              const lockAt = lockAtOf(i);
              if (t < 0.06) {
                content = ' '; // 开场短暂空白
              } else if (t < lockAt) {
                // 高速跳字：每 2 帧换一个随机字符；亮度随每次重掷在 0.55–1 之间闪烁
                const bucket = Math.floor(frame / 2);
                content = POOL[Math.floor(rand(i * 131 + bucket) * POOL.length)];
                const flick = 0.55 + 0.45 * rand(i * 53 + bucket * 3 + 11);
                // 锁定前沿（下两个待锁字）：提亮成冷青色，像解算头扫过
                const lead = front >= 0 ? i - front : 99;
                if (lead >= 0 && lead < 2 && t > LOCK_START - 0.04) {
                  color = lead === 0 ? '#7cc4ff' : '#4f7fb8';
                  textShadow = lead === 0 ? '0 0 6px rgba(90,170,255,0.45)' : 'none';
                } else {
                  const a = (0.55 * flick).toFixed(3);
                  color = `rgba(110,124,170,${a})`;
                }
              } else {
                // 锁定为真字符：~3f 青白闪 + 字形 1.14→1 轻压，随后落回暖白
                const k = seg(t, lockAt, lockAt + FLASH);
                const flash = 1 - k;
                const settle = seg(t, lockAt, lockAt + FLASH * 1.8, EASE.out);
                scale = 1.14 - 0.14 * settle;
                color = flash > 0.35 ? '#e6f6ff' : '#eceef3';
                textShadow =
                  flash > 0.01
                    ? `0 0 ${(flash * 14).toFixed(2)}px rgba(120,200,255,${(flash * 0.9).toFixed(3)}), 0 0 ${(flash * 4).toFixed(2)}px rgba(220,240,255,${flash.toFixed(3)})`
                    : '0 0 10px rgba(140,190,255,0.10)';
              }
            }
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  minWidth: '0.62em',
                  textAlign: 'center',
                  color,
                  textShadow,
                  transform: scale !== 1 ? `scale(${scale.toFixed(4)})` : undefined,
                }}
              >
                {content === ' ' ? ' ' : content}
              </span>
            );
          })}
        </div>
      </DesignStage>
      {/* 颗粒放在最上层，按 1080p 尺度（不随 DesignStage 放大变粗） */}
      <Grain opacity={0.07} blend="soft-light" />
    </div>
  );
};

