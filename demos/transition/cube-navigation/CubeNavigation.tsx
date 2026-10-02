// cube-navigation — Cube Navigation 立方体逐面导航（motion-lab 定稿转原生 Remotion）
// 内容贴在 3D 立方体六面，相机逐面浏览：正面特写 → 拉远到等轴视角看清棱角 →
// 转到下一面推近，面间穿插斜角过渡；每面按法线朝向实时算明暗。
// 设计坐标 480×270（DesignStage 等比放大，raster="zoom" 让面上文字按成片尺寸栅格化），
// 参数表数值以此坐标系标定。
// 质感层：六面换成真实感的模块界面（指标 / 柱图 / 里程碑 / 文件 / 开关 / 导出），内容避开
// 特写时上下各 ~19px 的出画区；面上叠随明暗变化的左上受光 + 1px 棱边高光；立方体下方
// 一圈随当前面色相变化的地面光晕（等轴俯视时才看得见）；相机的推拉与转向错开 2% 时间——
// 拉远时先退后转、推近时先转后进（overlap），不再同步机械地一起走。
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const CUBE_NAVIGATION_DURATION = 180; // 6000ms @30fps

const S = 190; // 立方体边长
const H = S / 2;

type FaceKind = 'overview' | 'metrics' | 'timeline' | 'assets' | 'settings' | 'export';
// 六面：贴面变换 / 法线 / 色相 / 内容
const FACES: { n: string; tr: string; nm: [number, number, number]; hue: number; kind: FaceKind; meta: string }[] = [
  { n: 'OVERVIEW', tr: `translateZ(${H}px)`, nm: [0, 0, 1], hue: 224, kind: 'overview', meta: 'Last 30 days' },
  { n: 'METRICS', tr: `rotateY(90deg) translateZ(${H}px)`, nm: [1, 0, 0], hue: 268, kind: 'metrics', meta: 'Weekly' },
  { n: 'TIMELINE', tr: `rotateY(180deg) translateZ(${H}px)`, nm: [0, 0, -1], hue: 330, kind: 'timeline', meta: 'Q4 plan' },
  { n: 'ASSETS', tr: `rotateY(-90deg) translateZ(${H}px)`, nm: [-1, 0, 0], hue: 190, kind: 'assets', meta: '4 files' },
  { n: 'SETTINGS', tr: `rotateX(90deg) translateZ(${H}px)`, nm: [0, -1, 0], hue: 154, kind: 'settings', meta: 'Workspace' },
  { n: 'EXPORT', tr: `rotateX(-90deg) translateZ(${H}px)`, nm: [0, 1, 0], hue: 34, kind: 'export', meta: 'Share' },
];

// 相机关键姿态：正面 → 等轴 → 右面 → 等轴 → 背面 → 等轴收尾
const CAM = [
  { rx: 0, ry: 0, d: 235 },
  { rx: -22, ry: -38, d: -130 },
  { rx: 0, ry: -90, d: 235 },
  { rx: -27, ry: -142, d: -130 },
  { rx: 0, ry: -180, d: 235 },
  { rx: -24, ry: -226, d: -165 }, // 收尾等轴略退一点，尾帧立方体完整入画
];
// 每段关键帧的时间窗（t 域），窗间即 hold
const WIN: [number, number][] = [[0.10, 0.24], [0.30, 0.44], [0.50, 0.62], [0.66, 0.78], [0.84, 0.97]];
// 推拉与转向的错峰量（t 域 ≈ 3.6f）：拉远段 d 提前、推近段 d 滞后
const LEAD = 0.02;

type Cam = { rx: number; ry: number; d: number };
const CAM_KEYS = ['rx', 'ry', 'd'] as const;

