import React from "react";

/** 与 template/cards 同款的缓动 / tween helper（对照 GSAP 名字） */
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / Math.max(1e-6, d)));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const linear = (x: number) => x;
export const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
export const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
export const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
export const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
export const power4In = (x: number) => Math.pow(x, 5);
export const power2InOut = (x: number) =>
  x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const power4InOut = (x: number) =>
  x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2;

/** GSAP 色彩插值：RGB 逐通道线性；输入 #rrggbb */
export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h.split("").map((c) => parseInt(c + c, 16))
      : [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return [v[0] || 0, v[1] || 0, v[2] || 0];
};
export const mixHex = (a: string, b: string, p: number) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], p))},${Math.round(
    lerp(ca[1], cb[1], p),
  )},${Math.round(lerp(ca[2], cb[2], p))})`;
};

export const FONT_STACK =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

/** 主持人占位剪影（演示语境素材，不属于动效本体） */
export const HostSilhouette: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      background: "#fff",
    }}
  >
    <div
      style={{
        width: "42%",
        height: "78%",
        background:
          "radial-gradient(ellipse 46% 26% at 50% 13%, #e3e3e6 60%, transparent 61%)," +
          "radial-gradient(ellipse 50% 62% at 50% 84%, #ececef 60%, transparent 61%)",
      }}
    />
  </div>
);
