// 落拍黑场爆开（drop-blackout-slam）——EDM concert blackout 的节奏手法：
// 帧 0–49:假面板正常"播放"(scale 呼吸 1.0↔1.02)+顶栏"正在播放"胶囊的电平条每 12f 跳一拍;
// 帧 50–61:一帧切纯黑 #0c0c0c,整整 12f 死寂,屏上完全无物(蓄力全靠这一拍静默);
// 帧 62:白色大标题 "DROP" 从 scale 1.35 撞到 1.0(5f ease-out),同帧整屏
// 10px 震屏指数衰减(τ≈2.5f,约 12f 收干),底色变深色舞台并从中心泛出一圈
// 快速消散的冲击环;帧 ~82 起全静止到 130,收尾 ≥40f 真静止。
// 质感：爆入三件事同帧起爆之外，再给一帧中心泛白的曝光冲击 + 标题向外的缩放拖影；
// 舞台是带色相的深色径向渐变 + 标题背后的靛蓝余光 + 暗角 + 颗粒，冲击环是"细亮芯 + 柔光晕"
// 而非 10px 实线圈；标题渐变字面 + 眉题副句落定，不再是 Helvetica 平涂白字压 #2f2f2f 灰底。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, Vignette, mix, ramp, tracking } from '../../_fixtures/Polish';

export const DROP_BLACKOUT_SLAM_DURATION = 130; // 铺垫 50f + 黑场 12f + 爆入 / 落定 68f

// 帧确定伪随机(硬规矩:禁 Math.random)
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const BLACK_IN = 50; // 切黑帧
const SLAM = 62; // 爆入帧
const BEAT = 12; // 铺垫段节拍周期

