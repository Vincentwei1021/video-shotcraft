"""upload_post.py 离线单测（不联网，不需要 key）。

    python3 -m unittest publish/test_upload_post.py -v
"""
import io
import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
import upload_post as up  # noqa: E402


def run_cli(argv, *, post=None, gets=()):
    """跑一次 main()，返回 (退出码, JSON 输出, post mock, get mock)。"""
    out = io.StringIO()
    gets = list(gets)

    def fake_request(method, path, api_key, **kw):
        if method == "POST":
            if isinstance(post, Exception):
                raise post
            return post
        return gets.pop(0)

    with mock.patch.object(sys, "argv", ["upload_post.py", *argv]), \
         mock.patch.dict("os.environ", {"UPLOAD_POST_API_KEY": "k"}), \
         mock.patch.object(up, "_request", side_effect=fake_request) as req, \
         mock.patch.object(up.time, "sleep"), \
         mock.patch("sys.stdout", out), mock.patch("sys.stderr", io.StringIO()):
        try:
            up.main()
        except SystemExit as e:
            code = e.code
    line = out.getvalue().strip().splitlines()
    return code, json.loads(line[-1]) if line else None, req


class UploadPostTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.video = Path(self.tmp.name) / "promo.mp4"
        self.video.write_bytes(b"\x00" * 64)
        self.base = ["--video", str(self.video), "--title", "t", "--user", "u", "--json-out"]

    def tearDown(self):
        self.tmp.cleanup()

    def test_network_error_polls_same_id_without_resending(self):
        code, js, req = run_cli(
            self.base + ["--platforms", "tiktok"],
            post=urllib.error.URLError("reset"),
            gets=[(200, {"status": "completed", "results": [
                {"platform": "tiktok", "success": True, "post_url": "https://tiktok.com/@a/video/1"}]})],
        )
        self.assertEqual(code, 0)
        self.assertTrue(js["success"])
        posts = [c for c in req.call_args_list if c.args[0] == "POST"]
        self.assertEqual(len(posts), 1)
        sent_id = posts[0].kwargs["headers"]["Idempotency-Key"]
        poll = [c for c in req.call_args_list if c.args[0] == "GET"][0]
        self.assertEqual(poll.kwargs["params"], {"request_id": sent_id})

    def test_mixed_results_fail_and_are_normalized(self):
        code, js, _ = run_cli(
            self.base + ["--platforms", "tiktok,x,linkedin"],
            post=(200, {"request_id": "r"}),
            gets=[(200, {"status": "completed", "results": [
                {"platform": "tiktok", "success": True, "post_url": "https://t/1"},
                {"platform": "x", "success": False, "error_message": "boom"},
                {"platform": "linkedin", "success": False, "skipped": True}]})],
        )
        self.assertEqual(code, 1)
        got = {r["platform"]: (r["status"], r["error"]) for r in js["results"]}
        self.assertEqual(got, {"tiktok": ("completed", None), "x": ("failed", "boom"),
                               "linkedin": ("skipped", None)})

    def test_all_skipped_is_not_success(self):
        code, js, _ = run_cli(
            self.base + ["--platforms", "linkedin"], post=(200, {}),
            gets=[(200, {"status": "completed", "results": [{"platform": "linkedin", "skipped": True}]})],
        )
        self.assertEqual(code, 1)
        self.assertFalse(js["success"])

    def test_private_youtube_gets_watch_url_and_note_kept_elsewhere(self):
        res = up.summarize_results({"results": [
            {"platform": "youtube", "success": True, "platform_post_id": "abc",
             "post_url": "Post uploaded as Private. No public URL available."},
            {"platform": "tiktok", "success": True, "platform_post_id": "v1", "post_url": None}]})
        self.assertEqual(res[0]["url"], "https://www.youtube.com/watch?v=abc")
        self.assertIsNone(res[1]["url"])
        self.assertEqual(res[1]["postId"], "v1")

    def test_timeout_reports_still_running(self):
        code, js, _ = run_cli(
            self.base + ["--platforms", "tiktok", "--wait-timeout", "0"], post=(200, {}),
            gets=[(200, {"status": "processing", "results": []})],
        )
        self.assertEqual(code, 0)
        self.assertTrue(js["timedOut"])

    def test_401_is_auth_error(self):
        code, js, _ = run_cli(self.base + ["--platforms", "tiktok"], post=(401, {"message": "Invalid API key"}))
        self.assertEqual((code, js["errorType"]), (1, "auth"))

    def test_validation_happens_before_any_request(self):
        for extra, needle in (
            (["--platforms", "mastodon"], "Unsupported"),
            (["--platforms", "pinterest"], "pinterest-board"),
            (["--platforms", "x", "--schedule", "2020-01-01T00:00:00Z"], "future"),
        ):
            code, js, req = run_cli(self.base + extra)
            self.assertEqual(code, 1)
            self.assertIn(needle, js["error"])
            req.assert_not_called()

    def test_form_fields(self):
        args = mock.Mock(user="u", title="t", platforms=["youtube", "tiktok", "pinterest"],
                         schedule=None, timezone=None, first_comment=None, ai_generated=True,
                         youtube_privacy="private", tags="a, b", tiktok_privacy="SELF_ONLY",
                         tiktok_draft=True, instagram_story=False, facebook_page_id=None,
                         linkedin_page_id=None, pinterest_board="B")
        form = up.build_form(args, "", "rid")
        for kv in [("platform[]", "youtube"), ("tags[]", "a"), ("tags[]", "b"),
                   ("is_ai_generated", "true"), ("privacy_level", "SELF_ONLY"),
                   ("post_mode", "MEDIA_UPLOAD"), ("pinterest_board_id", "B"),
                   ("privacyStatus", "private"), ("request_id", "rid"), ("async_upload", "true")]:
            self.assertIn(kv, form)

    def test_multipart_encoding(self):
        body, ctype = up.encode_multipart([("platform[]", "x"), ("title", "标题")],
                                          [("video", "a.mp4", b"DATA", "video/mp4")])
        boundary = ctype.split("boundary=")[1]
        self.assertTrue(body.endswith(f"--{boundary}--\r\n".encode()))
        self.assertIn('name="title"\r\n\r\n标题'.encode(), body)
        self.assertIn(b'filename="a.mp4"\r\nContent-Type: video/mp4\r\n\r\nDATA', body)


if __name__ == "__main__":
    unittest.main()
