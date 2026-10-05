// multiplane parallax（第二轮重设计）——真实页面拆 3 层深度横移：同一条 drive 位移乘各层系数
// （远 0.35x / 中 0.7x / 近 1.4x），速度梯度把一次横移变成"在空间里滑过"。
//
// 设计决定
// - look：sand（米色 + 赤陶，温暖、纸感）。真实 projects 页本身是暖白纸色，和 sand 天然一体——
//   这一镜像一组产品静物在暖光桌面上被滑轨相机掠过，而不是网页平移。
// - 三层各给齐深度锚：
//   远景：整页截图缩小一档、退焦 5px、降饱和、上浓下淡的暖色空气薄雾（退成环境）；
//   中景：10 张真实项目卡（440px，主阅读层，绝对清晰，两层暖色软影落在"桌面"上）；
//   近景：5 枚放大的赤陶 / 墨色标签胶囊（取自卡上的真实标签）掠过镜头，景深虚化 + 按速度横向拖影。
// - 固定在画框上的字（0x 层）：左上眉题（video-shotcraft 标志 + 名字）+ 120px 标题「Your page, in depth.」+ 副句，是全片的静止参照——
//   字不动、世界在动，视差反而更好读。
// - 滑轨有终点：drive 落定时 card4 恰好停在画面中央，随后浮起（elevation 6→26、1.035x）+ 赤陶描边 +
//   「In focus」角标，尾帧是一张完整海报。
//
// 时间表（30fps，165f）
//   0–6     起手：三层已在画面、标题开始逐词升起（第 1 帧不是空画面）
//   6–136   滑轨 130f：不对称 in-out（起步柔、中段匀、落位很软），中景总位移 1020px
//   4–40    标题：眉题字距收拢（4）→ 标题逐词升起（8）→ 副句（26）
//   122–144 主角浮起：card4 抬升 + 描边 + 角标（out 曲线，晚于位置收敛 ~8f）
//   144–164 hold 20f：远景极缓漂移 4px，画面活着
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, SpeedBlur, bezier, mix, ramp, softShadow, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const MULTIPLANE_DUR = 165;

const L = LOOKS.sand;
const CARDS = layout.projects.cards;
const DRIVE_EASE = bezier(0.45, 0, 0.18, 1);
const HERO = 3; // card4
const MID_W = 440;
const GAP = 500; // 中景卡步距
const ROW_X = 260; // 第 0 张卡左缘（中景层坐标）
const ROW_Y = 410;
// drive 总量：中景（0.7x）落定时 card4 中心恰在屏心
const MID_END = 960 - (ROW_X + HERO * GAP + MID_W / 2);
const DRIVE = -MID_END / 0.7;
const driveAt = (f: number) => DRIVE * ramp(f, 6, 130, DRIVE_EASE) + 4 * ramp(f, 136, 29, EASE.smooth);

// 近景胶囊：标签取自卡片上的真实 tag；x 为近景层坐标，y 为屏幕坐标。
// 落定时（近景位移 −2040）只剩 EdgeAI / ASR 两枚压在画框下沿做前景框边，其余已滑出画外
const PILLS = [
  { t: 'Calibration', x: 1200, y: 880, tone: 'accent' },
  { t: 'Routing', x: 1640, y: 296, tone: 'ink' },
  { t: 'EdgeAI', x: 2600, y: 905, tone: 'paper' },
  { t: 'Benchmark', x: 4300, y: 300, tone: 'ink' },
  { t: 'ASR', x: 3720, y: 860, tone: 'accent' },
] as const;

