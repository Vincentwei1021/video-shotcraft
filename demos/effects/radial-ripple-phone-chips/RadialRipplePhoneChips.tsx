// radial-ripple-phone-chips — 同心波纹手机：四层同心圆错相呼吸如水波，中央手机屏内 feed 自动缓滚，
// 两侧 chip 先后 spring pop 入场并悬浮。三层动作各自极慢，叠起来让产品定格镜头"活着"。
//
// 第二轮重设计（暖沙 · 手机上的 video-shotcraft 镜头库）：
// - look = sand。同心圆是四层由深到浅的暖沙色圆盘（2240/1760/1280/840px，铺满画面并出画），
//   每层有受光上沿与发丝外缘，像沙地上被风吹出的一圈圈涟漪 / 声波；中心一团暖白柔光托住手机。
// - 主体：按 1080p 原生尺寸搭的手机（430×900，占画高 83%），暖钛金属边框 + 黑边 + 灵动岛 + 侧键 +
//   玻璃斜反光 + 两层落地投影。屏内是为镜头设计的镜头配方 feed：大标题「Shot library」、带几何插画缩略图的
//   镜头卡（镜头名 / 分类 / 时长 / 预览进度）、底部常驻迷你预览条（成片配乐在走、波形在跳）。
//   feed 匀速自动滚动（自动播放语义，不加缓动）。
// - 两侧 chip：白色大胶囊（36px 字 + 赤陶色图标圆），从手机侧边弹出（spring 过冲一次），
//   落位后才渐渐介入 ±8px 的悬浮；左「Shot recipe cards」先、右「Remotion render」后，错开 30f。
// - 收尾海报：左下角镜刻标志 + 字标「video-shotcraft — Every shot, tuned in one place.」在两枚 chip 都落定后升起。
//
// 时间表（30fps，共 168f）：
//   0–26    预备：同心圆第 1 帧就在呼吸；手机从下方 90px 升起落位（snappy，投影同步收紧）
//   13–165  feed 匀速滚动 0→−560px（t 0.08→0.98）；迷你播放条进度匀速推进
//   37–57   左 chip pop（spring damping 13，scale 0.8→1 + 从手机侧边外移 28px）
//   67–87   右 chip pop
//   90–112  品牌字标逐词升起
//   112–168 hold：同心圆、feed、chip 悬浮持续极缓运动（无死帧，不加手持抖动）
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const RADIAL_RIPPLE_PHONE_CHIPS_DURATION = 168; // 5600ms @30fps

const L = LOOKS.sand;
const DUR = RADIAL_RIPPLE_PHONE_CHIPS_DURATION;
// 模板强调色：落地时按项目品牌色只换这一个变量（屏内封面 / 进度 / chip 图标都跟它走）
const ACCENT = L.accent; // 赤陶 #c4552d
const SANS = FONT.sans;

// 同心圆（外深内浅，从大到小叠放），相邻层相位差 1.7 rad
const RINGS = [
  { size: 2240, color: '#dccbb4' },
  { size: 1760, color: '#e4d6c3' },
  { size: 1280, color: '#ebe0d1' },
  { size: 840, color: '#f2eadf' },
].map((r, i) => ({ ...r, phase: i * 1.7 }));

// 手机几何（画布像素）
const PW = 430;
const PH = 900;
const FRAME = 12; // 金属边框
const BLACK = 9; // 屏幕黑边
const PX = (1920 - PW) / 2;
const PY = (1080 - PH) / 2;
const CHIP_GAP = 64; // chip 与手机外缘的间距

// 镜头库 feed（video-shotcraft 的镜头配方卡；prog = 预览进度）
type Ep = { title: string; show: string; len: string; prog: number; art: number };
const EPS: Ep[] = [
  { title: 'Graze face tour', show: 'Camera', len: '4.0 s', prog: 0.62, art: 0 },
  { title: 'Riso print hit', show: 'Effects', len: '4.0 s', prog: 0, art: 1 },
  { title: 'Text as mask', show: 'Opening', len: '3.2 s', prog: 0.18, art: 2 },
  { title: 'Timeline travel', show: 'Data', len: '5.0 s', prog: 0, art: 3 },
  { title: 'Grain dissolve', show: 'Outro', len: '3.6 s', prog: 0, art: 0 },
  { title: 'Cursor flyover', show: 'Camera', len: '4.8 s', prog: 0.4, art: 1 },
  { title: 'Logo sting', show: 'Outro', len: '3.0 s', prog: 0, art: 3 },
  { title: 'Exploded view', show: 'Camera', len: '5.0 s', prog: 0, art: 2 },
];

