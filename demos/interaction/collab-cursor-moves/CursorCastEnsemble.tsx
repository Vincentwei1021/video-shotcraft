// cursor-cast-ensemble —— figma 0:05 (cursor-badge-cast) + miro 全片 cursor-ensemble-ambience
// 五枚具名彩色光标错峰飞入一块白板画布，落位后持续漂移当"团队在场"的氛围层；其中一枚（Rita）
// 停在中央简报卡上打字补完标题（cameo），最后全员聚拢到卡片四周围观。
//
// 第二轮重设计（瓷白 · 无限画布的"开工会"）：
// - look = porcelain（冷白 + 钴蓝）。画面是 video-shotcraft 的一块分镜白板：左上标志 + 板名、右上在线头像组、
//   底部浮动工具条，点阵画布上 6 张便签（34px 正文，读得清）+ 中央一张大简报卡。不再是灰阶道具。
// - 身份编码贯穿全画面：五人五色（Ines 钴蓝 / Kofi 翠绿 / Mei 橘 / Tomás 紫 / Rita 洋红），
//   便签底色是作者色的淡彩、角落有作者色圆点；右上头像组随每个人入场同帧弹出——"人到了"三处同时成立。
// - Rita 的光标挂在打字光标上（行内锚点）：标题 "Ship a launch film by Friday." 88px 逐字出现，
//   她的箭头始终跟着插入点走、换行也跟着换；打完后卡片状态 Draft → Ready。
// - 空间：画布 / 便签 / 简报卡 / 光标四层，全程极缓推镜（1 → 1.045，焦点在卡片），远层便签视差更小、
//   轻微虚化降对比，近层清晰；光标投影 + 名牌带色辉光。
//
// 时间表（30fps，共 156f）：
//   0–4      画布、便签、空简报卡已在（开场即有画面），推镜开始
//   2–30     四枚光标从四边错峰 spring 飞入（stagger 先密后疏），名牌晚 10f 随减速淡入上浮；头像组同帧弹出
//   20–46    Rita 从顶部飞入，落到标题起点
//   48–104   打字：28 字 + 人手节奏抖动（1.6–2.4f/字），Rita 手稳（不漂移），箭头跟插入点
//   104–112  卡片状态 Draft → Ready（绿点）
//   98–126   其余四人 smooth 聚拢到卡片四周（漂移保留 25%，不归零），不压标题
//   126–156  hold：漂移继续、推镜继续（画面活着，但不抢）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, ramp, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type, TYPE } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const CURSOR_CAST_ENSEMBLE_DURATION = 156;

const L = LOOKS.porcelain;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Actor = {
  name: string; initial: string; color: string; tint: string;
  from: [number, number]; home: [number, number]; gather: [number, number];
  delay: number; phase: number;
};

// 名牌颜色 = 身份编码：五人五色，便签 / 头像 / 光标三处一致
const ACTORS: Actor[] = [
  { name: 'Ines', initial: 'I', color: '#2f5bff', tint: '#e3eaff', from: [-160, 260], home: [330, 470], gather: [318, 372], delay: 2, phase: 0.0 },
  { name: 'Kofi', initial: 'K', color: '#0e9f6e', tint: '#dcf4e8', from: [2080, 220], home: [1600, 470], gather: [1512, 330], delay: 7, phase: 1.7 },
  { name: 'Mei', initial: 'M', color: '#f26a1b', tint: '#ffe9d8', from: [-160, 980], home: [380, 860], gather: [900, 784], delay: 11, phase: 3.1 },
  { name: 'Tomás', initial: 'T', color: '#7b4dff', tint: '#ece4ff', from: [2080, 1000], home: [1540, 880], gather: [1470, 800], delay: 16, phase: 4.4 },
  { name: 'Rita', initial: 'R', color: '#ec2f7c', tint: '#ffe2ee', from: [980, -200], home: [0, 0], gather: [0, 0], delay: 22, phase: 5.6 },
];
const RITA = 4;

