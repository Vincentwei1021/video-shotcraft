// sakuga-timing-shift —— 一拍三转一拍一（作画打拍切换）
// 0–48f：驱动帧 q = floor(f/3)*3，卡从左侧顿挫横移到右侧（10fps 手翻书感），
// 每步 ≈70px + rotate 摆动 + 微跳 = 一拍三的钝感；48f 切换点后改用原始 f 连续驱动，
// 48–75f 丝滑冲刺折返中央（out-poly(4) 高初速 + 运动拉伸 scaleX + 残影），
// 过冲 36px 后 3f 回弹落位。左上角标 "on 3s"/"on 1s" 随段切换并带 line-boil
// （boil 在 f=108 后冻结）。收尾 108–150 真静止 42f。帧确定，无随机。
// 质感：底部加一条"摄影表"帧条（30 格 = 1 秒），一拍三时每 3 格亮 1 格、一拍一时格格亮，
// 播放头逐帧走——"换拍"不止有角标，观众能直接看见每秒画几张；卡片按离地高度给两层软阴影
// （顿挫段每步一跳、冲刺段飞起、落位贴回），落位槽是内凹的浅槽而非虚线框；
// 柔光背景 + 轻颗粒，系统字体排版（角标 tabular 数字，副注 ≥32px）。
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, mix, ramp, softShadow, tracking } from '../../_fixtures/Polish';

export const SAKUGA_TIMING_SHIFT_DURATION = 150; // 顿挫 48f + 冲刺落位 30f + 沸腾 30f + 真静止 42f

const W = 1920;
const CARD_W = 560;
const CARD_H = 350;
const CARD_Y = 352; // 卡顶边（视觉重心略高于画面中线，下方留给帧条）

const X_LEFT = 120;
const X_RIGHT = 1240; // 卡左缘，右侧停点（右缘 1800）
const X_CENTER = (W - CARD_W) / 2; // 680，中央落位
const OVERSHOOT = 36;

const SWITCH = 48; // 打拍切换帧
const ARRIVE = 70; // 冲刺到过冲点
const SETTLE = 75; // 回弹落位完成
const BOIL_FREEZE = 108; // 角标沸腾冻结帧

const ACCENT = G.accent;