// 封面插画：四套几何（太阳 / 等高线 / 圆面包 / 轨道），配色限 sand 的赤陶 + 钴蓝 + 中性
const Art: React.FC<{ k: number; size: number }> = ({ k, size }) => {
  const s = size;
  const base: React.CSSProperties = { position: 'relative', width: s, height: s, borderRadius: s * 0.2, overflow: 'hidden', flex: 'none' };
  if (k === 0)
    return (
      <div style={{ ...base, background: `linear-gradient(160deg, ${ACCENT} 0%, #e48c5f 100%)` }}>
        <div style={{ position: 'absolute', left: s * 0.24, top: s * 0.2, width: s * 0.52, height: s * 0.52, borderRadius: '50%', background: '#fbe7d3' }} />
        <div style={{ position: 'absolute', left: -s * 0.2, right: -s * 0.2, top: s * 0.62, height: s * 0.7, borderRadius: '50%', background: '#8f3a1e' }} />
      </div>
    );
  if (k === 1)
    return (
      <div style={{ ...base, background: `linear-gradient(160deg, ${L.accent2} 0%, #7f9cc0 100%)` }}>
        {[0.9, 0.66, 0.42].map((r, i) => (
          <div key={i} style={{
            position: 'absolute', left: s * (0.5 - r / 2) + s * 0.12, top: s * (0.5 - r / 2) + s * 0.1, width: s * r, height: s * r * 0.8,
            borderRadius: '50%', border: `${Math.max(2, s * 0.03)}px solid rgba(255,255,255,${0.35 + i * 0.2})`, boxSizing: 'border-box',
          }} />
        ))}
      </div>
    );
  if (k === 2)
    return (
      <div style={{ ...base, background: 'linear-gradient(160deg, #e9dcc8 0%, #d6c3a6 100%)' }}>
        <div style={{ position: 'absolute', left: s * 0.16, top: s * 0.3, width: s * 0.68, height: s * 0.48, borderRadius: `${s * 0.34}px ${s * 0.34}px ${s * 0.1}px ${s * 0.1}px`, background: '#b8743f' }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: 'absolute', left: s * (0.3 + i * 0.15), top: s * 0.38, width: s * 0.05, height: s * 0.2, borderRadius: s, background: '#f3e2c8', transform: 'rotate(24deg)' }} />
        ))}
      </div>
    );
  return (
    <div style={{ ...base, background: 'linear-gradient(160deg, #2b231d 0%, #4a3b30 100%)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: s * 0.56, height: s * 0.06, background: ACCENT }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: s * 0.68, height: s * 0.03, background: alpha('#f3e2c8', 0.5) }} />
      <div style={{ position: 'absolute', left: s * 0.62, top: s * 0.16, width: s * 0.16, height: s * 0.16, borderRadius: '50%', background: '#f3e2c8' }} />
    </div>
  );
};

const Feed: React.FC = () => (
  <div style={{ padding: '76px 16px 0', fontFamily: SANS, color: L.ink }}>
    <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: '0.06em', color: L.ink3, textTransform: 'uppercase', marginLeft: 4 }}>Today · 3 new shots</div>
    <div style={{ fontSize: 44, fontWeight: 780, letterSpacing: '-0.035em', lineHeight: 1.05, marginLeft: 2, marginTop: 4 }}>Shot library</div>
    {/* 精选大卡 */}
    <div style={{ position: 'relative', marginTop: 20, height: 210, borderRadius: 26, overflow: 'hidden', background: `linear-gradient(150deg, #3a2c22 0%, #6b4a33 100%)` }}>
      <div style={{ position: 'absolute', right: -40, top: -50, width: 230, height: 230, borderRadius: '50%', background: `radial-gradient(circle, ${alpha('#ffb27a', 0.9)} 0%, ${alpha(ACCENT, 0.6)} 45%, ${alpha(ACCENT, 0)} 70%)` }} />
      <div style={{ position: 'absolute', left: 22, top: 22, fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', color: alpha('#fbe7d3', 0.7) }}>NEW RECIPE</div>
      <div style={{ position: 'absolute', left: 22, bottom: 50, fontSize: 30, fontWeight: 760, letterSpacing: '-0.03em', color: '#fff6ec', lineHeight: 1.05, width: 260 }}>Crash zoom punch</div>
      <div style={{ position: 'absolute', left: 22, bottom: 22, fontSize: 17, fontWeight: 500, color: alpha('#fbe7d3', 0.75) }}>Camera move · 2 styles · 1.2 s</div>
    </div>
    <div style={{ fontSize: 22, fontWeight: 720, letterSpacing: '-0.02em', margin: '26px 4px 12px' }}>Recipes</div>
    {EPS.map((e, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: 12, marginBottom: 12, borderRadius: 22,
        background: '#fffcf7', boxShadow: '0 0 0 1px rgba(70,45,20,0.06), 0 2px 6px rgba(58,36,16,0.05)',
      }}>
        <Art k={e.art} size={76} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 680, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{e.title}</div>
          <div style={{ fontSize: 17, color: L.ink2, marginTop: 4, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.len} · {e.show}</div>
          <div style={{ marginTop: 10, height: 5, borderRadius: 3, background: '#efe6da', width: 150 }}>
            {e.prog > 0 && <div style={{ width: `${e.prog * 100}%`, height: '100%', borderRadius: 3, background: ACCENT }} />}
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 20, flex: 'none', background: e.prog > 0 ? ACCENT : '#f1e9de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={16} height={16} viewBox="0 0 16 16"><path d="M5 3 L13 8 L5 13 Z" fill={e.prog > 0 ? '#fff8f0' : L.ink} /></svg>
        </div>
      </div>
    ))}
  </div>
);

