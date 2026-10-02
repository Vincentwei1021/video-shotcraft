// card-footage-cadence｜字卡穿插节奏
// UI 镜头 ↔ 黑底字卡像对话接拍：0–14f UI A 缓推 → 硬切 8f 字卡 SHIP →
// 硬切 12f UI B 1.6x 裁切缓移 → 8f 字卡 FASTER → 10f UI A 2x 裁切 →
// 10f 字卡 TODAY(下划线) → 62f 硬切收尾全景定格。
// UI 段全部带微动（推/移），字卡段除落定微缩(1.05→1, out-cubic)外全静，
// 动↔静对比即手法本体。所有切换零过渡（条件挂载，无 crossfade）。
// 收尾 62–105f 轻推收完，105–150f 真静止 45f ≥ 40f。帧确定，无随机。
// 质感：UI 段裁切放大走 CSS zoom（布局级，按目标尺寸栅格化，1.6x/2x 下字边锐利），
// 段内微推/横移走 transform；三段裁切各对准一块真实内容（全景 / 列表前三行 / Active users 指标）；
// 字卡是冷调近黑 + 中心柔光 + 暗角 + 颗粒（不是死平 #0d0d0d），字用系统字体 800 收紧字距、
// 近白不用纯白，TODAY 的下划线是全片唯一一笔强调色；收尾全景 105f 起颗粒冻结，帧级真静止。
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const CARD_FOOTAGE_CADENCE_DURATION = 150; // 六段对话 62f + 收尾推 43f + 真静止 45f

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const END_PUSH = 105; // 收尾推近结束帧

// 黑底白字字卡：落定微缩 1.05→1（out-cubic，段内前 5f 完成），其余全静
const TitleCard: React.FC<{ text: string; local: number; underline?: boolean }> = ({
  text,
  local,
  underline = false,
}) => {
  const scale = interpolate(local, [0, 5], [1.05, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse 70% 62% at 50% 46%, #1b1d25 0%, #0e0f13 62%, #08090b 100%)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
        }}
      >
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 800,
            fontSize: 184,
            color: '#f2f3f7',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {text}
        </div>
        {underline && (
          <div
            style={{
              width: 560,
              height: 14,
              borderRadius: 7,
              background: `linear-gradient(90deg, #7c84f0 0%, ${G.accent} 100%)`,
              boxShadow: '0 0 28px rgba(124,132,240,0.35)',
            }}
          />
        )}
      </div>
      <Vignette strength={0.5} inner={0.4} color="#000000" />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};

// UI 镜头：base 倍率走 CSS zoom 并把对焦点推到屏幕中心；段内微动走外层 transform
const UiShot: React.FC<{
  variant: 'A' | 'B';
  zoom?: number;
  cx?: number;
  cy?: number;
  transform?: string;
}> = ({ variant, zoom = 1, cx = 960, cy = 540, transform }) => (
  <AbsoluteFill style={{ overflow: 'hidden', background: G.canvas }}>
    <AbsoluteFill style={{ transform, transformOrigin: '50% 50%' }}>
      <div
        style={{
          position: 'absolute',
          // zoom 连自身 left/top 一起放大：left = 960/z − cx ⇒ 对焦点落屏幕中心
          left: 960 / zoom - cx,
          top: 540 / zoom - cy,
          width: 1920,
          height: 1080,
          zoom,
        }}
      >
        <FakeDashboard variant={variant} />
      </div>
    </AbsoluteFill>
    <Vignette strength={0.16} inner={0.52} color="#1a1c24" />
  </AbsoluteFill>
);

export const CardFootageCadence: React.FC = () => {
  const frame = useCurrentFrame();

  // UI 段颗粒：收尾推完（105f）起冻结，保证尾段帧级真静止
  const grain = (
    <Freeze frame={END_PUSH} active={frame >= END_PUSH}>
      <Grain opacity={0.045} />
    </Freeze>
  );

  // ---- 分段：切点 14 / 22 / 34 / 42 / 52 / 62，总长 150 ----

  // 段1 0–14f：UI A 全景缓推 1.0→1.08（ease-in：越推越快，一口气撞进第一张字卡）
  if (frame < 14) {
    const s = interpolate(frame, [0, 14], [1, 1.08], { ...CLAMP, easing: Easing.in(Easing.quad) });
    return (
      <AbsoluteFill>
        <UiShot variant="A" transform={`scale(${s})`} />
        {grain}
      </AbsoluteFill>
    );
  }

  // 段2 14–22f：字卡 SHIP
  if (frame < 22) {
    return <TitleCard text="SHIP" local={frame - 14} />;
  }

  // 段3 22–34f：UI B 1.6x 裁切（对准列表前三行的标题与状态）+ 横向缓移 192px（屏上）
  if (frame < 34) {
    const tx = interpolate(frame - 22, [0, 12], [96, -96], CLAMP);
    return (
      <AbsoluteFill>
        <UiShot variant="B" zoom={1.6} cx={800} cy={330} transform={`translateX(${tx}px)`} />
        {grain}
      </AbsoluteFill>
    );
  }

  // 段4 34–42f：字卡 FASTER
  if (frame < 42) {
    return <TitleCard text="FASTER" local={frame - 34} />;
  }

  // 段5 42–52f：UI A 另一处 2x 裁切（左上 Active users 指标 + 曲线）+ 继续缓推 2.0→2.14
  if (frame < 52) {
    const s = interpolate(frame - 42, [0, 10], [1, 1.07], CLAMP);
    return (
      <AbsoluteFill>
        <UiShot variant="A" zoom={2} cx={600} cy={320} transform={`scale(${s})`} />
        {grain}
      </AbsoluteFill>
    );
  }

  // 段6 52–62f：字卡 TODAY + 下划线
  if (frame < 62) {
    return <TitleCard text="TODAY" local={frame - 52} underline />;
  }

  // 段7 62–150f：收尾全景 UI 定格。62–105f 极缓推收完（out-cubic），
  // 105f 后 transform 值恒为 1.02，105–150f 真静止 45f。
  const s = interpolate(frame, [62, END_PUSH], [1, 1.02], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill>
      <UiShot variant="B" transform={`scale(${s})`} />
      {grain}
    </AbsoluteFill>
  );
};
