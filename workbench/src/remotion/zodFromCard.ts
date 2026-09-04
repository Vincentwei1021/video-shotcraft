import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import type { CardDef, PropField } from "../cards/types";

/** 把工作台的 PropField schema 转成 Zod schema——Studio Inspector 据此渲染表单控件 */
const fieldToZod = (f: PropField): z.ZodTypeAny => {
  switch (f.type) {
    case "text":
    case "textarea":
      return z.string().describe(f.label);
    case "number":
    case "slider": {
      let n = z.number();
      if (f.min !== undefined) n = n.min(f.min);
      if (f.max !== undefined) n = n.max(f.max);
      return n.describe(f.label);
    }
    case "color":
      return zColor().describe(f.label);
    case "select":
      return z
        .enum(f.options.map((o) => o.value) as [string, ...string[]])
        .describe(f.label);
    case "boolean":
      return z.boolean().describe(f.label);
  }
};

export const zodFromCard = (card: CardDef) =>
  z.object(Object.fromEntries(card.schema.map((f) => [f.key, fieldToZod(f)])));
