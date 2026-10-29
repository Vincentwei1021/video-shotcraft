#!/usr/bin/env python3
"""Find Freesound SFX and freeze licensed MP3 previews in a video project.

Python standard library; get/analyze also require ffmpeg and ffprobe.
No API key, global cache, login, or proxy configuration changes.
"""

import argparse
import array
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlencode, urljoin, urlparse
from urllib.request import Request, urlopen


SITE = "https://freesound.org"
MANIFEST = "audio-manifest.json"
CREDITS = "FREESOUND-CREDITS.md"
MAX_BYTES = 32 * 1024 * 1024
VOID = set("area base br col embed hr img input link meta param source track wbr".split())


class Node:
    def __init__(self, tag="root", attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def nodes(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.nodes()

    def text(self):
        return " ".join(c.text() if isinstance(c, Node) else c for c in self.children).strip()

    def has_class(self, name):
        return name in self.attrs.get("class", "").split()


class Document(HTMLParser):
    def __init__(self, content):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(content)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def request(url):
    req = Request(url, headers={"User-Agent": "video-shotcraft/1.0 (Freesound SFX sourcing)"})
    with urlopen(req, timeout=30) as response:
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Response exceeds 32 MiB; select a shorter sound or download the original manually")
        return data, response.geturl(), response.headers.get_content_type()


def web_page(url):
    data, final_url, content_type = request(url)
    if urlparse(final_url).hostname != "freesound.org" or content_type != "text/html":
        raise ValueError("Expected a Freesound HTML page")
    return Document(data.decode("utf-8")), final_url


def sound_id(value):
    value = value.removeprefix("fs:")
    if not re.fullmatch(r"[1-9][0-9]*", value):
        raise ValueError(f"Invalid Freesound ID: {value!r}; use fs:12345")
    return value


def license_code(url):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in {"creativecommons.org", "www.creativecommons.org"}:
        return None
    path = parsed.path.rstrip("/")
    if path == "/publicdomain/zero/1.0":
        return "CC0-1.0"
    match = re.fullmatch(r"/licenses/by/(1\.0|2\.0|2\.5|3\.0|4\.0)", path)
    return f"CC-BY-{match[1]}" if match else None


def check_license(code, policy):
    if code == "CC0-1.0" or (policy == "by" and code and code.startswith("CC-BY-")):
        return
    raise ValueError(f"License {code or 'unknown'} is outside --license {policy}; CC BY requires --license by")


def player_data(node, page_author=None):
    attrs = node.attrs
    sid = sound_id(attrs["data-sound-id"])
    title, author = attrs.get("data-title"), page_author or attrs.get("data-username")
    duration = float(attrs["data-duration"])
    if not title or not author or not math.isfinite(duration) or duration <= 0:
        raise ValueError(f"Incomplete Freesound metadata for fs:{sid}")
    preview = attrs.get("data-mp3", "")
    parsed = urlparse(preview)
    if (parsed.scheme != "https" or parsed.hostname != "cdn.freesound.org"
            or not re.fullmatch(rf"/previews/[0-9]+/{sid}_[0-9]+-(lq|hq)\.mp3", parsed.path)):
        raise ValueError(f"Missing or unexpected preview URL for fs:{sid}")
    return {"id": f"fs:{sid}", "title": title, "author": author,
            "duration_seconds": duration, "preview_url": preview.replace("-lq.mp3", "-hq.mp3"),
            "downloads": int(attrs.get("data-num-downloads") or 0)}


def stats(nodes):
    rating, count = None, None
    for node in nodes:
        label = node.attrs.get("aria-label", "")
        if label.startswith("Average rating of "):
            rating = float(label.removeprefix("Average rating of "))
        if node.has_class("bw-rating__count"):
            found = re.search(r"\(([0-9]+)(?: ratings?)?\)", node.text())
            if found:
                count = int(found[1])
    return {"rating": rating, "rating_count": count}


def parse_search(doc):
    rows = []
    for block in doc.root.nodes():
        if not block.has_class("bw-search__result"):
            continue
        nodes = list(block.nodes())
        player = next((n for n in nodes if n.attrs.get("data-sound-id")), None)
        if player is None:
            raise ValueError("Freesound search markup changed: result has no sound metadata")
        row = player_data(player)
        links = [urljoin(SITE, n.attrs.get("href", "")) for n in nodes if n.tag == "a"]
        row["page_url"] = next((u for u in links if u.endswith(f"/sounds/{sound_id(row['id'])}/")), None)
        row["license_label"] = next((n.attrs["title"][9:] for n in nodes
                                     if n.attrs.get("title", "").startswith("License: ")), "unknown")
        desc = next((n for n in nodes if any(c.startswith("max-h-60px")
                     for c in n.attrs.get("class", "").split())), None)
        row["description"] = " ".join((desc.attrs.get("title") or desc.text()).split()) if desc else ""
        row.update(stats(nodes))
        rows.append(row)
    if not rows and not re.search(r"no (?:sounds|results)|0 sounds|couldn't find|did not match", doc.root.text(), re.I):
        raise ValueError("No recognizable search results; check Freesound availability or update the parser")
    return rows


def search(args):
    labels = {"Creative Commons 0"} | ({"Attribution"} if args.license == "by" else set())
    filters = ['license:("Creative Commons 0" OR "Attribution")' if args.license == "by"
               else 'license:"Creative Commons 0"']
    filters.append(f"duration:[{args.min_duration} TO {args.max_duration if args.max_duration is not None else '*'}]")
    found = {}
    for page in range(1, args.pages + 1):
        query = urlencode({"q": args.query, "f": " ".join(filters), "page": page, "s": "Automatic by relevance"})
        doc, _ = web_page(f"{SITE}/search/?{query}")
        for row in parse_search(doc):
            # Enforce locally too; never trust a server-side filter alone.
            if row["license_label"] not in labels or row["duration_seconds"] < args.min_duration:
                continue
            if args.max_duration is not None and row["duration_seconds"] > args.max_duration:
                continue
            found.setdefault(row["id"], row)
    result = {"provider": "freesound", "query": args.query, "license_policy": args.license,
              "ordering": "relevance; popularity is supporting evidence only",
              "results": list(found.values())[:args.limit]}
    emit(result, args.output)
    return 0


def detail(sid):
    doc, final_url = web_page(f"{SITE}/s/{sid}/")
    nodes = list(doc.root.nodes())
    player = next((n for n in nodes if n.attrs.get("data-sound-id") == sid and n.attrs.get("data-mp3")), None)
    canonical = re.fullmatch(rf"/people/([^/]+)/sounds/{sid}/", urlparse(final_url).path)
    if player is None or canonical is None:
        raise ValueError(f"Missing canonical sound page for fs:{sid}")
    # Large players omit data-username; the canonical page supplies the creator.
    row = player_data(player, unquote(canonical[1]))
    row["page_url"] = final_url
    licenses = {n.attrs["href"] for n in nodes if n.tag == "a"
                and urlparse(n.attrs.get("href", "")).hostname in {"creativecommons.org", "www.creativecommons.org"}}
    if len(licenses) != 1:
        raise ValueError(f"Missing or ambiguous license on fs:{sid}")
    row["license_url"] = licenses.pop()
    row["license"] = license_code(row["license_url"])
    row["description"] = next((n.attrs.get("content", "") for n in nodes
                               if n.attrs.get("name") == "twitter:description"), "")
    row.update(stats(nodes))
    return row


def require_audio_tools():
    if not all(shutil.which(name) for name in ("ffmpeg", "ffprobe")):
        raise ValueError("get/analyze require ffmpeg and ffprobe on PATH")


def analyze(path):
    require_audio_tools()
    path = Path(path).resolve()
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                            "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", str(path)],
                           capture_output=True, text=True, check=True)
    info = json.loads(probe.stdout)
    stream = info["streams"][0]
    channels = int(stream["channels"])
    if not 1 <= channels <= 8:
        raise ValueError("Expected an audio file with 1–8 channels")
    rate, window = 48000, 0.01
    block_size = int(rate * window) * channels * 4
    energies, peak, squares, samples = [], 0.0, 0.0, 0
    # Preserve channels: downmixing first can hide opposite-polarity peaks.
    with tempfile.TemporaryFile() as errors:
        with subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-ar", str(rate),
                               "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1"],
                              stdout=subprocess.PIPE, stderr=errors) as process:
            while True:
                raw = process.stdout.read(block_size)
                if not raw:
                    break
                values = array.array("f")
                values.frombytes(raw)
                if sys.byteorder != "little":
                    values.byteswap()
                energy = sum(v * v for v in values)
                energies.append(math.sqrt(energy / len(values)))
                peak = max(peak, max(abs(v) for v in values))
                squares += energy
                samples += len(values)
            if process.wait() != 0:
                errors.seek(0)
                raise ValueError(errors.read().decode("utf-8", errors="replace"))
    if not samples or not peak:
        raise ValueError("Audio is empty or silent")
    loudest = max(energies)
    active = [i for i, e in enumerate(energies) if e >= loudest * 0.01]
    duration = samples / (rate * channels)
    return {"codec": stream["codec_name"], "sample_rate": int(stream["sample_rate"]), "channels": channels,
            "duration_seconds": round(duration, 6), "sample_peak_dbfs": round(20 * math.log10(peak), 3),
            "rms_dbfs": round(20 * math.log10(math.sqrt(squares / samples)), 3),
            "energy_window_seconds": window,
            "energy_peak_seconds": round(min(duration, (energies.index(loudest) + 0.5) * window), 6),
            "active_start_seconds": round(active[0] * window, 6),
            "active_end_seconds": round(min(duration, (active[-1] + 1) * window), 6),
            "activity_threshold_db_below_peak_rms": -40}


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as tmp:
        json.dump(data, tmp, ensure_ascii=False, indent=2, allow_nan=False)
        tmp.write("\n")
    Path(tmp.name).replace(path)


