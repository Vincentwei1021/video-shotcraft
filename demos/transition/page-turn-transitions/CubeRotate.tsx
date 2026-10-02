// 立方体空间翻转（cube-rotate）——两页贴在立方体相邻两面，整体绕竖轴转 90°：并列章节翻篇。
//
// 第二轮重设计（瓷白舞台 · 明暗两面的章节盒）：
// - look = porcelain（冷白 · 钴蓝 · 青绿点缀）。主体是虚构协作产品「Tandem」的两个并列章节：
//   面 A「01 · Plan」是亮面（白底 + 钴蓝路线图），面 B「02 · Ship」是暗面（深海军蓝 + 青绿发布清单）。
//   一明一暗两面让体块在转动时自带明暗对切——不用靠压暗也读得出"盒子转了一面"。
// - 每一面都是为镜头设计的页：左栏 140px 大标题 + 40px 副题，右栏只放一个讲清章节的组件（甘特路线图 /
//   发布清单 + 区域环），1920 原生排版后按 S=0.76 走 CSS zoom 贴面（Q2：按目标尺寸栅格化，3D 里文字不糊）。
// - 体块感：①明暗——按法线夹角兰伯特压暗、远离镜头一侧再深一档，共享凸棱亮起一条受光细棱；
//   ②重量——θ 先回拉 ~1.6°（预备）再转、到位过冲 ~1.6° 回落；转动中相机后退 14%，凸角迎向镜头时不出框；
//   ③空间——瓷白地面上有接触影 + 盒子的淡倒影（同一 3D 场景镜像一份，渐隐遮罩）；
//   ④速度——按棱上线速度挂横向运动模糊，静止为 0。
// - 章节指示器（画面底部 01 Plan — 02 Ship）的钴蓝下划线与盒子同一条曲线滑动，讲清"并列的两章"。
//
// 时间表（30fps，共 150f）：
//   0–34    面 A 建立：标题在场，甘特条按行错峰生长（4–30f），相机极缓推近
//   34–74   翻转 θ 0→−90°（40f，先回拉再转、过冲回落）；相机后退 1→0.86→1；指示器同步滑动
//   76–118  面 B 跟随：发布清单四项依次打勾（stagger 先密后疏），区域环 0→48/48
//   118–150 hold：面 B 定格海报，相机极缓推近
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, mix, ramp, softShadow, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, stagger, type } from '../../_fixtures/Look';

export const CUBE_ROTATE_DURATION = 150;

const L = LOOKS.porcelain;
const NAVY = { bg: '#0d1530', bg2: '#141e40', ink: '#f2f5ff', ink2: '#a3aed0', ink3: '#5d6890', line: 'rgba(170,190,255,0.14)' };

const S = 0.76;
const W = 1920 * S; // 面宽 = 立方体棱长
const H = 1080 * S;
const LEFT = (1920 - W) / 2;
const TOP = 66;

const TURN0 = 34;
const TURN_D = 40;
const TURN = bezier(0.6, -0.2, 0.2, 1.2); // 先回拉再转、到位过冲回落
const thetaAt = (f: number) => -90 * ramp(f, TURN0, TURN_D, TURN);

