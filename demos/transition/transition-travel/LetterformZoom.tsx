// letterform-zoom〔转场〕：巨型章节标题的字形是一扇扇"窗"，窗里透出下一页；镜头指数推进钻进
// 一个笔画，洞撑满全屏的瞬间新页面接管，残余笔画与盖板甩出画外。
//
// 第二轮重设计（余烬 · 熔炉之门）：
// - look = ember。盖板是暖黑章节字卡（顶光 + 字后余烬光），560px Black 字重的「EDITS」挖空成洞；
//   洞里透出的是一张熔金色的 video-shotcraft 发布页（橙 → 金渐变 + 一枚太阳光斑），所以字形本身就是画面里最亮的东西，
//   "洞里有东西"第一帧就读得出。hold 期页面的文字/卡片层完全隐去，洞里只有暖色渐变与柔光形（读作图像，
//   不和「EDITS」两层字互相抢）；主推中段 64–90f 内容由 18px 失焦淡入合焦，接管时已清晰。
//   字缘一圈熔光外溢到盖板上（模糊描边、只画在盖板区域内）——光从洞里漏出来。
// - 空间：盖板在前、页面在后。推进时盖板 ×30 而页面只 ×1.08，两层视差读作真实纵深；
//   快速段给盖板叠两层更小倍率的半透明残影（径向"变焦拖影"），代替整屏实时模糊。
// - 锚点 = 「I」竖笔中心（洞），竖笔 ≈106px 宽 ×30 ≈ 3200px > 画宽，推到底真正是洞撑满全屏。
// - 着陆后的余波：页面上的渲染卡 0→12 镜头计数、四条镜头时长条错峰填满（先密后疏），
//   "DONE"标签弹出——穿越之后新页面立刻是活的，不是一张死图。
//
// 时间表（30fps，共 150f）：
//   0–26    建立：字卡在场（第 0 帧即有画面），眉题/副标升起，盖板极缓前推 1→1.03（蓄势）
//   26–34   预备：后吸 2%（anticip）
//   34–86   主推：scale = 30^u，u 走 bezier(0.6,0,0.85,0.5) 慢起陡收（52f）；u>0.35 起残影 + 模糊
//   64–90   页面内容失焦淡入 → 合焦（18px→0，EASE.out）
//   76–86   接管：scale 14→26 盖板淡出；页面曝光 +12% 一闪回落
//   86–116  落定：页面继续前推到 1.08，速度与主推末端连续（quint-out）
//   96–132  余波：计数 0→12、时长条错峰填满、DONE 标签弹出
//   132–150 hold：海报定格
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, alpha, springAt, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const LETTERFORM_ZOOM_DURATION = 150;

const L = LOOKS.ember;
const WORD = 'EDITS';
const FS = 560; // 标题字号
const BASELINE = 712;
// 推进锚点 = 「I」竖笔中心（字形笔画 = 洞），按渲染帧实测（scale 1，「EDITS」）：竖笔 x 920–1026、y 316–712。
// 换字体 / 换词 / 换字号后必须重新实测（锚在盖板上推到底撑满画面的是盖板，读不出"穿洞"）。
const ORIGIN = { x: 973, y: 515 };
const ZOOM_MAX = 30;
const PUSH0 = 34;
const PUSH1 = 86;
const PAGE_ZOOM = 0.08; // 页面（后景）总推进量

const GHOSTS = [
  { lag: 3.2, a: 0.12 },
  { lag: 2.4, a: 0.16 },
  { lag: 1.6, a: 0.22 },
  { lag: 0.8, a: 0.3 },
];

const pushCurve = bezier(0.6, 0, 0.85, 0.5); // 慢起陡收：前段让观众看清洞里的页面

// 盖板 scale（帧的纯函数，残影要在不同帧上取样）
const plateScale = (f: number) => {
  const creep = 1 + 0.03 * ramp(f, 0, 26, EASE.smooth);
  const inhale = 1 - 0.02 * ramp(f, 26, 8, EASE.smooth) * (1 - ramp(f, PUSH0, 8, EASE.out));
  const u = ramp(f, PUSH0, PUSH1 - PUSH0, pushCurve);
  return creep * inhale * Math.pow(ZOOM_MAX, u);
};

