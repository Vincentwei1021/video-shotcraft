import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';

// split-flap-flip：机场翻牌字。每字符一个深底翻牌格（上下两半），
// 逐格翻过 3 个乱码中间态后咔哒停在目标字，左→右 4f 级联成波。
// 节拍：0–21 建立（整排乱码静止）→ 22 起级联翻牌 → 78 全部停定 → 静止到 140。
//
// 质感升级：
// - 翻牌格装进一块石墨色显示屏外壳（内凹槽 + 发丝高光沿 + 两层落地阴影），"纸面上摆了一块机械屏"。
// - 叶片材质：上半叶自上而下微亮→暗、下半叶反向，铰链处 1px 暗缝 + 下沿高光，左右两颗转轴销钉。
// - 上半叶掉落时在下半静态叶上投一层随角度加深的阴影；快速段叶片加轻微竖向模糊。
// - 背景产品画面虚化 + 压暗降饱和让位，暗角收边；全程极缓推近 1→1.03（smooth）。
export const SPLIT_FLAP_FLIP_DURATION = 140;

const TEXT = 'SHIP FASTER';
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&';
const START = 22; // 级联起始帧
const STAGGER = 4; // 字符间级联延迟
const FLIP = 5; // 单次翻牌时长
const NFLIP = 3; // 每字符翻 3 次（2 个乱码中间态 + 1 次落到目标字）
const CELL_W = 118;
const CELL_H = 156;
const R = 10;

// seed 正弦哈希（禁 Math.random）
const rnd = (a: number) => {
  const x = Math.sin(a * 127.3) * 43758.5453;
  return x - Math.floor(x);
};
const garble = (i: number, k: number) =>
  CHARSET[Math.floor(rnd(i * 7.13 + k * 3.71 + 1) * CHARSET.length)];

const FLAP_INK = '#f2f1ec'; // 略暖的象牙白字
// 上半叶：顶部受光略亮 → 铰链处略暗；下半叶：铰链处略亮 → 底部更暗（主光在上）
const TOP_BG = 'linear-gradient(180deg, #34353a 0%, #2a2b30 100%)';
const BOT_BG = 'linear-gradient(180deg, #2c2d32 0%, #222327 100%)';

// 半格：上/下半各自 overflow hidden，内部整字定位错半格露出对应一半
const Half: React.FC<{ ch: string; part: 'top' | 'bottom'; shade?: number }> = ({ ch, part, shade = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: part === 'top' ? 0 : CELL_H / 2,
      width: CELL_W,
      height: CELL_H / 2,
      overflow: 'hidden',
      background: part === 'top' ? TOP_BG : BOT_BG,
      borderRadius: part === 'top' ? `${R}px ${R}px 0 0` : `0 0 ${R}px ${R}px`,
      boxShadow:
        part === 'top'
          ? 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.5)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.35)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: part === 'top' ? 0 : -CELL_H / 2,
        width: CELL_W,
        height: CELL_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: 100,
        letterSpacing: '-0.02em',
        color: FLAP_INK,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {ch}
    </div>
    {/* 投影：掉落中的上半叶遮住光线，下半静态叶随角度变暗 */}
    {shade > 0.005 && (
      <div style={{ position: 'absolute', inset: 0, background: `rgba(6,7,9,${shade.toFixed(3)})` }} />
    )}
  </div>
);