// chip 图标
const ChipIcon: React.FC<{ kind: 'download' | 'chapters' }> = ({ kind }) => (
  <div style={{ width: 60, height: 60, borderRadius: 30, flex: 'none', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.3)}` }}>
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff8f0" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'download' ? (
        <>
          <path d="M12 4 V15" />
          <path d="M7 10.5 L12 15.5 L17 10.5" />
          <path d="M5 19.5 H19" />
        </>
      ) : (
        <>
          <path d="M9 6 H20 M9 12 H20 M9 18 H16" />
          <circle cx={4.5} cy={6} r={1.2} fill="#fff8f0" />
          <circle cx={4.5} cy={12} r={1.2} fill="#fff8f0" />
          <circle cx={4.5} cy={18} r={1.2} fill="#fff8f0" />
        </>
      )}
    </svg>
  </div>
);

export const RadialRipplePhoneChips: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / (DUR - 1);

  // 手机入场：从下方 90px 升起，投影随落位收紧
  const rise = ramp(f, 0, 26, EASE.snappy);
  const phoneY = (1 - rise) * 90;
  const phoneOp = Math.min(1, rise * 2.2);

  // feed 匀速自动滚动（t 0.08→0.98）
  const scrollP = Math.min(1, Math.max(0, (t - 0.08) / 0.9));
  const scrollY = -560 * scrollP;

  // chip：spring pop + 从手机侧边外移，落位后才渐入悬浮
  const chip = (t0: number, ph: number, side: -1 | 1): React.CSSProperties => {
    const s = springAt(f, t0, { damping: 13, stiffness: 190 });
    const slide = ramp(f, t0, 20, EASE.snappy);
    const floatIn = ramp(f, t0 + 18, 24, EASE.smooth);
    const fl = Math.sin(t * Math.PI * 2 * 2 + ph) * 8 * floatIn;
    return {
      opacity: Math.min(1, Math.max(0, (f - t0) / 5)),
      transform: `translateX(${(side * (1 - slide) * -28).toFixed(2)}px) translateY(${fl.toFixed(2)}px) scale(${(0.8 + 0.2 * s).toFixed(4)})`,
      transformOrigin: side < 0 ? 'right center' : 'left center',
    };
  };
  const chipBase: React.CSSProperties = {
    position: 'absolute', display: 'flex', alignItems: 'center', gap: 20, padding: '14px 34px 14px 14px', borderRadius: 999,
    background: 'linear-gradient(180deg, #fffdf9 0%, #fbf5ec 100%)', color: L.ink, whiteSpace: 'nowrap',
    ...type(36, 650), letterSpacing: '-0.02em',
    boxShadow: `inset 0 1px 0 #ffffff, 0 0 0 1px ${alpha(L.shadow, 0.06)}, 0 3px 6px ${alpha(L.shadow, 0.08)}, 0 26px 50px -16px ${alpha(L.shadow, 0.32)}`,
  };

  const playP = 0.34 + 0.05 * t; // 迷你播放条进度
  const wordmark = 90;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.4, y: 0.0 }} fill={null} vignette={0.2} grain={0.05}>
        {/* 同心圆：各层错相极缓呼吸；受光上沿 + 白色发丝外缘，像涟漪的反光 */}
        {RINGS.map(({ size, color, phase }, i) => (
          <div key={i} style={{
            position: 'absolute', left: 960 - size / 2, top: 540 - size / 2, width: size, height: size, borderRadius: '50%',
            background: `linear-gradient(180deg, rgba(255,250,240,0.42) 0%, rgba(255,250,240,0) 40%), ${color}`,
            boxShadow: `inset 0 2px 0 rgba(255,252,246,0.85), 0 0 0 1.5px rgba(255,250,242,0.55), 0 -4px 22px rgba(255,248,236,0.4), 0 10px 40px ${alpha(L.shadow, 0.06 + i * 0.015)}`,
            transform: `scale(${(1 + 0.06 * Math.sin(t * Math.PI * 2 * 1.5 + phase)).toFixed(5)})`,
          }} />
        ))}
        {/* 中心暖白柔光：把视觉重心收到手机 */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 26% 44% at 50% 50%, rgba(255,250,240,0.7) 0%, rgba(255,250,240,0) 100%)' }} />
      </Stage>

      {/* 手机（含投影、侧键）整体上升 */}
      <div style={{ position: 'absolute', left: PX, top: PY, width: PW, height: PH, transform: `translateY(${phoneY.toFixed(2)}px)`, opacity: phoneOp }}>
        {/* 落地投影：贴近实影 + 远处大柔影（随落位收紧） */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 70,
          boxShadow: `0 4px 10px ${alpha(L.shadow, 0.2)}, 0 ${40 + (1 - rise) * 30}px ${80 + (1 - rise) * 40}px -20px ${alpha(L.shadow, 0.42)}, 0 90px 140px -40px ${alpha(L.shadow, 0.25)}`,
        }} />
        {/* 侧键 */}
        {[{ side: -1, y: 190, h: 64 }, { side: -1, y: 272, h: 64 }, { side: 1, y: 230, h: 104 }].map((b, i) => (
          <div key={i} style={{
            position: 'absolute', top: b.y, width: 5, height: b.h, borderRadius: 3,
            left: b.side < 0 ? -3.5 : PW - 1.5, background: 'linear-gradient(90deg, #8a7d6e, #c9bcaa, #8a7d6e)',
          }} />
        ))}
        {/* 暖钛边框 */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 70, padding: FRAME,
          background: 'linear-gradient(145deg, #d9cdbb 0%, #9d907f 30%, #c7baa7 55%, #7c705f 80%, #b5a894 100%)',
          boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.35), inset 0 0 0 3px rgba(60,48,36,0.25)',
        }}>
          {/* 黑边 */}
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 58, background: '#0d0b09', padding: BLACK, boxSizing: 'border-box' }}>
            {/* 屏幕 */}
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 50, background: '#f7f0e6', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(${scrollY.toFixed(2)}px)` }}>
                <Feed />
              </div>
              {/* 状态栏：固定在顶，底下一层渐隐让内容自然没入 */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 70, background: 'linear-gradient(180deg, rgba(247,240,230,1) 55%, rgba(247,240,230,0))' }} />
              <div style={{ position: 'absolute', left: 38, top: 20, font: `650 19px ${SANS}`, color: L.ink, letterSpacing: '-0.01em' }}>9:41</div>
              <div style={{ position: 'absolute', right: 32, top: 23, display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                {[6, 9, 12].map((h, i) => <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: L.ink }} />)}
                <div style={{ marginLeft: 6, width: 26, height: 13, borderRadius: 4, border: `1.5px solid ${alpha(L.ink, 0.45)}`, boxSizing: 'border-box', padding: 1.5 }}>
                  <div style={{ width: '74%', height: '100%', borderRadius: 2, background: L.ink }} />
                </div>
              </div>
              {/* 灵动岛 */}
              <div style={{ position: 'absolute', left: '50%', top: 14, width: 118, height: 34, marginLeft: -59, borderRadius: 17, background: '#0b0a09' }} />
              {/* 底部托底：屏幕底色渐变，滚到播放条下面的内容自然没入 */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 170, background: 'linear-gradient(180deg, rgba(247,240,230,0) 0%, rgba(247,240,230,0.92) 40%, #f7f0e6 70%)' }} />
              {/* 迷你播放条：固定在底 */}
              <div style={{
                position: 'absolute', left: 14, right: 14, bottom: 34, height: 92, borderRadius: 26, overflow: 'hidden',
                background: 'linear-gradient(180deg, #2c241e 0%, #221b16 100%)', boxShadow: `0 14px 30px -10px ${alpha(L.shadow, 0.5)}`,
                display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', boxSizing: 'border-box', fontFamily: SANS,
              }}>
                <Art k={0} size={62} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 680, color: '#fff6ec', letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>Launch film · preview</div>
                  {/* 波形：随帧轻跳（确定性） */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 22, marginTop: 6 }}>
                    {Array.from({ length: 22 }, (_, k) => {
                      const amp = 0.35 + 0.65 * Math.abs(Math.sin(k * 1.37 + f * 0.21) * Math.cos(k * 0.53 - f * 0.09));
                      return <div key={k} style={{ width: 3, height: 4 + amp * 16, borderRadius: 2, background: k / 22 < playP ? '#ffb27a' : alpha('#fff6ec', 0.3) }} />;
                    })}
                  </div>
                </div>
                <div style={{ width: 50, height: 50, borderRadius: 25, background: '#fff6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <div style={{ width: 5, height: 18, borderRadius: 2, background: '#221b16' }} />
                    <div style={{ width: 5, height: 18, borderRadius: 2, background: '#221b16' }} />
                  </div>
                </div>
                <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${(playP * 100).toFixed(2)}%`, background: ACCENT }} />
              </div>
              {/* home 条 */}
              <div style={{ position: 'absolute', left: '50%', bottom: 10, width: 140, height: 5, marginLeft: -70, borderRadius: 3, background: alpha(L.ink, 0.75) }} />
              {/* 玻璃斜反光（静态） */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(118deg, rgba(255,255,255,0) 32%, rgba(255,255,255,0.14) 44%, rgba(255,255,255,0) 56%)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 两侧 chip：左先右后，从手机侧边弹出 */}
      <div style={{ ...chipBase, top: 330, right: 1920 - PX + CHIP_GAP, ...chip(37, 0, -1) }}>
        <ChipIcon kind="chapters" />
        Shot recipe cards
      </div>
      <div style={{ ...chipBase, top: 610, left: PX + PW + CHIP_GAP, ...chip(67, 1.8, 1) }}>
        <ChipIcon kind="download" />
        Remotion render
      </div>

      {/* 品牌字标（收尾海报）：镜刻标志与字标同拍升起 */}
      <div style={{ position: 'absolute', left: 120, bottom: 104, color: L.ink }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ opacity: ramp(f, wordmark, 10, EASE.out), transform: `translateY(${((1 - ramp(f, wordmark, 18, EASE.snappy)) * 30).toFixed(2)}px)` }}>
            <ShotcraftMark size={86} tone="light" style={{ margin: '-10px 0' }} />
          </div>
          <div style={{ ...type(54, 700), fontFamily: BRAND.font, letterSpacing: '0.01em' }}>
            <TextReveal text={BRAND.name} by="word" variant="rise" start={wordmark} each={18} />
          </div>
        </div>
        <div style={{ ...type(32, 450), color: L.ink2, marginTop: 6 }}>
          <TextReveal text="Every shot, tuned in one place." by="word" variant="blur" start={wordmark + 8} each={16} gap={4} />
        </div>
      </div>
    </div>
  );
};
