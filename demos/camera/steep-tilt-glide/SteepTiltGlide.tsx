// steep-tilt-glide —— 固定机位下，一堵 60° 强透视斜立的页面墙沿自身横面滑过镜头（物动镜不动）。
//
// 第二轮重设计（lime · 石墨暗场 + 荧光黄绿，运动 / 数据 / 节奏）：
// - 命门不动：perspective 1100 / origin 30% 58% / rotateY(-60°) rotateZ(-2°) / left 40% top 15% / scale 0.62
//   全程常数，唯一的动量是页面局部 translateX。
// - 页面从浅灰占位 UI 换成一张为镜头设计的深色产品长页（虚构跑步训练产品 STRIDE 4），像列车车厢一样
//   五节依次掠过：① 200px 标题「Every run, decoded.」② 配速卡 4:12 /km + 荧光曲线 ③ 心率区间柱（Z4 主角）
//   ④ 路线卡 12.4 km ⑤ 收尾「Run smarter.」+ 荧光按钮。每节一个大字主角，近端（画面右侧）放大后可读。
// - 节奏「慢—快—慢」：滑移曲线 bezier(0.36,0.08,0.32,0.94)——标题段柔起、中段三节车厢高速掠过、
//   收尾段减速成缓慢的蠕行（尾段斜率不归零，不安定停死；末帧是可读的收尾海报）。
// - 速度重影：三层密拖尾（f-0.5/-1.0/-1.5，间距小到连成一片拖影而非重像）叠在本体之上 lighten 混合，透明度 ∝ 滑移速度，只在高速段出现。
// - 悬空贴落改成真 3D：卡片在 preserve-3d 里 translateZ 悬在页面前方，按自己滑到的位置（进入近端→读区）
//   加速贴落到页面上，页面上的同形软影随高度收拢变实。
// - 光：一团固定在镜头坐标系里的荧光主光（页面在光下滑过，光不跟着走）、页面顶缘一道荧光轮廓线；
//   开场 0–36f 页面由暗揭亮；远端（画面左）沉进雾里。
//
// 时间表（30fps，共 150f）：
//   0–36    揭亮：页面黑罩 0.75→0；标题段在近端柔起
//   20–110  高速段：配速 / 心率 / 路线三节车厢掠过，各自在读区前贴落；重影随速度出现
//   110–150 减速蠕行：收尾「Run smarter.」滑进近端读区，按钮贴落；末 20f 速度降到峰值的 ~10%
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';

export const STEEP_TILT_GLIDE_DURATION = 150;

const L = LOOKS.lime;
const PW = 6400; // 页面内容宽（右端留余量，收尾时页面末端不入画）
const PH = 2000;
const CAM = { persp: 1100, origin: '30% 58%', rotY: -60, rotZ: -2, left: '40%', top: '15%', scale: 0.62 };
const GLIDE = bezier(0.36, 0.08, 0.32, 0.94);
const LX0 = 150;
const LX1 = -4760;
const lxAt = (f: number) => mix(LX0, LX1, GLIDE(Math.min(1, Math.max(0, f / STEEP_TILT_GLIDE_DURATION))));

const T = (size: number, weight: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT.sans, fontSize: size, fontWeight: weight, lineHeight: 1,
  letterSpacing: size >= 120 ? '-0.045em' : size >= 60 ? '-0.025em' : '0em', fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap', ...extra,
});
const CAPS = (size: number): React.CSSProperties => ({ ...T(size, 700), letterSpacing: '0.18em', textTransform: 'uppercase' });

// 悬浮高度：元素中心滑到局部 x（已乘 scale 的屏前坐标）从 900（刚进近端）到 420（读区入口）之间加速贴落
const liftOf = (cx: number, lx: number, H = 220) => {
  const x = (cx + lx) * CAM.scale;
  const p = Math.min(1, Math.max(0, (900 - x) / (900 - 420)));
  return (1 - EASE.exit(p)) * H;
};