const FlapCell: React.FC<{ target: string; i: number; frame: number }> = ({ target, i, frame }) => {
  // 该格的字符序列：2 个乱码 → 1 个乱码 → 目标字（首态也是乱码，建立段可见）
  const seq = [garble(i, 0), garble(i, 1), garble(i, 2), target];
  const local = frame - (START + i * STAGGER);
  const done = local >= NFLIP * FLIP;

  // 停定咔哒：整格下沉回弹（1px 肉眼无感，放大到 6px 才有"咔哒"）
  const clickY = done
    ? interpolate(local, [15, 17, 19, 22], [0, 6, -1.5, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad),
      })
    : 0;

  let topCh = seq[0];
  let bottomCh = seq[0];
  let bottomShade = 0;
  let flap: React.ReactNode = null;

  if (done) {
    topCh = target;
    bottomCh = target;
  } else if (local > 0) {
    const k = Math.min(NFLIP - 1, Math.floor(local / FLIP));
    const from = seq[k];
    const to = seq[k + 1];
    const x = (local - k * FLIP) / FLIP;
    const p = Easing.in(Easing.quad)(x); // 重力感：越掉越快
    topCh = to; // 上半静态：翻开后露出下一字符的上半
    bottomCh = from; // 下半静态：保持旧字符直到活动叶盖下来
    // 快速段竖向模糊（随加速度增长，叶片静止时为 0）
    const mb = 1.6 * x;
    if (p < 0.5) {
      // 前半程：旧字符上半叶 0→-90 掉下；下半静态叶被它的影子逐渐罩住
      const deg = p * 2 * 90;
      bottomShade = 0.42 * p * 2;
      flap = (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateX(${-deg}deg)`,
            transformOrigin: `center ${CELL_H / 2}px`,
            backfaceVisibility: 'hidden',
            filter: `brightness(${(1 - p * 2 * 0.45).toFixed(3)})${mb > 0.3 ? ` blur(${(mb * 0.6).toFixed(2)}px)` : ''}`,
            zIndex: 2,
          }}
        >
          <Half ch={from} part="top" />
        </div>
      );
    } else {
      // 后半程：新字符下半叶 90→0 拍下盖住旧下半；影子随叶片贴合而退
      const deg = 90 - (p - 0.5) * 2 * 90;
      bottomShade = 0.42 * (1 - (p - 0.5) * 2);
      flap = (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateX(${deg}deg)`,
            transformOrigin: `center ${CELL_H / 2}px`,
            backfaceVisibility: 'hidden',
            filter: `brightness(${(0.55 + (p - 0.5) * 2 * 0.45).toFixed(3)})${mb > 0.3 ? ` blur(${mb.toFixed(2)}px)` : ''}`,
            zIndex: 2,
          }}
        >
          <Half ch={to} part="bottom" />
        </div>
      );
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: CELL_W,
        height: CELL_H,
        transform: `translateY(${clickY}px)`,
        perspective: 420,
        borderRadius: R,
        boxShadow: '0 1px 0 rgba(255,255,255,0.05), 0 2px 3px rgba(0,0,0,0.45), 0 8px 14px -6px rgba(0,0,0,0.5)',
      }}
    >
      <Half ch={topCh} part="top" />
      <Half ch={bottomCh} part="bottom" shade={bottomShade} />
      {flap}
      {/* 中缝铰链：2px 暗缝 + 下沿 1px 高光 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: CELL_H / 2 - 1.5,
          width: CELL_W,
          height: 3,
          background: 'linear-gradient(180deg, #0b0b0d 0%, #0b0b0d 66%, rgba(255,255,255,0.07) 100%)',
          zIndex: 3,
        }}
      />
      {/* 左右转轴销钉 */}
      {[-3, CELL_W - 3].map((x) => (
        <div
          key={x}
          style={{
            position: 'absolute',
            left: x,
            top: CELL_H / 2 - 7,
            width: 6,
            height: 14,
            borderRadius: 2,
            background: 'linear-gradient(180deg, #4a4b51 0%, #26272b 100%)',
            boxShadow: '0 1px 1px rgba(0,0,0,0.6)',
            zIndex: 4,
          }}
        />
      ))}
    </div>
  );
};

export const SplitFlapFlip: React.FC = () => {
  const frame = useCurrentFrame();
  let letterIdx = 0;
  // 全程极缓推近（smooth：起止速度为 0）
  const push = mix(1, 1.03, ramp(frame, 0, SPLIT_FLAP_FLIP_DURATION, EASE.smooth));
  return (
    <AbsoluteFill style={{ background: '#e9e9e6', overflow: 'hidden' }}>
      {/* 背景假页面：虚化 + 压暗降饱和，给翻牌屏让位 */}
      <div
        style={{
          position: 'absolute',
          inset: -24,
          opacity: 0.55,
          filter: 'blur(6px) saturate(0.6) brightness(0.96)',
          transform: `scale(${(push * 1.02).toFixed(4)})`,
        }}
      >
        <div style={{ position: 'absolute', left: 24, top: 24 }}>
          <FakeDashboard variant="A" />
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(233,233,230,0.35)' }} />
      <Vignette strength={0.28} inner={0.4} color="#2a2c36" />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${push.toFixed(4)})` }}>
        {/* 显示屏外壳：石墨色、内凹槽、上沿高光、两层落地阴影 */}
        <div
          style={{
            padding: '30px 34px',
            borderRadius: 24,
            background: 'linear-gradient(180deg, #1d1e22 0%, #141518 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 6px rgba(0,0,0,0.25), ' +
              '0 2px 4px rgba(16,18,26,0.25), 0 30px 60px -20px rgba(16,18,26,0.55)',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {TEXT.split('').map((ch, idx) => {
              if (ch === ' ') {
                return <div key={idx} style={{ width: 52 }} />;
              }
              const i = letterIdx++;
              return <FlapCell key={idx} target={ch} i={i} frame={frame} />;
            })}
          </div>
        </div>
      </AbsoluteFill>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