// 简报卡（画布坐标）
const CARD = { x: 432, y: 318, w: 1056, h: 432, pad: 56 };
const TITLE = 'Ship a launch film by Friday.'; // 与原句同为 29 字 / 5 个空格：打字节奏与收尾帧不变
const TITLE_FS = 88;
const TITLE_TOP = CARD.y + CARD.pad + 66; // 眉题行之下
const TYPE0 = 48;
const READY = 106;

// 人手打字节奏：每字 1.6–2.4f（确定性抖动），空格后略停
const TYPE_AT: number[] = (() => {
  const r = mulberry32(41);
  const at: number[] = [];
  let f = TYPE0;
  for (let i = 0; i < TITLE.length; i++) {
    at.push(f);
    f += 1.6 + r() * 0.8 + (TITLE[i] === ' ' ? 0.9 : 0);
  }
  return at;
})();
const TYPE_END = TYPE_AT[TYPE_AT.length - 1];

// 便签：作者 = ACTORS 下标；depth 0 近 / 1 远（远层小一点、虚一点、视差小）
const NOTES = [
  // 便签 = 这支片子的分镜与制作待办（video-shotcraft 的世界）
  { x: 96, y: 156, rot: -3.2, owner: 0, depth: 1, title: 'Open on a crash zoom', meta: '4 votes' },
  { x: 1540, y: 150, rot: 2.6, owner: 1, depth: 1, title: 'Logo sting outro', meta: 'In review' },
  { x: 60, y: 560, rot: 2.2, owner: 2, depth: 0, title: 'Beat map at 120 BPM', meta: '2 comments' },
  { x: 1580, y: 560, rot: -2.4, owner: 3, depth: 0, title: 'Real page captures', meta: 'Due Wed' },
  { x: 560, y: 812, rot: -1.6, owner: 4, depth: 1, title: 'Renders: 214', meta: 'Live count' },
  { x: 1090, y: 820, rot: 1.8, owner: 0, depth: 1, title: 'SFX pass', meta: 'Needs mix' },
];

const ARROW = 'M0.5 0.5 L0.5 17.2 L4.7 13.4 L7.3 19.5 L10 18.3 L7.4 12.3 L13 12.3 Z';
const CK = 4.2; // 光标每单位像素（≈84px 高）

