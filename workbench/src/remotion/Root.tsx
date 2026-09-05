import React from "react";
import { Composition } from "remotion";
import { CARD_LIST } from "../cards/registry";
import { cardFps, cardSize, defaultsOf } from "../cards/types";
import { zodFromCard } from "./zodFromCard";
import { MainComposition } from "../preview/Composition";
import { demoProject } from "../demoProject";
import { projectDuration, projectEndFrame } from "../types";
import type { ProjectData } from "../types";
import { MANIFEST, ORIGINAL } from "../cards/projectCards";
import { buildProjectFromManifest } from "../projectImport";

type MainProps = { project: ProjectData; renderExact?: boolean };
const Main = MainComposition as React.ComponentType<MainProps>;

/** Remotion Studio / CLI 入口：
 *  - Main：整条时间轴合成（吃工作台导出的工程 JSON——右侧 Props 面板可直接贴 JSON）
 *  - ProjImported：已链接成片按清单刚导入、未做任何改动的工程（= Main + 导入结果）
 *  - ProjOriginal：成片工程自己的原合成（清单 `original`）
 *    两者逐帧应一致，scripts/parity.mjs 用它们做对照
 *  - 每张卡各注册一个合成，Zod schema 由工作台 schema 自动转换，Studio Inspector 自动生成调参表单 */
export const RemotionRoot: React.FC = () => {
  const demo = demoProject();
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={projectDuration(demo)}
        fps={demo.fps}
        width={demo.width}
        height={demo.height}
        defaultProps={{ project: demo, renderExact: false }}
        calculateMetadata={({ props }) => ({
          // 导出成片（renderExact）用内容精确时长；Studio 预览留 1s 余量
          durationInFrames: props.renderExact
            ? Math.max(2, projectEndFrame(props.project))
            : projectDuration(props.project),
          fps: props.project.fps,
          width: props.project.width,
          height: props.project.height,
        })}
      />
      {MANIFEST && (
        <Composition
          id="ProjImported"
          component={Main}
          durationInFrames={Math.max(2, MANIFEST.total)}
          fps={MANIFEST.fps}
          width={MANIFEST.width}
          height={MANIFEST.height}
          defaultProps={{ project: buildProjectFromManifest(MANIFEST), renderExact: true }}
        />
      )}
      {MANIFEST && ORIGINAL && (
        <Composition
          id="ProjOriginal"
          component={ORIGINAL}
          durationInFrames={Math.max(2, MANIFEST.total)}
          fps={MANIFEST.fps}
          width={MANIFEST.width}
          height={MANIFEST.height}
        />
      )}
      {CARD_LIST.filter((c) => c.kind !== "audio").map((card) => {
        const { width, height } = cardSize(card);
        return (
          <Composition
            key={card.id}
            id={card.id.replace(/[^a-zA-Z0-9-]/g, "-")}
            // 动态注册：schema/defaultProps 无法静态对齐类型，交给运行时（zod 会校验）
            component={card.component as React.ComponentType<Record<string, unknown>>}
            durationInFrames={Math.max(2, card.durationInFrames)}
            fps={cardFps(card)}
            width={width}
            height={height}
            schema={zodFromCard(card) as never}
            defaultProps={defaultsOf(card) as never}
          />
        );
      })}
    </>
  );
};