// 段一：一拍三。位置函数线性（机械等距步进是"手翻书"的语义），只在 q = floor(f/3)*3 上取值。
const pos1 = (t: number): number =>
  interpolate(t, [0, SWITCH], [X_LEFT, X_RIGHT], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// 段二：一拍一。out-poly(4) 高初速冲刺 → 过冲 → 3f 回弹。
const pos2 = (t: number): number =>
  interpolate(t, [SWITCH, ARRIVE, SETTLE], [X_RIGHT, X_CENTER - OVERSHOOT, X_CENTER], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// 库内标准 seed hash（帧确定）
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

// 摄影表帧条：30 格 = 1 秒
const STRIP_N = 30;
const CELL = 34;
const CELL_GAP = 8;
const STRIP_W = STRIP_N * CELL + (STRIP_N - 1) * CELL_GAP; // 1242
const STRIP_X = (W - STRIP_W) / 2;
const STRIP_Y = 830;

export const SakugaTimingShift: React.FC = () => {
  const f = useCurrentFrame();
  const onThrees = f < SWITCH;

  // ---- 卡片位置 ----
  const q = Math.floor(f / 3) * 3; // 一拍三驱动帧
  const x = onThrees ? pos1(q) : pos2(f);

  // 顿挫段姿势（随 q 冻结，一步一个样）：rotate 摆动 + 交替微跳（一张画抬起、下一张落下）
  const rot = onThrees
    ? Math.sin(q * 0.7) * 5
    : interpolate(f, [SWITCH, SWITCH + 8], [Math.sin(SWITCH * 0.7) * 5, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      });
  const hop = onThrees && f > 0 ? ((q / 3) % 2 === 0 ? -10 : -2) : 0;

  // 冲刺段速度（位置差分，帧时间解耦）→ 运动拉伸
  const v = onThrees ? 0 : Math.abs(pos2(f) - pos2(f - 1));
  const sFac = Math.min(v / 55, 1);
  const stretchX = 1 + 0.35 * sFac; // 峰值 ≈1.35，横向拉丝
  const stretchY = 1 - 0.12 * sFac;

  // 落位急停回弹：72–78f scaleX 压扁再回 1
  const sqX = interpolate(f, [SETTLE - 3, SETTLE, SETTLE + 3], [1, 0.9, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sqY = interpolate(f, [SETTLE - 3, SETTLE, SETTLE + 3], [1, 1.07, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 离地高度 → 阴影：顿挫段随微跳 10/16，冲刺段按速度飞起到 40，落位贴回 4
  const elev = onThrees ? (hop < -5 ? 18 : 10) : 4 + 36 * sFac;

  // 冲刺残影：只在段二速度高时挂载（条件挂载，不留 opacity 0 的壳）
  const ghosts =
    !onThrees && f > SWITCH + 1 && f < ARRIVE + 2 && sFac > 0.15
      ? [
          { xg: pos2(f - 2), op: 0.3 * sFac },
          { xg: pos2(f - 4), op: 0.14 * sFac },
        ]
      : [];

  // ---- 角标 "on 3s" / "on 1s"：line-boil（每 4 帧换一张），f=108 后冻结 ----
  const qb = Math.min(Math.floor(f / 4) * 4, BOIL_FREEZE);
  const bx = (h(qb + 1) - 0.5) * 6;
  const by = (h(qb + 2) - 0.5) * 6;
  const brot = (h(qb + 3) - 0.5) * 2.4;
  // 手绘下划线：三段折线端点各自沸腾
  const ul = [0, 1, 2, 3].map((i) => (h(qb * 3 + i * 7 + 11) - 0.5) * 7);
  // 切换瞬间角标弹一下
  const pop = interpolate(f, [SWITCH, SWITCH + 3, SWITCH + 9], [1, 1.35, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 入场：角标与帧条 14f ease-out 上浮淡入（帧条比角标晚 4f）
  const labelIn = ramp(f, 0, 14, EASE.out);
  const stripIn = ramp(f, 4, 14, EASE.out);
  const capColor = onThrees ? G.ink2 : ACCENT;

  // 帧条播放头：一秒一循环；落位后（SETTLE+3）停在当前格并冻结，随全片一起真静止
  const head = Math.min(f, SETTLE + 3) % STRIP_N;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} grain={0} vignette={0.16} />

      {/* 轨道：发丝线导轨 + 每 70px 一道步距刻度（顿挫段每步正好跨一格） */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          right: 100,
          top: CARD_Y + CARD_H + 30,
          height: 1,
          background: 'rgba(20,22,28,0.12)',
        }}
      />
      {Array.from({ length: 17 }).map((_, i) => (
        <div
          key={`tick-${i}`}
          style={{
            position: 'absolute',
            left: X_LEFT + CARD_W / 2 + i * ((X_RIGHT - X_LEFT) / 16) - 0.5,
            top: CARD_Y + CARD_H + 24,
            width: 1,
            height: 13,
            background: 'rgba(20,22,28,0.16)',
          }}
        />
      ))}

      {/* 中央落位槽：内凹浅槽（内阴影 + 发丝线），不是虚线框 */}
      <div
        style={{
          position: 'absolute',
          left: X_CENTER - 6,
          top: CARD_Y - 6,
          width: CARD_W + 12,
          height: CARD_H + 12,
          borderRadius: 18,
          background: 'rgba(20,22,28,0.035)',
          boxShadow: 'inset 0 1px 3px rgba(16,18,26,0.08), inset 0 0 0 1px rgba(20,22,28,0.06)',
        }}
      />

      {/* 冲刺残影 */}
      {ghosts.map((g, i) => (
        <div
          key={`ghost-${i}`}
          style={{ position: 'absolute', left: 0, top: CARD_Y, opacity: g.op, transform: `translateX(${g.xg}px)` }}
        >
          <Card w={CARD_W} h={CARD_H} seed={4} style={{ boxShadow: 'none' }} />
        </div>
      ))}

      {/* 主卡 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: CARD_Y,
          transform: `translate(${x}px, ${hop}px) rotate(${rot}deg) scaleX(${stretchX * sqX}) scaleY(${stretchY * sqY})`,
          transformOrigin: '50% 50%',
        }}
      >
        <Card
          w={CARD_W}
          h={CARD_H}
          seed={4}
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(elev)}` }}
        />
      </div>

      {/* 角标：on 3s / on 1s（手绘沸腾）+ 副注每秒张数 */}
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 132,
          opacity: labelIn,
          transform: `translateY(${mix(16, 0, labelIn)}px)`,
        }}
      >
        <div
          style={{
            transform: `translate(${bx}px, ${by}px) rotate(${brot}deg) scale(${pop})`,
            transformOrigin: '0% 50%',
            display: 'inline-block',
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 92,
              lineHeight: 1,
              color: onThrees ? G.ink1 : ACCENT,
              letterSpacing: tracking(92),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {onThrees ? 'on 3s' : 'on 1s'}
          </div>
          <svg width={250} height={22} style={{ display: 'block', marginTop: 8, overflow: 'visible' }}>
            <path
              d={`M 2 ${11 + ul[0]} Q 80 ${8 + ul[1]} 150 ${12 + ul[2]} T 246 ${10 + ul[3]}`}
              fill="none"
              stroke={onThrees ? G.ink1 : ACCENT}
              strokeWidth={7}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 34,
            fontWeight: 500,
            color: capColor,
            letterSpacing: tracking(34),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {onThrees ? '10 drawings / sec' : '30 drawings / sec'}
        </div>
      </div>

      {/* 摄影表帧条：30 格 = 1 秒；有画的格亮，播放头描边 */}
      <div style={{ position: 'absolute', left: STRIP_X, top: STRIP_Y, opacity: stripIn, transform: `translateY(${mix(14, 0, stripIn)}px)` }}>
        {Array.from({ length: STRIP_N }).map((_, i) => {
          const drawn = onThrees ? i % 3 === 0 : true;
          const isHead = i === head;
          return (
            <div
              key={`cell-${i}`}
              style={{
                position: 'absolute',
                left: i * (CELL + CELL_GAP),
                top: 0,
                width: CELL,
                height: CELL * 1.3,
                borderRadius: 7,
                background: drawn ? (onThrees ? G.ink1 : ACCENT) : 'rgba(20,22,28,0.06)',
                opacity: drawn ? (isHead ? 1 : onThrees ? 0.82 : 0.62) : 1,
                boxShadow: isHead
                  ? `0 0 0 3px ${G.canvas}, 0 0 0 4.5px ${onThrees ? G.ink1 : ACCENT}`
                  : drawn
                    ? 'inset 0 1px 0 rgba(255,255,255,0.18)'
                    : 'inset 0 0 0 1px rgba(20,22,28,0.06)',
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: CELL * 1.3 + 20,
            width: STRIP_W,
            textAlign: 'center',
            fontSize: 32,
            fontWeight: 500,
            color: G.ink3,
            letterSpacing: tracking(32),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          1 second · 30 frames
        </div>
      </div>

      {/* 颗粒与沸腾同帧冻结：108f 起全画面无任何动画（真静止） */}
      <Freeze frame={BOIL_FREEZE} active={f >= BOIL_FREEZE}>
        <Grain opacity={0.045} />
      </Freeze>
    </AbsoluteFill>
  );
};
