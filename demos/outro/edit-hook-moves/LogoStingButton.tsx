// logo-sting-button —— 收尾按钮镜头（button ending）
// 上一镜收黑 → 黑场 → LOGO 入场定住（观众以为结束）→ 12f UI 特写彩蛋硬切 →
// 硬切回黑底 LOGO 定格。节奏是全部：彩蛋段短促像眨眼。收尾真静止 60f。
// 质感：带色相的深场（非纯黑）+ 静态柔光斑与暗角；LOGO 入场是"对焦"——
// 模糊 8→0px + scale 0.96→1，字标比图形晚 2f 落定（跟随）；彩蛋是按目标尺寸
// 布局的微距按钮行（不靠 transform 放大位图，字边清晰），外圈景深虚化、按钮被光标按下。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, Vignette, ramp, mix, tracking } from '../../_fixtures/Polish';

// 时间轴（30fps，共 142f）
const T = {
  shotAEnd: 24,     // 0–24f 上一镜（B），f14–24 压暗到深场
  darkenStart: 14,
  blackEnd: 30,     // 24–30f 黑场 6f
  logoInEnd: 40,    // 30–40f LOGO 入场 10f（字标跟随晚 2f，f42 全部落定）
  holdEnd: 70,      // 40–70f 定住 30f（观众以为结束）
  eggEnd: 82,       // 70–82f 彩蛋硬切 12f
  total: 142,       // 82–142f 黑底 LOGO 真静止 60f
};
export const LOGO_STING_BUTTON_DURATION = 142;

const INK = '#0a0b0f'; // 深场底色：带冷色相的近黑，替代 #000
const ACCENT = '#8088f0'; // 与 fixture 暗色强调色同源

// 深场：底色 + 极弱的中心柔光（让 LOGO 有"站在光里"的空气感）+ 暗角。全部静态，
// 黑场 / LOGO 段共用同一张底，硬切回来像素一致。
const DarkField: React.FC<{ glow: number }> = ({ glow }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, background: INK }} />
    <div style={{
      position: 'absolute', inset: 0, opacity: glow,
      background: 'radial-gradient(ellipse 46% 40% at 50% 47%, rgba(140,150,210,0.13) 0%, rgba(140,150,210,0.04) 45%, rgba(0,0,0,0) 75%)',
    }} />
    <Vignette strength={0.55} inner={0.42} color="#000000" />
  </>
);

// 图形标：深钢色圆角方块 + 白色圆角方块与强调色圆片错叠（与 fixture 侧栏品牌同一语言）
const Mark: React.FC = () => (
  <div style={{
    width: 132, height: 132, borderRadius: 34, position: 'relative', overflow: 'hidden', flex: 'none',
    background: 'linear-gradient(150deg, #353843 0%, #1c1d23 62%, #16171c 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.5), 0 24px 60px -18px rgba(0,0,0,0.8)',
  }}>
    {/* 顶部受光：从左上来的一层极淡的面光 */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 45%)' }} />
    <div style={{ position: 'absolute', left: 34, top: 34, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.95)', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
    <div style={{ position: 'absolute', left: 56, top: 56, width: 42, height: 42, borderRadius: 21, background: ACCENT, boxShadow: '0 2px 8px rgba(40,46,140,0.45)' }} />
  </div>
);

const LogoLockup: React.FC<{ frame: number }> = ({ frame }) => {
  // 入场 10f：图形先到；字标晚 2f、自左 14px 滑入落定（跟随）。全部 clamp 到终值，定格段像素静止。
  const a = ramp(frame, T.blackEnd, 10, EASE.snappy);
  const b = ramp(frame, T.blackEnd + 2, 10, EASE.snappy);
  const op = (t: number) => Math.min(1, t * 1.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, transform: `scale(${mix(0.96, 1, a)})` }}>
        <div style={{ opacity: op(a), filter: a < 0.999 ? `blur(${mix(8, 0, a).toFixed(2)}px)` : undefined }}>
          <Mark />
        </div>
        <div style={{
          opacity: op(b), transform: `translateX(${mix(-14, 0, b).toFixed(2)}px)`,
          filter: b < 0.999 ? `blur(${mix(8, 0, b).toFixed(2)}px)` : undefined,
          fontFamily: FONT.sans, fontWeight: 650, fontSize: 112, lineHeight: 1,
          letterSpacing: tracking(112), color: '#f3f3f6', paddingBottom: 6,
        }}>
          Acme
        </div>
      </div>
    </div>
  );
};

