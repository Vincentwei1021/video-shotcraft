export const FPS = 30;

/** 帧 → "mm:ss.ff" */
export const fmtFrames = (frames: number, fps = FPS) => {
  const f = Math.max(0, Math.round(frames));
  const totalSec = Math.floor(f / fps);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const ff = String(f % fps).padStart(2, "0");
  return `${mm}:${ss}.${ff}`;
};

export const framesToSec = (frames: number, fps = FPS) => frames / fps;
export const secToFrames = (sec: number, fps = FPS) => Math.round(sec * fps);