// 悬浮件：真 3D translateZ + 页面上的同形软影
const Float: React.FC<{ x: number; y: number; w: number; h: number; lx: number; H?: number; radius?: number; children: React.ReactNode }> = ({
  x, y, w, h, lx, H = 220, radius = 48, children,
}) => {
  const lift = liftOf(x + w / 2, lx, H);
  const k = lift / H;
  return (
    <>
      {/* 软影用径向渐变画（3D 层里不用 filter: blur，免得 Chromium 按近端放大倍率栅格化巨型纹理） */}
      <div style={{
        position: 'absolute', left: x - 40 + lift * 0.25, top: y - 20 + lift * 0.3, width: w + 80, height: h + 100,
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,${mix(0.7, 0.3, k).toFixed(3)}) ${mix(62, 30, k).toFixed(0)}%, rgba(0,0,0,0) 100%)`,
        transform: 'translateZ(1px)',
      }} />
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `translateZ(${(2 + lift).toFixed(1)}px)` }}>{children}</div>
    </>
  );
};

const Card: React.FC<{ children: React.ReactNode; hot?: boolean }> = ({ children, hot }) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 48, boxSizing: 'border-box', padding: '64px 72px', overflow: 'hidden',
    background: `linear-gradient(180deg, #23271d 0%, ${L.surface2} 100%)`,
    border: `3px solid ${hot ? alpha(L.accent, 0.5) : 'rgba(255,255,255,0.08)'}`,
    boxShadow: `inset 0 3px 0 rgba(255,255,255,0.08)`,
  }}>{children}</div>
);

const PACE = Array.from({ length: 24 }, (_, i) => 120 - 46 * Math.sin(i * 0.42) - 28 * Math.sin(i * 1.1 + 1) - i * 2.2);
const pacePath = PACE.map((y, i) => `${i ? 'L' : 'M'}${(i * 44).toFixed(0)} ${y.toFixed(1)}`).join(' ');
const ZONES = [0.28, 0.46, 0.62, 0.92, 0.38];

