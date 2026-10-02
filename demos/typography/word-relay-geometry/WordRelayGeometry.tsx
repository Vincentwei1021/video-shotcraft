// word-relay-geometry — 三个利益词接力，每个词各带一套只属于它的几何：
//   Faster   —— 虚线大圆 + 刻度环减速自转，一道彗星弧沿环飞跑（"在转"＝快）
//   Tighter  —— 三实线圆依次 trim 生长（相位差 6f），长满后向中心收拢 40px 互相咬紧（"咬合"＝紧）
//   Stronger —— 无几何；金属 sheen 从左扫到右，一拍后收成纯白 + 泛光（"材质硬"＝强，结论词的升格待遇）
// 旧词缩到 0.86 并退焦淡出，新词从 1.06 去虚推近、描边先到位、填充柔边擦入。
//
// 第二轮重设计（石墨 · 电影字卡）：
// - look = graphite（近单色暗场，白为强调、香槟金只做 sheen 高光一丝暖色）。几何全是白色发丝线 + 柔光，
//   不加色——"一词一世界"靠形状说话，不靠颜色。
// - 版式：词 230px / 800 静态字库（Helvetica Neue，描边不露可变字体内部交叠线），画面正中；
//   几何放大到画幅级（虚线环 r=400、三圆 r=230），字压在几何上；词下一行 40px 副句给出产品证据；
//   左上 mono 计数「01 / 03」、右上镜刻标志 + video-shotcraft 小写字标、底部三段进度条（label 级纹理字，不当内容读）。
// - 节奏：三拍等长推进但每拍内部「快入—稳—决绝出」：入场 14f snappy、出场 10f exit；
//   交接重叠 6f；第三拍收白后 hold 26f，镜头整体 1→1.025 极缓推进（不抖）。
//
// 时间表（30fps，共 180f）：
//   0–2     舞台光 + 虚线环起始态（0.4 倍、半透明）已在画面
//   副句：Faster / Stronger 在词下 210px，Tighter 让出三圆下沿压到 246px
//   0–22    Faster：环 0.4→1 snappy 生长、减速自转；2–16 描边入；12–30 填充擦入；18 起副句
//   52–62   Faster 出（0.86 + 退焦）
//   56–70   Tighter 入；58/64/70 三圆 trim 生长（22f）；66–84 填充；92–106 三圆收拢咬紧（swift）
//   112–122 Tighter 出
//   116–128 Stronger 入（描边）；124–148 金属 sheen 扫过；146–158 收纯白 + 泛光一次
//   158–180 hold 落定（相机极缓推进）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const WORD_RELAY_GEOMETRY_DURATION = 180; // 6000ms @30fps

const L = LOOKS.graphite;
const W = 1920;
const H = 1080;
const CX = W / 2;
const CY = 500; // 视觉中心略高于几何中心，给副句留位
const WORD_SIZE = 230;
const STATIC_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const GEO = 'rgba(236,238,244,0.42)'; // 几何线：比字暗一档，层级在字之下
const GOLD = L.accent2;

type Slot = { word: string; sub: string; in0: number; out0: number | null };
const SLOTS: Slot[] = [
  { word: 'Faster', sub: 'One prompt to a finished promo.', in0: 2, out0: 52 },
  { word: 'Tighter', sub: 'Every cut locked to the beat.', in0: 56, out0: 112 },
  { word: 'Stronger', sub: 'Launch films that feel studio-made.', in0: 116, out0: null },
];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// 一个词的进出场包络：入 14f（snappy，1.06→1 去虚）、出 10f（exit，1→0.86 退焦）
const envelope = (f: number, s: Slot) => {
  const tin = ramp(f, s.in0, 14, EASE.snappy);
  const tout = s.out0 === null ? 0 : ramp(f, s.out0, 10, EASE.exit);
  return { tin, tout, alive: f >= s.in0 - 1 && tout < 1 };
};

