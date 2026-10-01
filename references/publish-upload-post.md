# 发布到社交平台：成片 → TikTok / Instagram / YouTube / LinkedIn / X …

把交付的 MP4 一次发到 TikTok、Instagram（Reels 或 Stories）、YouTube（含 Shorts）、
LinkedIn、Facebook、X、Threads、Pinterest、Bluesky，可立即发布或定时发布。
脚本 `publish/upload_post.py`，通过 [Upload-Post](https://upload-post.com) API 完成，
只用 Python 标准库（无需 venv / pip）。

**触发时机**：只在用户**主动要求**把成片发到社交平台时执行（例如"帮我发到
TikTok 和 YouTube"）。它不是交付收尾 1-2-3 之外的第 4 条推荐，不要主动推销。
发布是公开且难以撤回的操作，**必须先让用户确认文案和平台清单**，再真正发布。

> **说明**：Upload-Post 是第三方托管服务。免费版每月 10 次上传，覆盖上面除
> TikTok 以外的全部平台（TikTok 需付费版）。只有用户配置了自己的 API key 时
> 本流程才会联网。

## 1. 一次性准备（用户操作）

1. 在 https://upload-post.com 注册，创建一个 profile，把要发的社交账号连到这个 profile。
2. 在后台创建 API key。
3. 设置环境变量（或写进用户自己的 shell 配置）：

```bash
export UPLOAD_POST_API_KEY=...
export UPLOAD_POST_USER=<profile 名>
```

缺这两个变量时，告诉用户以上三步，停下等待，不要尝试发布。

## 2. 选文件与准备文案

- **文件**：用交付的成片。配了 BGM 的片子有两版（带 BGM / 无 BGM），默认发
  **带 BGM 版**；用户另有要求按用户的来。
- **画幅**：TikTok、Reels、Shorts 要竖屏 9:16。成片是横屏 16:9 时如实告诉用户
  （这些平台会加黑边或裁切），建议改发 YouTube / LinkedIn / X / Facebook，或另渲
  一版竖屏。
- **文案 `--title`**：在 TikTok / Instagram / X / Threads 上就是正文，按社交文案写
  （钩子一句 + 2–4 个话题标签），不要写成 YouTube 标题。含 YouTube 时 ≤100 字符。
  交付收尾第 1 条里用户若同意 @ 作者，把那句放进文案。
- **长描述 `--description`**：YouTube / LinkedIn / Facebook / Pinterest 用。
- **AI 声明 `--ai-generated`**：询问用户是否标注 AI 生成内容。成片由 Agent 以代码
  渲染，一般不属于"逼真的合成影像"，默认不标；用了 AI 生成画面或 AI 配音时建议标。

把「文案 + 描述 + 平台清单 + 定时（如有）+ 各平台隐私设置」整理给用户，
**得到明确确认后**再进入下一步。

## 3. 先 dry-run（不发布）

```bash
python3 publish/upload_post.py --video out/promo.mp4 --title "<文案>" \
  --description "<长描述>" --platforms tiktok,instagram,youtube --dry-run --json-out
```

检查输出：`authOk` 为 `true`；`missingPlatforms` 非空说明这些平台没连到 profile，
会被跳过，告诉用户去后台连接，或从清单里去掉。

## 4. 发布

去掉 `--dry-run` 重跑。脚本等待各平台结果（默认最多 10 分钟），逐平台输出链接或错误。

- **每条发布命令只跑一次。** 无论超时、断网、报错还是 `status: "unknown"`，都**不要
  重跑发布命令**，重跑会生成新的 request_id，同一视频会被发两次。只能查询：
  `python3 publish/upload_post.py --status <requestId> --json-out`
- 脚本如何区分：只有 **400 / 401 / 403 / 422**（服务端受理前明确拒绝）才判失败，此时
  没有任何东西被发出去，修正参数后可以再发。5xx、网关错误、超时、断网、2xx 却无有效
  JSON 都属于"不确定"，视频可能已被受理。脚本会自动用同一个 request_id 查询：查到就
  照常继续；仍无法确认则输出 `status: "unknown"`（退出码 2）、`requestId` 和
  `statusCommand`，并带 `doNotRerun: true`。
- 脚本在**发送之前**就把 `request_id` 和对应的 `--status` 命令打到 stderr。进程中途
  被中断时，用这条命令查询，不要重跑发布。
- 定时发布（`--schedule 2026-10-01T09:00:00 --timezone Asia/Shanghai`）立即返回
  `jobId` + `requestId` 和 `statusCommand`。定时任务按 **`jobId`** 查询：
  `python3 publish/upload_post.py --status <jobId> --json-out`（输出里的 `statusCommand`
  就是这条命令）。

## 5. 向用户汇报

每个平台一行：链接、或原因。

| 平台结果 | 含义 |
|---|---|
| `completed` + `url` | 已发布。私密发布没有公开链接：YouTube 仍给出本人可看的链接，其他平台给 `postId` + `note` |
| `skipped` | profile 没连这个平台，没有发 |
| `failed` / `retryable` | `error` 是平台给的原因（如账号授权过期，去后台重新连接）；`retryable` 会由服务端自动重试 |
| TikTok `inbox: true` | TikTok 把视频放进了草稿箱，需要用户在 TikTok App 里点发布 |
| 整体 `status: "unknown"` | 无法确认是否已受理。原样告诉用户 `requestId`，稍后用 `statusCommand` 查询；**不要重跑发布命令** |

## 6. 参数速查

| 参数 | 说明 |
|---|---|
| `--video` / `--title` | 成片路径 / 各平台共用文案 |
| `--description` / `--description-file` | 长描述 |
| `--platforms` | `tiktok,instagram,youtube,linkedin,facebook,x,threads,pinterest,bluesky`（别名 `twitter` `reels` `shorts`） |
| `--user` | profile 名，默认 `$UPLOAD_POST_USER` |
| `--schedule` + `--timezone` | 定时发布（≤365 天），IANA 时区，默认 UTC |
| `--first-comment` | 发布后自动发第一条评论 |
| `--ai-generated` | AI 生成内容声明（TikTok / Instagram / YouTube / X） |
| `--thumbnail` | 自定义封面（YouTube、LinkedIn） |
| `--youtube-privacy` | `private`（默认）/ `unlisted` / `public` |
| `--tags` | YouTube 标签，逗号分隔 |
| `--tiktok-privacy` / `--tiktok-draft` | TikTok 隐私（默认沿用账号设置）/ 只存草稿 |
| `--instagram-story` | 发 Stories 而非 Reels |
| `--facebook-page-id` / `--linkedin-page-id` | 指定 Facebook 主页 / 以 LinkedIn 公司页发布 |
| `--pinterest-board` | Pinterest 必填 |
| `--status ID` | 查询之前的发布：即时发布用 request_id，定时发布用 job_id |
| `--dry-run` / `--json-out` | 只校验不发布 / 输出一行 JSON |

错误类型（`errorType`）：`auth`（key 缺失或错误）、`validation`（参数错误，或所选平台都没连接）、
`forbidden`（套餐不支持，如免费版发 TikTok）、`quota`（频率或套餐上限）、`http`（网络 / 服务端）。

离线单测：`python3 -m unittest publish/test_upload_post.py -v`
