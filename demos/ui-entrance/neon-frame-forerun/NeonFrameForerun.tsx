// neon-frame-forerun v3 —— v2 基础上按用户意见新增（clickup04 五张）：
// 框内各组件/文字初始悬空在页面上空（3D 抬起），悬空时在面板上映射
// 同形软影，随页面点亮进程同步先后贴合（FloatWrap 模式，对标截图③：
// tab/组件悬空带错位影 → ④全部贴合）。v2 已有：强透视直角框左缘中点
// 两头奔画、面板原地由暗转亮、背景霓虹管框群中亮尾熄。
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const easeFall = Easing.bezier(0.5, 0.05, 0.6, 1); // 加速下落、末端软着陆

/* 悬浮 + 同形软影：h=悬浮高度(px)。本体向左上抬起，原位留模糊压暗同形影，
 * h→0 时重合、影子消失（对标批次11 GrazeFaceTour FloatWrap） */
const FloatWrap: React.FC<{ h: number; children: React.ReactNode }> = ({ h, children }) => (
  <div style={{ position: 'relative' }}>
    {h > 1 && (
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${h * 0.26}px, ${h * 0.48}px) scale(${1 + h * 0.0012})`,
        filter: `blur(${2.5 + h * 0.09}px) brightness(0.32) saturate(0.4)`,
        opacity: Math.min(0.4, 0.16 + h * 0.005),
        pointerEvents: 'none',
      }}>{children}</div>
    )}
    <div style={{ transform: `translate(${-h * 0.36}px, ${-h * 0.82}px)` }}>{children}</div>
  </div>
);

/* land=贴合完成时刻(0..1)，之前从 H 高度加速贴落 */
const liftOf = (t: number, land: number, H: number) => {
  const FALL = 0.3;
  const p = Math.min(1, Math.max(0, (t - (land - FALL)) / FALL));
  return (1 - easeFall(p)) * H;
};

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ink = '#3c3c3a';
const mid = '#9a9a98';
const line = '#e3e3e1';

const PW = 1330;
const PH = 900;
const PL = 1000; // 归一路径长

// 直角矩形路径：从左缘中点出发（对应截图①左缘先亮）
const FRAME_D = `M 0 ${PH / 2} L 0 0 L ${PW} 0 L ${PW} ${PH} L 0 ${PH} Z`;

const Chip: React.FC<{ w: number }> = ({ w }) => (
  <div style={{
    width: w, height: 74, background: '#fdfdfc', border: `2px solid ${line}`,
    borderRadius: 10, padding: '12px 14px', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', gap: 9,
  }}>
    <div style={{ height: 11, width: '70%', background: '#b5b5b3', borderRadius: 5 }} />
    <div style={{ height: 9, width: '48%', background: line, borderRadius: 5 }} />
  </div>
);

/* t = 贴落进程(0..1)。各组件按页面展示顺序（侧栏自上而下、主区自上而下）
 * 错峰从空中贴落，悬空时投同形软影（对标截图③虚影→④⑤贴合） */
const GrayHome: React.FC<{ t?: number }> = ({ t = 1 }) => {
  const L = (land: number, H = 72) => liftOf(t, land, H * 1.7);
  return (
  <div style={{ width: PW, height: PH, background: '#f5f5f4', borderRadius: 6, display: 'flex', overflow: 'hidden', boxSizing: 'border-box' }}>
    <div style={{ width: 290, borderRight: `2px solid ${line}`, padding: '26px 24px', boxSizing: 'border-box' }}>
      <FloatWrap h={L(0.24, 84)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: ink }} />
          <div style={{ height: 15, width: 88, background: ink, borderRadius: 7 }} />
        </div>
      </FloatWrap>
      {[76, 56, 96, 110, 66, 60].map((w, i) => (
        <FloatWrap key={i} h={L(0.3 + i * 0.045, 66)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 34 }}>
            <div style={{ width: 17, height: 17, borderRadius: 5, background: mid }} />
            <div style={{ height: 10, width: w, background: '#c7c7c5', borderRadius: 5 }} />
          </div>
        </FloatWrap>
      ))}
      <FloatWrap h={L(0.56, 62)}>
        <div style={{ height: 11, width: 70, background: '#b0b0ae', borderRadius: 5, margin: '24px 0 12px' }} />
      </FloatWrap>
      {[104, 126, 96, 118, 88].map((w, i) => (
        <FloatWrap key={i} h={L(0.62 + i * 0.05, 66)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 32 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: '#b8b8b6' }} />
            <div style={{ height: 10, width: w, background: '#cfcfcd', borderRadius: 5 }} />
          </div>
        </FloatWrap>
      ))}
    </div>
    <div style={{ flex: 1, padding: '30px 40px', boxSizing: 'border-box' }}>
      <FloatWrap h={L(0.26, 90)}>
        <div style={{ height: 24, width: 130, background: '#565654', borderRadius: 10, marginBottom: 22 }} />
      </FloatWrap>
      <FloatWrap h={L(0.34, 80)}>
        <div style={{ height: 46, border: `2px solid ${line}`, borderRadius: 12, marginBottom: 26, display: 'flex', alignItems: 'center', padding: '0 16px', background: '#f5f5f4' }}>
          <div style={{ width: 17, height: 17, borderRadius: 9, border: `2px solid ${mid}` }} />
          <div style={{ height: 10, width: 250, background: line, borderRadius: 5, marginLeft: 12 }} />
        </div>
      </FloatWrap>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 30 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <FloatWrap key={i} h={L(0.42 + i * 0.04, 76)}>
            <Chip w={222} />
          </FloatWrap>
        ))}
      </div>
      <FloatWrap h={L(0.72, 60)}>
        <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
          {[54, 84, 50, 82].map((w, i) => (
            <div key={i} style={{ height: 11, width: w, background: i === 0 ? '#8a8a88' : line, borderRadius: 5 }} />
          ))}
        </div>
      </FloatWrap>
      {[0, 1, 2, 3].map((i) => (
        <FloatWrap key={i} h={L(0.78 + i * 0.055, 64)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 46, borderBottom: `2px solid ${line}` }}>
            <div style={{ width: 13, height: 13, borderRadius: 7, background: '#c26a6a' }} />
            <div style={{ height: 11, width: 160 + ((i * 37) % 70), background: '#b6b6b4', borderRadius: 5 }} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
              {[0, 1, 2].map((k) => <div key={k} style={{ width: 20, height: 20, borderRadius: 10, background: '#d2d2d0' }} />)}
            </div>
          </div>
        </FloatWrap>
      ))}
    </div>
  </div>
  );
};

// 背景霓虹管框：大、亮、带透视错落（截图③④）
type BgFrame = { x: number; y: number; w: number; h: number; hue: string; phase: number; period: number; skew: number };
const rng = mulberry32(20260718);
const HUES = ['#b06af0', '#e879c9', '#f0a35c', '#6a7df0', '#e0679a', '#8a5cf0', '#c06af0'];
const BG_FRAMES: BgFrame[] = Array.from({ length: 18 }).map(() => ({
  x: rng() * 2000 - 120, y: rng() * 1100 - 60,
  w: 160 + rng() * 480, h: 70 + rng() * 220,
  hue: HUES[Math.floor(rng() * HUES.length)],
  phase: rng() * 90, period: 55 + rng() * 70,
  skew: -14 + rng() * 10,
}));

export const NeonFrameForerun: React.FC = () => {
  const frame = useCurrentFrame();
  // 滤镜/渐变 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // 主框描画：左缘中点向两头奔跑，26 帧成型（截图①→②）
  const trace = interpolate(frame, [2, 28], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0.1, 0.3, 1),
  });
  // 面板原地显影：框成型后内容从近黑到暗灰（截图②），再全亮（截图③）
  const lit = interpolate(frame, [24, 46, 78], [0.0, 0.3, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.35, 0, 0.3, 1),
  });
  // 主框独立描边可见度：面板亮起后并入面板 rim 辉光（截图③以后细线淡出，糊辉光留下）
  const frameLine = interpolate(frame, [50, 90], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rimGlow = interpolate(frame, [28, 60, 108, 132], [0.9, 1, 0.75, 0.5], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 背景：中段全亮（截图③④）→ 尾段熄灭（截图⑤）
  const bgLit = interpolate(frame, [8, 44, 96, 128], [0.15, 1, 0.85, 0.06], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 强透视 → 缓和：框飞入时角度大，面板亮起后落定（截图①梯形→③④缓斜）
  const settle = interpolate(frame, [0, 70], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const rotY = -26 + 15 * settle;
  const rotX = 7 - 3 * settle;
  const rotZ = -9 + 4.5 * settle;
  const scale = 0.94 + 0.1 * settle;
  const headP = trace * (PL / 2);
  // 组件贴落进程：与页面点亮(lit 24→78)同步推进，稍滞后收尾——
  // "和页面的展示同步完成贴合"
  const drop = interpolate(frame, [34, 98], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#060509', overflow: 'hidden' }}>
      {/* 背景霓虹管框群 */}
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <defs>
          <filter id={`bgblur-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={7} />
          </filter>
        </defs>
        {BG_FRAMES.map((b, i) => {
          const breath = 0.5 + 0.5 * Math.sin(((frame + b.phase) / b.period) * Math.PI * 2);
          const op = bgLit * (0.18 + 0.4 * breath);
          return (
            <g key={i} transform={`translate(${b.x} ${b.y}) skewY(${b.skew * 0.4}) skewX(${b.skew})`}>
              <rect width={b.w} height={b.h} rx={4} fill="none"
                stroke={b.hue} strokeWidth={7} filter={`url(#bgblur-${uid})`} opacity={op * 0.8} />
              <rect width={b.w} height={b.h} rx={4} fill="none"
                stroke={b.hue} strokeWidth={2} opacity={op} />
            </g>
          );
        })}
      </svg>
      {/* 主体：强透视斜置的框 + 面板 */}
      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '42% 40%' }}>
        <div style={{
          position: 'absolute', left: (1920 - PW) / 2, top: (1080 - PH) / 2 - 10,
          transform: `scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
          transformStyle: 'preserve-3d',
        }}>
          {/* 面板：原地由暗转亮（无位移缩放） */}
          <div style={{ opacity: trace > 0.55 ? 1 : 0, filter: `brightness(${Math.max(0.05, lit)})` }}>
            <GrayHome t={drop} />
            {/* 未点亮时的冷色压暗罩 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 6,
              background: 'linear-gradient(150deg, rgba(30,20,60,0.5), rgba(0,0,0,0.78))',
              opacity: 1 - lit,
            }} />
          </div>
          {/* 面板 rim 辉光（框光并入后由它承担，底缘最强——对应截图③④底/右缘粉光） */}
          <div style={{
            position: 'absolute', left: -10, top: -10, width: PW + 20, height: PH + 20,
            borderRadius: 12, opacity: rimGlow * Math.min(1, trace * 1.6),
            boxShadow: '-18px -8px 42px 6px rgba(185,95,240,0.42), 22px 24px 56px 12px rgba(240,150,90,0.30), 0 14px 80px 22px rgba(200,100,220,0.20)',
          }} />
          {/* 霓虹描边框：左缘中点出发两头奔画，直角转角 */}
          <svg width={PW + 80} height={PH + 80} viewBox={`-40 -40 ${PW + 80} ${PH + 80}`}
            style={{ position: 'absolute', left: -40, top: -40 }}>
            <defs>
              <linearGradient id={`mainfg-${uid}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={PW} y2={PH}>
                <stop offset="0%" stopColor="#c07af5" />
                <stop offset="38%" stopColor="#e58bd8" />
                <stop offset="72%" stopColor="#f0b06a" />
                <stop offset="100%" stopColor="#e8925c" />
              </linearGradient>
              <filter id={`fblur-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation={10} />
              </filter>
              <filter id={`fblur2-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation={3} />
              </filter>
            </defs>
            {[1, -1].map((dir) => (
              <g key={dir}>
                {/* 糊辉光层：一直保留 */}
                <path d={FRAME_D} pathLength={PL} fill="none" stroke={`url(#mainfg-${uid})`}
                  strokeWidth={14} strokeLinecap="butt" filter={`url(#fblur-${uid})`}
                  strokeDasharray={`${headP} ${PL}`}
                  strokeDashoffset={dir === 1 ? 0 : -(PL - headP)}
                  opacity={0.6 * rimGlow} />
                {/* 亮芯细线：面板亮起后淡出并入 rim */}
                <path d={FRAME_D} pathLength={PL} fill="none" stroke={`url(#mainfg-${uid})`}
                  strokeWidth={3.5} strokeLinecap="butt"
                  strokeDasharray={`${headP} ${PL}`}
                  strokeDashoffset={dir === 1 ? 0 : -(PL - headP)}
                  opacity={0.95 * Math.max(frameLine, 0.25)} />
                {/* 奔跑亮头 */}
                {trace < 1 && (
                  <path d={FRAME_D} pathLength={PL} fill="none" stroke="#ffffff"
                    strokeWidth={6} strokeLinecap="round" filter={`url(#fblur2-${uid})`}
                    strokeDasharray={`8 ${PL}`}
                    strokeDashoffset={dir === 1 ? -(Math.max(0, headP - 8)) : -(PL - headP)}
                    opacity={0.95} />
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
