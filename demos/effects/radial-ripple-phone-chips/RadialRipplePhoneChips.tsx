// radial-ripple-phone-chips — Radial Ripple Chips 同心波纹手机（motion-lab 定稿转原生 Remotion）
// 浅灰底同心圆多层错相呼吸如水波，中央手机 mockup 屏内 feed 缓慢自动滚动，
// 两侧白色 chip 先后 spring pop 入场并悬浮。配色是中性灰阶 + 单一强调色
//（ACCENT 变量），落地时按项目品牌色替换。
// 设计坐标 480×270（DesignStage 等比放大，raster="zoom"：布局期放大，屏内小字按目标尺寸排版与光栅化），参数表数值以此坐标系标定。
// 质感：同心圆每层带受光上沿与发丝外缘（像水面一圈圈的反光）；手机是完整的硬件 mockup
//（金属边框渐变、灵动岛、侧键、玻璃斜反光、两层落地投影）且整机完整入画；
// 屏内是出版级假 feed（状态栏、大标题、带插画缩略图的条目）；chip 从手机侧边弹出（带图标）。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const RADIAL_RIPPLE_PHONE_CHIPS_DURATION = 168; // 5600ms @30fps

// 模板强调色：实际使用时按项目品牌色替换这一个变量
const ACCENT_RGB = '91,99,211'; // = #5b63d3，与 fixture 的唯一强调色一致
const SANS = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Inter,Arial,sans-serif';

// 同心圆（深灰→浅灰，从大到小叠放），phase 错相
const RCOL = ['#d9dce2', '#e1e4e9', '#e8eaee', '#eef0f3'];
const RSZ = [560, 440, 320, 210];
const RINGS = RSZ.map((size, i) => ({ size, color: RCOL[i], phase: i * 1.7 }));

// 手机：112×234 内容区 + 6px 边框 = 124×246，上下各留 12px 完整入画（原 132×264+14 超出 270 画高被裁）
const PHONE_W = 112;
const PHONE_H = 234;
const BEZEL = 6;
const CHIP_GAP = 76; // chip 贴手机外缘：半宽 62 + 14 间距（改手机宽度必须同步改这里）

// feed 条目：插画缩略图（强调色系的不同深浅 + 简单几何）+ 标题 + 元信息
const ITEMS = [
  { title: 'Morning run', meta: '5.2 km · 28 min', hue: 0 },
  { title: 'Design sync', meta: '10:30 · Studio', hue: 1 },
  { title: 'Groceries', meta: '12 items left', hue: 2 },
  { title: 'Deep Work', meta: 'Chapter 4', hue: 3 },
  { title: 'Standup', meta: '14:00 · Team', hue: 1 },
  { title: 'Lisbon trip', meta: '3 days · Nov', hue: 0 },
  { title: 'Water plants', meta: 'Every Sunday', hue: 2 },
  { title: 'Yoga', meta: '45 min · Calm', hue: 3 },
];
const THUMB = [
  `linear-gradient(135deg, rgba(${ACCENT_RGB},0.78), rgba(${ACCENT_RGB},0.46))`,
  'linear-gradient(135deg, #8f97a8, #c3c8d3)',
  `linear-gradient(135deg, rgba(${ACCENT_RGB},0.32), rgba(${ACCENT_RGB},0.14))`,
  'linear-gradient(135deg, #3a3c46, #6d7180)',
];

const Thumb: React.FC<{ i: number; hue: number }> = ({ i, hue }) => (
  <div style={{ position: 'relative', width: 28, height: 28, borderRadius: 7, background: THUMB[hue], overflow: 'hidden', flex: 'none' }}>
    {/* 插画几何：一枚圆 + 一道弧形地平线，位置按条目确定性错开 */}
    <div style={{ position: 'absolute', left: 5 + rand(i) * 11, top: 4 + rand(i + 9) * 6, width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.75)' }} />
    <div style={{ position: 'absolute', left: -8, right: -8, top: 18, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.28)' }} />
  </div>
);

const Feed: React.FC = () => (
  <div style={{ padding: '22px 8px 0', fontFamily: SANS, color: '#17181c' }}>
    <div style={{ fontSize: 5, fontWeight: 600, color: '#9b9da3', letterSpacing: '0.04em', marginLeft: 2 }}>THURSDAY, OCT 2</div>
    <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: '-0.03em', marginLeft: 2, marginTop: 1, lineHeight: 1.1 }}>Today</div>
    {/* 进度条：今日完成度 */}
    <div style={{ margin: '6px 2px 7px', height: 3, borderRadius: 2, background: '#ebebee' }}>
      <div style={{ width: '62%', height: '100%', borderRadius: 2, background: `rgb(${ACCENT_RGB})` }} />
    </div>
    {ITEMS.map((it, i) => (
      <div
        key={i}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: 5, marginBottom: 4, borderRadius: 9,
          background: '#ffffff', boxShadow: '0 0 0 0.5px rgba(20,22,28,0.07), 0 1px 2px rgba(16,18,24,0.05)',
        }}
      >
        <Thumb i={i} hue={it.hue} />
        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 5.8, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
          <div style={{ fontSize: 4.6, color: '#8b8d93', whiteSpace: 'nowrap', marginTop: 1.5, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.meta}</div>
        </div>
        <div
          style={{
            width: 7, height: 7, borderRadius: 4, boxSizing: 'border-box', flex: 'none', marginRight: 2,
            border: i % 3 === 0 ? 'none' : '0.8px solid #c9cad0', background: i % 3 === 0 ? `rgb(${ACCENT_RGB})` : 'transparent',
          }}
        />
      </div>
    ))}
  </div>
);

