// list-stack-press —— 列表卡从底部逐张飞上摞起，每张落地压弹整摞、计数器同步跳格
// "堆叠有重量"：每张新卡落上来，已落定的整摞被压下再弹回——物理反馈里读出
// "这是实打实攒下来的东西"。参考实现从 template ScenePapers 剥离：
// 预备拍（计数器先于首卡 4–6f 亮起微缩，把视线引到堆叠区）；5 卡 12f 等距节拍
// 从底部 600px 升入（交替 ±2° 倾斜收平 + scale 1.06→1）；后一张到场时整摞压下
// 6px、8f 弹回（stackPress 脉冲——"有重量"的关键一笔）；落地后高亮条滞后 2–4f
// 长出；收尾一道 glaze 扫光掠过整摞；屏幕空间 DigitRoll 计数器落一张滚一格。
// 正视机位（堆叠/列表镜头必须正视，Q6），相机跟随堆叠向下。
// 质感层（改版）：
// · 相机从 5 段关键帧（每段各自缓入缓出、关键帧处速度归零）改成一条连续曲线逐帧喂给 PageCam2D
// · 飞行卡按速度加纵向运动模糊；阴影改为随离地高度变化的两层（接触影 + 环境影）
// · 高亮条按截图实测对准"与项目相关"项目名那一行，multiply 叠在字下（荧光笔），不再盖住正文
// · glaze 改在最后一张落定后扫过，并裁进每张卡的圆角内（Q4）
// · 计数器数字显式用系统无衬线 + tabular-nums（原先落到浏览器默认衬线），滚动时带纵向拖影
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import { FONT, SpeedBlur, bezier, softShadow, velocity } from '../../_fixtures/Polish';
import layout from '../../_textures/live-layout.json';

export const LIST_STACK_PRESS_DURATION = 88; // 18–88f 落在 shot 内 offset 0

const cards = layout.papers.cards;
const PAGE_H = layout.papers.pageH;
const MONO = FONT.mono;
const AMBER = 'oklch(52% 0.115 65)';
const FILES = ['paper1.png', 'paper2.png', 'paper3.png', 'paper4.png', 'paper5.png'];
// 截图实测：每张卡里"与项目相关"项目名那一行（页面 px，卡内坐标）——高亮条只盖这一行
const HL_TOP = 156, HL_H = 20, HL_LEFT = 16;
const HL_W = [187, 244, 247, 240, 191];

const CUES = [6, 18, 30, 42, 54]; // 首卡前留 6f 给计数器预备拍（anticipation）
const DUR = 22;
const FLY_EASE = Easing.bezier(0.45, 0.05, 0.25, 1.12);
const TILTS = [2, -2, 2, -2, 2];

// 预备拍：计数器先于首卡亮起 + 微缩 (0.96→1)，把视线引到堆叠区（段落级一次）
const ANTICIPATE_START = 0;
const ANTICIPATE_END = 6;

// 相机：一条连续曲线（页头近景 1.35 → 整摞全景 0.86），纵向跟随堆叠；
// 竖向位置先走、推拉略晚收，82f 后静止留给扫光与计数落定
const CAM_END = 82;
const CY_EASE = bezier(0.42, 0, 0.2, 1);
const Z_EASE = bezier(0.3, 0, 0.18, 1);
const camAt = (f: number) => {
  const u = Math.min(1, Math.max(0, f / CAM_END));
  return { cx: 960, cy: 270 + (815 - 270) * CY_EASE(u), zoom: 1.35 + (0.86 - 1.35) * Z_EASE(u) };
};
// 逐帧关键帧 + 线性插值 = 把连续曲线原样交给 PageCam2D（它的分段缓动会在关键帧处停顿）
const CAM_KEYS: CamKey2D[] = Array.from({ length: LIST_STACK_PRESS_DURATION }, (_, f) => ({ frame: f, ...camAt(f) }));
const LINEAR = (t: number) => t;

