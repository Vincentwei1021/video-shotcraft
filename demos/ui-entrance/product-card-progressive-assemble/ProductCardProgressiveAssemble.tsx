// product-card-progressive-assemble — Progressive Assemble 字段逐个落位（motion-lab 定稿转原生 Remotion）
// 详情卡像被逐字段抓取般自建：图→标题→breadcrumb pill 依次 pop→价格出现后被划线降级、
// 强调色新价 spring 跳出→正文逐行揭示+强调色高亮块由左向右刷过→色卡点亮。
// 整卡极慢 scale 前推保持呼吸。设计坐标 480×270（DesignStage zoom 放大，字形按目标尺寸光栅化）。
// 质感层：暗场柔光底 + 暗角 + 颗粒在 DesignStage 之外按 1920 原生铺（颗粒不被放大成色块）；
// 卡面 1 设计 px = 4 输出 px，所以发丝线/内高光都用 0.25 设计 px 书写。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, Grain } from '../../_fixtures/Polish';

export const PRODUCT_CARD_PROGRESSIVE_ASSEMBLE_DURATION = 150; // 5000ms @30fps

const ACCENT = '#f2621c'; // 唯一色相：新价文字 + 两块马克笔高亮 + 折扣 chip
const ACCENT_SOFT = 'rgba(255,128,48,.30)';
const INK = '#17181c';
const INK2 = '#5d5f66';
const INK3 = '#9a9da6';
const HAIR = 'rgba(20,22,28,.09)';

const F = (f: number) => f / 60; // recipe 帧 → t

// 字段落位样式：rise = 上移 6px + 1.1px→0 失焦淡入；pop = 0.4→1 过冲弹出
// 共享同一条 0.1 行程；rise 用强 ease-out（snappy），pop 用 overshoot（冲过 ~8% 回落）
const fieldStyle = (t: number, f0: number, mode: 'rise' | 'pop' = 'rise'): React.CSSProperties => {
  const p = Math.min(1, Math.max(0, (t - F(f0)) / 0.1));
  const k = EASE.snappy(p);
  const blur = lerp(Math.min(1, p * 2.2), 1.1, 0);
  return {
    opacity: Math.min(1, p * 2.4),
    filter: blur > 0.02 ? `blur(${blur.toFixed(2)}px)` : undefined,
    transform:
      mode === 'pop' ? `scale(${lerp(EASE.overshoot(p), 0.4, 1)})` : `translateY(${lerp(k, 6, 0).toFixed(3)}px)`,
  };
};

// 描述行：[文本, 是否马克笔高亮]
const LINES: [string, boolean?][][] = [
  [['Ripstop shell, '], ['padded 16″ laptop sleeve', true], [',']],
  [['magnetic straps and '], ['all-day back support', true], ['.']],
  [['Fits under most airline seats for travel.']],
];

const SWATCHES: [string, string][] = [
  ['#24262c', 'Graphite'],
  ['#a7a196', 'Stone'],
  ['#36557f', 'Harbor'],
];

// 商品图：棚拍渐变底 + 地面接触影 + 矢量双肩包（主光左上，高光与阴影同向）
const Backpack: React.FC<{ t: number }> = ({ t }) => {
  // 图在字段落位后再慢慢收 1.06→1（内容比框晚落定，读作"镜头对焦到商品"）
  const settle = seg(t, 0, 0.42, EASE.out);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 7 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 34% 22%, #f4f2ed 0%, #e3e0d8 58%, #d6d2c8 100%)' }} />
      {/* 地平线：极淡的无缝背景纸转折 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '71%', bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.035), rgba(0,0,0,0))' }} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${lerp(settle, 1.06, 1).toFixed(4)})`, transformOrigin: '50% 80%' }}>
        {/* 接触影：近地小而实 + 外圈大而虚 */}
        <div style={{ position: 'absolute', left: '24%', width: '52%', top: '80.6%', height: '5.6%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(20,18,14,.34), rgba(20,18,14,0))' }} />
        <div style={{ position: 'absolute', left: '12%', width: '76%', top: '78.5%', height: '11%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(20,18,14,.12), rgba(20,18,14,0))' }} />
        <svg viewBox="0 0 100 130" style={{ position: 'absolute', left: '17%', top: '9%', width: '66%', height: '78%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="pcpa-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3c404b" />
              <stop offset="0.55" stopColor="#262930" />
              <stop offset="1" stopColor="#17191e" />
            </linearGradient>
            <linearGradient id="pcpa-pocket" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0" stopColor="#353943" />
              <stop offset="1" stopColor="#1c1e24" />
            </linearGradient>
            <linearGradient id="pcpa-rim" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="0.22" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {/* 提手 */}
          <path d="M41,15 C41,4 59,4 59,15" fill="none" stroke="#1d1f25" strokeWidth={3.4} strokeLinecap="round" />
          {/* 肩带侧影 */}
          <path d="M23,30 C16,56 16,92 20,116" fill="none" stroke="#14161a" strokeWidth={5} strokeLinecap="round" />
          <path d="M77,30 C84,56 84,92 80,116" fill="none" stroke="#14161a" strokeWidth={5} strokeLinecap="round" />
          {/* 包身 */}
          <path d="M21,34 C21,16 33,12 50,12 C67,12 79,16 79,34 L81,113 C81,120 76,124 69,124 L31,124 C24,124 19,120 19,113 Z" fill="url(#pcpa-body)" />
          <path d="M21,34 C21,16 33,12 50,12 C67,12 79,16 79,34 L81,113 C81,120 76,124 69,124 L31,124 C24,124 19,120 19,113 Z" fill="url(#pcpa-rim)" />
          {/* 主拉链弧 + 拉头 */}
          <path d="M25,38 C36,29 64,29 75,38" fill="none" stroke="#4d5361" strokeWidth={1.1} strokeLinecap="round" strokeDasharray="1.4 1" />
          <rect x={63.5} y={31.5} width={3} height={7} rx={1.4} fill="#7c8392" transform="rotate(18 65 35)" />
          {/* 前袋 */}
          <rect x={28} y={70} width={44} height={44} rx={9} fill="url(#pcpa-pocket)" />
          <path d="M31,73.5 L69,73.5" stroke="#4d5361" strokeWidth={1} strokeLinecap="round" strokeDasharray="1.4 1" />
          <rect x={36} y={72} width={6.5} height={3.2} rx={1.5} fill="#7c8392" />
          <rect x={28} y={70} width={44} height={44} rx={9} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.6} />
          {/* 品牌织标 */}
          <rect x={44} y={52} width={12} height={5} rx={1.2} fill="#ec6a2a" opacity={0.92} />
          <rect x={44} y={52} width={12} height={1.1} rx={0.5} fill="rgba(255,255,255,0.35)" />
        </svg>
      </div>
    </div>
  );
};

