// steep-tilt-glide v5（批次 14 #2）。用户意见（逐字）：
// "角度不对，你看看原片这个镜头的角度；以及镜头是固定的，但是页面本身
// 往其3d空间的横面方向移动的效果"
// ——两点落实：①角度对照原片密帧校准（右缘近、左缘远的陡峭 rotateY，
// 顶缘向右上扬、透视灭点在左中下）；②运动模型改"物动镜不动"：
// perspective / perspectiveOrigin / rotateY / rotateZ 全程一个常数不动，
// 动的只有页面自身沿其 3D 平面横向（局部 X 轴）的滑移 translateX。
// v4 的悬空贴落（FloatWrap 同形软影）保留。
//
// 质感改版（镜头常数 / 滑移曲线 / 贴落节拍全部不动）：字体换系统栈 + 按字号的字距；
// 同形软影加大虚化、压低不透明度——读作影子而不是一份重叠的字；速度重影从两层
// 离散拷贝改为三层更密的拖尾（f-1.6/-3.2/-4.8，权重递减），读作拖影而不是双影；
// 主区空白圆角砖填入克制的小组件内容；右段白页加发丝边与投影分层；屏幕空间
// 左侧景深雾 + 颗粒，远端更沉、近端更亮，强化 60° 斜墙的纵深。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { FONT as PFONT, Grain } from '../../_fixtures/Polish';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

const FONT = PFONT.sans;
const INK = '#2a2a31';

const easeFall = Easing.bezier(0.5, 0.05, 0.6, 1); // 加速贴落、末端软着陆

/* 悬浮 + 同形软影（GrazeFaceTour FloatWrap 模式） */
const FloatWrap: React.FC<{ h: number; children: React.ReactNode }> = ({ h, children }) => (
  <div style={{ position: 'relative' }}>
    {h > 2 && (
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${h * 0.24}px, ${h * 0.46}px) scale(${1 + h * 0.0012})`,
        // 影子要读作"影"：随高度更虚、更淡，压成无字形的冷灰团（不再是一份可读的重叠字）
        filter: `blur(${9 + h * 0.13}px) brightness(0.2) saturate(0)`,
        opacity: Math.min(0.26, 0.1 + h * 0.0011),
        pointerEvents: 'none',
      }}>{children}</div>
    )}
    <div style={{ transform: `translate(${-h * 0.34}px, ${-h * 0.8}px)` }}>{children}</div>
  </div>
);

/* land=贴合完成时刻(0..1)，之前从 H 高度加速贴落 */
const liftOf = (t: number, land: number, H = 230) => {
  const FALL = 0.32;
  const p = Math.min(1, Math.max(0, (t - (land - FALL)) / FALL));
  return (1 - easeFall(p)) * H;
};

/* 主区圆角灰砖里的图标：场记板（镜头 / 分镜的通用符号，取代原片的第三方 logo） */
const ClapperGlyph: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    {/* 拍板：墨色条 + 琥珀斜纹 */}
    <g transform="rotate(-12 10 34)">
      <rect x={10} y={20} width={80} height={16} rx={3} fill={BRAND.ink} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M ${18 + i * 19} 36 L ${28 + i * 19} 20 L ${36 + i * 19} 20 L ${26 + i * 19} 36 Z`} fill={BRAND.amber} />
      ))}
    </g>
    {/* 板身 */}
    <rect x={10} y={40} width={80} height={46} rx={6} fill={BRAND.ink} />
    <rect x={20} y={54} width={34} height={6} rx={3} fill={BRAND.paper} opacity={0.85} />
    <rect x={20} y={68} width={52} height={6} rx={3} fill={BRAND.paper} opacity={0.5} />
  </svg>
);

