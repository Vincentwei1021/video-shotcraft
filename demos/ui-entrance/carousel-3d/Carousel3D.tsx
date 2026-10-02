// carousel-3d — 3D Carousel 环形画廊（motion-lab 定稿转原生 Remotion）
// 8 张卡片按 sin/cos 排成圆环并匀速整环自转，每卡只绕 Y 公转、自身 billboard
// 朝外，正反两层同向贴图 + backface-visibility:hidden，任何时刻卡片都正立不倒置；
// 相机全程固定（浅俯角近景），配方 angle=i*360/n+frame*speed。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层（改版）：卡面换成出版级"模板卡"（同色系石墨面 + 发丝线 + 顶部受光 + 迷你图表）；
// 按卡在环上的前后位置做空气透视（越靠后越暗、越淡）；地面盘挪到卡片脚下并加一层
// 渐隐倒影，环真正"落地"；raster="zoom" 让 3D 层按目标分辨率栅格化，卡面文字不糊（Q2）。
// 自转保持匀速（可无缝 loop 的稳态运动是这张卡的语义），首尾帧逐像素可接。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, rand, useT } from '../../_fixtures/Motion';
import { Backdrop, FONT } from '../../_fixtures/Polish';

export const CAROUSEL_3D_DURATION = 168; // 5600ms @30fps

const N = 8;
const RADIUS = 190;
// 卡片脚下的地面高度（卡高 124、中心 0 → 下沿 62，再留 4px 空隙）
const FLOOR = 66;

// 同色系（靛蓝→紫，色相只走 35°），每张一个"模板"
const CARDS: { title: string; sub: string; kind: 'bars' | 'line' | 'ring' | 'list' | 'grid' | 'metric' | 'doc' | 'kanban'; hue: number }[] = [
  { title: 'Analytics', sub: 'Dashboard', kind: 'bars', hue: 228 },
  { title: 'Forecast', sub: 'Model', kind: 'line', hue: 233 },
  { title: 'Goals', sub: 'OKR tracker', kind: 'ring', hue: 238 },
  { title: 'Tasks', sub: 'Checklist', kind: 'list', hue: 243 },
  { title: 'Gallery', sub: 'Media grid', kind: 'grid', hue: 248 },
  { title: 'Revenue', sub: 'KPI card', kind: 'metric', hue: 253 },
  { title: 'Docs', sub: 'Wiki page', kind: 'doc', hue: 258 },
  { title: 'Roadmap', sub: 'Board', kind: 'kanban', hue: 263 },
];

export const Carousel3D: React.FC = () => {
  const t = useT();
  const spin = t * 360; // 整片正好公转 1 圈可循环

  // 一张卡的正反两层（同一份内容）；depth∈[0,1]：0 最前、1 最后
  const renderCard = (i: number, depth: number, reflect: boolean) => {
    const c = CARDS[i];
    const faceStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      borderRadius: 9,
      boxSizing: 'border-box',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      background: `linear-gradient(170deg, hsl(${c.hue},18%,21%) 0%, hsl(${c.hue},20%,13%) 100%)`,
      border: `1px solid hsla(${c.hue},50%,85%,0.13)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.09)`,
      fontFamily: FONT.sans,
      color: '#f2f4fa',
      ...(reflect
        ? {
            // 透明度只能挂在叶子层：挂在 preserve-3d 容器上会把整环拍平
            opacity: 0.16,
            // 倒影：从卡脚（镜像后的上沿）向下渐隐
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.9) 100%)',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.9) 100%)',
          }
        : {}),
    };
    const face = (
      <>
        <Face i={i} />
        {/* 空气透视：环背面的卡压暗（不改几何，只叠一层带色相的深色） */}
        <div style={{ position: 'absolute', inset: 0, background: '#0c0d14', opacity: (0.62 * depth).toFixed(3) }} />
      </>
    );
    return (
      // 卡片容器只做环上定位（绕 Y 公转 + billboard 朝外），
      // 永不绕 X/Z，卡永远正立
      <div
        key={i}
        style={{
          position: 'absolute',
          left: -46,
          top: -62,
          width: 92,
          height: 124,
          transformStyle: 'preserve-3d',
          transform: `rotateY(${(i * 360) / N}deg) translateZ(${RADIUS}px)`,
        }}
      >
        <div style={faceStyle}>{face}</div>
        <div style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>{face}</div>
      </div>
    );
  };

  const depthOf = (i: number) => {
    const a = (((i * 360) / N + spin) * Math.PI) / 180;
    return (1 - Math.cos(a)) / 2;
  };

  return (
    <AbsoluteFill>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.36 }} accent="#6a72e6" grain={0.08} vignette={0.62} />
      <DesignStage bg="transparent" raster="zoom">
        {/* 3D 场景：perspective 950px */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', perspective: '950px' }}>
          {/* 相机全程固定：浅俯角近景，不拉远不变角 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 0,
              height: 0,
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              transform: 'translateZ(-90px) rotateX(-8deg) translateY(-10px)',
            }}
          >
            {/* 地面反光盘：躺平在卡脚下（FLOOR），径向渐变兜住整环 */}
            <div
              style={{
                position: 'absolute',
                left: -230,
                top: FLOOR - 230,
                width: 460,
                height: 460,
                borderRadius: '50%',
                transform: 'rotateX(90deg)',
                background: 'radial-gradient(circle, rgba(120,130,240,0.16) 0%, rgba(120,130,240,0.05) 42%, transparent 64%)',
              }}
            />
            {/* 倒影环：以地面为镜面翻转（scaleY -1），每张倒影卡面低透明度 + 渐隐 */}
            <div
              style={{
                position: 'absolute',
                transformStyle: 'preserve-3d',
                transform: `translateY(${FLOOR * 2}px) scaleY(-1) rotateY(${spin}deg)`,
              }}
            >
              {Array.from({ length: N }, (_, i) => renderCard(i, depthOf(i), true))}
            </div>
            {/* 圆环载体：唯一的逐帧变量，整环绕 Y 匀速自转 */}
            <div
              style={{
                position: 'absolute',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                transform: `rotateY(${spin}deg)`,
              }}
            >
              {Array.from({ length: N }, (_, i) => renderCard(i, depthOf(i), false))}
            </div>
          </div>
        </div>
      </DesignStage>
    </AbsoluteFill>
  );
};

