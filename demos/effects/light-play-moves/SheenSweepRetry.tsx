// sheen-sweep-retry —— 单点扫光（高标准重试）：深墨主角卡上一道斜向高光带缓扫一次，被圆角裁住，无声的加冕。
//
// 第二轮重设计（暖沙展台 · 钛黑会员卡发布）：
// - look = sand（米色 · 赤陶）。主角从"灰底上的 PRO 小卡"换成一张 900×567 的钛黑金属卡（虚构 Corvid Reserve），
//   卡面是拉丝钛（横向发丝纹）+ 激光蚀刻的字标 / 持卡人 / 非接图标 + 香槟金芯片，带 8 层叠出的金属厚边。
//   卡在右侧 3D 斜放（rotateY 朝向左侧文字栏、rotateX 微仰），左栏是编辑式标题「Metal, / not plastic.」。
// - 扫光有物理动机：卡缓缓"转向光源"（rotateY 21°→14°）的同一时段，高光带掠过卡面——不是贴上去的特效，
//   而是转角带来的反射。四约束照旧：单点（只扫主角卡）、圆角裁剪、只扫一次、扫前扫后无光效层。
// - 光带三层：宽柔光（0.14）+ 窄亮芯（0.5）screen 叠在钛黑上；光带经过处，拉丝纹与蚀刻字被"照出来"
//   （固定在卡面上的亮版副本，用随光带移动的同一条 115° 遮罩揭开），卡的上沿发丝线同步亮一下。
// - 空间：Stage 左上主光 + 沙色地面；卡下两层软投影（接触影 + 远影）随入场高度收紧，不在 3D 层里。
//
// 时间表（30fps，共 150f）：
//   0–36    卡入场：从下方 120px 处升起 + 转到 21°（弹簧 damping 24，慢、重、无回弹的奢侈感）；投影晚 4f 收紧
//   6–44    左栏：眉题字距收拢 → 标题两行从线下升起（间隔 7f）→ 正文淡入上浮
//   44–58   hold：卡静置，观众先看清卡面
//   58–90   主动作：卡转向光源（smooth in-out，到 96f）+ 高光带扫过一次（32f，swift）
//   92–108  余波：CTA 胶囊升起
//   108–150 hold：卡极缓漂移（rotateY 再转 1°，ease-out 收住），尾段干净海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const SHEEN_SWEEP_RETRY_DURATION = 150;

const L = LOOKS.sand;

const W = 900;
const H = 567; // ISO 卡比例 1.586
const R = 38;
const CX = 1262; // 卡心
const CY = 520;

const SWEEP_START = 58;
const SWEEP_END = 90;
const TURN_END = 96;

const ENGRAVE = '#57534d'; // 蚀刻：比钛黑底亮两档的暖灰（静置时也读得出字标）
const LIT = '#efe6d8'; // 光带下的蚀刻反光：暖白

// 拉丝钛：横向发丝纹（两组不同周期叠出不规则感）
const BRUSH =
  'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px),' +
  'repeating-linear-gradient(180deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 7px)';

// 渡鸦字标：圆 + 斜切缺口（C 形）+ 一颗"眼"
const Mark: React.FC<{ color: string; size?: number }> = ({ color, size = 58 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block' }}>
    <path d="M38 13.5A17 17 0 1 0 38 34.5L30.6 29.4A8.2 8.2 0 1 1 30.6 18.6Z" fill={color} />
    <circle cx="36.5" cy="24" r="3.2" fill={color} />
  </svg>
);

const Contactless: React.FC<{ color: string }> = ({ color }) => (
  <svg width={46} height={46} viewBox="0 0 24 24" style={{ display: 'block' }}>
    {[4.5, 8, 11.5].map((r, i) => (
      <path key={i} d={`M${6 + i * 3.2} ${12 - r * 0.7}a${r} ${r} 0 0 1 0 ${r * 1.4}`} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    ))}
  </svg>
);

// 卡面内容（蚀刻层）：tone = 字色；lit = 光带下的亮版（只换颜色与阴影）
const Face: React.FC<{ tone: string; lit?: boolean }> = ({ tone, lit }) => {
  // 蚀刻感：下沿 1px 亮、上沿 1px 暗（刻进去的槽）；亮版换成发光
  const etch = lit ? `0 0 14px ${alpha(LIT, 0.5)}` : '0 1px 0 rgba(255,255,255,0.10), 0 -1px 0 rgba(0,0,0,0.6)';
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '52px 60px 50px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', color: tone }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ filter: lit ? `drop-shadow(0 0 10px ${alpha(LIT, 0.55)})` : 'drop-shadow(0 1px 0 rgba(255,255,255,0.1))' }}>
          <Mark color={tone} />
        </div>
        <div style={{ ...type(46, 620), letterSpacing: '-0.035em', textShadow: etch }}>corvid</div>
        <div style={{ marginLeft: 'auto', filter: lit ? `drop-shadow(0 0 8px ${alpha(LIT, 0.5)})` : undefined }}>
          <Contactless color={tone} />
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div>
          <div style={{ ...type(22, 600, { caps: true }), letterSpacing: '0.3em', opacity: 0.8, textShadow: etch }}>Card member</div>
          <div style={{ ...type(36, 500, { mono: true }), letterSpacing: '0.16em', marginTop: 12, textShadow: etch }}>A. MORENO</div>
        </div>
        <div style={{ marginLeft: 'auto', ...type(30, 700, { caps: true }), letterSpacing: '0.34em', textShadow: etch }}>Reserve</div>
      </div>
    </div>
  );
};

