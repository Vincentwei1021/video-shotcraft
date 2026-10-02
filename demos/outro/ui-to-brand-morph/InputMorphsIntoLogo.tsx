// input-morphs-into-logo —— slack-promo 40–41s
// 消息输入框（一行文字 + 发送键）点击发送：文字飞走，输入框收缩变形成
// 圆角胶囊；上方依次落下 圆、胶囊、小圆，四粒元素集结排成抽象 logo
// 单瓣（泪滴 + 胶囊的抽象组合，非真 Slack logo），落定呼吸。
// 质感：深梅紫场景加纵向渐变 + 中心柔光 + 暗角 + 颗粒；输入框是暗色磨砂玻璃（发丝亮边 +
// 顶部内高光），morph 时玻璃色直接过渡到实心暖白（不经过半透明灰）；图元是有受光的暖白
// 材质（顶亮底暗渐变 + 带色相的落影）；下落按 spring 速度做拉伸 / 落地压扁 + 纵向拖影；
// 呼吸振幅 20f 内渐入，不在 f108 硬起步。
import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';
import { EASE, FONT, Grain, Vignette, ramp } from '../../_fixtures/Polish';

export const INPUT_MORPHS_INTO_LOGO_DURATION = 140; // 卡片 md：B ~4.7s（140f）

const BG = '#3d1f47'; // 深梅紫
const CX = 960;
const CY = 560;

// 落定后的抽象单瓣布局（横向胶囊在中，上方泪滴圆、右侧胶囊、下方小圆）
// 单瓣 = 主胶囊(输入框变) + 大圆 + 竖胶囊 + 小圆 集结成花瓣角
// 整组 lockup 的光学中心：单瓣外接框中心落在画面中心略偏上（输入框 morph 时顺势下移 50px）
const LX = CX + 35;
const LY = CY + 50;
const FINAL = {
  mainPill: { x: LX - 150, y: LY + 10, w: 300, h: 108, r: 54 }, // 横胶囊
  bigDot: { x: LX - 204, y: LY + 10, d: 108 },                  // 左端圆（与胶囊左帽相切，构成泪滴感）
  vPill: { x: LX + 96, y: LY - 152, w: 108, h: 260, r: 54 },    // 右上竖胶囊
  smallDot: { x: LX + 150, y: LY - 226, d: 76 },                // 竖胶囊顶上的小圆
};

const WHITE = '#fdf6ee';
// 暖白材质：顶部受光、底部微暗；落影带梅紫色相
const MAT = 'linear-gradient(180deg, #fffbf6 0%, #fbf2e7 60%, #f1e4d5 100%)';
const MAT_SHADOW = 'inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -3px 6px rgba(120,80,60,0.10), 0 18px 40px -14px rgba(18,4,24,0.65), 0 0 40px rgba(253,246,238,0.12)';
const GOLD = 'linear-gradient(180deg, #f3cb6a 0%, #e8b84b 55%, #d9a43a 100%)';

// 由 spring 进度求落体的形变：下落中按速度纵向拉伸，落地（速度反向）时压扁；返回 [sx, sy, blurPx]
const squash = (sNow: number, sPrev: number) => {
  const v = (sNow - sPrev) * 260; // 每帧下落像素（-260 → 落位）
  const k = Math.max(-1, Math.min(1, v / 60));
  const sy = 1 + 0.12 * k; // 正速度（向下）拉长，负速度（回弹）压扁
  const sx = 1 - 0.08 * k;
  return [sx, sy, Math.min(6, Math.abs(v) * 0.08)] as const;
};