// 累加式关键帧插值：各段进度独立过 ease 后按差值叠加，天然支持窗间 hold；
// d 轴按段性质前移/后移 LEAD，做出"先退后转 / 先转后进"的重叠
const acc = (t: number, base: Cam, kfs: { at: [number, number]; to: Cam }[], ease: (x: number) => number): Cam => {
  const out: Cam = { ...base };
  let prev = base;
  for (const kf of kfs) {
    const pullOut = kf.to.d < prev.d;
    for (const k of CAM_KEYS) {
      const sh = k === 'd' ? (pullOut ? -LEAD : LEAD) : 0;
      const u = seg(t, kf.at[0] + sh, kf.at[1] + sh, ease);
      out[k] += u * (kf.to[k] - prev[k]);
    }
    prev = kf.to;
  }
  return out;
};

const RAD = Math.PI / 180;

// ───── 面内容（设计坐标；特写时可见区约 y 19–171，内容放在 26–168） ─────
const ink = (h: number, a = 0.95) => `hsla(${h},40%,94%,${a})`;
const sub = (h: number, a = 0.62) => `hsla(${h},45%,82%,${a})`;
const acc1 = (h: number, a = 1) => `hsla(${h},88%,72%,${a})`;
const tile = (h: number): React.CSSProperties => ({
  background: `hsla(${h},50%,70%,0.08)`, boxShadow: `inset 0 0 0 0.5px hsla(${h},70%,80%,0.18)`, borderRadius: 5,
});