/* 主区小组件：三张白砖各一种（进度 / 待办 / 走势），内容坐标同页面（6200 宽体系） */
const MiniWidget: React.FC<{ kind: number }> = ({ kind }) => {
  const title = ['Render queue', 'Shot list', 'Renders'][kind];
  return (
    <div style={{ fontFamily: FONT, color: INK }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 22, height: 22, borderRadius: 7, background: ['#7b68ee', '#e33bc6', '#49b8f9'][kind] }} />
        <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.015em' }}>{title}</div>
      </div>
      {kind === 0 && (
        <>
          <div style={{ marginTop: 40, fontSize: 120, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>72%</div>
          <div style={{ marginTop: 34, height: 22, borderRadius: 11, background: '#ececf2' }}>
            <div style={{ width: '72%', height: '100%', borderRadius: 11, background: 'linear-gradient(90deg, #7b68ee, #9b8cff)' }} />
          </div>
        </>
      )}
      {kind === 1 && (
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 30 }}>
          {[['Storyboard', 'Mon'], ['Sound design', 'Wed'], ['Final render', 'Fri']].map(([n, d], j) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 40 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, border: '4px solid #c9c9d4', boxSizing: 'border-box', background: j === 0 ? '#e33bc6' : 'transparent', borderColor: j === 0 ? '#e33bc6' : '#c9c9d4' }} />
              <span style={{ color: j === 0 ? '#9a9aa6' : INK, textDecoration: j === 0 ? 'line-through' : 'none' }}>{n}</span>
              <span style={{ marginLeft: 'auto', color: '#9a9aa6', fontSize: 34 }}>{d}</span>
            </div>
          ))}
        </div>
      )}
      {kind === 2 && (
        <svg width={440} height={150} viewBox="0 0 440 150" style={{ marginTop: 34, display: 'block' }}>
          <path d="M0 120 C 50 110, 70 70, 120 78 S 200 120, 250 72 S 340 30, 440 18" fill="none" stroke="#49b8f9" strokeWidth={8} strokeLinecap="round" />
          <path d="M0 120 C 50 110, 70 70, 120 78 S 200 120, 250 72 S 340 30, 440 18 V 150 H 0 Z" fill="rgba(73,184,249,0.12)" />
        </svg>
      )}
    </div>
  );
};

/* 页面：宽 6200 —— 左段=video-shotcraft 顶栏+侧栏（版式对齐原片用户截图三张），
   右段=原片后程滑入的图标砖、大 W 字、Launch film shots 列表 */
const PW = 6200;
const PH = 2400;