// ───────────── Faster：虚线环 + 刻度环 + 彗星弧 ─────────────
const FasterGeo: React.FC<{ f: number; fade: number }> = ({ f, fade }) => {
  const grow = ramp(f, 0, 22, EASE.snappy);
  const s = mix(0.4, 1, grow);
  // 自转：入场时多转 160° 并减速（像飞轮刹住），之后匀速慢转永不停
  const spin = -90 - 160 * (1 - grow) + f * 0.9;
  const spinTicks = 40 * (1 - grow) - f * 0.35; // 刻度环反向慢转，两层相对运动读出"转速"
  const R = 400;
  const RT = 452;
  // 彗星：沿 r=400 飞跑的亮弧（头亮尾淡），角速度比环快得多
  const head = -90 + f * 7.5 - 220 * (1 - grow);
  const comet = Array.from({ length: 16 }, (_, k) => {
    const a0 = ((head - k * 4) * Math.PI) / 180;
    const a1 = ((head - (k + 1) * 4) * Math.PI) / 180;
    return { d: `M ${R * Math.cos(a0)} ${R * Math.sin(a0)} A ${R} ${R} 0 0 0 ${R * Math.cos(a1)} ${R * Math.sin(a1)}`, o: (1 - k / 16) ** 1.6 };
  });
  return (
    <g opacity={fade * mix(0.35, 1, grow)} transform={`translate(${CX} ${CY}) scale(${s})`}>
      <circle r={R} fill="none" stroke={GEO} strokeWidth={2} strokeDasharray="10 16" transform={`rotate(${spin})`} />
      <g transform={`rotate(${spinTicks})`}>
        {Array.from({ length: 120 }, (_, k) => {
          const a = (k / 120) * Math.PI * 2;
          const long = k % 10 === 0;
          const r0 = RT - (long ? 18 : 8);
          return (
            <line key={k} x1={r0 * Math.cos(a)} y1={r0 * Math.sin(a)} x2={RT * Math.cos(a)} y2={RT * Math.sin(a)}
              stroke={long ? 'rgba(236,238,244,0.55)' : 'rgba(236,238,244,0.2)'} strokeWidth={long ? 2 : 1.4} />
          );
        })}
      </g>
      <circle r={R - 58} fill="none" stroke="rgba(236,238,244,0.08)" strokeWidth={1.4} />
      <g opacity={grow} style={{ filter: `drop-shadow(0 0 10px ${alpha('#ffffff', 0.6)})` }}>
        {comet.map((c, k) => (
          <path key={k} d={c.d} fill="none" stroke="#ffffff" strokeOpacity={c.o} strokeWidth={4 - k * 0.15} strokeLinecap="round" />
        ))}
      </g>
    </g>
  );
};

// ───────────── Tighter：三圆 trim 生长 → 收拢咬紧 ─────────────
const TighterGeo: React.FC<{ f: number; fade: number; outF: number | null }> = ({ f, fade, outF }) => {
  const R = 218;
  const tight = ramp(f, 92, 14, EASE.swift); // 长满后向中心收拢
  const gap = mix(340, 300, tight);
  // 收拢落定时圆线一次提亮（咬合的"咔"）
  const click = Math.sin(clamp01((f - 100) / 12) * Math.PI);
  return (
    <g opacity={fade} transform={`translate(${CX} ${CY})`}>
      {[-1, 0, 1].map((k, i) => {
        const grow = ramp(f, 58 + i * 6, 22, EASE.out);
        const back = outF === null ? 0 : ramp(f, outF - 4, 12, EASE.exit);
        const tr = Math.max(0, grow - back);
        const x = k * gap;
        const a = -Math.PI / 2 + tr * Math.PI * 2;
        const tip = tr > 0.001 && grow < 1 ? 1 - clamp01((grow - 0.85) / 0.15) : 0;
        return (
          <g key={k}>
            <circle cx={x} cy={0} r={R} fill="none" stroke={alpha('#ffffff', 0.4 + 0.35 * click)} strokeWidth={2.2}
              pathLength={1} strokeDasharray="1" strokeDashoffset={1 - tr} transform={`rotate(-90 ${x} 0)`} />
            {tip > 0 && (
              <circle cx={x + Math.cos(a) * R} cy={Math.sin(a) * R} r={6} fill="#ffffff" opacity={tip}
                style={{ filter: `drop-shadow(0 0 8px #ffffff) drop-shadow(0 0 22px ${alpha('#ffffff', 0.6)})` }} />
            )}
          </g>
        );
      })}
      {/* 相邻两圆的交点：收拢落定时亮起四枚铆钉光点，证明"咬住了" */}
      {[-1, 1].flatMap((k) => [-1, 1].map((sy) => {
        const h = Math.sqrt(Math.max(0, R * R - (gap / 2) ** 2));
        const on = ramp(f, 100 + (k + 1) * 1.5 + (sy + 1), 10, EASE.overshoot);
        return (
          <g key={`${k}${sy}`} transform={`translate(${(k * gap) / 2} ${sy * h}) rotate(45) scale(${on})`} opacity={clamp01(on)}>
            <rect x={-6} y={-6} width={12} height={12} fill="#ffffff" style={{ filter: `drop-shadow(0 0 10px ${alpha('#ffffff', 0.8)})` }} />
          </g>
        );
      }))}
    </g>
  );
};