const Page: React.FC<{ lx: number }> = ({ lx }) => (
  <div style={{ position: 'relative', width: PW, height: PH, transformStyle: 'preserve-3d', fontFamily: FONT.sans }}>
    {/* 页面底：圆角深石墨 + 顶缘荧光轮廓线 + 镜头坐标系里固定的主光 */}
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 64, overflow: 'hidden',
      background: `linear-gradient(180deg, #1b1e17 0%, ${L.surface} 40%, #0e100c 100%)`,
      boxShadow: `inset 0 6px 0 ${alpha(L.accent, 0.55)}, inset 0 0 0 3px rgba(255,255,255,0.05)`,
    }}>
      <div style={{
        position: 'absolute', top: -300, height: 2200, width: 3000, left: 300 - lx - 1500,
        background: `radial-gradient(ellipse 50% 50% at 50% 40%, ${alpha(L.accent, 0.16)} 0%, ${alpha(L.accent, 0.05)} 45%, ${alpha(L.accent, 0)} 75%)`,
      }} />
      {/* 细网格纹理 */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px)', backgroundSize: '200px 100%',
      }} />
    </div>

    {/* 顶栏 */}
    <div style={{ position: 'absolute', left: 140, top: 80, display: 'flex', alignItems: 'center', gap: 28, transform: 'translateZ(2px)' }}>
      <svg width={72} height={72} viewBox="0 0 40 40">
        <path d="M6 30 L16 10 L22 22 L27 14 L34 30" fill="none" stroke={L.accent} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ ...T(64, 800), letterSpacing: '0.04em', color: L.ink }}>STRIDE</div>
    </div>
    {[['Training', 1400], ['Insights', 2200], ['Routes', 3000], ['Coach', 3800], ['Pricing', 4600]].map(([t, x]) => (
      <div key={t as string} style={{ position: 'absolute', left: x as number, top: 98, ...T(48, 500), color: L.ink3, transform: 'translateZ(2px)' }}>{t as string}</div>
    ))}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 214, height: 3, background: 'rgba(255,255,255,0.06)', transform: 'translateZ(1px)' }} />

    {/* ① 标题段 */}
    <div style={{ position: 'absolute', left: 140, top: 340, transform: 'translateZ(2px)' }}>
      <div style={{ ...CAPS(40), color: L.accent }}>● Stride 4 · Spring release</div>
      <div style={{ ...T(210, 850), color: L.ink, marginTop: 56 }}>Every run,</div>
      <div style={{ ...T(210, 850), color: L.ink, marginTop: 10 }}>decoded<span style={{ color: L.accent }}>.</span></div>
      <div style={{ ...T(56, 450), color: L.ink2, marginTop: 64 }}>Pace, heart rate and recovery in one live view.</div>
    </div>

    {/* ② 配速卡 */}
    <Float x={1600} y={330} w={1150} h={760} lx={lx}>
      <Card>
        <div style={{ ...CAPS(36), color: L.ink3 }}>Avg pace</div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 40 }}>
          <div style={{ ...T(300, 800), color: L.ink }}>4:12</div>
          <div style={{ ...T(84, 600), color: L.ink2, marginLeft: 28 }}>/km</div>
        </div>
        <svg width={1012} height={200} viewBox="0 0 1012 200" style={{ position: 'absolute', left: 72, bottom: 60 }}>
          <path d={`${pacePath} L1012 200 L0 200 Z`} fill={alpha(L.accent, 0.1)} />
          <path d={pacePath} fill="none" stroke={L.accent} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={23 * 44} cy={PACE[23]} r={18} fill={L.accent} />
        </svg>
      </Card>
    </Float>

    {/* ③ 心率区间 */}
    <Float x={2850} y={330} w={1150} h={760} lx={lx}>
      <Card hot>
        <div style={{ ...CAPS(36), color: L.ink3 }}>Heart-rate zones</div>
        <div style={{ ...T(120, 800), color: L.ink, marginTop: 34 }}>
          38<span style={{ ...T(70, 700), color: L.ink2 }}>% in Z4</span>
        </div>
        <div style={{ position: 'absolute', left: 72, right: 72, bottom: 64, height: 330, display: 'flex', alignItems: 'flex-end', gap: 36 }}>
          {ZONES.map((z, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <div style={{
                width: '100%', height: 260 * z, borderRadius: 20,
                background: i === 3 ? L.accent : 'rgba(255,255,255,0.12)',
                boxShadow: i === 3 ? `0 0 60px ${alpha(L.accent, 0.5)}` : undefined,
              }} />
              <div style={{ ...T(40, 700), color: i === 3 ? L.accent : L.ink3 }}>Z{i + 1}</div>
            </div>
          ))}
        </div>
      </Card>
    </Float>

    {/* ④ 路线卡 */}
    <Float x={4100} y={330} w={820} h={760} lx={lx}>
      <Card>
        <div style={{ ...CAPS(36), color: L.ink3 }}>Sunday long run</div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 34 }}>
          <div style={{ ...T(160, 800), color: L.ink }}>12.4</div>
          <div style={{ ...T(64, 600), color: L.ink2, marginLeft: 20 }}>km</div>
        </div>
        <svg width={680} height={300} viewBox="0 0 680 300" style={{ position: 'absolute', left: 70, bottom: 56 }}>
          <path d="M30 250 C 120 260, 140 120, 250 140 S 380 260, 450 170 S 560 40, 650 60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={34} strokeLinecap="round" />
          <path d="M30 250 C 120 260, 140 120, 250 140 S 380 260, 450 170 S 560 40, 650 60" fill="none" stroke={L.accent} strokeWidth={10} strokeLinecap="round" />
          <circle cx={30} cy={250} r={18} fill={L.ink} />
          <circle cx={650} cy={60} r={22} fill={L.accent} />
        </svg>
      </Card>
    </Float>

    {/* ⑤ 收尾 */}
    <div style={{ position: 'absolute', left: 5020, top: 360, transform: 'translateZ(2px)' }}>
      <div style={{ ...CAPS(40), color: L.accent }}>Available today</div>
      <div style={{ ...T(190, 850), color: L.ink, marginTop: 50 }}>Run</div>
      <div style={{ ...T(190, 850), color: L.ink, marginTop: 6 }}>smarter.</div>
    </div>
    <Float x={5030} y={860} w={720} h={170} lx={lx} H={150} radius={85}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 85, background: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        boxShadow: `0 0 80px ${alpha(L.accent, 0.45)}, inset 0 3px 0 rgba(255,255,255,0.5)`,
      }}>
        <div style={{ ...T(60, 750), color: L.onAccent }}>Start free trial</div>
        <svg width={48} height={48} viewBox="0 0 24 24"><path d="M5 12 H19 M13 6 L19 12 L13 18" fill="none" stroke={L.onAccent} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </Float>

  </div>
);

