// quad-split-parallel-scenes — Quad Split 四宫并行蒙太奇（motion-lab 定稿转原生 Remotion）
// 手法卡：画面硬切成 2×2 四宫格，四个象限并行跑各自独立的微场景（格内内容可任意替换，
// 此处仅为示例）：TL 迷你浏览器打字 + 标签堆积 + 慢推，TR mono 打字 + whip 急推，
// BL 三词逐个弹入，BR pill 滑入 → 光标贝塞尔飞行点击 → 卡片弹出。
// 关键节拍互相错开 3-6 帧、全程无转场，靠并行密度制造信息轰炸。
// 设计坐标 480×270（DesignStage 等比放大），参数以此坐标系标定。
// 质感：占位文案（Placeholder / Tab One / One clear message）换成同一产品的真实感内容；
// 四格底色改成"浅冷灰 / 深墨 / 强调靛 / 浅暖灰"对角交错（相邻格明度差 ≥15%），每格带低对比
// 渐变；浏览器窗下半补上页面骨架，TR 换成深色场上的发布命令卡，BR 光标换成 macOS 箭头、
// 评论卡带头像；窗体统一发丝线 + 内高光 + 两层软阴影；全画面叠极弱颗粒与暗角。时刻表一帧未动。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const QUAD_SPLIT_PARALLEL_SCENES_DURATION = 63; // 2100ms @30fps

const ACCENT = '#5b63d3';
const ACCENT_SOFT = '#b9bdf0';
const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';
const MONO = '"SF Mono", "JetBrains Mono", Menlo, monospace';
const INK = '#17181c';
// 四宫格底色：对角交错的明度（TL 浅冷 / TR 深墨 / BL 强调靛 / BR 浅暖），需要主题色时换成项目色板
const BGS = [
  'linear-gradient(160deg, #eef0f3 0%, #e1e4ea 100%)',
  'radial-gradient(ellipse 90% 80% at 40% 30%, #22242d 0%, #14151a 70%)',
  'radial-gradient(ellipse 90% 90% at 30% 25%, #6c74e4 0%, #5058cc 60%, #454cbc 100%)',
  'linear-gradient(200deg, #f3f2ee 0%, #e7e5df 100%)',
];
const TRAFFIC = ['#ff5f57', '#febc2e', '#28c840'];
const TABNAMES = ['Home', 'Docs', 'API', 'Blog', 'Jobs', 'Help']; // ≤4 字符：窄 tab 里不被切半个字母
const TXT1 = 'Launch notes for Atlas v2'; // 25 字符（与原时刻表同长，打字节奏不漂）
const TXT2 = 'deploy --prod --region eu'; // 25 字符
const WORDS = ['Plan.', 'Ship.', 'Grow.'];
const REPLY = 'Approved!'; // 9 字符

// 窗体材质：发丝线 + 顶部内高光 + 两层软阴影（设计坐标下的 px）
const WINDOW_SHADOW = 'inset 0 0.5px 0 rgba(255,255,255,0.9), 0 0.5px 1px rgba(16,18,26,0.10), 0 10px 24px -8px rgba(16,18,26,0.28)';

// 二次贝塞尔取点（BR 象限光标飞行路径，坐标单位 %）
const qBez = (a: number[], b: number[], c: number[], t: number): [number, number] => {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
    u * u * a[1] + 2 * u * t * b[1] + t * t * c[1],
  ];
};

// 骨架条：页面占位用的低对比圆角条
const Bar: React.FC<{ w: number | string; h?: number; c?: string; mt?: number }> = ({ w, h = 4, c = '#e6e8ec', mt = 0 }) => (
  <div style={{ width: w, height: h, borderRadius: h / 2, background: c, marginTop: mt }} />
);

