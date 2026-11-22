#!/usr/bin/env python3
"""Gelistirme ortami: eklentinin popup, welcome ve video ustu kutusunu SAHTE chrome API'siyle sıradan bir tarayici sekmesinde gosterir.
Eklenti dosyalari (extension/) oldugu gibi sunulur, hicbirine dokunulmaz; sahte API her sayfaya sunucu tarafinda eklenir.
Yalnizca bu bilgisayara (127.0.0.1) acilir. Eklenti paketine, siteye ve requirements.txt'e girmez.

  python3 dev/harness/serve.py [--port 8800]
  http://127.0.0.1:8800/popup.html?scene=new|on|bank&ui=en|tr|es&tab=none|yt
  http://127.0.0.1:8800/welcome.html?ui=en|tr|es
  http://127.0.0.1:8800/__video.html?scene=on&line=0
"""
import argparse
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.abspath(os.path.join(HERE, "..", "..", "extension"))
OWN = {"/__stub.js": "stub.js", "/__video.html": "video.html"}
INJECT = {"/popup.html", "/welcome.html"}
TAG = b'<script src="/__stub.js"></script>'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=EXT, **k)

    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in OWN:
            with open(os.path.join(HERE, OWN[path]), "rb") as f:
                return self._send(f.read(), "text/javascript; charset=utf-8" if path.endswith(".js") else "text/html; charset=utf-8")
        if path.startswith("/store/") and ".." not in path:          # mağaza görseli sayfaları (dev/harness/store/)
            f = os.path.join(HERE, path.lstrip("/"))
            if os.path.isfile(f):
                with open(f, "rb") as fh:
                    return self._send(fh.read(), "text/html; charset=utf-8" if f.endswith(".html") else "text/javascript; charset=utf-8")
        if path.startswith("/__ad/") and ".." not in path:           # reklam/mağaza görselleri için gerçek eklenti ekran görüntüleri (dev/out/ad2/assets)
            f = os.path.join(HERE, "..", "out", "ad2", "assets", path[len("/__ad/"):])
            if os.path.isfile(f):
                with open(f, "rb") as fh:
                    return self._send(fh.read(), "image/png")
        if path in INJECT:
            with open(os.path.join(EXT, path.lstrip("/")), "rb") as f:
                html = f.read()
            i = html.index(b"<head>") + len(b"<head>")
            return self._send(html[:i] + TAG + html[i:], "text/html; charset=utf-8")
        return super().do_GET()

    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8800)
    a = ap.parse_args()
    for port in range(a.port, a.port + 20):
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            break
        except OSError:
            continue
    else:
        raise SystemExit("Bos port bulunamadi")
    print("Deneme ortami: http://127.0.0.1:%d/popup.html?scene=new" % port, flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
