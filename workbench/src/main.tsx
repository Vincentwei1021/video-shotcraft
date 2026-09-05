import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// 不包 <React.StrictMode>：工作台永远跑在 dev server 上（导出也走它），StrictMode 会把每个
// Remotion Player / 缩略图挂载两遍，首屏十几个 1080p 场景闪一轮，用户看到的就是"闪"。
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
