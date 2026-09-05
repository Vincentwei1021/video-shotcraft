import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

// 里程表数字滚动（源出 template/src/aifl/DigitRoll.tsx，字卡副标用）
const DIGITS = "0123456789";

export const DigitRoll: React.FC<{
  value: string;
  delay?: number;
  fontSize?: number;
  color?: string;
}> = ({ value, delay = 0, fontSize = 30, color = "#b5651d" }) => {
  const frame = useCurrentFrame();
  const lineH = fontSize * 1.15;
  return (
    <span style={{ display: "inline-flex", overflow: "hidden", height: lineH, verticalAlign: "bottom" }}>
      {value.split("").map((ch, i) => {
        const target = DIGITS.indexOf(ch);
        if (target < 0) {
          return (
            <span key={i} style={{ fontSize, lineHeight: `${lineH}px`, color }}>{ch}</span>
          );
        }
        const t = interpolate(frame, [delay + i * 4, delay + i * 4 + 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.25, 0.8, 0.25, 1),
        });
        const offset = (10 + target) * t * lineH;
        return (
          <span key={i} style={{ display: "inline-block", height: lineH, overflow: "hidden" }}>
            <span style={{ display: "block", transform: `translateY(${-offset}px)` }}>
              {(DIGITS + DIGITS).split("").map((d, j) => (
                <span key={j} style={{ display: "block", fontSize, lineHeight: `${lineH}px`, color }}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};
