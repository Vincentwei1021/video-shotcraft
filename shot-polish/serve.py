#!/usr/bin/env python3
"""serve.py — 对照页本地服务：静态文件 + 决策读写接口。

  cd shot-polish && python3 serve.py [端口，默认 8765]  → http://localhost:8765/

GET  /api/decisions     读 shot-polish/decisions.json（不存在返回空列表）
POST /api/decisions     写 shot-polish/decisions.json（对照页里点「选用」时自动保存）
GET/POST /api/final-review  同上，读写 shot-polish/final-review.json（最终确认页 final.html 的确认结果）
"""
import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
STORES = {'/api/decisions': HERE / 'decisions.json', '/api/final-review': HERE / 'final-review.json'}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(HERE), **kw)

    def end_headers(self):
        if self.path.split('?')[0].endswith(('.html', '/')) or self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        f = STORES.get(self.path.split('?')[0])
        if f:
            body = f.read_bytes() if f.exists() else b'{"decisions": []}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        f = STORES.get(self.path.split('?')[0])
        if not f:
            self.send_error(404)
            return
        n = int(self.headers.get('Content-Length', 0))
        try:
            data = json.loads(self.rfile.read(n))
        except json.JSONDecodeError:
            self.send_error(400)
            return
        f.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        if '/api/' in str(args[0] if args else ''):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'http://localhost:{port}/')
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
