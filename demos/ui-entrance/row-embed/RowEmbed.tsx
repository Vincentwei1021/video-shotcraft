// row-embed —— 内容行从空中降下、rotateX 收平、嵌入瞬间底边亮强调色缝
// "结构化数据长进页面"的详情页/列表镜头。参考实现从 template SceneDetail 剥离：
// 行按节拍逐条从上空飞入（perspective translateY(−120·air) + rotateX(16°·air) +
// scale 略过冲后 press 回弹），行位先盖页面底色补丁占位、落地后消失让纹理透出，
// 嵌入瞬间行底边 2px 强调色缝从中心向两侧展开后淡出，相机同时匀速下摇。
// 节拍：第 i 行 cue = 12 + i·9，飞行 12f，最后一行 60f 落地、强调色缝 68f 收尾。
// 飞行体 = 整页截图 backgroundImage 负偏移裁片（Q1：裁片不重绘内容）。
import React from 'react';
import { interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import layout from '../../_textures/live-layout.json';

export const ROW_EMBED_DURATION = 68;

const DETAIL_H = layout.detail.pageH;
const rows = layout.detail.rows;

const DETAIL_CAM: CamKey2D[] = [
  { frame: 0, cx: 960, cy: 300, zoom: 1.1 },
  { frame: 68, cx: 960, cy: 760, zoom: 1.0 },
];

const FLY_EASE = Easing.bezier(0.3, 0, 0.25, 1);
const detailSrc = staticFile('textures/live/detail-full.png');

export const RowEmbed: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <PageCam2D src="textures/live/detail-full.png" pageH={DETAIL_H} keys={DETAIL_CAM}>
      {rows.map((r, i) => {
        const cue = 12 + i * 9;
        const land = cue + 12;

        // empty-slot paper patch (under the flying row), gone 2f after landing
        const patchOpacity = interpolate(frame, [land, land + 2], [1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });

        // flying row: texture-crop dropping in from the air
        let flyer: React.ReactNode = null;
        if (frame >= cue && frame < cue + 16) {
          const p = interpolate(frame, [cue, cue + 12], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE,
          });
          const appear = interpolate(frame, [cue, cue + 3], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const scale =
            frame < land
              ? 1.06 - 0.065 * p
              : interpolate(frame, [land, land + 4], [0.995, 1], {
                  extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
                });
          const air = 1 - p;
          flyer = (
            <div
              key={`row-${i}`}
              style={{
                position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h,
                borderRadius: 8, backgroundColor: '#fff',
                backgroundImage: `url(${detailSrc})`,
                backgroundSize: `1920px ${DETAIL_H}px`,
                backgroundPosition: `-${r.x}px -${r.y}px`,
                opacity: appear,
                transform: `perspective(900px) translateY(${-120 * air}px) rotateX(${16 * air}deg) scale(${scale})`,
                boxShadow: `0 ${30 * air}px ${60 * air}px rgba(30,25,18,${0.22 * air}), 0 ${8 * air}px ${16 * air}px rgba(30,25,18,${0.12 * air})`,
                zIndex: 3, pointerEvents: 'none',
              }}
            />
          );
        }

        // embed flash: 2px amber seam at the row's bottom edge, expanding from
        // the center on touchdown, then fading out
        let seam: React.ReactNode = null;
        if (frame >= land && frame < land + 8) {
          const spread = interpolate(frame, [land, land + 5], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
          });
          const seamOpacity = interpolate(frame, [land, land + 2, land + 8], [1, 1, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const seamW = r.w * spread;
          seam = (
            <div
              key={`seam-${i}`}
              style={{
                position: 'absolute',
                left: r.x + (r.w - seamW) / 2,
                top: r.y + r.h - 2,
                width: seamW, height: 2,
                background: 'oklch(58% 0.13 65)',
                boxShadow: '0 0 6px rgba(180,120,50,0.35)',
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
                  width: r.w + 24, height: r.h + 8, background: '#fdfcfa',
                  opacity: patchOpacity, zIndex: 1, pointerEvents: 'none',
                }}
              />
            ) : null}
            {flyer}
            {seam}
          </React.Fragment>
        );
      })}
    </PageCam2D>
  );
};
