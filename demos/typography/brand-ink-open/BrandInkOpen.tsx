// brand-ink-open —— 墨线十字准星描画 → 字标逐字 letterpress → 打字机副标
// → 满一秒静止 → 上浮消散。品牌开场第一拍：任何产品画面出现前先立名号。
//
// 第二轮重设计（活版打样稿 · 赤陶墨）：
// - look = sand（米色棉纸 · 墨 · 赤陶）。画面不再是"白底一行小字"，而是一张印刷打样稿：
//   四角裁切线、左右套准标、左下色标条 + 打样编号（都是 22px 级"纹理"，压暗不抢戏），
//   正中一只 280px 粗衬线字标「Kestrel.」占画宽 ~55%，赤陶句点是唯一的强调色主角。
// - 准星：开场第 0 帧起裁切线与中心套准标同时描画（竖 → 横 → 圆环），印版"对准"后缩小淡出，
//   让位给压印——准星是"对位"的动作语义，不残留。
// - 压印：每个字从 1.45× 悬空、带离地投影与 5.5px 失焦，ease-in 加速砸向纸面；落地瞬间
//   0.97 微压回弹 + 一圈墨晕（ink spread）8f 收掉；投影随离地高度从远而虚收到贴实
//   （"压进纸里"）。末尾赤陶句点最后一个落、压得最重（0.94）。
// - 字下一条赤陶细线逐字段描出（每个字落地时它下方那一段拉开，线头带亮头）——唯一一道
//   跟着压印前沿走的光（Q4），描完即成为 lockup 的分隔线。
// - kicker：mono 34px 宽字距打字机 + 赤陶块光标；停闪后进入 hold，hold 段整组极缓推近 1.2%。
// - 退场：ease-in 10f 上浮 52px + 缩 8% + 失焦 + 淡出（快于入场），打样框留在纸上交棒。
//
// 时间表（30fps，共 120f）：
//   0–20    预备：裁切线 0–14 描画、套准标竖 2–12 / 横 7–17 / 环 4–20（第 0 帧画面已有线头）
//   14–25   套准标缩小淡出（压印从左侧起手，不和准星叠在一起）
//   18–53   压印：8 个单元（K e s t r e l .）每 3.6f 一个、单个 10f，句点 ~53f 落定
//   54–74   kicker 打字 0.75f/字符（26 字符），光标闪到 88f
//   53–104  hold：wordmark 落定后 51f（>1s），lockup 全部就位后 ~30f；极缓推近
//   104–114 退场（ease-in）
//   114–120 干净的打样纸收尾
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, alpha } from '../../_fixtures/Look';

export const BRAND_INK_OPEN_DURATION = 120;

const L = LOOKS.sand;
const WORD = 'Kestrel';
const UNITS = [...WORD.split(''), '.']; // 句点单独一个压印单元（赤陶）
const KICKER = 'RESEARCH CONSOLE FOR TEAMS';

const PRESS_START = 18;
const PRESS_GAP = 3.6;
const PRESS_DUR = 10;
const LAND = (i: number) => PRESS_START + i * PRESS_GAP + PRESS_DUR; // 第 i 个单元落地帧
const LAST_LAND = LAND(UNITS.length - 1);
const KICK_START = 54;
const KICK_PER = 0.75;
const KICK_DONE = KICK_START + KICKER.length * KICK_PER;
const HOLD_END = 104;
const EXIT_DUR = 10;

const SIZE = 280; // 字标字号
const pressIn = bezier(0.55, 0, 0.85, 0.3); // 加速砸下：越近纸面越快，落点突然停住
const exitIn = bezier(0.5, 0, 0.75, 0.3);

// 打样稿裁切线：四角各两条（离角点留 18px 空），0–14f 描出
const CropMarks: React.FC<{ p: number }> = ({ p }) => {
  const I = 96, LEN = 56, GAP = 18;
  const corners = [
    [I, I, 1, 1], [1920 - I, I, -1, 1], [I, 1080 - I, 1, -1], [1920 - I, 1080 - I, -1, -1],
  ];
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <g stroke={alpha(L.ink, 0.55)} strokeWidth={1.5} fill="none" strokeLinecap="square">
        {corners.map(([x, y, sx, sy], k) => (
          <g key={k}>
            {/* 横线从外向角点画、竖线同理：线头先出现，读作"正在对位" */}
            <line x1={x - sx * (GAP + LEN)} y1={y} x2={x - sx * (GAP + LEN) + sx * LEN * p} y2={y} />
            <line x1={x} y1={y - sy * (GAP + LEN)} x2={x} y2={y - sy * (GAP + LEN) + sy * LEN * p} />
          </g>
        ))}
      </g>
    </svg>
  );
};

