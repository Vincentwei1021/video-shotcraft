---
name: overhead-camera-moves
一句话: 俯拍揭示两式——tilt-reveal 俯仰抬正揭示、overhead-tabletop-drop 桌面卡阵横滑骤降扎入
适用: 用"俯仰角"讲故事的开场/转场：单页 establishing 用 A，多页巡视择一扎入用 B
时长: A ~4.8s / B ~4.7s
能量: A 中 / B 中高
标签: opening、transition
---

## 意图
库内俯拍视角一直空缺——crane-rise 是"平移+缩放"的升起（俯仰角
不动），space-camera C 式 drone-dive 是俯冲降落一镜到底；这两式让
**俯仰角本身讲故事**：A 是揭示——整页 rotateX 平躺、开场只见上缘
一条透视窄带，机位"抬头"回正，内容一排排涌入视野，像掀开桌上的
图纸；B 是选择——三张页面卡平躺成桌面卡阵，相机俯拍横向滑过依次
掠过（韦斯·安德森 tabletop），滑到目标页猛地俯冲扎入、抬正成满屏，
"巡视一圈，就选这张"。选型：单页开场用 A，多页转场/开场用 B。

## 两式选型
| 式 | 做法 | 适用 |
|----|------|------|
| A tilt-reveal | perspective 容器内整页 rotateX -80° 平躺，~43f 抬正，rotateX/scale/translateY 共用 out-cubic，末端轻过冲 | 开场 establishing；单主体 |
| B overhead-tabletop-drop | 卡阵平躺 rotateX 62°，pan 段只动 translateX 横滑掠过，drop 段角度/缩放/位移三通道同跑扎入落版 | 多页巡视后择一；转场/开场两用 |

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| A 俯角 | rotateX -80°（f0–25 极缓 creep 到 -77°）→ +2.6°（f68，速度归零）→ 0°（f76），主段不对称 in-out、过冲回落 smooth，transformOrigin 50% 0% | 首版 -55° 太弱：f0 仍见半页，无"窄带"悬念（实渲判例）；分段各用 out-cubic 会在接缝处速度突变 |
| A 联动 | perspective 600→1200、perspectiveOrigin 5%→40% 随进度插值；scale 3.2→1 + translateY 200→0 | perspective 不联动则俯角初始见不到"只露顶栏" |
| A 收尾 | 全部动画 f76 结束，145f 留 69f 真静止 | 过冲幅度 ≤3°，再大读作弹簧不是机位 |
| B pan 段 | 0–55f 只改 translateX +700→-650（in-out cubic），角度不动 | pan 段动角度 = 两段职责糊掉（判例：pan 巡视、drop 表态） |
| B drop 段 | 55–85f 三通道同跑：rotateX 62→-1.8→0.6→0（零速起步的不对称曲线 + smooth 回落过冲）、scale 1→2.04→2.0（起步带 ~5% 预备回缩）、translateX -650→0 | 三通道必须同跑；分先后读作两个动作；pan 静止后直接 out-cubic 起跳是速度突变 |
| B 卡阵 | 卡片 996×560（16:9 精确比），落版 scale 2.0 恰满屏正视；transform 顺序 translateX→rotateX→scale | 顺序错了 pan 会带出弧线轨迹 |
| B 地板 | 浅灰网格地板 | 无地板参照，横滑段读不出"相机在动" |
| B 收尾 | 全部动画 f93 结束，140f 留 47f 真静止 | — |

## 已知坑
- demo 在灰阶/占位素材上调校通过——参数是调校起点非实战定稿，
  首次实战须以真实素材回验
- 大角度透视下卡片必须 backfaceVisibility hidden + translateZ(4px)
  兜底，否则个别帧背面/深度穿帮
- A 与 crane-rise-reveal 同片二选一——都是开场揭示，两个"揭示开场"
  等于没有揭示
- B pan 段角度锁死是命门（两段职责分离判例）：巡视归巡视、扎入归
  扎入，混着动观众不知道相机想干嘛
- 两式都是"相机大动作"，与 space-camera/crane-rise 同屏段落互斥，
  一个段落只能有一个持镜人

## 参考实现
demos/camera/overhead-camera-moves/
（OverheadTabletopDrop.tsx / TiltReveal.tsx）
