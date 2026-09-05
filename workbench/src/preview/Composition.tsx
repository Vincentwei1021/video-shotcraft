import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import type { ProjectData } from "../types";
import { CARDS } from "../cards/registry";
import { defaultsOf } from "../cards/types";

/** 时间重映射：clip 本地帧 → 卡片源帧（inOffset + f × speed）。
 *  卡片全部是 frame 的纯函数（tween 均 clamp），因此变速/裁入/超时长定格都安全。
 *  不变速且不裁入时直通不包 Freeze——含 Audio/Video 的卡需要原生播放（Freeze 会掐掉声音）。 */
const TimeRemap: React.FC<{
  inOffset: number;
  speed: number;
  children: React.ReactNode;
}> = ({ inOffset, speed, children }) => {
  const frame = useCurrentFrame();
  if (speed === 1 && inOffset === 0) return <>{children}</>;
  return <Freeze frame={Math.max(0, inOffset + frame * speed)}>{children}</Freeze>;
};

export const MainComposition: React.FC<{ project: ProjectData }> = ({ project }) => {
  // UI 中 tracks[0] 是最上层轨 → 最后渲染（覆盖在上）
  const ordered = [...project.tracks].reverse();
  return (
    <AbsoluteFill style={{ background: project.background ?? "#0e0e10" }}>
      {ordered.map(
        (track) =>
          !track.hidden &&
          track.clips.map((clip) => {
            const card = CARDS[clip.cardId];
            if (!card) return null;
            const Comp = card.component;
            const duration = Math.max(1, Math.round(clip.duration));
            const props: Record<string, unknown> = { ...defaultsOf(card), ...clip.props };
            // 成片组件按 `duration`/`dur` 算出场淡出：注入 clip 的源时长，拉长/裁短后淡出跟着挪
            if (card.durationProp)
              props[card.durationProp] = Math.max(1, Math.round(clip.inOffset + duration * clip.speed));
            // 音频卡：裁入/变速交给卡内 <Audio trimBefore playbackRate>，
            // 不能包 Freeze（会掐死原生播放），也无需图层包裹
            if (card.kind === "audio") {
              return (
                <Sequence key={clip.id} from={clip.start} durationInFrames={duration}>
                  <Comp {...props} inOffset={clip.inOffset} speed={clip.speed} />
                </Sequence>
              );
            }
            return (
              <Sequence key={clip.id} from={clip.start} durationInFrames={duration}>
                <AbsoluteFill
                  style={{
                    opacity: clip.opacity,
                    transform: `translate(${clip.x}px, ${clip.y}px) scale(${clip.scale})`,
                  }}
                >
                  {card.kind === "video" ? (
                    // 视频卡：同音频卡走原生播放通道，保留图层包裹
                    <Comp {...props} inOffset={clip.inOffset} speed={clip.speed} />
                  ) : (
                    <TimeRemap inOffset={clip.inOffset} speed={clip.speed}>
                      <Comp {...props} />
                    </TimeRemap>
                  )}
                </AbsoluteFill>
              </Sequence>
            );
          }),
      )}
    </AbsoluteFill>
  );
};
