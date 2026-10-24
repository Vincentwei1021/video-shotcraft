"""Contact-sheet CLI regressions. Requires ffmpeg and ffprobe on PATH.

    python3 -m unittest discover -s shot-polish -p 'test_sheet.py' -v
"""
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),
                     'ffmpeg and ffprobe are required')
class SheetTest(unittest.TestCase):
    def test_short_clips_use_distinct_existing_frames(self):
        for frames, requested in [(1, 8), (2, 8), (8, 8), (30, 8), (8, 1), (8, 5)]:
            with self.subTest(frames=frames, requested=requested), \
                    tempfile.TemporaryDirectory() as tmp:
                src = Path(tmp) / 'short clip.mkv'
                dst = Path(tmp) / 'contact sheet.png'
                subprocess.run([
                    'ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                    'color=red:size=16x16:rate=30', '-frames:v', str(frames),
                    '-c:v', 'ffv1', str(src),
                ], check=True, capture_output=True)
                result = subprocess.run([
                    sys.executable, str(Path(__file__).with_name('sheet.py')),
                    str(src), str(dst), str(requested),
                ], capture_output=True, text=True, encoding='utf-8')
                self.assertEqual(result.returncode, 0, result.stderr)
                match = re.search(r'sheet frames ([\d,]+)', result.stdout)
                self.assertIsNotNone(match, result.stdout)
                picks = list(map(int, match.group(1).split(',')))
                count = min(frames, requested)
                self.assertEqual(len(picks), count)
                self.assertEqual(picks, sorted(set(picks)))
                self.assertTrue(all(0 <= p < frames for p in picks), picks)
                self.assertTrue(dst.is_file(), result.stderr)
                pixels = subprocess.check_output([
                    'ffmpeg', '-v', 'error', '-i', str(dst),
                    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
                ])
                width = 4 * 480
                self.assertEqual(len(pixels), width * ((count + 3) // 4) * 480 * 3)
                for tile in range(count):
                    x, y = (tile % 4) * 480 + 240, (tile // 4) * 480 + 240
                    offset = (y * width + x) * 3
                    red, green, blue = pixels[offset:offset + 3]
                    self.assertGreater(red, 200, f'tile {tile} is blank')
                    self.assertLess(green, 40)
                    self.assertLess(blue, 40)


if __name__ == '__main__':
    unittest.main()