// ───────────── 面 A：01 · Plan（亮面 · 甘特路线图）─────────────
const LANES = [
  { name: 'Search v2', start: 0.04, len: 0.46, color: L.accent },
  { name: 'Billing', start: 0.22, len: 0.38, color: '#7d95ff' },
  { name: 'Mobile app', start: 0.36, len: 0.52, color: L.accent },
  { name: 'Docs site', start: 0.6, len: 0.34, color: L.accent2 },
];
const FaceA: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, #ffffff 0%, ${L.surface2} 100%)`, fontFamily: FONT.sans }}>
    <div style={{ position: 'absolute', left: 120, top: 120, width: 760 }}>
      <div style={{ ...type(34, 700, { caps: true }), letterSpacing: '0.18em', color: L.accent }}>01 · Plan</div>
      <div style={{ ...type(140, 760), color: L.ink, marginTop: 34, letterSpacing: '-0.05em' }}>Plan the<br />quarter.</div>
      <div style={{ ...type(46, 450), color: L.ink2, marginTop: 40, lineHeight: 1.3 }}>Roadmaps that update<br />themselves as work ships.</div>
    </div>
    {/* 左下：协作者（填满左栏底部，讲"一起计划"） */}
    <div style={{ position: 'absolute', left: 120, top: 860, display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ display: 'flex' }}>
        {['#2f5bff', '#00b39a', '#f2a541', '#e0567a'].map((c, k) => (
          <div key={c} style={{ width: 72, height: 72, borderRadius: 36, background: c, marginLeft: k ? -18 : 0, boxShadow: '0 0 0 5px #f6f8fc', display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(30, 700), color: '#fff' }}>
            {['M', 'T', 'A', 'R'][k]}
          </div>
        ))}
      </div>
      <div style={{ ...type(40, 500), color: L.ink2 }}>Maya, Theo + 6 planning</div>
    </div>
    {/* 右栏：甘特路线图 */}
    <div style={{
      position: 'absolute', left: 960, top: 150, width: 840, height: 780, borderRadius: 32, background: '#ffffff',
      boxShadow: `inset 0 0 0 1.5px ${L.line}, ${softShadow(18, { color: L.shadow, strength: 0.7 })}`,
    }}>
      <div style={{ position: 'absolute', left: 48, top: 44, ...type(40, 700), color: L.ink }}>Q4 Roadmap</div>
      <div style={{ position: 'absolute', right: 48, top: 50, ...type(30, 600), color: L.accent2 }}>● On track</div>
      {/* 月份刻度 */}
      {['Oct', 'Nov', 'Dec'].map((m, k) => (
        <div key={m} style={{ position: 'absolute', left: 260 + k * 180, top: 150, ...type(28, 600), color: L.ink3 }}>{m}</div>
      ))}
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{ position: 'absolute', left: 250 + k * 180, top: 196, width: 1.5, height: 520, background: L.line }} />
      ))}
      {LANES.map((ln, i) => {
        const g = ramp(frame, 4 + stagger(i, 4, 12, EASE.out), 22, EASE.snappy);
        const x0 = 250, span = 540;
        return (
          <React.Fragment key={ln.name}>
            <div style={{ position: 'absolute', left: 48, top: 224 + i * 120, ...type(36, 600), color: L.ink }}>{ln.name}</div>
            <div style={{
              position: 'absolute', left: x0 + ln.start * span, top: 220 + i * 120, height: 52, borderRadius: 14,
              width: Math.max(52 * g, ln.len * span * g), background: ln.color, opacity: mix(0.4, 1, g),
              boxShadow: `0 8px 18px -8px ${alpha(ln.color, 0.8)}, inset 0 1px 0 rgba(255,255,255,0.35)`,
            }} />
          </React.Fragment>
        );
      })}
      {/* 今天线 */}
      <div style={{ position: 'absolute', left: 250 + 0.55 * 540, top: 190, width: 3, height: 540, borderRadius: 2, background: L.ink, opacity: 0.85 }} />
      <div style={{ position: 'absolute', left: 250 + 0.55 * 540 - 44, top: 712, ...type(26, 700), color: L.ink, background: '#ffffff', padding: '2px 8px' }}>Today</div>
    </div>
  </div>
);