// ───────────── 词组（描边 / 填充 / sheen 三层） ─────────────
const Word: React.FC<{ f: number; slot: Slot; idx: number }> = ({ f, slot, idx }) => {
  const { tin, tout } = envelope(f, slot);
  const last = idx === SLOTS.length - 1;
  const scale = mix(1.06, 1, tin) * mix(1, 0.86, tout);
  const defocus = (1 - tin) * 10 + tout * 12;
  const fillStart = slot.in0 + 10;
  const fillp = ramp(f, fillStart, 18, EASE.swift);
  // 柔边擦入：前沿 ±7%
  const FE = 7;
  const edge = fillp * (100 + FE * 2) - FE;
  const mask = `linear-gradient(90deg, #000 ${(edge - FE).toFixed(2)}%, transparent ${(edge + FE).toFixed(2)}%)`;
  // Stronger：sheen 出现 → 扫光 → 收白
  const sh = ramp(f, 120, 10, EASE.out);
  const sweep = ramp(f, 124, 24, EASE.smooth);
  const white = ramp(f, 146, 12, EASE.out);
  const bloom = Math.sin(clamp01((f - 146) / 22) * Math.PI) * 0.9 + white * 0.35;

  const base: React.CSSProperties = {
    fontFamily: STATIC_FONT, fontSize: WORD_SIZE, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, whiteSpace: 'nowrap',
    // 三层共用留白：mask / background-clip 只画在盒内，不留白会把 g 的下伸部和末字右沿裁掉、露出描边层
    padding: '0.08em 0.1em 0.28em',
  };
  return (
    <div style={{
      position: 'absolute', left: CX, top: CY, transform: `translate(-50%, ${-0.6 * WORD_SIZE}px) scale(${scale.toFixed(4)})`, transformOrigin: `50% ${0.6 * WORD_SIZE}px`,
      opacity: clamp01(tin * 1.6) * (1 - tout), filter: defocus > 0.05 ? `blur(${defocus.toFixed(2)}px)` : undefined,
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{ ...base, color: 'transparent', WebkitTextStroke: `2px ${alpha('#e9ebf0', 0.55)}`, opacity: last ? 1 - sh * 0.85 : 1 - fillp * 0.8 }}>
          {slot.word}
        </div>
        {last ? (
          <>
            {/* 金属底：竖向镀铬分层（亮顶—暗腰—亮底），读出"材质硬" */}
            <div style={{
              ...base, position: 'absolute', inset: 0, color: 'transparent',
              backgroundImage: 'linear-gradient(180deg, #f2f3f6 8%, #b9bdc6 40%, #4a4e57 52%, #8b909a 62%, #e1e3e8 88%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', opacity: sh * (1 - white),
            }}>{slot.word}</div>
            {/* 扫光：一道带香槟暖色的窄白带从左扫到右（只给结论词一次，Q4） */}
            <div style={{
              ...base, position: 'absolute', inset: 0, color: 'transparent',
              backgroundImage: `linear-gradient(100deg, transparent 38%, ${alpha(GOLD, 0.7)} 45%, #ffffff 50%, ${alpha(GOLD, 0.7)} 55%, transparent 62%)`,
              backgroundSize: '300% 100%', backgroundPosition: `${mix(100, 0, sweep).toFixed(2)}% 0`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', opacity: sh * (1 - white) * (sweep > 0 && sweep < 1 ? 1 : 0),
            }}>{slot.word}</div>
            <div style={{
              ...base, position: 'absolute', inset: 0, color: L.ink, opacity: white,
              textShadow: `0 0 ${(30 * bloom).toFixed(1)}px ${alpha('#ffffff', 0.35 * bloom)}, 0 0 ${(90 * bloom).toFixed(1)}px ${alpha('#ffffff', 0.22 * bloom)}`,
            }}>{slot.word}</div>
          </>
        ) : (
          fillp > 0 && (
            <div style={{ ...base, position: 'absolute', inset: 0, color: L.ink, WebkitMaskImage: mask, maskImage: mask }}>{slot.word}</div>
          )
        )}
      </div>
    </div>
  );
};

export const WordRelayGeometry: React.FC = () => {
  const f = useCurrentFrame();
  // 相机：全程极缓推进 1→1.025（smooth，起止无速度突变），给 hold 段一点呼吸
  const cam = mix(1, 1.025, ramp(f, 0, 180, EASE.smooth));
  const e = SLOTS.map((s) => envelope(f, s));
  const active = f < 56 ? 0 : f < 116 ? 1 : 2;
  // Stronger 收白时主光一次提亮
  const flare = Math.sin(clamp01((f - 146) / 26) * Math.PI);

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.34 }} fill={{ x: 0.5, y: 1.05 }} intensity={0.62 + flare * 0.3} breathe={0.4}>
        <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.35} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: `${CX}px ${CY}px` }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {e[0].alive && <FasterGeo f={f} fade={1 - e[0].tout} />}
          {e[1].alive && (
            <g transform={`translate(${CX} ${CY}) scale(${mix(1.04, 1, e[1].tin) * mix(1, 0.9, e[1].tout)}) translate(${-CX} ${-CY})`}>
              <TighterGeo f={f} fade={clamp01(e[1].tin * 2) * (1 - e[1].tout)} outF={SLOTS[1].out0} />
            </g>
          )}
        </svg>

        {/* Stronger 落定的地平线光带：结论词脚下一道横向冷白光，只出现一次 */}
        <div style={{
          position: 'absolute', left: CX - 700, width: 1400, top: CY + 158, height: 2,
          background: `linear-gradient(90deg, transparent, ${alpha('#ffffff', 0.7)} 50%, transparent)`,
          opacity: ramp(f, 148, 14, EASE.out) * 0.8, transform: `scaleX(${mix(0.2, 1, ramp(f, 146, 22, EASE.snappy))})`,
          boxShadow: `0 0 24px ${alpha('#ffffff', 0.4)}`,
        }} />

        {SLOTS.map((s, i) => (e[i].alive ? <Word key={s.word} f={f} slot={s} idx={i} /> : null))}

        {/* 副句：40px，词落定后从线下升起，随词一起退场 */}
        {SLOTS.map((s, i) =>
          e[i].alive ? (
            <div key={`sub${i}`} style={{
              position: 'absolute', left: 0, right: 0, top: CY + (i === 1 ? 246 : 210), textAlign: 'center',
              ...type(40, 450), color: L.ink2, opacity: 1 - e[i].tout,
              filter: e[i].tout > 0.02 ? `blur(${(e[i].tout * 6).toFixed(2)}px)` : undefined,
            }}>
              <TextReveal text={s.sub} by="word" variant="rise" start={s.in0 + (i === 2 ? 34 : 16)} each={16} gap={2.2} />
            </div>
          ) : null,
        )}
      </AbsoluteFill>

      {/* 画框装饰（不随相机）：左上计数、底部三段进度——label 级纹理字 */}
      <div style={{ position: 'absolute', left: 120, top: 96, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em', color: L.ink3, opacity: ramp(f, 0, 14, EASE.out) }}>
        <span style={{ color: L.ink }}>{`0${active + 1}`}</span> / 03
      </div>
      {/* 右上品牌签：镜刻标志 + 小写字标（label 级，不抢词） */}
      <div style={{ position: 'absolute', right: 120, top: 90, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.1em', color: L.ink3, opacity: ramp(f, 4, 14, EASE.out) }}>
        <ShotcraftMark size={34} tone="dark" />
        {BRAND.name}
      </div>
      <div style={{ position: 'absolute', left: 120, right: 120, bottom: 96, display: 'flex', gap: 24 }}>
        {SLOTS.map((s, i) => {
          const start = s.in0;
          const end = s.out0 ?? 158;
          const p = ramp(f, start, end - start, EASE.linear);
          const on = i === active;
          return (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ height: 2, background: alpha('#ffffff', 0.1), position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: on ? L.ink : alpha('#ffffff', 0.45), transform: `scaleX(${p})`, transformOrigin: 'left' }} />
              </div>
              <div style={{ marginTop: 16, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase', color: on ? L.ink : L.ink3, transition: 'none' }}>
                {`0${i + 1}  ${s.word}`}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
