// avatar-bracket-carousel — "Your ___ teammates." 填空排版：四角对焦框钉在句中不动，头像队列在框内
// 垂直 spring 轮换三次；入框放大清晰、出框按距离缩小淡化模糊，角色标签同步滚动换字，切换瞬间对焦框呼吸 7%。
//
// 第二轮重设计（暖纸 · 瑞士海报）：
// - look = paper（暖白纸 + 墨黑 + 朱红）。句子做成 150px / 800 的粗黑体海报字，对焦框是朱红四角（全片唯一强调色），
//   槽位 260px——和字一样是画面主角，不再是 92px 的小方块。
// - 头像：为镜头画的插画人像（色块底 + 肩 + 头 + 发型，四人四种发型 / 眼镜），底色是低饱和的纸系土色，
//   不抢朱红；队列步距 236px，邻位露出半张（缩到 0.6、模糊、淡化）暗示"后面还有人"。
// - 角色标签：槽下 52px 角色名 + 22px mono 编号，在裁切窗里随 pos 同向滚动；衰减斜率比头像陡得多，永不两词同屏。
// - 版式装饰：12 栏发丝网格（纹理）、左上 mono 眉题、底部一句 32px 说明——瑞士海报的骨架，不当内容读。
//
// 时间表（30fps，共 156f）：
//   0–3     纸面 + 网格已在；对焦框四角在外侧 70px 处（起始态）
//   2–20    "Your" / "teammates." 逐词从基线下升起（rise），对焦框四角 overshoot 收拢锁定（6–24）
//   8–30    头像队列按 4f 错峰从下方浮入
//   40 / 74 / 108  三次切换（间隔 34f）：物理弹簧（damping 15，一次可见过冲），每次 ~22f 落定；
//                  切换同拍对焦框外扩 7% 再咬回（sin 包络 14f），标签滚动换字
//   130–156 落定 hold（26f），相机全程 1→1.03 极缓推进
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const AVATAR_BRACKET_CAROUSEL_DURATION = 156; // 5200ms @30fps

const L = LOOKS.paper;
const W = 1920;
const LINE_Y = 470; // 句子行中心
const SLOT = 260; // 对焦框边长
const AV_SIZE = 212; // 头像直径
const STEP = 236; // 队列步距（> 头像直径，邻位不咬边）
const SWITCHES = [40, 74, 108];

type Person = {
  name: string; role: string; bg: string; skin: string; hair: string; shirt: string;
  style: 'bob' | 'crop' | 'bun' | 'curly'; glasses?: boolean;
};
const TEAM: Person[] = [
  { name: 'Maya', role: 'Designer', bg: '#e8cdb8', skin: '#c58b68', hair: '#2a1c15', shirt: '#33414f', style: 'bob' },
  { name: 'Theo', role: 'Support', bg: '#c8d5cc', skin: '#e3b791', hair: '#5b3b22', shirt: '#5e6e62', style: 'crop' },
  { name: 'Priya', role: 'Analyst', bg: '#d9d1e0', skin: '#a26c4b', hair: '#17110e', shirt: '#2e3138', style: 'bun', glasses: true },
  { name: 'Jonas', role: 'Writer', bg: '#e7daa9', skin: '#efc8a6', hair: '#8b5b36', shirt: '#4d5a49', style: 'curly' },
];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// 位置量：三段弹簧累加（连续量，任意时刻都能算每张头像离槽位多远）
const posAt = (f: number) => SWITCHES.reduce((p, s) => p + (f < s ? 0 : springAt(f, s, { damping: 15, stiffness: 150 })), 0);