// odometer digit column —— 连续里程计，不重挂：`pos` 是数字带上的连续位置
// （0→5），每张卡落地让 pos 多滚进一格。单格滚动必须短于 12f 落卡间距、
// 且最后一格在镜头结束前落定——key 重挂从 0 重滚 22f 的写法两条都踩
// （前一格永远滚不完、尾帧停在 4）。
const DIGITS = '0123456789';
const ROLL_DUR = 8; // 单格滚动帧数，< 12f 落卡间距
const ROLL_EASE = Easing.bezier(0.25, 0.8, 0.25, 1);
const rollAt = (frame: number) => {
  let pos = 0;
  for (const c of CUES) {
    pos += interpolate(frame, [c + DUR, c + DUR + ROLL_DUR], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ROLL_EASE,
    });
  }
  return pos;
};
const DigitRoll: React.FC<{ pos: number; lineH: number; color: string; blur: number }> = ({ pos, lineH, color, blur }) => (
  <span style={{ display: 'inline-flex', overflow: 'hidden', height: lineH, verticalAlign: 'bottom' }}>
    <span style={{ display: 'inline-block', height: lineH }}>
      <span style={{ display: 'block', transform: `translateY(${-pos * lineH}px)`, filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
        {(DIGITS + DIGITS).split('').map((d, j) => (
          <span
            key={j}
            style={{
              display: 'block', fontFamily: FONT.sans, fontWeight: 500, fontSize: 104, letterSpacing: '-0.04em',
              lineHeight: `${lineH}px`, color, fontVariantNumeric: 'tabular-nums',
            }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  </span>
);

// 飞行进度（含过冲）与纵向位移，作为帧的纯函数——速度模糊要在相邻帧求值
const flyT = (i: number, f: number) =>
  interpolate(f, [CUES[i], CUES[i] + DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE });
const flyY = (i: number, f: number) => 600 * (1 - flyT(i, f));

export const ListStackPress: React.FC = () => {
  const frame = useCurrentFrame();
  // 计数器连续位置：每张卡落地（cue+DUR）时向前滚一格，8f 滚定。
  // 最后一张 f76 落地、f84 滚定，早于 f88 镜头结束。
  const rollPos = rollAt(frame);
  const rollV = Math.abs(velocity(rollAt, frame)); // 格/帧

  // 预备拍：计数器 0→6f 从 scale 0.96 微缩回 1 并亮起，视线先引到堆叠区
  const antT = interpolate(frame, [ANTICIPATE_START, ANTICIPATE_END], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });
  const counterScale = 0.96 + 0.04 * antT;
  const counterOpacity = 0.3 + 0.7 * antT;

  // when a *later* card enters, the settled stack gets pressed down 6px then
  // springs back over ~8 frames
  const stackPress = (settledIndex: number) => {
    let press = 0;
    for (let j = settledIndex + 1; j < CUES.length; j++) {
      const cue = CUES[j];
      const p = interpolate(frame, [cue, cue + 4, cue + 8], [0, 6, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin),
      });
      press = Math.max(press, p);
    }
    return press;
  };

  // glaze：最后一张 f76 落定后从左上扫过整摞（页面坐标），只在卡片圆角内可见
  const glazeX = interpolate(frame, [74, 87], [-500, 2300], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.35, 1),
  });
  const glazeVis = interpolate(frame, [74, 77, 84, 87], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#faf7f2' }}>
      <PageCam2D src="textures/live/papers-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={LINEAR}>
        {/* cover the printed cards so blank slots stack in */}
        {cards.map((c, i) => (
          <div
            key={`slot-${i}`}
            style={{
              position: 'absolute', left: c.x - 12, top: c.y - 10,
              width: c.w + 24, height: c.h + 20, background: '#faf7f2',
              opacity: frame >= CUES[i] + DUR - 2 ? 0 : 1,
            }}
          />
        ))}

        {cards.map((c, i) => {
          const cue = CUES[i];
          const t = flyT(i, frame);
          if (t <= 0) return null;
          const settled = t >= 0.999;
          const dy = flyY(i, frame) + (settled ? stackPress(i) : 0);
          const rot = TILTS[i] * (1 - t);
          const scale = 1.06 - 0.06 * t;
          // 离地高度：飞行段按剩余行程映射 0–56px，落定 3px（被压时更贴地）
          const elev = settled ? 3 - stackPress(i) * 0.3 : 3 + 53 * Math.min(1, Math.max(0, 1 - t));
          const vy = settled ? 0 : velocity((f) => flyY(i, f), frame);

          // 高亮条：落地后滞后 3f 长出；最后一张离切点只剩 12f，节拍压缩到 5f 长 + 4f 淡
          const lastCard = i === CUES.length - 1;
          const hlStart = cue + DUR + (lastCard ? 2 : 3);
          const hlLen = lastCard ? 5 : 7;
          const hlGrow = interpolate(frame, [hlStart, hlStart + hlLen], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1),
          });
          const hlFade = interpolate(frame, [hlStart + hlLen, hlStart + hlLen + (lastCard ? 4 : 5)], [1, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });

          const card = (
            <div
              style={{
                position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
                transform: `translateY(${dy.toFixed(3)}px) rotate(${rot.toFixed(4)}deg) scale(${scale.toFixed(5)})`,
                transformOrigin: 'center center', borderRadius: 12,
                boxShadow: softShadow(elev, { color: '#3c2d1e', strength: 1.15 }),
              }}
            >
              <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden' }}>
                <Img src={staticFile(`textures/live/${FILES[i]}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
                {hlGrow > 0 && hlFade > 0 ? (
                  // 荧光笔：multiply 叠在字下，字保持原深度
                  <div
                    style={{
                      position: 'absolute', left: HL_LEFT, top: HL_TOP, height: HL_H,
                      width: HL_W[i] * hlGrow, borderRadius: 3,
                      background: 'oklch(90% 0.075 82)', mixBlendMode: 'multiply', opacity: 0.85 * hlFade,
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
                {/* glaze：一道斜向柔光，按页面坐标连续扫过整摞，被每张卡圆角裁切 */}
                {glazeVis > 0 && (
                  <div
                    style={{
                      position: 'absolute', top: -200, height: c.h + 400, left: glazeX - c.x - (c.y - 200) * 0.25, width: 360,
                      transform: 'rotate(14deg)', opacity: glazeVis * 0.55, mixBlendMode: 'soft-light',
                      background: 'linear-gradient(90deg, rgba(255,236,200,0), rgba(255,226,170,0.95) 45%, rgba(255,226,170,0.95) 55%, rgba(255,236,200,0))',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              {/* 顶部 1px 受光沿 + 发丝线（截图卡自带浅描边，这里只补受光） */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 12, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
            </div>
          );
          return Math.abs(vy) > 1 ? (
            <SpeedBlur key={FILES[i]} vx={0} vy={vy} amount={0.22} max={14}>
              {card}
            </SpeedBlur>
          ) : (
            <React.Fragment key={FILES[i]}>{card}</React.Fragment>
          );
        })}
      </PageCam2D>

      {/* screen-space counter, top-right — lands one digit per card */}
      <div
        style={{
          position: 'absolute', top: 70, right: 96, textAlign: 'right',
          pointerEvents: 'none', opacity: counterOpacity,
          transform: `scale(${counterScale})`, transformOrigin: 'top right',
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, letterSpacing: '0.18em', color: 'oklch(48% 0.008 82)', textTransform: 'uppercase' }}>
          Paper Radar
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <DigitRoll pos={rollPos} lineH={104 * 1.12} color={AMBER} blur={Math.min(6, rollV * 30)} />
        </div>
        <div style={{ height: 1, background: 'oklch(80% 0.01 82)', margin: '8px 0 10px auto', width: 220 }} />
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', color: 'oklch(52% 0.008 82)', textTransform: 'uppercase' }}>
          Of 31 Fetched Today
        </div>
      </div>
    </AbsoluteFill>
  );
};