const Panel: React.FC<{ shade: number; t?: number }> = ({ shade, t = 1 }) => (
  <div style={{
    width: PW, height: PH, background: '#f4f4f6', borderRadius: 64,
    position: 'relative', overflow: 'hidden',
    boxShadow: '0 0 220px rgba(220,210,255,0.35)',
    fontFamily: FONT,
  }}>
    {/* 顶部 tab 条（贯穿整页；文字悬空贴落） */}
    <div style={{
      position: 'absolute', top: 0, left: 0, width: PW, height: 230,
      borderBottom: '4px solid #dcdce2', display: 'flex', alignItems: 'center', paddingLeft: 130,
    }}>
      <FloatWrap h={liftOf(t, 0.3)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width={58} height={58} viewBox="0 0 40 40" style={{ marginRight: 34 }}>
            {[[4, 4], [23, 4], [4, 23], [23, 23]].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width={13} height={13} rx={3} fill="none" stroke="#4a4a52" strokeWidth={3.5} />
            ))}
          </svg>
          <div style={{ fontSize: 66, color: INK, fontWeight: 500, letterSpacing: '-0.01em' }}>Shot recipes</div>
        </div>
      </FloatWrap>
      <FloatWrap h={liftOf(t, 0.42, 280)}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* 标题前的品牌方块 → video-shotcraft 标志；标题字标全小写 */}
          <ShotcraftMark size={150} tone="light" style={{ marginLeft: 110, flexShrink: 0 }} />
          <div style={{ fontSize: 165, color: '#222228', fontWeight: 600, marginLeft: 70, letterSpacing: '-0.035em', whiteSpace: 'nowrap', fontFamily: BRAND.font }}>{BRAND.name}</div>
        </div>
      </FloatWrap>
      {/* 顶栏右延的淡 tab（版式对齐原片 clickup04 顶栏） */}
      {[['Launch storyboard', 3050], ['Camera moves', 3900], ['Renders', 4650]].map(([tb, x]) => (
        <div key={tb as string} style={{ position: 'absolute', left: x as number, top: 88, fontSize: 58, color: '#8d8d96' }}>{tb}</div>
      ))}
    </div>
    {/* 工作区 logo 行：video-shotcraft 标志 + 简称 */}
    <div style={{ position: 'absolute', left: 120, top: 560 }}>
      <FloatWrap h={liftOf(t, 0.54, 250)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <ShotcraftMark size={104} tone="light" />
          <div style={{ fontSize: 92, fontWeight: 750, color: '#222228', letterSpacing: '-0.03em', fontFamily: BRAND.font }}>{BRAND.short}</div>
        </div>
      </FloatWrap>
    </div>
    {/* 主区圆角灰砖：场记板图标 + 下拉 chevron（原片 f45–f60） */}
    <div style={{ position: 'absolute', left: 1330, top: 440 }}>
      <FloatWrap h={liftOf(t, 0.62, 260)}>
        <div style={{
          width: 620, height: 350, background: '#ebebef', borderRadius: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60,
        }}>
          <div style={{
            width: 210, height: 210, background: '#fdfdfe', borderRadius: 44,
            boxShadow: '0 6px 60px rgba(180,180,200,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClapperGlyph size={130} />
          </div>
          <svg width={90} height={90} viewBox="0 0 40 40">
            <path d="M 10 15 L 20 26 L 30 15" fill="none" stroke="#6a6a74" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </FloatWrap>
    </div>
    {/* Home 宽药丸（紫边细线横贯面板） */}
    <div style={{ position: 'absolute', left: 110, top: 830, width: 2900 }}>
      <FloatWrap h={liftOf(t, 0.68, 260)}>
        <div style={{
          width: 2900, height: 168,
          borderRadius: 34, border: '3.5px solid rgba(118,108,238,0.75)',
          background: 'rgba(122,110,240,0.09)', display: 'flex', alignItems: 'center',
          gap: 40, paddingLeft: 56, boxSizing: 'border-box',
        }}>
          <svg width={66} height={66} viewBox="0 0 40 40">
            <path d="M 6 20 L 20 7 L 34 20 M 11 17 V 33 H 29 V 17" fill="none" stroke="#5a5ad2" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 70, color: '#5353cf', fontWeight: 550 }}>Home</div>
        </div>
      </FloatWrap>
    </div>
    {/* Inbox 行 */}
    <div style={{ position: 'absolute', left: 166, top: 1070 }}>
      <FloatWrap h={liftOf(t, 0.8, 240)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <svg width={64} height={64} viewBox="0 0 40 40">
            <path d="M 20 5 C 13 5 10 10 10 16 V 24 L 6 30 H 34 L 30 24 V 16 C 30 10 27 5 20 5 Z M 16 33 C 16 36 24 36 24 33"
              fill="none" stroke="#3a3a42" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 70, color: INK }}>Inbox</div>
        </div>
      </FloatWrap>
    </div>
    {/* 更多侧栏行 */}
    {['Docs', 'Dashboards'].map((tb, i) => (
      <div key={tb} style={{ position: 'absolute', left: 166, top: 1310 + i * 240 }}>
        <FloatWrap h={liftOf(t, 0.86 + i * 0.06, 230)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <div style={{ width: 58, height: 58, border: '6px solid #8f8f98', borderRadius: 14 }} />
            <div style={{ fontSize: 70, color: INK }}>{tb}</div>
          </div>
        </FloatWrap>
      </div>
    ))}
    {/* 主区轮播左箭头（原片 f60 中景的 "<"） */}
    <div style={{ position: 'absolute', left: 2440, top: 1060 }}>
      <svg width={120} height={120} viewBox="0 0 40 40">
        <path d="M 26 6 L 12 20 L 26 34" fill="none" stroke="#2c2c33" strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    {/* 大 W 字形（原片中程右上滑入的大字残段） */}
    <div style={{ position: 'absolute', left: 3050, top: 300, fontSize: 430, fontWeight: 700, color: '#232329', letterSpacing: '-0.04em' }}>W</div>
    {/* 主区白色圆角卡群（右下白砖）：填入克制的小组件内容，不再是空白块 */}
    {[[2620, 620, 640, 380], [2740, 1360, 720, 420], [2620, 1900, 560, 330]].map(([x, y, w, h], i) => (
      <div key={i} style={{
        position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box',
        background: 'linear-gradient(180deg, #ffffff 0%, #f9f9fb 100%)', borderRadius: 56,
        border: '3px solid rgba(28,28,40,0.05)',
        boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(150,150,175,0.16), 0 40px 90px -30px rgba(120,120,150,0.32)',
        padding: '52px 60px', overflow: 'hidden',
      }}>
        <MiniWidget kind={i} />
      </div>
    ))}
    {/* —— 右段：Launch film shots 列表（原片尾程满幅白页） —— */}
    <div style={{
      position: 'absolute', left: 3560, top: 230, width: PW - 3560, height: PH - 230,
      background: 'linear-gradient(180deg, #fdfdfe 0%, #f9f9fb 100%)',
      // 发丝边 + 左侧投影：白页叠在主区之上，而不是一条生硬的色块分界
      boxShadow: '-3px 0 0 rgba(28,28,40,0.06), -40px 0 90px -20px rgba(110,110,140,0.22)',
    }}>
      <div style={{ position: 'absolute', left: 220, top: 200, fontSize: 150, fontWeight: 700, color: '#1f1f25', letterSpacing: '-0.035em', whiteSpace: 'nowrap' }}>Launch film shots</div>
      {/* List / Board tabs */}
      <div style={{ position: 'absolute', left: 240, top: 480, display: 'flex', gap: 110, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 26, background: '#ececf1',
          borderRadius: 22, padding: '20px 40px',
        }}>
          <svg width={56} height={56} viewBox="0 0 40 40">
            {[9, 20, 31].map((y) => (
              <g key={y}>
                <rect x={5} y={y - 1.6} width={4} height={4} fill="#3a3a42" />
                <rect x={14} y={y - 1.4} width={20} height={3.4} rx={1.6} fill="#3a3a42" />
              </g>
            ))}
          </svg>
          <div style={{ fontSize: 62, fontWeight: 600, color: '#2c2c33' }}>List</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <svg width={56} height={56} viewBox="0 0 40 40">
            <rect x={5} y={7} width={12} height={26} rx={3} fill="none" stroke="#3a3a42" strokeWidth={3} />
            <rect x={23} y={7} width={12} height={18} rx={3} fill="none" stroke="#3a3a42" strokeWidth={3} />
          </svg>
          <div style={{ fontSize: 62, fontWeight: 500, color: '#2c2c33' }}>Board</div>
        </div>
        <div style={{ fontSize: 56, color: '#9a9aa4', marginLeft: -40 }}>11</div>
      </div>
      <div style={{ position: 'absolute', left: 900, top: 620, width: 1500, height: 3, background: '#e4e4ea' }} />
      {/* IN PROGRESS chip */}
      <div style={{
        position: 'absolute', left: 240, top: 850, background: '#fce4f5', color: '#c93bb0',
        fontSize: 46, fontWeight: 650, letterSpacing: '0.06em', padding: '14px 30px', borderRadius: 14,
      }}>IN PROGRESS</div>
      <div style={{ position: 'absolute', left: 244, top: 1030, fontSize: 44, fontWeight: 600, color: '#8f8f98', letterSpacing: '0.08em' }}>SHOT NAME</div>
      {/* 任务行 */}
      {[['Crash zoom opener', '#3a3a42'], ['Steep tilt glide', '#55555e'], ['Beat-synced cuts', '#83838d'], ['Logo sting', '#b3b3bc']].map(([name, col], i) => (
        <div key={name as string} style={{ position: 'absolute', left: 280, top: 1180 + i * 210, display: 'flex', alignItems: 'center', gap: 56 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e33bc6' }} />
          <div style={{ fontSize: 64, fontWeight: 550, color: col as string, whiteSpace: 'nowrap' }}>{name}</div>
        </div>
      ))}
    </div>
    {/* 亮度：面板内黑罩（随进度揭亮） */}
    <div style={{ position: 'absolute', inset: 0, background: '#050409', opacity: shade }} />
    {/* 左缘额外阴影（起始更暗，随亮度一同退去） */}
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(90deg, rgba(5,4,9,0.9), rgba(5,4,9,0) 42%)',
      opacity: Math.min(1, shade * 1.6),
    }} />
  </div>
);

