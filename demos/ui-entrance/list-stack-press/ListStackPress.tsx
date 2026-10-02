// list-stack-press —— 列表卡从底部逐张飞上摞起，每张落地压弹整摞、计数器同步跳一格
//
// 第二轮重设计（余烬暗场 · 纸卡雷达）：
// - look = ember（暖黑 + 橙）。五张卡仍是产品既有页面的真实截图纹理（paper1–5，Q1 不动），
//   但舞台从"整页截图上相机巡游"换成暖黑暗场：暖白纸卡在暗场里自带亮度，截图里原有的赤褐色
//   项目名正好与 ember 强调色同色系。左侧是为镜头设计的计数排版：PAPER RADAR 眉题、
//   300px 机械滚轮数字「5」+「/ 31」、40px 说明句；右侧是正在长高的纸卡列。
// - 手法本身（保留并加重）：
//   ① 预备拍：计数器先于首卡 8f 亮起（幽灵 0，scale 0.96→1），视线先落到计数区。
//   ② 逐张升入：从下方 700px 升起，交替 ±2.5° 倾斜收平 + scale 1.04→1，按速度纵向拖影；
//      起飞间隔 14→12→10→9f 越来越密（"越攒越快"）。曲线末端保留余速 → 真的"撞"上整摞。
//   ③ 压弹：撞击那一帧，新卡被弹回 8px，已落定的整摞被顶起 14px——冲击沿整摞向上传导，
//      每远一张晚 1.5f、幅度 ×0.7，阻尼振荡一次可见回弹（不是同帧整体平移）。
//   ④ 跟随层级：卡体先停 → 整摞回弹 → 项目名荧光笔滞后 3f 长出 → 计数器滚一格（8f）。
// - 相机：一条连续曲线从首卡近景（1.0×，标题可读）拉远到整摞全景（0.74×），跟随堆叠向下，90f 后静止。
// - 收尾：末格滚定那一下数字泛一次橙光；一道 glaze 扫光掠过整摞（Q4，全镜头一次，裁进每张卡）。
//
// 时间表（30fps，共 120f）：
//   0–8     预备：舞台、眉题、幽灵 0 亮起微缩回位
//   8–73    五张卡升入（起飞 8/22/34/44/53，飞 20f，落地 28/42/54/64/73）；每次落地整摞压弹
//   28–81   计数 0→5，每格 8f 滚定（末格 81f）
//   0–90    相机连续拉远
//   81–104  余波：数字泛光、说明句逐词升起；78–96 glaze 扫过整摞
//   104–120 hold：干净海报
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, SpeedBlur, bezier, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import layout from '../../_textures/live-layout.json';

export const LIST_STACK_PRESS_DURATION = 120;

const L = LOOKS.ember;
const FILES = ['paper1.png', 'paper2.png', 'paper3.png', 'paper4.png', 'paper5.png'];
const CARD_W = layout.papers.cards[0].w; // 1104（截图原生尺寸，纹理 2×）
const CARD_H = layout.papers.cards[0].h; // 224.5
const GAP = 16;
const slotY = (i: number) => i * (CARD_H + GAP);
const STACK_H = slotY(4) + CARD_H;
// 截图实测：每张卡里"与项目相关"项目名那一行（卡内坐标）——荧光笔只盖这一行
const HL_TOP = 156, HL_H = 20, HL_LEFT = 16;
const HL_W = [187, 244, 247, 240, 191];

// ───────────── 节拍 ─────────────
const CUES = [8, 22, 34, 44, 53]; // 间隔 14→12→10→9f，越来越密
const FLY = 20;
const RISE = 700;
const TILTS = [2.5, -2.5, 2.5, -2.5, 2.5];
const FLY_EASE = bezier(0.25, 0.55, 0.6, 0.92); // 末端斜率 0.2 → 撞上时仍有 ~7px/f
const landAt = (i: number) => CUES[i] + FLY;

// 撞击脉冲：t=0 起，~2.5f 到峰，7f 过零后一次轻微反向，指数衰减（一次可见回弹）
const pulse = (t: number) => (t <= 0 ? 0 : Math.exp(-t / 5.5) * Math.sin((t * Math.PI) / 7));

const flyT = (i: number, f: number) => FLY_EASE((f - CUES[i]) / FLY);
// 卡 i 相对自身槽位的纵向偏移（native px）：飞行段 + 落地回弹 + 被后来者顶起的传导波
const offsetY = (i: number, f: number) => {
  let y = f < landAt(i) ? RISE * (1 - flyT(i, f)) : 8 * pulse(f - landAt(i));
  for (let j = i + 1; j < CUES.length; j++) {
    const d = j - i;
    y -= 14 * Math.pow(0.7, d - 1) * pulse(f - landAt(j) - 1.5 * (d - 1));
  }
  return y;
};

