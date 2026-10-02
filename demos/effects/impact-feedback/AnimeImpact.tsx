// anime-impact 动漫打击帧〔组合〕：crash-zoom 急推撞停在目标格上的那 3 帧，整幅画面反转成黑白负片
// + 放射集中线 + 红青通道错位——像素被打了一拳，第 4 帧全撤，恢复干净特写 + 6px 震屏衰减。
//
// 第二轮重设计（漫画分镜页 · 部署成功的那一拳）：
// - look = paper（暖白纸 · 墨 · 朱红），但走的是漫画分格而不是编辑排版：整幅是一页 5 格的漫画分镜，
//   7px 墨线格框 + 白色格间沟 + 网点（screentone）。五格讲一条虚构部署工具 Shiden 的流水线：
//   01 Push（墨底终端）→ 02 Tests 214/214 → 竖格 Build 3.1 s → 03 主格 Deploy → 底格品牌。
// - 手法语义落在内容上：主格起初是「DEPLOYING」+ 92% 进度条，急推撞停的同一帧翻成「DEPLOYED.」——
//   负片打击帧 = 部署成功的那一拳；恢复后一枚朱红描墨的拟声字「ドン!」盖章砸上格角（漫画音效字）。
// - 打击帧 3f：invert + grayscale + 高反差的负片、34 粗楔 + 22 细针集中线（每帧换形态）、红/青负片副本
//   screen 叠加 ±9px 错位；第 4 帧全撤。急推段时间采样运动模糊 + 中心锐利遮罩（变焦模糊的径向性）。
//
// 时间表（30fps，共 135f）：
//   0–24    建立：整页分镜正视，极缓 creep 1→1.012；主格进度条 60%→92% 在走；6–20 主格朱红锁定框亮起
//   24–30   预备：回拉到 0.985（拳头往后收，smooth）
//   30–36   主动作：急推 6f ease-in(cubic) 到 1.74x，主格高 ≈ 画高 93%，格心收敛到画面正中
//   36–38   打击帧 3f（负片 / 集中线 / RGB split，每帧换形态）；36 起主格内容已是 DEPLOYED.
//   39      恢复：干净特写 + 6px 震屏 τ≈2.2f 衰减；格外压暗一拍；拟声字 ドン! 弹簧盖章（damping 12）
//   44–70   跟随：14 regions · 0.8 s 行升起，进度条满格变朱红
//   70–135  hold：相机极缓再推 1→1.02（ease-out），读格 ≥2s
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, alpha, springAt, type } from '../../_fixtures/Look';

export const ANIME_IMPACT_DURATION = 135;

const L = LOOKS.paper;
const INK = L.ink;
const RED = L.accent; // 朱红

const WIND = 24;
const ZOOM_START = 30;
const ZOOM_END = 36; // 撞停帧
const IMPACT_LEN = 3;
const RECOVER = ZOOM_END + IMPACT_LEN; // 39

// 主格（目标）
const HERO = { x: 726, y: 60, w: 874, h: 580 };
const CX = HERO.x + HERO.w / 2; // 1163
const CY = HERO.y + HERO.h / 2; // 350
const SCALE_END = 1.74; // 580×1.74 ≈ 1009 ≈ 画高 93%

const inCubic = bezier(0.55, 0.055, 0.675, 0.19);

const rnd = (i: number) => {
  const s = Math.sin(i * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const camAt = (f: number) => {
  const creep = mix(1, 1.012, ramp(f, 0, WIND, EASE.smooth));
  const wind = mix(creep, 0.985, ramp(f, WIND, ZOOM_START - WIND, EASE.smooth));
  const p = ramp(f, ZOOM_START, ZOOM_END - ZOOM_START, inCubic);
  const hold = f >= RECOVER ? 0.02 * ramp(f, RECOVER + 20, 135 - RECOVER - 20, EASE.out) : 0;
  const scale = f < ZOOM_START ? wind : mix(0.985, SCALE_END, p) * (1 + hold);
  return { scale, p };
};

const zoomStyle = (f: number): React.CSSProperties => {
  const { scale, p } = camAt(f);
  return {
    position: 'absolute', inset: 0,
    transform: `translate(${((960 - CX) * p).toFixed(2)}px, ${((540 - CY) * p).toFixed(2)}px) scale(${scale.toFixed(4)})`,
    transformOrigin: `${CX}px ${CY}px`,
  };
};

// ───────────── 漫画分镜页 ─────────────
const TONE = (c: string, a: number, size = 10) =>
  ({ backgroundImage: `radial-gradient(circle, ${alpha(c, a)} 1.6px, transparent 1.9px)`, backgroundSize: `${size}px ${size}px` }) as React.CSSProperties;

const Panel: React.FC<{ x: number; y: number; w: number; h: number; bg?: string; border?: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  x, y, w, h, bg = L.surface, border = INK, children, style,
}) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', overflow: 'hidden',
      background: bg, border: `7px solid ${border}`, borderRadius: 4, ...style,
    }}
  >
    {children}
  </div>
);