/* 固定镜头 + 页面沿自身平面横向滑移。
 * 镜头常数（对照原片密帧校准）：perspective 1150、origin 24% 62%、
 * rotateY(-38°)（右缘近、左缘远，顶缘向右上扬）+ rotateZ(-2°)。
 * lx = 页面局部 X 平移（页面自己的横面方向），全程唯一动的量 */
// v7（批次 16）：用户意见"改成60度吧"——rotY -53 → -60（精确定值）
const CAM = { persp: 1100, origin: '30% 58%', rotY: -60, rotZ: -2, left: '40%', top: '15%', scale: 0.62 };

const PanelLayer: React.FC<{ lx: number; shade: number; opacity: number; t: number }> = ({ lx, shade, opacity, t }) => (
  <AbsoluteFill style={{ opacity }}>
    <AbsoluteFill style={{ perspective: CAM.persp, perspectiveOrigin: CAM.origin }}>
      <div style={{
        position: 'absolute', left: CAM.left, top: CAM.top,
        transform: `rotateY(${CAM.rotY}deg) rotateZ(${CAM.rotZ}deg)`, transformOrigin: 'left top',
      }}>
        {/* 页面自身在其 3D 平面内横移（局部 X 轴） */}
        <div style={{ transform: `scale(${CAM.scale}) translateX(${lx}px)`, transformOrigin: 'left top' }}>
          <Panel shade={shade} t={t} />
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const STEEP_TILT_GLIDE_DURATION = 120; // 4s 单镜（滑移曲线按 0–120f 标定）

export const SteepTiltGlide: React.FC = () => {
  const frame = useCurrentFrame();

  // 页面滑移（物动镜不动）：局部 X 从 +140 → -2680，起步柔和后近匀速，
  // 全程不安定停死（bezier 尾段斜率不归零）
  const glide = Easing.bezier(0.3, 0.12, 0.72, 0.9);
  const lxAt = (f: number) => {
    const p = interpolate(f, [0, 120], [0, 1], { easing: glide, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return interpolate(p, [0, 1], [60, -4100]);
  };

  const lx = lxAt(frame);
  // 面板黑罩：起始暗 → 约 1.4s 全亮（对齐原片节奏）
  const shade = interpolate(frame, [0, 18, 44], [0.7, 0.4, 0], { extrapolateRight: 'clamp' });
  // 重影强度 ∝ 滑移速度（拖尾=过去时刻的局部位置，同一固定镜头下重投影）
  const speed = Math.abs(lxAt(frame - 1) - lxAt(frame + 1)) / 2;
  // 三层更密的拖尾（权重递减），叠出连续拖影而非离散双影
  const g1 = Math.min(0.3, speed * 0.021);
  const g2 = Math.min(0.2, speed * 0.014);
  const g3 = Math.min(0.11, speed * 0.008);
  // 文字悬空贴落进程（v4 保留）
  const drop = interpolate(frame, [4, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 紫晕随亮度浮现
  const glow = interpolate(frame, [14, 70], [0.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#060409' }}>
      {/* 左侧紫晕 */}
      <AbsoluteFill style={{
        opacity: glow,
        background: 'radial-gradient(ellipse 40% 50% at 20% 66%, rgba(118,58,190,0.30), transparent 70%)',
      }} />
      {/* 重影（先画，垫在本体后面；位置=过去时刻的页面局部位移） */}
      {g3 > 0.02 && <PanelLayer lx={lxAt(frame - 4.8)} shade={shade} opacity={g3} t={drop} />}
      {g2 > 0.02 && <PanelLayer lx={lxAt(frame - 3.2)} shade={shade} opacity={g2} t={drop} />}
      {g1 > 0.02 && <PanelLayer lx={lxAt(frame - 1.6)} shade={shade} opacity={g1} t={drop} />}
      {/* 本体 */}
      <PanelLayer lx={lx} shade={shade} opacity={1} t={drop} />
      {/* 景深雾（屏幕空间）：斜墙远端（画面左侧）沉进暗场，近端保持亮 */}
      <AbsoluteFill style={{
        background: 'linear-gradient(100deg, rgba(6,4,10,0.62) 0%, rgba(6,4,10,0.28) 18%, rgba(6,4,10,0) 40%)',
        pointerEvents: 'none',
      }} />
      {/* 暗角 */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 105% 95% at 55% 42%, transparent 60%, rgba(3,2,8,0.25) 85%, rgba(2,1,6,0.5) 100%)',
        pointerEvents: 'none',
      }} />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
