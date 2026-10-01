"""upload_post.py 离线单测（不联网，不需要 key）。

    python3 -m unittest publish/test_upload_post.py -v
"""
import copy
import http.client
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
    err = io.StringIO()
    # gets: 依次返回的 GET 响应列表；最后一个会一直重复（模拟持续同一状态）
    gets = list(gets)

    def fake_request(method, path, api_key, **kw):
        if method == "POST":
            if isinstance(post, BaseException):
                raise post
            return post
        resp = gets.pop(0) if len(gets) > 1 else gets[0]
        if isinstance(resp, Exception):
            raise resp
        return copy.deepcopy(resp)  # main() 会改返回的 dict，不能污染共享样例

    with mock.patch.object(sys, "argv", ["upload_post.py", *argv]), \
         mock.patch.dict("os.environ", {"UPLOAD_POST_API_KEY": "k"}), \
         mock.patch.object(up, "_request", side_effect=fake_request) as req, \
         mock.patch.object(up.time, "sleep"), \
         mock.patch("sys.stdout", out), mock.patch("sys.stderr", err):
        try:
            up.main()
        except SystemExit as e:
            code = e.code
        except BaseException:  # 模拟进程中途死掉：保留 stderr 供断言
            run_cli.last_stderr = err.getvalue()
            raise
    run_cli.last_stderr = err.getvalue()
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


COMPLETED = (200, {"status": "completed", "results": [
    {"platform": "tiktok", "success": True, "post_url": "https://tiktok.com/@a/video/1"}]})


class AmbiguousSubmitTest(unittest.TestCase):
    """提交结果不确定时绝不重发，只按同一 request_id 查询。"""

    setUp = UploadPostTest.setUp
    tearDown = UploadPostTest.tearDown

    def _posts_and_ids(self, req):
        posts = [c for c in req.call_args_list if c.args[0] == "POST"]
        gets = [c for c in req.call_args_list if c.args[0] == "GET"]
        return posts, posts[0].kwargs["headers"]["Idempotency-Key"], gets

    def test_503_then_status_completed_is_success_without_resend(self):
        code, js, req = run_cli(self.base + ["--platforms", "tiktok"],
                                post=(503, {"message": "Service Unavailable"}), gets=[COMPLETED])
        posts, sent_id, gets = self._posts_and_ids(req)
        self.assertEqual((code, js["success"], len(posts)), (0, True, 1))
        self.assertTrue(all(g.kwargs["params"] == {"request_id": sent_id} for g in gets))

    def test_503_then_not_found_is_unknown_with_request_id(self):
        for status in (500, 502, 503):
            code, js, req = run_cli(self.base + ["--platforms", "tiktok"],
                                    post=(status, {}), gets=[(404, {"status": "not_found"})])
            posts, sent_id, _ = self._posts_and_ids(req)
            self.assertEqual(code, 2)
            self.assertEqual(js["status"], "unknown")
            self.assertFalse(js["success"])
            self.assertTrue(js["doNotRerun"])
            self.assertEqual(js["requestId"], sent_id)
            self.assertIn(f"--status {sent_id}", js["statusCommand"])
            self.assertEqual(len(posts), 1)

    def test_503_then_status_errors_is_unknown(self):
        code, js, req = run_cli(self.base + ["--platforms", "tiktok"],
                                post=(503, {}), gets=[(500, {"message": "boom"})])
        self.assertEqual((code, js["status"]), (2, "unknown"))
        self.assertEqual(len(self._posts_and_ids(req)[0]), 1)

    def test_empty_2xx_is_treated_as_accepted(self):
        code, js, req = run_cli(self.base + ["--platforms", "tiktok"],
                                post=(200, {"_invalid": True, "message": ""}), gets=[COMPLETED])
        self.assertEqual((code, js["success"]), (0, True))
        self.assertEqual(len(self._posts_and_ids(req)[0]), 1)

    def test_transport_error_then_not_found_is_unknown(self):
        code, js, _ = run_cli(self.base + ["--platforms", "tiktok"],
                              post=urllib.error.URLError("reset"), gets=[(404, {})])
        self.assertEqual((code, js["status"]), (2, "unknown"))

    def test_4xx_before_acceptance_is_definitive_and_not_polled(self):
        for status, etype in ((400, "validation"), (401, "auth"), (403, "forbidden"), (422, "validation")):
            code, js, req = run_cli(self.base + ["--platforms", "tiktok"], post=(status, {"message": "no"}),
                                    gets=[COMPLETED])
            self.assertEqual((code, js["errorType"]), (1, etype))
            self.assertEqual([c for c in req.call_args_list if c.args[0] == "GET"], [])

    def test_accepted_but_never_found_is_unknown_not_failure(self):
        code, js, _ = run_cli(self.base + ["--platforms", "tiktok"],
                              post=(200, {"request_id": "r"}), gets=[(404, {})])
        self.assertEqual((code, js["status"]), (2, "unknown"))

    def test_status_poll_errors_after_acceptance_are_unknown_not_failure(self):
        code, js, _ = run_cli(self.base + ["--platforms", "tiktok"],
                              post=(200, {"request_id": "r"}), gets=[(502, {"message": "bad gateway"})])
        self.assertEqual((code, js["status"]), (2, "unknown"))


