# demos/ — 镜头卡参考实现源码

多数镜头卡会在“参考实现”中指向本目录；必须先读卡片，再按其明确路径定位准确的
demo 文件，不能只凭卡名假设目录结构。这里的组件是调校过的 Remotion 实现——
**用卡先读准确源码**（SKILL.md 理念 5）。

使用方式：copy 需要的 .tsx 进你的 Remotion 项目（30fps / 1920×1080），
注册成 Composition 即可跑。两类共享依赖：

- `_fixtures/Fixtures.tsx` — 灰阶假 UI 场景件（FakeDashboard/Card/TitleBlock/G 调色板）。
  多数 demo import 它；copy demo 时把 import 路径改成你项目里的位置。
- `_textures/` — 少数"真实素材版" demo（crash-zoom-punch / depth-layer-moves /
  speed-ramp-freeze / shot-transitions / page-waterfall-wall）用到的整页截图与
  `live-layout.json`。这些 demo 里的 `staticFile('textures/live/xxx.png')`
  要求把 `_textures/` 下的同名文件复制到你项目的 `public/textures/live/`
  （page-waterfall-wall 例外：它写的是 `textures/xxx.png`，放 `public/textures/`）。

个别 demo 用到 `@remotion/motion-blur`（CameraMotionBlur），需
`npm i @remotion/motion-blur`。

## MotionLab 模板 demo（effect.js）

48 张新卡（2026-08 并入）的参考实现是 `demos/<类别>/<卡名>/effect.js`——
**自包含**的 MotionLab 动效模板：文件内置最小运行时（E 缓动表 / lerp / seg /
确定性 rand），浏览器 `<script>` 直接引入即可，无外部依赖。

每个文件是 IIFE + 三态导出：CommonJS（`module.exports`）、浏览器全局
（`window.MotionLabEffects['<effect-id>']`，多文件共存不冲突）。

与 Remotion 对接（区别于本目录其他 .tsx demo）：

```tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';
const { effect, MotionLab } = require('.../demos/typography/blur-slide/effect.js');

const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const renderRef = useRef<((t: number) => void) | null>(null);
  useEffect(() => {
    if (ref.current) renderRef.current = effect.setup(ref.current, MotionLab);
  }, []);
  useEffect(() => {
    renderRef.current?.(frame / durationInFrames);
  }, [frame]);
  return <div ref={ref} style={{ position: 'relative', width: 480, height: 270, overflow: 'hidden' }} />;
};
```

`stageEl` 是 480×270 基准的相对定位容器（内部按比例 scale 适配）。
动画全部由归一化 t 驱动、无内部状态与真随机，满足确定性渲染要求。