// 彩蛋：微距按钮行。整屏按 1920×1080 目标尺寸直接布局（字号即最终像素），12f 内相机极慢前推。
const Egg: React.FC<{ egg: number }> = ({ egg }) => {
  const push = mix(1, 1.035, egg / 11); // 12f 内匀速蠕动推近：眨眼长度的镜头只给一个方向的漂移
  const press = egg >= 2 && egg < 4 ? 1 : 0; // f2–3 光标按下，按钮压缩 3%
  const tickOn = egg >= 4 && egg < 6; // tick 圆点：第 4–5f 亮 2f，像眨眼
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(180deg, #f3f3f1 0%, #e9e9e6 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '58% 52%' }}>
        {/* 景深前景：画面左上方失焦的卡片边与文字，读作"贴着镜头拍到的面板" */}
        <div style={{
          position: 'absolute', left: -120, top: -160, width: 900, height: 420, borderRadius: 48,
          background: '#ffffff', boxShadow: '0 20px 80px -20px rgba(16,18,24,0.18)', filter: 'blur(14px)', opacity: 0.9,
        }} />
        <div style={{ position: 'absolute', left: 120, top: 120, width: 420, height: 34, borderRadius: 17, background: '#d9dade', filter: 'blur(12px)' }} />
        {/* 主面板：一块大白卡，按钮行在焦平面上 */}
        <div style={{
          position: 'absolute', left: 260, top: 300, width: 1900, height: 620, borderRadius: 56,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
          border: '2px solid rgba(20,22,28,0.07)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.9), 0 4px 10px rgba(16,18,24,0.05), 0 40px 120px -30px rgba(16,18,24,0.22)',
        }}>
          {/* 上沿小字（略失焦，焦外的一行） */}
          <div style={{
            position: 'absolute', left: 120, top: 92, display: 'flex', alignItems: 'center', gap: 22,
            fontFamily: FONT.sans, filter: 'blur(1.6px)',
          }}>
            <div style={{
              padding: '10px 22px', borderRadius: 999, background: 'rgba(91,99,211,0.11)', color: '#4a52c4',
              fontSize: 34, fontWeight: 600, letterSpacing: '0.01em',
            }}>v2.0</div>
            <div style={{ fontSize: 40, color: '#5d5f66', fontWeight: 500, letterSpacing: '-0.01em' }}>Something new is coming</div>
          </div>
          {/* 焦平面：按钮行 */}
          <div style={{ position: 'absolute', left: 120, top: 260, display: 'flex', alignItems: 'center', gap: 36, fontFamily: FONT.sans }}>
            <div style={{
              height: 150, padding: '0 64px', borderRadius: 40, display: 'flex', alignItems: 'center',
              background: '#f3f3f1', border: '2px solid rgba(20,22,28,0.10)', color: '#2a2b31',
              fontSize: 58, fontWeight: 550, letterSpacing: '-0.02em',
            }}>Not now</div>
            <div style={{
              height: 150, padding: '0 70px', borderRadius: 40, display: 'flex', alignItems: 'center', gap: 26,
              background: 'linear-gradient(180deg, #6a72e0 0%, #545cd0 100%)', color: '#ffffff',
              fontSize: 58, fontWeight: 600, letterSpacing: '-0.02em',
              transform: `scale(${press ? 0.97 : 1})`,
              boxShadow: press
                ? 'inset 0 2px 0 rgba(255,255,255,0.18), 0 2px 6px rgba(50,56,170,0.35)'
                : 'inset 0 2px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(50,56,170,0.25), 0 24px 50px -16px rgba(50,56,170,0.55)',
            }}>
              Join the beta
              <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
            {/* tick 圆点：只在 egg 4–5f 挂载 */}
            <div style={{ width: 92, height: 92, marginLeft: 8, position: 'relative' }}>
              {tickOn && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 46, background: '#1d1e24',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 10px rgba(91,99,211,0.14), 0 10px 24px -8px rgba(16,18,24,0.5)',
                }}>
                  <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          {/* 光标：按下时略缩小，指尖落在主按钮右下 */}
          <div style={{
            position: 'absolute', left: 900, top: 360, transform: `scale(${press ? 0.92 : 1})`, transformOrigin: '6px 4px',
            filter: 'drop-shadow(0 6px 10px rgba(16,18,24,0.35))',
          }}>
            <svg width={84} height={108} viewBox="0 0 14 18">
              <path d="M1 1 L1 15 L4.6 11.6 L7.2 17 L9.4 16 L6.9 10.7 L12 10.7 Z" fill="#111216" stroke="#ffffff" strokeWidth={1.1} strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      {/* 镜头边缘失焦：微距的浅景深感（四角压一层极淡暗角） */}
      <Vignette strength={0.18} inner={0.5} color="#2a2c36" cx={0.56} cy={0.55} />
      <Grain opacity={0.05} />
    </div>
  );
};

export const LogoStingButton: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 段 1：上一镜（FakeDashboard B）尾巴：继续缓推，f14–24 ease-in 压暗到深场 ——
  if (frame < T.shotAEnd) {
    const dark = ramp(frame, T.darkenStart, T.shotAEnd - 1 - T.darkenStart, EASE.exit);
    const push = mix(1.0, 1.03, ramp(frame, -24, 48, EASE.smooth)); // 上一镜的推镜在这里继续减速
    return (
      <div style={{ width: 1920, height: 1080, background: INK, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '56% 46%' }}>
          <FakeDashboard variant="B" />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: INK, opacity: dark }} />
      </div>
    );
  }

  // —— 段 4：彩蛋硬切 12f ——
  if (frame >= T.holdEnd && frame < T.eggEnd) {
    return (
      <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
        <Egg egg={frame - T.holdEnd} />
      </div>
    );
  }

  // —— 段 2 + 段 3 + 段 5：深场（黑场 6f 光斑未亮）→ LOGO 入场 → 定住 → 彩蛋后定格收尾，真静止 ——
  // 柔光斑随 LOGO 一起亮起，之后 clamp 恒定；彩蛋前后同一分支渲染，硬切回来像素一致。
  const glow = ramp(frame, T.blackEnd, 14, EASE.out);
  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <DarkField glow={glow} />
      {frame >= T.blackEnd && <LogoLockup frame={frame} />}
    </div>
  );
};