const FaceBody: React.FC<{ kind: FaceKind; h: number }> = ({ kind, h }) => {
  if (kind === 'overview') {
    const pts = [0.3, 0.42, 0.36, 0.55, 0.5, 0.62, 0.58, 0.74, 0.7, 0.86];
    const line = pts.map((v, i) => `${(i / 9) * 154},${(1 - v) * 30}`).join(' ');
    return (
      <>
        <div style={{ fontSize: 30, fontWeight: 700, color: ink(h), letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>24.8k</div>
        <div style={{ marginTop: 4, display: 'flex', gap: 5, alignItems: 'center', fontSize: 6.5, color: sub(h) }}>
          active users <span style={{ color: '#7ee2b0', fontWeight: 600 }}>▲ 12.4%</span>
        </div>
        <svg width={154} height={34} style={{ marginTop: 8, display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`cn-area-${h}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={acc1(h)} stopOpacity={0.35} />
              <stop offset="100%" stopColor={acc1(h)} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={`0,34 ${line} 154,34`} fill={`url(#cn-area-${h})`} />
          <polyline points={line} fill="none" stroke={acc1(h)} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={154} cy={(1 - 0.86) * 30} r={2.2} fill={ink(h)} />
        </svg>
        <div style={{ marginTop: 7, display: 'flex', gap: 6 }}>
          {[['Sessions', '182k'], ['Retention', '64%']].map(([k, v]) => (
            <div key={k} style={{ ...tile(h), flex: 1, padding: '5px 7px' }}>
              <div style={{ fontSize: 5.5, color: sub(h) }}>{k}</div>
              <div style={{ fontSize: 10, fontWeight: 650, color: ink(h), fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (kind === 'metrics') {
    const bars = [0.38, 0.52, 0.46, 0.64, 0.58, 0.82, 0.7];
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: ink(h), letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>$48.2k</div>
          <div style={{ fontSize: 7, color: '#7ee2b0', fontWeight: 600 }}>+6.3%</div>
        </div>
        <div style={{ marginTop: 4, fontSize: 6.5, color: sub(h) }}>net revenue this month</div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, borderBottom: `0.5px solid ${sub(h, 0.25)}` }}>
          {bars.map((v, i) => (
            <div key={i} style={{
              flex: 1, height: `${v * 100}%`, borderRadius: '2.5px 2.5px 0 0',
              background: i === 5 ? `linear-gradient(180deg, ${acc1(h)}, hsla(${h},70%,55%,1))` : `hsla(${h},60%,72%,0.22)`,
            }} />
          ))}
        </div>
        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 5.5, color: sub(h, 0.5) }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} style={{ flex: 1, textAlign: 'center' }}>{d}</span>)}
        </div>
      </>
    );
  }
  if (kind === 'timeline') {
    const ms = [['Design freeze', 'Oct 18', 1], ['Beta to 500 teams', 'Oct 30', 1], ['Pricing live', 'Nov 12', 0.5], ['GA launch', 'Dec 2', 0]] as const;
    return (
      <div style={{ position: 'relative', paddingLeft: 14, marginTop: 4 }}>
        <div style={{ position: 'absolute', left: 3.5, top: 4, bottom: 6, width: 1, background: sub(h, 0.25) }} />
        {ms.map(([t, d, s], i) => (
          <div key={i} style={{ position: 'relative', height: 33 }}>
            <div style={{
              position: 'absolute', left: -14, top: 1.5, width: 8, height: 8, borderRadius: 4, boxSizing: 'border-box',
              background: s === 1 ? acc1(h) : 'transparent', border: `1.2px solid ${s ? acc1(h) : sub(h, 0.45)}`,
              boxShadow: s === 0.5 ? `0 0 6px ${acc1(h, 0.7)}` : 'none',
            }} />
            <div style={{ fontSize: 8.5, fontWeight: 600, color: s === 0 ? sub(h, 0.75) : ink(h) }}>{t}</div>
            <div style={{ marginTop: 2, fontSize: 6, color: sub(h, 0.55), fontVariantNumeric: 'tabular-nums' }}>{d}{s === 0.5 ? ' · next' : ''}</div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'assets') {
    const files = [['Launch-film.mp4', '248 MB', 'MP4'], ['Brand-kit.fig', '36 MB', 'FIG'], ['Pricing-v3.pdf', '2.1 MB', 'PDF'], ['Hero-shots.zip', '512 MB', 'ZIP']];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
        {files.map(([n, sz, ext], i) => (
          <div key={i} style={{ ...tile(h), display: 'flex', alignItems: 'center', gap: 7, padding: '6px 7px' }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, background: i === 0 ? acc1(h, 0.9) : `hsla(${h},60%,70%,0.2)`,
              color: i === 0 ? `hsl(${h},50%,14%)` : ink(h, 0.8), fontSize: 4.8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{ext}</div>
            <div style={{ flex: 1, fontSize: 7.5, fontWeight: 550, color: ink(h), whiteSpace: 'nowrap' }}>{n}</div>
            <div style={{ fontSize: 5.8, color: sub(h, 0.55), fontVariantNumeric: 'tabular-nums' }}>{sz}</div>
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'settings') {
    const rows = [['Two-factor auth', true], ['Public share links', false], ['Weekly digest', true], ['Beta features', true]] as const;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
        {rows.map(([n, on], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', height: 30, borderBottom: i < 3 ? `0.5px solid ${sub(h, 0.16)}` : 'none' }}>
            <div style={{ flex: 1, fontSize: 8, fontWeight: 550, color: ink(h) }}>{n}</div>
            <div style={{ width: 20, height: 11, borderRadius: 6, background: on ? acc1(h) : `hsla(${h},40%,70%,0.2)`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 1.5, left: on ? 10.5 : 1.5, width: 8, height: 8, borderRadius: 4, background: '#fff', boxShadow: '0 0.5px 1px rgba(0,0,0,0.3)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 650, color: ink(h), letterSpacing: '-0.02em' }}>Q4 board report</div>
      <div style={{ marginTop: 3, fontSize: 6.5, color: sub(h) }}>12 pages · updated 2h ago</div>
      <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
        {['PDF', 'CSV', 'MP4'].map((x, i) => (
          <div key={x} style={{
            ...tile(h), flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 650,
            color: i === 0 ? ink(h) : sub(h, 0.8), boxShadow: i === 0 ? `inset 0 0 0 1px ${acc1(h, 0.8)}` : tile(h).boxShadow,
          }}>{x}</div>
        ))}
      </div>
      <div style={{
        marginTop: 12, height: 26, borderRadius: 6, background: `linear-gradient(180deg, ${acc1(h)}, hsla(${h},80%,58%,1))`,
        color: `hsl(${h},60%,12%)`, fontSize: 8.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.5)',
      }}>Export report</div>
    </>
  );
};

export const CubeNavigation: React.FC = () => {
  const t = useT();
  // 相机姿态：五段窗口依次插值
  const v = acc(t, CAM[0], WIN.map((w, i) => ({ at: w, to: CAM[i + 1] })), E.inOutCubic);
  // 法线明暗：Rx(rx)·Ry(ry)·n 的 z 分量
  const cy = Math.cos(v.ry * RAD), sy = Math.sin(v.ry * RAD);
  const cx = Math.cos(v.rx * RAD), sx = Math.sin(v.rx * RAD);
  // 地面光晕色相：跟着 ry 在 正面→右面→背面 的色相间过渡
  const faceIdx = Math.min(2, Math.max(0, -v.ry / 90));
  const hues = [224, 268, 330];
  const fi = Math.floor(faceIdx);
  const glowHue = hues[fi] + (hues[Math.min(2, fi + 1)] - hues[fi]) * (faceIdx - fi);
  return (
    <DesignStage bg="#000" raster="zoom">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(110% 100% at 50% 10%,#171b2a,#07080e 72%)',
          perspective: 760,
          overflow: 'hidden',
          fontFamily: FONT.sans,
          // 开场整体淡入
          opacity: seg(t, 0, 0.08, E.outCubic),
        }}
      >
        {/* 背景远处的冷色柔光（跟主光同在左上） */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(40% 50% at 30% 18%, rgba(120,140,220,0.10), rgba(120,140,220,0) 70%)' }} />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${v.d}px) rotateX(${v.rx}deg) rotateY(${v.ry}deg)`,
          }}
        >
          {/* 地面光晕：立方体下方一张水平圆盘（绕 Y 旋转不变形），等轴俯视时露出 */}
          <div style={{
            position: 'absolute', left: -170, top: -170, width: 340, height: 340, borderRadius: '50%',
            transform: `translateY(${H + 26}px) rotateX(90deg)`,
            background: `radial-gradient(circle, hsla(${glowHue},80%,62%,0.22) 0%, hsla(${glowHue},80%,55%,0.08) 38%, hsla(${glowHue},80%,50%,0) 70%)`,
          }} />
          {FACES.map((f, i) => {
            const [nx, ny, nz] = f.nm;
            const z1 = -nx * sy + nz * cy, y1 = ny;
            const z2 = y1 * sx + z1 * cx;
            const lit = Math.max(0, z2);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: -H,
                  top: -H,
                  width: S,
                  height: S,
                  transform: f.tr,
                  backfaceVisibility: 'hidden',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: `linear-gradient(155deg,hsl(${f.hue},44%,24%),hsl(${f.hue},52%,11%))`,
                  boxShadow: `inset 0 0 0 0.75px hsla(${f.hue},70%,74%,.38), inset 0 0.75px 0 hsla(${f.hue},80%,90%,.35)`,
                  filter: `brightness(${(0.5 + lit * 0.62).toFixed(3)}) saturate(${(0.8 + lit * 0.4).toFixed(2)})`,
                }}
              >
                {/* 左上受光：面越正对相机越亮 */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `radial-gradient(120% 90% at 18% 0%, hsla(${f.hue},80%,80%,${(0.05 + lit * 0.1).toFixed(3)}), hsla(${f.hue},80%,80%,0) 60%)`,
                }} />
                <div style={{ position: 'absolute', left: 18, right: 18, top: 28, bottom: 22 }}>
                  {/* 面标题行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2.5, background: acc1(f.hue), boxShadow: `0 0 6px ${acc1(f.hue, 0.5)}` }} />
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: acc1(f.hue, 0.95) }}>{f.n}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 6, color: sub(f.hue, 0.5) }}>{f.meta}</div>
                  </div>
                  <FaceBody kind={f.kind} h={f.hue} />
                </div>
              </div>
            );
          })}
        </div>
        <Vignette strength={0.4} inner={0.5} color="#020308" />
        <Grain opacity={0.07} blend="soft-light" scale={0.25} />
      </div>
    </DesignStage>
  );
};
