#!/usr/bin/env python3
"""sheet.py <video.mp4> <out.jpg> [n=8] — 均匀取 n 帧拼 4 列联系表，并打印所取帧号。"""
import subprocess, sys
src, dst = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
tot = int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', src]).decode().strip().strip(','))
picks = [round((k + .5) * tot / n) for k in range(n)]
sel = '+'.join(f'eq(n\\,{p})' for p in picks)
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf',
    f"select='{sel}',scale=480:-1,tile=4x{(n + 3) // 4}", '-frames:v', '1', '-vsync', '0', dst])
print(f'{tot} frames; sheet frames {",".join(map(str, picks))}')