export const MultiplaneReal: React.FC = () => {
  const frame = useCurrentFrame();
  const drive = driveAt(frame);
  const vFg = -1.4 * velocity(driveAt, frame); // 近景屏幕速度（px/帧）
  const lift = ramp(frame, 122, 22, EASE.out);
  const ring = ramp(frame, 128, 16, EASE.snappy);
  const kick = ramp(frame, 4, 20, EASE.snappy);
  const sub = ramp(frame, 26, 18, EASE.out);

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.0 }} fill={{ x: 0.85, y: 1 }} grain={0.06}>
        {/* 远景 0.35x：整页缩小一档、退焦、降饱和（页面空白与底色同色，横移不露边） */}
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${(-drive * 0.35).toFixed(2)}px)`, filter: 'blur(5px) saturate(0.7)', opacity: 0.75 }}>
          <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', left: -40, top: -170, width: 2100 }} />
        </div>
        {/* 空气透视：远景之上一层暖色薄雾，上部更浓 */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha(L.bg[0], 0.82)} 0%, ${alpha(L.bg[1], 0.62)} 50%, ${alpha(L.bg[2], 0.55)} 100%)` }} />
        {/* 桌面：中景卡落影的承托面，一条极淡的地平线光 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: ROW_Y + 330, height: 340, background: `linear-gradient(180deg, ${alpha(L.shadow, 0)}, ${alpha(L.shadow, 0.06)} 40%, ${alpha(L.shadow, 0.02)})` }} />
      </Stage>

      {/* 中景 0.7x：真实卡组横排（主阅读层，无 blur） */}
      <div style={{ position: 'absolute', left: 0, top: ROW_Y, transform: `translateX(${(-drive * 0.7).toFixed(2)}px)` }}>
        {CARDS.map((c, k) => {
          const hero = k === HERO;
          const h = (MID_W * c.h) / c.w;
          const e = hero ? mix(6, 26, lift) : 6;
          return (
            <div key={c.file} style={{
              position: 'absolute', left: ROW_X + k * GAP, top: (312 - c.h) * (MID_W / c.w) * 0.5, width: MID_W, height: h, borderRadius: 12, overflow: 'hidden',
              transform: hero ? `translateY(${(-14 * lift).toFixed(2)}px) scale(${(1 + 0.035 * lift).toFixed(4)})` : undefined,
              boxShadow: `0 0 0 ${hero ? (2.5 * ring).toFixed(2) : 0}px ${alpha(L.accent, 0.9)}, ${softShadow(e, { color: L.shadow, strength: 1.2 })}`,
            }}>
              <Img src={staticFile(`textures/live/${hero ? 'card4-hires.png' : c.file}`)} style={{ width: '100%', height: '100%' }} />
            </div>
          );
        })}
        {/* 主角角标：浮起后从卡上沿落下 */}
        <div style={{
          position: 'absolute', left: ROW_X + HERO * GAP + 2, top: -64, height: 44, padding: '0 18px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 10,
          background: L.accent, color: L.onAccent, ...type(22, 700, { caps: true }), letterSpacing: '0.14em', whiteSpace: 'nowrap',
          opacity: ring, transform: `translateY(${((1 - ring) * 14 - 14 * lift).toFixed(2)}px)`,
          boxShadow: softShadow(8, { color: L.shadow }),
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: L.onAccent }} />
          In focus
        </div>
      </div>

      {/* 近景 1.4x：放大的标签胶囊掠过镜头（景深虚化、落影更深更远），只在快段带横向拖影 */}
      <SpeedBlur vx={vFg} amount={0.2} max={10}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(-drive * 1.4).toFixed(2)}px)` }}>
          {PILLS.map((p) => {
            const bg = p.tone === 'accent' ? L.accent : p.tone === 'ink' ? L.ink : L.surface;
            const fg = p.tone === 'paper' ? L.ink : L.onAccent;
            return (
              <div key={p.t} style={{
                position: 'absolute', left: p.x, top: p.y, height: 128, padding: '0 56px', borderRadius: 64, display: 'flex', alignItems: 'center',
                background: bg, color: fg, ...type(60, 650), filter: 'blur(7px)', opacity: 0.92,
                boxShadow: `0 40px 70px -10px ${alpha(L.shadow, 0.35)}`,
              }}>{p.t}</div>
            );
          })}
        </div>
      </SpeedBlur>

      {/* 0x 层：固定在画框上的标题 */}
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...type(22, 700, { caps: true }), letterSpacing: `${mix(0.5, 0.18, kick).toFixed(3)}em`, color: L.accent, opacity: kick }}>
          <ShotcraftMark size={34} tone="light" />
          <span style={{ textTransform: 'none', fontFamily: BRAND.font, fontSize: 26, fontWeight: 700, letterSpacing: '0.03em', color: L.ink }}>{BRAND.name}</span>
          <span style={{ width: 28, height: 2, background: L.accent }} />
          2.5D camera moves
        </div>
        <div style={{ marginTop: 18, ...type(120, 760), color: L.ink }}>
          <TextReveal text="Your page, in depth." by="word" variant="rise" start={8} each={20} gap={4} />
        </div>
      </div>
      <div style={{ position: 'absolute', right: 120, top: 196, width: 520, textAlign: 'right', ...type(34, 450), lineHeight: 1.35, color: L.ink2, opacity: sub, transform: `translateY(${((1 - sub) * 14).toFixed(1)}px)` }}>
        Screenshots, split into layers and flown in 2.5D.
      </div>
    </AbsoluteFill>
  );
};
