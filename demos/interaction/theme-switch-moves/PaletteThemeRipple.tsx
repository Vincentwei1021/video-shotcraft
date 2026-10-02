// 组合：命令面板 × 深浅扫场（palette-theme-ripple）
// FakeDashboard 静置 → 整屏压暗+blur → ⌘K 面板弹落 → 输入 "dark"（逐字出现，首条
// 结果的匹配字母同步加粗）→ 回车帧面板 5f 收缩成一个亮点 → 深色扫场边界
// **从该亮点位置**荡开（clip-path 圆扩张 + 亮边缘环）扫过全 UI 变深色版 → 真静止。
// 组合命门：扫场起点必须是面板收缩点（960,470），收缩完成帧=扫场起始帧
// （RIPPLE=73），从别处/别帧开始就断了因果。
// 关键帧：0–15 浅色静置 → 15–22 压暗 blur → 22–30 面板弹落（超调）→
// 38–62 逐字输入 d/a/r/k → 68 回车 → 68–73 面板收缩成亮点 → 73–95 扫场
// 荡开 → 95–170 深色真静止 75f。
// 质感升级：深色版直接用同布局的 <FakeDashboard tone="dark" />（不再手抄旧灰阶骨架，
// 两版逐像素同布局）；面板换成出版级命令面板（真实命令 + 图标 + 键帽、强调色选中态）；
// 压暗带冷色相；收缩段加速度拖影；扫场边缘改细亮环 + 强调色外辉，荡开时深色版 1.01→1 坐实。
// 帧确定，无随机源。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { FONT, softShadow } from '../../_fixtures/Polish';

const DIM_START = 15;
const PANEL_IN = 22;
const TYPE_FRAMES = [38, 46, 54, 62]; // d a r k
const ENTER = 68;
const RIPPLE = 73; // 面板收缩完成帧 = 扫场起始帧（组合命门）
const RIPPLE_END = 95;
const ORIGIN = { x: 960, y: 470 }; // 面板中心 = 收缩点 = 扫场圆心
const MAX_R = 1250;
export const PALETTE_THEME_RIPPLE_DURATION = 170; // 95–170 深色真静止 75f

const QUERY = 'dark';
const ACCENT_RGB = '91,99,211';

