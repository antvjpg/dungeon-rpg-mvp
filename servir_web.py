#!/usr/bin/env python3
"""Servidor local para o Dungeon RPG (HTML5 Canvas / JavaScript puro).

Uso:
    python servir_web.py
Depois abra no navegador:
    http://localhost:8060/

Para testar no celular (mesma rede Wi-Fi do PC):
    python servir_web.py --host
    http://IP-DO-PC:8060/
"""

import http.server
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE, "js")
PORT = 8060
HOST = "0.0.0.0" if "--host" in sys.argv[1:] else "127.0.0.1"

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        low = path.lower()
        for ext, mime in MIME.items():
            if low.endswith(ext):
                return mime
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write(fmt % args + "\n")
        sys.stdout.flush()


def main():
    index = os.path.join(ROOT, "index.html")
    if not os.path.isfile(index):
        print("Nao encontrei", index, file=sys.stderr)
        return 1

    os.chdir(ROOT)
    with http.server.ThreadingHTTPServer((HOST, PORT), Handler) as httpd:
        print(f"Servindo {ROOT}")
        print(f"Abra:  http://localhost:{PORT}/")
        if HOST == "0.0.0.0":
            print("No celular use o IP do PC na mesma rede Wi-Fi.")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nParando...")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