const Cursor: React.FC<{ a: Actor; badge: number; style?: React.CSSProperties }> = ({ a, badge, style }) => (
  <div style={{ position: 'absolute', ...style }}>
    <svg width={14 * CK} height={21 * CK} viewBox="0 0 14 21" style={{ display: 'block', overflow: 'visible', filter: `drop-shadow(0 3px 4px ${alpha(L.shadow, 0.28)})` }}>
      <path d={ARROW} fill={a.color} stroke="#ffffff" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
    <div style={{
      position: 'absolute', left: 9.4 * CK, top: 17.6 * CK, whiteSpace: 'nowrap',
      background: `linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 50%), ${a.color}`,
      color: '#fff', borderRadius: '6px 18px 18px 18px', padding: '7px 16px 8px',
      ...type(26, 680), letterSpacing: '-0.005em',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px ${alpha(L.shadow, 0.14)}, 0 8px 22px -6px ${alpha(a.color, 0.55)}`,
      opacity: badge, transform: `translateY(${(1 - badge) * 12}px)`,
    }}>
      {a.name}
    </div>
  </div>
);

export const CursorCastEnsemble: React.FC = () => {
  const f = useCurrentFrame();

  // 推镜：全程极缓，焦点在卡片中心偏上
  const cam = mix(1, 1.045, ramp(f, 0, 156, EASE.swift));
  const camFar = mix(1, 1.02, ramp(f, 0, 156, EASE.swift));

  const gatherT = ramp(f, 98, 28, EASE.smooth);
  const typed = TYPE_AT.filter((t) => f >= t).length;
  const ready = ramp(f, READY, 8, EASE.out);
  const typingHold = clamp01((f - 40) / 8); // Rita 手稳

  // 光标位置（画布坐标）
  const posOf = (i: number): [number, number] => {
    const a = ACTORS[i];
    const s = springAt(f, a.delay, { damping: 15, stiffness: 80, mass: 0.9 });
    let x = mix(a.from[0], a.home[0], s);
    let y = mix(a.from[1], a.home[1], s);
    const settled = clamp01((f - a.delay - 20) / 12);
    const dX = Math.sin(f * 0.055 + a.phase) * 40 + Math.sin(f * 0.021 + a.phase * 2) * 26;
    const dY = Math.cos(f * 0.047 + a.phase * 1.3) * 32 + Math.cos(f * 0.017 + a.phase) * 20;
    x += dX * settled * (1 - gatherT);
    y += dY * settled * (1 - gatherT);
    x = mix(x, a.gather[0] + dX * 0.25, gatherT);
    y = mix(y, a.gather[1] + dY * 0.25, gatherT);
    return [x, y];
  };

  // Rita：飞入段的偏移（相对插入点锚点），落定后锚在插入点
  const rita = ACTORS[RITA];
  const rs = springAt(f, rita.delay, { damping: 16, stiffness: 70, mass: 1 });
  const anchor0: [number, number] = [CARD.x + CARD.pad, TITLE_TOP];
  const rDrift = 1 - typingHold * (f < TYPE_END + 6 ? 1 : 1 - clamp01((f - TYPE_END - 6) / 14) * 0.75);
  const ritaOff: [number, number] = [
    // 落定偏移 (12, -8)：箭头尖停在插入点右上，身体和名牌落在"还没打出来"的空位里，不压已打的字
    (rita.from[0] - anchor0[0]) * (1 - rs) + 12 + Math.sin(f * 0.06 + 1) * 18 * rDrift,
    (rita.from[1] - anchor0[1]) * (1 - rs) - 8 + Math.cos(f * 0.05) * 14 * rDrift,
  ];
  const caretOn = typed < TITLE.length || Math.floor(f / 9) % 2 === 0;

  const avatarPop = (i: number) => springAt(f, ACTORS[i].delay + 8, { damping: 15, stiffness: 190 });

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.36 }} fill={{ x: 0.9, y: 0.95 }} vignette={0.2}>
        {/* 点阵画布（远层，视差最小） */}
        <div style={{
          position: 'absolute', inset: -60, transform: `scale(${camFar})`, transformOrigin: '50% 50%',
          backgroundImage: `radial-gradient(${alpha(L.ink, 0.13)} 1.6px, transparent 1.9px)`, backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, #000 45%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, #000 45%, transparent 100%)',
        }} />
      </Stage>

      {/* 画布层（便签 + 简报卡 + 光标）随推镜缩放 */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: '50% 48%' }}>
        {NOTES.map((n, i) => {
          const o = ACTORS[n.owner];
          const far = n.depth === 1;
          return (
            <div key={i} style={{
              position: 'absolute', left: n.x, top: n.y, width: 288, height: 232, borderRadius: 10,
              background: `linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 30%), ${o.tint}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px ${alpha(L.shadow, 0.08)}, 0 18px 34px -16px ${alpha(L.shadow, 0.3)}`,
              transform: `rotate(${n.rot}deg) scale(${far ? 0.94 : 1})`,
              filter: far ? 'blur(1.4px) saturate(0.85)' : undefined, opacity: far ? 0.78 : 1,
              padding: '26px 26px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ ...type(36, 700), color: alpha(L.ink, 0.86), lineHeight: 1.12 }}>{n.title}</div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 14, height: 14, borderRadius: 7, background: o.color }} />
                <span style={{ ...type(24, 560), color: alpha(L.ink, 0.5) }}>{o.name} · {n.meta}</span>
              </div>
            </div>
          );
        })}

        {/* 中央简报卡：Rita 打字的舞台 */}
        <div style={{
          position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 28,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)', border: `1px solid ${L.line}`,
          boxShadow: `inset 0 1px 0 #fff, 0 2px 4px ${alpha(L.shadow, 0.06)}, 0 40px 80px -30px ${alpha(L.shadow, 0.35)}`,
          padding: CARD.pad, boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 40 }}>
            <span style={{ ...type(TYPE.label + 2, 700, { caps: true }), letterSpacing: '0.16em', color: L.ink3 }}>Project brief</span>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: L.ink3 }} />
            <span style={{ ...type(28, 520), color: L.ink2 }}>Due Thu, Oct 16</span>
            {/* 状态：Draft → Ready */}
            <span style={{
              marginLeft: 'auto', position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, height: 44, padding: '0 18px',
              borderRadius: 22, background: ready > 0.5 ? alpha('#0e9f6e', 0.1) : L.surface2,
              border: `1px solid ${ready > 0.5 ? alpha('#0e9f6e', 0.3) : L.line}`,
              transform: `scale(${1 + 0.06 * Math.sin(Math.PI * ready)})`,
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: ready > 0.5 ? '#0e9f6e' : L.ink3 }} />
              <span style={{ ...type(26, 650), color: ready > 0.5 ? '#0b7a55' : L.ink2 }}>{ready > 0.5 ? 'Ready' : 'Draft'}</span>
            </span>
          </div>
          {/* 标题：逐字 + Rita 的插入点（行内锚点，箭头挂在上面） */}
          <div style={{ marginTop: 26, ...type(TITLE_FS, 760), color: L.ink, lineHeight: 1.04, minHeight: TITLE_FS * 2.1 }}>
            {TITLE.slice(0, typed)}
            <span style={{ position: 'relative', display: 'inline-block', width: 0, height: TITLE_FS * 0.8, verticalAlign: '-0.06em' }}>
              <span style={{
                position: 'absolute', left: 3, top: -4, width: 6, height: TITLE_FS * 0.92, borderRadius: 3, background: rita.color,
                opacity: f >= TYPE0 - 6 && caretOn ? 1 : 0,
              }} />
              <Cursor a={rita} badge={ramp(f, rita.delay + 12, 12, EASE.out)} style={{ left: ritaOff[0], top: ritaOff[1], zIndex: 5 }} />
            </span>
          </div>
          {/* 卡片底部：负责人 + 进度（辅助信息，32px 档） */}
          <div style={{ position: 'absolute', left: CARD.pad, right: CARD.pad, bottom: CARD.pad - 6, display: 'flex', alignItems: 'center', gap: 28 }}>
            <span style={{ display: 'flex' }}>
              {[4, 0, 1].map((k, j) => (
                <span key={k} style={{
                  width: 44, height: 44, borderRadius: 22, background: ACTORS[k].color, marginLeft: j ? -12 : 0, border: '3px solid #fff',
                  display: 'grid', placeItems: 'center', color: '#fff', ...type(20, 760),
                }}>{ACTORS[k].initial}</span>
              ))}
            </span>
            <span style={{ ...type(30, 540), color: L.ink2 }}>3 owners · 12 shots</span>
            <span style={{ marginLeft: 'auto', width: 260, height: 10, borderRadius: 5, background: L.surface2, overflow: 'hidden', border: `1px solid ${L.line}` }}>
              <span style={{ display: 'block', height: '100%', width: `${mix(38, 72, ready)}%`, borderRadius: 5, background: L.accent }} />
            </span>
            <span style={{ ...type(30, 650), color: L.ink, width: 70, textAlign: 'right' }}>{Math.round(mix(38, 72, ready))}%</span>
          </div>
        </div>

        {/* 其余四枚光标 */}
        {ACTORS.slice(0, 4).map((a, i) => {
          const [x, y] = posOf(i);
          return <Cursor key={a.name} a={a} badge={ramp(f, a.delay + 10, 12, EASE.out)} style={{ left: x, top: y, zIndex: 10 }} />;
        })}
      </div>

      {/* 界面 chrome（不随推镜）：左上板名、右上在线头像组、底部工具条 */}
      <div style={{ position: 'absolute', left: 64, top: 48, display: 'flex', alignItems: 'center', gap: 18 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: L.ink, display: 'grid', placeItems: 'center' }}>
          <ShotcraftMark size={34} tone="dark" />
        </span>
        <span style={{ ...type(32, 700), color: L.ink }}>Launch Film Kickoff</span>
        <span style={{ ...type(26, 500), color: L.ink3 }}>{BRAND.name}</span>
      </div>
      <div style={{ position: 'absolute', right: 64, top: 46, display: 'flex', alignItems: 'center', gap: 18 }}>
        <span style={{ display: 'flex' }}>
          {ACTORS.map((a, i) => {
            const p = avatarPop(i);
            return (
              // 槽宽随弹出长出来：头像组从右往左"挤进"新来的人，不留空位
              <span key={a.name} style={{ position: 'relative', width: (i ? 42 : 56) * clamp01(p), height: 56 }}>
                <span style={{
                  position: 'absolute', right: 0, top: 0, width: 56, height: 56, borderRadius: 28, background: a.color, border: '3px solid #fff',
                  boxSizing: 'border-box', display: 'grid', placeItems: 'center', color: '#fff', ...type(24, 760),
                  transform: `scale(${p})`, opacity: clamp01(p * 3), boxShadow: `0 4px 12px -4px ${alpha(a.color, 0.6)}`,
                }}>{a.initial}</span>
              </span>
            );
          })}
        </span>
        <span style={{
          height: 52, padding: '0 22px', borderRadius: 26, background: L.accent, color: '#fff', display: 'grid', placeItems: 'center', ...type(26, 680),
          boxShadow: `0 8px 20px -8px ${alpha(L.accent, 0.7)}`,
        }}>Share</span>
      </div>
      <div style={{
        position: 'absolute', left: '50%', bottom: 40, transform: 'translateX(-50%)', height: 72, padding: '0 14px', borderRadius: 22,
        background: alpha('#ffffff', 0.92), border: `1px solid ${L.line}`, display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: `inset 0 1px 0 #fff, 0 16px 36px -14px ${alpha(L.shadow, 0.3)}`,
      }}>
        {['select', 'hand', 'note', 'text', 'shape', 'pen'].map((k, i) => (
          <span key={k} style={{
            width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center',
            background: i === 2 ? alpha(L.accent, 0.1) : 'transparent',
          }}>
            <svg width={26} height={26} viewBox="0 0 26 26" fill="none" stroke={i === 2 ? L.accent : L.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {k === 'select' && <path d="M7 5v15l4-4 3 6 3-1.4-3-5.8h6z" />}
              {k === 'hand' && <path d="M9 13V7.5a1.5 1.5 0 0 1 3 0V12M12 11V6a1.5 1.5 0 0 1 3 0v5M15 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 6.5-6 6.5S7 18 6 15l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L9 13" />}
              {k === 'note' && <path d="M6 5h14v10l-5 5H6zM15 20v-5h5" />}
              {k === 'text' && <path d="M6 7V5h14v2M13 5v16M10 21h6" />}
              {k === 'shape' && <><rect x={5} y={5} width={9} height={9} rx={2} /><circle cx={17} cy={17} r={4.5} /></>}
              {k === 'pen' && <path d="M5 21l1.2-4.6L17 5.6a2 2 0 0 1 2.8 2.8L9 19.2zM15 7.6l3.4 3.4" />}
            </svg>
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