// ───────────── 插画头像（200 视框） ─────────────
const Portrait: React.FC<{ p: Person; id: string }> = ({ p, id }) => {
  const hair = (() => {
    switch (p.style) {
      case 'bob':
        return <path d="M58 98 C54 52 78 34 100 34 C124 34 148 50 143 100 L146 128 C132 132 128 120 130 96 C124 74 104 66 82 72 C74 92 72 112 70 130 C58 130 54 120 58 98 Z" fill={p.hair} />;
      case 'crop':
        return <path d="M62 92 C58 54 80 36 104 36 C130 36 144 56 138 92 C134 80 128 70 116 64 C104 74 84 76 70 70 C66 76 63 84 62 92 Z" fill={p.hair} />;
      case 'bun':
        return (
          <>
            <circle cx={100} cy={30} r={17} fill={p.hair} />
            <path d="M63 90 C60 54 80 42 100 42 C122 42 141 56 137 90 C132 70 116 62 100 62 C84 62 68 70 63 90 Z" fill={p.hair} />
          </>
        );
      case 'curly':
      default:
        return (
          <g fill={p.hair}>
            {[[70, 66, 16], [86, 50, 18], [106, 46, 18], [124, 56, 17], [136, 74, 14], [64, 84, 12], [96, 58, 16]].map(([x, y, r], k) => (
              <circle key={k} cx={x} cy={y} r={r} />
            ))}
          </g>
        );
    }
  })();
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ display: 'block' }}>
      <defs>
        <clipPath id={`c${id}`}><circle cx={100} cy={100} r={100} /></clipPath>
        <radialGradient id={`g${id}`} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width={200} height={200} fill={p.bg} />
        {/* 肩 + 领口 */}
        <path d="M22 210 C24 160 60 142 100 142 C140 142 176 160 178 210 Z" fill={p.shirt} />
        <path d="M86 138 L114 138 L112 158 C106 164 94 164 88 158 Z" fill={p.skin} />
        <path d="M84 146 C92 158 108 158 116 146 L112 162 C104 168 96 168 88 162 Z" fill="rgba(0,0,0,0.12)" />
        {/* 头 + 耳 */}
        <circle cx={63} cy={100} r={8} fill={p.skin} />
        <circle cx={137} cy={100} r={8} fill={p.skin} />
        <ellipse cx={100} cy={96} rx={37} ry={44} fill={p.skin} />
        {/* 脸部阴影（受光在左上） */}
        <path d="M118 62 C140 76 142 118 120 136 C132 112 132 84 118 62 Z" fill="rgba(0,0,0,0.08)" />
        {hair}
        {/* 五官：极简两点 + 一笔 */}
        <circle cx={86} cy={100} r={3.4} fill="#1d1612" />
        <circle cx={114} cy={100} r={3.4} fill="#1d1612" />
        <path d="M92 120 C97 124 103 124 108 120" stroke="#1d1612" strokeWidth={2.6} fill="none" strokeLinecap="round" />
        {p.glasses && (
          <g stroke="#1d1612" strokeWidth={2.6} fill="none">
            <circle cx={86} cy={100} r={11} />
            <circle cx={114} cy={100} r={11} />
            <path d="M97 100 L103 100" />
          </g>
        )}
        <rect width={200} height={200} fill={`url(#g${id})`} />
      </g>
    </svg>
  );
};

// 四角对焦框（260 视框）：角长 58，线宽 7，圆角端点
const CORNERS = ['M4 62 L4 4 L62 4', 'M198 4 L256 4 L256 62', 'M256 198 L256 256 L198 256', 'M62 256 L4 256 L4 198'];
const CORNER_DIR = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

