#!/usr/bin/env python3
"""Ofis sayfasi icin kucuk yerel sunucu (tarayici file:// ile durum.json'u okuyamaz).

Varsayilan: yalnizca bu bilgisayar (127.0.0.1). Telefondan acmak icin --lan: ayni Wi-Fi'daki herkes durum
dosyasini gorebilir, o yuzden bilerek acmak gerekir. Yalnizca 3 dosya sunulur, baska hicbir sey.
Kullanim:  python3 .claude/ofis/serve.py            ->  http://127.0.0.1:8765
"""
import argparse
import os
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ALLOWED = {"/": "index.html", "/index.html": "index.html", "/durum.json": "durum.json", "/agents.json": "agents.json"}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=HERE, **k)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path not in ALLOWED:
            self.send_error(404)
            return
        self.path = "/" + ALLOWED[path]
        # Deneme icin: CV_OFIS_DIR verilirse durum.json oradan okunur (canli veriye dokunmadan sayfa denenebilir)
        self.directory = (os.environ.get("CV_OFIS_DIR") or HERE) if path == "/durum.json" else HERE
        super().do_GET()

    def do_HEAD(self):
        self.send_error(405)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))   # paket gonderilmez, sadece hangi arayuz secilir
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--lan", action="store_true", help="ayni Wi-Fi'daki cihazlar (telefon) da acabilsin")
    a = ap.parse_args()
    host = "0.0.0.0" if a.lan else "127.0.0.1"
    srv, port = None, a.port
    for port in range(a.port, a.port + 20):          # port doluysa siradakini dene (baska programa dokunma)
        try:
            srv = ThreadingHTTPServer((host, port), Handler)
            break
        except OSError:
            continue
    if srv is None:
        raise SystemExit("Bos port bulunamadi (%d-%d)." % (a.port, a.port + 19))
    if a.lan:
        print("UYARI: --lan acik. Ayni agdaki herkes bu sayfayi ve durum.json'u gorebilir.")
        print("Telefonda ac: http://%s:%d" % (lan_ip(), port))
    else:
        print("Ofis: http://127.0.0.1:%d" % port, flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