export const ProductCardProgressiveAssemble: React.FC = () => {
  const t = useT();
  // 整卡呼吸前推：缓起缓收（不对称 in-out），摊在前 75%
  const push = seg(t, 0, 0.75, (x) => EASE.swift(x));
  // 卡面本身在头 6f 从 0.985 + 失焦淡入（不是凭空"已经在那里"）
  const base = seg(t, 0, 0.045, E.outCubic);
  // 价格降级（f=26）：旧价 6f 内缩小变灰、划线从左划过；新价 spring 跳出
  const cutK = seg(t, F(26), F(26) + 0.04, EASE.snappy);
  const strike = seg(t, F(26), F(26) + 0.035, EASE.out);
  const nk = seg(t, F(26) + 0.006, F(26) + 0.126);
  const chip = Math.min(1, Math.max(0, (t - F(29)) / 0.08));
  return (
    <AbsoluteFill>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.08 }} accent={ACCENT} grain={0} vignette={0.55} />
      <DesignStage bg="transparent" raster="zoom">
        {/* 卡底地面影：随前推轻微扩散 */}
        <div
          style={{
            position: 'absolute', left: '17%', right: '17%', top: '84%', height: '10%', borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(0,0,0,.55), rgba(0,0,0,0))',
            opacity: base * 0.9, transform: `scale(${lerp(push, 1, 1.08)})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '78%',
            height: '74%',
            transform: `translate(-50%,-50%) scale(${(lerp(push, 1, 1.06) * lerp(base, 0.985, 1)).toFixed(5)})`,
            opacity: base,
            background: 'linear-gradient(180deg, #fbfaf8 0%, #f4f3ef 100%)',
            borderRadius: 12,
            boxShadow:
              'inset 0 0.25px 0 rgba(255,255,255,1), 0 0 0 0.25px rgba(0,0,0,.35), 0 0.6px 1.4px rgba(0,0,0,.30), 0 14px 32px -8px rgba(0,0,0,.62)',
            fontFamily: FONT.sans,
            display: 'flex',
            padding: '4.5%',
            boxSizing: 'border-box',
            gap: '5%',
          }}
        >
          {/* 左：商品图（f=0 rise 落位） */}
          <div
            style={{
              flex: '0 0 38%',
              borderRadius: 7,
              position: 'relative',
              boxShadow: `0 0 0 0.25px ${HAIR}`,
              ...fieldStyle(t, 0),
            }}
          >
            <Backpack t={t} />
          </div>
          {/* 右列 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* 品牌眉标 + 标题（f=4） */}
            <div style={fieldStyle(t, 4)}>
              <div style={{ fontSize: 6.5, fontWeight: 650, letterSpacing: '0.14em', color: INK3, marginBottom: 3 }}>NORTHLINE GOODS</div>
              <div style={{ fontSize: 18, fontWeight: 720, color: INK, letterSpacing: '-0.022em', lineHeight: 1.05, whiteSpace: 'nowrap' }}>
                Transit Daypack 22L
              </div>
            </div>
            {/* breadcrumb pills（f=8 起每 2 帧一个 pop） */}
            <div style={{ display: 'flex', gap: 4, margin: '7px 0 8px', alignItems: 'center' }}>
              {['Bags', 'Backpacks', 'Commuter'].map((txt, i) => (
                <div
                  key={txt}
                  style={{
                    fontSize: 7.5,
                    fontWeight: 560,
                    color: i === 2 ? INK : INK2,
                    background: i === 2 ? '#ffffff' : '#ecebe7',
                    boxShadow: i === 2 ? `inset 0 0 0 0.25px rgba(20,22,28,.16), 0 0.4px 1px rgba(20,22,28,.08)` : `inset 0 0 0 0.25px ${HAIR}`,
                    padding: '2.5px 7px',
                    borderRadius: 99,
                    letterSpacing: '0.005em',
                    transformOrigin: 'left center',
                    ...fieldStyle(t, 8 + i * 2, 'pop'),
                  }}
                >
                  {txt}
                </div>
              ))}
            </div>
            {/* 价格行（f=16）：f=26 起旧价降级、新价 spring 跳出、折扣 chip 随后 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 9, ...fieldStyle(t, 16) }}>
              <span
                style={{
                  position: 'relative',
                  fontSize: lerp(cutK, 21, 14),
                  fontWeight: lerp(cutK, 760, 560),
                  color: cutK > 0.5 ? INK3 : INK,
                  opacity: lerp(cutK, 1, 0.92),
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                $249
                <span
                  style={{
                    position: 'absolute', left: -1, right: -1, top: '54%', height: 1.1, borderRadius: 1,
                    background: INK3, transform: `scaleX(${strike})`, transformOrigin: 'left center',
                  }}
                />
              </span>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 21,
                  fontWeight: 760,
                  color: ACCENT,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  opacity: Math.min(1, nk * 3),
                  transform: `scale(${lerp(E.spring(nk, 0.35), 1.15, 1).toFixed(4)})`,
                  transformOrigin: 'left 70%',
                }}
              >
                $189
              </span>
              <span
                style={{
                  alignSelf: 'center',
                  fontSize: 6.5,
                  fontWeight: 700,
                  color: ACCENT,
                  background: 'rgba(242,98,28,.11)',
                  boxShadow: 'inset 0 0 0 0.25px rgba(242,98,28,.28)',
                  padding: '1.6px 4.5px',
                  borderRadius: 99,
                  letterSpacing: '0.02em',
                  opacity: Math.min(1, chip * 2.4),
                  transform: `translateX(${lerp(EASE.snappy(chip), -4, 0).toFixed(3)}px)`,
                }}
              >
                SAVE 24%
              </span>
            </div>
            {/* 描述行（f=30 起每 2 帧一行）+ 马克笔高亮（行 f0+4 起由左向右刷过） */}
            <div style={{ fontSize: 10, lineHeight: 1.66, color: INK2, letterSpacing: '-0.004em' }}>
              {LINES.map((segs, li) => (
                <div key={li} style={{ whiteSpace: 'nowrap', ...fieldStyle(t, 30 + li * 2) }}>
                  {segs.map(([txt, isMark], si) =>
                    !isMark ? (
                      <span key={si}>{txt}</span>
                    ) : (
                      <span key={si} style={{ position: 'relative', display: 'inline-block' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: -1.5,
                            right: -1.5,
                            top: '14%',
                            bottom: '6%',
                            background: ACCENT_SOFT,
                            // 马克笔笔头：左钝右略斜，读作"一笔划过"而不是色块
                            borderRadius: '1.5px 3px 2px 1px',
                            transform: `scaleX(${seg(t, F(30 + li * 2 + 4), F(30 + li * 2 + 4) + 0.085, EASE.out)}) skewX(-6deg)`,
                            transformOrigin: 'left center',
                          }}
                        />
                        <span style={{ position: 'relative', fontWeight: 640, color: '#22242a' }}>{txt}</span>
                      </span>
                    ),
                  )}
                </div>
              ))}
            </div>
            {/* 色卡（f=40 起每 2 帧一个 pop）：首色选中环 + 色名 */}
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto', alignItems: 'center' }}>
              {SWATCHES.map(([cclr, name], i) => (
                <div
                  key={cclr}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 99,
                    background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.28), rgba(255,255,255,0) 55%), ${cclr}`,
                    boxShadow:
                      i === 0
                        ? `inset 0 0 0 0.25px rgba(0,0,0,.25), 0 0 0 1.6px #f7f6f3, 0 0 0 2.1px ${INK}`
                        : 'inset 0 0 0 0.25px rgba(0,0,0,.2), 0 0.4px 1px rgba(0,0,0,.12)',
                    marginRight: i === 0 ? 2 : 0,
                    ...fieldStyle(t, 40 + i * 2, 'pop'),
                  }}
                  title={name}
                />
              ))}
              <div style={{ marginLeft: 5, fontSize: 7.5, color: INK3, letterSpacing: '0.01em', ...fieldStyle(t, 44) }}>
                Color · <span style={{ color: INK, fontWeight: 600 }}>Graphite</span>
              </div>
            </div>
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