// 主格背景的静态集中线（漫画"聚焦"线，淡墨）
const FocusLines: React.FC = () => (
  <svg width={HERO.w} height={HERO.h} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2 + rnd(i) * 0.05;
      const r0 = 250 + rnd(i + 9) * 90;
      const cx = HERO.w / 2, cy = HERO.h / 2 - 10;
      return (
        <line key={i} x1={cx + Math.cos(a) * r0 * 1.3} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * 900} y2={cy + Math.sin(a) * 900}
          stroke={INK} strokeOpacity={0.09 + rnd(i + 3) * 0.08} strokeWidth={1 + rnd(i + 5) * 2.5} />
      );
    })}
  </svg>
);

const Page: React.FC<{ lock: number; deployed: boolean; progress: number; settle: number }> = ({ lock, deployed, progress, settle }) => (
  <div style={{ position: 'absolute', inset: 0, background: L.bg[1], fontFamily: FONT.sans }}>
    {/* 01 Push：墨底终端 */}
    <Panel x={70} y={60} w={630} h={460} bg="#17130f">
      <div style={{ position: 'absolute', left: 40, top: 34, ...type(24, 800, { caps: true }), letterSpacing: '0.22em', color: RED }}>01 · Push</div>
      <div style={{ position: 'absolute', left: 40, top: 92, ...type(28, 500, { mono: true }), lineHeight: 1.6, color: alpha(L.bg[0], 0.7) }}>
        <div><span style={{ color: RED }}>$</span> git push origin main</div>
        <div>→ shiden: build queued</div>
        <div>→ 8 services changed</div>
      </div>
      <div style={{ position: 'absolute', left: 36, bottom: 22, ...type(132, 900), letterSpacing: '-0.05em', color: L.bg[0] }}>Push.</div>
    </Panel>
    {/* 02 Tests */}
    <Panel x={70} y={546} w={630} h={474}>
      <div style={{ position: 'absolute', inset: 0, ...TONE(INK, 0.22, 11), WebkitMaskImage: 'linear-gradient(200deg, transparent 35%, #000 100%)', maskImage: 'linear-gradient(200deg, transparent 35%, #000 100%)' }} />
      <div style={{ position: 'absolute', left: 40, top: 34, ...type(24, 800, { caps: true }), letterSpacing: '0.22em', color: RED }}>02 · Test</div>
      <div style={{ position: 'absolute', left: 36, top: 120, ...type(150, 900), letterSpacing: '-0.05em', color: INK }}>214</div>
      <div style={{ position: 'absolute', left: 44, top: 290, ...type(40, 700), color: L.ink2 }}>of 214 tests passed</div>
      <svg width={120} height={120} viewBox="0 0 24 24" style={{ position: 'absolute', right: 40, top: 130 }}>
        <path d="M4 12.5l5 5L20 6" fill="none" stroke={RED} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Panel>
    {/* 竖格 Build */}
    <Panel x={1626} y={60} w={224} h={580} bg={INK}>
      <div style={{ position: 'absolute', inset: 0, ...TONE('#ffffff', 0.16, 9), WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)', maskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)' }} />
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', whiteSpace: 'nowrap',
          ...type(64, 900), letterSpacing: '-0.03em', color: L.bg[0],
        }}
      >
        Build <span style={{ color: RED }}>3.1 s</span>
      </div>
    </Panel>
    {/* 底格：品牌 */}
    <Panel x={726} y={666} w={1124} h={354}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 520, ...TONE(INK, 0.16, 12), WebkitMaskImage: 'linear-gradient(90deg, transparent, #000)', maskImage: 'linear-gradient(90deg, transparent, #000)' }} />
      <div style={{ position: 'absolute', left: 54, top: 96, display: 'flex', alignItems: 'center', gap: 26 }}>
        <div style={{ width: 120, height: 120, background: RED, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={70} height={70} viewBox="0 0 24 24"><path d="M13.5 2 4.5 13.5H11L9.5 22 19 9.8h-6.6z" fill={L.bg[0]} /></svg>
        </div>
        <div>
          <div style={{ ...type(96, 900), letterSpacing: '-0.05em', color: INK, lineHeight: 0.9 }}>Shiden</div>
          <div style={{ ...type(36, 600), color: L.ink2, marginTop: 14 }}>Ship like lightning.</div>
        </div>
      </div>
    </Panel>
    {/* 03 主格 Deploy */}
    <Panel x={HERO.x} y={HERO.y} w={HERO.w} h={HERO.h} border={lock > 0.5 ? RED : INK}>
      <FocusLines />
      <div style={{ position: 'absolute', left: 46, top: 38, ...type(24, 800, { caps: true }), letterSpacing: '0.22em', color: RED }}>03 · Deploy</div>
      {/* 部署完成后让位给拟声字 */}
      {!deployed && <div style={{ position: 'absolute', right: 46, top: 36, ...type(26, 500, { mono: true }), color: L.ink2 }}>main → prod</div>}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 190, textAlign: 'center',
          ...type(deployed ? 140 : 112, 900), letterSpacing: '-0.045em', color: deployed ? INK : alpha(INK, 0.4), fontStyle: deployed ? 'italic' : 'normal',
        }}
      >
        {deployed ? 'DEPLOYED.' : 'DEPLOYING'}
      </div>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 400, height: 16, borderRadius: 8, background: alpha(INK, 0.12), overflow: 'hidden', boxShadow: `inset 0 0 0 2px ${INK}` }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: deployed ? RED : INK }} />
      </div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 444, textAlign: 'center', ...type(44, 750), letterSpacing: '-0.02em', color: INK,
          opacity: settle, transform: `translateY(${mix(16, 0, settle).toFixed(1)}px)`,
        }}
      >
        14 regions · <span style={{ color: RED }}>0.8 s</span>
      </div>
    </Panel>
    {/* 锁定框：主格外一圈朱红描边，进度 lock */}
    <div
      style={{
        position: 'absolute', left: HERO.x - 14, top: HERO.y - 14, width: HERO.w + 28, height: HERO.h + 28, boxSizing: 'border-box',
        border: `3px solid ${RED}`, borderRadius: 8, opacity: lock * (deployed ? 0 : 1),
        transform: `scale(${mix(1.05, 1, lock).toFixed(4)})`, transformOrigin: `${HERO.w / 2 + 14}px ${HERO.h / 2 + 14}px`,
      }}
    />
  </div>
);

