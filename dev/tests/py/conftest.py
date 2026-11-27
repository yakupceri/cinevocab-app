"""Test ortami: site dosyalarini DEGISTIRMEDEN, kok klasorden icerik aktarir. Veritabani gerekmez."""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.dont_write_bytecode = True


# ---------- Geçici Postgres: gerçek SQL testleri için. Gerçek sunucuya hiç bağlanmaz; araçlar yoksa testler atlanır. ----------
import shutil
import socket
import subprocess
import tempfile

import pytest


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def pg():
    import accounts
    if not (shutil.which("initdb") and shutil.which("pg_ctl")):
        pytest.skip("Postgres araçları (initdb, pg_ctl) yok")
    base = tempfile.mkdtemp(prefix="cvpg")
    data, port = os.path.join(base, "data"), _free_port()
    subprocess.run(["initdb", "-D", data, "-A", "trust", "-U", "cvtest", "-E", "UTF8"], check=True, capture_output=True)
    subprocess.run(["pg_ctl", "-D", data, "-w", "-l", os.path.join(base, "log"), "-o",
                    f"-p {port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=", "start"], check=True, capture_output=True)
    try:
        subprocess.run(["createdb", "-h", "127.0.0.1", "-p", str(port), "-U", "cvtest", "cv"], check=True, capture_output=True)
        accounts._POOL = None
        accounts.init_accounts({"dbname": "cv", "user": "cvtest", "password": "", "host": "127.0.0.1", "port": port})
        accounts.q("CREATE TABLE IF NOT EXISTS link_clicks (day DATE NOT NULL, src TEXT NOT NULL, n INT NOT NULL DEFAULT 0, PRIMARY KEY (day, src));")
        accounts.q("CREATE TABLE IF NOT EXISTS link_hits (at TIMESTAMPTZ NOT NULL DEFAULT now(), src TEXT NOT NULL, "
                   "device TEXT NOT NULL DEFAULT '', os TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT '');")
        # çeviri sözlüğü tabloları: canlıda main.py ve multilang.py açılışta kurar
        accounts.q("CREATE TABLE IF NOT EXISTS words (id SERIAL PRIMARY KEY, eng TEXT, tr TEXT, created_at TIMESTAMP DEFAULT now());")
        accounts.q("CREATE TABLE IF NOT EXISTS words_ml (src TEXT NOT NULL, dst TEXT NOT NULL, word TEXT NOT NULL, "
                   "trans TEXT NOT NULL, PRIMARY KEY (src, dst, word));")
        yield port
    finally:
        try:
            if accounts._POOL:
                accounts._POOL.closeall()
        finally:
            accounts._POOL = None
            subprocess.run(["pg_ctl", "-D", data, "-m", "immediate", "stop"], capture_output=True)
            shutil.rmtree(base, ignore_errors=True)
