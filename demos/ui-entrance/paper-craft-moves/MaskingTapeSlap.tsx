// masking-tape-slap —— 纸胶带拍定
// 一张印刷卡轻飘落到软木板前、悬着微晃（未固定的纸），两条撕边和纸胶带"啪、啪"先后拍在对角：
// 第一条把左上角钉死（卡片改绕钉点摆、晃幅减半），第二条拍下同帧卡片停晃、投影收紧、整卡贴板——
// "按死"的定妆一瞬是主角。
//
// 第二轮重设计（深色情绪板 · 聚光灯下的一张印刷品）：
// - look = graphite（近单色暗场）微调成暖炭灰毛毡板；左上一盏暖色聚光只打在卡片区域，
//   板上远景钉着几张失焦的旧印刷品（前/中/后景分层），强调色只给胶带（香槟金 accent2）。
// - 主角是一张 1040×640 的编辑感"发布印刷卡"：左侧产品棚拍（金色球体静物 + 地面反光），
//   右侧 132px 衬线大标题「Quiet / launch.」+ 34px 正文，读得清（Q11）。
// - 物理：卡片从画外上方像纸一样滑翔落下（rotateX 仰角收回 + 倾角跟随 + 弹簧落位）；悬浮时
//   离板 30px（略大 1.2%、投影远而虚）；胶带是"从镜头方向拍下来"——scale 1.7→1 的 ease-in 加速
//   砸向板面，落帧压扁一帧再回弹；第一条落下后卡片的钉点被锁在胶带下（改绕钉点摆），
//   第二条落下 2f 内晃动归零、离板高度 30→2、投影由远虚收成贴板实影。
//
// 时间表（30fps，共 120f）：
//   0–2     板面、聚光、远景印刷品已在（首帧不空）
//   2–28    卡片滑翔落入（26f，弹簧 damping 15，落位一次轻回弹）
//   28–50   悬浮微晃（幅度包络升起；±1.3° + 6px 浮 + 3D 微倾）——"还没钉住"的预备
//   50–55   胶带①从镜头方向加速扑下（5f ease-in）→ 55 拍定左上角
//   55–74   半死：晃幅衰到 0.4，绕钉点摆
//   69–74   胶带②扑下 → 74 拍定右下角，同帧按死（2f 晃动归零 + 贴板 + 投影收紧）
//   74–92   余波：胶带回弹、压痕暗影散开、聚光轻微收拢到卡上
//   92–120  hold：极缓推近 1→1.025，干净海报
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const MASKING_TAPE_SLAP_DURATION = 120;

// graphite 微调：毛毡板偏暖炭灰，主光换成暖白聚光
const L = { ...LOOKS.graphite, bg: ['#211f1c', '#171614', '#0e0d0c'] as [string, string, string], light: '#ffe2b8' };
const GOLD = L.accent2; // 胶带：香槟金

const W = 1920;
const H = 1080;
const CARD_W = 1040;
const CARD_H = 640;
const CX = W / 2; // 卡片静止中心
const CY = H / 2 + 6;

const DROP = 2; // 卡片起落
const HOVER = 28; // 悬浮开始
const SLAP1 = 55; // 胶带①拍定
const SLAP2 = 74; // 胶带②拍定 = 按死
const APPROACH = 5; // 胶带扑下帧数
const FREEZE = 2; // 按死帧数

// 胶带落点（卡片局部坐标，相对卡片中心）与角度：落点故意歪 2–3°（手工感）
const PIN1 = { x: -CARD_W / 2 + 40, y: -CARD_H / 2 + 30, rot: -38.5 };
const PIN2 = { x: CARD_W / 2 - 44, y: CARD_H / 2 - 28, rot: -41.5 };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ───────────── 悬浮晃动 ─────────────
// 幅度包络：悬浮段升起 → 胶带①后衰到 0.4 → 胶带②后 2f 归零
const envelope = (f: number) => {
  const rise = ramp(f, HOVER - 4, 12, EASE.out);
  const half = mix(1, 0.4, ramp(f, SLAP1, 4, EASE.out));
  const dead = 1 - ramp(f, SLAP2, FREEZE, EASE.linear);
  return rise * half * dead;
};
const wobRot = (f: number) => envelope(f) * 1.3 * Math.sin((f - HOVER) * 0.17);
const wobBob = (f: number) => envelope(f) * 6 * Math.sin((f - HOVER) * 0.12 + 0.6);
const wobTiltX = (f: number) => envelope(f) * 2.2 * Math.sin((f - HOVER) * 0.13 + 1.4);
const wobTiltY = (f: number) => envelope(f) * 1.8 * Math.sin((f - HOVER) * 0.15 + 2.2);

