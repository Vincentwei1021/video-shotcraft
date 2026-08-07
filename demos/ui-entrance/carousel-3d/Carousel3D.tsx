// carousel-3d — 3D Carousel 环形画廊（motion-lab 定稿转原生 Remotion）
// 8 张卡片按 sin/cos 排成圆环并匀速整环自转，每卡只绕 Y 公转、自身 billboard
// 朝外，正反两层同向贴图 + backface-visibility:hidden，任何时刻卡片都正立不倒置；
// 相机全程固定（浅俯角近景），配方 angle=i*360/n+frame*speed。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, useT } from '../../_fixtures/Motion';

export const CAROUSEL_3D_DURATION = 168; // 5600ms @30fps

const N = 8;
const RADIUS = 190;
const ICONS = ['◆', '●', '▲', '■', '✦', '◗', '⬢', '◉'];

export const Carousel3D: React.FC = () => {
  const t = useT();
  const spin = t * 360; // 整片正好公转 1 圈可循环
  return (
    <DesignStage bg="#0a0b10">
      {/* 3D 场景：perspective 950px + 径向渐变夜幕 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          perspective: '950px',
          background: 'radial-gradient(ellipse at 50% 55%,#131120 0%,#0a0b10 75%)',
        }}
      >
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
          {/* 圆环载体：唯一的逐帧变量，整环绕 Y 匀速自转 */}
          <div
            style={{
              position: 'absolute',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              transform: `rotateY(${spin}deg)`,
            }}
          >
            {Array.from({ length: N }, (_, i) => {
              const hue = 200 + i * 22;
              // 正反两层同向贴图 + backface-visibility:hidden：
              // 从环外/环内看都是正立不镜像的同一张卡
              const faceStyle: React.CSSProperties = {
                position: 'absolute',
                inset: 0,
                borderRadius: 9,
                boxSizing: 'border-box',
                padding: 10,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background: `linear-gradient(160deg,hsl(${hue},60%,42%),hsl(${hue + 28},70%,20%))`,
                border: `1px solid hsla(${hue},80%,75%,.5)`,
                boxShadow: `0 12px 34px rgba(0,0,0,.5), inset 0 1px 0 hsla(${hue},80%,85%,.35)`,
                fontFamily: '-apple-system,system-ui,sans-serif',
                color: '#f2f5fb',
              };
              const face = (
                <>
                  <div style={{ fontSize: 24 }}>{ICONS[i]}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, marginTop: 34 }}>
                    CARD 0{i + 1}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      height: 4,
                      width: '70%',
                      borderRadius: 2,
                      background: 'rgba(255,255,255,.4)',
                    }}
                  />
                  <div
                    style={{
                      marginTop: 4,
                      height: 4,
                      width: '45%',
                      borderRadius: 2,
                      background: 'rgba(255,255,255,.22)',
                    }}
                  />
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
            })}
          </div>
          {/* 地面反光盘 */}
          <div
            style={{
              position: 'absolute',
              left: -230,
              top: 70,
              width: 460,
              height: 460,
              borderRadius: '50%',
              transform: 'rotateX(90deg)',
              background: 'radial-gradient(circle,rgba(110,140,255,.14) 0%,transparent 62%)',
            }}
          />
        </div>
      </div>
    </DesignStage>
  );
};