// 打击帧集中线：外圈 34 根粗楔 + 22 根细针，内端落在主格周缘一带；phase 每帧换形态
const SpeedLines: React.FC<{ phase: number }> = ({ phase }) => {
  const cx = 960, cy = 540, R_OUT = 1300;
  const wedge = (i: number, n: number, k: number, r0Min: number, r0Var: number, wMin: number, wVar: number) => {
    const ang = ((i + 0.5) / n) * Math.PI * 2 + (rnd(k) - 0.5) * 0.24;
    const r0 = r0Min + rnd(k + 1) * r0Var;
    const halfW = (wMin + rnd(k + 2) * wVar) / R_OUT;
    const ax = cx + Math.cos(ang) * r0 * 1.35, ay = cy + Math.sin(ang) * r0;
    const p1 = `${cx + Math.cos(ang - halfW) * R_OUT},${cy + Math.sin(ang - halfW) * R_OUT}`;
    const p2 = `${cx + Math.cos(ang + halfW) * R_OUT},${cy + Math.sin(ang + halfW) * R_OUT}`;
    return `${ax},${ay} ${p1} ${p2}`;
  };
  const thick = Array.from({ length: 34 }, (_, i) => wedge(i, 34, i * 13 + phase * 101, 300, 220, 10, 26));
  const thin = Array.from({ length: 22 }, (_, i) => wedge(i + 0.37, 22, i * 29 + phase * 57 + 7, 380, 260, 2, 5));
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="ai-lines-fade" cx="960" cy="540" r="720" gradientUnits="userSpaceOnUse">
          <stop offset="0.36" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="1" />
        </radialGradient>
        <mask id="ai-lines-mask"><rect width="1920" height="1080" fill="url(#ai-lines-fade)" /></mask>
      </defs>
      <g mask="url(#ai-lines-mask)">
        {thick.map((pts, i) => <polygon key={`a${i}`} points={pts} fill={i % 5 === 0 ? '#0d0b09' : '#f6f1e8'} />)}
        {thin.map((pts, i) => <polygon key={`b${i}`} points={pts} fill="#f6f1e8" opacity={0.85} />)}
      </g>
    </svg>
  );
};

const SHUTTER = 0.6;
const blurAt = (f: number) => {
  if (f <= ZOOM_START || f >= ZOOM_END) return { n: 1, sd: 0 };
  const a = camAt(f), b = camAt(f - SHUTTER);
  const edge = Math.abs(a.scale - b.scale) * 900 + Math.abs(a.p - b.p) * 260;
  const n = Math.max(1, Math.min(10, Math.ceil(edge / 12)));
  return { n, sd: n > 1 ? Math.min(6, (edge / (n - 1)) * 0.45) : 0 };
};

const sharpMask = (f: number) => {
  const { p } = camAt(f);
  const x = ((CX + (960 - CX) * p) / 1920) * 100;
  const y = ((CY + (540 - CY) * p) / 1080) * 100;
  return `radial-gradient(ellipse 30% 34% at ${x.toFixed(1)}% ${y.toFixed(1)}%, #000 0%, rgba(0,0,0,0.85) 45%, transparent 100%)`;
};