// 页面 scale：主推期按 0.7·u 跟进，接管后 quint-out 补完剩下 30%（交接处速度连续）
const pageScale = (f: number) => {
  const u = ramp(f, PUSH0, PUSH1 - PUSH0, pushCurve);
  const P = f <= PUSH1 ? 0.7 * u : 0.7 + 0.3 * ramp(f, PUSH1, 30, EASE.out);
  return 1 + PAGE_ZOOM * P;
};

const titleFont: React.CSSProperties = { fontFamily: FONT.sans, fontWeight: 900, fontSize: FS, letterSpacing: '-0.02em' };

// ───────────── 后景：熔金发布页（video-shotcraft · 渲染完成） ─────────────
// 四个镜头 = 本仓库四张转场 demo 的真实帧数；条长 = 帧数 / 160
const SHOTS = [
  { code: 'sh01', name: 'Invisible cut', f: 110 },
  { code: 'sh02', name: 'Letterform zoom', f: 150 },
  { code: 'sh03', name: 'Light leak burn', f: 130 },
  { code: 'sh04', name: 'Versus slam', f: 105 },
];
const INK = '#1c0a02'; // 熔金底上的墨色（带暖色相的近黑）

// 页面内容"失焦 → 合焦"：字卡 hold 期内容层完全隐去，字洞里只透出暖色渐变与光斑（读作图像/质感，
// 不与「EDITS」抢字）；主推中段 64–90f 内容由 18px 失焦淡入并合焦，接管时已清晰可读。
const REVEAL0 = 64;
const REVEAL_DUR = 26;