// ───────────── 面 B：02 · Ship（暗面 · 发布清单 + 区域环）─────────────
const CHECKS = ['Tests passed', 'Security review', 'Docs published', 'Rolled out to 100%'];
const FaceB: React.FC<{ frame: number }> = ({ frame }) => {
  const ring = ramp(frame, 80, 40, EASE.out);
  const R = 92, C = 2 * Math.PI * R;
  return (
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 90% at 30% 20%, ${NAVY.bg2} 0%, ${NAVY.bg} 70%)`, fontFamily: FONT.sans }}>
      <div style={{ position: 'absolute', left: 120, top: 120, width: 760 }}>
        <div style={{ ...type(34, 700, { caps: true }), letterSpacing: '0.18em', color: L.accent2 }}>02 · Ship</div>
        <div style={{ ...type(140, 760), color: NAVY.ink, marginTop: 34, letterSpacing: '-0.05em' }}>Ship it,<br />together.</div>
        <div style={{ ...type(46, 450), color: NAVY.ink2, marginTop: 40, lineHeight: 1.3 }}>Every release reviewed,<br />signed off and live.</div>
      </div>
      {/* 左下：发布元信息 */}
      <div style={{ position: 'absolute', left: 120, top: 872, display: 'flex', alignItems: 'center', gap: 20, ...type(40, 500), color: NAVY.ink2 }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: L.accent2, boxShadow: `0 0 0 8px ${alpha(L.accent2, 0.18)}` }} />
        Shipped Thu 14:02 · 2,184 changes
      </div>
      <div style={{
        position: 'absolute', left: 960, top: 150, width: 840, height: 780, borderRadius: 32,
        background: `linear-gradient(180deg, ${alpha('#1b2752', 0.95)}, ${alpha('#121a3a', 0.95)})`,
        boxShadow: `inset 0 0 0 1.5px ${NAVY.line}, inset 0 1.5px 0 rgba(255,255,255,0.08), 0 30px 60px -20px rgba(0,0,10,0.6)`,
      }}>
        <div style={{ position: 'absolute', left: 48, top: 44, ...type(40, 700), color: NAVY.ink }}>Release 4.2</div>
        <div style={{
          position: 'absolute', right: 48, top: 42, ...type(28, 700), color: '#03231f', background: L.accent2,
          padding: '6px 18px', borderRadius: 999, opacity: ramp(frame, 112, 10, EASE.out),
          transform: `scale(${mix(0.85, 1, ramp(frame, 112, 14, EASE.overshoot)).toFixed(4)})`,
        }}>LIVE</div>
        {CHECKS.map((c, i) => {
          const t = 78 + stagger(i, 4, 26, EASE.out);
          const p = ramp(frame, t, 12, EASE.overshoot);
          const on = frame >= t;
          return (
            <div key={c} style={{ position: 'absolute', left: 48, top: 160 + i * 100, display: 'flex', alignItems: 'center', gap: 26 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? alpha(L.accent2, mix(0, 1, ramp(frame, t, 8, EASE.out))) : 'transparent',
                boxShadow: `inset 0 0 0 2px ${on ? L.accent2 : NAVY.ink3}`,
              }}>
                <svg width={28} height={28} viewBox="0 0 24 24" style={{ transform: `scale(${p.toFixed(4)})` }}>
                  <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#03231f" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ ...type(42, 550), color: on ? NAVY.ink : NAVY.ink3 }}>{c}</div>
            </div>
          );
        })}
        {/* 区域环 */}
        <div style={{ position: 'absolute', left: 48, top: 590, display: 'flex', alignItems: 'center', gap: 34 }}>
          <svg width={2 * R + 24} height={2 * R + 24} viewBox={`0 0 ${2 * R + 24} ${2 * R + 24}`} style={{ marginTop: -60 }}>
            <circle cx={R + 12} cy={R + 12} r={R} fill="none" stroke={NAVY.line} strokeWidth={16} />
            <circle cx={R + 12} cy={R + 12} r={R} fill="none" stroke={L.accent2} strokeWidth={16} strokeLinecap="round"
              strokeDasharray={`${(C * ring).toFixed(2)} ${C}`} transform={`rotate(-90 ${R + 12} ${R + 12})`} opacity={ring > 0.005 ? 1 : 0} />
          </svg>
          <div style={{ marginTop: -60 }}>
            <div style={{ ...type(84, 760), color: NAVY.ink, letterSpacing: '-0.04em' }}>{Math.round(48 * ring)}<span style={{ color: NAVY.ink3 }}>/48</span></div>
            <div style={{ ...type(40, 500), color: NAVY.ink2, marginTop: 6 }}>regions healthy</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 单个立方体面：W×H 视口 + 1920 原生排版的页（CSS zoom S）+ 明暗层 + 共享棱高光
const Face: React.FC<{
  rot: number; normal: number; edgeGlow: number; edgeSide: 'right' | 'left'; children: React.ReactNode;
}> = ({ rot, normal, edgeGlow, edgeSide, children }) => {
  const c = Math.cos((Math.min(90, Math.abs(normal)) * Math.PI) / 180);
  const shade = 1 - (0.5 + 0.5 * c); // 0（正对）→ 0.5（侧转 90°）
  const farSide = edgeSide === 'right' ? 'left' : 'right';
  return (
    <div style={{
      position: 'absolute', width: W, height: H, overflow: 'hidden', borderRadius: 2,
      backfaceVisibility: 'hidden', transform: `rotateY(${rot}deg) translateZ(${W / 2}px)`,
    }}>
      <div style={{ width: 1920, height: 1080, zoom: S, position: 'relative' }}>{children}</div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1px rgba(15,30,60,0.10)' }} />
      {shade > 0.003 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(to ${farSide}, rgba(10,16,34,${(shade * 0.7).toFixed(3)}) 0%, rgba(10,16,34,${Math.min(0.7, shade * 1.3).toFixed(3)}) 100%)`,
        }} />
      )}
      {edgeGlow > 0.01 && (
        <div style={{
          position: 'absolute', top: 0, [edgeSide]: 0, width: 3, height: H, opacity: edgeGlow,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,1) 35%, rgba(255,255,255,0.55))',
        }} />
      )}
    </div>
  );
};