// 小套准标（左右边缘中线），纹理级
const RegMark: React.FC<{ x: number; y: number; p: number; r?: number; color: string; w?: number }> = ({ x, y, p, r = 16, color, w = 1.5 }) => (
  <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth={w} fill="none">
    <circle r={r} pathLength={100} strokeDasharray={100} strokeDashoffset={100 * (1 - p)} transform="rotate(-90)" />
    <line x1={0} y1={-r * 1.7} x2={0} y2={-r * 1.7 + r * 3.4 * p} />
    <line x1={-r * 1.7} y1={0} x2={-r * 1.7 + r * 3.4 * p} y2={0} />
  </g>
);

export const BrandInkOpen: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 打样框 ──
  const cropP = ramp(frame, 0, 14, EASE.out);
  const sideReg = ramp(frame, 3, 16, EASE.out);
  const barP = ramp(frame, 6, 16, EASE.out);

  // ── 中心套准标：竖 2–12、横 7–17、环 4–20；16–28 缩小淡出 ──
  const vP = ramp(frame, 2, 10, EASE.swift);
  const hP = ramp(frame, 7, 10, EASE.swift);
  const ringP = ramp(frame, 4, 16, EASE.out);
  const regOut = ramp(frame, 14, 11, EASE.exit);

  // ── hold 段极缓推近 + 退场 ──
  const push = 1 + 0.012 * ramp(frame, LAST_LAND, HOLD_END - LAST_LAND, EASE.smooth);
  const out = ramp(frame, HOLD_END, EXIT_DUR, exitIn);

  // ── kicker 打字机 ──
  const kickChars = Math.max(0, Math.min(KICKER.length, Math.floor((frame - KICK_START) / KICK_PER)));
  const cursorOn = frame >= KICK_START - 2 && frame < 88 && (frame < KICK_DONE || Math.floor((frame - KICK_DONE) / 4) % 2 === 0);

  return (
    <AbsoluteFill>
      <Stage look={L} keyLight={{ x: 0.36, y: 0.22 }} fill={{ x: 0.82, y: 0.86 }} vignette={0.2} grain={0.07}>
        {/* 纸纤维：极淡的横向纤维条纹，静态 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.35, mixBlendMode: 'multiply',
          background: `repeating-linear-gradient(176deg, ${alpha(L.ink, 0)} 0px, ${alpha(L.ink, 0)} 7px, ${alpha(L.ink, 0.018)} 8px, ${alpha(L.ink, 0)} 10px)`,
        }} />
      </Stage>

      {/* 打样框：裁切线、左右套准标、色标条与编号（纹理级小字，压暗） */}
      <CropMarks p={cropP} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <RegMark x={96} y={540} p={sideReg} color={alpha(L.ink, 0.42)} />
        <RegMark x={1824} y={540} p={sideReg} color={alpha(L.ink, 0.42)} />
      </svg>
      <div style={{ position: 'absolute', left: 140, bottom: 118, display: 'flex', alignItems: 'center', gap: 22, opacity: barP }}>
        <div style={{ display: 'flex' }}>
          {[L.ink, L.accent, L.accent2, L.ink2, L.ink3, L.surface].map((c, k) => (
            <div key={k} style={{
              width: 30, height: 30, background: c, border: `1px solid ${alpha(L.ink, 0.25)}`, marginLeft: k ? -1 : 0,
              transform: `translateY(${(1 - ramp(frame, 6 + k * 1.5, 12, EASE.out)) * 10}px)`,
            }} />
          ))}
        </div>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em', color: alpha(L.ink, 0.5) }}>PROOF 03 · 2 INKS</span>
      </div>
      <div style={{
        position: 'absolute', right: 140, bottom: 122, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em',
        color: alpha(L.ink, 0.5), opacity: barP, fontVariantNumeric: 'tabular-nums',
      }}>
        KESTREL — WORDMARK  v3.2
      </div>

      {/* lockup */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -30,
          opacity: 1 - out,
          transform: `translateY(${-out * 52}px) scale(${push * (1 - out * 0.08)})`,
          filter: out > 0.01 ? `blur(${(out * 7).toFixed(2)}px)` : undefined,
        }}>
          {/* 中心套准标：对位后缩小淡出 */}
          <svg width={360} height={360} viewBox="-180 -180 360 360" style={{
            position: 'absolute', left: '50%', top: SIZE * 0.46, marginLeft: -180, marginTop: -180, overflow: 'visible',
            opacity: 1 - regOut, transform: `scale(${1 - regOut * 0.35})`,
          }}>
            <g stroke={L.accent} fill="none" strokeLinecap="round">
              <circle r={62} strokeWidth={2.5} pathLength={100} strokeDasharray={100} strokeDashoffset={100 * (1 - ringP)} transform="rotate(-90)" />
              <circle r={24} strokeWidth={2} strokeOpacity={0.7} pathLength={100} strokeDasharray={100} strokeDashoffset={100 * (1 - ringP)} transform="rotate(90)" />
              <line x1={0} y1={-150} x2={0} y2={-150 + 300 * vP} strokeWidth={2.5} />
              <line x1={-150} y1={0} x2={-150 + 300 * hP} y2={0} strokeWidth={2.5} />
            </g>
          </svg>

          {/* wordmark：逐字压印 */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', fontFamily: SERIF, fontSize: SIZE, fontWeight: 700,
            lineHeight: 1, letterSpacing: '-0.035em', color: L.ink, whiteSpace: 'pre',
          }}>
            {UNITS.map((ch, i) => {
              const delay = PRESS_START + i * PRESS_GAP;
              const isDot = ch === '.';
              const p = ramp(frame, delay, PRESS_DUR, pressIn); // 0 悬空 → 1 着纸
              const vis = ramp(frame, delay, 4, EASE.out);
              const k = frame - LAND(i); // 落地后帧数
              const depth = isDot ? 0.06 : 0.03;
              const squash = k >= 0 && k < 6 ? 1 - depth * Math.sin((k / 6) * Math.PI) : 1;
              const h = 1 - p; // 离地高度
              const sc = (1 + 0.45 * h) * squash;
              const spread = k >= 0 && k < 9 ? 1 - k / 9 : 0; // 墨晕
              const ruleP = ramp(frame, LAND(i) - 2, 7, EASE.out); // 下方分隔线这一段
              const head = ruleP > 0 && ruleP < 1;
              return (
                <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{
                    display: 'inline-block', opacity: vis, transform: `scale(${sc.toFixed(4)})`, transformOrigin: '50% 82%',
                    color: isDot ? L.accent : L.ink,
                    filter: h > 0.002 ? `blur(${(h * 5.5).toFixed(2)}px)` : undefined,
                    // 离地投影（远而虚 → 贴实）+ 纸面压痕高光 + 墨晕
                    textShadow: [
                      `0 ${(2 + h * 46).toFixed(1)}px ${(2 + h * 70).toFixed(1)}px ${alpha(L.shadow, 0.1 + h * 0.12)}`,
                      `0 2px 0 ${alpha('#fffaf0', 0.55)}`,
                      spread > 0 ? `0 0 ${(3 + 10 * spread).toFixed(1)}px ${alpha(isDot ? L.accent : L.ink, 0.35 * spread)}` : '',
                    ].filter(Boolean).join(', '),
                  }}>
                    {ch}
                  </span>
                  {/* 分隔线段：落地时从左拉开，线头一点亮 */}
                  <span style={{
                    position: 'absolute', left: '-0.02em', right: '-0.02em', bottom: -34, height: 4, background: L.accent,
                    transform: `scaleX(${ruleP})`, transformOrigin: 'left center', opacity: ruleP > 0 ? 1 : 0,
                    boxShadow: head ? `0 0 10px ${alpha(L.accent, 0.6)}` : undefined,
                  }} />
                </span>
              );
            })}
          </div>

          {/* kicker：mono 打字机 + 赤陶块光标；按完整文本宽度居中，打字时不漂 */}
          <div style={{ marginTop: 74, fontFamily: FONT.mono, fontSize: 34, fontWeight: 500, letterSpacing: '0.28em', color: alpha(L.ink, 0.74), position: 'relative', whiteSpace: 'pre' }}>
            <span style={{ visibility: 'hidden' }}>{KICKER}</span>
            <span style={{ position: 'absolute', left: 0, top: 0 }}>
              {KICKER.slice(0, kickChars)}
              <span style={{
                display: 'inline-block', width: 18, height: 34, marginLeft: kickChars ? -4 : 0, verticalAlign: '-6px',
                background: L.accent, opacity: cursorOn ? 0.9 : 0,
              }} />
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