// 离板高度（px）：落入时从高处滑下 → 悬浮 30 → 半死 16 → 贴板 2
const elevationAt = (f: number, dropP: number) => {
  const hover = 30 + 90 * (1 - dropP) - wobBob(f) * 0.8;
  const afterSlap1 = mix(hover, 16, ramp(f, SLAP1, 3, EASE.snappy));
  return mix(afterSlap1, 2, ramp(f, SLAP2, FREEZE, EASE.linear));
};

// ───────────── 撕边纸胶带 ─────────────
const tornClip = (seed: number) => {
  const pts: string[] = [];
  const n = 9;
  // 左端锯齿（上→下），右端锯齿（下→上），上下边直
  for (let i = 0; i <= n; i++) pts.push(`${(rand(seed + i) * 3.2).toFixed(2)}% ${((i / n) * 100).toFixed(2)}%`);
  for (let i = n; i >= 0; i--) pts.push(`${(100 - rand(seed + 40 + i) * 3.2).toFixed(2)}% ${((i / n) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(', ')})`;
};
const TORN1 = tornClip(11);
const TORN2 = tornClip(57);
const TAPE_W = 380;
const TAPE_H = 92;

const Tape: React.FC<{ frame: number; land: number; x: number; y: number; rot: number; clip: string; from: { x: number; y: number } }> = ({
  frame, land, x, y, rot, clip, from,
}) => {
  if (frame < land - APPROACH) return null;
  // 扑下：ease-in 加速砸向板面（拍击，不是落座），落帧压扁一帧、2–4f 回弹
  const a = clamp01((frame - (land - APPROACH)) / APPROACH);
  const k = a * a * (0.4 + 0.6 * a);
  const air = 1 - k; // 离板高度 0–1
  const scale = 1 + air * 0.7;
  const after = frame - land;
  const squash = after === 0 ? 0.84 : after === 1 ? 0.96 : after === 2 ? 1.015 : 1;
  const spread = after === 0 ? 1.04 : after === 1 ? 1.01 : 1;
  const r = rot + (air * -14) + (after >= 0 && after < 4 ? Math.sin((after / 4) * Math.PI) * 1.6 : 0);
  // 扑下时按缩放速度给一点失焦（离镜头近而快）
  const blur = frame < land ? Math.min(6, air * 7) : 0;
  const op = clamp01(a * 3);
  // 贴板投影：空中远而虚，落下后一条薄实影
  const shOff = 2 + air * 26;
  const shBlur = 2 + air * 22;
  return (
    <div style={{
      position: 'absolute', left: x - TAPE_W / 2, top: y - TAPE_H / 2, width: TAPE_W, height: TAPE_H,
      transform: `translate(${(from.x * air).toFixed(2)}px, ${(from.y * air).toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${(scale * spread).toFixed(4)}, ${(scale * squash).toFixed(4)})`,
      opacity: op,
      filter: `drop-shadow(${(shOff * 0.5).toFixed(1)}px ${shOff.toFixed(1)}px ${shBlur.toFixed(1)}px rgba(0,0,0,${(0.42 - air * 0.2).toFixed(3)}))${blur > 0.3 ? ` blur(${blur.toFixed(2)}px)` : ''}`,
    }}>
      <div style={{
        position: 'absolute', inset: 0, clipPath: clip,
        background: [
          // 上下缘透光（纸胶带两侧最薄）
          'linear-gradient(180deg, rgba(255,248,230,0.42) 0%, rgba(255,248,230,0) 16%, rgba(255,248,230,0) 84%, rgba(255,248,230,0.34) 100%)',
          // 一道静态斜向反光（胶面反光，不扫）
          'linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.18) 44%, rgba(255,255,255,0) 58%)',
          // 纵向纤维纹
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(110,80,30,0.05) 2px, rgba(255,255,255,0) 4px)',
          // 和纸底色：香槟金半透明，略不均
          `linear-gradient(90deg, ${alpha(GOLD, 0.8)} 0%, ${alpha('#efd6a6', 0.74)} 40%, ${alpha(GOLD, 0.82)} 75%, ${alpha('#ead0a0', 0.76)} 100%)`,
        ].join(', '),
      }} />
    </div>
  );
};