class ReviewRegressionTest(unittest.TestCase):
    """PR #93 review: truncated responses and the scheduled status command."""

    setUp = UploadPostTest.setUp
    tearDown = UploadPostTest.tearDown

    def _sent_id(self, req):
        posts = [c for c in req.call_args_list if c.args[0] == "POST"]
        self.assertEqual(len(posts), 1)
        return posts[0].kwargs["headers"]["Idempotency-Key"]

    def test_incomplete_read_on_submit_is_ambiguous_and_actionable(self):
        code, js, req = run_cli(self.base + ["--platforms", "tiktok"],
                                post=http.client.IncompleteRead(b"partial"), gets=[(404, {})])
        sent_id = self._sent_id(req)
        self.assertEqual((code, js["status"], js["requestId"]), (2, "unknown", sent_id))
        self.assertTrue(js["doNotRerun"])
        self.assertIn(f"--status {sent_id}", js["statusCommand"])

    def test_incomplete_read_then_found_keeps_the_same_id(self):
        code, js, req = run_cli(self.base + ["--platforms", "tiktok"],
                                post=http.client.IncompleteRead(b""), gets=[COMPLETED])
        sent_id = self._sent_id(req)
        self.assertEqual((code, js["success"], js["requestId"]), (0, True, sent_id))
        gets = [c for c in req.call_args_list if c.args[0] == "GET"]
        self.assertTrue(gets and all(g.kwargs["params"] == {"request_id": sent_id} for g in gets))

    def test_other_http_client_errors_are_ambiguous(self):
        for exc in (http.client.RemoteDisconnected("closed"), ConnectionResetError("reset")):
            code, js, req = run_cli(self.base + ["--platforms", "tiktok"], post=exc, gets=[(404, {})])
            self.assertEqual((code, js["status"]), (2, "unknown"))
            self._sent_id(req)

    def test_request_id_is_logged_before_sending(self):
        # 进程在发送途中死掉：stderr 里必须已经有可用的恢复命令
        with self.assertRaises(KeyboardInterrupt):
            run_cli(self.base + ["--platforms", "tiktok"], post=KeyboardInterrupt())
        logged = run_cli.last_stderr
        match = __import__("re").search(r"--status ([0-9a-f-]{36})", logged)
        self.assertIsNotNone(match, logged)
        self.assertIn(f"request_id {match.group(1)}", logged)

    def test_scheduled_status_command_uses_job_id_and_queries_it(self):
        job_id = "a" * 32
        code, js, _ = run_cli(
            self.base + ["--platforms", "x", "--schedule", "2099-01-01T09:00:00Z"],
            post=(202, {"success": True, "job_id": job_id, "request_id": "r"}))
        self.assertEqual((code, js["status"], js["jobId"]), (0, "scheduled", job_id))
        self.assertTrue(js["statusCommand"].endswith(f"--status {job_id}"))
        # 按输出的命令查询：第一次请求必须是 job_id
        status_args = js["statusCommand"].split("upload_post.py ", 1)[1].split()
        code, js2, req = run_cli(status_args + ["--json-out"],
                                 gets=[(200, {"status": "pending", "job_id": job_id, "results": []})])
        first_get = [c for c in req.call_args_list if c.args[0] == "GET"][0]
        self.assertEqual(first_get.kwargs["params"], {"job_id": job_id})
        self.assertEqual(js2["jobId"], job_id)


if __name__ == "__main__":
    unittest.main()
