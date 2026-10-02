// row-embed —— 内容行从空中降下、rotateX 收平、嵌入瞬间底边亮强调色缝
// "结构化数据长进页面"的详情页/列表镜头。参考实现从 template SceneDetail 剥离：
// 行按节拍逐条从上空飞入（perspective translateY(−120·air) + rotateX(16°·air) +
// scale 略过冲后 press 回弹），行位先盖页面底色补丁占位、落地后消失让纹理透出，
// 嵌入瞬间行底边 2px 强调色缝从中心向两侧展开后淡出，相机同时缓缓下摇。
// 节拍（质感改版）：cue = 12/22/31/39/46（间隔 10→7 递减，行雨越落越快），飞行 12f，
// 末行 58f 落地、强调色缝 66f 收尾 ≤ 镜头 68f 预算。
// 飞行体 = 整页截图 backgroundImage 负偏移裁片（Q1：裁片不重绘内容）。
// 质感改版要点：
// - 空槽补丁取页面真实底色 #f9f6f1（原 #fdfcfa 偏白，五个槽位读成一整块白板），并画一道
//   极淡的槽位虚线框——观众看得见"这里有个空位在等"，落地就是"扣进去"（Q9）；
// - 下落改为"加速砸进槽位"（末段仍有速度）+ press 回弹，飞行段按速度加纵向运动模糊；
// - 槽位接触影随行接近而收紧变实（近地小而实），离地时是大而虚的环境影；
// - 相机取景改为全程被页面铺满（原起点露出页顶外空白、终点露出页底外 160px 空白）。
import React from 'react';
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import { Grain, Vignette } from '../../_fixtures/Polish';
import layout from '../../_textures/live-layout.json';

export const ROW_EMBED_DURATION = 68;

const DETAIL_H = layout.detail.pageH;
const rows = layout.detail.rows;
const PAGE_BG = '#f9f6f1'; // 截图里内容区的真实底色（逐像素采样）

// 起点 cy=500@1.12：页顶刚好出画；终点 cy=740@1.25：边下摇边微推近，页底贴住画框下沿，
// 画框上沿落在「编辑元数据」分隔线与「项目资料」之间（不切半行字）
const DETAIL_CAM: CamKey2D[] = [
  { frame: 0, cx: 960, cy: 500, zoom: 1.12 },
  { frame: 68, cx: 960, cy: 740, zoom: 1.25 },
];

const CUES = [12, 22, 31, 39, 46];
const FLY = 12;
// 下落：起步慢、末段仍带速度砸进槽位（终点斜率≈1.25），由 press 回弹吸收冲击
const FLY_EASE = Easing.bezier(0.5, 0, 0.8, 0.75);
const detailSrc = staticFile('textures/live/detail-full.png');
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const airOf = (frame: number, cue: number) => 1 - interpolate(frame, [cue, cue + FLY], [0, 1], { ...clamp, easing: FLY_EASE });