// ——— 卡面：图标块 + 标题 + 副标题 + 迷你可视化（92×124 设计 px） ———
const Face: React.FC<{ i: number }> = ({ i }) => {
  const c = CARDS[i];
  const acc = `hsl(${c.hue},75%,73%)`;
  const accSoft = `hsla(${c.hue},70%,70%,0.17)`;
  const dim = 'rgba(220,224,240,0.17)';
  const line = 'rgba(255,255,255,0.07)';
  const W = 72;
  const viz = (() => {
    switch (c.kind) {
      case 'bars':
        return (
          <svg width={W} height={44}>
            {Array.from({ length: 6 }, (_, k) => {
              const h = 12 + rand(i * 9 + k) * 30;
              return <rect key={k} x={k * 12.4} y={44 - h} width={7.5} height={h} rx={1.6} fill={k === 4 ? acc : dim} />;
            })}
          </svg>
        );
      case 'line': {
        const d = Array.from({ length: 8 }, (_, k) => `${k ? 'L' : 'M'}${(k * 10.3).toFixed(1)},${(36 - k * 3.4 - rand(i * 5 + k) * 9).toFixed(1)}`).join(' ');
        return (
          <svg width={W} height={44}>
            <path d={`${d} L72,44 L0,44 Z`} fill={accSoft} />
            <path d={d} fill="none" stroke={acc} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      }
      case 'ring':
        return (
          <svg width={W} height={44}>
            <circle cx={22} cy={22} r={17} fill="none" stroke={dim} strokeWidth={5} />
            <circle cx={22} cy={22} r={17} fill="none" stroke={acc} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 17 * 0.72} 999`} transform="rotate(-90 22 22)" />
            <text x={48} y={20} fontSize={10} fontWeight={700} fill="#f2f4fa" fontFamily={FONT.sans}>72%</text>
            <text x={48} y={30} fontSize={5.4} fill="rgba(210,214,230,0.5)" fontFamily={FONT.sans}>on track</text>
          </svg>
        );
      case 'list':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6.5 }}>
            {[1, 1, 0, 0].map((d, k) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6.5, height: 6.5, borderRadius: 2, background: d ? acc : 'transparent', border: d ? 'none' : '0.75px solid rgba(220,224,240,0.3)' }} />
                <div style={{ height: 3, width: 26 + rand(i + k * 7) * 30, borderRadius: 2, background: dim }} />
              </div>
            ))}
          </div>
        );
      case 'grid':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {Array.from({ length: 6 }, (_, k) => (
              <div
                key={k}
                style={{
                  height: 19,
                  borderRadius: 3,
                  background: k === 1 ? `linear-gradient(140deg, ${acc}, hsl(${c.hue},45%,40%))` : `linear-gradient(140deg, rgba(220,224,240,0.16), rgba(220,224,240,0.06))`,
                }}
              />
            ))}
          </div>
        );
      case 'metric':
        return (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>$84.2k</div>
            <div style={{ marginTop: 4, display: 'inline-block', fontSize: 5.6, fontWeight: 600, color: acc, background: accSoft, padding: '1.5px 4px', borderRadius: 5 }}>
              +9.1% MoM
            </div>
          </div>
        );
      case 'doc':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4.5 }}>
            <div style={{ height: 4, width: 44, borderRadius: 2, background: 'rgba(230,234,248,0.4)' }} />
            {[66, 72, 58, 70, 40].map((w, k) => (
              <div key={k} style={{ height: 2.6, width: w, borderRadius: 1.5, background: dim }} />
            ))}
          </div>
        );
      case 'kanban':
      default:
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            {[3, 2, 2].map((n, col) => (
              <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Array.from({ length: n }, (_, r) => (
                  <div key={r} style={{ height: 11, borderRadius: 2.5, background: col === 0 && r === 0 ? accSoft : 'rgba(255,255,255,0.05)', border: `0.5px solid ${line}` }} />
                ))}
              </div>
            ))}
          </div>
        );
    }
  })();
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 10 }}>
      {/* 卡顶受光 */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(130% 55% at 25% 0%, hsla(${c.hue},60%,78%,0.12) 0%, rgba(0,0,0,0) 65%)` }} />
      <div
        style={{
          position: 'relative',
          width: 20,
          height: 20,
          borderRadius: 6,
          background: `linear-gradient(150deg, ${acc}, hsl(${c.hue},50%,48%))`,
          boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.4), 0 2px 6px -1px hsla(${c.hue},70%,30%,0.6)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: i % 2 ? 2 : 4, background: 'rgba(255,255,255,0.92)' }} />
      </div>
      <div style={{ position: 'relative', marginTop: 9, fontSize: 9.5, fontWeight: 650, letterSpacing: '-0.015em', color: '#f2f4fa' }}>{c.title}</div>
      <div style={{ position: 'relative', marginTop: 1.5, fontSize: 5.8, fontWeight: 500, letterSpacing: '0.01em', color: 'rgba(210,214,230,0.5)' }}>{c.sub}</div>
      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>{viz}</div>
    </div>
  );
};
