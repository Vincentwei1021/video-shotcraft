// product-card-progressive-assemble — Progressive Assemble 字段逐个落位（motion-lab 定稿转原生 Remotion）
// 详情卡像被逐字段抓取般自建：图→标题→breadcrumb pill 依次 pop→价格出现后被划线降级、
// 强调色新价 spring 跳出→正文逐行揭示+强调色高亮块由左向右刷过→色卡点亮。
// 整卡极慢 scale 前推保持呼吸。设计坐标 480×270（DesignStage 等比放大）。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const PRODUCT_CARD_PROGRESSIVE_ASSEMBLE_DURATION = 150; // 5000ms @30fps

const ACCENT = '#ff6a1f';
const ACCENT_SOFT = 'rgba(255,122,26,.42)';

const F = (f: number) => f / 60; // recipe 帧 → t

// 字段落位样式：rise = 上移 6px 淡入；pop = outBack 从 0.4 弹到 1
const fieldStyle = (t: number, f0: number, mode: 'rise' | 'pop' = 'rise'): React.CSSProperties => {
  const k = seg(t, F(f0), F(f0) + 0.1, E.outCubic);
  return {
    opacity: Math.min(1, k * 2),
    transform:
      mode === 'pop'
        ? `scale(${lerp(E.outBack(Math.min(1, k)), 0.4, 1)})`
        : `translateY(${lerp(k, 6, 0)}px)`,
  };
};

// 描述行：[文本, 是否马克笔高亮]
const LINES: [string, boolean?][][] = [
  [['Placeholder copy for '], ['a key highlight', true], [' in the']],
  [['product body. '], ['Second highlight', true], [' sits here on']],
  [['the third line of neutral sample text.']],
];

export const ProductCardProgressiveAssemble: React.FC = () => {
  const t = useT();
  // 整卡呼吸前推
  const push = seg(t, 0, 0.75, E.outQuad);
  // 价格降级（f=26）：旧价划线缩小变灰，新价 spring 跳出
  const cut = t >= F(26);
  const nk = seg(t, F(26), F(26) + 0.12);
  return (
    <DesignStage bg="#0d0e13" raster="zoom">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '78%',
          height: '74%',
          transform: `translate(-50%,-50%) scale(${lerp(push, 1, 1.06)})`,
          background: '#f6f5f2',
          borderRadius: 12,
          boxShadow: '0 18px 50px rgba(0,0,0,.5)',
          fontFamily: '-apple-system,Helvetica,sans-serif',
          display: 'flex',
          padding: '4.5%',
          boxSizing: 'border-box',
          gap: '5%',
        }}
      >
        {/* 左：商品图占位（f=0 rise 落位） */}
        <div
          style={{
            flex: '0 0 38%',
            background: '#e2e0da',
            borderRadius: 8,
            position: 'relative',
            overflow: 'hidden',
            ...fieldStyle(t, 0),
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '18%',
              top: '14%',
              width: '64%',
              height: '72%',
              background: 'linear-gradient(160deg,#2b3040,#171a24)',
              borderRadius: '40% 40% 14% 14%/26% 26% 10% 10%',
            }}
          >
            {/* 拉链 */}
            <div style={{ position: 'absolute', left: '49%', top: '20%', width: '2%', height: '58%', background: '#525a70' }} />
          </div>
        </div>
        {/* 右列 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* 标题（f=4） */}
          <div style={{ fontSize: 19, fontWeight: 800, color: '#17181c', letterSpacing: '-.3px', ...fieldStyle(t, 4) }}>
            Sample Product Title
          </div>
          {/* breadcrumb pills（f=8 起每 2 帧一个 pop） */}
          <div style={{ display: 'flex', gap: 6, margin: '8px 0 10px' }}>
            {['Category', 'Subgroup', 'Detail'].map((txt, i) => (
              <div
                key={txt}
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#5a5e6b',
                  background: '#e9e7e1',
                  padding: '3px 9px',
                  borderRadius: 99,
                  ...fieldStyle(t, 8 + i * 2, 'pop'),
                }}
              >
                {txt}
              </div>
            ))}
          </div>
          {/* 价格行（f=16）：f=26 起旧价降级、新价 spring 跳出 */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 11, ...fieldStyle(t, 16) }}>
            <span
              style={{
                fontSize: cut ? 15 : 21,
                fontWeight: 800,
                color: cut ? '#9a9da6' : '#17181c',
                textDecoration: cut ? 'line-through' : 'none',
              }}
            >
              $249
            </span>
            <span
              style={{
                fontSize: 21,
                fontWeight: 800,
                color: ACCENT,
                opacity: Math.min(1, nk * 3),
                transform: `scale(${lerp(E.spring(nk, 0.35), 1.15, 1)})`,
              }}
            >
              $189
            </span>
          </div>
          {/* 描述行（f=30 起每 2 帧一行）+ 马克笔高亮（行 f0+4 起由左向右刷过） */}
          <div style={{ fontSize: 10.5, lineHeight: 1.75, color: '#494d58' }}>
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
                          left: -2,
                          right: -2,
                          top: '8%',
                          bottom: '4%',
                          background: ACCENT_SOFT,
                          borderRadius: 2,
                          transform: `scaleX(${seg(t, F(30 + li * 2 + 4), F(30 + li * 2 + 4) + 0.085, E.outCubic)})`,
                          transformOrigin: 'left center',
                        }}
                      />
                      <span style={{ position: 'relative', fontWeight: 700, color: '#26282f' }}>{txt}</span>
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
          {/* 色卡（f=40 起每 2 帧一个 pop） */}
          <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
            {['#191b20', '#8b8f99', '#3a5b8c'].map((cclr, i) => (
              <div
                key={cclr}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: cclr,
                  outline: '1.5px solid rgba(0,0,0,.12)',
                  outlineOffset: 1.5,
                  ...fieldStyle(t, 40 + i * 2, 'pop'),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