// chip 图标：强调色浅底小方块里一个线性图标
const ChipIcon: React.FC<{ kind: 'sync' | 'bell' }> = ({ kind }) => (
  <div
    style={{
      width: 15, height: 15, borderRadius: 4.5, background: `rgba(${ACCENT_RGB},0.12)`, flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={`rgb(${ACCENT_RGB})`} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'sync' ? (
        <>
          <path d="M20 11a8 8 0 0 0-14.3-4.6L4 8" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.3 4.6L20 16" />
          <path d="M20 20v-4h-4" />
        </>
      ) : (
        <>
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </>
      )}
    </svg>
  </div>
);

export const RadialRipplePhoneChips: React.FC = () => {
  const t = useT();
  // chip 先后 pop：scale 0.8→1 过冲 + 淡入 + 从手机一侧外移 6px 弹出，随后轻浮动
  const chipStyle = (t0: number, ph: number, side: -1 | 1): React.CSSProperties => {
    const p = seg(t, t0, t0 + 0.12, E.outBack);
    const slide = seg(t, t0, t0 + 0.12, E.outCubic);
    const fl = Math.sin(t * Math.PI * 2 * 2 + ph) * 3 * seg(t, t0 + 0.12, t0 + 0.3);
    return {
      opacity: seg(t, t0, t0 + 0.08),
      transform: `translateX(${(side * lerp(slide, -6, 0)).toFixed(3)}px) scale(${lerp(p, 0.8, 1)}) translateY(${fl}px)`,
      transformOrigin: side < 0 ? 'right center' : 'left center',
    };
  };
  const chipBase: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 11px 6px 6px',
    borderRadius: 999,
    background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfc 100%)',
    color: '#17181c',
    font: `600 12.5px ${SANS}`,
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    boxShadow:
      'inset 0 0.5px 0 rgba(255,255,255,1), 0 0 0 0.5px rgba(20,22,28,0.07), 0 1px 2px rgba(40,46,60,0.08), 0 10px 24px -6px rgba(40,46,60,0.24)',
  };
  return (
    <DesignStage bg="#eef0f3" raster="zoom">
      {/* 底色：上亮下暗的极低对比渐变（中心是波纹，四角轻压） */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #f3f4f6 0%, #eceef1 100%)', overflow: 'hidden' }}>
        {/* 同心圆各层错相极缓呼吸；每层受光上沿 + 白色发丝外缘，读作水面反光 */}
        {RINGS.map(({ size, color, phase }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: size,
              height: size,
              margin: `${-size / 2}px 0 0 ${-size / 2}px`,
              borderRadius: '50%',
              background: `linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%), ${color}`, // 上半受光略亮
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.75), 0 0 0 0.5px rgba(255,255,255,0.55), 0 -1px 6px rgba(255,255,255,0.35), 0 2px 10px rgba(60,70,90,${(0.05 + i * 0.01).toFixed(2)})`,
              transform: `scale(${1 + 0.06 * Math.sin(t * Math.PI * 2 * 1.5 + phase)})`,
            }}
          />
        ))}
        {/* 中心微亮：手机身后的一点柔光，把视觉重心收到中线 */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 30% 46% at 50% 48%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* 手机落地投影：贴近的实影 + 远处的大柔影（与手机分开画，避免被 overflow 裁） */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%', width: PHONE_W + BEZEL * 2, height: PHONE_H + BEZEL * 2,
            margin: `${-(PHONE_H + BEZEL * 2) / 2}px 0 0 ${-(PHONE_W + BEZEL * 2) / 2}px`, borderRadius: 22,
            boxShadow: '0 2px 4px rgba(40,46,60,0.16), 0 18px 34px -8px rgba(40,46,60,0.34), 0 34px 60px -20px rgba(40,46,60,0.22)',
          }}
        />
        {/* 侧键（机身外，左音量两枚 + 右电源） */}
        {[
          { side: -1, y: -64, h: 16 },
          { side: -1, y: -42, h: 16 },
          { side: 1, y: -52, h: 26 },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', top: '50%', left: '50%', width: 2, height: b.h, borderRadius: 1,
              marginTop: b.y, marginLeft: b.side < 0 ? -(PHONE_W / 2 + BEZEL) - 1.2 : PHONE_W / 2 + BEZEL - 0.8,
              background: 'linear-gradient(90deg, #2c2e35, #4a4c55)',
            }}
          />
        ))}

        {/* 手机 mockup：金属边框 + 屏内 feed 缓慢自动滚动 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: PHONE_W,
            height: PHONE_H,
            margin: `${-(PHONE_H + BEZEL * 2) / 2}px 0 0 ${-(PHONE_W + BEZEL * 2) / 2}px`,
            borderRadius: 22,
            background: 'linear-gradient(145deg, #3a3c44 0%, #1d1e23 38%, #121317 70%, #2a2c33 100%)',
            padding: BEZEL,
            // 原渲染无全局 border-box：宽高是内容尺寸，padding 外扩（Remotion 注入
            // 了 * { box-sizing:border-box }，这里显式还原 content-box 才对得上原片）
            boxSizing: 'content-box',
            boxShadow: 'inset 0 0 0 0.6px rgba(255,255,255,0.18), inset 0 0 0 1.6px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16.5, background: '#f6f6f8', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                transform: `translateY(${-seg(t, 0.08, 0.98) * 150}px)`,
              }}
            >
              <Feed />
            </div>
            {/* 状态栏：固定在顶，底下一层渐隐让滚上来的内容自然没入 */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 20, background: 'linear-gradient(180deg, rgba(246,246,248,1) 60%, rgba(246,246,248,0))' }} />
            <div style={{ position: 'absolute', left: 13, top: 6.5, font: `650 6px ${SANS}`, color: '#17181c', letterSpacing: '-0.01em' }}>9:41</div>
            <div style={{ position: 'absolute', right: 11, top: 7.5, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              {[2.5, 3.5, 4.5].map((h, i) => (
                <div key={i} style={{ width: 1.4, height: h, borderRadius: 0.5, background: '#17181c' }} />
              ))}
              <div style={{ marginLeft: 2, width: 9, height: 4.6, borderRadius: 1.4, border: '0.6px solid rgba(23,24,28,0.5)', boxSizing: 'border-box', padding: 0.6 }}>
                <div style={{ width: '72%', height: '100%', borderRadius: 0.6, background: '#17181c' }} />
              </div>
            </div>
            {/* 灵动岛 */}
            <div style={{ position: 'absolute', left: '50%', top: 5, width: 30, height: 8.5, marginLeft: -15, borderRadius: 5, background: '#0b0b0d' }} />
            {/* 玻璃斜反光：静态，一道极淡的对角高光 */}
            <div
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(118deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.16) 42%, rgba(255,255,255,0) 54%)',
              }}
            />
            {/* 底部 home 条 */}
            <div style={{ position: 'absolute', left: '50%', bottom: 4, width: 38, height: 2, marginLeft: -19, borderRadius: 1, background: 'rgba(23,24,28,0.7)' }} />
          </div>
        </div>

        {/* 两侧 chip：左先右后 spring pop，从手机侧边弹出 */}
        <div style={{ ...chipBase, top: '38%', right: `calc(50% + ${CHIP_GAP}px)`, ...chipStyle(0.22, 0, -1) }}>
          <ChipIcon kind="sync" />
          Offline sync
        </div>
        <div style={{ ...chipBase, top: '56%', left: `calc(50% + ${CHIP_GAP}px)`, ...chipStyle(0.4, 1.8, 1) }}>
          <ChipIcon kind="bell" />
          Smart reminders
        </div>

        {/* 四角极轻压暗 */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 75% 80% at 50% 48%, rgba(42,48,64,0) 55%, rgba(42,48,64,0.10) 100%)',
          }}
        />
      </div>
    </DesignStage>
  );
};