const Cube: React.FC<{ frame: number; theta: number; mid: number }> = ({ frame, theta, mid }) => (
  <div style={{ position: 'absolute', left: LEFT, top: TOP, width: W, height: H, perspective: 1500 }}>
    <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translateZ(${-W / 2}px) rotateY(${theta}deg)` }}>
      <Face rot={0} normal={theta} edgeGlow={mid} edgeSide="right"><FaceA frame={frame} /></Face>
      <Face rot={90} normal={theta + 90} edgeGlow={mid} edgeSide="left"><FaceB frame={frame} /></Face>
    </div>
  </div>
);

export const CubeRotate: React.FC = () => {
  const frame = useCurrentFrame();
  const theta = thetaAt(frame);
  const p = Math.min(1, Math.max(0, -theta / 90));
  const mid = Math.sin(p * Math.PI);

  // 相机：转动中后退 14%（凸角迎镜时放大约 1.25×，退 14% 让棱角不顶出画框、不压底部指示器）；两端各一段极缓推近
  const dolly = (1 - 0.14 * mid) * mix(1, 1.012, ramp(frame, 0, TURN0, EASE.smooth)) * mix(1, 1.015, ramp(frame, TURN0 + TURN_D, 76, EASE.smooth));
  const omega = (velocity(thetaAt, frame) * Math.PI) / 180;
  const vx = omega * (W / 2);
  const shadowW = W * (1 + 0.36 * mid);
  const BOTTOM = TOP + H;
  const ind = ramp(frame, TURN0, TURN_D, TURN); // 指示器下划线与盒子同曲线

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={{ x: 0.5, y: 1.1 }} vignette={0.22} />
      {/* 地面：淡淡的地平线分界，让盒子"放"在台面上 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: BOTTOM - 10, height: 1080 - BOTTOM + 10, background: `linear-gradient(180deg, ${alpha('#dfe6f1', 0)} 0%, ${alpha('#d9e1ee', 0.7)} 30%, ${alpha('#e3e9f2', 0.9)} 100%)` }} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${dolly.toFixed(5)})`, transformOrigin: `50% ${(TOP + H / 2) / 10.8}%` }}>
        {/* 倒影：同一场景镜像一份，渐隐遮罩 */}
        <div style={{
          position: 'absolute', inset: 0, transform: 'scaleY(-1)', transformOrigin: `50% ${BOTTOM}px`, opacity: 0.11,
          // 遮罩在翻转前的本地坐标里：贴地处（本地 y=BOTTOM）实、往上 120px 渐隐（不碰底部指示器）
          WebkitMaskImage: `linear-gradient(0deg, #000 0px, #000 ${1080 - BOTTOM}px, transparent ${1080 - BOTTOM + 120}px)`,
        }}>
          <Cube frame={frame} theta={theta} mid={mid} />
        </div>
        {/* 接触影：近地小而实 + 远地大而虚 */}
        <div style={{
          position: 'absolute', left: 960 - shadowW / 2, top: BOTTOM - 26, width: shadowW, height: 60, borderRadius: '50%',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(12,26,58,0.28), rgba(12,26,58,0.08) 60%, rgba(12,26,58,0) 100%)',
        }} />
        <div style={{
          position: 'absolute', left: 960 - (shadowW * 0.98) / 2, top: BOTTOM - 6, width: shadowW * 0.98, height: 12, borderRadius: '50%',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(12,26,58,0.32), rgba(12,26,58,0) 100%)',
        }} />
        <SpeedBlur vx={vx} amount={0.025} max={2.4}>
          <Cube frame={frame} theta={theta} mid={mid} />
        </SpeedBlur>
      </div>

      {/* 章节指示器：两章并列，下划线随翻转滑动 */}
      <div style={{ position: 'absolute', left: 960 - 260, top: 970, width: 520, height: 60 }}>
        {['01  Plan', '02  Ship'].map((t, k) => {
          const on = k === 0 ? 1 - ind : ind;
          return (
            <div key={t} style={{
              position: 'absolute', left: k * 300, top: 0, width: 220, textAlign: 'center',
              ...type(32, 650), color: on > 0.5 ? L.ink : L.ink3, whiteSpace: 'pre',
            }}>{t}</div>
          );
        })}
        <div style={{ position: 'absolute', left: 230, top: 20, width: 60, height: 2, background: L.line }} />
        <div style={{ position: 'absolute', left: 50 + ind * 300, top: 50, width: 120, height: 4, borderRadius: 2, background: L.accent }} />
      </div>
    </div>
  );
};