// 顶栏"正在播放"胶囊：四根电平条每拍被敲一下、各自错 1f 衰减（拍点可感，但只动元素层）
const NowPlaying: React.FC<{ f: number }> = ({ f }) => {
  const phase = f % BEAT;
  const bars = [0.55, 1, 0.75, 0.4].map((amp, k) => {
    const p = phase - k * 0.8; // 逐条错峰
    const env = p < 0 ? Math.exp(-(p + BEAT) / 3) : Math.exp(-p / 3);
    return 6 + 18 * amp * env;
  });
  const dot = Math.exp(-phase / 2.5);
  return (
    <div style={{
      position: 'absolute', left: 1006, top: 17, height: 38, padding: '0 16px 0 12px', borderRadius: 19,
      display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', fontFamily: FONT.sans,
      border: `1px solid ${G.hairlineStrong}`, boxShadow: '0 1px 2px rgba(16,18,24,0.06)', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 24, width: 24 }}>
        {bars.map((b, k) => (
          <div key={k} style={{ width: 4, height: b, borderRadius: 2, background: G.accent }} />
        ))}
      </div>
      <span style={{ fontSize: 14, fontWeight: 550, color: G.ink1, whiteSpace: 'nowrap' }}>Live session</span>
      <span style={{ fontSize: 14, color: G.ink3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>150 BPM</span>
      <div style={{
        width: 8, height: 8, borderRadius: 4, background: '#e5484d',
        boxShadow: `0 0 0 ${(4 * dot).toFixed(2)}px rgba(229,72,77,${(0.22 * dot).toFixed(3)})`,
      }} />
    </div>
  );
};

export const DropBlackoutSlam: React.FC = () => {
  const f = useCurrentFrame();

  // ===== 段 1:帧 0–49 正常播放 =====
  if (f < BLACK_IN) {
    // scale 呼吸 1.0↔1.02,周期 48f(正弦,起止平滑)
    const breathe = 1.01 + 0.01 * Math.sin((f / 48) * Math.PI * 2);
    return (
      <div style={{ width: 1920, height: 1080, background: G.canvas, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${breathe})`, transformOrigin: '50% 50%' }}>
          <FakeDashboard variant="B" />
          <NowPlaying f={f} />
        </div>
        <Vignette strength={0.14} inner={0.55} color="#1a1c24" />
        <Grain opacity={0.045} />
      </div>
    );
  }

  // ===== 段 2:帧 50–61 纯黑死寂,屏上完全无物 =====
  if (f < SLAM) {
    return <div style={{ width: 1920, height: 1080, background: '#0c0c0c' }} />;
  }

  // ===== 段 3:帧 62 起爆入 =====
  const t = f - SLAM;

  // 标题:scale 1.35 → 1.0,5f 强 ease-out
  const slamScale = mix(1.35, 1, ramp(t, 0, 5, EASE.snappy));
  // 缩放拖影:前 4f 两层向外放大的残影,模拟撞入的径向模糊
  const trail = t < 4 ? 1 - t / 4 : 0;

  // 震屏:10px 指数衰减,τ≈2.5f,~12f 收干;t≥14 强制归零保证结尾真静止
  const amp = t >= 14 ? 0 : 10 * Math.exp(-t / 2.5);
  const shakeX = amp === 0 ? 0 : (h(f * 3.7 + 1) - 0.5) * 2 * amp;
  const shakeY = amp === 0 ? 0 : (h(f * 7.1 + 2) - 0.5) * 2 * amp;

  // 冲击环:从中心快速扩散并消散,~16f 走完(t≥16 后不再画);越扩越细越淡
  const ringR = interpolate(t, [0, 16], [80, 900], {
    easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const ringOpacity = interpolate(t, [0, 3, 16], [0.85, 0.55, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const ringW = mix(6, 1.5, ramp(t, 0, 16, EASE.out));

  // 曝光冲击:爆入帧中心泛白,6f 收回
  const bloom = 1 - ramp(t, 0, 6, EASE.out);
  // 标题背后的靛蓝余光:爆开时满,落定到 0.55 常驻
  const halo = mix(1, 0.55, ramp(t, 0, 18, EASE.out));
  // 眉题副句:标题落定后 t=8–20 从下方 16px 浮上
  const sub = ramp(t, 8, 12, EASE.out);

  const word = (scale: number, opacity: number, key: string) => (
    <div key={key} style={{
      position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', opacity,
    }}>
      <div style={{
        fontFamily: FONT.sans, fontWeight: 800, fontSize: 340, lineHeight: 1, letterSpacing: '-0.045em',
        transform: `translateY(-30px) scale(${scale})`,
        backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #ffffff 45%, #cfd3f4 100%)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        filter: 'drop-shadow(0 0 40px rgba(110,120,255,0.28))',
      }}>
        DROP
      </div>
    </div>
  );

  return (
    <div style={{ width: 1920, height: 1080, background: '#0b0c11', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: -20, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        {/* 舞台:带色相的深色径向渐变 + 标题背后的靛蓝余光 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 65% at 50% 48%, #1d2033 0%, #12131c 55%, #0b0c11 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: halo,
          background: 'radial-gradient(ellipse 38% 30% at 50% 47%, rgba(91,99,211,0.42) 0%, rgba(91,99,211,0.12) 50%, rgba(91,99,211,0) 100%)',
        }} />
        {/* 冲击环:细亮芯 + 柔光晕(t≥16 不再画) */}
        {t < 16 && (
          <div style={{
            position: 'absolute', left: 980 - ringR, top: 560 - ringR, width: ringR * 2, height: ringR * 2,
            borderRadius: '50%', boxSizing: 'border-box', opacity: ringOpacity,
            border: `${ringW.toFixed(2)}px solid rgba(232,234,255,0.95)`,
            boxShadow: '0 0 36px 6px rgba(120,130,255,0.45), inset 0 0 36px 6px rgba(120,130,255,0.35)',
          }} />
        )}
        <div style={{ position: 'absolute', left: 20, top: 20, width: 1920, height: 1080 }}>
          {trail > 0 && word(slamScale * 1.12, 0.16 * trail, 'trail2')}
          {trail > 0 && word(slamScale * 1.05, 0.3 * trail, 'trail1')}
          {word(slamScale, 1, 'main')}
          {/* 眉题副句:落定后浮上,收住"这是发布口号" */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center',
            fontFamily: FONT.sans, fontSize: 34, fontWeight: 600, letterSpacing: tracking(34, true),
            color: 'rgba(226,229,255,0.62)', textTransform: 'uppercase',
            opacity: sub, transform: `translateY(${mix(16, 0, sub)}px)`,
          }}>
            The new release · Out now
          </div>
        </div>
      </div>
      {/* 曝光冲击:中心泛白,四周保留暗部 */}
      {bloom > 0.01 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.55 * bloom,
          background: 'radial-gradient(ellipse 60% 55% at 50% 48%, #ffffff 0%, rgba(220,224,255,0.5) 45%, rgba(220,224,255,0) 100%)',
        }} />
      )}
      <Vignette strength={0.5} inner={0.4} color="#000000" />
      <Grain opacity={0.1} blend="soft-light" />
    </div>
  );
};
