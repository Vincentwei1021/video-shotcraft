// freeze-annotate 定格标注（轮 G）——真实卡片流运动中定格，
// 马克笔琥珀圈注（feTurbulence 手绘抖动）圈住目标卡 + 箭头点题，解冻继续。
// remap：0–45 流动 → 45–100 定格（斜率 0，瞬时切换）→ 100–135 解冻（ease-in 起步，补偿时长）。
// 质感：与 SpeedRampReal 同一套页面（真实导航条 + 原生分组标题 + 2x 卡片纹理）；
// 流动段按速度给轻微方向性模糊，定格一帧变清晰 + 2f 快门曝光，像按下暂停的照片；
// 定格期目标卡被"拾起"（抬高 + 放大 3% + 阴影加深），其余卡退到 50% 让出视线；
// 圈注是一笔超过一圈的马克笔（1.08 圈、收笔半径内收不闭合，pathLength 归一 8f 画完），
// 箭头杆 6f + 箭头 3f 两笔画出，箭尾一行手写感标签点题；解冻前 8f 圈注淡出、退场还原。
import { useId } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, FONT, Grain, SpeedBlur, Vignette, mix, ramp, softShadow, velocity } from '../../_fixtures/Polish';

export const FREEZEANNOTATE_DUR = 135;

const CARD_W = 540;
const GAP = 56;
const PITCH = CARD_W + GAP;
const RAIL = layout.projects.cards.slice(0, 9);
const TARGET_I = 5;
const RAIL_TOP = 352;
const PX_PER_SRC = 25; // 每个源帧的导轨位移（px）
const AMBER = '#b45309';
const PAGE = '#f7f6f1';

const FREEZE = 45;
const THAW = 100;
const END = 135;

// remap：流动斜率 1 → 定格斜率 0（瞬切）→ 解冻 ease-in（t^1.7，末速 ≈2.4 源帧/帧，补回停掉的时长）
const srcAt = (f: number) => {
  if (f <= FREEZE) return Math.max(0, f);
  if (f <= THAW) return FREEZE;
  const t = Math.min(1, (f - THAW) / (END - THAW));
  return FREEZE + 49 * Math.pow(t, 1.7);
};

// 定格时目标卡中心落屏中
const OFFSET = 960 - (TARGET_I * PITCH + CARD_W / 2) + FREEZE * PX_PER_SRC;
const railX = (f: number) => OFFSET - srcAt(f) * PX_PER_SRC;

// 目标卡（card4-hires 1432×1248）显示尺寸 → 圈注几何（定格时卡被拾起 −12px、放大 3%）
const TARGET_H = (CARD_W * 1248) / 1432; // ≈471
const CX = 960;
const CY = RAIL_TOP + TARGET_H / 2 - 12; // ≈575
// 超椭圆（n=3）贴着矩形绕一圈：半轴取卡半宽/半高 ×1.3，四角也留出余量，笔画不压卡内文字
const RX = 1.3 * (CARD_W / 2) * 1.03; // ≈362
const RY = 1.3 * (TARGET_H / 2) * 1.03; // ≈315
const SE = 2 / 3; // 超椭圆参数指数 2/n

