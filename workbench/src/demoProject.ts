import type { ProjectData } from "./types";
import { uid } from "./types";
import { t } from "./i18n";

/** 初始演示工程（未接入成片时）：纸底 + 两张 demo 镜头卡顺排 + 字卡 + 解说条。
 *  同时是 Remotion Studio「Main」合成的 defaultProps 来源——保持纯函数，别引 store。 */
export const demoProject = (): ProjectData => {
  const clip = (cardId: string, start: number, duration: number, props: Record<string, unknown> = {}, label?: string) => ({
    id: uid("clip"), cardId, start, duration, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props, label,
  });
  return {
    name: t("demo.name"),
    fps: 30,
    width: 1920,
    height: 1080,
    background: "#f2eee6",
    tracks: [
      {
        id: uid("track"),
        name: t("track.captions"),
        clips: [clip("inkpress-caption", 70, 60, { text: "HIT COUNTER · COMBO" })],
      },
      {
        id: uid("track"),
        name: t("track.shots"),
        clips: [
          clip("inkpress-title-card", 0, 55, { text: "Every shot, *tuned* in one place." }),
          clip("demo:HitCounter", 55, 176),
          clip("demo:CrashImpactReal", 231, 126),
          clip("inkpress-title-card", 357, 55, { text: "Drag a card. *Tweak* it. Export." }),
        ],
      },
      {
        id: uid("track"),
        name: t("track.background"),
        clips: [clip("bg-paper", 0, 412)],
      },
    ],
  };
};