// 16 网格线性图标
const Ic: React.FC<{ d: string[]; color: string; size?: number }> = ({ d, color, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block', flex: 'none' }}>
    {d.map((p, i) => (
      <path key={i} d={p} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </svg>
);
const MOON = ['M13 9.6A5.5 5.5 0 1 1 6.4 3a4.4 4.4 0 0 0 6.6 6.6z'];
const HALF = ['M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z', 'M8 2.5v11'];
const CONTRAST = ['M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z', 'M8 5.25a2.75 2.75 0 1 0 0 5.5'];
const SEARCH = ['M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z', 'm10.5 10.5 3 3'];

const Kbd: React.FC<{ children: React.ReactNode; strong?: boolean }> = ({ children, strong }) => (
  <span style={{
    fontSize: 14, fontWeight: 500, lineHeight: 1, padding: '5px 7px', borderRadius: 6, flex: 'none',
    color: strong ? G.accent : G.ink3, background: strong ? 'rgba(255,255,255,0.9)' : G.fill,
    boxShadow: `inset 0 0 0 1px ${strong ? 'rgba(91,99,211,0.25)' : G.hairlineStrong}, 0 1px 0 rgba(20,22,28,0.05)`,
  }}>{children}</span>
);

export const PaletteThemeRipple: React.FC = () => {
  const f = useCurrentFrame();

  // 压暗 + blur：面板阶段生效，扫场完成后浅色层已被卸载
  const dim = interpolate(f, [DIM_START, DIM_START + 7], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });

  // 面板弹落（back-out 超调）
  const panelT = interpolate(f, [PANEL_IN, PANEL_IN + 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.9)),
  });
  const panelO = interpolate(f, [PANEL_IN, PANEL_IN + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // 回车后 5f 收缩成一点（ease-in，越缩越快）
  const shrinkAt = (fr: number) => interpolate(fr, [ENTER, RIPPLE], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const shrink = shrinkAt(f);
  const panelMounted = f >= PANEL_IN && f < RIPPLE;
  const panelScale = f < ENTER ? panelT : shrink;
  const panelDropY = f < ENTER ? interpolate(panelT, [0, 1], [-120, 0]) : 0;
  // 收缩越快越糊（速度门控的缩放拖影，静止时为 0）
  const shrinkBlur = f >= ENTER ? Math.min(6, Math.abs(shrinkAt(f + 0.5) - shrinkAt(f - 0.5)) * 18) : 0;

  const typedCount = TYPE_FRAMES.filter((t) => f >= t).length;
  // 每个字符 3f 内从下 4px 浮入（不是灰块弹出）
  const charIn = (i: number) => interpolate(f, [TYPE_FRAMES[i], TYPE_FRAMES[i] + 3], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const selected = typedCount === 4;
  const selT = interpolate(f, [TYPE_FRAMES[3], TYPE_FRAMES[3] + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const enterPress = interpolate(f, [ENTER, ENTER + 2, ENTER + 5], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 扫场：圆从收缩点荡开（ease-out，先快后缓），边缘带亮环
  const r = interpolate(f, [RIPPLE, RIPPLE_END], [12, MAX_R], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const rippling = f >= RIPPLE && f < RIPPLE_END;
  const done = f >= RIPPLE_END;
  const ringOpacity = interpolate(f, [RIPPLE, RIPPLE_END], [0.95, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 坐实：深色版随扫场从 1.01 收到 1（落定后精确为 1，真静止）
  const darkScale = interpolate(f, [RIPPLE, RIPPLE_END], [1.01, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });

  // 亮点：收缩完成前后 3f 的高光核（把"收缩点=扫场起点"钉死给观众看）
  const dotOn = f >= ENTER + 2 && f < RIPPLE + 3;
  const dotA = interpolate(f, [ENTER + 2, RIPPLE, RIPPLE + 3], [0.4, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 结果行
  const rows: { icon: string[]; label: string; hint: React.ReactNode }[] = [
    { icon: MOON, label: 'Switch to dark theme', hint: <Kbd strong={selected}>↵</Kbd> },
    { icon: HALF, label: 'Match system appearance', hint: <span style={{ fontSize: 14, color: G.ink3 }}>Theme</span> },
    { icon: CONTRAST, label: 'Increase contrast', hint: <span style={{ fontSize: 14, color: G.ink3 }}>Accessibility</span> },
  ];
  // 首行 "dark" 四个字母随输入逐个加粗（匹配高亮）
  const label0 = (txt: string) => {
    const at = txt.indexOf(QUERY);
    return (
      <>
        {txt.slice(0, at)}
        {QUERY.split('').map((c, i) => (
          <span key={i} style={{ fontWeight: i < typedCount ? 650 : 450, color: i < typedCount ? G.ink1 : undefined }}>{c}</span>
        ))}
        {txt.slice(at + QUERY.length)}
      </>
    );
  };

  return (
    <div style={{ width: 1920, height: 1080, background: G.dark, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      {/* 浅色层：扫场完成后条件卸载（真静止） */}
      {!done && (
        <div style={{ position: 'absolute', inset: 0, filter: dim > 0.001 ? `saturate(${1 - dim * 0.3}) blur(${(dim * 5).toFixed(2)}px)` : 'none' }}>
          <FakeDashboard variant="A" />
          {/* 带冷色相的压暗（不是中性灰） */}
          <div style={{
            position: 'absolute', inset: 0, opacity: dim,
            background: 'radial-gradient(ellipse 70% 70% at 50% 44%, rgba(16,18,28,0.32) 0%, rgba(12,13,20,0.52) 100%)',
          }} />
        </div>
      )}

      {/* 深色层：同布局 FakeDashboard tone="dark"，从收缩点起被圆形 clip 揭开；完成后铺满且无 clip */}
      {(rippling || done) && (
        <div style={{ position: 'absolute', inset: 0, clipPath: done ? 'none' : `circle(${r}px at ${ORIGIN.x}px ${ORIGIN.y}px)` }}>
          <div style={{
            position: 'absolute', inset: 0,
            transform: done ? undefined : `scale(${darkScale})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
          }}>
            <FakeDashboard variant="A" tone="dark" />
          </div>
        </div>
      )}

      {/* 扫场亮边缘环：3px 亮线 + 强调色外辉 + 内侧白辉（边界两侧各一层） */}
      {rippling && (
        <div
          style={{
            position: 'absolute',
            left: ORIGIN.x - r,
            top: ORIGIN.y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            boxSizing: 'border-box',
            border: '3px solid rgba(236,238,255,0.92)',
            opacity: ringOpacity,
            boxShadow: `0 0 36px 4px rgba(${ACCENT_RGB},0.55), inset 0 0 28px rgba(255,255,255,0.28)`,
          }}
        />
      )}

      {/* 收缩亮点 */}
      {dotOn && (
        <div
          style={{
            position: 'absolute',
            left: ORIGIN.x - 9,
            top: ORIGIN.y - 9,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: '#ffffff',
            opacity: dotA,
            boxShadow: `0 0 0 3px rgba(255,255,255,0.35), 0 0 34px 10px rgba(${ACCENT_RGB},0.65), 0 0 70px 24px rgba(255,255,255,0.35)`,
          }}
        />
      )}

      {/* ⌘K 命令面板 */}
      {panelMounted && (
        <div
          style={{
            position: 'absolute',
            left: ORIGIN.x - 340,
            top: ORIGIN.y - 130 + panelDropY,
            width: 680,
            height: 260,
            transform: `scale(${Math.max(panelScale, 0.001)})`,
            transformOrigin: 'center center',
            opacity: panelO,
            filter: shrinkBlur > 0.3 ? `blur(${shrinkBlur.toFixed(2)}px)` : undefined,
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
            border: '1px solid rgba(20,22,28,0.10)',
            borderRadius: 18,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,1), ${softShadow(56, { strength: 1.5, color: '#06070c' })}`,
            overflow: 'hidden',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 输入行：放大镜 + 逐字输入 + 闪烁光标 + ⌘K 键帽 */}
          <div style={{
            height: 70, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px',
            borderBottom: `1px solid ${G.hairline}`, boxSizing: 'border-box',
          }}>
            <Ic d={SEARCH} color={G.ink3} size={20} />
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 25, color: G.ink1, letterSpacing: '-0.01em', fontWeight: 450 }}>
              {QUERY.split('').map((c, i) => (
                <span key={i} style={{
                  display: 'inline-block', opacity: charIn(i), transform: `translateY(${((1 - charIn(i)) * 4).toFixed(2)}px)`,
                  width: f >= TYPE_FRAMES[i] ? undefined : 0, overflow: 'hidden',
                }}>{c}</span>
              ))}
              {/* 光标：帧确定闪烁（每 8f 翻转），强调色 */}
              <span style={{ width: 2, height: 28, marginLeft: 2, borderRadius: 1, background: G.accent, opacity: Math.floor(f / 8) % 2 === 0 ? 1 : 0 }} />
              {typedCount === 0 && (
                <span style={{ color: G.ink3, marginLeft: 6 }}>Type a command…</span>
              )}
            </div>
            <span style={{ marginLeft: 'auto' }}><Kbd>⌘K</Kbd></span>
          </div>
          {/* 结果行：输入完成后首行进入强调色选中态 */}
          <div style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rows.map((row, i) => {
              const on = i === 0 ? selT : 0;
              return (
                <div key={i} style={{
                  height: 52, borderRadius: 11, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', boxSizing: 'border-box',
                  background: `rgba(${ACCENT_RGB},${(0.1 * on + (i === 0 ? 0.06 * enterPress : 0)).toFixed(3)})`,
                  boxShadow: on > 0 ? `inset 3px 0 0 rgba(${ACCENT_RGB},${on.toFixed(3)})` : 'none',
                  fontSize: 19, color: i === 0 ? G.ink2 : G.ink3, opacity: i === 0 ? 1 : 1 - 0.35 * selT,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: on > 0.5 ? G.accent : G.fill, boxShadow: on > 0.5 ? 'none' : `inset 0 0 0 1px ${G.hairline}`,
                  }}>
                    <Ic d={row.icon} color={on > 0.5 ? '#ffffff' : G.ink2} size={17} />
                  </div>
                  <span style={{ color: i === 0 ? G.ink2 : undefined }}>{i === 0 ? label0(row.label) : row.label}</span>
                  <span style={{ marginLeft: 'auto' }}>{row.hint}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