export const InputMorphsIntoLogo: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // —— 时间轴 ——
  const CLICK = 22;      // 光标按下发送
  const FLY = 26;        // 文字飞走
  const MORPH = 34;      // 输入框开始收缩变形
  const DROPS = [56, 70, 84]; // 大圆 / 竖胶囊 / 小圆 依次落下
  const SETTLE = 108;    // 全部落定，开始呼吸

  // 输入框初始几何
  const box0 = { x: CX - 430, y: CY - 60, w: 860, h: 120, r: 26 };

  // 光标移入 + 点击
  const cursorX = interpolate(f, [0, CLICK], [1500, box0.x + box0.w - 60], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const cursorY = interpolate(f, [0, CLICK], [900, box0.y + 60], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.3, 1),
  });
  const press = f >= CLICK && f <= CLICK + 4 ? 0.82 : 1;
  const cursorGone = 1 - ramp(f, FLY + 4, 8, EASE.out);

  // 发送键按下反馈
  const btnFlash = f >= CLICK && f <= CLICK + 6 ? 1 : 0;

  // 文字飞走：整行向右上飞出 + 加速
  const flyT = interpolate(f, [FLY, FLY + 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic),
  });

  // 输入框 → 主胶囊 morph（五量同一个 spring 驱动，带一点弹性落定）
  const m = spring({ frame: f - MORPH, fps, config: { damping: 13, stiffness: 90, mass: 0.9 } });
  const bx = interpolate(m, [0, 1], [box0.x, FINAL.mainPill.x]);
  const by = interpolate(m, [0, 1], [box0.y, FINAL.mainPill.y - FINAL.mainPill.h / 2 + 60 - 60]);
  const bw = interpolate(m, [0, 1], [box0.w, FINAL.mainPill.w]);
  const bh = interpolate(m, [0, 1], [box0.h, FINAL.mainPill.h]);
  const br = interpolate(m, [0, 1], [box0.r, FINAL.mainPill.r]);
  // 玻璃 → 实心暖白：前 40% 进度就填实（避免半透明灰的中间态），描边随之隐去
  const fill = Math.min(1, Math.max(0, m / 0.4));

  // 三粒元素依次从画外上方落下（spring 落定，带轻微过冲）
  const dropSpring = (i: number, fr: number) =>
    spring({ frame: fr - DROPS[i], fps, config: { damping: 12, stiffness: 110, mass: 0.85 } });

  // 落定呼吸：整瓣轻微 scale 脉动（振幅 20f 内渐入）
  const breatheAmp = 0.03 * ramp(f, SETTLE, 20, EASE.smooth);
  const breathe = f >= SETTLE ? 1 + breatheAmp * Math.sin((f - SETTLE) * 0.18) : 1;

  const dropY = (finalY: number, s: number) => interpolate(s, [0, 1], [-260, finalY]);

  const drops = [0, 1, 2].map((i) => {
    const s = dropSpring(i, f);
    const sp = dropSpring(i, f - 1);
    return { s, def: squash(s, sp) };
  });

  // 图元公共样式：形变原点钉底部（拉伸 / 压扁都以落点为基准）
  const piece = (
    i: number, left: number, top: number, w: number, h: number, r: number | string, bg: string, shadow: string,
  ): React.CSSProperties => {
    const [sx, sy, blur] = drops[i].def;
    return {
      position: 'absolute', left, top, width: w, height: h, borderRadius: r, background: bg, boxShadow: shadow,
      transform: `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`, transformOrigin: '50% 100%',
      filter: blur > 0.3 ? `blur(${(blur * 0.25).toFixed(2)}px)` : undefined,
    };
  };

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT.sans, overflow: 'hidden' }}>
      {/* 场景：纵向渐变 + 中心柔光（不再是死平的梅紫） */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #47254f 0%, #3d1f47 50%, #2f1738 100%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 48% 52% at 50% 48%, rgba(255,214,236,0.12) 0%, rgba(255,214,236,0.03) 50%, rgba(0,0,0,0) 72%)' }} />

      <AbsoluteFill style={{ transform: `scale(${breathe})`, transformOrigin: `${LX}px ${LY - 40}px` }}>
        {/* 主体：输入框 → 主胶囊 */}
        <div
          style={{
            position: 'absolute',
            left: bx,
            top: by,
            width: bw,
            height: bh,
            borderRadius: br,
            border: `1.5px solid rgba(253,246,238,${(0.55 * (1 - fill)).toFixed(3)})`,
            background: MAT,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px 0 38px',
            overflow: 'hidden',
            boxShadow: `inset 0 2px 0 rgba(255,255,255,${(0.18 + 0.72 * fill).toFixed(3)}), 0 18px 40px -14px rgba(18,4,24,0.65), 0 0 40px rgba(253,246,238,${(0.12 * fill).toFixed(3)})`,
          }}
        >
          {/* 磨砂玻璃面（不透明的"玻璃色"盖在暖白材质上，随 fill 揭开——中途是暖色过渡而非半透明灰） */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 1 - fill,
            background: 'linear-gradient(180deg, #553560 0%, #4a2b54 100%)',
          }} />
          {/* 一行文字（发送后飞走） */}
          <div
            style={{
              position: 'relative',
              fontSize: 44,
              fontWeight: 450,
              letterSpacing: '-0.015em',
              color: WHITE,
              whiteSpace: 'nowrap',
              opacity: (1 - flyT) * (1 - m),
              transform: `translate(${flyT * 700}px, ${-flyT * 380}px) rotate(${-flyT * 10}deg)`,
              filter: flyT > 0.2 ? `blur(${(flyT * 4).toFixed(2)}px)` : undefined,
            }}
          >
            Ready, set, go!
            {/* 光标闪烁 */}
            <span style={{ fontWeight: 300, marginLeft: 2, color: '#f3cb6a', opacity: Math.floor(f / 8) % 2 === 0 && f < FLY ? 1 : 0 }}>|</span>
          </div>
          {/* 发送键 */}
          <div
            style={{
              position: 'relative',
              marginLeft: 'auto',
              width: 72,
              height: 72,
              borderRadius: 20,
              background: btnFlash ? '#ffffff' : 'linear-gradient(180deg, #fffaf3 0%, #f2e6d8 100%)',
              boxShadow: btnFlash
                ? '0 0 0 6px rgba(255,255,255,0.18), 0 0 30px rgba(255,255,255,0.5)'
                : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 16px -6px rgba(18,4,24,0.6)',
              opacity: 1 - Math.min(1, m * 1.6),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${press})`,
              flexShrink: 0,
            }}
          >
            {/* 纸飞机三角 */}
            <svg width={32} height={32} viewBox="0 0 34 34">
              <path d="M3 17 L31 4 L20 30 L15 19 Z" fill={BG} stroke={BG} strokeWidth={1.5} strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* 大圆（第一粒，落在主胶囊左端形成泪滴组合） */}
        {f >= DROPS[0] && (
          <div style={piece(0, FINAL.bigDot.x - FINAL.bigDot.d / 2, dropY(FINAL.bigDot.y - FINAL.bigDot.d / 2, drops[0].s),
            FINAL.bigDot.d, FINAL.bigDot.d, '50%', MAT, MAT_SHADOW)} />
        )}

        {/* 竖胶囊（第二粒） */}
        {f >= DROPS[1] && (
          <div style={piece(1, FINAL.vPill.x - FINAL.vPill.w / 2, dropY(FINAL.vPill.y - FINAL.vPill.h / 2, drops[1].s),
            FINAL.vPill.w, FINAL.vPill.h, FINAL.vPill.r, MAT, MAT_SHADOW)} />
        )}

        {/* 小圆（第三粒，压在竖胶囊顶端旁）：金色是全片唯一的强调色 */}
        {f >= DROPS[2] && (
          <div style={piece(2, FINAL.smallDot.x - FINAL.smallDot.d / 2, dropY(FINAL.smallDot.y - FINAL.smallDot.d / 2, drops[2].s),
            FINAL.smallDot.d, FINAL.smallDot.d, '50%', GOLD,
            'inset 0 2px 0 rgba(255,240,200,0.8), inset 0 -3px 6px rgba(120,70,10,0.18), 0 14px 30px -10px rgba(18,4,24,0.6), 0 0 36px rgba(232,184,75,0.32)')} />
        )}
      </AbsoluteFill>

      {/* 光标 */}
      <div
        style={{
          position: 'absolute',
          left: cursorX,
          top: cursorY,
          opacity: cursorGone,
          transform: `scale(${press})`,
          transformOrigin: '4px 2px',
          zIndex: 50,
          filter: 'drop-shadow(0 4px 8px rgba(18,4,24,0.45))',
        }}
      >
        <svg width={40} height={44} viewBox="0 0 40 44">
          <path
            d="M4 2 L4 34 L13 26 L19 40 L26 37 L20 23 L32 22 Z"
            fill="#ffffff"
            stroke={BG}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <Vignette strength={0.5} inner={0.42} color="#12051a" />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