// 香槟金芯片：拉丝金属 + 触点分割线
const Chip: React.FC = () => (
  <div
    style={{
      position: 'absolute', left: 60, top: 212, width: 116, height: 88, borderRadius: 16, overflow: 'hidden',
      background: 'linear-gradient(135deg, #e9d3a6 0%, #b8955c 42%, #8c6a39 70%, #d9bd86 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.5)',
    }}
  >
    <svg width={116} height={88} viewBox="0 0 116 88" style={{ position: 'absolute', inset: 0 }}>
      <g stroke="rgba(70,48,18,0.55)" strokeWidth={1.4} fill="none">
        <path d="M0 30H38M0 58H38M78 30H116M78 58H116M38 0V88M78 0V88" />
        <rect x={38} y={22} width={40} height={44} rx={9} />
      </g>
    </svg>
  </div>
);

export const SheenSweepRetry: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 卡入场：慢弹簧，无回弹 ——
  const enter = springAt(frame, 0, { damping: 24, stiffness: 70, mass: 1.1 });
  const shadowIn = springAt(frame, 4, { damping: 24, stiffness: 70, mass: 1.1 }); // 投影晚 4f
  // —— 转向光源：与扫光同段 ——
  const turn = ramp(frame, SWEEP_START - 4, TURN_END - SWEEP_START + 4, EASE.smooth);
  const drift = ramp(frame, TURN_END, 150 - TURN_END, EASE.out);
  const rotY = mix(36, 21, enter) - 7 * turn - 1.5 * drift;
  const rotX = mix(16, 9, enter) - 1.5 * turn;
  const lift = mix(120, 0, enter) - 6 * drift;
  const scale = mix(0.94, 1, enter);
  const appear = ramp(frame, 0, 8, EASE.out);

  // —— 扫光：只一次，条件挂载 ——
  const sweepOn = frame >= SWEEP_START && frame <= SWEEP_END;
  const p = ramp(frame, SWEEP_START, SWEEP_END - SWEEP_START, EASE.swift);
  // 光带中心从卡左外 0.45W 走到卡右外 0.45W；遮罩/光带宽 2W，中心在其 50% 处
  const bandC = mix(-0.45 * W, 1.45 * W, p);
  const bandX = bandC - W;
  const bandMask = `linear-gradient(115deg, transparent 38%, #000 50%, transparent 62%)`;
  const topX = bandC + ((H / 2) * Math.cos((65 * Math.PI) / 180)) / Math.sin((115 * Math.PI) / 180);

  const cta = ramp(frame, 92, 16, EASE.snappy);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.08 }} fill={{ x: 0.9, y: 0.95 }} horizon={0.86} intensity={1}>
        {/* 展台地面：下 1/4 微微压暗的桌面 + 远处一条柔和的桌沿 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 820, bottom: 0, background: `linear-gradient(180deg, ${alpha(L.shadow, 0)} 0%, ${alpha(L.shadow, 0.08)} 100%)` }} />
      </Stage>

      {/* 卡下投影：接触影（小而实）+ 远影（大而虚），随入场高度收紧 */}
      <div
        style={{
          position: 'absolute', left: CX - W * 0.42 + 40, top: CY + H * 0.44 + mix(60, 0, shadowIn), width: W * 0.84, height: 70,
          borderRadius: '50%', background: alpha(L.shadow, mix(0.08, 0.34, shadowIn)), filter: 'blur(26px)', opacity: appear,
        }}
      />
      <div
        style={{
          position: 'absolute', left: CX - W * 0.5 + 90, top: CY + H * 0.3, width: W, height: 220,
          borderRadius: '50%', background: alpha(L.shadow, mix(0.05, 0.2, shadowIn)), filter: 'blur(70px)', opacity: appear,
        }}
      />

      {/* 主角卡：3D 斜放 */}
      <div style={{ position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: `${CX}px ${CY - 120}px` }}>
        <div
          style={{
            position: 'absolute', left: CX - W / 2, top: CY - H / 2, width: W, height: H, opacity: appear,
            transformStyle: 'preserve-3d',
            transform: `translateY(${lift.toFixed(2)}px) rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
          }}
        >
          {/* 金属厚边：8 层叠出约 6px 厚度，越往后越暗 */}
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 0, borderRadius: R,
                transform: `translateZ(${(-(i + 1) * 0.8).toFixed(1)}px)`,
                background: i < 2 ? '#8d877e' : mix(0, 1, i / 7) > 0.5 ? '#2a2826' : '#5c5852',
              }}
            />
          ))}
          {/* 正面 */}
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: R, overflow: 'hidden', // 圆角裁剪：一切光都被卡边裁住
              background: 'linear-gradient(140deg, #2d2b29 0%, #1b1a19 42%, #121110 72%, #1d1c1a 100%)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1.5px 0 rgba(255,255,255,0.16)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, backgroundImage: BRUSH, opacity: 0.6 }} />
            {/* 静态受光：左上主光方向 */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 90% at 12% 0%, rgba(255,240,220,0.09) 0%, rgba(255,240,220,0) 62%)' }} />
            <Chip />
            <Face tone={ENGRAVE} />

            {sweepOn && (
              <>
                {/* 光带下：拉丝纹被照亮（固定在卡面，遮罩随光带走） */}
                <div
                  style={{
                    position: 'absolute', inset: 0, backgroundImage: BRUSH.replace(/0\.05\)/g, '0.22)'), mixBlendMode: 'screen',
                    WebkitMaskImage: bandMask, maskImage: bandMask, WebkitMaskSize: `${2 * W}px 100%`, maskSize: `${2 * W}px 100%`,
                    WebkitMaskPosition: `${bandX.toFixed(1)}px 0`, maskPosition: `${bandX.toFixed(1)}px 0`,
                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                  }}
                />
                {/* 光带下：蚀刻字反光 */}
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    WebkitMaskImage: bandMask, maskImage: bandMask, WebkitMaskSize: `${2 * W}px 100%`, maskSize: `${2 * W}px 100%`,
                    WebkitMaskPosition: `${bandX.toFixed(1)}px 0`, maskPosition: `${bandX.toFixed(1)}px 0`,
                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                  }}
                >
                  <Face tone={LIT} lit />
                </div>
                {/* 宽柔光 + 窄亮芯：screen 叠在钛黑上 */}
                <div
                  style={{
                    position: 'absolute', top: 0, left: bandX, width: 2 * W, height: H, mixBlendMode: 'screen', pointerEvents: 'none',
                    background:
                      'linear-gradient(115deg, transparent 36%, rgba(255,244,228,0.06) 43%, rgba(255,244,228,0.14) 47.5%, rgba(255,248,238,0.5) 50%, rgba(255,244,228,0.14) 52.5%, rgba(255,244,228,0.06) 57%, transparent 64%)',
                  }}
                />
                {/* 上沿发丝线受光 */}
                <div
                  style={{
                    position: 'absolute', left: 0, top: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent ${(topX - 170).toFixed(1)}px, rgba(255,250,240,0.85) ${topX.toFixed(1)}px, transparent ${(topX + 170).toFixed(1)}px)`,
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* 左栏：编辑式标题 */}
      <div style={{ position: 'absolute', left: 150, top: 256, width: 640 }}>
        <div
          style={{
            ...type(24, 700, { caps: true }), color: L.accent, opacity: ramp(frame, 6, 18, EASE.out),
            letterSpacing: `${mix(0.5, 0.28, ramp(frame, 6, 26, EASE.snappy)).toFixed(3)}em`, display: 'flex', alignItems: 'center', gap: 16,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 5, background: L.accent, display: 'inline-block' }} />
          Corvid Reserve
        </div>
        <div style={{ marginTop: 34 }}>
          <TextReveal
            text={'Metal,\nnot plastic.'}
            by="line"
            variant="rise"
            start={12}
            each={24}
            gap={7}
            style={{ ...type(118, 760), letterSpacing: '-0.045em', lineHeight: 1.06, color: L.ink }}
          />
        </div>
        <div
          style={{
            marginTop: 40, ...type(34, 450), lineHeight: 1.38, color: L.ink2,
            opacity: ramp(frame, 30, 18, EASE.out), transform: `translateY(${mix(14, 0, ramp(frame, 30, 22, EASE.snappy)).toFixed(1)}px)`,
          }}
        >
          Laser-etched titanium, 18 grams.
          <br />
          No numbers on the front.
        </div>
        <div
          style={{
            marginTop: 48, display: 'inline-flex', alignItems: 'center', gap: 14, padding: '18px 30px', borderRadius: 999,
            background: L.ink, color: L.surface, ...type(30, 600),
            boxShadow: `0 10px 26px -10px ${alpha(L.shadow, 0.5)}`,
            opacity: cta, transform: `translateY(${mix(22, 0, cta).toFixed(1)}px)`,
          }}
        >
          Request an invite
          <span style={{ color: '#f0a07c' }}>→</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
