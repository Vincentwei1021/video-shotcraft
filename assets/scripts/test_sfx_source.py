"""Offline behavior checks: python3 -m unittest discover -s assets/scripts -p 'test_sfx_source.py'."""

import argparse
from contextlib import redirect_stdout
import importlib.util
import io
import json
import math
from pathlib import Path
import shutil
import struct
import tempfile
import unittest
from unittest.mock import patch
import wave

spec = importlib.util.spec_from_file_location("sfx_source", Path(__file__).with_name("sfx-source.py"))
sfx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sfx)


def player(sid="123", duration="0.5"):
    return (f'<div data-sound-id="{sid}" data-username="Recordist" data-title="Paper &amp; card" '
            f'data-duration="{duration}" data-num-downloads="42" '
            f'data-mp3="https://cdn.freesound.org/previews/0/{sid}_5-lq.mp3"></div>')


def result(sid="123", duration="0.5", license="Creative Commons 0"):
    return (f'<div class="extra bw-search__result">{player(sid, duration)}'
            f'<a href="/people/Recordist/sounds/{sid}/">Paper</a>'
            f'<div title="License: {license}"></div>'
            '<div aria-label="Average rating of 4.5"></div><span class="bw-rating__count">(12)</span>'
            '<div class="max-h-60px-md-50px"><b>Dry</b> paper recorded in a room.</div></div>')


