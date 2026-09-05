import type { ProjectData } from "./types";
import { uid } from "./types";

/** 初始演示工程（未接入成片时）：纸底 + 两张 demo 镜头卡顺排 + 字卡 + 解说条。
 *  同时是 Remotion Studio「Main」合成的 defaultProps 来源——保持纯函数，别引 store。 */
export const demoProject = (): ProjectData => {
  const clip = (cardId: string, start: number, duration: number, props: Record<string, unknown> = {}, label?: string) => ({
    id: uid("clip"), cardId, start, duration, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props, label,
  });
  return {
    name: "未命名工程",
    fps: 30,
    width: 1920,
    height: 1080,
    background: "#f2eee6",
    tracks: [
      {
        id: uid("track"),
        name: "字幕",
        clips: [clip("inkpress-caption", 70, 60, { text: "COUNT UP · CONFETTI" })],
      },
      {
        id: uid("track"),
        name: "镜头",
        clips: [
          clip("inkpress-title-card", 0, 55, { text: "Every shot, *tuned* in one place." }, "字卡"),
          clip("demo:CounterConfetti", 55, 138, {}, "数字冲刺纸屑"),
          clip("demo:CrashImpactReal", 193, 120, {}, "急推撞停"),
          clip("inkpress-title-card", 313, 55, { text: "Drag a card. *Tweak* it. Export." }, "字卡"),
        ],
      },
      {
        id: uid("track"),
        name: "背景",
        clips: [clip("bg-paper", 0, 368)],
      },
    ],
  };
};