const NEG = 'invert(1) grayscale(1) contrast(1.5)';

export const AnimeImpact: React.FC = () => {
  const frame = useCurrentFrame();

  const lock = ramp(frame, 6, 14, EASE.out);
  const deployed = frame >= ZOOM_END;
  const progress = deployed ? 1 : mix(0.6, 0.92, ramp(frame, 0, ZOOM_END, EASE.out));
  const settle = ramp(frame, RECOVER + 6, 16, EASE.snappy);
  const impact = frame >= ZOOM_END && frame < RECOVER;
  const phase = impact ? frame - ZOOM_END : 0;

  // 震屏：6px 起步，指数衰减 τ≈2.2f
  const since = frame - RECOVER;
  const env = since >= 0 ? 6 * Math.exp(-since / 2.2) : 0;
  const live = env > 0.12;
  const shakeX = live ? env * 0.7 * Math.sin(since * 2.5 + 0.6) : 0;
  const shakeY = live ? env * Math.cos(since * 2.9) : 0;
  const shakeR = live ? env * 0.04 * Math.sin(since * 3.3 + 1.7) : 0;

  const hitK = frame >= RECOVER ? 1 - ramp(frame, RECOVER, 24, EASE.out) : 0;
  const { n, sd } = blurAt(frame);

  // 拟声字 ドン!：弹簧盖章（大→小，一次可见回弹）
  const sfx = frame >= RECOVER ? springAt(frame, RECOVER, { damping: 12, stiffness: 260 }) : 0;

  const scene = <Page lock={lock} deployed={deployed} progress={progress} settle={settle} />;

  return (
    <AbsoluteFill style={{ background: impact ? '#0d0b09' : L.bg[1], overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px) rotate(${shakeR.toFixed(3)}deg)` }}>
        {/* 主层：打击帧期间整幅负片；急推段时间采样运动模糊 */}
        <div style={{ position: 'absolute', inset: 0, filter: impact ? NEG : 'none' }}>
          {Array.from({ length: n }, (_, k) => (
            <div
              key={k}
              style={{
                ...zoomStyle(frame - (SHUTTER * k) / Math.max(1, n - 1)),
                opacity: k === 0 ? 1 : 1 / (k + 1),
                filter: sd > 0.3 ? `blur(${sd.toFixed(2)}px)` : undefined,
              }}
            >
              {scene}
            </div>
          ))}
          {n > 1 && (
            <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: sharpMask(frame), maskImage: sharpMask(frame) }}>
              <div style={zoomStyle(frame)}>{scene}</div>
            </div>
          )}
        </div>

        {impact && (
          <>
            {[
              { dx: -9, dy: phase % 2 === 0 ? 4 : -4, tint: '#ff2a3a' },
              { dx: 9, dy: phase % 2 === 0 ? -4 : 4, tint: '#18e0ff' },
            ].map((c, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', transform: `translate(${c.dx}px, ${c.dy}px)`, isolation: 'isolate' }}>
                <div style={{ ...zoomStyle(frame), filter: NEG }}>{scene}</div>
                <div style={{ position: 'absolute', inset: 0, background: c.tint, mixBlendMode: 'multiply' }} />
              </div>
            ))}
            <SpeedLines phase={phase} />
          </>
        )}

        {/* 恢复后：主格外压暗（大 spread 阴影当遮罩，随特写坐标走）+ 拟声字 */}
        {frame >= RECOVER && (
          <div style={zoomStyle(frame)}>
            <div
              style={{
                position: 'absolute', left: HERO.x, top: HERO.y, width: HERO.w, height: HERO.h, borderRadius: 4,
                boxShadow: `0 0 0 3000px ${alpha(L.shadow, mix(0.14, 0.34, hitK))}`,
              }}
            />
            <div
              style={{
                position: 'absolute', left: HERO.x + HERO.w - 262, top: HERO.y + 34, transformOrigin: '50% 60%',
                transform: `rotate(-10deg) scale(${mix(1.8, 1, sfx).toFixed(4)})`, // 盖章：满不透明度直接砸下（半透明的描边字很廉价）
                fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "PingFang SC", sans-serif',
                fontSize: 104, fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1, color: RED, whiteSpace: 'nowrap',
                WebkitTextStroke: `7px ${INK}`, paintOrder: 'stroke fill',
                textShadow: `5px 6px 0 ${INK}`,
              }}
            >
              ドン!
            </div>
          </div>
        )}
      </div>
      {!impact && <Vignette strength={frame >= RECOVER ? mix(0.18, 0.4, hitK) : 0.16} inner={0.5} color={L.shadow} />}
      {!impact && <Grain opacity={0.05} />}
    </AbsoluteFill>
  );
};