export const AvatarBracketCarousel: React.FC = () => {
  const f = useCurrentFrame();
  const pos = posAt(f);
  const vel = posAt(f + 0.5) - posAt(f - 0.5); // 格/帧

  // 对焦框：开场从外侧 70px overshoot 收拢锁定；切换同拍外扩 7% 再咬回
  const lock = ramp(f, 6, 18, EASE.overshoot);
  const lockOp = ramp(f, 4, 8, EASE.out);
  const breath = Math.min(1, SWITCHES.reduce((b, s) => b + Math.sin(clamp01((f - s) / 14) * Math.PI), 0));
  const bracketOut = (1 - lock) * 70 + breath * SLOT * 0.035;

  const cam = mix(1, 1.03, ramp(f, 0, 156, EASE.smooth));
  const word: React.CSSProperties = { ...type(150, 800), letterSpacing: '-0.05em', color: L.ink, lineHeight: 1 };
  const active = Math.min(3, Math.round(pos));

  return (
    <AbsoluteFill style={{ background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.3 }} fill={{ x: 0.9, y: 0.95 }}>
        {/* 12 栏发丝网格：瑞士海报骨架（纹理级，不抢主体） */}
        <svg width={W} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 13 }, (_, k) => {
            const x = 96 + (k * (W - 192)) / 12;
            return <line key={k} x1={x} x2={x} y1={0} y2={1080} stroke={alpha(L.ink, 0.045)} strokeWidth={1} />;
          })}
          <line x1={96} x2={W - 96} y1={LINE_Y + 75} y2={LINE_Y + 75} stroke={alpha(L.ink, 0.07)} strokeWidth={1} />
        </svg>
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: `${W / 2}px ${LINE_Y}px` }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: LINE_Y - 90, height: 180,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 44,
        }}>
          <div style={word}><TextReveal text="Your" by="word" variant="rise" start={2} each={18} /></div>

          {/* 槽位：头像队列 + 对焦框 + 标签 */}
          <div style={{ position: 'relative', width: SLOT, height: SLOT, flex: 'none', marginTop: 4 }}>
            {/* 槽位下一圈极淡朱红地光：焦点的空间感 */}
            <div style={{
              position: 'absolute', inset: -80, borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(L.accent, 0.08)} 0%, ${alpha(L.accent, 0)} 62%)`, opacity: lockOp,
            }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
              {TEAM.map((p, k) => {
                const dk = k - pos;
                const d = Math.abs(dk);
                const sc = Math.max(0.5, 1 - d * 0.4);
                const op = Math.max(0, 1 - d * 0.62);
                const enter = ramp(f, 8 + k * 4, 18, EASE.out);
                const blur = Math.min(8, d * 6) + Math.abs(vel) * 10;
                const smear = Math.min(0.08, Math.abs(vel) * 0.3);
                return (
                  <div key={k} style={{
                    position: 'absolute', left: -AV_SIZE / 2, top: -AV_SIZE / 2, width: AV_SIZE, height: AV_SIZE, borderRadius: '50%',
                    transform: `translateY(${(dk * STEP + (1 - enter) * 60).toFixed(2)}px) scale(${(sc * (1 - smear * 0.5)).toFixed(4)}, ${(sc * (1 + smear)).toFixed(4)})`,
                    opacity: op * enter,
                    filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
                    boxShadow: `0 ${(2 + 22 * (1 - d)).toFixed(1)}px ${(6 + 40 * (1 - Math.min(1, d))).toFixed(1)}px ${alpha(L.shadow, 0.16 * Math.max(0, 1 - d))}, inset 0 0 0 1px ${alpha(L.ink, 0.06)}`,
                    zIndex: 10 - Math.round(d * 2),
                  }}>
                    <Portrait p={p} id={`av${k}`} />
                  </div>
                );
              })}
            </div>

            <svg width={SLOT} height={SLOT} viewBox={`0 0 ${SLOT} ${SLOT}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', zIndex: 20, opacity: lockOp }}>
              {CORNERS.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={L.accent} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"
                  transform={`translate(${(CORNER_DIR[i][0] * bracketOut).toFixed(2)} ${(CORNER_DIR[i][1] * bracketOut).toFixed(2)})`} />
              ))}
            </svg>

            {/* 角色标签：槽下裁切窗里随 pos 同向滚动 */}
            <SlotLabel f={f} pos={pos} />
          </div>

          <div style={word}><TextReveal text="teammates." by="word" variant="rise" start={7} each={18} /></div>
        </div>

      </AbsoluteFill>

      {/* 画框装饰（不随相机）：眉题 + 底部说明 + 计数 */}
      <div style={{ position: 'absolute', left: 96, top: 92, display: 'flex', alignItems: 'center', gap: 14, opacity: ramp(f, 0, 12, EASE.out) }}>
        <div style={{ width: 12, height: 12, background: L.accent, borderRadius: 2 }} />
        <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.16em', color: L.ink }}>HALCYON AGENTS</div>
      </div>
      <div style={{ position: 'absolute', right: 96, top: 92, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.16em', color: L.ink3, opacity: ramp(f, 2, 12, EASE.out) }}>
        <span style={{ color: L.ink }}>{`0${active + 1}`}</span> / 04
      </div>
      <div style={{
        position: 'absolute', left: 96, bottom: 92, ...type(32, 500), color: L.ink2,
        opacity: ramp(f, 16, 14, EASE.out), transform: `translateY(${(1 - ramp(f, 16, 18, EASE.snappy)) * 16}px)`,
      }}>
        Four specialists. One shared workspace.
      </div>
      <div style={{ position: 'absolute', right: 96, bottom: 96, display: 'flex', gap: 10, opacity: ramp(f, 18, 12, EASE.out) }}>
        {TEAM.map((_, k) => {
          const on = Math.max(0, 1 - Math.abs(k - pos) * 1.5);
          return <div key={k} style={{ width: mix(12, 44, on), height: 12, borderRadius: 6, background: on > 0.02 ? alpha(L.accent, 0.35 + 0.65 * on) : alpha(L.ink, 0.16) }} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

// 槽下角色标签：52px 角色名 + mono 编号；衰减斜率 2.4（0.42 格外完全消失）
const SlotLabel: React.FC<{ f: number; pos: number }> = ({ f, pos }) => {
  const appear = ramp(f, 14, 16, EASE.snappy);
  return (
    <div style={{
      position: 'absolute', left: SLOT / 2 - 230, width: 460, top: SLOT + 30, height: 88, overflow: 'hidden', zIndex: 30,
      opacity: appear, transform: `translateY(${(1 - appear) * 14}px)`,
      // 名牌 chip：纸面实底压住下方队列的虚影，发丝边 + 顶部内高光 + 两层软阴影
      borderRadius: 44, background: L.surface, border: `1px solid ${L.line}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px ${alpha(L.shadow, 0.08)}, 0 14px 30px -10px ${alpha(L.shadow, 0.22)}`,
    }}>
      {TEAM.map((p, k) => {
        const dk = k - pos;
        return (
          <div key={k} style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            transform: `translateY(${(dk * 70).toFixed(2)}px)`, opacity: Math.max(0, 1 - Math.abs(dk) * 2.4),
          }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.12em', color: L.accent, paddingTop: 6 }}>{`0${k + 1}`}</span>
            <span style={{ ...type(52, 650), color: L.ink }}>{p.role}</span>
            <span style={{ ...type(32, 450), color: L.ink3, paddingTop: 8 }}>{p.name}</span>
          </div>
        );
      })}
    </div>
  );
};
