#!/usr/bin/env python3
"""成片一键发布到社交平台（Upload-Post API）。

把交付的 MP4 一次发到 TikTok、Instagram（Reels/Stories）、YouTube、LinkedIn、
Facebook、X、Threads、Pinterest、Bluesky。只在用户明确要求发布、并确认过文案与
平台后执行——流程见 references/publish-upload-post.md。

仅用 Python 标准库，无需 venv / pip。需要两个环境变量：
  UPLOAD_POST_API_KEY   Upload-Post 后台创建的 API key
  UPLOAD_POST_USER      连接了社交账号的 profile 名（也可用 --user）

用法：
  # 只校验，不发布（同时检查 key、profile、哪些平台未连接）
  python3 publish/upload_post.py --video out/promo.mp4 --title "..." \\
      --platforms tiktok,instagram,youtube --dry-run

  # 发布并等待每个平台的结果
  python3 publish/upload_post.py --video out/promo.mp4 --title "..." \\
      --platforms tiktok,instagram,youtube

  # 定时发布（按指定时区）
  python3 publish/upload_post.py --video out/promo.mp4 --title "..." \\
      --platforms linkedin,x --schedule 2026-10-01T09:00:00 --timezone Asia/Shanghai

  # 查询之前的发布
  python3 publish/upload_post.py --status <request_id 或 job_id>

行为要点：
  * 视频只上传一次，Upload-Post 分发到各平台，按平台返回链接或错误。
  * 异步上传：API 收到文件即返回 request_id，脚本轮询状态直到全部平台结束
    （或 --wait-timeout 超时；超时不取消，稍后用 --status 查）。
  * 防重复发布：request_id 由脚本生成并作为 Idempotency-Key 发送。只有
    400/401/403/422 算明确拒绝；5xx、超时、断网、2xx 却无有效 JSON 都算"不确定"——
    不重发文件，改用同一个 id 查询；仍无法确认时输出 status=unknown（退出码 2）、
    request_id 和 --status 命令。unknown 之后绝不能重跑发布命令，只能 --status。
  * profile 未连接的平台返回 skipped，不影响其他平台。
  * YouTube 默认 private；TikTok 默认沿用账号自身隐私设置。
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

API_BASE = "https://api.upload-post.com"

VIDEO_PLATFORMS = (
    "tiktok", "instagram", "youtube", "linkedin", "facebook",
    "x", "threads", "pinterest", "bluesky",
)
PLATFORM_ALIASES = {"twitter": "x", "reels": "instagram", "shorts": "youtube"}
YOUTUBE_PRIVACY = ("private", "unlisted", "public")
TIKTOK_PRIVACY = (
    "PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY",
)
FINAL_STATUSES = {"completed", "failed", "not_found"}
POLL_INTERVAL_SECS = 10
DEFAULT_WAIT_SECS = 600
UPLOAD_TIMEOUT = 900
API_TIMEOUT = 60
TITLE_MAX = {"youtube": 100, "tiktok": 2200}

# 网络层错误：上传可能已送达，也可能没有——不重发，改查同一 request_id
NETWORK_ERRORS = (urllib.error.URLError, socket.timeout, ConnectionError, TimeoutError)
# 只有这些是"服务端受理前明确拒绝"：可以直接判失败。其余（5xx、网关错误、
# 超时、2xx 却无有效 JSON）都算"不确定"——文件可能已被受理，绝不能重发。
DEFINITIVE_REJECTIONS = {400, 401, 403, 422}
PROBE_ATTEMPTS = 6          # 不确定时按同一 request_id 探查的次数（×POLL_INTERVAL_SECS）
NOT_FOUND_GRACE_POLLS = 6   # 已受理后 status 仍 not_found 的容忍次数（记录可能稍晚写入）
MAX_POLL_ERRORS = 6         # 轮询期间连续出错的容忍次数


class AmbiguousSubmit(Exception):
    """提交结果不确定：服务端可能已受理。只能按同一 request_id 查询，不能重发。"""


class ApiError(Exception):
    def __init__(self, message: str, error_type: str = "http", status: int | None = None):
        super().__init__(message)
        self.error_type = error_type
        self.status = status


def log(msg: str) -> None:
    """日志走 stderr；stdout 只留给 --json-out。"""
    print(msg, file=sys.stderr)


# ---------------------------------------------------------------- HTTP
def classify_status(status: int) -> str:
    if status == 401:
        return "auth"
    if status in (400, 422):
        return "validation"
    if status == 429:
        return "quota"
    if status == 403:
        return "forbidden"
    return "http"


def _request(method: str, path: str, api_key: str, *, params: dict | None = None,
             body: bytes | None = None, headers: dict | None = None,
             timeout: int = API_TIMEOUT) -> tuple[int, dict]:
    url = f"{API_BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    # Upload-Post 的 API key 用 "Apikey" 方案，不是 "Bearer"
    hdrs = {"Authorization": f"Apikey {api_key}", **(headers or {})}
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    try:
        data = json.loads(raw)
    except ValueError:  # 空响应或非 JSON
        return status, {"_invalid": True, "message": raw[:300].decode("utf-8", "replace")}
    return status, data if isinstance(data, dict) else {"data": data}


def _check(status: int, data: dict) -> dict:
    if status < 400:
        return data
    msg = data.get("message") or data.get("error") or str(data)
    raise ApiError(f"HTTP {status}: {msg}", classify_status(status), status)


def api_get(api_key: str, path: str, params: dict | None = None) -> dict:
    try:
        return _check(*_request("GET", path, api_key, params=params))
    except NETWORK_ERRORS as e:
        raise ApiError(f"Network error: {e}", "http")


def check_account(api_key: str, user: str) -> dict:
    """校验 key 并列出 profile 已连接的平台。"""
    me = api_get(api_key, "/api/uploadposts/me")
    profile = api_get(api_key, f"/api/uploadposts/users/{urllib.parse.quote(user)}")
    accounts = (profile.get("profile") or profile).get("social_accounts") or {}
    connected = sorted(PLATFORM_ALIASES.get(p, p) for p, acc in accounts.items() if acc)
    return {"plan": me.get("plan"), "connected": connected}


def get_status(api_key: str, *, request_id: str | None = None, job_id: str | None = None) -> dict:
    params = {"request_id": request_id} if request_id else {"job_id": job_id}
    try:
        status, data = _request("GET", "/api/uploadposts/status", api_key, params=params)
    except NETWORK_ERRORS as e:
        raise ApiError(f"Network error: {e}", "http")
    if status == 404:
        return {"status": "not_found", **params}
    if status < 400 and data.get("_invalid"):
        raise ApiError(f"HTTP {status}: empty or non-JSON status response", "http", status)
    return _check(status, data)


def encode_multipart(fields: list[tuple[str, str]], files: list[tuple[str, str, bytes, str]]):
    """标准库版 multipart/form-data。files: (字段名, 文件名, 内容, MIME)。"""
    boundary = f"----shotcraft{uuid.uuid4().hex}"
    out = bytearray()
    for name, value in fields:
        out += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n"
                f"{value}\r\n").encode("utf-8")
    for name, filename, content, mime in files:
        out += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; "
                f"filename=\"{filename}\"\r\nContent-Type: {mime}\r\n\r\n").encode("utf-8")
        out += content + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


# ---------------------------------------------------------------- 请求构造
def parse_platforms(raw: str | None) -> list[str]:
    platforms: list[str] = []
    for p in (raw or "").split(","):
        p = PLATFORM_ALIASES.get(p.strip().lower(), p.strip().lower())
        if p and p not in platforms:
            platforms.append(p)
    return platforms


def build_form(args, description: str, request_id: str) -> list[tuple[str, str]]:
    """表单字段（视频文件除外）。platform[] / tags[] 可重复，所以用列表。"""
    form = [("user", args.user), ("title", args.title),
            ("request_id", request_id), ("async_upload", "true")]
    form += [("platform[]", p) for p in args.platforms]
    if description:
        form.append(("description", description))
    if args.schedule:
        form.append(("scheduled_date", args.schedule))
        if args.timezone:
            form.append(("timezone", args.timezone))
    if args.first_comment:
        form.append(("first_comment", args.first_comment))
    if args.ai_generated:
        # 跨平台别名：TikTok AIGC 标签、Instagram "AI info"、YouTube 合成内容声明、X made_with_ai
        form.append(("is_ai_generated", "true"))
    if "youtube" in args.platforms:
        form.append(("privacyStatus", args.youtube_privacy))
        form += [("tags[]", t.strip()) for t in (args.tags or "").split(",") if t.strip()]
    if "tiktok" in args.platforms:
        if args.tiktok_privacy:
            form.append(("privacy_level", args.tiktok_privacy))
        if args.tiktok_draft:
            form.append(("post_mode", "MEDIA_UPLOAD"))
    if "instagram" in args.platforms and args.instagram_story:
        form.append(("media_type", "STORIES"))
    if "facebook" in args.platforms and args.facebook_page_id:
        form.append(("facebook_page_id", args.facebook_page_id))
    if "linkedin" in args.platforms and args.linkedin_page_id:
        form.append(("target_linkedin_page_id", args.linkedin_page_id))
    if "pinterest" in args.platforms:
        form.append(("pinterest_board_id", args.pinterest_board))
    return form


def submit_upload(api_key: str, video: str, form: list, thumbnail: str | None, request_id: str) -> dict:
    files = [("video", Path(video).name, Path(video).read_bytes(), "video/mp4")]
    if thumbnail:
        mime = mimetypes.guess_type(thumbnail)[0] or "image/png"
        files.append(("thumbnail", Path(thumbnail).name, Path(thumbnail).read_bytes(), mime))
    body, content_type = encode_multipart(form, files)
    try:
        status, data = _request(
            "POST", "/api/upload", api_key, body=body, timeout=UPLOAD_TIMEOUT,
            headers={"Content-Type": content_type, "Idempotency-Key": request_id},
        )
    except NETWORK_ERRORS as e:
        raise AmbiguousSubmit(f"network error: {e}")
    if status in DEFINITIVE_REJECTIONS:
        _check(status, data)  # 抛出 ApiError：受理前明确拒绝，可放心判失败
    if status >= 400:
        raise AmbiguousSubmit(f"HTTP {status}: {data.get('message') or data.get('error') or ''}".strip())
    if data.get("_invalid"):
        raise AmbiguousSubmit(f"HTTP {status} with an empty or non-JSON body")
    return data


def probe_submission(api_key: str, request_id: str) -> dict | None:
    """不确定提交后按同一 request_id 查询：服务端有记录就返回状态，否则 None。"""
    for attempt in range(PROBE_ATTEMPTS):
        try:
            status = get_status(api_key, request_id=request_id)
            if status.get("status") != "not_found":
                return status
        except ApiError:
            pass
        if attempt < PROBE_ATTEMPTS - 1:
            time.sleep(POLL_INTERVAL_SECS)
    return None


def wait_for_result(api_key: str, request_id: str, wait_secs: int) -> dict:
    deadline = time.monotonic() + wait_secs
    last = None
    not_found = errors = 0
    while True:
        try:
            status = get_status(api_key, request_id=request_id)
            errors = 0
        except ApiError as e:
            # 已提交后查询出错：不能判失败（上传可能正在进行）
            errors += 1
            if errors >= MAX_POLL_ERRORS or time.monotonic() >= deadline:
                return {"status": "unknown", "request_id": request_id, "reason": str(e)}
            time.sleep(POLL_INTERVAL_SECS)
            continue
        state = status.get("status")
        if state == "not_found":
            # 我们确实发出了上传：not_found 只说明记录还没写入或无法确认，不是失败
            not_found += 1
            if not_found >= NOT_FOUND_GRACE_POLLS or time.monotonic() >= deadline:
                return {"status": "unknown", "request_id": request_id,
                        "reason": "the server has no record of this request_id yet"}
            time.sleep(POLL_INTERVAL_SECS)
            continue
        progress = f"{status.get('completed', 0)}/{status.get('total', '?')}"
        if (state, progress) != last:
            log(f"   状态 status: {state} ({progress})")
            last = (state, progress)
        if state in FINAL_STATUSES:
            return status
        if time.monotonic() >= deadline:
            status["timedOut"] = True
            return status
        time.sleep(POLL_INTERVAL_SECS)


def summarize_results(status: dict) -> list[dict]:
    """把各平台结果统一成 [{platform, status, url, postId, note, error, inbox}]。"""
    raw = status.get("results") or []
    if isinstance(raw, dict):
        raw = [{"platform": p, **r} for p, r in raw.items()]
    out = []
    for r in raw:
        if r.get("skipped"):
            state = "skipped"
        elif r.get("status"):
            state = r["status"]
        else:
            state = "completed" if r.get("success") else "failed"
        platform = r.get("platform")
        post_id = r.get("platform_post_id") or r.get("video_id")
        raw_url = r.get("post_url") or r.get("url")
        url = raw_url if raw_url and str(raw_url).startswith("http") else None
        if not url and platform == "youtube" and post_id:
            url = f"https://www.youtube.com/watch?v={post_id}"  # private 视频本人也能打开
        out.append({
            "platform": platform,
            "status": state,
            "url": url,
            "postId": post_id,
            "note": raw_url if raw_url and not url else None,  # 如 "Post uploaded as Private..."
            "error": (r.get("error_message") or r.get("error")) if state != "completed" else None,
            "inbox": bool(r.get("fallback_to_inbox")),
        })
    return out


# ---------------------------------------------------------------- 校验与输出
def parse_schedule(value: str, tz: str | None) -> str:
    raw = value.strip()
    dt = datetime.fromisoformat(raw[:-1] + "+00:00" if raw.endswith("Z") else raw)
    if tz:  # 带 --timezone 时保持本地时间，由 API 按该时区解释
        return dt.replace(tzinfo=None).strftime("%Y-%m-%dT%H:%M:%S")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    if dt <= datetime.now(timezone.utc):
        raise ValueError("in the past")
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def validate_args(args) -> str | None:
    """任何网络请求之前校验，参数错误不会浪费一次上传。"""
    if not args.video:
        return "Missing --video."
    vpath = Path(args.video)
    if not vpath.exists():
        return f"Video file not found: {args.video}"
    if vpath.stat().st_size == 0:
        return f"Video file is empty: {args.video}"
    if not args.title or not args.title.strip():
        return "Missing --title (the caption)."
    if not args.user:
        return "Missing --user. Set UPLOAD_POST_USER or pass --user."
    args.platforms = parse_platforms(args.platforms)
    if not args.platforms:
        return f"Missing --platforms. Choose from: {', '.join(VIDEO_PLATFORMS)}"
    unknown = [p for p in args.platforms if p not in VIDEO_PLATFORMS]
    if unknown:
        return f"Unsupported platform(s): {', '.join(unknown)}. Choose from: {', '.join(VIDEO_PLATFORMS)}"
    if "pinterest" in args.platforms and not args.pinterest_board:
        return "Pinterest needs --pinterest-board BOARD_ID."
    for platform, limit in TITLE_MAX.items():
        if platform in args.platforms and len(args.title) > limit:
            return f"--title is {len(args.title)} chars; {platform} allows {limit}."
    if args.schedule:
        try:
            args.schedule = parse_schedule(args.schedule, args.timezone)
        except ValueError:
            return f"--schedule must be a future ISO8601 timestamp: {args.schedule}"
    if args.thumbnail and not Path(args.thumbnail).exists():
        return f"--thumbnail not found: {args.thumbnail}"
    return None


def emit(payload: dict, json_out: bool) -> None:
    if json_out:
        print(json.dumps(payload, ensure_ascii=False))


def fail(msg: str, error_type: str, json_out: bool, **extra):
    log(f"!! {msg}")
    emit({"success": False, "error": msg, "errorType": error_type, **extra}, json_out)
    sys.exit(1)


def report_unknown(request_id: str, reason: str, json_out: bool, **extra) -> int:
    """结果无法确认：给出 request_id 与查询命令，明确要求不要重跑发布。"""
    cmd = f"python3 publish/upload_post.py --status {request_id}"
    log(f"?? Outcome UNKNOWN ({reason}). The video may already be publishing.")
    log(f"?? DO NOT re-run the publish command — that can post it twice. Check with: {cmd}")
    emit({"success": False, "status": "unknown", "requestId": request_id, "reason": reason,
          "statusCommand": cmd, "doNotRerun": True, **extra}, json_out)
    return 2


def report(status: dict, results: list[dict], json_out: bool, **extra) -> int:
    for r in results:
        if r["status"] == "completed":
            where = ("sent to TikTok inbox — publish it from the app" if r["inbox"]
                     else r["url"] or r["note"] or f"published (post id {r['postId']})")
            log(f"OK {r['platform']}: {where}")
        elif r["status"] == "skipped":
            log(f"-- {r['platform']}: skipped (no account connected to this profile)")
        elif r["status"] in ("failed", "retryable"):
            log(f"!! {r['platform']}: {r['status']} — {r['error']}")
        else:
            log(f"   {r['platform']}: {r['status']}")
    state = status.get("status")
    published = [r for r in results if r["status"] == "completed"]
    failed = [r for r in results if r["status"] in ("failed", "retryable")]
    ok = state != "not_found" and not failed and (bool(published) or state not in FINAL_STATUSES)
    if status.get("timedOut"):
        log(f"?? still running; check later: python3 publish/upload_post.py --status {status.get('request_id')}")
    emit({"success": ok, "status": state, "requestId": status.get("request_id"),
          "jobId": status.get("job_id"), "results": results,
          "timedOut": bool(status.get("timedOut")), **extra}, json_out)
    return 0 if ok else 1


# ---------------------------------------------------------------- CLI
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Publish a finished video to TikTok, Instagram, YouTube, LinkedIn, Facebook, X, "
                    "Threads, Pinterest and Bluesky via the Upload-Post API. "
                    "See references/publish-upload-post.md.")
    p.add_argument("--video", help="MP4 to publish")
    p.add_argument("--title", help="Caption/title used on every platform (YouTube max 100 chars)")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--description", help="Longer text for YouTube, LinkedIn, Facebook, Pinterest")
    g.add_argument("--description-file", help="Read the description from a file")
    p.add_argument("--platforms", help=f"Comma-separated: {', '.join(VIDEO_PLATFORMS)} (aliases: twitter, reels, shorts)")
    p.add_argument("--user", default=os.getenv("UPLOAD_POST_USER"), help="Upload-Post profile (default $UPLOAD_POST_USER)")
    p.add_argument("--schedule", help="Publish later, ISO8601 (≤365 days ahead)")
    p.add_argument("--timezone", help="IANA zone for --schedule, e.g. Asia/Shanghai (default UTC)")
    p.add_argument("--first-comment", help="Posted as the first comment/reply once live")
    p.add_argument("--ai-generated", action="store_true", help="Disclose AI-generated content (TikTok/Instagram/YouTube/X labels)")
    p.add_argument("--thumbnail", help="Custom thumbnail (YouTube, LinkedIn)")
    p.add_argument("--youtube-privacy", choices=YOUTUBE_PRIVACY, default="private")
    p.add_argument("--tags", help="Comma-separated YouTube tags")
    p.add_argument("--tiktok-privacy", choices=TIKTOK_PRIVACY, help="Default: the account's own")
    p.add_argument("--tiktok-draft", action="store_true", help="Send to TikTok drafts instead of posting")
    p.add_argument("--instagram-story", action="store_true", help="Stories instead of Reels")
    p.add_argument("--facebook-page-id")
    p.add_argument("--linkedin-page-id", help="Post as a LinkedIn company page")
    p.add_argument("--pinterest-board", help="Board ID (required for Pinterest)")
    p.add_argument("--status", metavar="ID", help="Look up an earlier upload (request_id or job_id) and exit")
    p.add_argument("--no-wait", action="store_true", help="Return right after submitting")
    p.add_argument("--wait-timeout", type=int, default=DEFAULT_WAIT_SECS)
    p.add_argument("--dry-run", action="store_true", help="Validate + check the account, no upload")
    p.add_argument("--json-out", action="store_true", help="One machine-readable JSON line on stdout")
    return p


def main() -> None:
    args = build_parser().parse_args()
    api_key = os.getenv("UPLOAD_POST_API_KEY")
    if not api_key and not args.dry_run:
        fail("UPLOAD_POST_API_KEY is not set — see references/publish-upload-post.md.", "auth", args.json_out)

    if args.status:
        # job_id 是 32 位十六进制；先查更可能的类型，另一种作兜底
        kinds = ["job_id", "request_id"] if re.fullmatch(r"[0-9a-f]{32}", args.status) else ["request_id", "job_id"]
        try:
            for kind in kinds:
                status = get_status(api_key, **{kind: args.status})
                if status.get("status") != "not_found":
                    break
        except ApiError as e:
            fail(str(e), e.error_type, args.json_out)
        if status.get("status") == "not_found":
            log(f"!! No upload found with id {args.status}.")
        elif not status.get("job_id"):
            status.setdefault("request_id", args.status)
        sys.exit(report(status, summarize_results(status), args.json_out))

    err = validate_args(args)
    if err:
        fail(err, "validation", args.json_out)
    description = (Path(args.description_file).read_text(encoding="utf-8")
                   if args.description_file else args.description or "")
    request_id = str(uuid.uuid4())
    form = build_form(args, description, request_id)

    if args.dry_run:
        log("Dry run — form fields (no upload):")
        log(json.dumps(form, indent=2, ensure_ascii=False))
        auth_ok, auth_msg, connected, missing = False, None, [], []
        if not api_key:
            auth_msg = "UPLOAD_POST_API_KEY is not set"
        else:
            try:
                account = check_account(api_key, args.user)
                auth_ok, connected = True, account["connected"]
                missing = [p for p in args.platforms if p not in connected]
                log(f"OK key valid (plan: {account['plan']}); profile '{args.user}' found.")
            except ApiError as e:
                auth_msg = str(e)
        if auth_msg:
            log(f"?? auth not ready — {auth_msg}")
        if missing:
            log(f"?? not connected on '{args.user}': {', '.join(missing)} — these would be skipped.")
        emit({"success": True, "dryRun": True, "authOk": auth_ok, "authError": auth_msg,
              "user": args.user, "platforms": args.platforms,
              "connectedPlatforms": connected, "missingPlatforms": missing}, args.json_out)
        sys.exit(0)

    log(f"-> Uploading '{Path(args.video).name}' to {', '.join(args.platforms)} as '{args.user}'...")
    try:
        submitted = submit_upload(api_key, args.video, form, args.thumbnail, request_id)
    except ApiError as e:  # 400/401/403/422：受理前明确拒绝
        fail(str(e), e.error_type, args.json_out, requestId=request_id)
    except AmbiguousSubmit as e:
        log(f"?? upload response unclear ({e}); checking request {request_id} instead of re-sending...")
        found = probe_submission(api_key, request_id)
        if found is None:
            sys.exit(report_unknown(request_id, str(e), args.json_out, platforms=args.platforms))
        log("OK the server has this upload; continuing.")
        submitted = {"request_id": request_id, "job_id": found.get("job_id")}

    if args.schedule:
        job_id = submitted.get("job_id")
        log(f"OK scheduled for {args.schedule} {args.timezone or 'UTC'} (job {job_id}).")
        log(f"   check later: python3 publish/upload_post.py --status {request_id}")
        emit({"success": True, "status": "scheduled", "jobId": job_id, "requestId": request_id,
              "scheduledDate": args.schedule, "timezone": args.timezone,
              "platforms": args.platforms}, args.json_out)
        sys.exit(0)

    if args.no_wait:
        log(f"OK submitted; check progress: python3 publish/upload_post.py --status {request_id}")
        emit({"success": True, "status": "submitted", "requestId": request_id,
              "platforms": args.platforms}, args.json_out)
        sys.exit(0)

    status = wait_for_result(api_key, request_id, args.wait_timeout)
    if status.get("status") == "unknown":
        sys.exit(report_unknown(request_id, status["reason"], args.json_out, platforms=args.platforms))
    status.setdefault("request_id", request_id)
    sys.exit(report(status, summarize_results(status), args.json_out, platforms=args.platforms))


if __name__ == "__main__":
    main()
