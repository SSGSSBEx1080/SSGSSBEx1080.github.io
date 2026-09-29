"""Локальный сервер для просмотра сайта без кэша: python3 tools/serve.py (порт 8080, другой: python3 tools/serve.py 3000)."""
import http.server, os, socketserver, sys
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()


socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", int(sys.argv[1]) if len(sys.argv) > 1 else 8080), H) as s:
    s.serve_forever()