// ───────────── 印刷卡 ─────────────
const PrintCard: React.FC<{ light: number }> = ({ light }) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden',
    background: 'linear-gradient(170deg, #f7f3ea 0%, #efe9dc 100%)',
  }}>
    {/* 纸纤维 */}
    <Grain opacity={0.12} freq={1.3} blend="multiply" step={1000} />
    {/* 左：棚拍静物（金色球体 + 无缝背景纸 + 地面反光） */}
    <div style={{
      position: 'absolute', left: 44, top: 44, width: 432, height: CARD_H - 88, borderRadius: 3, overflow: 'hidden',
      background: 'radial-gradient(120% 80% at 40% 26%, #2c3a3c 0%, #172124 55%, #0c1214 100%)',
    }}>
      {/* 地平线：背景纸转折 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '68%', bottom: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.25))' }} />
      {/* 地面接触影 + 反光 */}
      <div style={{ position: 'absolute', left: 96, width: 240, top: 392, height: 40, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.7), rgba(0,0,0,0))' }} />
      <div style={{
        position: 'absolute', left: 116, top: 400, width: 200, height: 70, borderRadius: '50%', opacity: 0.35,
        background: 'radial-gradient(closest-side, rgba(228,197,138,0.55), rgba(228,197,138,0))', filter: 'blur(6px)',
      }} />
      {/* 球体：金属金 + 主光高光 + 轮廓背光 */}
      <div style={{
        position: 'absolute', left: 96, top: 158, width: 240, height: 240, borderRadius: '50%',
        background:
          'radial-gradient(circle at 36% 30%, #fff6dc 0%, #f1d39a 12%, #c99a55 34%, #7a5528 62%, #2e1f0e 88%)',
        boxShadow: 'inset -14px -18px 40px rgba(0,0,0,0.45), inset 6px 4px 12px rgba(255,240,210,0.25), 0 0 60px rgba(228,197,138,0.12)',
      }} />
      <div style={{
        position: 'absolute', left: 96, top: 158, width: 240, height: 240, borderRadius: '50%',
        // 轮廓背光：右下一道冷色细边（环境反射），不是色块
        boxShadow: 'inset -5px -6px 6px -3px rgba(170,225,235,0.32)',
      }} />
      {/* 片名角标 */}
      <div style={{ position: 'absolute', left: 26, bottom: 22, fontFamily: FONT.mono, fontSize: 20, letterSpacing: '0.16em', color: 'rgba(240,230,210,0.55)' }}>
        STILL 04 / 12
      </div>
    </div>
    {/* 右：编辑排版 */}
    <div style={{ position: 'absolute', left: 528, top: 60, right: 52, bottom: 52, display: 'flex', flexDirection: 'column', color: L.shadow }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid rgba(23,19,15,0.85)', paddingBottom: 14 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em', color: '#17130f' }}>FIELD NOTES</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.1em', color: '#6b6258' }}>Nº 04</span>
      </div>
      <div style={{ ...type(132, 400, { serif: true }), color: '#17130f', marginTop: 46, lineHeight: 0.92, letterSpacing: '-0.035em' }}>
        Quiet<br />
        <span style={{ fontStyle: 'italic' }}>launch.</span>
      </div>
      <div style={{ ...type(34, 450), color: '#544b41', marginTop: 34, lineHeight: 1.3, letterSpacing: '-0.012em' }}>
        Kite 2.0 — everything we cut,<br />and why it ships faster.
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#17130f' }} />
        <span style={{ ...type(28, 600), color: '#17130f', letterSpacing: '0.02em' }}>Oct 14, 2026</span>
      </div>
    </div>
    {/* 聚光在卡面上的明暗：左上亮、右下略暗（随按死后聚光收拢轻增） */}
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(ellipse 90% 90% at 22% 8%, rgba(255,246,228,${(0.16 + 0.08 * light).toFixed(3)}) 0%, rgba(255,246,228,0) 60%), linear-gradient(160deg, rgba(0,0,0,0) 55%, rgba(40,26,10,0.12) 100%)`,
    }} />
  </div>
);

// 远景：板上钉着的旧印刷品（失焦、降对比、静止）——一张米白排版稿、一张暖金照片、一张深青照片、一张色票条
const BackPrints: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, filter: 'blur(6px) brightness(0.8)', opacity: 0.45 }}>
    {/* 米白排版稿（左上） */}
    <div style={{ position: 'absolute', left: -50, top: 60, width: 420, height: 300, transform: 'rotate(-6deg)', background: '#cfc7b8', borderRadius: 3, boxShadow: '10px 18px 30px rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', left: 60, top: 50, width: 230, height: 46, background: '#3a332b', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: 60, top: 116, width: 300, height: 12, background: '#7d7466', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: 60, top: 140, width: 260, height: 12, background: '#7d7466', borderRadius: 2 }} />
    </div>
    {/* 暖金照片（右上，竖幅） */}
    <div style={{ position: 'absolute', left: 1610, top: 30, width: 380, height: 520, transform: 'rotate(4deg)', borderRadius: 3, boxShadow: '10px 18px 30px rgba(0,0,0,0.5)',
      background: 'radial-gradient(70% 50% at 45% 40%, #b98c4e 0%, #6a4a24 50%, #2a1d10 100%)' }} />
    {/* 深青照片（右下） */}
    <div style={{ position: 'absolute', left: 1500, top: 770, width: 460, height: 330, transform: 'rotate(-3deg)', borderRadius: 3, boxShadow: '10px 18px 30px rgba(0,0,0,0.5)',
      background: 'linear-gradient(180deg, #2c4146 0%, #16252a 62%, #0d1517 100%)' }}>
      <div style={{ position: 'absolute', left: 150, top: 90, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #d9e6e0, #6f8a86 60%, #22343a)' }} />
    </div>
    {/* 色票条（左下） */}
    <div style={{ position: 'absolute', left: 70, top: 770, width: 280, height: 360, transform: 'rotate(5deg)', background: '#d9d2c4', borderRadius: 3, boxShadow: '10px 18px 30px rgba(0,0,0,0.5)', padding: 26, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {['#c99a55', '#8a6a3c', '#3a4a4c', '#1c2224'].map((c) => <div key={c} style={{ height: 56, background: c, borderRadius: 2 }} />)}
    </div>
    {/* 旧胶带（压在远景纸上） */}
    {[{ x: 140, y: 40, r: -10 }, { x: 1720, y: 14, r: 6 }, { x: 160, y: 752, r: 2 }].map((t, i) => (
      <div key={i} style={{ position: 'absolute', left: t.x, top: t.y, width: 150, height: 40, background: alpha(GOLD, 0.45), transform: `rotate(${t.r}deg)` }} />
    ))}
  </div>
);

export const MaskingTapeSlap: React.FC = () => {
  const frame = useCurrentFrame();

  // 卡片滑翔落入：位置弹簧（一次轻回弹），倾角与仰角晚 2–3f 收敛（跟随）
  const dropP = springAt(frame, DROP, { damping: 15, stiffness: 120 });
  const dropLag = springAt(frame, DROP + 3, { damping: 18, stiffness: 110 });
  const dropY = -980 * (1 - dropP);
  const dropX = 140 * (1 - dropP);
  const dropRot = -9 * (1 - dropLag);
  const dropTiltX = 34 * (1 - dropLag); // 纸片滑翔时的仰角（远边先到）

  const theta = wobRot(frame) + dropRot; // deg
  const elev = elevationAt(frame, dropP);
  const lift = 1 + elev * 0.0004; // 离板越高越近镜头 → 略大

  // 自由态平移
  const bFree = { x: dropX, y: dropY + wobBob(frame) };
  // 钉住态：PIN1 的世界位置锁在静止位置 → 平移由旋转反推（卡片绕钉点摆）
  const th = (theta * Math.PI) / 180;
  const rx = PIN1.x * Math.cos(th) - PIN1.y * Math.sin(th);
  const ry = PIN1.x * Math.sin(th) + PIN1.y * Math.cos(th);
  const bPin = { x: PIN1.x - rx, y: PIN1.y - ry };
  const lock = ramp(frame, SLAP1, 3, EASE.snappy);
  const bx = mix(bFree.x, bPin.x, lock);
  const by = mix(bFree.y, bPin.y, lock);
  const sink = ramp(frame, SLAP2, FREEZE, EASE.linear) * 2; // 按死整卡下沉 2px

  // 投影：光在左上 → 影子往右下；高度越高越远越虚越淡
  const shX = elev * 0.75;
  const shY = elev * 1.25;
  const shBlur = 4 + elev * 1.7;
  const shA = 0.72 - Math.min(0.25, elev * 0.004);

  // 压痕：胶带落点一圈暗影（8f 消散）
  const dent = (land: number) => (frame < land ? 0 : Math.max(0, 1 - (frame - land) / 9)) * (frame >= land ? 1 : 0);
  // 按死后聚光轻收到卡上；hold 段极缓推近
  const lit = ramp(frame, SLAP2, 18, EASE.out);
  const push = 1 + 0.025 * ramp(frame, 60, 60, EASE.swift);

  const cardLeft = CX - CARD_W / 2;
  const cardTop = CY - CARD_H / 2;

  return (
    <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: L.bg[2] }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 52%' }}>
        <Stage look={L} keyLight={{ x: 0.42, y: 0.22 }} fill={{ x: 0.9, y: 0.95 }} intensity={0.9 + 0.12 * lit} grain={0.1} vignette={0.7}>
          {/* 毛毡板纤维：低频粗颗粒 */}
          <Grain opacity={0.16} freq={0.42} scale={2.2} blend="soft-light" step={1000} />
          <BackPrints />
          {/* 聚光锥：卡片区域额外一层暖光 */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 44% 52% at 48% 48%, ${alpha('#ffdcae', 0.24 + 0.06 * lit)} 0%, ${alpha('#ffdcae', 0.1)} 45%, rgba(255,220,174,0) 75%)`,
          }} />
        </Stage>

        {/* 卡片（3D：悬浮时有微倾 + 落入仰角） */}
        <div style={{ position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '50% 40%' }}>
          <div style={{
            position: 'absolute', left: cardLeft, top: cardTop, width: CARD_W, height: CARD_H,
            transform:
              `translate(${bx.toFixed(3)}px, ${(by + sink).toFixed(3)}px) rotate(${theta.toFixed(4)}deg) ` +
              `rotateX(${(dropTiltX + wobTiltX(frame)).toFixed(3)}deg) rotateY(${wobTiltY(frame).toFixed(3)}deg) scale(${lift.toFixed(5)})`,
            transformOrigin: '50% 50%',
            borderRadius: 6,
            boxShadow:
              `0 1px 0 rgba(255,255,255,0.35) inset, ` +
              `${(shX * 0.3).toFixed(1)}px ${(shY * 0.3 + 1).toFixed(1)}px ${(2 + elev * 0.3).toFixed(1)}px rgba(0,0,0,${(0.5 / (1 + elev / 14)).toFixed(3)}), ` +
              `${shX.toFixed(1)}px ${shY.toFixed(1)}px ${shBlur.toFixed(1)}px rgba(0,0,0,${shA.toFixed(3)})`,
          }}>
            <PrintCard light={lit} />
            {/* 压痕暗影：裁进卡片圆角 */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden', pointerEvents: 'none' }}>
              {[{ land: SLAP1, p: PIN1 }, { land: SLAP2, p: PIN2 }].map(({ land, p }) => {
                const d = dent(land);
                return d > 0 ? (
                  <div key={land} style={{
                    position: 'absolute', left: CARD_W / 2 + p.x - 230, top: CARD_H / 2 + p.y - 120, width: 460, height: 240,
                    background: 'radial-gradient(closest-side, rgba(40,26,10,0.16), rgba(40,26,10,0))', opacity: d,
                  }} />
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* 两条胶带：世界坐标落在卡片静止位的两个角上（胶带①落下后卡片钉点被锁在它下面） */}
        <Tape frame={frame} land={SLAP1} x={CX + PIN1.x} y={CY + PIN1.y} rot={PIN1.rot} clip={TORN1} from={{ x: -90, y: -70 }} />
        <Tape frame={frame} land={SLAP2} x={CX + PIN2.x} y={CY + PIN2.y + 2} rot={PIN2.rot} clip={TORN2} from={{ x: 90, y: 60 }} />
      </div>
      {/* 画面颗粒（放在推镜之外，不被放大） */}
      <Grain opacity={0.05} blend="overlay" />
    </div>
  );
};