// ───────────── 相机 ─────────────
const CAM_END = 90;
const CAM_EASE = bezier(0.4, 0, 0.2, 1);
const camAt = (f: number) => {
  const u = CAM_EASE(f / CAM_END);
  const s = 1.0 + (0.74 - 1.0) * u; // 首卡近景 → 整摞全景
  const fy = CARD_H / 2 + (STACK_H / 2 - CARD_H / 2) * u; // 对准的堆叠内纵坐标
  const sy = 450 + (540 - 450) * u; // 对准点在屏幕上的高度
  return { s, x: 1372 - s * (CARD_W / 2), y: sy - s * fy };
};

// ───────────── 计数器（连续里程计，不重挂） ─────────────
const ROLL = 8; // 单格 8f，短于最小落卡间距 9f，末格 81f 滚定
const rollAt = (f: number) => CUES.reduce((acc, _, i) => acc + ramp(f, landAt(i), ROLL, bezier(0.25, 0.8, 0.25, 1)), 0);
const DIGIT = 300;
const LINE_H = DIGIT * 1.05;

const DigitRoll: React.FC<{ pos: number; blur: number; lit: number }> = ({ pos, blur, lit }) => (
  <div style={{
    height: LINE_H, overflow: 'hidden', display: 'inline-block',
    // 滚轮窗口上下渐隐：滚动中的上下两格读作圆柱，而不是被一刀切开
    WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 9%, #000 94%, transparent 100%)',
  }}>
    <div style={{ transform: `translateY(${(-pos * LINE_H).toFixed(2)}px)`, filter: blur > 0.6 ? `blur(${(blur * 0.35).toFixed(2)}px)` : undefined }}>
      {'0123456789'.split('').map((d, j) => (
        <div key={j} style={{
          ...type(DIGIT, 800), lineHeight: `${LINE_H}px`, height: LINE_H, letterSpacing: '-0.05em',
          color: j === 0 && pos < 0.5 ? alpha(L.ink3, 0.6) : L.accent,
        }}>{d}</div>
      ))}
    </div>
  </div>
);