class SourceTests(unittest.TestCase):
    def test_nested_search_metadata_and_optional_ratings(self):
        rows = sfx.parse_search(sfx.Document(result()))
        self.assertEqual(rows[0]["title"], "Paper & card")
        self.assertEqual(rows[0]["rating_count"], 12)
        self.assertEqual(rows[0]["duration_seconds"], 0.5)
        self.assertIn("Dry paper", rows[0]["description"])
        self.assertTrue(rows[0]["preview_url"].endswith("-hq.mp3"))
        self.assertEqual(sfx.stats([]), {"rating": None, "rating_count": None})
        detail = sfx.Document('<span class="bw-rating__count">Overall rating (21 ratings)</span>')
        self.assertEqual(sfx.stats(list(detail.root.nodes()))["rating_count"], 21)

    def test_empty_results_and_broken_page_are_distinct(self):
        self.assertEqual(sfx.parse_search(sfx.Document("<p>No results found</p>")), [])
        with self.assertRaises(ValueError):
            sfx.parse_search(sfx.Document("<p>Temporarily unavailable</p>"))
        with self.assertRaises(ValueError):
            sfx.parse_search(sfx.Document('<div class="bw-search__result">markup changed</div>'))

    def test_search_filters_locally_and_keeps_relevance(self):
        html = result("123") + result("124", "8") + result("125", license="Attribution NonCommercial") + result("126") + result("123")
        args = argparse.Namespace(query="paper", license="cc0", min_duration=0, max_duration=1, pages=1, limit=5, output=None)
        with patch.object(sfx, "web_page", return_value=(sfx.Document(html), sfx.SITE)), redirect_stdout(io.StringIO()) as output:
            self.assertEqual(sfx.search(args), 0)
        self.assertEqual([r["id"] for r in json.loads(output.getvalue())["results"]], ["fs:123", "fs:126"])

    def test_license_urls_versions_and_policy(self):
        self.assertEqual(sfx.license_code("http://creativecommons.org/licenses/by/3.0/"), "CC-BY-3.0")
        sfx.check_license("CC0-1.0", "cc0")
        sfx.check_license("CC-BY-4.0", "by")
        for url in ("https://creativecommons.org/licenses/by-nc/4.0/", "https://example.com/licenses/by/4.0/", "", "https://creativecommons.org/licenses/by-sa/4.0/"):
            self.assertIsNone(sfx.license_code(url))
        for code in (None, "CC-BY-4.0", "BY-NC"):
            with self.assertRaises(ValueError):
                sfx.check_license(code, "cc0")

    def test_detail_records_actual_license_url(self):
        url = "http://creativecommons.org/licenses/by/3.0/"
        doc = sfx.Document(player().replace('data-username="Recordist"', 'data-username=""') + f'<a href="{url}">Attribution</a>')
        with patch.object(sfx, "web_page", return_value=(doc, sfx.SITE + "/people/Recordist/sounds/123/")):
            row = sfx.detail("123")
        self.assertEqual(row["license"], "CC-BY-3.0")
        self.assertEqual(row["license_url"], url)
        self.assertEqual(row["author"], "Recordist")

    def test_unsafe_or_incomplete_metadata_rejected(self):
        for bad in ("../x", "fs:-2", "https://example.com/123"):
            with self.assertRaises(ValueError):
                sfx.sound_id(bad)
        for html in (player().replace("cdn.freesound.org", "evil.example"), player(duration="nan")):
            with self.assertRaises(ValueError):
                sfx.player_data(next(n for n in sfx.Document(html).root.nodes() if n.tag == "div"))

    def test_get_checks_license_before_fetching_audio(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(sfx, "detail", return_value={"license": "CC-BY-3.0"}), patch.object(sfx, "request") as request:
            with self.assertRaises(ValueError):
                sfx.download_one("123", Path(directory), "cc0", [])
            request.assert_not_called()

    def test_download_freezes_provenance_and_rejects_modified_files(self):
        row = {"id": "fs:123", "license": "CC0-1.0", "preview_url": "https://cdn.freesound.org/previews/0/123_5-hq.mp3"}
        with tempfile.TemporaryDirectory() as directory, patch.object(sfx, "detail", return_value=dict(row)), patch.object(sfx, "analyze", return_value={"codec": "mp3"}), patch.object(sfx, "request", return_value=(b"audio", row["preview_url"], "audio/mpeg")):
            out = Path(directory)
            record = sfx.download_one("123", out, "cc0", [])
            self.assertTrue(record["is_preview"])
            self.assertEqual(record["sha256"], sfx.digest(out / record["file"]))
            (out / record["file"]).write_bytes(b"user edit")
            with self.assertRaises(ValueError):
                sfx.download_one("123", out, "cc0", [record])
            self.assertEqual((out / record["file"]).read_bytes(), b"user edit")

    def test_html_download_does_not_become_audio(self):
        row = {"id": "fs:123", "license": "CC0-1.0", "preview_url": "https://cdn.freesound.org/previews/0/123_5-hq.mp3"}
        with tempfile.TemporaryDirectory() as directory, patch.object(sfx, "detail", return_value=row), patch.object(sfx, "request", return_value=(b"<html>Error</html>", row["preview_url"], "text/html")):
            with self.assertRaises(ValueError):
                sfx.download_one("123", Path(directory), "cc0", [])
            self.assertFalse((Path(directory) / "fs-123.mp3").exists())

    def test_partial_failure_saves_success_and_returns_nonzero(self):
        record = {"id": "fs:123", "file": "fs-123.mp3", "title": "Paper", "author": "Recordist", "page_url": "https://freesound.org/s/123/", "license": "CC0-1.0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/"}
        def download(sid, *args):
            if sid == "124":
                raise ValueError("license unavailable")
            return record
        with tempfile.TemporaryDirectory() as directory, patch.object(sfx, "require_audio_tools"), patch.object(sfx, "download_one", side_effect=download), redirect_stdout(io.StringIO()):
            args = argparse.Namespace(ids=["123", "124", "123"], out_dir=directory, license="cc0", workers=1)
            self.assertEqual(sfx.get(args), 1)
            manifest = json.loads((Path(directory) / sfx.MANIFEST).read_text())
            self.assertEqual(manifest["assets"], [record])
            self.assertIn(record["license_url"], (Path(directory) / sfx.CREDITS).read_text())
            self.assertFalse((Path(directory) / ".freesound-download.lock").exists())

    def test_concurrent_manifest_writer_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(sfx, "require_audio_tools"):
            lock = Path(directory) / ".freesound-download.lock"
            lock.touch()
            args = argparse.Namespace(ids=["123"], out_dir=directory)
            with self.assertRaises(ValueError):
                sfx.get(args)
            self.assertTrue(lock.exists())

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "requires ffmpeg/ffprobe")
    def test_measure_delayed_stereo_burst_without_downmix_cancellation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "burst.wav"
            with wave.open(str(path), "wb") as audio:
                audio.setparams((2, 2, 48000, 0, "NONE", "not compressed"))
                values = []
                for i in range(48000):
                    value = int(16384 * math.sin(2 * math.pi * 1000 * i / 48000)) if 12000 <= i < 16800 else 0
                    values.append(struct.pack("<hh", value, -value))
                audio.writeframes(b"".join(values))
            result = sfx.analyze(path)
            self.assertAlmostEqual(result["duration_seconds"], 1)
            self.assertAlmostEqual(result["sample_peak_dbfs"], -6.021, places=2)
            self.assertTrue(0.25 <= result["energy_peak_seconds"] <= 0.35)
            self.assertAlmostEqual(result["active_start_seconds"], 0.25)
            self.assertAlmostEqual(result["active_end_seconds"], 0.35)


if __name__ == "__main__":
    unittest.main()
