/** 外部成片工程源码（workbench/proj 符号链接 → <工程>/src，Vite/webpack 别名 @proj）。
 *  声明为 any 模块：成片工程不参与本工程的 tsc 严格检查——工程源码以它自己为准。 */
declare module "@proj/*";

/** 镜头卡 demo 源码（workbench/demosrc → ../demos，别名 @demos）。
 *  同样不参与 tsc 严格检查：demo 源码由仓库 CI 自己的 tsc 关卡守着。 */
declare module "@demos/*";