def emit(data, output=None):
    if output:
        write_json(output, data)
    print(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False))


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_credits(out, rows):
    # Plain text inside a fence keeps uploaded titles from becoming Markdown links/instructions.
    lines = ["# Freesound audio credits", "", "Generated from audio-manifest.json; preserve with the video.", "",
             "CC BY entries require attribution in the published video's credits/description.", "",
             "Downloaded files are lossy MP3 previews, not uploader originals.", ""]
    for row in rows:
        lines += ["~~~text", f"{row['file']} — {row['title']} by {row['author']}".replace("~", "\\~"),
                  row["page_url"], f"{row['license']}: {row['license_url']}",
                  "Edits: " + ("; ".join(row.get("changes", [])) or "None recorded; update if edited."), "~~~", ""]
    (out / CREDITS).write_text("\n".join(lines), encoding="utf-8")


def download_one(sid, out, policy, existing):
    row = detail(sid)  # Refresh the actual license, even when search/cache metadata is stale.
    check_license(row["license"], policy)
    dst = out / f"fs-{sid}.mp3"
    old = next((r for r in existing if r["id"] == row["id"]), None)
    if dst.exists():
        if old is None or old.get("file") != dst.name or digest(dst) != old.get("sha256"):
            raise ValueError(f"Refusing to overwrite untracked/modified file: {dst}")
        return {**old, **row, "analysis": analyze(dst), "license_checked_at": datetime.now(timezone.utc).isoformat()}
    payload, final_url, mime = request(row["preview_url"])
    if urlparse(final_url).hostname != "cdn.freesound.org" or mime not in {"audio/mpeg", "audio/mp3", "application/octet-stream"}:
        raise ValueError("Expected a Freesound MP3 preview, not an HTML error page")
    with tempfile.NamedTemporaryFile(dir=out, suffix=".mp3", delete=False) as tmp:
        tmp.write(payload)
        tmp_path = Path(tmp.name)
    try:
        measurements = analyze(tmp_path)  # Decode successfully before admitting the file.
        if measurements["codec"] != "mp3":
            raise ValueError("Preview is not MP3 audio")
        row.update({"provider": "freesound", "file": dst.name, "sha256": digest(tmp_path),
                    "download_url": final_url, "download_kind": "mp3-preview-hq", "is_preview": True,
                    "downloaded_at": datetime.now(timezone.utc).isoformat(),
                    "license_checked_at": datetime.now(timezone.utc).isoformat(), "changes": [], "analysis": measurements})
        # Exclusive creation: another process/user's file is never replaced.
        with dst.open("xb") as target:
            target.write(payload)
        return row
    finally:
        tmp_path.unlink(missing_ok=True)