export const RowEmbed: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <PageCam2D src="textures/live/detail-full.png" pageH={DETAIL_H} keys={DETAIL_CAM} bg={PAGE_BG}>
        {rows.map((r, i) => {
          const cue = CUES[i];
          const land = cue + FLY;

          // 空槽补丁（真实底色）+ 虚线槽位框，落地后 2f 消失
          const patchOpacity = interpolate(frame, [land, land + 2], [1, 0], clamp);
          // 槽位框在行飞来时略微提亮（"这里"），落地即随补丁消失
          const slotHint = interpolate(frame, [cue - 6, cue + 4], [0.55, 1], clamp);

          // flying row: texture-crop dropping in from the air
          let flyer: React.ReactNode = null;
          let contact: React.ReactNode = null;
          if (frame >= cue && frame < land + 4) {
            const air = airOf(frame, cue);
            const p = 1 - air;
            const appear = interpolate(frame, [cue, cue + 3], [0, 1], clamp);
            const scale =
              frame < land
                ? 1.06 - 0.065 * p
                : interpolate(frame, [land, land + 4], [0.995, 1], { ...clamp, easing: Easing.out(Easing.quad) });
            // 纵向速度（页面 px/帧）→ 运动模糊，落地为 0
            const vy = 120 * (airOf(frame - 0.5, cue) - airOf(frame + 0.5, cue));
            const mb = frame < land ? Math.min(3.2, vy * 0.22) : 0;
            flyer = (
              <div
                key={`row-${i}`}
                style={{
                  position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h,
                  opacity: appear, zIndex: 3, pointerEvents: 'none',
                  transform: `perspective(900px) translateY(${(-120 * air).toFixed(2)}px) rotateX(${(16 * air).toFixed(3)}deg) scale(${scale.toFixed(4)})`,
                  filter: mb > 0.25 ? `url(#row-mb-${i})` : undefined,
                }}
              >
                {mb > 0.25 && (
                  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                    <filter id={`row-mb-${i}`} x="-5%" y="-30%" width="110%" height="160%">
                      <feGaussianBlur stdDeviation={`0 ${mb.toFixed(2)}`} />
                    </filter>
                  </svg>
                )}
                <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff',
                    backgroundImage: `url(${detailSrc})`,
                    backgroundSize: `1920px ${DETAIL_H}px`,
                    backgroundPosition: `-${r.x}px -${r.y}px`,
                    // 两层影：离地时大而虚的环境影 + 随高度变淡的近地影；顶部 1px 受光
                    boxShadow:
                      `inset 0 1px 0 rgba(255,255,255,${(0.9 * air).toFixed(3)}), ` +
                      `0 0 0 1px rgba(60,45,25,${(0.07 * air).toFixed(3)}), ` +
                      `0 ${(34 * air).toFixed(1)}px ${(64 * air).toFixed(1)}px -${(10 * air).toFixed(1)}px rgba(40,30,18,${(0.24 * air).toFixed(3)}), ` +
                      `0 ${(6 * air).toFixed(1)}px ${(14 * air).toFixed(1)}px rgba(40,30,18,${(0.1 * air).toFixed(3)})`,
                  }}
                />
              </div>
            );
            // 槽位接触影：行越近越实越小（落地前 4f 最浓），落地后 3f 淡掉
            const near = interpolate(air, [0, 0.5], [1, 0], clamp);
            const contactOp = frame < land ? near * 0.5 : interpolate(frame, [land, land + 3], [0.5, 0], clamp);
            contact = (
              <div
                key={`contact-${i}`}
                style={{
                  position: 'absolute', left: r.x + 10, top: r.y + 6, width: r.w - 20, height: r.h - 6, borderRadius: 10,
                  boxShadow: `0 ${(2 + 6 * air).toFixed(1)}px ${(6 + 18 * air).toFixed(1)}px rgba(60,42,20,${(0.22 * contactOp).toFixed(3)})`,
                  zIndex: 2, pointerEvents: 'none',
                }}
              />
            );
          }

          // embed flash: 2px amber seam at the row's bottom edge, expanding from
          // the center on touchdown, then fading out（两端羽化，裁在行宽内）
          let seam: React.ReactNode = null;
          if (frame >= land && frame < land + 8) {
            const spread = interpolate(frame, [land, land + 5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
            const seamOpacity = interpolate(frame, [land, land + 2, land + 8], [1, 1, 0], clamp);
            const seamW = r.w * spread;
            seam = (
              <div
                key={`seam-${i}`}
                style={{
                  position: 'absolute',
                  left: r.x + (r.w - seamW) / 2,
                  top: r.y + r.h - 2,
                  width: seamW, height: 2, borderRadius: 1,
                  background:
                    'linear-gradient(90deg, rgba(196,120,40,0) 0%, oklch(60% 0.14 62) 18%, oklch(66% 0.15 66) 50%, oklch(60% 0.14 62) 82%, rgba(196,120,40,0) 100%)',
                  boxShadow: '0 0 7px rgba(200,128,52,0.38)',
                  opacity: seamOpacity, zIndex: 4, pointerEvents: 'none',
                }}
              />
            );
          }

          return (
            <React.Fragment key={i}>
              {patchOpacity > 0 ? (
                <div
                  key={`patch-${i}`}
                  style={{
                    position: 'absolute', left: r.x - 8, top: r.y - 4,
                    width: r.w + 24, height: r.h + 8, background: PAGE_BG,
                    opacity: patchOpacity, zIndex: 1, pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute', left: 8, top: 10, width: r.w, height: r.h - 12, borderRadius: 8,
                      border: '1px dashed rgba(120,96,64,0.20)', boxSizing: 'border-box', opacity: slotHint,
                      background: 'rgba(120,96,64,0.018)',
                    }}
                  />
                </div>
              ) : null}
              {contact}
              {flyer}
              {seam}
            </React.Fragment>
          );
        })}
      </PageCam2D>
      <Vignette strength={0.1} color="#3a2c1c" inner={0.55} />
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};
