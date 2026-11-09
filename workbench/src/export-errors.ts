export type ExportError = {
  code: "alreadyRunning" | "invalidProject" | "syncFailed" | "spawnFailed" | "notFound" | "renderFailed";
  details?: string;
};