// TL —— 迷你浏览器：逐字符打字 + tab outBack 弹入 + 全程 inQuad 慢推
const QuadTL: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const n1 = Math.floor(seg(t, 0.02, 0.95) * TXT1.length);
  return (
    <div
      style={{
        position: 'absolute',
        left: '10%',
        top: '22%',
        width: '80%',
        height: '60%',
        background: '#fff',
        borderRadius: 10,
        border: '0.5px solid rgba(20,22,28,0.10)',
        boxShadow: WINDOW_SHADOW,
        fontFamily: F,
        transform: `scale(${lerp(E.inQuad(t), 1, 1.45)})`,
        transformOrigin: '50% 78%',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 9px 0', background: '#f4f5f7', borderBottom: '0.5px solid rgba(20,22,28,0.08)' }}>
        {TRAFFIC.map((c) => (
          <i key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)' }} />
        ))}
        <div style={{ display: 'flex', flex: 1, gap: 2, marginLeft: 6, minWidth: 0 }}>
          {TABNAMES.map((n, i) => {
            const k = seg(t, 0.08 + i * 0.13, 0.08 + i * 0.13 + 0.09, E.outBack);
            const active = i === TABNAMES.length - 1 ? k > 0.5 : false;
            return (
              <div
                key={n}
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'clip',
                  fontSize: 6.5,
                  fontWeight: 500,
                  textAlign: 'center',
                  color: active ? INK : '#6b6e76',
                  background: active ? '#ffffff' : 'rgba(20,22,28,0.05)',
                  borderRadius: '4px 4px 0 0',
                  padding: '3px 2px 4px',
                  transform: `scale(${k})`,
                  transformOrigin: '50% 100%',
                }}
              >
                {n}
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          margin: '6px 10px',
          height: 20,
          borderRadius: 10,
          background: '#f2f3f5',
          boxShadow: 'inset 0 0 0 0.5px rgba(20,22,28,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 9px',
          fontSize: 9.5,
          color: INK,
          letterSpacing: '-0.01em',
        }}
      >
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#8a8f98" strokeWidth={3} strokeLinecap="round" style={{ marginRight: 6, flex: 'none' }}>
          <circle cx={11} cy={11} r={7} />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span style={{ whiteSpace: 'nowrap' }}>{TXT1.slice(0, n1)}</span>
        {/* 光标按帧闪烁：16 帧一个周期 */}
        <i style={{ width: 1, height: 11, background: ACCENT, marginLeft: 1, opacity: frame % 16 < 8 ? 1 : 0, flex: 'none' }} />
      </div>
      {/* 页面骨架：标题行 + 正文 + 按钮 + 配图块，补满窗体下半（窗内余高 ~27px） */}
      <div style={{ display: 'flex', gap: 10, padding: '1px 12px' }}>
        <div style={{ flex: 1 }}>
          <Bar w="74%" h={6} c="#dfe1e7" />
          <div style={{ marginTop: 6, width: 40, height: 10, borderRadius: 5, background: ACCENT, boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.35)' }} />
        </div>
        <div style={{ width: '36%', height: 27, borderRadius: 5, background: 'linear-gradient(150deg, #e9eaf8 0%, #d6d9f2 100%)' }} />
      </div>
    </div>
  );
};

// TR —— mono 打字 + whip 急推（错拍：0.42-0.54，推近时带运动模糊）
const QuadTR: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const n2 = Math.floor(seg(t, 0.06, 0.9) * TXT2.length);
  const zip = seg(t, 0.42, 0.54, E.inOutCubic);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        fontFamily: MONO,
        transform: `scale(${lerp(zip, 1, 2.1)})`,
        // 推近焦点偏右：落定后打字光标仍在格内，后半段字继续往外"长"
        transformOrigin: '80% 44%',
        filter: zip > 0 && zip < 1 ? `blur(${(Math.sin(zip * Math.PI) * 4).toFixed(2)}px)` : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '12%',
          top: '24%',
          width: '76%',
          background: 'linear-gradient(180deg, #fbfaf6 0%, #f4f2ec 100%)',
          borderRadius: 8,
          border: '0.5px solid rgba(255,255,255,0.5)',
          boxShadow: 'inset 0 0.5px 0 #ffffff, 0 1px 2px rgba(0,0,0,0.35), 0 14px 30px -10px rgba(0,0,0,0.65)',
          padding: '8px 12px 14px',
          // 原渲染无全局 border-box：76% 是内容宽，padding 外扩（Remotion 注入
          // 了 * { box-sizing:border-box }，显式还原 content-box 才对得上原片）
          boxSizing: 'content-box',
        }}
      >
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {TRAFFIC.map((c) => (
            <i key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)' }} />
          ))}
        </div>
        <div style={{ fontSize: 7.5, color: '#8a8f98', marginBottom: 5, letterSpacing: '0.02em' }}>
          <span style={{ color: ACCENT }}>✦</span> atlas / release ›
        </div>
        <div style={{ fontSize: 10, color: INK, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#9a9ca4' }}>$ </span>
          <span>{TXT2.slice(0, n2)}</span>
          {/* 光标错拍闪烁：与 TL 相位差 5 帧、周期 14 帧 */}
          <span style={{ opacity: (frame + 5) % 14 < 7 ? 1 : 0, color: ACCENT }}>_</span>
        </div>
      </div>
    </div>
  );
};

// BL —— 三词逐个 outBack 弹入（0.24 / 0.46 / 0.56，与其他象限错开）
const QuadBL: React.FC<{ t: number }> = ({ t }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      fontFamily: F,
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: '-0.03em',
      color: '#ffffff',
      textShadow: '0 2px 8px rgba(20,22,80,0.35)',
    }}
  >
    {WORDS.map((w, i) => {
      const k = seg(t, [0.24, 0.46, 0.56][i], [0.24, 0.46, 0.56][i] + 0.1, E.outBack);
      return (
        <span
          key={w}
          style={{
            display: 'inline-block',
            transform: `scale(${k}) translateY(${(1 - k) * 8}px)`,
            opacity: Math.min(1, k * 2),
          }}
        >
          {w}
        </span>
      );
    })}
  </div>
);