// 一笔马克笔圈：从左上起笔，顺时针 1.08 圈，半径随行程内收 4%（收笔不闭合，像手画）
const circlePath = (() => {
  const N = 120;
  const a0 = -2.35; // 起笔角（左上）
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = a0 + u * Math.PI * 2 * 1.08;
    const k = 1 - 0.04 * u;
    const c = Math.cos(a), sn = Math.sin(a);
    const px = Math.sign(c) * Math.pow(Math.abs(c), SE) * RX * k;
    const py = Math.sign(sn) * Math.pow(Math.abs(sn), SE) * RY * k;
    pts.push(`${(CX + px).toFixed(1)} ${(CY + py).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
})();

export const FreezeAnnotateReal: React.FC = () => {
  const frame = useCurrentFrame();
  // 滤镜 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const roughId = `rough-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const x0 = railX(frame);
  const v = velocity(railX, frame);
  const frozen = frame >= FREEZE && frame < THAW;
  // 流动/解冻段的轻微方向性模糊；定格段速度为 0，滤镜自动摘除
  const blurV = frozen ? 0 : Math.sign(v) * Math.max(0, Math.abs(v) - 8);

  // 定格聚焦：10f 拾起目标、压暗其余；解冻前 8f 还原
  const focus = ramp(frame, FREEZE, 10, EASE.snappy) * (1 - ramp(frame, THAW - 6, 10, EASE.swift));
  // 定格快门：45–46f 曝光 +6%
  const snap = frame === FREEZE || frame === FREEZE + 1;

  // 圈注时序：圈 52–60、箭杆 60–66、箭头 66–69、标签 64–74；96–104 淡出
  const draw = ramp(frame, 52, 8, EASE.swift);
  const shaft = ramp(frame, 60, 6, EASE.out);
  const head = ramp(frame, 66, 3, EASE.out);
  const tag = ramp(frame, 64, 10, EASE.snappy);
  const fade = 1 - ramp(frame, 96, 8, EASE.out);
  const showInk = frame >= 52 && fade > 0.001;

  // 箭头：右上方弧线指向圈的右上缘
  const ax0 = CX + 470, ay0 = 150;
  const ax1 = CX + 318, ay1 = CY - RY + 22;
  const qx = CX + 360, qy = ay0 + 20; // 二次贝塞尔控制点
  const arrowD = `M ${ax0} ${ay0} Q ${qx} ${qy} ${ax1} ${ay1}`;
  // 箭头两翼（沿末端切线方向 ±28°）
  const ang = Math.atan2(ay1 - qy, ax1 - qx);
  const wing = (s: number) =>
    `M ${ax1} ${ay1} L ${(ax1 - Math.cos(ang + s * 0.5) * 34).toFixed(1)} ${(ay1 - Math.sin(ang + s * 0.5) * 34).toFixed(1)}`;

  return (
    <AbsoluteFill style={{ backgroundColor: PAGE, overflow: 'hidden', filter: snap ? 'brightness(1.06)' : undefined }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 38%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 70%), linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(60,48,30,0.05) 100%)',
        }}
      />

      {/* 导轨上方的分组标题（页面原生样式，按可读字高放大）；定格期随其余内容一起退后 */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 262,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: FONT.sans,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: '#5f5a50',
          opacity: 1 - 0.45 * focus,
        }}
      >
        <span>全部项目</span>
        <span style={{ fontWeight: 500, letterSpacing: '0.02em', color: '#8b8579', fontVariantNumeric: 'tabular-nums' }}>
          显示 10 / 10
        </span>
      </div>

      <SpeedBlur vx={blurV} amount={0.32} max={28}>
        <div style={{ position: 'absolute', left: 0, top: RAIL_TOP, transform: `translateX(${x0.toFixed(2)}px)` }}>
          {Array.from({ length: 14 }).map((_, k) => {
            const c = RAIL[k % RAIL.length];
            const isTarget = k === TARGET_I;
            return (
              <Img
                key={k}
                src={staticFile(`textures/live/${isTarget ? 'card4-hires.png' : c.file}`)}
                style={{
                  position: 'absolute',
                  left: k * PITCH,
                  top: 0,
                  width: CARD_W,
                  borderRadius: 14,
                  transform: isTarget ? `translateY(${(-12 * focus).toFixed(2)}px) scale(${(1 + 0.03 * focus).toFixed(4)})` : undefined,
                  opacity: isTarget ? 1 : 1 - 0.5 * focus,
                  boxShadow: `0 0 0 1px rgba(60,48,30,0.06), ${softShadow(isTarget ? 5 + 24 * focus : 5, { color: '#2a2216', strength: 0.9 })}`,
                  zIndex: isTarget ? 2 : 1,
                }}
              />
            );
          })}
        </div>
      </SpeedBlur>

      {showInk && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: fade, mixBlendMode: 'multiply' }}>
          <defs>
            <filter id={roughId}>
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
            </filter>
          </defs>
          <g filter={`url(#${roughId})`} fill="none" stroke={AMBER} strokeLinecap="round" strokeLinejoin="round" opacity={0.94}>
            <path
              d={circlePath}
              strokeWidth={9}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - draw}
              transform={`rotate(-4 ${CX} ${CY})`}
            />
            {shaft > 0 && (
              <path d={arrowD} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - shaft} />
            )}
            {head > 0 && (
              <>
                <path d={wing(1)} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - head} />
                <path d={wing(-1)} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - head} />
              </>
            )}
          </g>
        </svg>
      )}

      {/* 箭尾标签：马克笔色手写感短句点题（略倾斜） */}
      {showInk && tag > 0 && (
        <div
          style={{
            position: 'absolute',
            left: ax0 - 40,
            top: ay0 - 74,
            transform: `rotate(-4deg) scale(${mix(0.92, 1, tag).toFixed(4)})`,
            transformOrigin: '0% 100%',
            opacity: tag * fade,
            fontFamily: FONT.sans,
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: AMBER,
            whiteSpace: 'nowrap',
          }}
        >
          本周重点
        </div>
      )}

      {/* 真实页面导航条（2x 截图） */}
      <Img
        src={staticFile('textures/live/nav.png')}
        style={{ position: 'absolute', left: 0, top: 0, width: 1920, boxShadow: '0 1px 0 rgba(60,48,30,0.06)' }}
      />

      <Vignette strength={0.14 + 0.06 * focus} inner={0.55} color="#3a3022" />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