export const ListStackPress: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const rollPos = rollAt(frame);
  const rollV = Math.abs(velocity(rollAt, frame));
  const ant = ramp(frame, 0, 8, EASE.out);
  const lit = ramp(frame, 81, 4, EASE.out) * (1 - ramp(frame, 85, 26, EASE.swift));
  const pop = (() => { const p = (frame - 81) / 12; return p > 0 && p < 1 ? Math.sin(Math.PI * Math.pow(p, 0.6)) : 0; })();
  // glaze：末张落定后从左上扫过整摞（堆叠坐标），裁进每张卡
  const glazeX = -500 + 2200 * ramp(frame, 78, 18, bezier(0.45, 0, 0.35, 1));
  const glazeOn = frame >= 78 && frame <= 96;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.72, y: 0.0 }} fill={{ x: 0.08, y: 0.95 }} intensity={0.7} breathe={0.4} grain={0.09} vignette={0.6}>
        {/* 堆叠背后一道暖色竖向光柱，给纸卡列一个"被照亮的位置" */}
        <div style={{ position: 'absolute', left: 1372 - 520, top: -100, width: 1040, height: 1300, background: `radial-gradient(ellipse 50% 50% at 50% 45%, ${alpha(L.light, 0.13)} 0%, ${alpha(L.light, 0)} 70%)` }} />
      </Stage>

      {/* 纸卡列：相机层 */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: STACK_H, transformOrigin: '0 0', transform: `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) scale(${cam.s.toFixed(5)})` }}>
        {/* 空槽：落位前是一圈暗色虚线位 */}
        {FILES.map((_, i) => (
          <div key={`slot${i}`} style={{
            position: 'absolute', left: 0, top: slotY(i), width: CARD_W, height: CARD_H, borderRadius: 14, boxSizing: 'border-box',
            border: `2px dashed ${alpha(L.ink, 0.1)}`, opacity: frame < landAt(i) ? ant : 0,
          }} />
        ))}
        {FILES.map((file, i) => {
          if (frame < CUES[i]) return null;
          const t = Math.min(1, Math.max(0, (frame - CUES[i]) / FLY));
          const landed = frame >= landAt(i);
          const dy = offsetY(i, frame);
          const rot = landed ? 0 : TILTS[i] * (1 - flyT(i, frame));
          const sc = landed ? 1 : 1.04 - 0.04 * flyT(i, frame);
          const vy = landed ? 0 : velocity((f) => offsetY(i, f), frame);
          const elev = landed ? 4 : 4 + 50 * (1 - t);
          const hl = ramp(frame, landAt(i) + 3, 7, bezier(0.3, 0, 0.2, 1));
          const card = (
            <div style={{
              position: 'absolute', left: 0, top: slotY(i), width: CARD_W, height: CARD_H, borderRadius: 14,
              transform: `translateY(${dy.toFixed(3)}px) rotate(${rot.toFixed(4)}deg) scale(${sc.toFixed(5)})`,
              boxShadow: `0 ${(2 + elev * 0.5).toFixed(1)}px ${(6 + elev * 1.4).toFixed(1)}px rgba(0,0,0,${(0.55 - elev * 0.004).toFixed(3)}), 0 0 0 1px ${alpha('#ffffff', 0.06)}`,
              opacity: Math.min(1, t * 4),
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden' }}>
                <Img src={staticFile(`textures/live/${file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
                {/* 截图调色：暖暗场里压一点高光、加一层暖色，让纸卡不刺眼 */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,226,190,0.06), rgba(60,30,10,0.07))', mixBlendMode: 'multiply' }} />
                {hl > 0 && (
                  <div style={{
                    position: 'absolute', left: HL_LEFT, top: HL_TOP, height: HL_H, width: HL_W[i] * hl, borderRadius: 3,
                    background: '#ffc999', mixBlendMode: 'multiply', opacity: 0.9,
                  }} />
                )}
                {glazeOn && (
                  <div style={{
                    position: 'absolute', top: -200, height: CARD_H + 400, left: glazeX - slotY(i) * 0.25, width: 360,
                    transform: 'rotate(14deg)', mixBlendMode: 'soft-light', opacity: 0.8,
                    background: 'linear-gradient(90deg, rgba(255,236,200,0), rgba(255,220,170,0.95) 50%, rgba(255,236,200,0))',
                  }} />
                )}
              </div>
            </div>
          );
          return Math.abs(vy) > 1 ? (
            <SpeedBlur key={file} vx={0} vy={vy * cam.s} amount={0.2} max={12}>{card}</SpeedBlur>
          ) : (
            <React.Fragment key={file}>{card}</React.Fragment>
          );
        })}
      </div>

      {/* 计数排版（屏幕空间） */}
      <div style={{ position: 'absolute', left: 124, top: 250, opacity: 0.3 + 0.7 * ant, transform: `scale(${(0.96 + 0.04 * ant).toFixed(4)})`, transformOrigin: '0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, boxShadow: `0 0 12px ${alpha(L.accent, 0.9)}` }} />
          <div style={{ ...type(26, 600, { mono: true }), letterSpacing: '0.2em', color: L.ink2 }}>PAPER RADAR · JUL 05</div>
        </div>
        {/* 数字背后的橙色泛光（放在滚轮窗口外，免得被窗口裁成方块）；末格滚定时提亮一次 */}
        <div style={{
          position: 'absolute', left: -120, top: 40, width: 520, height: 420, pointerEvents: 'none',
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent, 0.16 + 0.3 * lit)} 0%, ${alpha(L.accent, 0)} 70%)`,
          opacity: Math.min(1, rollPos),
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 18, position: 'relative', transform: `scale(${(1 + 0.05 * pop).toFixed(4)})`, transformOrigin: '0 80%' }}>
          <DigitRoll pos={rollPos} blur={Math.min(14, rollV * 40)} lit={lit} />
          <div style={{ ...type(110, 700), color: L.ink3, marginLeft: 18, marginBottom: 44 }}>/ 31</div>
        </div>
        <div style={{ height: 2, width: 560, background: alpha(L.ink, 0.12), marginTop: 6 }}>
          <div style={{ height: '100%', width: `${((rollPos / 5) * 100).toFixed(2)}%`, background: L.accent }} />
        </div>
        <div style={{ ...type(42, 600), color: L.ink, marginTop: 38, width: 640, lineHeight: 1.22 }}>
          <TextReveal text="papers matched your" by="word" start={84} each={16} gap={3} />
          <br />
          <TextReveal text="active projects today." by="word" start={92} each={16} gap={3} />
        </div>
        <div style={{ ...type(30, 500), color: L.ink3, marginTop: 20, opacity: ramp(frame, 98, 16, EASE.out) }}>
          Fetched from 31 new papers · ranked by relevance
        </div>
      </div>
    </AbsoluteFill>
  );
};
