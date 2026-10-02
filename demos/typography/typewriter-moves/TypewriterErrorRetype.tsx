// typewriter-error-retype｜打字机误删重打
// 浅底居中大字：f2 起 2f/字符打出 "just a dashboard"(16 字符) → f32–48 停顿
// 16f(光标闪两下=犹豫) → f48 起 1.5f/字符逐字退格删掉 "a dashboard"(11 字符，
// 字符直接消失) → f68 起 1.5f/字符果断打出 "your command center"(19 字符，
// f95 打完) → 光标闪两个周期(10f/周期)后 f110 永久熄灭。节奏三档：打 2f/删
// 1.5f/重打 1.5f 且无停顿。打完的同时（f96–110，与光标完稿两闪并行）一道强调色马克笔底色
// 从左到右铺到 "command center" 下半身给宣言一个落定；f110 后全静止，160f 总长 → 收尾真静止 50f。
// 等宽感：逐字符固定宽 span（等宽字体 100px，60px 槽），无 letter-spacing 动画。全部帧确定。
// 质感：柔光底 + 颗粒，主墨色近黑，光标是 6px 强调色圆角竖条。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp } from '../../_fixtures/Polish';

export const TYPEWRITER_ERROR_RETYPE_DURATION = 160;

const TEXT1 = 'just a dashboard'; // 16 chars
const KEEP = 5; // "just " 保留
const DEL = TEXT1.length - KEEP; // 11 chars 待删
const TEXT2 = 'your command center'; // 19 chars

const T1 = 2; // 第一遍打字起点，2f/字符
const PAUSE_START = T1 + (TEXT1.length - 1) * 2; // f32 打完
const DS = PAUSE_START + 16; // f48 开删，1.5f/字符
const RS = 68; // 重打起点，1.5f/字符（删完 f64.5 后小顿 3.5f）
const TYPE2_END = RS + (TEXT2.length - 1) * 1.5; // f95 打完
const CURSOR_OFF = 115; // 两个 10f 闪烁周期后熄灭（最后一次视觉变化 f110）

const SIZE = 100; // 字号
const CHAR_W = 60; // 等宽字体 100px 的字符宽（0.6em）
const LEFT = (1920 - 24 * CHAR_W) / 2; // 最终句 24 字符整体居中，打字过程左缘锚定不横移
const HL_START = 96; // 马克笔底色起：打完即铺，和完稿两闪同时，f110 前铺完
const HL_DUR = 14;
const HL_FROM = 10; // "command center" 起始字符序号
const HL_LEN = 14;

// 光标可见性：打字/删除时常亮；停顿段 8f 周期闪两下；打完后 10f 周期闪两下；之后永灭
const cursorOn = (f: number): boolean => {
  if (f >= CURSOR_OFF) return false;
  if (f >= TYPE2_END) {
    // f95 起：on[95,100) off[100,105) on[105,110) off[110,115)
    return Math.floor((f - TYPE2_END) / 5) % 2 === 0;
  }
  if (f >= DS) return true; // 删除 + 重打：常亮（果断）
  if (f >= PAUSE_START) {
    // 犹豫段 f32–48：on[32,36) off[36,40) on[40,44) off[44,48)
    return Math.floor((f - PAUSE_START) / 4) % 2 === 0;
  }
  return true; // 第一遍打字：常亮
};

export const TypewriterErrorRetype: React.FC = () => {
  const f = useCurrentFrame();

  // 第一遍已打出字符数
  const n1 = f < T1 ? 0 : Math.min(TEXT1.length, Math.floor((f - T1) / 2) + 1);
  // 已删除字符数（从尾部删）
  const removed = f < DS ? 0 : Math.min(DEL, Math.floor((f - DS) / 1.5) + 1);
  // 第二遍已打出字符数
  const n2 = f < RS ? 0 : Math.min(TEXT2.length, Math.floor((f - RS) / 1.5) + 1);

  const shown =
    TEXT1.slice(0, Math.max(KEEP, n1 - removed)).slice(0, n1) +
    TEXT2.slice(0, n2);

  const chars = shown.split('');

  const hl = ramp(f, HL_START, HL_DUR, EASE.snappy);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.3 }} accent="#5b63d3" />
      {/* 马克笔底色：只铺在宣言词下半身，左→右 */}
      {hl > 0 && (
        <div style={{
          position: 'absolute', left: LEFT + HL_FROM * CHAR_W - 10, top: 540 + SIZE * 0.06,
          width: (HL_LEN * CHAR_W + 20) * hl, height: SIZE * 0.36, borderRadius: 6,
          background: 'linear-gradient(90deg, rgba(91,99,211,0.26) 0%, rgba(91,99,211,0.20) 100%)',
        }} />
      )}
      {/* 眉题：与打字行左缘对齐，开场 10f 淡入，交代"这是一句产品介绍" */}
      <div style={{
        position: 'absolute', left: LEFT + 6, top: 540 - SIZE * 0.55 - 70,
        fontFamily: FONT.sans, fontSize: 34, fontWeight: 500, letterSpacing: '0.01em', color: G.ink3,
        opacity: ramp(f, 0, 10, EASE.out),
      }}>
        Introducing Acme Console
      </div>
      {/* 左缘锚定：打字过程不横移（真打字机感）；行垂直居中于 540 */}
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: 540 - (SIZE * 1.1) / 2,
          display: 'flex',
          alignItems: 'center',
          height: SIZE * 1.1,
        }}
      >
        {chars.map((c, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: CHAR_W,
              textAlign: 'center',
              fontFamily: FONT.mono,
              fontSize: SIZE,
              fontWeight: 600,
              color: G.ink1,
              lineHeight: 1.1,
            }}
          >
            {c === ' ' ? '\u00a0' : c}
          </span>
        ))}
        {/* 光标：强调色竖条，条件挂载而非 opacity 0 */}
        {cursorOn(f) && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: SIZE * 0.98,
              marginLeft: 4,
              borderRadius: 3,
              background: G.accent,
              boxShadow: '0 0 12px rgba(91,99,211,0.35)',
            }}
          />
        )}
      </div>
    </div>
  );
};