const NextPage: React.FC<{ frame: number }> = ({ frame }) => {
  const reveal = ramp(frame, REVEAL0, REVEAL_DUR, EASE.out);
  const defocus = 18 * (1 - reveal);
  const count = Math.round(12 * ramp(frame, 96, 30, EASE.snappy));
  const live = springAt(frame, 124, { damping: 15, stiffness: 240 });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* 熔金渐变：左上金 → 中橙 → 右下深赤，右侧一枚太阳光斑垫在部署卡背后 */}
      <AbsoluteFill style={{ background: 'linear-gradient(128deg, #ffcf5a 0%, #ff9a3c 34%, #ff6b2c 62%, #c2370e 100%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(circle 520px at 1450px 540px, rgba(255,236,170,0.75) 0%, rgba(255,200,110,0.25) 45%, rgba(255,160,80,0) 72%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 100%, rgba(120,20,0,0.35) 0%, rgba(120,20,0,0) 70%)' }} />
      {/* 失焦期的光形：部署卡位置一团奶白柔光、标题区一抹暗赤——字洞里只看得到"有光有形"，看不到字 */}
      <AbsoluteFill style={{
        opacity: 1 - reveal,
        background: 'radial-gradient(ellipse 380px 340px at 1390px 580px, rgba(255,246,228,0.55) 0%, rgba(255,240,220,0) 100%), ' +
          'radial-gradient(ellipse 520px 260px at 560px 500px, rgba(110,25,0,0.22) 0%, rgba(110,25,0,0) 100%)',
      }} />

      {/* 内容层：hold 期隐去，主推中段失焦淡入 → 合焦 */}
      {reveal > 0 && (
      <AbsoluteFill style={{ opacity: reveal, filter: defocus > 0.05 ? `blur(${defocus.toFixed(2)}px)` : undefined }}>
      {/* 导航 */}
      <div style={{ position: 'absolute', left: 200, right: 230, top: 122, display: 'flex', alignItems: 'center', color: INK }}>
        {/* App 图标：墨色圆角底 + 反白镜刻标志 */}
        <div style={{ width: 46, height: 46, borderRadius: 13, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShotcraftMark size={34} tone="dark" />
        </div>
        <div style={{ fontFamily: BRAND.font, fontSize: 34, fontWeight: 700, letterSpacing: '0.03em', marginLeft: 16 }}>{BRAND.name}</div>
        <div style={{ flex: 1 }} />
        {['Shots', 'Workbench', 'Gallery'].map((s) => (
          <div key={s} style={{ ...type(28, 550), marginLeft: 48, opacity: 0.72 }}>{s}</div>
        ))}
        <div style={{ ...type(28, 650), marginLeft: 48, padding: '14px 28px', borderRadius: 999, background: INK, color: '#ffe7c4' }}>Render</div>
      </div>

      {/* 主标题区 */}
      <div style={{ position: 'absolute', left: 200, top: 312, width: 860, color: INK }}>
        <div style={{ ...type(26, 750, { caps: true }), letterSpacing: '0.2em', opacity: 0.62 }}>Launch film · Final cut</div>
        <div style={{ ...type(140, 820), letterSpacing: '-0.05em', lineHeight: 0.92, marginTop: 30 }}>
          Every shot.<br />One prompt.
        </div>
        <div style={{ ...type(40, 480), lineHeight: 1.3, marginTop: 40, opacity: 0.78, width: 720 }}>
          Storyboard, animate, sound-design and deliver — cut to the beat.
        </div>
      </div>

      {/* 渲染卡：奶白磨砂玻璃（亮面，透过字洞时整张卡也是亮的）+ 顶部内高光 + 两层暖影 */}
      <div style={{
        position: 'absolute', left: 1070, top: 282, width: 640, height: 600, borderRadius: 32,
        background: 'linear-gradient(180deg, rgba(255,250,242,0.94) 0%, rgba(255,240,224,0.88) 100%)',
        border: `1px solid ${alpha('#ffffff', 0.7)}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 14px rgba(110,30,0,0.18), 0 50px 100px -24px rgba(120,30,0,0.45)`,
        padding: '40px 48px', boxSizing: 'border-box', color: INK,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ ...type(26, 500, { mono: true }), color: alpha(INK, 0.55) }}>launch-film.mp4</div>
          <div style={{ flex: 1 }} />
          <div style={{
            ...type(22, 750, { caps: true }), letterSpacing: '0.16em', padding: '8px 16px', borderRadius: 999,
            background: INK, color: '#ffd46a', display: 'flex', alignItems: 'center', gap: 10,
            transform: `scale(${mix(0.6, 1, live).toFixed(4)})`, opacity: Math.min(1, live * 1.5),
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#ffb02e', boxShadow: '0 0 10px #ffb02e' }} />
            Done
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 34 }}>
          <div style={{ ...type(132, 820), letterSpacing: '-0.05em', width: 168, textAlign: 'right' }}>{count}</div>
          <div style={{ ...type(60, 650), color: alpha(INK, 0.32), marginLeft: 14 }}>/12</div>
          <div style={{ ...type(32, 520), color: alpha(INK, 0.6), marginLeft: 22 }}>shots rendered</div>
        </div>
        <div style={{ marginTop: 34 }}>
          {SHOTS.map((r, i) => {
            const fill = ramp(frame, 100 + [0, 4, 10, 18][i], 22, EASE.snappy);
            const on = fill > 0.02;
            return (
              <div key={r.code} style={{ marginTop: i ? 22 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <div style={{ ...type(30, 650) }}>{r.name}</div>
                  <div style={{ ...type(22, 500, { mono: true }), color: alpha(INK, 0.4), marginLeft: 14 }}>{r.code}</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ ...type(30, 600, { mono: true }), color: alpha(INK, on ? 0.9 : 0.3) }}>{on ? `${r.f}f` : '—'}</div>
                </div>
                <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: alpha(INK, 0.08), overflow: 'hidden' }}>
                  <div style={{ width: `${(fill * (r.f / 1.6)).toFixed(2)}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${L.accent}, #ffb02e)` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </AbsoluteFill>
      )}
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

// ───────────── 前景：挖了字形洞的暖黑盖板 ─────────────
const Plate: React.FC<{ scale: number; id: string; ghost?: boolean; blur?: number; intro?: number }> = ({ scale, id, ghost, blur = 0, intro = 1 }) => {
  const k = 1 / scale; // 线宽 / 模糊半径按 scale 补偿，推进中视觉恒定
  return (
    <div style={{
      position: 'absolute', inset: 0, transform: `scale(${scale.toFixed(5)})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
      filter: blur > 0.05 ? `blur(${(blur * k).toFixed(3)}px)` : undefined,
    }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <radialGradient id={`${id}g`} cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#2a1810" />
            <stop offset="45%" stopColor="#150b07" />
            <stop offset="100%" stopColor="#080403" />
          </radialGradient>
          <mask id={`${id}m`} maskUnits="userSpaceOnUse" x={-200} y={-200} width={2320} height={1480}>
            <rect x={-200} y={-200} width={2320} height={1480} fill="#fff" />
            <text x={960} y={BASELINE} textAnchor="middle" fill="#000" style={titleFont}>{WORD}</text>
          </mask>
          {!ghost && (
            <filter id={`${id}f`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={(16 * k).toFixed(3)} />
            </filter>
          )}
        </defs>
        <g mask={`url(#${id}m)`}>
          <rect x={-200} y={-200} width={2320} height={1480} fill={`url(#${id}g)`} />
          {!ghost && (
            <>
              {/* 熔光外溢：模糊的橙色描边只画在盖板上——光从字洞里漏到盖板边缘 */}
              <text x={960} y={BASELINE} textAnchor="middle" fill="none" stroke={L.accent} strokeWidth={22 * k}
                opacity={0.55} filter={`url(#${id}f)`} style={titleFont}>{WORD}</text>
              {/* 切口受光边：1.5px 暖白，读作盖板有厚度 */}
              <text x={960} y={BASELINE} textAnchor="middle" fill="none" stroke="#ffd9b0" strokeWidth={3 * k}
                opacity={0.5} style={titleFont}>{WORD}</text>
            </>
          )}
        </g>
      </svg>
      {!ghost && (
        <>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 196, textAlign: 'center', color: L.accent,
            ...type(30, 750, { caps: true }), letterSpacing: `${mix(0.8, 0.42, intro).toFixed(3)}em`, opacity: intro,
          }}>Chapter 02</div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 790, textAlign: 'center', color: L.ink2, ...type(44, 480),
            opacity: intro, transform: `translateY(${((1 - intro) * 24).toFixed(2)}px)`,
          }}>
            Your product, in motion.
          </div>
        </>
      )}
    </div>
  );
};

export const LetterformZoom: React.FC = () => {
  const frame = useCurrentFrame();
  const id = `lfz${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const s = plateScale(frame);
  const u = ramp(frame, PUSH0, PUSH1 - PUSH0, pushCurve);
  const plateOpacity = 1 - ramp(s, 14, 12, EASE.linear);
  const blur = 20 * ramp(u, 0.35, 0.65, EASE.swift); // 期望视觉模糊（px），组件内按 scale 补偿
  const ghostK = ramp(u, 0.5, 0.2, EASE.out) * plateOpacity;

  // 眉题字距收拢 / 副标升起（第 0 帧字卡已在，文字 2–18f 入场）
  const intro = ramp(frame, 2, 16, EASE.snappy);
  // 接管瞬间页面曝光一闪：+12% 后回落
  const expo = 1 + 0.12 * ramp(frame, 76, 8, EASE.out) * (1 - ramp(frame, 86, 14, EASE.smooth));
  const ps = pageScale(frame);
  // 后景视差横移：页面比盖板慢半拍地向左漂 28px，洞里的内容在"动"，读作纵深而不是贴图
  const drift = 28 * (1 - ramp(frame, 0, 100, EASE.smooth));

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, transform: `translateX(${drift.toFixed(2)}px) scale(${ps.toFixed(5)})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
        filter: expo > 1.002 ? `brightness(${expo.toFixed(3)})` : undefined,
      }}>
        <NextPage frame={frame} />
      </div>

      {plateOpacity > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: plateOpacity }}>
          {/* 变焦拖影：四层更早 0.8–3.2 帧的盖板（更小倍率），透明度递减叠成径向拖尾 */}
          {ghostK > 0.01 && GHOSTS.map((g, i) => (
            <div key={i} style={{ position: 'absolute', inset: 0, opacity: g.a * ghostK }}>
              <Plate scale={plateScale(frame - g.lag)} id={`${id}g${i}`} ghost blur={blur} />
            </div>
          ))}
          <div style={{ position: 'absolute', inset: 0 }}>
            <Plate scale={s} id={id} blur={blur} intro={intro} />
          </div>
        </div>
      )}
      {/* 字卡阶段的舞台颗粒（页面接管后由页面自带颗粒） */}
      {plateOpacity > 0 && <Grain opacity={0.08 * plateOpacity} blend="soft-light" />}
    </AbsoluteFill>
  );
};