const Layer: React.FC<{ lx: number; shade: number; opacity: number; blend?: boolean }> = ({ lx, shade, opacity, blend }) => (
  // 揭亮走外层 brightness（在透视容器之外，不打断 preserve-3d）
  <AbsoluteFill style={{ opacity, mixBlendMode: blend ? 'lighten' : undefined, filter: shade > 0.001 ? `brightness(${(1 - shade).toFixed(3)})` : undefined }}>
    <AbsoluteFill style={{ perspective: CAM.persp, perspectiveOrigin: CAM.origin }}>
      <div style={{
        position: 'absolute', left: CAM.left, top: CAM.top, transformStyle: 'preserve-3d',
        transform: `rotateY(${CAM.rotY}deg) rotateZ(${CAM.rotZ}deg)`, transformOrigin: 'left top',
      }}>
        <div style={{ transform: `scale(${CAM.scale}) translateX(${lx.toFixed(2)}px)`, transformOrigin: 'left top', transformStyle: 'preserve-3d' }}>
          <Page lx={lx} />
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const SteepTiltGlide: React.FC = () => {
  const frame = useCurrentFrame();
  const lx = lxAt(frame);
  const shade = 0.75 * (1 - ramp(frame, 0, 36, EASE.out));
  const speed = Math.abs(lxAt(frame + 1) - lxAt(frame - 1)) / 2; // 内容 px/帧
  const g1 = Math.min(0.24, Math.max(0, speed - 22) * 0.01);
  const g2 = Math.min(0.15, Math.max(0, speed - 22) * 0.0065);
  const g3 = Math.min(0.08, Math.max(0, speed - 22) * 0.0035);

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.72, y: 0.12 }} fill={{ x: 0.18, y: 0.72 }} intensity={0.8} vignette={0} grain={0} />
      <Layer lx={lx} shade={shade} opacity={1} />
      {/* 重影叠在本体之上、lighten 混合：同色页面底不变，只有亮字与荧光件拖出残影（垫在本体下面会被不透明页面挡掉） */}
      {g3 > 0.02 && <Layer lx={lxAt(frame - 1.5)} shade={shade} opacity={g3} blend />}
      {g2 > 0.02 && <Layer lx={lxAt(frame - 1.0)} shade={shade} opacity={g2} blend />}
      {g1 > 0.02 && <Layer lx={lxAt(frame - 0.5)} shade={shade} opacity={g1} blend />}
      {/* 远端雾：斜墙消失端沉进暗场 */}
      <AbsoluteFill style={{
        pointerEvents: 'none',
        background: `linear-gradient(98deg, ${alpha(L.bg[2], 0.85)} 0%, ${alpha(L.bg[2], 0.45)} 22%, ${alpha(L.bg[2], 0)} 44%)`,
      }} />
      <AbsoluteFill style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse 100% 90% at 60% 45%, transparent 58%, ${alpha('#000000', 0.45)} 100%)`,
      }} />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