// macOS 箭头光标（设计坐标，tip 在左上角）
const Arrow: React.FC = () => (
  <svg width={9} height={13} viewBox="-1 -1 18 26" style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 1px 1.5px rgba(16,18,26,0.35))' }}>
    <path d="M0 0 L0 20.5 L4.9 15.9 L8.1 23.4 L11.4 22 L8.3 14.7 L14.8 14.7 Z" fill="#111216" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

// BR —— 五步交互：pill 滑入 → 光标贝塞尔飞行 → 点击缩放 → 打字回复 → 卡片弹出
const QuadBR: React.FC<{ t: number }> = ({ t }) => {
  const slide = seg(t, 0.12, 0.3, E.outBack);
  const m1 = seg(t, 0.3, 0.42, E.inOutCubic);
  const m2 = seg(t, 0.62, 0.74, E.inOutCubic);
  // 光标路径：先飞向 pill，再二段飞向发送键
  const p = m2 > 0 ? qBez([44, 66], [66, 52], [82, 68], m2) : qBez([88, 30], [50, 40], [44, 66], m1);
  const c1 = seg(t, 0.42, 0.47);
  const c2 = seg(t, 0.74, 0.79);
  const n4 = Math.floor(seg(t, 0.46, 0.62) * REPLY.length);
  const pop = seg(t, 0.8, 0.88, E.outBack);
  const sent = n4 >= REPLY.length;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: F }}>
      {/* 评论卡片：点击发送后弹出 */}
      <div
        style={{
          position: 'absolute',
          left: '12%',
          bottom: '46%',
          width: '66%',
          background: '#ffffff',
          borderRadius: 8,
          border: '0.5px solid rgba(20,22,28,0.08)',
          padding: '6px 9px',
          boxSizing: 'content-box', // 同上：66% 为内容宽
          fontSize: 8,
          color: INK,
          transform: `scale(${pop})`,
          transformOrigin: '20% 100%',
          boxShadow: WINDOW_SHADOW,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div style={{
          width: 15, height: 15, borderRadius: '50%', flex: 'none', background: 'linear-gradient(145deg, #3a3c44, #23242a)',
          color: '#fff', fontSize: 6, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>MR</div>
        <div style={{ lineHeight: 1.3 }}>
          <b style={{ fontWeight: 600 }}>Maya</b> <span style={{ color: '#9b9da3' }}>· just now</span>
          <br />
          {REPLY}
        </div>
      </div>
      {/* 输入 pill：从右侧滑入 */}
      <div
        style={{
          position: 'absolute',
          left: '8%',
          bottom: '26%',
          width: '84%',
          height: 26,
          borderRadius: 13,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(6px)',
          border: '0.5px solid rgba(20,22,28,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          boxSizing: 'content-box', // 同上：84% 为内容宽
          gap: 6,
          fontSize: 8,
          boxShadow: 'inset 0 0.5px 0 #ffffff, 0 6px 16px -6px rgba(16,18,26,0.25)',
          transform: `translateX(${(1 - slide) * 120}%)`,
          marginBottom: -pop * 4,
        }}
      >
        <span style={{ background: ACCENT, color: '#fff', borderRadius: 8, padding: '1px 5px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>00:42</span>
        <span style={{ flex: 1, color: t < 0.44 ? '#8a8d94' : INK, whiteSpace: 'nowrap' }}>
          {t < 0.44 ? 'Leave a comment…' : REPLY.slice(0, n4)}
        </span>
        <svg width={10} height={10} viewBox="0 0 24 24" fill={sent ? ACCENT : ACCENT_SOFT}>
          <path d="M3 20.5 21 12 3 3.5l2.6 7.1L14 12l-8.4 1.4z" />
        </svg>
      </div>
      {/* 光标：两段点击各缩一次 */}
      <div
        style={{
          position: 'absolute',
          zIndex: 5,
          left: `${p[0]}%`,
          top: `${p[1]}%`,
          transformOrigin: '0 0',
          transform: `scale(${1 - Math.sin(c1 * Math.PI) * 0.3 - Math.sin(c2 * Math.PI) * 0.3})`,
        }}
      >
        <Arrow />
      </div>
    </div>
  );
};

export const QuadSplitParallelScenes: React.FC = () => {
  const t = useT();
  const frame = Math.floor(t * 63); // dur 2100ms @30fps
  const scenes = [
    <QuadTL key={0} t={t} frame={frame} />,
    <QuadTR key={1} t={t} frame={frame} />,
    <QuadBL key={2} t={t} />,
    <QuadBR key={3} t={t} />,
  ];
  return (
    <AbsoluteFill>
      <DesignStage bg="#0f1014" raster="zoom">
        {scenes.map((scene, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i % 2) * 50}%`,
              top: `${(i >> 1) * 50}%`,
              width: '50%',
              height: '50%',
              overflow: 'hidden',
              background: BGS[i],
            }}
          >
            {scene}
          </div>
        ))}
      </DesignStage>
      <Vignette strength={0.16} inner={0.6} color="#0b0c12" />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