def get(args):
    require_audio_tools()
    ids = list(dict.fromkeys(sound_id(value) for value in args.ids))
    out = Path(args.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    lock = out / ".freesound-download.lock"
    try:
        handle = lock.open("x")
    except FileExistsError:
        raise ValueError(f"Download already active in {out}; remove {lock.name} only if a previous run crashed")
    try:
        with handle:
            return get_locked(args, ids, out)
    finally:
        lock.unlink(missing_ok=True)


def get_locked(args, ids, out):
    manifest_path = out / MANIFEST
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"version": 1, "assets": []}
    if manifest.get("version") != 1 or not isinstance(manifest.get("assets"), list):
        raise ValueError("Unsupported audio manifest; use a separate output directory")
    existing = manifest["assets"]

    def run(sid):
        try:
            return {"ok": True, "asset": download_one(sid, out, args.license, existing)}
        except (OSError, ValueError, KeyError, IndexError, subprocess.SubprocessError) as error:
            return {"ok": False, "id": f"fs:{sid}", "error": str(error)}

    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for result in pool.map(run, ids):
            results.append(result)
            if result["ok"]:
                row = result["asset"]
                manifest["assets"] = [r for r in manifest["assets"] if r["id"] != row["id"]] + [row]
                write_json(manifest_path, manifest)
                write_credits(out, manifest["assets"])
    emit({"out_dir": str(out), "results": results})
    return 0 if all(r["ok"] for r in results) else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    find = commands.add_parser("search", help="Search public Freesound pages; emit JSON candidates")
    find.add_argument("query")
    find.add_argument("--license", choices=("cc0", "by"), default="cc0", help="by permits CC0 + CC BY")
    find.add_argument("--min-duration", type=float, default=0)
    find.add_argument("--max-duration", type=float)
    find.add_argument("--limit", type=int, default=8)
    find.add_argument("--pages", type=int, choices=range(1, 4), default=1)
    find.add_argument("--output", help="Optional project-local JSON path")
    fetch = commands.add_parser("get", help="Download IDs, verify licenses/audio, save manifest and credits")
    fetch.add_argument("ids", nargs="+")
    fetch.add_argument("--out-dir", required=True, help="Video project's public/audio/sfx directory")
    fetch.add_argument("--license", choices=("cc0", "by"), default="cc0")
    fetch.add_argument("--workers", type=int, choices=range(1, 5), default=3)
    measure = commands.add_parser("analyze", help="Measure decoded audio (10 ms RMS peak; not LUFS/true peak)")
    measure.add_argument("file")
    measure.add_argument("--output")
    args = parser.parse_args(argv)
    try:
        if args.command == "search":
            if not 1 <= args.limit <= 45 or not math.isfinite(args.min_duration) or args.min_duration < 0:
                raise ValueError("Use --limit 1–45 and a nonnegative finite --min-duration")
            if args.max_duration is not None and (not math.isfinite(args.max_duration) or args.max_duration <= args.min_duration):
                raise ValueError("--max-duration must be finite and greater than --min-duration")
            return search(args)
        if args.command == "get":
            return get(args)
        emit(analyze(args.file), args.output)
        return 0
    except (OSError, ValueError, KeyError, IndexError, subprocess.SubprocessError) as error:
        print(f"sfx-source: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
